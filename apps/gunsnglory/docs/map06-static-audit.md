# New Mexico 第 6 关：Murdock Mountains 静态审计

## 结论与边界

**APK 静态内容已核对，map06 已完成场景、规则和正式关卡接入。**地图、方向场、静态对象、玩家单位、十波敌方请求、玩家招募池、关卡参数、英文对白、头像与声音路由、资源和战役进度关系均能由 APK 数据及代码消费路径交叉确认；不需要新增战斗规则。

静态审计曾发现一项网页资源缺口：原 APK 含垂直铁路图集及上下缓冲器贴图，而网页当时缺少这三张图。map06 场景切片已将 APK `drawable-hdpi` 的原图直接加入 `public/assets/hdpi/`，并补齐路径映射；字节比对确认未重绘或旋转替代。其余 map06 所需地形、桥梁、装饰、建筑、单位、头像、关卡预览图和对白声音已有网页资源。

本报告是静态分析结果，不是原版运行观察，也不要求完整推进或通关。REA/JADX 输出是反编译表示，不是 APK 原始 Java 源码；关卡实现应以 APK 数据、DEX 调用关系及下列代码入口为依据。广告和平台 SDK 不属于本关内容范围。

| 项目 | 证据 |
| --- | --- |
| APK | `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk`，包名 `com.hg.gunsandgloryfree`，versionCode `34`，versionName `1.8.6` |
| APK SHA-256 | `49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56` |
| 工具 | REA 静态分析、JADX headless `0.7.1`、Apktool `3.0.3`、Android `aapt` `36.0.0` |
| 执行范围 | 解码 APK 资源与 DEX；没有启动 Android 或运行 APK |

## 证据索引

报告用可 grep 的语义名组织证据，不把自动生成的长 Evidence ID 当作主题名。下表所列类名和方法是 APK 消费路径；涉及反编译时均按静态证据理解。

| 证据名 | APK 数据与代码入口 | 用途 |
| --- | --- | --- |
| `MAP06-TDM` | `res/raw/td_map_06.tdm`；`BasicMap.loadMap` | 原始格网、格值及坐标 |
| `MAP06-LAYERS` | `BackgroundMap.createBackgroundMap`、`createStreetLayerMap`、`shapenBackgroundMap`；`NewMexico.drawBackgroundLayer`；`GunsAndGloryThread.drawStreetLayer` | 地形、道路、桥梁、铁路和邻接变体 |
| `MAP06-OBJECTS` | `GameObjectManager.createGameObjectsFromBasicMap`；`GameObjectDecoration.<init>`；`GameObjectSpawnLocation` | 装饰、建筑、招募点、地图单位和资源映射 |
| `MAP06-ROUTES` | `EnemyDirector.createEnemyDirectorFieldsFromBasicMap`；`EnemyDirectorField` 初始化/出生方向；`EnemyDirector.moveEnemys`；`PriorityMap.recursiveLengthTracking` | 出生池编号、转向规则、完整路径和出口 |
| `MAP06-LEVEL` | `GameDesignData.gameDesignData` 第 6 行；`LevelPack.getLevel(false)` 与难度字段读取 | 开局参数、箱子、升级上限和难度倍率 |
| `MAP06-WAVES` | `GameDesignWaves.setWaves(i == 6)`；`WaveManager.newWave`、`addToWave` | 十波延迟、HP/速度倍率、敌人请求 |
| `MAP06-POOL` | `GameDesignWaves.setWaves`；`SpawnPoolManager.addActionForSpawnPool`；`GameObjectSpawnLocation` | 玩家单位池、招募点及波次动作 |
| `MAP06-STRINGS` | `res/values/strings.xml` 中 `T_LEVEL_*_06` 和 `T_CAMPAIGN_*` | 关卡文本与波次对白原文 |
| `MAP06-VOICE` | `InGameGeneralMessageDialog.setUpDialog(int, int)`、`R$drawable`、`R$raw` | 肖像到通用说话声音的选择关系 |
| `MAP06-ASSETS` | APK `res/drawable-*`；网页 [资源路径映射](../src/render/game-asset-path.ts) 与 `public/assets/` | 必需资源存在性和缺失项 |
| `MAP06-FLOW` | `MapSelectionActivity`、`GameObjectUnit.isUnlocked`、`UserProfile.isLevelFinished`；网页[关卡目录](../src/content/campaign-catalog.ts)、[正式战役登记](../src/content/official-campaign.ts) | 当前可玩状态、解锁、胜利进度与自由模式边界 |

