# 实施计划

本文件只维护当前实施基线与尚未开始的工作。每轮开始先核对代码、APK 专题审计和测试状态，再细化后续步骤；每个切片结束后关闭已完成项。已完成步骤的实现细节保留在代码审查、逐关静态审计和 Git 提交历史中，不继续堆在活动计划里。

## 当前基线

- **M36–M38 连续关卡批次已完成并发布：**Dakota Level 35 Ghost Town、Level 36 Ice Rocks、Level 37 Frost Station。28 个实现切片合并为一次公开发布。
- **发布与部署核对：**master 发布提交 `2a89497`；GitHub Actions run `44660936221` 成功。GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均报告与该提交相符的来源 SHA。发布提交已合并回 `gunsnglory` 并推送。
- **完整检查通过：**`CI=1 PLAYWRIGHT_PORT=4221 pnpm run test:ci` 通过类型检查、1112 项单测、生产构建和 200 项 E2E；`pnpm run test:catalog` 通过18项。生产构建仍显示既有的大型 JavaScript chunk 提示，本批未改拆包策略。
- **内置浏览器验收通过：**发布页面保持窗口模式和静音，从 Free Play 进入 Dakota → Frost Station（Level 37）→ Medium；核对 Level 37 标题、首波 Engineer 对白/头像、地图、铁路、桥面、列车及 HUD；关闭对白后进入 1/8 波战斗。未通关、未进入全屏、未播放音频，也未启动 Android。
- **发布频率：**M35 后基线为 43 次发布 / 233 个实现切片；M36–M38 增加 28 个切片和一次发布，累计为 **44/261 = 16.9%**，低于20%目标。静态审计、文档整理、批次检查和分支回同步不计入实现切片。
- **已接入内容的证据入口：**[Ghost Town 静态审计](ghost-town-static-audit.md)、[Ice Rocks 静态审计](ice-rocks-static-audit.md)、[Frost Station 静态审计](frost-station-static-audit.md)。新实现继续以对应 APK 原始资源和 Smali 为最终依据；REA/JADX 摘要、旧计划和经验条目仅作检索线索，结论冲突时回到原始证据复核。

## 当前批次：Dakota Level 38 Wayne Waters（M39）

**状态：**静态审计及独立地图基线已完成；M39-A 地图、地形、桥层与敌方路线，M39-B 地图对象、单位和碰撞，M39-C 参数、波次和玩家单位池，以及 M39-D 文案、头像、音乐映射和解锁快照已实现并通过定向测试和类型检查。M39-E 尚未开始。完整证据见[Wayne Waters 静态审计](wayne-waters-static-audit.md)，原始 TDM、路线图和地形参考分别保存在测试 fixture。raw 78 的作者意图仍未知，但没有专属对象/道路分支，不阻塞接入。

### 实现切片

