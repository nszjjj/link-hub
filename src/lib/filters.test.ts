import { describe, expect, it } from 'vitest'
import { makeData } from '../../test/fixtures'
import { LinkDataSchema } from './schema'
import { collectTags, filterItems, groupByTopic } from './filters'

describe('检索与分组', () => {
  const data = () => LinkDataSchema.parse(makeData()) as ReturnType<typeof makeData>
  const ids = (overrides = {}) => filterItems(data().items, {
    keyword: '', selectedTags: [], tagMatch: 'any', ...overrides,
  }).map((item: { id: string }) => item.id)

  it('默认任一匹配，并支持全部匹配', () => {
    expect(ids({ selectedTags: ['工具', 'PDF'] })).toEqual(['charts', 'books'])
    expect(ids({ selectedTags: ['工具', 'PDF'], tagMatch: 'all' })).toEqual([])
    expect(ids({ selectedTags: ['资源', '免费'], tagMatch: 'all' })).toEqual(['books'])
  })
  it('空标签不限制结果，未知标签不静默放宽筛选', () => {
    expect(ids()).toEqual(['charts', 'books', 'contracts'])
    expect(ids({ selectedTags: ['不存在'] })).toEqual([])
  })
  it.each([
    ['  ｓＯＬＩＤＩＴＹ  ', ['contracts']], ['Ada', ['books']],
    ['推荐先读', ['books']], ['EVM', ['contracts']], ['中文', ['charts']],
  ])('搜索嵌套信息并标准化输入 %s', (keyword, expected) => {
    expect(ids({ keyword })).toEqual(expected)
  })
  it('关键词与标签使用 AND，且不搜索 URL', () => {
    expect(ids({ keyword: 'Solidity', selectedTags: ['工具'] })).toEqual([])
    expect(ids({ keyword: 'example.com' })).toEqual([])
  })
  it('空主题隐藏，形态分块、同块推荐优先，输入不被修改', () => {
    const original = data()
    const normal = { ...original.items[0], featured: false }
    const featured = { ...normal, id: 'featured', featured: true }
    const second = { ...normal, id: 'second' }
    const items = [original.items[1], normal, second, featured, original.items[2]]
    const before = structuredClone(items)
    const groups = groupByTopic(items, original.topics)
    expect(groups.map((g: any) => g.topic.id)).toEqual(['markets', 'web3'])
    expect(groups[0].items.map((item: any) => item.id)).toEqual(['featured', 'charts', 'second', 'books'])
    expect(items).toEqual(before)
  })
  it('同顺序主题保持源顺序', () => {
    const original = data()
    const topics = [...original.topics].reverse().map((topic) => ({ ...topic, order: 0 }))
    expect(groupByTopic(original.items, topics).map((g: any) => g.topic.id)).toEqual(['web3', 'markets'])
  })
  it('决策标签优先，其余按频次与首次出现排序，每条目每标签只计一次', () => {
    const items = [
      { ...data().items[0], tags: ['alpha', 'beta', 'beta', 'PDF', '免费'] },
      { ...data().items[1], tags: ['alpha', 'gamma'] },
    ]
    expect(collectTags(items)).toEqual(['免费', 'PDF', 'alpha', 'beta', 'gamma'])
    expect(collectTags([])).toEqual([])
  })
})
