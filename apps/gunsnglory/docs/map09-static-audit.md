# New Mexico 第 9 关：Railroad Ranch 静态审计

## 审计结论

Railroad Ranch 是 New Mexico 第 9 关，地图为 32×24，共 768 个格子；APK 的 TDM 文件含 2 字节尺寸头，共 770 字节。路线图有两个右侧出生点、两个左侧出口和多处分支。关卡包含 3 个水平列车组、3 个垂直列车组和 4 组炸药对象。内容数据配置 7 波、11 次敌人请求。

网页已逐字节导入 APK 的 TDM，并接入静态背景与 street 地形层。切片 1.2 已新增路线、场景、列车与炸药模块：28 个方向节点、两个出生点、两个出口、六个独立列车组、57 个装饰和四组炸药均按原始格网生成；静态图共 36 条有向边，其中 34 条来自 redirect 节点，另有两条出生点到首个 redirect 的边。切片 2.1 已接入正式开局参数和七波、11 个敌人请求；切片 2.2 已接入双语文案、七段对白、正式战役登记、Free Play、进度结算和回放版本映射。正式战役第 9 关以前置 map08 解锁，Free Play 可直接进入；回放版本保留炸药解锁快照。无玩家生成池动作和招募建筑的判断按 APK 静态调用与地图对象核对。定向内容测试、类型检查及相关浏览器 E2E 均通过；整批完整检查和发布仍待完成，无需重写列车物理。

本报告基于 APK 资源和静态反编译材料，路线图是从地图及 DEX 方向场逻辑派生的静态图，不是 Android 运行观察。REA/JADX 输出与去编译后的伪代码不是原始 Java 源码；没有完整推进或通关原版关卡。

## 证据来源与适用范围

研究材料位于研究分支 `codex/gunsnglory-spec` 的 `apps/gunsnglory/docs/research/`。下表按语义命名，避免把长摘要值当作主要索引。

| 证据名 | 研究材料 | 支持的结论与边界 |
| --- | --- | --- |
| MAP09-TDM | `data/map-inventory.json` 中 `td_map_09.tdm` 条目 | APK 原始格网尺寸、格值频数、格网和资源摘要；清单由 APK 的原始地图数据派生 |
| MAP09-ROUTES | `data/static-route-graph.json` 中地图 09 条目；`evidence/dex/EnemyDirector.dexdump.txt`、`EnemyDirectorField.dexdump.txt`、`PriorityMap.dexdump.txt` | 两个出生点的方向场节点、连接和可达路径。路线图是派生算法结果，不等同于 REA 直接证据或运行观察 |
| MAP09-TERRAIN | `data/terrain-render-index.json` 中 `td_map_09.tdm` 条目；New Mexico `drawStreetLayer` 的静态方法证据 | 原始格网经地形变化后对应的背景/street 候选、贴图图集和桥墩位置。该索引是 APK 源码与资源派生结果，不是逐像素 Android 运行截图 |
| MAP09-TRAINS | `data/train-map-object-inventory-2026-10-23.json` 中地图 09 条目；`GameObjectManager.dexdump.txt`、`TrainHorizontal.dexdump.txt`、`TrainVertical.dexdump.txt` | 列车 marker 的分组、对象类型、activity 与组件坐标；inventory 是对 marker 的静态遍历，不执行 Android 对象创建 |
| MAP09-OBJECTS | `GameObjectManager.dexdump.txt`、`recovered-source/java/com/hg/gunsandglory/gamelogic/GameObjectManager.java`、`DynamiteTrigger.dexdump.txt`、`DynamiteBox.dexdump.txt`、`BackgroundMap.dexdump.txt` | 地图码到单位/装饰/图层的创建分支，炸药触发器与炸药箱行为；恢复源码是 DEX 去编译结果，遇到冲突时以 DEX 分支及类型转换核对 |
| MAP09-PARAMETERS | `data/level-config.json` 中第 9 行；`content-inventory.md` | 开局值、难度倍率、波次数与 `addToWave` 调用数；不把字段名未知的原始数值扩展成新语义 |
| MAP09-WAVES | `data/waves.json` 中 `levelId: 9`；`data/wave-constant-resolution.json`；`evidence/dex/WaveManager.dexdump.txt` | 七个 `newWave` 及 11 个 `addToWave` 调用、符号常量解析、请求所属的当前波次 |
| MAP09-TEXT | `data/string-resources.json` 的 `T_LEVEL_INFO_09`、`T_LEVEL_NAME_09`、`T_LEVEL_NAME_WON_09` 和 `T_CAMPAIGN_09_01`–`07`；研究分支 `apps/gunsnglory/docs/research/recovered-source/java/com/hg/gunsandglory/GameScreenActivity.java` 与 `apps/gunsnglory/docs/research/recovered-source/java/com/hg/gunsandglory/game/InGameGeneralMessageDialog.java` | APK 英文简介、名称、胜利标题、对白原文，以及波次对白使用的头像语音分支；Recovered Java 是反编译产物 |
| MAP09-ASSETS | `data/resource-inventory.json` 与网页 `public/assets/` | APK 资源和当前网页资源是否存在；存在资源不代表音画调用路径已经验证 |
| MAP09-WEB-GAP | 当前 `campaign-catalog.ts`、`official-campaign.ts`、`campaign-map-unit-placements.ts` 和关卡内容文件 | 当前网页实现状态及 map09 接入所需的明确代码改动 |

