# Mississippi 第 12 关：Steam Valley 静态审计

## 审计结论

**静态审计通过，可以开始关卡接入。**Steam Valley 是全球战役第 12 关，实际读取 APK 的 `res/raw/td_map_15.tdm`，地图为 32×24 格。两处敌人入口都能到达两个出口；上侧入口覆盖 22 个路线控制点，下侧入口覆盖全部 26 个控制点。关卡含 7 波、12 条敌人生成请求、4 组蒸汽船和一个受 Pyromaniac 解锁条件控制的地图对象。

关卡身份、地图、路线、对象、波次、数值、对白、主要资源及战役进度边界都有 APK 静态材料和实际消费代码支持。网页实现不需要重新分析或启动 Android。剩余的随机贴图逐次抽样差异属于 APK 的无种子运行时随机，不阻塞实现；配置表中 `awesomeMessageMin=30000` 的消费者仍未确认，本关与上一关该值相同，不据此新增行为，属于已标明的非阻塞未知项。

本审计基于 Guns’n’Glory FREE 1.8.6 APK、REA 检查和研究分支 `codex/gunsnglory-spec` 的派生材料。JADX 输出是 DEX 反编译结果，不是原始源码；路径和地形矩阵是静态推导，不是模拟器运行记录。研究分支的资料位置以[产品规格](spec.md)中 `R/` 的定义为准。

## 证据索引

证据名使用可搜索的主题编号；每项引用 APK 方法、研究文件和适用边界，不重复堆叠机器生成的 Evidence 长串。

| 证据 | APK 方法或资料 | 支持内容与边界 |
| --- | --- | --- |
| MAP12-ID | `BasicMap.loadMap(int)`、`GunsAndGloryThread.restartLevel()`；`R/data/map-inventory.json` | 关卡到地图文件映射、TDM 编码、宽高和 marker。APK 加载规则在全球关卡号大于 10 时加 3：关卡 12 → `td_map_15.tdm`。 |
| MAP12-TERRAIN | `Mississippi.loadIngameImagesPack()`、`BackgroundMap`、`LevelPack.drawStreetLayer()`；`R/data/terrain-render-index.json`、`terrain-render-rules.json` | 背景与道路逐格派生值、变化候选、桥面和桥墩图集。随机候选来自 APK 算法；逐次抽样不等于 Android 某次运行画面。 |
| MAP12-ROUTE | `EnemyDirector`、`EnemyDirectorField`、`PriorityMap`；`R/data/static-route-graph.json` 的 map 15 | 2 个出生点、26 个转向点、2 个出口、36 条有向边及逐入口可达性。路线图是 TDM 与 DEX 逻辑的静态推导，不是逐帧轨迹。 |
| MAP12-OBJECTS | `GameObjectManager.createGameObjectsFromBasicMap()`、`createSteamerFromMap()`、`GameObjectDecoration`；`R/data/map-inventory.json` | 新局/读档 marker 分支、静态装饰、活动/休眠单位、4 组蒸汽船组件。蒸汽船移动、碰撞和组件工厂行为沿用已通过的 [M11 蒸汽船审计](map11-static-audit.md)。 |
| MAP12-RULES | `GameDesignWaves.setWaves(..., 12)`、`Wave.setContentForSpawnPoint()`、`GunsAndGloryThread.restartLevel()`、`SpawnPoolManager`；`R/data/waves.json`、`level-config.json`、`wave-constant-resolution.json` | 7 波及其源码顺序、生成点索引、10 个敌人请求槽位、关卡初始数值、宝箱和升级上限。 |
| MAP12-TEXT-AUDIO | `InGameGeneralMessageDialog.setUpDialog(int,int)`；`R/data/string-resources.json`、`audio-use-index.json`、`drawable-use-index.json`、`resource-inventory.json` | APK 英文标题、胜利标题、7 段对白、头像、头像到语音映射，以及 Mississippi 音乐/蒸汽船音效引用。资源存在不表示网页已导入。 |
| MAP12-PROGRESS | `LevelPack.getLevel(boolean)`、`BasicMap.loadMap(int)`；网页 `official-campaign.ts`、`campaign-catalog.ts`、Progress 与回放接口 | 原版地图编号、网页战役连续解锁、正式结算、Free Play 隔离与回放内容版本。网页进度写入语义以现行存储契约为准。 |

