# 实施计划

本文是 Guns’n’Glory 唯一活动进度与任务来源，只保留未完成工作。产品规则见[产品规格](spec.md)，模块边界见[架构](architecture.md)，存档边界见[存储契约](storage-contracts.md)，模拟与测试约束见[模拟与自动化契约](simulation-and-automation.md)。

每轮先核对当前代码、测试与提交，再细化后续步骤的范围和验收。每个切片先跑针对性测试并提交；步骤完成后更新本文，删除已完成项。整批结束再跑一次完整检查，不重复已通过的检查。

## 当前状态

- 正式战役已完成 **3/60** 关：Cow Gulch、Apache Valley、Fort Kaboom。
- 当前工作在 `codex/gng-spawn-field-restore`；该分支包含 `gunsnglory` 集成分支，尚未集成到公开 `master`。公开版本为 `e922c3f`，本地代码不等于已发布版本。
- Tech Town 的地图、路线、静态对象、普通与特殊单位、Gambler/Casino、列车、Gatling、随机流及会话结算底层均已实现。正式关卡数据尚未接入；静态核对还发现敌方生成池 type 9（Gold Transport）没有网页实现，map04 第 6–8 波会因此无法清空请求。按下方切片补齐这一规则缺口，再接入正式内容；不要人工通关整关。
- 全屏画面现按可用视口保持比例适配，窗口模式下 Usagi 位于游戏上层并可交互，全屏状态隐藏、退出后恢复。定向视口测试、5 项全屏 E2E 及本批完整 `test:ci` 均通过；内置浏览器拒绝网页的原生全屏请求，因此原生全屏覆盖屏幕这一项仍没有浏览器实测证据。后续一般保持窗口模式，不重复进入全屏；若专门回归全屏，再记录真实浏览器能力和结果。
- 发布比例基线为 5 次成功发布 / 27 个已验收实现切片（18.5%）；完成新的发布批次后再按规则更新计数。

## 已核实的 Tech Town 基线

