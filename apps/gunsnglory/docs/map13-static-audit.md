# Mississippi 第 13 关：Golden River 静态审计

## 审计结论

**静态审计通过，可以开始接入。**Golden River 是正式战役第 13 关，读取 APK 的 `res/raw/td_map_16.tdm`。地图为 32×24；4 个出生点分别通向 4 个出口，48 个转向点全部可达，路线图无死路或异常路径。关卡包含两组蒸汽船、一个必定可用的 Indian、受全局里程碑控制的 Pyromaniac 与 Salesman、9 波及 20 个敌人生成请求，没有玩家生成池动作。

地图、路线、关卡参数、波次、对白、对象和解锁规则都有 APK 静态资料与消费路径支持。没有需要启动 Android 才能确认的关键项。背景变化使用 APK 的无种子共享随机数；网页固定随机种子只保证重现性，不声称重现某次原版启动。`awesomeMessageMin=30000` 的消费者仍未知，但此字段对本关无已证实的独立玩法影响，不阻塞接入。

## 证据与适用边界

目标 APK 为 Guns’n’Glory FREE 1.8.6；SHA-256：`49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56`。REA/JADX 材料位于研究 worktree；项目文档以 `R/` 指向该资料。JADX Java 是 DEX 重建结果，不是原作者源码；地图路线和地形是依据 APK 数据及消费者逻辑作出的静态推导。

| 证据名 | 资料与代码入口 | 结论边界 |
| --- | --- | --- |
| MAP13-ID | `R/data/map-inventory.json`；`BasicMap.loadMap(int)`；应用 `campaign-catalog.ts` | map16 对应 campaign level 13；资源数 63 与可玩关数 60 是不同概念。 |
| MAP13-TERRAIN | `R/data/terrain-render-index.json`、`terrain-render-rules.json`；`Mississippi`、`BackgroundMap` | 32×24 背景/道路、桥面和桥墩的 APK 派生绘制数据。固定 seed 是网页重现策略，不是原版逐次随机结果。 |
| MAP13-ROUTE | `R/data/static-route-graph.json`；`EnemyDirector`、`EnemyDirectorField`、`Wave.setContentForSpawnPoint()` | TDM action 控制点的有向静态可达性；不是逐帧敌人轨迹或视觉截图。 |
| MAP13-OBJECTS | `R/data/map-inventory.json`；`GameObjectManager.createGameObjectsFromBasicMap()`、`createSteamerFromMap()`、`GameObjectDecoration`、`GameObjectUnit.isUnlocked()` | 新局对象、船组解析、装饰编号及单位解锁条件。恢复专用标记不应错误当作新局单位。 |
| MAP13-RULES | `R/data/waves.json`、`level-config.json`、`wave-constant-resolution.json`；`GameDesignWaves.setWaves(...,13)`、`restartLevel()`、`SpawnPoolManager` | 9 波、20 个生成请求、十槽位请求向量、初始经济与难度。 |
| MAP13-TEXT | `R/data/string-resources.json`；`InGameGeneralMessageDialog.setUpDialog()` | 英文原文、头像和通用语音映射。中文由网页补充；本次不播放音频。 |
| MAP13-PROGRESS | `campaign-catalog.ts`、`official-campaign.ts`、Progress 与回放接口 | 关卡编号、先后解锁、正式结算、Free Play 隔离和回放所需的里程碑快照。 |

## 地图、地形与路线

- 地图资源为 `res/raw/td_map_16.tdm`，SHA-256：`274d0112ddc75fe0165398ce6628bc36b92dcbe5e254a9f86d049326e6377b35`；770 字节由 32×24 网格和宽高字节组成。
- 地图清单把 map16 标为 Mississippi campaign level 13 且实际使用。原版 campaign 总计 60 关；APK 中 63 个 TDM 文件不能直接当作 63 关。
- 地形需从 `terrain-render-index.json` 的 map16 矩阵生成。它包含背景候选、道路候选及两处桥墩：`(8,19)` 左桥墩、`(9,19)` 右桥墩。桥墩按索引中的原始位置绘制，不镜像补齐。
- 派生道路格值为 64 的横桥位于 `(8,10)`、`(9,10)`；值 76 的纵桥格位于 `(11,13)`、`(12,13)`。路线要从独立 action marker 生成，不从道路外观猜路线。
- 路线图有 56 个节点：4 个 action-1 出生点、48 个 action-2 转向点、4 个 action-3 出口；共 52 条有向边。四个出生点都朝东且各自可达其对应出口：`(0,7)→(31,6)`、`(0,8)→(31,7)`、`(0,16)→(31,18)`、`(0,17)→(31,19)`。48 个转向点和 4 个出口全部可达，没有 exceptional path。

