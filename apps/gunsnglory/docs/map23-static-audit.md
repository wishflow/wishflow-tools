# Oregon 第 3 关：Chinook Woods 静态审计

## 结论与边界

Chinook Woods 是全局第 23 关，使用 APK 的 `res/raw/td_map_26.tdm`。地图为 32×24 格；有 3 个敌人入口、27 个转向 marker、3 个出口，静态路线图中的 30 条有向边全部可达。关卡有 9 波、14 条敌人生成请求，并在第 1 波开放 Tipi 的印第安人单位池。网页已接入地图、路线、对象、玩家单位、单位池、关卡参数、9 波、双语对白、头像预加载、四位解锁快照内容 builder，以及正式目录、Free Play 与回放路由（M24-F2）。这份静态审计不代替整批浏览器和部署验收。

本报告使用 APK、REA 静态反编译及 APK 派生地图清单，不是 Android 运行记录，不代表最终设备像素，也不包含完整战役模拟。地图随机变体按原版候选帧与规则复核，不为网页伪造一个原版随机种子。

| 结论类型 | 结果 |
| --- | --- |
| 已证实 | APK 身份、TDM 原始网格、关卡初始参数、波次调用、对白和 Oregon 资源加载均有 APK/DEX 证据。 |
| 静态推导 | 3 个入口分别通往 3 个出口；27/27 转向点、3/3 出口可达，未发现越界、断路或循环。 |
| 网页差异 | `campaign-catalog.ts` 已有 level 23 / map 26 条目；M24-B–E 接入地图、对象、单位池、规则、对白和资源；M24-F1 建立 profile/replay snapshot 内容 builder；M24-F2 将其登记到正式战役、Free Play、实际回放导入路由及 HUD。 |
| 未知项 | `awesomeMessageMin=30,000` 的消费语义仍未闭环；单位池 timer 字段的 APK 赋值来源仍未闭环；不据字段名或网页默认值推断原版行为。没有发现本关专属对白语音映射；不从头像推断语音。 |

## 来源与证据索引

证据键采用可读名称；REA 的原始 Evidence ID 只在本表出现一次，避免在正文反复复制长标识。

