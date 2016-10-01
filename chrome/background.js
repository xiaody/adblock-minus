/**
 * Chrome extension example
 */
import Blocker from '../lib/Blocker'
import {extractDomain, isThirdParty} from '../lib/utils'
import {CrTabs} from './helpers'
const blocker = new Blocker()
const Tabs = new CrTabs()

const config = require('../config/local.json')
const subscriptions = config.subscriptions || []
const additional = config.additional || []
const whitelist = config.whitelist || []
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

subscriptions.forEach(addListFromURL)
additional.forEach(blocker.add)

chrome.tabs.onRemoved.addListener((id) => Tabs.delete(id))
chrome.webNavigation.onCommitted.addListener(onCommitted)
chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequest, {urls: ['http://*/*', 'https://*/*']}, ['blocking']
)

function onCommitted (details) {
  if (details.frameId) return
  let domain = extractDomain(details.url)
  if (!domain) return
  insertXstyle(details.tabId, blocker.selectors(domain))
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

  if (!documentHost ||
    whitelist.some((domain) => !isThirdParty(documentHost, domain))) {
    return
  }

  if (blocker.match(url, type, documentHost)) {
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

// Functions for download and add filters.
function addListFromURL (url) {
  let promise = window.fetch(url)
    .then((res) => res.text())
    .then((txt) => {
      storage.set({ [url]: txt })
      return txt
    }).catch((err) => console.error(err))

  storage.get(url, (item) => {
    if (item[url]) {
      addFilterFromDoc(item[url])
    } else {
      promise.then(addFilterFromDoc)
    }
  })
}

function addFilterFromDoc (item) {
  let lines = item.split(/[\r\n]+/)
  let i = lines.length

  for (; --i;) { // Skip first line
    blocker.add(lines[i])
  }
}
