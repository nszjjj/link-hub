# 主题导航站 · 设计文档

> 面向个人维护的领域导航站：内容由 JSON 管理，页面负责检索与呈现，让访客快速判断资源是否适合自己、下一步该点哪里。
>
> 本文定义首版实现范围、数据契约、交互规则、部署方式与验收标准。代码片段是实现参考；示例资源地址是占位符，发布前必须替换并检查可用性。

## 1. 产品定位与范围

一个按主题组织的个人资源导航站，聚合网站与工具、书单与资料、分阶段学习路线。典型主题包括美股、价格行为学、Web3 与日常工具；同一主题可以包含多种内容形态。

核心使用场景：

- **浏览**：访客不确定具体名称，通过主题、简介与推荐条目找到起点。
- **检索**：访客知道关键词或要求，通过搜索、标签及匹配方式缩小范围。
- **判断与访问**：访客从折叠态看出适合谁、内容体量与访问条件，再打开外链或展开资料。
- **维护**：维护者修改 JSON、检查本地文件并提交，由 CI 校验和部署，无需修改页面组件。

### 1.1 产品目标

| 目标 | 首版要求 |
|---|---|
| 快速定位 | 搜索始终可见，常用标签一触可达，筛选状态与结果数明确 |
| 分主题浏览 | 主题标题、简介、命中数形成清晰层级，滚动时能辨认当前位置 |
| 多形态承载 | 网站、书单、路线图使用不同卡片；同一主题内布局稳定 |
| 详略得当 | 折叠态足以判断是否值得展开，详细内容就地呈现 |
| 零代码维护 | 常规内容修改只涉及 JSON 和静态文件；新形态才需要改代码 |
| 可分享与恢复 | URL 保存检索条件，刷新及浏览器前进、后退均可恢复 |
| 稳定发布 | 格式错误、无效引用或缺失本地文件阻断构建；运行时失败可重试 |

**首版非目标**：账号、评论、后端服务、独立详情页、内容管理后台、收藏、暗色模式、全文搜索服务、外部 JSON 覆盖层。内容更新需要重新部署；运行时读取仓库发布的数据不意味着可以绕过部署更新。

**规模假设**：首版几十至两百条条目，设计上支持约五百条及有限的嵌套资料。先采用一次加载、客户端过滤和普通 DOM 渲染；规模明显增长且测量出现问题后，再考虑分片加载或虚拟列表。

## 2. 架构与关键取舍

```text
content/index.json + content/items/**/*.json
          │
          ↓
      合并与构建校验
          │
          ↓
public/data/links.json ──→ Vite 静态产物 ──→ GitHub Pages
          │
          └──→ 运行时 fetch + 同一份 Zod Schema
                         │
                   扁平条目筛选
                         │
                   按主题与形态分组
                         │
                网站 / 书单 / 路线图卡片
```

1. **内容与代码解耦**：`content/` 是唯一维护源，每个条目一个 JSON；构建时合并生成 `public/data/links.json`，页面仍一次加载。Zod Schema 是结构契约，构建与运行时共用。
2. **维度正交**：`topic` 决定直接所属主题，主题可用 `parentId` 表达两级结构，`kind` 决定呈现形态，`tags` 决定检索属性。内容分类与属性统一由标签配置表达，不另设与 tags 重复的内容类型字段。
3. **先过滤再分组**：主题范围、关键词与标签筛选作用于扁平条目；分组后隐藏空主题，计数随筛选更新。
4. **状态最小化**：React 本地状态配合 URL 即可；派生数据不额外存储，不引入路由或状态管理库。
5. **布局与排序确定**：主题按显式顺序排列，主题内按形态分块，同形态内推荐优先，其余保留内容清单 `itemFiles` 的顺序。
6. **失败可见**：构建时阻断坏数据；运行时区分加载、错误、无内容与无结果，避免白屏。
7. **减少外部依赖**：核心功能只依赖本站静态资源；第三方 favicon 不成为默认网络请求。

### 2.1 技术选型

| 层 | 选型 | 理由与边界 |
|---|---|---|
| 构建 | Vite | 输出静态文件，支持项目页 `base` 路径 |
| 框架 | React + TypeScript | 足以覆盖检索、折叠和 URL 同步；运行时仍须校验 JSON |
| 样式 | Tailwind CSS | 使用统一颜色、间距、字号与断点 token |
| 组件 | shadcn/ui，按需引入 | 使用 Input、Badge、Button、Accordion、Collapsible；移动筛选无需 Sheet/Drawer |
| 校验 | Zod 4 | `kind` 判别联合及跨条目校验，类型从 Schema 推导 |
| 图标 | lucide-react | 按需导入，保持动作语义一致 |
| 脚本 | tsx | 运行共享 Schema 的 TypeScript 校验脚本 |
| 部署 | GitHub Actions + Pages | 校验、构建、发布与仓库版本一致 |

采用 Node.js 24 LTS，并在本地版本文件与 CI 中保持一致；依赖版本及 lockfile 一并提交。具体依赖版本在初始化时选取兼容组合。VitePress 的目录式内容模型不符合本项目的筛选交互，因此不采用。

## 3. 内容模型与维护契约

### 3.1 发布数据顶层结构

以下结构是生成后的 `public/data/links.json`，由前端一次加载；维护者编辑的是 `content/index.json` 与独立条目文件。

| 字段 | 类型 | 规则 |
|---|---|---|
| `version` | `1` | 数据契约版本；不支持的版本在构建及运行时明确报错 |
| `updatedAt` | `YYYY-MM-DD` | 内容更新日期，由维护者更新；页脚据此显示最后更新 |
| `$schema` | 可选字符串 | 编辑器 JSON Schema 地址；仅提供补全，不替代构建校验 |
| `topics` | `Topic[]` | 至少一个主题，主题 id 唯一 |
| `items` | `Item[]` | 扁平数组，允许为空；条目 id 唯一，topic 引用必须存在 |

