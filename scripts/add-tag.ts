import { randomUUID } from 'node:crypto'
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { ItemSchema } from '../src/lib/schema.ts'
import { TAG_ALIASES } from '../src/lib/tagVocabulary.ts'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const USAGE = '用法：npm run add-tag -- <标签> [更多标签...]'
const TagSchema = ItemSchema.options[0].shape.tags.unwrap().element

export type TagRegistration = {
  added: string[]
  existing: string[]
  aliases: { input: string; canonical: string }[]
}

function findArray(source: ts.SourceFile, name: string): ts.ArrayLiteralExpression {
  const declarations = source.statements.flatMap((statement) =>
    ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [],
  )
  let value = declarations.find(
    (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name,
  )?.initializer
  if (value && ts.isAsExpression(value)) value = value.expression
  if (!value || !ts.isArrayLiteralExpression(value))
    throw new Error(`${name} 必须是直接定义的标签数组，未修改词表`)
  return value
}

export function registerTags(values: readonly string[], rootDir = PROJECT_ROOT): TagRegistration {
  if (values.length === 0) throw new Error(USAGE)
  // 复用条目中的同一个 Tag Schema，整批合法后才会修改词表。
  const requested = [...new Set(values.map((value) => TagSchema.parse(value)))]
  const path = join(rootDir, 'src/lib/tagVocabulary.ts')
  const original = readFileSync(path, 'utf8')
  const parsed = ts.createSourceFile(path, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const allowed = findArray(parsed, 'ALLOWED_TAGS')
  const decision = findArray(parsed, 'DECISION_TAGS')
  const known = new Set<string>()
  for (const element of [...decision.elements, ...allowed.elements]) {
    if (ts.isStringLiteral(element)) known.add(element.text)
    else if (!(
      ts.isSpreadElement(element) &&
      ts.isIdentifier(element.expression) &&
      element.expression.text === 'DECISION_TAGS'
    )) {
      throw new Error('词表包含不支持的表达式，未修改 ALLOWED_TAGS')
    }
  }

  const result: TagRegistration = { added: [], existing: [], aliases: [] }
  const byCase = new Map([...known].map((tag) => [tag.toLowerCase(), tag]))
  for (const input of requested) {
    const alias = TAG_ALIASES[input]
    const canonical = alias && known.has(alias) ? alias : (byCase.get(input.toLowerCase()) ?? input)
    if (canonical !== input) result.aliases.push({ input, canonical })
    if (known.has(canonical)) {
      if (!result.added.includes(canonical) && !result.existing.includes(canonical))
        result.existing.push(canonical)
    } else {
      known.add(canonical)
      byCase.set(canonical.toLowerCase(), canonical)
      result.added.push(canonical)
    }
  }
  if (!result.added.length) return result

  let updated = original
  let closing = allowed.end - 1
  const last = allowed.elements.at(-1)
  if (last && !allowed.elements.hasTrailingComma) {
    updated = `${updated.slice(0, last.end)},${updated.slice(last.end)}`
    closing++
  }
  const literals = result.added.map((tag) => JSON.stringify(tag)).join(', ')
  updated = `${updated.slice(0, closing).trimEnd()}\n  ${literals},\n${updated.slice(closing)}`
  const diagnostics = ts.transpileModule(updated, { reportDiagnostics: true }).diagnostics ?? []
  if (diagnostics.some((issue) => issue.category === ts.DiagnosticCategory.Error)) {
    throw new Error('词表存在语法错误，未写入修改')
  }

  // AST 确定插入位置，字符串正确转义；原子替换保留其余代码和注释。
  const temporary = join(dirname(path), `.tagVocabulary-${randomUUID()}.tmp`)
  try {
    writeFileSync(temporary, updated, { flag: 'wx' })
    renameSync(temporary, path)
  } finally {
    rmSync(temporary, { force: true })
  }
  return result
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.length === 1 && args[0] === '--help') {
    console.log(
      `${USAGE}\n例如：npm run add-tag -- Solana "price action" 教程\n标签注册后，写入条目的 tags 才会出现在页面中。`,
    )
  } else {
    try {
      if (args.some((arg) => arg.startsWith('--'))) throw new Error(USAGE)
      const result = registerTags(args)
      if (result.added.length) console.log(`已注册：${result.added.join('、')}`)
      if (result.existing.length) console.log(`已存在：${result.existing.join('、')}`)
      for (const { input, canonical } of result.aliases)
        console.log(`“${input}”使用规范标签“${canonical}”`)
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
  }
}
