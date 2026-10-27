export type LinkFilterState = {
  keyword: string
  selectedTags: readonly string[]
  tagMatch: 'any' | 'all' | 'grouped'
  topicId?: string
}

function uniqueTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
}

export function parseFilterParams(params: URLSearchParams): LinkFilterState {
  const match = params.get('match')
  const topicId = params.get('topic')?.trim()
  return {
    keyword: params.get('q') ?? '',
    selectedTags: uniqueTags(params.getAll('tags').flatMap((value) => value.split(','))),
    // 旧分享链接没有 match 时仍用 OR；新访问和新链接使用分组语义。
    tagMatch: match === 'grouped' || (match === null && !params.has('tags'))
      ? 'grouped'
      : match === 'all' ? 'all' : 'any',
    ...(topicId ? { topicId } : {}),
  }
}

export function serializeFilterParams(params: URLSearchParams, state: LinkFilterState): URLSearchParams {
  const result = new URLSearchParams(params)
  const keyword = state.keyword.trim()
  const tags = uniqueTags(state.selectedTags)
  result.delete('q')
  result.delete('tags')
  result.delete('match')
  result.delete('topic')
  if (keyword) result.set('q', keyword)
  if (tags.length > 0) result.set('tags', tags.join(','))
  if (state.tagMatch === 'all') result.set('match', 'all')
  if (state.tagMatch === 'grouped' && tags.length > 0) result.set('match', 'grouped')
  if (state.topicId?.trim()) result.set('topic', state.topicId.trim())
  return result
}
