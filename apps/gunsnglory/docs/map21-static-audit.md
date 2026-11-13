# Oregon 第21关：Eastwood Forest 静态审计

## 结论与边界

Eastwood Forest 是全局第21关、Oregon 区第1关，使用 `res/raw/td_map_24.tdm`。本地 APK 原始文件与研究归档中的 32×24 网格逐字节一致。地图可由现有地形/碰撞规则和 TDM 路径 marker 复原；关卡有8波、20条 `addToWave` 调用，没有 `addActionForSpawnPool`。

本报告基于 Guns’n’Glory FREE 1.8.6 APK 的资源、DEX 和反编译调用链，不是 Android 运行记录，也不依赖通关观察。研究归档在本地 `codex/gunsnglory-spec` 分支；其文件通过 `git show codex/gunsnglory-spec:<path>` 读取，不作为网页运行或构建依赖。JADX/REA 生成的 Java 只用于定位，结论以 DEX 控制流和 APK 派生数据为准。

| 结论类别 | 本关结论 |
| --- | --- |
| 已证实 | global level 21 使用 map24；地图尺寸32×24，770字节；地形、路线 marker、初始对象和8波参数均有 APK 数据或 DEX 消费代码支持。 |
| 静态推导 | 按 `EnemyDirectorField` 的方向规则展开，地图有4个出生点、2个出口、42个唯一转向点、6条完整路径和47条有向控制边。 |
| 关键实现约束 | 新局不实例化存档恢复 marker 96–101、130、131。新局构造 `GameObjectManager(..., false)`；这些 marker 的 DEX 构造路径要求 `fromLoadGame == true`。 |
| 未确认 | `awesomeMessageMin=30000` 的网页消费语义，以及对白头像之外的角色语音映射。不得据字段名或头像猜测。 |

## 证据入口

| 核对内容 | 研究归档来源 | 用途与边界 |
| --- | --- | --- |
| APK 地图编号、维度、网格和原始长度 | `apps/gunsnglory/docs/research/data/map-inventory.json`，`maps[index=24]` | 网格按 y-major 保存；本地 `~/Downloads/gunsnglory-1-8-6.apk` 中 `td_map_24.tdm` 的 `[width,height,grid...]` 字节与记录完全相同。 |
| 地形、街道、碰撞值和图集选择 | `data/terrain-render-index.json` 的 `map_index=24`；REA `Oregon.drawBackgroundLayer`；反编译 `levelpacks/Oregon.java` | 地形索引是派生绘图资料，不是原始 REA Evidence；APK 绘制方法和 TDM 才是语义来源。 |
| 路线方向和实体 marker | DEX `EnemyDirector.createEnemyDirectorFieldsFromBasicMap`、`GameObjectManager.createGameObjectsFromBasicMap`；反编译 `gamelogic/GameObjectManager.java` | marker 解释结合原始网格和 `fromLoadGame` 分支，不把恢复状态当新局对象。 |
| 初态、敌人请求、波次和赌场冷却 | `data/level-config.json` 的 `tables.levels[index=20]`；`recovered-source/java/com/hg/gunsandglory/datastorage/GameDesignWaves.java` 的 `i == 21`；`units/Gambler.java` | `waves.json` 的聚合 `rawCalls` 不保留 `newWave` / `addToWave` 交错顺序，以 Java 源调用顺序为准。`Gambler` 构造器将关卡数据索引11设为最大冷却；M21 可将299000毫秒映射到网页 `cooldownMs`。 |
| 文案、头像、音频 | `data/string-resources.json`、`data/resource-inventory.json`；`levelpacks/Oregon.java` | 字符串默认语言是 APK 英文。`newWave` 的头像引用不证明角色语音。 |
| 现有网页接入点 | `apps/gunsnglory/src/content/campaign-catalog.ts`、地图渲染辅助和关卡目录 | 目录已经登记 level21 / map24 / title resource24；本轮需要补齐可玩内容和正式注册。 |

## 关卡身份与地图

