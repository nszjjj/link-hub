import { useEffect, useState, type RefObject } from 'react'

export function useStickyOffset(
  headerRef: RefObject<HTMLElement | null>,
  tagBarRef: RefObject<HTMLElement | null>,
  layoutKey?: string,
): number {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const measure = () => {
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0
      const wide = window.matchMedia
        ? window.matchMedia('(min-width: 48rem)').matches
        : window.innerWidth >= 768
      const tagHeight = wide ? (tagBarRef.current?.getBoundingClientRect().height ?? 0) : 0
      const height = headerHeight + tagHeight
      document.documentElement.style.setProperty('--site-header-height', `${headerHeight}px`)
      document.documentElement.style.setProperty('--sticky-offset', `${height}px`)
      setOffset(height)
    }
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    if (headerRef.current) observer?.observe(headerRef.current)
    if (tagBarRef.current) observer?.observe(tagBarRef.current)
    measure()
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [headerRef, tagBarRef, layoutKey])
  return offset
}
