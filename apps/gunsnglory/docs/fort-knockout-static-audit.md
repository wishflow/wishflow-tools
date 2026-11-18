# Dakota 第 3 关：Fort Knockout 静态审计

## 关卡身份与结论边界

Fort Knockout 是 Dakota 第 3 关、全局第 33 关，对应 APK `res/raw/td_map_36.tdm`。本仓库旧编号 `map33` 指 Oregon 第 10 关 Lumber Mill Hills；本关应使用 `dakota-03` 或 `map36`，不能把全局关卡号、APK 地图文件号和旧内部命名互换。

以下事实来自用户提供的 Guns’n’Glory FREE Android 1.8.6 APK 静态资源、DEX/Smali、REA 解析结果和目标 TDM 原始字节。Smali 是 DEX 反汇编，不是原始 Java 源码。对于 JADX 控制流有歧义的方法，以 Smali switch、条件跳转、字段写入及对象消费者为准。没有运行 Android，也没有进行战役通关。

**已闭合：**APK 包身份、地图文件身份与尺寸、原始 TDM 频次/坐标、路线节点与完整可达路线、初始规则行、10 波和20条敌方请求、2条单位池动作、初始对象类型、标题/简介/对白资源。

**地形核对已闭合：**本关 `src/content/dakota-03.json` 的768个背景绘制命令、104个道路/桥/铁路覆盖命令及最终背景碰撞码已与 APK 派生参考逐项比较。该静态对照确认贴图/碰撞格网数据一致，不代表 Android 实际运行画面，也不代表玩家对象碰撞框、锚点和运行中的移动边界已完成验收；对象与路线的运行时集成仍属于后续内容步骤。

## 来源索引

| 短键 | 来源与定位 | 支持范围及边界 |
| --- | --- | --- |
| `APK186` | Guns’n’Glory FREE 1.8.6，包名 `com.hg.gunsandgloryfree`，version code 34；本地 APK `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk` | 本报告唯一原版目标；静态资料不等于 Android 运行观察。 |
| `TDM36` | APK ZIP 内 `res/raw/td_map_36.tdm`，770 字节，前两字节 `32,24` | 32×24、768 个格点；以下频次、坐标和路线均由该文件直接解码。 |
| `OBJECT36` | `GameObjectManager.createGameObjectsFromBasicMap()` 对应 Smali switch；`GameObjectUnit.create()`、`GameObjectDecoration`、`GameObjectSpawnLocation`、`createTrainFromMap()` | marker 到对象类型、activity、列表副作用和火车分组。JADX 伪代码只作导航。 |
| `TERRAIN36` | `BackgroundMap.createBackgroundMap()`、`createStreetLayerMap()`、`shapenBackgroundMap()`、`shapenStreetLayerMap()`、`createVariationMap()`；`Dakota.drawBackgroundLayer()` | 原始格到背景/道路图层、邻格塑形、碰撞和贴图的分层消费链；M34-B 已将 map36 的768个背景命令、104个覆盖命令与最终背景碰撞格网逐项对照网页数据。 |
| `ROUTE36` | `EnemyDirector`、`EnemyDirectorField`、`PriorityMap` 的 APK 语义；TDM spawn/redirect/exit marker；本地 `createMississippiRouteDefinitions()` 通用路线解析器 | M34-C1 已将四条 Fort Knockout 路线接入网页数据；[`dakota-03-routes.test.ts`](../tests/dakota-03-routes.test.ts) 核对 APK 路径、135条相邻有向边、139个路线格、redirect 投影及短 GameSession 首转。路线不进入已识别的悬崖墙、水域和铁路格；此项不代表玩家寻路或碰撞。 |
| `LEVEL33` | `GameDesignData.<clinit>` 的全局等级 33−1（索引32）数组写入；开局代码按 `globalLevel−1` 读取 | 11 个原始字段值；只有追到字段消费者的语义才映射为网页行为。 |
| `WAVES33` | `GameDesignWaves.setWaves()` 的 `i == 33` 分支及 `SpawnPoolManager` 消费者 | 10个 `newWave`、20个 `addToWave`、2个玩家池动作；逐波调用和源槽位如下。 |
| `COPY33` | APK strings：`T_LEVEL_NAME_36`、`T_LEVEL_INFO_36`、`T_CAMPAIGN_33_01..10`；对应头像 drawable 参数 | 英文原文、波次头像。中文为网页翻译，不是 APK 资源。 |
| `WEBBASE` | 当前 `campaign-catalog.ts`、Dakota 第 2 关 `dakota-02-*`、共享碰撞审计与对应测试 | 说明当前项目接口和已有消费者；不能证明 map36 已接入。 |

