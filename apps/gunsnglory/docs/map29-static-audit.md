# Oregon 第 9 关：Snake River 静态审计

## 结论与范围

Snake River 是全局第 29 关，对应 APK `res/raw/td_map_32.tdm`。TDM 为 32×24、770 字节，含 768 个 y-major 格点；APK ZIP 条目与 APKTool 提取件逐字节一致。路线图有 3 个入口、32 个转向点、2 个出口和 35 条有向边；每个入口可到达出口，合并后覆盖全部转向点与两个出口。

本关有 6 波、11 条敌人请求；没有 `SpawnPoolManager.addActionForSpawnPool()` 调用，也没有 Saloon、Fort、Tipi、Gambler 或 Casino marker。地图包含 19 个 Grandpa、1 个 Sniper、1 个 Pyromaniac、1 个 Salesman、11 组 Dynamite marker，以及一组由 TDM `120/121/123` marker 驱动的 Steamer。普通地形、桥/路、对象、敌人路径与水域分别属于不同层，不能把 raw marker 直接当作图集坐标或屏幕位置。

**地形碰撞需特别核实：**APK `BackgroundMap.createBackgroundMap()` 的初始映射是 raw `32 → 48`、raw `36 → 0`；随后 `shapenBackgroundMap()` 根据邻格重新塑形，移动检查读取的是最终背景码与道路覆盖层。网页目前的陆地检查按 raw `32/36` 直接分类。raw `36` 在部分 Oregon 地图的最终 shaped code 确实属于阻挡范围，但“APK 将所有 raw `36` 直接转换为 48”不准确；M30-B 必须比较最终逐格碰撞网格后再判定是否需要共享规则修正。

此报告使用 APK Smali 和资源作为静态证据。Smali 是 DEX 反汇编结果，不是原始 Java 源码；REA 路线 JSON 是派生材料，路线结论另从 APK TDM 独立复算。本轮未启动 Android、未播放声音、未完整推进关卡。

## 来源与证据索引

| 短键 | 来源和定位 | 可支持的结论与边界 |
| --- | --- | --- |
| `APK-186` | `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk`，应用包 `com.hg.gunsandgloryfree`，版本 1.8.6 / code 34 | 固定本报告目标 APK；不把其它版本的结果混入。 |
| `TDM32` | APK ZIP 项 `res/raw/td_map_32.tdm`；副本 `/private/tmp/gng-map29-apktool/res/raw/td_map_32.tdm` | 文件长 770 字节，前两字节为宽 32、高 24；剩余 768 字节与提取副本完全相同。 |
| `ROUTE32` | 由 `TDM32` 独立扫描得到的路线图；REA 派生文件 `/private/tmp/gng-research-evidence/apps/gunsnglory/docs/research/data/static-route-graph.json` 的 `maps[index=32]` | 两份图的 35 条边逐项一致。静态图代表可选方向连线，不是某个随机种子下的逐帧路径。 |
| `LEVEL29` | `datastorage/GameDesignData.smali` 的关卡配置数组 index 28（0 起始） | 12 个字段的原始值。字段语义结合已验证消费者映射；message 字段本关含义仍未知。 |
| `WAVES29` | `datastorage/GameDesignWaves.smali` 的 `setWaves()` level `0x1d` 分支；`gamelogic/WaveManager.smali` 与 `Wave.smali` | 按寄存器值重建 `newWave/addToWave` 调用顺序、参数个数与 Boss 槽；不推断固定出兵顺序。 |
| `OBJECTS32` | `gamelogic/GameObjectManager.smali` 的 `createGameObjectsFromBasicMap()` / `createSteamerFromMap()`；`units/GameObjectUnit.smali` 的 `create()` / `isUnlocked()` | TDM 对象分派、activity、新局创建条件及单位解锁门控。 |
| `TERRAIN32` | `datastorage/BackgroundMap.smali` 的 `createBackgroundMap()`、`createStreetLayerMap()`、`shapenBackgroundMap()`、`shapenStreetLayerMap()`、`createVariationMap()`、`isReachableXGround()`、`isReachableYGround()` | raw TDM 到背景/道路/最终地形碰撞的调用链；初始化映射不等于最终映射。 |
| `COPY32` | APK `res/values/strings.xml`：`T_LEVEL_NAME_32`、`T_LEVEL_INFO_32`、`T_CAMPAIGN_29_01..06` | 原版英文标题、简介和对白。网页中文译文属于本地化，不是 APK 原文。 |
| `ASSETS32` | `levelpacks/Oregon.smali` 的 `battleLoops` / `loadIngameImagesPack()`；APK drawable/raw 与应用 `public/assets/` | 关卡共用 Oregon 的资源加载路径。文件存在本身不证明页面已预载，接线在 M30-D 验收。 |
| `WEB32` | `src/content/oregon-08-*`、`mississippi-map-scene.ts`、`mississippi-steamer-parts.ts`、`game/index.ts` | 既有关卡接入模式、现有场景/Steamer 工厂和网页碰撞消费点；不是 APK 证据。 |