- 战役身份：Oregon 第1关，全局第21关；标题资源 `T_LEVEL_NAME_24` 为 **Eastwood Forest**，简介资源为 `T_LEVEL_INFO_24`。
- 地图资源：`res/raw/td_map_24.tdm`，32列×24行、每格32像素、768个网格单元、770字节（前两字节为宽高）。地图格子尺寸为1024×768逻辑像素。
- 本地 APK 的原始 map24 与 `map-inventory.json` 中的行优先网格重建结果逐字节一致。实现测试应固定这个资源身份并逐格比较，不按战役编号推算地图号。
- 站点已有 `public/assets/menu/gng_levelmap_24.png`。该图片是选关预览，不替代可玩地图；Oregon 需要的地形 atlas 已在应用资源中，地图 alias 应与 APK 的 `Oregon.loadIngameImagesPack()` 保持一致。

### 路线拓扑

TDM 出生点代码40–43各1个，出口代码48共2个，转向代码52–65共42个。出生点 action ID 是 marker 值减40；行扫描次序与当前地图路由生成器的 spawn 顺序一致。

| 出生点 marker / 坐标 | 初始方向 | 可达出口 | 分支数 |
| --- | --- | --- | ---: |
| 40 / `(31,3)` | 西 | `(12,0)` | 2 |
| 41 / `(31,12)` | 西 | `(12,0)` | 2 |
| 42 / `(31,19)` | 西 | `(11,0)` | 1 |
| 43 / `(25,23)` | 北 | `(11,0)` | 1 |

从源 marker 方向表静态展开的六条路线如下。坐标均为 `(x,y)`；序列列出经过的转向点，末尾为出口。

1. `(31,3)` → `(28,3) → (28,5) → (23,5) → (23,9) → (17,9) → (17,12) → (12,12) → (12,15) → (7,15) → (7,13) → (5,13) → (5,10) → (2,10) → (2,6) → (5,6) → (5,5) → (12,5)` → `(12,0)`。
2. `(31,3)` → 前一路线至 `(7,15)` 后，经 `(5,15) → (5,13) → (5,10) → (2,10) → (2,6) → (5,6) → (5,5) → (12,5)` → `(12,0)`。
3. `(31,12)` → `(27,12) → (27,10) → (18,10) → (18,13) → (13,13) → (13,15) → (12,15) → (7,15) → (7,13) → (5,13) → (5,10) → (2,10) → (2,6) → (5,6) → (5,5) → (12,5)` → `(12,0)`。
4. `(31,12)` → 前一路线至 `(7,15)` 后，经 `(5,15) → (5,13) → (5,10) → (2,10) → (2,6) → (5,6) → (5,5) → (12,5)` → `(12,0)`。
5. `(31,19)` → `(28,19) → (28,16) → (21,16) → (21,18) → (13,18) → (13,16) → (12,16) → (4,16) → (4,11) → (1,11) → (1,5) → (4,5) → (4,4) → `(11,4)` → `(11,0)`。
6. `(25,23)` → `(25,21) → (21,21) → (21,19) → (12,19) → (12,16) → (4,16) → (4,11) → (1,11) → (1,5) → (4,5) → (4,4) → `(11,4)` → `(11,0)`。

路线生成应验证6条完整路径、42个唯一转向点、47条有向边、两个出口均可到达，且没有越界或环。不能只检查“有路线”或以截图目测替代逐点校验。

### 地形与碰撞

`Oregon.loadIngameImagesPack()` 把 Oregon 的 `miss_tiles_canyon`、`miss_tiles_canyon_wall_var`、`miss_tiles_desert`、`miss_tiles_desert_var`、`miss_tiles_waterside`、`miss_tiles_waterside_var`、`miss_tiles_path` 和 `miss_tiles_path_var` 映射到通用 `tiles_*` cache 名；其余 canyon floor、shadow、water 等直接使用通用 atlas。不得因 `miss_tiles_*` 名称把 Oregon 地图改成 Mississippi 地貌。

`Oregon.drawBackgroundLayer()` 按 `BackgroundMap` 值绘制 canyon、desert、shadow、water 和 waterside；背景变体由 APK 的共享随机器选择。网页继续使用项目已定义的可复现随机策略。map24 派生碰撞层在变体前有352个零格和416个非零格；完整逐格值来自 `terrain-render-index.json`，验收时应与该派生数据一致。街道层有76个非零格；该图没有派生的水平桥墩放置记录。

## 地图实体与单位 marker

### 新局对象

| marker | 数量和坐标 | APK 消费语义 |
| ---: | --- | --- |
| 104 | 2：`(16,6)`、`(16,9)` | 新局创建 Gunslinger，activity 5。 |
| 105 | 2：`(14,6)`、`(13,9)` | 新局创建 Mexican，activity 5。 |
| 132 | 1：`(13,3)` | 新局且 Gambler 已解锁时创建 Gambler，activity 5。 |
| 150 | 1：`(14,3)` | Gambler 已解锁时创建 Casino spawn location；须与本图 Gambler 配对。 |

