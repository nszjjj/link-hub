export const DECISION_TAGS = ['入门', '进阶', '免费', '中文', 'PDF', '需注册'] as const

export const ALLOWED_TAGS: readonly string[] = [
  ...DECISION_TAGS, '资源', '工具', '行情', '可视化', '书籍', '路线图',
  '文档', '教程', 'EPUB', '付费', '开发', '区块链', '前端', 'API',
]

export const TAG_GROUPS = [
  { id: 'content', label: '内容分类' },
  { id: 'format', label: '格式' },
  { id: 'access', label: '访问条件' },
  { id: 'language', label: '语言' },
  { id: 'level', label: '难度' },
  { id: 'account', label: '账号要求' },
  { id: 'keyword', label: '关键词' },
] as const

export type TagGroupId = (typeof TAG_GROUPS)[number]['id']

// 只有明确配置的内容分类进入常用入口；新增普通标签默认留在关键词组。
export const TAG_DEFINITIONS: Readonly<Record<string, { group: TagGroupId; primary?: number }>> = {
  文档: { group: 'content', primary: 0 },
  教程: { group: 'content', primary: 1 },
  书籍: { group: 'content', primary: 2 },
  工具: { group: 'content', primary: 3 },
  路线图: { group: 'content', primary: 4 },
  PDF: { group: 'format' },
  EPUB: { group: 'format' },
  免费: { group: 'access' },
  付费: { group: 'access' },
  中文: { group: 'language' },
  入门: { group: 'level' },
  进阶: { group: 'level' },
  需注册: { group: 'account' },
}

export function getTagGroup(tag: string): TagGroupId {
  return TAG_DEFINITIONS[tag]?.group ?? 'keyword'
}

export const TAG_ALIASES: Readonly<Record<string, string>> = {
  新手: '入门', beginner: '入门', pdf: 'PDF', api: 'API', 注册: '需注册',
}
