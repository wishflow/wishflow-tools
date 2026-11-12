# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮先核对当前代码与证据，再细化接下来几个可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- 公开版正式战役仍为第18/60关。M19-A–F 已在当前开发分支完成 Dust Falls（`res/raw/td_map_22.tdm`）静态审计、地图/路线、地图对象/初始单位/Tipi、初态/波次/Indian 池规则、双语内容、正式/自由模式、回放和菜单入口回归；批次完整本地检查通过，尚待 M19-R1–R3 集成发布、部署验收和回同步。Mississippi 第 11–19 关依次为 Traveller’s Town、Steam Valley、Golden River、Riverside Mountains、Railroad Canyon、Highpoint Terrace、Dead Rocks、Shadow Town、Dust Falls，对应 `res/raw/td_map_14.tdm` 至 `res/raw/td_map_22.tdm`；不能根据关卡编号推测地图文件编号。
- Mississippi 第17关 Dead Rocks 已完成并发布。地图、路线、对象/单位、八波、双语内容、正式战役、Free Play、结算和回放均已接入；M11–M16 的新局可招募标记语义及旧回放兼容也已修正。静态证据见 [M17 静态审计](map17-static-audit.md)。
- M17 发布提交 `4ca738c2bf01d2bc6d6e565cfd2a117d33b37aa5`；GitHub Actions `43246826051` 成功，GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均报告该来源 SHA。内置浏览器静音、窗口模式从 Free Play → Mississippi → Dead Rocks → Medium 进入，地图、Settlers 开场对白和 `1/8` 波次 HUD 正常；未完整手动通关、启动 Android、进入全屏或播放声音。
- M17 批次完整检查 `CI=1 PLAYWRIGHT_PORT=43027 pnpm run test:ci` 通过：TypeScript、661 项单测、生产构建及147项 E2E。发布后累计普通发布比例为21次/105个已验收实现切片（20.0%）。回同步已完成：合并提交 `fcf622e376c34ab0efff7a4c5a6705f0f4fa4c24` 已推送至 `origin/gunsnglory`；M18 后续结果见 Shadow Town 完成条目。
- Traveller’s Town 批次已发布到 `master`：提交 `b6e05ca20a2d04bc1939ea82d4656842404ce9db`，Actions `43018344472` 成功。GitHub Pages 和 Cloudflare Pages 的 `build-info.json` 均与该 SHA 一致。
- Steam Valley 已完成并发布：真实 map15、路线/桥和静态对象、单位/汽船、七波、对白与资源、正式关卡 12、Free Play 三种难度，以及按录制解锁状态还原的回放。发布提交 `8baa286ed32f4266e0636e1cfd1152a42c42caf1`，Actions `43152356792` 成功；GitHub Pages 和 Cloudflare Pages 的 `build-info.json` 均报告该 SHA。
- 最终 `CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci` 通过：584 项单测、TypeScript 检查、生产构建和 137 项 E2E。构建有 1.488 MB JavaScript chunk 超过 500 KB 的提示。
- 内置浏览器在静音、窗口模式分别检查实验室告示牌样式，以及公开版 Free Play → Mississippi → Steam Valley → Easy → Captain 开场对白 → 第一波。地图、两艘汽船与 `01/07` HUD 正常显示；未完整手动通关。
- M15 发布后累计普通发布比例为 19 次 / 95 个已验收实现切片（20.0%）；M16 发布后为 20/100（20.0%）。
- M18 静态证据已复核：Shadow Town 是正式战役第18关，使用 `res/raw/td_map_21.tdm`；地图含六个敌人入口、六个出口、两个 Saloon、一个 Fort、一对 Dynamite 对象及 wave 2 玩家单位池动作。来源与实施门槛见 [M18 静态审计](map18-static-audit.md)。
- M19 静态审计已完成；Dust Falls 使用 `res/raw/td_map_22.tdm`，空间、地图对象、8波、Indian Tipi 单位池、双语内容与解锁证据见 [M19 静态审计](map19-static-audit.md)。
- Golden River（M13）静态审计通过：对应 `td_map_16.tdm`；完整内容、路线、船组、单位解锁和对话证据见 [M13 静态审计](map13-static-audit.md)。无需 Android 定点运行。
- M13-A 地图切片通过：map16 网格、Mississippi 地形和桥层、code76 bush、4 条实际路线均与 APK 派生证据一致；M12 路线回归通过。
- M13-B 对象与解锁快照切片通过：创建 2 组 Steamer（12 部件）、code107 Indian、按第50/60关里程碑出现的 Pyromaniac/Salesman；新开局忽略 map16 的存档专用 marker 96–101。回放版本可往返记录两个解锁位。定向测试与 M12 汽船/单位回归共 9 项通过。
- M13-C 关卡内容切片通过：初始参数、全局敌人表、九波/20 个生成请求、九段对白与 Mississippi 音乐路由已接入；场景图片加入启动预加载集合。13 项内容/地图/单位/音乐定向测试和 TypeScript 检查通过。声音保持关闭；音频只核对文件格式和引用，未作试听。
- M13-D 正式入口切片通过：Golden River 登记为 level 13 并依赖 Steam Valley；正式战役、Free Play 与回放均使用已保存的解锁快照，正式胜利写入进度，Free Play 不写入正式档案。英文/中文关卡说明、胜利标题、对白与资源错误状态已接通。定向 TypeScript 检查、115 项相关单测及 6 项受影响浏览器测试通过；后者覆盖自由模式直达、正式解锁状态、首波对白和资源加载。
- M13 批次完整检查通过：`CI=1 PLAYWRIGHT_PORT=4206 pnpm run test:ci` 完成 TypeScript 检查、599 项单测、生产构建及 139 项 E2E。构建仍提示 1.59 MB JavaScript chunk 超过 500 KB（gzip 213.57 KB）；未为本批加入无关代码拆分。
- M13 已 squash 发布到 `master`：提交 `d35678a7c4cdbed699a1e8cc73dc3a424385d5d5`，GitHub Actions `43165717255` 成功。GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均报告该 SHA。
- 内置浏览器在静音、窗口模式验收公开版 `?release=d35678a`：Free Play → Mississippi → Golden River（13）→ Easy 可进入；标题、地图、`FREE PLAY · MISSISSIPPI · 13` 标识和 Settlers 第 1/9 波开场对白正常显示。未手动推进战斗或完整通关。
- M13 发布后累计发布比例为 17 次 / 85 个已验收实现切片（20.0%）。
- 发布回同步已完成：合并提交 `08a68b7` 将 `d35678a` 纳入 `gunsnglory` 历史并已推送；本地主工作树已快进至远端状态，原有未跟踪研究文档保留且未改动。
- Riverside Mountains（M14，Mississippi 第14关）已接入并发布，地图来自 `td_map_17.tdm`；地图、路线、静态对象、单位、七波、Fort Cannon 炮池、双语对白、正式进度、Free Play 与回放均已完成，证据见 [M14 静态审计](map14-static-audit.md)。
- M14 批次完整检查 `CI=1 PLAYWRIGHT_PORT=4204 pnpm run test:ci` 通过：TypeScript、614 项单测、生产构建和141项 Playwright E2E；主 JS chunk 约1.70 MB（gzip 221.45 KB）的预算提示不阻塞验收。
- M14 发布提交 `ebf35d38356d622b2f3e6427e36ff0eea68e84a9`，Actions `43184402532` 全部成功；GitHub Pages 与 Cloudflare Pages 的根 `build-info.json` 均报告该来源 SHA。内置浏览器静音、窗口模式实测 Free Play → Mississippi → Riverside Mountains（14）→ Easy，能显示 Settlers 开场对白、地图及第1/7波；未完整手动通关或启动 Android。新档正式战役中第14关因前置未完成保持锁定，符合解锁规则，正式解锁与结算由自动化覆盖。
- M14 发布后累计发布比例为18/90（20.0%）；下一关已确认是 Mississippi 第15关 Railroad Canyon，使用 `res/raw/td_map_18.tdm`；静态审计见 [M15 静态审计](map15-static-audit.md)。
- M14 回同步已完成：集成提交 `86548d1` 已推送到 `origin/gunsnglory`，并已快进原主工作树；`master` 与 `origin/master` 均为发布提交 `ebf35d3`，gunsnglory 本地与远端均含 M14。主工作树原有未跟踪研究文档保留未改。
- M15-A 地图切片通过：map18 网格、地形、路线、出口、静态对象、铁路和初始单位均与 APK 派生索引核对；相关 M13–M15 定向地图测试9项通过。
- M15-B 关卡规则切片通过：初始 $365、20 条生命、3 次升级、三档 HP 倍率、9波/32个生成请求及 Saloon 招募池接入；真实 `GameSession` 初态和波次推进定向测试通过。
- M15-C 内容和正式入口切片通过：双语介绍、胜利标题、九段对白、离线肖像/语音、level15 前置解锁、Free Play 三档难度、contentVersion 与回放解锁快照接入；正式胜利写入进度，Free Play 不改战役档案。
- M15-D 及本地批次验收通过：Free Play 与正式战役入口均显示 Railroad Canyon、开场对白和 `1/9` HUD；完整 `CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci` 通过 TypeScript 检查、630项单测、生产构建和143项 E2E。构建提示主 JS chunk 1.81 MB 超过500 KB（gzip 229.48 KB），未为本批加入额外拆包。
- M15 发布提交 `62905bb5af8e387e44752dbdb8a05399bb7151df` 已推送到 `master`；GitHub Actions `43199072558` 所有适用 job 成功。GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均报告该 SHA。
- 内置浏览器静音、窗口模式验证公开版 `?release=62905bb`：Free Play → Mississippi → Railroad Canyon（15）→ Medium；Settlers 开场对白及 `01/09` HUD 正常显示。仅检查关卡入口和首波状态，未完整通关或启动 Android。
- M15 发布后累计普通发布比例为19/95（20.0%）。回同步提交 `3abedce` 已推送至 `origin/gunsnglory`，包含发布提交 `62905bb`。

