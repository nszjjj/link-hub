import { useCallback, useEffect, useRef, type MouseEvent } from 'react'

export function useTopicNavigation(targetIds: readonly string[], ready = true) {
  const allowed = useRef(new Set<string>())
  const initialized = useRef(false)
  const pendingFrame = useRef<number | undefined>(undefined)

  const moveTo = useCallback((id: string, behavior: ScrollBehavior) => {
    if (!allowed.current.has(id)) return
    const target = document.getElementById(id)
    if (!target) return
    target.querySelector<HTMLElement>('h2,h3')?.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'start', behavior })
  }, [])

  const restore = useCallback(() => {
    if (pendingFrame.current !== undefined) cancelAnimationFrame(pendingFrame.current)
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = undefined
      let id: string
      try {
        id = decodeURIComponent(window.location.hash.slice(1))
      } catch {
        return
      }
      moveTo(id, 'auto')
    })
  }, [moveTo])

  useEffect(() => {
    allowed.current = new Set(targetIds)
    if (!initialized.current && ready) {
      initialized.current = true
      restore()
    }
  }, [targetIds, ready, restore])

  useEffect(() => {
    window.addEventListener('hashchange', restore)
    window.addEventListener('popstate', restore)
    return () => {
      initialized.current = false
      if (pendingFrame.current !== undefined) cancelAnimationFrame(pendingFrame.current)
      window.removeEventListener('hashchange', restore)
      window.removeEventListener('popstate', restore)
    }
  }, [restore])

  return useCallback(
    (event: MouseEvent<HTMLAnchorElement>, targetId: string) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return
      if (!allowed.current.has(targetId)) return
      event.preventDefault()
      if (pendingFrame.current !== undefined) cancelAnimationFrame(pendingFrame.current)
      if (window.location.hash !== `#${targetId}`) {
        // hash 导航形成历史记录，保留同页的筛选 query 和已有 history state。
        window.history.pushState(window.history.state, '', `#${targetId}`)
      }
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      moveTo(targetId, reducedMotion ? 'auto' : 'smooth')
    },
    [moveTo],
  )
}
