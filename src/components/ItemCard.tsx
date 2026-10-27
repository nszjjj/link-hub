import type { Item } from '../lib/schema'
import { SiteCard } from './cards/SiteCard'
import { ReadingListCard } from './cards/ReadingListCard'
import { RoadmapCard } from './cards/RoadmapCard'

type ItemCardProps = {
  item: Item
  headingLevel?: 3 | 4
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

export function ItemCard({ item, headingLevel = 3, expanded, onExpandedChange }: ItemCardProps) {
  switch (item.kind) {
    case 'site':
      return <SiteCard item={item} headingLevel={headingLevel} />
    case 'reading-list':
      return (
        <ReadingListCard
          item={item}
          headingLevel={headingLevel}
          expanded={expanded}
          onExpandedChange={onExpandedChange}
        />
      )
    case 'roadmap':
      return (
        <RoadmapCard
          item={item}
          headingLevel={headingLevel}
          expanded={expanded}
          onExpandedChange={onExpandedChange}
        />
      )
  }
}
