# 如何添加和维护内容

网站内容在 `content/` 中维护，每个条目一个 JSON。页面组件根据 `kind` 自动选择网站卡、书单卡或路线图卡，无需修改组件。

## 内容录入原则

新增或修改条目前，先按以下规则判断收不收、放哪里、怎么标：

1. **只收录可直接免费访问的资源。** 需要付费、订阅或购买才能看到主要内容的不收录。因此不再使用 `免费` 标签；资源的 `access` 字段仍按实际情况填写，用于书单和路线图的访问摘要。
2. **按内容本身归类，不按表面关键词归类。** 加密货币、Solana、Ethereum 都属于 Web3 的子主题；币圈工具放「Web3 → 加密货币」，不要因为和交易有关就放进「交易」。
3. **区分相近但不同的领域。** 价格行为和 ICT/Liquidity 留在「交易」；量化单独使用「量化」主题，不要混入价格行为。交易工具、数据工具优先按所属领域归类。
4. **一种内容只挂一个直接主题。** 通用资料放父主题，专属资料放子主题，不为出现在多个位置复制条目。最多两级主题；新增语言放在「开发」下，与 WebGPU 同级，不再增加第三级。
5. **不要用标签重复显而易见的语言信息。** 中文原生内容不标 `中文`；原文不是中文、提供中文译本的资源标 `中译`，并优先链接到中译页面。`中译` 适用于书籍、文档、教程等翻译资源。
6. **标签只表达可筛选的差异。** 优先使用词表中的规范名称，不使用 `pa` 这类缩写或与规范名重复的标签；新增分类先注册词表，再写入条目。
7. **GitHub 仓库单独标记。** 链接指向 `github.com` 仓库时加 `GitHub 仓库`；GitHub Pages 站点、镜像站不算。
8. **标题和描述帮助读者判断是否要点开。** 标题保留可识别的品牌名，可补充中文用途；描述用一句话说明资源是什么、能做什么、适合谁，避免宣传语和空泛评价。
9. **外部路线图仍按网站收录。** 只有站内能完整描述阶段与资源时才用 `kind: "roadmap"`；外部交互式路线图用 `kind: "site"` 加 `路线图` 标签。
10. **先验证再收录。** 新增前实际打开链接，核对内容、语言和访问条件；无法访问或信息不确定时先不收录，或明确说明。
11. **文件、清单和日期同一次修改。** 条目文件、`content/index.json` 的 `itemFiles` 与 `updatedAt` 一起更新，最后运行 `npm run validate` 和 `npm run build`。

## 1. 文件放在哪里

```text
content/
  index.json                         # 主题、更新时间、条目清单与顺序
  items/
    stocks/finviz-map.json            # 一个网站条目
    web3/bitcoin-reading.json         # 一份书单，包含完整 books
    ethereum/ethereum-roadmap.json    # Ethereum 子主题中的完整路线
    solana/solana-docs.json           # Solana 子主题中的网站
    daily/...
public/
  data/links.json                     # 自动生成，不手工编辑、不提交
  files/                             # 可下载的本地资料
  icons/                             # 可选本地图标
```

条目文件必须遵循 `content/items/<topic>/<id>.json`。目录名等于条目的 `topic`，文件名等于条目的 `id`。两者只能包含小写英文字母、数字和连字符，例如 `web3`、`react-docs`；不能使用空格、下划线或中文。标题、描述和资料文件名可以使用中文。

## 2. 添加一条内容的步骤

1. 在现有主题目录下创建条目 JSON，选择下面对应的模板。
2. 在 `content/index.json` 的 `itemFiles` 中加入文件路径，路径相对于 `content/`，例如 `items/daily/react-docs.json`。
3. 更新清单中的 `updatedAt`，格式为 `YYYY-MM-DD`，例如 `2026-10-27`。
4. 运行 `npm run validate`，修正错误并检查警告。
5. 运行 `npm run dev`，检查新条目、筛选、折叠内容和链接。开发服务会自动生成数据；启动后修改内容或静态资料也会重新校验，内容更新成功后刷新页面。无效内容会显示错误，修复后自动恢复。
6. 发布前运行 `npm run build`，再用 `npm run preview` 检查 `/link-hub/` 下的页面和下载。