| 切片 | 范围与依赖 | 验收标准 | 定向验证 |
| --- | --- | --- | --- |
| M39-A（已完成）地图、地形与敌方路线 | 新增 Dakota 第8关的 map41 数据、静态背景/道路/桥层和 TDM 方向路线；直接消费已审阅 fixture，禁止从 Frost Station 偏移或手工补路线。无前置依赖。 | 原始 TDM 32×24、768 格逐项一致；背景768条、道路/桥71条绘制指令逐项匹配参考；4个出生点、46个转向点、4个出口、52条唯一有向边、6条完整路线及全部 action 到 spawn 映射一致；路线不越界。 | `node --import <现有 tsx loader> --test tests/dakota-08-map-and-routes.test.ts`：3项通过；`node ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`：通过。 |
| M39-B（已完成）地图对象、单位与碰撞 | 根据 TDM 接入装饰、45个睡眠单位、解锁单位、4组炸药配对、Saloon/Fort 和五个动态 Steamer 组件；复用既有对象工厂与 APK 碰撞契约。依赖 M39-A 地图坐标。 | 每种 raw marker 的坐标、类型、activity、解锁条件和唯一 ID 与审计一致；睡眠单位仍阻挡移动；Saloon、Fort、水边岩石、桥和地形边界命中 APK 派生框；无 Tipi、Casino 或伪造 Cannon。 | `node --import <现有 tsx loader> --test tests/dakota-08-map-entities.test.ts tests/dakota-08-player-collision.test.ts tests/dakota-08-dynamite.test.ts tests/dakota-08-steamer.test.ts`：8项通过；`node ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`：通过。 |
| M39-C（已完成）参数、敌人波次与玩家单位池 | 接入参数行37、8个波次头、16条敌方请求以及 Wave 1 的 SET/SET_MAX 玩家单位池动作；敌方 action ID 显式映射到 M39-A 出生点。地图只有 Saloon/Fort，没有 Tipi：保留 APK 对 pool slot 1–4 的原始动作数据，但只为实际存在的建筑生成 1–3 号单位模板；允许有效原始池槽位没有当前地图模板，不伪造 Tipi 或 Indian 出生点。依赖 M39-A、M39-B。 | 初态、难度 HP、全部波次字段与请求槽位逐项匹配审计；两个池动作都在 Wave 1，四个原始槽位均清零、上限均为3；短 GameSession 验证真实敌方出兵和 Saloon/Fort 单位池消费；未知参数效果保持数据，不猜玩法。 | `node --import <现有 tsx loader> --test tests/dakota-08-campaign-rules.test.ts tests/dakota-08-campaign-waves.test.ts tests/campaign-unit-pool.test.ts`：14项通过；`node ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`：通过。 |
| M39-D（已完成）文案、头像、音乐与内容快照 | 增加英中关卡说明/对白、APK 头像和 Dakota 音乐映射；将头像加入启动预载；建立可由正式进度派生或由回放版本恢复的单位/炸药解锁快照及稳定内容版本编码；不播放音频。完整关卡/replay factory 留到 M39-E 与入口注册一起接线。依赖 M39-B、M39-C。 | 8段对白、头像、语言键和资源路径与审计对应；全部头像资源存在且进入启动预载；32种内容版本位组合可往返，profile 派生状态尊重全局解锁门槛；未知/跨关版本拒绝。本关此前未公开，因此没有旧的 Wayne Waters 回放版本需要迁移。 | `node --import <现有 tsx loader> --test tests/dakota-08-campaign-presentation.test.ts tests/dakota-08-replay-content.test.ts`：5项通过；`node ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`：通过。 |
| M39-E 正式/自由入口、注册与回放 | 将 Level 38 接入 Dakota 正式目录、Free Play、菜单预览、HUD、结算、浏览器 builder 和回放导入；更新共享阶段/进度/地区数量及历史 E2E fixture。依赖 M39-A–D。 | 正式模式需完成 Level 37 才开放；Free Play 可选择本关且不写战役进度；地图预览/开局/对白/资源/HUD 均指向 map41；回放按录制快照分派；未实现 Level 39 仍禁用。真实菜单入口覆盖，不用只测 builder 替代。 | node --import tsx --test tests/dakota-08-formal.test.ts tests/official-campaign.test.ts tests/progress.test.ts；CI=1 PLAYWRIGHT_PORT=<独立端口> pnpm exec playwright test tests/e2e/t79-dakota-08-integration.spec.ts tests/e2e/t80-dakota-08-replay.spec.ts --workers=1 |

### 批次收尾

M39-A–E 各自运行上述定向验证并本地提交；每步结束后更新本计划。全部通过后运行一次 CI=1 PLAYWRIGHT_PORT=<独立端口> pnpm run test:ci 和 pnpm run test:catalog。窗口模式、静音下用内置浏览器从真实菜单检查 Free Play 与正式解锁入口、地图、首波对白/头像和 HUD，并验证代表性的地图交互；不完整通关、不启动 Android、不播放音频。通过后将整个 M39 批次 squash 集成到 master 发布，核对两个 Pages 来源 SHA，再将发布提交回同步至 gunsnglory。

M39 计划为5个实现切片和1次发布；若按计划完成，发布频率约为45/266（16.9%），仍低于20%目标。该预测不改变当前计数，只有实际完成后才更新累计值。

## 批次执行约束

- 每个切片运行相关定向测试并本地提交；一组计划步骤全部结束后运行一次 `test:ci` 和适用的共享检查。失败在当前批次内修复，并重跑失败项及最终完整检查。
- 公开发布按完整功能批次进行，不为单关或单切片单独发布。通过 CI 后核对 Pages 来源 SHA，再以内置浏览器验证该批代表性菜单入口和开局流程。
- 默认窗口模式、静音；只有对应验收需要时才进入全屏或启用音效。只在静态证据不能回答具体问题时，设计最小 Android 定点观察；不完整游玩或通关。
- 新增正式关卡时，除新关自身外，还需搜索并更新正式阶段数组、Progress 投影、关卡总数、地区可玩数、Free Play 边界、回放工厂、E2E 历史 fixture 和启动资源收集器。
