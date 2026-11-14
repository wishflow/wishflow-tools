# Oregon 第 6 关：Columbia River 静态审计

## 结论与范围

Columbia River 是全局第 26 关、Oregon 第 6 关，对应 APK `res/raw/td_map_29.tdm`。地图为 32×24 格，原始 TDM 共 770 字节；包含 4 个敌人入口、34 个方向控制点、38 条控制点有向边及 2 个出口。按 APK 的入口朝向、方向表和直线寻路规则枚举后，四个入口的所有分支均可抵达出口，全部控制点都可从入口到达。

关卡数据包含 375 初始现金、25 条生命、3 次升级、Easy/Medium/Hard 的敌人 HP 倍率 86%/115%/175%，以及 8 个 wave header、19 条敌人生成请求和两条第一波玩家单位池动作。地图有 Saloon、Fort、Tipi；3 个开局活动单位；按档案解锁控制的招募单位；两组 Dynamite trigger/box；以及由 TDM 连续标记构成的一组 Steamer。

网页目前已在目录登记 level 26、map 29 和标题；APK 预览图及 Oregon/河流/桥/单位/头像/音频通用素材也已存在。尚未接入的主要内容是 map29 原始 TDM、关卡 JSON/场景、路线、对象、波次、内容 builder、回放版本及正式关卡入口。

本报告只整理 APK 静态资源、REA/JADX 观察、APKTool Smali 和可复算的地图推导。JADX 结果是反编译伪代码，不是原始源码；对象 activity 的关键分支以 Smali switch 和方法体为准。没有启动 Android、播放音频、完整模拟战役或声称复现随机变体的实际屏幕像素。

| 证据状态 | 结论 |
| --- | --- |
| APK 事实 | 包身份、TDM 字节、字段数组、wave 调用、对象 marker 分派、字符串和图片资源均已定位。 |
| 静态推导 | 4 个入口、34 个方向控制点、38 条边及 2 个出口构成完整可达路线图；两个 Dynamite trigger 各自最近的箱体互不冲突。 |
| 网页现状 | 目录和 91×84 的关卡预览图已存在，预览图与 APK 文件一致；map29 的 TDM、JSON、场景、波次及 builder 模块缺失。 |
| 未知项 | `awesomeMessageMin=30,000` 的具体消费语义、APK 单位池 timer 最终赋值、特定随机种子下的原版渲染像素仍未闭环。实现不得为这些未知值新增臆测语义。 |

## 来源索引

短键用于报告内交叉引用。来源位置和短名称便于 grep；不依赖日期编号或长哈希 Evidence ID。APK 与 TDM 摘要各记录一次，之后通过短键引用。