## 关卡身份与开局参数

- APK 关卡目录把 `td_map_09.tdm` 用作 New Mexico 第 9 关 Railroad Ranch。简介为：“The birthplace of the American railroad. The east and west coasts will soon be connected by busy trains.” 胜利标题为“The Railroad Ranch Avenger”。
- APK 总地图文件数为 63，但完整战役是 60 关：New Mexico 使用 map01–10，后续区域使用 map14–63；map11–13 不属于战役映射。地图文件数不能当作关卡数。
- 关卡配置原始行索引为 8，对应人类关卡编号 9。网页前置关系应使用 New Mexico 第 8 关完成状态；Free Play 继续遵循已有隔离规则。

| 参数 | 原始值 | 可确认的含义 |
| --- | ---: | --- |
| 开始现金 | 600 | 开局余额 |
| 初始生命 | 25 | 开局生命 |
| 宝箱总上限 | 0 | 本关不投放普通宝箱 |
| 宝箱时间字段 | 25,000 ms | 保留表值；宝箱上限为 0，因此不据此另造投放行为 |
| 最大升级级数 | 3 | 本关升级上限 |
| Awesome 消息最小阈值字段 | 30,000 | 保留原始数值；没有在本报告中扩大字段语义 |
| Awesome 消息单位阈值 | 5 | 触发单位阈值字段 |
| 同时存在宝箱上限字段 | 32 | 保留表值；不代表本关实际投放 32 个宝箱 |
| 难度 HP 倍率 Easy / Medium / Hard | 75% / 100% / 125% | 关卡难度表倍率；波次 HP 倍率是另一组独立配置 |
| Gambler 冷却字段 | 119,000 ms | 数据表中有值；地图没有赌场标记，不由此推出本关会出现 Gambler |

网页关卡参数将开始现金、初始生命、升级上限和难度倍率用于 `previewWave`；宝箱上限为 0，因此没有添加宝箱池。原始 `chestTime=25000` 与 `maxChestsPlayfield=32` 保留在审计数据中，不据此生成宝箱。`awesomeMessageMin=30000` 没有对应的当前内容属性，不猜测其时间语义；`gamblerTime=119000` 也不构成添加 Gambler 的依据。

## 格网、路线与静态场景

TDM 按 `[width:u8, height:u8, y-major cell bytes]` 编码。map09 的格网尺寸为 32×24，地图原点在左上，x 向右、y 向下。类别计数合计 768 格：

| 类别 | 原始码与数量 |
| --- | --- |
| 地面/路面基础层 | `0×345`、`16×10`、`32×124`、`36×88` |
| 出生点与出口 | `40×1`、`41×1`、`48×2` |
| 方向场/分支 marker | `52×4`、`53×4`、`54×14`、`56×1`、`58×4`、`60×1` |
| 装饰及小型场景物件 | `68×8`、`69×6`、`70×6`、`71×6`、`72×1`、`73×6`、`74×1`、`75×6`、`76×14`、`77×1`、`116×1`、`117×1` |
| 铁轨/缓冲器 marker | `81×3`、`82×30`、`86×3`、`87×3`、`89×10`、`90×24`、`94×3`、`95×3` |
| 列车组成 marker | `83×6`、`84×7`、`91×6`、`92×4`、`93×2` |
| 炸药对象 | `102×4`、`110×4` |