本文标记：**APK 直接数据**是 APK 的资源值或表值；**代码推导**是由数据与消费算法推出的结果；**网页现状**是仓库已有实现；**适用边界**描述没有运行时证据或随机呈现范围的结论。

## 关卡身份与网页现状

- **APK 直接数据：**`td_map_06.tdm` 是 New Mexico 第 6 关；`T_LEVEL_NAME_06` 为 `Murdock Mountains`，简介为 `The picturesque Murdock Mountains are always worth the trip!`，胜利标题为 `The Murdock Mountains Murderer`。
- **代码推导：**`GameDesignWaves.setWaves` 的 `i == 6` 分支对应全局关卡 6；关卡表第 6 行采用零基索引 5。
- **当前实现：**[关卡目录](../src/content/campaign-catalog.ts)和[正式战役登记](../src/content/official-campaign.ts)均包含 level 6；正式入口要求完成 Billy Hills（level 5）。浏览器场景、地图预览、双语对白、头像/声音映射及 New Mexico 音乐路由已接入。
- **进度关系：**正式 level 6 依赖 Billy Hills（level 5）完成；正式胜利记录 level 6 后开放后续关卡状态。Free Play 三种难度均可进入本关，不修改正式战役完成、高分或难度状态。
- **关卡文件与战役数量：**APK 有 63 个 TDM 地图资源，战役目录仍是 60 关；不能按地图文件数创建可玩关卡。

## 原始地图

### 尺寸、格网和频数

- **APK 直接数据：**`td_map_06.tdm` 共 410 字节；前两字节为宽 17、高 24，之后正好 408 个一字节格值。坐标从 `(0,0)` 开始，x 向右、y 向下；地图格逻辑尺寸为 32×32，整图原始尺寸为 544×768 像素。
- **派生核对：**完整频数总和为 408。零值也计入，以下列出所有出现的格值，不省略零值。

```text
0×189, 16×64, 32×40, 36×21, 40×1, 41×1, 48×2,
53×9, 54×4, 55×3, 68×3, 69×2, 70×2, 72×1, 73×3,
74×1, 75×1, 76×1, 77×1, 80×6, 88×4, 90×7, 91×2,
92×3, 94×1, 95×1, 96×3, 97×4, 98×2, 99×5,
100×1, 101×2, 112×1, 113×1, 114×1, 116×2,
124×6, 125×4, 126×1, 130×1, 131×1
```

原始格网如下；行号为 y，列号从左至右为 x。该表可作为地图导入后的独立逐格对照基线。

```text
00: 000 116 000 000 073 000 000 000 000 000 000 000 000 000 000 000 000
01: 000 000 099 000 000 000 000 000 000 072 000 099 000 000 099 000 000
02: 016 016 016 016 016 016 016 000 114 000 016 016 016 000 000 000 000
03: 000 000 016 000 000 099 016 016 016 016 016 036 036 088 036 036 036
04: 036 036 088 036 036 000 000 000 099 000 000 053 032 088 032 032 041
05: 040 032 088 032 053 036 036 036 036 036 036 032 000 016 000 000 000
06: 000 000 016 000 055 032 032 053 053 032 032 054 000 016 000 000 000
07: 000 016 016 000 000 000 000 032 032 000 000 096 000 016 097 000 000
08: 000 101 069 097 016 016 016 080 080 016 016 016 016 016 000 000 077
09: 016 016 016 016 016 000 000 032 032 000 070 000 000 000 000 000 000
10: 000 068 098 016 096 000 036 032 032 000 000 074 000 094 068 000 000
11: 000 000 000 016 000 000 032 032 032 000 000 000 000 090 000 000 000
12: 000 113 000 016 098 000 032 032 032 036 036 036 000 090 000 101 073
13: 000 016 000 016 000 000 032 032 055 032 032 053 000 090 000 000 000
14: 000 016 016 016 073 000 000 055 032 032 053 032 000 090 000 000 000
15: 000 016 000 000 000 097 000 000 000 000 032 032 000 090 000 076 000
16: 000 016 000 000 000 000 016 016 016 016 080 080 000 092 000 000 116
17: 000 016 000 112 000 000 016 096 000 036 032 032 000 092 000 000 000
18: 000 016 000 016 016 016 016 000 036 053 054 032 000 092 075 000 130
19: 016 016 100 000 000 016 000 000 053 054 032 032 000 091 000 000 000
20: 000 000 000 000 070 016 097 000 032 053 032 054 000 091 000 000 131
21: 125 125 125 000 000 016 000 000 032 032 000 000 000 090 000 000 000
22: 124 124 126 125 000 016 016 016 080 080 000 000 000 090 000 069 000
23: 124 124 124 124 000 000 000 000 048 048 000 000 068 095 000 000 000
```