| 短键 | 来源与位置 | 用途和边界 |
| --- | --- | --- |
| `APK-186` | `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk`；包 `com.hg.gunsandgloryfree`，version 1.8.6 / code 34；APK SHA-256 `49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56` | 固定本报告的分析目标。REA 包摘要确认包身份；APK 未执行。 |
| `TDM-29` | APK `res/raw/td_map_29.tdm` | 770 字节，头字节为宽 32、高 24，其后 768 个 y-major tile byte；SHA-256 `765a96e904c0beddc92c2048a98611f89c848af111656565f755143540116aad`。 |
| `LEVEL-26` | `GameDesignData.<clinit>`，数组 index 25 | 全局第 26 关的 12 个原始整数；字段语义结合现有读取点映射，不从字段名独立推断。Smali/REA 检查可通过类名和 `<clinit>` 定位。 |
| `WAVES-26` | `GameDesignWaves.setWaves(WaveManager, SpawnPoolManager, int)` 的 `i == 26` 分支 | 8 个 `newWave`、19 个 `addToWave`、2 条池动作及其源调用顺序。REA 检查返回 JADX Java 伪代码。 |
| `ROUTE-29` | `EnemyDirector.createEnemyDirectorFieldsFromBasicMap`、`EnemyDirectorField.<clinit>`、`setSpawningDirection`、`moveEnemys` | 入口/出口和方向 marker 的解释、入口朝向、控制点与移动方式。下文路线是按这些规则静态枚举，不是运行轨迹。 |
| `OBJECTS-29` | `GameObjectManager.createGameObjectsFromBasicMap`；APKTool `smali_classes2/com/hg/gunsandglory/gamelogic/GameObjectManager.smali` 的方法体约 489–1061 行、switch 表约 1173–1243 行 | TDM 对象分支。activity 4/5 和新局/读档条件以 Smali 为准；JADX Java 只作为辅助阅读。 |
| `STEAMER` | `GameObjectManager.createSteamerFromMap`，同一 Smali 文件约 1246 行起 | marker 120 启动扫描；沿该行将 120/121/123 组成多部件对象，不能把三个 tile 当成三个独立单位。 |
| `DECORATIONS` | `GameObjectDecoration.<init>` 与 `GameObjectManager.createGameObjectsFromBasicMap` | 装饰 tile 到资源类型的映射。坐标由原始 TDM 直接读取；锚点、绘制层和碰撞仍需在网页关卡集成测试。 |
| `SPAWN-LOCATIONS` | `GameObjectSpawnLocation.<init>` / `<clinit>` | spawn type 1=Saloon、2=Fort、3=Tipi、4=Casino；marker 112–114 分别构造前三种。 |
| `POOL-ACTIONS` | `SpawnPoolManager.addActionForSpawnPool`、`performActionsForWave` | 池 action 1 设置库存，action 3 设置上限；第 1 个整数为波次，其后为 action 与 pool type 1–4 的值。 |
| `POOL-SPAWN` | `SpawnPoolManager.update`、`initNewSpawnPool`、`GameObjectUnit.hire` / `canSpawn` | 雇佣并满足 spawn 条件后才进入单位池；地图生成点可用独立 pool template。具体计时器最终值仍未知。 |
| `DYNAMITE` | `DynamiteTrigger.selectDynamiteBox`、`DynamiteBox.detonate/respawn`、炸药参数及共享网页规则 | trigger 按平方距离选择最近箱体；APK 爆炸半径边界为 `<=`。网页需要沿用既有关卡解锁和边界规则。 |
| `OREGON-RENDER` | `Oregon.drawBackgroundLayer`、`drawStreetLayer`、`loadIngameImagesPack`、`GameObjectDecoration` | 地形、街道、河岸及装饰 atlas/绘制资源。路线 marker 与街道输入是不同图层，不能混为一张“路径图”。 |
| `STRINGS-29` | APK `res/values/strings.xml`：`T_LEVEL_NAME_29`、`T_LEVEL_INFO_29`、`T_CAMPAIGN_26_01..08` | 原版英文标题、简介、8 段对白。网页中文为本地化译文。 |
| `ASSETS-29` | APK drawable/raw 资源与 `apps/gunsnglory/public/assets/` | Oregon 通用纹理、桥/水/河岸、对象、肖像、音效和音乐。仅在实施时核对实际绘制/播放引用；存在文件不自动证明某一关使用了它。 |
| `PREVIEW-29` | APK `res/drawable-mdpi-v4/gng_levelmap_29.png` 与网页 `public/assets/menu/gng_levelmap_29.png` | 两者都是 91×84 RGBA PNG，SHA-256 相同；直接复用，不重复迁移。 |

## 原始地图与路线

TDM 的 768 格频次如下，总数为 768。 tile 16/32/36 属于 Oregon 地形图层输入，80/88 是单独送入 Oregon 街道/桥面绘制的输入；124/125 构成水面/河岸区域，126 为水边岩石对象。背景与街道的最终绘制 frame 还受邻接和随机变体影响，不能由 tile 频次直接还原某次屏幕截图。

```text
0:345, 16:61, 32:96, 36:65, 40:1, 41:1, 42:1, 43:1,
48:2, 52:6, 53:7, 54:16, 55:1, 58:2, 60:2,
70:1, 74:1, 77:1, 79:13, 80:6, 88:16,
96:14, 97:11, 98:4, 99:5, 100:1, 101:3, 102:2,
104:1, 105:1, 107:1, 110:2, 112:1, 113:1, 114:1,
115:10, 117:1, 118:5, 119:5, 120:1, 121:1, 123:1,
124:40, 125:8, 126:1, 130:1, 131:1
```

