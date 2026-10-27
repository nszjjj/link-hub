import type { Item, ResourceRef } from './schema'
import { getTagGroup, TAG_DEFINITIONS, TAG_GROUPS, type TagGroupId } from './tagVocabulary'

export type TagGroup = { id: TagGroupId; label: string; tags: string[] }

export function getItemResources(item: Item): readonly ResourceRef[] {
  if (item.kind === 'reading-list') return item.books
  if (item.kind === 'roadmap') return item.steps.flatMap((step) => step.resources)
  return []
}

export function getResourceTags(resource: ResourceRef): string[] {
  const tags: string[] = []
  const format = resource.format ?? resource.file?.split('.').pop()?.toLowerCase()
  if (format === 'pdf') tags.push('PDF')
  if (format === 'epub') tags.push('EPUB')
  if (resource.access === 'paid') tags.push('付费')
  return tags
}

export function getItemTags(item: Item): string[] {
  const tags = item.tags.filter((tag) =>
    item.kind === 'site' || !['format', 'access'].includes(getTagGroup(tag)),
  )
  if (item.kind === 'roadmap') tags.push('路线图')
  tags.push(...getItemResources(item).flatMap(getResourceTags))
  return [...new Set(tags)]
}

export function getPrimaryTags(tags: readonly string[]): string[] {
  return [...new Set(tags)]
    .filter((tag) => TAG_DEFINITIONS[tag]?.primary !== undefined)
    .sort((a, b) => TAG_DEFINITIONS[a].primary! - TAG_DEFINITIONS[b].primary!)
}

export function groupTags(tags: readonly string[]): TagGroup[] {
  return TAG_GROUPS.map((group) => ({
    ...group,
    tags: [...new Set(tags)].filter((tag) => getTagGroup(tag) === group.id),
  })).filter((group) => group.tags.length > 0)
}

export function matchesGroupedTags(item: Item, selected: readonly string[]): boolean {
  const groups = groupTags(selected)
  const itemTags = new Set(getItemTags(item))
  const resourceGroups = groups.filter((group) => group.id === 'format' || group.id === 'access')
  if (item.kind !== 'site' && resourceGroups.length > 0) {
    // 同一份资料必须满足所有资源属性，防止免费网页与付费 PDF 共同造成误命中。
    const matchesResource = getItemResources(item).some((resource) => {
      const tags = new Set(getResourceTags(resource))
      return resourceGroups.every((group) => group.tags.some((tag) => tags.has(tag)))
    })
    if (!matchesResource) return false
  }
  return groups.every((group) =>
    item.kind !== 'site' && resourceGroups.includes(group)
      ? true
      : group.tags.some((tag) => itemTags.has(tag)),
  )
}