## TDM 地图与路线

tile 频次合计 768 格：

```text
0:309, 32:208, 36:63, 40:1, 41:1, 42:1, 48:2,
52:7, 53:9, 54:4, 55:12, 69:2, 70:2, 78:8, 79:6,
80:5, 88:6, 100:1, 101:19, 102:11, 110:11,
115:13, 116:5, 118:3, 119:8, 120:1, 121:1,
123:1, 124:44, 126:2, 130:1, 131:1
```

坐标均为原始 TDM 格点 `(x,y)`。route marker `52/53/54/55` 分别表示北/南/西/东；spawn marker `40/41/42` 的 action ID 为 `raw−40`，redirect marker 的方向 action ID 为 `raw−52`。入口 action ID 与网页 spawn ID 不是同一编号空间；实现需沿用已有 action-to-spawn 映射并逐段核对坐标。

| 入口 | 坐标与朝向 | 可达转向点 | 最终出口 |
| --- | --- | ---: | --- |
| action 0 / raw 40 | `(12,0)`，向南 | 12 | `(28,23)` |
| action 1 / raw 41 | `(13,0)`，向南 | 13 | `(28,23)` |
| action 2 / raw 42 | `(14,0)`，向南 | 8 | `(29,23)` |

静态有向边如下。格数是两节点之间的轴向间距，不是游戏时间或移动距离像素值。

```text
S0@(12,0) S→R2@(12,3) [3]       S1@(13,0) S→R2@(13,4) [4]
S2@(14,0) S→R2@(14,5) [5]       R1@(3,3) S→R3@(3,20) [17]
R2@(12,3) W→R1@(3,3) [9]        R1@(4,4) S→R3@(4,19) [15]
R2@(13,4) W→R1@(4,4) [9]        R1@(5,5) S→R3@(5,18) [13]
R2@(14,5) W→R1@(5,5) [9]        R3@(16,8) E→R1@(29,8) [13]
R1@(29,8) S→E@(29,23) [15]      R3@(8,11) E→R0@(16,11) [8]
R0@(16,11) N→R3@(16,8) [3]      R3@(19,11) E→R1@(22,11) [3]
R1@(22,11) S→R3@(22,13) [2]     R3@(25,11) E→R1@(28,11) [3]
R1@(28,11) S→R1@(28,16) [5]    R3@(9,12) E→R0@(19,12) [10]
R0@(19,12) N→R3@(19,11) [1]     R3@(10,13) E→R1@(16,13) [6]
R1@(16,13) S→R2@(16,16) [3]    R3@(22,13) E→R0@(25,13) [3]
R0@(25,13) N→R3@(25,11) [2]    R1@(13,16) S→R3@(13,19) [3]
R2@(16,16) W→R1@(13,16) [3]    R3@(23,16) E→R1@(28,16) [5]
R1@(28,16) S→E@(28,23) [7]     R3@(5,18) E→R0@(8,18) [3]
R0@(8,18) N→R3@(8,11) [7]      R3@(4,19) E→R0@(9,19) [5]
R0@(9,19) N→R3@(9,12) [7]      R3@(13,19) E→R0@(23,19) [10]
R0@(23,19) N→R3@(23,16) [3]   R3@(3,20) E→R0@(10,20) [7]
R0@(10,20) N→R3@(10,13) [7]
```

图中共有 37 个节点（3 spawn、32 redirect、2 exit）和 35 条边。独立逐行读取 APK TDM、从每个入口/方向点沿轴向扫描至下一个 route marker 或 exit，所得边集与 `ROUTE32` 完全相同。三个入口的可达转向点并集是 32/32，出口并集是 2/2；没有静态孤点或不可达出口。分支被选中的概率与实际移动轨迹不能从这张图推出。