主题包含 `id`、`name`、可选 `description`、可选 `parentId` 与 `order`（非负整数，默认 `0`）。省略 parentId 为一级主题；子主题引用一级主题的 id，最多支持两级。父级必须存在，禁止自引用和循环；主题 id 全局唯一。每个条目只引用一个直接所属主题，通用内容可以直接归到父主题。同级按 `order` 升序，相同顺序按 JSON 中的位置排序；不以名称改变维护者指定的顺序。

主题与条目的 id 都使用小写英文、数字及连接符，例如 `price-action`。两者分别检查唯一性，不要求跨集合唯一。id 是稳定标识，改标题时不改 id。

### 3.1.1 维护源与聚合规则

`content/index.json` 保存 `version`、`updatedAt`、可选 `$schema`、`topics` 和 `itemFiles`。元数据使用共享 Schema 的字段规则；清单为严格 JSON，不包含发布数据的 `items` 数组。`itemFiles` 是相对于 `content/` 的有序路径数组，例如 `items/web3/bitcoin-reading.json`，可以为空，不允许重复引用。

每个条目保存在 `content/items/<topic>/<id>.json`，包含完整 Item；书单内部的 books 和路线内部的 steps 不再拆分。路径中的 topic/id 必须与条目字段一致，并符合小写字母、数字与连字符命名规则。独立条目按清单顺序拼成扁平 items，使用同一个 `LinkDataSchema` 校验跨文件唯一性、主题引用和资源结构。

缺失清单或文件、未加入清单的条目、非法路径、符号链接、字段错误均阻断生成。错误与警告指向维护源文件及字段。全部内容和本地资料校验通过后，原子写入 `public/data/links.json`；无变化时不重写，失败时不覆盖最后一次有效产物。生成文件忽略提交，不允许同时手工维护源文件和发布文件。

开发启动时自动生成，并监听内容与静态资料变化；合法内容更新后刷新页面，校验失败时显示开发错误、数据请求返回 503，修正后自动恢复。生产仍使用静态 JSON 和原有 loading/error/ready 三态。添加模板与具体工作流见 [添加与维护内容](adding-content.md)。

### 3.2 条目公共字段与形态

公共字段：`id`、`topic`、`kind`、`title`、`description`、`tags`，以及可选 `audience`、`featured`。

- `description` 必填，是一句帮助判断用途的摘要，不重复标题或自动统计的数量。
- `audience` 可选，说明适用基础，例如“适合零基础”“建议具备 JavaScript 基础”。
- `tags` 默认空数组；同一条目不允许重复标签。
- `featured` 默认 `false`，表示维护者推荐；不自动推断“适合入门”。

| kind | 专有字段 | 呈现方式 |
|---|---|---|
| `site` | 必填 `url`，可选 `icon` | 紧凑外链卡片 |
| `reading-list` | 非空 `books: ResourceRef[]` | 决策摘要 + 默认折叠的有序书目 |
| `roadmap` | 非空 `steps[]`，可选 `estimatedEffort` | 整行概览 + 默认折叠的阶段列表 |

路线阶段包含 `title`、可选 `description`、`resources: ResourceRef[]`（默认空数组）。允许概念阶段没有链接，展开时不渲染空资源容器。`estimatedEffort` 是维护者给出的说明，例如“约 20–30 小时”；未知时不显示，不将其当作完成承诺或根据阶段数猜测。

### 3.3 资源引用与访问语义

书目与路线资源共用 `ResourceRef`，统一使用 `title`，避免书目 `title` 与路线资源 `name` 两套命名。

| 字段 | 规则 |
|---|---|
| `title` | 必填资源名称 |
| `author` / `note` | 可选作者与用途、阅读顺序等说明 |
| `url` | 可选外链，只接受 `http:` / `https:` |
| `file` | 可选本地资料路径，必须位于 `public/files/` |
| `format` | 可选 `pdf` / `epub`；外链扩展名不可靠时显式标注 |
| `access` | `free` / `paid` / `unknown`，默认 `unknown`；仅表达维护者确认的访问条件 |

`url` 与 `file` 至少提供一个；同时存在时分别显示“访问来源”和“下载 PDF/文件”，不按隐式优先级吞掉其中一个。`file` 写作 `files/资料.pdf`，相对于 `public/`，不带起始 `/`、查询参数或 fragment，不允许 `..`、反斜线、百分号编码或空路径段。可用中文和空格，生成链接时按路径段编码。`icon` 采用同样规则，但限定为 `icons/` 下的本地图片。

本地扩展名为 `.pdf` / `.epub` 时可推导格式；若同时声明 `format`，必须一致。外链是否是 PDF 以 `format: "pdf"` 为依据，不根据标题或 URL 猜测。

`access` 表达获取完整资源的条件：至少一个目标可确认免费获取完整内容时为 `free`，所有目标都确认需付费时为 `paid`，其他情况为 `unknown`。免费样章不等于完整资源免费；双引用的来源购买、注册等差异写入 `note`，动作文字不得暗示两个目标都免费。

### 3.4 折叠态决策摘要的来源

摘要尽量从结构化数据派生，不在描述中手写容易过期的统计。

| 形态 | 必须展示 | 有信息时展示 |
|---|---|---|
| site | 标题、用途、标签、访问动作 | 适用人群、推荐标记 |
| reading-list | 实际书目数、第一本书标题 | 第二本标题、适用人群、含 PDF、访问条件摘要 |
| roadmap | 实际阶段数、前两个阶段标题，剩余显示 `+N` | 适用人群、预计投入 |

书单访问摘要按所有书目计算：全部 `free` 才显示“全部免费”；只有部分 `free` 显示“含免费资源”；全部 `paid` 显示“付费资源”；部分已知付费显示“含付费资源”；未知部分明确显示“部分访问条件未确认”。全为 `unknown` 时不渲染访问条件摘要，不将本地文件默认视作免费。含 PDF 根据格式判断。书单使用 `免费` 标签须全部书目为 `free`，路线图使用该标签须至少有一份资源且全部引用资源为 `free`；没有结构化访问信息的 site 由维护者核实，不以免费样章或试用期代表免费使用。

### 3.5 JSON 示例

以下为生成后的发布数据示例，使用严格 JSON，无注释。它展示字段及数量的一致性；示例本地文件与链接须在实施时补齐或替换。