APK `GameObjectUnit.isUnlocked(9)` 检查全单位解锁、当前关卡等级或里程碑完成。Gambler 的原始解锁行是 `[41,50]`；M21 当前关卡等级21未达到第一门槛，因此此关只在完成全局第50关或全单位解锁时出现。网页应使用存档/回放快照并保证 Gambler 与 Casino 同生同灭。

`Gambler.CARD_UNITS` 包含单位类型1–6、35、36及现金结果；可抽到哪些单位仍受各自原版解锁判断限制。现有网页 `ScenarioContent.gambler` 要求奖品类型在初始 `scenario.units` 中有设计，但 M21 对应的部分角色只出现在存档恢复 marker 96–101、130、131。M21 必须把这些对象保留为 template-only 奖品定义，不能将它们加入开局单位列表；该模板能力独立于 `campaignUnitPool`，不等于新增池动作。

### 仅用于存档恢复的 marker

新关卡初始化 `restartLevel()` 传 `false` 给 `GameObjectManager`；无有效存档的 `onLoadGame()` 也设置 `fromLoadGame=false`。DEX 在 `fromLoadGame==true` 分支才构造 marker 96–101、130、131 对应的 activity 4 单位。它们不是新局可招募点。

| marker | 数量和坐标 | 恢复时对应类型 |
| ---: | --- | --- |
| 96 | 12：`(9,1)`、`(18,1)`、`(1,2)`、`(21,3)`、`(18,6)`、`(29,6)`、`(8,10)`、`(15,15)`、`(2,18)`、`(26,18)`、`(17,21)`、`(30,22)` | Gunslinger |
| 97 | 12：`(4,1)`、`(23,2)`、`(15,4)`、`(7,9)`、`(30,9)`、`(1,15)`、`(17,15)`、`(1,21)`、`(7,21)`、`(12,21)`、`(29,21)`、`(15,22)` | Mexican |
| 100 | 1：`(19,12)` | Sniper |
| 101 | 4：`(26,7)`、`(1,12)`、`(10,12)`、`(22,13)` | Grandpa |
| 130 / 131 | `(4,23)` / `(30,16)` | Pyromaniac / Salesman |

当前网页共享工厂 `createNewMexicoMapUnits()` 会按解锁状态把部分上述 marker 作为新局 activity 4 单位；这和 APK 的 `fromLoadGame` 分支不一致。M21 不得使用该路径生成这些 marker。已发布 M1–M20 的历史行为、旧回放内容版本和测试需要另立兼容性修复，不在本关里悄悄改写。

### 静态装饰与其他 marker

- `GameObjectManager` 将 code79 转成装饰对象 ID 15；`GameObjectDecoration` ID 15 使用 `e_1x1_tree_green_a`，map24 共10格。code126 在该地图出现于 `(17,1)`，转成 ID 20 的 `e_1x1_rocks_water`。
- code150 `(14,3)` 只在 Gambler 解锁时建立 Casino spawn location；网页用配对的赌场装饰位置供 Gambler 奖品生成。
- code69 共3格 `(31,7)`、`(0,11)`、`(6,23)`；code70 共4格 `(0,0)`、`(20,1)`、`(1,16)`、`(30,21)`；code74 位于 `(4,19)`。它们使用对象管理器的装饰分支；贴图编号须与 Oregon drawable index 和当前资产表核对后再落地。
- code115、118、119 分别9、3、6格；DEX 对象管理器没有为这些值构造 `GameObject` 的分支，须按背景/道路绘制数据处理，不额外伪造成单位或装饰实体。
- 本图没有 code102 Dynamite、114 Tipi、120–123 Steamer、106 Cannon 或任何其他 Fort Cannon marker。map24 波次也没有玩家单位池动作。

## 初态、难度、奖励箱与波次

APK `GameDesignData` 的 level-config 行索引20对应全局关卡21：