`40` 与 `41` 的出生格分别为 (31,6)、(31,17)；两个 `48` 出口为 (0,5)、(0,16)。静态方向图有 32 个节点（28 个 redirect、2 个出生点、2 个出口）和 36 条有向边：34 条 redirect 出边，加上两条出生点到首个 redirect 的边。逐分支枚举得到每个出生点各 7 条不重复路径，共 14 条起点到出口路径：

| 出生点 | 到 (0,5) 的路径数 | 到 (0,16) 的路径数 | 主要分支 |
| --- | ---: | ---: | --- |
| (31,6) | 4 | 3 | 先经 (26,6) 分为上方回路或沿中部向南；经 (5,11) 可选择西北或继续南下 |
| (31,17) | 3 | 4 | 经 (26,17) 分为中部回路或南侧回路；南侧可经 (14,20) 汇入中部，也可向西到南出口 |

关键方向场 marker：`58` 位于 (26,6)、(5,11)、(22,11)、(26,17)；`56` 位于 (14,20)；`60` 位于 (15,1)。完整节点与边在静态 route graph 中，测试不得用一条代表性路线代替 14 条路径覆盖。该图的限制是从 APK 数据和方向场函数静态派生，未在 Android 运行时观察。

地形索引显示，原始 tile `81` 在 (15,3)、(26,3)、(14,17) 经 street 变化映射为 code `68`。code `68` 同时绘制水平铁轨格和完整 `tiles_bridge_hori` 桥面；桥面左移 0.25 格并跨 1.5 格。每处还生成左右两个桥墩，共 3 段桥面和 6 个桥墩。网页切片 1.1 按该层序生成绘制命令；测试显式核对三处桥面及六个桥墩坐标。索引记录的是静态候选与源码绘制规则，不代表 Android 每次随机变化的截图结果。

地图场景装饰码沿用 New Mexico 现有对象资源：68 cactus A、69 rocks A、70 rocks B、71 tree、72 stake、73 cactus B、74 windmill、75 water tower、76 bush、77 bones。特殊装饰 `116` 为小屋，位置 (30,8)；`117` 为小型 tipi，位置 (18,22)。图片资产应按原始锚点、碰撞盒和图层转换放置；不得仅因它们占一个 TDM 格就把大图缩成一格。

## 列车与可雇用对象

列车 marker 遍历得出 3 组水平列车和 3 组垂直列车，共 25 个组件。每组独立使用一个原版 unit group；网页不得把六组统一到同一个 movement group。

| 轴向与起点 | 组件顺序 | 原始类型/activity |
| --- | --- | --- |
| 水平 (17,3) | 83、83、84、84 | type10/11 机车 activity5；两个 type12 货车 activity4 |
| 水平 (13,10) | 83、83、84、84、84 | type10/11 机车 activity5；三个 type12 货车 activity4 |
| 水平 (16,17) | 83、83、84、84 | type10/11 机车 activity5；两个 type12 货车 activity4 |
| 垂直 (2,11) | 93、93、91、91 | 两个 type22 货车 activity5；type20/21 机车 activity5 |
| 垂直 (7,14) | 92、92、91、91 | 两个 type22 货车 activity4；type20/21 机车 activity5 |
| 垂直 (24,13) | 92、92、91、91 | 两个 type22 货车 activity4；type20/21 机车 activity5 |

marker 语义不能只按 `92` 识别垂直货车：`92` 和 `93` 均为 type22，但 activity 分别是 4 与 5。[列车解码器](../src/content/campaign-map-unit-placements.ts)支持多组水平/垂直 marker，并保留 `92`/`93` 的 activity 差异；map09 六组 marker 已按独立 movement group 写入生产关卡，并由关卡测试核对 25 个组件。现有 train unit builder、图集和移动规则均已复用。

