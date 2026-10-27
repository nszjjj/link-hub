import type { TopicContentGroup } from '../lib/topics'
import type { ReactNode } from 'react'
import { Focus } from 'lucide-react'
import { cn } from '../lib/utils'
import { TopicCount } from './TopicCount'
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
  return (
    <section
      id={`topic-${group.topic.id}`}
      aria-labelledby={`heading-${group.topic.id}`}
      className="scroll-mt-[calc(var(--sticky-offset,88px)+24px)] border-t border-border pt-6 md:pt-8"
    >
      {/* 子主题通过标题和细线表达归属，保持移动端卡片的完整宽度。 */}
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
      <TopicItemGrid
        items={group.items}
        headingLevel={4}
        expandedIds={expandedIds}
        onExpandedChange={onExpandedChange}
      />
    </section>
  )
}
