# Mississippi 第 15 关：Railroad Canyon 静态审计

## 结论

**静态审计通过，可以开始内容接入。**正式战役第15关是 Railroad Canyon，实际资源为 `res/raw/td_map_18.tdm`。地图、六个出生点、路线、列车、可招募建筑、初始单位、九波、招募池及英文剧情均能由 APK 派生材料和对应 DEX 消费方法交叉确认；本轮无需启动 Android 或完整通关。

APK 包含 63 个 TDM 文件、正式战役有 60 关；本关使用 map18，不要把关卡序号直接当地图文件号。地图图块是静态数据，不是运行截图；路线图是静态可达性推导，不代表逐帧移动轨迹。

## 证据入口

研究资料位于 `R/`（按 Guns’n’Glory `AGENTS.md` 定位研究 worktree）。REA/JADX Java 是从 DEX 重建的参考文本，不是原始源码；遇到伪代码歧义时以 DEX、REA Evidence 和实际消费点为准。

| 标识 | 来源 | 可支持的结论与边界 |
| --- | --- | --- |
| `M15-MAP` | `R/data/map-inventory.json`；APK `res/raw/td_map_18.tdm`；`BasicMap.loadMap` | map18 的二进制网格、尺寸、逐格 marker 与关卡编号映射。 |
| `M15-TERRAIN` | `R/data/terrain-render-index.json`、`terrain-render-rules.json`；`BackgroundMap`、`Mississippi` | Mississippi 地面、道路、桥面、桥墩和图集裁切；背景变体是候选帧，不是某次原版运行所选帧。 |
| `M15-ROUTE` | `R/data/static-route-graph.json`；`EnemyDirector`、`EnemyDirectorField`、`PriorityMap` | action marker 推导出的路线节点、边和可达性；不包含单位帧动画、速度或碰撞实测。 |
| `M15-OBJECT` | `R/data/map-inventory.json`；`GameObjectManager.createGameObjectsFromBasicMap`、`GameObjectDecoration`、`GameObjectSpawnLocation` | 装饰、招募建筑、列车、Steamer、普通单位、存档标记的类型和位置。 |
| `M15-RULES` | `R/data/level-config.json`、`waves.json`、`wave-reference-resolution.json`；`GameDesignData`、`GameDesignWaves.setWaves`、`SpawnPoolManager` | 初态、九波和 32 条敌人生成请求；两个招募池动作按 `newWave` 调用顺序归组。 |
| `M15-TEXT` | `R/data/string-resources.json`、`wave-reference-resolution.json` | 关卡介绍、胜利标题、九段英文对白和头像资源键。APK 没有中文 locale，中译由网页提供。 |
| `M15-PROGRESS` | `campaign-catalog.ts`、`official-campaign.ts`、Progress/replay 接口；`GameObjectUnit.create/isUnlocked` | map18 为全球第15关；静态 marker 130/131 对应受里程碑影响的 type35/36。网页进度和回放语义仍须由实现测试验证。 |

## 地图与路线

- TDM 为 770 字节：前两个字节是 `32×24` 宽高，其余 768 字节按 y-major 顺序存放图块。APK 派生清单摘要为 `e7d6401689765628ea7c352610872f6d2679b16f280006ed113fd67b257903b8`；解码副本与该值一致。
- 地图使用 Mississippi 共用图集。道路/桥梁按地形索引和 `BackgroundMap` 绘制规则构建，不从路线 marker 猜桥面。网页使用既有固定 seed 策略，保证背景变体稳定；不宣称复现某次 Android 随机帧。
- 路线图有 45 个节点、46 条有向边：6 个出生点、33 个转向点、6 个出口。全部转向点和出口可达，无异常路径。