地图没有 `96`–`101` 的休眠步兵，也没有 `112`–`114` 招募建筑或 `spawnPoolActions`。其中 11 个 activity4 货车是地图上的可操作货车；其它招募能力必须严格按地图对象和 APK 规则确认，不可凭通用关卡控件补出 Saloon、Fort 或 Tipi。

## 炸药对象

map09 有 4 个炸药触发器 `102` 和 4 个炸药箱 `110`。APK `GameObjectManager.createGameObjectsFromBasicMap` 将 tile `102` 创建为 unit type 7、转换为 `DynamiteTrigger` 并加入触发器列表；tile `110` 创建为 unit type 8、转换为 `DynamiteBox` 并加入炸药箱列表。DEX 中两条创建分支的 unit type 参数与类型转换和恢复源码一致。研究材料 `content-inventory.md` 的对象类型表把这两个 tile 对调了；该表项与代码证据冲突，应以 DEX 分支及恢复源码为准。网页当前共用的 `pairDynamiteObjects()` 也按 102 触发器、110 炸药箱解释，因此无需修改共用规则。

| 对 | 触发器 `102` | 炸药箱 `110` |
| ---: | --- | --- |
| 1 | (5,4) | (5,6) |
| 2 | (10,5) | (10,7) |
| 3 | (19,15) | (19,14) |
| 4 | (10,22) | (10,21) |

网页已有 `createDynamiteScenarioDefinition()`，它调用 Game 中的通用配对逻辑。接入时应从 map09 原始网格检查四组最近邻配对、各自触发/冷却/重生状态独立。伤害、半径、免疫对象和冷却沿用已反编译并实现的公共规则；若真实格网验证通过，不另改炸药规则。

## 波次、对白与声音

`GameDesignWaves.setWaves(..., 9)` 配置 7 个 `newWave` 和 11 个 `addToWave`。`addToWave` 的调用按源顺序附加到当前最后创建的波，因此 11 次调用不是 11 波；首列是出生池编号，次列是间隔，后 8 列是原始敌人池请求槽。下表不把请求槽当作逐个生成顺序：

| 波 | 开始延迟 | HP / 速度 | 池0：间隔 / 8 槽向量 | 池1：间隔 / 8 槽向量 |
| ---: | ---: | --- | --- | --- |
| 1 | 15,000 ms | 150% / 100% | 2,000 / `[1,1,1,1,3,2,0,0]` | — |
| 2 | 5,000 ms | 275% / 105% | 2,000 / `[1,1,1,1,1,3,0,0]` | — |
| 3 | 10,000 ms | 300% / 105% | 2,000 / `[0,0,1,1,2,3,2,0]` | — |
| 4 | 5,000 ms | 200% / 110% | 2,500 / `[1,0,2,2,3,3,1,0]` | 2,500 / `[1,0,2,2,3,3,1,0]` |
| 5 | 5,000 ms | 250% / 110% | 2,500 / `[0,0,1,2,2,3,1,0]` | 2,500 / `[0,0,1,2,2,2,0,0]` |
| 6 | 5,000 ms | 275% / 115% | 2,500 / `[0,0,1,2,2,2,1,1]` | 2,500 / `[0,0,1,2,2,1,0,0]` |
| 7 | 5,000 ms | 275% / 120% | 2,500 / `[0,0,1,0,0,3,1,1]` | 2,500 / `[0,0,2,1,0,3,1,1]` |

`GameObjectShot.UNIT_BONUS_DURATION_FIRE` 按静态字段解析为 5,000 ms；`ItemTouchHelper.Callback.DEFAULT_SWIPE_ANIMATION_DURATION` 为 250 ms。波5的 250% HP 值来自后一个常量，不能把第三方类名当作游戏数值语义。

网页将每个 APK 八槽请求向量映射到当前十类型请求结构时，在尾部补两个零。此映射由 `WaveManager.addToWave(IIIIIIIIII)` 的 DEX 重载确认：它在调用 12 参数核心方法前补两个零，不改变已有八槽的顺序或含义。关卡模块保留原始七波顺序、池编号、间隔和各波倍率。

