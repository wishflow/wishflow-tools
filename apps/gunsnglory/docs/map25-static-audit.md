# Oregon 第 5 关：Dynamite Plains 静态审计

## 结论与范围

Dynamite Plains 是全局第 25 关，对应用户提供的 Guns’n’Glory 1.8.6 APK `res/raw/td_map_28.tdm`。原始 TDM 为 32×24、770 字节，含 4 个敌人入口、37 个路线控制点、43 条有向边（含 4 条入口到首个控制点的连接）和 2 个出口。依据 APK 的入口方向、路线 marker 解码和直线寻路规则枚举，所有控制点和两个出口均可达，未发现环路、死路或越界。

关卡有 9 波、23 条敌人生成请求。地图包含 3 个 DynamiteTrigger 和 3 个 DynamiteBox；按 APK 的最近距离配对逻辑，三组是一一对应的。地图有 Saloon 与 Tipi，没有 Fort、Gambler 或 Casino。APK 关卡参数含 65 初始现金、1 条生命、3 次升级以及 Easy/Medium/Hard 的 86%/115%/140% 敌人 HP 倍率。

本报告以 APK 原始 TDM、REA/JADX 检查的 DEX 方法和此前 Smali 交叉核对结果为依据。JADX 输出是反编译伪代码，不是原始 Java 源码。路线图是按静态方向规则穷举的推导；本轮没有运行 Android、播放音频、手动完整通关或验证某个随机种子下的最终屏幕像素。

| 状态 | 结果 |
| --- | --- |
| APK 事实 | APK 身份、TDM 字节与格数、配置字段、波次调用、字符串和资源文件均已定位。 |
| 静态推导 | 4 个入口的路径合计覆盖全部 37 个路线点并到达两个出口；所有路线分支均在地图内，无环、无死路。三组炸药触发器分别指向各自最近的炸药箱。 |
| 网页接入状态 | M26-B–E 已迁入 map28 TDM、Oregon 网格/绘制/碰撞/路线、地图对象与炸药、初态/波次/招募池、稳定 identity、双语文案、对白肖像和音乐入口。M26-F1 已新增统一 builder 与录制解锁快照版本、回放构造器，并将 `campaign-oregon-05` 登记为正式 level 25（依赖 level 24）；Free Play 与正式结算边界已有 Progress 定向测试。M26-F2 已接通正式/Free Play 菜单、地图预览、难度、Oregon HUD、波次对白、炸药行为与回放导入路由；桌面/窄屏入口和 Oregon 01–04 回归 E2E 已通过。全目录旧计数与完整 CI 回归仍留在 M26-G。关卡预览图和炸药对象图复用现有文件。 |
| 未知项 | `awesomeMessageMin=30,000` 的消费语义未闭环；原版关卡单位池定时器最终赋值仍未定位；背景随机变体的某一次运行像素布局不属于静态可证内容。 |

## 来源索引

短键用于正文引用。证据定位用 APK 路径、类和方法名，避免在每个结论旁重复长 Evidence 字符串。

