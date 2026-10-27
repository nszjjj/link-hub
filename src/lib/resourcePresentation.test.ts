import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getReadingLabels, getResourceActions } from './resourcePresentation'
import type { ResourceRef } from './schema'

beforeEach(() => vi.stubEnv('BASE_URL', '/link-hub/'))
afterEach(() => vi.unstubAllEnvs())
const ref = (access: ResourceRef['access']): ResourceRef => ({ title: '资源', url: 'https://example.com', access })

describe('资源呈现', () => {
  it('双引用保留两个独立动作并编码本地路径', () => {
    const actions = getResourceActions({ ...ref('free'), url: 'https://example.com/source', file: 'files/中文 资料.pdf' })
    expect(actions.map((action) => action.label)).toEqual(['访问来源', '下载 PDF'])
    expect(actions[0].href).toBe('https://example.com/source')
    expect(actions[1].href).toBe('/link-hub/files/%E4%B8%AD%E6%96%87%20%E8%B5%84%E6%96%99.pdf')
    expect(actions[1].download).toBe(true)
  })
  it('未知访问条件不推断免费，部分免费保留未知提示', () => {
    expect(getReadingLabels([ref('unknown')])).toEqual([])
    expect(getReadingLabels([ref('free'), ref('unknown')])).toEqual(['含免费资源', '部分访问条件未确认'])
    expect(getReadingLabels([ref('free'), ref('paid')])).toEqual(['含免费资源', '含付费资源'])
    expect(getReadingLabels([ref('paid')])).toEqual(['付费资源'])
  })
  it('PDF 从本地格式或显式 format 判断，全部已确认免费才显示全部免费', () => {
    expect(getReadingLabels([{ ...ref('free'), file: 'files/a.PDF' }])).toEqual(['含 PDF', '全部免费'])
    expect(getReadingLabels([{ ...ref('free'), format: 'pdf' }])).toEqual(['含 PDF', '全部免费'])
    expect(getReadingLabels([{ ...ref('unknown'), url: 'https://example.com/a.pdf' }])).toEqual([])
  })
})
