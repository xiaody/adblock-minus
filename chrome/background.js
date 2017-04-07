/**
 * Chrome extension example
 */
import Blocker from '../lib/Blocker'
import {extractDomain, isThirdParty} from '../lib/utils'
import {CrTabs} from './helpers'
const Tabs = new CrTabs()

const config = require('../config/local.json')
const redirectTable = config.redirect

const chrome = window.chrome
const storage = chrome.storage.local
const insertCSS = (tabId, detail) => {
  chrome.tabs.insertCSS(tabId, detail, () => {
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError.message, tabId, Tabs.get(tabId))
    }
  })
}

class Manager {
  constructor () {
    this.blockers = new Map()
    this.whitelist = []
  }

  add (name, content) {
    const blocker = new Blocker()
    blocker.add(content)
    this.blockers.set(name, blocker)
  }

  addRemote (name, url) {
    return new Promise((resolve, reject) => {
      storage.get(url, (info) => {
        if (info[url]) {
          this.add(url, info[url].content)
        } else {
          this.add(url, '') // as a placeholder
        }
        if (!info[url] || Date.now() - info[url].lastFetched > 86400e3) {
          window.fetch(url)
            .then((res) => res.text())
            .then((content) => {
              if (!this.blockers.has(url)) return
              this.add(url, content)
              storage.set({
                [url]: {
                  lastFetched: Date.now(),
                  content
                }
              })
            })
            .then(resolve)
            .catch(reject)
        } else {
          resolve()
        }
      })
    })
  }

  delete (name) {
    this.blockers.delete(name)
  }

  * selectors (domain) {
    if (this.isInWhitelist(domain)) return
    for (const blocker of this.blockers.values()) {
      yield * blocker.selectors(domain)
    }
  }

  match (url, type, documentHost) {
    if (this.isInWhitelist(documentHost)) return
    let ret = false
    for (const blocker of this.blockers.values()) {
      const code = blocker.matchStatus(url, type, documentHost)
      if (code === 1) ret = true
      if (code === -1) return false
    }
    return ret
  }

  isInWhitelist (domain) {
    return domain && this.whitelist.some((whitelisted) => (
      !isThirdParty(domain, whitelisted)
    ))
  }
}

const manager = new Manager()
const optionKeys = ['subscriptions', 'additional', 'whitelist']
storage.set({version: '1'})
storage.get(optionKeys, (options) => {
  let needInit = false
  const initConf = {}
  optionKeys.forEach((key) => {
    if (typeof options[key] === 'undefined') {
      needInit = true
      initConf[key] = config[key]
    } else {
      config[key] = options[key]
    }
  })

  manager.whitelist = config.whitelist
  manager.add('additional', config.additional)
  config.subscriptions.forEach((url) => manager.addRemote(url, url))

  if (needInit) {
    storage.set(initConf, () => {
      if (!window.navigator.language.startsWith('zh')) {
        chrome.runtime.openOptionsPage()
      }
    })
  }
})
chrome.storage.onChanged.addListener((changes) => {
  if (changes.whitelist) {
    manager.whitelist = changes.whitelist.newValue
  }
  if (changes.additional) {
    manager.add('additional', changes.additional.newValue)
  }
  if (changes.subscriptions) {
    const {oldValue, newValue} = changes.subscriptions
    newValue.forEach((url) => {
      if (oldValue && oldValue.includes(url)) return
      manager.addRemote(url, url)
    })
    if (Array.isArray(oldValue)) {
      oldValue.forEach((url) => {
        if (changes.subscriptions.newValue.includes(url)) return
        manager.delete(url)
      })
    }
  }
})

setInterval(() => {
  for (const name of manager.blockers.keys()) {
    if (/^https?:\/\//.test(name)) {
      manager.addRemote(name, name)
    }
  }
}, 86400e3)

chrome.tabs.onRemoved.addListener((id) => Tabs.delete(id))
chrome.webNavigation.onCommitted.addListener(onCommitted)
chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequest, {urls: ['http://*/*', 'https://*/*']}, ['blocking']
)

function onCommitted (details) {
  if (details.frameId) return
  let domain = extractDomain(details.url)
  if (!domain) return
  insertXstyle(details.tabId, manager.selectors(domain))
}

function insertXstyle (tabId, xstyle) {
  for (let selectors of xstyle) {
    if (!selectors.length) continue
    insertCSS(tabId, {
      code: selectors.join(',') + '{display:none!important}',
      runAt: 'document_start'
    })
  }
}

function onBeforeRequest (details) {
  let url = details.url.toLowerCase()
  let tabId = details.tabId
  let type = details.type

  if (type === 'main_frame') {
    Tabs.set(tabId, 0, url) // (details.frameId===0) for a main frame
    return
  }

  let frameId = details.frameId
  let topUrl = Tabs.get(tabId, 0)
  let documentUrl = Tabs.get(tabId, frameId) || topUrl
  let documentHost = extractDomain(documentUrl)

  if (type === 'sub_frame') {
    type = 'SUBDOCUMENT'
    Tabs.set(tabId, frameId, url)
    documentUrl = Tabs.get(tabId, details.parentFrameId) || topUrl
    documentHost = extractDomain(documentUrl)
  } else {
    type = type.toUpperCase()
  }

  if (!documentHost) return

  if (manager.match(url, type, documentHost)) {
    switch (type) {
      case 'IMAGE':
      case 'OBJECT':
      case 'SUBDOCUMENT': {
        let prless = url.substr(url.indexOf('//'))
        let selector = `[src="${url}"],[src="${prless}"]`
        if (extractDomain(url) === documentHost) {
          let relSrc = url.substr(url.indexOf('//') + 2)
          relSrc = relSrc.substr(relSrc.indexOf('/'))
          selector += `, [src="${relSrc}"]`
        }
        insertCSS(tabId, {
          code: selector + '{display: none !important}',
          allFrames: frameId !== 0,
          runAt: 'document_start'
        })
      }
    }
    return {
      redirectUrl: redirectTable[type] || redirectTable.OTHER
    }
  }
}
