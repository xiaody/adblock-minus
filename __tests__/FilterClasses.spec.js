import test from 'ava'
import {Filter} from '../lib/FilterClasses'

test('lib:Filter', t => {
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

test('lib:Filter options', t => {
  const filter = Filter.fromText('||web-analytics.zhihu.com/$domain=www.zhihu.com||zhuanlan.zhihu.com,image')
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'www.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'zhuanlan.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'liukanshan.zhihu.com'))
  t.true(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', 'image', 'www.zhihu.com'))
  t.true(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', 'image', 'zhuanlan.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', 'image', 'liukanshan.zhihu.com'))
})

test('lib:Filter reverse options', t => {
  const filter = Filter.fromText('||web-analytics.zhihu.com/$domain=~zhuanlan.zhihu.com,~image')
  t.true(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'www.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'zhuanlan.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', 'image', 'www.zhihu.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', 'image', 'zhuanlan.zhihu.com'))
})

test('lib:Filter options third_party', t => {
  let filter = Filter.fromText('||web-analytics.zhihu.com/$third-party')
  t.true(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'google.com'))
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'www.zhihu.com'))

  filter = Filter.fromText('||web-analytics.zhihu.com/$~third-party')
  t.false(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'google.com'))
  t.true(filter.matches('https://web-analytics.zhihu.com/api/v1/logs/batch', null, 'www.zhihu.com'))
})

test('lib:Filter bare options', t => {
  const filter = Filter.fromText('$image')
  t.true(filter.matches('/whatever.gif', 'image', 'whatever.com'))
})

test('lib:Filter ignore comments and unknown optioned', t => {
  t.falsy(Filter.fromText('!||web-analytics.zhihu.com/'))
  t.falsy(Filter.fromText('[Adblock Plus 2.0]'))
  t.falsy(Filter.fromText('||web-analytics.zhihu.com/$unknown'))
  t.falsy(Filter.fromText('||web-analytics.zhihu.com/$~unknown'))
  t.falsy(Filter.fromText('||web-analytics.zhihu.com/$image,unknown'))
})

test('lib:Filter do run regex at unrelated domain', t => {
  // #4
  const filter = Filter.fromText(String.raw`/^https?:\/\/(?!www\.)[0-9a-z-]+\.[0-9a-z-]+\.(?:com|com\.cn|cn|cc|net|org)\/(?:[0-9a-z]|[a-z]){9,}\.js$/$script,domain=39yst.com|5tps.com|99.com.cn|9ht.com|9ku.com|admin5.com|cyone.com.cn|dugoogle.com|h4.com.cn|hc360.com|hunanweishi.cn|jandan.net|jf258.com|jianshen8.com|jy135.com|laobanfa.com|liuxue86.com|muchong.com|pingguolv.com|qeo.cn|ruiwen.com|sc115.com|sina.cn|warting.com|weather.com.cn|wenkuxiazai.com|wmxa.cn|xiachufang.com|xinshipu.com|xuexila.com|yac8.com|yjbys.com|ysts8.com|yuwenmi.com|yxlady.com|zhongyao1.com|zongheng.com|zuocai.tv`)
  t.false(filter.matches('https://lh3.googleusercontent.com/pnhoz6zg9ny0i6wa7cepeql2mgyj0y5e9yda19hqx4fbsbquqp7kavypjsjjppnfixjruh-jl4k=w320-h180-p-rw', 'image', 'plus.google.com'))
})