| 范围 | 证据结论 | 实现约束 |
| --- | --- | --- |
| 关卡地图 | APK `td_map_04.tdm` 为 32×24 网格、770 字节；地图使用 4 个入口、2 个出口和方向场 52–55。 | 使用已导入的原始网格和路线，不按截图重画；不得因 APK 有 63 个地图文件而把第 11–13 张计入 60 关战役。 |
| 单位与地图对象 | 普通、Pyromaniac、Salesman、Gambler、Casino 和静态建筑码位已解析并有对应工厂。Gambler/Casino 受同一档案解锁结果控制。 | 保留已实现码位、锚点和解锁语义；首次进入 map04 与高档案等级下分别检查，不把休眠标记数当成实际单位数。 |
| 列车与特殊系统 | 五节列车、横向组移动、蒸汽、Gatling、Gambler 规则、共享随机及会话结算均已完成定向验证。 | map04 接入时只检查这些系统与正式战役的接口；除非发现回归，不重复做独立样例或资源审计。 |
| 地图入口 | `td_map_04.tdm` 的入口码 40–43 按地图扫描顺序为 `(0,3) E`、`(0,4) E`、`(11,23) N`、`(12,23) N`；四条路线见 `tech-town-routes.ts`。 | 波次的入口 ID 必须对应这四个位置，保留既有路线、铁路和地图碰撞。 |
| 请求向量 | `Wave.setContentForSpawnPoint()` 把 10 个请求数写入池 type 2–11；短重载的缺省尾项为 0。映射：2–5=1–4 人拓荒者组，6=骑手，7=Covered Wagon，8=Post Coach，9=Gold Transport，10=Boss，11=Doc。证据入口：`WaveManager.updateWave/addToWave`、`Wave.setContentForSpawnPoint`。 | 每个表格向量固定按 `[type2,type3,type4,type5,type6,type7,type8,type9,type10,type11]` 解读；不得把池 type 直接当成敌人 type。 |
| 8 波数据 | 下表的 `P入口@间隔:请求` 直接对应 APK 的每个入口池；短重载未提供的 type10/11 均为 0。 | 整表作为独立测试期望值；不得从被测关卡内容本身生成预期值。 |
| 关卡参数 | `GameDesignData.gameDesignData[3]`（关卡 4）原始值为 `[300,50,999,25000,0,30000,5,32,75,150,188,299000]`，下表已逐列对照 APK 常量和读取点。 | 只把有消费者的值接入：经济、生命、升级上限、奖励箱、难度倍率和赌徒冷却；索引 5 无读取点，不生成网页行为。 |
| 玩家单位池 | `SpawnPoolManager` 初始全局间隔 15,000ms；type1/2 使用 Saloon，type3 使用 Fort，type4 使用 Tipi。地图码 112/113/114 位于 `(13,3)/(22,20)/(5,17)`。第 2 波前动作 `set` 将池 1–4 清零，`set-max` 将 1–4 全设为 5。证据入口：`SpawnPoolManager.<init>/addActionForSpawnPool/performActionsForWave/update`。 | `set` 与 `set-max` 都是对完整 37 槽数组的整体替换；数据接口必须能一次表达多槽值，不能串成多个会彼此清除的标量动作。 |
| Gold Transport | APK 敌人 type6，速度 500、生命 500、奖励 25、穿透 `[light=33,fire=25,heavy=100,poison=100]`、转向 200ms、逃脱扣 4 命、击杀动态难度权重 10。普通/转向图为 `goldtransport` / `goldtransport_turn`；原图在 HDPI 下分别为 144×216 与 96×72。type6 残骸在死亡计时低于 500ms 时产生碎片，并按原版“动态难度 + 平均乘客数 0”公式抽取乘客数。证据入口：`GameObjectEnemy.<init>/getPenaltyForSurviving/getAverageSpawningAmmountAfterDestruction/startDying/setImageForTurningUnit`、`EnemyDirector.updateDifficultyForEnemyKilled/moveEnemys`。 | 网页目前未分发池 type9，也未把 stagecoach/Gold Transport 的死亡处理纳入车辆残骸流程；先补共享车辆 type4–6 的原版残骸与乘客逻辑，再接波次。 |
| 对白资源 | 实际使用键为 `T_IA_CAMPAIGN_04_01` 与 `T_CAMPAIGN_04_02` 至 `_08`；同名但未被 `setWaves()` 引用的 `T_CAMPAIGN_04_01` 不使用。对白按波次依次为 Pedro、Pedro、Engineer、Settlers、Pedro、Settlers、Pedro、Pedro；肖像分别为 `portrait_pedro`、`portrait_pedro`、`portrait_engineer`、`portrait_settlers`、`portrait_pedro`、`portrait_settlers`、`portrait_pedro`、`portrait_pedro`。APK 原文及中译见下表。 | 使用现有窗口内波次对白；英文与 APK 字符串逐字核对，中文明确作为项目译文；静音验收。 |
| 进度解锁 | `GameObjectUnit.isUnlocked()` 通过当前关卡阈值或已完成关卡判断单位解锁；关卡 4 的普通生成池包含 type1–4。Sniper、Grandpa、Gambler、Pyromaniac、Salesman 的 APK 解锁关卡均晚于 4；应用不接入已移除的平台购买解锁。 | map03 完成后 map04 可进入；map04 未完成时 map05 保持锁定，完成 map04 后进度门槛开放 map05，但该关仍因内容未实现而禁用。使用同一档案完成记录构造 Tech Town 的单位与 Casino 快照。 |

### Tech Town 原版波次基线

每个池的请求向量按 `[type2..type11]` 排列，数值是该入口该波请求各类敌人的次数。

