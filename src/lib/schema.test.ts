import { describe, expect, it } from 'vitest'
import { makeData, makeHierarchyData } from '../../test/fixtures'
import { LinkDataSchema, ResourceRefSchema } from './schema'

describe('数据契约', () => {
  it('两级主题接受父级和子级条目，子主题可以定义在父主题之前', () => {
    const data = makeHierarchyData()
    data.topics.reverse()
    expect(LinkDataSchema.safeParse(data).success).toBe(true)
    expect(LinkDataSchema.parse(data).items.map((item) => item.topic)).toEqual([
      'markets',
      'web3',
      'solana',
      'solana',
      'ethereum',
    ])
  })
  it.each([
    ['父级不存在', 'missing', 2],
    ['自引用', 'solana', 2],
    ['超出两级', 'solana', 3],
    ['循环', 'solana', 1],
  ])('拒绝主题%s并定位 parentId', (_name, parentId, index) => {
    const data = makeHierarchyData()
    Object.assign(data.topics[Number(index)], { parentId })
    const result = LinkDataSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success)
      expect(
        result.error.issues.some(
          (issue) => JSON.stringify(issue.path) === JSON.stringify(['topics', index, 'parentId']),
        ),
      ).toBe(true)
  })
  it('多节点循环能明确报错，主题新增拼错字段仍被拒绝', () => {
    const data = makeHierarchyData()
    Object.assign(data.topics[1], { parentId: 'ethereum' })
    Object.assign(data.topics[3], { parentId: 'solana' })
    const result = LinkDataSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues.some((issue) => issue.message.includes('循环'))).toBe(true)
    const typo = makeData()
    Object.assign(typo.topics[0], { parent: 'web3' })
    expect(LinkDataSchema.safeParse(typo).success).toBe(false)
  })
  it('接受三种形态并为可选字段提供默认值', () => {
    const parsed = LinkDataSchema.parse(makeData()) as ReturnType<typeof makeData> & {
      items: { featured: boolean }[]
    }
    expect(parsed.items[0].featured).toBe(false)
  })

  const invalidCases: [string, (data: any) => void, (string | number)[]][] = [
    ['重复主题', (d) => d.topics.push(d.topics[0]), ['topics', 3, 'id']],
    ['重复条目', (d) => d.items.push(d.items[0]), ['items', 3, 'id']],
    ['不存在主题', (d) => (d.items[0].topic = 'missing'), ['items', 0, 'topic']],
    ['非法形态', (d) => (d.items[0].kind = 'invalid'), ['items', 0, 'kind']],
    ['空用途', (d) => (d.items[0].description = ' '), ['items', 0, 'description']],
    ['非法日期', (d) => (d.updatedAt = '2026-02-30'), ['updatedAt']],
    ['错误版本', (d) => (d.version = 2), ['version']],
    ['重复标签', (d) => (d.items[0].tags = ['免费', ' 免费 ']), ['items', 0, 'tags']],
    ['标签逗号', (d) => (d.items[0].tags = ['免费,PDF']), ['items', 0, 'tags', 0]],
    ['空书单', (d) => (d.items[1].books = []), ['items', 1, 'books']],
    ['空路线', (d) => (d.items[2].steps = []), ['items', 2, 'steps']],
    ['未知字段', (d) => (d.items[0].titel = '拼写错误'), ['items', 0]],
    [
      '文件格式冲突',
      (d) => (d.items[1].books[0].format = 'epub'),
      ['items', 1, 'books', 0, 'format'],
    ],
    ['负数顺序', (d) => (d.topics[0].order = -1), ['topics', 0, 'order']],
  ]
  it.each(invalidCases)('拒绝%s并给出路径', (_, mutate, path) => {
    const data = makeData()
    mutate(data)
    const result = LinkDataSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success)
      expect(
        result.error.issues.some((issue) => JSON.stringify(issue.path) === JSON.stringify(path)),
      ).toBe(true)
  })

  it.each(['javascript:alert(1)', 'file:///tmp/file', 'ftp://example.com/file'])(
    '拒绝非 HTTP(S) 地址 %s',
    (url) => {
      expect(ResourceRefSchema.safeParse({ title: '资料', url }).success).toBe(false)
    },
  )
  it.each([
    '../a.pdf',
    '/files/a.pdf',
    'files/../a.pdf',
    'files//a.pdf',
    'files/a%2fb.pdf',
    'files/a.pdf?x=1',
    'files/a.pdf#p=1',
    'files/a\\b.pdf',
  ])('拒绝危险本地路径 %s', (file) => {
    expect(ResourceRefSchema.safeParse({ title: '资料', file }).success).toBe(false)
  })
  it('至少需要一个访问目标', () => {
    expect(ResourceRefSchema.safeParse({ title: '资料' }).success).toBe(false)
  })
  it('接受中文文件名与双访问目标', () => {
    expect(
      ResourceRefSchema.safeParse({
        title: '资料',
        file: 'files/中文 资料.pdf',
        url: 'https://example.com',
      }).success,
    ).toBe(true)
  })
  it('允许空内容和没有资源的概念阶段', () => {
    expect(LinkDataSchema.safeParse({ ...makeData(), items: [] }).success).toBe(true)
    const data = makeData()
    data.items[2].steps = [{ title: '概念阶段', description: '先理解概念', resources: [] }]
    expect(LinkDataSchema.safeParse(data).success).toBe(true)
  })
})
