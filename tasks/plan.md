# 网页版《植物大战僵尸》GOTY 复刻实施计划

**状态：** PvZ-Portable WebAssembly 0.2.5 已完成实现、测试、合并、Pages 发布和线上静态资源验收。使用真实 GOTY 资源启动原版标题页、关卡与存档的人工冒烟尚未完成；当前网页要求玩家在浏览器本地导入自己的游戏文件。
**目标版本：** PC《Plants vs. Zombies: Game of the Year Edition》。
**产品形态：** 纯静态前端；游戏资源由玩家在自己的浏览器中导入；不新增后端服务。

## 1. 背景与用户目标

首个 TypeScript/Phaser 页面自行设计了启动界面和战场，不能满足“从启动页面到所有游戏细节完全复刻”的要求。继续手写一个相似页面会重复实现大量成熟游戏状态、动画和模式，无法保证与原作一致。

调研发现 PvZ-Portable 提供 PC GOTY 社区重实现、WebAssembly 构建、本地资源导入和 IndexedDB 存档。最新固定版本为 0.2.5。上游声明其玩法重建接近 GOTY，但不包含 PopCap/EA 游戏资源；浏览器版本要求导入本地游戏文件，文件不会上传服务器。代码按 LGPL-3.0-or-later 发布，许可证只覆盖实现代码，不覆盖原作 IP 或资源。

用户希望部署到线上，尽可能覆盖 GOTY 的启动流程、全部模式、场景、植物、僵尸和系统；桌面鼠标及手机横屏可用；为后续数值模拟留可调用的模块边界。原版资源提取仓库没有覆盖其资源公网再分发的明确许可，因此公开站点发布 WASM 代码，但不托管提取出的图片、音频或数据包。

## 2. 目标和边界

### 2.1 本阶段交付目标

- 公开页面直接加载可追踪版本的 WASM 运行时，不显示自制游戏菜单或自绘战场。
- 运行时支持用户本地选择 GOTY 资源文件夹或 ZIP，完成导入后启动原作风格的完整游戏流程。
- 静态资源同源托管，资源与存档操作不依赖第三方脚本 CDN，不向服务端上传玩家游戏文件。
- 游戏存档保存在浏览器 IndexedDB，使用运行时提供的导入/导出能力。
- 保留可从 Node 调用的 TypeScript 模拟原型、注册表、事件钩子、可替换规则和固定随机种子，供后续平衡模拟继续建设。
- 通过仓库现有 Pages 工作流发布，不新增 Worker、账号、云数据库或后端。

### 2.2 内容和终端范围

| 范围 | 目标 |
|---|---|
| 游戏内容 | PC GOTY 的冒险模式、迷你游戏、解谜、生存、禅境花园、植物/僵尸图鉴、商店、奖励和设置等原作系统 |
| 场景 | 白天、黑夜、泳池、浓雾、屋顶及首领相关场景 |
| 输入 | 桌面鼠标；手机横屏触控 |
| 浏览器数据 | WASM 游戏存档写入 IndexedDB；玩家资源导入后只在当前页面运行时内存中使用，页面重开需再次选择 |
| 扩展 | 不执行第三方动态插件。当前 TypeScript 模拟层提供内部注册 API；它不直接驱动 WASM 游戏 |

上游运行时的保存格式包含原作全局档案和关卡存档，范围可能超过此前提出的“设置、解锁和关卡进度”。当前优先保留原作存档兼容性，最终 README 必须如实说明浏览器保存内容及导出方式。

### 2.3 不属于本阶段

- 不开发新的 PvZ 战斗引擎或重新绘制原作 UI。
- 不上传、代理或提交 PopCap/EA 的 main.pak、properties/、图像、动画、音乐或字体。
- 不做在线账号、云端进度同步、排行榜或多人游戏。
- 不构建批量数值模拟产品、自动平衡器或外部插件市场；本阶段只保留并测试 TypeScript 模拟原型的调用边界。
- 不宣称 TypeScript 模拟规则已经与 C++/WASM 游戏逐项一致；若后续要求一致性，需要专门建立跨运行时数据/状态桥接。

## 3. 技术调研与选择

