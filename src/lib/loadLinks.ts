import { assetUrl } from './paths'
import { LinkDataSchema, type LinkData } from './schema'

export async function loadLinks(signal?: AbortSignal): Promise<LinkData> {
  const response = await fetch(assetUrl('data/links.json'), { signal, cache: 'no-cache' })
  if (!response.ok) throw new Error(`加载 links.json 失败：HTTP ${response.status}`)
  return LinkDataSchema.parse(await response.json())
}
