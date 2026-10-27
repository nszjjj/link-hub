import { assetUrl } from './paths'
import type { ResourceRef } from './schema'

export type ResourceAction = { href: string; label: string; download: boolean }

function isPdf(resource: ResourceRef): boolean {
  return resource.format === 'pdf' || /\.pdf$/i.test(resource.file ?? '')
}

export function getResourceActions(resource: ResourceRef): ResourceAction[] {
  const actions: ResourceAction[] = []
  if (resource.url) actions.push({ href: resource.url, label: '访问来源', download: false })
  if (resource.file)
    actions.push({
      href: assetUrl(resource.file),
      label: isPdf(resource) ? '下载 PDF' : '下载文件',
      download: true,
    })
  return actions
}

export function getReadingLabels(resources: readonly ResourceRef[]): string[] {
  if (resources.length === 0) return []
  const labels: string[] = []
  if (resources.some(isPdf)) labels.push('含 PDF')
  const free = resources.filter((resource) => resource.access === 'free').length
  const paid = resources.filter((resource) => resource.access === 'paid').length
  const unknown = resources.length - free - paid
  if (free === resources.length) labels.push('全部免费')
  else if (free > 0) labels.push('含免费资源')
  if (paid === resources.length) labels.push('付费资源')
  else if (paid > 0) labels.push('含付费资源')
  if (unknown > 0 && unknown < resources.length) labels.push('部分访问条件未确认')
  return labels
}