## 地图身份、地形与路线

### 身份与格网

- 原始资源：`res/raw/td_map_15.tdm`；地图文件编号是 **15**，对应全球战役第 **12** 关；不要把资源文件按 `map12` 命名。
- TDM 为 32×24 格，770 字节：宽度与高度各 1 字节，后跟按 y-major 排列的 768 个 cell 字节。
- 原始地图清单记录 63 个 TDM 文件；文件数不是可玩战役关数。关卡 12 的编号映射由 `BasicMap.loadMap(int)` 的 `level + 3` 分支证明，并与地图清单的 `campaignLevel: 12` 交叉一致。
- 标题 `T_LEVEL_NAME_15` 为 `Steam Valley`；简介 `T_LEVEL_INFO_15` 为 `In Steam Valley, the beautiful sounds of the steamboats ring out at daybreak!`；单关胜利标题 `T_LEVEL_NAME_WON_15` 为 `The Steam Valley Monster`。

### 地形与桥面

地图的背景层和街道层都是 32×24 格。背景资源沿用 Mississippi 图集：`miss_tiles_canyon`、`miss_tiles_canyon_wall_var`、`miss_tiles_desert`、`miss_tiles_desert_var`、`miss_tiles_waterside`、`miss_tiles_waterside_var`、`miss_tiles_path`、`miss_tiles_path_var`，并复用通用水面、峡谷地板、阴影和桥面图集。原始 TDM 数字不能当作最终 atlas 索引；绘制应使用 `terrain-render-index.json` 的派生矩阵及 `terrain-render-rules.json` 的 source rect。

| 街道派生值 | 数量与位置 | APK 绘制资源 |
| --- | --- | --- |
| 64 | 8 格：`(3,10)`、`(15–16,10)`、`(28,10)`、`(8–9,13)`、`(22–23,13)` | `tiles_bridge_hori` 横桥图；图集中单格覆盖可能超出格框，按 APK 原绘制尺寸处理。 |
| 76 | 8 格：`(11,8–9)`、`(26,8–9)`、`(5,14–15)`、`(20,14–15)` | `tiles_bridge_verti` 竖桥图。 |

派生数据记录 10 个横桥桥墩绘制位置，资源为 `tiles_bridge_pier_left/right`：`(3,10)` 左/右、`(15,10)` 左、`(16,10)` 右、`(28,10)` 左/右、`(8,13)` 左、`(9,13)` 右、`(22,13)` 左、`(23,13)` 右。实现时使用 `horizontal_bridge_pier_placements` 原表，不按桥面数量自行镜像补齐。

`BackgroundMap.createVariationMap()` 先按 y、再按 x 扫描背景格，随后以相同次序扫描街道格；`Util.random(int)` 调用 `java.util.Random.nextInt(int)`，而 `Util.<clinit>` 用 `System.currentTimeMillis()` 初始化共享随机对象。因此每次原版启动的具体贴图选择还受启动时刻及之前的随机调用影响。网页使用固定 Java 兼容 seed，从 APK 候选集合中生成可复现的贴图；这是稳定的网页选择策略，不是某次 Android 启动的随机结果复刻。

### 出生点、路线与出口

静态方向图共有 30 个节点：2 个 action-1 出生点、26 个 action-2 转向点、2 个 action-3 出口；共有 36 条有向边。图是无环有向图，枚举得到 36 条完整路径。地图上侧出生点 `(0,9)` 朝东，下侧出生点 `(0,15)` 朝东；出口位于 `(31,9)` 和 `(31,15)`。

