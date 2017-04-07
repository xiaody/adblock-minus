import {Filter} from './FilterClasses'

const isWhitelistFilter = Filter.isWhitelistFilter

class Matcher {
  constructor () {
    /**
     * @type {Map.<string, Array.<ActiveFilter>>}
     */
    this.filterByKeyword = new Map()
  }

  /**
   * @param {ActiveFilter} filter
   */
  add (filter) {
    let keyword = this.findKeyword(filter)
    let map = this.filterByKeyword
    if (map.has(keyword)) {
      // Make sure the white-lists are always at first
      if (isWhitelistFilter(filter)) {
        map.get(keyword).unshift(filter)
      } else {
        map.get(keyword).push(filter)
      }
    } else {
      map.set(keyword, [ filter ])
    }
  }

  clear () {
    this.filterByKeyword.clear()
  }

  /**
   * @param {ActiveFilter} filter
   */
  findKeyword (filter) {
    let text = filter.regexpSrc
    let defaultResult = ''

    if (text.length > 2 && text.startsWith('/') && text.endsWith('/')) {
      return defaultResult
    }

    let candidates = text.toLowerCase().match(/[^a-z0-9%*][a-z0-9%]{3,}(?=[^a-z0-9%*])/g)
    if (!candidates) {
      return defaultResult
    }

    let map = this.filterByKeyword
    let result = defaultResult
    let resultCount = 0xFFFFFF
    let resultLength = 0

    candidates.forEach(function (candidate) {
      candidate = candidate.substr(1)
      let count = 0
      if (map.has(candidate)) {
        count = map.get(candidate).length
      }
      if (count < resultCount || (count === resultCount && candidate.length > resultLength)) {
        result = candidate
        resultCount = count
        resultLength = candidate.length
      }
    })

    return result
  }

  checkEntryMatch (word, location, contentType, docDomain) {
    let array = this.filterByKeyword.get(word)
    for (let i = 0, l = array.length, filter; i < l; i++) {
      filter = array[i]
      if (filter.matches(location, contentType, docDomain)) {
        return filter
      }
    }
    return null
  }

  match (...args) {
    return this.matchStatus(...args) === 1
  }

  matchStatus (...args) {
    const filter = this.matchFilter(...args)
    if (!filter) return 0
    if (isWhitelistFilter(filter)) return -1
    return 1
  }

  matchFilter (location, contentType, docDomain) {
    let keywords = location.toLowerCase().match(/[a-z0-9%]{3,}/g) || []
    keywords.unshift('')

    let map = this.filterByKeyword
    let afterall = null
    for (let substr, result, i = keywords.length; i--;) {
      substr = keywords[i]
      if (map.has(substr)) {
        result = this.checkEntryMatch(substr, location, contentType, docDomain)
        if (!result) continue
        if (isWhitelistFilter(result)) return result
        else afterall = result
      }
    }
    return afterall
  }
}

class Hider {
  constructor () {
    this.hotFilters = []
    this.generalSelectors = []
    this.filterSet = new Set()
  }

  add (filter) {
    if (!filter.domains) {
      this.generalSelectors.push(filter.selector)
    } else {
      this.filterSet.add(filter)
    }
  }

  clear () {
    this.hotFilters.length = 0
    this.filterSet.clear()
  }

  * selectors (domain) {
    const hotSelectors = this._getSelectorsInHotfilters(domain)
    if (hotSelectors.length) {
      yield hotSelectors
    }

    if (this.generalSelectors.length) {
      yield this.generalSelectors
    }

    let filter
    let ret3 = []
    for (filter of this.filterSet) {
      if (filter.isActiveOnDomain(domain)) {
        this.hotFilters.push(filter)
        this.filterSet.delete(filter)
        ret3.push(filter.selector)
      }
    }
    if (ret3.length) {
      yield ret3
    }
  }

  _getSelectorsInHotfilters (domain) {
    let ret = []
    this.hotFilters.forEach(function (filter) {
      if (filter.isActiveOnDomain(domain)) {
        ret.push(filter.selector)
      }
    })
    return ret
  }
}

class Blocker {
  constructor () {
    const matcher = this.matcher = new Matcher()
    const hider = this.hider = new Hider()
    this.add = this.add.bind(this)
    this.clear = this.clear.bind(this)
    this.match = matcher.match.bind(matcher)
    this.matchStatus = matcher.matchStatus.bind(matcher)
    this.selectors = hider.selectors.bind(hider)
  }

  add (text) {
    if (typeof text === 'string' && /\n|\r/.test(text)) {
      text = text.split(/[\n\r]+/)
    }

    if (Array.isArray(text)) {
      return text.map((item) => this.add(item))
    }

    let filterObj = Filter.fromText(text)

    if (Filter.isRegExpFilter(filterObj)) {
      this.matcher.add(filterObj)
    } else if (Filter.isElemHideFilter(filterObj)) {
      this.hider.add(filterObj)
    }
  }

  clear () {
    this.matcher.clear()
    this.hider.clear()
  }
}

export default Blocker
export {Matcher, Hider}
