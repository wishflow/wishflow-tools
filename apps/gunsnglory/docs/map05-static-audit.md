# New Mexico 第 5 关：Billy Hills 静态审计

## 审计结论

**静态内容审计已闭环，可以开始实现。**本关地图、路线、单位、八波请求、数值、对白、资源、关卡解锁及胜利结算均可由 APK 数据和代码消费者交叉确认。没有发现需要新增战斗规则的缺口；主要差异是新增地图内容，以及把当前只接受五节的 Tech Town 火车内容构造器泛化到七节。

本报告记录的是 APK 1.8.6 的静态证据和当前 TypeScript 消费能力，不是 APK 运行观察，也不要求手动打完整关卡。APK 位于 `~/Downloads/gunsnglory-1-8-6.apk`，包名为 `com.hg.gunsandgloryfree`。

## 证据索引与判断标记

证据统一按语义名称和 APK 路径定位，不使用难以检索的长哈希。

| 名称 | 原始证据与代码入口 | 用途 |
| --- | --- | --- |
| `MAP05-TDM` | APK `res/raw/td_map_05.tdm`；`BasicMap.loadMap` | 尺寸、768 个格值、入口出口、方向场、地图对象和初始单位 |
| `MAP05-ROUTES` | `EnemyDirectorField` 的方向映射及 `createEnemyDirectorFieldsFromBasicMap`；`PriorityMap.recursiveLengthTracking` | 路线方向、分支选择、路线优先级 |
| `MAP05-OBJECTS` | `GameObjectManager.createGameObjectsFromBasicMap`；`GameObjectDecoration` 构造逻辑 | TDM 对象码到场景物件、单位、列车和出生点的关系 |
| `MAP05-LEVEL` | `GameDesignData.<clinit>` 的关卡表第 5 行；`LevelPack.getLevel(false)`、难度取值方法 | 经济、生命、宝箱、升级上限和难度生命倍率 |
| `MAP05-WAVES` | `GameDesignWaves.setWaves` 中 Billy Hills 的八波记录；`WaveManager.addToWave` | 波次延迟、血量/速度倍率、生成池间隔及十项请求向量 |
| `MAP05-POOL` | `SpawnPoolManager`、`GameObjectSpawnLocation` 及 `NewMexico` 关卡初始化 | 玩家单位池、地图招募点、波次库存动作 |
| `MAP05-FLOW` | `NewMexico` 完成处理；`GameObjectUnit.isUnlocked(int)`；`GameDesignData.unlockUnitData`；`UserProfile.isLevelFinished(int)` | 正式结算与单位解锁条件（当前关卡门槛或完成里程碑） |
| `MAP05-ASSETS` | APK drawable/raw 资源目录；仓库 `public/assets/` | 地图图集、装饰、列车、缩略图、头像、音乐和声音资源 |

文中标记：**直接证据**表示 APK 数据或方法直接给出；**代码推导**表示由多个已确认字段和消费者关系推出；**实现状态**表示当前网页工程已有的契约或能力；**适用限制**表示已知的不确定表现范围。

## 关卡身份与地图文件数量

- **直接证据：**`td_map_05.tdm` 是 New Mexico 第 5 关 Billy Hills；标题资源为 `T_LEVEL_NAME_05`，胜利标题资源为 `T_LEVEL_NAME_WON_05`，关卡简介资源为 `T_LEVEL_INFO_05`。
- **直接证据：**APK 有 63 个地图文件，但 campaign catalog 有 60 个实际战役关卡；地图文件编号 11–13 不对应 campaign 条目。不能把资源文件总数当成可玩关卡数。
- **实现状态：**网页 `campaign-catalog.ts` 已有第 5 关 Billy Hills 条目；`official-campaign.ts` 当前正式登记到第 4 关。地图选择器将它显示为未实现，直到正式场景和规则注册完成。
- **实现建议：**正式场景 ID 沿用现有命名规律 `campaign-new-mexico-05`；战役入口依赖第 4 关完成，自由模式沿用正式关卡内容但不得写入战役档案。

## 地图网格与原始格值