| 出生点 | 静态可达转向点 | 可达出口 | 完整有向路径数 |
| --- | ---: | --- | ---: |
| `(0,9)` 上侧 | 22 / 26 | `(31,9)`、`(31,15)` | 12 |
| `(0,15)` 下侧 | 26 / 26 | `(31,9)`、`(31,15)` | 24 |

上侧入口无法进入的四个转向点 `(2,12)`、`(2,15)`、`(3,12)`、`(8,15)` 是下侧入口的前段路线节点，不构成上侧死路。8 个双出边点为 `(7,9)`、`(15,9)`、`(23,9)`、`(28,9)`、`(2,15)`、`(8,15)`、`(16,15)`、`(22,15)`。两个出口均可从两个出生点到达。

网页路线验收需覆盖 36 个静态路径分支，不能用一条手选路线代表整图。静态 `action_id` 是由 APK 路线逻辑解释的出向动作编码；不能把它当作“进入该格的方向”，也不能用道路外观替代方向场。

## 地图对象与可操作单位

### 蒸汽船

`createSteamerFromMap()` 从每个 marker 120 向右扫描到同一行的 marker 123；marker 121 建立休眠的 type 32 双炮部件，marker 122 建立活动的 type 32 部件。map15 含 4 个独立船组、共 22 个部件：

| 船组 | TDM 行与范围 | 生成组件 | 状态 |
| --- | --- | --- | --- |
| 上排西侧 | `y=3, x=15–20` | type 30@15、31@16、32@17–19、33@20 | 30/31/33 活动；3 个 type 32 休眠。 |
| 上排东侧 | `y=4, x=9–13` | type 30@9、31@10、32@11–12、33@13 | 30/31/33 活动；2 个 type 32 休眠。 |
| 下排西侧 | `y=19, x=2–6` | type 30@2、31@3、32@4–5、33@6 | marker122 的 type 32@4 活动；marker121 的 type 32@5 休眠；其余组件活动。 |
| 下排东侧 | `y=20, x=20–25` | type 30@20、31@21、32@22–24、33@25 | 30/31/33 活动；3 个 type 32 休眠。 |

各船组使用独立 movement group。总计 type 30、31、33 各 4 个；type 32 共 10 个，其中 1 个活动、9 个休眠。type 32 沿用 M11 的双炮武器、150 招募价、炮位、动画、碰撞与升级规则；type 30–33 沿水平方向移动。船只、双炮和尾部图集已由 M11 导入；map15 不含列车 marker。

地图有 15 个 marker126 水岩。上排船道位于 y=3、4，水岩位于 y=2、5；下排船道位于 y=19、20，水岩位于 y=18、21。沿用 M11 的 APK 静态碰撞框计算，岩石框与船体框不相交，不应出现船只被相邻水岩卡住的网页碰撞。

### 地面单位、装饰与新局/读档分支

| Marker | 位置/数量 | 新局行为 |
| --- | --- | --- |
| 104 | `(11,11)`，1 个 | 创建 1 个活动 Gunslinger。 |
| 96、97、100、101 | 分别 5、4、1、2 个 | APK 仅在读档恢复分支创建活动状态 4 的单位。网页未完成战局重新开始；新局不创建这些读档对象。 |
| 130 | `(18,16)`，1 个 | type 35 Pyromaniac 特殊单位；仅在对应全局解锁里程碑完成后创建。回放须恢复录制时的解锁快照。 |
| 69、71 | 各 2 个 | 静态 rocks A 与 tree 装饰。 |
| 126 | 15 个 | `e_1x1_rocks_water` 水岩装饰及其独立碰撞框。 |

map15 不含 marker 105、131、132、112–114 或火车 marker 83/84：没有第二个新局地面单位、Salesman、Gambler/Casino、玩家生成建筑或列车。七波配置没有 `spawnPoolActions`；这不等于没有可雇佣单位：9 个休眠 type 32 双炮是地图预置的可雇用对象，和按波变化的生成池不是一套机制。

## 初态、数值与敌人波次

### 关卡参数

