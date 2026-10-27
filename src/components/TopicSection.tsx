import type { MouseEvent, ReactNode } from 'react'
import { Focus } from 'lucide-react'
import type { TopicGroup } from '../lib/topics'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { SubtopicSection } from './SubtopicSection'
import { TopicCount } from './TopicCount'
import { TopicItemGrid } from './TopicItemGrid'

type TopicSectionProps = {
  group: TopicGroup
  isFiltered: boolean
  activeId?: string
  expandedIds: ReadonlySet<string>
  onExpandedChange: (id: string, expanded: boolean) => void
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, targetId: string) => void
  scopeId?: string
  filterPanel?: ReactNode
  onScopeChange: (id?: string) => void
}

export function TopicSection({
  group,
  isFiltered,
  activeId,
  expandedIds,
  onExpandedChange,
  onNavigate,
  scopeId,
  filterPanel,
  onScopeChange,
}: TopicSectionProps) {
  const active =
    group.topic.id === activeId || group.subtopics.some((child) => child.topic.id === activeId)
  const generalId = `topic-${group.topic.id}--general`
  const navigation = [
    ...(group.items.length
      ? [{ id: generalId, label: '通用资源', active: activeId === group.topic.id }]
      : []),
    ...group.subtopics.map((child) => ({
      id: `topic-${child.topic.id}`,
      label: child.topic.name,
      active: activeId === child.topic.id,
    })),
  ]
  return (
    <section
      id={`topic-${group.topic.id}`}
      aria-labelledby={`heading-${group.topic.id}`}
      className="scroll-mt-[calc(var(--sticky-offset,88px)+24px)]"
    >
      {/* 一级主题保留竖条与大留白；父级数量汇总子主题，条目只在直接归属处展示。 */}
      <div
        className={cn(
          'mb-6 flex items-start justify-between gap-4 border-l-[3px] border-primary/30 pl-4',
          active && 'border-primary',
        )}
      >
        <div className="min-w-0">
          <h2
            id={`heading-${group.topic.id}`}
            tabIndex={-1}
            className="rounded-sm text-2xl font-semibold tracking-tight wrap-anywhere outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {group.topic.name}
          </h2>
          {group.topic.description && (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {group.topic.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <TopicCount
            name={group.topic.name}
            matchedCount={group.matchedCount}
            totalCount={group.totalCount}
            isFiltered={isFiltered}
          />
          {scopeId !== group.topic.id && (
            <Button variant="outline" aria-label={`只看 ${group.topic.name}`} onClick={() => onScopeChange(group.topic.id)}
              className="min-h-12 gap-1.5 rounded-md bg-card px-3 text-sm font-normal">
              <Focus aria-hidden="true" className="hidden sm:block" />
              只看此主题
            </Button>
          )}
        </div>
      </div>
      {scopeId === group.topic.id && filterPanel}
      {group.hasSubtopics && navigation.length >= 3 && (
        <nav aria-label={`${group.topic.name} 子主题`} className="mb-7 flex flex-wrap gap-1">
          {navigation.map((target) => (
            <Button
              key={target.id}
              asChild
              variant="ghost"
              className={cn(
                'h-auto min-h-12 max-w-full rounded-md px-3 py-2 text-sm font-normal whitespace-normal text-muted-foreground',
                target.active && 'bg-accent text-primary',
              )}
            >
              <a
                href={`#${target.id}`}
                aria-current={target.active ? 'location' : undefined}
                onClick={(event) => onNavigate(event, target.id)}
                className="wrap-anywhere"
              >
                {target.label}
              </a>
            </Button>
          ))}
        </nav>
      )}
      <div className="space-y-8 md:space-y-10">
        {group.items.length > 0 &&
          (group.hasSubtopics ? (
            <section
              id={generalId}
              aria-labelledby={`heading-${group.topic.id}--general`}
              className="scroll-mt-[calc(var(--sticky-offset,88px)+24px)]"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <h3
                  id={`heading-${group.topic.id}--general`}
                  tabIndex={-1}
                  className="min-w-0 rounded-sm text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  通用资源
                </h3>
                <TopicCount
                  name={`${group.topic.name}通用资源`}
                  matchedCount={group.items.length}
                  totalCount={group.directTotalCount}
                  isFiltered={isFiltered}
                />
              </div>
              <TopicItemGrid
                items={group.items}
                headingLevel={4}
                expandedIds={expandedIds}
                onExpandedChange={onExpandedChange}
              />
            </section>
          ) : (
            <TopicItemGrid
              items={group.items}
              headingLevel={3}
              expandedIds={expandedIds}
              onExpandedChange={onExpandedChange}
            />
          ))}
        {group.subtopics.map((child) => (
          <SubtopicSection
            key={child.topic.id}
            group={child}
            parentName={group.topic.name}
            isFiltered={isFiltered}
            active={activeId === child.topic.id}
            expandedIds={expandedIds}
            onExpandedChange={onExpandedChange}
            scopeId={scopeId}
            filterPanel={filterPanel}
            onScopeChange={onScopeChange}
          />
        ))}
      </div>
    </section>
  )
}