## 活动批次：Dust Falls（M19）

目标是将 APK 的 Mississippi 第19关 Dust Falls 接入既有地图、规则、正式战役、Free Play 与回放。公开版仍为18/60；不能仅因目录已预留 `mapFileNumber: 22` 就认为关卡已实现。依据与未解决边界见 [M19 静态审计](map19-static-audit.md)。每片按顺序实现、跑定向检查、本地提交并更新本计划；除非证据或回归要求，不重做 M11–M18 已通过的地图和共享规则。

| 顺序 | 切片 | 实施范围 | 可判定验收 |
| --- | --- | --- | --- |
| M19-A（已完成） | APK 派生静态审计 | 交叉核对 map22 网格/路线/绘制、marker、level index18、波次原始调用、池动作、字符串及资源引用；记录 facts、适用边界与未确认项。 | TDM 身份与维度可追溯；所有路线节点从入口可达且各出口有有效路径；8波/24条 `addToWave` 按源调用分组，4波池动作参数按 DEX 语义解释；Markdown 链接与 `git diff --check` 通过。 |
| M19-B（已完成） | 地图、地形、路线 | 接入 APK 原始 TDM、Mississippi 地形/街道/水域与桥墩绘制；从真实 marker 生成敌人入口、路线和出口，并显式映射 APK action ID 与网页 `spawnPointId`。产物为 `public/content/maps/td_map_22.tdm`、`mississippi-19.json`、路线与场景模块。 | 770字节 SHA-256 与静态审计一致，地图为32×24；绘制层由 APK 网格复算，含11条横桥、4条竖桥和14个桥墩命令；路线测试逐边比对42个控制节点、41条有向边、4个入口、34个 redirector、4个出口和7条完整路径。`node --import tsx --test tests/mississippi-18-map.test.ts tests/mississippi-19-map.test.ts` 通过8项；`pnpm run typecheck` 通过。 |
| M19-C（已完成） | 地图对象、初始单位与 Tipi | 按 DEX/Smali 消费 code96–101、105、114、130、131；96–101 在新局生成 activity4 招募单位，105 生成活动 Mexican；在 Mississippi 场景绘制 Tipi；按 global 30/40/50/60 解锁 Grandpa、Sniper、Pyromaniac、Salesman。为只有 Tipi、没有 Saloon/Fort 的 Indian 池提供独立模板。同时修正 M18 工厂仍过滤 fresh-game marker 的已证实偏差；M18 新内容升为 v2，旧 v1 回放保留原单位列表。 | M19 marker 与生成实体逐格对应：8 Gunslinger、6 Mexican、4 Indian、1 Sniper、3 Grandpa 招募 marker（后两类受里程碑门控）、2名活动 Mexican、Pyromaniac/Salesman 解锁点；无假摆放活动单位；锁定、全解锁和重复类型场景均无重复 ID；Tipi 是唯一 type-3 生成点。M18 v2 逐 marker 创建 Mexican/Indian 招募单位并按里程碑门控 Sniper/Grandpa；v1 回放不新增这些单位、仍恢复原 special hires 与 Dynamite 快照。复用现有 `CampaignUnitPoolDefinition.template`，不改公共 `Game` API。M18/M19 内容、规则、实体、正式回放及地图定向测试26项通过；`pnpm run typecheck` 通过。 |
| M19-D（已完成） | 初态、8波与单位池规则 | 加入 `$365`、15生命、3级升级、三档 HP 倍率及 level-config 的奖励箱参数；逐行录入8波、24个请求、间隔/延迟/倍率，以及 wave4 Indian 池 count2/max4 和共享15秒派发周期。 | `GameSession` 初态与奖励箱设置、全部 wave metadata、24条8类型请求向量、4个 APK action ID 映射及两个 pool action 与 APK 派生数据逐项相等；短会话真实生成 Indian，并证明模板不进入初始场景单位列表。M18/M19 内容、规则、实体、正式回放及地图定向测试29项通过；`pnpm run typecheck` 通过。 |
| M19-E（已完成） | 文案、目录、正式/自由模式与回放 | 加入 Dust Falls 身份、双语简介/胜利标题、8段对白及头像/声音资源；开放正式 level19（依赖18）和 Mississippi Free Play；建立记录 Grandpa、Sniper、Pyromaniac、Salesman 四个全局解锁状态的内容版本及回放工厂。 | map22 缩略图、对白头像/音频均可离线读取；正式第19关依赖 Shadow Town；Free Play 三档难度可进入，且结算不改正式档案；正式胜利写入第19关；四个解锁位的16种组合均经内容版本往返并通过 GameSession 核对招募单位；未知版本不解析为已解锁状态。M19 内容与正式/回放定向测试5项通过，`pnpm run typecheck` 通过。 |
| M19-F（已完成） | 入口回归与批次收尾 | 新增 Dust Falls Free Play 与正式战役菜单 E2E：Free Play 检查 19 可进入、20 禁用；正式模式先以仅完成 M17 的档案验证 19 锁定，再以完成 M18 的档案验证 19 解锁。只更新 M19 引起的 Mississippi Free Play 数（8→9）、目录长度和进度摘要分母（18→19）、19/20 关按钮状态及正式目录快照，不改不相关内容。E2E 保持静音、窗口模式，不完整通关、不启动 Android。 | 两条 E2E 都从真实菜单开始；核对 M19 标题、`gng_levelmap_22.png` 缩略图、16:9 游戏画布、192×144 minimap、开场对白/头像、已加载地图资源与 `1/8` HUD；正式模式分别断言 19 锁定与解锁，Free Play 断言 19 启用、20 禁用。完整 `CI=1 PLAYWRIGHT_PORT=43129 pnpm run test:ci` 通过：TypeScript、695 项单测、生产构建和151项 E2E；构建提示主 JS chunk 为2.239 MB（gzip 258.12 KB），本批未加入无关拆包改动。 |
| M19-R1 | squash 集成与发布 | 将通过完整检查的 M19 批次 squash 集成到 `master` 并按现有静态站流程推送。 | Actions 适用检查和部署成功；本地 `master`、远端 `origin/master` 与预期发布提交一致。 |
| M19-R2 | 部署与浏览器验收 | 核对部署 `build-info.json` 来源 SHA；使用 Codex 内置浏览器静音、窗口模式验收一条 Free Play 入口和一条正式进度状态。 | GitHub Pages、Cloudflare Pages 来源 SHA 均与 M19 发布提交一致；线上 Dust Falls 地图、Tipi、对白和 `01/08` HUD 正常；不手动通关或启用全屏/声音。 |
| M19-R3 | 回同步至集成分支 | 将已发布 master 合并回 `gunsnglory` 并推送，核对相关工作树与远端。 | `origin/gunsnglory` 包含发布 SHA；主工作树与该远端同步，未覆盖其他工作树现场。 |