`GunsAndGloryThread.restartLevel()` 以 `level - 1` 读取全局关卡数据；第 12 关取 `level-config.json` 的 `index: 11` 行。

| 参数 | 值 | 消费与限制 |
| --- | ---: | --- |
| 初始现金 / 生命 | 365 / 25 | 新战局初态。 |
| 最大升级档位 | 3 | 玩家单位升级上限。 |
| 宝箱总数 / 间隔 | 999 / 25,000 ms | `SpawnPoolManager.initNewSpawnPool()` 初始化。 |
| 场上宝箱上限 | 10 | `SpawnPoolManager.performActionsForWave()` 的同时存在上限。 |
| Easy / Medium / Hard 敌人 HP 倍率 | 75% / 100% / 130% | 玩家所选难度；与全局动态难度分开。 |
| `awesomeMessageMin` / `awesomeMessageUnit` | 30,000 / 5 | `restartLevel()` 将索引 6 的值 5 赋给敌人类型反馈阈值；索引 5 的 30,000 消费者尚未确认，不凭字段名新增行为。 |
| Gambler 冷却配置 | 119,000 ms | 配置行存在，但 TDM 无 marker132，本关不创建 Gambler/Casino。 |

本关全球等级小于 41，宝箱随机奖励沿用全局池前 4 种类型。敌人基础设计和穿透参数沿用 APK 全局敌人设计表；HP 倍率再乘本关波次倍率。没有单独的玩家生成池动作。

### 波次配置

`GameDesignWaves.setWaves(...,12)` 中 `newWave` 与随后的 `addToWave` 按源码顺序配组。每个请求的数量向量保留 10 个槽位；前 8 个依次为 Settler×1/×2/×3/×4、Rider、Covered Wagon、Post Coach、Gold Transport，后 2 个为 Boss、Doc。生成点索引 0 是 `(0,9)`，索引 1 是 `(0,15)`；`Wave.setContentForSpawnPoint()` 直接以第一参数为索引。

| 波 | 首次延迟 | HP / 速度 | 对白头像 | 生成点：间隔 ms `[10槽数量]` |
| ---: | ---: | ---: | --- | --- |
| 1 | 15,000 ms | 300% / 110% | Captain | 1：2,000 `[1,1,1,2,0,2,0,0,0,0]` |
| 2 | 5,000 ms | 325% / 110% | Mexican | 1：2,000 `[1,1,2,2,0,3,1,0,0,0]` |
| 3 | 5,000 ms | 275% / 110% | Settlers | 0：2,500 `[0,1,1,1,1,3,1,0,0,0]`；1：2,500 `[1,2,1,2,1,3,1,0,0,0]` |
| 4 | 5,000 ms | 275% / 110% | Settlers | 0：3,000 `[1,0,2,2,3,4,1,0,0,0]`；1：3,000 `[1,2,2,2,3,3,2,0,0,0]` |
| 5 | 5,000 ms | 275% / 120% | Gunslinger | 0：3,500 `[0,0,1,2,2,3,1,0,0,0]`；1：3,500 `[0,0,1,2,2,2,1,0,0,0]` |
| 6 | 5,000 ms | 300% / 150% | Mexican | 0：3,500 `[0,0,1,1,2,3,2,0,0,0]`；1：3,500 `[1,0,1,0,2,3,2,0,0,0]` |
| 7 | 5,000 ms | 325% / 125% | Gunslinger | 0：4,000 `[1,1,0,0,3,3,3,0,0,0]`；1：3,500 `[1,1,0,0,3,3,3,0,0,0]` |

合计 7 个 `newWave`、12 个敌人生成请求、0 个 `spawnPoolActions`。`UNIT_BONUS_DURATION_FIRE` 解析为 5,000 ms；波 4 请求间隔中的 `MAX_NUM_POINTS` 解析为 3,000 ms。不能把反编译表达式误抄为某个 Android support-library 类型名，也不能把分开的 JSON `newWaves`/`addToWave` 数组按位置直接配组。