| 参数 | 原值 | 使用边界 |
| --- | ---: | --- |
| 初始现金 / 生命 | 75 / 25 | 新局状态。 |
| 最大升级 | 3 | 按现有关卡升级规则。 |
| 敌人 HP 倍率（Easy / Medium / Hard） | 86% / 115% / 140% | 新局难度参数。 |
| 奖励箱总数 / 间隔 / 同时上限 | 999 / 25,000 ms / 15 | 对应现有关卡奖励箱机制。 |
| `awesomeMessageUnit` | 5 | 由已有反馈阈值消费者核对后复用。 |
| `awesomeMessageMin` | 30,000 | 当前消费语义未闭环，不照字段名添加计时器。 |
| `gamblerTime` | 299,000 ms | `Gambler` 构造器读取 `GameDesignData[level - 1][11]` 并设为 `maxWeaponCooldown`；网页对应 Gambler 牌局冷却 `cooldownMs`。 |

`GameDesignWaves.setWaves(i == 21)` 按源代码调用顺序创建8波；`newWave(delay, HP%, speed%)` 参数如下。每条 `addToWave` 的间隔均为2500ms。

| 波次 | `newWave` 延迟 | HP倍率 | 速度倍率 | spawn action ID |
| ---: | ---: | ---: | ---: | --- |
| 1 | 15,000 ms | 90% | 120% | 0 |
| 2 | 15,000 ms | 100% | 120% | 1 |
| 3 | 15,000 ms | 110% | 125% | 0、1 |
| 4 | 20,000 ms | 120% | 125% | 2、3 |
| 5 | 15,000 ms | 130% | 130% | 2、3 |
| 6 | 20,000 ms | 140% | 135% | 0、1、2、3 |
| 7 | 15,000 ms | 150% | 140% | 0、1、2、3 |
| 8 | 15,000 ms | 160% | 145% | 0、1、2、3 |

`Wave` 常量定义了8个参数槽：Settler ×1、Settler ×2、Settler ×3、Settler ×4、Rider、Covered Wagon、Post Coach、Gold Transport。下列向量严格按此顺序；不包括 boss 和 doctor 两个后续参数槽，它们在这些 `addToWave` 调用中为0。

| 波次 | action ID : 八槽请求向量 |
| ---: | --- |
| 1 | `0: [2,3,1,2,1,2,0,0]` |
| 2 | `1: [0,3,2,3,2,3,0,0]` |
| 3 | `0: [0,0,2,3,2,1,1,0]`；`1: [0,0,2,3,2,2,0,0]` |
| 4 | `2: [0,0,2,3,2,2,0,0]`；`3: [0,0,2,3,2,1,1,0]` |
| 5 | `2: [0,0,0,5,2,1,1,0]`；`3: [0,0,0,5,1,2,1,0]` |
| 6 | `0: [0,0,2,3,2,1,1,0]`；`1: [0,0,2,3,1,2,0,0]`；`2: [0,0,2,3,2,1,1,0]`；`3: [0,0,2,3,1,2,0,0]` |
| 7 | `0: [0,0,2,3,1,1,1,0]`；`1: [0,0,2,3,2,2,2,0]`；`2: [0,0,2,3,1,1,1,0]`；`3: [0,0,2,3,1,2,2,0]` |
| 8 | `0: [0,0,2,2,1,1,1,1]`；`1: [0,0,2,2,2,2,2,0]`；`2: [0,0,2,2,1,1,1,0]`；`3: [0,0,2,2,1,2,2,0]` |

每波调用数为 `[1,1,2,2,2,4,4,4]`，共20条。action ID 指向 TDM 出生点 marker 40–43；关卡实现需显式映射到网页 `spawnPointId`，并在真实 `GameSession` 测试中推进各波。原始 Java 调用顺序是唯一分波依据；`waves.json` 的聚合字段和聚合 `rawCalls` 不保留 `newWave` / `addToWave` 的交错顺序。

## 文案、资源与声音

### 标题与对话

- 标题：`T_LEVEL_NAME_24` → `Eastwood Forest`。
- 简介：`T_LEVEL_INFO_24` → `A famous cowboy with a white DeLorean coach gave the name for this idyllic forest.`
- 字符串索引中没有 `T_LEVEL_NAME_WON_24` 独立胜利标题；`Oregon.getSuccessTextId()` 只为 Oregon 第10关返回区域结算，其余关卡走父类通用结果。M21沿用项目通用结算，不新造独立标题。

