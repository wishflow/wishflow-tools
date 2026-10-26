# AI 辅助地图开发与地图制品生成工具调研

> 调研快照：2026-10-26。项目版本、产品功能、价格和 Beta 状态会变化，动态信息以链接到的当前官方页面为准。
>
> 范围：调研 GitHub 项目、Agent Skills、CLI、MCP、QGIS 插件、地图/GIS 产品和研究原型。三位子 Agent 分别调研地图产品和制图平台、开发期工具链、完整项目和可复用的地图产物工作流；总报告按项目仓库、官方文档和插件目录校准关键描述。未逐项安装、运行或做性能测试。

## 一、结论：把 AI 放在开发和制图过程里，交付物可以是普通地图

这次调研的重点是：**开发者或制图者使用 Agent/AI 来理解需求、编写地图应用、组织 GIS 操作、生成内容和检查结果；最终用户拿到的地图产品不必带 Agent，也不一定是可搜索的交互地图。**

最后交付可以是：

| 地图制品 | 常见形式 | 适合的用途 |
|---|---|---|
| 静态地图 | PNG、SVG、PDF、印刷版面、专题图集 | 报告、论文、会议、展板、打印地图 |
| 可编辑 GIS 工程 | QGIS 项目与图层、打印布局、地图册 | 后续继续分析、改图例和符号、批量出图 |
| 普通网页地图 | HTML、Leaflet/MapLibre/ArcGIS 应用、静态托管页面 | 展示位置、分层浏览、业务专题地图 |
| 故事地图 | 图文叙事、滚动章节、地图游览、PDF 手册 | 新闻、教育、旅行、城市与环境叙事 |
| 仪表板与地图产品 | 在线地图、数据图表、筛选器、地图工具 | 运营分析、选址、监测、协作 |
| 时间与动画地图 | 时间轴、动态路径、场景动画、视频片段 | 迁移、交通、灾害演变、历史变化 |
| 三维地图与地理场景 | 地球、地形、建筑、点云、3D Tiles | 城市数字孪生、地形观察、三维规划 |
| 遥感与 GIS 分析成果 | 分类栅格、指数图、矢量结果、空间统计表 | 环境监测、土地覆盖、选址和科学分析 |
| 艺术地图 | 插画、风格化路线图、虚构地理视觉 | 旅行纪念、内容配图、创意表达；未必适合测量或导航 |

可把一条常见工作流理解为：

需求与空间数据 → AI 辅助建模/写代码/执行制图流程 → QGIS、GIS 库或地图 SDK 负责确定性运算和渲染 → 人工检查数据与视觉结果 → 导出项目、网页、图片、报告或动画

**Skill** 提供开发规则与领域知识；**MCP/CLI** 让开发 Agent 操作已有 GIS、运行工具或预览地图；**QGIS、GeoPandas、MapLibre、CesiumJS 等** 才负责实际的空间计算、渲染或应用运行。除非产品需求明确要求运行时自然语言交互，否则这些开发工具无需随最终地图一起部署。

## 二、按目标选工具

