import test from 'ava'
import Blocker from '../lib/Blocker'

test.beforeEach((t) => {
  t.context.blocker = new Blocker()
})

test.afterEach((t) => {
  t.context.blocker.clear()
})

test('lib:Blocker element hide', (t) => {
  const {blocker} = t.context
  blocker.add('###general-ad-id')
  blocker.add('zhihu.com###domain-ad-id')
  blocker.add('google.com###other-ad-id')

  new Map([
    ['www.zhihu.com', true],
    ['zhuanlan.zhihu.com', true],
    ['zhuangbi.me', false]
  ]).forEach((expect, domain) => {
    let matchGeneral = false
    let matchDomain = false

    for (const selectors of blocker.selectors(domain)) {
      t.true(Array.isArray(selectors))
      if (selectors.includes('#general-ad-id')) {
        matchGeneral = true
      }
      if (selectors.includes('#domain-ad-id')) {
        matchDomain = true
      }
    }

    if (matchGeneral && matchDomain === expect) {
      t.pass()
    } else {
      t.fail(`${domain} selector matching failed`)
    }
  })
})

test('lib:Blocker matcher', (t) => {
  const {blocker} = t.context
  const target = 'https://zhihu-web-analytics.zhihu.com/api/v1/logs/batch'
  t.false(blocker.match(target))

  blocker.add('^matches-nothing-1^')
  blocker.add('^matches-nothing-2^')
  t.false(blocker.match(target))

  blocker.add('||zhihu-web-analytics.zhihu.com/')
  t.true(blocker.match(target))

  blocker.add('@@^matches-nothing-1^')
  blocker.add('@@^matches-nothing-2^')
  t.true(blocker.match(target))

  blocker.add('@@||zhihu-web-analytics.zhihu.com/')
  t.false(blocker.match(target))
})

test('lib:Blocker matcher support regexp', (t) => {
  const {blocker} = t.context
  const target = 'https://zhihu-web-analytics.zhihu.com/api/v1/logs/batch'
  blocker.add('/\\bzhihu-web-analytics\\b/')
  t.true(blocker.match(target))

  blocker.add('@@/zhihu-web-analytics.zhihu.com/')
  t.false(blocker.match(target))
})

test('lib:Blocker matcher no keywords', (t) => {
  const {blocker} = t.context
  const target = 'https://zhihu-web-analytics.zhihu.com/a/b/c/d.gif'
  blocker.add('/a/b/c/d.')
  t.true(blocker.match(target))

  blocker.add('@@/a/b/c')
  t.false(blocker.match(target))
})