| 证据键 | 来源与定位 | 支持内容及限制 |
| --- | --- | --- |
| `APK-1.8.6` | `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk`；REA `inspect_android_package`，`ev_25177bf1d313f37c34730e7577d586f808374ae75cc967cbed7e147f47516081` | 包名 `com.hg.gunsandgloryfree`、版本 1.8.6 / code 34；APK SHA-256：`49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56`。 |
| `MAP-CHINOOK-26` | 从 `APK-1.8.6` 的 `res/raw/td_map_26.tdm` 原始 ZIP 项读取；派生 `map-inventory.json` index 26 | 770 字节，前两字节为 32、24，之后是 y-major tile 字节；资源 SHA-256：`52182041674cfc923121ce2d57953eb2b1722b62916da502541f529830b44aa7`。 |
| `DEX-LEVEL-DATA` | `GameDesignData.<clinit>`，Smali；REA `ev_3bcffce365cc40fb56e7510c51c9fd0e97381735692c2b8093bdba630a2e6d8b`；派生 `level-config.json` index 22 | 支持 level data 行与字段值；字段含义只按已有消费点解释。 |
| `DEX-WAVES-23` | `GameDesignWaves.setWaves` 中 `i == 23` 分支；REA `ev_1a6386fc5fa948f4ef3c931d5a23cf50d7830da8d528174478bc3bf8b389e8db` | 完整方法反编译；正文按该分支的 `newWave` / `addToWave` 调用顺序抄录。它是 JADX 输出，不是原始源码。 |
| `DEX-UNIT-POOL` | `SpawnPoolManager.addActionForSpawnPool` / `performActionsForWave` / `initNewSpawnPool`；REA `ev_918d913f0e7eeb0d6fd1059a25baddfb78317a82fc1e0bd49822f8ccd42c92c3`、`ev_0ddf3bf157b41eed34527e233a868703f955d05c6eb9b630942a4ee257e18f05`、`ev_dcac683c7f56beec18299ca292e14076dff91c3625f7e56efbe2e8b528c14149` | 参数写入 pool action 的 wave、动作类型与单位槽；动作 1/3 分别设置可用数量和上限。初始化方法创建 37 槽库存数组并令 timer 取 `spawnPoolTimerMax`，该方法本身没有给出此字段数值。 |
| `DEX-MAP-OBJECTS` | `GameObjectManager.createGameObjectsFromBasicMap`；REA `ev_19b52985045d947b19b148ae87f80bf999f32399487ccc95cfbd9743fcbd4a45`；另核对 `GameObjectManager.dexdump.txt` 中 `0x407d66` switch 与 `0x408188` payload | 用于 tile 到对象类别的定位。已知 JADX switch 重建存在错位，marker 分派以 DEX switch 与目标指令为准。 |
| `DEX-DECORATION` | `GameObjectDecoration.<init>`；REA `ev_068a55a9dbf66151d701cadd618dd72131d7516666882aa024816d73d6a90fb6` | 支持装饰 ID 到资源的映射；结合 marker 分派核对，不把构造器伪代码当作原始源码。 |
| `OREGON-RENDERER` | `Oregon.loadIngameImagesPack`、`Oregon.drawBackgroundLayer`；REA `ev_436a8035d35704f48d5fdcb1d197ab633beb9f9e5b7e00663a4ae12b37e584e3`、`ev_a42122fe05df1abcd9061ac1206fe0c10df20072e730fd23a1a5130cc3b66059`；派生 `terrain-render-index.json` map 26 | 支持 Oregon 使用的 atlas alias、地形帧选择及候选街道层。候选帧不等于设备最终像素。 |
| `APK-STRINGS-26` | REA `decode_android_resources`，`ev_52e0d9edcaa5f1db93f82716b33ca87cc017673fce5ea13a439433afe6995203` | `T_LEVEL_NAME_26`、`T_LEVEL_INFO_26`、`T_CAMPAIGN_23_01..09` 英文原文；资源解码完整。 |

派生清单位于本机 `codex/gunsnglory-spec` 研究分支：`apps/gunsnglory/docs/research/data/map-inventory.json`、`static-route-graph.json`、`terrain-render-index.json`、`terrain-render-rules.json`、`level-config.json`、`waves.json` 和 `string-resources.json`。它们是解析结果，不是 APK 原始资源；实施测试应直接从 TDM 与公开网页资源核对关键输入。

## 地图与路线

TDM 使用 32 列×24 行、每格 32×32 像素，逻辑尺寸 1024×768。tile 频次：

`0:356, 16:29, 32:162, 36:60, 40:1, 41:1, 42:1, 48:3, 52:8, 53:5, 54:10, 55:4, 69:1, 72:1, 74:1, 78:6, 79:17, 80:5, 88:17, 89:4, 90:11, 91:2, 92:2, 93:1, 94:1, 95:1, 96:12, 97:8, 99:4, 100:1, 101:8, 105:1, 114:1, 115:10, 117:3, 118:5, 119:3, 130:1, 131:1`。

坐标均为 TDM `(x,y)`。转向 marker 的 action ID 0、1、2、3 分别包含北、南、西、东直行；marker 的完整方向集合由 APK action 表决定。出生 marker 的 action ID 则是另一套 wave 入口编号，不能按转向方向表解释。路线图汇总如下：