| 短键 | 来源与定位 | 支持内容与边界 |
| --- | --- | --- |
| `APK-186` | `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk`；包 `com.hg.gunsandgloryfree`，version 1.8.6 / code 34；APK SHA-256 `49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56` | 固定本报告所指 APK。SHA 只记录一次，用于确认本地分析包身份。 |
| `TDM-28` | `res/raw/td_map_28.tdm`，直接读取 APK ZIP 项 | 770 字节；头 2 字节为 32、24，后续 768 字节是 y-major 格点；TDM SHA-256 `dbb0fe70d14ba923df45842df6709b287a2bbeaabde1025c704455b1fd4720c7`。 |
| `ROUTE` | `EnemyDirector.createEnemyDirectorFieldsFromBasicMap`、`EnemyDirectorField.<clinit>`、`EnemyDirector.setSpawningDirection`、`EnemyDirector.moveEnemys` | 入口/出口/方向 marker 解码、入口朝向与控制点移动。静态路径表按这些规则从 TDM 推导，不代表动态运行轨迹。 |
| `OBJECTS` | `GameObjectManager.createGameObjectsFromBasicMap`；关键 marker 分支已与 APKTool Smali 的 switch 和新局/读档条件交叉核对 | 单位、建筑、炸药和装饰 marker 的构造关系。部分 JADX 条件表达可能反转，单位 activity 语义以 Smali 交叉检查和已有关卡对象映射为准。 |
| `DYNAMITE` | `DynamiteTrigger.selectDynamiteBox`、`DynamiteTrigger.deselect/update`、`DynamiteBox.detonate/respawn`、`GameDesignData.unitDataDynamite` | 触发器配对、点按触发、冷却、爆炸伤害与半径。结论来自静态 DEX/Smali。 |
| `LEVEL-25` | `GameDesignData.<clinit>` index 24；对应字段读取点 | 全局第 25 关的 12 个参数字段。字段语义依据读取点与研究数据表，不单从名称猜测。 |
| `WAVES-25` | `GameDesignWaves.setWaves(WaveManager, SpawnPoolManager, int)` 的 `i == 25` 分支；常量 `PathInterpolatorCompat.MAX_NUM_POINTS`、`GameObjectShot.UNIT_BONUS_DURATION_FIRE` | 9 次 `newWave`、23 次 `addToWave` 和两条 pool action。下文按源码的交错调用顺序恢复到各波。 |
| `STRINGS-28` | APK `R.string.T_LEVEL_NAME_28`、`T_LEVEL_INFO_28`、`T_CAMPAIGN_25_01..09` | 默认英文标题、简介与对白。中文翻译是网页新增内容，不属于 APK 原文。 |
| `OREGON-RENDER` | `Oregon.drawBackgroundLayer`、`drawStreetLayer`、`GameObjectManager.createGameObjectsFromBasicMap` | Oregon 地形 atlas、道路转换与对象绘制层。变体由 APK 随机源选择，静态映射不能确定某次运行的最终像素。 |
| `OREGON-MUSIC` | `Oregon.getNextLoop`、`setBackgroundLoop` 及 Oregon 音乐映射 | Oregon 环境音乐与战斗 loop 的代码关系；本轮不播放、不做混音/音量结论。 |

## 原始地图与敌人路线

TDM 网格为 32 列×24 行，每格按 32×32 像素计，逻辑尺寸 1024×768。下列频次直接从 APK ZIP 项的 768 格重新计数，合计为 768：

`0:371, 16:41, 32:102, 36:51, 40:1, 41:1, 42:1, 43:1, 48:2, 52:11, 53:6, 54:7, 55:11, 56:1, 57:1, 68:1, 72:1, 74:1, 77:1, 78:24, 79:8, 80:8, 88:9, 96:6, 97:5, 98:3, 99:7, 100:1, 101:5, 102:3, 104:1, 110:3, 112:1, 114:1, 115:5, 117:3, 118:9, 119:6, 124:36, 125:9, 130:2, 131:1`。

### 入口、出口与路线节点

入口编号为 tile code 减 40；入口均在底边并朝北。路线方向 action 为 tile code 减 52：0=N、1=S、2=W、3=E、4=N/W、5=N/E。出口 marker 为 tile 48。

| Marker | 坐标 | 方向/作用 |
| --- | --- | --- |
| 40 / spawn action 0 | `(5,23)` | 朝北，首个控制点 `(5,19)` |
| 41 / spawn action 1 | `(11,23)` | 朝北，首个控制点 `(11,16)` |
| 42 / spawn action 2 | `(14,23)` | 朝北，首个控制点 `(14,21)` |
| 43 / spawn action 3 | `(20,23)` | 朝北，首个控制点 `(20,20)` |
| 48 / exit | `(0,13)`、`(31,13)` | 左、右边界出口 |

37 个路线控制点由 marker 52–57 表示。下列边覆盖地图全部路线控制点的所有可选方向，也包括入口连接；步数是轴向格数，`EXIT` 后是出口坐标。

```text
52@(12,8) N→(12,4)                 52@(18,8) N→(18,4)
52@(8,9) N→(8,7)                  52@(22,9) N→(22,7)
52@(13,15) N→(13,9)               52@(13,16) N→(13,15)
52@(17,16) N→(17,9)               52@(10,17) N→(10,15)
52@(6,19) N→(6,17)                52@(19,20) N→(19,16)
52@(15,21) N→(15,16)

53@(8,4) S→(8,5)                  53@(22,4) S→(22,5)
53@(5,5) S→(5,7)                  53@(25,5) S→(25,7)
53@(5,7) S→(5,13)                 53@(25,7) S→(25,13)

54@(12,4) W→(8,4)                 54@(8,5) W→(5,5)
54@(8,7) W→(5,7)                  54@(13,8) W→(12,8)
54@(5,13) W→EXIT (0,13)           54@(19,16) W→(17,16)
54@(20,20) W→(19,20)

55@(18,4) E→(22,4)                55@(22,5) E→(25,5)
55@(22,7) E→(25,7)                55@(17,8) E→(18,8)
55@(25,13) E→EXIT (31,13)         55@(10,15) E→(13,15)
55@(11,16) E→(13,16)              55@(15,16) E→(17,16)
55@(6,17) E→(10,17)               55@(5,19) E→(6,19)
55@(14,21) E→(15,21)

56@(13,9) N→(13,8), W→(8,9)
57@(17,9) N→(17,8), E→(22,9)

40@(5,23) N→(5,19)                41@(11,23) N→(11,16)
42@(14,23) N→(14,21)              43@(20,23) N→(20,20)
```

