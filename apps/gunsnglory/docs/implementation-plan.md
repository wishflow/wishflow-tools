# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮先核对当前代码与证据，再细化接下来几个可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- 正式战役已接入 12/60 关。Traveller’s Town 是 Mississippi 区域第 11 关，Steam Valley 是第 12 关；分别读取 `res/raw/td_map_14.tdm` 和 `res/raw/td_map_15.tdm`，不能根据关卡编号推测地图文件编号。
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
- M13 四个实现切片均已完成。首次完整检查在 599 项单测中通过 598 项后发现 `progress.test.ts` 仍只列到第 12 关；该锁定状态断言已补上第 13 关。首次运行未进入构建和 E2E，须在该修正后重跑完整检查。

## 后续工作

### M13 Golden River 接入批次

批次目标是将 APK 的 map16 关卡完整接入正式战役、Free Play 和回放。四个实现切片已按序完成定向验证；接下来只做一次批次级完整检查。若通过，则 squash 集成为一个 `master` 发布提交并核对部署 SHA；若失败，只修复失败项及其针对性测试，再重跑失败项和最终完整检查。

| 顺序 | 切片 | 实施范围 | 定向验收 |
| --- | --- | --- | --- |
| M13 批次收尾（当前） | 完整检查与发布 | 修复锁定关卡清单断言后运行 `CI=1 PLAYWRIGHT_PORT=4206 pnpm run test:ci`；若通过，将 M13-A 至 M13-D squash 为一个 `master` 发布提交并触发站点部署。 | 全部单测、TypeScript 检查、生产构建、E2E 通过；部署来源 SHA 与 squash 提交一致；内置浏览器静音、窗口模式验证 Golden River 选关、首波与资源加载。不完整手动通关。 |

#### 批次门槛与发布

- M13-A 到 M13-D 的内容预期均来自 [M13 静态审计](map13-static-audit.md) 和应用消费代码。若发现数据冲突，先追到 APK 的实际消费者并更新审计，不得以地图相邻编号猜参数。
- 每个切片只运行其定向测试并提交；批次收尾运行 `CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci`。若共享调用测试需要独立端口，记录实际端口并保持串行。
- 4 个 M13 实现切片加一次普通发布，将累计比例从 16/81 变为 17/85（20.0%）；不得额外增加无范围切片。静态文档审计不计入实现分母。
- 整批通过后将四个切片 squash 集成为一个 `master` 发布提交，推送并等待 Pages workflow 完成；核对公开 `build-info.json` 来源 SHA，再用内置浏览器验证公开关卡。随后按应用分支约定将发布提交合回 `gunsnglory` 并同步相关工作树。任何测试、Actions、SHA 或公开浏览器验收未完成时都不报告发布完成。
- 本批默认窗口模式、静音，不启动 Android，不完整手动通关；浏览器只进行选关和首波代表流程验收。

M13 上游关卡数据以 map16 清单为准。`awesomeMessageMin=30000` 的消费者仍未知，M13 不新增依赖其语义的功能；前一关来源与边界见 [M12 静态审计](map12-static-audit.md)。