## 原始 TDM 与路线

原始网格尺寸为 32×24，包含 768 个格点。全部非零值频次如下，连同 raw 0 的410格合计768：

```text
16:62, 32:80, 36:36, 40:1, 41:1, 42:1, 43:1, 48:4,
52:23, 54:10, 55:13, 69:9, 70:3, 71:6, 76:3,
80:7, 90:15, 91:2, 92:2, 94:1, 95:1,
96:14, 97:15, 98:6, 99:12, 100:1, 101:11,
102:1, 110:1, 113:2, 116:1, 117:2, 124:5,
125:4, 130:1, 131:1
```

关键地形、建筑、铁路与路线 marker 坐标均为零起始 `(x,y)`：

| Marker | 位置/方向 | 解释边界 |
| ---: | --- | --- |
| `40–43` | spawn：`40@(5,23)`、`41@(14,23)`、`42@(15,23)`、`43@(26,23)` | 4个入口；动作编号由 marker 与 spawn 映射分开处理。 |
| `48` | exit：`(8,0)、(15,0)、(16,0)、(24,0)` | 4个出口。 |
| `52` | north：`(15,3),(24,3),(8,4),(14,4),(16,4),(15,5),(5,7),(14,7),(13,8),(15,9),(27,9),(14,10),(16,11),(15,12),(2,13),(22,14),(26,15),(7,18),(16,18),(15,19),(17,19),(28,19),(16,20)` | 23 个北向 redirect。方向表示从该节点离开的方向。 |
| `54` | west：`(27,3),(15,7),(14,8),(16,9),(15,10),(17,11),(16,12),(7,13),(26,14),(28,15)` | 10 个西向 redirect。 |
| `55` | east：`(14,3),(5,4),(13,4),(15,4),(14,5),(2,7),(22,9),(5,18),(15,18),(14,19),(16,19),(26,19),(15,20)` | 13 个东向 redirect。 |
| `80` | 横桥：`(8,1),(27,6),(2,9),(22,11),(7,15),(5,21),(26,21)` | 7个道路覆盖格；图像覆盖不等于玩家可走矩形。 |
| `90` | 铁路：`(11,2–8),(11,13–20)` | 共15格。最终贴图层和碰撞需由 Dakota 完整转换核对。 |
| `92` | 车厢：`(11,9),(11,10)` | 两节竖列车厢。 |
| `91` | 机车段：`(11,11),(11,12)` | 两段机车；与车厢共同组成竖列火车。 |
| `94/95` | 上/下缓冲器：`94@(11,1)`、`95@(11,21)` | 列车边界对象。 |
| `113` | Fort 建筑：`(20,3),(8,8)` | spawn-location type 2；池的生成建筑不是额外初始单位。 |
| `116` | shack：`(14,15)` | decoration type 12，`b_2x1_shack`。 |
| `117` | small tipi：`(4,1),(1,2)` | decoration type 13。 |
| `124/125` | water：`124@(20,22),(21,22),(19,23),(20,23),(21,23)`；`125@(20,21),(21,21),(19,22),(22,23)` | 原始水域 marker；M34-B 已核对相邻塑形后的最终背景格网，玩家单位边界仍按对象碰撞规则单独验收。 |
| `102/110` | trigger `102@(16,5)`；dynamite box `110@(15,6)` | Smali 分支分别构造 type 7 trigger unit 和 DynamiteBox；不能交换角色。 |
| `130/131` | `130@(17,3)` Pyromaniac；`131@(0,17)` Salesman | 新局可招募特殊单位，受对应解锁条件影响。 |