路线计算将单方向 marker 连接到同向最近的下一个控制点或出口，并枚举分支 marker 列出的方向。静态可达性汇总为：4 个入口、37/37 个可达控制点、2/2 个可达出口，0 个未达节点、0 个异常路径。方向选择的概率、运行帧步长和某次实际单位走法不由上述图结构决定。

## 地图对象与关卡单位

下表坐标均来自 TDM 原始格点；tile 语义来自对象分派和现有 Oregon/Mississippi 绘制映射。装饰图片的锚点/碰撞盒仍须在 M26-B/C 按网页既有规则核对，不能只看 TDM 坐标推导碰撞。

| Tile | 数量 | 类型/资源映射 | 坐标 |
| ---: | ---: | --- | --- |
| 68 | 1 | Cactus A `e_1x1_cactus_a` | `(4,6)` |
| 72 | 1 | Stake `b_1x1_stake` | `(30,4)` |
| 74 | 1 | Windmill `b_1x1_windmill` | `(4,15)` |
| 77 | 1 | Bones `e_1x2_bones` | `(31,17)` |
| 79 | 8 | Tree A `e_1x1_tree_green_a` | `(15,0)、(31,1)、(1,9)、(21,12)、(8,13)、(13,21)、(9,22)、(22,22)` |
| 115 | 5 | Tree B `e_1x1_tree_green_b` | `(4,0)、(9,1)、(7,8)、(3,17)、(30,22)` |
| 117 | 3 | 小 Tipi `b_1x1_tipi_small` 装饰；不是单位池生成建筑 | `(26,1)、(31,6)、(27,10)` |
| 118 | 9 | Tree stump `e_1x1_tree_stump` | `(6,1)、(23,1)、(31,9)、(10,11)、(19,11)、(0,15)、(24,15)、(8,19)、(17,22)` |
| 119 | 6 | Tree C `e_1x1_tree_green_c` | `(27,4)、(3,8)、(12,12)、(18,20)、(7,21)、(26,23)` |
| 112 | 1 | Spawn location type 1 / Saloon `b_3x2_saloon` | `(2,2)` |
| 114 | 1 | Spawn location type 3 / Tipi `b_2x1_tipi` | `(29,2)` |

地图没有 tile 113，因此没有 Fort。117 是小型背景装饰，不能误作 tile 114 的 Tipi 生成建筑。地图中的关卡单位 marker：

| Tile | 数量 | 单位和初态 | 坐标 |
| ---: | ---: | --- | --- |
| 96 | 6 | type 1 Gunslinger，activity 4，可雇佣 | `(24,1)、(1,4)、(19,12)、(7,15)、(9,19)、(17,20)` |
| 97 | 5 | type 2 Mexican，activity 4，可雇佣 | `(2,7)、(7,11)、(22,15)、(28,15)、(17,18)` |
| 98 | 3 | type 3 Cannon，activity 4，可雇佣 | `(15,3)、(16,5)、(14,6)` |
| 99 | 7 | type 4 Indian，activity 4，可雇佣 | `(6,2)、(27,2)、(29,6)、(26,7)、(30,10)、(26,15)、(3,20)` |
| 100 | 1 | type 5 Sniper，activity 4，受档案解锁控制 | `(12,10)` |
| 101 | 5 | type 6 Grandpa，activity 4，受档案解锁控制 | `(3,5)、(22,11)、(9,14)、(13,18)、(29,19)` |
| 104 | 1 | type 1 Gunslinger，activity 5，新局已激活 | `(9,11)` |
| 130 | 2 | type 35 Pyromaniac，activity 4，受档案解锁控制 | `(3,10)、(21,20)` |
| 131 | 1 | type 36 Salesman，activity 4，受档案解锁控制 | `(21,2)` |

