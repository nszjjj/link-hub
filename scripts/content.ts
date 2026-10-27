import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { LinkDataSchema, type LinkData } from '../src/lib/schema.ts'

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export type ContentIssue = { path: string; message: string; itemId?: string }

const ContentIndexSchema = z
  .object({
    version: LinkDataSchema.shape.version,
    updatedAt: LinkDataSchema.shape.updatedAt,
    $schema: LinkDataSchema.shape.$schema,
    topics: LinkDataSchema.shape.topics,
    itemFiles: z
      .array(
        z
          .string()
          .regex(
            /^items\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/,
            '条目路径必须为 items/<topic>/<id>.json，使用小写字母、数字和连字符',
          ),
      )
      .refine((files) => new Set(files).size === files.length, '不能重复引用条目文件'),
  })
  .strict()

function formatPath(parts: readonly PropertyKey[]): string {
  return parts.reduce<string>(
    (path, part) =>
      typeof part === 'number' ? `${path}[${part}]` : `${path}${path ? '.' : ''}${String(part)}`,
    '',
  )
}

export function sourceLocation(sources: readonly string[], parts: readonly PropertyKey[]): string {
  const isItem = parts[0] === 'items' && typeof parts[1] === 'number'
  const file = isItem ? sources[parts[1] as number] : 'content/index.json'
  const field = formatPath(isItem ? parts.slice(2) : parts)
  return `${file}${field ? `:${field}` : ''}`
}

export function readContent(rootDir = PROJECT_ROOT): {
  data?: LinkData
  sources: string[]
  errors: ContentIssue[]
} {
  const root = resolve(rootDir)
  const errors: ContentIssue[] = []
  const sources: string[] = []

  function readJson(file: string): unknown {
    try {
      let path = root
      const parts = file.split('/')
      parts.forEach((part, index) => {
        path = join(path, part)
        const stats = lstatSync(path)
        if (stats.isSymbolicLink()) throw new Error('内容源不允许符号链接，请使用实际文件')
        if (index < parts.length - 1 ? !stats.isDirectory() : !stats.isFile()) {
          throw new Error('内容路径必须指向普通目录中的 JSON 文件')
        }
      })
      return JSON.parse(readFileSync(path, 'utf8'))
    } catch (error) {
      errors.push({ path: file, message: error instanceof Error ? error.message : String(error) })
      return undefined
    }
  }

  const rawIndex = readJson('content/index.json')
  if (errors.length) return { sources, errors }
  const indexResult = ContentIndexSchema.safeParse(rawIndex)
  if (!indexResult.success) {
    errors.push(
      ...indexResult.error.issues.map((issue) => ({
        path: sourceLocation([], issue.path),
        message: issue.message,
      })),
    )
    return { sources, errors }
  }

  const { itemFiles, ...metadata } = indexResult.data
  sources.push(...itemFiles.map((file) => `content/${file}`))
  const items = sources.map(readJson)
  const listed = new Set(sources)

  function inspectItems(directory: string): void {
    try {
      const stats = lstatSync(join(root, directory))
      if (!stats.isDirectory() || stats.isSymbolicLink()) {
        errors.push({ path: directory, message: '内容目录必须是普通目录，不能是符号链接' })
        return
      }
      for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
        const file = `${directory}/${entry.name}`
        if (entry.isSymbolicLink()) {
          errors.push({ path: file, message: '内容源不允许符号链接' })
        } else if (entry.isDirectory()) {
          inspectItems(file)
        } else if (entry.isFile() && /\.json$/i.test(entry.name) && !listed.has(file)) {
          errors.push({
            path: file,
            message: '条目文件未加入 content/index.json 的 itemFiles 清单',
          })
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return
      errors.push({
        path: directory,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  inspectItems('content/items')
  if (errors.length) return { sources, errors }

  // 仍使用同一个运行时契约，跨文件的唯一性与主题引用不会因拆分而放宽。
  const result = LinkDataSchema.safeParse({ ...metadata, items })
  if (!result.success) {
    for (const issue of result.error.issues) {
      const item =
        issue.path[0] === 'items' && typeof issue.path[1] === 'number'
          ? items[issue.path[1]]
          : undefined
      const itemId =
        typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string'
          ? item.id
          : undefined
      errors.push({ path: sourceLocation(sources, issue.path), message: issue.message, itemId })
    }
    return { sources, errors }
  }

  result.data.items.forEach((item, index) => {
    const expected = `content/items/${item.topic}/${item.id}.json`
    if (sources[index] !== expected) {
      errors.push({
        path: sources[index],
        itemId: item.id,
        message: `文件路径与 topic/id 不一致，应为 ${expected}`,
      })
    }
  })
  return { data: errors.length ? undefined : result.data, sources, errors }
}
