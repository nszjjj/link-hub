import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { UseLinkFiltersResult } from '../hooks/useLinkFilters'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'

export function TopicScope({ filters, onScopeChange }: {
  filters: UseLinkFiltersResult
  onScopeChange: (id?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-8">
      <div id="scope-context" tabIndex={-1} className="flex scroll-mt-[calc(var(--sticky-offset,88px)+24px)] flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="min-w-0 text-sm leading-6">
          <span className="text-muted-foreground">浏览范围：</span>
          <span className="font-medium wrap-anywhere">{filters.scopeLabel}</span>
          {filters.unknownTopic ? <p className="text-muted-foreground">此主题已不存在</p>
            : filters.scopeIncludesChildren && <p className="text-muted-foreground">包含此主题及其子主题</p>}
        </div>
        <div className="flex flex-wrap gap-1">
          <CollapsibleTrigger asChild>
            <Button ref={trigger} variant="ghost" className="min-h-12 rounded-md px-3 text-sm font-normal text-muted-foreground">
              切换主题 <ChevronDown aria-hidden="true" />
            </Button>
          </CollapsibleTrigger>
          <Button variant="outline" onClick={() => onScopeChange(undefined)} className="min-h-12 rounded-md bg-card px-3 text-sm font-normal">查看全部主题</Button>
        </div>
      </div>
      <CollapsibleContent>
        <div role="group" aria-label="选择浏览主题" className="mt-3 flex max-h-[40dvh] flex-wrap gap-1 overflow-y-auto border-t border-border pt-3">
          {filters.scopeOptions.map((topic) => (
            <Button key={topic.id} variant="ghost" aria-label={`切换到 ${topic.label}`} aria-pressed={filters.topicId === topic.id}
              onClick={() => { onScopeChange(topic.id); setOpen(false); trigger.current?.focus() }}
              className={cn('h-auto min-h-12 max-w-full rounded-md px-3 py-2 text-sm font-normal whitespace-normal wrap-anywhere text-muted-foreground', filters.topicId === topic.id && 'bg-accent text-primary')}>
              {topic.label}
            </Button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