Fort/Cannon 的独立 pool 模板能力在当前代码已有 `CampaignUnitPoolDefinition.units[].template`；Riverside Mountains 和 Fort Echo 已使用该能力，不需要再次扩展接口。本图没有 Fort，且第一波把 Cannon pool 上限设为 0；虽然地图有 3 个 Cannon 雇佣 marker，不能因此伪造 Fort 或给 Cannon 增加自动生成路径。

## 炸药对象与交互

tile 102 创建触发器，tile 110 创建箱体。地图各有 3 个：

| 触发器 | 最近箱体 | 格距 | 推导 |
| --- | --- | ---: | --- |
| `(10,6)` | `(7,6)` | 3 | 与其它箱体距离更远 |
| `(20,6)` | `(23,6)` | 3 | 与其它箱体距离更远 |
| `(15,11)` | `(15,15)` | 4 | 比其余两个箱体近 |

APK 的 `selectDynamiteBox` 对每个触发器选择平方距离最近的箱体；上述三组最近对象互不冲突。点击/取消选择触发器时，若其有配对箱且武器冷却不大于 0，就设置冷却、切换按下图并调用箱体爆炸；否则显示对话框 10。冷却期间显示原版倒计时，箱体爆后会进入消失/重生状态。

`unitDataDynamite` 的关键字段：伤害类型 2、基础伤害 5,000、半径 23,040 fine units（3 格，每格 7,680）、reload 59,000 ms。爆炸用未量化的细坐标计算距离平方，边界条件为 `distance² <= radius²`；排除 enemy unit type 8。不得把它改成普通投射物 AOE 的取整或严格小于边界算法。M26-C 复用共享触发/冷却/伤害规则，核对三组对象，并以精确边界回归验证其与 APK 的 `<=` 一致。

M26-C 对照发现网页共享半径函数原先使用严格 `<`，会漏掉恰好位于 23,040 fine units 的敌人；现已修为 `<=`。`oregon-05-map-entities.test.ts` 用 map28 的真实 trigger/box 配对创建 `GameSession`，验证恰在边界的敌人受到伤害；通用单测另覆盖边界前一单位、边界和后一单位。APK 依据仍是 `DynamiteBox.detonate` 静态 DEX/Smali，不代表进行了 Android 实机观察。

## 初态、波次与单位池

`GameDesignData` index 24 是全局第 25 关。APK 原始 12 字段：`[65,1,999,25000,3,30000,5,15,86,115,140,119000]`。

| 字段 | 数值 | 实现边界 |
| --- | ---: | --- |
| 初始现金 / 生命 | 65 / 1 | 正式关、Free Play 与 replay 使用统一 builder；失败与结算按现有规则处理。 |
| `maxChests` / `chestTime` | 999 / 25,000 ms | 使用共享补给箱机制。 |
| `maxUpgrades` | 3 | 使用共享升级规则。 |
| `awesomeMessageMin` / `awesomeMessageUnit` | 30,000 / 5 | `awesomeMessageMin` 消费语义未知；只沿用已有已证实消费者，不新增解释。 |
| 场上补给箱上限 | 15 | 沿用共同参数字段。 |
| 敌人 HP Easy / Medium / Hard | 86% / 115% / 140% | 原始配置百分比。 |
| `gamblerTime` | 119,000 ms | 本地图无 Gambler/Casino marker，不创建或开放赌徒交互。 |

9 个 wave header 和对应请求如下。HP、速度值均是原始百分比；头两次 `newWave` 延迟常量分别解析为 3,000 和 5,000 ms。请求数组按槽 1–8 排列：Settler×1、Settler×2、Settler×3、Settler×4、Rider、Covered Wagon、Post Coach、Gold Transport；只有最后一波另有 Boss 槽。`action` 是入口 action ID，不是方向 action。

