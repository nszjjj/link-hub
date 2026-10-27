import type { Item } from '../lib/schema'
import { cn } from '../lib/utils'
import { ItemCard } from './ItemCard'

type TopicItemGridProps = {
  items: readonly Item[]
  headingLevel: 3 | 4
  expandedIds: ReadonlySet<string>
  onExpandedChange: (id: string, expanded: boolean) => void
}

export function TopicItemGrid({
  items,
  headingLevel,
  expandedIds,
  onExpandedChange,
}: TopicItemGridProps) {
  return (
    <div className="space-y-5">
      {(['site', 'reading-list', 'roadmap'] as const).map((kind) => {
        const matching = items.filter((item) => item.kind === kind)
        if (!matching.length) return null
        return (
          <ul
            key={kind}
            className={cn(
              'grid grid-cols-1 gap-4',
              kind === 'site' && 'md:grid-cols-2 min-[75rem]:grid-cols-3',
              kind === 'reading-list' && 'md:grid-cols-2',
            )}
          >
            {matching.map((item) => (
              <li key={item.id} className={cn('min-w-0', kind === 'roadmap' && 'col-span-full')}>
                <ItemCard
                  item={item}
                  headingLevel={headingLevel}
                  expanded={expandedIds.has(item.id)}
                  onExpandedChange={(expanded) => onExpandedChange(item.id, expanded)}
                />
              </li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}
