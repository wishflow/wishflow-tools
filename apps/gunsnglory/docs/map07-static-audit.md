# New Mexico 第 7 关：Lucky Lake 静态审计

## 结论

APK 中的关卡身份、32×24 原始格网、分层地形、三路敌人寻路、静态对象、玩家单位、十波请求、玩家招募池、关卡参数、对白、头像与语音、资源和战役顺序均已完成静态交叉核对。关卡内容本身没有待问用户或待运行 Android 才能回答的字段。

实现前有一项确定的网页能力缺口：Lucky Lake 的原图包含 7 节**垂直列车**，而网页当前的列车解析、绘制和成组移动只支持水平列车；APK 所需三张垂直列车精灵图也未进入网页资源。先补垂直列车支持，再接入 map07 内容。无需完整推进关卡或启动 Android。

REA/JADX 证据是 DEX 及资源的静态分析和反编译表示，不是原始 Java 源码。此审计没有执行 Android 运行观察、完整战役、声音播放或通关。

## 证据范围

| 名称 | 数据与消费入口 | 用途 |
| --- | --- | --- |
| `MAP07-TDM` | APK `res/raw/td_map_07.tdm`；`data/map-inventory.json`；`BasicMap.loadMap` | 原始格网、坐标、格值频数 |
| `MAP07-LAYERS` | `data/terrain-render-rules.json`、`terrain-render-index.json`；`BackgroundMap`；`NewMexico` | 水、沙漠、峡谷、道路、桥梁、铁路的派生图层 |
| `MAP07-ROUTES` | `data/static-route-graph.json`；`EnemyDirector.createEnemyDirectorFieldsFromBasicMap`、`moveEnemys`、`WaveManager.updateWave` | 出生池顺序、转向动作、路线和波次池关联 |
| `MAP07-OBJECTS` | `GameObjectManager.createGameObjectsFromBasicMap`、`GameObjectDecoration`、`GameObjectSpawnLocation` | 装饰、建筑、地图单位、招募点 |
| `MAP07-TRAIN` | `GameObjectManager.createTrainFromMap`、APK `TrainVertical`/`TrainHorizontal`；网页列车构造器和 `GameSession` | 7 节垂直列车的资源、状态、锚点、碰撞和移动 |
| `MAP07-LEVEL` | `data/level-config.json`；`GameDesignData.gameDesignData` | 经济、生命、宝箱、升级与难度参数 |
| `MAP07-WAVES` | `data/waves.json`；`GameDesignWaves.setWaves(i == 7)`、`WaveManager`、`SpawnPoolManager` | 十波、敌人请求、玩家池动作 |
| `MAP07-TEXT-VOICE` | `data/string-resources.json`；`InGameGeneralMessageDialog.setUpDialog` | 英文原文、头像及声音资源选择 |
| `MAP07-ASSETS` | `data/resource-inventory.json`；APK `res/drawable-*`；网页 `public/assets/` | 资源存在性与缺口 |
| `MAP07-FLOW` | `MapSelectionActivity`、`GameObjectUnit.isUnlocked`、`UserProfile.isLevelFinished`；网页战役目录 | 解锁、正式结算与 Free Play 边界 |

研究数据和 DEX/REA 文件可从本地研究分支 `codex/gunsnglory-spec` 的 `apps/gunsnglory/docs/research/` 按上述语义路径读取。APK 是 `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk`，包名 `com.hg.gunsandgloryfree`，版本 1.8.6 / versionCode 34。

结论标记：**APK 数据**指资源、表值或字符串；**代码推导**指消费路径算法；**网页现状**指当前分支实现；**未知/边界**明确指出静态证据不能覆盖的行为。

## 关卡身份与当前网页状态

- **APK 数据：**`td_map_07.tdm` 对应 New Mexico 第 7 关 `Lucky Lake`；简介为 `A picture postcard lake where settlers flock in droves.`，胜利标题为 `The Lucky Lake Monster`。
- **地图数量边界：**APK 有 63 个 TDM 文件，战役仍为 60 关；不能按地图资源数新增可玩关。Lucky Lake 是战役第 7 关，不是“第 63 张地图”。
- **网页现状：**[关卡目录](../src/content/campaign-catalog.ts)已有 level 7 名称与目录槽位；[正式战役登记](../src/content/official-campaign.ts)当前只组装到 level 6，Lucky Lake 尚无可用正式内容、Free Play 场景或正式结算入口。[预览图](../public/assets/menu/gng_levelmap_07.png)已存在。
- **进度关系：**正式战役按 New Mexico level 6 → level 7 顺序开放。正式胜利写入 level 7 的完成状态；Free Play 继续沿用既有规则，不写正式关卡完成、高分或困难解锁。

