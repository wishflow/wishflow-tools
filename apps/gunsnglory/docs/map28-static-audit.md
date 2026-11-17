# Oregon 第 8 关：Colt City 静态审计

## 结论与范围

Colt City 是全局第 28 关，对应 APK `res/raw/td_map_31.tdm`。TDM 头部为 32×24，文件共 770 字节；直接读取 APK 后，其 768 个格点与现有结构化清单逐字节一致。静态路线图含 4 个入口、35 个方向控制点、2 个出口和 44 条有向边；合并四个入口的可达集合可到达全部控制点和两个出口，没有越界、断路或孤点。

地图含 25 个可雇佣单位 marker、1 个 Gambler、1 个 Casino、2 个 Saloon、1 个 Fort、1 个 Tipi，以及一组由两节机车和两节车厢组成的横向列车。关卡配置为 $600、25 条生命、9 波、19 条敌人请求；Wave 1 将四类玩家单位库存设为 0、库存上限设为 3。现有网页已经有关卡目录元数据、91×84 预览图、Oregon 地形/对象/音频、对白头像和 Gambler/Casino、回放、单位池的共享实现；尚未接入 map31 的实际关卡数据与可玩入口。

本报告覆盖 APK 静态资源、REA 检查结果、Smali/JADX 定位、已有派生地图清单和网页代码交叉核对。JADX 输出是反编译伪代码，不是原始源码。没有启动 Android、播放音频、完整模拟战役，也不把静态路线图当作单位的逐帧移动轨迹。

| 证据类别 | 结论 |
| --- | --- |
| APK 事实 | 包身份、TDM 长度与格数、关卡参数、波次调用、英文资源键、预览图及音频/图像资源均已定位。 |
| 静态推导 | 四个入口覆盖全部 35 个方向点和两个出口；列车由 TDM 中连续组件组成；地图对象与现有静态对象分派相符。 |
| 网页现状 | 目录已有 Colt City/map31 元数据，预览图及共用 Oregon 资源存在；正式战役和 Free Play 还没有接入 map31 builder。 |
| 仍未知 | `awesomeMessageMin`、`awesomeMessageUnit` 对本关的专属消费语义；随机种子下实际选中的地形变体和路线分支；APK 单位池 timer 的最终赋值。实现沿用已验证共享消费者，不为未知项新增语义。 |

## 来源索引

短键用于本报告交叉引用，避免在每条结论后重复长 ID。附件与原始研究清单保留在研究工作区；本报告不复制整套 REA 数据库。

| 短键 | 来源与定位 | 用途和边界 |
| --- | --- | --- |
| `APK-186` | `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk`；`com.hg.gunsandgloryfree`，version 1.8.6 / code 34 | 固定本次静态分析目标。 |
| `TDM31` | APK 项 `res/raw/td_map_31.tdm`；REA 文件视图 Evidence `ev_0a08e5df93d58e7ba2c908b098fd0ae4d025af84a611b23dda7660b070497a44` | 原始 770 字节、32×24；直接 ZIP 读取与清单格点逐字节相同。 |
| `MAP31` | `map-inventory.json` 的 index 31；`analyze-static-routes.py` 输出 | 原始 tile 坐标、频次和地图尺寸。频次总和为 768。 |
| `ROUTE31` | `static-route-graph.json` 的 index 31；路线 marker 解码与射线寻路规则 | 全部静态入口、方向点、出口、边和可达性。不是运行时路线采样。 |
| `TERRAIN31` | `terrain-render-index.json`、`BackgroundMap` 地形变换、`Oregon` 背景/道路绘制消费者；网页 `createMississippiMapScene` | 分辨 Oregon 背景、道路与碰撞输入；最终绘制变体受邻格和随机规则影响。 |
| `OBJECTS31` | `GameObjectManager.createGameObjectsFromBasicMap/createTrainFromMap`、`GameObjectSpawnLocation`、`GameObjectUnit.getUnitNameResId`；网页 `campaign-map-unit-placements.ts`、`mississippi-map-scene.ts` | activity、单位、装饰、生成点和列车组件的分类；JADX 仅辅助定位，条件逻辑以 Smali 分支复核。 |
| `POOL31` | `SpawnPoolManager.addActionForSpawnPool/performActionsForWave/update`；网页 Oregon 关卡单位池定义 | Wave 1 的库存与上限动作、pool type 与生成点类型。APK timer 未确认。 |
| `WAVES28` | `GameDesignWaves.setWaves` 的 level 28 分支；`waves.json` levelId 28 | 9 个 header、19 个 `addToWave` 请求、两条池动作及 APK 源调用顺序。 |
| `LEVEL28` | `GameDesignData.<clinit>` 数组 index 27；`level-config.json` index 27 | 12 个原始关卡参数；字段含义结合既有读取点，不由字段名单独推断。 |
| `STRINGS28` | APK `T_LEVEL_NAME_31`、`T_LEVEL_INFO_31`、`T_CAMPAIGN_28_01..09` | 原版英文关卡名、简介与逐波对白；中文属于网页本地化。 |

