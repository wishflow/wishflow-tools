# Snow Town 静态审计

## 范围与结论

本报告核对 Guns’n’Glory FREE 1.8.6 的 Dakota 第 9 关 Snow Town（全局第 39 关），以 APK 原始 TDM、资源表和 Smali 为准。网页已接入地图、静态对象、初始招募单位、移动列车、玩家单位池、关卡规则、波次、对白和音乐路由；并已登记为完成 Wayne Waters 后开放的 Level 39，接入正式菜单、Free Play、难度、地区 HUD、场景 builder、结算和快照回放。线上视觉验收仍待批次发布后进行。

| 项目 | 已核实结果 | 证据来源 |
| --- | --- | --- |
| APK | 23,948,202 bytes；SHA-256 `49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56` | 本地目标 APK；REA 解码资源时目标摘要一致 |
| 地图 | `res/raw/td_map_42.tdm`，32×24；首两字节分别为宽 32、高 24，后接 768 个 row-major 单字节格 | APK 原字节；[TDM fixture](../tests/fixtures/td_map_42.tdm) |
| 关卡编号 | `GameDesignWaves.setWaves(..., 39)` 的 39 分支；`GameDesignData` 索引 `0x26`（十进制38，即全局第39关）；地图文件号42 | APK Smali 与资源名 |
| 标题与说明 | `T_LEVEL_NAME_42` = `Snow Town`；`T_LEVEL_INFO_42` = `The snowbound streets of Snow Town can be admired on many postcards.` | REA `decode_android_resources`，默认英文资源 |
| 关卡内容 | 3 个出生点、33 个方向 marker、2 个出口；展开成3条完整路线、36条唯一有向控制边 | TDM 原字节及[独立路线 fixture](../tests/fixtures/snow-town-route-graph.json) |
| 雪地贴图替换 | Dakota LevelPack 将雪地树、雪地岩石 A/B 位图载入普通树、普通岩石 A/B 的缓存槽 | `levelpacks/Dakota.smali` 与 `graphics/BitmapManager.smali` |

APK 来源资源：`res/drawable-mdpi-v4/gng_levelmap_42.png`、`res/raw/music_atmo_snow.ogg` 和 `res/raw/music_dakota.ogg`。Snow Town 使用关卡选择图与实际 TDM 场景两套独立资源；缩略图不能替代游戏内地图。

## TDM 内容清单

完整原始格网保存在 fixture 中。以下列出全部非地形装饰、道路控制、单位和建筑 marker；坐标均为从左上角开始的零基 `(x,y)`。