## 原始地图与地形图层

### 尺寸及全部格值频数

**APK 数据：**TDM 共 770 字节：宽 32、高 24，后续 768 个字节为格值；以 `(0,0)` 为左上角、x 向右、y 向下。完整格网保存在研究分支 `data/map-inventory.json`，以下列出全部非零格值及数量，频数合计为 768：

```text
0×297, 16×81, 32×120, 36×62, 40×1, 41×1, 42×1, 48×2,
52×6, 53×9, 54×16, 55×1, 58×2, 68×3, 69×5, 70×3,
71×2, 73×3, 74×1, 75×1, 76×7, 80×3, 88×13, 89×6,
90×8, 91×2, 92×5, 94×1, 95×1, 96×13, 97×7, 98×7,
99×7, 100×1, 101×3, 112×1, 113×1, 114×1, 116×2, 117×2,
124×46, 125×10, 126×2, 130×1, 131×1
```

### 背景和路径层

背景格值不是原始 TDM 贴图编号：`BackgroundMap.createBackgroundMap` 先转换水域、峡谷/道路底图，再按相邻格派生边缘；New Mexico renderer 选择水边、沙漠、峡谷、峡谷地板和阴影图集。`createStreetLayerMap` 另外生成道路、桥面和铁路层。变体步骤会从合法邻接候选中取图，因此单次运行的随机变体不能作为唯一截图基线。

变体前各层派生频数如下，均各有 768 格；这是完整图层索引校验值，非贴图像素数：

```text
背景：0×277, 1×4, 2×4, 3×53, 4×4, 5×32, 7×8, 8×5, 10×35,
11×7, 12×55, 13×7, 14×7, 48×55, 56×53, 57×35, 58×5, 59×4,
60×8, 61×7, 62×7, 96×58, 97×3, 98×3, 99×6, 100×3, 101×3,
103×2, 104×2, 106×4, 107×2, 108×7, 109×2, 110×1
道路：0×647, 17×4, 18×6, 19×25, 20×3, 21×6, 22×6, 24×4,
25×5, 26×4, 27×2, 28×16, 29×2, 30×1, 64×3, 76×13, 80×6, 84×15
```

重要原始格值及绘制含义：

| 原始格值 | 代码派生 / 资源 | Lucky Lake 数量或位置 |
| --- | --- | --- |
| `16` | 普通小路；邻接形状由 path atlas 决定 | 81 格 |
| `32`,`36` | 峡谷可通行底面 / 峡谷壁相关层 | 120 / 62 格 |
| `80` | 水平桥面 | 3：`(26,6)`、`(2,7)`、`(23,15)`；每处生成左右桥墩 |
| `88` | 垂直桥路，进入 street layer 76 | 13 格，形状由邻接转换决定 |
| `89` | 铁轨段，进入 street layer 80；绘制为垂直铁路 | 6 格，位于 x=7 纵向铁路线上 |
| `90–93` | 垂直铁路 street layer 84 | 铁路与列车同在 x=7 纵列 |
| `94`,`95` | 垂直铁路上下端缓冲器 | `(7,0)`、`(7,22)` |
| `124–126` | 水面背景起始值 96；`126` 还创建水边岩石对象 | 水格共 58；水边岩石 2 处 |

`BackgroundMap` 对 120–126 生成水底图，对 32、40–46、48、52–66、80/81、110 生成峡谷底图，88/89 按上方原始格关系生成背景值；道路层把 16/112–114/150 转为普通路、80/81 转为水平桥、88 转为纵向桥、89 转为垂直铁轨，90–93 也进入垂直铁路层。网页应复用这些映射，不把原始格值直接当作 atlas 索引。

## 出生点、方向场与路线

### 两种出生编号不可混用

`EnemyDirector.createEnemyDirectorFieldsFromBasicMap` 按 **y 外层、x 内层** 扫描，生成点格码减 40 得到 marker `actionID`。之后按扫描顺序复制到 `mSpawnFields`；`WaveManager.updateWave` 按这个数组下标读取波次池并调用 `addEnemyAtSpawnPoint(index, …)`。所以波次池 0/1/2 **按扫描顺序**对应 code 42/41/40；marker actionID 则是 2/1/0：