## 地形、道路与背景碰撞

| 原始码 | 数量/坐标 | APK 消费方式 |
| ---: | --- | --- |
| `32` | 208 格 | `createBackgroundMap()` 初始转为背景码 48；后续 shaped map 和邻格处理仍需核对最终码。 |
| `36` | 63 格 | `createBackgroundMap()` 默认分支写入背景码 0；后续 `shapenBackgroundMap()` 可按周边地形重塑，不能据初始值判断最终可通行。 |
| `80` | 5 格：`(3,13)、(4,13)、(5,13)、(28,13)、(29,13)` | 水平桥/道路输入；街道贴图覆盖底层地形，贴图矩形不等于碰撞矩形。 |
| `88` | 6 格：`(20,7)、(20,8)、(20,10)、(20,11)、(16,18)、(16,19)` | 竖向桥/道路输入；与 raw `80` 分开映射和验收。 |
| `124` | 44 格 | `BackgroundMap` 水域/河岸背景输入；不是普通装饰，也不是道路。 |
| `78` | 8 格：`(30,16)、(31,16)、(31,17)、(31,18)、(31,19)、(31,21)、(31,22)、(31,23)` | `GameObjectManager` 无独立对象分支；`BackgroundMap` 走默认底图/塑形流程。其设计含义未知，不虚构对象。 |

APK 的 `isReachableXGround()` / `isReachableYGround()` 在候选碰撞框四角读取最终 `getBackground()` 与 `getStreet()`；阻挡判定依赖 shaped background code 和 street code。网页陆地碰撞按原始 tile 与街道 marker 分类，并不直接读取最终背景码。M30-B3 已将本关 768 格的网页陆地阻挡分类与 APK 最终 shaped background + street overlay 独立逐格比较，差异为 `0/768`；包括 raw `36` 最终塑形成阻挡码、raw `80/88` 背景本身阻挡但由街道覆盖放行。真实 Snake River `GameSession` 另验证了两种桥边界、raw `36` 悬崖、睡眠 Grandpa 和 shack。此结果只证明 map32，不能外推到其余 Oregon 地图；共享碰撞规则未改，代码注释已更正以区分 raw `36` 初始值与最终塑形值。验证用例见[地图与路线测试](../tests/oregon-09-map.test.ts)和[真实碰撞会话测试](../tests/oregon-09-collision.test.ts)。随机贴图选片与碰撞类别须分开核对。

## 地图单位、静态对象与特殊 marker

### 新局单位

普通可招募 marker 在 `GameObjectManager` 中创建 activity 4 单位；`GameObjectUnit.create()` 调用 `isUnlocked(unitType)`，未解锁类型不会被构造。网页内容需保留正式档案解锁快照，不因地图上存在 marker 就开放该单位。

| raw marker / 类型 | 数量 | 坐标 |
| --- | ---: | --- |
| `100` / type 5 Sniper | 1 | `(16,5)` |
| `101` / type 6 Grandpa | 19 | `(9,1)、(2,5)、(13,6)、(19,6)、(27,6)、(6,7)、(15,9)、(18,9)、(26,9)、(7,11)、(2,12)、(6,14)、(27,14)、(17,16)、(22,17)、(11,18)、(25,19)、(2,20)、(21,22)` |
| `130` / type 35 Pyromaniac | 1 | `(5,22)` |
| `131` / type 36 Salesman | 1 | `(31,13)` |

地图没有 raw `96–99`、`104–109` 或玩家生成建筑 `112–114`；新局没有这些类型的静态单位或炮池/酒馆池入口。`GameDesignWaves` 的 level 29 分支也没有 SpawnPool action。不要仅凭其它关卡的单位池契约为本关添加招募池。

### 静态装饰、炸药与 Steamer

