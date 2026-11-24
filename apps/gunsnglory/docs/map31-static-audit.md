# Oregon 第 11 关：Loot Lakes 静态审计

## 结论与范围

Loot Lakes 是 Oregon 第 11 关、全局第 31 关，对应 APK `res/raw/td_map_34.tdm`。TDM 为 32×24、770 字节，含 768 个按 y、再按 x 排列的格点。静态路线包含 3 个入口、43 个转向点、3 个出口和 54 条有向边；三个入口可达全部转向点和全部出口。逐边投影回原始格网后，路线只经过 raw `32` 走廊、路线 marker、出口，以及 5 个 raw `80/88` 道路覆盖格；没有进入 raw `36` 或水域格。

关卡参数来自 `gameDesignData[30]`。该数组以 0 起始编号，对应全局第 31 关；`GunsAndGloryThread` 按 `globalLevel - 1` 取行。波次配置来自 `GameDesignWaves.setWaves()` 的 `level == 0x1f` 分支，共 9 波、16 条敌人请求；Wave 1 清空四种单位池并将上限设为 `[2,2,0,0]`。不要使用 `gameDesignData[31]` 或 level 32 分支替代本关数据。

本报告固定 APK 静态证据与网页接入基线。Smali 是 DEX 反汇编结果，不是原始 Java 源码；波次和对象语义以调用参数、条件分支、字段写入和消费者交叉确认。开发分支已完成 M32-C1、C2、D1、D2：网页 `oregon-11.json` 包含 map34 原始格网、Dakota 背景与道路绘制指令，场景适配器生成最终背景码、完整路线、静态对象、解锁单位及条件实体。定向测试逐项核对绘制、碰撞、单位 marker、Dynamite 配对和三入口首转；真实短 `GameSession` 核对地形边界、静态对象、睡眠单位和炸药阻挡。这些结果不代表浏览器摄像机视口已完成视觉核对；波次、回放内容和正式目录留待后续切片；视口检查留给 M32-F。本轮未启动 Android、未播放声音、未完整推进关卡。

## 来源与证据索引

| 短键 | 来源和定位 | 支持的结论与边界 |
| --- | --- | --- |
| `APK-186` | 用户提供的 `gunsnglory-1-8-6.apk`；REA `decode_android_resources`；包名 `com.hg.gunsandgloryfree`，版本 1.8.6 / code 34，23,948,202 字节 | 固定反编译目标；资源和代码结论均以此 APK 及其 Smali 为准。 |
| `TDM34` | APK ZIP 项 `res/raw/td_map_34.tdm` | 原始字节长度 770；前两字节宽高 `32,24`；其余 768 字节逐格计数和坐标见下文。 |
| `LEVEL31` | `datastorage/GameDesignData.smali` 的 `gameDesignData[30]` / `:array_1e`；`game/GunsAndGloryThread.smali` 的开局和重开读行逻辑 | 全局等级按 `level - 1` 读取。`:array_1e` 写入索引 `0x1e`，即 index 30；`:array_1f` 是 index 31，不能误用。 |
| `WAVES31` | `datastorage/GameDesignWaves.smali` 的 `setWaves()`：`.line 1335–1336` 对应 `level == 0x1e`，`.line 1381–1382` 对应 `level == 0x1f`；`gamelogic/SpawnPoolManager.smali`、`SpawnPoolAction.smali` | 逐调用还原 level 30 与 level 31 的独立玩家池动作，以及本关 9 个 `newWave`、16 个 `addToWave`。M31 的 `SET_MAX` 为 `[6,6,6,6]`；M32 为 `[2,2,0,0]`。 |
| `OBJECTS34` | `gamelogic/GameObjectManager.smali` 的 `createGameObjectsFromBasicMap()`；`units/GameObjectUnit.smali` 的 `create()` / `isUnlocked()`；`gamelogic/GameObjectDecoration.smali` | TDM marker 到静态装饰、单位、爆炸物、出生建筑的分派、新局条件和解锁规则。 |
| `COLLISION` | `gamelogic/CollisionManager.smali`、对象构造器；本项目[玩家碰撞审计](player-collision-audit.md) | 共享对象框及 X/Y 边沿碰撞语义。M32-C1 已计算本图最终 24×32 背景码；地形、静态对象与单位碰撞分别由 M32-D1/D2 验证。 |
| `TERRAIN34` | `datastorage/BackgroundMap.smali` 的 `createBackgroundMap()`、`createStreetLayerMap()`、`shapenBackgroundMap()`、`shapenStreetLayerMap()`、`createVariationMap()`；`levelpacks/Dakota.smali` 的资源加载与绘制 | raw 地形、道路、邻格塑形、随机变体和 Dakota 图集别名的消费链。初始背景值不等于最终碰撞码。 |
| `COPY34` | APK strings：`T_LEVEL_NAME_34`、`T_LEVEL_INFO_34`、`T_CAMPAIGN_31_01..09`；`GameDesignWaves` drawable 参数 | 原版英文标题、简介、9 波对白 key 和肖像资源。网页中文翻译不是 APK 原文。 |
| `WEB31` | 当前 Guns’n’Glory 代码及[实施计划](implementation-plan.md) | 公开版本仍为 M31；开发分支已完成 M32 玩家池、地形、路线、静态对象和地图实体切片，但 Loot Lakes 尚未作为完整可玩关卡登记。 |