```json
{
  "version": 1,
  "updatedAt": "2026-10-27",
  "topics": [
    { "id": "stocks", "name": "美股", "description": "行情、板块与财报工具", "order": 1 },
    { "id": "price-action", "name": "价格行为学", "order": 2 },
    { "id": "web3", "name": "Web3", "order": 3 },
    { "id": "daily", "name": "日常工具", "order": 4 }
  ],
  "items": [
    {
      "id": "finviz-map",
      "topic": "stocks",
      "kind": "site",
      "title": "Finviz 板块热力图",
      "description": "按板块查看涨跌分布，适合快速观察市场轮动",
      "url": "https://finviz.com/map.ashx",
      "tags": ["工具", "行情", "可视化"],
      "featured": true
    },
    {
      "id": "price-action-books",
      "topic": "price-action",
      "kind": "reading-list",
      "title": "价格行为学资料入门",
      "description": "先理解基本概念，再通过图例练习识别趋势与区间",
      "audience": "适合已有基础交易知识的读者",
      "books": [
        { "title": "价格行为基础笔记", "author": "站点维护者", "note": "推荐先读", "file": "files/price-action-notes.pdf", "format": "pdf", "access": "free" },
        { "title": "图例练习资料", "note": "配合笔记练习", "url": "https://example.com/practice", "access": "unknown" }
      ],
      "tags": ["资源", "书籍", "PDF"]
    },
    {
      "id": "web3-roadmap",
      "topic": "web3",
      "kind": "roadmap",
      "title": "Web3 学习路线",
      "description": "从账户模型到合约实践，建立基础概念与动手能力",
      "audience": "建议具备编程基础",
      "estimatedEffort": "约 20–30 小时，按个人进度调整",
      "steps": [
        {
          "title": "区块链基础",
          "description": "理解哈希、共识与账户模型",
          "resources": [
            { "title": "区块链基础公开课", "url": "https://example.com/course", "access": "free" }
          ]
        },
        { "title": "智能合约入门", "description": "认识 Solidity 与 EVM，并完成一个简单合约", "resources": [] }
      ],
      "tags": ["资源", "路线图", "入门"]
    }
  ]
}
```

### 3.6 标签、内容分类与推荐治理

- 规范词表、别名、分组与入口位置统一维护在 `src/lib/tagVocabulary.ts`。`ALLOWED_TAGS` 决定维护警告，`TAG_DEFINITIONS` 决定语义分组与常用入口；两者职责不同。
- 分类为文档、教程、书籍、工具、路线图；属性分为格式、访问条件、语言、难度、账号要求；其他标签默认进入关键词组。只有配置了 `primary` 的分类进入顶部入口，未被内容使用的入口隐藏。
- `资源` 是泛称，保留为可搜索关键词，不与教程等用途分类并列。“PDF”是格式，可用于书籍、论文、教程，不建立“书籍 → PDF”的标签父子树。
- `kind` 只决定卡片形态，不能把全部网站认定为工具、全部阅读清单认定为书籍。书籍、文档和教程由条目显式声明；路线图可由确定的 roadmap 形态派生。
- 新分组筛选通过 `tags.ts` 计算有效标签。书目和阶段资源的 PDF/EPUB 从 format 或本地扩展名派生，免费/付费从 access 派生；unknown 不推断。结构化内容的格式和访问条件以资源字段为准，条目不必重复填写这些属性。
- 卡片的“全部免费”等摘要仍按所有资源计算；筛选“免费”表示包含免费资源。两者用不同文案表达，不能把部分免费显示为全部免费。旧条目显式免费/PDF 标签的不一致警告继续保留。
- 每条目每标签计一次，常用入口按配置排序；更多面板先按语义分组，组内保留既有决策标签优先与频次排序。标签取自筛选前的当前范围，关键词和属性变化不导致入口消失或重排。
- 标签中文为主，规范缩写保留 PDF、API；长度和逗号禁用由 Schema 校验。未知标签与别名只警告，前端不静默归一化语义别名。注册普通标签不自动提升为顶部入口。
- 每个直接主题建议最多两个推荐条目；各形态块内推荐优先，书目和阶段保持学习顺序。卡片保留 PDF、免费、入门等决策信息。

### 3.7 文件与内容维护边界

`public/files/` 只托管有权公开的资料，例如自写笔记与许可允许分发的材料；其他资料链接到合法来源。访问条件写清楚，不把“打开来源页”标成“免费下载”。

项目设置自己的体积预算：单文件超过 **15 MiB 警告**，超过 **50 MiB 阻断**，`public/files/` 总量超过 **200 MiB 警告**。超预算资料改用外链；这些是项目规则，不依赖托管平台的上限变化。校验脚本遍历目录检查全部文件，引用路径另外逐一验证；未被引用的资料给出清理警告。

## 4. 页面与交互设计

### 4.1 信息结构与视觉层级

```text
站点名                         当前主题（宽屏，滚动时显示）
[搜索资源、书名或阶段…                             清除]
内容分类： [全部] [文档] [教程] [书籍] [工具] [路线图] [更多]
已选： [免费 ×] [PDF ×]    同组任一项，不同组同时满足
找到 8 个条目 · 3 个主题                            清空筛选
────────────────────────────────────────────────────────
▍美股                                           2 / 6 条目
行情、板块与财报工具
  网站与工具卡片网格
  书单卡片网格（有内容才显示）
  路线图列表（每条占整行，有内容才显示）

▍Web3                                           1 / 3 条目
  …
────────────────────────────────────────────────────────
最后更新：2026-10-27                       GitHub（可选）
```

主题不用外围大卡片包裹，使用间距和 3px 左侧强调色竖条区分。没有子主题时，主题直接展示三种卡片。存在子主题时，先展示父主题的“通用资源”，再展示子主题；通用区与每个子主题内部的形态块固定为 `site → reading-list → roadmap`，空块不占位。

