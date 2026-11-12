# Mississippi 第 14 关：Riverside Mountains 静态审计

## 结论

**静态审计通过，可以开始内容接入。**Riverside Mountains 是正式战役第 14 关，实际地图资源为 `res/raw/td_map_17.tdm`。地图、路线、对象、玩家生成池、难度参数、波次和英文文案均能追到 APK 派生数据与实际消费方法；当前不需要 Android 运行观察、完整通关或音效试听。

地图文件数量与关卡数量不能混为一谈：APK 含 63 个 TDM 文件，战役为 60 关；关卡 14 使用 map17。资源编号也不相同：波次对白是 `T_CAMPAIGN_14_01..07`，关卡标题、介绍和胜利资源则为 `T_LEVEL_NAME_17`、`T_LEVEL_INFO_17` 和 `T_LEVEL_NAME_WON_17`。

## 证据范围

目标为 Guns’n’Glory FREE 1.8.6，APK 位于 `~/Downloads/gunsnglory-1-8-6.apk`。应用文档用 `R/` 指向研究 worktree；需按 Guns’n’Glory `AGENTS.md` 定位该 worktree。REA/JADX 导出的 Java 为 DEX 重建视图，不是原作者源码。遇到反编译控制流与 DEX 冲突时，以 DEX 指令和 switch 表为准。

| 名称 | 资料与实际入口 | 能证明什么 / 边界 |
| --- | --- | --- |
| `MAP14-ID` | `R/data/map-inventory.json`；`campaign-catalog.ts`；`BasicMap.loadMap` | map17 的 32×24 网格及 campaign level 14 映射。清单的逐格内容来自 APK TDM；不等于设备运行截图。 |
| `MAP14-TERRAIN` | `R/data/terrain-render-index.json`、`terrain-render-rules.json`；`BackgroundMap`、`Mississippi` | Mississippi 地形、桥面、桥墩及图集裁切的静态绘制索引。variation 列出合法候选帧，不确定原版某次启动时抽到的帧。 |
| `MAP14-ROUTES` | `R/data/static-route-graph.json`；`EnemyDirector.createEnemyDirectorFieldsFromBasicMap`、`EnemyDirectorField`、`PriorityMap` | 从 TDM action marker 派生的有向路线和可达性；不是逐帧敌人轨迹。 |
| `MAP14-OBJECTS` | `R/data/map-inventory.json`；`GameObjectManager.createGameObjectsFromBasicMap`、`createSteamerFromMap`；`GameObjectDecoration`、`GameObjectSpawnLocation` | 新局单位、装饰、船组、存档标记和 Fort spawn 点的对象分派。地图装饰位图的碰撞与占格规则还需按现有消费者映射到网页模型。 |
| `MAP14-RULES` | `R/data/level-config.json`、`waves.json`、`wave-constant-resolution.json`；`GameDesignData`、`GameDesignWaves.setWaves`、`SpawnPoolManager` | 第14行初态、七波、18 个生成请求及波次2的 Cannon 生成池动作。波次行按 DEX/重建调用顺序分组，不按 JSON 中分开的数组猜测。 |
| `MAP14-TEXT` | `R/data/string-resources.json`、`wave-reference-resolution.json`；APK 字符串表和 `InGameGeneralMessageDialog` | 原版英文关卡名、简介、胜利标题、7 段对白及头像。APK 没有中文 locale；中译由网页新增。 |
| `MAP14-PROGRESS` | `campaign-catalog.ts`、`official-campaign.ts`、Progress 与 replay 接口；`GameObjectUnit.create/isUnlocked` | 正式关卡编号、前置关卡、Free Play 隔离与 Pyromaniac/Salesman 解锁快照。网页行为须由应用规则测试确认。 |

静态路线图是由 APK 字节码和地图构造的数据推导产物，不是 REA 原始 Evidence，也不是运行时验证。实现验收必须将生产路线定义与该图交叉核对，不能把 fixture 单独当作通过。

## 地图、地形与路线

- TDM 是 770 字节：宽、高各一个字节，之后是按 y-major 顺序排列的 `32×24` tile。map17 的网格与 `map-inventory.json` 逐格一致。
- 地形来自 Mississippi 共用图集。背景变体使用 APK 导出的每格候选集合；网页继续沿用已实现的固定 seed 策略保证重复运行一致，不声称复现原版按启动时间随机选出的某次贴图。
- 派生道路层有 4 组水平桥面：`(19,5)-(20,5)`、`(4,6)-(5,6)`、`(27,6)-(28,6)`、`(9,20)-(10,20)`；另有 19 个垂直桥面格，分布在 `(24,2..4)`、`(15,8..10)`、`(23,9..11)`、`(13,16..18)`、`(26,17..19)`、`(6,21..22)` 和 `(15,21..22)`。四组桥墩锚点分别为 `(19,5)/(20,5)`、`(4,6)/(5,6)`、`(27,6)/(28,6)`、`(9,20)/(10,20)`；左右桥墩分别使用 `tiles_bridge_pier_left/right`，不镜像补齐。
- TDM 的 `80` 是水平桥道路输入，`88` 是 Mississippi 地形/道路输入；敌人路线仍由独立的 40–46、48、52–65 action marker 决定。不能用“看起来像路”的桥面反推敌人路线。
- 路线图包含 70 个节点、75 条有向边：6 个出生点、60 个转向点、4 个出口。60/60 个转向点和 4/4 个出口均可达；没有异常路径。

