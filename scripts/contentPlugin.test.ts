import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, type ViteDevServer } from 'vite'
import { afterEach, describe, expect, it } from 'vitest'
import { writeContentFixture } from '../test/contentFixtures'
import { contentPlugin } from './contentPlugin'

const roots: string[] = []
const servers: ViteDevServer[] = []
// 开发服务涉及 watcher 首次扫描与 75ms 防抖，CI 机器较慢时放宽轮询与用例时限。
const pollOptions = { timeout: 10_000, interval: 50 }
async function fixture(invalid = false) {
  const root = mkdtempSync(join(tmpdir(), 'link-hub-content-dev-'))
  roots.push(root)
  mkdirSync(join(root, 'public/files'), { recursive: true })
  writeFileSync(join(root, 'public/files/guide.pdf'), 'fixture')
  writeContentFixture(root)
  if (invalid) writeFileSync(join(root, 'content/items/markets/charts.json'), '{')
  const server = await createServer({
    root,
    configFile: false,
    base: '/link-hub/',
    plugins: [contentPlugin()],
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'silent',
  })
  servers.push(server)
  await server.listen()
  // Vite 8 的 watcher 在 listen 前已触发过 ready，之后 add 的路径不会再派发 ready。
  // 轮询 getWatched，确认子目录完成首次发现后再测试编辑与增删事件。
  const expectedWatched = [join(root, 'content/items/markets'), join(root, 'public/files')]
  await expect
    .poll(
      () => {
        const watched = server.watcher.getWatched()
        return expectedWatched.every((path) => Boolean(watched[path]))
      },
      pollOptions,
    )
    .toBe(true)
  const url = new URL('data/links.json', server.resolvedUrls!.local[0])
  return { root, url }
}
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
  roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }))
})

describe('开发服务内容自动更新', { timeout: 30_000 }, () => {
  it('无需已有聚合文件即可启动，并从 BASE_URL 加载完整数据', async () => {
    const { url } = await fixture()
    const response = await fetch(url)
    expect(response.status).toBe(200)
    expect((await response.json()).items.map((item: { id: string }) => item.id)).toEqual([
      'charts',
      'books',
      'contracts',
    ])
  })
  it('初始内容无效也能启动，修正源文件后自动恢复', async () => {
    const { root, url } = await fixture(true)
    expect((await fetch(url)).status).toBe(503)
    writeContentFixture(root)
    await expect.poll(async () => (await fetch(url)).status, pollOptions).toBe(200)
    expect((await (await fetch(url)).json()).items).toHaveLength(3)
  })
  it('有效编辑自动发布，错误编辑返回 503，修复后恢复新内容', async () => {
    const { root, url } = await fixture()
    const source = join(root, 'content/items/markets/charts.json')
    const item = JSON.parse(readFileSync(source, 'utf8'))
    item.title = '已更新的行情入口'
    writeFileSync(source, JSON.stringify(item))
    await expect
      .poll(async () => (await (await fetch(url)).json()).items?.[0]?.title, pollOptions)
      .toBe('已更新的行情入口')
    writeFileSync(source, '{')
    await expect.poll(async () => (await fetch(url)).status, pollOptions).toBe(503)
    const failure = await (await fetch(url)).json()
    expect(failure.details).toContain('content/items/markets/charts.json')
    item.title = '修复后的行情入口'
    writeFileSync(source, JSON.stringify(item))
    await expect
      .poll(async () => (await (await fetch(url)).json()).items?.[0]?.title, pollOptions)
      .toBe('修复后的行情入口')
  })
  it('遗漏的新文件和被删除的资料触发校验，补清单与资料后恢复', async () => {
    const { root, url } = await fixture()
    const item = JSON.parse(readFileSync(join(root, 'content/items/markets/charts.json'), 'utf8'))
    item.id = 'extra'
    writeFileSync(join(root, 'content/items/markets/extra.json'), JSON.stringify(item))
    await expect.poll(async () => (await fetch(url)).status, pollOptions).toBe(503)
    const indexPath = join(root, 'content/index.json')
    const index = JSON.parse(readFileSync(indexPath, 'utf8'))
    index.itemFiles.push('items/markets/extra.json')
    writeFileSync(indexPath, JSON.stringify(index))
    await expect
      .poll(async () => (await (await fetch(url)).json()).items?.length, pollOptions)
      .toBe(4)
    const file = join(root, 'public/files/guide.pdf')
    rmSync(file)
    await expect.poll(async () => (await fetch(url)).status, pollOptions).toBe(503)
    writeFileSync(file, 'restored')
    await expect.poll(async () => (await fetch(url)).status, pollOptions).toBe(200)
  })
})