创建文件和加入清单必须同时完成。清单引用缺失文件、同一文件重复引用、条目文件未加入清单，都会阻断生成，避免内容被遗漏。

### 网站：`site`

创建 `content/items/daily/react-docs.json`：

```json
{
  "id": "react-docs",
  "topic": "daily",
  "kind": "site",
  "title": "React 官方文档",
  "description": "通过官方教程学习组件、状态与交互的基础用法",
  "url": "https://react.dev/learn",
  "tags": ["资源", "文档", "前端"],
  "featured": false
}
```

`url` 必须是 HTTP(S) 地址。可选 `icon` 使用本地图片路径，例如 `icons/react.svg`，并将文件放到 `public/icons/react.svg`；省略时自动显示首字母色块。支持 png、jpg、jpeg、webp、svg、ico。

### 书单：`reading-list`

创建 `content/items/daily/javascript-reading.json`：

```json
{
  "id": "javascript-reading",
  "topic": "daily",
  "kind": "reading-list",
  "title": "JavaScript 基础阅读",
  "description": "配合练习理解 JavaScript 的语法、函数和程序组织",
  "audience": "适合已经了解 HTML 和 CSS 的读者",
  "tags": ["资源", "书籍", "前端"],
  "books": [
    {
      "title": "Eloquent JavaScript",
      "author": "Marijn Haverbeke",
      "note": "推荐先读基础章节，再完成对应练习",
      "url": "https://eloquentjavascript.net/",
      "access": "free"
    }
  ]
}
```

`books` 至少包含一本。整份书单放在一个文件里，书目按照数组顺序展示。数量、首本推荐和访问/PDF 摘要由页面计算，不另外填写统计字段。

### 路线图：`roadmap`

创建 `content/items/daily/react-roadmap.json`：

```json
{
  "id": "react-roadmap",
  "topic": "daily",
  "kind": "roadmap",
  "title": "React 入门路线",
  "description": "从组件基础到状态管理，完成一个可交互的小项目",
  "audience": "建议具备 JavaScript 基础",
  "estimatedEffort": "约 8–12 小时，按个人进度调整",
  "tags": ["资源", "路线图", "入门", "前端"],
  "steps": [
    {
      "title": "组件与页面结构",
      "description": "学习 JSX、组件拆分和 props",
      "resources": [
        {
          "title": "描述用户界面",
          "url": "https://react.dev/learn/describing-the-ui",
          "access": "free"
        }
      ]
    },
    {
      "title": "完成交互练习",
      "description": "使用状态和事件实现一个练习项目",
      "resources": []
    }
  ]
}
```

`steps` 至少包含一个阶段，按数组顺序展示。阶段描述可选，资源列表可以为空；`estimatedEffort` 可选，阶段数和前两个阶段预览自动计算。

## 3. 如何加入清单和新增主题

`content/index.json` 包含四个主要字段：

| 字段 | 用途 |
|---|---|
| `version` | 固定为 `1`，不要因普通内容更新修改 |
| `updatedAt` | 内容最后更新日期，显示在页脚 |
| `topics` | 主题定义，包括 `id`、`name`、可选 `description`、`parentId` 和 `order` |
| `itemFiles` | 按顺序列出的条目文件路径，允许为空 |

例如，在现有 `itemFiles` 数组中追加：

```json
"items/daily/react-docs.json"
```

上面只是一个数组元素，需要加入现有数组，并正确处理逗号；不要替换掉原有清单。JSON 不支持注释或末尾多余逗号。

新增主题时，先在 `topics` 中加入：

```json
{
  "id": "design",
  "name": "设计",
  "description": "信息架构、排版与交互参考",
  "order": 4
}
```

