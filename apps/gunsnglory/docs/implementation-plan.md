# 实施计划

唯一活动进度见本文件。游戏规则、模块和验证边界分别见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)及[经验记录](experience-log.md)。每轮先核对代码和证据，细化后续步骤；每完成一个切片即更新计划并移除已关闭任务。

## 当前状态

- M32 Loot Lakes（Dakota 第 1 关／全局第 31 关）已发布并回同步到 `gunsnglory`。发布提交 `a14edaa47058a379459e58374828ad7b8f2265d9` 的 Actions `44236563151` 通过；GitHub Pages 和 Cloudflare Pages 的来源 SHA 一致。内置浏览器以静音、窗口模式确认 Free Play → Dakota → Loot Lakes → Medium 的开场对白和地图；未完整通关。
- 当前工作树为 `codex/gng-m33-six-grandfathers`。M33-B 地形与路线、M33-C 初始单位/静态对象/列车/碰撞、M33-D 初态/难度/八波/单位池规则均已完成；M33-E 已接入双语关卡内容、正式/自由入口、档案解锁快照回放、音乐与预载资源。M33-B 的770字节 TDM、完整绘制命令和48条唯一有向边通过独立派生夹具核对；M33-C 按 TDM 接入地图对象；M33-D 接入 level index 31 参数和13条 APK 请求。M33-E 定向内容/回放测试、TypeScript 类型检查、959项单测，以及 T70/T71 的4项正式/自由入口 E2E 均通过。M33-F 修复旧进度摘要后，完整 `test:ci` 通过类型检查、959项单测、生产构建和187项 E2E。尚未集成/发布：唯一 `gunsnglory` 本地工作树位于 `/Users/shiwei/Documents/code/wishflow-tools`，跟踪分支落后 `origin/gunsnglory` 10 个提交且含未跟踪研究文档；按工作树约束保留现场，不能在该脏工作树切分支或更新。
- 已有 M31/M32 的详细过程从活动计划移出；参数、路线、单位与对白证据分别保留在[Snake River 静态审计](map29-static-audit.md)和[Loot Lakes 静态审计](map31-static-audit.md)。共用碰撞基线见[我方桥面与地图对象碰撞审计](player-collision-audit.md)，已复现问题的原因与防回归经验见[经验记录](experience-log.md)。
- 独立遗留项：早期回放文件 M4–M7 的兼容行为未确认；本 M33 批次不重开此项，除非新实现出现相关回归。

## 当前批次：Six Grandfathers（M33）

目标为 Dakota 第 2 关、全局第 32 关，APK `res/raw/td_map_35.tdm`。静态基线见[Six Grandfathers 静态审计](map32-static-audit.md)。数据来源为 Guns’n’Glory FREE 1.8.6 APK、其 Smali/REA 反编译，以及可复核的 TDM/地形派生数据；不借用相邻关卡数值，不完整通关，不为已能由静态代码回答的问题启动 Android。测试保持窗口模式和静音。

### 已闭合的开工基线

APK 身份、map35 原始网格、Dakota 绘制链、完整路线、静态对象/列车/单位、global level 32 参数、level 分支 32 的八波与玩家池动作、英语资源和音乐调用均已交叉核对。波次统计为 **8 个 `newWave`、13 个 `addToWave`、2 个玩家池动作**；末波请求间隔使用 DEX 常量 500 ms。不可将旧摘要里的“12 次 addToWave”当成事实。

### M33-B 已完成

新增 `dakota-02.json`、`dakota-02-routes.ts`、APK 原始 TDM 与独立路线图夹具，以及 `dakota-02-map-and-routes.test.ts`。地图测试逐格核对32×24网格、marker、768个背景绘制命令、道路/桥/铁路覆盖及图集边界；路线测试核对全部节点和48条唯一有向边、3个入口/出口映射与可达性；短 `GameSession` 核对三个入口的来源 ID、首个方向和转向。定向测试3项、`pnpm run typecheck` 通过。详细期望留在测试和夹具中，不在活动计划重复列出。

### M33-C 已完成

