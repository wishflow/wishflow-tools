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
- M13-B 对象与解锁快照切片通过：创建 2 组 Steamer（12 部件）、code107 Indian、按第50/60关里程碑出现的 Pyromaniac/Salesman；新开局忽略 map16 的存档专用 marker 96–101。回放版本可往返记录两个解锁位。定向测试与 M12 汽船/单位回归共 9 项通过。下一步从关卡规则、波次和对白资源开始。

## 后续工作

### M13 Golden River 接入批次

批次目标是将 APK 的 map16 关卡完整接入正式战役、Free Play 和回放。按四个可独立验证的实现切片执行；每个切片先跑定向测试并本地提交，然后更新本计划、关闭已完成项并核对后续范围。四个切片全部通过后再执行一次 `pnpm run test:ci`，不逐切片重复全套检查。

| 顺序 | 切片 | 实施范围 | 定向验收 |
| --- | --- | --- | --- |
| M13-C（当前） | 关卡规则、九波、对白和资源 | 先沿用 M11/M12 已验证的规则与资源模式；按 map16 静态审计接入初始现金/生命/升级上限、宝箱配置、HP 难度倍率、全局敌人规则、9 波及 20 个请求、9 段 APK 英文对白/中文译文/头像/语音引用与 Mississippi 音乐；扩展资源预加载清单。不要引入 `awesomeMessageMin` 未知消费者的行为。 | 逐字段比对九波结构、十槽请求、延迟/HP/速度、出生点、波间隔、零玩家生成池动作与审计；核对初始参数、对白顺序、头像和音频资源映射；针对性测试检查预加载清单能收集所有新增资源。保持静音。 |
| M13-D | 正式关卡、Free Play、回放与浏览器入口 | 登记 `campaign-mississippi-13`，接入正式关卡13并依赖关卡12；使 Free Play 与回放注册能构造相同内容版本；正式结算推进进度，Free Play 不影响正式档案。 | 自动化验证关卡12后解锁13、此前锁定、正式/自由模式结算隔离、全部三种自由难度、回放快照重建及第1波入口。内置浏览器窗口模式静音检查选关、Golden River 关卡说明、开场对白、首波地图和资源错误面板。 |

#### 批次门槛与发布

- M13-A 到 M13-D 的内容预期均来自 [M13 静态审计](map13-static-audit.md) 和应用消费代码。若发现数据冲突，先追到 APK 的实际消费者并更新审计，不得以地图相邻编号猜参数。
- 每个切片只运行其定向测试并提交；批次收尾运行 `CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci`。若共享调用测试需要独立端口，记录实际端口并保持串行。
- 4 个 M13 实现切片加一次普通发布，将累计比例从 16/81 变为 17/85（20.0%）；不得额外增加无范围切片。静态文档审计不计入实现分母。
- 整批通过后将四个切片 squash 集成为一个 `master` 发布提交，推送并等待 Pages workflow 完成；核对公开 `build-info.json` 来源 SHA，再用内置浏览器验证公开关卡。随后按应用分支约定将发布提交合回 `gunsnglory` 并同步相关工作树。任何测试、Actions、SHA 或公开浏览器验收未完成时都不报告发布完成。
- 本批默认窗口模式、静音，不启动 Android，不完整手动通关；浏览器只进行选关和首波代表流程验收。

M13 上游关卡数据以 map16 清单为准。`awesomeMessageMin=30000` 的消费者仍未知，M13 不新增依赖其语义的功能；前一关来源与边界见 [M12 静态审计](map12-static-audit.md)。