- **直接证据：**TDM 头部给出宽 32、高 24，后续正好 768 个格值；每格 32×32 逻辑像素，原始地图尺寸为 1024×768。横纵坐标均从 0 开始。
- **直接证据：**以下是原始格值的完整频数，可用于导入后逐码核对。空白代码未列出。

```text
0×355, 16×87, 32×94, 36×64, 40×1, 41×1, 48×2,
52×7, 53×9, 54×3, 55×13, 58×1, 59×1,
68×7, 69×4, 70×4, 72×2, 73×3, 74×2, 75×1, 76×3,
80×5, 82×21, 83×2, 84×5, 86×1, 87×1, 88×9,
96×9, 97×6, 98×3, 99×10, 100×1, 101×2, 104×1, 105×1,
112×1, 113×1, 114×1, 116×2, 117×2, 124×17, 126×1,
130×1, 131×1
```

- **代码推导：**`originalTileGrid` 同时服务于来源地图格值、玩家单位碰撞和小地图；它不能替代渲染层。网页 `ScenarioContent.map.background`、`streets` 和 `decorations` 应分别由同一原始网格导出，路线场也应单独生成。
- **实现状态：**现有 `new-mexico-02.json` 至 `new-mexico-04.json` 保留 APK 原始格网并分别保存渲染层；map05 应沿用相同数据模型和静态 variation 生成策略。
- **适用限制：**原版地面/路径的随机变化由未设固定种子的随机数产生，单次运行纹理选择不是固定基线。网页应沿用已采用的固定 Java `Random` 种子，保证测试与回放可重复；这不声称逐次复现原版每次启动的随机贴图。

## 入口、出口与敌人方向场

### 入口与出口

| TDM 码 | 位置 | 方向/含义 |
| --- | --- | --- |
| 40 | `(0, 5)` | 上方入口，向东 |
| 41 | `(0, 13)` | 下方入口，向东 |
| 48 | `(31, 7)`、`(31, 8)` | 两个出口，分别对应上/下路线汇流 |

### 转向场

| TDM 码 | APK action | 方向 | 位置 |
| --- | ---: | --- | --- |
| 52 | 0 | 北 | `(10,6)`、`(26,8)`、`(27,9)`、`(26,14)`、`(25,15)`、`(26,19)`、`(27,20)` |
| 53 | 1 | 南 | `(10,3)`、`(14,4)`、`(17,6)`、`(13,10)`、`(21,10)`、`(5,13)`、`(17,15)`、`(6,16)`、`(8,18)` |
| 54 | 2 | 西 | `(27,14)`、`(21,15)`、`(26,15)` |
| 55 | 3 | 东 | `(7,3)`、`(10,4)`、`(7,6)`、`(14,6)`、`(26,7)`、`(25,8)`、`(27,8)`、`(26,9)`、`(13,15)`、`(5,16)`、`(6,18)`、`(17,19)`、`(8,20)` |
| 58 | 6 | 北/南随机选择 | `(7,5)` |
| 59 | 7 | 西/东随机选择 | `(17,10)` |

- **代码推导：**下方入口只有一条主线；上方入口经过两个二选一分岔，形成四条具体路径。因此地图有 5 个入口—路径变体，但只有 2 个实际出生点和 2 个出口。
- **代码推导：**按 APK 的递归路线长度与方向优先规则建立五条具体路线后，共覆盖 142 个路线格；将 APK 算法与当前 TypeScript 路线优先级算法逐格比对，优先级值完全一致，最小值为 191。该结果证明既有算法可以复用，不代表浏览器运行观察。
- **实现状态：**`WaveRouteDefinition` 支持每个出生点独立 redirects、多个 exits；敌人生成池可按 `spawnPointId` 分配到不同入口。无需另加 A*、改变 TDM 路线或改动优先级公式。
- **验收要点：**测试必须从两个入口出发，分别覆盖上方四种随机路径及下方路线，核对每个转向节点、出口和优先级；不能只测地图小地图上显示了一条路线。

## 地形、碰撞与静态场景对象

### 地形与层

