type TopicCountProps = {
  name: string
  matchedCount: number
  totalCount: number
  isFiltered: boolean
}

export function TopicCount({ name, matchedCount, totalCount, isFiltered }: TopicCountProps) {
  return (
    <p
      className="shrink-0 pt-1 text-sm tabular-nums text-muted-foreground"
      aria-label={`${name}：${matchedCount} 个匹配条目，共 ${totalCount} 个`}
    >
      <span>{isFiltered ? `${matchedCount} / ${totalCount}` : totalCount}</span>
      <span className="ml-1.5">条目</span>
    </p>
  )
}