## 地图、地形与路线

TDM 使用 `[width:u8,height:u8,y-major cell bytes]` 编码；坐标均为 `(x,y)`。tile 频次如下，合计 768 格：

```text
0:399, 16:81, 32:93, 36:50, 40:1, 41:1, 42:1, 43:1,
48:2, 52:6, 53:10, 54:13, 55:1, 56:1, 59:1, 60:3,
70:4, 72:1, 79:9, 80:5, 81:1, 82:4, 83:2, 84:2,
86:1, 87:1, 88:14, 96:13, 98:3, 99:6, 100:1, 101:2,
112:2, 113:1, 114:1, 115:12, 116:5, 117:1, 118:5, 119:4,
130:1, 131:1, 132:1, 150:1
```

TDM 路线 marker 与 Oregon 地形/道路输入属于不同数据层。实际关卡必须以原始格网调用 Oregon 地形构建器；不能把路线点直接画成道路，也不能把绘制结果反推为碰撞格。tile 80–88 由共享 Oregon 地形/铁路消费者解释，tile 83/84 还参与列车组件分组；道路、背景、碰撞应分别验证。

入口 action id 为入口 tile code−40；路线方向点 action id 为 tile code−52。下表中的 `R0`、`R1`、`R2`、`R3`、`R4`、`R7`、`R8` 分别对应 tile 52、53、54、55、56、59、60。所有边均是相邻方向点/出口之间沿轴向射线连接的静态距离：

| 入口 marker | 坐标 | 朝向 | 首个控制点 | 可达控制点 / 出口 |
| --- | --- | --- | --- | --- |
| 43 / action 3 | `(18,0)` | 南 | `(18,7)` | 19 / 2 |
| 42 / action 2 | `(31,8)` | 西 | `(23,8)` | 25 / 2 |
| 41 / action 1 | `(31,19)` | 西 | `(25,19)` | 19 / 2 |
| 40 / action 0 | `(25,23)` | 北 | `(25,20)` | 9 / 1 |

两个出口位于 `(0,11)` 和 `(0,21)`。下表列出全部 44 条边，方向按单位格向量解释；`S` 表示入口，`R` 表示方向点，`X` 表示出口。距离是静态格数，不代表移动耗时。

```text
S3@(18,0) S→R7@(18,7) [7]
R1@(13,7) S→R2@(13,15) [8]
R7@(18,7) W→R1@(13,7) [5]; E→R1@(20,7) [2]
R1@(20,7) S→R3@(20,10) [3]
R1@(23,8) S→R8@(23,10) [2]
S2@(31,8) W→R1@(23,8) [8]
R3@(20,10) E→R1@(21,10) [1]
R1@(21,10) S→R2@(21,16) [6]
R1@(22,10) S→R1@(22,12) [2]
R8@(23,10) W→R1@(22,10) [1]; S→R2@(23,12) [2]
R2@(2,11) W→X@(0,11) [2]
R1@(22,12) S→R8@(22,16) [4]
R2@(23,12) W→R1@(22,12) [1]
R0@(2,13) N→R2@(2,11) [2]
R2@(4,13) W→R0@(2,13) [2]
R0@(4,15) N→R2@(4,13) [2]
R2@(13,15) W→R0@(4,15) [9]
R1@(6,16) S→R2@(6,21) [5]
R2@(12,16) W→R1@(6,16) [6]
R4@(13,16) N→R2@(13,15) [1]; W→R2@(12,16) [1]
R1@(20,16) S→R1@(20,17) [1]
R2@(21,16) W→R1@(20,16) [1]
R8@(22,16) W→R2@(21,16) [1]; S→R2@(22,17) [1]
R1@(20,17) S→R2@(20,20) [3]
R8@(21,17) W→R1@(20,17) [1]; S→R1@(21,18) [1]
R2@(22,17) W→R8@(21,17) [1]
R2@(25,17) W→R2@(22,17) [3]
R1@(21,18) S→R2@(21,21) [3]
R2@(24,18) W→R1@(21,18) [3]
R0@(25,19) N→R2@(25,17) [2]
S1@(31,19) W→R0@(25,19) [6]
R0@(13,20) N→R4@(13,16) [4]
R2@(20,20) W→R0@(13,20) [7]
R0@(24,20) N→R2@(24,18) [2]
R2@(25,20) W→R0@(24,20) [1]
R2@(6,21) W→X@(0,21) [6]
R0@(12,21) N→R2@(12,16) [5]
R2@(21,21) W→R0@(12,21) [9]
S0@(25,23) N→R2@(25,20) [3]
```