入口 action 是 tile code 减 40；方向 action 是 tile code 减 52。两种 action 编码不能混用。方向 marker 使用 52=N、53=S、54=W、55=E、58=N/S、60=W/S；出口 marker 为 48。路线边按各节点允许的方向连接到同一射线上的最近方向 marker 或出口。

| Marker | 坐标 | 初始方向或出口 | 首个控制点 |
| --- | --- | --- | --- |
| 40 / spawn action 0 | `(10,0)` | 向南 | `55@(10,4)` |
| 41 / spawn action 1 | `(31,3)` | 向西 | `53@(27,3)` |
| 42 / spawn action 2 | `(31,13)` | 向西 | `52@(27,13)` |
| 43 / spawn action 3 | `(31,18)` | 向西 | `53@(29,18)` |
| 48 | `(0,16)`、`(0,21)` | 两个出口 | — |

以下列出全部 34 个方向控制点的 38 条有向边；分支节点列出每个 APK 允许方向。路线边和入口边分开计数，另有 4 条入口到首节点的边。

```text
52@(23,12): 54@(23,9)                52@(27,13): 54@(27,12)
52@(6,18): 54@(6,16)                 52@(23,18): 54@(23,16)
52@(25,20): 54@(25,18)               52@(12,21): 54@(12,19)
53@(27,3): 54@(27,6)                 53@(14,4): 53@(14,9)
53@(14,9): 54@(14,14)                53@(12,14): 54@(12,18)
53@(15,18): 54@(15,21)               53@(29,18): 54@(29,20)
53@(6,19): 54@(6,21)                 54@(20,4): 53@(14,4)
54@(27,6): 60@(23,6)                 54@(20,9): 60@(18,9)
54@(23,9): 54@(20,9)                 54@(27,12): 52@(23,12)
54@(14,14): 53@(12,14)               54@(18,14): 54@(14,14)
54@(6,16): EXIT@(0,16)               54@(23,16): 58@(18,16)
54@(12,18): 52@(6,18)                54@(18,18): 53@(15,18)
54@(25,18): 52@(23,18)               54@(12,19): 53@(6,19)
54@(29,20): 52@(25,20)               54@(6,21): EXIT@(0,21)
54@(15,21): 52@(12,21)                55@(10,4): 53@(14,4)
58@(20,6): 54@(20,4), 54@(20,9)      58@(18,16): 54@(18,14), 54@(18,18)
60@(23,6): 58@(20,6), 54@(23,9)      60@(18,9): 53@(14,9), 54@(18,14)
```

入口可达控制点数量分别为：action 0=`8`，action 1=`16`，action 2=`13`，action 3=`20`；合并覆盖全部 `34` 个控制点。action 0–2 只能抵达 `(0,16)`；action 3 的所有分支分别抵达 `(0,16)` 或 `(0,21)`。静态枚举没有未连接控制点、越界连接或无出口分支。分支选择概率和实际运行时某一单位走过的具体支路不属于此结论。

## 地图对象、单位与解锁

tile 坐标是 TDM 格坐标 `(x,y)`。`activity 4` 表示地图上可雇佣单位；`activity 5` 是新局时已经激活的单位。前者按当前全局进度控制 Sniper、Grandpa、Pyromaniac、Salesman；普通单位 1–4 无需该解锁快照。

| Tile | 数量 | APK 对象/单位 | 坐标 |
| ---: | ---: | --- | --- |
| 96 | 14 | type 1 Gunslinger，activity 4 | `(21,1)、(12,2)、(25,3)、(8,7)、(13,9)、(28,9)、(8,12)、(11,13)、(30,16)、(5,18)、(14,18)、(20,18)、(11,20)、(23,20)` |
| 97 | 11 | type 2 Mexican，activity 4 | `(18,1)、(27,1)、(8,3)、(9,10)、(22,10)、(29,11)、(6,13)、(31,14)、(2,17)、(29,22)、(7,23)` |
| 98 | 4 | type 3 Cannon，activity 4 | `(23,3)、(10,8)、(19,20)、(24,23)` |
| 99 | 5 | type 4 Indian，activity 4 | `(26,10)、(19,13)、(2,14)、(25,16)、(9,21)` |
| 100 | 1 | type 5 Sniper，activity 4，解锁后可雇佣 | `(13,16)` |
| 101 | 3 | type 6 Grandpa，activity 4，解锁后可雇佣 | `(15,1)、(9,15)、(28,15)` |
| 130 | 1 | type 35 Pyromaniac，activity 4，解锁后可雇佣 | `(2,7)` |
| 131 | 1 | type 36 Salesman，activity 4，解锁后可雇佣 | `(31,20)` |
| 104 | 1 | type 1 Gunslinger，activity 5，新局已激活 | `(16,12)` |
| 105 | 1 | type 2 Mexican，activity 5，新局已激活 | `(15,10)` |
| 107 | 1 | type 4 Indian，activity 5，新局已激活 | `(17,10)` |