| 波次池下标 | TDM 码 / marker actionID | 入口 | 初始方向 | 可达出口 |
| ---: | --- | --- | --- | --- |
| 0 | 42 / 2 | `(31,4)` | 西 | `(0,14)` |
| 1 | 41 / 1 | `(31,13)` | 西 | `(0,14)`、`(2,23)` |
| 2 | 40 / 0 | `(31,14)` | 西 | `(2,23)` |

**防错约束：**不能把波次池下标当作 `code - 40`。第一波池 0 是顶部 code 42，不是 code 40。以上映射由 y/x 扫描、字段复制顺序及波次运行循环交叉确认。

### 转向码与完整路线走向

code 52–55 分别表示北、南、西、东的确定转向；code 58 是 action ID 6，APK `directionMapping[6]` 为北/南二选一。`EnemyDirector.moveEnemys` 在该类节点从候选方向中随机选一条。地图有 34 个 redirector、2 个出口；静态图中 34 个 redirector 和 2 个出口均可达，未发现额外例外边。

下表省略直线段的中间格；相邻控制点间按直线逐格前进，坐标包含出生/出口格。它们是 APK 方向场路线，不是 A* 结果：

| 波次池 | 路线长度 | 控制点序列 |
| ---: | ---: | --- |
| 0，顶部入口 | 62 | `(31,4) → (26,4) → (26,8) → (22,8) → (22,4) → (16,4) → (16,1) → (10,1) → (10,4) → (6,4) → (6,5) → (2,5) → (2,10) → (5,10) → (5,14) → (0,14)` |
| 1，北支 | 61 | `(31,13) → (23,13) → (23,9) → (21,9) → (21,5) → (15,5) → (15,2) → (11,2) → (11,5) → (6,5) → (2,5) → (2,10) → (5,10) → (5,14) → (0,14)` |
| 1，南支后北行 | 45 | `(31,13) → (23,13) → (23,20) → (15,20) → (15,18) → (5,18) → (5,14) → (0,14)` |
| 1，南支后南行 | 44 | `(31,13) → (23,13) → (23,20) → (15,20) → (15,18) → (5,18) → (5,19) → (2,19) → (2,23)` |
| 2，底部入口 | 43 | `(31,14) → (27,14) → (27,18) → (24,18) → (24,21) → (14,21) → (14,19) → (2,19) → (2,23)` |

池 1 的 code 58 节点 `(23,13)` 与 `(5,18)` 各自允许北/南方向；其路线分支是原图数据，不能为了视觉直线另改路线或让敌人穿过水域。

## 静态对象、招募点与初始单位

### 装饰、铁路与建筑

`GameObjectManager` 与 `GameObjectDecoration` 将这些格值转换为原版对象；数量共 33 个，不含 3 个招募建筑、40 个单位与 7 节列车：

| 原始码 | 对象 | 数量与坐标 |
| ---: | --- | --- |
| 68 | 仙人掌 A | 3：`(27,1)`、`(18,7)`、`(0,20)` |
| 69 | 岩石 A | 5：`(31,0)`、`(8,1)`、`(13,3)`、`(9,15)`、`(27,21)` |
| 70 | 岩石 B | 3：`(29,1)`、`(29,22)`、`(12,23)` |
| 71 | 树 | 2：`(13,5)`、`(30,17)` |
| 73 | 仙人掌 B | 3：`(17,1)`、`(5,22)`、`(31,23)` |
| 74 | 风车 | 1：`(4,7)` |
| 75 | 水塔 | 1：`(8,8)` |
| 76 | 灌木 | 7：`(8,0)`、`(22,0)`、`(6,6)`、`(31,15)`、`(3,22)`、`(19,23)`、`(26,23)` |
| 94 / 95 | 铁路上 / 下端缓冲器 | `(7,0)` / `(7,22)` |
| 116 | 2×1 小屋 | 2：`(30,20)`、`(11,21)` |
| 117 | 小型 Tipi | 2：`(0,1)`、`(5,1)` |
| 126 | 水边岩石 | 2：`(15,10)`、`(11,12)` |

### 招募建筑