| 类型 | action ID | 坐标 / 结果 |
| --- | ---: | --- |
| 出生点 action ID 1 | — | `(22,0)`，向南；首个控制点 `(22,5)`，最终出口 `(0,3)`；可达 11 个转向点。 |
| 出生点 action ID 0 | — | `(31,9)`，向西；首个控制点 `(28,9)`，最终出口 `(0,4)`；可达 8 个转向点。 |
| 出生点 action ID 2 | — | `(31,16)`，向西；首个控制点 `(26,16)`，最终出口 `(0,5)`；可达 8 个转向点。 |
| 转向点 | 0 | `(7,9)、(9,9)、(28,9)、(3,14)、(13,14)、(9,18)、(8,19)、(7,20)` |
| 转向点 | 1 | `(17,5)、(18,6)、(25,13)、(24,14)、(26,16)` |
| 转向点 | 2 | `(9,3)、(8,4)、(7,5)、(22,5)、(28,6)、(13,9)、(7,14)、(24,18)、(25,19)、(26,20)` |
| 转向点 | 3 | `(3,9)、(18,13)、(9,14)、(17,14)` |
| 出口 | — | `(0,3)、(0,4)、(0,5)` |

静态图包含 30 条有向边；27/27 转向 marker 和 3/3 出口均可从相应出生点到达，无例外路径。敌人路线沿 TDM direction marker 行走；玩家碰撞背景不能代替敌人路线图验收。

### 地形、碰撞与道路

map 26 的地形地区是 Oregon。静态渲染索引有 426 个非零背景格、72 个非零道路格及 8 个桥墩绘制项。背景候选帧来源包括 Oregon canyon/desert/shadow/water/waterside/path atlas；`Oregon.loadIngameImagesPack` 将地图专用 atlas alias 写入通用 cache 槽。tile 16 主要形成道路/桥面层，88/89/90–93 参与铁路或道路绘制；不可仅凭 TDM tile 值把街道层当成背景碰撞。

静态索引覆盖 768 格的背景/街道结果与随机变体候选。原版部分背景变体使用时间种子随机；报告不选取一组候选帧充当原版截图。M24 地图测试应逐格比较确定性背景/街道/碰撞编码、桥墩坐标和贴图裁切边界；截图只用于检查层级/锚点，不作为路线正确性的唯一证据。

## 地图对象、单位与现有网页差异

下表只列本图实际出现的对象 marker。tile 96–101、130–131 的 activity 4 单位在新局创建；该语义以 Smali 条件跳转复核，不按 JADX 的错误条件方向处理。Sniper、Grandpa、Pyromaniac、Salesman 四种 activity 4 单位均受现有单位解锁快照影响；type 1–4 不受这些里程碑位控制。

| tile | 数量 | APK 对象 / 网页资源 | 坐标 |
| ---: | ---: | --- | --- |
| 69 | 1 | 装饰 ID 2，`e_1x1_rocks_a` | `(3,0)` |
| 72 | 1 | 装饰 ID 5，`b_1x1_stake`；Oregon 共用场景当前未映射此 code | `(3,21)` |
| 74 | 1 | 装饰 ID 7，`b_1x1_windmill` | `(20,9)` |
| 79 | 17 | 装饰 ID 15，`e_1x1_tree_green_a` | `(25,1)、(11,2)、(18,2)、(31,2)、(28,3)、(12,5)、(30,7)、(22,8)、(0,9)、(1,13)、(30,13)、(11,15)、(23,16)、(28,19)、(21,22)、(30,22)、(17,23)` |
| 91–93 | 5 | 普通新局创建的纵向列车组件 | 91：`(15,6)、(15,7)`；92：`(15,3)、(15,4)`；93：`(15,5)` |
| 94、95 | 2 | 装饰 ID 27/28，竖向铁路挡车器 | 94：`(15,1)`；95：`(15,22)` |
| 96 | 12 | type 1 Gunslinger，activity 4 | `(6,1)、(24,1)、(27,2)、(13,5)、(4,7)、(23,8)、(4,12)、(31,12)、(12,15)、(17,16)、(19,22)、(26,22)` |
| 97 | 8 | type 2 Mexican，activity 4 | `(17,1)、(25,2)、(25,9)、(21,10)、(1,11)、(29,11)、(30,19)、(11,21)` |
| 99 | 4 | type 4 Indian，activity 4；与 Tipi 动态单位池分开，是可招募地图单位 | `(3,16)、(4,19)、(1,21)、(5,21)` |
| 100 | 1 | type 5 Sniper，activity 4，受解锁状态门控 | `(11,12)` |
| 101 | 8 | type 6 Grandpa，activity 4，受解锁状态门控 | `(20,1)、(11,3)、(30,4)、(1,7)、(20,10)、(21,16)、(7,23)、(23,23)` |
| 105 | 1 | type 2 Mexican，activity 5 | `(19,7)` |
| 114 | 1 | `GameObjectSpawnLocation` type 3，并绘制 `b_2x1_tipi`；Tipi 单位池入口 | `(1,18)` |
| 115 | 10 | 装饰 ID 48，`e_1x1_tree_green_b` | `(21,1)、(13,3)、(23,4)、(31,4)、(6,10)、(24,10)、(16,12)、(5,17)、(10,21)、(27,23)` |
| 117 | 3 | 装饰 ID 13，`b_1x1_tipi_small`；Oregon 共用场景当前未映射此 code | `(1,15)、(4,18)、(0,21)` |
| 118 | 5 | 装饰 ID 51，`e_1x1_tree_stump` | `(12,0)、(3,1)、(29,1)、(28,21)、(12,23)` |
| 119 | 3 | 装饰 ID 52，`e_1x1_tree_green_c` | `(4,0)、(1,6)、(27,14)` |
| 130 | 1 | type 35 Pyromaniac，activity 4，受解锁状态门控 | `(10,6)` |
| 131 | 1 | type 36 Salesman，activity 4，受解锁状态门控 | `(28,17)` |

