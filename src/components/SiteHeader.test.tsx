// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLinkFilters } from '../hooks/useLinkFilters'
import { LinkDataSchema } from '../lib/schema'
import { makeData } from '../../test/fixtures'
import { SiteHeader } from './SiteHeader'

const source = LinkDataSchema.parse(makeData())
function Harness({ currentTopic }: { currentTopic?: string }) {
  const filters = useLinkFilters(source)
  return <SiteHeader filters={filters} currentTopic={currentTopic} />
}

beforeEach(() => {
  vi.useFakeTimers()
  window.history.replaceState(null, '', '/link-hub/')
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('头部与标签筛选', () => {
  it('可访问搜索框实时更新关键词并同步 URL', () => {
    render(<Harness />)
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索资源' }), { target: { value: 'Solidity' } })
    vi.advanceTimersByTime(200)
    expect(new URLSearchParams(window.location.search).get('q')).toBe('Solidity')
  })
  it('进入主题范围后隐藏头部当前主题，避免与范围提示重复', () => {
    render(<Harness currentTopic="Web3" />)
    expect(screen.getByText('Web3')).toBeTruthy()
    cleanup()
    window.history.replaceState(null, '', '/link-hub/?topic=web3')
    render(<Harness currentTopic="Web3" />)
    expect(screen.queryByText('Web3')).toBeNull()
  })
  it('常用入口和完整标签区共用选择状态，可移除及清空', () => {
    render(<Harness />)
    const quick = screen.getByRole('group', { name: '内容分类' })
    fireEvent.click(within(quick).getByRole('button', { name: '工具' }))
    expect(within(quick).getByRole('button', { name: '工具' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(quick).queryByRole('button', { name: 'PDF' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '更多筛选' }))
    const panel = screen.getByRole('group', { name: '全部标签' })
    expect(within(panel).getByRole('button', { name: '工具' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: '移除标签：工具' }))
    expect(within(quick).getByRole('button', { name: '工具' }).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(within(panel).getByRole('button', { name: 'PDF' }))
    fireEvent.click(screen.getByRole('button', { name: '清空筛选' }))
    expect(new URLSearchParams(window.location.search).has('tags')).toBe(false)
  })
  it('旧链接仍可切换原匹配方式，且可明确转入分组匹配', () => {
    window.history.replaceState(null, '', '/link-hub/?match=any')
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '更多筛选' }))
    fireEvent.click(screen.getByRole('button', { name: '资源' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }))
    fireEvent.click(screen.getByRole('radio', { name: '全部标签' }))
    expect(new URLSearchParams(window.location.search).get('match')).toBe('all')
    expect(screen.getByText('匹配全部标签')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: '按分组匹配' }))
    expect(new URLSearchParams(window.location.search).get('match')).toBe('grouped')
    expect(screen.getByText('同组匹配任一项，不同组同时满足')).toBeTruthy()
  })
})