## 对白、头像、声音与结算

| 波 | 英文 APK 原文 | 头像 | 头像语音 |
| ---: | --- | --- | --- |
| 1 | The ship is ready to cast off! You'll soon get wet, you landlubbers! | Captain | 无。`setUpDialog(int,int)` 的头像 switch 没有 `portrait_captain` 分支。 |
| 2 | We need more steamers with more cannons and firepower! | Mexican | `sound_mexican_arriba` |
| 3 | I love this beautiful calliope music. It reminds me of that film, what's it called again... | Settlers | `sound_siedler` |
| 4 | I have no idea what the film is called, honey. Something like ONCE UPON A TIME... | Settlers | `sound_siedler` |
| 5 | That echoing sound coming from both sides... we should patent it and find a name for it! | Gunslinger | `sound_desperado_yihaa` |
| 6 | Boss! Boss! They're scared and are starting to run! What should we do? | Mexican | `sound_mexican_arriba` |
| 7 | What should we do? Well... what we do best! Scare them out of their wits! | Gunslinger | `sound_desperado_yihaa` |

Mississippi 环境音乐为 `music_atmo_forest`；战斗循环为 `music_loop2_mississippi`、`music_loop2`、`music_loop3`，沿用地区循环规则。Steamer 使用 `sound_steamer`。本轮静态审计不播放声音。APK 中的 `portrait_captain.png` 已在 M12-C 从 mdpi 资源导入 `public/assets/portrait_captain.png`；其余本关头像、Mississippi 地形、Steamer 船体/炮/尾部资源已存在于网页资源目录。Captain 头像的浏览器绘制待 M12-D 关卡入口集成时做实际核对。

英文文案保留 APK default 原文，中文作为网页翻译。`T_END_CAMPAIGN_2` 是 Mississippi 区域收尾对白，全球第 20 关完成时才适用，不属于 Steam Valley 单关结算。

## 正式进度、Free Play 与回放

- `campaign-catalog.ts` 已列出 Steam Valley 为 level 12、TDM 文件号 15；正式 `officialCampaignStages` 目前止于 level 11。新增正式 stage 后应要求先完成 `campaign-mississippi-11`，并仅由正式胜利结算完成 level 12。
- Free Play 允许直接选择已实现的 Steam Valley 与任意支持难度，但结果不得修改正式完成进度、高分或后续解锁。
- 本图 marker130 可能创建解锁后的 Pyromaniac type35，因此内容版本必须包含 Pyromaniac 的全局解锁快照。回放导入用录制版本重建单位可见性，不能套用导入者当前档案。
- 档案不存未完成战局；重开时按 Steam Valley 初始现金、生命、单位、路线和波次重置。
- 单关胜利标题使用 `The Steam Valley Monster`。关卡12不是 Mississippi 区域最后一关，不触发区域结算对白。

## 未知项与门槛状态

| 项 | 状态 | 影响 |
| --- | --- | --- |
| 地图单元格的 APK 单次随机贴图抽样 | 已确认共享随机对象由 `System.currentTimeMillis()` 初始化；候选映射和网页固定 seed 已可验证，但无法从静态资料确定某次启动的抽样序列。 | 不阻塞。验收对照 APK 候选与地形层，不要求复现一次 Android 启动的随机结果。 |
| `level-config` 索引 5 的 30,000 消费者 | 未知；`restartLevel()` 中明确消费索引 6 的 5 为敌人类型反馈阈值，但没有找到索引 5 的行为消费者。 | 非本关关键差异，保留参数来源，不新增用途，不阻塞 M12。后续只在其他关卡需要解释该参数时继续查。 |
| 安卓运行轨迹 | 本次未执行 APK，也没有重复启动 Android。 | 现有目标均有静态证据；不构成阻塞。 |

**门槛结果：**地图映射明确；路线、场景、对象、关卡数值和波次清单完整且可追溯；关键实现差异及回放解锁快照已明确。可以按[实施计划](implementation-plan.md)开始 M12 实现。