静态图含 41 个节点（4 个入口、35 个方向点、2 个出口）和 44 条边。四个入口的可达方向点并集为 35/35，出口并集为 2/2；没有越界、孤立点或不可达出口。方向点 marker 与路线的细节也可由 `ROUTE31` 重算。

## 单位、建筑、地图对象

### 地图单位与列车

96–101 映射 unit type = tile−95、activity 4（地图上的可雇佣单位）；130/131 分别映射 Pyromaniac/Salesman（type 35/36，activity 4）。地图上的最终单位集合受存档解锁状态影响。坐标来自原始 TDM，不是屏幕像素：

| Tile / 单位 | 数量 | 坐标 |
| --- | ---: | --- |
| 96 / Gunslinger | 13 | `(0,2)、(3,3)、(10,4)、(15,4)、(23,4)、(24,6)、(10,7)、(30,11)、(2,15)、(26,20)、(30,21)、(13,22)、(20,22)` |
| 98 / Cannon | 3 | `(12,3)、(18,17)、(8,21)` |
| 99 / Indian | 6 | `(20,5)、(2,8)、(25,12)、(28,13)、(27,17)、(10,22)` |
| 100 / Sniper | 1 | `(0,6)` |
| 101 / Grandpa | 2 | `(7,11)、(15,14)` |
| 130 / Pyromaniac | 1 | `(1,23)` |
| 131 / Salesman | 1 | `(29,23)` |
| 132 / Gambler | 1 | `(2,1)`，activity 5；Casino 解锁条件成立时参与配对 |

地图没有 104–109 的活动玩家单位 marker。tile 83/84 组成唯一横向列车，不是敌人或四个独立的新局单位：

| 组件 | 坐标 | 原始类型/activity |
| --- | --- | --- |
| 两节机车 | `(1,18)`、`(2,18)` | type 10/11，activity 5 |
| 两节车厢 | `(3,18)`、`(4,18)` | type 12，activity 4 |

### 建筑、赌场与装饰

| Tile / 对象 | 数量/坐标 | 网页接入依据 |
| --- | --- | --- |
| 112 / Saloon | `(25,3)`、`(9,9)` | spawn type 1；池类型 1 Gunslinger、2 Mexican 可由 Saloon 出生。 |
| 113 / Fort | `(16,10)` | spawn type 2；池类型 3 Cannon 使用独立模板，不需在地图额外伪造 Cannon。 |
| 114 / Tipi | `(27,12)` | spawn type 3；池类型 4 Indian 可由 Tipi 出生。 |
| 150 / Casino | `(3,1)` | Oregon 的建筑贴图；仅当 Gambler 已解锁且 marker 132 有效时显示。 |
| 70 / rocks B | 4 个 | 共享场景装饰映射。 |
| 72 / stake | `(27,15)` | 既有 Oregon 03–05 映射为 `b_1x1_stake`，带 APK 对齐碰撞框；当前 Oregon 07 场景没有此 tile 的映射，M29 必须补上。 |
| 79 / tree green A | 9 个 | Oregon 场景树木映射。 |
| 115 / tree green B | 12 个 | Oregon 场景树木映射。 |
| 116 / shack | `(21,3)`、`(29,5)`、`(10,6)`、`(5,10)`、`(17,14)` | 共享建筑装饰和碰撞映射；与三个招募 spawn type 建筑分开。 |
| 117 / small Tipi | 1 个 | 静态装饰，不是 Tipi spawn point。 |
| 118 / tree stump | 5 个 | Oregon 场景装饰映射。 |
| 119 / tree green C | 4 个 | Oregon 场景装饰映射。 |
| 86/87 / horizontal rail buffers | 各 1 个 | 共用铁路缓冲块和碰撞框规则。 |