| raw code | 数量 | 坐标 | 已由 APK 代码确认的含义 |
| ---: | ---: | --- | --- |
| 40 | 1 | (31,3) | 出生 action 0，西向 |
| 41 | 1 | (20,0) | 出生 action 1，南向 |
| 42 | 1 | (0,13) | 出生 action 2，东向 |
| 48 | 2 | (31,16), (31,17) | 出口 |
| 52 | 4 | (20,7), (22,19), (23,20), (13,21) | 路线 action 0：北 |
| 53 | 12 | (4,3), (27,3), (2,4), (6,4), (5,9), (11,9), (10,10), (2,13), (8,14), (9,15), (4,16), (7,19) | 路线 action 1：南 |
| 54 | 6 | (20,3), (4,4), (20,4), (27,7), (10,14), (11,15) | 路线 action 2：西 |
| 55 | 11 | (2,9), (6,9), (5,10), (2,16), (22,16), (23,17), (4,19), (9,19), (8,20), (13,20), (7,21) | 路线 action 3：东 |
| 69 | 6 | (19,0), (29,0), (25,4), (7,17), (31,18), (6,20) | 岩石 A；Dakota 位图缓存实际替换为雪地版 |
| 70 | 2 | (3,23), (23,23) | 岩石 B；Dakota 位图缓存实际替换为雪地版 |
| 71 | 3 | (0,0), (6,13), (1,20) | 树；Dakota 位图缓存实际替换为雪地版 |
| 72 | 1 | (27,21) | 木桩装饰 |
| 74 | 1 | (18,14) | 风车装饰 |
| 75 | 1 | (14,7) | 水塔装饰 |
| 76 | 5 | (14,0), (23,1), (3,13), (0,16), (29,21) | 灌木装饰 |
| 80 | 3 | (10,11), (11,11), (4,17) | 水平桥面 street marker |
| 81 | 2 | (2,6), (6,6) | 水平铁轨；各有一条敌方路线经过，不能按非道路阻断路线 |
| 82 | 10 | (1,6), (3,6), (4,6), (5,6), (7,6), (8,6), (14,6), (15,6), (16,6), (17,6) | 水平铁轨 |
| 83 | 2 | (9,6), (10,6) | 同一列车的两段机车 marker |
| 84 | 3 | (11,6), (12,6), (13,6) | 同一列车的三节车厢 marker |
| 86 | 1 | (0,6) | 水平铁轨左缓冲器装饰 |
| 87 | 1 | (18,6) | 水平铁轨右缓冲器装饰 |
| 88 | 14 | (8,2), (17,2), (8,3), (17,3), (8,4), (17,4), (23,6), (23,7), (28,15), (28,16), (28,17), (15,18), (15,19), (15,20) | 垂直桥面 street marker |
| 96 | 9 | (6,1), (12,8), (21,8), (0,9), (5,12), (23,13), (2,18), (18,21), (9,22) | 新局初始单位类型1，activity 4 |
| 97 | 11 | (16,1), (22,1), (1,3), (18,7), (28,10), (2,11), (7,11), (19,15), (11,16), (5,23), (13,23) | 新局初始单位类型2，activity 4 |
| 98 | 6 | (23,3), (4,5), (29,8), (23,10), (6,17), (2,22) | 新局初始单位类型3，activity 4 |
| 99 | 9 | (11,1), (25,2), (7,15), (27,18), (30,19), (4,20), (25,21), (16,22), (20,23) | 新局初始单位类型4，activity 4 |
| 100 | 1 | (17,11) | 新局初始单位类型5，activity 4 |
| 101 | 2 | (14,10), (26,12) | 新局初始单位类型6，activity 4 |
| 112 | 2 | (19,10), (15,15) | Saloon spawn-location 类型1 |
| 113 | 1 | (30,6) | Fort spawn-location 类型2 |
| 114 | 1 | (26,19) | Tipi spawn-location 类型3 |
| 116 | 4 | (15,9), (27,11), (15,12), (21,13) | Shack 装饰 |
| 117 | 2 | (22,21), (31,22) | 小 Tipi 装饰 |
| 130 | 1 | (31,12) | 新局初始单位类型35，activity 4 |
| 131 | 1 | (2,1) | 新局初始单位类型36，activity 4 |

其他格频次：raw 0 为370格、16为65格、32为126格、36为64格。没有 raw 102/110 Dynamite 对象、120–126 Steamer/水域对象，也没有 Casino marker。完整计数由针对 APK fixture 的测试锁定。

## 路线结构

路线规则来自 TDM 的边缘出生点、raw 52–65 的方向 action 和 raw 48 出口。扫描每个方向直到下一个方向 marker 或出口；路线不是直线连点，也不使用 A*。独立展开结果：

| Spawn action | 出生 | 控制节点数（含出生与出口） | 出口 | 经过铁轨/桥格 |
| ---: | --- | ---: | --- | --- |
| 1 | (20,0) 南向 | 16 | (31,17) | 水平铁轨 raw81 `(2,6)`；垂直桥 raw88 `(15,20)` |
| 0 | (31,3) 西向 | 14 | (31,16) | 水平铁轨 raw81 `(6,6)`、水平桥 raw80 `(11,11)`；垂直桥 raw88 `(23,7)`、`(28,16)` |
| 2 | (0,13) 东向 | 12 | (31,17) | 水平桥 raw80 `(4,17)`；垂直桥 raw88 `(15,20)` |

