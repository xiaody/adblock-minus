import test from 'ava'
import {isThirdParty, extractDomain} from '../lib/utils'

test('lib:isThirdParty', (t) => {
  t.false(isThirdParty('zhihu.com', 'zhihu.com'))
  t.false(isThirdParty('www.zhihu.com', 'zhihu.com'))
  t.false(isThirdParty('zhuanlan.zhihu.com', 'zhihu.com'))
  t.false(isThirdParty('zhuanlan.zhihu.com', 'www.zhihu.com'))

  t.true(isThirdParty('zhihu.com.cn', 'zhihu.com'))
  t.true(isThirdParty('zhihu.com', 'zhihu.com.cn'))
  t.true(isThirdParty('google.com', 'zhihu.com'))
  t.true(isThirdParty('evil.zhihu.xxx', 'zhihu.com'))
})

test('lib:extractDomain', (t) => {
  t.is(extractDomain(''), '')
  t.is(extractDomain('about:blank'), '')
  t.is(extractDomain('chrome://settings/'), '')
  t.is(extractDomain('http://localhost:3000/'), 'localhost')
  t.is(extractDomain('https://www.zhihu.com/topic/19620100/hot'), 'www.zhihu.com')
  t.is(extractDomain('http://国家新闻出版广电总局.中国/'), 'xn--79qy5jwte2pa03geqdl6n7lzw6fb55g.xn--fiqs8s')
})