完整路线由入口向各方向 redirect 扩展为4条：

1. `40@(5,23) N → (5,18) E → (7,18) N → (7,13) W → (2,13) N → (2,7) E → (5,7) N → (5,4) E → (8,4) N → exit@(8,0)`。
2. `41@(14,23) N → (14,19) E → (15,19) N → (15,18) E → (16,18) N → (16,12) W → (15,12) N → (15,10) W → (14,10) N → (14,8) W → (13,8) N → (13,4) E → (14,4) N → (14,3) E → (15,3) N → exit@(15,0)`。
3. `42@(15,23) N → (15,20) E → (16,20) N → (16,19) E → (17,19) N → (17,11) W → (16,11) N → (16,9) W → (15,9) N → (15,7) W → (14,7) N → (14,5) E → (15,5) N → (15,4) E → (16,4) N → exit@(16,0)`。
4. `43@(26,23) N → (26,19) E → (28,19) N → (28,15) W → (26,15) N → (26,14) W → (22,14) N → (22,9) E → (27,9) N → (27,3) W → (24,3) N → exit@(24,0)`。

展开结果共135条唯一相邻有向边、139个路线格（包含入口和出口），路线格频次为 `raw32:78`、`raw40–43:4`、`raw48:4`、`raw52:23`、`raw54:10`、`raw55:13`、`raw80:7`。4个入口均到达出口；没有越界、悬空节点或经过 raw36 悬崖、水域、铁路格。M34-C1 已将四条路线用于短 GameSession 并验证每个入口的首个转向；玩家单位碰撞仍由后续对象切片单独验证。

## 场景对象与对象语义

对象构造须以 `GameObjectManager` Smali 的 switch key 和分支副作用为准。`96–101` 是新局可招募的 activity 4 单位 marker；`104–109` 才是 activity 5 初始活动单位 marker。此图仅有前一组，不含后一组。

| Marker | 数量与坐标 | 对象/网页要求 |
| ---: | --- | --- |
| `69` | rocks A：`(22,0),(0,4),(30,6),(29,11),(13,12),(31,15),(1,22),(9,23),(28,23)` | 9个静态 rock decoration。 |
| `70` | rocks B：`(0,0),(18,5),(3,21)` | 3个独立尺寸 rock decoration。 |
| `71` | trees：`(17,2),(29,3),(7,5),(24,17),(2,19),(30,22)` | 6个树对象。 |
| `76` | bushes：`(31,1),(25,10),(3,16)` | 3个 bush 对象。 |
| `96` | Gunslinger 14：`(10,3),(30,4),(12,7),(29,9),(25,11),(31,12),(1,15),(3,17),(19,20),(24,20),(30,20),(17,22),(23,22),(29,22)` | activity 4；解锁后可招募，否则按原版睡眠/锁定状态初始化。 |
| `97` | Mexican 15：`(14,1),(29,1),(23,2),(10,5),(30,7),(4,10),(27,10),(20,12),(14,13),(23,15),(30,17),(23,18),(1,19),(8,20),(13,22)` | activity 4；逐 marker 唯一 ID。 |
| `98` | Cannon 6：`(23,5),(20,8),(9,11),(12,14),(9,17),(21,18)` | 六个初始休眠/可招募 Cannon；另有 Fort pool 模板，但不得把 pool 模板重复当成开局 Cannon。 |
| `99` | Indian 12：`(3,1),(0,2),(6,2),(31,2),(2,3),(4,4),(0,5),(19,6),(0,8),(28,12),(26,17),(8,22)` | activity 4。 |
| `100` | Sniper：`(13,16)` | 单个初始招募 marker；仍受全局解锁状态约束。 |
| `101` | Grandpa 11：`(24,7),(5,8),(1,11),(9,13),(18,13),(29,15),(19,16),(6,19),(13,19),(28,20),(3,22)` | 11个初始招募 marker；逐 marker 唯一 ID。 |
| `102` | `(16,5)` | Dynamite trigger；对象 type 7，位于触发列表。 |
| `110` | `(15,6)` | DynamiteBox；与 marker 102 的角色不同。 |
| `113` | Fort：`(20,3),(8,8)` | 两处 spawn-location type 2。 |
| `116` | `(14,15)` | Shack decoration type 12；核对 APK 碰撞框，不以贴图矩形猜测。 |
| `117` | `(4,1),(1,2)` | 两个 small tipi decoration type 13。 |
| `130/131` | Pyromaniac `(17,3)`；Salesman `(0,17)` | type 35/36 activity 4 特殊招募单位；检查解锁和重复 ID。 |

