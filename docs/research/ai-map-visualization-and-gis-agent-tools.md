# AI 地图可视化与 GIS 分析工具调研

> 调研快照：2026-10-26。价格、版本、测试阶段和可用性会变化；涉及动态信息时在正文标注检查日期。
>
> 调研范围：GitHub、npm/PyPI、官方产品文档和社区目录，覆盖 Skill、CLI、MCP、桌面 GIS、在线 GIS、遥感分析和可参考的完整项目。三路并行调研分别聚焦 GIS/MCP 工具、Agent 项目与完整应用、在线地图产品与 AI 能力；报告对关键功能和限制优先引用项目或厂商的一手资料。未对这些项目逐一安装、运行或做性能基准测试。

## 一、结论摘要

目前没有一个通用 AI 地图工具能同时做到“读懂任意本地 GIS 数据、正确选择空间算法、运行分析、生成可靠地图并适配所有数据服务”。比较实用的工具大致分成三类：

1. **让 Agent 操作已有 GIS 软件**：QGIS MCP、GeoAgent、AgenticGIS。适合已有矢量/栅格数据和 QGIS 工作流的人；空间处理仍由 QGIS、GDAL、GeoPandas 等确定性工具执行。
2. **面向团队在线制图和空间分析的平台**：Felt AI、CARTO for Agents。更接近完整产品，通常要把数据放在平台或连接的数据仓库中，并受订阅、权限和用量限制。
3. **给 Agent 提供地点、路线等地图服务**：高德、Mapbox、Google Maps、ArcGIS Location Services 等 MCP/CLI。接入容易，但大多是 LBS 服务接口，不等同于对用户本地数据做叠加、栅格计算或空间统计。

按常见需求，优先看这些：

