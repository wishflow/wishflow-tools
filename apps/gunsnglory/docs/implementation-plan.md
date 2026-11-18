# 实施计划

唯一活动进度见本文件。游戏规则、模块和验证边界分别见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)及[经验记录](experience-log.md)。每轮先核对代码与证据，细化后续步骤；每完成一个切片即更新本计划并移除已关闭任务。

## 当前状态

- **M33 Six Grandfathers 已完成并发布。**发布提交 `7b40074bd06c5c813ea009a67efc987b638d5a94`；GitHub Actions `44262725139` 的共享检查、Guns’n’Glory 测试、GitHub Pages 与 Cloudflare Pages 部署均成功。两处根路径 `build-info.json` 的 `sourceSha` 均与发布提交一致。
- **线上验收通过。**内置浏览器静音、窗口模式进入 Free Play → Dakota → Six Grandfathers（Level 32）→ Medium，确认关卡可选、开场对白可继续、地图与 HUD 正常渲染；未手动完整通关。发布验证覆盖的是代表性入口和画面，不是整关逐帧实测。
- **集成状态已同步。**发布提交已合并回 `gunsnglory` 并推送；本地 Guns’n’Glory 主工作树已快进到集成分支。其原有未跟踪研究文档仍保留，未纳入项目提交。
- 当前关卡数据和实现证据见[Six Grandfathers 静态审计](map32-static-audit.md)、关卡测试及夹具；地图对象与碰撞共用基线见[我方桥面与地图对象碰撞审计](player-collision-audit.md)。已关闭问题的根因和防回归规则见[经验记录](experience-log.md)。
- 独立遗留项：早期回放文件 M4–M7 的兼容行为未确认。本批没有改动该行为；只有后续任务触及回放兼容或发现相关回归时才重开。

## 下一批：M34 Fort Knockout

Fort Knockout 是 Dakota 第 3 关、全局第 33 关，对应 APK `td_map_36.tdm`。注意工程中的 `map33` 旧称通常指全局第 30 关 Lumber Mill Hills；本关代码和测试统一采用 `dakota-03` 命名，静态报告使用关卡名，避免把战役关卡号、TDM 文件号和旧内部 map 序号混用。完整静态基线见[Fort Knockout 静态审计](fort-knockout-static-audit.md)。

### M34-A：完成独立来源与数据核验

**状态：已完成静态资料核验；最终 Dakota 绘制与碰撞逐格等价仍由 M34-B 验收，不算本步骤已证明。**

- **范围：**将 Fort Knockout 的 APK 身份、TDM 尺寸与 marker 频次/坐标、路线图、初始对象、参数行、玩家池动作、波次调用、对白/头像和现存未知项写入独立报告。每个关卡事实以本关原始 TDM、目标 level 条件分支、Smali 字段写入/消费者为准；报告同时区分 APK 派生数据、网页已有数据和未核对项。
- **依赖：**无；源 APK 与 Smali 静态材料已可用。
- **验收：**全局 Level 33 ↔ `GameDesignData` 零基索引32 ↔ TDM 文件36 ↔ `GameDesignWaves` level 33 四者逐项闭合；marker 频次覆盖对象清单；波次数、请求调用数和池动作分别计数；坐标无矛盾。不得把 JADX 伪代码当原始源码，也不得沿用前一关摘要。
- **验证：**逐项对照 REA/Smali、APK ZIP 内 TDM、资源文本和独立派生表；`git diff --check` 与 Markdown 相对链接检查。

### M34-B：复核 Dakota 地形、绘制和碰撞投影

**状态：已完成。**map36 的原始 TDM、Dakota 图层数据和独立逐格对照已接入；地形与路线数据仍分开验收，不代表玩家对象/碰撞框已集成。