- **直接证据：**主要地面格为 0、16、32、36、48–59、80、82–89 和 120–126；`BackgroundMap`、`NewMexico.drawBackgroundLayer` 分别生成沙漠、峡谷/河床/水边、阴影、道路和铁路等图层。
- **代码推导：**玩家移动碰撞与敌人路线场分离。网页 `mapBlocksUnit` 将峡谷边界及 120–126 水域作为阻挡背景处理；道路层格 16–19 可通行。不能因为敌人方向场经过某格，就把敌人的路线逻辑当成玩家单位寻路或道路贴图。
- **实现建议：**先生成并对照背景、道路/铁路和前景装饰，再加单位。场景单位碰撞框须沿用 APK 物件锚点；贴图位置不能通过改路线节点来补偿。

### 装饰物与建筑

| 码 | 物件 | 数量与位置 |
| --- | --- | --- |
| 68 | 仙人掌 A | 7：`(10,1)`、`(19,1)`、`(5,7)`、`(9,13)`、`(29,16)`、`(15,17)`、`(25,23)` |
| 69 | 岩石 A | 4：`(0,0)`、`(9,4)`、`(25,4)`、`(19,13)` |
| 70 | 岩石 B | 4：`(13,0)`、`(2,8)`、`(31,15)`、`(0,20)` |
| 72 | 木桩 | 2：`(5,17)`、`(30,20)` |
| 73 | 仙人掌 B | 3：`(29,4)`、`(18,16)`、`(8,23)` |
| 74 | 风车 | 2：`(18,3)`、`(7,13)` |
| 75 | 水塔 | 1：`(5,23)` |
| 76 | 灌木 | 3：`(8,4)`、`(29,10)`、`(10,15)` |
| 86/87 | 铁路缓冲器左右件 | 左 `(1,22)`；右 `(30,22)` |
| 112 | Saloon 酒馆 | `(8,9)` |
| 113 | Fort 堡垒 | `(22,3)` |
| 114 | Tipi 营地 | `(2,18)` |
| 116 | 小屋 | `(2,7)`、`(29,23)` |
| 117 | 小 Tipi | `(29,18)`、`(6,20)` |
| 126 | 水中岩石装饰 | `(29,1)`；同时保留水域背景语义 |

地图05没有代码 71（树）、77（骨头）、132（Gambler）或 150（Casino）。因此无需创建 Gambler/Casino 配对或补不存在的对象。

### 铁路与初始列车

- **直接数据：**轨道码 82 有 21 格：`y=22` 上 `x=2..8` 与 `x=16..29`。列车为同一行 `x=9..15` 的连续七节：82 以外的列车码分别是机车 83 两节 `(9,22)`、`(10,22)`，货车 84 五节 `(11..15,22)`。
- **代码推导：**机车使用 `lok_hori_1of2`、`lok_hori_2of2`；五节货车均使用 `lok_wagon_hori`，作为同一水平移动组。货车有 Gatling 招募/武器配置；铁路缓冲器位于两个端点。
- **实现状态：**Game 的移动组命令与步进通过 `movementGroupId` 汇集并迭代全部成员，支持任意组长；缺口仅在 `createTechTownTrainPlacements()` 对五个 marker 的硬编码与错误消息。新增通用 map-unit/train placement helper 或显式 map05 构造数据即可，不改组移动规则。
- **验收要点：**断言 7 个成员的顺序、类型、位置、唯一组 ID、锚点和武器配置；对一个选中车厢发移动命令后，检查七节整体保持间距与先后顺序。无需模拟完整战役。

### 初始与可招募玩家单位

- **直接证据：**代码 96–101 是类型 1–6 的睡眠/可招募单位；代码 104/105 是已经活动的单位，分别位于 Gunslinger `(14,11)` 和 Mexican `(15,13)`；代码130/131分别是 Pyromaniac 与 Salesman 的招募单位。
- **直接数据：**map05 中候选单位数量：Gunslinger 9、Mexican 6、Cannon 3、Indian 10、Sniper 1、Grandpa 2、Pyromaniac 1、Salesman 1；初始活动单位 2 个。APK 的解锁数组前两项分别是 Grandpa `[21,30]`、Sniper `[31,40]`、Pyromaniac `[41,50]`、Salesman `[51,60]`。
- **直接证据：**玩家生成池每 15 秒更新；pool type 1–4 对应 Gunslinger、Mexican、Cannon、Indian；Saloon 接受 1–2，Fort 接受 3，Tipi 接受 4。TDM 的 112/113/114 建立这三个生成位置。
- **直接证据：**第 2 波对 pool type 1–4 先执行 `set` 为 0，再执行 `set-max` 为 5。该状态动作属于玩家招募池，不是敌方十项生成请求。
- **实现状态：**`CampaignUnitPoolDefinition` 已支持生成位置、类型匹配、更新间隔和 `set`/`set-max`；map05 只需声明地图对应数据。自由模式与战役需继续遵守现有战役档案隔离约束。