## TDM 网格、道路与背景

768 格中所有非零值的数量如下，合计校验为 768：

```text
16:42, 32:97, 36:60, 40:1, 41:1, 42:1, 48:3,
52:9, 53:7, 54:17, 55:2, 56:5, 57:2, 58:1,
69:12, 70:3, 71:4, 74:1, 76:7, 80:2, 88:6,
96:15, 97:12, 98:3, 100:1, 101:3, 102:2, 110:2,
112:1, 116:2, 124:44, 125:8, 126:1, 130:1, 131:1,
132:1, 150:1
```

坐标均为 TDM 格点 `(x,y)`。地形与道路原始位置按行压缩如下；`a-b` 表示同一行连续的 x 范围：

| raw code | 格数 | 坐标范围 |
| ---: | ---: | --- |
| `16` | 42 | `y5:7-8; y6:5-7; y7:5; y12:28; y13:28; y14:5,28; y15:5-6,21-23,27-30; y16:6-7,9,21,30; y17:7-12,20-21; y18:10,17-20; y19:10; y20:10; y21:10; y22:10-11` |
| `32` | 97 | `y1:1-9; y2:1-10; y3:11,26-30; y4:12,14,25; y5:15,21-22,24; y6:15,19-20; y7:16-19; y8:17-19; y9:1-2,8,10,14,17-19,21; y10:3,8-10,14,16-17,19,22; y11:3,7,12-13,18-22; y12:4,6,13-14,18-19,23-24; y13:19,25; y14:18,25; y15:18; y16:16-17,25; y17:25; y18:15,26-27; y19:15,28; y20:14,28; y21:13,29-30; y22:13` |
| `36` | 60 | `y0:0-11; y2:25-31; y3:12,14-15; y4:20-22,24; y5:18-19; y6:16-17; y7:14; y8:0-3,8-10,21-22; y9:7,11; y10:12-13; y11:4,6,23-25; y15:15-17; y17:26-28; y19:13-14; y20:29-31` |
| `80` | 2 | `(25,15)、(15,17)` |
| `88` | 6 | `(13,3)、(13,4)、(23,4)、(23,5)、(5,11)、(5,12)` |
| `124` | 44 | `y5:2-3; y18:2-3; y19:1-5; y20:0-2,4-6,20-22; y21:0-7,19-24; y22:0-4,21-23; y23:0-3` |
| `125` | 8 | `y17:2-3; y18:1,4-5; y19:0,6; y20:7` |
| `126` | 1 | `(3,20)`；同一格还分派 water-rock 静态装饰 |

APK 的初始转换和绘制链有以下区别：

| 原始码 | `createBackgroundMap()` 初始结果 | `createStreetLayerMap()` 结果 | 限制 |
| ---: | --- | --- | --- |
| `32` | 背景码 `48` | 无街道层覆盖 | `shapenBackgroundMap()` 之后还会按邻格塑形；不能直接把初始 48 当成最终阻挡分类。 |
| `36` | 默认背景码 `0` | 无街道层覆盖 | `shapenBackgroundMap()` 之后还会按邻格塑形；不能将初始 0 或 raw marker 本身直接当成最终阻挡分类。 |
| `16` | 默认背景码 `0` | 保留街道码 `16` | 原始码不是图集索引；绘制图块还要经过 Dakota 的街道图层映射。 |
| `80` | 背景码 `48` | 街道码 `64` | 本图两格都处于敌方路线：`(25,15)`、`(15,17)`。 |
| `88` | 仅当上邻格同为 `88/89` 时初始背景码 `48`，否则为 `0` | 街道码 `76` | 路线上覆盖格为 `(13,4)`、`(23,5)`、`(5,12)`；其余 `88` 是相邻道路图层输入。 |
| `124–126` | 背景码 `96` | 无街道层覆盖 | `126` 同时额外创建 `e_1x1_rocks_water` 装饰对象。 |

