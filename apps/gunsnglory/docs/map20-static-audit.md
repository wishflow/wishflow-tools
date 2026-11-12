# Mississippi 第20关：Horse Hills 静态审计

## 结论

现有 APK 派生数据和 DEX/REA 语义足以接入 Horse Hills 的地图、敌人路线、初始单位、蒸汽船、Indian 生成池、波次、文案、正式战役、Free Play 和回放。Horse Hills 是全局第20关，使用 `res/raw/td_map_23.tdm`，不能把地图文件编号当作战役关卡号。

本报告是静态反编译和数据交叉核对结果，不是 Android 运行记录或完整通关记录。中文内容是网页翻译；APK 的英文 `default` 字符串才是原版文本基线。

## 证据来源和适用边界

`R/` 表示本地研究归档分支 `codex/gunsnglory-spec` 下的 `apps/gunsnglory/docs/research/`，不是应用构建输入。

| 结论 | 来源 | 边界 |
| --- | --- | --- |
| 地图文件、完整网格、尺寸和原始字节摘要 | `R/data/map-inventory.json` 的 `index=23`；APK `res/raw/td_map_23.tdm` | 网格为 y-major；需按 `[width,height,grid...]` 复建字节，再与 APK 摘要核对。 |
| 关卡初始参数 | `R/data/level-config.json` 的 `index=19` | 配置行索引从0开始，故 `index=19` 对应战役第20关。字段值不自动证明网页有相同消费者。 |
| 波次、生成调用和单位池动作 | `R/data/waves.json` 的 `levelId=20`；`R/recovered-source/java/com/hg/gunsandglory/datastorage/GameDesignWaves.java` 的 `i == 20` 调用；REA `GameDesignWaves.setWaves` 与 `SpawnPoolManager.performActionsForWave` | JADX Java 仅作定位；参数语义以 DEX/Smali 与已验证的波次、生成池消费者为准。 |
| 地图对象与单位 marker | `R/data/map-inventory.json` 网格；REA/DEX `GameObjectManager.createGameObjectsFromBasicMap`、`GameObjectSpawnLocation` | marker 值分属对象构造、背景和道路等不同 pass；不能只看单一对象分派表。 |
| 路线及方向 | 原始 TDM 网格；REA `EnemyDirector.createEnemyDirectorFieldsFromBasicMap`、`EnemyDirectorField` | 本报告的节点和路线是按 APK 控制点方向规则从网格静态展开，不代表逐帧运行观察。 |
| 地形和可行走性 | REA `BasicMap.loadMap`（REA-393）、`BackgroundMap.createBackgroundMap`（REA-386）、`isFreeToWalk`（REA-391）、`isStreet`（REA-392）；`R/data/terrain-render-index.json` 与 `terrain-render-rules.json` | Mississippi 使用既有地形图集映射；运行时变体受随机源影响，网页保持自己的确定性随机契约。 |
| 标题、简介、结算标题和对白 | `R/data/string-resources.json`、`R/data/wave-reference-resolution.json` | 英文取 APK `default`；`newWave` 头像参数是独立资源引用，不是说话人音频参数。 |
| 离线图像、声音和地区资源 | `R/data/resource-inventory.json`、`R/data/audio-asset-export-manifest.json` | 文件存在或被打包不单独证明本关会播放；按已有对白映射消费，不添加未经证实的声音。 |
| 正式关卡与标题资源换算 | `R/content-inventory.md`；REA `LevelPack.getLevel`、`LevelSelectionScreenActivity.setupLevelOverviewDialog`；当前 `campaign-catalog.ts` | 战役第11–60关使用地图号/标题资源号 `globalLevel + 3`；第20关对应23。 |

## 身份与地图

