import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { tsxCli } from '../test/tsx'
import { registerTags } from './add-tag'

const roots: string[] = []
const vocabulary = (root: string) => join(root, 'src/lib/tagVocabulary.ts')

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'link-hub-add-tag-'))
  roots.push(root)
  mkdirSync(join(root, 'src/lib'), { recursive: true })
  writeFileSync(
    vocabulary(root),
    `export const DECISION_TAGS = ['入门', 'PDF'] as const
export const ALLOWED_TAGS: readonly string[] = [
  ...DECISION_TAGS, // 保留决策标签
  '资源', 'API',
]
export const TAG_ALIASES = { pdf: 'PDF' }
`,
  )
  return root
}

function importedTags(root: string): string[] {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        tsxCli,
        '-e',
        `import { ALLOWED_TAGS } from ${JSON.stringify(vocabulary(root))}; process.stdout.write(JSON.stringify(ALLOWED_TAGS))`,
      ],
      { encoding: 'utf8' },
    ),
  )
}

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

describe('注册规范标签', () => {
  it('批量注册并去重，保存后真实词表模块能导入新标签', () => {
    const root = fixture()
    const result = registerTags(['Solana', ' 教程 ', 'Solana'], root)
    expect(result.added).toEqual(['Solana', '教程'])
    expect(importedTags(root)).toEqual(['入门', 'PDF', '资源', 'API', 'Solana', '教程'])
    expect(readFileSync(vocabulary(root), 'utf8')).toContain('// 保留决策标签')
  })
  it('已有规范词和别名不重复注册，重跑不修改文件', () => {
    const root = fixture()
    registerTags(['Solana'], root)
    const before = readFileSync(vocabulary(root), 'utf8')
    const result = registerTags(['Solana', 'solana', 'pdf', '新手'], root)
    expect(result.added).toEqual([])
    expect(result.existing).toEqual(['Solana', 'PDF', '入门'])
    expect(result.aliases).toContainEqual({ input: 'pdf', canonical: 'PDF' })
    expect(result.aliases).toContainEqual({ input: 'solana', canonical: 'Solana' })
    expect(readFileSync(vocabulary(root), 'utf8')).toBe(before)
  })
  it('末项没有逗号且带注释时仍正确追加', () => {
    const root = fixture()
    const path = vocabulary(root)
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace("'资源', 'API',", "'资源', 'API' // 最后一个标签"),
    )
    registerTags(['Solana'], root)
    expect(importedTags(root)).toEqual(['入门', 'PDF', '资源', 'API', 'Solana'])
  })
  it.each([' ', '免费,PDF', 'a'.repeat(25)])(
    '拒绝不符合 Schema 的标签 %s，整批不写入',
    (invalid) => {
      const root = fixture()
      const before = readFileSync(vocabulary(root), 'utf8')
      expect(() => registerTags(['Solana', invalid], root)).toThrow()
      expect(readFileSync(vocabulary(root), 'utf8')).toBe(before)
    },
  )
  it('引号和代码形状的标签作为字符串保存，不改变模块行为', () => {
    const root = fixture()
    registerTags(['x";throw 1;//'], root)
    expect(importedTags(root)).toContain('x";throw 1;//')
  })
  it('没有参数时报出用法，词表结构异常时不覆盖文件', () => {
    const root = fixture()
    expect(() => registerTags([], root)).toThrow('用法')
    writeFileSync(vocabulary(root), 'export const ALLOWED_TAGS = buildTags()')
    expect(() => registerTags(['Solana'], root)).toThrow('ALLOWED_TAGS')
    expect(readFileSync(vocabulary(root), 'utf8')).toBe('export const ALLOWED_TAGS = buildTags()')
  })
})