## 地图对象与新局单位

| TDM 标记 | 位置/数量 | 语义与网页边界 |
| --- | --- | --- |
| 120–123 | 两组：`y=11, x=2–7`；`y=12, x=20–25` | 每组由 120 开始向右扫描至 123 结束；120 建 type30/31，121 建休眠 type32，122 建活动 type32，123 建 type33。合计 12 个部件：type30/31/33 各 2 个、type32 共 6 个（5 休眠、1 活动）。使用两个独立 movement group。 |
| 107 | `(10,6)`，1 个 | 活动 type4 Indian。APK 解锁表没有 type4 条目，因此按 `isUnlocked()` 的无解锁记录分支始终可见。 |
| 130 | `(23,22)`，1 个 | 休眠 type35 Pyromaniac；完成全局关卡50里程碑后才创建。 |
| 131 | `(12,7)`，1 个 | 休眠 type36 Salesman；完成全局关卡60里程碑后才创建。 |
| 69、70、71、76 | 分别 7、6、4、1 个；code76 在 `(11,6)` | 依次为 rocks A、rocks B、tree、bush。当前共享 Mississippi scene decoder 缺少 code76；`GameObjectDecoration` 将 decoration id 9 绘制为 `e_1x1_bush`，map16 原始 code76 应被映射为该装饰。 |
| 96、97、99、101 | 分别 7、7、5、2 个 | APK 仅在加载战局时创建的休眠单位标记；不要当作新局额外可雇用角色。网页未完成战局从关卡初态重开。 |

地图没有 code132，因此不创建 Gambler/Casino；没有 `spawnPoolActions`，也没有列车 marker。代码107 Indian 属常规玩家单位；Pyromaniac/Salesman 的可见性受各自全局里程碑影响。两种特殊单位都必须进入 `contentVersion`，否则回放会受导入者当前档案影响。

## 初始参数与波次

level-config `index: 12`：初始现金 `$365`、生命 25、升级上限 3、宝箱总数 999、间隔 25,000 ms、场上上限 10；Easy/Medium/Hard 敌人 HP 倍率为 75%/100%/130%。`gamblerTime=119000` 在本图没有 Gambler marker，因而不产生对象。`awesomeMessageUnit=5` 的现有阈值语义沿用已实现关卡；`awesomeMessageMin=30000` 的消费者仍未知，不得据字段名发明行为。

请求向量依 APK `addToWave` 顺序解释，十个槽位为 `[Settler×1, Settler×2, Settler×3, Settler×4, Rider, Covered Wagon, Post Coach, Gold Transport, Boss, Doc]`。源调用只列出前八槽；后两槽按零处理。`MAX_NUM_POINTS=3000 ms`，`DEFAULT_SWIPE_ANIMATION_DURATION=250 ms`，`UNIT_BONUS_DURATION_FIRE=5000 ms`。

| 波 | 延迟 | HP / 速度 | 头像 | 出生点：间隔与八槽请求向量 |
| ---: | ---: | ---: | --- | --- |
| 1 | 15,000 | 300% / 105% | Settlers | 0: 2000 `[1,1,1,2,0,0,0,2]` |
| 2 | 5,000 | 300% / 105% | Gunslinger | 0: 2000 `[1,1,2,2,1,0,0,3]` |
| 3 | 5,000 | 300% / 110% | Mexican | 0: 2500 `[0,1,1,1,1,0,0,2]`; 1: 2500 `[1,2,1,2,1,0,0,2]` |
| 4 | 5,000 | 250% / 115% | Pedro | 0: 3000 `[1,0,2,2,1,0,0,2]`; 1: 3000 `[1,2,2,2,2,0,0,2]` |
| 5 | 10,000 | 180% / 100% | Settlers | 2: 3500 `[0,0,1,2,2,0,0,1]`; 3: 3500 `[0,0,1,2,2,0,0,2]` |
| 6 | 5,000 | 200% / 150% | Settlers | 2: 3500 `[0,0,1,1,2,0,0,3]`; 3: 3500 `[1,0,1,0,2,0,0,3]` |
| 7 | 5,000 | 225% / 115% | Gunslinger | 2: 4000 `[1,1,0,0,3,0,0,3]`; 3: 3500 `[1,1,0,0,3,0,0,3]` |
| 8 | 8,000 | 250% / 115% | Deserter | 0: 4000 `[1,1,0,0,3,0,0,2]`; 1: 3500 `[1,1,0,0,3,0,0,1]`; 2: 4000 `[1,1,0,0,3,0,0,2]`; 3: 3500 `[1,1,0,0,3,0,0,1]` |
| 9 | 5,000 | 250% / 115% | Gunslinger | 0: 4000 `[1,1,0,2,3,0,0,4]`; 1: 3500 `[1,1,0,2,3,0,0,3]`; 2: 4000 `[1,1,0,2,3,0,0,4]`; 3: 3500 `[1,1,0,2,3,0,0,3]` |

