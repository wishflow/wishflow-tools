# Dakota 第 7 关：Frost Station 静态审计

## 关卡身份与证据边界

Frost Station 是 Dakota 第 7 关、global level 37。APK 使用 `res/raw/td_map_40.tdm`，标题和简介资源为 `T_LEVEL_NAME_40`、`T_LEVEL_INFO_40`，波次对白为 `T_CAMPAIGN_37_01..08`。`GameDesignData` 的零基参数 index 为 36；`GameDesignData.<clinit>` 中 `array_948` 由父级数组写入 index `0x24`。`GameDesignWaves.setWaves()` 使用 one-based `i == 37` 分支。

证据取自用户提供的 Guns’n’Glory FREE 1.8.6 APK 原始 ZIP 条目、REA/JADX 静态结果、Smali 和按 TDM 派生的路线/地形数据。JADX 输出是反编译伪代码，不是原始 Java 源码。未启动 Android；本报告中的路线与地形结论属于静态核对，不代表原版运行画面的目视观察。

| 证据键 | 来源与入口 | 支持的结论及边界 |
| --- | --- | --- |
| `FROST-TDM` | APK ZIP 项 `res/raw/td_map_40.tdm`；网页 fixture `../../tests/fixtures/td_map_40.tdm` | 原始格网、marker 数量、坐标与线路。TDM 本身不含贴图绘制结果。 |
| `FROST-ROUTES` | `static-route-graph.json` 的 map index 40；从原始 TDM marker 按 APK 方向/扫描规则展开 | 48 条唯一有向边、7 条完整路径及路径格检查；属于静态派生，不是运行观察。 |
| `FROST-TERRAIN` | `BackgroundMap.createBackgroundMap()`、`createStreetLayerMap()`、`shapenBackgroundMap()`、Dakota 绘制入口；测试参考 `terrain-render-reference.ts` | 768 个背景格、131 条街道/铁路/桥命令和最终碰撞输入。网页绘制需逐项对照派生结果。 |
| `FROST-OBJECTS` | `GameObjectManager.createGameObjectsFromBasicMap()`、`GameObjectDecoration.<init>`、`createTrainFromMap()` | 静态装饰、睡眠/活动单位、特殊招募单位及四组列车；具体坐标从原始 TDM 读取。 |
| `FROST-INDEX` | `GameDesignData.<clinit>` 的 `array_948`、父级 `aput-object` 索引及字段读取点 | 参数 index 36 的12项数值；未确认的字段效果仍保持未知。 |
| `FROST-WAVES` | `GameDesignWaves.setWaves()` 的 `i == 37` 分支及 `WaveManager` 消费端 | 8个 wave header、18条敌人请求、没有玩家池动作；向量是剩余请求数量，不是确定的出敌顺序。 |
| `FROST-COPY` | APK strings `T_LEVEL_*_40`、`T_CAMPAIGN_37_*` 及波次 drawable 参数 | 原版英文标题、简介、对白和头像资源；中文文本为网页翻译。 |

以下编号不可互换：global level 37、TDM 文件编号40、参数数组 index 36、标题/简介资源编号40、波次对白编号37。

## 原始地图与路线

TDM 共770字节：前两字节表示 `32×24`，其余768个 byte 是按 y、再按 x 排列的原始 tile。完整源文件保存在 `tests/fixtures/td_map_40.tdm`；摘要频次如下，合计768格。

| Raw code | 数量 | 含义或边界 |
| ---: | ---: | --- |
| 0 / 16 / 32 / 36 | 304 / 23 / 151 / 66 | 背景、道路/街道输入及悬崖墙输入；raw 值不能直接替代最终塑形后的碰撞分类。 |
| 40–43 | 各1 | 四个敌方出生 marker：`40@(3,0)`、`41@(4,0)`、`42@(27,0)`、`43@(0,9)`；action ID 分别为0–3。 |
| 48 | 2 | 出口 `(27,23)`、`(28,23)`。 |
| 52–55、60–61 | 4 / 15 / 5 / 16 / 1 / 1 | 路线方向 marker；方向语义以 APK action 表和出边为准。 |
| 69 / 70 / 75 | 6 / 7 / 4 | Rocks A、Rocks B、水塔装饰。 |
| 80 / 81 / 82 / 83 / 84 / 86 / 87 / 88 | 5 / 2 / 53 / 8 / 12 / 4 / 4 / 18 | 横桥、铁路覆盖、铁轨、机车、车厢、左右端缓冲和竖桥。 |
| 96–101 | 15 / 11 / 7 / 6 / 1 / 7 | 六类标准睡眠招募单位。按全局单位解锁状态创建；地图 marker 存在不等于当前档案已解锁。 |
| 124 | 4 | 水域背景输入；不是蒸汽船 marker。 |
| 130 / 131 | 各1 | 特殊睡眠招募单位：Pyromaniac `(0,19)`、Salesman `(28,1)`。 |