| Tile | 数量 | APK 对象/资源映射 | 坐标 |
| ---: | ---: | --- | --- |
| 112 | 1 | spawn type 1 / Saloon `b_3x2_saloon` | `(4,2)` |
| 113 | 1 | spawn type 2 / Fort `b_3x2_fort` | `(21,21)` |
| 114 | 1 | spawn type 3 / Tipi `b_2x1_tipi` | `(30,6)` |
| 70 | 1 | decoration type 3 / rocks B | `(31,23)` |
| 74 | 1 | decoration type 7 / windmill | `(10,7)` |
| 77 | 1 | decoration type 10 / bones | `(9,1)` |
| 79 | 13 | tree green A | `(13,0)、(22,3)、(8,4)、(6,5)、(13,7)、(30,10)、(0,14)、(10,15)、(31,16)、(22,17)、(1,18)、(10,22)、(31,22)` |
| 115 | 10 | tree green B | `(24,0)、(7,1)、(12,5)、(18,7)、(26,7)、(20,10)、(8,15)、(8,21)、(1,23)、(16,23)` |
| 117 | 1 | small Tipi decoration；不是 spawn location | `(31,7)` |
| 118 | 5 | tree stump | `(16,0)、(31,0)、(4,5)、(16,6)、(22,11)` |
| 119 | 5 | tree green C | `(20,0)、(13,12)、(26,13)、(4,18)、(28,23)` |
| 126 | 1 | water rocks | `(7,9)` |

map29 有 4 个 pool type 1–4 的可雇佣类型，且存在真实 Fort `(21,21)`。没有地图上的新局 Cannon marker：Cannon 只通过 Fort 池模板生成，不得将四个 activity 4 Cannon 错当成开局单位或在地图伪造第五个 Cannon。当前 `CampaignUnitPoolDefinition.units[].template` 已支持独立模板；复用现有能力，不增加契约。

### Steamer

TDM 中 `120@(2,11)`、`121@(4,11)`、`123@(5,11)` 是一组连续对象标记。`GameObjectManager.createSteamerFromMap` 只由 120 作为扫描起点调用；扫描将 120、121、123 分别解析为船体/部件类型 30/31、32、33。网页应使用已有 Mississippi Steamer 部件/绘制实现，保持其组合、碰撞与对象 ID 稳定，不把 121 和 123 复制成独立火车或单位。

## Dynamite

tile 102 是 trigger、110 是 box。trigger 与最近 box 的一一配对为：

| Trigger | 最近 Box | 平方格距离 |
| --- | --- | ---: |
| `(19,6)` | `(21,7)` | 5 |
| `(15,15)` | `(17,16)` | 5 |

另一组交叉配对的距离平方均为 100 以上。APK 按最近距离配对。当前网页共享炸药实现已按 APK 将 3 格范围边界定义为 `distance² <= radius²`；此关应复用该规则，并沿用当前全局炸药解锁快照（完成全局 level 20 或 30）。回放版本必须编码这一解锁位；Dynamite trigger 的地图位置不随该位变化，锁定时行为以共享 `createDynamiteScenarioDefinition` 约定为准。

## 初态、难度、敌人波次与单位池

`LEVEL-26` 的原始 12 字段为：`[375,25,999,25000,3,30000,5,15,86,115,175,119000]`。字段顺序与既有关卡一致：起始现金、初始生命、补给箱总量、补给箱间隔、最大升级数、`awesomeMessageMin`、`awesomeMessageUnit`、场上补给箱上限、Easy/Medium/Hard 敌人 HP 百分比、Gambler 时间。

