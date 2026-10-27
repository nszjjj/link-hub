import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeData } from '../../test/fixtures'
import { loadLinks } from './loadLinks'

// Vitest 的内部服务固定使用根路径，显式设置待验证的部署环境。
beforeEach(() => vi.stubEnv('BASE_URL', '/link-hub/'))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('运行时加载', () => {
  it('使用项目 BASE_URL，传递取消信号并校验返回数据', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(makeData())))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    const data = await loadLinks(controller.signal)
    expect(data.topics).toHaveLength(3)
    expect(data.items[0].featured).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith('/link-hub/data/links.json', {
      signal: controller.signal, cache: 'no-cache',
    })
  })
  it('HTTP 错误包含状态码', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }))
    await expect(loadLinks()).rejects.toThrow('404')
  })
  it('拒绝格式错误的 JSON', async () => {
    vi.stubGlobal('fetch', async () => new Response('{'))
    await expect(loadLinks()).rejects.toBeInstanceOf(SyntaxError)
  })
  it('运行时拒绝错误数据并保留 Schema 路径', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ ...makeData(), version: 2 })))
    await expect(loadLinks()).rejects.toMatchObject({ issues: expect.arrayContaining([
      expect.objectContaining({ path: ['version'] }),
    ]) })
  })
  it('网络错误向调用方传递', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('offline') })
    await expect(loadLinks()).rejects.toThrow('offline')
  })
})
