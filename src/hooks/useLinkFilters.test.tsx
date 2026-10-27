// @vitest-environment jsdom
import { StrictMode, useLayoutEffect } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeData, makeHierarchyData } from '../../test/fixtures'
import { LinkDataSchema } from '../lib/schema'
import { useLinkFilters } from './useLinkFilters'

const data = () => LinkDataSchema.parse(makeData())
const params = () => new URLSearchParams(window.location.search)
const resultIds = (result: ReturnType<typeof useLinkFilters>) =>
  result.filteredItems.map((item) => item.id)

beforeEach(() => {
  vi.useFakeTimers()
  window.history.replaceState({ source: 'test' }, '', '/link-hub/')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  window.history.replaceState(null, '', '/link-hub/')
})

describe('useLinkFilters', () => {
  it('分层结果使用父级汇总计数，URL 筛选后隐藏空子主题', () => {
    const { result } = renderHook(() => useLinkFilters(LinkDataSchema.parse(makeHierarchyData())))
    expect(result.current.totalCount).toBe(5)
    expect(result.current.visibleTopicCount).toBe(2)
    expect(result.current.visibleSubtopicCount).toBe(2)
    expect(result.current.topicTotals.get('web3')).toBe(4)
    act(() => result.current.setKeyword('Solidity'))
    expect(result.current.groups.map((group) => group.topic.id)).toEqual(['web3'])
    expect(result.current.groups[0].subtopics.map((group) => group.topic.id)).toEqual(['solana'])
    expect(result.current.visibleSubtopicCount).toBe(1)
    expect(result.current.topicLocations).toEqual([
      { id: 'web3', label: 'Web3' },
      { id: 'solana', label: 'Web3 / Solana' },
    ])
    expect(result.current.matchedCount).toBe(1)
    expect(result.current.topicTotals.get('solana')).toBe(2)
    act(() => vi.advanceTimersByTime(200))
    expect(params().get('q')).toBe('Solidity')
    act(() => result.current.clearFilters())
    expect(result.current.visibleSubtopicCount).toBe(2)
  })
  it('首次提交时调用操作方法也能生效，不依赖 passive effect 的执行顺序', () => {
    const { result } = renderHook(() => {
      const filters = useLinkFilters(data())
      useLayoutEffect(() => filters.setTagMatch('all'), [filters.setTagMatch])
      return filters
    })
    expect(result.current.tagMatch).toBe('all')
    expect(params().get('match')).toBe('all')
  })
  it('首次从 URL 恢复条件并复用完整检索流程', () => {
    window.history.replaceState(
      { key: 'share' },
      '',
      '/link-hub/?q=Ada&tags=资源,PDF&match=all#markets',
    )
    const { result } = renderHook(() => useLinkFilters(data()))
    expect(result.current.keyword).toBe('Ada')
    expect(result.current.selectedTags).toEqual(['资源', 'PDF'])
    expect(result.current.tagMatch).toBe('all')
    expect(resultIds(result.current)).toEqual(['books'])
    expect(result.current.groups.map((group) => group.topic.id)).toEqual(['markets'])
    expect(result.current.matchedCount).toBe(1)
    expect(result.current.visibleTopicCount).toBe(1)
    expect(result.current.totalCount).toBe(3)
    expect(result.current.topicTotals.get('markets')).toBe(2)
    expect(window.history.state).toEqual({ key: 'share' })
  })

  it('搜索立即生效，URL 在 200ms 后同步并合并连续输入', () => {
    const { result } = renderHook(() => useLinkFilters(data()))
    act(() => result.current.setKeyword('Sol'))
    expect(resultIds(result.current)).toEqual(['contracts'])
    expect(params().has('q')).toBe(false)
    act(() => vi.advanceTimersByTime(199))
    expect(params().has('q')).toBe(false)
    act(() => result.current.setKeyword('Solidity'))
    act(() => vi.advanceTimersByTime(199))
    expect(params().has('q')).toBe(false)
    act(() => vi.advanceTimersByTime(1))
    expect(params().get('q')).toBe('Solidity')
  })

  it('快速连续修改使用最新完整状态，标签操作立即写入且取消搜索防抖', () => {
    const { result } = renderHook(() => useLinkFilters(data()))
    act(() => {
      result.current.setKeyword('Ada')
      result.current.toggleTag('资源')
      result.current.toggleTag('PDF')
      result.current.setTagMatch('all')
    })
    expect(result.current.selectedTags).toEqual(['资源', 'PDF'])
    expect(params().get('q')).toBe('Ada')
    expect(params().get('tags')).toBe('资源,PDF')
    expect(params().get('match')).toBe('all')
    act(() => vi.advanceTimersByTime(1_000))
    expect(params().get('tags')).toBe('资源,PDF')
    expect(resultIds(result.current)).toEqual(['books'])
  })

  it('默认 OR，切换为 AND；快捷标签不引入额外筛选维度', () => {
    window.history.replaceState(null, '', '/link-hub/?match=any')
    const { result } = renderHook(() => useLinkFilters(data()))
    act(() => {
      result.current.toggleTag('工具')
      result.current.toggleTag('资源')
    })
    expect(resultIds(result.current)).toEqual(['charts', 'books', 'contracts'])
    act(() => result.current.setTagMatch('all'))
    expect(resultIds(result.current)).toEqual([])
    act(() => result.current.toggleTag('工具'))
    expect(result.current.selectedTags).toEqual(['资源'])
    expect(resultIds(result.current)).toEqual(['books', 'contracts'])
  })

  it('全量标签不随筛选消失或重排，主题总数保持全量口径', () => {
    const { result } = renderHook(() => useLinkFilters(data()))
    const tags = [...result.current.allTags]
    act(() => result.current.setKeyword('Solidity'))
    expect(result.current.allTags).toEqual(tags)
    expect(result.current.topicTotals.get('markets')).toBe(2)
    expect(result.current.topicTotals.get('empty')).toBe(0)
  })

  it('全部只清标签，清空筛选重置三项条件', () => {
    window.history.replaceState(
      null,
      '',
      '/link-hub/?q=Ada&tags=资源,PDF&match=all&from=share#markets',
    )
    const { result } = renderHook(() => useLinkFilters(data()))
    act(() => result.current.clearTags())
    expect(result.current.keyword).toBe('Ada')
    expect(result.current.tagMatch).toBe('all')
    expect(params().has('tags')).toBe(false)
    act(() => result.current.clearFilters())
    expect(result.current.keyword).toBe('')
    expect(result.current.selectedTags).toEqual([])
    expect(result.current.tagMatch).toBe('grouped')
    expect(window.location.search).toBe('?from=share')
    expect(window.location.hash).toBe('#markets')
    expect(result.current.hasFilters).toBe(false)
  })

  it('未知标签保留，数据加载完成后才判断是否已失效', () => {
    window.history.replaceState(null, '', '/link-hub/?tags=过期标签&match=all')
    const { result, rerender } = renderHook(({ source }) => useLinkFilters(source), {
      initialProps: { source: undefined as ReturnType<typeof data> | undefined },
    })
    expect(result.current.selectedTags).toEqual(['过期标签'])
    expect(result.current.unknownTags).toEqual([])
    rerender({ source: data() })
    expect(result.current.unknownTags).toEqual(['过期标签'])
    expect(resultIds(result.current)).toEqual([])
    expect(params().get('tags')).toBe('过期标签')
    act(() => result.current.removeTag('过期标签'))
    expect(resultIds(result.current)).toEqual(['charts', 'books', 'contracts'])
  })

  it('保留 pathname、hash、history.state 和同步发生的无关 query 修改', () => {
    window.history.replaceState({ key: 'keep' }, '', '/link-hub/?utm=x&utm=y#web3')
    const length = window.history.length
    const { result } = renderHook(() => useLinkFilters(data()))
    act(() => result.current.setKeyword('EVM'))
    window.history.replaceState({ key: 'new' }, '', '/link-hub/?utm=x&utm=y&other=latest#web3')
    act(() => vi.advanceTimersByTime(200))
    expect(window.location.pathname).toBe('/link-hub/')
    expect(window.location.hash).toBe('#web3')
    expect(params().getAll('utm')).toEqual(['x', 'y'])
    expect(params().get('other')).toBe('latest')
    expect(window.history.state).toEqual({ key: 'new' })
    expect(window.history.length).toBe(length)
  })

  it('popstate 恢复 URL 并取消过期输入，恢复动作不回写历史', () => {
    const { result } = renderHook(() => useLinkFilters(data()))
    act(() => result.current.setKeyword('stale'))
    act(() => {
      window.history.replaceState(
        { key: 'history' },
        '',
        '/link-hub/?q=EVM&tags=资源&match=all#web3',
      )
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.keyword).toBe('EVM')
    expect(result.current.selectedTags).toEqual(['资源'])
    expect(result.current.tagMatch).toBe('all')
    expect(resultIds(result.current)).toEqual(['contracts'])
    act(() => vi.advanceTimersByTime(1_000))
    expect(params().get('q')).toBe('EVM')
    expect(window.history.state).toEqual({ key: 'history' })
  })

  it('真实浏览器历史的后退与前进恢复不同的筛选快照', async () => {
    window.history.replaceState(null, '', '/link-hub/?q=Ada&tags=PDF')
    window.history.pushState(null, '', '/link-hub/?q=EVM&tags=资源&match=all')
    const { result } = renderHook(() => useLinkFilters(data()))
    await act(async () => {
      window.history.back()
      await vi.runAllTimersAsync()
    })
    expect(result.current.keyword).toBe('Ada')
    expect(result.current.selectedTags).toEqual(['PDF'])
    await act(async () => {
      window.history.forward()
      await vi.runAllTimersAsync()
    })
    expect(result.current.keyword).toBe('EVM')
    expect(result.current.tagMatch).toBe('all')
  })

  it('卸载取消防抖并移除历史监听', () => {
    const { result, unmount } = renderHook(() => useLinkFilters(data()))
    act(() => result.current.setKeyword('stale'))
    unmount()
    act(() => vi.advanceTimersByTime(1_000))
    expect(params().has('q')).toBe(false)
    window.history.replaceState(null, '', '/link-hub/?q=history')
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(result.current.keyword).toBe('stale')
  })

  it('StrictMode 下仍只执行有效的同步，不新增历史记录', () => {
    const length = window.history.length
    const { result } = renderHook(() => useLinkFilters(data()), { wrapper: StrictMode })
    act(() => result.current.setKeyword('Ada'))
    act(() => vi.advanceTimersByTime(200))
    expect(params().get('q')).toBe('Ada')
    expect(window.history.length).toBe(length)
    expect(resultIds(result.current)).toEqual(['books'])
  })

  it('范围包含子主题，切换与退出保留关键词和标签且立即写入 URL', () => {
    const { result } = renderHook(() => useLinkFilters(LinkDataSchema.parse(makeHierarchyData())))
    act(() => result.current.setTopic('web3'))
    expect(resultIds(result.current)).toEqual(['books', 'contracts', 'solana-docs', 'ethereum-books'])
    expect(result.current.scopeLabel).toBe('Web3')
    expect(params().get('topic')).toBe('web3')
    act(() => {
      result.current.setKeyword('Solana')
      result.current.toggleTag('工具')
      result.current.setTopic('solana')
    })
    expect(result.current.scopeLabel).toBe('Web3 / Solana')
    expect(resultIds(result.current)).toEqual(['solana-docs'])
    expect(params().get('q')).toBe('Solana')
    act(() => result.current.setTopic(undefined))
    expect(result.current.keyword).toBe('Solana')
    expect(result.current.selectedTags).toEqual(['工具'])
    expect(params().has('topic')).toBe(false)
    act(() => vi.advanceTimersByTime(1000))
    expect(params().has('topic')).toBe(false)
  })

  it('清空筛选保留范围，全站和范围内分类共用标签状态', () => {
    const { result } = renderHook(() => useLinkFilters(LinkDataSchema.parse(makeHierarchyData())))
    act(() => {
      result.current.setTopic('web3')
      result.current.toggleTag('路线图')
      result.current.toggleTag('进阶')
    })
    expect(resultIds(result.current)).toEqual(['contracts'])
    expect(result.current.primaryTags).toContain('路线图')
    act(() => result.current.clearContentTags())
    expect(result.current.selectedTags).toEqual(['进阶'])
    act(() => result.current.clearFilters())
    expect(result.current.topicId).toBe('web3')
    expect(resultIds(result.current)).toHaveLength(4)
    expect(result.current.hasConditions).toBe(false)
  })

  it('失效范围加载后才提示，且 popstate 可恢复有效范围与模式', () => {
    window.history.replaceState(null, '', '/link-hub/?topic=missing&tags=工具&match=grouped')
    const { result, rerender } = renderHook(({ source }) => useLinkFilters(source), {
      initialProps: { source: undefined as ReturnType<typeof data> | undefined },
    })
    expect(result.current.unknownTopic).toBe(false)
    rerender({ source: LinkDataSchema.parse(makeHierarchyData()) })
    expect(result.current.unknownTopic).toBe(true)
    expect(resultIds(result.current)).toEqual([])
    act(() => {
      window.history.replaceState(null, '', '/link-hub/?topic=solana&tags=工具&match=grouped')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.unknownTopic).toBe(false)
    expect(result.current.topicId).toBe('solana')
    expect(resultIds(result.current)).toEqual(['solana-docs'])
  })

  it('范围内入口来自筛选前的范围数据，不因关键词或选中属性消失', () => {
    const { result } = renderHook(() => useLinkFilters(LinkDataSchema.parse(makeHierarchyData())))
    act(() => result.current.setTopic('solana'))
    const available = [...result.current.availableTags]
    act(() => result.current.setKeyword('不存在'))
    expect(result.current.availableTags).toEqual(available)
    expect(result.current.primaryTags).toEqual(['工具', '路线图'])
    expect(result.current.topicTotals.get('web3')).toBe(4)
  })
})
