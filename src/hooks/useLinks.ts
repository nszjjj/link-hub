import { useCallback, useEffect, useRef, useState } from 'react'
import { loadLinks } from '../lib/loadLinks'
import type { LinkData } from '../lib/schema'

export type LinksState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: LinkData }

export type UseLinksResult = LinksState & { retry: () => void }

export function useLinks(): UseLinksResult {
  const [state, setState] = useState<LinksState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const requestId = useRef(0)
  const currentController = useRef<AbortController | null>(null)

  const retry = useCallback(() => {
    // 在新的 effect 运行前立即使旧结果失效。
    requestId.current++
    currentController.current?.abort()
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    const id = ++requestId.current
    const controller = new AbortController()
    currentController.current = controller
    let active = true
    const isCurrent = () => active && requestId.current === id

    const timer = setTimeout(() => {
      if (!isCurrent()) return
      active = false
      const error = new Error('资源加载超时，请重试')
      controller.abort(error)
      setState({ status: 'error', error })
    }, 15_000)

    void loadLinks(controller.signal).then((data) => {
      if (!isCurrent()) return
      active = false
      clearTimeout(timer)
      setState({ status: 'ready', data })
    }).catch((reason: unknown) => {
      if (!isCurrent()) return
      active = false
      clearTimeout(timer)
      const error = reason instanceof Error ? reason : new Error(String(reason))
      setState({ status: 'error', error })
    })

    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
      if (currentController.current === controller) currentController.current = null
    }
  }, [attempt])

  return { ...state, retry }
}