`BackgroundMap` 的实际调用顺序为 `createBackgroundMap → createStreetLayerMap → shapenBackgroundMap → shapenStreetLayerMap → createVariationMap`。地面可达性读最终塑形后的背景与街道层；不得把 raw `36` 的初始转换写成全图统一阻挡结论，也不得套用 Mississippi 的图块码表。

M32-C1 已按此顺序建立网页基线：原始网格存于 `src/content/oregon-11.json`，其中 768 个背景命令与 56 个道路/桥梁命令使用 Dakota 的通用图集别名；`src/content/oregon-11-scene.ts` 从绘制图集区域还原最终背景码。定向测试用 APK Smali 派生的独立参考逐项比较完整绘制命令和碰撞码，并检查贴图文件与裁切边界。此静态对照没有验证视口内的实机观感、地面单位可走范围或地图对象碰撞。

### Dakota 背景资源

`Dakota.loadIngameImagesPack()` 将 Dakota 专属资源名别名到共享位图：

| Dakota 资源名 | 共享位图 |
| --- | --- |
| `oregon_dakota_tiles_canyon` | `tiles_canyon` |
| `oregon_dakota_tiles_canyon_wall_var` | `tiles_canyon_wall_var` |
| `oregon_dakota_tiles_desert` / `_var` | `tiles_desert` / `tiles_desert_var` |
| `oregon_dakota_tiles_path` / `_var` | `tiles_path` / `tiles_path_var` |
| `oregon_dakota_tiles_waterside` / `_var` | `tiles_waterside` / `tiles_waterside_var` |

同一加载方法也请求共享的 `tiles_canyon_floor`、`tiles_canyon_floor_var`、`tiles_shadow`、`tiles_shadow_var`、`tiles_water`。实际 tile 源矩形、目的矩形、阴影和图层遮挡由 `Dakota.drawBackgroundLayer()` 与公共街道绘制共同决定；资源别名正确不代表网页地图已完成视觉对照。

该 LevelPack 的 `getFirstLevelIdPack()` 返回全局关卡31，正是 Loot Lakes。`loadIngameImagesPack()` 还把 `e_1x1_tree_snow`、`e_1x1_rocks_snow_a`、`e_1x1_rocks_snow_b` 分别写入通用树、岩石 A/B 的位图缓存槽，因此地图 raw `71/69/70` 应使用雪地变体；不能因场景模块名 `oregon-11` 把首个 Dakota 关卡排除在地区资源替换之外。网页现由 `createOregon11MapScene()` 使用这些雪地资产，`dakota-snow-biome-assets.test.ts` 将 Loot Lakes 与已接入的 Dakota 第2–9关、Snow Town 一并核对。

## 敌方入口与完整路线

路线 marker 的 action：raw `52/53/54/55/56/57/58` 分别是北、南、西、东、北+西、北+东、北+南。spawn marker `40/41/42` 的 action ID 为 `raw - 40`，redirect marker 的 action ID 为 `raw - 52`。路线边从 marker 沿给定轴向扫描到下一个 redirect 或出口；方括号内为格距，不是像素或游戏时间。

| marker | 数量与坐标 |
| ---: | --- |
| Spawn `40–42` | `40@(13,23)`；`41@(31,21)`；`42@(31,3)` |
| Exit `48` | `(0,1)、(0,2)、(0,9)` |
| Redirect `52` 北 | `(11,4)、(11,11)、(3,12)、(21,12)、(20,13)、(18,16)、(25,18)、(15,20)、(28,21)` |
| Redirect `53` 南 | `(25,3)、(20,5)、(14,8)、(16,8)、(15,9)、(7,10)、(15,10)` |
| Redirect `54` 西 | `(10,1)、(11,1)、(15,4)、(25,5)、(20,7)、(15,8)、(3,9)、(16,9)、(22,9)、(11,10)、(18,10)、(21,10)、(14,11)、(15,11)、(7,12)、(25,12)、(28,18)` |
| Redirect `55` 东 | `(15,16)、(13,20)` |
| Redirect `56` 北+西 | `(11,2)、(20,8)、(20,9)、(20,10)、(22,12)` |
| Redirect `57` 北+东 | `(20,12)、(18,13)` |
| Redirect `58` 北+南 | `(15,7)` |

