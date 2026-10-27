export type HubSection = {
  id: string
  title: string
  body?: string
  /** 引用 links.json 中的 item id，按顺序展示 */
  itemIds?: string[]
}

export type TopicHubContent = {
  topicId: string
  title: string
  seoDescription: string
  intro: string
  audience: string
  featuredRoadmapId?: string
  sections: HubSection[]
}

export const solanaHub: TopicHubContent = {
  topicId: 'solana',
  title: 'Solana 学习与开发枢纽',
  seoDescription:
    'Solana 账户模型、程序开发、实用工具与黑客松路径。从入门到可提交作品的结构化资源与分叉学习路线。',
  intro:
    '这里把 Solana 相关文档、工具与路线收成一条可执行路径：先建立账户与交易心智，再按目标选择链上程序、客户端应用或黑客松赛道。内容会随深耕持续补全。',
  audience: '有编程基础、希望系统进入 Solana 生态的开发者',
  featuredRoadmapId: 'solana-dev-path',
  sections: [
    {
      id: 'start',
      title: '怎么用这个 Hub',
      body: '先看「开发路径」了解主路径与分支；工具区放日常会打开的站点；黑客松区预留实战与提交清单，后续会按赛季更新。',
    },
    {
      id: 'tools',
      title: '核心文档与工具',
      body: '官方文档、Cookbook、浏览器与在线 Playground，适合边学边查。',
      itemIds: [
        'solana-docs',
        'solana-cookbook',
        'solana-explorer',
        'solana-playground',
      ],
    },
    {
      id: 'paths',
      title: '学习路径',
      body: '短路径适合快速建立心智模型；完整开发路径含分叉，适合按目标深入。',
      itemIds: ['solana-roadmap', 'solana-dev-path'],
    },
    {
      id: 'hackathon',
      title: '黑客松与实战',
      body: '参赛不只是写代码：还需要选题、演示与提交材料。此区块会逐步补上往届资源、清单与示例仓库。当前先跟随开发路径中的「黑客松」分支推进。',
    },
  ],
}
