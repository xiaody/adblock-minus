import {isThirdParty, extractDomain} from './utils'

const Filter = {
  elemhideRegExp: /^([^/*|@"!]*?)##(.+)$/, // whitelist elementHide filter is not supported
  optionsRegExp: /\$(~?[\w-]+(?:=[^,\s]+)?(?:,~?[\w-]+(?:=[^,\s]+)?)*)$/,

  fromText (text = '') {
    text = text.trim()
    if (!text || text.startsWith('!') || text.includes('#@#')) return
    if (/^\[Adblock Plus/i.test(text)) return

    if (text.includes('##') && this.elemhideRegExp.test(text)) {
      let domainStr = RegExp.$1
      let selectorStr = RegExp.$2
      return new ElemHideFilter(domainStr.replace(/\s/g, ''), selectorStr.trim())
    } else {
      return RegExpFilter.fromText(text.replace(/\s/g, ''))
    }
  },
  isRegExpFilter (filter) { return filter instanceof RegExpFilter },
  isElemHideFilter (filter) { return filter instanceof ElemHideFilter },
  isWhitelistFilter (filter) { return filter instanceof WhitelistFilter },
  isBlockingFilter (filter) { return filter instanceof BlockingFilter }
}

class ActiveFilter {
  constructor (domainSource) {
    this.domains = null
    this.domainSource = domainSource
  }
  /* make it possible to lazy-calc `.domains`,
   * cuz most RegExpFilter won't even need it */
  calcDomains () {
    if (this.domainSource) {
      this.domains = new Map()
      let domains = this.domainSource.split(this.domainSeparator)
      if (domains.length === 1 && domains[0][0] !== '~') {
        this.domains.set('', false)
        this.domains.set(domains[0], true)
      } else {
        let hasIncludes = false
        let i = 0
        for (let l = domains.length, domain, include; i < l; i++) {
          domain = domains[i]
          if (domain === '') continue

          if (domain[0] === '~') {
            include = false
            domain = domain.substr(1)
          } else {
            include = true
            hasIncludes = true
          }
          this.domains.set(domain, include)
        }
        this.domains.set('', !hasIncludes)
      }
    }
    this.domainSource = ''
  }
  isActiveOnDomain (docDomain = '') {
    if (this.domainSource) this.calcDomains()
    if (!this.domains) return true
    docDomain = docDomain.toUpperCase()
    let nextDot
    do {
      if (this.domains.has(docDomain)) {
        return this.domains.get(docDomain)
      }
      nextDot = docDomain.indexOf('.')
      if (nextDot < 0) break
      docDomain = docDomain.substr(nextDot + 1)
    } while (true)

    return this.domains.get('')
  }
}

class RegExpFilter extends ActiveFilter {
  constructor (regexpSrc, contentType, domains, thirdParty) {
    super(domains)
    this.regexpSrc = regexpSrc
    this.regexp = null // lazy generate from @regexpSrc
    this.contentType = contentType || this.contentType
    this.thirdParty = thirdParty
  }
  genRegexp () {
    const regexpSrc = this.regexpSrc
    if (!regexpSrc) {
      this.regexp = /./
    } else if (regexpSrc.length > 2 && regexpSrc.startsWith('/') && regexpSrc.endsWith('/')) {
      // The filter is a regular expression - convert it immediately.
      this.regexp = new RegExp(regexpSrc.substr(1, regexpSrc.length - 2))
    } else {
      this.regexp = new RegExp(RegExpFilter.convert(regexpSrc))
    }
  }
  matches (location, contentType, docDomain) {
    if (!this.regexp) this.genRegexp()
    if (typeof contentType === 'string') {
      contentType = contentType.toUpperCase()
    }
    return !!(
      this.isActiveOnDomain(docDomain) &&
      (RegExpFilter.typeMap.get(contentType || 'OTHER') & this.contentType) &&
      this.regexp.test(location) &&
      (typeof this.thirdParty === 'undefined' ||
      this.thirdParty === isThirdParty(extractDomain(location), docDomain))
    )
  }
  /* convert abpexp to regexp */
  static convert (abpexp) {
    return abpexp
      .replace(/\*+/g, '*').replace(/^\*|\*$/g, '').replace(/\^\|$/, '^')
      .replace(/\W/g, '\\$&')
      .replace(/\\\*/g, '.*')
      .replace(/\\\^/g, '(?:[\\x00-\\x24\\x26-\\x2C\\x2F\\x3A-\\x40\\x5B-\\x5E\\x60\\x7B-\\x7F]|$)')
      .replace(/^\\\|\\\|/, '^[\\w\\-]+:\\/+(?!\\/)(?:[^.\\/]+\\.)?')
      .replace(/^\\\|/, '^').replace(/\\\|$/, '$')
  }

  static fromText (text) {
    let blocking = true

    if (text.indexOf('@@') === 0) {
      blocking = false
      text = text.substr(2)
    }

    let contentType, domains, thirdParty, options

    if (text.includes('$') && Filter.optionsRegExp.test(text)) {
      options = RegExp.$1.toUpperCase().split(',')
      text = RegExp.leftContext
      for (let i = options.length, option, value, separatorIndex; i--;) {
        option = options[i]
        value = null
        separatorIndex = option.indexOf('=')
        if (separatorIndex >= 0) {
          value = option.substr(separatorIndex + 1)
          option = option.substr(0, separatorIndex)
        }
        option = option.replace('-', '_')
        if (RegExpFilter.typeMap.has(option)) {
          contentType = contentType || 0
          contentType |= RegExpFilter.typeMap.get(option)
        } else if (option[0] === '~' && RegExpFilter.typeMap.has(option.substr(1))) {
          contentType = contentType || RegExpFilter.prototype.contentType
          contentType &= ~RegExpFilter.typeMap.get(option.substr(1))
        } else if (option === 'DOMAIN' && value) {
          domains = value
        } else if (option === 'THIRD_PARTY') {
          thirdParty = true
        } else if (option === '~THIRD_PARTY') {
          thirdParty = false
        } else {
          return
        }
      }
    }

    let Constructor = blocking ? BlockingFilter : WhitelistFilter
    return new Constructor(text, contentType, domains, thirdParty)
  }
}
Object.assign(RegExpFilter.prototype, {
  domainSeparator: '|',
  contentType: (1 << 10) - 1
})
RegExpFilter.typeMap = new Map([
  [ 'OTHER', 1 << 0 ],
  [ 'SCRIPT', 1 << 1 ],
  [ 'IMAGE', 1 << 2 ],
  [ 'STYLESHEET', 1 << 3 ],
  [ 'OBJECT', 1 << 4 ],
  [ 'OBJECT_SUBREQUEST', 1 << 4 ], // same as OBJECT
  [ 'SUBDOCUMENT', 1 << 5 ],
  [ 'DOCUMENT', 1 << 6 ],
  [ 'XMLHTTPREQUEST', 1 << 7 ]
])

class BlockingFilter extends RegExpFilter { }
class WhitelistFilter extends RegExpFilter { }

class ElemHideFilter extends ActiveFilter {
  constructor (domains, selector) {
    super(domains ? domains.toUpperCase() : null)
    this.selector = selector
    this.calcDomains()
  }
}
Object.assign(ElemHideFilter.prototype, {
  domainSeparator: ','
})

export { Filter, ActiveFilter, RegExpFilter, BlockingFilter, WhitelistFilter, ElemHideFilter }