### M19-F 完成结果

- Free Play 与正式战役均从真实菜单进入 Dust Falls；正式关卡在仅完成第17关时保持锁定，完成第18关后开放；Free Play 可选择第19关且第20关禁用。
- 两条入口 E2E 核对关卡标题、Map 22 缩略图、16:9 游戏画布、192×144 minimap、首波对白/头像、地图资源加载和 `1/8` HUD；未完整通关、未启动 Android，测试保持静音与窗口模式。
- 批次检查命令 `CI=1 PLAYWRIGHT_PORT=43129 pnpm run test:ci` 通过 TypeScript、695 项单测、生产构建和151项 E2E。构建报告主 JS chunk 为2.239 MB（gzip 258.12 KB），超过500 KB chunk 提示；本批不包含代码拆包范围。
- 当前完成范围仅覆盖 M19-A–F；公开版仍为18/60。M19-R1–R3 的集成发布、线上来源 SHA 核验、内置浏览器验收及回同步尚未完成。

## 最近完成：Railroad Canyon（M15）

M15 已完成本地实现、整批检查、squash 发布、部署 SHA 核验和内置浏览器验收。静态数据来源及关卡证据见 [M15 静态审计](map15-static-audit.md)。

| 顺序 | 切片 | 结果 |
| --- | --- | --- |
| M15-A | map18 地图、路线、静态对象与场景单位 | 已完成；TDM 网格和 APK 派生索引核对，出生点、转向点和出口可达性通过定向测试。 |
| M15-B | 初始数值、九波、生成请求与招募池 | 已完成；真实 `GameSession` 短会话验证初态和波次推进。 |
| M15-C | 双语对白、关卡解锁、Free Play、结算与回放 | 已完成；正式档案边界、特殊单位解锁快照和回放路径通过测试。 |
| M15-D | 真实入口 E2E、旧关卡计数回归与完整检查 | 已完成；630项单测、TypeScript、生产构建和143项 Playwright E2E 通过。 |
| M15-R1 | squash 到 `master` 并发布 | 已完成；发布提交 `62905bb5af8e387e44752dbdb8a05399bb7151df`，Actions `43199072558` 成功。 |
| M15-R2 | 部署来源 SHA 与浏览器验收 | 已完成；两处 Pages 的 `build-info.json` 与发布 SHA 一致；内置浏览器看到 Railroad Canyon 的 Settlers 开场对白及 `01/09` HUD。 |
| M15-R3 | 发布回同步至 `gunsnglory` | 已完成；集成提交 `3abedce` 已推送至 `origin/gunsnglory`，并包含发布提交 `62905bb`。 |