| 出生格 | 初始方向 | 静态图可达出口 |
| --- | --- | --- |
| `(0,9)`、`(0,10)` | 向东 | `(31,10)`、`(31,11)` |
| `(0,17)` | 向东 | `(31,20)` |
| `(0,18)` | 向东 | `(31,20)`、`(31,21)` |
| `(9,23)` | 向北 | `(31,20)` |
| `(10,23)` | 向北 | `(31,20)`、`(31,21)` |

路线清单是静态图 reachability；它不覆盖步长、相遇时的碰撞、动画或实际游戏帧率。路线实现应复用 `mississippi-map-routes.ts` 从 marker 生成路径，并逐边与静态图比对。

## 对象、装饰与特殊单位

TDM marker 使用零起点坐标。以下位置与数量直接从 map17 原始网格计数；装饰资源语义由 `GameObjectManager` 和 `GameObjectDecoration` 的 DEX 分支确认。

| Marker | 坐标/数量 | APK 语义与网页接入要求 |
| --- | --- | --- |
| `68` | 5处：`(7,0)`、`(22,1)`、`(30,3)`、`(4,11)`、`(30,12)` | decoration id 1，`e_1x1_cactus_a`。当前 Mississippi scene decoder 未覆盖。 |
| `69` | 9处 | decoration id 2，`e_1x1_rocks_a`，当前共用 decoder 已覆盖。 |
| `73` | 2处：`(0,21)`、`(28,23)` | decoration id 6，`e_1x1_cactus_b`。当前共用 decoder 未覆盖。 |
| `77` | 2处：`(1,2)`、`(24,23)` | decoration id 10，`e_1x2_bones`。当前共用 decoder 未覆盖；静态占格包含本格及上一格（`fieldBlockBounds.top = -1`），必须保留骨骸两格高度。 |
| `105` | `(16,13)`，1个 | 普通地图单位 type 2 Mexican。 |
| `107` | `(24,7)`，1个 | 普通地图单位 type 4 Indian；沿用现有关卡解锁/活动单位构造。 |
| `113` | `(14,4)`，1个 | `GameObjectSpawnLocation` type 2，即 Fort 生成位置。地图只有 Fort，没有 Saloon 或 Tipi 生成位置。 |
| `120`、`121`、`123` | 起点 `(2,13)`、`(22,14)`；4个 `121` 分在两组中；尾标记 `(6,13)`、`(26,14)` | 两组互相独立的蒸汽船，每组 2 个船体件、2 个休眠 type32 炮件、1 个尾件，共10个组件。没有 code122，船上没有活动炮件。 |
| `130`、`131` | `(18,3)`、`(5,20)` | 新地图创建分支尝试创建 type35 Pyromaniac 和 type36 Salesman，并分别受 `GameObjectUnit.create/isUnlocked` 里程碑规则控制；内容版本须记录两个解锁位，以免回放受导入者档案影响。 |
| `96–101` | 18格：96×6、97×5、99×3、100×1、101×3 | 新局创建 activity 4 可招募单位：Gunslinger、Mexican、Indian，以及受全局 level 30/40 条件限制的 Grandpa/Sniper。 |
| `124`、`125` | 共48格 | 水域标记；背景层映射到 Mississippi water atlas，`isFreeToWalk` 将其判为不可走。不是 GameObject 单位或新装饰。 |

原始 DEX 中 `createGameObjectsFromBasicMap` 位于 `0x407cd0`。`130/131` 的 switch 目标按 `fromLoadGame == false` 创建 type35/36；反编译 Java 对应分支存在空块表现，不能据该 Java 伪码把它误判为“仅存档恢复”。研究内容清单目前对此分支的文字说明与 DEX 不一致；本实现以 DEX switch、`GameObjectUnit.create/isUnlocked` 及 M13 已使用的解锁快照契约为准，并避免把该分歧扩展成新的玩法假设。

