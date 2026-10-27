import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseFilterParams, serializeFilterParams, type LinkFilterState } from '../lib/filterParams'
import { collectTags, filterItems } from '../lib/filters'
import {
  buildTopicGroups,
  collectTopicCounts,
  getTopicLocations,
  getTopicItems,
  type TopicGroup,
  type TopicLocation,
} from '../lib/topics'
import type { Item, LinkData, Topic } from '../lib/schema'
import { getItemTags, getPrimaryTags, groupTags, type TagGroup } from '../lib/tags'
import { getTagGroup } from '../lib/tagVocabulary'

export type UseLinkFiltersResult = LinkFilterState & {
  setKeyword: (keyword: string) => void
  toggleTag: (tag: string) => void
  removeTag: (tag: string) => void
  clearTags: () => void
  clearContentTags: () => void
  setTopic: (id?: string) => void
  setTagMatch: (mode: LinkFilterState['tagMatch']) => void
  clearFilters: () => void
  allTags: readonly string[]
  availableTags: readonly string[]
  primaryTags: readonly string[]
  tagGroups: readonly TagGroup[]
  scopeTopic?: Topic
  scopeLabel?: string
  scopeIncludesChildren: boolean
  unknownTopic: boolean
  scopeOptions: readonly TopicLocation[]
  unknownTags: readonly string[]
  filteredItems: Item[]
  groups: TopicGroup[]
  topicTotals: ReadonlyMap<string, number>
  totalCount: number
  matchedCount: number
  visibleTopicCount: number
  visibleSubtopicCount: number
  topicLocations: readonly TopicLocation[]
  hasFilters: boolean
  hasConditions: boolean
}

const EMPTY_ITEMS: readonly Item[] = []
const EMPTY_TOPICS: readonly Topic[] = []

function readLocation(): LinkFilterState {
  return parseFilterParams(
    new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
  )
}