| 出生格 | 首个控制点 | 静态图可达出口 |
| --- | --- | --- |
| `(17,0)` | `(17,3)` | `(31,8)`、`(31,9)`、`(31,15)`、`(31,19)` |
| `(18,0)` | `(18,2)` | `(31,7)` |
| `(0,2)` | `(7,2)` | `(31,9)`、`(31,15)`、`(31,19)` |
| `(0,3)` | `(6,3)` | `(31,10)`、`(31,15)`、`(31,19)` |
| `(0,14)` | `(3,14)` | `(31,9)`、`(31,15)`、`(31,19)` |
| `(0,15)` | `(2,15)` | `(31,10)`、`(31,15)`、`(31,19)` |

路线实现应复用 `mississippi-map-routes.ts`，逐节点/边与 `static-route-graph.json` 核对；不得增加 A*、地形碰撞或视觉偏移来替代原有 action marker 逻辑。

## 静态对象与玩家单位

坐标为从零开始的 `(x,y)`。共用 Mississippi scene decoder 覆盖本图中代码 68、69、71、73–75、77、86–87、126；M15-A 已补入本图额外出现的 Saloon `112` 和纵向铁路缓冲块 `94/95`。资源映射分别是 `b_3x2_saloon`、`tiles_railway_buffers_verti_up/down`。

| Marker | 坐标/数量 | APK 语义与接入要求 |
| --- | --- | --- |
| `68`、`69`、`71`、`73`、`74`、`75`、`77` | 分别 1、3、1、3、2、2、1 个 | Mississippi 共享装饰映射：仙人掌、岩石、树、风车、水塔与骸骨；资源索引及碰撞以 scene decoder/既有对象规则为准。 |
| `86/87`、`94/95` | 水平左右缓冲块各1、纵向上下缓冲块各1 | 铁路末端装饰；使用对应水平/垂直 buffer 资源，不误作敌人路线或可雇单位。 |
| `112` | `(2,9)`，1个 | Saloon / spawn type 1；除作为招募位置，还要绘制 Saloon 建筑。 |
| `83/84` | 两组水平列车：`(3,6)` 起始共3节；`(22,12)` 起始共6节 | 由两节机车和活动/可雇货车 marker 组成；复用 `createHorizontalTrainPlacementGroups` 与 `createCampaignTrainUnits`，每组独立移动。 |
| `92/91` | `(11,12..15)` 四节货车，后接 `(11,16..17)` 两节机车 | 一组纵向六节列车；复用 `createVerticalTrainPlacementGroups`。 |
| `120/121/123` | `(19,22)` 起始，`121` 位于 x=21..23，`123` 位于 `(24,22)` | 一组横向 Steamer：type30/31 机车、三个 activity-4 type32 部件和 type33 尾件；沿用 `createMississippiSteamerPart` 和 Mississippi 水上移动规则。 |
| `104`、`105`、`107` | `(16,6)` Gunslinger、`(20,5)` Mexican、`(17,17)` Indian | 新局创建的活动单位，分别映射 unit type 1、2、4；使用地图单位原版配置。 |
| `130`、`131` | `(24,20)`、`(6,11)` | 新局分别尝试创建 type35 Pyromaniac、type36 Salesman；按 level50/60 解锁状态出现。回放 contentVersion 必须记录两个状态。 |
| `96/97/99/100/101` | 共13个 | 新局 activity 4 招募单位 marker：Gunslinger、Mexican、Indian、Sniper、Grandpa；Sniper/Grandpa受全局第40/30关解锁限制。 |
| `124`、`126` | 58格水域、2个水边岩石 | 水域由背景/不可行走层表达；126 为 `e_1x1_rocks_water` 装饰。 |

地图缩略图 `gng_levelmap_18.png`、Saloon、Mississippi 地形/桥梁/轨道、普通列车、Steamer、玩家单位和对白头像已在应用资源目录中。静态资源存在不等于预加载正确；由内容切片资源测试检查。音频不作为本批重点，不试听。

## 初始参数与生成池

关卡在 `level-config.json` 中是 `index: 14`（零起始；对应第15关）。

