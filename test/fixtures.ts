export function makeData() {
  return {
    version: 1,
    updatedAt: '2026-10-27',
    topics: [
      { id: 'markets', name: '行情', order: 1 },
      { id: 'web3', name: 'Web3', order: 2 },
      { id: 'empty', name: '空主题', order: 3 },
    ],
    items: [
      {
        id: 'charts',
        topic: 'markets',
        kind: 'site',
        title: '行情图表',
        description: '查看板块表现',
        url: 'https://example.com/charts',
        tags: ['工具'],
      },
      {
        id: 'books',
        topic: 'markets',
        kind: 'reading-list',
        title: '交易书单',
        description: '理解交易基础',
        tags: ['资源', 'PDF'],
        books: [
          {
            title: 'Market Basics',
            author: 'Ada',
            note: '推荐先读',
            file: 'files/guide.pdf',
            access: 'free',
          },
        ],
      },
      {
        id: 'contracts',
        topic: 'web3',
        kind: 'roadmap',
        title: '合约路线',
        description: '建立开发基础',
        tags: ['资源', '入门', '进阶'],
        steps: [
          {
            title: '智能合约',
            description: '学习 Solidity',
            resources: [
              {
                title: '账户模型',
                note: '理解 EVM',
                url: 'https://example.com/accounts',
                access: 'free',
              },
            ],
          },
        ],
      },
    ],
  }
}

export function makeHierarchyData() {
  const data = makeData()
  return {
    ...data,
    topics: [
      data.topics[0],
      data.topics[1],
      { id: 'solana', name: 'Solana', parentId: 'web3', order: 1 },
      { id: 'ethereum', name: 'Ethereum', parentId: 'web3', order: 2 },
      data.topics[2],
      { id: 'unused', name: '空子主题', parentId: 'web3', order: 3 },
    ],
    items: [
      data.items[0],
      { ...data.items[1], topic: 'web3' },
      { ...data.items[2], topic: 'solana' },
      { ...data.items[0], id: 'solana-docs', topic: 'solana', title: 'Solana 官方文档' },
      { ...data.items[1], id: 'ethereum-books', topic: 'ethereum', title: '以太坊书单' },
    ],
  }
}
