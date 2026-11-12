# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮先核对当前代码与证据，再细化接下来几个可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- 正式战役已接入 14/60 关。Traveller’s Town、Steam Valley、Golden River、Riverside Mountains 分别是 Mississippi 区域第 11–14 关，对应 `res/raw/td_map_14.tdm` 至 `res/raw/td_map_17.tdm`；不能根据关卡编号推测地图文件编号。
- Traveller’s Town 批次已发布到 `master`：提交 `b6e05ca20a2d04bc1939ea82d4656842404ce9db`，Actions `43018344472` 成功。GitHub Pages 和 Cloudflare Pages 的 `build-info.json` 均与该 SHA 一致。
- Steam Valley 已完成并发布：真实 map15、路线/桥和静态对象、单位/汽船、七波、对白与资源、正式关卡 12、Free Play 三种难度，以及按录制解锁状态还原的回放。发布提交 `8baa286ed32f4266e0636e1cfd1152a42c42caf1`，Actions `43152356792` 成功；GitHub Pages 和 Cloudflare Pages 的 `build-info.json` 均报告该 SHA。
- 最终 `CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci` 通过：584 项单测、TypeScript 检查、生产构建和 137 项 E2E。构建有 1.488 MB JavaScript chunk 超过 500 KB 的提示。
- 内置浏览器在静音、窗口模式分别检查实验室告示牌样式，以及公开版 Free Play → Mississippi → Steam Valley → Easy → Captain 开场对白 → 第一波。地图、两艘汽船与 `01/07` HUD 正常显示；未完整手动通关。
- 本次普通发布后比例为 16 次 / 81 个已验收实现切片（19.75%），低于 20% 目标。
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
- M14 发布后累计发布比例为18/90（20.0%）；下一关尚未排期，新一轮先基于当前代码和证据细化实施步骤。
- M14 回同步已完成：集成提交 `86548d1` 已推送到 `origin/gunsnglory`，并已快进原主工作树；`master` 与 `origin/master` 均为发布提交 `ebf35d3`，gunsnglory 本地与远端均含 M14。主工作树原有未跟踪研究文档保留未改。

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