| 方案 | 观察 | 决策 |
|---|---|---|
| 手写 TypeScript/Phaser | 当前原型已有模块化核心，但当前画面是自绘的，部分模式/波次只是近似实现，无法满足完整原作视觉与流程要求 | 移除其浏览器入口和 Phaser 渲染；保留 headless 模拟代码供后续平衡分析 |
| 社区资源包直接打包 | FregD156/PvZ_Assets 明确是从原版 main.pak 提取的资产；仓库页面没有给出覆盖这些文件公网再分发的许可证 | 不打包该资源库的图片、音频、动画和配置；README 署名只用于来源追踪 |
| PvZ-Portable WebAssembly | 固定版本 0.2.5；上游提供 WASM 构建，要求用户本地导入游戏文件；保存到浏览器 IndexedDB；代码按 LGPL-3.0-or-later 发布 | 作为生产游戏运行时；保持源链接、许可证和本地补丁说明 |
| GOTY C++ 反向重建代码 | 可核对 GOTY 关卡、单位行为和运行时复杂度 | 作为真实数据/行为研究来源，不将其拆出代码混入本项目 |

### 3.1 上游工件固定

- 上游：wszqkzqk/PvZ-Portable Release 0.2.5。
- WASM 压缩包 SHA-256：9542ca7fe4aa5804e3cc409a8679d3e03771cc6522920a9220cf58c2366b3f84。
- 运行时文件位于 apps/plants-vs-zombies/public/portable/，由 Vite 原样复制到部署产物。
- 上游 HTML 原本从 jsDelivr 加载未固定版本的 JSZip；本项目改为同目录本地 JSZip 3.10.1，MIT 许可证文本一并发布。
- 精确文件哈希、版本、来源和补丁说明记录在 public/portable/runtime-manifest.json 与 THIRD-PARTY-NOTICES.txt。
- WASM、HTML、JavaScript、LGPL/GPL 许可证及源码链接作为一组发布；不把 LGPL 代码的许可证说明误写成对 EA/PopCap 游戏内容的许可。

## 4. 架构

~~~~mermaid
flowchart TB
  Shell["共享站点外壳：site-shell"] --> App["植物大战僵尸静态应用"]
  App --> Frame["同源 iframe：PvZ-Portable WebAssembly"]
  Frame --> Files["用户选择的 main.pak + properties/"]
  Files --> Memory["浏览器内存 / WASM 虚拟文件系统"]
  Memory --> Original["原作启动、菜单、模式、战场和运行规则"]
  Original --> IDBFS["WASM IDBFS / IndexedDB 存档"]
  Sim["TypeScript headless 模拟原型"] --> Registry["单位/关卡注册表、钩子、固定随机源"]
  Registry --> NodeTests["node:test"]
  Registry -. 后续适配 .-> Testkit["@wishflow/simulation-testkit"]
  Original -. 当前没有 API 桥 .- Registry
~~~~

### 4.1 Web 入口

- 共享站点仍使用 @wishflow/site-shell；它负责 WishFlow 导航与页脚，不重建游戏 UI。
- 应用 index.html 只挂载同源 iframe，加载 public/portable/pvz-portable.html。
- iframe 中由上游运行时提供资源导入、原作游戏画布、存档同步与导入/导出功能。
- 运行时保持 800×600 逻辑画布和 4:3 比例；父页为画布提供剩余视口，允许 iframe 全屏。
- 站点语言状态与游戏资源语言分离：shell 使用公共语言切换，游戏语言由用户导入的 GOTY 资源决定。
- 静态 HTML、JS、WASM 和 JSZip 通过相对路径解析，部署路径固定为 /plants-vs-zombies/。

### 4.2 后续模拟边界

- src/core/、src/content/、src/modes/ 保留无 DOM 的 TypeScript 原型，提供规则注册、事件钩子、固定步进/随机种子和快照。
- Node 单测可直接驱动该层；未来可以接入 @wishflow/simulation-testkit 的 worker 场景适配器。
- 这些模拟规则不是当前实际游戏运行时；不得以此生成关卡或给用户展示近似玩法。
- 若要保证新增植物/僵尸的数值模拟能够预测 WASM 原作行为，后续工作必须先建立 C++/WASM headless 接口或统一规则数据源，再实现状态映射、确定性种子和 golden replay 比对。
- 不加载任意外部插件代码；扩展接口只接受应用内注册模块。