| 波次 | APK对白键 / 肖像 | 延迟 / 生命倍率 / 速度倍率 | 入口池：间隔ms / 请求向量 |
| --- | --- | --- | --- |
| 1 | `T_IA_CAMPAIGN_04_01` / Pedro | 15,000ms / 100% / 100% | P0: 2,500 / `[1,3,3,3,2,1,1,0,0,0]` |
| 2 | `T_CAMPAIGN_04_02` / Pedro | 5,000ms / 100% / 100% | P0: 2,500 / `[0,2,1,2,2,1,1,0,0,0]`; P1: 3,500 / `[0,0,2,3,3,2,1,0,0,0]` |
| 3 | `T_CAMPAIGN_04_03` / Engineer | 5,000ms / 125% / 100% | P0: 3,000 / `[0,0,1,2,3,3,3,0,0,0]`; P1: 2,500 / `[0,0,1,2,3,4,3,0,0,0]` |
| 4 | `T_CAMPAIGN_04_04` / Settlers | 5,000ms / 150% / 100% | P0: 3,000 / `[0,2,0,0,3,3,2,0,0,0]`; P1: 2,500 / `[0,0,2,0,4,2,1,0,0,0]` |
| 5 | `T_CAMPAIGN_04_05` / Pedro | 25,000ms / 175% / 100% | P0: 3,000 / `[1,2,0,0,3,3,2,0,0,0]`; P1: 2,000 / `[0,1,1,0,3,2,1,0,0,0]`; P2: 2,500 / `[1,2,0,0,3,3,2,0,0,0]`; P3: 2,500 / `[1,2,2,0,3,2,2,0,0,0]` |
| 6 | `T_CAMPAIGN_04_06` / Settlers | 25,000ms / 275% / 105% | P1: 4,500 / `[0,0,0,0,0,0,0,2,0,0]`; P3: 2,500 / `[0,0,0,0,0,0,0,1,0,0]` |
| 7 | `T_CAMPAIGN_04_07` / Pedro | 25,000ms / 200% / 110% | P0: 3,000 / `[1,2,0,0,3,1,2,0,0,0]`; P1: 2,000 / `[0,1,0,2,3,3,1,1,0,0]`; P2: 2,500 / `[1,2,0,1,4,3,2,0,0,0]`; P3: 2,500 / `[0,3,1,0,2,2,1,1,0,0]` |
| 8 | `T_CAMPAIGN_04_08` / Pedro | 25,000ms / 275% / 110% | P0: 3,000 / `[1,0,0,0,3,1,2,2,0,0]`; P1: 2,000 / `[2,0,1,0,3,3,1,1,0,0]`; P2: 2,500 / `[0,1,0,0,2,3,1,2,0,0]`; P3: 2,500 / `[3,2,0,1,1,2,1,1,0,0]` |

第 2 波延迟在 APK 中引用 `GameObjectShot.UNIT_BONUS_DURATION_FIRE`，其 DEX 值为 5,000ms。第 2 波前玩家池动作的参数顺序为 `action=1,wave=2,pool1..4=0` 和 `action=3,wave=2,pool1..4=5`；入口池 P0–P3 与地图入口 ID 一一对应。

### Tech Town 原版参数与对白

`GameDesignData` 索引按 DEX 常量名解释。索引 5 虽有 `LEVEL_DATA_AWESOME_MESSAGE_MIN` 字段名和数值 30,000，但在本 APK 的 DEX 中没有读取点；索引 6 值 5 被加载为 `triggerMessageMinEnemy`，在击杀特定敌人、动态难度超过阈值且气泡队列为空时抽取“Yeah!”等短气泡。这是非战役规则反馈，当前批次只保留这个已核实边界，不扩展即时气泡 UI。

| 索引 | APK值 | 代码消费者 | 网页处理 |
| --- | ---: | --- | --- |
| 0 | 300 | `GunsAndGloryThread` 初始现金 | `previewWave.initialCash=300` |
| 1 | 50 | 初始及最大生命 | `previewWave.initialLives=50` |
| 2 | 999 | 剩余可生成奖励箱数 | 奖励箱池 `totalCount=999` |
| 3 | 25,000ms | 奖励箱生成间隔 | 奖励箱池 `intervalMs=25000` |
| 4 | 0 | 最大升级次数 | `maxUpgrades=0` |
| 5 | 30,000 | 未发现 DEX 读取点 | 不实现、不猜用途 |
| 6 | 5 | 特殊击杀气泡的最低敌人类型 | 已验证但属非战役反馈，不纳入此批 |
| 7 | 32 | 同时存在奖励箱上限 | 奖励箱池 `simultaneousLimit=32` |
| 8 / 9 / 10 | 75 / 150 / 188 | Easy / Medium / Hard 敌人生命倍率 | 按难度接入 `enemyHitPointMultiplierPercentByDifficulty` |
| 11 | 299,000ms | Gambler 冷却 | `gambler.cooldownMs=299000` |