- 正式关卡：Mississippi 第10关、全局第20关 Horse Hills。
- 地图：`td_map_23.tdm`，32×24，原始文件770字节；数据头为 `[32,24]`，之后按行优先排列768个 tile。
- APK 派生 SHA-256：`4c8fb4fa0481fb3a7e3a848d756c4042e2f3648f5722176b360a5575228aa302`。
- 网格频次：水域 tile 124 共129格，水边岩石 tile 126 共6格；路面与道路标记包括 tile 32（168）、36（79）、53（16）、55（15）、88（15）。完整原始网格与其余 tile 频次保存在 `R/data/map-inventory.json`。
- 地图场景使用 Mississippi 地形、道路、桥和背景碰撞映射；地图对象 120–123 由 Steamer 对象路径构造，不应烘焙进背景图层。
- 站点已有 `public/assets/menu/gng_levelmap_23.png`；它是选关缩略图，不替代可玩 TDM 和地区地形资源。

### 路线拓扑

| 出生点顺序 | TDM 位置/marker | APK action ID | 初始方向 | 可达出口 | 路径数 |
| ---: | --- | ---: | --- | --- | ---: |
| 0 | `(0,7)` / 40 | 0 | 东 | `(29,23)` | 2 |
| 1 | `(0,8)` / 41 | 1 | 东 | `(28,23)` | 2 |

两个出口 marker 均为48。转向 marker 共46个（52–65）；静态控制图展开为50条有向边和4条完整路线。全部控制点从对应入口可达，分支最终合并并各自到达一个出口；网页 action ID 必须明确映射到按行扫描的出生点索引。

完整路线序列如下，坐标均为 `(x,y)`：

- `(0,7)` → `(29,23)`：`(6,7) → (6,9) → (13,9) → (13,7) → (26,7) → (26,9) → (30,9) → (30,15) → (20,15) → (20,13) → (17,13) → (17,15) → (15,15) → (2,15) → (2,19) → (8,19) → (8,21) → (13,21) → (13,19) → (15,19) → (23,19) → (23,21) → (29,21) → (29,23)`。
- `(0,7)` → `(29,23)`：与上一条路线相同，经过 `(15,15)` 后直接转到 `(15,19)`，再经 `(23,19) → (23,21) → (29,21) → (29,23)`。
- `(0,8)` → `(28,23)`：`(5,8) → (5,10) → (12,10) → (14,10) → (14,8) → (25,8) → (25,10) → (29,10) → (29,14) → (21,14) → (21,12) → (16,12) → (16,14) → (12,14) → (1,14) → (1,20) → (7,20) → (7,22) → (14,22) → (14,20) → (22,20) → (22,22) → (28,22) → (28,23)`。
- `(0,8)` → `(28,23)`：与上一条路线相同，经过 `(12,10)` 后直接转到 `(12,14)`，再经 `(1,14) → (1,20) → (7,20) → (7,22) → (14,22) → (14,20) → (22,20) → (22,22) → (28,22) → (28,23)`。

## 地图对象与初始单位

坐标原点为左上角。单位类型编号按现有 `createCampaignMapUnitPlacements`：`96–101` 映射类型 `tile−95`、activity 4；`104–109` 映射类型 `tile−103`、activity 5；`130/131` 映射类型35/36、activity 4。

