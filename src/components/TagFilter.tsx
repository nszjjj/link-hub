import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Ref } from 'react'
import type { UseLinkFiltersResult } from '../hooks/useLinkFilters'
import { Button } from './ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { ContentCategoryLabel, ContentChips, GroupedTagPanel, SelectedFilters } from './FilterChips'

type TagFilterProps = {
  filters: UseLinkFiltersResult
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  stickyRef?: Ref<HTMLDivElement>
}

export function TagFilter({ filters, expanded, onExpandedChange, stickyRef }: TagFilterProps) {
  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange} className="contents">
      {/* 全站只固定少量分类入口；属性面板保持文档流，避免抢占阅读空间。 */}
      <div ref={stickyRef} className="border-b border-border bg-background md:sticky md:top-[var(--site-header-height,88px)] md:z-20">
        <div className="mx-auto flex max-w-[1120px] items-center gap-2 px-5 sm:px-8">
          <ContentCategoryLabel />
          <div role="group" aria-label="内容分类" className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-1">
            <ContentChips filters={filters} />
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" aria-label={expanded ? '收起筛选' : '更多筛选'} className="min-h-12 shrink-0 rounded-md px-2 text-sm font-normal text-muted-foreground">
              {expanded ? '收起' : '更多'}
              {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8"><GroupedTagPanel filters={filters} /></div>
      </CollapsibleContent>
      {filters.hasConditions && (
        <div className="border-b border-border bg-background">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8"><SelectedFilters filters={filters} /></div>
        </div>
      )}
    </Collapsible>
  )
}
