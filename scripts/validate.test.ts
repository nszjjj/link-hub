import { execFileSync, spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  truncateSync,
  symlinkSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { makeData, makeHierarchyData } from '../test/fixtures'
import { writeContentFixture } from '../test/contentFixtures'
import { validateLinks } from './validate'

const roots: string[] = []
function fixture(data = makeData()) {
  const root = mkdtempSync(join(tmpdir(), 'link-hub-validate-'))
  roots.push(root)
  mkdirSync(join(root, 'public/data'), { recursive: true })
  mkdirSync(join(root, 'public/files'), { recursive: true })
  writeContentFixture(root, data)
  writeFileSync(join(root, 'public/files/guide.pdf'), 'test fixture')
  return root
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

describe('构建校验', () => {
  it('两级主题通过共享校验，父级错误定位到维护清单字段', () => {
    const data = makeHierarchyData()
    const root = fixture(data)
    expect(validateLinks(root).errors).toEqual([])
    Object.assign(data.topics[2], { parentId: 'missing' })
    writeContentFixture(root, data)
    expect(validateLinks(root).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'content/index.json:topics[2].parentId' }),
      ]),
    )
  })
  it('有效数据及引用文件通过校验', () => {
    expect(validateLinks(fixture()).errors).toEqual([])
  })
  it('格式错误 JSON 进入错误报告', () => {
    const root = fixture()
    writeFileSync(join(root, 'content/items/markets/charts.json'), '{')
    expect(validateLinks(root).errors).not.toEqual([])
  })
  it('Schema 错误包含条目 id 和具体路径', () => {
    const data = makeData()
    data.items[0].topic = 'missing'
    const errors = validateLinks(fixture(data)).errors
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'content/items/missing/charts.json:topic',
          itemId: 'charts',
        }),
      ]),
    )
  })
  it('清单缺失或拼写错误字段阻断，不能回退到旧聚合文件', () => {
    const root = fixture()
    writeFileSync(join(root, 'public/data/links.json'), JSON.stringify(makeData()))
    rmSync(join(root, 'content/index.json'))
    expect(validateLinks(root).errors).not.toEqual([])
    writeFileSync(
      join(root, 'content/index.json'),
      JSON.stringify({ ...makeData(), itemFiles: [] }),
    )
    expect(validateLinks(root).errors).not.toEqual([])
  })
  it('清单中不存在的条目文件报出具体文件', () => {
    const root = fixture()
    rmSync(join(root, 'content/items/markets/charts.json'))
    expect(validateLinks(root).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'content/items/markets/charts.json' }),
      ]),
    )
  })
  it('未加入清单的 JSON 阻断，防止维护者遗漏发布', () => {
    const root = fixture()
    writeFileSync(join(root, 'content/items/markets/extra.json'), '{}')
    expect(validateLinks(root).errors.some((issue) => issue.path.endsWith('extra.json'))).toBe(true)
  })
  it.each([
    '../outside.json',
    '/tmp/item.json',
    'items/markets/../charts.json',
    'items/markets/charts.txt',
  ])('拒绝不安全或不规范条目路径 %s', (path) => {
    const root = fixture()
    const indexPath = join(root, 'content/index.json')
    const index = JSON.parse(readFileSync(indexPath, 'utf8'))
    index.itemFiles[0] = path
    writeFileSync(indexPath, JSON.stringify(index))
    expect(validateLinks(root).errors).not.toEqual([])
  })
  it('重复文件引用阻断', () => {
    const root = fixture()
    const indexPath = join(root, 'content/index.json')
    const index = JSON.parse(readFileSync(indexPath, 'utf8'))
    index.itemFiles.push(index.itemFiles[0])
    writeFileSync(indexPath, JSON.stringify(index))
    expect(validateLinks(root).errors).not.toEqual([])
  })
  it('文件名或所属目录与条目的 id/topic 不一致时阻断', () => {
    const root = fixture()
    const path = join(root, 'content/items/markets/charts.json')
    writeFileSync(path, JSON.stringify({ ...makeData().items[0], id: 'other', topic: 'web3' }))
    expect(
      validateLinks(root).errors.some((issue) =>
        issue.path.startsWith('content/items/markets/charts.json'),
      ),
    ).toBe(true)
  })
  it('跨主题的重复条目 id 仍能被共享 Schema 检出', () => {
    const data = makeData()
    data.items[2].id = 'charts'
    expect(validateLinks(fixture(data)).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'content/items/web3/charts.json:id', itemId: 'charts' }),
      ]),
    )
  })
  it('重复主题仍能被共享 Schema 检出', () => {
    const data = makeData()
    data.topics.push(data.topics[0])
    expect(
      validateLinks(fixture(data)).errors.some(
        (issue) => issue.path === 'content/index.json:topics[3].id',
      ),
    ).toBe(true)
  })
  it.each(['index', 'item', 'directory'])('拒绝内容源中的 %s 符号链接', (kind) => {
    const root = fixture()
    const path = join(
      root,
      kind === 'index'
        ? 'content/index.json'
        : kind === 'item'
          ? 'content/items/markets/charts.json'
          : 'content/items/web3',
    )
    const outside = join(root, 'outside')
    if (kind === 'directory') mkdirSync(outside)
    else writeFileSync(outside, readFileSync(path))
    rmSync(path, { recursive: true })
    symlinkSync(outside, path)
    expect(validateLinks(root).errors).not.toEqual([])
  })
  it('允许有效的空条目清单', () => {
    const data = makeData()
    data.items = []
    const root = fixture(data)
    rmSync(join(root, 'public/files/guide.pdf'))
    expect(validateLinks(root).errors).toEqual([])
    expect(validateLinks(root).counts.items).toBe(0)
  })
  it('缺失本地资料阻断', () => {
    const root = fixture()
    rmSync(join(root, 'public/files/guide.pdf'))
    expect(validateLinks(root).errors.some((issue) => issue.path.includes('books[0].file'))).toBe(
      true,
    )
  })
  it('符号链接逃逸本地文件边界被拒绝', () => {
    const root = fixture()
    rmSync(join(root, 'public/files/guide.pdf'))
    writeFileSync(join(root, 'outside.pdf'), 'outside')
    symlinkSync(join(root, 'outside.pdf'), join(root, 'public/files/guide.pdf'))
    expect(validateLinks(root).errors).not.toEqual([])
  })
  it.each(['files', 'icons', 'data'])(
    '未引用的 %s 符号链接也必须阻断，避免 Vite 发布目录外的大文件',
    (directory) => {
      const data = makeData()
      data.items = []
      const root = fixture(data)
      rmSync(join(root, 'public/files/guide.pdf'))
      const outside = join(root, 'private.pdf')
      writeFileSync(outside, '')
      truncateSync(outside, 51 * 1024 * 1024)
      mkdirSync(join(root, 'public', directory), { recursive: true })
      symlinkSync(outside, join(root, 'public', directory, 'leak.pdf'))
      expect(validateLinks(root).errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: `public/${directory}/leak.pdf` })]),
      )
    },
  )
  it('未知标签只警告并建议规范别名', () => {
    const data = makeData()
    data.items[0].tags.push('新手', 'pdf')
    const report = validateLinks(fixture(data))
    expect(report.errors).toEqual([])
    expect(report.warnings.map((issue) => issue.message).join(' ')).toContain('入门')
    expect(report.warnings.map((issue) => issue.message).join(' ')).toContain('PDF')
  })
  it('超过 15 MiB 警告，超过 50 MiB 阻断，恰好 50 MiB 不阻断', () => {
    const root = fixture()
    const file = join(root, 'public/files/guide.pdf')
    truncateSync(file, 15 * 1024 * 1024 + 1)
    expect(validateLinks(root).warnings.some((issue) => issue.path.endsWith('guide.pdf'))).toBe(
      true,
    )
    expect(validateLinks(root).errors).toEqual([])
    truncateSync(file, 50 * 1024 * 1024)
    expect(validateLinks(root).errors).toEqual([])
    truncateSync(file, 50 * 1024 * 1024 + 1)
    expect(validateLinks(root).errors.some((issue) => issue.path.endsWith('guide.pdf'))).toBe(true)
  })
  it('检查目录内未引用文件及总量预算', () => {
    const root = fixture()
    for (let i = 0; i < 5; i++) {
      const file = join(root, `public/files/unused-${i}.pdf`)
      writeFileSync(file, '')
      truncateSync(file, 41 * 1024 * 1024)
    }
    const report = validateLinks(root)
    expect(report.errors).toEqual([])
    expect(report.warnings.some((issue) => issue.message.includes('200 MiB'))).toBe(true)
    expect(report.warnings.some((issue) => issue.message.includes('未引用'))).toBe(true)
  })
  it('推荐超过两条以及资料标签冲突只警告', () => {
    const data = makeData()
    data.items.forEach((item) => {
      item.topic = 'markets'
      Object.assign(item, { featured: true })
    })
    data.items[1].books![0].access = 'unknown'
    const report = validateLinks(fixture(data))
    expect(report.errors).toEqual([])
    expect(report.warnings.map((issue) => issue.message).join(' ')).toContain('推荐')
    expect(report.warnings.map((issue) => issue.message).join(' ')).toContain('免费')
  })
  it('CLI 有效内容退出 0，缺文件退出非零', () => {
    const root = fixture()
    const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const tsx = join(projectRoot, 'node_modules/.bin/tsx')
    const script = join(projectRoot, 'scripts/validate.ts')
    expect(execFileSync(tsx, [script, root], { encoding: 'utf8' })).toContain('校验通过')
    rmSync(join(root, 'public/files/guide.pdf'))
    expect(spawnSync(tsx, [script, root], { encoding: 'utf8' }).status).toBe(1)
  })
})