- **范围：**从 map36 的原始 TDM 独立派生 Dakota 背景与道路/桥/铁路绘制命令，并从 APK `BackgroundMap` 完整转换链计算最终背景码；与网页地图数据逐格比较 768 个背景格及所有覆盖层命令。把道路绘制、敌方路线、玩家可走地形、对象碰撞分开核验。
- **依赖：**M34-A 的 TDM 网格与静态审计；复用 M32 已验证的 Dakota 图集别名和 `dakota-background-collision` 转换约定，但重新用 map36 输入计算，不复用 map35 格点。
- **验收：**每个背景命令的资源、source rectangle、目的格和层序均与独立参考一致；敌方路线的原始控制节点与其地图路线通道相符；桥图覆盖不替代玩家碰撞规则；最终背景碰撞码逐格等价。若 APK 输入不足以决定运行时随机变体，固定网页种子只需选择合法图块，不宣称复现每次 Android 启动。
- **验证：**[`dakota-03-map.test.ts`](../tests/dakota-03-map.test.ts) 使用 APK TDM fixture 核对768个背景命令、104个道路/桥/铁路覆盖命令及完整碰撞格网；抽查 raw36 悬崖、raw80 桥、水域与铁路，并逐项核对7座桥的绘制偏移和尺寸。四项定向测试及 TypeScript 类型检查通过。路线与玩家地形碰撞语义不混为一谈，路线展开在 M34-A 的静态审计中单独验证；玩家脚底锚点和实际移动边界由 M34-C 的 GameSession 测试验收。只有静态转换仍无法判断的具体对象行为才安排短时运行观察。

### M34-C：接入地图、路线、对象和规则数据

- **范围：**依序完成下表中的独立切片。每项关卡期望均直接来自[Fort Knockout 静态审计](fort-knockout-static-audit.md)，不从 Dakota 前一关复制。C3a 先闭合地图 marker 到新局单位；C3b 再接池模板、出生场和 Wave 1 玩家池动作。两项均通过后才接入 C4 的敌方波次。
- **依赖：**M34-A、M34-B 已通过；若切片发现共享地形转换回归，先修复并对既有关卡运行对应定向检查。
- **M34-C1 已完成：**Fort Knockout 路线数据已接入。四条路线、135条相邻有向边、139个路线格和四个入口的首个 GameSession 转向均通过独立 APK 期望核对；详情见 `dakota-03-routes.test.ts` 与本关静态审计。此项不代表关卡已进入正式目录或可从菜单启动。
- **M34-C2a 已完成：**Dakota03 静态装饰与 scene 已接入。raw69/70/71/76/94/95/113/116/117 逐格匹配 APK 资产和锚点；静态碰撞使用 TDM canonical box。真实 GameSession 移动探针核对 Fort、shack、大岩石、小 tipi 和铁路挡车器的阻挡边界，详见 `dakota-03-static-scene.test.ts`。
- **M34-C2b 已完成：**raw92/raw91 生成一组竖列火车（两节 wagon、两段 locomotive），与 APK 的 cell 顺序、activity、资产帧和单一 movement group 一致；GameSession 已验证列车实体阻挡。raw102/raw110 生成 trigger/box pair `(16,5)` + `(15,6)`，level20 或30完成后才显示并登记两个对象碰撞框。详见 `dakota-03-map-entities.test.ts`。