摘要：33 个方向 marker 全部在完整路径中可达；36 条唯一有向控制边；3 条出生到出口路线；不含起点和最终出口格时共有193次中间格访问、172个不同中间格。中间格访问频次为 raw32：141、raw52：5、raw53：12、raw54：6、raw55：13、raw80：3、raw81：2、raw88：11。所有路线中间格都来自这组 TDM 道路/桥/轨标记。原始控制节点、具体路径和数字摘要见[独立路线图 fixture](../tests/fixtures/snow-town-route-graph.json)。

## APK 绘制、碰撞与对象构造链

- `BackgroundMap` 构造时依序创建背景层、街道层、整形邻接关系及变化层。背景转换将 raw32/36、raw80/81、raw88/89 和 raw120–126 分别送入相应底图处理；街道层将 raw80 映射为水平桥、raw81 映射为水平铁轨、raw82–85 映射为水平轨道、raw88 映射为垂直桥、raw89–93 映射为垂直轨道。Snow Town raw81 是铁轨而不是另一个桥面图。
- `GameObjectManager.createGameObjectsFromBasicMap()` 对 raw96–101 与 raw130/131 使用 `type = rawCode - 95`，activity 设为4；分支只在 `fromLoadGame == false` 时创建。初始单位锚点按格中心 `(x + 0.5, y + 0.5)` 转换。
- 同方法将 raw112–114 创建为 `GameObjectSpawnLocation`，类型为 `rawCode - 111`；raw116/117 建为装饰类型 `rawCode - 104`；raw86/87 建为装饰类型16/17。
- raw83 启动水平列车扫描；Snow Town 在同一行连续出现83、83、84、84、84，即两段机车加三节车厢。raw86/87 则单独映射到铁轨两端缓冲器资源。
- `GameObjectDecoration` 为 raw69/70/71/72/74/75/76 的类型分别载入岩石、石块、树、木桩、风车、水塔和灌木资源；建筑 marker raw112/113/114 对应 Saloon、Fort 与 Tipi。
- Dakota LevelPack 中 `putBitmap(snowAsset, baseAsset, true)` 将雪地树、雪地岩石 A/B 图片载入基础资产缓存槽；`BitmapManager.putBitmap(IIZ)` 的 Smali 显示其以第一个 drawable 加载位图并写入第二个参数对应的缓存槽。因此这种替换适用于 Dakota 包的地图，而非只在名称为 Snow Town 的单关启用。

网页已按该缓存替换语义接入 Loot Lakes（Dakota 第1关）及 Dakota 第2–9关，包括 Snow Town：raw69/70/71 使用 APK 雪地岩石 A/B 和雪地树，6张 mdpi/hdpi 图片与目标 APK 文件逐字节一致；`gameAssetRelativePath()` 将雪地图像解析到 hdpi 文件并按原逻辑尺寸绘制。Loot Lakes 原先遗漏这项地区级替换，现由 `dakota-snow-biome-assets.test.ts` 纳入覆盖，并继续检查非 Dakota 资源隔离。Snow Town 的地形、路线、静态场景对象和碰撞范围由 `snow-town-static-fixture.test.ts`、`snow-town-static-scene.test.ts` 对照 TDM fixture 与独立参考；单位及解锁门控由 `dakota-09-units.test.ts` 检查，玩家池由 `dakota-09-unit-pool.test.ts` 检查，列车还经短 `GameSession` 移动并在 TDM 右侧缓冲器前停止。关卡规则、波次请求、对白和音乐由 `dakota-09-campaign-*.test.ts` 检查；正式目录、Free Play 和回放版本分派由 `dakota-09-formal.test.ts`、`dakota-09-replay-factory.test.ts` 及 Playwright 集成测试检查。以上为静态 APK 对照与网页自动化验证，不是 Android 画面或线上部署观察。