## 关卡数值与敌人数据

### 第 5 行关卡参数

APK 关卡表下标 4（玩家可见关卡号 5）解码为：

| 参数 | 值 | 解释 |
| --- | ---: | --- |
| 开局现金 | 250 | 新关初始金币 |
| 初始生命 | 50 | 逃脱判负计数 |
| 宝箱总数上限 | 999 | 关卡掉落容量上限 |
| 宝箱生成间隔 | 25,000 ms | 每 25 秒 |
| 最大升级等级 | 1 | 本关可升级上限 |
| 特殊提示最短间隔 | 30,000 ms | 事件提示节流 |
| 特殊提示的最小单位类型参数 | 5 | 是单位/事件参数，不是敌人数 |
| 同时在场宝箱上限 | 32 | 关卡字段约束 |
| 简单/普通/困难敌人生命倍率 | 75% / 150% / 200% | 选中难度的关卡倍率 |
| Gambler 冷却 | 119,000 ms | 本图无 Gambler/Casino，故此值没有实际入口 |

### 共用敌人基础数值

以下是 `GameDesignData.enemyDesignData` 的基础值。每波血量倍率、所选难度倍率及现有动态难度分别处理，不要把它们合并成一个猜测常数。

| 类型 | 敌人 | 基础 HP | 奖励 | 穿透 L/F/H/P | 转向时长 |
| ---: | --- | ---: | ---: | --- | ---: |
| 1、2 | Settler 组成员 | 18 | 1 | 100/50/25/75% | 0 ms |
| 3 | Horseman | 60 | 2 | 100/50/25/75% | 100 ms |
| 4 | Covered wagon | 200 | 10 | 50/100/66/100% | 200 ms |
| 5 | Post coach | 300 | 15 | 50/100/66/100% | 100 ms |
| 6 | Gold transport | 500 | 25 | 33/25/100/100% | 200 ms |
| 7 | Boss | 2,500 | 50 | 100/50/25/75% | 100 ms |
| 8 | Tow horse | 200 | 0 | 100/100/100/100% | 100 ms |
| 9 | Doc | 30 | 3 | 100/50/15/10% | 0 ms |

地图05八波的 Boss/Doc 请求计数均为 0；类型 7/9 数值列出是为了完整界定共用表，不表示它们会在本关生成。

## 八波与敌方生成池

请求向量固定为 10 项，顺序为原始池类型 2–11：`Settler×1、Settler×2、Settler×3、Settler×4、Horseman、Covered wagon、Post coach、Gold transport、Boss、Doc`。前四项表示不同组大小的请求次数，不是敌人个体总数。所有数值均来自 `GameDesignWaves.setWaves` 的 Billy Hills 记录；波次间隔按原版各生成池时间解释。