### 地形、桥梁和铁路图层

| 原始格值 | APK 背景基础值 | map06 中的位置/数量 |
| --- | --- | --- |
| `0`, `16`, `36` | `0`（沙漠/中性底图）；邻格形状算法可再生成峡谷墙边 | 189、64、21 |
| `32`, `40–41`, `48`, `53–55`, `80` | `48`（峡谷地板）；53–55 另参与方向场，80 另绘水平桥 | 40、2、2、16、6 |
| `88` | 上方格为 88/89 时为 `48`，否则为 `0` | 4 |
| `124–126` | `96`（水域底图）；邻接算法生成岸边与水面形状 | 124×6：`(0,22)`、`(1,22)`、`(0,23)`、`(1,23)`、`(2,23)`、`(3,23)`；125×4：`(0,21)`、`(1,21)`、`(2,21)`、`(3,22)`；126：`(2,22)`，另叠水边岩石 |

街道层独立转换，不取代背景值：

| 原始格值 | 街道层值/贴图 | map06 中的位置/数量 |
| --- | --- | --- |
| `16` | Path atlas；连接形状由邻格 remap | 64 格 |
| `80` | 64 / `tiles_bridge_hori` | 6：`(7,8)`、`(8,8)`、`(10,16)`、`(11,16)`、`(8,22)`、`(9,22)` |
| `88` | 76 / `tiles_bridge_verti` | 4：`(13,3)`、`(2,4)`、`(13,4)`、`(2,5)` |
| `90–93` | 84 / `tiles_railway_verti` | 12 格，x=13、y=11–22；上下端延伸到缓冲器 y=10、23 |
| `94`, `95` | 垂直铁路端部缓冲器装饰，分别是上端、下端 | `(13,10)`、`(13,23)` |

`BackgroundMap.createBackgroundMap` 将水域原始值 120–126 设为水层起始值 96；原始值 32、40–46、48、52–66、80/81、110 的背景基础值为 48；88/89 根据其上方原始格条件选择 0 或 48；其他格默认 0。`createStreetLayerMap` 将原始值 80/81、82–85、88/89、90–93 分别转换为桥梁或铁路图层代码。`shapenBackgroundMap` 根据上下左右及斜向邻接现场生成边缘组合。`NewMexico.drawBackgroundLayer` 再选择沙漠、峡谷、峡谷地板、阴影、水面和岸边图集；地面显示不是将原始格值直接当成贴图编号。

map06 中两条敌人路线都从 x=7/8 的河谷桥段穿过 row 8，并分别从 x=10/11 穿过 row 16、x=8/9 穿过 row 22；桥面的水平图层需完整覆盖道路和单位脚底锚点。x=13 的垂直铁路与敌人路线分离，不应误作第三条敌人道路。

### 静态装饰、建筑和招募位置