| 波次 | APK键 | 说话者 / 肖像 | 英文原文 | 中文译文 |
| --- | --- | --- | --- | --- |
| 1 | `T_IA_CAMPAIGN_04_01` | Pedro / `portrait_pedro` | The railroad could be our most powerful weapon, if we mount deadly Gatling guns on empty cars! Unfortunately that isn't free. | 如果能在空车厢上装上致命的加特林机枪，铁路就会成为我们最强大的武器！可惜，这可不便宜。 |
| 2 | `T_CAMPAIGN_04_02` | Pedro / `portrait_pedro` | The most low-down characters frequent the saloon. If we run out of fighters out here, we can surely get some replacements in there! | 酒馆里总有些最不入流的家伙。要是外面的战士不够了，我们肯定能从那里招些替补！ |
| 3 | `T_CAMPAIGN_04_03` | Engineer / `portrait_engineer` | If the settlers had taken the railroad, it would have been much quicker! | 要是拓荒者乘铁路来，就快多了！ |
| 4 | `T_CAMPAIGN_04_04` | Settlers / `portrait_settlers` | Why didn't we take the railroad? It would have been much quicker! | 我们为什么不走铁路？那样肯定快多了！ |
| 5 | `T_CAMPAIGN_04_05` | Pedro / `portrait_pedro` | We spotted some settlers in the South. Don't let them slip past us! | 我们发现南边有些拓荒者。别让他们溜过去！ |
| 6 | `T_CAMPAIGN_04_06` | Settlers / `portrait_settlers` | Gold! Gold! We found gold! Let's take this treasure with us. Nothing will happen to us. | 黄金！黄金！我们找到黄金了！把财宝带上吧，不会出事的。 |
| 7 | `T_CAMPAIGN_04_07` | Pedro / `portrait_pedro` | Hee hee hee! How nice of you to offer the gold up to us on a silver platter! | 嘿嘿嘿！你们真客气，竟把黄金拱手送到我们面前！ |
| 8 | `T_CAMPAIGN_04_08` | Pedro / `portrait_pedro` | The last settlers are coming up ahead. We'll set a trap for them that they'll never forget. Hee hee hee! | 最后一批拓荒者就在前面。我们要给他们设个永生难忘的陷阱。嘿嘿嘿！ |

## 下一步

### 1. 补齐 Gold Transport 与车辆残骸规则

- 支持 Wave Pool type9→敌人 type6；按 APK 单体生成 Gold Transport，加载普通图、转向图和 HDPI 原始资源，保持类型6的速度、生命、奖励、穿透、转向、逃脱扣命和动态难度权重。
- 让类型6进入车辆碰撞/出生阻挡、绘制锚点、转向动画、799ms 死亡动画、爆炸音效请求和残骸流程。按 APK 只读证据统一覆盖车辆 type4–6 的残骸计时与乘客抽样，使用各自平均乘客数 2、4、0；Gold Transport 的平均值为0，不等于固定不产生乘客。
- 定向测试覆盖 Gold Transport 单体、type9 请求消耗、尺寸和锚点、伤害与奖励、动态难度、逃脱扣命、车辆阻挡、残骸乘客随机边界及 RNG 消耗；既有 Covered Wagon/Post Coach 测试作为回归边界。
- **关闭条件：**type9 请求不再悬挂；Gold Transport 的静态属性、车辆生命周期与 APK 映射测试通过；既有类型4/5行为测试未回归。此切片针对性验证通过后本地提交。

### 2. 让玩家生成池支持原版整表动作