| 参数 | 值 | 网页接入边界 |
| --- | ---: | --- |
| 起始现金 / 生命 | 375 / 25 | 正式战役、Free Play 与回放共用同一关卡 builder。 |
| 补给箱总量 / 间隔 | 999 / 25,000 ms | 使用当前共享机制。 |
| 最大升级 | 3 | 使用当前升级规则。 |
| `awesomeMessageMin` / `awesomeMessageUnit` | 30,000 / 5 | 前者消费语义未确认，不新增网页行为；仅沿用已有共享消费者。 |
| 场上补给箱上限 | 15 | 使用当前共享参数。 |
| Easy / Medium / Hard HP | 86% / 115% / 175% | Hard 175% 是本关原始值，不套用其他 Oregon 关的 140%。 |
| Gambler 时间 | 119,000 ms | 地图没有 Casino/Gambler marker，不创建赌徒交互。 |

`WAVES-26` 的 `newWave` 顺序、头字段和 `addToWave` 生成请求如下。请求向量保留 APK 的 8 个槽位次序，不按名称猜测或重排；`action` 是入口 action ID，与路线方向 action 无关。每条 spawn 请求结构为 `入口 action / 间隔 ms / [槽1..槽8]`。

| Wave | Dialogue / portrait | Delay / HP% / speed% | `addToWave` 请求 |
| ---: | --- | --- | --- |
| 1 | `T_CAMPAIGN_26_01` / `portrait_captain` | 15,000 / 100 / 120 | `1 / 2,000 / [2,2,2,3,1,1,0,0]` |
| 2 | `T_CAMPAIGN_26_02` / `portrait_indian` | 15,000 / 110 / 125 | `1 / 2,000 / [1,1,1,2,1,2,1,0]` |
| 3 | `T_CAMPAIGN_26_03` / `oregon_dakota_portrait_geezer` | 20,000 / 120 / 130 | `1 / 2,500 / [0,0,1,1,1,2,1,0]`；`2 / 2,500 / [1,2,1,1,2,1,1,0]` |
| 4 | `T_CAMPAIGN_26_04` / `portrait_deserter` | 25,000 / 130 / 135 | `1 / 2,500 / [1,1,2,2,2,3,2,0]`；`2 / 2,500 / [2,3,2,2,3,2,2,1]`；`3 / 2,500 / [2,3,2,2,3,2,2,0]` |
| 5 | `T_CAMPAIGN_26_05` / `portrait_pedro` | 25,000 / 140 / 140 | `1 / 2,500 / [1,1,2,2,3,3,1,2]`；`2 / 2,500 / [2,2,2,2,3,2,1,2]`；`3 / 2,500 / [2,2,2,3,3,2,1,2]` |
| 6 | `T_CAMPAIGN_26_06` / `portrait_captain` | 25,000 / 150 / 145 | `0 / 2,500 / [1,1,2,2,2,3,2,1]`；`1 / 2,500 / [1,1,2,2,2,3,2,0]`；`2 / 2,500 / [2,3,2,2,3,2,2,1]`；`3 / 2,500 / [2,3,2,2,2,2,2,0]` |
| 7 | `T_CAMPAIGN_26_07` / `portrait_gunslinger` | 25,000 / 160 / 155 | actions 0–3 each `2,500 / [0,1,2,3,3,3,2,1]` |
| 8 | `T_CAMPAIGN_26_08` / `oregon_dakota_portrait_boss` | 25,000 / 160 / 160 | `0 / 3,000 / [0,0,0,0,0,0,0,0]`，Boss 槽数量 1 |

合计 8 个 wave header、19 个普通请求；最后一项额外使用 Boss 槽。向量数组以 APK `addToWave` 实参顺序保存，网页接口的额外保留位不能使八个有效槽错位。

第一波玩家池动作是：

| Wave | Action | pool type 1–4 值 | APK 语义 |
| ---: | ---: | --- | --- |
| 1 | 1 | `[0,0,0,0]` | 将四类当前库存设为 0。 |
| 1 | 3 | `[2,2,2,2]` | 将四类最大库存设为 2。 |

动作到达第 1 波时应用。Fort Cannon 使用 pool type 3、Fort spawn type 2 和独立 Cannon 模板；用短 `GameSession` 验证真正从 `(21,21)` 生成，而不是只断言配置对象存在。APK 的原始 pool timer 最终值仍未知，不把网页默认间隔记录成逆向事实。