| 波次 | 开始延迟 | HP倍率 | 速度倍率 | 出生池与间隔 / 十项请求向量 |
| ---: | ---: | ---: | ---: | --- |
| 1 | 15,000 ms | 100% | 100% | 池0 / 2,000 ms：`[3,4,5,5,4,2,2,1,0,0]` |
| 2 | 5,000 ms | 125% | 100% | 池0 / 2,000 ms：`[2,2,3,4,3,2,3,1,0,0]` |
| 3 | 5,000 ms | 150% | 105% | 池0 / 2,000 ms：`[1,2,3,4,5,3,4,2,0,0]` |
| 4 | 5,000 ms | 200% | 95% | 池0 / 2,500 ms：`[1,2,3,2,3,2,2,2,0,0]`；池1 / 3,000 ms：`[1,2,3,2,3,1,1,1,0,0]` |
| 5 | 5,000 ms | 225% | 110% | 池0 / 2,500 ms：`[0,1,2,1,3,1,2,2,0,0]`；池1 / 2,500 ms：`[0,1,1,2,3,1,1,1,0,0]` |
| 6 | 5,000 ms | 600% | 110% | 池0 / 2,000 ms：`[0,0,0,0,10,0,0,0,0,0]`；池1 / 2,000 ms：`[0,0,0,0,8,0,0,0,0,0]` |
| 7 | 5,000 ms | 300% | 115% | 池0 / 2,000 ms：`[2,2,1,1,0,4,4,2,0,0]`；池1 / 2,000 ms：`[3,1,2,1,0,4,3,1,0,0]` |
| 8 | 5,000 ms | 350% | 120% | 池0 / 2,000 ms：`[1,2,0,1,2,4,5,2,0,0]`；池1 / 2,000 ms：`[1,1,0,0,1,4,5,2,0,0]` |

`WaveManager.addToWave` 的重载有 10、11、12 个整数参数：前两项是出生池编号与间隔，其后分别提供 8、9、10 个敌人请求值；较短重载把省略的末尾请求补为 0。网页统一存十项向量，正好表达 map05 的八个有效池类型与 Boss/Doc 两个零值。出生池编号通过路线列表按索引关联，不是地图入口的 TDM 坐标。

## 对白与音画资源

### 英文对白

APK 默认英文必须逐字保留；中文为项目新增译文，不是 APK 原文。Speaker/portrait 以 APK 对话资源和网页已有头像素材为准。

| 波次 | 资源键 | 说话者 | 英文原文 |
| ---: | --- | --- | --- |
| 1 | `T_CAMPAIGN_05_01_POINTER` | Pedro | Now we can also promote our men. They will then inflict more damage and will be faster. To do this, select a unit and touch the icon on the bottom left! |
| 2 | `T_CAMPAIGN_05_02` | Settlers | Who knows where we should head? This is just one big maze! |
| 3 | `T_CAMPAIGN_05_03` | Pedro | If the settlers are full of lead, then our pockets are full of... money! |
| 4 | `T_CAMPAIGN_05_04` | Settlers | I think I was holding the map the wrong way round! We have to go through the southern canyon. |
| 5 | `T_CAMPAIGN_05_05` | Pedro | We'll show you the way to go. Just come here... |
| 6 | `T_CAMPAIGN_05_06` | Pedro | Horses! Looks like there's a whole herd of them! |
| 7 | `T_CAMPAIGN_03_07` | Pedro | Loot! Lots of lovely loot! |
| 8 | `T_CAMPAIGN_05_07` | Pedro | The rush of settlers seems to be dying down again. That must be the last for today. |

波次 7 有意复用 map03 的资源键；它不是遗漏的 map05 文本。简介 `T_LEVEL_INFO_05`：`Sheep and cows once grazed in this lovely area.`；关卡名 `Billy Hills`；胜利名 `The Scourge of Billy Hills.`

### 资源清单与现状

| 用途 | APK / 网页资源名 | 仓库状态 |
| --- | --- | --- |
| 地图缩略图 | `gng_levelmap_05.png` | 已存在 |
| 地面/峡谷/水/阴影/道路 | `tiles_desert*`、`tiles_canyon*`、`tiles_water`、`tiles_waterside*`、`tiles_shadow*`、`tiles_path*` | 所需图集已存在 |
| 铁路 | `tiles_railway_hori`、`tiles_railway_buffers_hori_left/right` | 已存在 |
| 装饰、招募点 | 上表中的 `e_*`、`b_*` 资源 | 已存在 |
| 列车 | `lok_hori_1of2`、`lok_hori_2of2`、`lok_wagon_hori` | 已存在，HDPI 解析器已支持 |
| 对话头像 | `portrait_pedro`、`portrait_settlers` | 已存在 |
| 区域循环/战斗/胜利音乐 | `music_loop1`、`music_loop2`、`music_loop3`、`music_loop4`、`music_level_won` | 已存在 |
| 对话与单位音效 | `sound_pedro`、`sound_siedler`、`sound_train`、`sound_gattling_gun` | 已存在 |