96–101 合计59个普通初始招募 marker；加上130/131两个特殊招募 marker，总计61个 activity 4 候选对象。TDM 没有 Gambler/Casino marker `132/150`，不可由素材存在或参数非零推断该关创建 Gambler。

## 参数与单位池

`GameDesignData.<clinit>` 将 global level 33−1（零基 index 32，`:array_8da`）的11个原始值写为：

```text
[300, 25, 999, 25000, 3, 30000, 5, 15, 56, 75, 90]
```

字段消费者确认的映射：初始现金 `$300`；生命25；奖励箱总数999、生成计时25,000ms、最大升级3；awesome-message 原始字段30,000与单位字段5按既有消费者分别记录，未将无独立网页等价行为的时间字段扩写成新机制；同屏奖励箱上限15；Easy/Medium/Hard 敌人生命倍率56%/75%/90%。本行没有 gambler-time 字段。字段名和数组顺序应与 `GameDesignData` 声明以及实际读取者一起核对。

`GameDesignWaves.setWaves(level=33)` 的 Wave 1 玩家池动作：

- `(wave=1, action=1, slots 1–4 = [0,0,0,0])`：清空四类待发池。
- `(wave=1, action=3, slots 1–4 = [0,0,5,0])`：将第三类池的上限设为5。第三类是 Cannon；必须通过 `SpawnPoolManager` 类型映射核对。
- Cannon 的新生成模板属于池配置，不是第7个 TDM Cannon marker；池单位只能由正式雇佣/入池流程产生，不能作为初始实体添加。

## 十波与二十条敌方请求

每个 wave 元数据的数值顺序为 `delay ms / HP% / speed%`。向量列为8个普通请求槽；Boss 使用网页索引8，Doc 使用索引9。请求向量表示待生成计数，不代表固定出敌顺序。