| 元素 | 建议样式 |
|---|---|
| 站点名 | 20px / semibold |
| 一级主题标题 | 24px / semibold |
| 子主题标题 | 20px / semibold |
| 条目标题 | 16px / medium |
| 描述、计数、辅助文字 | 14px / 合格对比度的次要颜色 |

条目描述折叠态最多两行；主题简介允许移动端自然换行。主题标题至少为条目标题的 1.5 倍。颜色、圆角、阴影保持克制，推荐标记不盖过标题与动作。

### 4.1.1 两级主题版式

```text
▍Web3                                      5 / 8 条目
区块链基础与链上开发入口
[通用资源] [Solana] [Ethereum]  ← 主题内锚点

通用资源                                   1 / 1 条目
  完整宽度的卡片网格

Solana                                     2 / 3 条目
账户模型、链上工具与程序开发
  完整宽度的卡片网格 / 书单 / 路线

Ethereum                                   2 / 4 条目
  完整宽度的卡片网格 / 书单 / 路线
```

两级主题保留编辑型视觉体系：背景 #f8f9fb、正文 #20242b、白色卡片 #ffffff、强调色 #586783、边框 #e3e6eb、次要文字 #667080。字体继续使用本地 Geist 与中文系统字体；一级主题为 24px semibold，子主题为 20px semibold，卡片为 16px medium。一级主题保留 3px 竖条，子主题通过细线与较小间距分区，默认展开，不加外围大卡片、侧栏或 Tabs。

父主题直接内容在前，子主题按同级 order 展示；没有直接内容时不显示“通用资源”。移动端只用标题和间距区分层级，不增加嵌套缩进，不缩窄卡片。一级主题之间间距约 56–64px，子主题之间约 32–40px。

父主题计数包含直接条目与子主题条目，子主题计数只含自身条目；全站匹配数按唯一条目统计。筛选后空子主题隐藏；父主题即使没有直接内容，只要任一子主题命中就保留。结果提示分别显示一级主题数和子主题数。

可见导航目标（通用资源与子主题）至少三个时，在父主题标题下显示可换行的轻量锚点链接；筛选后只保留实际存在的目标。链接保留当前 query，通过 hash 定位；点击后焦点移至目标标题，滚动与当前位置观察共用固定区域的实时测量值，包含宽屏固定标签栏，搜索展开和字体变化后自动更新。当前位置按阅读顺序观察父/子标题，宽屏显示“Web3 / Solana”，移动端在主题区显示同样的轻量路径提示。

文档标题语义：站点名 h1，父主题 h2，子主题/通用资源 h3，其内卡片 h4，书目和阶段 h5；无子主题的平级卡片仍为 h3。标题语义和可访问焦点由组件明确传递，不以 CSS 模拟结构。

### 4.2 全站与主题范围内的轻量筛选

- 全站头部保持站点名、搜索和当前位置；移动端搜索通过明确图标展开，已有关键词时持续显示。头部下方一行分类可横向滚动，末端始终可见“更多”。
- 点击一级或子主题标题旁的“只看此主题”才进入范围；父主题包含直接内容与子主题，子主题只包含自身。滚动、当前位置反馈及 hash 锚点只负责定位，不隐式改变范围。
- 进入范围后，全站分类栏收起。主内容顶部显示范围路径、是否包含子主题、“切换主题”和“查看全部主题”；在选定主题标题下显示可换行的分类及“更多筛选”。不加入常驻侧栏，不缩窄卡片。
- 切换范围和查看全部主题保留关键词、标签与匹配方式；切换器来自全量非空主题，不能因为当前结果为空而消失。用户明确切换后焦点与滚动返回范围提示，退出后返回主内容。
- 更多面板按分类、格式、访问条件、语言、难度、账号要求和关键词分组，最大高度约 40dvh，处于文档流。已选条件在面板收起后仍可见，每项可移除。
- 范围内无结果时，范围提示与筛选控件仍展示；清空条件只恢复范围内内容，退出范围是独立动作。失效 topic 显示“此主题已不存在”，允许切换或查看全部主题。
- 触控目标至少 48px。移动端分类和已选区可自然换行，专业长标签可断行；不靠嵌套缩进表达层级。宽屏只固定搜索头部及全站分类栏，范围内筛选随正文滚动。
- 进入/退出范围、搜索展开与字体变化后重新测量固定区域，供锚点和当前位置共用。

### 4.3 三种卡片

**网站卡片**：一张卡一个外链。展示图标、标题、用途、标签、可选适用人群和 `↗ 访问`。整卡采用一个真正的 `<a>`，不将标签做成其中嵌套的按钮；卡片标签只展示属性，筛选在全站分类栏或主题内轻量面板完成。

**书单卡片**：折叠态显示标题、用途、适用人群、实际书目数及访问摘要，预览第一本（宽屏可显示前两本），右侧或底部明确标注“展开书单”。例如：

```text
价格行为学资料入门
先理解基本概念，再通过图例练习
2 本 · 含 PDF · 含免费资源 · 部分访问条件未确认
推荐先读：价格行为基础笔记
[资源] [书籍] [PDF]                          ▾ 展开书单
```

展开后按顺序列出书名、作者、备注与动作。本地 PDF 显示 `⬇ 下载 PDF`；其他文件显示“下载文件”；外链显示 `↗ 访问来源`。动作独立于展开按钮，不将整张书单卡片设为点击区域。

**路线图卡片**：占整行，折叠态显示标题、用途、阶段数、适用人群、可选投入及前两个阶段标题；超过两个阶段才显示 `+N`，例如“区块链基础 → 智能合约入门 +2”。展开后使用有序列表构成竖向时间线，每阶段展示标题、描述与资源链接，顺序由数据决定。

书单与路线图默认折叠，支持多条同时展开；使用稳定 item id 作为 React key。筛选暂时隐藏条目时保留其展开状态，恢复筛选后仍可继续阅读；刷新页面恢复默认折叠，展开状态不写入 URL 或 localStorage。展开后焦点留在触发按钮，不自动滚动到资料末尾。

### 4.4 检索与标签的唯一语义

唯一状态为 `keyword`、`selectedTags`、`tagMatch: 'grouped' | 'any' | 'all'` 与可选 `topicId`。没有独立 quick 状态，也没有每个主题各存一套条件。