## 关卡参数、波次、对白与音乐

### 参数行与适用编号

`GameDesignData.gameDesignData[38]` 对应全局 level 39；原始 12 项为：

```text
[250, 10, 999, 25000, 3, 30000, 5, 15, 56, 75, 100, 119000]
```

| 索引 | 原始值 | 当前可确认的用途 | 网页处理 |
| ---: | ---: | --- | --- |
| 0 | 250 | 初始现金 | 开局 `$250` |
| 1 | 10 | 初始生命 | 开局 10 生命 |
| 2–4 | 999 / 25,000 / 3 | 奖励箱总数、生成间隔、升级上限 | 奖励箱池与升级上限按字段接入 |
| 5 | 30,000 | 字段消费者尚未独立闭环 | 保留为 `reservedParameter5`，不添加额外效果 |
| 6 | 5 | Awesome 击杀反馈单位阈值 | 设为5 |
| 7 | 15 | 同屏奖励箱上限 | 设为15 |
| 8–10 | 56 / 75 / 100 | Easy / Medium / Hard 敌人生命倍率（百分比） | 按难度应用 |
| 11 | 119,000 | Gambler 计时字段 | 地图没有 Gambler/Casino，不生成相关对象 |

`GameDesignWaves.setWaves(..., i)` 直接按全局关卡号选分支。level 39 对应 `i == 39`；地图资源 `td_map_42.tdm` 的文件号42不能用作波次分支或参数行编号。

### 波头、对白与头像

`GameDesignWaves` 的 `newWave(text, portrait, delay, hpPercent, speedPercent)` 参数顺序由 `Wave` 构造函数逐项赋给 `waveText`、`waveImg`、`waveDelay`、`waveHPMultiplier`、`waveSpeedMultiplier`。英文台词逐条对应 APK 默认字符串资源；中文是网页本地化文本。

| 波次 | 对白资源 | 头像资源 | 延迟 | HP | 速度 | APK 英文文本 |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | `T_CAMPAIGN_39_01` | `oregon_dakota_portrait_geezer` | 15,000 ms | 120% | 130% | “I just don't get it, is it Christmas day? Snow, trees and I see some elves up ahead!” |
| 2 | `T_CAMPAIGN_39_02` | `portrait_gunslinger` | 15,000 ms | 150% | 150% | “Those aren't elves, old man! But you're right, they do have some presents with them!” |
| 3 | `T_CAMPAIGN_39_03` | `oregon_dakota_portrait_calamity` | 15,000 ms | 110% | 130% | The only thing that has to do anything to do with Christmas here is your snowbound mind! |
| 4 | `T_CAMPAIGN_39_04` | `portrait_pedro` | 15,000 ms | 155% | 145% | Why are you always so uptight, señorita? You remind me of the story about that green grouch… |
| 5 | `T_CAMPAIGN_39_05` | `portrait_indian` | 25,000 ms | 160% | 150% | Why are palefaces always babbling? My tribe prefers to deal with more important things, like the palefaces in the west! |
| 6 | `T_CAMPAIGN_39_06` | `portrait_settlers` | 15,000 ms | 175% | 155% | “Honey, don't you think it looks very festive here? Look, there's even a Christmas star flying towards us…” |
| 7 | `T_CAMPAIGN_39_07` | `portrait_gunslinger` | 15,000 ms | 205% | 160% | Here comes Santa Claus with his wagons full of presents! |
| 8 | `T_CAMPAIGN_39_08` | `oregon_dakota_portrait_boss` | 30,000 ms | 195% | 165% | “Eh… Hohoho, let me pass, I'm… Santa Claus! You have to believe me!” |

APK 默认英文标题和简介分别为 `T_LEVEL_NAME_42 = Snow Town`、`T_LEVEL_INFO_42 = The snowbound streets of Snow Town can be admired on many postcards.` 八段对话资源是 `T_CAMPAIGN_39_01` 至 `_08`。头像及英文/中文文案以 `dakota-09-wave-intros.ts` 与 `dakota-09-campaign-copy.ts` 为实现入口。