完整有向边如下；每个来源节点的所有可选出口都列出：

```text
S@(13,23) N→R@(13,20)[3]      S@(31,21) W→R@(28,21)[3]     S@(31,3) W→R@(25,3)[6]

R@(10,1) W→E@(0,1)[10]        R@(11,1) W→R@(10,1)[1]
R@(11,2) N→R@(11,1)[1], W→E@(0,2)[11]
R@(11,4) N→R@(11,2)[2]       R@(11,11) N→R@(11,10)[1]
R@(3,12) N→R@(3,9)[3]        R@(21,12) N→R@(21,10)[2]
R@(20,13) N→R@(20,12)[1]     R@(18,16) N→R@(18,13)[3]
R@(25,18) N→R@(25,12)[6]     R@(15,20) N→R@(15,16)[4]
R@(28,21) N→R@(28,18)[3]

R@(25,3) S→R@(25,5)[2]       R@(20,5) S→R@(20,7)[2]
R@(14,8) S→R@(14,11)[3]      R@(16,8) S→R@(16,9)[1]
R@(15,9) S→R@(15,10)[1]     R@(7,10) S→R@(7,12)[2]
R@(15,10) S→R@(15,11)[1]

R@(11,1) W→R@(10,1)[1]       R@(15,4) W→R@(11,4)[4]
R@(25,5) W→R@(20,5)[5]       R@(20,7) W→R@(15,7)[5]
R@(15,8) W→R@(14,8)[1]       R@(3,9) W→E@(0,9)[3]
R@(16,9) W→R@(15,9)[1]       R@(22,9) W→R@(20,9)[2]
R@(11,10) W→R@(7,10)[4]     R@(18,10) W→R@(15,10)[3]
R@(21,10) W→R@(20,10)[1]    R@(14,11) W→R@(11,11)[3]
R@(15,11) W→R@(14,11)[1]    R@(7,12) W→R@(3,12)[4]
R@(25,12) W→R@(22,12)[3]    R@(28,18) W→R@(25,18)[3]

R@(15,16) E→R@(18,16)[3]    R@(13,20) E→R@(15,20)[2]

R@(11,2) N→R@(11,1)[1], W→E@(0,2)[11]
R@(20,8) N→R@(20,7)[1], W→R@(16,8)[4]
R@(20,9) N→R@(20,8)[1], W→R@(16,9)[4]
R@(20,10) N→R@(20,9)[1], W→R@(18,10)[2]
R@(22,12) N→R@(22,9)[3], W→R@(21,12)[1]

R@(20,12) N→R@(20,10)[2], E→R@(21,12)[1]
R@(18,13) N→R@(18,10)[3], E→R@(20,13)[2]
R@(15,7) N→R@(15,4)[3], S→R@(15,8)[1]
```

按每个 marker 的方向集合独立扫描原始 TDM，得到 49 个节点、54 条唯一有向边；与 REA 派生路线图中 `td_map_34.tdm` 的唯一边集合逐条相同。按方向分组的表格有57次列项，其中3条共享边重复，不应把表格行内列项数误当唯一边数。三个入口合并可达全部 43 个 redirect 和 3 个 exit；无越界边、孤立转向点或不可达出口。54 条边的目的格与中间格合并后共 141 个独立格点：raw `32` 为 90 格、raw `80` 为 2 格、raw `88` 为 3 格，其余 46 格为 redirect/exit；3 个 spawn 是额外的来源格。由此可证路线位于 TDM 走廊并通过指定桥格；不能据此推断网页精灵锚点、移动速度或图层绘制已经对齐。