| 目标 | 优先候选 | 典型产物 | 判断 |
|---|---|---|---|
| 从已有空间文件快速得到网页地图和报告图 | [Interactive Map Builder](https://github.com/xlbaoxl/interactive-map-builder) | 单文件 HTML、16:9 演示图、PNG/SVG/PDF、构建报告 | 与“AI 做开发/制图，交付普通文件”最匹配；新项目，先用样例数据验证 |
| 要交付可继续编辑的 GIS 工程和印刷版式 | [QGIS + TerraLab AI Agent](https://plugins.qgis.org/plugins/AI_Agent/) 或 [QGIS Map Workflow Skill](https://github.com/maydengximin-sketch/qgis-map-workflow) | QGIS 工程、图层、打印布局、地图册、PNG/PDF | 适合桌面 GIS；插件和 Skill 需检查模型数据流、权限和版本 |
| 已有 Web 项目，要 AI 正确写地图应用代码 | [MapLibre Agent Skills](https://github.com/maplibre/maplibre-agent-skills) + 可选 [MapLibre MCP](https://github.com/birkskyum/maplibre-mcp) | 普通 MapLibre/React/Vue/TS 代码、样式、预览图 | 开源栈；Skills 是知识文件，MCP 是开发期校验和预览 |
| 选定商业地图 SDK | [Mapbox Agent Skills](https://github.com/mapbox/mapbox-agent-skills)、[Google Maps Agent Skills](https://github.com/googlemaps/agent-skills)、[Esri AI 开发指南](https://developers.arcgis.com/javascript/latest/ai-assisted-development/) | 常规 Web、移动端或空间分析应用代码 | 按现有平台选择；留意 API Key、使用费和官方支持边界 |
| 做三维地球或 3D Tiles 应用 | [CesiumJS Agent Skills](https://github.com/CesiumGS/cesiumjs-skills) | 常规 CesiumJS 应用、三维场景和数据图层 | 官方领域 Skill；运行时 Agent 可选 |
| 用现成 AI 产品快速做地图、图表或空间分析 | [Mappt](https://mappt.ai/)、[Felt AI](https://felt.com/platform/felt-ai)、[Mundi](https://docs.mundi.ai/)、[Scribble Maps](https://www.scribblemaps.com/) | 可分享的地图、地图仪表板、数据层和部分导出文件 | 节省搭建成本；SaaS 能力、额度、数据处理方式和可移植性各异 |
| 做地图故事或图文内容 | [ArcGIS StoryMaps Assistant](https://doc.esri.com/en/arcgis-storymaps/latest/learn/arcgis-storymaps-assistant.html)、[GeoLibre Story Maps](https://geolibre.app/user-guide/storymaps/) | 发布故事地图、章节地图、PDF 手册或 HTML | 前者在成熟产品内辅助内容创作；后者适合项目文件和自托管工作流 |
| 做遥感或时间序列空间分析 | [Earth Engine Code Editor Assistant](https://developers.google.com/earth-engine/guides/code_editor_assistant) | Earth Engine 脚本、地图图层、图表、影像导出或 Apps | AI 协助写脚本，计算仍由 Earth Engine 执行 |
| 做地图动画或场景故事 | [MapStory](https://adigunturu.github.io/MapStory-UIST25/) | 可编辑地图动画序列 | UIST 2025 研究原型，适合参考，不应当作成熟生产软件 |
| 做创意/插画式地图 | [MapToki](https://maptoki.com/en/about) | 风格化路线图、PNG/PDF 等视觉制品 | 适合创意表达；官方注明坐标为虚构，不能用于导航或地理分析 |

## 三、可直接使用 AI 辅助制图的产品

这些产品本身可能带有自然语言助手，但它们生成的地图仍可作为普通地图、图片、网页或可编辑项目交付；用户不一定需要在最终产品里保留对话 Agent。

### 3.1 Interactive Map Builder：数据到 HTML 和报告图

[Interactive Map Builder](https://github.com/xlbaoxl/interactive-map-builder) 是 Agent Skill 加 Python 确定性构建器。它接收 GeoJSON、GeoPackage、Shapefile、CSV、Excel 或 ArcGIS 数据，先检查输入和字段，再生成可检查的 MapSpec，最后通过引擎构建并验证地图。项目 README 当前列出 v0.7.0，并描述了离线诊断、构建报告、文件清单和验证步骤。

- **交付**：包含数据的 Leaflet HTML；可选 16:9 PNG；出版用途 PNG、SVG、PDF；MapSpec、输入检查、构建报告和文件 manifest。
- **适合**：把已有数据转成搜索/筛选地图、分层地图、演示用地图或出版插图；由 AI 产出需求与规格，由确定性程序完成地图。
- **优势**：同一个 visual plan 驱动 HTML 与静态图，产物和构建检查可一起交付。交付网页不用携带聊天模型。
- **限制**：项目较新，地图类型集中在现有数据驱动的地图展示，不是通用 Web GIS，也不负责复杂缓冲、路径规划、空间统计或 3D 地形；在线底图仍需网络。HTML 嵌入的要素包括隐藏和筛选掉的数据，分享前要检查敏感字段和数据公开范围。

### 3.2 QGIS AI 插件：把自然语言转成工程和布局操作

[AI Agent by TerraLab](https://plugins.qgis.org/plugins/AI_Agent/) 是 QGIS 插件目录中一个较完整的 AI 制图插件。目录页面当前列出 1.9.0，兼容 QGIS 3.28–4.x。厂商说明列有 227 个工具，覆盖数据查找、图层检查、Processing、样式、标签、几何编辑和打印布局；操作步骤可逐项查看、批准，并支持撤销。

- **交付**：本机 QGIS 项目内的普通图层、符号、标签、布局和导出文件。
- **适合**：已有 QGIS 工程，想用自然语言加快地图准备和处理流程。
- **限制**：该插件和服务仍较新，结果要按 GIS 方法核验。插件页说明用户请求和打开项目描述会发给欧盟的服务，图层与文件留在本机；这属于厂商说明，敏感项目应复核其隐私条款和组织政策。

另一个社区插件 [QGIS AI Agent（mzarov）](https://plugins.qgis.org/plugins/ai_agent/) 当前版本为 0.4.1，QGIS 要求 4.x。它读取项目、样式图层、运行 Processing、载入开放数据、建立打印布局；变更可先放在计划里，用户按 Apply 后再执行。插件页说明图层属性值、范围和地图渲染图等上下文会发往配置的模型，也可使用本地模型服务器。它更适合愿意检查项目上下文发送范围、并且能运行 QGIS 4 的用户。

### 3.3 在线 AI 地图产品

| 产品 | AI 在哪一步帮忙 | 地图/其他产物 | 适合与边界 |
|---|---|---|---|
| [Mappt](https://mappt.ai/how-it-works) | 上传文件、提供公开数据 URL 或描述目标后，识别地理字段、选择地图类型并设置样式 | 可分享的交互地图、多图层地图、图表/仪表板；官网列出 PNG、CSV、KML、Shapefile 导出 | 适合快速从表格和公开数据做地图；地图类型包括点、分级设色、热力和 3D 柱。它是较新的 SaaS，分析深度、导出和分享限制按当前产品套餐核实 |
| [Felt AI](https://felt.com/platform/felt-ai) | 自然语言找数据、执行 buffer/join/SQL/旅行时间区等空间工作，生成地图样式、标签、弹窗、dashboard charts 或扩展 | 可分享、继续编辑的地图和仪表板，也可由 SDK/API 扩展地图应用 | 适合团队 Web GIS 和数据仓库工作流；厂商说明 SQL 查询步骤可审阅。商业平台，计划等级会影响连接、AI 使用和功能 |
| [Mundi](https://docs.mundi.ai/) | 在开源 Web GIS 内用 LLM 调用地理处理算法、查询 PostGIS、编辑符号系统 | 可保存/分享的 Web GIS 地图；API 可创建地图、上传数据和渲染 | 支持矢量、栅格和点云；AGPLv3，可自托管并接本地 LLM。适合希望掌控部署的团队，但自托管需要维护运行环境 |
| [Scribble Maps AI](https://help.scribblemaps.com/help/a/what-can-scribble-do-ai-capabilities-overview) | 对话帮助使用编辑工具、定位、绘制标记/形状/路线、改样式、过滤数据、创建缓冲区/服务区、添加数据 | 继续在 Scribble Maps 编辑和分享的地图；该产品提供多种地图数据导出 | 偏轻量地图编辑、区域划定和位置分析；它是完整 SaaS 编辑器，不等于可直接嵌入自己代码库的 GIS SDK |

这类 SaaS 最好用自己的代表性数据做一轮试用，重点看：地理字段是否识别正确、分级方法是否可解释、样式和图例能否复用、输出是否可离线或自托管、数据是否会上传，以及更换平台时地图和数据能否迁出。

### 3.4 故事、遥感与艺术地图

- **ArcGIS StoryMaps Assistant**：辅助将图片转换为交互图表/表格，生成替代文本，分析故事的摘要、关键词、语言、地点、语气和可读性，并按关键词、描述或图片生成主题。输出仍是正常的 StoryMaps 故事、briefing 或 collection；AI 功能目前可能为 Preview/Beta，需要 ArcGIS Online 组织账户与管理员授权，部分能力只支持英文。官方提醒 AI 建议可能不准确。[功能和限制](https://doc.esri.com/en/arcgis-storymaps/latest/learn/arcgis-storymaps-assistant.html)
- **Google Earth Engine Code Editor Assistant**：Gemini 辅助写、解释、调试和优化 GEE 脚本，可协助生成影像合成、NDVI、分类、图表和 Earth Engine App。实际空间计算由 GEE 执行，结果可以是图层、图表、导出影像或普通 GEE 应用；需提供 Gemini API key。每次请求会带上完整当前脚本、导入资产/几何及会话记录，需先评估上下文数据。[官方说明](https://developers.google.com/earth-engine/guides/code_editor_assistant)
- **MapToki**：把文字或行程图转成风格化路线/旅行地图，适合海报、纪念品或内容配图。它属于创意制图，不应把视觉上像地图的输出当成真实测量、导航或 GIS 分析结果。[项目说明](https://maptoki.com/en/about)

## 四、开发 Agent Skills、CLI 与 MCP

这组适合让 AI 编写或审查地图产品代码。Skill 通常是 Markdown 说明，不直接负责地图渲染；MCP/CLI 可接文档、地图样式或测试预览。

### 4.1 地图 Web 与移动端 SDK

| 工具 | 开发期用途 | 安装/入口 | 适用边界 |
|---|---|---|---|
| [MapLibre Agent Skills](https://github.com/maplibre/maplibre-agent-skills) | 给代码 Agent 提供 MapLibre GL JS 制图、字体/glyph、数据源、PMTiles、地形、图标和版本迁移知识 | npx skills add maplibre/maplibre-agent-skills | 社区维护，生成的是普通 MapLibre 应用代码；自身不提供底图数据或 GIS 算法 |
| [MapLibre MCP](https://github.com/birkskyum/maplibre-mcp) | 检查 MapLibre Style Spec、source/layer schema、渲染 PNG、查看图标缺失，并比较修改前后样式 | 可通过 npx 启动；支持 MCP 客户端时加入 Agent 的地图预览/校验环节 | 社区项目，适合“写代码→渲染检查→改代码”；不负责需求到产品的完整生成 |
| [Mapbox Agent Skills](https://github.com/mapbox/mapbox-agent-skills) | Mapbox 官方 20 个 Markdown Skill，涵盖制图、token 安全、空间操作、样式质量、Web/移动 SDK | npx skills add mapbox/mapbox-agent-skills 或 Mapbox CLI 的 agent-skills install | 技能仓库公开且安装不需要 Mapbox token；应用使用 Mapbox 服务时仍需账号、API Key 并遵循其定价 |
| [Google Maps Platform Agent Skills](https://github.com/googlemaps/agent-skills) | Maps/Places/Geocoding/Routes/3D/静态地图、聚合、样式、绘图等 Web、Android、iOS 和服务端开发指导 | npx skills add googlemaps/agent-skills | 该仓库明确声明不是 Google 官方支持产品。可结合 [Google Maps Code Assist MCP](https://developers.google.com/maps/ai/code-assist) 获取官方文档 grounding；该 MCP 仍是 experimental/pre-GA |
| [CesiumJS Agent Skills](https://github.com/CesiumGS/cesiumjs-skills) | 14 类 CesiumJS 开发指导，覆盖 Viewer、相机、Entity、3D Tiles、地形、影像、空间计算、时间和 Shader | GitHub Skills 仓库/Agent Skills 客户端 | CesiumGS 领域技能；生成的是普通三维地球/场景应用，外部 Agent 不需要进入最终应用 |
| [Esri AI-assisted development](https://developers.arcgis.com/javascript/latest/ai-assisted-development/) | Esri 官方按新建应用、扩展、SDK 升级和架构迁移组织 AI 开发流程，提供项目指令模板和验证清单 | 可给 Codex/Claude/Copilot 加项目级 instructions | 更像官方开发手册而非独立 Skill 包或开发 MCP；适用于 ArcGIS Maps SDK for JavaScript |

### 4.2 CARTO 开发工具链

[CARTO Agent Skills](https://github.com/CartoDB/agent-skills) 含应用开发、Builder 地图和空间分析等技能；例如 carto-develop-app 指导开发者用 TypeScript/JavaScript、deck.gl 和 CARTO 服务构建应用。[CARTO for Agents](https://carto.com/carto-for-agents/) 还组合 CLI 与 MCP，可协助在 CARTO 上构建地图、workflow 和应用。

- **可得到的结果**：发布到 CARTO Builder 的普通地图、空间分析流程和应用；最终地图是否包含聊天 UI 由项目选择决定。
- **适合**：数据已在 CARTO 支持的数据仓库/平台中，团队需要受权限治理的空间分析和可分享结果。
- **限制**：商业平台、账号和仓库接入是前提；不等于可离线安装的通用制图工具。

## 五、可参考的完整项目与输出流水线

### 5.1 输出地图文件、图片和网页

**Interactive Map Builder** 是目前调研中与“AI 帮助完成制图，但用户收到普通产物”最直接对应的开源实现。它的重点不是让最终读者和 Agent 对话，而是把需求压缩成可审核的 MapSpec，再用稳定构建器完成导出。适合作为输出目录结构、输入检查、构建报告和地图验收机制的参考。[仓库](https://github.com/xlbaoxl/interactive-map-builder)

**QGIS Map Workflow** 是一份使用 QGIS MCP 驱动 QGIS 的社区 Skill。README 描述的工作流是检查坐标和数据、选择地图类型、应用制图规范、渲染截图自检，并交付可编辑 .qgz 工程、打印 layout 或 atlas。它支持专题图、比例符号、热力/hexbin、插值、地形、缓冲、流线和时间图等地图工作流；当前仓库体量很小（调研时 2 commits、3 stars），宜作为可参考的细致工作流草案，先在测试数据上验证，不能把 Skill 文档当成工具兼容性保证。[仓库](https://github.com/maydengximin-sketch/qgis-map-workflow)

**GeoLibre** 是开源 GIS 应用而非单纯 AI 插件，支持浏览器、桌面、移动端和 Notebook。项目文档列出 AI Assistant、打印布局、Story Map、处理工具和多渲染器。Story Map 可以导出 HTML 和 PDF handout；也能把项目 JSON/外部 Skill 作为 Agent 开发入口。它适合需要从项目文件继续编辑、同时生成网页或故事手册的地图工作台参考。[GitHub](https://github.com/opengeos/GeoLibre) · [Story Maps 导出说明](https://geolibre.app/user-guide/storymaps/)

**RustGIS** 是另一款开源 GIS 应用，附带 CLI、Agent Skill 和 MCP Relay。README 描述的常规 GIS 输出包括可编辑项目、PNG 地图、含图例/比例尺/地图系列的 PDF、HTML slideshow、独立网页地图及常见矢量/栅格格式。这里可以把 RustGIS 当成桌面 GIS/自动化工具直接使用，也可以借鉴“Agent 负责调度、GIS 工具负责空间运算和导出”的架构；调研时最新发行版为 0.3.0（2026-10-16），仍处于早期 0.x，应对重要成果做独立 GIS 核验。[GitHub](https://github.com/opengeos/RustGIS) · [Releases](https://github.com/opengeos/RustGIS/releases) · [CLI](https://github.com/opengeos/RustGIS/blob/main/docs/cli.md) · [布局与分享](https://rustgis.app/user-guide/layouts/)

### 5.2 设计阶段生成普通网页地图

| 项目 | 产物与可借鉴点 | 成熟度判断 |
|---|---|---|
| [LLMaps](https://github.com/greadr71/LLMaps) | 面向 LLM 代码生成的 Python MapLibre 接口；输出 HTML 地图，可组合 GeoJSON/API/矢量瓦片、H3、图例、弹窗、侧栏、搜索和故事文本 | 轻量社区项目；适合快速原型，不能当通用 GIS 或大数据平台 |
| [json-maps](https://github.com/milind-soni/json-maps) | 用 schema 约束 JSON 地图配置，再由 React MapRenderer 渲染；可借鉴“让模型产出地图规格，而不是任意操作 DOM/JS”的做法 | 早期小项目；采用前需检查维护、数据规模和 API 稳定性 |
| [QGIS2Web](https://github.com/qgis2web/qgis2web) | 将 QGIS 工程导出为 Leaflet 或 OpenLayers 网页地图，不需要服务端软件；可作为 AI 生成/修改 QGIS 工程后的确定性发布步骤 | 本身不是 AI 工具，但把可编辑 GIS 工程转成普通网页的路径成熟、清晰 |
| [MapLibre + deck.gl](https://deck.gl/) | MapLibre 负责底图和应用，deck.gl 负责大规模点、轨迹、热图和专题层；适合作为 Agent 生成 Web 代码后的运行时引擎 | 底层技术栈，不是 AI 产品；仍要自己实现界面、业务逻辑和发布 |
| [Kepler.gl](https://github.com/keplergl/kepler.gl) | 成熟的开源大数据地理可视化应用/React 组件，适合点、轨迹、热力及 H3/S2 聚合场景 | 本体成熟；其 AI Assistant 文档仍标注开发中，AI 特性不应假设稳定 |

### 5.3 故事动画、三维地球和带运行时 Agent 的参考项目

- **MapStory** 是 UIST 2025 论文中的研究原型：从脚本组织地图动画序列，将视角移动、地图高亮和动画元素放到可编辑时间线。适合参考“文本 → 场景 → 地图动画”的制作者工作流；目前是研究原型，不是常规可安装工具。[项目页](https://adigunturu.github.io/MapStory-UIST25/) · [论文](https://keiichiihara.github.io/paper/uist2025-mapstory.pdf)
- **CesiumJS AI Starter App** 展示 Cesium 地球、聊天 Agent、工具调用和 CZML 场景生成。若最终产品不需要 Agent，可只参考 CesiumJS 场景与数据集成结构，不照搬聊天后端和模型调用。[仓库](https://github.com/CesiumGS/cesiumjs-ai-starter-app)
- **CARTO agentic-deckgl** 展示运行时 Agent 如何以结构化工具操作 deck.gl 图层和地图状态。它是 Agent UI 集成参考，不是静态地图导出器；可以取其图层状态模型，最终产品照样只保留普通地图控件。[仓库](https://github.com/CartoDB/carto-agentic-deckgl)
- **GeoAgent** 包含 QGIS、GeoPandas、leafmap/MapLibre 等地理空间 Agent 连接方式，适合参考数据与 GIS 工具编排；如果需求只是在开发期用代码 Agent 写地图，可复用数据适配和地图组件思路，不必引入运行时对话界面。[仓库](https://github.com/opengeos/GeoAgent)

## 六、实用工作流建议

1. **先确定交付形态**：打印地图、GIS 工程、故事地图、普通 HTML、数据仪表板、动画、3D 场景还是影像分析结果。不要先假设一定需要一个在线搜索地图。
2. **再决定 AI 参与的位置**：
   - 只需要开发者写应用代码：使用通用代码 Agent 加对应 SDK Skill。
   - 需要操作真实空间数据和出版布局：以 QGIS/GeoLibre/RustGIS 为执行环境，用 Skill/MCP/插件辅助。
   - 希望自然语言直接生成可分享地图：先试 Mappt、Felt、Mundi 等平台产品，检查能否导出所需文件。
   - 需要可复现批量制图：把输入、数据字段映射、投影、地图类型、样式和导出参数存成 JSON/MapSpec/脚本。
3. **用确定性引擎做核心空间计算**：让 AI 选择算法和生成参数，但缓冲、叠加、统计、栅格计算和最终渲染交给 QGIS/GDAL、GeoPandas、PostGIS、Earth Engine 或地图 SDK。
4. **让 AI 预览，再由人检查**：地图样式 MCP、截图或 StoryMaps 预览可发现空图层、比例尺、图例遮挡和标签问题；空间结果仍要核验投影、单位、统计口径、分类断点与数据来源。
5. **保留可复现的交付信息**：源数据版本、CRS、算法/参数、图例说明、地图主题、构建报告、导出文件和许可/署名信息。
6. **检查公开与隐私边界**：本地工程是否将属性发送给模型、HTML 是否内嵌全量数据、第三方底图是否能离线、地图分享是否公开、平台是否允许导出和自托管。

## 七、主要局限与成熟度说明

- **“会画图”不等于“分析正确”**：Agent 可误判经纬度列、投影单位、分类字段和数值分布。要复核原始数据与空间方法，尤其是距离、面积、插值和时序分析。
- **图面质量与数据正确性是两道检查**：即使截图整洁，也可能有错位、遗漏、错误比例尺、误导性的分类断点或缺失数据。
- **产品能力存在平台边界**：SaaS 导出、共享、数据连接和 AI 配额常与套餐关联；地图 SDK 的服务 token、瓦片和 API 调用也可能计费。
- **Skill 与 MCP 不是魔法执行器**：Skill 的质量取决于指令和适用版本；MCP 工具需看 schema 和副作用；地图 Agent 是否能操作本地文件，取决于接入方式和执行权限。
- **社区项目不应用 star 数当质量背书**：本报告将成熟度描述为“官方支持/社区维护/早期/研究原型”等。Interactive Map Builder、QGIS Map Workflow 等公开仓库提供了较具体的构建流程，但仍需在目标数据和环境实测。
- **不要求运行时 AI**：只把需求分析、地图配置生成、样式检查和数据准备放在开发阶段时，最终网页可不请求模型、不部署 Agent 服务，也不要求最终用户安装 MCP。

## 主要来源

- 直接生成网页和出版图：[Interactive Map Builder](https://github.com/xlbaoxl/interactive-map-builder) · [GeoLibre](https://github.com/opengeos/GeoLibre) · [RustGIS](https://github.com/opengeos/RustGIS)
- QGIS 助手：[TerraLab QGIS 插件](https://plugins.qgis.org/plugins/AI_Agent/) · [mzarov QGIS 插件](https://plugins.qgis.org/plugins/ai_agent/) · [QGIS Map Workflow Skill](https://github.com/maydengximin-sketch/qgis-map-workflow) · [QGIS2Web](https://github.com/qgis2web/qgis2web)
- 地图开发 Skills：[MapLibre](https://github.com/maplibre/maplibre-agent-skills) · [Mapbox](https://github.com/mapbox/mapbox-agent-skills) · [Google Maps](https://github.com/googlemaps/agent-skills) · [CesiumJS](https://github.com/CesiumGS/cesiumjs-skills) · [Esri AI 开发指南](https://developers.arcgis.com/javascript/latest/ai-assisted-development/)
- 地图预览与应用：[MapLibre MCP](https://github.com/birkskyum/maplibre-mcp) · [CARTO Agent Skills](https://github.com/CartoDB/agent-skills) · [CARTO for Agents](https://carto.com/carto-for-agents/) · [Kepler.gl](https://github.com/keplergl/kepler.gl)
- AI 制图产品：[Mappt](https://mappt.ai/how-it-works) · [Felt AI](https://felt.com/platform/felt-ai) · [Mundi](https://docs.mundi.ai/) · [Scribble Maps](https://help.scribblemaps.com/help/a/what-can-scribble-do-ai-capabilities-overview) · [ArcGIS StoryMaps Assistant](https://doc.esri.com/en/arcgis-storymaps/latest/learn/arcgis-storymaps-assistant.html)
- 遥感、动画与三维：[Earth Engine Assistant](https://developers.google.com/earth-engine/guides/code_editor_assistant) · [MapStory](https://adigunturu.github.io/MapStory-UIST25/) · [CesiumJS AI Starter App](https://github.com/CesiumGS/cesiumjs-ai-starter-app) · [CARTO agentic-deckgl](https://github.com/CartoDB/carto-agentic-deckgl) · [MapToki](https://maptoki.com/en/about)