原版区域背景循环与战斗/胜利曲目由 `NewMexico` 与游戏线程按战斗状态切换；以上资源已具备。测试默认静音，只有出现静态证据无法回答的音频触发差异时才单独听音验证。

## 解锁、结算与会话边界

- **直接证据：**战役关卡 5 属于 New Mexico，前置关卡 4；正式胜利将本地 campaign progress 推进到 level 6。`GameObjectUnit.isUnlocked(type)` 的静态逻辑为：全单位解锁、无解锁表，或当前关卡达到数组首项，或 `UserProfile.isLevelFinished` 满足数组第二项。首项是当前关卡可用门槛 21/31/41/51，第二项是完成里程碑 30/40/50/60。map05 的当前关卡为 5，首项条件不成立，因此本关重玩时分别按已完成 level 30/40/50/60 显示 Grandpa、Sniper、Pyromaniac、Salesman。此前把首项误写成“完成第 21/31/41/51 关”已更正。
- **代码推导：**第 5 关正式胜利应使用唯一正式 `Progress` 结算入口；失败、暂停退出或自由模式退出不登记完成，不生成正式高分/解锁副作用。
- **实现状态：**现有 `officialCampaignStages` 由连续 globalLevel 与 `requiresCompletedScenarioIds` 声明前置；`campaign-catalog.ts` 已维护所有 60 个关卡名/地图号的展示顺序。正式添加 map05 后，地图06仍应保持锁定，直到 map05 正式结算成功。

## 与当前网页规则的兼容性

| 能力 | 当前状态 | map05 处理 |
| --- | --- | --- |
| 多出生点、多个路线、多个出口、分支方向优先级 | `PreviewWaveDefinition.routes` 与生成池支持 | 声明 5 条具体路线并绑定两个出生池 |
| 8 波、延迟、逐波 HP/速度倍率、十项敌人请求 | `CampaignWaveDefinition` 支持 | 逐字转录波次数据，无规则扩展 |
| 玩家招募池、多个生成点、波次 `set`/`set-max` | `CampaignUnitPoolDefinition` 支持 | 填入 3 个建筑点及第 2 波动作 |
| 火车共享移动组 | Game 规则按 group id 迭代所有成员 | 泛化 map-content helper，从 5 节改为 TDM 声明的 7 节 |
| 地形碰撞、建筑碰撞、单位锚点与 HDPI 素材 | 现有 Game/renderer 支持 | 依原 TDM 和对象资源建立场景，不偏移路线来补贴图 |
| 战役进度/自由模式隔离 | 已有正式结算与 Free Play 会话来源 | 登记正式 stage，并验证 Free Play 无档案副作用 |

**规则缺口：无。**目前没有证据要求改动 `GameSession` 的敌人生成、寻路、物理、音频系统、结算契约或 IndexedDB。场景数据及泛化 train helper 是内容接入，不应扩张成规则重写。

## 未知项与运行验证边界

- **对战斗结果有影响的未知项：无。**关卡数据和静态消费者均已闭环；可按以下实现计划开始编码。
- **随机贴图的逐次结果：不固定。**APK 未使用固定种子；该差异不阻塞关卡逻辑复原，网页使用项目已接受的确定性种子。
- **本报告没有 Android 运行观察。**静态证据足以还原这一关的格网、数值、路线、波次与内容；不需要启动模拟器或人工通关。实现后只做自动化规则核对和代表性浏览器流程。
- **原 APK 无中文资源。**中文对白须由项目补译，并通过站点 zh/en 文案源接入；英文是比对基线。
- **音效不做常规播放测试。**若后续发现某个声效触发路径在静态代码中不能确定，再针对那一条路径决定是否播放观察。

## 下一步实现顺序

详细步骤、依赖与验收门槛维护在[实施计划](implementation-plan.md)的“New Mexico 第 5 关”批次中。按顺序完成：场景与列车静态内容、八波与招募/对白、正式关卡登记与进度，然后执行整批检查。每个切片都要由原始数据建立独立期望，不能用生产常量自身作为测试期望。