| Marker | 数量/坐标 | 静态语义和接入要求 |
| --- | --- | --- |
| 96 | 6：`(23,10)`、`(2,11)`、`(9,12)`、`(18,16)`、`(21,17)`、`(12,18)` | 可招募 Gunslinger。 |
| 97 | 7：`(9,6)`、`(3,11)`、`(14,12)`、`(10,17)`、`(25,17)`、`(3,21)`、`(17,21)` | 可招募 Mexican。 |
| 98 / 99 | 2：`(7,12)`、`(26,19)`；3：`(5,5)`、`(21,9)`、`(5,16)` | 可招募 Cannon、Indian。 |
| 100 / 101 | 1：`(19,14)`；3：`(12,7)`、`(8,17)`、`(20,22)` | 可招募 Sniper、Grandpa；分别按全局第40关/第30关的完成状态显示。 |
| 130 / 131 | `(14,17)` / `(11,12)` | 可招募 Pyromaniac、Salesman；分别按全局第50关/第60关的完成状态显示。 |
| 106 | `(18,10)` | 一名活动 Cannon，activity 5。 |
| 109 | `(23,16)` | 一名活动 Grandpa，activity 5；这不是 101 招募标记，不按招募解锁过滤。 |
| 114 | `(28,17)` | 唯一 Tipi / Indian 生成位置。生成池专用 Indian 模板不得加入初始场景单位。 |
| 120、121×3、123 | `(12,3)`、`(14–16,3)`、`(17,3)` | 同一行的 Steamer 组件：30、31、三门可招募 Cannon（type32）和尾段33，共6个组件；复用 Mississippi Steamer 组件语义和 movement group。 |
| 68、71、73、76、77、126 | 4、3、2、4、1、6 | Mississippi 场景装饰、骨骸和水边岩石；使用既有资源与碰撞规则。 |

tile78 共10格，没有 `GameObjectManager.createGameObjectsFromBasicMap` 对象分支；它仍须由原始地图的背景/道路绘制流程处理，不能凭 tile 数值为其创建实体。

## 关卡规则与波次

关卡配置行 `index=19` 的 APK 原始值如下：

| 字段 | 值 | 网页消费说明 |
| --- | ---: | --- |
| 初始现金 / 生命 / 最大升级 | 450 / 1 / 3 | 由关卡初态和升级规则消费。 |
| 敌人 HP 倍率 E/M/H | 75% / 100% / 110% | 作为关卡 difficulty multiplier。 |
| `maxChests` / `chestTime` | 999 / 25,000 ms | 对应奖励箱总数和派发间隔。 |
| `maxChestsPlayfield` | 12 | 对应同时在场上限；不能复制 M19 的10。 |
| `awesomeMessageUnit` | 5 | 映射现有 campaign enemy type feedback threshold。 |
| `awesomeMessageMin` | 30,000 | 当前 REA/DEX 台账没有确认它的网页消费者；保留为未解析参数，不按字段名增设计时器。 |
| `gamblerTime` | 119,000 | APK 配置中存在；本图无 tile132 Gambler marker，当前网页场景也无关卡级 Gambler timer 契约，实际效果未证实，不为本关猜测新行为。 |

波次的源调用顺序和解析后的数值如下。两条生成调用分别使用 action ID 0、1，向量是 `addToWave` 的前八个请求计数；同一波的两个出生点向量相同。Mississippi 敌人类型和属性复用 `R/data/level-config.json` 的地区敌人表及网页 `mississippi-enemy-designs.ts`，请求向量必须保持 APK 参数槽顺序，不按数组位置另造类型名称。

| 波次 | 开场对白/头像 | 延迟 | HP倍率 | 速度倍率 | 两个出生点各自的八类请求向量 |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | `T_CAMPAIGN_20_01` / Mexican | 15,000 ms | 175% | 150% | `[0,0,0,0,4,0,0,0]` |
| 2 | `T_CAMPAIGN_20_02` / Gunslinger | 5,000 ms | 200% | 160% | `[0,0,0,0,4,1,0,0]` |
| 3 | `T_CAMPAIGN_20_03` / Mexican | 5,000 ms | 225% | 170% | `[0,0,0,0,4,2,1,0]` |
| 4 | `T_CAMPAIGN_20_04` / Pedro | 5,000 ms | 250% | 180% | `[0,0,0,0,5,3,2,0]` |
| 5 | `T_CAMPAIGN_20_05` / Captain | 5,000 ms | 250% | 190% | `[0,0,0,0,5,4,3,0]` |
| 6 | `T_CAMPAIGN_20_06` / Mexican | 5,000 ms | 275% | 200% | `[0,0,0,0,5,4,3,1]` |
| 7 | `T_CAMPAIGN_20_07` / Settlers | 5,000 ms | 275% | 210% | `[0,0,0,0,5,5,4,1]` |
| 8 | `T_CAMPAIGN_20_08` / Gunslinger | 5,000 ms | 300% | 250% | `[0,0,0,0,5,5,5,1]` |