tile 80–82、88 进入地形/铁路图层；tile 83/84 还作为列车组成 marker。不能仅按贴图名称将这些 raw code 都当作对象装饰。静态地形与道路层以 `TERRAIN31` 的网格为对照，地图对象锚点和碰撞以网页消费者及相应单测确认。

### 玩家单位池与 Gambler

本关有实际 Saloon、Fort、Tipi marker，沿用 Oregon 已有池类型映射：pool 1/2 对应 Gunslinger/Mexican 与 Saloon，pool 3 对应 Fort Cannon，pool 4 对应 Tipi Indian。池动作发生于第 1 波：先清空四池库存，再把各自上限设为 3。`CampaignUnitPoolDefinition.units[].template` 已支持没有睡眠单位 marker 的 pool-only Cannon，M29 复用此字段，不扩展公共契约。

Gambler/Casino 同样沿用项目已验证的 marker 对应和 profile 解锁门控。`gamblerTime` 原始值为 299,000 ms；在网页 builder 中按既有关卡的冷却消费者接入。赌徒奖品种类由存档解锁状态决定。APK 的单位池 interval/timer 最终赋值尚未确证，不将网页的共享池间隔描述为 APK 原值。

## 参数、波次与对白

`LEVEL28` 的原始 12 个字段为：`[600,25,999,25000,3,30000,5,15,86,115,175,299000]`。字段映射结合已验证关卡消费者：

| 参数 | 值 | 实现边界 |
| --- | ---: | --- |
| 初始现金 / 生命 | 600 / 25 | 正式、自由、回放共用同一个关卡 builder。 |
| 补给箱数量 / 间隔 | 999 / 25,000 ms | 沿用共享补给箱规则。 |
| 最大升级数 | 3 | 沿用共享升级规则。 |
| `awesomeMessageMin` / `awesomeMessageUnit` | 30,000 / 5 | 本关专属消费语义未证实；只走已有共享消费者，不增加猜测规则。 |
| 场上补给箱上限 | 15 | 沿用共享配置字段。 |
| Easy / Medium / Hard HP | 86% / 115% / 175% | 使用本关原值。 |
| Gambler timer | 299,000 ms | 配合本地图的 Gambler/Casino；语义按既有 Gambler consumer 使用。 |

九个 `newWave` header 与 19 个 `addToWave` 请求在 DEX 调用序列中按波次交错；请求必须归入紧邻其前的当前 wave，不能先收集所有 header 再按行号猜波次。每条请求写作 `入口 action / 间隔 ms / 8 个常规敌人槽 / Boss 槽`，未写 Boss 槽时为 0。入口 action 是 TDM spawn action ID（0–3），不是 route marker 的方向 action。

| 波 | header：对白键 / 头像 / 延迟 / HP% / 速度% | 按 APK 调用顺序的请求（action / ms / `[槽1..8]` / Boss） |
| ---: | --- | --- |
| 1 | `T_CAMPAIGN_28_01` / gunslinger / 15,000 / 120 / 120 | `1 / 2,000 / [4,3,2,3,2,2,0,0] / 0` |
| 2 | `T_CAMPAIGN_28_02` / geezer / 15,000 / 130 / 125 | `0 / 2,500 / [2,2,2,3,2,2,0,0] / 0`<br>`1 / 2,500 / [3,2,2,3,2,2,1,0] / 0` |
| 3 | `T_CAMPAIGN_28_03` / indian / 25,000 / 135 / 130 | `0 / 2,500 / [1,2,2,3,2,2,0,1] / 0`<br>`1 / 2,500 / [1,2,0,3,2,2,1,0] / 0`<br>`2 / 2,500 / [2,1,2,1,2,2,2,0] / 0` |
| 4 | `T_CAMPAIGN_28_04` / gunslinger / 25,000 / 140 / 135 | `3 / 2,500 / [3,2,3,3,3,3,1,0] / 0` |
| 5 | `T_CAMPAIGN_28_05` / settlers / 25,000 / 150 / 140 | `2 / 2,500 / [2,2,2,2,2,2,2,0] / 0` |
| 6 | `T_CAMPAIGN_28_06` / gunslinger / 25,000 / 160 / 145 | `0 / 2,500 / [1,2,2,2,2,2,2,0] / 0`<br>`1 / 2,500 / [2,1,2,2,2,2,1,1] / 0` |
| 7 | `T_CAMPAIGN_28_07` / indian / 25,000 / 170 / 150 | `0 / 2,500 / [1,2,2,2,4,3,2,0] / 0`<br>`1 / 2,500 / [2,1,2,2,4,3,1,0] / 0`<br>`2 / 2,500 / [1,2,2,2,4,3,2,0] / 0`<br>`3 / 2,500 / [2,1,2,2,4,3,1,1] / 0` |
| 8 | `T_CAMPAIGN_28_08` / geezer / 15,000 / 190 / 155 | `0 / 2,500 / [1,2,2,2,4,3,2,1] / 0`<br>`1 / 2,500 / [2,1,2,2,4,3,1,1] / 0`<br>`2 / 2,500 / [1,2,2,2,4,3,2,0] / 0`<br>`3 / 2,500 / [2,1,2,2,4,3,1,1] / 0` |
| 9 | `T_CAMPAIGN_28_09` / boss / 15,000 / 200 / 160 | `2 / 2,500 / [0,0,0,0,0,0,0,0] / 1` |