| 参数 | 值 |
| --- | ---: |
| 初始现金 / 生命 | `$365` / `20` |
| 升级上限 | 3 |
| 宝箱总数 / 间隔 / 场上上限 | 999 / 25,000 ms / 10 |
| Easy / Medium / Hard 敌人 HP | 75% / 100% / 115% |
| `awesomeMessageMin` / `awesomeMessageUnit` | 30,000 / 5；前者消费者仍未知，保留原值，不新增推断行为。 |

两条 `addActionForSpawnPool` 均在波次2：

| APK 调用 | 含义 |
| --- | --- |
| `(2, 1, 1, 1, 0, 0)` | action 1 = set；poolType 1 Gunslinger 和 poolType 2 Mexican 库存各设为 1。 |
| `(2, 3, 4, 4, 0, 0)` | action 3 = set-max；上述两类单位上限各为 4。 |

poolType 1/2 都能从 Saloon type 1 生成；本图没有 Fort 或 Tipi。`SpawnPoolManager` 会在全局生成计时器到期后选择可用单位及非忙碌 spawn 点，因此波次2的动作不是立刻同步生成。

## 九波内容

每行请求向量按应用十槽顺序 `[Settler×1, Settler×2, Settler×3, Settler×4, Rider, Covered Wagon, Post Coach, Gold Transport, Boss, Doc]` 表示。APK 每条调用提供前八项，网页契约在末尾补 `[0,0]`。下表各出生请求写为 `出生点@间隔ms [八槽向量]`。

| 波 | 对白头像 | 开始延迟 | HP / 速度 | 出生点请求 |
| ---: | --- | ---: | ---: | --- |
| 1 | Settlers | 15,000 ms | 250% / 100% | `0@2000 [1,1,1,2,3,2,0,0]`; `1@2000 [1,1,1,2,3,2,0,0]` |
| 2 | Settlers | 5,000 ms | 250% / 105% | `2@2000 [1,1,2,2,2,3,1,0]`; `3@2000 [1,1,1,2,3,2,0,0]` |
| 3 | Engineer | 5,000 ms | 250% / 110% | `1@2500 [1,2,1,2,3,3,1,0]`; `2@2500 [0,1,1,1,2,3,1,0]` |
| 4 | Mexican | 5,000 ms | 250% / 115% | `0@2500 [0,1,1,1,2,3,2,0]`; `3@2500 [1,2,1,2,3,3,2,0]` |
| 5 | Pedro | 5,000 ms | 225% / 110% | `0@2500 [0,1,1,1,2,3,1,0]`; `1@2500 [1,2,1,2,3,3,1,0]`; `2@2500 [0,1,1,1,2,3,1,0]`; `3@2500 [1,2,1,2,3,3,1,0]` |
| 6 | Gunslinger | 5,000 ms | 225% / 150% | `0@3500 [0,0,1,1,2,3,2,1]`; `1@3500 [1,0,1,0,2,3,2,1]`; `2@3500 [0,0,1,1,2,3,2,1]`; `3@3500 [1,0,1,0,2,3,2,1]` |
| 7 | Engineer | 5,000 ms | 300% / 110% | `0@3500 [0,0,1,1,2,3,2,1]`; `1@3500 [1,0,1,0,2,3,2,1]`; `2@4000 [1,1,0,0,3,3,2,1]`; `3@3500 [1,1,0,0,3,3,2,1]` |
| 8 | Gunslinger | 10,000 ms | 200% / 100% | `0@3500 [0,0,1,1,2,3,2,1]`; `1@3500 [1,0,1,0,2,3,2,1]`; `2@4000 [1,1,0,0,3,3,2,1]`; `3@3500 [1,1,0,0,3,3,2,1]`; `4@4000 [1,1,0,0,3,3,2,0]`; `5@3500 [1,1,0,0,3,3,2,0]` |
| 9 | Pedro | 5,000 ms | 300% / 110% | `0@3500 [0,0,1,1,2,3,2,1]`; `1@3500 [1,0,1,0,2,3,2,1]`; `2@4000 [1,1,0,0,3,3,2,1]`; `3@3500 [1,1,0,0,3,3,2,1]`; `4@4000 [1,1,0,0,3,3,2,1]`; `5@3500 [1,1,0,0,3,3,2,1]` |