再创建 `content/items/design/`，将新条目的 `topic` 写为 `design`，并加入清单。主题 id 不能重复，必须至少保留一个主题；没有匹配条目的主题在页面中隐藏。

### 添加子主题

网站支持两级主题。在 `topics` 中加入以下对象，即可让 Solana 归属 Web3（示例中已存在，不要重复添加）：

```json
{
  "id": "solana",
  "name": "Solana",
  "parentId": "web3",
  "description": "账户模型、链上工具与程序开发",
  "order": 1
}
```

`parentId` 必须引用已定义的一级主题。省略它就是一级主题；主题 id 在所有层级中全局唯一。父主题不能引用自身，父子关系不能循环，也不能添加第三级。

子主题条目仍放在 `content/items/solana/<id>.json`，条目的 `topic` 写为 `solana`。不要在路径中写 `web3/solana/`；父子关系由清单中的 parentId 表达。Web3 通用条目继续使用 `topic: "web3"`，每条内容只归属一个直接主题，不要为父级再复制一份。

移动条目到子主题时，同步修改 topic、目录和 itemFiles 路径，保留原条目 id。改变某主题的父级时，只需更新 parentId，条目目录和 topic 保持不变。已有平级主题不需要迁移。

页面先显示父主题通用内容，再显示子主题；每个分区内部保持网站、书单、路线三种卡片布局。父级数量包含子级，子级只统计直接内容；筛选后隐藏空分支，但有子级结果时保留父级。子主题默认展开，有至少三个可见导航目标时提供主题内锚点。子主题可以没有条目，发布时仍有效，页面会隐藏空分区。

展示顺序规则：同级主题按 `order` 升序，相同 `order` 保持 `topics` 数组顺序；父主题通用区及各子主题内依次展示网站、书单、路线图，同形态推荐条目优先，其余保持 `itemFiles` 顺序。文件名和目录遍历顺序不参与排序。

## 4. 字段与本地资源

每个条目必填 `id`、`topic`、`kind`、`title`、`description`。标题和描述不能空白。`tags` 可省略，默认空数组；`featured` 可省略，默认 `false`；`audience` 可选。未知字段会报错，修改标题时保留稳定的 id。

书目与阶段资源共用以下字段：

| 字段 | 规则 |
|---|---|
| `title` | 必填，非空 |
| `url` / `file` | 至少提供一个，可以同时提供；外链必须为 HTTP(S) |
| `author` / `note` | 可选，非空 |
| `format` | 可选，仅支持 `pdf` 或 `epub`，必须与对应本地扩展名一致 |
| `access` | `free`、`paid`、`unknown`，省略默认 `unknown` |

使用本地 PDF 的资源示例：

```json
{
  "title": "自己的学习笔记",
  "file": "files/学习笔记.pdf",
  "format": "pdf",
  "access": "free"
}
```

需要同时放入实际文件 `public/files/学习笔记.pdf`。文本等其他格式也可使用 `file`，省略 `format`。路径相对于 `public/`，写 `files/...` 或 `icons/...`，不加 `public/`、前导 `/` 或 `/link-hub/`；前端会统一添加 BASE_URL。

本地路径不能含 `..`、反斜线、query/hash 或符号链接，引用目标必须是实际文件。资料更新建议使用新文件名，并清理不再引用的旧文件。单个资料超过 15 MiB 警告，超过 50 MiB 阻断，全部资料超过 200 MiB 警告。

标签优先使用 `src/lib/tagVocabulary.ts` 中的规范名称，例如 `入门`、`进阶`、`中译`、`PDF`、`资源`、`工具`。中文原生内容不标 `中文`；原文不是中文、使用中译本的资源标 `中译`，并优先链接中译页面。未知标签只警告；确有新分类需求时补充词表。每个直接所属主题建议最多两个推荐条目，父级通用区与各子级分别统计。标记 `PDF` 时应有对应的 PDF 资源。

