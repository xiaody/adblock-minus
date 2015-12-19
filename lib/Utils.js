'use strict'
const url = require('url')

const crURL = {
  /**
   * @param {string} requestHost
   * @param {string} documentHost
   * @return {boolean}
   * @nosideeffects
   */
  isThirdParty (requestHost, documentHost) {
    if (!/^\d+(\.\d+)*$/.test(documentHost) &&
      /([^\.]+\.(?:com|edu|gov|org|net)\.[^\.]{2,3}|[^\.]+\.[^\.]+)$/.test(documentHost)) {
      documentHost = RegExp.$1
    }
    if (requestHost.length > documentHost.length) {
      return requestHost.substr(requestHost.length - documentHost.length - 1) !== '.' + documentHost
    } else {
      return requestHost !== documentHost
    }
  },

  /**
   * @param {string} url
   * @return {string}
   * @nosideeffects
   */
  extractDomain (str) {
    if (!str) return ''
    const parsed = url.parse(str)
    if (!/^https?:$/i.test(parsed.protocol)) return ''
    return parsed.hostname
  }
}

class CrTabs {
  constructor () {
    this.map = new Map()
    this.fmapPool = []
  }
  set (tabid, frameid, url) {
    let map = this.map
    let pool = this.fmapPool
    if (!map.has(tabid)) {
      map.set(tabid, pool.length ? pool.pop() : new Map())
    }
    map.get(tabid).set(frameid, url)
  }
  get (tabid, frameid) {
    let fmap = this.map.get(tabid)
    if (fmap) {
      return fmap.get(frameid || 0)
    }
  }
  delete (tabid) {
    let map = this.map
    let fmap = map.get(tabid)
    if (fmap) {
      fmap.clear()
      this.fmapPool.push(fmap)
      map.delete(tabid)
    }
  }
}

module.exports = { crURL, CrTabs }
