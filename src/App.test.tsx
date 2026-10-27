// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeData, makeHierarchyData } from '../test/fixtures'
import App from './App'

beforeEach(() => window.history.replaceState(null, '', '/link-hub/'))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
const response = () => new Response(JSON.stringify(makeData()))

describe('页面组装', () => {
  it('父主题和子主题形成完整标题层级，通用内容与子级条目只展示一次', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(makeHierarchyData())))
    render(<App />)
    await screen.findByRole('heading', { name: 'Web3', level: 2 })
    expect(screen.getByRole('heading', { name: '通用资源', level: 3 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Solana', level: 3 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Ethereum', level: 3 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Solana 官方文档', level: 4 })).toBeTruthy()
    expect(screen.getAllByRole('heading', { name: '交易书单' })).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: '空子主题' })).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: '展开书单' })[0])
    expect(screen.getByRole('heading', { name: /Market Basics/, level: 5 })).toBeTruthy()
    expect(screen.getByLabelText('Web3：4 个匹配条目，共 4 个')).toBeTruthy()
  })
  it('仅子主题命中时保留父主题和正确分母，恢复筛选保留展开状态', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(makeHierarchyData())))
    render(<App />)
    await screen.findByRole('heading', { name: 'Solana', level: 3 })
    fireEvent.click(screen.getByRole('button', { name: '展开全部' }))
    const search = screen.getAllByRole('searchbox', { name: '搜索资源' })[0]
    fireEvent.change(search, { target: { value: 'Solidity' } })
    expect(screen.getByRole('heading', { name: 'Web3', level: 2 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Solana', level: 3 })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Ethereum' })).toBeNull()
    expect(screen.queryByRole('heading', { name: '通用资源' })).toBeNull()
    expect(screen.getByLabelText('Web3：1 个匹配条目，共 4 个').textContent).toContain('1 / 4')
    expect(screen.getByLabelText('Solana：1 个匹配条目，共 2 个').textContent).toContain('1 / 2')
    expect(screen.queryByRole('navigation', { name: 'Web3 子主题' })).toBeNull()
    fireEvent.change(search, { target: { value: '' } })
    expect(screen.getByRole('button', { name: '收起路线' }).getAttribute('aria-expanded')).toBe(
      'true',
    )
    expect(screen.getByRole('link', { name: /账户模型/ })).toBeTruthy()
  })
  it('子主题锚点保留筛选参数并将键盘焦点移到对应标题', async () => {
    window.history.replaceState({ source: 'share' }, '', '/link-hub/?tags=资源&from=share')
    const originalScroll = HTMLElement.prototype.scrollIntoView
    HTMLElement.prototype.scrollIntoView = vi.fn()
    try {
      vi.stubGlobal('fetch', async () => new Response(JSON.stringify(makeHierarchyData())))
      render(<App />)
      const navigation = await screen.findByRole('navigation', { name: 'Web3 子主题' })
      fireEvent.click(within(navigation).getByRole('link', { name: 'Solana' }))
      expect(window.location.hash).toBe('#topic-solana')
      expect(new URLSearchParams(window.location.search).get('tags')).toBe('资源')
      expect(new URLSearchParams(window.location.search).get('from')).toBe('share')
      expect(window.history.state).toEqual({ source: 'share' })
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Solana', level: 3 }))
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScroll
    }
  })
  it('加载期间显示状态，不提前显示无结果', () => {
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    render(<App />)
    expect(screen.getByText('正在加载资源')).toBeTruthy()
    expect(screen.queryByText('还没有找到匹配条目')).toBeNull()
  })
  it('失败可重试，恢复后按主题展示内容', async () => {
    let attempts = 0
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', async () => {
      if (attempts++ === 0) throw new TypeError('offline')
      return response()
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: '重新加载' }))
    expect(await screen.findByRole('heading', { name: '行情', level: 2 })).toBeTruthy()
  })
  it('过滤隐藏主题与书单后恢复时保留展开状态，无结果可清空', async () => {
    vi.stubGlobal('fetch', async () => response())
    render(<App />)
    await screen.findByRole('heading', { name: '交易书单', level: 3 })
    fireEvent.click(screen.getByRole('button', { name: '展开书单' }))
    expect(screen.getByRole('link', { name: /下载 PDF/ })).toBeTruthy()
    fireEvent.change(screen.getAllByRole('searchbox', { name: '搜索资源' })[0], {
      target: { value: 'Solidity' },
    })
    expect(screen.queryByRole('heading', { name: '行情', level: 2 })).toBeNull()
    fireEvent.change(screen.getAllByRole('searchbox', { name: '搜索资源' })[0], {
      target: { value: '' },
    })
    expect(screen.getByRole('link', { name: /下载 PDF/ })).toBeTruthy()
    fireEvent.change(screen.getAllByRole('searchbox', { name: '搜索资源' })[0], {
      target: { value: '不存在的词' },
    })
    expect(screen.getByText('还没有找到匹配条目')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: '清空筛选' }))
    await waitFor(() => expect(screen.queryByText('还没有找到匹配条目')).toBeNull())
    expect(screen.getByRole('heading', { name: '行情', level: 2 })).toBeTruthy()
  })
  it('有效空数据显示整理状态，不提供无效重置动作', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ ...makeData(), items: [] })))
    render(<App />)
    expect(await screen.findByText('内容正在整理中')).toBeTruthy()
    expect(within(screen.getByRole('main')).queryByRole('button', { name: '清空筛选' })).toBeNull()
  })

  it('只看主题包含子主题，分类就地筛选，清空条件保留范围，退出后恢复全站', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(makeHierarchyData())))
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: '只看 Web3' }))
    expect(new URLSearchParams(window.location.search).get('topic')).toBe('web3')
    expect(screen.queryByRole('heading', { name: '行情', level: 2 })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Ethereum', level: 3 })).toBeTruthy()
    const local = screen.getByRole('group', { name: '主题内内容分类' })
    fireEvent.click(within(local).getByRole('button', { name: '路线图' }))
    expect(screen.getByRole('heading', { name: '合约路线' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '交易书单' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Ethereum' })).toBeNull()
    expect(screen.getByLabelText('Web3：1 个匹配条目，共 4 个')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '更多筛选' }))
    fireEvent.change(screen.getAllByRole('searchbox', { name: '搜索资源' })[0], { target: { value: '不存在' } })
    expect(screen.getByText('还没有找到匹配条目')).toBeTruthy()
    expect(screen.getByRole('group', { name: '主题内内容分类' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '收起筛选' }).getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(within(screen.getByRole('main')).getAllByRole('button', { name: '清空筛选' })[0])
    expect(new URLSearchParams(window.location.search).get('topic')).toBe('web3')
    expect(screen.getByRole('heading', { name: 'Ethereum', level: 3 })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '查看全部主题' }))
    expect(new URLSearchParams(window.location.search).has('topic')).toBe(false)
    expect(screen.getByRole('heading', { name: '行情', level: 2 })).toBeTruthy()
  })

  it('可直接进入子主题并切换主题，保留标签，范围失效时有明确恢复入口', async () => {
    window.history.replaceState(null, '', '/link-hub/?topic=missing&tags=工具&match=grouped')
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(makeHierarchyData())))
    render(<App />)
    expect(await screen.findByText('此主题已不存在')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '切换主题' }))
    fireEvent.click(screen.getByRole('button', { name: '切换到 Web3 / Solana' }))
    expect(new URLSearchParams(window.location.search).get('topic')).toBe('solana')
    expect(new URLSearchParams(window.location.search).get('tags')).toBe('工具')
    expect(screen.getByRole('heading', { name: 'Solana 官方文档' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Ethereum' })).toBeNull()
    expect(screen.queryByRole('heading', { name: '交易书单' })).toBeNull()
  })
})
