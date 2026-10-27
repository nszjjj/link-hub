import { describe, expect, it } from 'vitest'
import { makeHierarchyData } from '../../test/fixtures'
import { LinkDataSchema } from './schema'
import { getTopicItems } from './topics'

describe('主题范围', () => {
  const data = LinkDataSchema.parse(makeHierarchyData())
  it('父主题包括直接内容和子主题，每个条目只出现一次', () => {
    expect(getTopicItems(data.items, data.topics, 'web3').map((item) => item.id)).toEqual([
      'books', 'contracts', 'solana-docs', 'ethereum-books',
    ])
  })
  it('子主题只包含自身，未知或空主题不放宽范围', () => {
    expect(getTopicItems(data.items, data.topics, 'solana').map((item) => item.id)).toEqual(['contracts', 'solana-docs'])
    expect(getTopicItems(data.items, data.topics, 'missing')).toEqual([])
    expect(getTopicItems(data.items, data.topics, 'unused')).toEqual([])
    expect(getTopicItems(data.items, data.topics)).toEqual(data.items)
  })
})