网页已有 Oregon 地形、普通装饰、树木/树桩和地图预览资源；`b_1x1_stake`、`b_1x1_tipi_small` 当前以 `public/assets/hdpi/` 资源存在，运行时资源清单已登记。M24-C 已补场景 code 映射并按 marker 校验坐标；不需重新提取已存在图片。114 是视觉 Tipi 与逻辑 spawn location 的同一格，不能重复生成两个玩家单位入口。

### Tipi 印第安人单位池

`GameDesignWaves.setWaves` 在 `i == 23` 中声明两条 wave 1 pool action：`addActionForSpawnPool(1, 1, 0, 0, 0, 0)` 与 `addActionForSpawnPool(1, 3, 0, 0, 0, 5)`。`SpawnPoolManager` 将动作 1 解释为设置 pool 当前数量，动作 3 解释为设置 pool 上限；四个数值槽对应 pool type 1–4。因此本关在第 1 波把四类当前库存清零，并将 pool type 4 上限设为 5。现有单位池映射确认 pool type 4 对应 Indian、spawn type 3 对应 Tipi。TDM 另有 4 个 activity 4 Indian marker（tile 99）；它们是开局可招募单位，不代表 pool 已经生成 Indian。

地图没有 Indian 的 sleeping marker；玩家池生成使用现有 `CampaignUnitPoolDefinition.units[].template` 契约及已用在 Horse Hills 的 `createActiveFortKaboomUnit('indian', ...)`。M24-C 已复用此契约，不添加新字段、不把 Tipi 伪装成地图单位。开局池库存为零，上限五；之后由原有池间隔机制生成，不应在开局直接出现五个 Indian。

REA 对 `initNewSpawnPool` 的静态反编译显示初始 timer 取 `spawnPoolTimerMax`，但该方法不提供此字段的赋值数值。网页定义暂沿用其他已接入关卡的 15,000 ms 单位池 cadence；这是网页运行时的兼容约定，不能视为已证实的 APK 关卡参数。M24-D 已用真实 `GameSession` 验证 wave-1 上限动作允许一个已雇佣 Indian 从 Tipi 生成；若需逐毫秒对齐原版，还需追踪 timer 字段的写入点。

## 关卡参数与波次

`GameDesignData.gameDesignData` index 22 对应全局 level 23。数值表保留 APK 原值；未知字段不按名字猜行为。