## 最近完成：Highpoint Terrace（M16）

Highpoint Terrace（Mississippi 第16关）已接入正式战役、Free Play 和回放。预期数据以 [M16 静态审计](map16-static-audit.md) 及应用实际消费代码为准；无需 Android 运行或完整手动通关。

| 顺序 | 切片 | 实施范围与结果 |
| --- | --- | --- |
| M16-A | 地图、路线与实体 | 接入 APK 对应的 map19、地形、路线、静态对象和初始单位；与静态审计及路线测试核对通过。 |
| M16-B | 波次、炮池与单位 | 接入八波生成、关卡炮池、Dynamite 与关卡单位；Cannon 使用现有单位池模板契约生成，没有伪造地图单位。定向规则和实体测试通过。 |
| M16-C | 关卡内容与正式入口 | 接入双语关卡信息、对白、正式解锁和结算、Free Play 与回放；正式进度与自由模式档案边界通过测试。 |
| M16-D | 入口回归与完整检查 | 正式战役第16关依赖第15关，Mississippi Free Play 开放六关，第17关及之后保持禁用。CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci 通过 TypeScript、645 项单测、生产构建和145项 E2E；构建有主 JS chunk 超过500 KB的预算提示，本批未做无关拆包。 |
| M16-R1 | 集成发布 | 已 squash 推送至 master：f0ea3060de5fadc9cd337ee782581a50d73fef26。GitHub Actions 43211885210 的适用 CI 与 Pages 部署均成功。 |
| M16-R2 | 部署与浏览器验收 | GitHub Pages 与 Cloudflare Pages 根 build-info.json 均报告来源 SHA f0ea3060de5fadc9cd337ee782581a50d73fef26。内置浏览器以静音、窗口模式从 Free Play → Mississippi → Highpoint Terrace → Easy 进入，显示开场对白、地图及第1/8波；未完整通关或启动 Android。 |
| M16-R3 | 回同步至集成分支 | 已完成；合并提交 412605c 将发布提交并回 gunsnglory，且已推送至 origin/gunsnglory。原主工作树已与远端一致，未跟踪研究文档原样保留。 |