## 关卡资源与对白

APK 的标题资源 `T_LEVEL_NAME_29` 为 **Columbia River**；简介 `T_LEVEL_INFO_29` 为：

> The salmon swarms in the Columbia River are world-renowned and easy to bait with dynamite.

| Wave | 原版英文对白 |
| ---: | --- |
| 1 | God bless ya, sailors! It's been quite a while! Let's see if the waters of the Columbia River are as wet as the Mississippi! |
| 2 | This is our river and our salmon! Palefaces should go fishing elsewhere! |
| 3 | Isn't it possible to enjoy a rheumatism bath in peace? |
| 4 | Sir, reporting enemy contact in the south-east! |
| 5 | Boss, here come some wagons from the Californian Gold Exhibition! |
| 6 | Landlubbers ahead! A golden coating of dust is approaching from the north! |
| 7 | Get me more ammunition! Yeeehah! |
| 8 | Come here, you bandit scum! I'll remember your faces in mind and haul all of you into court! |

网页头像按 Wave 表引用；中文内容属于项目本地化，不是 APK 文本。波次对白由现有 intro 对话框显示，不新增语音。对应头像文件、Oregon music 和通用游戏音效都已在网页静态资产目录；实现时逐项验证 URL、启动预加载和播放路由，不复制已有资源。

本地已存在并与 APK 完全相同的 `public/assets/menu/gng_levelmap_29.png`。本地也已存在 `miss_tiles_*`、`tiles_water*`、`tiles_waterside*`、`tiles_bridge_*`、Fort/Saloon/Tipi、树/岩石/船部件、Dynamite 动画、波次表指定肖像及 `music/music_oregon.ogg` 等素材。文件存在不证明地图已接入，也不证明所有资源都由该关使用；以绘制和播放入口核实引用。

## 网页实现缺口与不可臆测项

| 主题 | 静态核对结果 | 实现/验收边界 |
| --- | --- | --- |
| 关卡目录 | `campaign-catalog.ts` 已含 level 26、Oregon、Columbia River、map 29、标题资源 29。 | 不重复登记目录身份；实现正式内容、解锁关系、Free Play 与 replay 路由。 |
| 地图数据 | 网页缺 `res/raw/td_map_29.tdm` 副本、`oregon-06.json` 和 `oregon-06-*` 场景/路线模块。 | 从 APK 原始字节生成，校验 768 格与逐字节一致；不手绘替代 TDM。 |
| 预览和共享资源 | map 29 预览图已逐字节相同；河流、桥、单位和 Oregon 基础素材已存在。 | 复用现有资源，检查分辨率别名和预加载，不重复迁移。 |
| 地图对象 | marker 语义、坐标、activity、三种建筑、Steamer、Dynamite 已静态确认。 | 对照 TDM/Smali 验证类型、位置、ID、资源、锚点、遮挡和碰撞；Fort Cannon 仅作为 pool template。 |
| 初态与战斗 | 12 个参数、8 波、19 请求和两条池动作已核对。 | 固定 seed 短会话验证规则和实际代表性生成，不手动完整通关。 |
| 解锁快照 | 招募受四类全局 unlock 控制；Dynamite 使用已存在的 level 20/30 解锁规则。 | 正式、Free Play、回放使用统一 builder；canonical replay version 编码 4 个单位位及 Dynamite 位。 |
| 随机视觉 | Oregon atlas/街道/背景有邻接和随机变体。 | 依现有兼容随机实现验证绘制命令与图层；除非有既有参考截图，不宣称某随机启动帧像素完全一致。 |
| 未知参数 | awesome message 消费语义、APK pool timer 最终值未证实。 | 明确沿用共享网页行为或现有缺省；不得在关卡专属代码中重解释。 |

## 本报告的边界

路线表由 APK 静态方向规则和原始 TDM 逐格计算，验证的是图的结构及全部分支可达性；它不覆盖画布像素、运行时随机分支概率、贴图锚点或单位动画时序。网页这些部分要用针对性绘制/碰撞断言与局部浏览器检查。APK 研究已经足以实现本关的已知离线内容；没有需要通过启动 Android 才能回答的 M27-A 阻塞问题。
