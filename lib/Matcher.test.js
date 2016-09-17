import test from 'ava'
import Matcher from './Matcher'

test('lib:Matcher element hide', (t) => {
  Matcher.addFilter('zhihu.com##main')
  let matched = false
  for (const selectors of Matcher.getStyle('www.zhihu.com')) {
    t.true(Array.isArray(selectors))
    if (selectors.includes('main')) {
      matched = true
    }
  }
  if (matched) {
    t.pass()
  } else {
    t.fail()
  }
})

test('lib:Matcher regexp', (t) => {
  const target = 'https://zhihu-web-analytics.zhihu.com/api/v1/logs/batch'
  t.false(Matcher.matchesAny(target))
  Matcher.addFilter('||zhihu-web-analytics.zhihu.com/')
  t.true(Matcher.matchesAny(target))
})