| 切片 | 内容与依赖 | 完成门槛与定向验证 |
| --- | --- | --- |
| **M34-C3a 初始招募单位** | 复用 `createCampaignMapUnitPlacements()` 与既有 New Mexico/Fort 单位构造器，为 raw96–101、130–131 生成 Fort Knockout 的新局对象；通过当前四位解锁快照控制 Sniper、Grandpa、Pyromaniac、Salesman marker。锁定 marker 的显示/省略行为遵循共享构造器，不新造锁图标或关卡规则。 | 独立从 TDM 逐点比对59个 raw96–101 和2个 raw130/131 marker 的数量、坐标、类型、activity、资源及唯一 ID；覆盖四个解锁位的16种组合：1–4类基础单位照常存在，受门槛单位仅在解锁后生成且仍为 activity 4。全解锁场景中确认单位碰撞框实际进入 GameSession，至少验证一个未雇佣单位阻挡移动。运行 `tests/dakota-03-unit-entities.test.ts` 与类型检查。 |
| **M34-C3b Fort Cannon 池模板** | 复用 `CampaignSpawnPoolDefinition.template`，给 Cannon 的 Fort 池提供独立生成模板；将模板与 raw98 的六个地图 Cannon 分离。用 TDM raw113 的两个 Fort 位置作为 `spawnLocationType: 2` 出生场，并按 level33 Wave 1 动作设置四池清零及 Cannon 池上限5。 | 独立期望确认六个初始 Cannon、两个 Fort 出生点和一个 pool-only 模板分别计数；模板不出现在初始 `ScenarioContent.units`。真实 GameSession 从地图雇佣 Cannon，核对入池、池上限和 Fort 出生位置/生成 Cannon 类型；不完整推进关卡。运行 `tests/dakota-03-unit-pool.test.ts` 与类型检查。 |
| **M34-C4 关卡参数与波次规则** | 接入 global level33 参数与十波、二十个敌方请求调用；复核 C3b 已接入的 Wave 1 玩家池动作不被敌方波次装配覆盖。依赖 C1 路线与 C3b 池定义。 | 独立期望逐字段、逐波匹配静态审计；检查初始生命/现金、难度倍率、10波顺序和请求向量；短 GameSession 核对代表性首波、Wave 1 池动作及第十波 Boss 槽。请求向量不用于推断固定敌人出现顺序，不完整推进整关。 |
| **M34-C5 关卡文案与表现资源** | 接入中英标题/简介、十段双语对白与头像、Dakota 音乐映射、独占资源预载和关卡内容版本。依赖 C2a–C4 的场景及规则内容。 | APK 英文资源 key 与原文逐项匹配；中文翻译逐段存在；头像、音乐、地图预览、初始资源数与单关快照一致；独占资源构建后可加载且回放版本可重建。 |

- **不包含：**正式关卡目录、菜单/Free Play、进度、回放恢复和全局计数属于 M34-D；仅在 C1–C5 全部通过后接线。

### M34-D：正式目录、菜单、Free Play 与回放接线

- **范围：**将 Fort Knockout 加入 Dakota 正式阶段目录与 Free Play；补齐菜单标题/说明、地图预览、战斗 HUD、结算与存档版本、回放快照/恢复、音乐、启动预加载和进度投影的全部消费者。
- **依赖：**M34-C 的关卡内容可由真实 GameSession 创建。
- **验收：**菜单选关和 Free Play 显示同一关卡身份与地图；Formal 受正常战役进度约束、Free Play 不写战役完成记录；档案驱动场景重建和新旧回放内容版本正确；新关所有独占图像/头像被预加载；进度总数、Dakota 可玩数及锁定边界一致。
- **验证：**从真实菜单路径的 E2E、Free Play/正式进度隔离、回放往返、资源预载和目录快照测试。新增全局关卡前全仓搜索固定计数与禁用边界。

### M34-E：批次收尾与发布判断

- **范围：**核对本批全部差异，更新计划、经验记录与发布说明；本地提交后按应用规则整批 squash 集成。
- **依赖：**M34-A 至 M34-D 全部通过。
- **验收：**先运行相关定向检查，再运行一次 `pnpm run test:ci`；构建、单测、E2E、共享检查均通过。发布时检查 CI、GitHub Pages 与 Cloudflare Pages 的来源 SHA，再用内置浏览器窗口模式、静音验证菜单、地图、开场对白和代表性战斗流程。不得把短会话或静态对照写成通关/Android 实测。
- **发布策略：**此关作为完整内容功能批次；不因每个文档或代码切片独立发布。

## 后续工作

当前未细化其他关卡。M34 完成后，按 APK 原始资源逐关选择下一关并重新核对目标内容；不得仅按相邻关卡顺序复制配置或预设路线、地形图集、单位池结构。

## 批次规则

- 每个切片先跑针对性验证、更新本计划并本地提交；不在每个切片提交后重复运行整套检查或单独发布。
- 一组切片完成后复核剩余差异；整批结束时运行应用完整检查与适用共享检查一次。失败在当前批次修复，并重跑失败项与最终完整检查。
- 新关卡数据以该关 APK 原始资源及实际消费分支为准。不得以相邻关卡、摘要或生产数据自身建立测试期望；数值、路线、绘制、碰撞和表现分别核对。
- 浏览器默认窗口模式并静音；Android 仅在静态证据无法回答明确问题时做一次定点观察。
- 发布是完整功能批次的决定，不按单个切片或文档单独发版；发布后核对 CI、部署来源 SHA，并用内置浏览器验收整批功能。