- 新访问默认 grouped：同组 OR，跨组 AND。例如“文档或书籍，并且 PDF 或 EPUB，并且免费”。关键词、主题范围与标签条件之间为 AND。
- “全部”只清除内容分类，保留格式等属性、关键词和主题范围。“清空筛选”清除关键词及全部标签，恢复 grouped，保留主题范围；“查看全部主题”只清除 topicId。
- 已选区明确说明“同组匹配任一项，不同组同时满足”。旧链接 any/all 保留原始标签 OR/AND 匹配，并显示原语义；用户可明确切换为分组匹配，不自动迁移分享条件。
- 资源格式与访问条件组合必须由同一书目或同一阶段资源满足。“免费 PDF”不能由免费网页和另一份付费 PDF 共同满足。
- 空标签集合不限制结果。标签不因被移出顶部而失去搜索或筛选能力；未知选择保留并可移除。

| 已选条件 | 新分组语义 | 是否命中 |
|---|---|---|
| 书籍、PDF | 书籍且包含 PDF | PDF 书籍命中，PDF 文档不命中 |
| 文档、书籍、PDF、EPUB | 文档或书籍，且 PDF 或 EPUB | 满足分类与任一格式即命中 |
| 书籍、PDF、免费 | 书籍且至少一份免费 PDF | 免费网页加付费 PDF 不命中 |
| 无 | 只限制范围及关键词 | 两者均满足即命中 |

搜索对 Unicode 兼容字符、大小写、首尾空格归一化，使用子串匹配。检索标题、描述、适用人群、有效标签、书目/阶段/资源的标题、作者、备注及阶段描述，不搜索 URL。命中后返回整张条目，不拆分书单或路线；展开仍展示完整资料。

统一流程：`全量 items → 主题范围 → 关键词与标签 → 直接 topic 分桶与排序 → 两级分组 → 隐藏空分支`。父级只汇总，不复制子级条目；主题计数分母保持全量内容口径，单位始终是条目。

### 4.5 URL 同步与浏览器导航

新格式：`?topic=web3&q=区块链&tags=书籍,PDF&match=grouped`。无范围、无关键词和无标签时省略对应参数；新链接有标签时明确写 grouped。旧 tags 链接缺省或非法 match 继续按 any 处理，显式 all 保持原义。没有 tags 与 match 的新访问默认 grouped。使用 URLSearchParams 编码，标签禁止逗号。

- 首次加载从 URL 初始化，标签去重、移除空值，主题存在性在数据加载完成后判断；未知 topic 保留且不放宽结果。未知标签保留为已选 chip，附“当前数据无此标签”，允许移除；不静默放宽分享链接的筛选条件。
- 搜索输入立即更新 UI，URL 写入可使用约 200ms 防抖；标签、匹配方式、主题范围与清空操作立即同步。防抖任务读取最新完整状态，后续操作及组件卸载取消过期任务。
- 使用 `history.replaceState` 更新当前页面，保留已有 `history.state`、pathname、无关 query 参数及 hash，不让每次输入都新增历史记录。
- 监听 `popstate`，从当前 URL 恢复筛选，取消待执行 URL 写入；本组件的标签点击不产生额外历史步，来自其他页面或历史记录的前进、后退应正确恢复。
- 不把卡片展开、筛选面板展开与滚动位置写入 URL；显式浏览范围 topicId 写入 query；没有详情页路由，不需要 react-router。

### 4.6 当前位置反馈与响应式布局

主题标题不 sticky，避免与筛选栏叠层。通过 IntersectionObserver 观察筛选后仍展示的主题，使用 sticky 栏高度对应的顶部偏移；当前位置为标题最后一个已越过栏下边缘的主题，即使标题已滚出视口也保持激活，直到进入下一主题。页面顶端选第一个主题，页面底部选最后一个主题。宽屏头部显示当前主题，所有屏幕都可轻微强调当前主题竖条；移动端不为当前位置增加一整行。

头部高度变化通过 ResizeObserver 更新 `scroll-margin-top` 和观察器偏移。筛选后重新绑定可见主题；当前位置失效时按新的可见区重算，无结果时隐藏当前位置。滚动反馈不改变筛选或键盘焦点。

布局规则：

- `< 768px`：全部单列。
- `768–1199px`：网站两列，书单两列，路线图整行。
- `≥ 1200px`：网站三列，书单两列，路线图整行；内容容器限制最大宽度，避免正文过长。
- 每种形态使用独立容器，避免书单跨列与整行路线插入网站网格产生空洞；同块推荐优先，块间不交叉排序。
- 不使用 masonry 或 CSS dense 自动填充，视觉顺序与 DOM/键盘顺序一致。展开内容自然增高，不强制等高截断。

### 4.7 空状态、错误与无障碍

| 状态 | 展示与恢复 |
|---|---|
| 初始加载 | 稳定占位与“正在加载资源”；数据未就绪前不显示“无结果” |
| 加载失败 | “资源暂时无法加载，请重试”，提供重试按钮；开发控制台记录 HTTP/解析/Schema 错误 |
| 数据有效但 items 为空 | “内容正在整理中”，不提供无效的清空筛选动作 |
| 有内容但筛选无结果 | “当前筛选下没有匹配条目，试试清空标签或换个关键词”，提供“清空筛选” |
| 部分主题无结果 | 隐藏空主题，全局数量与可见主题正常更新，无需逐主题显示错误 |

- 使用 `header`、`main`、主题 `section`、`h1/h2/h3` 与跳到主内容链接；页面设置 `lang="zh-CN"`。
- 搜索有 label，标签按钮使用 `aria-pressed`，匹配方式采用明确的单选控件，折叠触发器有 `aria-expanded` / `aria-controls`。
- 所有可操作元素有可见焦点；触控目标至少 48px，正文对比度达到 WCAG AA；推荐、选中及动作语义不能只靠颜色表达。
- 结果计数以 `aria-live="polite"` 播报，输入时短暂合并更新，避免逐字符频繁打断；页面加载错误使用可访问提示。
- 外链使用 `target="_blank" rel="noopener noreferrer"`，为访问动作提供“在新标签页打开”的可访问说明。本地文件使用同源 `<a download>`，实际保存或预览由浏览器决定。
- 尊重 `prefers-reduced-motion`；键盘 Enter/Space 可展开，Tab 可到达每个资源动作。不以 hover 作为显示关键信息的唯一方式。

