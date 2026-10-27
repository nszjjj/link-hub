import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import { writeContentFixture } from '../test/contentFixtures'
import { tsxCli } from '../test/tsx'
import { generateData } from './generate-data'

const roots: string[] = []
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'link-hub-generate-'))
  roots.push(root)
  mkdirSync(join(root, 'public/files'), { recursive: true })
  writeFileSync(join(root, 'public/files/guide.pdf'), 'fixture')
  writeContentFixture(root)
  return root
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

describe('聚合数据生成', () => {
  it('首次生成完整运行时契约，按清单顺序而非目录或文件名排序', () => {
    const root = fixture()
    const path = join(root, 'content/index.json')
    const index = JSON.parse(readFileSync(path, 'utf8'))
    index.itemFiles.reverse()
    writeFileSync(path, JSON.stringify(index))
    const { report, changed } = generateData(root)
    expect(report.errors).toEqual([])
    expect(changed).toBe(true)
    const data = JSON.parse(readFileSync(join(root, 'public/data/links.json'), 'utf8'))
    expect(data.items.map((item: { id: string }) => item.id)).toEqual([
      'contracts',
      'books',
      'charts',
    ])
    expect(data.version).toBe(1)
    expect(data.updatedAt).toBe('2026-10-27')
    expect(data.topics).toHaveLength(3)
    expect(data.items[0].steps[0].resources[0].title).toBe('账户模型')
    expect(data.itemFiles).toBeUndefined()
    expect(data.items[2].featured).toBe(false)
  })
  it('重复运行不重写相同文件，不修改内容源', () => {
    const root = fixture()
    const source = join(root, 'content/items/markets/charts.json')
    const before = readFileSync(source, 'utf8')
    generateData(root)
    const output = join(root, 'public/data/links.json')
    const mtime = statSync(output).mtimeMs
    expect(generateData(root).changed).toBe(false)
    expect(statSync(output).mtimeMs).toBe(mtime)
    expect(readFileSync(source, 'utf8')).toBe(before)
  })
  it('JSON 错误不生成产物，修复后能重新生成', () => {
    const root = fixture()
    const source = join(root, 'content/items/markets/charts.json')
    const original = readFileSync(source, 'utf8')
    writeFileSync(source, '{')
    expect(generateData(root).report.errors).not.toEqual([])
    expect(existsSync(join(root, 'public/data/links.json'))).toBe(false)
    writeFileSync(source, original)
    expect(generateData(root).changed).toBe(true)
  })
  it('本地资料缺失时保留最后一次有效产物，不覆盖为坏数据', () => {
    const root = fixture()
    generateData(root)
    const output = join(root, 'public/data/links.json')
    const original = readFileSync(output, 'utf8')
    rmSync(join(root, 'public/files/guide.pdf'))
    const result = generateData(root)
    expect(result.report.errors).not.toEqual([])
    expect(result.changed).toBe(false)
    expect(readFileSync(output, 'utf8')).toBe(original)
  })
  it('标签维护警告不阻断生成', () => {
    const root = fixture()
    const source = join(root, 'content/items/markets/charts.json')
    const item = JSON.parse(readFileSync(source, 'utf8'))
    item.tags.push('新手')
    writeFileSync(source, JSON.stringify(item))
    const result = generateData(root)
    expect(result.report.errors).toEqual([])
    expect(result.report.warnings).not.toEqual([])
    expect(result.changed).toBe(true)
  })
  it('CLI 成功生成后退出 0，内容无效时退出非零', () => {
    const root = fixture()
    const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const cli = () =>
      spawnSync(
        process.execPath,
        [tsxCli, join(project, 'scripts/generate-data.ts'), root],
        { encoding: 'utf8' },
      )
    expect(cli().status).toBe(0)
    expect(existsSync(join(root, 'public/data/links.json'))).toBe(true)
    writeFileSync(join(root, 'content/items/markets/charts.json'), '{')
    const result = cli()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('content/items/markets/charts.json')
  })
})
