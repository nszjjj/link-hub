// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeData } from '../../test/fixtures'
import { useLinks } from './useLinks'

const response = () => new Response(JSON.stringify(makeData()))
function pending<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useLinks 生命周期', () => {
  it('从 loading 进入 ready，返回已校验的数据', async () => {
    vi.stubGlobal('fetch', async () => response())
    const { result } = renderHook(() => useLinks())
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    if (result.current.status === 'ready') expect(result.current.data.items).toHaveLength(3)
  })
  it('进入 error 后可以重试恢复', async () => {
    let attempts = 0
    vi.stubGlobal('fetch', async () => {
      if (attempts++ === 0) throw new TypeError('offline')
      return response()
    })
    const { result } = renderHook(() => useLinks())
    await waitFor(() => expect(result.current.status).toBe('error'))
    if (result.current.status === 'error') expect(result.current.error.message).toBe('offline')
    act(() => result.current.retry())
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })
  it('重试立即取消旧请求，过期结果不能覆盖新数据', async () => {
    const first = pending<Response>()
    const next = pending<Response>()
    const signals: AbortSignal[] = []
    vi.stubGlobal('fetch', (_url: string, options: RequestInit) => {
      signals.push(options.signal as AbortSignal)
      return signals.length === 1 ? first.promise : next.promise
    })
    const { result } = renderHook(() => useLinks())
    act(() => result.current.retry())
    expect(signals[0].aborted).toBe(true)
    const newer = { ...makeData(), items: [] }
    await act(async () => next.resolve(new Response(JSON.stringify(newer))))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await act(async () => first.resolve(response()))
    if (result.current.status === 'ready') expect(result.current.data.items).toEqual([])
  })
  it('卸载时取消请求，忽略后到结果', async () => {
    const request = pending<Response>()
    let signal!: AbortSignal
    vi.stubGlobal('fetch', (_url: string, options: RequestInit) => {
      signal = options.signal as AbortSignal
      return request.promise
    })
    const { unmount } = renderHook(() => useLinks())
    unmount()
    expect(signal.aborted).toBe(true)
    await act(async () => request.resolve(response()))
  })
  it('15 秒超时进入可重试错误，即使旧请求不响应取消也不会覆盖', async () => {
    vi.useFakeTimers()
    const request = pending<Response>()
    let signal!: AbortSignal
    vi.stubGlobal('fetch', (_url: string, options: RequestInit) => {
      signal = options.signal as AbortSignal
      return request.promise
    })
    const { result } = renderHook(() => useLinks())
    await act(async () => vi.advanceTimersByTimeAsync(15_000))
    expect(result.current.status).toBe('error')
    expect(signal.aborted).toBe(true)
    await act(async () => request.resolve(response()))
    expect(result.current.status).toBe('error')
  })
  it('StrictMode 重挂载取消首个请求并仍能加载', async () => {
    const signals: AbortSignal[] = []
    vi.stubGlobal('fetch', async (_url: string, options: RequestInit) => {
      signals.push(options.signal as AbortSignal)
      return response()
    })
    const { result } = renderHook(() => useLinks(), { wrapper: StrictMode })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(signals[0].aborted).toBe(true)
    expect(signals.at(-1)?.aborted).toBe(false)
  })
})