M16 发布后累计普通发布比例为20/100（20.0%）。批次已关闭：master 与 origin/master 为发布提交 f0ea306，gunsnglory 与 origin/gunsnglory 均包含该发布提交；回同步提交为 412605c，原主工作树未跟踪研究文档已保留。

## 最近完成：Dead Rocks（M17）

Dead Rocks 使用 APK 的 `res/raw/td_map_20.tdm`，作为 Mississippi 第17关接入正式战役、Free Play 和回放。静态数据、路线与关卡参数见 [M17 静态审计](map17-static-audit.md)。

| 顺序 | 切片 | 实施范围与结果 |
| --- | --- | --- |
| M17-A | 地图、地形与路线 | 接入32×24地图、Mississippi地形/桥面、静态对象，以及6个出生点、53个转向点、4个出口；74条有向路线边与 APK 派生图逐项核对。 |
| M17-B | 初始实体与解锁 | 按新局 marker 创建地图单位和可招募单位；恢复 M11–M16 的 code96–101 新局单位，旧 v1 回放仍按录制单位列表重建。 |
| M17-C | 规则与关卡内容 | 接入初始经济、生命、升级上限、三档难度、8波/35个生成请求、双语介绍与对白、音乐路由及资源预加载；未创建 APK 不存在的 Fort/Cannon 或赌场对象。 |
| M17-D/E | 正式登记与入口回归 | 登记为 global level 17，接入正式解锁、Free Play、结算和回放解锁快照；同步全局关卡目录、Progress 快照及旧关卡回归。 |
| M17-F1 | 完整检查中的快照修复 | 修复四处旧测试目录/Progress 期望仍停在16关的问题；不改运行时进度逻辑。 |
| M17-F2 | 批次发布与验收 | `CI=1 PLAYWRIGHT_PORT=43027 pnpm run test:ci` 通过 TypeScript、661项单测、构建及147项 E2E。发布提交 `4ca738c2bf01d2bc6d6e565cfd2a117d33b37aa5` 的 Actions `43246826051` 成功；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配。内置浏览器静音、窗口模式进入 Free Play → Mississippi → Dead Rocks → Medium，地图、开场对白及 `1/8` HUD 正常；未完整通关、启动 Android、进入全屏或播放声音。 |
| M17-F3 | 发布回同步至集成分支 | 将 `master` 发布提交并回 `gunsnglory`，保留 M13–M16 既有集成历史。 | 合并提交 `fcf622e376c34ab0efff7a4c5a6705f0f4fa4c24` 已推送至 `origin/gunsnglory`；本地与远端分支一致，并包含 M17 发布提交。 |