### 敌方请求向量

`WaveManager.addToWave()` 的首参数是 TDM 出生 action，第二参数是请求间隔，后续8项是普通敌人请求槽，后两项为 Boss、Doc。短重载把缺失的 Boss/Doc 槽补0。请求向量表示各类型尚余数量，不承诺随机出兵顺序。

普通槽从左至右对应 Settler×1、Settler×2、Settler×3、Settler×4、Rider、Covered Wagon、Post Coach、Gold Transport；第9槽为 Boss，第10槽为 Doc。action 到网页路线 ID 映射为 APK action 0→spawn point 1、action 1→spawn point 0、action 2→spawn point 2。

| 波次 | action → spawn point | 间隔 | 普通请求槽1–8 | Boss | Doc |
| ---: | --- | ---: | --- | ---: | ---: |
| 1 | 0 → 1 | 1,500 ms | `[2,6,7,8,0,2,0,0]` | 0 | 0 |
| 2 | 1 → 0 | 1,500 ms | `[1,0,0,1,12,2,0,0]` | 0 | 0 |
| 3 | 0 → 1 | 1,500 ms | `[1,1,2,2,1,4,0,0]` | 0 | 0 |
| 3 | 1 → 0 | 1,500 ms | `[1,1,2,2,1,4,0,0]` | 0 | 0 |
| 4 | 0 → 1 | 3,000 ms | `[0,0,1,2,1,1,4,1]` | 0 | 0 |
| 4 | 1 → 0 | 3,000 ms | `[0,0,1,2,1,1,4,0]` | 0 | 0 |
| 5 | 0 → 1 | 4,500 ms | `[0,0,1,2,2,1,1,2]` | 0 | 0 |
| 5 | 1 → 0 | 4,500 ms | `[0,0,1,2,2,1,1,2]` | 0 | 0 |
| 5 | 2 → 2 | 3,500 ms | `[2,2,2,2,2,1,1,1]` | 0 | 0 |
| 6 | 0 → 1 | 2,500 ms | `[1,2,4,4,3,4,1,0]` | 0 | 0 |
| 6 | 1 → 0 | 2,500 ms | `[0,2,3,4,4,3,2,1]` | 0 | 0 |
| 6 | 2 → 2 | 2,500 ms | `[0,2,3,4,3,4,1,1]` | 0 | 0 |
| 7 | 0 → 1 | 2,500 ms | `[0,1,2,2,4,4,2,1]` | 0 | 0 |
| 7 | 1 → 0 | 2,500 ms | `[0,1,2,2,4,3,2,2]` | 0 | 0 |
| 7 | 2 → 2 | 2,500 ms | `[0,1,2,2,4,4,2,2]` | 0 | 0 |
| 8 | 2 → 2 | 500 ms | `[0,0,0,0,0,0,0,0]` | 1 | 0 |

APK 源码共8次 `newWave`、17次 `addToWave`；其中 Wave 2 对 action 1 连续调用两次且12个参数相同。`WaveManager.addToWave()` 最终调用 `Wave.setContentForSpawnPoint(actionId, ...)`，后者以 action ID 索引固定的生成行并覆盖其内容，所以重复调用不创建第二个池。最终有效状态为16条生成池记录；网页内容与测试按最终状态建模，并另行记录17次源调用，避免把重复调用解释为多出一倍敌人。

符号常量按 APK 静态定义解析：`ConnectionResult.DRIVE_EXTERNAL_STORAGE_REQUIRED=1,500`，`PathInterpolatorCompat.MAX_NUM_POINTS=3,000`，`LokSteam.MAX_CLOUD_SPAWN_INTERVAL=500`。玩家池动作是第1波 `SET=[0,0,0,0]` 与 `SET_MAX=[4,4,4,4]`；`SpawnPoolManager.performActionsForWave()` 证明动作值1为 SET、3为 SET_MAX。