| 波次 | 对白键 / 肖像 | 延迟 | HP / 速度 | 入口 / 间隔 / 槽 1–8 请求（Boss 另注） |
| ---: | --- | ---: | --- | --- |
| 1 | `T_CAMPAIGN_25_01` / Dynamite | 3,000 ms | 50% / 100% | `2 / 1,000 / [0,0,0,0,0,0,0,1]` |
| 2 | `T_CAMPAIGN_25_02` / Dynamite | 5,000 ms | 50% / 105% | `1 / 1,000 / [0,0,0,0,0,0,0,1]`; `3 / 5,000 / [0,0,0,0,0,0,0,1]` |
| 3 | `T_CAMPAIGN_25_03` / Pedro | 10,000 ms | 80% / 110% | `2 / 2,000 / [1,1,1,1,2,0,1,0]`; `3 / 2,000 / [1,1,2,1,2,1,0,0]` |
| 4 | `T_CAMPAIGN_25_04` / Oregon Geezer | 10,000 ms | 85% / 115% | `0 / 2,000 / [1,1,1,1,2,0,1,0]`; `1 / 2,000 / [1,1,2,1,2,1,0,0]` |
| 5 | `T_CAMPAIGN_25_05` / Mexican | 15,000 ms | 90% / 120% | actions 0, 1, 2 each `2,500 / [0,0,0,0,0,0,0,1]` |
| 6 | `T_CAMPAIGN_25_06` / Gunslinger | 15,000 ms | 100% / 125% | `0 / 2,500 / [0,0,0,0,6,0,1,0]`; `1 / 2,500 / [0,0,0,0,7,0,0,0]`; `2 / 2,500 / [0,0,0,0,7,0,0,0]`; `3 / 2,500 / [0,0,0,0,6,0,1,0]` |
| 7 | `T_CAMPAIGN_25_07` / Oregon Geezer | 15,000 ms | 105% / 130% | `0 / 2,500 / [1,1,4,3,0,0,0,0]`; `1 / 2,500 / [1,1,4,3,0,0,0,1]`; `2 / 2,500 / [1,1,4,3,0,0,0,0]`; `3 / 2,500 / [1,1,3,3,0,0,0,1]` |
| 8 | `T_CAMPAIGN_25_08` / Gunslinger | 15,000 ms | 105% / 135% | `0 / 3,500 / [2,3,1,1,4,2,0,0]`; `1 / 3,500 / [2,2,0,3,4,2,1,0]`; `2 / 3,500 / [2,1,2,3,4,2,0,0]`; `3 / 3,500 / [1,2,1,3,4,2,1,0]` |
| 9 | `T_CAMPAIGN_25_09` / Oregon Boss | 25,000 ms | 110% / 140% | `0 / 3,000 / [0,0,0,0,0,0,0,0]`; Boss = 1 |

以上分组来自 APK 方法中 `newWave` 与 `addToWave` 的实际交错顺序，不是从被分组存放的研究 JSON 数组位置猜得。波次一共 23 条 spawn request。

第一波两条 pool action：`(wave=1, action=1, values=[0,0,0,0])` 清空 pool type 1–4 当前库存；`(wave=1, action=3, values=[3,3,0,3])` 将 pool type 1–4 最大库存设为对应值。pool type 3（Cannon）上限是 0。该行动作与地图上存在 3 个可雇佣 Cannon marker 是两种不同机制：雇佣 marker 不应被转换成地图生成点。网页运行时将零库存应用到全 37 槽，再将 Gunslinger、Mexican、Indian 的上限分别设为 3；零上限 Cannon 不需要注册池单位或 Fort。APK 的池更新 cadence 最终赋值仍未闭环；网页沿用现有 15 秒 cadence 是实现选择，不是已逆向确认的原版值。

M26-D 已按 APK 调用顺序接入 9 个 wave header、23 个请求、敌人 HP/速度倍率与 Wave 1 玩家池动作。Wave 1 在真实 `GameSession` 中首个生成请求是 slot 8 Gold Transport；Easy/Medium/Hard 的首个 Gold Transport HP 分别为 2,150、2,850、3,500。真实 Saloon hire marker 在 `GameSession` 中触发 Gunslinger 玩家池派发，生成坐标为 `(2,2)`；三类池单位的场所映射由真实 TDM marker 与定向池测试核对。单生命正式会话在单个 Gold Transport 逃脱后得到 defeat settlement；该短测试使用加速波次夹具，不代表手动推进正式关卡。正式档案写入、Free Play 与 replay 隔离仍由 M26-F1/F2 按进度与回放契约验收。

## 文本、肖像、地图预览与音频

