import { Badge } from './ui/badge'

export function ItemTags({ tags }: { tags: readonly string[] }) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className="h-auto min-h-6 rounded-md border-border/70 bg-transparent px-1.5 font-normal text-muted-foreground"
        >
          {tag}
        </Badge>
      ))}
    </div>
  )
}