Wave header 与请求在 APK 的 `newWave/addToWave` 调用序列中交错；上表已按当前 wave 归组，合计 19 条请求。实现时仍应以 `WAVES28` 的原始调用顺序作为单一比对基线。

Wave 1 玩家单位池动作是 `set pool 1..4 = [0,0,0,0]`，随后 `set-max pool 1..4 = [3,3,3,3]`。两条动作都在 wave 1 生效。`addToWave` 共有 19 项，最后一项只请求一个 Boss。

### 英文资源

APK 默认语言的关卡名为 **Colt City**，简介为 “Gambling and Colt gunplay are at the top of the agenda in Colt City.”。APK 没有 `T_LEVEL_NAME_WON_31`；胜利标题沿用网页通用结算文案，不构造本关专属原文。以下对白逐字来自 `T_CAMPAIGN_28_01..09`：

| 波 | APK 英文原文 |
| ---: | --- |
| 1 | Hopefully, enough settlers will come today! I have some gambling debts and I really need their gold! |
| 2 | As I always say, don't play with gold! |
| 3 | Smoke signals: White - Man - White - Woman - North-east - South-east |
| 4 | Hey, you there, settlers in the north, you don't wanna play poker, do you? |
| 5 | Did you hear that? Maybe there's a casino nearby, honey! |
| 6 | Yeah, sure, a casino! I'm the ace and you're the jack of clubs! The clubs means dead! |
| 7 | Smoke signals: All - Directions - Tourists |
| 8 | I don't know if I'm seeing double or if the settlers really are overrunning the place! |
| 9 | Are you scared? Those aren't shots, it's a thunderstorm! Go ahead, men! |

### 已有离线资源

应用内已存在 `menu/gng_levelmap_31.png`（91×84）、`music/music_oregon.ogg`，本关 header 所需的 `portrait_gunslinger.png`、`oregon_dakota_portrait_geezer.png`、`portrait_indian.png`、`portrait_settlers.png`、`oregon_dakota_portrait_boss.png`，以及 Oregon 树木、铁路、Saloon/Fort/Tipi/Casino 图像。M29-E 仍需核对这些资源是否经本关实际 builder 预载及对象消费者调用；仅文件存在不等于接线正确。静态资产列表未发现本关专属语音或专属音轨，不播放声音来验证。

## 实现核对清单

- map31 原始字节、32×24 网格与本报告 marker 数一致；不复制 APK 生成的研究数据库。
- 背景、道路、铁路、碰撞使用各自的 Oregon 消费者；对随机变体只核对变体集合，不宣称像素级运行结果。
- 路线按 44 条边和四个入口可达集合测试；不为了观感偏移原版 route node。
- Gambler/Casino、招募池、列车、活动单位均由真实 TDM marker 生成；Fort Cannon 只使用 pool template。
- 9 个 header、19 个请求和两条 Wave 1 pool action 都保留 APK 原始值与调用先后；Boss 位保持独立。
- 本关名、简介、头像、九段对白与预载路径都能对照 `STRINGS28`/`WAVES28`/资源文件。
- 静态资料不足之处留在实施测试中核对；只有静态代码和派生资料无法回答的具体行为，才考虑最小定点 Android 观察。