| TDM 码 | APK 建筑类型 | 坐标 | APK 贴图 |
| ---: | --- | --- | --- |
| 112 | Saloon（类型 1） | `(30,6)` | `b_3x2_saloon` |
| 113 | Fort（类型 2） | `(19,15)` | `b_3x2_fort` |
| 114 | Tipi（类型 3） | `(3,1)` | `b_2x1_tipi` |

其贴图、门状态贴图与现有招募逻辑已存在于网页资源。绘制锚点由 `GameObjectSpawnLocation` 定义，不能仅把对象画在一个 1×1 格中。

### 休眠地图单位

原始码 96–101 解为类型 1–6、状态 4（地图上可雇佣）；130/131 解为类型 35/36、状态 4。总计 40 个，不含列车：

| TDM 码 | 单位 | 数量与坐标 |
| ---: | --- | --- |
| 96 | Gunslinger（1） | 13：`(23,2)`、`(28,2)`、`(6,7)`、`(16,7)`、`(1,9)`、`(8,10)`、`(20,12)`、`(15,15)`、`(25,16)`、`(29,17)`、`(0,18)`、`(26,20)`、`(17,22)` |
| 97 | Mexican（2） | 7：`(25,1)`、`(13,6)`、`(9,14)`、`(3,16)`、`(30,19)`、`(4,21)`、`(9,21)` |
| 98 | Cannon（3） | 7：`(23,4)`、`(8,7)`、`(22,13)`、`(22,17)`、`(17,18)`、`(6,21)`、`(23,23)` |
| 99 | Indian（4） | 7：`(5,3)`、`(1,5)`、`(10,7)`、`(18,9)`、`(1,12)`、`(28,19)`、`(14,23)` |
| 100 | Sniper（5） | 1：`(4,11)` |
| 101 | Grandpa（6） | 3：`(21,2)`、`(29,9)`、`(12,21)` |
| 130 | Pyromaniac（35） | 1：`(10,23)` |
| 131 | Salesman（36） | 1：`(18,1)` |

无 102–109 活动单位，也无 code 132 Gambler/Casino。地图上的特殊类型仍受 APK 全局里程碑过滤：基础类型 1–4 可用；Sniper、Grandpa、Pyromaniac、Salesman 依次按完成 40、30、50、60 关开放。map07 本身低于相关首个自动门槛，所以不得在新档案中提前放开。

## 7 节垂直列车：确认的能力缺口

- **APK 格子：**code 92（wagon）在 x=7、y=10–14 共 5 节；code 91（locomotive）在 x=7、y=15–16 共 2 节。code 90 铁路继续穿过车辆底下；94/95 是轨道端部缓冲器。
- **APK 消费顺序：**地图扫描遇到第一节 code 92 后，`GameObjectManager.createTrainFromMap` 沿 y 向下连续读取。先建立五个类型 22、状态 4 的货车，再建立类型 20、21、状态 5 的两段机车；逐格改回铁路底层码后仍保持轨道。
- **APK 贴图：**`TrainVertical.getImage()` 将类型 20 映射 `lok_verti_2of2`、类型 21 映射 `lok_verti_1of2`、类型 22 映射 `lok_wagon_verti`。APK MDPI 原图尺寸依次为 32×40、32×32、32×40；HDPI 为 48×60、48×48、48×60。不能把水平车厢旋转或用水平图集代替。
- **APK 行为：**`TrainVertical` 继承 `TrainHorizontal` 的列车规则；其移动仅改变 Y 方向，`drawingOffsetY=3840`，碰撞框相对 fine position 为 `{x:-2534,y:-3840,width:4608,height:7680}`。类型 22 有武器槽并可雇佣/升级；两段机车与车厢仍构成同一移动列车。它不要求新敌人规则或新战斗模型。
- **网页现状：**[列车格位解析](../src/content/campaign-map-unit-placements.ts)只识别横向 83/84；[列车构造器](../src/content/campaign-train-units.ts)把轴和碰撞框固定为水平；[GameSession](../src/game/index.ts)的移动轴类型只允许 `horizontal`，组移动遇到其他轴会清除目标；[资源目录](../src/render/game-asset-path.ts)缺少上述三张垂直列车图。垂直轨道和缓冲器贴图则已存在。
- **结论：**这是待实现的共享列车方向能力，不是关卡未知规则。实现切片应加入 APK 原图、纵向连续列车解析、纵轴成组拖动、正确锚点/碰撞框/攻击车厢行为，并保留 Billy Hills 与 Tech Town 横向列车回归。

## 关卡参数、波次、玩家池

### 第 7 行关卡参数

