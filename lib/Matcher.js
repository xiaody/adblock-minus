'use strict'
const Filter = require('./FilterClasses').Filter

const HIDE_DISC = '{display:none!important}'
const isWhitelistFilter = Filter.isWhitelistFilter

const Matcher = {
  /**
   * @type {Map.<string, Array.<ActiveFilter>>}
   */
  filterByKeyword: new Map(),

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
  },

  /**
   * @param {ActiveFilter} filter
   */
  findKeyword (filter) {
    let text = filter.regexpSrc
    let defaultResult = ''

    if (text.length > 2 && text[text.length - 1] === '/' && text[0] === '/') {
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
      if (count < resultCount || count === resultCount && candidate.length > resultLength) {
        result = candidate
        resultCount = count
        resultLength = candidate.length
      }
    })

    return result
  },

  checkEntryMatch (word, location, contentType, docDomain) {
    let array = this.filterByKeyword.get(word)
    for (let i = 0, l = array.length, filter; i < l; i++) {
      filter = array[i]
      if (filter.matches(location, contentType, docDomain)) {
        return filter
      }
    }
    return null
  },

  matchesAny (location, contentType, docDomain) {
    if (!docDomain) return

    let keywords = location.toLowerCase().match(/[a-z0-9%]{3,}/g) || []
    keywords.unshift('')

    let map = this.filterByKeyword
    let afterall = false
    for (let substr, result, i = keywords.length; i--;) {
      substr = keywords[i]
      if (map.has(substr)) {
        result = this.checkEntryMatch(substr, location, contentType, docDomain)
        if (!result) continue
        if (isWhitelistFilter(result)) return false
        else afterall = true
      }
    }
    return afterall
  }

}

let Hider = {
  _hotfilters: [],
  _generalfilter: '#adblock-general-filters',
  _filterSet: new Set(),

  add (filter) {
    if (!filter.domains) {
      this._generalfilter += ',' + filter.selector
    } else {
      this._filterSet.add(filter)
    }
  },

  * getStyle (domain) {
    yield this._getStyleFromHotfilters(domain)

    if (this._generalfilter) {
      yield this._generalfilter + HIDE_DISC
    }

    let filter
    let ret3 = []
    for (filter of this._filterSet) {
      if (filter.isActiveOnDomain(domain)) {
        this._hotfilters.push(filter)
        this._filterSet.delete(filter)
        ret3.push(filter.selector)
      }
    }
    if (ret3.length) {
      yield ret3.join(',') + HIDE_DISC
    }
  },

  _getStyleFromHotfilters (domain) {
    let ret = []
    this._hotfilters.forEach(function (filter) {
      if (filter.isActiveOnDomain(domain)) {
        ret.push(filter.selector)
      }
    })
    return ret.length ? ret.join(',') + HIDE_DISC : ''
  }
}

module.exports.Matcher = {
  matchesAny: Matcher.matchesAny.bind(Matcher),
  getStyle: Hider.getStyle.bind(Hider),
  addFilter (text) {
    let filterObj = Filter.fromText(text)

    if (Filter.isRegExpFilter(filterObj)) {
      Matcher.add(filterObj)
    } else if (Filter.isElemHideFilter(filterObj)) {
      Hider.add(filterObj)
    }
  }
}
