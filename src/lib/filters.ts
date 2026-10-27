import type { Item, ResourceRef, Topic } from './schema'
import { DECISION_TAGS } from './tagVocabulary'
import { getItemTags, matchesGroupedTags } from './tags'

export type FilterOptions = {
  keyword: string
  selectedTags: readonly string[]
  tagMatch?: 'any' | 'all' | 'grouped'
}

export type TopicBucket = { topic: Topic; items: Item[] }

const normalize = (text: string) => text.normalize('NFKC').trim().toLowerCase()

function resourceTexts(resources: readonly ResourceRef[]): string[] {
  return resources.flatMap((resource) => [
    resource.title,
    resource.author ?? '',
    resource.note ?? '',
  ])
}

function searchText(item: Item): string {
  const parts = [item.title, item.description, item.audience ?? '', ...getItemTags(item)]
  if (item.kind === 'reading-list') parts.push(...resourceTexts(item.books))
  if (item.kind === 'roadmap') {
    for (const step of item.steps) {
      parts.push(step.title, step.description ?? '', ...resourceTexts(step.resources))
    }
  }
  return normalize(parts.join(' '))
}

export function filterItems(items: readonly Item[], options: FilterOptions): Item[] {
  const keyword = normalize(options.keyword)
  return items.filter((item) => {
    if (keyword && !searchText(item).includes(keyword)) return false
    if (options.selectedTags.length === 0) return true
    if (options.tagMatch === 'grouped') return matchesGroupedTags(item, options.selectedTags)
    const hasTag = (tag: string) => item.tags.includes(tag)
    return options.tagMatch === 'all'
      ? options.selectedTags.every(hasTag)
      : options.selectedTags.some(hasTag)
  })
}

const kindOrder = { site: 0, 'reading-list': 1, roadmap: 2 }

export function groupByTopic(items: readonly Item[], topics: readonly Topic[]): TopicBucket[] {
  const buckets = new Map<string, Item[]>()
  for (const item of items) {
    const bucket = buckets.get(item.topic) ?? []
    bucket.push(item)
    buckets.set(item.topic, bucket)
  }
  return [...topics]
    .sort((a, b) => a.order - b.order)
    .map((topic) => ({
      topic,
      items: [...(buckets.get(topic.id) ?? [])].sort(
        (a, b) => kindOrder[a.kind] - kindOrder[b.kind] || Number(b.featured) - Number(a.featured),
      ),
    }))
    .filter((group) => group.items.length > 0)
}

export function collectTags(items: readonly Pick<Item, 'tags'>[]): string[] {
  const frequency = new Map<string, number>()
  for (const item of items) {
    for (const tag of new Set(item.tags)) frequency.set(tag, (frequency.get(tag) ?? 0) + 1)
  }
  const priority = new Map<string, number>(DECISION_TAGS.map((tag, index) => [tag, index]))
  return [...frequency.keys()].sort(
    (a, b) =>
      (priority.get(a) ?? Infinity) - (priority.get(b) ?? Infinity) ||
      frequency.get(b)! - frequency.get(a)!,
  )
}