`GameObjectShot.UNIT_BONUS_DURATION_FIRE` 解析为5,000 ms，`ItemTouchHelper.Callback.DEFAULT_SWIPE_ANIMATION_DURATION` 解析为250；它们出现在 newWave 的延迟、HP 或速度参数位置，必须按参数位置解释。

单位池动作是 `addActionForSpawnPool(2,1,0,0,0,2)` 与 `addActionForSpawnPool(2,3,0,0,0,4)`：第2波对 pool type 4（Indian）执行 `set 2` 和 `set-max 4`。派发间隔沿用已验证的15秒全局池周期；Indian 模板只存在于池定义，运行后生成位置是唯一 Tipi `(28,17)`。

## 文案与离线资源

| 资源键 | APK 英文原文 |
| --- | --- |
| `T_LEVEL_NAME_23` | Horse Hills |
| `T_LEVEL_INFO_23` | Every year, thrilling horse races take place in Horse Hills; the winner is awarded a golden horseshoe! |
| `T_LEVEL_NAME_WON_23` | The Hunter of Horse Hills |
| `T_CAMPAIGN_20_01` | I love horses! They're delicious! |
| `T_CAMPAIGN_20_02` | I'll put 100 Gold on the brown horse! |
| `T_CAMPAIGN_20_03` | I wish I could ride... |
| `T_CAMPAIGN_20_04` | These short cuts will be our downfall! |
| `T_CAMPAIGN_20_05` | Let's get going! |
| `T_CAMPAIGN_20_06` | Boss, if horses could talk, would they have accents, too? |
| `T_CAMPAIGN_20_07` | Woah! We have to hurry! |
| `T_CAMPAIGN_20_08` | Yes, hurry! Or you'll be too late for your funeral! |

波次头像依次为 Mexican、Gunslinger、Mexican、Pedro、Captain、Mexican、Settlers、Gunslinger。对应的离线头像和已使用角色音频资源都在 `public/assets/`；Captain 头像没有当前已核实的独立角色语音映射，不得凭头像新增声音。Mississippi 音乐沿用现有关卡波次路由。本批不播放声音。

## 正式关卡、Free Play 与回放

- `campaign-catalog.ts` 已预留全局 level20、`mapFileNumber=23`、`titleResourceNumber=23`；正式内容身份为 `campaign-mississippi-20`，依赖 `campaign-mississippi-19`。
- Mississippi Free Play 中 M20 的英文关卡名为 Horse Hills；可选择 Easy、Medium、Hard，不受正式进度门槛限制。
- 正式胜利可写入 level20 进度；Free Play 仍不写正式进度。
- M20 网格包含 100、101、130、131 解锁 marker；新内容版本和回放必须还原 Grandpa、Sniper、Pyromaniac、Salesman 四个位的录制快照。Indian pool 是关卡内容的一部分，不写入地图初始单位数组。
- 每关使用独立 contentVersion，不能复用 M19。自由模式、正式模式和回放均从同一 M20 内容构造函数读取地图/规则，并使用本次录制的解锁状态。

## 未确认项

- `awesomeMessageMin=30000` 的 APK 消费方法尚未在已归档 REA/DEX 证据中闭环；网页当前无对应字段，M20 不猜测它的效果。
- `gamblerTime=119000` 的具体消费者未确认。地图不含 Gambler marker，当前批次不会为此添加独立 Gamble 机制；若未来静态调用链证明它影响其他地图或全局战斗，再单独更新规则计划。
- 没有为 M20 执行 Android 运行观察或完整关卡通关。地图布局、实体和波次由原始 APK 静态数据、DEX/REA 规则与网页消费代码核对；最终网页行为仍需本批单测、E2E 和发布后浏览器验收。
