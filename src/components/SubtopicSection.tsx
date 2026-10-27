import type { TopicContentGroup } from '../lib/topics'
import type { ReactNode } from 'react'
import { Focus } from 'lucide-react'
import { hasTopicHub } from '../lib/routes'
import { cn } from '../lib/utils'
import { TopicCount } from './TopicCount'
import { TopicHubEntry } from './TopicHubEntry'
import { TopicItemGrid } from './TopicItemGrid'
import { Button } from './ui/button'

type SubtopicSectionProps = {
  group: TopicContentGroup
  parentName: string
  isFiltered: boolean
  active: boolean
  expandedIds: ReadonlySet<string>
  onExpandedChange: (id: string, expanded: boolean) => void
  scopeId?: string
  filterPanel?: ReactNode
  onScopeChange: (id?: string) => void
}

export function SubtopicSection({
  group,
  parentName,
  isFiltered,
  active,
  expandedIds,
  onExpandedChange,
  scopeId,
  filterPanel,
  onScopeChange,
}: SubtopicSectionProps) {
  const hub = hasTopicHub(group.topic.id)
  // 有 Hub 时默认只展示入口；搜索/标签筛选时仍列出命中卡片，避免发现性丢失
  const showHubEntryOnly = hub && !isFiltered

  return (
    <section
      id={`topic-${group.topic.id}`}
      aria-labelledby={`heading-${group.topic.id}`}
      className="scroll-mt-[calc(var(--sticky-offset,88px)+24px)] border-t border-border pt-6 md:pt-8"
    >
      <p className="mb-2 text-sm text-muted-foreground md:hidden">
        {parentName} / {group.topic.name}
      </p>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3
            id={`heading-${group.topic.id}`}
            tabIndex={-1}
            className={cn(
              'rounded-sm text-xl font-semibold tracking-tight wrap-anywhere outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active && 'text-primary',
            )}
          >
            {group.topic.name}
          </h3>
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
          {scopeId !== group.topic.id && !showHubEntryOnly && (
            <Button
              variant="outline"
              aria-label={`只看 ${group.topic.name}`}
              onClick={() => onScopeChange(group.topic.id)}
              className="min-h-12 gap-1.5 rounded-md bg-card px-3 text-sm font-normal"
            >
              <Focus aria-hidden="true" className="hidden sm:block" />
              只看此主题
            </Button>
          )}
        </div>
      </div>
      {scopeId === group.topic.id && filterPanel}
      {showHubEntryOnly ? (
        <div className="grid gap-4 md:grid-cols-2 min-[75rem]:grid-cols-3">
          <TopicHubEntry
            topicId={group.topic.id}
            topicName={group.topic.name}
            description={group.topic.description}
            itemCount={group.totalCount}
            parentName={parentName}
          />
        </div>
      ) : (
        <TopicItemGrid
          items={group.items}
          headingLevel={4}
          expandedIds={expandedIds}
          onExpandedChange={onExpandedChange}
        />
      )}
    </section>
  )
}