| 原始码 | APK 类型/贴图 | 数量与坐标 |
| ---: | --- | --- |
| 68 | 仙人掌 A / `e_1x1_cactus_a` | 3：`(1,10)`、`(14,10)`、`(12,23)` |
| 69 | 岩石 A / `e_1x1_rocks_a` | 2：`(2,8)`、`(15,22)` |
| 70 | 岩石 B / `e_1x1_rocks_b` | 2：`(10,9)`、`(4,20)` |
| 72 | 路桩 / `b_1x1_stake` | 1：`(9,1)` |
| 73 | 仙人掌 B / `e_1x1_cactus_b` | 3：`(4,0)`、`(16,12)`、`(4,14)` |
| 74 | 风车 / `b_1x1_windmill` | 1：`(11,10)` |
| 75 | 水塔 / `b_1x1_watertower` | 1：`(14,18)` |
| 76 | 灌木 / `e_1x1_bush` | 1：`(15,15)` |
| 77 | 骨头 / `e_1x2_bones` | 1：`(16,8)` |
| 94 | 垂直铁路上端缓冲器 / `tiles_railway_buffers_verti_up` | 1：`(13,10)` |
| 95 | 垂直铁路下端缓冲器 / `tiles_railway_buffers_verti_down` | 1：`(13,23)` |
| 112 | Saloon 招募点，类型 1 | 1：`(3,17)` |
| 113 | Fort 招募点，类型 2 | 1：`(1,12)` |
| 114 | Tipi 招募点，类型 3 | 1：`(8,2)` |
| 116 | 2×1 小屋 / `b_2x1_shack` | 2：`(1,0)`、`(16,16)` |
| 126 | 水边岩石 / `e_1x1_rocks_water` | 1：`(2,22)` |

码 68–77 在 `GameObjectManager` 中作为 `GameObjectDecoration` 类型 1–10；94/95 分别作为装饰类型 18/19；126 为类型 20。112–114 建立 `GameObjectSpawnLocation`，不是普通贴图装饰。格值 71（树）、117（小 Tipi）、81–87、89、93、115、118–123、127–129、132 及 150 在本地图没有出现，不应按其他关卡补造。

## 出生点、方向场与完整路线

### 生成池编号

`EnemyDirector.createEnemyDirectorFieldsFromBasicMap` 按 **y 外层、x 内层** 扫描 TDM；生成点编号是对应入口码减 40，`mSpawnFields` 按扫描顺序加入：

| 出生池 ID | 原始码与格子 | 初始方向 | 对应出口 |
| ---: | --- | --- | --- |
| 0 | 41，`(16,4)` | 向西 | `(9,23)` |
| 1 | 40，`(0,5)` | 向东 | `(8,23)` |

这意味着池 0 是右侧出生、向西行进的路线；池 1 才是左侧出生、向东行进的路线。池编号不能按 x 坐标大小猜，也不能按生成池波次顺序重排。

### 转向节点

APK 初始化动作编号为 0 北、1 南、2 西、3 东；TDM 格码等于动作编号加 52。map06 只有 53/54/55，没有随机转向码：

| 原始码 | 动作 | 方向 | 格子 |
| ---: | ---: | --- | --- |
| 53 | 1 | 南 | `(11,4)`、`(4,5)`、`(7,6)`、`(8,6)`、`(11,13)`、`(10,14)`、`(9,18)`、`(8,19)`、`(9,20)` |
| 54 | 2 | 西 | `(11,6)`、`(10,18)`、`(9,19)`、`(11,20)` |
| 55 | 3 | 东 | `(4,6)`、`(8,13)`、`(7,14)` |

### 逐格路线

路线是 APK 方向场逐格前进的结果，不是网页 A* 路径。单位按 32×32 格中心生成；转向消费者在格中心应用方向。以下含入口和出口格：

| 池 | 路线长度 | 完整坐标序列 |
| ---: | ---: | --- |
| 0 | 33 | `(16,4)→(15,4)→(14,4)→(13,4)→(12,4)→(11,4)→(11,5)→(11,6)→(10,6)→(9,6)→(8,6)→(8,7)→(8,8)→(8,9)→(8,10)→(8,11)→(8,12)→(8,13)→(9,13)→(10,13)→(11,13)→(11,14)→(11,15)→(11,16)→(11,17)→(11,18)→(11,19)→(11,20)→(10,20)→(9,20)→(9,21)→(9,22)→(9,23)` |
| 1 | 31 | `(0,5)→(1,5)→(2,5)→(3,5)→(4,5)→(4,6)→(5,6)→(6,6)→(7,6)→(7,7)→(7,8)→(7,9)→(7,10)→(7,11)→(7,12)→(7,13)→(7,14)→(8,14)→(9,14)→(10,14)→(10,15)→(10,16)→(10,17)→(10,18)→(9,18)→(9,19)→(8,19)→(8,20)→(8,21)→(8,22)→(8,23)` |

