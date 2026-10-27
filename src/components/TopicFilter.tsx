import { ChevronDown, ChevronUp } from 'lucide-react'
import type { UseLinkFiltersResult } from '../hooks/useLinkFilters'
import { Button } from './ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { ContentChips, GroupedTagPanel, SelectedFilters } from './FilterChips'

export function TopicFilter({ filters, expanded, onExpandedChange }: {
  filters: UseLinkFiltersResult
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}) {
  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange} className="mb-7 min-w-0 border-y border-border">
      {/* 主题筛选置于标题下，分类自然换行，卡片始终保留完整宽度。 */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 py-2">
        <div role="group" aria-label="主题内内容分类" className="flex min-w-0 flex-wrap gap-1">
          <ContentChips filters={filters} />
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" aria-label={expanded ? '收起筛选' : '更多筛选'} className="min-h-12 rounded-md px-3 text-sm font-normal text-muted-foreground">
            {expanded ? '收起筛选' : '更多筛选'}
            {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent><GroupedTagPanel filters={filters} /></CollapsibleContent>
      <SelectedFilters filters={filters} />
    </Collapsible>
  )
}
