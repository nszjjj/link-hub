# Link Hub

访问链接：[Github Pages - Link Hub](https://nszjjj.github.io/link-hub/)

支持两级主题的静态导航站，支持网站、就地展开的书单与学习路线。页面使用 React、Tailwind 与 shadcn/ui，提供主题范围、实时搜索、分类与分组属性筛选和 URL 恢复，兼容旧任一/全部匹配链接。

## 本地运行

推荐 Node.js 24（见 `.nvmrc`）；也兼容 Node.js 22.12 以上的 22.x，以及 26 以上版本。

```sh
npm ci
npm run validate
npm test
npm run dev
```

打开终端打印的 `http://localhost:5173/link-hub/`。页面按主题展示内容，搜索和标签直接更新结果；书单与路线默认折叠，点击对应按钮可就地展开。加载失败时可重试，无结果时可清空筛选。

```sh
npm run build
npm run preview
```

`dev` 启动时自动生成数据，并监听内容更新；`build` 通过 `prebuild` 自动校验和生成。Vite `base` 为 `/link-hub/`，所有本站 JSON 与文件地址通过 `src/lib/paths.ts` 的 `assetUrl()` 生成；外链保持原地址。

## GitHub Pages 部署

首次部署前，在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。

提交并推送到 `main` 后，[Pages workflow](.github/workflows/pages.yml) 自动执行 `npm ci`、`npm test` 和 `npm run build`。构建通过 `prebuild` 校验内容并生成 JSON，成功后上传 `dist/` 并发布；测试或构建失败时不会部署。

部署成功后访问：<https://nszjjj.github.io/link-hub/>。可在仓库 **Actions → Validate and deploy Pages** 查看结果，或通过 **Run workflow** 选择 `main` 手动重新发布。推送到开发分支 `content`，或创建目标为 `main` 的 PR，也运行测试和构建；仅 `main` 部署。

CI 从 `.nvmrc` 读取 Node.js 版本，并使用 `package-lock.json` 安装依赖。提交源内容、静态文件及 lockfile 即可，`public/data/links.json` 和 `dist/` 由构建生成。仓库改名或改用自定义域名时，需同步调整 `vite.config.ts` 的 `base` 并重新构建。

## 核心模块

- `src/lib/schema.ts`：Zod 4 判别联合、默认值、唯一 id、主题引用、资源目标和路径校验。
- `src/lib/loadLinks.ts`：读取 JSON，检查 HTTP 状态并执行运行时 Schema 校验；支持 AbortSignal。
- `src/hooks/useLinks.ts`：`loading / error / ready` 状态及 `retry()`，处理 15 秒超时、卸载和过期结果。
- `src/hooks/useLinkFilters.ts`：维护主题范围、关键词、已选标签及分组/旧匹配方式，同步 URL，并派生结果、主题分组、全量标签和计数。
- `src/lib/filterParams.ts`：通过 `URLSearchParams` 解析和序列化 `topic / q / tags / match`，保留无关参数。
- `src/lib/filters.ts`：关键词与标签过滤、直接主题分桶、推荐排序、全量标签聚合。新页面使用 grouped，旧 any/all 匹配保留。
- `src/lib/topics.ts`：两级分组、直接/父级汇总计数、空分支隐藏与当前位置路径。
- `src/hooks/useTopicNavigation.ts`：主题锚点导航、异步加载后定位、焦点与历史恢复。
- `src/hooks/useStickyOffset.ts`：测量固定区域高度，供主题滚动与当前位置判断共用；移动展开搜索或字体变化后自动更新。
- `scripts/validate.ts`：构建校验与非阻断维护警告；单文件超过 15 MiB 警告、超过 50 MiB 失败，总资料超过 200 MiB 警告。
- `scripts/add-tag.ts`：通过命令注册规范标签，复用 Schema 校验，支持批量添加、去重与别名提示。
- `scripts/content.ts`：读取内容清单与独立条目，合并并用共享 Schema 校验，错误定位到源文件。
- `scripts/generate-data.ts`：完整校验后原子生成发布 JSON；内容未变化时不重复写入。
- `scripts/contentPlugin.ts`：开发服务自动生成、监听更新与错误恢复。

## 筛选状态接口

页面无条件调用两个 hook，再根据加载状态渲染；数据未就绪时仍可恢复 URL 中的筛选条件。

```ts
const links = useLinks()
const filters = useLinkFilters(links.status === 'ready' ? links.data : undefined)
```

`filters` 提供 `keyword / selectedTags / tagMatch / topicId`，以及 `setKeyword`、`toggleTag`、`removeTag`、`clearContentTags`、`clearTags`、`setTagMatch`、`setTopic` 和 `clearFilters`。

- `setTopic('web3')` 包含 Web3 与子主题；`setTopic(undefined)` 只退出范围，保留其他条件。滚动和主题锚点不改变范围。
- “全部”使用 `clearContentTags()`，保留属性；“清空筛选”恢复关键词、标签和 grouped 模式，保留范围。
- `filteredItems / groups` 是筛选结果；`allTags / topicTotals` 来自全量内容，`availableTags / primaryTags / tagGroups` 来自筛选前的当前范围。
- `scopeTopic / scopeLabel / scopeOptions / unknownTopic` 供范围展示与切换；未知范围不放宽结果，加载完成后提示失效。
- `matchedCount / totalCount / visibleTopicCount / visibleSubtopicCount` 统一按条目计数；父级分母包含子级，不重复展示内容。

新 URL 示例：`?topic=web3&tags=书籍,PDF&match=grouped`。同组 OR、跨组 AND；免费 PDF 要求同一资料满足。旧 tags 链接缺省 any 或显式 all 保持原含义；无标签与 match 的新访问默认 grouped。搜索立即过滤、200ms 防抖写 URL，范围和标签立即同步；replaceState 保留路径、hash、历史 state 与无关参数，popstate 取消过期写入。

## 内容维护

内容按条目拆分：编辑 `content/items/<topic>/<id>.json`，在 `content/index.json` 的 `itemFiles` 中加入路径，并更新 `updatedAt`。Web3 示例包含 Solana、Ethereum 子主题，以及父级通用阅读资料；另有一份可下载的原创文本文件。

`public/data/links.json` 是自动生成的发布产物，不手工编辑、不提交。运行 `npm run validate` 检查源文件，`npm run generate:data` 可单独生成；开发和构建都会自动生成。条目顺序由清单决定，不依赖文件名排序。主题通过可选 parentId 表达两级关系；子主题目录仍使用自己的 id，不嵌套父主题路径。

完整步骤、三种条目模板和常见错误见 [添加与维护内容](docs/adding-content.md)。

`public/` 中使用实际文件，不放置符号链接；校验会检查未被 JSON 引用的文件，防止目录外文件绕过校验后被 Vite 发布。

受控标签、优先顺序与别名建议只维护在 [tagVocabulary.ts](src/lib/tagVocabulary.ts)。未知标签不阻断构建；新增合理标签时补充词表。书单与路线的 `免费`、`PDF` 标签须与实际资源信息一致。

在项目根目录注册新标签：

```sh
npm run add-tag -- Solana
npm run add-tag -- pa "price action" 教程
```

第一条添加单个标签，第二条批量添加；含空格的标签用引号包起来。命令自动更新规范词表，重复标签会跳过，已知别名会提示规范名称。注册后将标签写入条目的 `tags`，页面会在相应分组展示，普通新标签不会自动进入顶部。完整规则及帮助命令见 [注册标签](docs/add-tag.md)。

## 页面组件

```text
src/components/
├── SiteHeader.tsx          # sticky 头部、搜索与常用标签
├── TagFilter.tsx           # 全站分类与属性筛选
├── TopicFilter.tsx         # 主题标题下的轻量筛选
├── TopicScope.tsx          # 浏览范围、切换与退出
├── FilterChips.tsx         # 共用分类、分组属性与已选条件
├── TopicSection.tsx        # 一级主题汇总、通用区与子主题组合
├── SubtopicSection.tsx     # 子主题层级与内容
├── TopicItemGrid.tsx       # 三种卡片的共享网格
├── TopicCount.tsx          # 一致的匹配/总数展示
├── ItemCard.tsx            # 按 kind 分发
├── cards/
│   ├── SiteCard.tsx        # 整卡外链、本地图标及首字母回退
│   ├── ReadingListCard.tsx # 决策摘要、书目与访问/下载动作
│   └── RoadmapCard.tsx     # 阶段预览与竖向时间线
└── ui/                    # shadcn/ui 基础组件
src/App.tsx                # 加载三态、筛选结果、展开状态及页脚
```

网站卡在移动端单列、768px 起两列、1200px 起三列；书单在桌面两列，路线始终占整行。移动端通过搜索图标展开输入框，全站分类持续可达，属性面板就地展开；点击“只看此主题”后在主题标题下筛选，并可切换或退出范围。子主题默认展示，主题内锚点保留筛选 URL 并恢复键盘焦点，当前位置显示父/子路径。卡片展开状态仅保存在内存中，筛选隐藏再恢复时保留，刷新后回到折叠态。

主题变量位于 `src/index.css`，使用中性灰、低饱和蓝灰强调色与本地 Geist 字体。shadcn/ui 配置位于 `components.json`；新增基础组件可使用 `npx shadcn@latest add <组件名>`。

完整产品设计见 [docs/design.md](docs/design.md)。