路线压缩节点：

- 池 0：`(16,4) → (11,4) → (11,6) → (8,6) → (8,13) → (11,13) → (11,20) → (9,20) → (9,23)`。
- 池 1：`(0,5) → (4,5) → (4,6) → (7,6) → (7,14) → (10,14) → (10,18) → (9,18) → (9,19) → (8,19) → (8,23)`。

**派生核对：**两条路线各自完整到达对应出口，没有越界、循环或共享格。未发现随机路径分支。正式波次从池 0 和池 1 请求的敌人应绑定到本表索引；地图路网和桥面由独立 street layer 绘制，不能把轨道路段合并成敌人路线。

## 初始地图单位与全局解锁

`GameObjectManager` 将 96–101 解为单位类型 1–6、状态 4（休眠/可雇佣）；130/131 解为类型 35/36、状态 4。出现的坐标和数量如下：

| 原始码 | 单位类型 | 数量与坐标 |
| ---: | --- | --- |
| 96 | 1 Gunslinger | 3：`(11,7)`、`(4,10)`、`(7,17)` |
| 97 | 2 Mexican | 4：`(14,7)`、`(3,8)`、`(5,15)`、`(6,20)` |
| 98 | 3 Cannon | 2：`(2,10)`、`(4,12)` |
| 99 | 4 Indian | 5：`(2,1)`、`(11,1)`、`(14,1)`、`(5,3)`、`(8,4)` |
| 100 | 5 Sniper | 1：`(2,19)` |
| 101 | 6 Grandpa | 2：`(1,8)`、`(15,12)` |
| 130 | 35 Pyromaniac | 1：`(16,18)` |
| 131 | 36 Salesman | 1：`(16,20)` |

没有出现原始码 102–109 的活动战斗单位或 132 的 Gambler。全部 19 个地图单位标记均为可招募初态；是否生成特殊类型仍按玩家档案解锁。沿用既有 New Mexico 解锁规则：单位类型 1–4 开放；Grandpa（6）要求完成第 30 关，Sniper（5）第 40 关，Pyromaniac（35）第 50 关，Salesman（36）第 60 关。APK 解锁数组中更早的当前关卡门槛不适用于 map06（全局等级 6），因此新档案仅显示 1–4；已有档案按已完成里程碑开放其余单位。具体解锁条件的通用算法见[上一关审计](map05-static-audit.md)。

网页已有通用解析与贴图锚点见[地图单位构造器](../src/content/new-mexico-unit-entities.ts)和[原始码映射](../src/content/campaign-map-unit-placements.ts)；map06 只需要传入本地图网及同一 profile 解锁快照。

## 关卡经济与难度

`GameDesignData.gameDesignData[5]` 的 12 个值按 APK 表顺序解码如下：

| 表索引 | 值 | 含义 |
| ---: | ---: | --- |
| 0 | 250 | 开局现金 |
| 1 | 50 | 初始生命 |
| 2 | 999 | 关卡箱子总数上限 |
| 3 | 25,000 ms | 箱子产生间隔 |
| 4 | 2 | 最大升级级数 |
| 5 | 30,000 ms | 特殊提示/事件最小间隔 |
| 6 | 5 | 特殊提示事件的最小单位类型参数；不是敌人数 |
| 7 | 17 | 同时存在的箱子上限 |
| 8 | 75% | Easy HP 难度倍率 |
| 9 | 100% | Medium HP 难度倍率 |
| 10 | 125% | Hard HP 难度倍率 |
| 11 | 119,000 ms | Gambler 冷却；本图没有 Gambler/Casino 入口，字段无实际触发点 |

三档难度数字来自第 6 行，波次 HP 倍率另列在下一节，敌方基础 HP 来自全局 `enemyDesignData`。动态难度逻辑也独立于此；实现时分别传入，不要提前乘合并为一组猜测常数。全局敌人种类与基础值在[上一关审计](map05-static-audit.md)中列出。

## 十波、敌人请求与玩家招募池

