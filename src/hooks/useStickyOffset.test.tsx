// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStickyOffset } from './useStickyOffset'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.documentElement.style.removeProperty('--site-header-height')
  document.documentElement.style.removeProperty('--sticky-offset')
})

describe('统一固定区域偏移', () => {
  function fixture() {
    let headerHeight = 80
    const header = document.createElement('header')
    const tags = document.createElement('div')
    header.getBoundingClientRect = () => ({ height: headerHeight }) as DOMRect
    tags.getBoundingClientRect = () => ({ height: 57 }) as DOMRect
    const headerRef = { current: header }
    const tagRef = { current: tags as HTMLElement | null }
    let notify = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    vi.stubGlobal('matchMedia', () => ({ matches: window.innerWidth >= 768 }))
    vi.stubGlobal('innerWidth', 1024)
    const rendered = renderHook(({ scope }) => useStickyOffset(headerRef, tagRef, scope), {
      initialProps: { scope: undefined as string | undefined },
    })
    return {
      ...rendered,
      tagRef,
      tags,
      changeHeight: (height: number) => {
        headerHeight = height
        act(() => notify())
      },
    }
  }

  it('桌面计入真实标签栏高度，移动端只计头部，搜索展开后更新偏移', () => {
    const { result, changeHeight } = fixture()
    expect(result.current).toBe(137)
    expect(document.documentElement.style.getPropertyValue('--site-header-height')).toBe('80px')
    expect(document.documentElement.style.getPropertyValue('--sticky-offset')).toBe('137px')
    changeHeight(148)
    expect(result.current).toBe(205)
    act(() => {
      vi.stubGlobal('innerWidth', 320)
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current).toBe(148)
    expect(document.documentElement.style.getPropertyValue('--sticky-offset')).toBe('148px')
  })
  it('卸载后窗口尺寸变化不再改写页面偏移', () => {
    const { unmount } = fixture()
    unmount()
    act(() => {
      vi.stubGlobal('innerWidth', 320)
      window.dispatchEvent(new Event('resize'))
    })
    expect(document.documentElement.style.getPropertyValue('--sticky-offset')).toBe('137px')
  })
  it('进入和退出主题范围后重新测量已卸载或重新挂载的分类栏', () => {
    const { result, rerender, tagRef, tags } = fixture()
    expect(result.current).toBe(137)
    tagRef.current = null
    rerender({ scope: 'web3' })
    expect(result.current).toBe(80)
    tagRef.current = tags
    rerender({ scope: undefined })
    expect(result.current).toBe(137)
  })
})