| 需求 | 优先调研对象 | 适用边界 |
|---|---|---|
| 在本机 QGIS 中用自然语言做图层、处理、布局 | [QGIS MCP Plugin](https://plugins.qgis.org/plugins/qgis_mcp_plugin/)、[GeoAgent](https://github.com/opengeos/GeoAgent) | 需要本机 QGIS 及 MCP/Agent 配置；执行结果仍需人工核对 |
| 让 Agent 查地点、规划路线、做旅行地图 | [高德地图 MCP/CLI/Skill](https://lbs.amap.com/api/mcp-server/summary)、[Mapbox MCP](https://github.com/mapbox/mcp-server) | 主要面向在线地点与路线 API；需 API Key，可能产生用量费用 |
| 团队协作、自然语言查数据并发布 Web 地图 | [Felt AI](https://felt.com/platform/felt-ai)、[CARTO for Agents](https://carto.com/carto-for-agents/) | 商业平台；数据、权限、AI 配额和 MCP 能力依订阅方案而定 |
| 自建 Web 地图，允许 Agent 改变地图状态 | [CARTO Agentic DeckGL](https://github.com/CartoDB/carto-agentic-deckgl)、[ArcGIS Maps SDK AI Components](https://developers.arcgis.com/javascript/latest/references/ai-components/) | 前者偏开发库；后者处于 Beta，当前数据能力有限 |
| 遥感/卫星影像代码分析 | [Earth Engine Code Editor Assistant](https://developers.google.com/earth-engine/guides/code_editor_assistant)、[AWS Geospatial Power Pack](https://github.com/aws-samples/sample-geospatial-kiro-power-pack) | 前者辅助编写 Earth Engine 脚本；后者是 AWS 架构样例，需要自行部署和承担云成本 |
| 需要完整应用或架构范例 | [OpenGIS](https://github.com/ATFfang/OpenGIS)、[AutoGIS](https://github.com/THU-ESIS/AutoGIS)、[AWS Geospatial Agent](https://github.com/aws-samples/sample-geospatial-agent-on-aws) | 开源完整项目成熟度不一；研究原型和云部署样例不宜直接视为生产替代品 |

**最重要的区分**：地图渲染、POI/路线查询、GIS 空间分析是不同能力。评估时要先确认要处理的是在线地图服务数据，还是本地/仓库中的真实空间数据；再看产品是否提供空间 SQL、GIS 算法、栅格处理和坐标系支持。

## 二、工具类型与能力边界

| 类型 | 实际提供什么 | 典型例子 | 常见误区 |
|---|---|---|---|
| Skill | 提示词、工作流程、API/代码知识，帮助 Agent 按约定完成任务 | Google Maps Agent Skills、Mapbox Agent Skills、CARTO Skills | 安装 Skill 不代表新增了可调用的地图数据或 GIS 执行环境 |
| MCP Server | 将服务或软件功能包装成 Agent 可调用的结构化工具 | 高德 MCP、Mapbox MCP、QGIS MCP、CARTO MCP | MCP 工具列表决定实际能力；“支持地图”不代表支持任意空间分析 |
| CLI | 可脚本化的命令行入口，适合本机自动化和组合流程 | 高德地图 CLI、CARTO CLI | CLI 可能控制浏览器地图状态，也可能调用数据服务，需看具体命令 |
| Agent 产品 | 组合模型、工具、数据源、执行环境和地图 UI | Felt AI、GeoAgent、OpenGIS | Agent 输出仍可能选错图层、字段、算法、坐标系或参数 |
| 地图/空间分析平台 | 提供确定性渲染、数据存储和分析算子 | QGIS、CARTO、ArcGIS、Google Earth Engine | 平台有 AI 助手不等于 AI 已覆盖所有平台能力 |

可把所需能力粗分为三层：

| 能力层 | 例子 | 代表工具 |
|---|---|---|
| LBS/地图服务 | 地点搜索、正逆地理编码、路线、距离矩阵、天气、地图图片 | 高德、Mapbox、Google Maps、ArcGIS Location Services |
| 交互式地图 | 图层样式、筛选、聚合、地图状态、弹窗、地图分享 | Felt、CARTO、Kepler.gl、MapLibre/Mapbox/ArcGIS SDK |
| GIS 分析 | 缓冲区、叠加、空间连接、坐标变换、栅格计算、空间统计、网络可达性 | QGIS/GDAL、GeoPandas、PostGIS、CARTO Workflows、Earth Engine |

## 三、桌面 GIS 与本地数据 Agent

### 3.1 QGIS MCP Plugin（nkarasiak）

[GitHub 项目](https://github.com/nkarasiak/qgis-mcp) 与 [QGIS 官方插件目录](https://plugins.qgis.org/plugins/qgis_mcp_plugin/) 提供 QGIS 插件和 MCP Server 的组合。官方插件目录在 2026-10-17 标注版本 0.15.2，兼容 QGIS 3.28 至 4.x，并列出 118 个 MCP 工具。工具覆盖图层、要素、处理算法、渲染和布局等常见操作。

- **适合**：已有 QGIS 项目，想让 Claude、Codex 等 MCP 客户端查看图层、执行处理和输出地图。
- **结构**：QGIS 插件连接正在运行的桌面应用，MCP Server 暴露操作；这是操控现有 GIS 的桥接方案，不是独立 GIS 平台。
- **注意**：插件、Server 和客户端需正确连接；工具可能修改当前工程或文件，涉及覆盖、导出、批处理时应确认目标和参数。
- **成熟度判断**：有官方 QGIS 插件目录发布记录，可作为优先试用对象；具体工具是否满足团队流程仍需在目标 QGIS 版本和数据上验证。

### 3.2 GeoAgent（OpenGeo）

[GeoAgent](https://github.com/opengeos/GeoAgent) 是 Python 地理空间 Agent 库，也有 [PyPI 包](https://pypi.org/project/GeoAgent/) 和 QGIS 插件。项目连接 QGIS、leafmap/anymap、STAC 和 NASA Earthdata 等地理空间工作流，并支持多种模型提供方。GitHub Releases 页面可查到 1.9.0 的发布记录；版本号以仓库当前 release 页面为准。

- **适合**：希望在自己的 Python、Notebook、浏览器地图或 QGIS 里嵌入 Agent 工作流。
- **优点**：比只提供 POI 查询的 MCP 更靠近 GIS 数据和地图应用开发；可把相同 Agent 思路接到不同地图界面。
- **限制**：模型和数据连接需要自行配置；“支持某数据源”不代表开箱即用地获得其访问权限。QGIS 插件文档提到权限配置，其中信任模式可能允许自动批准，使用前应按最小权限配置。
- **入口**：项目 README 提供 Python 安装与 UI 启动说明；安装命令和额外依赖以 [PyPI 安装说明](https://pypi.org/project/GeoAgent/) 为准。

### 3.3 AgenticGIS 与其他 QGIS MCP 候选

- [AgenticGIS](https://github.com/ultramenid/AgenticGIS)：面向 QGIS 的内部助手及本地 MCP 桥接，项目列出图层、处理算法、地图截图、栅格统计、布局导出等能力。其工具集包括执行 PyQGIS 代码的入口；README 描述 MCP 服务监听本机地址，但未提供认证机制。适合检查和试验，不要把“本地监听”误认为有完整权限隔离。
- [QGIS-MCP（Aaa2122）](https://github.com/Aaa2122/QGIS-MCP)：较新的插件与桥接项目，声称提供 100 多个专业工具及可恢复的可视化流程。与官方插件目录中的项目是不同实现；先检查最近维护、工具 schema、文件副作用和执行模型，再决定是否用于真实工程。

本地 QGIS 方案的共同优势是可以复用成熟 GIS 算子和已有数据；共同风险是 Agent 对本地工程和任意文件的操作边界。优先选择可枚举的类型化工具，避免不加审核地开放任意代码执行。

## 四、在线 GIS 与团队产品

### 4.1 Felt AI 与 Felt MCP

[Felt AI](https://felt.com/platform/felt-ai) 面向在线地图与团队数据工作流，支持自然语言探索图层/数据、执行 SQL、解释查询，并制作地图、Dashboard 或扩展。其 [MCP Server 介绍](https://felt.com/blog/introducing-felt-mcp-server) 描述了约 30 个围绕地图、数据、SQL、分析、样式和协作的工具。产品说明强调 Agent 使用当前用户可访问的数据和权限；产品页还描述 SQL 为只读。

- **适合**：需要协作式 Web GIS，数据已在 Felt 或可连接的数据源中，希望让 Agent 探索和整理地图。
- **限制**：它是平台型产品，并非本地 QGIS 的 MCP 替代；不同 AI 配额和 MCP 能力受订阅方案影响。
- **价格快照**：Felt [定价页](https://felt.com/pricing) 于 2026-10-24 检查时列出 Business 和 Enterprise 方案提供 MCP；Team 展示 AI 配额但不包含 MCP。页面列示的年付价格分别约为 Business 599 美元/月、Enterprise 起价 1,250 美元/月；该页面可能调整，采购前请重查。

### 4.2 CARTO for Agents、Workflows 与 Agentic DeckGL

[CARTO for Agents](https://carto.com/carto-for-agents/) 将 CARTO 的云 GIS、数据仓库连接、Agent Skills、CLI 和托管 MCP 组合起来；[官方文档](https://docs.carto.com/carto-mcp-server/carto-mcp-server) 说明 MCP 可将 CARTO Workflows 暴露成 Agent 工具。这样团队可把空间分析流程做成有明确输入/输出的可复用工具，而不只依赖提示词临时拼查询。官方 [Agent Skills 仓库](https://github.com/CartoDB/agent-skills) 提供 20 多个技能，覆盖 Builder 地图、空间分析和常见地理工作流。

- **适合**：空间数据已在支持的数据仓库/平台中，团队要治理查询权限、共享工作流和复用空间分析。
- **特点**：CARTO 文档把模型、语义层、工具和数据访问视为 Agent 组成部分；Workflows 可用作同步或异步 MCP 工具。厂商说明查询在客户数据仓库内执行，实际权限仍取决于连接账号和仓库配置。
- **限制**：商业平台，需评估仓库兼容、部署、权限、费用和数据连接；不是一个可离线运行的通用 GIS Agent。

若要在自建前端中允许 Agent 调整地图，[@carto/agentic-deckgl](https://github.com/CartoDB/carto-agentic-deckgl) 是相对小而聚焦的 TypeScript 库：把自然语言操作收敛成地图状态、标记和遮罩图层等结构化动作，并提供多种 Agent 框架适配示例。官方文档强调地图状态由前端执行，模型不直接访问用户数据；它解决的是“安全地控制地图 UI”，不负责完整 GIS 运算。

## 五、地图服务的 MCP、CLI 和 Skill

| 工具 | 形式 | 已公开的主要能力 | 关键限制 |
|---|---|---|---|
| [高德地图](https://lbs.amap.com/api/mcp-server/summary) | 托管/本地 MCP、CLI、Skill | POI、地理编码、天气、步行/骑行/驾车/公交路线、距离、行程链接 | 面向中国 LBS 和地图展示；不是本地矢量/栅格分析环境 |
| [Mapbox](https://github.com/mapbox/mcp-server) | MCP、CLI、20 个官方 Agent Skills | Geocoding、Places、Directions、Matrix、Route Optimization、Map Matching、Isochrone、静态/交互地图 | 需 Mapbox Token；请求会调用 Mapbox 服务并按服务条款/用量计费 |
| [Google Maps Grounding Lite](https://developers.google.com/maps/ai/grounding-lite?hl=en) | Gemini API 工具 | 地点搜索、天气、步行/驾车路线和距离/耗时 | 不提供通用 GIS，也不等同于实时导航、逐向语音和实时交通产品 |
| [ArcGIS Location Services MCP](https://www.esri.com/arcgis-blog/products/platform/developers/mcp-support-beta-and-arcgis-static-maps-service-in-arcgis-location-platform-release) | 托管 MCP（Beta/Early Access） | 地理编码、路线、高程、静态地图等 Location Services | 2026-06 公告时为早期测试阶段；服务调用仍按 ArcGIS 服务规则计费 |
| [Cesium ion MCP](https://cesium.com/learn/ion/mcp/) | 托管 MCP | 搜索、查看、上传和管理 3D 地理资产，处理 tiling/标签及 Bentley iModels | 面向 3D 地理资产平台管理，不是通用 GIS 空间分析器 |

### 5.1 高德地图

高德提供相对完整的国内地图 Agent 入口：[MCP 快速开始](https://lbs.amap.com/api/mcp-server/gettingstarted)、[能力列表](https://lbs.amap.com/api/mcp-server/summary)、[地图 CLI 安装](https://lbs.amap.com/api/cli/map-cli/install)、[CLI 命令参考](https://lbs.amap.com/api/cli/map-cli/reference) 和 [Skill 说明](https://lbs.amap.com/api/skill/ready-to-use/summary)。官方文档列出的本地 MCP 包为 @amap/amap-maps-mcp-server；托管 MCP 使用 API Key。CLI 可控制地图 UI、POI 和路线，Skills 分别偏向 JSAPI 开发和 LBS 搜索/路线/出行规划。

适合中文地点查询、国内出行和高德地图页面操作。API Key 和安全密钥需要按官方要求配置，确认调用额度与费用；地图 UI 自动化和空间数据分析是两回事。

### 5.2 Mapbox

[Mapbox MCP Server](https://github.com/mapbox/mcp-server) 提供本地 npm 包和托管 MCP，覆盖搜索、地理编码、路线、等时圈、匹配及地图输出。官方 [CLI MCP 文档](https://docs.mapbox.com/cli/reference/mcp/) 可配置托管端点，[Agent Skills 文档](https://docs.mapbox.com/cli/reference/agent-skills/)列出官方技能。npm 页面在 2026-10-24 显示 @mapbox/mcp-server 0.16.0；版本变化应以 [npm 包页](https://www.npmjs.com/package/@mapbox/mcp-server) 和 GitHub 为准。

适合面向全球的在线地点/路线和 Mapbox 前端开发。它的 isochrone、矩阵和优化能力属于服务 API；若要在任意本地数据上做叠加、栅格运算或空间统计，仍需另接 GIS 引擎。

### 5.3 Google Maps、ArcGIS 与 Cesium

- Google Maps [Grounding Lite](https://developers.google.com/maps/ai/grounding-lite?hl=en) 是给 Gemini Agent 提供地图 grounding 的服务工具，不是通用地图分析桌面软件。[Agentic UI Toolkit](https://developers.google.com/maps/ai/agentic-ui-toolkit?hl=en) 可为 Agent 输出地点卡片、地图和路线 UI，目前官方标为实验性；Google Maps [Agent Skills](https://github.com/googlemaps/agent-skills) 主要提供开发知识，仓库声明它不是 Google 官方支持产品。
- Esri 的 [ArcGIS Maps SDK AI Components](https://developers.arcgis.com/javascript/latest/references/ai-components/) 可为 Web Map 加入导航、数据探索和帮助类 Agent UI，目前为 Beta；官方 setup 文档说明当前面向 Feature Layer，并依赖图层/字段说明与 embeddings。它适合 ArcGIS Web 应用开发，不代表 ArcGIS Pro 的全部工具已经可以由 Agent 调用。
- [Cesium ion MCP](https://cesium.com/blog/2026/10/12/introducing-the-cesium-ion-mcp-server/) 于 2026-10 发布，适合 3D Tiles、资产发现和 Cesium ion 管理流程。将它看作 3D 地理资产工作台集成，而不是分析能力全面的 GIS Agent。

### 5.4 可直接参考的接入入口

安装/配置入口以官方文档为准，以下仅列调研时看到的官方路径：

| 用途 | 入口 |
|---|---|
| 高德本地 MCP | npm 包 @amap/amap-maps-mcp-server；官方 MCP 文档还提供托管端点 |
| 高德地图 UI CLI | npm 包 @amap-lbs/amap-gui；全局安装后按官方文档配置 AMAP_KEY 和安全密钥，再运行 amap-gui start |
| Google Maps API 编码辅助 Skill | npx skills add googlemaps/agent-skills；它提供 API 开发指导，不会自动提供地图数据权限 |
| Mapbox MCP/Skills | 官方 npm 包 @mapbox/mcp-server；使用 Mapbox CLI 的 MCP 和 Skills 文档配置 Token 与客户端 |
| GeoAgent Python | PyPI GeoAgent；项目文档给出 UI、地图适配器及模型提供方的可选依赖 |
| QGIS MCP | 先在 QGIS 插件管理器中安装 QGIS MCP Plugin，再按 GitHub README 配置 MCP Server 和 Agent 客户端 |
| CARTO Skills/CLI/MCP | 按 CARTO 官方 Agent Skills、CLI 和 MCP 文档安装；使用前确认平台/仓库连接和订阅能力 |

## 六、遥感与开发者工具

### 6.1 Google Earth Engine Code Editor Assistant

[Earth Engine Code Editor Assistant](https://developers.google.com/earth-engine/guides/code_editor_assistant) 在 Code Editor 中提供 Gemini 助手，可编写、解释、调试和优化 Earth Engine 脚本，并查询文档或数据目录。它能看到当前脚本、导入资产和对话上下文；官方说明需要用户提供 Gemini API Key。生成的代码仍要检查后运行，数据集筛选、云掩膜、投影、时间窗和统计口径不能只靠自然语言描述。

适合已经使用 Earth Engine 的遥感工作者加速脚本迭代；不是任意本地卫星影像的自动处理器，也不是通用 Web 地图制作 Agent。

### 6.2 AWS Geospatial Kiro Power Pack

[AWS Geospatial Power Pack](https://github.com/aws-samples/sample-geospatial-kiro-power-pack) 是模块化 Agent 工具与 Skills 样例，包含 MCP Server、共享地理空间代码、Skills/Steering 和 AWS 执行环境，涉及 STAC、矢量处理及基础模型等模块。仓库说明部分包通过本地仓库路径调用，未发布到 PyPI；应按仓库指引克隆并运行，不要把它当成可直接从公共包仓库安装的成品。

适合参考如何把地理空间工具拆成 MCP 模块并与云执行环境集成。需要评估 AWS 资源、权限、部署和费用，不适合只想快速本机画图的用户。

## 七、完整项目与地图项目参考

| 项目 | 项目形态 | 适合参考的部分 | 成熟度/限制 |
|---|---|---|---|
| [OpenGIS](https://github.com/ATFfang/OpenGIS) | Electron + React/TypeScript + MapLibre，配 Python FastAPI sidecar 和模型层 | 桌面地图、Python 空间分析、工作流 DAG、可复用操作、后台任务、权限和报告/布局 | README 表示仍在积极开发；架构参考价值高，不能默认替代 QGIS/ArcGIS |
| [AutoGIS](https://github.com/THU-ESIS/AutoGIS) | 研究型自然语言 GIS 应用 | 数据检索、OSM/边界/遥感数据获取、PyQGIS 生成执行、FastAPI/WebSocket 和 Vue/MapLibre | 研究/教育原型；生成代码可访问本机文件和进程，部署边界要严格 |
| [GeoAgents](https://github.com/juaquicar/GeoAgents) | Django Agent 后端 | 计划—执行—验证—重规划循环、工具调用记录、空间查询/邻近/相交/网络追踪 | 实验项目，偏后端 Agent 编排，没有完整地图编辑 UI |
| [GeoSpark](https://github.com/Maz2580/geospark) | Python 库、CLI、REST、MCP 和 Web Playground | 把几何、路由、可达性、STAC 等工具暴露给多种 Agent 入口 | PyPI 页面显示 0.9.0 Alpha（2026-10-23）；适合作为早期试用候选，不应仅凭功能清单认为稳定 |
| [AWS Geospatial Agent on AWS](https://github.com/aws-samples/sample-geospatial-agent-on-aws) | 完整云端遥感 Agent 样例 | Sentinel-2 NDVI/NDWI/NBR、OSM、Amazon Location MCP、TiTiler、React/MapLibre 与 Bedrock/AgentCore | 需要 AWS 部署和资源，样例涉及云成本；适合架构参考或云端原型 |
| [Kepler.gl](https://github.com/keplergl/kepler.gl) | 成熟开源大数据地图可视化应用/组件 | 点、轨迹、热力、H3/S2 聚合、MapLibre/deck.gl 与 React 嵌入 | 核心是地图可视化，不是完整 AI GIS Agent；官方 AI Assistant 文档标注仍在开发中 |

### 7.1 项目选择建议

- **要改造现有 QGIS 流程**：先验证官方目录中的 QGIS MCP Plugin；需要 Python Agent/多地图后端时再评估 GeoAgent。
- **要做独立桌面 GIS Agent**：OpenGIS 的模块划分值得参考；AutoGIS 的自然语言到 PyQGIS 链路值得作为研究范例，但不应直接放宽执行权限。
- **要遥感云工作流**：用 AWS Geospatial Agent 或 Power Pack 学架构；若目标就是 Earth Engine 数据分析，先从 Code Editor Assistant 开始，部署面更小。
- **要数据量大的交互式专题地图**：Kepler.gl 是成熟渲染和交互参考；AI 能力需自己接入，不能假设其 AI Assistant 已成熟可用。
- **要 MCP 几何算子快速试验**：GeoSpark 等 Alpha 项目可以用于沙箱评估，先检查依赖、工具 schema、数据写入行为和版本维护。

## 八、按场景选型

| 用户实际目标 | 推荐起点 | 第二选择 | 先确认的问题 |
|---|---|---|---|
| “帮我理解本地 GeoPackage/Shapefile 并做缓冲/叠加” | QGIS MCP Plugin + QGIS | GeoAgent | 是否本机运行、是否需要写回原文件、坐标系和单位是否明确 |
| “按中文描述找店、规划出行并显示到地图” | 高德 MCP/CLI | Google Maps Grounding Lite、Mapbox | 覆盖地区、地图服务账号、实时交通/路线需求、API 预算 |
| “分析数仓里的门店和订单空间分布” | CARTO Workflows/MCP | Felt AI | 数据仓库、SQL 权限、数据驻留、订阅价格、查询成本 |
| “做一个能听 Agent 指令改图层和视角的前端” | CARTO Agentic DeckGL | ArcGIS JS AI Components（Beta） | 地图 SDK、Agent 框架、是否需要用户数据进入模型上下文 |
| “分析卫星影像并生成 NDVI 图” | Google Earth Engine Assistant | AWS Geospatial Agent 样例 | 影像源、云掩膜、时间窗口、运行额度、数据/代码是否上传 |
| “想建完整的开源地图 Agent 产品” | 参考 OpenGIS 的前后端/工作流切分 | AutoGIS、AWS Agent 样例 | 数据获取、GIS 引擎、代码执行隔离、权限、成本和回滚设计 |

## 九、试用前的核对清单

1. **先列出要操作的数据和工具**：在线 POI/路线还是本地文件/数据库；是否要栅格、空间统计、空间 SQL；输出是地图、报表还是可复现分析。
2. **核实数据与坐标系**：字段含义、坐标参考系、单位、无效几何、时间范围、空间分辨率和数据许可。Agent 可以辅助解释，但这些元数据应由数据本身或权威目录确认。
3. **核实执行边界**：哪些调用只读，哪些会修改工程、覆盖文件、执行任意代码或产生云任务；本机 MCP 是否有鉴权；是否需要先确认再写入/导出。
4. **核实模型上下文与密钥**：发送给模型的可能包括提示、字段名、查询、地址、坐标、脚本或地图状态。使用前看产品隐私/数据处理说明，API Key 只按官方方式存放。
5. **检查空间结果而非只看地图效果**：对照原数据、坐标系、参数和统计口径；抽样核验缓冲距离、路线、空间连接数量、栅格统计和聚合结果。
6. **记录可复现信息**：保留输入数据版本、工具/算法名、参数、查询或脚本、输出坐标系和时间戳。地图“看起来合理”不等于空间分析结果正确。

## 十、社区发现入口与调研方法

[Sparkgeo geo-mcp-servers](https://github.com/sparkgeo/geo-mcp-servers) 是社区维护的地理空间 MCP 目录。README 在调研时列出 109 个 Server、12 个分类，并标注活跃状态/检查信息。它适合继续发现候选项目，但目录收录不构成代码审计、质量背书或维护承诺。可用它筛选后再检查仓库的最近提交、发布记录、许可证、MCP schema、依赖和安全说明。

本报告优先选取能找到官方仓库、插件目录、npm/PyPI 页面或厂商文档的项目。报告中的“适合”是依据公开能力描述做的选型建议，不代表已在本机实测；项目数量、安装命令、套餐和 Beta 状态可能快速变化。开始集成前，请再次检查对应项目的发布页和官方文档。

## 主要来源

- QGIS MCP Plugin：[GitHub](https://github.com/nkarasiak/qgis-mcp) · [QGIS 官方插件目录](https://plugins.qgis.org/plugins/qgis_mcp_plugin/)
- GeoAgent：[GitHub](https://github.com/opengeos/GeoAgent) · [PyPI](https://pypi.org/project/GeoAgent/) · [Releases](https://github.com/opengeos/GeoAgent/releases)
- AgenticGIS：[GitHub](https://github.com/ultramenid/AgenticGIS)；QGIS-MCP：[GitHub](https://github.com/Aaa2122/QGIS-MCP)
- Felt：[AI 产品介绍](https://felt.com/platform/felt-ai) · [MCP 介绍](https://felt.com/blog/introducing-felt-mcp-server) · [定价](https://felt.com/pricing)
- CARTO：[For Agents](https://carto.com/carto-for-agents/) · [MCP 文档](https://docs.carto.com/carto-mcp-server/carto-mcp-server) · [Agent Skills](https://github.com/CartoDB/agent-skills) · [Agentic DeckGL](https://github.com/CartoDB/carto-agentic-deckgl)
- 高德：[MCP 能力](https://lbs.amap.com/api/mcp-server/summary) · [MCP 快速开始](https://lbs.amap.com/api/mcp-server/gettingstarted) · [CLI 安装](https://lbs.amap.com/api/cli/map-cli/install) · [Skills](https://lbs.amap.com/api/skill/ready-to-use/summary)
- Mapbox：[MCP Server](https://github.com/mapbox/mcp-server) · [MCP CLI 文档](https://docs.mapbox.com/cli/reference/mcp/) · [Agent Skills](https://docs.mapbox.com/cli/reference/agent-skills/) · [npm](https://www.npmjs.com/package/@mapbox/mcp-server)
- Google：[Maps Grounding Lite](https://developers.google.com/maps/ai/grounding-lite?hl=en) · [Agentic UI Toolkit](https://developers.google.com/maps/ai/agentic-ui-toolkit?hl=en) · [Maps Agent Skills](https://github.com/googlemaps/agent-skills) · [Earth Engine Assistant](https://developers.google.com/earth-engine/guides/code_editor_assistant)
- Esri：[ArcGIS JS AI Components](https://developers.arcgis.com/javascript/latest/references/ai-components/) · [Web Map 配置](https://developers.arcgis.com/javascript/latest/agentic-apps/ai-webmap-setup/) · [Location Services MCP 公告](https://www.esri.com/arcgis-blog/products/platform/developers/mcp-support-beta-and-arcgis-static-maps-service-in-arcgis-location-platform-release)
- Cesium：[ion MCP](https://cesium.com/learn/ion/mcp/) · [发布公告](https://cesium.com/blog/2026/10/12/introducing-the-cesium-ion-mcp-server/)
- 参考项目：[OpenGIS](https://github.com/ATFfang/OpenGIS) · [AutoGIS](https://github.com/THU-ESIS/AutoGIS) · [GeoAgents](https://github.com/juaquicar/GeoAgents) · [GeoSpark](https://github.com/Maz2580/geospark) · [AWS Geospatial Agent](https://github.com/aws-samples/sample-geospatial-agent-on-aws) · [AWS Power Pack](https://github.com/aws-samples/sample-geospatial-kiro-power-pack) · [Kepler.gl](https://github.com/keplergl/kepler.gl)
- 社区目录：[Sparkgeo geo-mcp-servers](https://github.com/sparkgeo/geo-mcp-servers)