本图没有 `102/110` 炸药配对、`104/105` 活动地图单位、`112–114` 招募建筑、`120–123` 蒸汽船组件或 Casino/Gambler marker；不得从相邻地图复制这些实体。`GameDesignData` 中的非零 Gambler timer 也不能证明本地图存在 Gambler。

路线图包含4个出生点、42个转向点、2个出口、48条唯一有向边，所有转向点和出口均可达。共有7条完整出生到出口路径；逐边展开的396次中间格访问分布为 raw32 353次、raw80 12次、raw81 3次、raw88 28次，没有其他地形码。raw81 是铁路覆盖输入，其中 `(16,13)` 被一条路线穿过；它在地形派生中会产生铁路街道绘制层，不能据此把路线改直或把轨道当成墙。

7条路径的控制点序列（坐标为 `(x,y)`）：

1. `(3,0) → (3,5) → (13,5) → (23,5) → (23,6) → (27,6) → (27,10) → (13,10) → (7,10) → (7,11) → (3,11) → (3,18) → (5,18) → (5,19) → (15,19) → (15,18) → (17,18) → (17,17) → (25,17) → (25,19) → (27,19) → (27,23)`
2. `(3,0) → (3,5) → (13,5) → (13,10) → (7,10) → (7,11) → (3,11) → (3,18) → (5,18) → (5,19) → (15,19) → (15,18) → (17,18) → (17,17) → (25,17) → (25,19) → (27,19) → (27,23)`
3. `(4,0) → (4,4) → (18,4) → (24,4) → (24,5) → (27,5) → (28,5) → (28,11) → (16,11) → (8,11) → (8,12) → (4,12) → (4,17) → (6,17) → (6,18) → (14,18) → (14,17) → (16,17) → (16,16) → (26,16) → (26,18) → (28,18) → (28,23)`
4. `(4,0) → (4,4) → (18,4) → (24,4) → (24,5) → (27,5) → (28,5) → (28,11) → (16,11) → (16,16) → (26,16) → (26,18) → (28,18) → (28,23)`
5. `(27,0) → (27,5) → (28,5) → (28,11) → (16,11) → (8,11) → (8,12) → (4,12) → (4,17) → (6,17) → (6,18) → (14,18) → (14,17) → (16,17) → (16,16) → (26,16) → (26,18) → (28,18) → (28,23)`
6. `(27,0) → (27,5) → (28,5) → (28,11) → (16,11) → (16,16) → (26,16) → (26,18) → (28,18) → (28,23)`
7. `(0,9) → (3,9) → (3,11) → (3,18) → (5,18) → (5,19) → (15,19) → (15,18) → (17,18) → (17,17) → (25,17) → (25,19) → (27,19) → (27,23)`

出发 action ID 与网页行优先 spawnPointId 均为0–3的一一映射。敌人实际出生位置在地图边缘之外；路线坐标应与原始 TDM 控制点、道路图层及最终运行时转向表一并测试。

## 地形绘制、碰撞与铁路列车

从原始 TDM 按已核实 Dakota 转换规则派生出768条背景命令和131条街道/桥/铁路命令：

| 绘制资源 | 命令数 |
| --- | ---: |
| `tiles_railway_hori` | 75 |
| `tiles_bridge_hori` | 5 |
| `tiles_bridge_pier_left` / `tiles_bridge_pier_right` | 各5 |
| `tiles_bridge_verti` | 18 |
| `tiles_path` / `tiles_path_var` | 16 / 7 |