### 4.3 本地资源和存档

- main.pak 与 properties/ 通过文件选择、目录选择或 ZIP 导入。
- 资源只写入页面当前运行时的内存文件系统；刷新后重新导入，不永久存放原始游戏资源。
- 游戏存档由 WASM IDBFS 在当前 origin 的 IndexedDB 中同步；站点部署不接触存档内容。
- 使用上游自带的存档导入/导出 ZIP 做备份；浏览器数据被清理后只能从备份恢复。
- 完整自动化游戏体验测试需资源文件。CI 不使用来历不明的原版文件，也不声称通过假数据启动完整游戏。

## 5. 依赖、仓库和部署

| 类别 | 当前依赖/约束 | 用途 |
|---|---|---|
| 游戏运行时 | PvZ-Portable 0.2.5 WebAssembly，含 SDL/WASM 构建 | GOTY 原作兼容流程与游戏逻辑 |
| ZIP 读取 | JSZip 3.10.1，随附 MIT license | 本地资源/存档 ZIP |
| 页面外壳 | @wishflow/site-shell | 公共导航、语言状态和页脚 |
| 构建 | TypeScript + Vite + 独立 pnpm lockfile | 静态构建输出到应用 dist/ |
| 规则单测 | Node 内置 node:test + tsx | TypeScript 模拟原型和资产 manifest 校验 |
| 浏览器回归 | Playwright | 对生产预览页面进行同源 WASM 加载、导入控件和横屏测试 |
| 部署 | 现有 apps/catalog.json 与 .github/workflows/pages.yml | 发布到 /plants-vs-zombies/，不新增 Cloudflare 资源 |

应用必须提供 install.sh、build 和 test:ci 入口；workflow 使用仓库统一 pnpm 版本。部署前确认 dist 包含运行时目录，gzip 和缓存策略由现有静态站点流程管理。

## 6. 实施工作包

| 工作包 | 内容 | 验收依据 |
|---|---|---|
| A. 固定运行时 | 下载上游 WASM Release，校验 ZIP 哈希，固定 JSZip，保留许可和补丁说明 | manifest 与真实文件哈希一致；无原版游戏资源进入 Git |
| B. 页面切换 | 共享站点壳内直接嵌入 WASM 页面，移除原手绘菜单、伪战场和 Phaser 依赖 | 页面无旧自制游戏入口；线上访问 /plants-vs-zombies/ 加载同源 WASM |
| C. 本地资源流程 | 用户选择 ZIP/目录，运行时校验 main.pak/properties/ 并启动；不上传、不持久化原始资源 | Playwright 使用最小临时 ZIP 检查导入 UI；网络请求无外站 CDN/上传端点 |
| D. 存档与许可 | 运行时沿用 IndexedDB 和存档 ZIP；发布 LGPL/GPL、JSZip MIT、source links 和 notices | 许可证可通过部署页面的 footer 链接访问，产物检查全部文本存在 |
| E. 模拟层保留 | 保留 TypeScript headless core、稳定 IDs、seeded RNG、注册表/事件钩子 | Node 单测保持通过；无界面 API 不依赖 window、DOM 或 Phaser |
| F. 质量验证 | 单测、生产构建、Playwright 生产预览、仓库 catalog/site build | CI 全绿；dist 能从应用子路径加载 HTML/JS/WASM |
| G. 合并发布 | 清理分支差异，提交并合入最新 master，git push origin master，等待既有 workflow 完成 | 公开工作流成功；线上桌面和手机横屏访问、WASM 加载及资源导入 UI 实测 |
| H. 真实资源人工冒烟 | 在浏览器选择测试者合法持有的 GOTY 文件，实际启动标题页、选关、模式和存档 | 真实游戏启动与关键流程通过；测试资源不进入仓库或公开站 |

## 7. 测试框架与覆盖