| raw marker / 对象 | 数量与坐标 | 接入边界 |
| --- | --- | --- |
| `69` / rocks A | 2：`(0,10)、(0,20)` | 共享 Oregon 装饰映射。 |
| `70` / rocks B | 2：`(14,7)、(19,17)` | 共享 Oregon 装饰映射和对应碰撞框。 |
| `79` / tree green A | 6：`(16,0)、(1,1)、(18,4)、(0,5)、(30,6)、(8,9)` | Oregon 专属树木映射。 |
| `115` / tree green B | 13 | 按 TDM 位置生成，不是活动单位。 |
| `116` / shack | 5：`(8,0)、(17,4)、(24,21)、(15,22)、(5,23)` | 共享对象贴图与 APK 对齐碰撞框。 |
| `118` / tree stump | 3：`(31,15)、(9,22)、(19,23)` | Oregon 专属装饰。 |
| `119` / tree green C | 8 | Oregon 专属树木映射。 |
| `126` / waterside rocks | 2：`(26,1)、(29,3)` | 水边岩石对象，不替代 `124` 水域格。 |
| `102` / DynamiteTrigger | 11 | 新局时创建；与箱子按 APK 对象关联逻辑配对。 |
| `110` / DynamiteBox | 11 | 与触发器数相同，缺失或多余时原版会抛出异常。 |
| `120/121/123` / Steamer 组件 marker | 各 1：`(24,2)、(26,2)、(27,2)`；本图没有 `122` | 只有 raw `120` 入口会启动 `createSteamerFromMap()`；该例程沿同一行扫描 120–123 组件。按原版分组创建动态单位，不将 marker 当背景图块或静态装饰。 |

Dynamite 的最近配对结果（格点距离）为：

```text
(23,5)→(23,7)   (9,7)→(9,6)     (1,8)→(2,9)
(12,8)→(12,10)  (24,10)→(24,12) (18,14)→(18,13)
(7,15)→(7,17)   (1,16)→(2,17)   (30,17)→(30,19)
(27,19)→(27,21) (19,21)→(19,20)
```

Steamer 是地图对象生成调用链，不是敌方 wave route，也不属于玩家 pool。对相邻关卡的剪枝：直接检查 APK `td_map_31.tdm` 后，Colt City/map31 的 raw `120–123` 数量均为 0；不因之前摘要的误抄去改 `oregon-08`。

## 关卡参数与波次

`LEVEL29` 的原始 12 项字段为：

```text
[50, 25, 999, 25000, 3, 30000, 5, 15, 82, 110, 150, 119000]
```

按既有参数消费者映射为：初始现金 50、生命 25、最多 999 个奖励箱、箱间隔 25,000 ms、最大升级 3；`awesomeMessageMin=30,000`、`awesomeMessageUnit=5`、场上箱上限 15；Easy/Medium/Hard HP 为 82%/110%/150%；最后字段为已有 Gambler 冷却字段 119,000 ms。最后字段不意味着本地图存在 Gambler：TDM 没有 132/150，故不创建 Gambler/Casino。两个 awesome-message 字段的本关专属展示语义未证实，只沿用共享消费者。

每行 `addToWave` 写作 `spawn action / interval ms / 8 个普通敌人请求槽 / Boss`。Wave API 的较短重载会把未提供的 Boss/Doc 槽补 0；这里按 Smali 实际重载列出，向量表示请求计数，不是固定敌人生成次序。

| 波次 | Header：对白 / 肖像 / 延迟 / HP / 速度 | APK 调用顺序的请求 |
| ---: | --- | --- |
| 1 | `_29_01` / Oregon Dakota Dynamite / 5,000 / 100% / 120% | `2 / 2,500 / [1,1,2,3,2,2,1,0] / Boss 0` |
| 2 | `_29_02` / Oregon Dakota Geezer / 5,000 / 110% / 125% | `0 / 2,500 / [2,2,2,3,2,2,1,0] / Boss 0` |
| 3 | `_29_03` / 沿用 Geezer 肖像 / 15,000 / 120% / 130% | `0 / 2,500 / [2,2,2,3,2,2,1,0] / Boss 0`；`2 / 2,500 / [2,2,2,3,2,2,1,0] / Boss 0` |
| 4 | `_29_04` / 沿用 Geezer 肖像 / 15,000 / 130% / 135% | `0 / 2,500 / [2,2,2,3,2,2,1,0] / Boss 0`；`1 / 2,500 / [2,2,2,3,2,2,1,0] / Boss 0`；`2 / 2,500 / [2,2,2,3,2,2,1,0] / Boss 0` |
| 5 | `_29_05` / Captain / 15,000 / 130% / 135% | `0 / 2,500 / [2,2,2,3,2,2,1,1] / Boss 0`；`1 / 2,500 / [2,2,2,3,2,2,1,1] / Boss 0`；`2 / 2,500 / [2,2,2,3,2,2,1,1] / Boss 0` |
| 6 | `_29_06` / Oregon Dakota Boss / 25,000 / 110% / 140% | `1 / 2,500 / [0,0,0,0,0,0,0,0] / Boss 1` |

