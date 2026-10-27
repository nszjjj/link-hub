# Link Hub

访问链接：[GitHub Pages - Link Hub](https://nszjjj.github.io/link-hub/)

一个支持两级主题的静态资源导航站，用网站卡片、可展开书单和分阶段路线整理学习与工具入口。内容覆盖美股、A股、Web3（Solana、Ethereum、加密货币）、开发（WebGPU、Rust）、交易、量化、Agent、宏观、工具和生活；页面提供主题范围、实时搜索、分类与属性筛选，以及 URL 状态恢复。

## 仓库内容

| 路径 | 内容 |
|---|---|
| `content/` | 维护源：主题清单与每个条目一个 JSON |
| `src/` | React 页面、主题/筛选组件、数据加载与筛选逻辑 |
| `scripts/` | 内容校验、发布数据生成、开发服务插件与标签注册 |
| `public/` | 本地资料、图标和构建生成的发布数据 |
| `docs/` | 产品与实现设计、内容维护、标签注册文档 |
| `.github/workflows/` | GitHub Pages 测试、构建与部署流水线 |

## 文档

- [产品与实现设计](docs/design.md)：架构、数据模型、页面与交互、筛选契约、校验，以及本地开发和 Pages 部署。
- [添加与维护内容](docs/adding-content.md)：内容录入原则、三种条目模板、主题与清单维护、常见错误。
- [注册标签](docs/add-tag.md)：受控词表、语义分组与 `add-tag` 命令。