| Wave | `T_CAMPAIGN_33_0n` / 头像 | 元数据 | action @ interval ms → 8槽请求向量 |
| ---: | --- | --- | --- |
| 1 | `_01` / engineer | 15,000 / 120 / 120 | `0 @ 2,000 → [2,3,4,5,3,2,0,0]` |
| 2 | `_02` / Indian | 15,000 / 125 / 125 | `0 @ 2,000 → [2,3,4,5,3,2,2,0]` |
| 3 | `_03` / Oregon geezer | 25,000 / 125 / 125 | `0 @ 2,500 → [2,2,4,5,3,2,1,0]`; `1 @ 2,500 → [2,3,4,5,3,2,1,0]` |
| 4 | `_04` / Oregon calamity | 15,000 / 130 / 135 | `1 @ 2,500 → [2,2,4,5,3,2,1,0]`; `2 @ 2,500 → [2,3,4,5,3,2,1,0]` |
| 5 | `_05` / Mexican | 15,000 / 145 / 140 | `0 @ 2,500 → [1,2,4,5,4,3,1,1]`; `1 @ 2,500 → [2,2,4,5,3,4,2,0]`; `2 @ 2,500 → [2,3,4,5,2,4,2,0]` |
| 6 | `_06` / Pedro | 15,000 / 170 / 145 | `0 @ 2,500 → [1,2,4,5,4,4,2,1]`; `1 @ 2,500 → [2,2,4,5,3,4,3,1]`; `2 @ 2,500 → [2,3,4,5,3,4,2,1]` |
| 7 | `_07` / Indian | 25,000 / 170 / 150 | `3 @ 2,500 → [1,1,3,5,3,4,3,2]` |
| 8 | `_08` / Oregon geezer | 25,000 / 180 / 155 | `0 @ 2,500 → [0,0,3,5,4,4,3,3]`; `3 @ 2,500 → [0,0,3,5,4,4,3,3]` |
| 9 | `_09` / Oregon calamity | 25,000 / 195 / 160 | `0 @ 2,500 → [0,0,3,5,4,4,3,2]`; `1 @ 2,500 → [1,2,4,5,3,4,3,1]`; `2 @ 2,500 → [2,1,4,5,3,4,2,1]`; `3 @ 2,500 → [0,0,3,5,4,4,3,2]` |
| 10 | `_10` / Oregon boss | 25,000 / 200 / 165 | `2 @ 500 → [5,4,3,3,0,0,0,0]`, Boss slot 1, Doc slot 0 |

由目标 level 分支逐条计数：10个 `newWave`、20个 `addToWave` 和上述2个玩家池动作。末波 500ms 来自 APK `LokSteam.MAX_CLOUD_SPAWN_INTERVAL` 常量，不是沿用上一关间隔。逐波请求参数必须在实现测试中作为独立期望保存，不从邻关复制。

## 名称、对白与音画资源

- 标题：`T_LEVEL_NAME_36` → `Fort Knockout`。
- 简介：`T_LEVEL_INFO_36` → `Fort Knockout invites you to a relaxing comfort weekend with its talented staff.`
- `T_CAMPAIGN_33_01..10` 英文原文：

| Wave | APK 英文原文 |
| ---: | --- |
| 1 | End of the line! Fort Knockout! Please exit the train and position your forces to attack innocent settlers! |
| 2 | Brothers of Dakota, the exploiters are on their way! Let us burn their heads, scalps are passé anyway! |
| 3 | Here come some more settlers from the east! Just you wait, you'll never be as old as me! |
| 4 | Leave the men to me, you old fool! I need some for my bed! As a bedside rug! |
| 5 | I can finally test the fireworks from my brother-in-law! |
| 6 | Watch out that you don't lose all eight of your fingers! |
| 7 | The palefaces take the route on the east side! Dig up the hatchet, we need more men! |
| 8 | That's a two-front war! I see settlers in the south-west and I smell some in the south-east! |
| 9 | Come here, I have some friends for you, and every one is faster than you! |
| 10 | Hurry up! Distract them, you fools! If I don't get home on time, my wife will kill me! |

对白头像依次对应：engineer、Indian、Oregon geezer、Oregon calamity、Mexican、Pedro、Indian、Oregon geezer、Oregon calamity、Oregon boss。音频无需为静态关卡接入而播放或运行 Android；实现时按已有 Dakota track mapping 接线并维持默认静音。只有出现某个静态方法无法回答的具体播放时机问题，才提出短时定点观察。

## 实现边界与未决检查