| 资源键 | APK 默认英文原文 |
| --- | --- |
| `T_LEVEL_NAME_28` | Dynamite Plains |
| `T_LEVEL_INFO_28` | The Dynamite Plains are a welcome destination for diggers and prospective demolition experts. |
| `T_CAMPAIGN_25_01` | Good morning, Boss! While you had a siesta, we prepared this valley with some mines! You just have to tap the trigger at the right moment and KABOOM! |
| `T_CAMPAIGN_25_02` | Now that was a big bang! We even buried some more dynamite at the same spot! You just have to wait for the sun to heat up the wires! |
| `T_CAMPAIGN_25_03` | The noise seems to have woken up the settlers and the Sheriff! We should hurry up and get some help! |
| `T_CAMPAIGN_25_04` | Noise? What noise? I didn't hear anything! |
| `T_CAMPAIGN_25_05` | Boss, here come the most beautiful wagons I have ever seen! Look at how they sparkle! |
| `T_CAMPAIGN_25_06` | Anybody order some gold? The Pony Express is on its way! |
| `T_CAMPAIGN_25_07` | Wait, I hear some footsteps! This must be a lot of settlers, all on foot! Let me polish my gun! |
| `T_CAMPAIGN_25_08` | You hear footsteps but no explosions, old man? Maybe you should visit the doc and have a check-up! |
| `T_CAMPAIGN_25_09` | Who asked for me? Let me through, I'm a doctor! |

对白所需头像为 `oregon_dakota_portrait_dynamite`、`portrait_pedro`、`oregon_dakota_portrait_geezer`、`portrait_mexican`、`portrait_gunslinger`、`oregon_dakota_portrait_boss`。除 Dynamite 肖像外，其余网页资产均已存在。APK 内 Dynamite 肖像位于 `res/drawable-mdpi-v4/oregon_dakota_portrait_dynamite.png`，96×96、8,888 字节；M26-E 已原样迁入 `public/assets/oregon_dakota_portrait_dynamite.png`，并通过原 ZIP entry `cmp`、SHA 对照及 PNG 尺寸检查；六种对白头像加入启动预载。不能用近似肖像替代。

- 关卡缩略图[map28](../public/assets/menu/gng_levelmap_28.png)已存在，91×84；波次介绍应使用该图而非生成或重画地图。
- 网页已含[炸药箱](../public/assets/hdpi/dynamite_box.png)、[触发器](../public/assets/hdpi/dynamite_detonator.png)、[按下态触发器](../public/assets/hdpi/dynamite_detonator_pressed.png)和[爆炸图集](../public/assets/hdpi/sfx_dynamite_box.png)；[爆炸音效](../public/assets/sounds/sound_dynamite.ogg)也已存在。M26-C 应复用现有资源。
- `music_atmo_forest.ogg`、`music_oregon.ogg`、`music_loop2.ogg`、`music_loop3.ogg` 均已在网页资产中；APK Oregon 音乐选择有静态代码证据。M26-E 已把 Oregon 05 identity 接入既有 Oregon 环境/战斗音乐选择；默认保持静音，不以音频播放作为常规验收。实际关卡的菜单和战斗音画流程留给 M26-F2。
- APK 绘制会用 `Util.random` 选 Oregon 背景/道路变体，且该随机源独立于战斗 `Randomizer`。静态审计可核实候选 atlas 和 tile 映射，不能指定唯一最终画面；不得为了截图一致篡改地图逻辑。

## 实现边界与未闭环项

- M26-B–F2 已完成 map28 字节、绘制/碰撞/路线、对象、招募单位、炸药、初态、波次、玩家池、稳定身份、文案、对白肖像、builder、正式目录、Free Play 与回放入口。全目录进度摘要快照和应用完整 CI 仍待 M26-G；不要只用 fixture 代替 TDM 数据。
- `awesomeMessageMin=30,000` 的具体消费者仍未知；沿用有证据的共同规则，不新增阈值效果。
- 原版 `spawnPoolTimerMax` 的关卡赋值仍未知。若网页继续沿用现有共享 cadence，计划和交付中应标为网页实现选择，不能称为 APK 数值。
- Gambler timer 原值 119,000 ms，但本图无 Gambler/Casino marker；不创建赌徒内容。
- 一条生命的初态和单敌逃脱后的正式 defeat settlement 已由规则会话检查；M26-F1 已验证 level 25 正式进度、Free Play 不写入完成度/高分、回放 builder 从记录快照恢复单位与炸药状态。真实网页入口和回放导入 UI 留待 M26-F2，不靠手动完整通关确认。
- 本报告是可追溯的静态研究产物，不等于网页实现、原版运行截图、最终像素匹配或关卡通关验收。