M17 发布后累计普通发布比例为21/105（20.0%）。批次已关闭：`master` 与 `origin/master` 为 M17 发布提交，`gunsnglory` 与 `origin/gunsnglory` 均包含该发布提交和回同步合并提交。

## 最近完成批次：Shadow Town（M18）

目标是将 APK 的 Mississippi 第18关 Shadow Town（`res/raw/td_map_21.tdm`）接入现有地图、规则、关卡目录和回放契约。先完成静态数据审计，再按下表顺序逐片实现；每片运行针对性检查、本地提交并同步更新本计划。

| 顺序 | 切片 | 实施范围 | 可判定验收 |
| --- | --- | --- | --- |
| M18-A | 静态审计（已完成） | 整理 map21 的 TDM 身份、地形与路线图、初始实体、地图对象、解锁条件、起始数值、八波、玩家单位池动作、英文字串和资源引用，见 [M18 静态审计](map18-static-audit.md)。 | TDM 摘要与提取字节 SHA 匹配；路由/波次/对象和规则均已交叉核对；action ID 到网页出生点数组下标的差异已明确；Markdown 链接及 `git diff --check` 通过。 |
| M18-B（已完成） | 地图、地形、路线 | 加入原始32×24 TDM 网格、Mississippi 背景与街道、桥层及全部路线控制点；新增 `actionID → row-major spawnPointId` 映射，不改公共 Game 接口。 | 770字节 TDM、768个背景格和73条街道/桥绘制指令匹配 APK 派生数据；768个背景格及道路/桥绘制候选按共享随机流与 terrain index 一致；六个入口、59个转向点、六个出口及72条有向边逐项匹配；验证 `actionID 4/0/1/2/3/5 → spawnPointId 0/1/2/3/4/5`。4项地图测试与 TypeScript 检查通过。 |
| M18-C（已完成） | 地图对象、单位与解锁 | 接入三名初始 Gunslinger、两处 Saloon 和 Fort、Dynamite 配对；修复 Mississippi 共用场景表遗漏的4个 `116` 双格木屋及其碰撞；按全局进度快照显示 marker 130/131。新局忽略 marker 96–101；修复共享单位工厂对多名同类初始角色生成重复 ID 的问题。 | 坐标、数量、贴图、锚点/占格与 TDM/Smali 一致；三名 Gunslinger ID 唯一；Dynamite 完成 global level 20/30 才解锁；Pyromaniac/Salesman 分别遵守第50/60关解锁；不生成存档恢复单位或伪造初始 Cannon。21项 M14–M18 实体/地图定向测试及 TypeScript 检查通过。 |
| M18-D（已完成） | 波次、炮池与数值规则 | 接入 `$425`、20条生命、3级升级上限、三档敌人 HP 倍率、八波/37个敌人生成请求及 wave 2 的 Saloon/Fort 玩家单位池动作。Cannon 与地图没有新局 marker 的 Mexican 使用已有 `template` 契约，不在地图上伪造单位；Mexican 模板由共享 New Mexico 单位工厂导出。 | `GameSession` 初态及全部 wave metadata、APK action ID 到 `spawnPointId` 映射、十槽请求向量、池类型/计数/上限与 `GameDesignWaves` 源调用逐项一致；短会话验证 wave 2 单位池真实生成、Saloon/Fort 坐标和 pool-only Cannon 激活。M18规则5项、地图/实体回归7项及 TypeScript 检查通过。 |
| M18-E（已完成） | 关卡目录、双语与回放 | 新建 `mississippi-18-identity/copy/wave-intros/content-version/campaign` 模块，接入八波对白与肖像、英文原版/中文项目译文、Map 21 图标、正式关卡18及 level17 前置、Free Play、结算与解锁快照回放。沿用 `template` 池契约；不改 `campaignCatalog` 已有的 level18/map21 条目。并修复选关、概览和难度地图按 global level 而非 `mapFileNumber` 取缩略图的问题。 | 正式关卡目录共18项且 Shadow Town 依赖 Dead Rocks；无进度时锁定，完成17解锁；Free Play三档可进入。文本/对白/肖像/声音及 `gng_levelmap_21` 离线资源可用。正式胜利写入 level18，Free Play 不写正式档案；特殊单位与 Dynamite 回放快照通过。M18 内容、正式进度/回放、规则、地图/实体定向测试共18项及 TypeScript 检查通过。 |
| M18-F（已完成） | 入口回归与批次验收 | 添加 Shadow Town 真实入口 E2E；更新只因新增正式关卡或 Mississippi Free Play 可玩关卡数变化而过期的目录/Progress 测试；回归 M17 入口与内容，不重测无关地图功能。 | Free Play 与正式战役分别从选关进入 Shadow Town，检查锁定/解锁、map21 图标、标题、首波对白和 `1/8` HUD；目录计数与阶段快照一致。完整 `CI=1 PLAYWRIGHT_PORT=43125 pnpm run test:ci` 通过：TypeScript、679项单测、生产构建和149项 E2E；本地内置浏览器静音、窗口模式验证 Free Play → Mississippi → Shadow Town → Medium，开场对白和 `01/08` HUD 正常。 |
| M18-R1（已完成） | squash 集成与发布 | 将 M18-A–F 合并为一个发布提交并推送 `master`。 | 发布提交 `5bb027186ea34eec06468c0fb365238c6e33a053`；GitHub Actions `43270314726` 全部适用工作通过，GitHub Pages 与 Cloudflare Pages 均完成部署。 |
| M18-R2（已完成） | 来源 SHA 与公开浏览器验收 | 核对两个 Pages 的 `build-info.json`，并以静音、窗口模式完成 Shadow Town 代表性流程。 | 两个 Pages 的 `sourceSha` 均为 `5bb027186ea34eec06468c0fb365238c6e33a053`；内置浏览器确认 Shadow Town、地图、Pedro 开场对白与 `01/08` HUD 正常。首次加载曾提示一项必需图片失败，重试后恢复；失败资源名称及首次失败原因未知。 |
| M18-R3（已完成） | 发布回同步至集成分支 | 将已发布 master 与最终计划更新合并回 `gunsnglory` 并推送。 | 合并提交 `482cbdd` 将 M18 发布 SHA 纳入 `gunsnglory`；最终计划随本次同步提交，两分支远端均与同一发布历史对齐。 |