`GameObjectManager.smali` 中96–101与130/131均进入新局对象创建分支：`fromLoadGame == false` 时创建 activity 4 单位，读档时跳过这些 TDM 初始对象并恢复存档状态。网页继续按产品约定将未完成关卡从初态重开，但不能因此从新局内容中删除这些 APK 单位。`td_map_17.tdm` 没有 `132` Gambler 或 `150` Casino spawn marker，不创建 Gambler/Casino；虽然 level-config 有 `gamblerTime`，不能仅凭该字段生成对象。

代码和图片资源状态：应用已有 `gng_levelmap_17.png`、五种波次头像（Settlers、Gunslinger、Mexican、Pedro、Indian）、Mississippi 地形图集、桥面/桥墩、三种新增装饰图片、Fort 建筑图及 `music_loop2_mississippi.ogg`。code113 在 APK 中是位于 `(14,4)` 的 type-2 Fort 出生位置；网页用已有 `b_3x2_fort` 图像、锚点和碰撞范围表现这个位置，这是复用其他 Fort 关卡的网页渲染映射，不表示 APK 又创建了一个独立地图对象。当前 M14 场景 decoder 已补上 code68、73、77 装饰、code113 Fort 表现及 map17 场景数据。运行时预加载是否完整由应用测试验证；本批保持静音，不测试声音播放。

## 关卡参数、玩家生成池与波次

`level-config.json` 的 `index: 13` 为战役第14行；不要用 `index: 14`。初态字段如下：

| 参数 | 值 | 说明 |
| --- | ---: | --- |
| 初始现金 | 365 | 美元 |
| 初始生命 | 25 | — |
| 宝箱总数上限 | 999 | 与单屏上限分开 |
| 宝箱间隔 | 25,000 ms | — |
| 单屏宝箱上限 | 10 | — |
| 升级上限 | 3 | — |
| Easy / Medium / Hard 敌人 HP | 75% / 100% / 115% | 关卡难度倍率 |
| 赌徒时间 | 119,000 ms | 本地图无 Gambler/Casino marker，不创建其对象 |
| `awesomeMessageMin` / `awesomeMessageUnit` | 30,000 / 5 | 前者消费者仍未知；保留原值，不据名称发明新规则。 |

原始调用顺序来自 `GameDesignWaves.java` 的 `if (i == 14)` 分支（重建源码约第409–436行）和 `waves.json`。符号常量已核实：`GameObjectShot.UNIT_BONUS_DURATION_FIRE = 5,000 ms`、`ItemTouchHelper.Callback.DEFAULT_SWIPE_ANIMATION_DURATION = 250 ms`、`PathInterpolatorCompat.MAX_NUM_POINTS = 3,000 ms`。下表请求向量扩为现有网页十槽契约；APK 每行实际给前八槽，Boss/Doc 两槽均补0。

槽位顺序为 `[Settler×1, Settler×2, Settler×3, Settler×4, Rider, Covered Wagon, Post Coach, Gold Transport, Boss, Doc]`。

| 波 | 对白头像 | 延迟 | HP / 速度 | 出生点：间隔 ms → 十槽请求向量 |
| ---: | --- | ---: | ---: | --- |
| 1 | Settlers | 15,000 | 300% / 100% | `0: 2,000 → [1,1,1,2,3,2,0,0,0,0]` |
| 2 | Gunslinger | 5,000 | 300% / 110% | `0: 2,000 → [1,1,2,2,2,3,1,0,0,0]` |
| 3 | Mexican | 5,000 | 250% / 110% | `0: 2,500 → [0,1,1,1,2,3,1,0,0,0]`; `1: 2,500 → [1,2,1,2,3,3,1,0,0,0]` |
| 4 | Pedro | 15,000 | 150% / 115% | `2: 3,000 → [1,0,2,2,3,4,1,0,0,0]`; `3: 3,000 → [1,2,2,2,3,3,2,1,0,0]` |
| 5 | Mexican | 5,000 | 225% / 115% | `2: 3,500 → [0,0,1,2,2,3,1,1,0,0]`; `3: 3,500 → [0,0,1,2,2,2,1,0,0,0]` |
| 6 | Mexican | 5,000 | 180% / 150% | `0/2: 3,500 → [0,0,1,1,2,3,2,1,0,0]`; `1/3: 3,500 → [1,0,1,0,2,3,2,1,0,0]` |
| 7 | Indian | 5,000 | 275% / 110% | `0: 3,500 → [0,0,1,1,2,3,2,1,0,0]`; `1: 3,500 → [1,0,1,0,2,3,2,1,0,0]`; `2/3/4: 4,000/3,500/4,000 → [1,1,0,0,3,3,2,1,0,0]`; `5: 3,500 → [1,1,0,0,3,3,2,1,0,0]` |

共 7 个 `newWave`、18 个 `addToWave`。波次2还配置 Cannon 生成池：