### 敌方请求向量

APK `WaveManager.addToWave` 的十个请求槽按顺序为：`Settler×1、Settler×2、Settler×3、Settler×4、Horseman、Covered wagon、Post coach、Gold transport、Boss、Doc`。前四项表示对应组大小的请求次数，不是单个敌人数；后两槽在 map06 全为 0。`GameDesignWaves.setWaves(i == 6)` 明确有 **10 波**。

| 波 | 对白键 / 肖像 | 开始延迟 | 波次 HP / 速度 | 池 0：间隔 / 十槽向量 | 池 1：间隔 / 十槽向量 |
| ---: | --- | ---: | --- | --- | --- |
| 1 | `T_CAMPAIGN_06_01` / Pedro | 15,000 ms | 140% / 100% | 1,800 ms `[4,4,4,4,3,1,0,0,0,0]` | — |
| 2 | `T_CAMPAIGN_06_02` / Pedro | 5,000 ms | 160% / 100% | 1,500 ms `[0,1,2,3,3,2,0,0,0,0]` | — |
| 3 | `T_CAMPAIGN_06_03` / Settlers | 5,000 ms | 180% / 100% | 2,500 ms `[1,0,5,0,1,3,0,0,0,0]` | 2,500 ms `[0,2,5,0,2,2,0,0,0,0]` |
| 4 | `T_CAMPAIGN_06_04` / Pedro | 5,000 ms | 200% / 105% | 2,500 ms `[0,1,1,2,1,3,1,0,0,0]` | 2,500 ms `[0,1,1,1,2,3,1,0,0,0]` |
| 5 | `T_CAMPAIGN_06_05` / Indian | 5,000 ms | 225% / 105% | 2,500 ms `[0,0,1,2,1,3,1,0,0,0]` | 2,500 ms `[2,1,1,0,2,3,0,1,0,0]` |
| 6 | `T_CAMPAIGN_06_06` / Deserter | 5,000 ms | 250% / 105% | 2,500 ms `[0,0,1,2,1,3,1,0,0,0]` | 2,500 ms `[2,1,1,0,2,3,0,1,0,0]` |
| 7 | `T_CAMPAIGN_06_07` / Settlers | 5,000 ms | 275% / 110% | 2,500 ms `[0,0,1,0,1,3,2,1,0,0]` | 2,500 ms `[0,1,1,0,2,3,2,1,0,0]` |
| 8 | `T_CAMPAIGN_06_08` / Pedro | 5,000 ms | 300% / 110% | 2,500 ms `[0,1,1,0,2,3,2,2,0,0]` | 2,500 ms `[0,1,1,0,2,3,2,2,0,0]` |
| 9 | `T_CAMPAIGN_01_07` / Pedro | 5,000 ms | 350% / 115% | 2,500 ms `[0,0,1,2,6,2,2,0,0,0]` | 2,500 ms `[0,1,1,3,6,2,2,0,0,0]` |
| 10 | `T_CAMPAIGN_06_09` / Pedro | 5,000 ms | 360% / 120% | 2,500 ms `[0,1,2,3,4,3,2,2,0,0]` | 2,500 ms `[1,1,2,2,3,2,2,1,0,0]` |

部分反编译表达式引用看似无关的 Android/AndroidX 常量。静态初始化值已核算为：`GameObjectShot.UNIT_BONUS_DURATION_FIRE = 5000`，用于第 2–10 波延迟；`ConnectionResult.DRIVE_EXTERNAL_STORAGE_REQUIRED = 1500`，用于第 2 波池 0 间隔；`ItemTouchHelper.Callback.DEFAULT_SWIPE_ANIMATION_DURATION = 250`，在第 6 波参数位置作为 **HP 百分比 250**；`GameScreenActivity.INTERSTITIAL_REQUEST_DELAY_SECONDS = 360`，在第 10 波参数位置作为 **HP 百分比 360**。不能因字段名带 duration/seconds 就把后两者改当时间值。

### 玩家招募池

| Pool type | 单位 | APK 招募点类型 | map06 招募点 |
| ---: | --- | --- | --- |
| 1 | Gunslinger | Saloon（type 1） | Saloon `(3,17)` |
| 2 | Mexican | Saloon（type 1） | Saloon `(3,17)` |
| 3 | Cannon | Fort（type 2） | Fort `(1,12)` |
| 4 | Indian | Tipi（type 3） | Tipi `(8,2)` |

