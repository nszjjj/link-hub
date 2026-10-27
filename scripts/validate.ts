import { lstatSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Item, LinkData, ResourceRef } from '../src/lib/schema.ts'
import { ALLOWED_TAGS, TAG_ALIASES } from '../src/lib/tagVocabulary.ts'
import { PROJECT_ROOT, readContent, sourceLocation, type ContentIssue } from './content.ts'

export type ValidationIssue = ContentIssue
export type ValidationReport = {
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  counts: { topics: number; items: number; files: number }
  data?: LinkData
}

const MIB = 1024 * 1024

function isInside(directory: string, path: string): boolean {
  const remainder = relative(directory, path)
  return remainder !== '' && remainder !== '..' && !remainder.startsWith(`..${sep}`) && !isAbsolute(remainder)
}

function resourcesOf(item: Item): ResourceRef[] {
  if (item.kind === 'reading-list') return item.books
  if (item.kind === 'roadmap') return item.steps.flatMap((step) => step.resources)
  return []
}

export function validateLinks(rootDir = PROJECT_ROOT): ValidationReport {
  const report: ValidationReport = { errors: [], warnings: [], counts: { topics: 0, items: 0, files: 0 } }
  const publicDir = resolve(rootDir, 'public')
  const content = readContent(rootDir)
  report.errors.push(...content.errors)
  if (!content.data) return report
  const data = content.data
  report.counts.topics = data.topics.length
  report.counts.items = data.items.length
  const referencedFiles = new Set<string>()
  const references: { value: string; directory: 'files' | 'icons'; path: string; itemId: string }[] = []
  const allowedTags = new Set(ALLOWED_TAGS)

  data.items.forEach((item, index) => {
    const itemPath = sourceLocation(content.sources, ['items', index])
    for (const tag of item.tags) {
      if (!allowedTags.has(tag)) {
        const alias = TAG_ALIASES[tag]
        report.warnings.push({ path: `${itemPath}:tags`, itemId: item.id,
          message: alias ? `标签“${tag}”建议统一为“${alias}”` : `未知标签“${tag}”，请确认或补充词表` })
      }
    }
    if (item.kind === 'site' && item.icon) {
      references.push({ value: item.icon, directory: 'icons', path: `${itemPath}:icon`, itemId: item.id })
    }
    if (item.kind === 'reading-list') {
      item.books.forEach((book, bookIndex) => {
        if (book.file) references.push({ value: book.file, directory: 'files', path: `${itemPath}:books[${bookIndex}].file`, itemId: item.id })
      })
    }
    if (item.kind === 'roadmap') {
      item.steps.forEach((step, stepIndex) => step.resources.forEach((resource, resourceIndex) => {
        if (resource.file) references.push({ value: resource.file, directory: 'files', path: `${itemPath}:steps[${stepIndex}].resources[${resourceIndex}].file`, itemId: item.id })
      }))
    }
    if (item.kind !== 'site') {
      const resources = resourcesOf(item)
      const hasPdf = resources.some((resource) => resource.format === 'pdf' || /\.pdf$/i.test(resource.file ?? ''))
      if (item.tags.includes('PDF') && !hasPdf) {
        report.warnings.push({ path: `${itemPath}:tags`, itemId: item.id, message: '“PDF”标签缺少对应的 PDF 资源' })
      }
    }
  })

  for (const topic of data.topics) {
    if (data.items.filter((item) => item.topic === topic.id && item.featured).length > 2) {
      report.warnings.push({ path: `content/index.json:topics.${topic.id}`, message: '该主题推荐超过两条，建议保留最有价值的入口' })
    }
  }

  const realPublicDir = realpathSync(publicDir)
  for (const reference of references) {
    try {
      const target = realpathSync(join(publicDir, reference.value))
      if (!isInside(join(realPublicDir, reference.directory), target)) throw new Error('符号链接逃逸静态资源目录')
      if (!statSync(target).isFile()) throw new Error('引用目标不是普通文件')
      if (reference.directory === 'files') referencedFiles.add(target)
    } catch (error) {
      report.errors.push({ path: reference.path, itemId: reference.itemId,
        message: `无法引用 ${reference.value}：${error instanceof Error ? error.message : String(error)}` })
    }
  }
  report.counts.files = referencedFiles.size

  let totalBytes = 0
  function inspectPublicFiles(directory: string): void {
    let entries
    try {
      if (!lstatSync(directory).isDirectory()) {
        report.errors.push({ path: relative(rootDir, directory), message: '静态资源目录必须是普通目录，不能是符号链接' })
        return
      }
      entries = readdirSync(directory, { withFileTypes: true })
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return
      report.errors.push({ path: relative(rootDir, directory), message: String(error) })
      return
    }
    for (const entry of entries) {
      const path = join(directory, entry.name)
      if (entry.isSymbolicLink()) {
        report.errors.push({ path: relative(rootDir, path), message: '静态资源目录不允许符号链接，请使用实际文件或外链' })
        continue
      }
      if (entry.isDirectory()) { inspectPublicFiles(path); continue }
      if (!entry.isFile()) continue
      if (!isInside(join(publicDir, 'files'), path)) continue
      const size = statSync(path).size
      totalBytes += size
      const issuePath = relative(rootDir, path)
      if (size > 50 * MIB) report.errors.push({ path: issuePath, message: '单文件超过 50 MiB，请改用外链' })
      else if (size > 15 * MIB) report.warnings.push({ path: issuePath, message: '单文件超过 15 MiB，建议改用外链' })
      if (!referencedFiles.has(realpathSync(path))) report.warnings.push({ path: issuePath, message: '未引用资料，可考虑清理' })
    }
  }
  // Vite 会发布 public 中所有文件，未被 JSON 引用的链接也必须检查。
  inspectPublicFiles(publicDir)
  if (totalBytes > 200 * MIB) report.warnings.push({ path: 'public/files', message: '资料总量超过 200 MiB，建议外置或清理' })
  if (report.errors.length === 0) report.data = data
  return report
}

export function formatValidationIssue(issue: ValidationIssue): string {
  return `${issue.path}${issue.itemId ? ` (${issue.itemId})` : ''}：${issue.message}`
}

export function printValidationReport(report: ValidationReport): void {
  for (const [level, issues] of [['ERROR', report.errors], ['WARNING', report.warnings]] as const) {
    for (const issue of issues) {
      const message = `[${level}] ${formatValidationIssue(issue)}`
      if (level === 'ERROR') console.error(message)
      else console.warn(message)
    }
  }
  if (report.errors.length > 0) {
    console.error(`校验失败：${report.errors.length} 个错误，${report.warnings.length} 个警告`)
  } else {
    console.log(`校验通过：${report.counts.topics} 个主题，${report.counts.items} 个条目，${report.counts.files} 个引用文件，${report.warnings.length} 个警告`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = validateLinks(process.argv[2] ? resolve(process.argv[2]) : PROJECT_ROOT)
  printValidationReport(report)
  if (report.errors.length > 0) process.exitCode = 1
}
