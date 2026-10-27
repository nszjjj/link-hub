import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, LoaderCircle, Search } from 'lucide-react'
import { useLinks } from './hooks/useLinks'
import { useLinkFilters } from './hooks/useLinkFilters'
import { useActiveTopic } from './hooks/useActiveTopic'
import { useTopicNavigation } from './hooks/useTopicNavigation'
import { useStickyOffset } from './hooks/useStickyOffset'
import { SiteHeader } from './components/SiteHeader'
import { TopicSection } from './components/TopicSection'
import { TopicScope } from './components/TopicScope'
import { TopicFilter } from './components/TopicFilter'
import { Button } from './components/ui/button'
import { Skeleton } from './components/ui/skeleton'

export default function App() {
  const links = useLinks()
  const data = links.status === 'ready' ? links.data : undefined
  const filters = useLinkFilters(data)
  const headerRef = useRef<HTMLElement>(null)
  const tagBarRef = useRef<HTMLDivElement>(null)
  const stickyOffset = useStickyOffset(headerRef, tagBarRef, filters.topicId)
  const topicIds = useMemo(
    () => filters.topicLocations.map((location) => location.id),
    [filters.topicLocations],
  )
  const activeId = useActiveTopic(topicIds, stickyOffset)
  const activeTopic = filters.topicLocations.find((location) => location.id === activeId)?.label
  const anchorIds = useMemo(
    () =>
      filters.groups.flatMap((group) => [
        `topic-${group.topic.id}`,
        ...(group.hasSubtopics && group.items.length ? [`topic-${group.topic.id}--general`] : []),
        ...group.subtopics.map((child) => `topic-${child.topic.id}`),
      ]),
    [filters.groups],
  )
  const onNavigate = useTopicNavigation(anchorIds, links.status === 'ready')
  const topicSummary = filters.visibleSubtopicCount
    ? `${filters.visibleTopicCount} 个一级主题，${filters.visibleSubtopicCount} 个子主题`
    : `${filters.visibleTopicCount} 个主题`
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [announcement, setAnnouncement] = useState('')
  const [topicFiltersExpanded, setTopicFiltersExpanded] = useState(false)
  const topicFilter = <TopicFilter filters={filters} expanded={topicFiltersExpanded} onExpandedChange={setTopicFiltersExpanded} />
  const pendingScopeFocus = useRef(false)

  const onScopeChange = useCallback((id?: string) => {
    pendingScopeFocus.current = true
    filters.setTopic(id)
  }, [filters.setTopic])

  useEffect(() => {
    if (!data || !pendingScopeFocus.current) return
    pendingScopeFocus.current = false
    const target = document.getElementById(filters.topicId ? 'scope-context' : 'main-content')
    target?.focus({ preventScroll: true })
    target?.scrollIntoView?.({ block: 'start', behavior: 'auto' })
  }, [data, filters.topicId])

  const onExpandedChange = useCallback((id: string, expanded: boolean) => {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      if (expanded) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  useEffect(() => {
    if (links.status === 'error') console.error('[Link Hub] 资源加载失败', links.error)
  }, [links])

  useEffect(() => {
    if (links.status !== 'ready') return
    const timer = setTimeout(
      () => setAnnouncement(`${filters.scopeLabel ? `${filters.scopeLabel} 范围内，` : ''}找到 ${filters.matchedCount} 个条目，${topicSummary}`),
      200,
    )
    return () => clearTimeout(timer)
  }, [links.status, filters.matchedCount, topicSummary, filters.scopeLabel])

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:min-h-12 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-4 focus:py-3 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        跳到主内容
      </a>
      <SiteHeader
        filters={filters}
        currentTopic={activeTopic}
        headerRef={headerRef}
        tagBarRef={tagBarRef}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1120px] flex-1 scroll-mt-[calc(var(--sticky-offset,88px)+24px)] px-5 py-8 outline-none sm:px-8 md:py-10"
      >
        {links.status === 'loading' && (
          <div>
            <p role="status" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              正在加载资源
            </p>
            <div aria-hidden="true" className="space-y-6">
              <Skeleton className="h-7 w-36 rounded-md" />
              <div className="grid gap-4 md:grid-cols-2 min-[75rem]:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} className="h-40 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        )}
        {links.status === 'error' && (
          <div role="alert" className="py-16 text-center">
            <BookOpen className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xl font-semibold">资源暂时无法加载</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              请检查网络连接，或稍后重试。
            </p>
            <Button onClick={links.retry} className="mt-6 h-12 rounded-md px-5">
              重新加载
            </Button>
          </div>
        )}
        {data && (
          <>
            <div className="mb-9 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>按主题浏览，找到合适的入口。</p>
              <p className="tabular-nums" aria-hidden="true">
                {filters.matchedCount} 个条目，{topicSummary}
              </p>
              <span role="status" aria-live="polite" className="sr-only">
                {announcement}
              </span>
            </div>
            {filters.topicId && <TopicScope filters={filters} onScopeChange={onScopeChange} />}
            {filters.topicId && filters.matchedCount === 0 && topicFilter}
            {data.items.length === 0 ? (
              <div className="py-16 text-center">
                <BookOpen
                  className="mx-auto mb-4 size-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="text-xl font-semibold">内容正在整理中</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  这里会陆续收录实用的网站、书单与学习路线。
                </p>
              </div>
            ) : filters.matchedCount === 0 ? (
              <div className="py-16 text-center">
                <Search className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-xl font-semibold">还没有找到匹配条目</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  {filters.topicId ? '此主题范围内没有匹配条目，试试清空筛选、换个关键词或查看全部主题。'
                    : '当前筛选下没有匹配条目，试试清空标签或换个关键词。'}
                </p>
                <Button
                  onClick={filters.clearFilters}
                  variant="outline"
                  className="mt-6 h-12 rounded-md bg-card px-5"
                >
                  清空筛选
                </Button>
              </div>
            ) : (
              <div className="space-y-14 md:space-y-16">
                {filters.groups.map((group) => (
                  <TopicSection
                    key={group.topic.id}
                    group={group}
                    isFiltered={filters.hasFilters}
                    activeId={activeId}
                    expandedIds={expandedIds}
                    onExpandedChange={onExpandedChange}
                    onNavigate={onNavigate}
                    scopeId={filters.topicId}
                    filterPanel={topicFilter}
                    onScopeChange={onScopeChange}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      {data && (
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-2 px-5 py-6 text-sm text-muted-foreground sm:px-8">
            <p>
              最后更新 <time dateTime={data.updatedAt}>{data.updatedAt}</time>
            </p>
            <p>个人维护，持续整理。</p>
          </div>
        </footer>
      )}
    </div>
  )
}