招募池库存刷新间隔为 15,000 ms。第 1 波在 `SpawnPoolManager` 执行 action 1（set）将四池当前值设为 `[0,0,0,0]`，再执行 action 3（setMax）将最大值设为 `[7,6,4,5]`。这两个动作属于玩家可招募库存，不是敌人向量；网页[招募池契约](../src/game/campaign-unit-pool.ts)已支持两种动作。

## 英文对白、头像和声音

APK 默认英文的波次对白如下。中英文网页资源中，英文应保留其可见文本，中文是项目补充翻译；APK 不提供中文 values 目录。

| 波 | Resource key | 头像 / 通用说话声音 | APK 英文文本 |
| ---: | --- | --- | --- |
| 1 | `T_CAMPAIGN_06_01` | Pedro / `sound_pedro` | The rugged Murdock Mountains couldn't be better for a good ol' traditional ambush! |
| 2 | `T_CAMPAIGN_06_02` | Pedro / `sound_pedro` | Now we can promote our men to level 2 and we'll be able to stop a whole convoy of settlers with the Magnificent Seven! |
| 3 | `T_CAMPAIGN_06_03` | Settlers / `sound_siedler` | Hey! You there! Are you heading through the Murdock Mountains, too? Let's travel together. |
| 4 | `T_CAMPAIGN_06_04` | Pedro / `sound_pedro` | Travel together, huh? Together, you'll run right into our arms! |
| 5 | `T_CAMPAIGN_06_05` | Indian / `sound_indian_hugh` | Today is a good day to go hunting. |
| 6 | `T_CAMPAIGN_06_06` | Deserter / `sound_deserter_yes_sir` | Sir, those civilians are coming with a wagon full of gold. We need more cannons to stop them! |
| 7 | `T_CAMPAIGN_06_07` | Settlers / `sound_siedler` | Did you hear that terrible crash in the mountains, too? Do you think there's a storm brewing? |
| 8 | `T_CAMPAIGN_06_08` | Pedro / `sound_pedro` | No, don't worry. There isn't a cloud in the sky. No storm in sight. Just come to our arms... |
| 9 | `T_CAMPAIGN_01_07` | Pedro / `sound_pedro` | Ha ha! Those settlers might just about be able to found a tent camp! |
| 10 | `T_CAMPAIGN_06_09` | Pedro / `sound_pedro` | Victory is near. They won't be able to hold out much longer! |

`T_CAMPAIGN_06_02_SMALL`、`_06_06_SMALL` 和 `_06_09_SMALL` 资源存在，但第 6 关 `setWaves` 使用的是标准 key；未发现这三个 SMALL key 被该波次分支选用。不要因它们存在就替换标准对白。APK 有默认英文及 `de/es/fr/it/pt/ru/tr` 资源集，共八种语言；网页另有 zh 站点语言。

说话声音由 `InGameGeneralMessageDialog.setUpDialog(int, int)` 根据 portrait resource 选择，不是每波单独录制的台词语音。map06 使用的 Pedro、Settlers、Indian、Deserter 声音资源均已存在于网页 `public/assets/sounds/`。本审计确认了静态映射和文件存在性，没有试听或声学对比；日常验收保持静音。

## 资源差异清单