| 项目 | 当前结论 | 实现前/实现时验收 |
| --- | --- | --- |
| 路线 | TDM 四入口、所有转向和出口已静态展开，135条唯一有向边闭合 | 对照网页 `runtimeWaveRedirects()` 和真实短 GameSession 转向；不以完整通关代替。 |
| 开局参数与敌方波次 | global level33 的11字段消费者映射、10个 wave header、20条 `addToWave` 请求及Boss槽位均来自本关 APK 分支 | **M34-C4 已完成：**`dakota-03-campaign-rules.test.ts` 独立逐字段/逐波核对；短 GameSession 验证 Wave 1 的现金、生命、待生成请求与入口事件，并以仅清空前置波次的短 fixture 验证 Wave 10 request index 8 实际生成 Boss。没有完整推进战役。 |
| 贴图与地形 | 768个背景命令与104个覆盖层命令逐项匹配 APK 派生参考；固定网页随机种子用于稳定变体 | `dakota-03-map.test.ts` 比较每项资源、source rectangle、目的坐标、尺寸和序列；7座横桥及19格铁路覆盖均与 TDM 输入对应。该对照不证明 Android 每次启动抽到相同随机贴图。 |
| 最终背景格网 | 网页 Dakota 贴图命令反解出的768格碰撞码与 APK 完整形塑参考逐格一致 | 测试抽查 raw36 `(14,2)`→最终码14、raw80 `(8,1)`→背景码74且另绘桥面、water `(20,22)`→96、铁路 `(11,2)`→19并由覆盖层绘轨。绘制层和背景码分开记录。 |
| 玩家碰撞 | 本报告的路线/地形格网静态结果不等于玩家移动范围、单位碰撞框或实际停靠边界 | M34-C2a 已用短 GameSession 检查 Fort、shack、大岩石、小 tipi、铁路挡车器；M34-C2b 已验证列车阻挡及解锁炸药的碰撞框登记；M34-C3a 已验证未雇佣 Gunslinger 在 GameSession 中阻挡移动；C3b 已验证已雇佣 Cannon 从两个实际 Fort 之一出生。敌方路线不能作为玩家可走范围。 |
| 静态对象与招募单位 | TDM marker 与 APK 构造类型/位置已记录 | M34-C2a 已将 raw69/70/71/76/94/95/113/116/117 接入 scene，并逐项核对位置、资源、锚点及 TDM canonical 碰撞框；M34-C2b 已将竖列车接入单位组，并将 raw102/110 配成解锁炸药对象；M34-C3a 已逐点核对61个 activity 4 单位 marker、16种解锁状态及贴图资源。没有用 sprite bounds 推断碰撞框。 |
| 随机贴图 | APK 使用运行随机；网页需要固定随机输入 | 固定种子只能用于稳定候选；除非完整证明 RNG 调用顺序，不宣称还原 Android 每次启动结果。 |
| 单位池 | Wave 1 `SET` 清空库存、第三槽 Cannon 上限5；模板独立于六个初始 Cannon。APK 单关刷新周期未证实，网页沿用共享15,000 ms 缺省 | **M34-C3b 已完成：**TDM raw113 的两个 Fort 均作为 type 2 出生场；独立 pool-only 模板不增加开局 `ScenarioUnit`。定向测试确认六个初始 Cannon、全池清空、Cannon 上限5，并通过真实 GameSession 验证雇佣入池及从实际 Fort 出生。 |
| Android/实战 | 目前没有必须依赖运行观察的未知参数 | 不完整通关、不因静态材料已足够而启动模拟器；仅针对静态无法判定的问题申请一次最小运行观察。 |

当前无必要 Android 权限或额外工具阻塞。map36 地形绘制/背景碰撞投影、网页敌方路线、静态装饰、竖列车、解锁炸药对象、61个活动/睡眠招募 marker、Fort Cannon 池模板及 level33 开局/波次规则均已分别在 M34-B、C1、C2a、C2b、C3a、C3b、C4 闭合；尚待接入文案资源和正式目录，详见实施计划 M34-C5 与 M34-D。现有 APK、Smali、TDM fixture 和本地工具足以完成剩余静态及短会话核验。