`GameDesignData.gameDesignData[6]`：

| 参数 | 值 | 解释 |
| --- | ---: | --- |
| 开始现金 | 400 | 关卡起始余额 |
| 初始生命 | 50 | 失败条件基础值 |
| 宝箱总数上限 | 999 | 关卡总投放限制 |
| 宝箱生成间隔 | 25,000 ms | 初始间隔 |
| 最大升级级数 | 3 | 关卡升级上限 |
| 特殊提示最小间隔 | 30,000 ms | 不等于敌人波次间隔 |
| 特殊提示单位参数 | 5 | APK 表字段，不是敌人数 |
| 同时在场宝箱上限 | 32 | 场景上限 |
| Easy / Medium / Hard HP 倍率 | 75% / 150% / 188% | 难度表倍率；与波次 HP 倍率分开应用 |
| Gambler 冷却 | 119,000 ms | 表中有值，但本图没有 gambler/casino 触发对象 |

### 十波开始参数

`GameDesignWaves.setWaves(i == 7)` 的 `newWave` 参数顺序为对白键、头像、开始延迟、HP 倍率、速度倍率。常量解析：`GameObjectShot.UNIT_BONUS_DURATION_FIRE=5,000 ms`，`PathInterpolatorCompat.MAX_NUM_POINTS=3,000 ms`，`ItemTouchHelper.Callback.DEFAULT_SWIPE_ANIMATION_DURATION=250`（在第 8 波用于 HP 数值 250，而非延迟）。

| 波 | 延迟 | 波次 HP / 速度倍率 | 对白头像 |
| ---: | ---: | --- | --- |
| 1 | 15,000 ms | 100% / 100% | Pedro |
| 2 | 5,000 ms | 125% / 100% | Pedro |
| 3 | 5,000 ms | 150% / 105% | Pedro |
| 4 | 10,000 ms | 200% / 105% | Settlers |
| 5 | 5,000 ms | 200% / 105% | Pedro |
| 6 | 5,000 ms | 215% / 105% | Settlers |
| 7 | 5,000 ms | 225% / 110% | Pedro |
| 8 | 5,000 ms | 250% / 110% | Settlers |
| 9 | 5,000 ms | 260% / 115% | Settlers |
| 10 | 5,000 ms | 280% / 120% | Deserter |

### 敌人请求池

`WaveManager.addToWave` 的前两项是扫描顺序的波次池编号和请求间隔；其后 8 项是敌人请求向量。八项依次对应 Settler×1、Settler×2、Settler×3、Settler×4、Horseman、Covered wagon、Post coach、Gold transport；十项重载补足的 Boss、Doc 两槽在此关均为 0。向量是 APK 请求槽，不应把前四个槽的值直接说成逐个敌人数。

| 波 | 池 0：入口 `(31,4)` | 池 1：入口 `(31,13)` | 池 2：入口 `(31,14)` |
| ---: | --- | --- | --- |
| 1 | 1,800 ms `[5,2,5,5,4,1,0,0]` | — | — |
| 2 | 2,000 ms `[2,3,2,5,4,1,0,0]` | 2,500 ms `[2,1,2,2,2,1,0,0]` | — |
| 3 | 2,000 ms `[5,2,3,5,3,1,0,0]` | 3,000 ms `[1,4,5,2,2,4,1,0]` | — |
| 4 | 2,000 ms `[2,2,3,1,4,3,0,0]` | 3,000 ms `[3,2,1,2,2,4,1,0]` | — |
| 5 | — | — | 2,500 ms `[1,2,3,4,4,3,3,0]` |
| 6 | 3,500 ms `[1,2,0,1,4,3,2,1]` | 3,000 ms `[1,0,1,2,2,4,1,0]` | 2,500 ms `[1,2,0,2,4,3,2,0]` |
| 7 | 3,500 ms `[0,2,2,1,4,3,2,0]` | 3,000 ms `[1,2,1,0,2,4,2,1]` | 2,500 ms `[1,2,0,1,4,3,3,0]` |
| 8 | 5,500 ms `[0,0,0,0,0,0,0,2]` | 5,000 ms `[0,0,0,0,0,0,0,2]` | 5,500 ms `[0,0,0,0,0,0,0,2]` |
| 9 | 3,500 ms `[0,1,0,0,4,3,3,1]` | 3,000 ms `[1,0,1,0,3,4,2,1]` | 2,500 ms `[1,1,0,1,4,3,2,2]` |
| 10 | 3,500 ms `[0,0,1,0,2,3,3,2]` | 3,000 ms `[0,0,1,0,2,4,2,1]` | 2,500 ms `[0,0,0,1,2,3,2,2]` |

