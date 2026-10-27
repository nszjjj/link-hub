import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { makeData } from './fixtures'

export function writeContentFixture(root: string, data = makeData()) {
  const itemFiles = data.items.map((item) => `items/${item.topic}/${item.id}.json`)
  mkdirSync(join(root, 'content/items'), { recursive: true })
  writeFileSync(
    join(root, 'content/index.json'),
    JSON.stringify({
      version: data.version,
      updatedAt: data.updatedAt,
      topics: data.topics,
      itemFiles,
    }),
  )
  data.items.forEach((item, index) => {
    const path = join(root, 'content', itemFiles[index])
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(item))
  })
}