### M18-E 完成结果

- 新增关卡身份、双语文案、八波对白、解锁快照版本与关卡组装；接通正式目录、Free Play、结算和 Shadow Town replay factory。
- Campaign 列表、概览和难度页的地图图标统一按目录 `mapFileNumber` 选择；Shadow Town 使用 `gng_levelmap_21.png`，不错误显示 global level 18 对应的图片。
- 验证英文原文、中文译文、八波资源键/肖像/语音、离线 Map 21 图片、正式解锁、三档 Free Play、正式结算、Free Play 档案隔离、四种 Mississippi 解锁位和 Dynamite 回放恢复。
- 定向命令：`node --import tsx --test tests/mississippi-18-campaign-content.test.ts tests/mississippi-18-formal.test.ts tests/mississippi-18-campaign-rules.test.ts tests/mississippi-18-entities.test.ts tests/mississippi-18-map.test.ts`（18项通过）；`pnpm run typecheck` 通过。完整 `test:ci` 留至 M18-F 批次收尾。

### M18-F 实施清单与进度

- **入口 E2E（已完成）：**新增 Shadow Town Free Play 与正式战役入口流程；验证选关、map21 缩略图、概览、难度、首波对白与 `1/8` HUD，不推进完整关卡。IndexedDB fixture 证明完成到第16关时第18关锁定，记录第17关完成后开放；Free Play 不要求战役进度。
- **目录与回归（已完成）：**将旧正式目录长度断言从17更新为18，补齐 Apache Valley、Cow Gulch、Progress 与 Fort Kaboom 的第18关目录/状态快照；将 Mississippi Free Play 可玩数断言从7更新为8，并调整其第18关禁用断言。59项战役目录相关单测通过；修正完整检查发现的3处遗留快照后，Apache Valley、内容清单和 Progress 定向测试共35项通过。M17 及其他 Mississippi 入口回归与 M18 新入口共15项 E2E 通过。
- **批次完整检查（本地已完成）：**最终 `CI=1 PLAYWRIGHT_PORT=43125 pnpm run test:ci` 通过 TypeScript、679项单测、生产构建及149项 E2E。构建仍提示主 JS chunk 为2.137 MB（gzip 251.14 KB），本批没有引入无关拆包改动。首次全量检查暴露了3处单测快照和6项 E2E 进度摘要仍期望17关；已补齐，相关35项单测和6项 E2E 定向复跑通过后，完整检查再次全绿。
- **本地与公开浏览器（已完成）：**静音、窗口模式从 Free Play → Mississippi → Shadow Town → Medium 进入；核对 map21 关卡入口和概览、Pedro 第1波对白、地图与 `01/08` HUD。公开版首次载入提示一项必需图片失败；点击重试后资源加载完成并自动进入 Cow Gulch，之后 Shadow Town 可正常进入。失败资源名称和首次失败原因未能从页面观察中确定，作为部署观察项保留；未完整通关、未启动 Android、未全屏或播放声音。
- 测试默认窗口模式、静音；不完整通关、不启动 Android。完整检查通过后才进入 squash 集成与发布流程。