### Dakota 音乐

`Dakota.<clinit>()` 的 battle loop 资源顺序为 `music_dakota`、`music_loop2`、`music_loop3`；`getNextLoop()` 以零起始的 `GunsAndGloryThread.wave % battleLoops.length` 轮换，环境循环由 `setBackgroundLoop()` 指向 `music_atmo_snow`。网页把 GameView 一起从1开始的波次号减1后选择相同轨道，全部 OGG 使用本地资源。测试检查 OGG 文件和轮换索引，不播放声音。

## 证据边界与待后续验证

| 主题 | 当前结论 | 边界 |
| --- | --- | --- |
| TDM 与 marker | 字节、维度、频次、坐标均从目标 APK 原项读取 | fixture 之后不会在每次测试中重新访问 APK；目标身份由本报告绑定 |
| 我方单位与玩家池 | 初始 marker、四种全局解锁门控、三种生成建筑、四类 pool 模板及 Wave 1 四槽动作已在正式/自由内容 builder 中核对 | 动作计数不代表创建初始单位；线上关卡画面仍待部署验收 |
| 路线与敌方波次 | 原始方向图完整展开，所有方向 marker 可达；Wave 1 action 0 与 Wave 8 Boss action 2 经短 `GameSession` 定点核对 | 未完整通关，也未做 Android/线上逐帧画面对照 |
| 雪地贴图 | Dakota LevelPack 的源图到基础缓存槽映射已在 Smali 中闭环；Loot Lakes 和 Dakota 第2–9关已按地区规则接入 | 由各关 TDM 到 decoration 的自动化检查确认静态别名；未做 Android/设备截图对比 |
| 地形转换与列车 | 背景/街道绘制命令及碰撞格由独立参考检查；网页列车短会话验证整组移动和缓冲器停止 | 不代表敌我单位完整运行、逐帧画面或 Android 对照已核验 |
| 关卡参数 | 原始行、8个波头、17次源码调用和16条最终有效 spawn row 已对照；首波与末波请求通过网页 `GameSession` | 参数索引5仍保留为未知字段；网页运行结果不等同于 APK 设备运行观察 |
| Android 运行观察 | 本阶段没有运行 APK | 静态 Smali/JADX 足以解释地图、对象、波次存储和资源路由；不需要完整游玩或战役通关 |

## 可复核位置

本报告结论可从同一 APK 的以下类/方法重查：

- `datastorage/BackgroundMap.smali`：`<init>`、`createBackgroundMap`、`createStreetLayerMap`、`shapenBackgroundMap`、`shapenStreetLayerMap`、`createVariationMap`。
- `gamelogic/GameObjectManager.smali`：`createGameObjectsFromBasicMap`、`createTrainFromMap`。
- `gamelogic/GameObjectDecoration.smali`：装饰类型与 drawable 选择。
- `levelpacks/Dakota.smali`：`loadIngameImagesPack` 的雪地源图替换。
- `graphics/BitmapManager.smali`：`putBitmap(IIZ)` 的缓存目标语义。
- `datastorage/GameDesignData.smali`：第39关 `gameDesignData[0x26]` 行。
- `datastorage/GameDesignWaves.smali`：`setWaves` 的全局 level 39 / `i == 39` 分支；REA 返回完整方法文本。注意地图文件号42不等于波次分支编号。
- `gamelogic/WaveManager.smali` 与 `gamelogic/Wave.smali`：`newWave` 参数赋值、`addToWave` 的固定 action 行写入，以及请求向量槽位。
- `gamelogic/SpawnPoolManager.smali`：`addActionForSpawnPool` 与 `performActionsForWave` 的玩家池动作编码。
- `levelpacks/Dakota.smali`：`getNextLoop()`、`setBackgroundLoop()` 及地区音轨顺序。
- REA `decode_android_resources`：目标摘要一致的默认英文字符串资源表。
