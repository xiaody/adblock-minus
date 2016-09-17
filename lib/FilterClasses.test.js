import test from 'ava'
import {Filter} from './FilterClasses'

test('lib:Filter', (t) => {
  let filter
  filter = Filter.fromText('')
  t.falsy(filter)

  filter = Filter.fromText('zhihu.com##main')
  t.true(Filter.isElemHideFilter(filter))
  t.true(filter.isActiveOnDomain('www.zhihu.com'))

  filter = Filter.fromText('||zhihu-web-analytics.zhihu.com/')
  t.true(Filter.isRegExpFilter(filter))
  t.true(filter.matches('https://zhihu-web-analytics.zhihu.com/api/v1/logs/batch'))
})
