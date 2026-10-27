// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTopicNavigation } from './useTopicNavigation'

const originalScroll = HTMLElement.prototype.scrollIntoView

function Harness({ ids, ready = true }: { ids: string[]; ready?: boolean }) {
  useTopicNavigation(ids, ready)
  return (
    <div>
      <button>搜索操作</button>
      {ids.map((id) => (
        <section key={id} id={id}>
          <h3 tabIndex={-1}>{id}</h3>
        </section>
      ))}
    </div>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  HTMLElement.prototype.scrollIntoView = vi.fn()
  window.history.replaceState({ source: 'share' }, '', '/link-hub/?tags=资源#topic-solana')
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  HTMLElement.prototype.scrollIntoView = originalScroll
  window.history.replaceState(null, '', '/link-hub/')
})

describe('主题锚点恢复', () => {
  it('数据加载后才定位分享锚点，StrictMode 下仍正确恢复且不新增历史', () => {
    const length = window.history.length
    const { rerender } = render(
      <StrictMode>
        <Harness ids={[]} ready={false} />
      </StrictMode>,
    )
    act(() => vi.advanceTimersByTime(20))
    rerender(
      <StrictMode>
        <Harness ids={['topic-web3', 'topic-solana']} />
      </StrictMode>,
    )
    act(() => vi.advanceTimersByTime(20))
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'topic-solana' }))
    expect(window.history.length).toBe(length)
    expect(new URLSearchParams(window.location.search).get('tags')).toBe('资源')
  })
  it('正常筛选重渲染不重复跳到旧锚点或抢走搜索焦点', () => {
    const { rerender } = render(<Harness ids={['topic-web3', 'topic-solana']} />)
    act(() => vi.advanceTimersByTime(20))
    screen.getByRole('button').focus()
    rerender(<Harness ids={['topic-solana']} />)
    act(() => vi.advanceTimersByTime(20))
    expect(document.activeElement).toBe(screen.getByRole('button'))
  })
  it('初次内容已就绪但无匹配目标时，之后清空筛选不突然跳到旧 hash', () => {
    const { rerender } = render(<Harness ids={[]} />)
    act(() => vi.advanceTimersByTime(20))
    screen.getByRole('button').focus()
    rerender(<Harness ids={['topic-solana']} />)
    act(() => vi.advanceTimersByTime(20))
    expect(document.activeElement).toBe(screen.getByRole('button'))
  })
  it('历史事件在新主题挂载后恢复位置，保留历史 state 和 query', () => {
    const { rerender } = render(<Harness ids={['topic-solana']} />)
    act(() => vi.advanceTimersByTime(20))
    act(() => {
      window.history.replaceState({ source: 'history' }, '', '/link-hub/?q=Ethereum#topic-ethereum')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    rerender(<Harness ids={['topic-ethereum']} />)
    act(() => vi.advanceTimersByTime(20))
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'topic-ethereum' }))
    expect(window.history.state).toEqual({ source: 'history' })
    expect(window.location.search).toBe('?q=Ethereum')
  })
  it('未知或损坏的 hash 保持原样，卸载取消待定位任务', () => {
    window.history.replaceState(null, '', '/link-hub/#%E0%A4%A')
    const { unmount } = render(<Harness ids={['topic-solana']} />)
    act(() => vi.advanceTimersByTime(20))
    expect(window.location.hash).toBe('#%E0%A4%A')
    act(() => {
      window.history.replaceState(null, '', '/link-hub/#topic-solana')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    unmount()
    expect(() => act(() => vi.advanceTimersByTime(20))).not.toThrow()
  })
})
