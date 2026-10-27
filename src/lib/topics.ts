import { groupByTopic } from './filters'
import type { Item, Topic } from './schema'

export type TopicCounts = {
  direct: ReadonlyMap<string, number>
  total: ReadonlyMap<string, number>
}

export type TopicContentGroup = {
  topic: Topic
  items: Item[]
  matchedCount: number
  totalCount: number
}

export type TopicGroup = TopicContentGroup & {
  subtopics: TopicContentGroup[]
  directTotalCount: number
  hasSubtopics: boolean
}

export type TopicLocation = { id: string; label: string }

export function getTopicItems(
  items: readonly Item[],
  topics: readonly Topic[],
  topicId?: string,
): Item[] {
  if (!topicId) return [...items]
  if (!topics.some((topic) => topic.id === topicId)) return []
  const included = new Set([
    topicId,
    ...topics.filter((topic) => topic.parentId === topicId).map((topic) => topic.id),
  ])
  return items.filter((item) => included.has(item.topic))
}

export function collectTopicCounts(items: readonly Item[], topics: readonly Topic[]): TopicCounts {
  const direct = new Map(topics.map((topic) => [topic.id, 0]))
  const total = new Map(topics.map((topic) => [topic.id, 0]))
  const parents = new Map(topics.map((topic) => [topic.id, topic.parentId]))
  for (const item of items) {
    direct.set(item.topic, (direct.get(item.topic) ?? 0) + 1)
    total.set(item.topic, (total.get(item.topic) ?? 0) + 1)
    const parentId = parents.get(item.topic)
    if (parentId) total.set(parentId, (total.get(parentId) ?? 0) + 1)
  }
  return { direct, total }
}

export function buildTopicGroups(
  items: readonly Item[],
  topics: readonly Topic[],
  counts: TopicCounts,
): TopicGroup[] {
  const directItems = new Map(
    groupByTopic(items, topics).map((group) => [group.topic.id, group.items]),
  )
  const sorted = [...topics].sort((a, b) => a.order - b.order)
  const children = new Map<string, Topic[]>()
  for (const topic of sorted) {
    if (!topic.parentId) continue
    const siblings = children.get(topic.parentId) ?? []
    siblings.push(topic)
    children.set(topic.parentId, siblings)
  }

  return sorted
    .filter((topic) => !topic.parentId)
    .map((topic) => {
      const ownItems = directItems.get(topic.id) ?? []
      const configuredChildren = children.get(topic.id) ?? []
      const subtopics = configuredChildren
        .map((child): TopicContentGroup => {
          const childItems = directItems.get(child.id) ?? []
          return {
            topic: child,
            items: childItems,
            matchedCount: childItems.length,
            totalCount: counts.total.get(child.id) ?? 0,
          }
        })
        .filter((group) => group.matchedCount > 0)
      return {
        topic,
        items: ownItems,
        subtopics,
        matchedCount:
          ownItems.length + subtopics.reduce((count, group) => count + group.matchedCount, 0),
        totalCount: counts.total.get(topic.id) ?? 0,
        directTotalCount: counts.direct.get(topic.id) ?? 0,
        hasSubtopics: configuredChildren.length > 0,
      }
    })
    .filter((group) => group.matchedCount > 0)
}

export function getTopicLocations(groups: readonly TopicGroup[]): TopicLocation[] {
  return groups.flatMap((group) => [
    { id: group.topic.id, label: group.topic.name },
    ...group.subtopics.map((subtopic) => ({
      id: subtopic.topic.id,
      label: `${group.topic.name} / ${subtopic.topic.name}`,
    })),
  ])
}