### 分类、属性与顶部入口

`kind` 只决定卡片形态。请按内容用途添加 `文档`、`教程`、`书籍`、`工具` 或 `路线图`，例如网站教程可使用 `kind: "site"` 和 `tags: ["教程", "入门"]`。阅读清单也可能包含文档，不能仅凭 reading-list 判断为书籍。

顶部只展示 `TAG_DEFINITIONS` 配置了 primary 的分类。普通新标签默认进入“更多筛选”的关键词组，仍可搜索；PDF/EPUB 在格式组，付费在访问条件组，`中译` 在语言组，不占顶部。需要新增常用分类时，同时注册词表并配置 `{ group: 'content', primary: 5 }` 等唯一顺序；普通标签无需新增组件。

书目和阶段资源填写 `format`、`access` 后，前端自动派生格式和访问条件，不必重复写在条目 tags。未填写 format 的本地 PDF/EPUB 也可按扩展名判断；access 未知不能推断免费。`免费` 不再作为标签使用，全部收录资源默认可免费访问；“全部免费”等摘要仍按资源的 `access` 计算。组合“付费 PDF”必须存在同一份满足条件的资料。

点击“只看此主题”进入范围，父级包含子级；范围内筛选只影响该范围，切换或退出范围保留已选条件。修改主题 id 可能使旧分享范围失效，优先保留稳定 id。

### 注册新标签

在项目根目录运行，命令会自动补充规范词表：

```sh
npm run add-tag -- Solana
npm run add-tag -- pa "price action" 教程
```

支持单个或批量添加，含空格的标签必须用引号包起来。注册后，在条目 JSON 的 `tags` 数组中加入对应名称，再运行 `npm run validate`。仅注册但没有内容使用的标签不会出现在筛选面板；普通新标签不会自动出现在顶部。

重复标签会跳过，`pdf`、`新手` 等已知别名会提示使用 `PDF`、`入门`。标签不能空白、不能包含英文逗号、长度最多 24 个字符；一批参数中任何一个无效，整批不写入。

查看命令帮助：

```sh
npm run add-tag -- --help
```

详细规则见 [注册标签](add-tag.md)。词表修改需要与条目一起提交，并正常构建、部署。

## 5. 生成、发布和删除

| 命令 | 行为 |
|---|---|
| `npm run validate` | 检查维护源与本地资源，打印错误/警告，不写生成文件 |
| `npm run add-tag -- <标签>` | 注册规范标签，支持多个参数；含空格的标签使用引号 |
| `npm run generate:data` | 完整校验后生成 `public/data/links.json` |
| `npm run dev` | 启动时生成，并监听内容和静态资料变化 |
| `npm run build` | 通过 prebuild 自动校验、生成，再构建 |
| `npm run preview` | 预览上次构建产物；修改内容后需先重新 build |

提交 `content/` 和需要的静态资料；生成文件已加入 `.gitignore`，不提交它。内容更新仍需构建和重新部署才会在生产网站生效。

删除条目时，删除对应文件、移除 `itemFiles` 中的路径，并更新日期。删除子主题前，先删除或迁移其直接条目；删除父主题前，还需迁移或删除它的子主题。迁移时同步修改 `topic`、所在目录和清单路径。重命名条目 id 时同步修改文件名与清单，并确认新的 id 全局唯一。

生成失败会保留磁盘上最后一次有效产物，但构建会失败，开发服务的数据请求会返回错误，不会继续展示旧数据。修复源文件后重新执行命令，或让开发服务自动恢复。

错误会指向源文件和字段，例如：

```text
content/items/web3/bitcoin-reading.json:books[0].file (bitcoin-reading)：无法引用 files/...
```

遇到“文件路径与 topic/id 不一致”时同步三者；遇到“主题不存在”时检查 `topics`；遇到“未加入清单”时补充 `itemFiles` 或删除不需要的文件；遇到重复 id 时为条目选择稳定且唯一的标识。