| 波 | 头像与对白语音 | APK 英文原文 |
| ---: | --- | --- |
| 1 | Pedro / `sound_pedro` | There's only one thing on Railroad Ranch: trains! |
| 2 | Pedro / `sound_pedro` | We have to use the railroad strategically to trap the settlers in our pincers. |
| 3 | Settlers / `sound_siedler` | Where do we go now? Haven't we been here before? I think we're going around in a circle... |
| 4 | Pedro / `sound_pedro` | Look out! They're coming through the pass in the south, too! |
| 5 | Engineer / 对话头像分支没有音效 | The pot is glowing. The cash box is jingling. That's the way it ought to be! |
| 6 | Pedro / `sound_pedro` | This is just a big gamble! Sometimes they run this way, sometimes they run that way! You don't know which way to turn! |
| 7 | Pedro / `sound_pedro` | The stragglers are bringing up the rear. That will be all for today. |

English strings and portrait keys come from APK resources. `GameScreenActivity.onPrepareDialog` uses the two-argument `setUpDialog(currentText, currentImage)` for wave dialogue; that overload selects sounds for Pedro and Settlers but has no Engineer case. The APK resource inventory also has no `sound_engineer.ogg`. Thus wave 5 shows the Engineer portrait without a portrait-triggered voice; do not assign Pedro or Settlers audio by guess. The web app already has the portraits, `sound_pedro.ogg`, `sound_siedler.ogg` and `music_loop1.ogg`. Chinese dialogue is a new translation.

## 网页已有内容与缺口

- 已有目录条目：[New Mexico level 9](../src/content/campaign-catalog.ts) 与 `gng_levelmap_09.png`。
- 已有可复用素材：水平/垂直机车与货车图集、`portrait_pedro.png`、`portrait_settlers.png`、`portrait_engineer.png`、Pedro/Settlers 声音及 `music_loop1.ogg`。
- 生产 TDM 文件 [`td_map_09.tdm`](../public/content/maps/td_map_09.tdm) 与静态地形 JSON [`new-mexico-09.json`](../src/content/new-mexico-09.json) 已接入；测试逐格比较原始 APK 格网，核对 768 个背景格、所有 street 绘制命令、贴图 source rectangle 和地图边界。
- [路线与地图对象模块](../src/content/railroad-ranch-routes.ts)、[场景装饰](../src/content/railroad-ranch-scene.ts)、[列车组](../src/content/railroad-ranch-units.ts)及[炸药定义](../src/content/railroad-ranch-dynamite.ts)已按静态 APK 数据接入。[`railroad-ranch-map.test.ts`](../tests/railroad-ranch-map.test.ts) 与地形、marker 测试核对全部 14 条路线、28 个方向节点、六组共 25 个列车组件、57 个装饰和四组炸药配对。
- [关卡参数与波次模块](../src/content/railroad-ranch-campaign.ts)、[七波数据](../src/content/railroad-ranch-campaign-waves.ts)和[`railroad-ranch-campaign.test.ts`](../tests/railroad-ranch-campaign.test.ts)已接入 600 现金、25 生命、3 级升级上限、75/100/125 难度倍率、七波和 11 个敌人请求；短时会话测试核对波次开头与出生池绑定。
- 没有额外的玩家生成池是有证据支持的结果：APK 的 map09 `spawnPoolActions` 为空，地图没有 112–114 招募建筑；网页不增加通用关卡招募池。11 节 activity4 货车仍通过已有地图单位交互招募。
- 核心关卡接入已闭环：双语简介/胜利标题/七段对白、正式战役第 9 关登记、Free Play、进度/结算及 map09 回放路由均已接入并通过定向检查。尚待本批整应用检查、部署 SHA 核对和公开页面验收；不需要启动 Android 重看启动页，也不需完整通关。

## 后续核对时的边界

1. 不把 63 个地图文件误当成 63 个战役关卡；本关是 60 关中的第 9 关。
2. 不把 `addToWave` 调用数当波次数，也不把请求向量当作确定的敌人出现顺序。
3. 不把三列水平列车、三列垂直列车当一个单位组；不把 code 93 改写成 code 92。
4. 不从招募 UI 通用能力推断本关有商店、建筑或可用单位；从实际标记和 APK 活动状态构造。
5. 先将每种可能存在的属性标为已证实、推导或未知；如果具体玩家招募/语音调用点仍不能由现有 DEX 和消费者确定，指出所需证据后再实现，不以观感补值。