由背景绘制命令还原的768格碰撞码，与测试参考按同一 APK 地形转换顺序计算的最终格网一致。这证明当前派生转换在本图的数据完整性，不证明 Android 某次时间随机种子的精确贴图选择。raw36 是悬崖输入，必须区分 `createBackgroundMap()` 初值、后续塑形结果、街道覆盖和碰撞查询；不可直接把初始背景值写成最终碰撞结论。

铁路列车有4组，每组两段机车和三节车厢，共8个 raw83、12个 raw84：

| TDM 行 | 两段机车 | 三节车厢 | 轨道端缓冲 |
| ---: | --- | --- | --- |
| 1 | x10–11 | x12–14 | x6、x26 |
| 7 | x6–7 | x8–10 | x5、x21 |
| 13 | x18–19 | x20–22 | x10、x29 |
| 21 | x6–7 | x8–10 | x1、x25 |

其余 raw82 是轨道绘制输入，不应额外生成静态火车贴图；运行时列车部件按 APK 的单格间距组成可移动组。地图对象碰撞使用 TDM 对象构造语义，不以图像外框代替碰撞盒。

## 静态对象与单位

| Raw code | APK 对象 | 数量与坐标 | 接入要求 |
| ---: | --- | --- | --- |
| 69 | Rocks A (`e_1x1_rocks_a`) | 6：`(0,0) (31,0) (26,7) (17,19) (30,22) (22,23)` | 使用原始 TDM 对象框。 |
| 70 | Rocks B (`e_1x1_rocks_b`) | 7：`(19,0) (1,2) (31,5) (0,17) (19,19) (31,19) (4,23)` | 使用原始 TDM 对象框。 |
| 75 | Water Tower (`b_1x1_watertower`) | 4：`(9,0) (16,6) (14,14) (14,22)` | `GameObjectManager` 将 raw75 转成装饰 ID8；`GameObjectDecoration` ID8 映射水塔贴图。 |
| 96–101 | 六种常规睡眠招募单位 | 47个；逐码位置见原始 TDM fixture | 根据当前全局单位解锁位创建；睡眠状态仍参与地图单位碰撞。 |
| 130 / 131 | Pyromaniac / Salesman | 各1：`(0,19)` / `(28,1)` | 作为 activity 4 招募单位，分别按对应解锁里程碑创建，ID 唯一。 |
| 83 / 84 | 4组列车部件 | 各8个 / 12个；位置见铁路表 | 两个机车与三节车厢组成各自水平移动组；不伪造地图外初始单位。 |

测试须同时覆盖原始 marker、共享单位工厂的类型/状态/解锁结果和最终 `ScenarioContent`；仅检查 marker 解码或资源存在性不算场景对象已接通。

## 参数、波次与文案

`GameDesignData` index36 的原始12项为 `[350,25,999,25000,3,30000,5,15,56,75,110,118000]`。字段读取点支持以下映射；第5、6项的不明附加效果不做推断。

| Index | 值 | 已确认用途 |
| ---: | ---: | --- |
| 0–1 | 350 / 25 | 开局现金 / 生命 |
| 2–4 | 999 / 25000 ms / 3 | 奖励箱总上限 / 时间间隔 / 升级上限 |
| 5–6 | 30000 ms / 5 | 保留原始 `AWESOME_MESSAGE_MIN`、`AWESOME_MESSAGE_UNIT` 字段；额外效果未知。 |
| 7 | 15 | 同屏奖励箱上限字段 |
| 8–10 | 56 / 75 / 110 | Easy / Medium / Hard 敌方波次 HP 百分比 |
| 11 | 118000 ms | `GAMBLER_TIME`；本图没有 Gambler/Casino，不创建相关对象。 |

`GameDesignWaves.setWaves(i == 37)` 含8个 `newWave`、18条 `addToWave`、没有 `addActionForSpawnPool`。每条 `addToWave` 有8个普通敌人请求槽，Boss 与 Doc 单独保留为后两槽；除 Wave 8 的 Boss 请求外，特殊槽均为0。