## 5. 实现契约

### 5.1 目录与组件职责

```text
content/
  index.json                   # 元数据、主题与有序 itemFiles 清单
  items/<topic>/<id>.json       # 每个条目一个 JSON
public/
  data/links.json               # 自动生成的发布数据，忽略提交
  data/links.schema.json        # 可选生成文件，不能手工维护另一套规则
  files/                       # 本地资料
  icons/                       # 可选本地图标
scripts/
  content.ts                   # 读取与合并维护源、共享 Schema 校验、源文件定位
  generate-data.ts             # 完整校验后原子生成 links.json
  contentPlugin.ts             # 开发生成、监听与错误恢复
  validate.ts                  # 结构、文件引用、体积与内容警告
  generate-schema.ts           # 可选：从 Zod 生成编辑器 JSON Schema
src/
  components/
    SiteHeader.tsx             # 搜索、常用标签、当前位置
    TagFilter.tsx              # 全站分类栏与按组展开的筛选
    TopicFilter.tsx            # 主题标题下的轻量筛选
    TopicScope.tsx             # 范围路径、切换与退出
    FilterChips.tsx            # 共用分类、属性与已选条件控件
    TopicSection.tsx           # 一级主题汇总、通用内容与子主题组合
    SubtopicSection.tsx        # 子主题标题、直接计数与内容
    TopicItemGrid.tsx          # 三种形态的共享网格
    TopicCount.tsx             # 统一计数展示与可访问说明
    ItemCard.tsx               # kind 分发
    cards/SiteCard.tsx
    cards/ReadingListCard.tsx
    cards/RoadmapCard.tsx
  hooks/
    useLinks.ts                # 加载状态、重试、取消请求
    useLinkFilters.ts          # 筛选状态、URL 初始化/写入/popstate
    useActiveTopic.ts          # 观察可见主题边界，使用统一固定偏移
    useStickyOffset.ts         # 统一测量头部与固定标签栏，提供滚动/观察偏移
    useTopicNavigation.ts      # hash 导航、焦点与异步加载后的历史恢复
  lib/
    schema.ts                  # Zod Schema 与推导类型
    paths.ts                   # 静态路径规则与 BASE_URL 解析
    loadLinks.ts               # fetch、HTTP 检查、运行时校验
    filters.ts                 # 检索、标签聚合、直接主题分桶与稳定排序
    topics.ts                  # 两级分组、直接/汇总计数与可见位置路径
    resourcePresentation.ts    # 书单与路线图决策摘要、资源动作
    tagVocabulary.ts           # 规范词表、语义分组、常用入口与别名
    tags.ts                    # 有效属性、入口和分组匹配纯函数
  App.tsx                      # 页面加载三态、筛选结果、展开 id 集合
  main.tsx
vite.config.ts
.github/workflows/deploy.yml
```

派生状态包括筛选结果、计数、分组、常用标签高亮与决策摘要，通过纯函数计算。`App` 保存展开 id 集合，筛选不会丢失展开状态。不要同时保存 `quick` 与标签选择，也不要把可由数据计算的书目数、阶段数写入 JSON。

### 5.2 共享 Schema 参考

以下使用 Zod 4。静态路径校验留在共享模块；Node 文件存在性与体积校验只在脚本中执行，避免将 Node 模块引入浏览器。

```ts
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
```

未知结构字段使用 strict 校验，尽早发现拼写错误。Schema 只约束数据契约；未知标签、推荐数量及文案等属于可演进的维护建议，在独立 warning 阶段处理。

可选编辑器 Schema 由 Zod 生成，跨引用、重复 id、自定义路径等无法由 JSON Schema 完整表达的规则始终以 `validate` 为准。采用 Schema 生成时，生成脚本在校验阶段检查产物是否与源一致，避免补全提示漂移。

### 5.3 加载与静态路径

所有本站静态资源使用统一 `paths.ts` 函数，将已校验的相对路径按段执行 `encodeURIComponent`，再加上 `import.meta.env.BASE_URL`；外链不添加 base。不硬编码 `/data/`、`/files/` 或 `/icons/`。

```ts
// paths.ts；relative 必须来自固定路径或已通过 Schema 校验的本地路径。
export function assetUrl(relative: string): string {
  return `${import.meta.env.BASE_URL}${relative.split('/').map(encodeURIComponent).join('/')}`
}

// loadLinks.ts；LinkDataSchema 与 assetUrl 按目录正常导入。
export async function loadLinks(signal: AbortSignal): Promise<LinkData> {
  const response = await fetch(assetUrl('data/links.json'), {
    signal,
    cache: 'no-cache',
  })
  if (!response.ok) throw new Error(`加载资源失败：HTTP ${response.status}`)
  return LinkDataSchema.parse(await response.json())
}
```

`useLinks` 暴露 `loading | error | ready` 状态及 `retry()`。每次请求使用 AbortController，设置约 15 秒超时；重试或卸载时终止旧请求并清除计时器，通过请求编号或局部失效标记阻止过期结果覆盖新状态。主动取消不展示错误，超时进入可重试错误。请求在 StrictMode 重挂载时也应正确清理。

不在 localStorage 长期缓存内容，不为首版增加 Service Worker；浏览器可按 HTTP 规则重新验证 JSON。下载文件采用新版本文件名替换已有内容，发布后抽查内容与文件一致。

### 5.4 检索、范围与排序契约

共享实现为 `filters.ts`、`tags.ts` 与 `topics.ts`。界面只消费 hook 派生值，保持函数无副作用、不修改源数组。

```ts
const scopedItems = getTopicItems(data.items, data.topics, state.topicId)
const filteredItems = filterItems(scopedItems, state)
const topicCounts = collectTopicCounts(data.items, data.topics)
const groups = buildTopicGroups(filteredItems, data.topics, topicCounts)
const topicLocations = getTopicLocations(groups)
```