共 9 个 `newWave`、20 个 `addToWave`、0 个玩家生成池动作。`addToWave` 首参是出生点索引 0–3；不能从波次数字或数组排列推导出生点。

## 对白与资源

原版关卡名为 **Golden River**，简介为 “Many cowboys have already become rich men at Golden River.”，胜利标题为 “The Robber of Golden River”。下列对白按原资源保留；中译是网页本地化：

| 波 | 英文原文 | 头像 | 原版头像语音 |
| ---: | --- | --- | --- |
| 1 | Hurry, honey! I want to go off and prospect for a little more gold while we're here. | Settlers | `sound_siedler` |
| 2 | Finders, keepers! And I found you! | Gunslinger | `sound_desperado_yihaa` |
| 3 | Boss, what's a gold rush? Is it dangerous? | Mexican | `sound_mexican_arriba` |
| 4 | Is a gold rush dangerous? Only for other people! | Pedro | `sound_pedro` |
| 5 | Maybe we'll have better luck on the other side! | Settlers | `sound_siedler` |
| 6 | Honey, I can see something shiny! Is it gold? | Settlers | `sound_siedler` |
| 7 | That's not gold! That's my gun, ma'am! | Gunslinger | `sound_desperado_yihaa` |
| 8 | We have golden times ahead! Never have the north and south together looked so promising! | Settlers | `sound_siedler` |
| 9 | The gold deposits should be exhausted soon! Let's get away from these stragglers! | Deserter | `sound_deserter_yes_sir` |

资源检查确认地图缩略图、Mississippi 地形图集、`e_1x1_bush`、Indian 角色、五种对白头像、对应 OGG 和 Mississippi 音乐已在应用 `public/assets`。将场景资源接入唯一预加载清单仍是实现验收项；资源文件存在不等于已被加载。批次测试保持静音，不将资源存在性写成音效播放验证。

## 正式进度与回放

关卡目录已将 Golden River 列为全球 level 13、map file 16；正式战役当前止于 level 12。正式 id 应为 `campaign-mississippi-13`，依赖 `campaign-mississippi-12`，仅正式胜利结算推进进度。Free Play 可直接选择已实现关卡且不写战役完成状态。录制版本须分别编码全局 level 50 的 Pyromaniac 与 level 60 的 Salesman 解锁状态，并能按该快照还原；不能依赖回放导入者档案。

## 门槛状态

| 项目 | 证据结论 | 阻塞状态 |
| --- | --- | --- |
| APK/map 身份与大小 | 静态清单、campaign 编号与地图宽高一致 | 已闭环 |
| 地形、静态对象与桥墩 | APK 派生索引可复核；code76 的网页映射缺失已明确 | 已闭环，可按计划修复 |
| 出生点、路线与出口 | 4 条主干全部可达；48/48 转向点和 4/4 出口可达，无异常路径 | 已闭环 |
| 单位、船组及里程碑 | marker 消费分支、船组件状态、level50/60 解锁已确认 | 已闭环 |
| 初态、9 波与生成池 | 参数和 20 个请求已映射到实际消费方法；玩家 pool 为空 | 已闭环 |
| 文案、头像、声音与资源清单 | 引用和既有文件可核对；运行中是否成功加载由浏览器测试验收 | 静态已闭环，加载仍待实现 |
| 无种子贴图变体抽样 | 无法仅凭 APK 候选表锁定某次 Android 运行选择 | 不阻塞：使用稳定网页 seed，覆盖候选合法性 |
| `awesomeMessageMin` 消费者 | 尚未找到消费点 | 不阻塞：保留证据值，不为它新增行为 |

**静态门槛通过。**实现开始前不需要进一步 APK 逆向或 Android 运行观察。按[实施计划](implementation-plan.md)拆分内容接入、测试和发布。