- `SpawnPoolManager.setSpawnPool()` 和 `setSpawnPoolMax()` 都替换完整 37 槽数组。当前网页动作类型只接收单个池槽；连续四个 `set-max` 会互相清空，不可表达 map04 的 `pool1..4=5`。
- 将 `CampaignUnitPoolActionDefinition` 最小扩展为整表 `set`/`set-max` 与标量 `add`/`add-max` 两种表达；迁移 Fort Kaboom 单槽动作并保留其结果。为同一动作数组配置多个非零槽，验证一次 set-max 后四槽均为 5，其他槽为 0。
- **关闭条件：**新增规则测试覆盖完整数组替换、遗漏槽清零及 Fort Kaboom 现有池行为；针对性测试通过后本地提交。

### 3. 注册 Tech Town 正式关卡内容

- 在正式内容文件中接入上方八波矩阵、四个入口、wave2 玩家池动作、15秒玩家池间隔，以及 map04 的现金、生命、升级上限、奖励箱、难度倍率和 Gambler 冷却。
- 玩家池 type1–4 对应 Gunslinger、Mexican、Cannon、Indian；仅放入在关卡4可用的单位。Special units 的 APK 解锁门槛晚于关卡4，仍按同一档案快照判断，不把它们默认全部开放。Gambler 与 Casino 必须同时出现或同时隐藏。
- 接入八段双语对白、原版肖像与现有波次对白窗口；加载 `portrait_engineer` 等实际引用资源。索引6的短击杀气泡和未被读取的索引5不扩展为本批新 UI。
- 将 Tech Town 登记为第4个正式关卡，依赖 Fort Kaboom；保存的 map03 完成记录使其可进入。map05 的进度依赖 map04 完成，但由于 map05 内容未实现，仍在关卡图中禁用并标为“尚未实现”。胜/负结果只由现有正式结算路径写入一次档案。
- **自动化验收：**用独立期望核对地图入口、八波全部入口与计数、两类池动作、玩家单位池、玩家池生成点与间隔、12 个关卡参数映射、8 段原文/中译/说话者/肖像、资源预加载、关卡3/4/5状态和唯一档案结算。正式关卡会话从实际 Tech Town 数据启动，不用独立 fixture 替代内容断言；规则机制可用小型定向 fixture 验证。
- **浏览器验收：**窗口模式、静音；用内置浏览器确认选关状态、进入 Tech Town、八波正式上下文、招募或单位移动中的一项代表操作，以及回到地图/结算入口。无需手打完整战役，不进入全屏、不播放音效。
- **关闭条件：**3/60 正式关卡计数更新为 4/60；静态内容和正式进度测试通过；前 3 关未发生回归。每个切片针对性检查并本地提交，整个 Tech Town 批次结束后运行一次 `pnpm run test:ci` 与适用共享检查。

### 后续战役

map04 验收后逐关处理 New Mexico map05–10，再处理 Mississippi map14–23、Oregon map24–33、Dakota map34–43、Nevada map44–53、Alaska map54–63。每关先复核 APK 与现有框架，只实现该关实际需要的数据或新机制；APK 地图文件 11–13 不计入 60 关战役。首次出现的新敌人、建筑、交通工具或规则只在真实使用场景验证。

## 证据与发布门槛

- 每个新增规则或参数都能追溯到 APK 资源、REA 结果、DEX 位置或明确标记的运行观察；JADX Java 伪代码不是原始源码。曾发现 `GameObjectManager.createGameObjectsFromBasicMap()` 的 Java `switch` 输出有控制流错误，码位判断以 DEX smali 为准。
- 只有具体行为无法由静态证据回答时，才执行一次最小 Android 观察；记录问题、设备状态、判定标准和结果。不重复看启动页，不模拟完整战役。
- 发布按应用规则执行：每个切片先定向验证并提交；批次全套检查通过后以一个 squash commit 集成。普通发布比例目标不高于 20%，核心缺陷修复按实际情况记录；公开发布核对 CI、来源 SHA 与内置浏览器结果。文档整理不计实现切片、不单独发布。