M32-C2 已将此图接入网页：`oregon-11-routes.ts` 从 map34 自身的 action marker 构建路径；测试夹具逐边核对54条唯一有向边，并确认 action ID 到 row-major spawn ID 映射为 `{0:2,1:1,2:0}`。三个入口各用一个短 `GameSession` 波次检查来源 ID 和第一个运行时转向。该测试证明三条入口能进入共享方向场并完成首转，不表示完整路线已经做过浏览器视觉验收。

## 初始参数与单位生成池

`gameDesignData[30]` 的 12 项原始值为 `[250,25,999,25000,3,30000,5,15,56,75,100,299000]`：

| 索引 / APK 字段 | 原始值 | 代码消费者与网页边界 |
| --- | ---: | --- |
| `0 / LEVEL_DATA_CASH` | 250 | 开局现金 `$250`。 |
| `1 / LEVEL_DATA_LIVES` | 25 | 开局与最大生命均为 25。 |
| `2 / LEVEL_DATA_MAX_CHESTS` | 999 | 奖励箱剩余生成额度。 |
| `3 / LEVEL_DATA_CHEST_TIME` | 25,000 ms | 奖励箱生成计时器。 |
| `4 / LEVEL_DATA_MAX_UPGRADES` | 3 | 最大升级等级。 |
| `5 / LEVEL_DATA_AWESOME_MESSAGE_MIN` | 30,000 | 该索引在已检查的玩法消费者中没有读取点；保留原值，不臆测显示或计时行为。 |
| `6 / LEVEL_DATA_AWESOME_MESSAGE_UNIT` | 5 | 开局时写入 `triggerMessageMinEnemy`；`EnemyDirector` 用敌人类型值与该阈值比较来决定是否进入特殊击杀对白分支。它不是敌人数量。 |
| `7 / LEVEL_DATA_MAX_CHESTS_PLAYFIELD` | 15 | 同时存在的奖励箱上限。 |
| `8` | 56 | Easy 敌人 HP 百分比。 |
| `9` | 75 | Medium 敌人 HP 百分比。 |
| `10` | 100 | Hard 敌人 HP 百分比。 |
| `11 / LEVEL_DATA_GAMBLER_TIME` | 299,000 ms | Gambler 的 `maxWeaponCooldown`；仅当 Gambler 按解锁规则实例化时使用。 |

同一 `SpawnPoolManager.addActionForSpawnPool` 调用的第 1 个参数是 wave，第 2 个参数是 action；`SpawnPoolAction` 构造器分别将其写入 `wave`、`action` 字段。动作在 Wave 1 生效：

| APK 调用参数 | 语义 | 结果 |
| --- | --- | --- |
| `(wave=1, action=1, 0,0,0,0)` | action 1 = SET | 清空 Gunslinger、Mexican、Cannon、Indian 四个待发池。 |
| `(wave=1, action=3, 2,2,0,0)` | action 3 = SET_MAX | 生命周期派发上限 `[2,2,0,0]`。 |

Level 30 的 M31 上限是 `[6,6,6,6]`，与 M32 `[2,2,0,0]` 不同。raw `112` 在 `(9,15)` 创建唯一 Saloon（spawn-location type 1）；无 raw `113` Fort 或 raw `114` Tipi。因此本关只能从 Saloon 的 pool type 1/2 派发单位，pool type 3/4 上限为 0。池上限不创建地图初始单位；可招募 marker 被雇佣后才进入对应池。

## 波次、生成请求与对白

`newWave` 的 delay 全部是 15,000 ms。表中“普通请求”按 `addToWave` 前八个敌人计数槽原顺序记录；action ID 是 TDM 出生口编号，不是波次序号。计数是待生成的类型请求，不保证敌人按数组顺序出现。第 9 波调用 11 整数重载，前八个普通槽为零，第九个计数传到已确认的 Boss slot（网页 `requests[8]`）；Doc slot 未提供、补零为 0。

