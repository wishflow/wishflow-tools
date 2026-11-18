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

- **范围：**依序完成独立切片。每项关卡期望均直接来自[Fort Knockout 静态审计](fort-knockout-static-audit.md)，不从 Dakota 前一关复制。C3a/C3b 闭合地图单位与玩家池；C4 接入关卡参数和敌方波次；C5 再接文本、媒体与版本。
- **依赖：**M34-A、M34-B 已通过；若切片发现共享地形转换回归，先修复并对既有关卡运行对应定向检查。
- **M34-C1 已完成：**Fort Knockout 路线数据已接入。四条路线、135条相邻有向边、139个路线格和四个入口的首个 GameSession 转向均通过独立 APK 期望核对；详情见 `dakota-03-routes.test.ts` 与本关静态审计。此项不代表关卡已进入正式目录或可从菜单启动。
- **M34-C2a 已完成：**Dakota03 静态装饰与 scene 已接入。raw69/70/71/76/94/95/113/116/117 逐格匹配 APK 资产和锚点；静态碰撞使用 TDM canonical box。真实 GameSession 移动探针核对 Fort、shack、大岩石、小 tipi 和铁路挡车器的阻挡边界，详见 `dakota-03-static-scene.test.ts`。
- **M34-C2b 已完成：**raw92/raw91 生成一组竖列火车（两节 wagon、两段 locomotive），与 APK 的 cell 顺序、activity、资产帧和单一 movement group 一致；GameSession 已验证列车实体阻挡。raw102/raw110 生成 trigger/box pair `(16,5)` + `(15,6)`，level20 或30完成后才显示并登记两个对象碰撞框。详见 `dakota-03-map-entities.test.ts`。
- **M34-C3a 已完成：**raw96–101、130–131 的61个新局招募 marker 已复用共享单位构造器；16种单位解锁快照中的坐标、类型、activity 4、唯一 ID 和贴图资源均通过 TDM 独立期望核对。真实 GameSession 确认未雇佣的 Gunslinger 阻挡移动；详见 `dakota-03-unit-entities.test.ts`。
- **M34-C3b 已完成：**独立 pool-only Cannon 模板与 raw98 六个开局 Cannon 分离；两个 raw113 Fort 均登记为 type 2 出生场。Wave 1 的 SET 清空全部单位库存槽，SET_MAX 只开放 Cannon 池上限5。真实 GameSession 从地图雇佣 Cannon 后确认扣款、入池，并生成 activity 2 Cannon 到实际 Fort；刷新周期仍沿用共享网页15秒缺省，未记作 APK 数值。详见 `dakota-03-unit-pool.test.ts`。
- **M34-C4 已完成：**逐字段接入 global level33 开局参数及十波、二十个敌方请求池；独立期望逐波核对请求计数、入口、间隔、倍率和 Boss/Doc 槽。真实 GameSession 确认首波 `$300`、25生命及19个待生成请求；隔离短会话确认第十波 request index 8 生成 Boss。Wave 1 Cannon 玩家池动作仍独立生效，未被敌方波次覆盖。详见 `dakota-03-campaign-rules.test.ts`。
- **M34-C5 已完成：**标题/简介映射 `T_LEVEL_NAME_36`、`T_LEVEL_INFO_36` 和10段 `T_CAMPAIGN_33_01..10` 英文逐字匹配静态审计；中文对白与头像顺序已补齐。Dakota ambient/三曲循环复用现有映射；地图、单位和头像进入启动预载；unlock 快照内容版本可严格解析并直接重建同版本的地图、单位。5项专题测试、`pnpm run typecheck` 及生产构建通过，构建产物含本关独占头像、音乐和地图预览资源。资源测试首次误把贴图别名当物理文件名，已按 `gameAssetRelativePath()` 修正并记入经验记录。正式目录、菜单入口、browser replay factory 与真实回放恢复仍留给 M34-D。

- **不包含：**正式关卡目录、菜单/Free Play、进度、浏览器回放工厂接线和全局计数属于 M34-D；仅在 C1–C5 全部通过后接线。

### M34-D：正式目录、菜单、Free Play 与回放接线

**当前基线：**Level 33 已正式登记并接入浏览器菜单和可玩入口；Free Play 与正式关卡路径、档案结算和场景上下文均已通过 D1 定向检查。剩余工作从 Dakota03 的回放内容版本恢复开始；菜单入口已在 D1 E2E 中验证，最终整批 E2E 仍需回归。

**M34-D1 已完成：**Fort Knockout 已登记为 Six Grandfathers 后的第33个正式关卡，27份固定阶段数断言已更新。Browser scenario 按存档中的单位解锁快照生成精确内容版本；Free Play 与正式模式均能从 Dakota 地图选择、查看双语简介/map36 预览并启动。菜单 E2E 首次发现 Level 33 场景上下文仍显示 `NEW MEXICO`：场景区域名使用手工列举关卡 ID 的分支，新增 Dakota03 时漏列。补入关卡映射后，Free Play 和正式路径的场景上下文均显示 Dakota；两条路径的开场对白、头像、HUD 和资源加载检查通过。正式模式完成 Dakota02 前锁定、完成后开放。验证：Fort Knockout 正式内容与 browser bootstrap 定向单测6项通过；受影响的阶段数/正式关卡测试98项通过；新增菜单 E2E 2项通过；TypeScript 类型检查通过。回放恢复仍由 D2 处理。

| 切片 | 实施范围与依赖 | 可判定验收与定向验证 |
| --- | --- | --- |
| **M34-D2 浏览器回放恢复** | 在 `bootstrap/browser.ts` 增加 `createBrowserGameForDakota03Replay()`，在回放导入分派中用记录版本恢复 C5 unlock 快照。不得用导入者当前解锁状态覆盖记录快照。依赖已完成 D1、C5。 | 空快照/全解锁快照版本严格对应单位 marker；合法版本可还原同一 `ScenarioContent` 并通过真实 `Game.replay()` 的回放校验入口；缺失/损坏版本返回该关的 content-unavailable 路径，不静默套用 profile。运行 Dakota03 replay 单测和 browser bootstrap 定向测试。 |
| **M34-D3 最终菜单与整批 E2E** | D1 的 `t72-dakota-03-integration.spec.ts` 已覆盖 Free Play 和正式解锁/启动路径。D2 完成后复核回放导入分派，再运行本关 E2E 和受影响的 `t29`、`t31`；只修复有证据的集成差异，不重做已通过菜单流程。依赖 D1、D2。 | 保留 Free Play → Dakota → Fort Knockout 的地图、双语简介、开场对白、HUD 和无资源错误检查；正式模式在 Dakota02 完成前锁定、之后开放；回放按记录的解锁快照恢复；自由模式结果不改档案。默认窗口、静音，不完整通关。 |

- **不包含：**其他 Dakota 关卡内容与完整战役通关。正式/自由模式结算隔离由短 GameSession 断言，不用长时间手动战斗替代。

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
