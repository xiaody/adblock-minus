import test from 'ava'
import {Filter} from '../lib/FilterClasses'

test('lib:Filter', (t) => {
  let filter
  filter = Filter.fromText('')
  t.falsy(filter)

  filter = Filter.fromText('zhihu.com##main')
  t.true(Filter.isElemHideFilter(filter))
  t.true(filter.isActiveOnDomain('www.zhihu.com'))

  filter = Filter.fromText('||web-analytics.zhihu.com/')
  t.true(Filter.isRegExpFilter(filter))
  t.true(Filter.isBlockingFilter(filter))
  t.true(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch'))

  filter = Filter.fromText('@@||web-analytics.zhihu.com/')
  t.true(Filter.isRegExpFilter(filter))
  t.true(Filter.isWhitelistFilter(filter))
  t.true(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch'))
})

test('lib:Filter options', (t) => {
  const filter = Filter.fromText('||web-analytics.zhihu.com/$domain=www.zhihu.com|zhuanlan.zhihu.com,image')
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'www.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'zhuanlan.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'liukanshan.zhihu.com'))
  t.true(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', 'image', 'www.zhihu.com'))
  t.true(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', 'image', 'zhuanlan.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', 'image', 'liukanshan.zhihu.com'))
})

test('lib:Filter reverse options', (t) => {
  const filter = Filter.fromText('||web-analytics.zhihu.com/$domain=~zhuanlan.zhihu.com,~image')
  t.true(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'www.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'zhuanlan.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', 'image', 'www.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', 'image', 'zhuanlan.zhihu.com'))
})