| 字段 | 原值 | 接入要求 |
| --- | ---: | --- |
| cash / lives | 300 / 25 | 新局初态 |
| maxUpgrades | 3 | 复用现有关卡升级上限规则 |
| enemy HP multiplier Easy / Medium / Hard | 97% / 125% / 150% | 按正式难度选择 |
| maxChests / chestTime / maxChestsPlayfield | 999 / 25,000 ms / 15 | 沿用奖励箱系统 |
| awesomeMessageUnit | 5 | 沿用已验证消费者 |
| awesomeMessageMin | 30,000 | 消费语义未闭环；不新增门槛规则 |
| gamblerTime | 119,000 ms | 本图无 Gambler marker，不生成 Gambler |

9 条 `newWave` 及 14 条 `addToWave`。槽 1–8 的既有含义为 Settler×1、Settler×2、Settler×3、Settler×4、Rider、Covered Wagon、Post Coach、Gold Transport；第 9 波另有 Boss 槽。生成间隔均为字面数值 2,000 或 2,500 ms，没有待解释的 `PathInterpolatorCompat.MAX_NUM_POINTS`。

| 波次 | 对白/头像 | 延迟 | HP / 速度倍率 | 出生 action / 间隔 / 槽 1–8 请求 |
| ---: | --- | ---: | --- | --- |
| 1 | `T_CAMPAIGN_23_01` / Settlers | 15,000 ms | 100% / 120% | `0 / 2,000 / [1,1,2,3,4,0,0,0]` |
| 2 | `T_CAMPAIGN_23_02` / Settlers | 15,000 ms | 110% / 125% | `0 / 2,000 / [1,0,2,2,3,2,0,0]` |
| 3 | `T_CAMPAIGN_23_03` / Gunslinger | 15,000 ms | 120% / 130% | `1 / 2,000 / [1,2,2,2,2,2,1,0]` |
| 4 | `T_CAMPAIGN_23_04` / Oregon Geezer | 15,000 ms | 130% / 135% | `0 / 2,500 / [1,2,2,2,1,1,1,0]`；`1 / 2,500 / [1,2,2,1,2,1,1,0]` |
| 5 | `T_CAMPAIGN_23_05` / Gunslinger | 25,000 ms | 140% / 140% | `2 / 2,500 / [1,2,1,2,1,2,1,0]` |
| 6 | `T_CAMPAIGN_23_06` / Indian | 15,000 ms | 150% / 145% | `0 / 2,500 / [1,2,2,2,1,1,2,1]`；`2 / 2,500 / [1,2,2,2,1,2,1,0]` |
| 7 | `T_CAMPAIGN_23_07` / Gunslinger | 15,000 ms | 160% / 150% | `1 / 2,500 / [0,2,2,2,1,2,2,1]`；`2 / 2,500 / [0,2,2,2,1,2,1,0]` |
| 8 | `T_CAMPAIGN_23_08` / Pedro | 15,000 ms | 170% / 155% | `0 / 2,500 / [0,2,2,2,1,2,2,1]`；`1 / 2,500 / [0,2,2,2,1,2,2,1]`；`2 / 2,500 / [0,2,2,2,1,2,1,1]` |
| 9 | `T_CAMPAIGN_23_09` / Oregon Boss | 25,000 ms | 180% / 155% | `0 / 2,500 / [0,0,0,0,0,0,0,0]`；Boss 槽 = 1 |

每波请求数为 1、1、1、2、1、2、2、3、1，总计 14。wave spawn action ID 0、1、2 分别对应 `(31,9)` 右侧中部、`(22,0)` 顶部、`(31,16)` 右侧下部入口；网页 spawn ID 应由 route 模块显式映射，不能假定 action ID 顺序等于数组顺序。

## 文案、头像和资源