| Wave | key / portrait | HP / 速度 | action ID、间隔与普通请求；末尾特殊槽 |
| ---: | --- | ---: | --- |
| 1 | `T_CAMPAIGN_31_01` / Calamity | 120% / 120% | `1 @ 2,000 ms`: `[3,3,4,5,3,3,0,0]` |
| 2 | `_02` / Gunslinger | 140% / 130% | `1 @ 2,000 ms`: `[1,1,4,5,4,4,1,0]` |
| 3 | `_03` / Mexican | 130% / 130% | `0 @ 2,500 ms`: `[1,1,4,5,4,4,2,0]`; `1 @ 2,500 ms`: 同向量 |
| 4 | `_04` / Pedro | 185% / 135% | `0 @ 2,000 ms`: `[0,0,0,3,9,1,0,0]`; `1 @ 2,000 ms`: 同向量 |
| 5 | `_05` / Calamity | 180% / 140% | `0 @ 2,500 ms`: `[0,1,3,3,4,4,2,0]`; `1 @ 2,500 ms`: `[0,0,3,4,4,4,2,0]` |
| 6 | `_06` / Geezer | 190% / 145% | `2 @ 2,500 ms`: `[0,0,2,3,4,4,3,2]` |
| 7 | `_07` / Pedro | 190% / 150% | `0 @ 2,500 ms`: `[0,1,2,3,4,4,3,1]`; `1 @ 2,500 ms`: `[1,0,2,3,4,4,3,2]`; `2 @ 2,500 ms`: 第一向量 |
| 8 | `_08` / Pedro | 215% / 155% | `0 @ 2,500 ms`: `[0,1,2,3,4,4,3,1]`; `1 @ 2,500 ms`: `[1,0,2,3,4,4,3,2]`; `2 @ 2,500 ms`: 第一向量 |
| 9 | `_09` / Boss | 230% / 160% | `1 @ 500 ms`: 普通槽 `[0,0,0,0,0,0,0,0]`；Boss `1`、Doc `0` |

`newWave` 的 drawable 映射为 `oregon_dakota_portrait_calamity`、`portrait_gunslinger`、`portrait_mexican`、`portrait_pedro`、`oregon_dakota_portrait_geezer`、`oregon_dakota_portrait_boss`。第 7/8 波各有三条请求，因此全关为 9 个 wave 和 16 条 `addToWave` 请求。Boss/Doc 槽语义及重载补零依据见实施计划的 M31-A，不能把 Boss 数量写进 Doc 索引。

APK 英文对白如下；网页实现可另外提供中文翻译：

| Wave | APK key | 英文原文 |
| ---: | --- | --- |
| 1 | `T_CAMPAIGN_31_01` | “Howdy, men! You should dress warmly! And just to let you know: one wrong word and I'll shoot off your trouser buttons at a hundred yards!” |
| 2 | `T_CAMPAIGN_31_02` | “I already dressed warmly, sweetheart! Dakota is pretty cold in the winter!” |
| 3 | `T_CAMPAIGN_31_03` | “Ey muchacha, why don't you strut your stuff? Here come some gold carriers from the south!” |
| 4 | `T_CAMPAIGN_31_04` | “You girls like horses, don't you? I'm just asking, because there's a whole herd of horses coming!” |
| 5 | `T_CAMPAIGN_31_05` | “First, I only like gold! Second, one more crack and you'll count as a girl, too!” |
| 6 | `T_CAMPAIGN_31_06` | “While you're squabbling down there, some more settlers are trudging through the snow in the north-east!” |
| 7 | `T_CAMPAIGN_31_07` | “Sir, eh, Ma'am, eh… They're coming from everywhere!” |
| 8 | `T_CAMPAIGN_31_08` | “It's my first time with a woman… Robbing some settlers!” |
| 9 | `T_CAMPAIGN_31_09` | “Hell, now they're even sending female bandits to get our gold! Come on, try to hit me, I bet you won't!” |

关卡简介资源 `T_LEVEL_INFO_34` 为：`Lots of gold diggers already got rich in the deep valley of Loot Lakes!`。对白以静态文本和肖像资源驱动；本关没有在 `Dakota` level-pack 类中发现专属语音播放表。

## 对象、招募单位与碰撞

### 静态装饰和建筑

