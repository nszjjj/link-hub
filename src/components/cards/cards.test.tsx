// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeData } from '../../../test/fixtures'
import { LinkDataSchema } from '../../lib/schema'
import { SiteCard } from './SiteCard'
import { ReadingListCard } from './ReadingListCard'
import { RoadmapCard } from './RoadmapCard'
import { ItemCard } from '../ItemCard'
import { TopicSection } from '../TopicSection'

const source = LinkDataSchema.parse(makeData())
const site = source.items.find((item) => item.kind === 'site')!
const reading = source.items.find((item) => item.kind === 'reading-list')!
const roadmap = source.items.find((item) => item.kind === 'roadmap')!

beforeEach(() => vi.stubEnv('BASE_URL', '/link-hub/'))
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('多形态卡片', () => {
  it('网站整卡为真实安全外链，标签不嵌套交互按钮', () => {
    render(<SiteCard item={{ ...site, featured: true }} />)
    const link = screen.getByRole('link', { name: /行情图表/ })
    expect(link.getAttribute('href')).toBe('https://example.com/charts')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(within(link).queryByRole('button')).toBeNull()
    expect(screen.getByText('推荐')).toBeTruthy()
  })
  it('图标加载失败后仍保留可访问的网站入口', () => {
    const { container } = render(<SiteCard item={{ ...site, icon: 'icons/example.svg' }} />)
    const image = container.querySelector('img')!
    expect(image.getAttribute('src')).toBe('/link-hub/icons/example.svg')
    fireEvent.error(image)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('link', { name: /行情图表/ })).toBeTruthy()
  })
  it('书单默认折叠，展开后提供本地下载动作', () => {
    function Harness() {
      const [expanded, setExpanded] = useState(false)
      return <ReadingListCard item={reading} expanded={expanded} onExpandedChange={setExpanded} />
    }
    render(<Harness />)
    expect(screen.getByText('共 1 本')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /下载 PDF/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '展开书单' }))
    expect(screen.getByRole('button', { name: '收起书单' }).getAttribute('aria-expanded')).toBe(
      'true',
    )
    const download = screen.getByRole('link', { name: /下载 PDF/ })
    expect(download.getAttribute('href')).toBe('/link-hub/files/guide.pdf')
    expect(download.hasAttribute('download')).toBe(true)
  })
  it('路线展开阶段与资源，点击资源不改变展开状态', () => {
    function Harness() {
      const [expanded, setExpanded] = useState(false)
      return <RoadmapCard item={roadmap} expanded={expanded} onExpandedChange={setExpanded} />
    }
    render(<Harness />)
    expect(screen.queryByRole('link', { name: /账户模型/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '展开全部' }))
    const link = screen.getByRole('link', { name: /账户模型/ })
    expect(link.getAttribute('href')).toBe('https://example.com/accounts')
    expect(screen.getByRole('heading', { name: '智能合约', level: 4 })).toBeTruthy()
    fireEvent.click(link)
    expect(screen.getByRole('button', { name: '收起路线' }).getAttribute('aria-expanded')).toBe(
      'true',
    )
  })
  it('ItemCard 按 kind 分发，主题显示筛选计数', () => {
    render(
      <TopicSection
        group={{
          topic: source.topics[0],
          items: [site, reading],
          subtopics: [],
          matchedCount: 2,
          totalCount: 4,
          directTotalCount: 4,
          hasSubtopics: false,
        }}
        isFiltered
        expandedIds={new Set()}
        onExpandedChange={() => {}}
        onNavigate={() => {}}
        onScopeChange={() => {}}
      />,
    )
    expect(screen.getByRole('heading', { name: '行情', level: 2 })).toBeTruthy()
    expect(screen.getByText('2 / 4')).toBeTruthy()
    expect(screen.getByRole('link', { name: /行情图表/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: '展开书单' })).toBeTruthy()
    cleanup()
    render(<ItemCard item={roadmap} expanded={false} onExpandedChange={() => {}} />)
    expect(screen.getByRole('button', { name: '展开全部' })).toBeTruthy()
  })
})
