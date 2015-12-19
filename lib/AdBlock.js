/**
 * ___________________________
 * |          adblock         |
 * |--------------------------|
 * |    Matcher    |          |
 * |---------------|          |
 * | FilterClasses |          |
 * |---------------|          |
 * |                  Utils   |
 * |__________________________|
 */

'use strict'
const config = require('../config/local.json')
const subscriptions = config.subscriptions
const redirectTable = config.redirect

const Matcher = require('./Matcher').Matcher
const extractDomain = require('./Utils').crURL.extractDomain
const Tabs = new (require('./Utils').CrTabs)

const chrome = window.chrome
const storage = chrome.storage.local
const insertCSS = function (tabId, detail) {
  chrome.tabs.insertCSS(tabId, detail, function () {
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError.message, tabId, Tabs.get(tabId))
    }
  })
}

// Execute filters by list.
subscriptions.forEach(addListFromURL)

chrome.tabs.onRemoved.addListener(function (id) { Tabs.delete(id) })
chrome.webNavigation.onCommitted.addListener(onCommitted)
chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequest, {urls: ['http://*/*', 'https://*/*']}, ['blocking']
)

function onCommitted (details) {
  if (details.frameId) return
  let domain = extractDomain(details.url)
  if (!domain) return
  insertXstyle(details.tabId, Matcher.getStyle(domain))
}

function insertXstyle (tabId, xstyle) {
  for (let style of xstyle) {
    if (!style) continue
    insertCSS(tabId, {
      code: style,
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

  if (Matcher.matchesAny(url, type, documentHost)) {
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
    .then(res => res.text())
    .then(function (txt) {
      storage.set({ [url]: txt })
      return txt
    }).catch(err => void console.error(err))

  storage.get(url, function (item) {
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
    Matcher.addFilter(lines[i])
  }
}