| 波次 | 文案资源 | APK 英文原文 | 头像资源 |
| ---: | --- | --- | --- |
| 1 | `T_CAMPAIGN_21_01` | Hey, Boss! It was a good idea to vacation at Oregon Trail! Just relaxing and picking settlers' pockets for gold! Ay, caramba! | `portrait_pedro` |
| 2 | `T_CAMPAIGN_21_02` | Pickpocketing a colt from settlers? Bah, I'll keep to my good old scattergun! It stuns butts and legs! | `oregon_dakota_portrait_geezer` |
| 3 | `T_CAMPAIGN_21_03` | Grrr, I hate those smelly horses and modern stagecoaches! Let's see what my pepper volleys can do here! | `oregon_dakota_portrait_geezer` |
| 4 | `T_CAMPAIGN_21_04` | Hey, old man, just let us deal with the horses and coaches! You can take on the settlers that are coming from the south on foot! | `portrait_pedro` |
| 5 | `T_CAMPAIGN_21_05` | Screw you! Are those trees or settlers? You know, my eyes aren't as young as they used to be! Whatever, I'll shoot it! | `oregon_dakota_portrait_geezer` |
| 6 | `T_CAMPAIGN_21_06` | We'll be rich! They're coming from everywhere! Arriba! Arriba! Ándale! | `portrait_mexican` |
| 7 | `T_CAMPAIGN_21_07` | Yeehah! Make your Colts smoke, men! | `portrait_gunslinger` |
| 8 | `T_CAMPAIGN_21_08` | Boss, the Sheriff's on his way! We should get out of here, with the gold from these last settlers! | `portrait_pedro` |

上表是 APK 的 default 英文。网页提供中文项目译文。`newWave` 只给文案和头像资源 ID；未找到对应的 M21 台词专属 voice mapping 前，不根据头像添加配音。

### 区域资源

| 用途 | APK 行为 | 当前应用资源状态 |
| --- | --- | --- |
| 环境循环 | `Oregon.setBackgroundLoop()` 使用 `music_atmo_forest` | 已存在。 |
| 战斗循环 | `music_oregon`、`music_loop2`、`music_loop3` 按波次轮换 | 三首离线音乐文件均已接入；`music_oregon.ogg` 为 APK 原文件，787,340字节。 |
| Geezer 对话头像 | APK `res/drawable-mdpi-v4/oregon_dakota_portrait_geezer.png`，96×96 | 已从 APK 原样提取到应用资源；未以角色大图裁切替代。 |
| 地图缩略图 | `gng_levelmap_24.png` | 当前应用已存在。 |
| Oregon atlas | `Oregon.loadIngameImagesPack()` 复用 `miss_tiles_*` atlas 并映射到通用 tile cache 名 | 所需 miss/通用 atlas 当前已在 `public/assets/`。 |

音频只核对资源引用和离线文件；开发及浏览器验收默认静音，不播放声音。

## 正式关卡、Free Play 与回放

- `campaign-catalog.ts` 已有 level21、region `oregon`、Eastwood Forest、`mapFileNumber=24`、`titleResourceNumber=24`；接入时不要重复或改写此目录项。
- 官方正式关卡新条目使用 `campaign-oregon-01`，前置为全局 level20 的 Horse Hills 对应场景；未完成20时锁定，完成20后开放。
- Free Play 允许直接进入本关的 Easy、Medium、Hard；正式与自由模式共用地图、规则和资源。
- 使用本关独立 contentVersion，回放恢复录制时 Gambler 解锁快照；正式胜利可记录 level21，Free Play 不修改战役完成进度、高分或困难解锁。

## 实现验收清单

- 原始 TDM 身份、地图尺寸、路线坐标/边、图层绘图命令、图源边界和碰撞逐格相符。
- 新局实体与 `GameObjectManager` 的 marker 和 `fromLoadGame` 语义相符；Gambler/Casino 解锁门槛、299000ms 冷却和八种卡牌奖品解锁状态一致，存档恢复 marker 只可作为 template-only 奖品数据，不能成为新关招募点。
- 八波参数和20条 `addToWave` 调用按 DEX/Java 顺序与八种敌人槽逐值匹配；无单位池动作，无新 Cannon 模板或虚构炮位。
- 双语内容、头像、音乐文件和 atlas 离线可读取；无依据的胜利标题或对白语音不新增。
- 正式/自由入口、三档难度、结算隔离、回放内容版本通过自动化和内置浏览器代表流程。静音、窗口模式、不完整通关、不启动 Android。