### M18 批次收尾

- M18-A–F 的实现和本地验收已完成；整批以单个 squash commit 发布至 `master`，GitHub Actions 和两个 Pages 部署均成功。
- 发布来源 SHA 已核对：GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均为 `5bb027186ea34eec06468c0fb365238c6e33a053`。内置浏览器以静音、窗口模式验证 Free Play → Mississippi → Shadow Town → Medium、地图、Pedro 开场对白和 `01/08` HUD。首次页面载入提示一项必需图片加载失败；手动重试后加载成功并自动进入 Cow Gulch，之后 Shadow Town 正常。失败资源和首次失败原因未知，需留作后续部署观察，不影响本次地图已成功显示的结论。
- 发布提交和最终计划已回同步至 `gunsnglory`；`master` 与 `gunsnglory` 远端均包含 M18 发布历史，M18 批次关闭。全程未完整通关、未启动 Android、未进入全屏或播放声音。
## 已完成批次

### M13 Golden River 接入批次

APK 的 map16 关卡已接入正式战役、Free Play 和回放。四个实现切片、批次级完整检查、squash 发布、Pages 来源 SHA 核对、公开浏览器代表流程和集成分支回同步均已通过。

| 顺序 | 切片 | 实施范围 | 定向验收 |
| --- | --- | --- | --- |
| M13-R1 | Squash 集成并推送（已完成） | 将 M13-A 至 M13-D 相对 `origin/master` 的全部成品 squash 为一个 `master` 提交，并执行 `git push origin master`。 | 发布提交 `d35678a7c4cdbed699a1e8cc73dc3a424385d5d5` 已推送；不把单切片提交逐个发布。 |
| M13-R2 | 部署与浏览器验收（已完成） | 等待 Pages workflow；核对公开 `build-info.json` 来源 SHA；使用 Codex 内置浏览器以静音、窗口模式检查 Mississippi 第 13 关入口和开场状态。 | Actions `43165717255` 成功；两个 Pages 来源 SHA 与发布提交一致；Golden River 可进入并显示第 1 波对白。 |
| M13-R3 | 回同步集成分支（已完成） | 将已发布提交及本计划更新合并至 `gunsnglory`，推送远端，并核对相关工作树分支和上游状态。 | `gunsnglory` 本地与远端包含发布 SHA 和本计划；主工作树已快进，既有未跟踪研究文档未改动。 |

#### 批次门槛与发布

- M13-A 到 M13-D 的内容预期均来自 [M13 静态审计](map13-static-audit.md) 和应用消费代码。若发现数据冲突，先追到 APK 的实际消费者并更新审计，不得以地图相邻编号猜参数。
- 每个切片只运行其定向测试并提交；批次收尾运行 `CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci`。若共享调用测试需要独立端口，记录实际端口并保持串行。
- 4 个 M13 实现切片加一次普通发布后，累计比例为 17/85（20.0%）；不得额外增加无范围切片。静态文档审计不计入实现分母。
- 发布与回同步门槛均已通过；M13 批次关闭。后续关卡尚未排期，新一轮开始时先按当前代码和证据细化可执行步骤。
- 本批默认窗口模式、静音，不启动 Android，不完整手动通关；浏览器只进行选关和首波代表流程验收。

M13 上游关卡数据以 map16 清单为准。`awesomeMessageMin=30000` 的消费者仍未知，M13 不新增依赖其语义的功能；前一关来源与边界见 [M12 静态审计](map12-static-audit.md)。
