import { describe, expect, it } from 'vitest'
import { makeHierarchyData } from '../../test/fixtures'
import { LinkDataSchema } from './schema'
import { filterItems } from './filters'
import { buildTopicGroups, collectTopicCounts, getTopicLocations } from './topics'

describe('两级主题派生数据', () => {
  const source = () => LinkDataSchema.parse(makeHierarchyData())

  it('父级只持有直接条目，汇总子级数量且没有重复渲染', () => {
    const data = source()
    const counts = collectTopicCounts(data.items, data.topics)
    const groups = buildTopicGroups(data.items, data.topics, counts)
    expect(groups.map((group) => group.topic.id)).toEqual(['markets', 'web3'])
    const web3 = groups[1]
    expect(web3.items.map((item) => item.id)).toEqual(['books'])
    expect(web3.subtopics.map((group) => group.topic.id)).toEqual(['solana', 'ethereum'])
    expect(web3.subtopics[0].items.map((item) => item.id)).toEqual(['solana-docs', 'contracts'])
    expect(web3.matchedCount).toBe(4)
    expect(web3.totalCount).toBe(4)
    expect(web3.directTotalCount).toBe(1)
    expect(counts.total.get('solana')).toBe(2)
    const rendered = groups.flatMap((group) => [
      ...group.items,
      ...group.subtopics.flatMap((subtopic) => subtopic.items),
    ])
    expect(rendered.map((item) => item.id).sort()).toEqual([
      'books',
      'charts',
      'contracts',
      'ethereum-books',
      'solana-docs',
    ])
  })
  it('先过滤再构树，空分支隐藏而无直接命中的父级保留', () => {
    const data = source()
    const filtered = filterItems(data.items, { keyword: 'Solidity', selectedTags: [] })
    const groups = buildTopicGroups(
      filtered,
      data.topics,
      collectTopicCounts(data.items, data.topics),
    )
    expect(groups).toHaveLength(1)
    const web3 = groups[0]
    expect(web3.topic.id).toBe('web3')
    expect(web3.items).toEqual([])
    expect(web3.matchedCount).toBe(1)
    expect(web3.totalCount).toBe(4)
    expect(web3.subtopics.map((group) => group.topic.id)).toEqual(['solana'])
    expect(web3.subtopics[0].matchedCount).toBe(1)
    expect(web3.subtopics[0].totalCount).toBe(2)
    expect(buildTopicGroups([], data.topics, collectTopicCounts(data.items, data.topics))).toEqual(
      [],
    )
  })
  it('子级全被隐藏时保留父级通用内容的结构语义', () => {
    const data = source()
    const filtered = data.items.filter((item) => item.id === 'books')
    const web3 = buildTopicGroups(
      filtered,
      data.topics,
      collectTopicCounts(data.items, data.topics),
    )[0]
    expect(web3.hasSubtopics).toBe(true)
    expect(web3.subtopics).toEqual([])
    expect(web3.matchedCount).toBe(1)
    expect(web3.directTotalCount).toBe(1)
  })
  it('同级排序独立，子级先于父级定义也不影响关系，输入不被修改', () => {
    const data = source()
    data.topics.reverse()
    const before = structuredClone(data)
    const groups = buildTopicGroups(
      data.items,
      data.topics,
      collectTopicCounts(data.items, data.topics),
    )
    expect(groups.map((group) => group.topic.id)).toEqual(['markets', 'web3'])
    expect(groups[1].subtopics.map((group) => group.topic.id)).toEqual(['solana', 'ethereum'])
    const tied = data.topics.map((topic) => ({ ...topic, order: 0 }))
    expect(
      buildTopicGroups(data.items, tied, collectTopicCounts(data.items, tied))[0].subtopics.map(
        (group) => group.topic.id,
      ),
    ).toEqual(['ethereum', 'solana'])
    expect(data).toEqual(before)
  })
  it('当前位置按可见阅读顺序提供完整父子路径', () => {
    const data = source()
    const groups = buildTopicGroups(
      data.items,
      data.topics,
      collectTopicCounts(data.items, data.topics),
    )
    expect(getTopicLocations(groups)).toEqual([
      { id: 'markets', label: '行情' },
      { id: 'web3', label: 'Web3' },
      { id: 'solana', label: 'Web3 / Solana' },
      { id: 'ethereum', label: 'Web3 / Ethereum' },
    ])
  })
})