| 资源 | APK 路径 | 网页仓库状态 |
| --- | --- | --- |
| 关卡预览 `gng_levelmap_06.png` | `res/drawable-mdpi/` | 已有：`public/assets/menu/gng_levelmap_06.png` |
| 沙漠、峡谷、峡谷地板、水边、水面图集 | `res/drawable-hdpi/` | 已有：`public/assets/hdpi/` |
| 水平/垂直桥、桥墩 | `res/drawable-hdpi/` | 已有：`public/assets/hdpi/` |
| 垂直铁路图集 `tiles_railway_verti.png` | `res/drawable-hdpi/`，48×48 | 已补齐：`public/assets/hdpi/`；与 APK 原图逐字节一致，并登记为 1.5×图集 |
| 垂直铁路上/下缓冲器 | `tiles_railway_buffers_verti_up.png`、`tiles_railway_buffers_verti_down.png`，`res/drawable-hdpi/`，各 48×48 | 已补齐：`public/assets/hdpi/`；与 APK 原图逐字节一致，逻辑尺寸映射为 32×32 |
| 仙人掌、石头、水边石、骨头、路桩、风车、水塔、灌木、小屋及招募建筑 | APK `drawable-*` | 网页已有对应 `public/assets/` 或 `public/assets/hdpi/` 资源 |
| Sniper、Grandpa 休眠贴图 | APK 名为 `player_scout_sleep.png`、`player_geezer_sleep.png` | 网页已用相同 APK 资源名；只是人物类型名与贴图名不同，不需另造 `player_sniper_sleep` / `player_grandpa_sleep` |
| Pedro、Settlers、Indian、Deserter 肖像与声音 | APK drawable/raw | 网页已有 `portrait_*` 与 `sound_*` 文件 |

地图资源目前由 [`game-asset-path.ts`](../src/render/game-asset-path.ts) 区分 `hdpi/`、源图采样比例和逻辑装饰尺寸。垂直铁路图集沿用横向铁路的 1.5×源图比例；上下缓冲器按高密度地图装饰的逻辑尺寸处理。不要以横向铁路图旋转或 CSS 拉伸代替 APK 原始贴图。

## 进度闭环接入状态

| 项目 | 结论 | 接入要求 |
| --- | --- | --- |
| 正式关卡 | `campaign-new-mexico-06` 已加入 `officialCampaignStages`，内容版本固定 | map05 完成后开放；Progress 正式结算将 level 6 记为完成 |
| 自由模式 | Free Play 菜单和浏览器启动入口均指向完整 map06 内容 | 无前置条件；Easy/Medium/Hard 均可选，结果与 Profile 隔离 |
| 胜利结算 | 使用现有正式 stage ID 及 settlement 幂等记录 | 合成正式结算检查 map06 完成后推进关卡状态；未完成退出和 Free Play 不写正式进度 |
| 波次/规则 | 十波和玩家池动作由现有 `CampaignWaveDefinition`、`CampaignUnitPoolDefinition` 消费 | 与 APK 数值一致；没有引入战斗规则或主动平衡 |
| 地图资源 | 垂直铁路图集及两个垂直缓冲器已从 APK 原图提取并登记 | 48×48 源图及既有比例映射通过；没有重绘、旋转替代或拉伸 |

### 仍有的适用边界

- **纹理随机性：**APK 的 `Util.random`/地图变体会随机挑选部分地面、道路贴图；本报告能复原格值和选择算法，不能指定每次启动的随机结果。网页应使用项目已有的固定 Java Random 种子，保证截图、测试和回放稳定；这不是原版逐次启动的像素一致性声明。
- **运行时：**本关的路由、值、波次和文本均由静态数据与代码消费者闭环；没有需要通过 Android 实战才能解释的关键内容项。完成后用网页短时 `GameSession` 和截图核验首波/代表性单位即可，不要求完整通关。
- **翻译与音频：**英文为 APK 文本；中文为项目译文。声音只确认资源和 portrait 路由，不据静态表声称已听测。
- **资源来源：**上列三张缺失铁路 PNG 的 APK 来源已经定位到 `drawable-hdpi`；它们不是未知资源，步骤 2 只需从已确认的 APK 复制并纳入资产映射。

## 实现入口

关卡场景应沿用网页现有的原始格网与独立渲染层模型：参照[地图绘制参考](../tests/helpers/terrain-render-reference.ts)、[Billy Hills 场景构造](../src/content/billy-hills-scene.ts)、[地图单位构造器](../src/content/new-mexico-unit-entities.ts)和[招募池定义](../src/content/billy-hills-unit-pool.ts)。新地图必须从本报告中的原始格网/表值建立独立测试期望，不能导入生产 map06 常量来验证同一常量。

实现和验收结果见[实施计划](implementation-plan.md)的“已关闭批次：New Mexico 第 6 关 map06”。场景、规则、正式登记/对白/进度三步均已完成；完整本地检查和内置浏览器结果也记录在该处。
