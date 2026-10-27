import { z } from 'zod'
import { isLocalAssetPath } from './paths.ts'

const Text = z.string().trim().min(1)
const Id = Text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const HttpUrl = z.url({ protocol: /^https?$/ })
const Tag = Text.max(24).refine((tag) => !tag.includes(','), '标签不能包含逗号')
const FilePath = Text.refine(
  (value) => isLocalAssetPath(value, 'files'),
  '必须是 files/ 下的安全相对路径',
)
const IconPath = Text.refine(
  (value) => isLocalAssetPath(value, 'icons'),
  '必须是 icons/ 下的安全相对路径',
).refine((value) => /\.(png|jpe?g|webp|svg|ico)$/i.test(value), 'icon 必须是本地图片')

export const ResourceRefSchema = z
  .object({
    title: Text,
    author: Text.optional(),
    note: Text.optional(),
    url: HttpUrl.optional(),
    file: FilePath.optional(),
    format: z.enum(['pdf', 'epub']).optional(),
    access: z.enum(['free', 'paid', 'unknown']).default('unknown'),
  })
  .strict()
  .superRefine((resource, ctx) => {
    if (!resource.url && !resource.file) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'url 或 file 至少提供一个' })
    }
    const extension = resource.file?.split('.').pop()?.toLowerCase()
    if (
      (extension === 'pdf' || extension === 'epub') &&
      resource.format &&
      resource.format !== extension
    ) {
      ctx.addIssue({ code: 'custom', path: ['format'], message: 'format 与本地文件扩展名不一致' })
    }
  })

const Tags = z
  .array(Tag)
  .default([])
  .refine((tags) => new Set(tags).size === tags.length, '同一条目不能有重复标签')

const BaseItemSchema = z.object({
  id: Id,
  topic: Id,
  title: Text,
  description: Text,
  audience: Text.optional(),
  tags: Tags,
  featured: z.boolean().default(false),
})

export const ItemSchema = z.discriminatedUnion('kind', [
  BaseItemSchema.extend({
    kind: z.literal('site'),
    url: HttpUrl,
    icon: IconPath.optional(),
  }).strict(),
  BaseItemSchema.extend({
    kind: z.literal('reading-list'),
    books: z.array(ResourceRefSchema).min(1),
  }).strict(),
  BaseItemSchema.extend({
    kind: z.literal('roadmap'),
    estimatedEffort: Text.optional(),
    steps: z
      .array(
        z
          .object({
            title: Text,
            description: Text.optional(),
            resources: z.array(ResourceRefSchema).default([]),
          })
          .strict(),
      )
      .min(1),
  }).strict(),
])

export const TopicSchema = z
  .object({
    id: Id,
    name: Text,
    description: Text.optional(),
    parentId: Id.optional(),
    order: z.int().nonnegative().default(0),
  })
  .strict()

export const LinkDataSchema = z
  .object({
    version: z.literal(1),
    updatedAt: z.iso.date(),
    $schema: Text.optional(),
    topics: z.array(TopicSchema).min(1),
    items: z.array(ItemSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const topicIds = new Set<string>()
    data.topics.forEach((topic, index) => {
      if (topicIds.has(topic.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['topics', index, 'id'],
          message: `重复主题 id：${topic.id}`,
        })
      }
      topicIds.add(topic.id)
    })

    const topicsById = new Map(data.topics.map((topic) => [topic.id, topic]))
    data.topics.forEach((topic, index) => {
      if (!topic.parentId) return
      const path = ['topics', index, 'parentId']
      if (topic.parentId === topic.id) {
        ctx.addIssue({ code: 'custom', path, message: '主题不能引用自己作为父主题' })
        return
      }
      if (!topicsById.has(topic.parentId)) {
        ctx.addIssue({ code: 'custom', path, message: `父主题不存在：${topic.parentId}` })
        return
      }

      // 先检查完整父级链，避免循环关系被误报为普通的深度超限。
      const visited = new Set([topic.id])
      let parentId: string | undefined = topic.parentId
      let depth = 1
      while (parentId) {
        if (visited.has(parentId)) {
          ctx.addIssue({ code: 'custom', path, message: '主题父子关系不能形成循环' })
          return
        }
        visited.add(parentId)
        const parent = topicsById.get(parentId)
        if (!parent) return
        depth++
        parentId = parent.parentId
      }
      if (depth > 2)
        ctx.addIssue({
          code: 'custom',
          path,
          message: '最多支持两级主题，子主题必须直接引用一级主题',
        })
    })

    const itemIds = new Set<string>()
    data.items.forEach((item, index) => {
      if (!topicIds.has(item.topic)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'topic'],
          message: `主题不存在：${item.topic}`,
        })
      }
      if (itemIds.has(item.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'id'],
          message: `重复条目 id：${item.id}`,
        })
      }
      itemIds.add(item.id)
    })
  })

export type ResourceRef = z.infer<typeof ResourceRefSchema>
export type Item = z.infer<typeof ItemSchema>
export type Topic = z.infer<typeof TopicSchema>
export type LinkData = z.infer<typeof LinkDataSchema>
export type SiteItem = Extract<Item, { kind: 'site' }>
export type ReadingListItem = Extract<Item, { kind: 'reading-list' }>
export type RoadmapItem = Extract<Item, { kind: 'roadmap' }>
