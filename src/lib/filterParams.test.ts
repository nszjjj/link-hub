import { describe, expect, it } from 'vitest'
import { parseFilterParams, serializeFilterParams } from './filterParams'

describe('筛选 URL 数据契约', () => {
  it('新访问缺省为分组匹配，旧标签链接保留任一匹配', () => {
    expect(parseFilterParams(new URLSearchParams())).toEqual({ keyword: '', selectedTags: [], tagMatch: 'grouped' })
    expect(parseFilterParams(new URLSearchParams('tags=免费,PDF')).tagMatch).toBe('any')
  })

  it('解析中文、重复参数、重复标签与空标签，不丢弃未知标签', () => {
    const params = new URLSearchParams('q=区块链&tags=免费,%20PDF%20,,免费&tags=过期标签,资源&match=all')
    expect(parseFilterParams(params)).toEqual({
      keyword: '区块链', selectedTags: ['免费', 'PDF', '过期标签', '资源'], tagMatch: 'all',
    })
  })

  it.each(['or', 'AND', '', 'unsupported'])('非法 match=%s 回退到任一匹配', (match) => {
    expect(parseFilterParams(new URLSearchParams({ match })).tagMatch).toBe('any')
  })

  it('序列化通过 URLSearchParams 编码，并保留无关重复参数', () => {
    const original = new URLSearchParams('utm=x&utm=y&q=old&tags=old&tags=stale&match=any')
    const params = serializeFilterParams(original, {
      keyword: '  C++ & Web3  ', selectedTags: ['免费', 'PDF', '免费'], tagMatch: 'all',
    })
    expect(params.get('q')).toBe('C++ & Web3')
    expect(params.getAll('tags')).toEqual(['免费,PDF'])
    expect(params.get('match')).toBe('all')
    expect(params.getAll('utm')).toEqual(['x', 'y'])
    expect(parseFilterParams(new URLSearchParams(params.toString())).keyword).toBe('C++ & Web3')
    expect(original.get('q')).toBe('old')
  })

  it('默认和空条件省略 query，同时保留无关参数', () => {
    const params = serializeFilterParams(new URLSearchParams('q=old&tags=免费&match=all&from=share'), {
      keyword: '   ', selectedTags: [], tagMatch: 'any',
    })
    expect(params.toString()).toBe('from=share')
  })

  it('无标签时仍保留用户选择的全部匹配方式', () => {
    const params = serializeFilterParams(new URLSearchParams(), { keyword: '', selectedTags: [], tagMatch: 'all' })
    expect(params.toString()).toBe('match=all')
  })

  it('主题范围与 grouped 模式可往返，清除范围只移除 topic 参数', () => {
    const state = { keyword: '书籍', selectedTags: ['书籍', 'PDF'], tagMatch: 'grouped' as const, topicId: 'web3' }
    const params = serializeFilterParams(new URLSearchParams('from=share&topic=old'), state)
    expect(parseFilterParams(params)).toEqual(state)
    expect(params.get('from')).toBe('share')
    expect(serializeFilterParams(params, { ...state, topicId: undefined }).has('topic')).toBe(false)
  })

  it('未知主题保留用于提示，不静默放宽；空 topic 不形成范围', () => {
    expect(parseFilterParams(new URLSearchParams('topic=missing')).topicId).toBe('missing')
    expect(parseFilterParams(new URLSearchParams('topic=%20')).topicId).toBeUndefined()
  })
})