| 层级 | 工具 | 覆盖内容 |
|---|---|---|
| 运行时工件 | Node node:test | release 版本、SHA-256、JSZip 本地引用、许可证通知和文件存在性 |
| 模拟模型 | Node node:test + tsx | 注册约束、数值校验、seeded replay、事件钩子与现有规则行为 |
| 浏览器端到端 | Playwright + Vite Preview | 实际 dist 同源路径、WASM 初始化、ZIP 文件导入标记、外部 CDN 零请求、横屏视口 |
| 仓库集成 | test:catalog、共享 build:site | app slug、页面路径和 _site 发布目录 |
| 线上验收 | Codex 内置浏览器 | 公网页面可用、license links、runtime assets HTTP 响应；上传真实资源后的手动运行 |

当前自动化测试不能证明没有资源文件时游戏画面正确，也不能覆盖完整 GOTY 通关路径。提交线上版本前必须明确记录这一限制；真实资源人工冒烟应使用测试者本地文件，不上传、不提交。

## 8. 当前阶段验收与交付门槛

以下均需以本地命令输出、CI 记录或真实线上浏览器行为为证：

- [x] pnpm run test:ci 通过：50 个 Node 单测和 2 个 Playwright 生产预览测试通过。
- [x] 仓库 test:catalog（14 项）与 build:site 通过。
- [x] 所有发布运行时文件与许可证都进入 _site/plants-vs-zombies/portable/。
- [x] git diff --check 通过，PvZ 变更提交为 a1dbfc8 并合入最新 master。
- [x] 裸 git push origin master 成功；Pages workflow run 38567893266 结论为 success。
- [x] 公网浏览器加载资源导入界面；页面、HTML、JS、WASM（7,212,747 字节）和 LGPL 许可证均返回 HTTP 200。
- [ ] 使用真实游戏资源启动原作标题/菜单和至少一个实际关卡；若用户未提供本地资源，线上“真实游戏画面”这一项保持未验证，不能报告为完成。

## 9. 风险和处理

| 风险 | 影响 | 处理 |
|---|---|---|
| 玩家未持有 GOTY 资源 | 页面只能停留在资源导入界面 | 明确导入格式与本地处理；不通过公开镜像提供原版文件 |
| WASM 运行时仍有与原版不一致之处 | 不能承诺每一帧、每个 bug 或所有平台版本完全一致 | 固定上游版本；引用其版本支持清单；用真实游戏流程验证，不宣称官方版本 |
| 手机游戏体验 | 上游维持 4:3 和 mouse-style 输入，触控人体工学未优化 | 横屏首选；验证操作命中；实际 UX 局限写入 README |
| IndexedDB 数据丢失 | 用户进度由当前浏览器 origin 管理，无云同步 | 提供上游存档 ZIP 导出/导入说明；不宣称跨设备同步 |
| WASM 上游 LGPL 条款 | 需要随包保留许可证、源码链接和修改说明 | 发布原文本、版本/源码指针和 JSZip 独立 MIT notice |
| TypeScript 模拟层与 C++ 游戏规则不一致 | 未来模拟结果不能直接作为原版平衡证据 | 明确隔离；后续开发 headless adapter/共享数据源和跨运行时一致性用例 |
| 部署挂载路径错误 | WASM 或静态文件 404 | 相对路径构建；Playwright 用 Vite Preview 验证；线上检查所有资产 URL |

## 10. 参考来源

- [Steam：Plants vs. Zombies GOTY Edition](https://store.steampowered.com/app/3590/Plants_vs_Zombies_GOTY_Edition/)
- [PvZ-Portable 0.2.5 源码](https://github.com/wszqkzqk/PvZ-Portable/tree/0.2.5)、[Release](https://github.com/wszqkzqk/PvZ-Portable/releases/tag/0.2.5)、[README](https://github.com/wszqkzqk/PvZ-Portable/blob/0.2.5/README.md)
- [Patoke/re-plants-vs-zombies](https://github.com/Patoke/re-plants-vs-zombies)
- [FregD156/PvZ_Assets](https://github.com/FregD156/PvZ_Assets)
- [JSZip 3.10.1](https://www.npmjs.com/package/jszip/v/3.10.1)
- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology)
- 仓库约定：[AGENTS.md](../AGENTS.md)、[site-shell](../packages/site-shell/README.md)、[simulation-testkit](../packages/simulation-testkit/README.md)、[Pages workflow](../.github/workflows/pages.yml)