export function useLinkFilters(data?: LinkData): UseLinkFiltersResult {
  const [state, setState] = useState<LinkFilterState>(readLocation)
  // 同步镜像供连续操作与防抖回调读取，避免依赖尚未提交的 React 渲染。
  const latestState = useRef(state)
  const pendingWrite = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(true)

  const cancelPendingWrite = useCallback(() => {
    if (pendingWrite.current !== null) {
      clearTimeout(pendingWrite.current)
      pendingWrite.current = null
    }
  }, [])

  const writeUrl = useCallback(() => {
    const { pathname, search, hash } = window.location
    const params = serializeFilterParams(new URLSearchParams(search), latestState.current)
    const nextSearch = params.toString()
    const nextUrl = `${pathname}${nextSearch ? `?${nextSearch}` : ''}${hash}`
    if (nextUrl !== `${pathname}${search}${hash}`) {
      window.history.replaceState(window.history.state, '', nextUrl)
    }
  }, [])

  const update = useCallback(
    (transform: (previous: LinkFilterState) => LinkFilterState, immediate: boolean) => {
      if (!mounted.current) return
      cancelPendingWrite()
      const next = transform(latestState.current)
      latestState.current = next
      setState(next)
      if (immediate) writeUrl()
      else {
        pendingWrite.current = setTimeout(() => {
          pendingWrite.current = null
          writeUrl()
        }, 200)
      }
    },
    [cancelPendingWrite, writeUrl],
  )

  const setKeyword = useCallback(
    (keyword: string) => {
      update((previous) => ({ ...previous, keyword }), false)
    },
    [update],
  )

  const toggleTag = useCallback(
    (tag: string) => {
      const value = tag.trim()
      if (!value || value.includes(',')) return
      update(
        (previous) => ({
          ...previous,
          selectedTags: previous.selectedTags.includes(value)
            ? previous.selectedTags.filter((selected) => selected !== value)
            : [...previous.selectedTags, value],
        }),
        true,
      )
    },
    [update],
  )

  const removeTag = useCallback(
    (tag: string) => {
      update(
        (previous) => ({
          ...previous,
          selectedTags: previous.selectedTags.filter((selected) => selected !== tag.trim()),
        }),
        true,
      )
    },
    [update],
  )

  const clearTags = useCallback(() => {
    update((previous) => ({ ...previous, selectedTags: [] }), true)
  }, [update])

  const clearContentTags = useCallback(() => {
    update((previous) => ({
      ...previous,
      selectedTags: previous.selectedTags.filter((tag) => getTagGroup(tag) !== 'content'),
    }), true)
  }, [update])

  const setTopic = useCallback((id?: string) => {
    update((previous) => ({ ...previous, topicId: id?.trim() || undefined }), true)
  }, [update])

  const setTagMatch = useCallback(
    (tagMatch: LinkFilterState['tagMatch']) => {
      update((previous) => ({ ...previous, tagMatch }), true)
    },
    [update],
  )

  const clearFilters = useCallback(() => {
    update((previous) => ({ keyword: '', selectedTags: [], tagMatch: 'grouped', topicId: previous.topicId }), true)
  }, [update])

  useEffect(() => {
    mounted.current = true
    const restore = () => {
      cancelPendingWrite()
      const next = readLocation()
      latestState.current = next
      setState(next)
    }
    window.addEventListener('popstate', restore)
    return () => {
      mounted.current = false
      cancelPendingWrite()
      window.removeEventListener('popstate', restore)
    }
  }, [cancelPendingWrite])

  const items = data?.items ?? EMPTY_ITEMS
  const topics = data?.topics ?? EMPTY_TOPICS
  const tagsFor = useCallback((source: readonly Item[]) => collectTags(
    state.tagMatch === 'grouped' ? source.map((item) => ({ tags: getItemTags(item) })) : source,
  ), [state.tagMatch])
  const scopedItems = useMemo(() => getTopicItems(items, topics, state.topicId), [items, topics, state.topicId])
  const allTags = useMemo(() => tagsFor(items), [items, tagsFor])
  const availableTags = useMemo(() => tagsFor(scopedItems), [scopedItems, tagsFor])
  const primaryTags = useMemo(() => getPrimaryTags(availableTags), [availableTags])
  const tagGroups = useMemo(() => groupTags(availableTags), [availableTags])
  const filteredItems = useMemo(() => filterItems(scopedItems, state), [scopedItems, state])
  const topicCounts = useMemo(() => collectTopicCounts(items, topics), [items, topics])
  const groups = useMemo(
    () => buildTopicGroups(filteredItems, topics, topicCounts),
    [filteredItems, topics, topicCounts],
  )
  const topicLocations = useMemo(() => getTopicLocations(groups), [groups])
  const scopeOptions = useMemo(() => getTopicLocations(buildTopicGroups(items, topics, topicCounts)), [items, topics, topicCounts])
  const scopeTopic = topics.find((topic) => topic.id === state.topicId)
  const scopeParent = topics.find((topic) => topic.id === scopeTopic?.parentId)
  const scopeLabel = scopeTopic
    ? scopeParent ? `${scopeParent.name} / ${scopeTopic.name}` : scopeTopic.name
    : state.topicId
  const unknownTags = useMemo(() => {
    if (!data) return []
    const knownTags = new Set(allTags)
    return state.selectedTags.filter((tag) => !knownTags.has(tag))
  }, [data, allTags, state.selectedTags])

  return {
    ...state,
    setKeyword,
    toggleTag,
    removeTag,
    clearTags,
    clearContentTags,
    setTopic,
    setTagMatch,
    clearFilters,
    allTags,
    availableTags,
    primaryTags,
    tagGroups,
    scopeTopic,
    scopeLabel,
    scopeIncludesChildren: Boolean(scopeTopic && topics.some((topic) => topic.parentId === scopeTopic.id)),
    unknownTopic: Boolean(data && state.topicId && !scopeTopic),
    scopeOptions,
    unknownTags,
    filteredItems,
    groups,
    topicTotals: topicCounts.total,
    topicLocations,
    totalCount: items.length,
    matchedCount: filteredItems.length,
    visibleTopicCount: groups.length,
    visibleSubtopicCount: groups.reduce((count, group) => count + group.subtopics.length, 0),
    hasFilters: Boolean(state.topicId) || state.keyword.trim() !== '' || state.selectedTags.length > 0,
    hasConditions: state.keyword.trim() !== '' || state.selectedTags.length > 0,
  }
}