| 资源 | APK 英文原文 / 映射 |
| --- | --- |
| `T_LEVEL_NAME_26` | Chinook Woods |
| `T_LEVEL_INFO_26` | The Chinook natives created a magnificent amusement park for salmon fishers here. |
| Wave 1 | “Honey, I heard that some wild animals live here! Hold me tight!” — `portrait_settlers` |
| Wave 2 | “Don't be afraid, the covered wagons will protect us against their evil eyes!” — `portrait_settlers` |
| Wave 3 | “No respect, those settlers! The Chinook are natives, not animals! But I see some settler cows in the north!” — `portrait_gunslinger` |
| Wave 4 | “Huh, what? North? Damn, I thought this is the west!” — `oregon_dakota_portrait_geezer` |
| Wave 5 | “Pa, maybe you shouldn't drink so much fire-water! Just deal with the settlers from the south-east!” — `portrait_gunslinger` |
| Wave 6 | “We heard someone wants to smoke our salmon? Let's dig up the hatchet!” — `portrait_indian` |
| Wave 7 | “The only thing smoking will be my Colts, yeeehah!” — `portrait_gunslinger` |
| Wave 8 | “Here comes the cavalry! Set them on fire and steal their gold teeth!” — `portrait_pedro` |
| Wave 9 | “Damned bandits! I'm not afraid of you! My golden vest will protect me!” — `oregon_dakota_portrait_boss` |

APK 默认语言字符串解码完整；M24-E 已按 APK 保留英文并提供项目中文译文。现有 level map 26 预览图、以上头像和 Oregon 战斗音乐资产已在网页资源目录；头像加入启动预加载集合，关卡音乐接线留到 M24-F2。未新增未证实语音，验收保持静音。

## 网页接入边界与实现验收

- `campaign-catalog.ts` 已含 level 23 / Oregon / Chinook Woods / map 26；不重复登记。`official-campaign.ts` 仍未正式注册本关，正式解锁应以前一关 Cashcow Canyon 为前置。
- Free Play 应能直接以 Easy、Medium、Hard 启动；正式胜利只写 level 23 进度，Free Play 不污染正式档案。
- activity 4 招募、activity 5 初始单位、路线入口、纵向列车、装饰、Tipi spawn 与 Indian pool 分别验证；不要把活动单位、池单位和贴图对象混成同一实体。
- 100/101/130/131 对应的 Sniper、Grandpa、Pyromaniac、Salesman 解锁差异全部进入内容版本与回放快照；复用 M23 已发布的全局四位解锁编码与 replay factory 模式。Indian pool 模板为固定关卡内容，不再扩展解锁快照。
- 代表性 `GameSession` 检查首波真实敌人请求与 Tipi pool 状态/生成；不得完整推进 9 波或人工通关。
- 新关卡单测从 APK-derived inventory 断言完整地图、路线、实体坐标、所有波次调用和 pool actions；E2E 检查目录条目、关卡预览、Free Play 开局、正式锁定/解锁、首波对白/头像及资源请求，不用固定 fixture 替代真实场景。

## 未闭环项

| 项目 | 状态 | 处理 |
| --- | --- | --- |
| 100/101/130/131 新局单位 | M24-C 已按 APK marker 接入；M24-F1 builder 与版本工厂测试覆盖 16 种快照，Sniper、Grandpa、Pyromaniac、Salesman 分别受对应里程碑控制 | M24-F2 仍需验证 replay factory 在导入档案与录制档案不同时恢复相同地图单位。 |
| 印第安人池单位 | M24-C 接入 pool type 4 / Tipi type 3、pool-only template、wave-1 清零和上限 5；M24-D `GameSession` 验证真实雇佣后从 Tipi 生成 | `spawnPoolTimerMax` 的 APK 赋值仍未知；网页沿用的共享 15,000 ms cadence 不是 APK 已证实数值。 |
| `awesomeMessageMin` | 原值 30,000；消费语义仍未知 | 只复用已有且有证据的消费者，不新增规则。 |
| 最终原版渲染随机种子 | 资源/DEX 中使用时间种子 | 使用确定性候选帧索引验证几何与映射；不宣称像素级运行一致。 |