符号常量按已解析资料展开：`DEFAULT_SWIPE_ANIMATION_DURATION = 250 ms`、`UNIT_BONUS_DURATION_FIRE = 5,000 ms`。分组以 `GameDesignWaves.java` 中每个 `newWave` 与其后 `addToWave` 的顺序为准；不能把 waves.json 分开的数组按行号误配。

## 英文文案与待验证边界

| 资源 | APK 英文 |
| --- | --- |
| `T_LEVEL_NAME_18` | Railroad Canyon |
| `T_LEVEL_INFO_18` | The huge railroad station in Railroad Canyon is almost complete, and very soon trains will be able to travel from there to the whole of the West! |
| `T_LEVEL_NAME_WON_18` | The Terror of Railroad Canyon |

| 波 | 资源 | 头像 / 英文对白 |
| ---: | --- | --- |
| 1 | `T_CAMPAIGN_15_01` | Settlers — Didn't you say that we could take the train from here? |
| 2 | `T_CAMPAIGN_15_02` | Settlers — Take the train? Sure, we could, but it's been delayed... they're still building the track! |
| 3 | `T_CAMPAIGN_15_03` | Engineer — All aboard! The train has just arrived in the happy hunting grounds! |
| 4 | `T_CAMPAIGN_15_04` | Mexican — Boss, I don't think even they know where to go! |
| 5 | `T_CAMPAIGN_15_05` | Pedro — I smell new victims! |
| 6 | `T_CAMPAIGN_15_06` | Gunslinger — I don't think it's the victims you can smell... |
| 7 | `T_CAMPAIGN_15_07` | Engineer — I'll use your gold to extend the railroad track! Home to me! |
| 8 | `T_CAMPAIGN_15_08` | Gunslinger — What the... now they're coming from the north, too! We have to hurry! |
| 9 | `T_CAMPAIGN_15_09` | Pedro — Dammit! We're in a tight spot! |

网页中文标题、简介、胜利标题、speaker 和对白由项目翻译；不把它们标为 APK 原文。静态资料中的 `awesomeMessageMin` 消费者未知，且音频未试听；这两项都不阻塞本关内容接入。英文文字、头像和图像资源由应用测试核对，不为此启动 Android。

## 实现验收门槛

| 项目 | 结论 | 实现侧验收 |
| --- | --- | --- |
| map18 身份与二进制 | 已闭环 | 生产 JSON/TDM 与 32×24、770 字节及摘要一致。 |
| 地形、桥面、静态对象和三类列车 | 静态证据充分 | 使用 APK 网格生成；逐类核对 renderer、坐标、活动状态和离线资源。 |
| 六个出生点及路线 | 静态图 6/6 出口、33/33 转向可达 | 生产路线节点/边与 `static-route-graph.json` 对照。 |
| 初态、九波及 Saloon 招募池 | 已映射至实际消费方法 | 真实 GameSession 初态、波次请求和波次2 pool set/set-max 通过定向规则测试。 |
| 双语剧情、Free Play、正式进度与回放 | 静态内容齐全，网页状态待实现 | 内容测试、三种难度入口、正式锁定/胜利、回放解锁快照测试和 E2E 通过。 |
| 随机地形帧、实际音效与完整通关 | 本批不作为门槛 | 沿用稳定网页 seed；默认静音；不进行完整人工通关。 |

**静态门槛通过。**可按[实施计划](implementation-plan.md)进入 M15 地图、规则、内容入口三个切片；不需要再重复 APK 启动页或同一关卡的 Android 观察。
