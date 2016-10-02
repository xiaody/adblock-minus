'use strict'

;(function () {
  const $$ = (selector) => Array.from(document.querySelectorAll(selector))
  const chrome = window.chrome
  const storage = chrome.storage.local

  const nlEditors = $$('textarea[data-option]')
  nlEditors.forEach(initEditor)

  function initEditor (ndEditor) {
    const key = ndEditor.dataset.option
    storage.get(key, (option) => {
      const data = option[key]
      ndEditor.value = Array.isArray(data) ? data.join('\n') : data
    })
    ndEditor.addEventListener('change', (e) => {
      storage.set({
        [key]: parseInput(e.target.value)
      })
    })
  }

  function parseInput (val) {
    val = val.trim()
    if (!val) return []
    return val.split(/[\n\r]+/)
  }
})()
