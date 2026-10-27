import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createServer, type ViteDevServer } from 'vite'
import type { loadLinks } from './loadLinks'
import type { assetUrl } from './paths'

let server: ViteDevServer
let origin: string
const nativeFetch = globalThis.fetch

beforeAll(async () => {
  server = await createServer({
    configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  origin = server.resolvedUrls!.local[0]
}, 15_000)

afterAll(async () => {
  globalThis.fetch = nativeFetch
  await server?.close()
})

it('真实 Vite 服务使用项目 base 加载示例数据和中文文件', async () => {
  const loader = (await server.ssrLoadModule('/src/lib/loadLinks.ts')) as {
    loadLinks: typeof loadLinks
  }
  const paths = (await server.ssrLoadModule('/src/lib/paths.ts')) as { assetUrl: typeof assetUrl }
  // Node fetch 不支持相对 URL，仅补齐浏览器已有的 origin，保留生产请求和校验逻辑。
  globalThis.fetch = (input, options) => nativeFetch(new URL(String(input), origin), options)
  expect(paths.assetUrl('data/links.json')).toBe('/link-hub/data/links.json')
  const data = await loader.loadLinks()
  expect(data.topics.find((topic) => topic.id === 'solana')?.parentId).toBe('web3')
  expect(data.topics.find((topic) => topic.id === 'ethereum')?.parentId).toBe('web3')
  expect(data.items.find((item) => item.id === 'ethereum-roadmap')?.topic).toBe('ethereum')
  for (const kind of ['site', 'reading-list', 'roadmap']) {
    expect(data.items.filter((item) => item.kind === kind).length).toBeGreaterThanOrEqual(2)
  }
  const response = await globalThis.fetch(paths.assetUrl('files/数据层 入门说明.txt'))
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('Link Hub 核心数据层入门说明')
})