`getTopicItems`：无范围返回全量，父级范围包括直接子主题，未知范围返回空数组。`filterItems`：关键词与标签条件 AND；grouped 使用统一配置及资源事实，any/all 保留原始标签含义。`collectTags` 保留标签频次与稳定排序，UI 对当前范围的有效标签调用它；`getPrimaryTags` 和 `groupTags` 决定入口与面板。

`groupByTopic` 只负责直接归属分桶、同级 order 排序与形态块内推荐排序；稳定排序保留原始顺序。`buildTopicGroups` 组装两级关系，隐藏空分支。`topicCounts.direct/total` 始终按全量数据计算，分别供直接与父级汇总计数使用。root.items 只包含直接内容，subtopics 只保留匹配子级，hasSubtopics 不因过滤改变。

当前规模无需索引，性能需要时在数据变化后预计算搜索文本、有效标签，避免每次输入重建。旧过滤模式与新分组模式必须分别测试，不用 UI 特例修正业务含义。

### 5.5 图标、性能与外链可靠性

网站卡片优先使用维护者提供的本地 `icon`；缺省立即显示由标题首字和稳定 id 色值形成的色块。色值来自有限、保证对比度的 palette。图片固定宽高、懒加载、解码异步，加载失败立即回退，不持续重试。

Google S2 favicon 不作为默认方案，因为部分网络不可用，且会暴露所查询域名。后续如启用第三方图标，明确配置开关并保留同样回退；首版复用本站图标的 HTTP 缓存，无需单独实现图片 localStorage 缓存。

JSON 一次加载，PDF 不预加载或嵌入预览。CI 默认不探测外链在线性，避免临时超时、限流和地域差异阻断发布；维护者发布前检查新增外链，后续可以增加非阻断的定期检查。

## 6. 校验与部署

### 6.1 构建校验规则

`scripts/validate.ts` 以仓库根为基准读取 content 清单与独立条目，合并后执行以下阶段；错误输出同时给出源文件、字段与条目 id，例如 `content/items/stocks/price-action-books.json:books[0].file (price-action-books)`。

| 级别 | 检查内容 | 处理 |
|---|---|---|
| Error | JSON 无法解析、Schema 不通过、清单缺失/重复引用、条目遗漏、路径不一致、重复 topic/item id、未知 topic、父级不存在/自引用/循环/超过两级、缺必填内容 | 非零退出，阻断构建 |
| Error | 不安全本地路径、本地资料或 icon 不存在/不是普通文件、格式冲突 | 非零退出，阻断构建 |
| Error | 单个本地资料超过 50 MiB | 非零退出，要求外置 |
| Warning | 单资料超过 15 MiB、资料总量超过 200 MiB、未引用资料 | 打印路径与体积，继续构建 |
| Warning | 未知标签、同义/大小写标签建议、标签与资料摘要冲突、每主题推荐超过两条 | 打印条目 id 与修正建议，继续构建 |

存在性检查不仅使用字符串前缀，还应解析真实路径，拒绝通过符号链接逃逸 `public/files/` 或 `public/icons/` 的引用。目录体积统计避免跟随符号链接。有效但为空的 items 允许构建，页面显示内容整理状态。

校验结果报告主题数、条目数、引用文件数、警告数。警告与错误明确区分，不把未知标签升级成不透明的发布失败。

### 6.2 开发与构建命令

```json
{
  "scripts": {
    "dev": "vite",
    "validate": "tsx scripts/validate.ts",
    "generate:data": "tsx scripts/generate-data.ts",
    "prebuild": "npm run generate:data",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

`npm run build` 通过 npm 的 `prebuild` 生命周期完成校验与生成，再执行构建；CI 不再重复运行同一份校验。手工检查内容可单独执行 `npm run validate`，需要写入聚合数据时执行 `npm run generate:data`。开发自动生成并监听更新；preview 只预览上次构建，内容修改后需重新 build。项目初始化后为筛选、Schema 与 URL 编解码配置小型测试集，CI 在构建前运行对应测试；避免为静态文案或简单样式编写只重复实现的测试。

### 6.3 Pages 路径与流水线

本仓库使用项目页路径 `/link-hub/`；如果仓库改名、使用用户主页仓库或自定义域名，同步调整 `base` 并重新验证资源路径。

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/link-hub/',
  plugins: [react()],
})
```

GitHub 仓库 Settings → Pages → Source 选择 **GitHub Actions**。部署示例以 `main` 为发布分支，初始化时确认实际默认分支并同步配置。PR 与 main 都执行构建校验，但仅 main 推送或从 main 手工触发时部署。

```yaml
name: Validate and deploy
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      # 初始化测试命令后，在此运行测试。
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
        with:
          path: dist

  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/configure-pages@v5
      - id: deployment
        uses: actions/deploy-pages@v4
```

同分支流水线串行运行，避免打断正在发布的版本；GitHub concurrency 可能替换尚未开始的等待任务，最终以最新发布分支成功运行及其 commit 为准。部署前构建失败时不运行发布任务，保留当前线上版本。需要回滚时回退内容或代码提交并重新部署，不依赖浏览器缓存清除解决发布错误。

## 7. 日常维护工作流

1. 在 `content/items/<topic>/<id>.json` 编辑或添加完整条目；必要时先在 `content/index.json` 添加主题。更新清单 itemFiles 与 updatedAt，使用稳定 id、准确标签与一句话用途。具体模板见 [添加与维护内容](adding-content.md)。
2. 添加本地资料或 icon，检查公开分发权限与体积；资料更新优先使用新文件名，删掉已无引用的旧文件。
3. 运行 `npm run validate`，修正所有错误，逐条评估警告；不手工编辑或提交生成的 `public/data/links.json`。未知合理标签可补充受控词表。
4. 运行 `npm run dev`，检查折叠摘要、展开内容、外链与下载动作；修改筛选后复制 URL，刷新确认恢复。
5. 发布前执行 `npm run build` 并通过 `npm run preview` 在 `/link-hub/` 路径验证。提交到发布分支或提交 PR；CI 成功后 Pages 自动更新，以部署成功状态为准。
6. 发布后抽查新条目与文件路径。若发布错误，回退对应提交并重新部署。