### 玩家招募池动作

`SpawnPoolManager.addActionForSpawnPool(wave, action, …)` 与 `performActionsForWave` 交叉确认：波次 1 先执行 `SET`，四种库存值为 `[0,0,0,0]`；再执行 `SET_MAX`，四种上限为 `[3,3,4,5]`。四个 pool type 对应 Gunslinger/Mexican/Cannon/Indian，并分别使用地图上的 Saloon/Fort/Tipi 生成建筑规则。此处动作是在波次 1 应用，不是“每波给玩家增加 3/3/4/5 个单位”。

## 对白、肖像与声音

APK 英文原文及 wave resource key：

| 波 | 资源键 / 头像 | 英文对白 |
| ---: | --- | --- |
| 1 | `T_CAMPAIGN_07_01` / Pedro | We are at Lucky Lake. The settlers often stop off here to replenish their water supplies. |
| 2 | `T_CAMPAIGN_07_02` / Pedro | We have to keep a sharp lookout. They're trying to find their own routes through the valleys! |
| 3 | `T_CAMPAIGN_07_03` / Pedro | We have now unlocked level 3. For a few dollars more, our men will now be real crack shots! |
| 4 | `T_CAMPAIGN_07_04` / Settlers | Oh, I am so looking forward to our new home in the West! |
| 5 | `T_CAMPAIGN_07_05` / Pedro | Hey, Boss! Some settlers are trying to go through the northern pass! |
| 6 | `T_CAMPAIGN_07_06` / Settlers | I'm thirsty. Where is this lake exactly? I hope it hasn't dried up... |
| 7 | `T_CAMPAIGN_07_07` / Pedro | We should drown them in this lake! |
| 8 | `T_CAMPAIGN_07_08` / Settlers | Gold! Soon, we can use this to build a pretty house. Let's bring these new riches to safety quickly. |
| 9 | `T_CAMPAIGN_07_09` / Settlers | I am so happy that we sent the gold ahead of us. We have something to look forward to at the end of our journey. |
| 10 | `T_CAMPAIGN_07_10` / Deserter | Sir! As far as I can see, these are the last settlers in this area! |

`InGameGeneralMessageDialog.setUpDialog(int,int)` 按头像选择通用声音：Pedro → `sound_pedro`，Settlers → `sound_siedler`，Deserter → `sound_deserter_yes_sir`。三张头像及三段声音网页资源均存在。网页补充中文译文；英文、资源键、肖像和声音路由保持原版。静态检查不播放声音。

## 资产缺口、未知项与实现门槛

### 已核对存在

水面/水边/沙漠/峡谷/路径图集、水平与垂直桥、垂直铁路、上下铁路缓冲器、仙人掌/树/岩石/小屋/风车/水塔/小 Tipi、三类招募建筑、普通地图单位、三张对白头像及三段对白声音，均已在网页资源或共享既有资源中登记。Lucky Lake 预览图亦存在。

### 唯一阻塞能力项

网页缺 `lok_verti_1of2.png`、`lok_verti_2of2.png`、`lok_wagon_verti.png`，同时列车数据类型和模拟轴向限制为横向。该项需作为独立实现切片，在 Lucky Lake 地图组装前完成：直接提取 APK 原图；新增纵向列车标记解析与同组纵向拖动；按 APK 纵向帧尺寸、锚点、碰撞盒绘制；保留仅类型 22 可招募、开火和升级的行为；并用横向列车回归覆盖 Billy Hills 与 Tech Town。

### 非阻塞边界

- 背景和道路存在随机变体候选；静态审计锁定候选集合与逐格派生索引，不要求某个随机种子外的唯一截图纹理。
- code 58 路由在 APK 运行时选择北/南分支；静态图提供所有合法结果，不把随机选择当成数据不确定。
- 不需要 Android、声音播放或完整战役记录来决定 map07 内容。实现阶段可用独立数据测试、短时 `GameSession` 生成核对和窗口静音浏览器观察。

**审计门槛结论：**关卡内容字段与消费语义已闭合；在实现垂直列车能力后，可进入地图、规则和正式登记切片。无需额外用户权限或输入。
