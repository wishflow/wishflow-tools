# Oregon 第 7 关：Mount Hood 静态审计

## 结论与范围

Mount Hood 是全局第 27 关，对应 APK `res/raw/td_map_30.tdm`。原图为 32×24、770 字节。静态路线图含 4 个入口、31 个转向点、3 个出口和 36 条有向边；四个入口覆盖全部转向点并可到达三个出口，没有越界、孤立转向点或异常路径。

关卡有 10 波、21 条敌人生成请求，没有玩家单位池动作。地图有 47 个 TDM 招募单位 marker、两组独立横向列车（每组两节机车和三节可雇佣车厢）以及两组炸药触发器/炸药箱。网页已有 Oregon 预览图、地形/音频、列车图像和对白头像；目前尚未登记 level 27。完整接入步骤见[实施计划 M28](implementation-plan.md#当前批次mount-hoodm28oregon-第-7-关全局第-27-关)。

| 结论类别 | 结果 |
| --- | --- |
| APK 事实 | APK 身份、TDM 原始字节、关卡配置、`GameDesignWaves` 调用顺序、英文资源键和素材均已直接核对。 |
| 静态推导 | 方向 marker 展开的完整路线图、四条入口可达集合、两组列车组件，以及最近距离炸药配对。 |
| 仍未知 | `awesomeMessageMin` / `awesomeMessageUnit` 对本关的专属消费；tile 78 的三个 marker 在地图对象与 Oregon 背景消费者中的可见作用。现有静态消费者未显示它创建对象或绘制非空背景；不擅自解释为有意设计或 bug。 |

本报告不使用 Android 实战，不把 JADX 重建伪代码称为原始源码；对象分派优先依据 Smali 与既有消费者交叉核对。路线图是静态方向规则的穷举结果，不等于某个种子下的动态移动轨迹。

## 来源与网页差异

| 短键 | 来源与定位 | 可支持结论 |
| --- | --- | --- |
| `APK-186` | `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk`；`com.hg.gunsandgloryfree`，version 1.8.6 / code 34；APK SHA-256 `49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56` | 固定本报告使用的 APK 身份。 |
| `TDM-30` | APK ZIP 项 `res/raw/td_map_30.tdm`；直接读取文件，与结构化地图清单交叉核对 | 770 字节，头部为宽 32、高 24，后续 768 字节为 y-major 格点；地图 SHA-256 `9eace231a2cd51ab0fafe1e5360d799a533f64cb6e5819ac2323d0efacc6b3e4`。 |
| `LEVEL-27` | `GameDesignData.<clinit>` 的关卡配置 index 26；`level-config.json` 的 level 27 行 | 12 个关卡字段及其原始顺序。字段名本身不证明字段消费行为。 |
| `WAVES-27` | `GameDesignWaves.setWaves(WaveManager, SpawnPoolManager, int)` 的 `i == 27` 分支；对应 Smali/DEX 和 `waves.json` | 10 个 `newWave`、21 个 `addToWave` 的交错源顺序；没有 `SpawnPoolManager` action。 |
| `OBJECTS-30` | `GameObjectManager.createGameObjectsFromBasicMap` / `createTrainFromMap`；Smali `GameObjectManager.smali`；`GameObjectUnit.getUnitNameResId`；APK `T_UNIT_NAME_07/08`；`TrainHorizontal` | TDM 单位 activity、装饰/炸药构造、两列火车组件与移动组。普通 unit type = tile − 95；type 5 对应 T_UNIT_NAME_08（Markswoman），type 6 对应 T_UNIT_NAME_07（Scattergun Grandpa）。JADX 只作定位，条件结论以 Smali 和资源映射复核。 |
| `ROUTES-30` | `EnemyDirectorField` 路线 marker 解码、`EnemyDirector` 移动；地图清单的静态 route graph | 入口方向、转向规则、完整有向图及可达性。 |
| `TERRAIN-30` | `BackgroundMap.createBackgroundMap/createStreetLayerMap/shapen*`、`Oregon.drawBackgroundLayer/drawStreetLayer`；地形渲染索引 | Oregon 背景、道路、铁路和碰撞各自消费的网格；随机变体按其候选集合核对，不断言一次运行的具体随机像素。 |
| `STRINGS-30` | APK `T_LEVEL_NAME_30`、`T_LEVEL_INFO_30`、`T_CAMPAIGN_27_01..10` | 原版英文关卡文案及逐波对白。中文为网页项目译文，不属于 APK 原文。 |

网页已有 `public/assets/menu/gng_levelmap_30.png`、`public/assets/music/music_oregon.ogg`、`public/assets/sounds/sound_train.ogg`，三种横向列车 PNG（`hdpi/lok_hori_1of2.png`、`lok_hori_2of2.png`、`lok_wagon_hori.png`），以及本报告对白使用的全部头像 PNG。素材接线和实际尺寸验证列入 M28-E，见[实施计划](implementation-plan.md)。

## 原始 TDM 与 marker

直接从 APK ZIP 项计数，768 格频次总和为 768：

```text
0:380, 32:121, 36:56, 40:1, 41:1, 42:1, 43:1, 48:3,
52:6, 53:8, 54:16, 56:1, 74:1, 75:2, 77:1, 78:3,
79:15, 80:1, 81:1, 82:29, 83:4, 84:6, 86:2, 87:2,
88:4, 96:14, 97:13, 98:6, 99:6, 100:1, 101:5, 102:2,
110:2, 115:8, 118:7, 119:7, 124:15, 125:13, 126:1,
130:1, 131:1
```

坐标均为 TDM 格点 `(x,y)`。

### 入口、出口和转向点

入口 action ID 为 marker code 减 40；路线节点方向由 `EnemyDirector` 对方向 marker 的解码决定。三个出口位于左边界。

| Marker | 坐标 | 首个路线点 | 入口方向 |
| --- | --- | --- | --- |
| 40 / action 0 | `(31,2)` | `(27,2)` | 向西 |
| 41 / action 1 | `(31,10)` | `(24,10)` | 向西 |
| 42 / action 2 | `(31,11)` | `(28,11)` | 向西 |
| 43 / action 3 | `(25,23)` | `(25,19)` | 向北 |
| 48 / exit | `(0,9)`、`(0,10)`、`(0,11)` | — | 左边界出口 |

转向 marker 坐标按原始 tile code 完整列出：

| Tile | 方向 | 坐标 |
| ---: | --- | --- |
| 52 | 北 | `(17,13)`、`(4,14)`、`(16,14)`、`(3,15)`、`(2,16)`、`(21,19)` |
| 53 | 南 | `(27,2)`、`(13,5)`、`(8,10)`、`(24,10)`、`(9,11)`、`(28,11)`、`(13,12)`、`(10,14)` |
| 54 | 西 | `(27,5)`、`(4,9)`、`(3,10)`、`(13,10)`、`(17,10)`、`(2,11)`、`(16,11)`、`(16,12)`、`(24,13)`、`(8,14)`、`(13,14)`、`(21,14)`、`(28,14)`、`(9,15)`、`(10,16)`、`(25,19)` |
| 56 | 北或西分支 | `(17,11)` |

完整静态有向边（箭头后的数值为格数）：

```text
40@(31,2) W→53@(27,2) [4]       53@(27,2) S→54@(27,5) [3]
53@(13,5) S→54@(13,10) [5]      54@(27,5) W→53@(13,5) [14]
54@(4,9) W→48@(0,9) [4]         54@(3,10) W→48@(0,10) [3]
53@(8,10) S→54@(8,14) [4]       54@(13,10) W→53@(8,10) [5]
54@(17,10) W→54@(13,10) [4]     53@(24,10) S→54@(24,13) [3]
41@(31,10) W→53@(24,10) [7]     54@(2,11) W→48@(0,11) [2]
53@(9,11) S→54@(9,15) [4]       54@(16,11) W→53@(9,11) [7]
56@(17,11) N→54@(17,10) [1]     56@(17,11) W→54@(16,11) [1]
53@(28,11) S→54@(28,14) [3]     42@(31,11) W→53@(28,11) [3]
53@(13,12) S→54@(13,14) [2]     54@(16,12) W→53@(13,12) [3]
52@(17,13) N→56@(17,11) [2]     54@(24,13) W→52@(17,13) [7]
52@(4,14) N→54@(4,9) [5]         54@(8,14) W→52@(4,14) [4]
53@(10,14) S→54@(10,16) [2]     54@(13,14) W→53@(10,14) [3]
52@(16,14) N→54@(16,12) [2]      54@(21,14) W→52@(16,14) [5]
54@(28,14) W→54@(21,14) [7]      52@(3,15) N→54@(3,10) [5]
54@(9,15) W→52@(3,15) [6]        52@(2,16) N→54@(2,11) [5]
54@(10,16) W→52@(2,16) [8]       52@(21,19) N→54@(21,14) [5]
54@(25,19) W→52@(21,19) [4]      43@(25,23) N→54@(25,19) [4]
```

四条入口路线的可达集合合并后覆盖 31/31 个转向点及 3/3 个出口；路线图共 36 条有向边，无越界或静态断路。分支 marker 的运行选择概率及实际行走轨迹不由此图推出。

### 装饰、地形与单位

| Marker | 数量/坐标 | 静态语义 |
| ---: | --- | --- |
| 74 | 1：`(15,13)` | Windmill `b_1x1_windmill`。 |
| 75 | 2：`(8,6)`、`(4,19)` | Water tower `b_1x1_watertower`。 |
| 77 | 1：`(1,2)` | Bones `e_1x2_bones`，保留现有占格/碰撞框。 |
| 79 | 15 | Tree A `e_1x1_tree_green_a`；坐标按 TDM marker 创建。 |
| 86 / 87 | 各 2 | 左/右铁路挡车器，资源 `tiles_railway_buffers_hori_left/right`。 |
| 115 / 118 / 119 | 各 8 / 7 / 7 | Oregon 场景分别绘制 Tree B、tree stump、Tree C；不是活动单位。 |
| 126 | 1：`(7,2)` | `e_1x1_rocks_water`。 |
| 78 | 3：`(28,0)`、`(29,0)`、`(31,0)` | 当前 ObjectManager 无构造分支；静态 BackgroundMap 输出为 0/无道路。保留原始 marker；用途未知，不补造物件。 |

tile 80、81、82、88 是铁路场景/道路输入而非活动单位：地形索引中 code 82 转换为道路值 72；code 80/81 产生铁路接缝道路值 64/68；code 88 产生道路值 76 和对应背景接缝。M28-B 必须分别比较 Oregon 背景、道路和碰撞输出，不可把这些 raw code 当作绘制图集编号。

`GameObjectManager` 的新局单位规则与 TDM 完整 marker 数量如下；96–101 映射 type = code−95、activity 4，130/131 映射 Pyromaniac/Salesman type 35/36、activity 4。最终可用单位受全局 profile 解锁位影响。

| Tile / 类型 | 数量 | 坐标 |
| --- | ---: | --- |
| 96 / Gunslinger | 14 | `(18,1)`、`(23,1)`、`(13,2)`、`(0,3)`、`(31,5)`、`(3,6)`、`(9,6)`、`(19,9)`、`(5,12)`、`(26,16)`、`(29,20)`、`(5,21)`、`(1,22)`、`(19,22)` |
| 97 / Mexican | 13 | `(20,1)`、`(26,1)`、`(2,2)`、`(16,2)`、`(10,3)`、`(29,4)`、`(22,10)`、`(29,16)`、`(5,19)`、`(14,20)`、`(27,20)`、`(6,21)`、`(23,21)` |
| 98 / Cannon | 6 | `(22,3)`、`(2,4)`、`(21,8)`、`(16,17)`、`(2,19)`、`(30,21)` |
| 99 / Indian | 6 | `(15,1)`、`(6,3)`、`(23,6)`、`(1,14)`、`(23,16)`、`(18,20)` |
| 100 / Sniper（Markswoman） | 1 | `(10,19)` |
| 101 / Grandpa（Scattergun Grandpa） | 5 | `(3,1)`、`(26,8)`、`(6,9)`、`(12,16)`、`(30,18)` |
| 130 / Pyromaniac | 1 | `(16,6)` |
| 131 / Salesman | 1 | `(3,23)` |

四个全局解锁快照位影响 Grandpa、Sniper、Pyromaniac、Salesman；Dynamite 是否可用沿用现有 level 20/30 里程碑规则。地图没有 tile 112–114 建筑和 `spawnPoolActions`，因此没有玩家单位池；不能添加隐藏 Fort/Cannon template。

### 两组横向列车

`createTrainFromMap`/`TrainHorizontal` 组件按每行连续的 `83,83,84,84,84` 分组。当前 TDM 恰好有两组，组 ID 必须彼此独立：

| 组 | 两节活动机车（type 10/11，activity 5） | 三节可雇佣车厢（type 12，activity 4） |
| --- | --- | --- |
| 1 | `(15,7)`、`(16,7)` | `(17,7)`、`(18,7)`、`(19,7)` |
| 2 | `(6,18)`、`(7,18)` | `(8,18)`、`(9,18)`、`(10,18)` |

两列共 10 个组件；现有 `createHorizontalTrainPlacementGroups()` 与 `createCampaignTrainUnits()` 可复用。单位工厂需按 TDM 行分组，不能把两列合并为一个移动组，也不能把火车组件算入敌人请求池。

### 炸药

| Marker | 坐标 | 作用 |
| ---: | --- | --- |
| 102 | `(11,12)`、`(26,12)` | DynamiteTrigger，activity 5。 |
| 110 | `(10,13)`、`(25,13)` | DynamiteBox，activity 5。 |

按 `DynamiteTrigger.selectDynamiteBox` 的最近距离配对，静态配对为 `(11,12)→(10,13)`、`(26,12)→(25,13)`；每对距离均为 √2 格。沿用现有 level 20/30 解锁、爆炸边界和对象资源，不新建规则。

## 关卡参数、波次与文本

`GameDesignData` index 26 的 12 项字段按既有消费者顺序记录为：`$500` 初始现金、25 条生命、999 最大奖励箱、25,000ms 箱间隔、3 次升级、`awesomeMessageMin=30,000`、`awesomeMessageUnit=5`、场上箱上限15、Easy/Medium/Hard 敌人 HP 86/115/175%、`gamblerTime=119,000ms`。地图没有 Gambler/Casino；后两项不能因此推导出需新增该对象。未证实的 message 字段语义不由本关补造。

每个请求写作 `入口 action / 间隔 / 8 个常规敌人槽 / Boss 槽`；省略的 Boss 槽等同 0。action 是 TDM 入口编号 0–3，不是路线节点编号。以下分组严格按照 APK `newWave` 后接 `addToWave` 的调用顺序：

| 波次 | 请求（action / 间隔 / 槽向量） |
| ---: | --- |
| 1 | `3 / 2000 / 2,2,2,3,2,2,0,0` |
| 2 | `3 / 2000 / 1,1,2,3,4,3,1,0` |
| 3 | `3 / 2500 / 0,0,2,3,4,3,1,0`；`2 / 2500 / 1,1,2,3,3,2,1,0` |
| 4 | `3 / 2500 / 0,0,2,3,4,3,1,0`；`2 / 2500 / 1,1,2,3,3,3,1,0` |
| 5 | `3 / 2500 / 0,0,2,3,4,2,1,0`；`2 / 2500 / 1,0,2,3,3,3,1,0`；`1 / 2500 / 1,1,1,3,3,2,1,0` |
| 6 | `3 / 2500 / 2,1,6,8,1,1,0,0`；`2 / 2500 / 1,2,6,7,1,0,0,1`；`1 / 2500 / 1,4,5,7,1,1,0,0` |
| 7 | `0 / 2500 / 1,1,2,3,3,3,2,0` |
| 8 | `1 / 2500 / 1,0,2,3,3,4,1,0`；`2 / 2500 / 1,0,1,3,3,3,2,1`；`0 / 2500 / 0,1,2,3,3,3,2,0` |
| 9 | `0 / 2500 / 1,1,2,3,3,3,2,1`；`1 / 2500 / 1,0,2,3,3,4,1,0`；`2 / 2500 / 1,0,1,3,3,3,2,1`；`3 / 2500 / 0,1,2,3,3,3,2,0` |
| 10 | `2 / LokSteam.MAX_CLOUD_SPAWN_INTERVAL / 0,0,0,0,0,0,0,0 / Boss 1` |

10 个 wave header：

| 波 | 英文对白资源 | 头像 | 延迟 | HP / 速度倍率 |
| ---: | --- | --- | ---: | ---: |
| 1 | `T_CAMPAIGN_27_01` | Oregon/Dakota Dynamite | 15,000ms | 100% / 120% |
| 2 | `T_CAMPAIGN_27_02` | Indian | 15,000ms | 110% / 125% |
| 3 | `T_CAMPAIGN_27_03` | Engineer | 15,000ms | 120% / 130% |
| 4 | `T_CAMPAIGN_27_04` | Oregon/Dakota Geezer | 15,000ms | 130% / 135% |
| 5 | `T_CAMPAIGN_27_05` | Gunslinger | 15,000ms | 140% / 140% |
| 6 | `T_CAMPAIGN_27_06` | Oregon/Dakota Geezer | 15,000ms | 150% / 145% |
| 7 | `T_CAMPAIGN_27_07` | Mexican | 25,000ms | 160% / 150% |
| 8 | `T_CAMPAIGN_27_08` | Engineer | 15,000ms | 170% / 155% |
| 9 | `T_CAMPAIGN_27_09` | Pedro | 15,000ms | 180% / 160% |
| 10 | `T_CAMPAIGN_27_10` | Oregon/Dakota Boss | 25,000ms | 190% / 165% |

APK 默认英文标题为 **Mount Hood**，简介为 “The cold summits of Mount Hood offer perfect walking routes for mountain air enthusiasts.”。10 段对白原文：

| 波 | APK 英文 |
| ---: | --- |
| 1 | Hey, Boss, we buried a lot of dynamite again, at the base of Mount Hood! |
| 2 | That Wy'east! When we are no more, all culture is buried, too! |
| 3 | My train is never late, settlers! Come on, get on board, I'll show you the area… From below! |
| 4 | I hear something whistling, maybe my tea is done? |
| 5 | Pa, that's the Oregon Express! Maybe you should look for the sleeping car! |
| 6 | What? You wanna sleep? Bah, I'll take care of those lazy walkers! |
| 7 | Ay, caramba! Here come some gringos from the north-east! |
| 8 | The settlers must be cold here in the mountains! Get the Gatling guns and warm them up! |
| 9 | Wow, here come so many settlers, we won't be able to carry all that gold! |
| 10 | I'm sure you robbed enough for today, just let me pass! I'll even offer you a piece of copper! |

## 实施边界

- 将 APK 原始 TDM 作为唯一地图输入；网页派生 JSON 必须保持原始 770 字节与 768 格一致，不能按渲染图手画重建路线。
- 复用 Oregon 背景与道路规则、现有火车工厂、现有单位解锁/炸药规则和本关已在应用中的资源。没有玩家单位池，不能添加 `campaignUnitPool` 或伪造 Fort/Cannon 模板。
- 新内容构造器必须用 4 个全局单位解锁位和 Dynamite 快照恢复 replay；正式关卡只在 level 26 完成后开放，Free Play 不写正式进度。
- `awesomeMessageMin`、`awesomeMessageUnit` 与 tile78 的作用分别保留为未知项；只有找到真实消费者证据才进一步实现。M28 的静态数据/网页差异无需 Android 运行观察。