| raw marker / 对象 | 数量与坐标 | APK 绘制资源 / 碰撞框（fine units，相对 marker 格左上角） |
| --- | --- | --- |
| `69` / rocks A | 12：`(15,0)、(26,0)、(22,1)、(17,3)、(28,5)、(12,7)、(6,10)、(15,12)、(31,17)、(23,18)、(9,19)、(16,22)` | `e_1x1_rocks_a`；普通装饰框 `(1920,2612,3840,2534)`。 |
| `70` / rocks B | 3：`(6,3)、(27,7)、(12,14)` | `e_1x1_rocks_b`；特殊框 `(1306,1920,5068,3840)`。 |
| `71` / tree | 4：`(3,3)、(30,10)、(21,18)、(8,23)` | `e_1x1_tree`；普通装饰框。 |
| `74` / windmill | 1：`(9,12)` | `b_1x1_windmill`；普通装饰框。 |
| `76` / bush | 7：`(30,0)、(8,3)、(1,4)、(29,8)、(29,12)、(1,13)、(26,23)` | `e_1x1_bush`；普通装饰框。 |
| `116` / shack | 2：`(30,6)、(3,15)` | `b_2x1_shack`；宽两格框 `(−7680,2612,15360,3840)`。 |
| `126` / water rock | 1：`(3,20)` | `e_1x1_rocks_water`；普通装饰框。 |
| `112` / Saloon | 1：`(9,15)` | spawn-location type 1；建筑框 `(−2496,−4224,14592,6144)`。无 Fort `113` 或 Tipi `114`。 |
| `150` / Casino | 1：`(28,11)` | 仅当 Gambler type 9 解锁才创建；与 Saloon 同类建筑框。 |

`GameObjectDecoration` 的绘制矩形可能大于碰撞框；网页不得把精灵外框或建筑贴图框当碰撞区。普通静态装饰和 Saloon 的对象移动使用 APK X/Y 边沿穿越检查；M32-D1 用本关真实对象与 `GameSession` 核对静态框及地图移动，M32-D2 核对活动/睡眠单位、炸药和 Gambler/Casino 解锁后的碰撞与生成相互作用。

### 单位、炸药和解锁状态

`GameObjectManager.createGameObjectsFromBasicMap()` 在新局路径创建 raw `96–101` 的 activity 4 可招募单位。类型为 `raw - 95`；marker 存在不代表在所有档案下都会实例化。raw `130/131` 是 type 35/36 的特殊招募单位，也受 `isUnlocked()` 约束。

| raw marker / 单位类型 | 数量与坐标 |
| --- | --- |
| `96` / type 1 Gunslinger | 15：`(14,1)、(20,1)、(22,2)、(7,4)、(4,6)、(6,7)、(10,13)、(16,13)、(13,14)、(29,14)、(31,14)、(20,15)、(22,16)、(30,18)、(20,19)` |
| `97` / type 2 Mexican | 12：`(17,1)、(6,5)、(9,5)、(24,7)、(5,8)、(26,8)、(27,13)、(4,16)、(13,16)、(24,17)、(18,19)、(9,21)` |
| `98` / type 3 Cannon | 3：`(24,9)、(6,14)、(22,14)` |
| `99` / type 4 Indian | 0；本图没有该 marker。 |
| `100` / type 5 Sniper | 1：`(17,11)` |
| `101` / type 6 Grandpa | 3：`(23,1)、(5,5)、(30,12)` |
| `130` / type 35 Pyromaniac | 1：`(26,20)` |
| `131` / type 36 Salesman | 1：`(31,8)` |

`GameObjectUnit.isUnlocked()` 的通用规则是：单位的 `UNLOCK_DATA_AVAILABLE` 不晚于当前全局等级时可用；否则需要完成相应的 `UNLOCK_DATA_UNLOCK` 里程碑。和本关相关的 APK 数据为：

| 单位 | available level | unlock milestone | 本关 global level 31 的结论 |
| --- | ---: | ---: | --- |
| 基础 type 1–4 | 无额外解锁行 | — | 可用；type 4 Indian 虽可用，本图无 marker。 |
| Dynamite trigger/box type 7/8 | 21 | 30 | level31 可用。 |
| Grandpa type 6 | 21 | 30 | level31 可用。 |
| Sniper type 5 | 31 | 40 | level31 达到 available level，可用。 |
| Pyromaniac type 35 | 41 | 50 | level31 时需 profile 已完成 global level 50。 |
| Salesman type 36 | 51 | 60 | level31 时需 profile 已完成 global level 60。 |
| Gambler type 9 | 41 | 50 | level31 时需 profile 已完成 global level 50。 |

因此对刚进入正式 level31、尚未完成后续里程碑的存档，Sniper 和 Grandpa marker 会生成；Pyromaniac、Salesman、Gambler/Casino 不生成。后几类仍必须纳入网页内容版本或回放解锁快照，不能只按 TDM marker 静态硬编码。

