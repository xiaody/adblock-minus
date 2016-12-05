import url from 'url'

/**
 * @param {string} requestHost
 * @param {string} documentHost
 * @return {boolean}
 * @nosideeffects
 */
function isThirdParty (requestHost, documentHost) {
  if (!/^\d+(\.\d+)*$/.test(documentHost) &&
    /([^.]+\.(?:com|edu|gov|org|net)\.[^.]{2,3}|[^.]+\.[^.]+)$/.test(documentHost)) {
    documentHost = RegExp.$1
  }
  if (requestHost.length > documentHost.length) {
    return requestHost.substr(requestHost.length - documentHost.length - 1) !== '.' + documentHost
  } else {
    return requestHost !== documentHost
  }
}

/**
 * @param {string} url
 * @return {string}
 * @nosideeffects
 */
function extractDomain (str) {
  if (!str) return ''
  const parsed = url.parse(str)
  if (!/^https?:$/i.test(parsed.protocol)) return ''
  return parsed.hostname
}

export {isThirdParty, extractDomain}