新增 Dakota 共享背景碰撞码解码器、Six Grandfathers 场景、TDM 单位/列车工厂和 Saloon/Tipi 来源单位池。场景覆盖33个静态装饰 marker；96–101 共46个睡眠单位 marker 按 Grandpa/Sniper 全局解锁创建，130/131 特殊招募单位也受各自解锁门控；不为 TDM 中不存在的活动 Grandpa 或 Cannon/Fort 来源池伪造地图对象。raw 82 保留为铁路背景，raw 83/84 创建2台机车和4节车厢的移动组。独立 APK 碰撞期望覆盖全部静态 marker；短 `GameSession` 验证 Saloon、Tipi、岩石、睡眠单位、列车阻挡，以及 raw 80 横桥/raw 88 竖桥的正确通行方向与侧边阻挡。抽取背景碰撞解码器后，Loot Lakes 仍逐格匹配原参考。定向测试17项、`pnpm run typecheck` 和 `git diff --check` 通过。

实现前还修正了静态审计中的一条错误：审计表称 raw `109@(13,1)` 会创建活动 Grandpa，但 map35 APK TDM 字节与 marker 频次表均无 raw 109，该坐标实际为 raw 32。当前场景和报告以 TDM fixture 为准；原因与防回归见[经验记录](experience-log.md)的“新关卡数据必须以本关 APK 资源为准”。

### M33-D 已完成

新增规则和波次定义，并用独立期望表核对 GameDesignData index 31 的现金、生命、奖励箱、升级上限和 Easy/Medium/Hard 倍率，以及 `i == 32` 分支的8个 wave header、13个 `addToWave` 调用、全部 route action ID、间隔和请求向量。Wave 8 的 Boss 使用请求索引8（APK第9槽），Doc 索引9保持0；短 `GameSession` 分别验证 Wave 1 的 action 1 来源点、开局状态、单位池 Wave 1 reset/cap 和隔离 Boss 请求。无 Fort marker，因此不创建不可用 Cannon 生成位置；其原版零上限不产生可观察效果。共享15秒池刷新沿用网页适配值，并未标作 APK 本关计时参数。定向测试13项、`pnpm run typecheck` 通过。

### 有序实现步骤

| 顺序 | 切片 | 范围与依赖 | 验收与针对性验证 |
| --- | --- | --- | --- |
| 1 | M33-F：集成、发布和线上验收 | 历史进度摘要断言已同步：`t20`、`t22`、`t25`、`t28`、`t33` 五个 spec 的6条期望从31更新到32，定向复验11项通过；完整 `test:ci` 已通过类型检查、959项单测、生产构建和187项 E2E。先取得干净且最新的 Guns’n’Glory 集成工作树，保留现有含未跟踪研究文档的工作树不动；之后将 M33 整批 squash 集成到 `gunsnglory`，按应用流程同步并发布到 `master`。 | 核对 `gunsnglory`/`master` 与远端及所有相关 worktree 的上游关系。发布后检查 Actions、GitHub Pages 与 Cloudflare Pages；部署 `build-info.json` 的 SHA 必须匹配预期发布提交。用内置浏览器静音、窗口模式验收正式锁定/解锁入口、Free Play、Six Grandfathers 开局对白、地图图层和代表性交互；不手动完整通关。任一门槛失败则保持批次未完成并细化修复。 |

### 批次规则

- 每个切片先跑针对性测试、更新本计划、检查差异，再本地提交；不在每个切片提交后重复跑整套检查或单独发布。
- 一组步骤完成后复核尚未完成项；整批结束时运行应用完整检查与适用共享检查一次。
- 新增关卡数据以本关 APK 原始资源和消费分支为准。不得以相邻关卡、压缩摘要或生产数组自身建立测试期望；数值、路线、绘制、碰撞和表现分别验证。
- 浏览器默认窗口模式、静音；Android 只在静态证据不能回答某个明确行为时做一次定点观察。
- 发布是完整功能批次的决定，不按单个切片或文档单独发版；按[应用协作约束](../AGENTS.md)核对部署来源和集成分支。