常规内容维护不会改组件；词表治理修改词表文件，新形态或交互才涉及代码。无须在 README 手工同步标签统计或书目数量。

## 8. 实施里程碑与退出条件

| 阶段 | 内容 | 完成标志 |
|---|---|---|
| M1 数据与骨架 | 初始化技术栈、共享 Schema、validate、加载三态、主题与 site 卡、本地路径与图标回退 | 本地展示有效数据；错误数据和缺文件阻断 build；项目 base 路径可加载 |
| M2 检索与移动交互 | 搜索、主题范围、分类与分组属性筛选、旧匹配兼容、URL 恢复、轻量展开面板、计数与空状态；确定并实现纯函数决策摘要 | 移动端无需抽屉即可换标签；AND/OR 结果正确；刷新和历史恢复通过；摘要测试覆盖已知/未知条件 |
| M3 多形态与布局 | 书单/路线图折叠卡，接入 M2 摘要，稳定形态分块与推荐排序，展开状态保留、无障碍、当前位置反馈 | 三形态在同主题共存，未展开也能判断适用性；展开动作与外链分离；键盘顺序正确 |
| M4 发布与验收 | 文件体积/词表/推荐警告、PR 校验、Actions/Pages、生产路径验证、回滚演练 | 坏数据不发布，警告不阻断；线上 JSON、中文文件名与图标均可访问 |
| M5 打磨 | 真机与跨浏览器检查，文案、间距、长标题、大标签集及 reduced-motion 调整 | 移动端遮挡可控，无横向溢出，弱网错误可重试，核心验收项全部完成 |

核心容错、移动筛选、决策摘要与空状态属于首版交付，不延迟到最后的视觉打磨。M2 定义摘要数据与函数，M3 完成卡片呈现，避免把不存在的多形态 UI 列为 M2 交付。

## 9. 验收清单

### 内容与构建

- [ ] 分文件示例与 Schema 字段完全一致，聚合产物由清单生成，真实书目/阶段数从数组派生，空资源阶段可以通过校验。
- [ ] 缺失/重复清单项、遗漏条目文件、文件路径与 topic/id 不一致、符号链接均阻断生成；错误指向源文件。
- [ ] 重复 topic id、重复 item id、未知 topic、非法 kind、空标题/描述、重复标签均阻断构建，输出准确路径。
- [ ] 资源缺少 url/file、非 HTTP(S) 外链、不安全路径、缺文件、目录或逃逸符号链接引用均阻断。
- [ ] 未知标签与推荐超额产生 warning；15 MiB/50 MiB/总量预算按规则区分 warning 与 error。
- [ ] 访问条件未知时不显示“全部免费”；书单部分免费、部分未知等情况摘要准确。

### 检索与状态

- [ ] 搜索命中标题、描述、标签、书名、作者与阶段信息；大小写、首尾空格与兼容字符按约定归一化。
- [ ] 新分组同组 OR/跨组 AND，资源属性由同一资源满足；旧 any/all 含义不变，零标签不限制结果。
- [ ] 分类、更多属性和已选条件共用状态；全部只清分类，清空筛选保留范围，查看全部主题只退出范围。
- [ ] URL 初始化、父子范围、失效 topic、重复/未知标签、旧模式与中文编码正确；无关参数及 hash 保留。
- [ ] 刷新、浏览器前进/后退恢复条件，过期防抖不覆盖新状态，每次输入不新增历史记录。
- [ ] 空主题隐藏，计数为条目数；无内容、无结果、加载错误三个状态文案与恢复动作不同。

### 页面与访问

- [ ] 同一主题三形态按 site/reading-list/roadmap 分块，同块推荐优先且排序稳定，路线占整行。
- [ ] 书单/路线默认折叠，摘要包含约定决策信息；内部资源按学习顺序显示，双引用提供两个动作。
- [ ] 多条可同时展开，筛选隐藏再恢复保留展开状态，刷新恢复折叠，外链不会触发展开。
- [ ] 移动端搜索与常用标签持续可达，“更多”就地展开，320px 宽度和大字号下无页面横向溢出。
- [ ] sticky 栏不占据过多屏幕空间，主题当前位置随滚动、筛选、头部高度变化正确更新。
- [ ] 图标不可用时色块立即兜底，不重复请求；站点不依赖 Google 可达性。
- [ ] 键盘可完成搜索、筛选、展开、访问与下载；焦点、标签状态、折叠状态和结果数可被辅助技术理解。

### 部署与运行

- [ ] PR 执行校验构建但不部署；发布分支成功部署，失败构建保留当前线上版本。
- [ ] `/link-hub/` 下 JSON、JS/CSS、图标、中文/空格文件名下载均无 404，外链不被加上 base。
- [ ] 网络失败、HTTP 错误、无效 JSON、Schema 错误及超时均有错误提示；重试和卸载不会产生过期状态覆盖。
- [ ] Chrome、Safari 与至少一台移动设备完成核心流程检查；弱网及 reduced-motion 模式可用。
- [ ] 回退一次内容提交并重新部署可恢复版本，页脚日期来自内容数据。

## 10. 后续演进条件

- **暗色模式**：先建立颜色 token；有持续使用需求时再提供主题切换与系统偏好跟随。
- **键盘快捷键**：后续可用 `/` 聚焦搜索；`Esc` 优先处理展开面板，避免输入时意外清空全部条件，需单独确定交互优先级。
- **本地收藏**：确认有重复访问与个人整理需求后再引入 localStorage，定义 id 变更与失效内容处理。
- **外部 JSON 覆盖层**：只有出现“不经仓库部署更新”的明确需求才添加，先定义可信来源、版本、合并优先级、失败回退与 CORS。
- **更大内容规模**：按真实过滤时间、DOM 数量及移动端表现决定预计算索引、懒渲染或拆分数据，避免提前引入复杂状态与服务。