| Wave | Portrait；延迟 / HP% / 速度% | action @ 间隔 ms → 8个普通槽；Boss |
| ---: | --- | --- |
| 1 | Engineer；15000 / 130 / 120 | `0 @ 2000` → `[2,3,3,5,2,4,0,0]` |
| 2 | Gunslinger；15000 / 150 / 125 | `0 @ 2000` → `[1,3,4,5,2,3,2,0]` |
| 3 | Pedro；15000 / 150 / 130 | `0,1 @ 2500` → 每条 `[0,2,4,5,4,3,1,0]` |
| 4 | Dakota Geezer；15000 / 185 / 135 | `0,1 @ 2000` → 每条 `[0,2,4,7,1,0,0,0]` |
| 5 | Mexican；25000 / 185 / 135 | `0,1 @ 2500` → 每条 `[0,2,3,3,2,4,3,0]`；`2 @ 3000` → `[0,2,3,2,1,3,2,0]` |
| 6 | Dakota Geezer；25000 / 205 / 145 | `0 @ 2500` → `[0,1,3,3,2,4,3,1]`；`1 @ 2500` → `[0,1,2,3,2,4,3,1]`；`2 @ 2500` → `[0,2,3,2,1,3,2,0]`；`3 @ 3000` → `[1,1,3,2,1,3,1,0]` |
| 7 | Pedro；15000 / 225 / 150 | `0 @ 2500` → `[0,0,3,3,2,4,3,1]`；`1 @ 2500` → `[0,0,2,3,2,4,3,1]`；`2 @ 2500` → `[0,2,3,2,3,5,3,1]`；`3 @ 3000` → `[0,1,3,2,3,6,3,1]` |
| 8 | Dakota Boss；25000 / 230 / 160 | `1 @ 500` → 普通槽全0，Boss=1，Doc=0 |

Wave 请求是剩余数量，不能解释为每个敌人的固定生成顺序。action 0–3 均能映射到本图4个 TDM 出生 marker；不得把 action ID、TDM 行序和最终 `spawnPointId` 混为同一个编号。

| APK 资源 | 原始英文 |
| --- | --- |
| `T_LEVEL_NAME_40` | Frost Station |
| `T_LEVEL_INFO_40` | Frost Station is a famous gathering point for travelers and connects all the railroads in the area. |
| `T_CAMPAIGN_37_01` | “I'm sorry for the delay, but the tracks are frozen!” |
| `T_CAMPAIGN_37_02` | “Damn, your railway isn't longer than fifty yards! How can there be a delay?” |
| `T_CAMPAIGN_37_03` | Fortunately, I never have to go by train! There would be a hundred new settlements by the time I got there! |
| `T_CAMPAIGN_37_04` | Speaking of settlements, here comes a whole bunch of new settlers! The very thing for my scattergun! |
| `T_CAMPAIGN_37_05` | I hate to mention it, but did you see that some settlers are coming from the north-east? |
| `T_CAMPAIGN_37_06` | North-east? I only see some in the west! |
| `T_CAMPAIGN_37_07` | Settlers from the west? Are they lost? I thought they wanted to go west… |
| `T_CAMPAIGN_37_08` | “Damn, those railroad tracks don't lead to the west! Looks like I'll have to walk…” |

头像顺序为 `portrait_engineer`、`portrait_gunslinger`、`portrait_pedro`、`oregon_dakota_portrait_geezer`、`portrait_mexican`、`oregon_dakota_portrait_geezer`、`portrait_pedro`、`oregon_dakota_portrait_boss`。Frost Station 使用 Dakota 共用音乐选择；本轮只核对资源与选择入口，不试听音频。

## 实现核对边界

- 逐项对照 raw TDM、绘制指令、最终背景碰撞、对象/单位坐标及7条静态路线；不能用生成器自己的输出同时充当生产数据和唯一测试期望。
- 实际 `GameSession` 至少验证所有出生 action 的映射、路线代表性转向、四组列车、地图单位碰撞及离线图片预载。
- 新关正式入口以前一关 Ice Rocks 完成作为解锁条件；Free Play 使用同一份 Frost Station 内容和规则，但不写战役进度。
- 声音保持关闭，窗口模式验收；不完整通关、不启动 Android、不进入全屏。资源/代码静态证据足以回答本关内容，不需要重复观察启动画面。
- APK 的时间随机种子会改变每次地图纹理选择；固定种子的完整绘制指令核对仅验证合法转换，不声称复现每次 Android 随机贴图。
