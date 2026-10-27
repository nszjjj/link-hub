import { useId } from 'react'
import { X } from 'lucide-react'
import type { UseLinkFiltersResult } from '../hooks/useLinkFilters'
import { getTagGroup } from '../lib/tagVocabulary'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

type Props = { filters: UseLinkFiltersResult }

export function ContentCategoryLabel() {
  return (
    <span className="shrink-0 text-sm text-muted-foreground" aria-hidden="true">
      <span className="hidden sm:inline">内容分类</span>
      <span className="sm:hidden">分类</span>
    </span>
  )
}

export function TagChip({ filters, tag }: Props & { tag: string }) {
  return (
    <Button variant="ghost" aria-pressed={filters.selectedTags.includes(tag)} onClick={() => filters.toggleTag(tag)}
      className={cn('h-auto min-h-12 max-w-full rounded-md px-3 py-2 text-sm font-normal whitespace-normal wrap-anywhere text-muted-foreground',
        filters.selectedTags.includes(tag) && 'bg-accent text-primary hover:bg-accent hover:text-primary')}>
      {tag}
    </Button>
  )
}

export function ContentChips({ filters }: Props) {
  const hasContentTags = filters.selectedTags.some((tag) => getTagGroup(tag) === 'content')
  return (
    <>
      <Button variant="ghost" aria-pressed={!hasContentTags} onClick={filters.clearContentTags}
        className={cn('min-h-12 rounded-md px-3 text-sm font-normal text-muted-foreground', !hasContentTags && 'bg-accent text-primary')}>
        全部
      </Button>
      {filters.primaryTags.map((tag) => <TagChip key={tag} filters={filters} tag={tag} />)}
    </>
  )
}

export function GroupedTagPanel({ filters }: Props) {
  return (
    <div role="group" aria-label="全部标签" className="max-h-[40dvh] space-y-3 overflow-y-auto py-4">
      {filters.tagGroups.map((group) => (
        <div key={group.id} role="group" aria-label={group.label} className="flex flex-wrap items-start gap-x-4 gap-y-1">
          <span className="flex min-h-12 w-16 shrink-0 items-center text-sm text-muted-foreground">{group.label}</span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {group.tags.map((tag) => <TagChip key={tag} filters={filters} tag={tag} />)}
          </div>
        </div>
      ))}
      {filters.tagGroups.length === 0 && <p className="text-sm text-muted-foreground">此范围暂无可选标签。</p>}
    </div>
  )
}

export function SelectedFilters({ filters }: Props) {
  const matchName = useId()
  if (!filters.hasConditions) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <span className="text-sm text-muted-foreground">已选</span>
      {filters.selectedTags.map((tag) => (
        <Button key={tag} variant="outline" aria-label={`移除标签：${tag}`} onClick={() => filters.removeTag(tag)}
          title={filters.unknownTags.includes(tag) ? '当前数据无此标签' : undefined}
          className="h-auto min-h-12 max-w-full gap-2 rounded-md border-primary/20 bg-accent px-3 py-2 font-normal whitespace-normal text-primary">
          <span className="min-w-0 wrap-anywhere">{tag}</span>
          {filters.unknownTags.includes(tag) && <span className="text-xs">（已失效）</span>}
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      ))}
      {filters.keyword.trim() && <span className="min-w-0 text-sm wrap-anywhere text-muted-foreground">关键词：{filters.keyword}</span>}
      {filters.selectedTags.length > 0 && (
        <p className="text-sm leading-6 text-muted-foreground">
          {filters.tagMatch === 'grouped' ? '同组匹配任一项，不同组同时满足'
            : filters.tagMatch === 'any' ? '匹配任一标签' : '匹配全部标签'}
        </p>
      )}
      {/* 旧分享链接保留原语义，切换分组规则必须由用户明确触发。 */}
      {filters.tagMatch !== 'grouped' && filters.selectedTags.length > 0 && (
        <fieldset role="radiogroup" aria-label="标签匹配方式" className="flex max-w-full flex-wrap gap-1 rounded-md border border-border bg-card p-0.5">
          {(['any', 'all', 'grouped'] as const).map((mode) => (
            <label key={mode} className={cn('relative flex min-h-12 cursor-pointer items-center rounded-md px-3 text-sm focus-within:ring-2 focus-within:ring-ring', filters.tagMatch === mode && 'bg-accent text-primary')}>
              <input type="radio" name={matchName} value={mode} checked={filters.tagMatch === mode}
                onChange={() => filters.setTagMatch(mode)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
              <span>{mode === 'any' ? '任一标签' : mode === 'all' ? '全部标签' : '按分组匹配'}</span>
            </label>
          ))}
        </fieldset>
      )}
      <Button variant="ghost" onClick={filters.clearFilters} className="min-h-12 rounded-md px-3 text-sm font-normal text-muted-foreground sm:ml-auto">清空筛选</Button>
    </div>
  )
}
