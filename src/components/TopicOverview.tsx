import type { MouseEvent } from 'react'
import type { TopicGroup } from '../lib/topics'
import { cn } from '../lib/utils'

type TopicOverviewProps = {
  groups: readonly TopicGroup[]
  activeId?: string
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, targetId: string) => void
}

export function TopicOverview({ groups, activeId, onNavigate }: TopicOverviewProps) {
  if (groups.length === 0) return null

  return (
    <nav
      aria-label="主题全貌"
      className="mb-10 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">主题全貌</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            一览全部板块，点击即可跳转
          </p>
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">{groups.length} 个一级主题</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {groups.map((group) => {
          const id = `topic-${group.topic.id}`
          const active =
            activeId === group.topic.id ||
            group.subtopics.some((child) => child.topic.id === activeId)
          return (
            <li key={group.topic.id}>
              <a
                href={`#${id}`}
                onClick={(event) => onNavigate(event, id)}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
                  active
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border/80 bg-background text-muted-foreground hover:border-primary/30 hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <span className="font-medium text-foreground">{group.topic.name}</span>
                <span className="tabular-nums text-xs opacity-70">{group.matchedCount}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