| raw marker | 数量与坐标 | APK 构造语义 |
| --- | --- | --- |
| `102` / DynamiteTrigger type 7 | 2：`(18,4)、(9,7)` | 新局创建；解锁后加入动态单位碰撞集合。 |
| `110` / DynamiteBox type 8 | 2：`(18,6)、(9,9)` | 新局创建；与两只 trigger 依 APK 配对过程关联。两类数量相等。 |
| `132` / Gambler type 9 | 1：`(27,11)` | 新局创建且解锁时生成 activity 5 单位。 |
| `150` / Casino spawn location type 4 | 1：`(28,11)` | Gambler 解锁时创建并加入未分配 Casino 列表；对象管理器要求 Gambler 与 Casino 数量匹配后再配对。 |

地图不含 raw `104–109` 活动单位、列车 `120–123` 或其它玩家 spawn 建筑。活动/睡眠单位、炸药、建筑和普通装饰都可能阻挡玩家移动；地形、静态对象由 M32-D1，单位与动态对象由 M32-D2 的真实 `GameSession` 测试验收，不能由绘制截图代替。

## Dakota 音乐、关卡身份与网页接入边界

`Dakota.battleLoops` 引用 `music_dakota`、`music_loop2`、`music_loop3`。这是该 level pack 的背景音乐循环列表，不是关卡专属 SFX 列表；音效由共享敌人与单位逻辑按行为触发。本审计不播放声音，也不声称网页已接线这些循环。`Dakota.getFirstLevelIdPack()` 返回 31；网页正式目录应将本关接在 M31（global level 30）之后。网页 Free Play 可以开放已接入关卡，但必须维持正式进度与回放快照隔离。

## 后续接入必须闭合的事项

| 切片 | 从本审计继承的固定期望 | 仍需实现或验证 |
| --- | --- | --- |
| M32-B | Wave 1 pool SET 清空四槽，SET_MAX 为 `[2,2,0,0]`；action 参数顺序为 wave、action、四个数值。 | **已完成：**M32 玩家池仅配置 Saloon `(9,15)` 的 Gunslinger/Mexican 出生路径；短 `GameSession` 派发各2名，未派发零上限槽；M31 `[6,6,6,6]` 回归测试保持通过。全局刷新周期仍未知，网页沿用共享15,000 ms cadence，不作为 APK 结论。 |
| M32-C1 | TDM 32×24/768 格；Dakota 背景、道路、桥梁绘制与最终背景码已固定。 | **已完成：**独立 TDM fixture、768 个背景命令、56 个道路/桥梁命令、完整 24×32 最终背景码、通用 `tiles_*` atlas 与 source rectangle 均由定向测试核对。真实视口外观和单位移动不属于本切片证据。 |
| M32-C2 | 3 个入口、43 个 redirect、3 个出口和54条唯一有向边已由本报告逐条展开。 | **已完成：**测试夹具逐边核对完整图，映射 action ID→row-major spawn ID，并用短 `GameSession` 验证三个入口的首转。完整视觉路线仍待 M32-F 检查。 |
| M32-D1 | 静态装饰、建筑 marker 坐标/资源及 TDM 碰撞码表见本报告。 | **已完成：**按 marker 核对实体、坐标和资源；以独立 APK 框表核对碰撞，并用短 `GameSession` 覆盖 Saloon、shack、rocks、raw `80/88` 桥和 raw `36` 墙；地形格与对象边沿碰撞分开断言。 |
| M32-D2 | 单位 activity/解锁、炸药配对、Gambler/Casino 坐标与条件见本报告。 | **已完成：**核对默认、全解锁及特殊单位门槛，最终单位/配对/唯一 ID、资源与动态碰撞；用短场景验证睡眠单位和炸药碰撞，未完整通关。 |
| M32-E | Level31 参数行、9 波/16 请求、所有间隔和倍率均固定于上表。 | 用独立期望逐字段比较，并以短 GameSession 覆盖开局参数、wave 顺序、来源 spawn ID、Boss 槽和池动作。 |
| M32-F | 标题、简介、对白 key、头像、音乐和地图身份已核对。 | 完成双语内容、正式关卡和 Free Play builder；回放内容版本纳入地图单位解锁快照，保留 campaign 结算隔离和 M31 前置关系；批次末从真实入口进行代表性流程和视口核验。 |
