import { describe, expect, it } from 'vitest'
import { makeData } from '../../test/fixtures'
import { LinkDataSchema, type ReadingListItem } from './schema'
import { filterItems } from './filters'
import { getItemTags, getPrimaryTags, groupTags } from './tags'

const books = (): ReadingListItem => ({
  ...LinkDataSchema.parse(makeData()).items[1] as ReadingListItem,
  tags: ['书籍'],
  books: [
    { title: '免费网页书', url: 'https://example.com/free', access: 'free' },
    { title: '付费 PDF', url: 'https://example.com/pdf', format: 'pdf', access: 'paid' },
  ],
})
const matches = (item: ReadingListItem, selectedTags: string[]) =>
  filterItems([item], { keyword: '', selectedTags, tagMatch: 'grouped' }).length

describe('分类与属性的统一语义', () => {
  it('顶部只展示配置的分类入口，属性与新关键词保留在更多筛选', () => {
    expect(getPrimaryTags(['PDF', '付费', '书籍', '教程', '中译', 'pa'])).toEqual(['教程', '书籍'])
    expect(groupTags(['PDF', '付费', '书籍', '教程', '中译', 'pa'])).toEqual([
      { id: 'content', label: '内容分类', tags: ['书籍', '教程'] },
      { id: 'format', label: '格式', tags: ['PDF'] },
      { id: 'access', label: '访问条件', tags: ['付费'] },
      { id: 'language', label: '语言', tags: ['中译'] },
      { id: 'keyword', label: '关键词', tags: ['pa'] },
    ])
  })
  it('资源属性进入搜索和筛选，不要求重复写在条目 tags 中', () => {
    expect(getItemTags(books())).toEqual(['书籍', 'PDF', '付费'])
    expect(filterItems([books()], { keyword: 'PDF', selectedTags: [] })).toHaveLength(1)
    expect(matches(books(), ['书籍', 'PDF'])).toBe(1)
  })
  it('不同组 AND，同一组 OR，满足内容用途后再限制格式', () => {
    expect(matches(books(), ['文档', '书籍', 'PDF', 'EPUB'])).toBe(1)
    expect(matches(books(), ['文档', 'PDF'])).toBe(0)
    expect(matches(books(), ['书籍', 'EPUB'])).toBe(0)
  })
  it('付费和 PDF 必须由同一资料满足，不能拼接不同书目的属性', () => {
    const item = books()
    item.books = [
      { title: '免费 PDF', url: 'https://example.com/free.pdf', format: 'pdf', access: 'free' },
      { title: '付费网页', url: 'https://example.com/paid', access: 'paid' },
    ]
    expect(matches(item, ['书籍', '付费', 'PDF'])).toBe(0)
    item.books[0].access = 'paid'
    expect(matches(item, ['书籍', '付费', 'PDF'])).toBe(1)
  })
  it('书单形态与 PDF 格式不会自动被归类成书籍', () => {
    const item = books()
    item.tags = ['文档']
    expect(getItemTags(item)).not.toContain('书籍')
    expect(matches(item, ['书籍'])).toBe(0)
  })
  it('旧 any/all 模式仍依据原始标签匹配', () => {
    const item = books()
    expect(filterItems([item], { keyword: '', selectedTags: ['书籍', 'PDF'], tagMatch: 'any' })).toHaveLength(1)
    expect(filterItems([item], { keyword: '', selectedTags: ['书籍', 'PDF'], tagMatch: 'all' })).toHaveLength(0)
  })
})