资源键与图片 ID 在 `GameDesignWaves` 调用中逐项核对：`_29_01` portrait `oregon_dakota_portrait_dynamite`，`_29_02..04` `oregon_dakota_portrait_geezer`，`_29_05` `portrait_captain`，`_29_06` `oregon_dakota_portrait_boss`。第 4 波第二条 action 是 1；之前摘要中将其写成 2 是寄存器复用误读。六波请求总数为 11。第 6 波使用含 Boss 参数的 overload；Boss 为 1，普通槽为 0。

## 文本、画面与音频资源

| APK 字符串键 | 英文原文 |
| --- | --- |
| `T_LEVEL_NAME_32` | Snake River |
| `T_LEVEL_INFO_32` | The Snake River winds through Oregon and offers much fun for nature lovers. |
| `T_CAMPAIGN_29_01` | Finally, some rest! Slow down those settlers and trigger the mines! |
| `T_CAMPAIGN_29_02` | Eureka! Lure them out and gather them around our dynamite presents! |
| `T_CAMPAIGN_29_03` | "Presents? Is it someone's birthday or death day?" |
| `T_CAMPAIGN_29_04` | "Who's dead? I thought the settlers don't defend themselves!" |
| `T_CAMPAIGN_29_05` | "Settlers? Where? I'll swab the deck with them!" |
| `T_CAMPAIGN_29_06` | "It should be easy to get through this valley! It's as quiet as a retirement home here!" |

`Oregon.battleLoops` 引用 `music_oregon`、`music_loop2`、`music_loop3`；应用已有 `music/music_oregon.ogg` 和 `menu/gng_levelmap_32.png`，portrait、树木、河岸、桥、shack 和 Steamer 通用素材也已存在。本关没有从静态资料确认的专属语音或专属音乐。素材预存与本关实际 builder 预载是两件事；M30-D 必须核对资源收集和入口加载。

## 网页实现映射与未决项

| APK 证据 | 网页接入点 | 实现要求 / 未决项 |
| --- | --- | --- |
| 原始 770 字节 TDM、32×24 | `oregon-09.json`（待新增） | 原始格点应直接由 APK 字节生成；不可从预览图重画。 |
| route action 与 35 条静态边 | `oregon-09-routes.ts` / `runtimeWaveRedirects()` | 先确认 `actionId → spawnPointId → 坐标`，再核对 route redirects；路线图不是道路贴图。 |
| 32/36 shaped background、80/88 street overlay、124 water | `mississippi-map-scene.ts` 与 `game/index.ts` | M30-B 独立复刻/验证最终背景碰撞输出。当前 raw tile 阻挡集合不自动等价于 APK 最终地形。 |
| 100/101/130/131 新局单位与解锁 | Oregon map unit factory | 位置、activity、Awake/睡眠状态、解锁快照与 APK 一致。 |
| 102/110、120/121/123 | `oregon-09-map-entities.ts`、`mississippi-steamer-parts.ts` | Dynamite 最近配对一一对应；Steamer 按行组件组装，不与敌人路线或单位池混淆。 |
| 六 wave headers 和 11 个请求 | `oregon-09-campaign-waves.ts` | 逐项保持调用顺序、action、请求向量和 Boss 槽；不能把调用数组顺序误当固定出兵序。 |
| level 29 参数、标题与对白 | `oregon-09-campaign-rules.ts`、`oregon-09-campaign-copy.ts` | 参数有来源；双语仅作为网页翻译；无 Gambler 和单位池。 |

待验证但不阻塞静态内容归档的边界：

- `awesomeMessageMin` / `awesomeMessageUnit` 在 Snake River 中是否有可见专属效果，代码字段消费者以外未确认。
- TDM tile `78` 没有独立对象创建分支；其默认地形与周边塑形可验证，设计意图未知。
- Android 每次启动的随机地形 variation 与路线分支选择概率不能由静态路线拓扑推出；网页使用确定性 seed 时，验收集合和碰撞类别，不要求随机序列逐次相同。
- `119000` 是已存在参数字段，但本关没有 Gambler marker；不因其非零值增加新玩法对象。
- 当前网页背景碰撞对 raw `32/36` 直接归类的近似是否在所有已接入 Oregon 地图等价，需要 M30-B 的最终 shaped-grid 对照解决。
