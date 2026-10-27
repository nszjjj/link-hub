import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROJECT_ROOT } from './content.ts'
import { printValidationReport, validateLinks, type ValidationReport } from './validate.ts'

export function generateData(rootDir = PROJECT_ROOT): {
  report: ValidationReport
  changed: boolean
} {
  const report = validateLinks(rootDir)
  if (!report.data || report.errors.length > 0) return { report, changed: false }

  const target = join(rootDir, 'public/data/links.json')
  const contents = `${JSON.stringify(report.data, null, 2)}\n`
  if (existsSync(target) && readFileSync(target, 'utf8') === contents)
    return { report, changed: false }

  mkdirSync(dirname(target), { recursive: true })
  const temporary = join(dirname(target), `.links-${randomUUID()}.tmp`)
  try {
    // 完整校验后原子替换，开发请求不会读取到写入一半的 JSON。
    writeFileSync(temporary, contents, { flag: 'wx' })
    renameSync(temporary, target)
  } finally {
    rmSync(temporary, { force: true })
  }
  return { report, changed: true }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { report, changed } = generateData(
    process.argv[2] ? resolve(process.argv[2]) : PROJECT_ROOT,
  )
  printValidationReport(report)
  if (report.errors.length > 0) process.exitCode = 1
  else console.log(`${changed ? '已生成' : '数据未变化'}：public/data/links.json`)
}