| APK 调用 | action 映射 | poolType 1–4 的值 | 关卡效果 |
| --- | --- | --- | --- |
| `addActionForSpawnPool(2, 1, 0, 0, 2, 0)` | action 1 = set | `[0,0,2,0]` | 第2波时将 poolType 3（Cannon）库存设为2。 |
| `addActionForSpawnPool(2, 3, 0, 0, 4, 0)` | action 3 = set-max | `[0,0,4,0]` | Cannon 库存上限为4。 |

poolType 3 对应单位 `cannon` 和 spawn type 2（Fort），唯一 spawn marker 为 `(14,4)`。动作中的“第2波”是 waveNumber=2，不是第二个调用序号。波次请求、spawnPool 动作分组必须按照 `GameDesignWaves` 的 `newWave` 后续 `addToWave` 顺序复算。

## 英文资源和网页中译

关卡标题和文案资源编号为17：

| 资源 | APK 英文 |
| --- | --- |
| `T_LEVEL_NAME_17` | Riverside Mountains |
| `T_LEVEL_INFO_17` | The Riverside Mountains invite you to explore the vast number of valleys, and provide ideal routes for anyone with wanderlust. |
| `T_LEVEL_NAME_WON_17` | The Sinister Echo of the Riverside Mountains |

对白资源组编号为14：

| 波 | 资源 | 头像 / 声音路由 | APK 英文原文 |
| ---: | --- | --- | --- |
| 1 | `T_CAMPAIGN_14_01` | Settlers / `sound_siedler` | I can't help feeling we forgot something... |
| 2 | `T_CAMPAIGN_14_02` | Gunslinger / `sound_desperado_yihaa` | Of course, you forgot something... to take out a life insurance policy! |
| 3 | `T_CAMPAIGN_14_03` | Mexican / `sound_mexican_arriba` | What a lovely view from up here, Boss! It must be all those pretty lady settlers! |
| 4 | `T_CAMPAIGN_14_04` | Pedro / `sound_pedro` | The deeper the valley, the higher the quota of settlers! |
| 5 | `T_CAMPAIGN_14_05` | Mexican / `sound_mexican_arriba` | Señor, I need more settlers... fast! I already lit my dynamite! |
| 6 | `T_CAMPAIGN_14_06` | Mexican / `sound_mexican_arriba` | There isn't enough dynamite for what we need here! |
| 7 | `T_CAMPAIGN_14_07` | Indian / `sound_indian_hugh` | White man and white woman everywhere. Hear war cry of my tribe! |

声音资源名是静态调用/映射信息，本批默认静音；不把文件存在或映射命中描述为已试听。Chinese locale 在该 APK 的资源表中为空，中译应标为项目新增翻译，不伪装成原版文本。

## 正式关卡、Free Play 与回放

- `campaign-catalog.ts` 已列出第14关 Mississippi / Riverside Mountains、map file 17、标题 resource 17；正式可玩关卡当前接到 level 13。
- 正式内容标识使用 `campaign-mississippi-14`，前置依赖 `campaign-mississippi-13`。只有正式胜利推进 campaign 进度。
- Free Play 继续可直接选择已实现关卡和三种难度，不写正式完成度或高分；从当前 profile 快照读取 Pyromaniac/Salesman 解锁，但不覆盖正式战役难度。
- 回放 `contentVersion` 必须编码 type35/36 是否已解锁并还原该快照，不能读取导入者当前 profile 代替录制环境。
- 未完成战局仍按产品规格从关卡初态重开；网页不实现 APK 的存档续玩，但这不改变新局应从 TDM 创建96–101单位的事实。

## 非阻塞边界

| 项目 | 结论 | 对本批的处理 |
| --- | --- | --- |
| 某次原版启动时选择的随机地形帧 | 不能只靠 APK 静态资料锁定；原版用运行时随机源。 | 使用已验证的稳定网页 seed，覆盖所有候选帧合法性；不启动 Android。 |
| `awesomeMessageMin=30000` 的独立消费语义 | 当前未找到可靠消费者；数值本身已核对。 | 保存并暴露原始值，不新增依赖该值的玩法。 |
| 中文原文 | APK 没有 zh locale。 | 提供明确的网页翻译。 |
| 音效是否实际播放 | 静态声音映射不是播放观察。 | 静音测试，不试听，不作为地图内容阻塞项。 |
| 完整实战路线 | 静态图只证明 marker 图连通。 | 生产路线与数据图比较；不完整手动通关。 |

**结论：无阻塞项。**按 [M14 实施计划](implementation-plan.md)接入地图、路线、对象、数值、对白和正式关卡，并在批次收尾执行完整 CI 与代表性浏览器验证。
