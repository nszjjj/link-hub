/** App paths relative to Vite base (no leading slash required for Link `to`). */

export function topicHubPath(topicId: string) {
  return `/topic/${topicId}`
}

export function roadmapPagePath(topicId: string, roadmapId: string) {
  return `/topic/${topicId}/roadmap/${roadmapId}`
}

/** Topics that currently ship a deep hub page (phase 1: Solana only). */
export const HUB_TOPIC_IDS = new Set(['solana'])

export function hasTopicHub(topicId: string) {
  return HUB_TOPIC_IDS.has(topicId)
}
