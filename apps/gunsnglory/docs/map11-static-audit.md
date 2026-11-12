# Mississippi 第 11 关：Traveller’s Town 静态审计

## 审计结论

Traveller’s Town 是完整战役的第 11 关，使用 APK 资源 res/raw/td_map_14.tdm；地图文件编号比战役关卡编号多 3。原始 TDM 为 32×24 格、770 字节，包含 4 个地图边缘出生点、2 个北侧出口、48 个可达路线控制点、2 组长度不同的水平列车和 1 组蒸汽船。新开局地图有 2 个活动步兵单位；休眠单位与特殊单位按原版读档和解锁分支处理。关卡含 8 波、18 条敌人请求，没有玩家招募池动作。

Mississippi 专用地形贴图、map14 网页地形数据及正式关卡入口已接入。M11-E3-B 补齐关卡文案、波次对白、头像/语音触发、地区音乐路由与结算存档行为。路线和地形结论是 APK/TDM/DEX 的静态推导，不是 Android 运行轨迹；本轮不需启动 Android。

## 证据来源与边界

APK 派生数据、DEX 去编译源码和 REA 证据存放在研究分支 codex/gunsnglory-spec 的 apps/gunsnglory/docs/research/。Java 文件是 DEX 去编译结果，不是原始源码。以下结论应结合静态资源、DEX 方法和数据索引阅读；研究数据中的派生路线和地形矩阵不是设备截图。

| 证据名 | 研究材料 | 支持范围 |
| --- | --- | --- |
| MAP11-IDENTITY | data/map-inventory.json 的 source 与 td_map_14.tdm 条目；BasicMap.loadMap、GunsAndGloryThread.restartLevel | APK 身份、资源地图编号、战役映射及 TDM 原始格网。地图文件总数 63 不代表战役关卡数；map11–13 不在战役映射序列中。 |
| MAP11-ROUTES | data/static-route-graph.json 的 index 14 条目；EnemyDirector、EnemyDirectorField、PriorityMap 的 DEX/REA 记录 | 出生点、控制点、出口、边、可达性和分支的静态方向场推导，不代表逐帧运行结果。 |
| MAP11-TERRAIN | data/terrain-render-index.json 的 map_index 14 条目；Mississippi.drawBackgroundLayer 与 BackgroundMap | 背景/道路逐格结果、随机候选及桥墩位置。候选集来自 APK 算法，网页使用确定性种子时不要求每次像素复现 APK 的随机抽样。 |
| MAP11-OBJECTS | data/train-map-object-inventory 中 map_index 14 的条目；GameObjectManager.createGameObjectsFromBasicMap、createTrainFromMap、createSteamerFromMap、GameObjectDecoration | 静态装饰、两组列车、活动/休眠单位、蒸汽船组件及新开局/读档条件。对象清单是 TDM 与工厂分支的静态遍历。 |
| MAP11-UNIT | data/level-config.json 的 unitTypeMap、unitsByField、unlockByUnitType；Steamer、GameObjectUnit、GameObjectCompoundUnit | 蒸汽船部件单位类型、活动状态、资源、移动和碰撞/武器行为。 |
| MAP11-PARAMETERS | data/level-config.json 中 index 10 行；GameDesignData、GunsAndGloryThread、SpawnPoolManager、Gambler | 开局经济、生命、升级上限、难度倍率、宝箱字段消费者和 Gambler 构造条件。 |
| MAP11-WAVES | GameDesignWaves.setWaves 中 i == 11 代码块（反编译行 495–527）；data/waves.json 的 levelId 11；wave-constant-resolution.json | 8 个 newWave、18 个按源码交错顺序归属的 addToWave、符号常量和数量向量槽位。 |
| MAP11-TEXT | data/string-resources.json 的 T_LEVEL_NAME_14、T_LEVEL_INFO_14、T_LEVEL_NAME_WON_14、T_CAMPAIGN_11_01–08；InGameGeneralMessageDialog | APK 英文标题、简介、胜利标题、对白、头像到语音的调用映射。中文文案属于网页翻译。 |
| MAP11-ASSETS-AUDIO | data/resource-inventory.json、drawable-use-index.json、audio-use-index.json；Mississippi.loadIngameImagesPack 与 Steamer | Mississippi 别名贴图、船只/双炮资源以及地区音乐和音效的 APK 存在性与代码引用。资源存在本身不代表网页已经接入。 |

## 地图、地形与路线

TDM 编码为 [width:u8, height:u8, y-major cell bytes]，坐标从左上角 (0,0) 起，x 向右、y 向下。地图频数由原始 TDM 重新统计如下：

| 格值 | 数量 | 格值 | 数量 | 格值 | 数量 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 275 | 16 | 23 | 32 | 130 |
| 36 | 54 | 40–43 | 各 1 | 48 | 2 |
| 52 | 18 | 53 | 4 | 54 | 14 |
| 55 | 5 | 56 | 3 | 57 | 4 |
| 69–71 | 各 3 | 74 | 2 | 75 | 1 |
| 80 | 6 | 82 | 14 | 83 | 4 |
| 84 | 3 | 86–87 | 各 2 | 88 | 10 |
| 96 | 6 | 97 | 7 | 101 | 3 |
| 104–105 | 各 1 | 120、121、123 | 各 1 | 124 | 147 |
| 126 | 9 | 130–131 | 各 1 |  |  |

- 出生 marker 40、41、42、43 分别位于 (0,15)、(0,16)、(31,15)、(31,16)。西岸出生点向东，东岸出生点向西。
- 出口 marker 48 位于 (14,0)、(15,0)。
- 静态方向场共有 48 个 route control、4 个出生点、2 个出口和 59 条有向边；48/48 控制点、2/2 出口均可达，异常路径数为 0。七个双出边控制点位于 (21,8)、(5,9)、(4,14)、(24,14)、(4,15)、(5,15)、(23,15)。完整边和逐出生点可达集合以 MAP11-ROUTES 为准，网页测试不得只覆盖一条“代表路线”。
- 出生点与首个控制点：pool 0 从 (0,15) 到 (4,15)，可达 19 个控制点和北侧出口 (14,0)；pool 2 从 (31,15) 到 (26,15)，可达 18 个控制点和两个出口；pool 1 从 (0,16) 到 (5,16)，可达 15 个控制点和 (14,0)；pool 3 从 (31,16) 到 (25,16)，可达 25 个控制点和两个出口。

Mississippi 的背景矩阵有 32×24 格，街道/桥梁矩阵与其分层。背景图集依据 Mississippi 的资源别名选择：峡谷、峡谷墙变化、沙地、沙地变化、水边、水边变化、路径及路径变化分别使用 miss_tiles_canyon、miss_tiles_canyon_wall_var、miss_tiles_desert、miss_tiles_desert_var、miss_tiles_waterside、miss_tiles_waterside_var、miss_tiles_path、miss_tiles_path_var。tiles_canyon_floor、两种 canyon floor 变化、shadow、shadow_var、water 等为共用资源。具体每格的候选图块、随机变化和街道值保存在 MAP11-TERRAIN；不要把原始 TDM 数字直接当作最终贴图索引。

街道层派生出 3 组横向桥面及桥墩：桥面中心格对为 (4,7)/(5,7)、(23,9)/(24,9)、(14,12)/(15,12)，每组各有左右桥墩。y=18 的两段水平铁路街道分别覆盖 x=1–13 和 x=23–30。网页绘制必须分别核对河岸、桥面、桥墩、铁路和地图边缘；不得把铁路格当成可通行路线或用背景层替代街道层。

## 地图对象和创建条件

GameObjectManager 按 TDM 扫描建立对象。下表区分原始 marker 和对象工厂结果，不把所有 marker 都视为新开局可见单位。

| TDM marker | 位置或数量 | APK 工厂结果 |
| --- | --- | --- |
| 69、70、71 | 各 3 个 | 分别映射 rocks A、rocks B、tree 装饰。 |
| 74、75 | 2 个、1 个 | windmill、water tower 装饰。 |
| 86、87 | 各 2 个 | 水平铁路左右挡块装饰。 |
| 126 | 9 个 | water rock 装饰；由 marker 减 106 得到对象类型 20。 |
| 96、97、101 | 6、7、3 个 | 新局创建 activity 4 的可招募 Gunslinger、Mexican、Grandpa；Grandpa 仍受全局 level 30 解锁条件限制。 |
| 104、105 | 各 1 个，(18,12)、(11,11) | DEX 工厂分支在新开局创建 activity 5、类型为 marker−103 的单位，即 Gunslinger 和 Mexican；不属于可招募池。 |
| 130、131 | 各 1 个，(25,5)、(13,16) | 新局创建 activity 4 的 Pyromaniac type 35、Salesman type 36，分别受全局 level 50/60 解锁条件限制。 |
| 83、84 | 2 组水平列车 | 两组使用独立 unitGroup。第一组从 (3,18) 起，创建 type 10/11 两节机车和位于 (5,18)、(6,18) 的 type 12 货车；第二组从 (26,18) 起，创建 type 10/11 机车和 (28,18) 的一节 type 12 货车。机车为 activity 5；货车为 activity 4。 |
| 120、121、123 | (7,22)、(9,22)、(10,22) | 仅 marker 120 发起一次蒸汽船组扫描；创建 type 30 位于 (7,22)、type 31 位于 (8,22)、type 32 位于 (9,22)、type 33 位于 (10,22)，共享 unitGroup。activity 依次为 5、5、4、5。marker 122 不存在。 |
| 112–114、132、102、110 | 0 个 | 无玩家生成建筑、Gambler、炸药触发器或炸药箱 marker；不能因为通用规则支持这些对象而凭空生成。 |

Steamer 实现要点：

- unit type 30–33 均由 Steamer 工厂类创建；Steamer 是复合单位、不能从常规生成池 spawn，且标记为水上单位。30/31/33 使用 unitDataSteamer，速度字段为 1000；32 使用 unitDataDoubleCannon，必须沿用对应 level config 统计。
- 每个部件使用同一组横向移动方向，Steamer.move 只更新 x 方向并将 y 方向归零；type 31 会创建蒸汽动画。Steamer 的碰撞框为 x−3840、y−4608、宽 7680、高 4608，使用本组 group id。
- 水上碰撞：APK `BackgroundMap.isReachableXWater` 允许背景码 96（水面），阻挡 12–14、16–23、48–75、97–127、160–163；常规地面碰撞则会阻挡背景码 96。原始 TDM 的 120–126 经 `BackgroundMap.createBackgroundMap` 映射为 96，不能把水上规则全局应用到步兵。marker 126 创建的 type20 水中岩石另有静态碰撞框，相对格子原点为 x=1920、y=2612、宽3840、高2534。
- 船道与岩石的实际碰撞关系：map14 的第 22 行背景在地形派生结果中 32 格均为 code 96。蒸汽船地图锚点经过 `GameObjectUnit` 的 1920 fine-unit 放置偏移后位于第 22 行 0.75 格高，Steamer 碰撞框纵向覆盖该行 0.15–0.75 格。第 21 行 marker126 岩石的碰撞框覆盖该行 0.34–0.67 格；两者纵向不相交。因此不能把这些岩石设成船道障碍，真实地图行驶验收应防止虚假的碰撞停船；静态框本身及其在确实重叠时的通用阻挡行为另行验证。以上坐标由 `GameObjectManager.createSteamerFromMap`、`GameObjectUnit`、`Steamer.createCollisionObject`、`GameObjectDecoration` 与 `CollisionManager.createCollisionObject` 的反编译方法交叉计算，仍属于 APK 静态证据而非设备运行观察。
- 图像映射：type 30/31/32 分别使用 steamboat_1/2/3；type 33 按 `trunc(fineX / 1000) % 3` 轮换 steamboat_4a/4b/4c。`frm_player_train_horizontal_width_100` 与 `frm_player_train_vertical_height_100` 在 APK 中分别为 32×40 dp；hdpi 图像帧为 48×60 像素，网页绘制框为 1×1.25 格并以单位 fineY 作脚底锚点。type 31 的 LokSteam 发射位置相对 fineX/fineY 为 +823/−10,752 fine units。只有 type 32 有武器槽位，使用 player_double_cannon 和 player_double_cannon_shot；火炮/射击帧来自 32×32 dp（hdpi 48×48）源帧，炮位图像沿 fineY 上移 7680 fine units。type 32 从 map marker 初始 activity 为 4，不应以存在火炮图为由将其改成活动状态。
- 绘制顺序：4 个部件 fineY 相同；APK `insertDrawOrder` 在相同深度时将新对象插到已有对象之前，因此绘制序为 type 33、32、31、30。每部件绘制框宽 1 格、相邻不重叠，按原版同深度顺序即可。
- 地区图像加载器明确引用上述 8 个 miss_tiles 资源。Mississippi 背景循环为 music_atmo_forest；战斗循环数组为 music_loop2_mississippi、music_loop2、music_loop3，按运行波次对数组长度取模；Steamer 欢呼音效为 sound_steamer。默认只验证映射，不播放声音。

## 关卡数值与波次

level-config 的 index 10 对应全球 level 11。当前确认的字段和值如下：

| 字段 | 值 | 状态 |
| --- | ---: | --- |
| cash / lives / maxUpgrades | 365 / 25 / 3 | 作为开局现金、初始生命、升级上限使用。 |
| enemyHpMultiplierEasy / Medium / Hard | 75 / 100 / 120 | 已确认三档敌人 HP 倍率。 |
| maxChests / chestTime / maxChestsPlayfield | 999 / 25,000 ms / 12 | `SpawnPoolManager.initNewSpawnPool` 分别设置剩余生成数与计时器；`performActionsForWave` 用 index 7 限制场上同时存在的宝箱数。 |
| awesomeMessageMin / awesomeMessageUnit | 30,000 / 5 | index 6 被 `GunsAndGloryThread` 设为 `triggerMessageMinEnemy`，`EnemyDirector` 比较敌人类型后触发特殊击败反馈；index 5 的消费者尚未确认，本批不据字段名新增行为。 |
| gamblerTime | 119,000 ms | `Gambler` 构造器将其作为最大武器冷却；map14 没有 marker 132，所以本关不创建赌场、赌徒或入口。 |

宝箱随机奖励类型也由消费者确认：`SpawnPoolManager.update` 对小于全球第 41 关的关卡从 1–4 中抽取，本关属于此范围。因此网页 `rewardTypeCount` 为 4。`GameDesignWaves` 对 level 11 没有 `spawnPoolActions`；这与地图是否存在可雇佣单位无关，不应额外增加通用生成池。

GameDesignWaves 中 index i==11 的源码块顺序为 8 个 newWave、18 个 addToWave、0 个 spawnPoolActions。每行数量向量是前 8 个敌人槽位；顺序为 Settler×1、Settler×2、Settler×3、Settler×4、Rider、Covered Wagon、Post Coach、Gold Transport。10 参数 addToWave 重载另补 0 个 Boss 和 Doc 槽位。下表按源码中 newWave 与随后 addToWave 的交错顺序分组，不能按 JSON 中分开的列表切块：

| 波 | 开始延迟；HP/速度倍率；对白头像 | 池 | 请求间隔 | 前 8 个槽位数量向量 |
| ---: | --- | ---: | ---: | --- |
| 1 | 20,000 ms；325% / 110%；Settlers | 0 | 2,000 ms | [1,1,2,2,0,0,0,0] |
| 2 | 8,000 ms；330% / 105%；Gunslinger | 0 | 2,000 ms | [1,1,2,2,2,0,0,0] |
| 3 | 8,000 ms；280% / 100%；Mexican | 0 | 2,500 ms | [0,1,1,1,2,1,0,0] |
| 3 | 同上 | 1 | 2,500 ms | [1,2,1,2,3,1,0,0] |
| 4 | 10,000 ms；200% / 105%；Gunslinger | 2 | 3,000 ms | [1,0,2,2,3,2,0,0] |
| 4 | 同上 | 3 | 3,000 ms | [1,2,2,2,3,2,0,0] |
| 5 | 6,000 ms；200% / 100%；Mexican | 0 | 3,500 ms | [0,0,1,2,2,2,1,0] |
| 5 | 同上 | 2 | 3,500 ms | [0,0,1,2,2,2,1,0] |
| 6 | 5,000 ms；250% / 105%；Settlers | 1 | 3,500 ms | [0,0,1,1,2,3,2,0] |
| 6 | 同上 | 3 | 3,500 ms | [0,2,1,0,2,3,2,0] |
| 7 | 5,000 ms；200% / 100%；Gunslinger | 0 | 4,000 ms | [1,1,0,0,3,3,2,0] |
| 7 | 同上 | 1 | 3,500 ms | [1,1,0,0,3,3,1,0] |
| 7 | 同上 | 2 | 3,500 ms | [0,2,0,0,3,3,2,0] |
| 7 | 同上 | 3 | 4,000 ms | [0,2,0,0,3,3,1,0] |
| 8 | 5,000 ms；235% / 110%；Mexican | 0 | 4,000 ms | [1,1,0,0,3,4,3,0] |
| 8 | 同上 | 1 | 3,500 ms | [1,1,0,0,3,3,2,0] |
| 8 | 同上 | 2 | 3,500 ms | [0,2,0,0,3,4,3,0] |
| 8 | 同上 | 3 | 4,000 ms | [0,2,0,0,3,3,2,0] |

符号常量解析结果为 UNIT_BONUS_DURATION_FIRE = 5,000 ms、DEFAULT_SWIPE_ANIMATION_DURATION = 250 ms、MAX_NUM_POINTS = 3,000 ms。波 4 的请求间隔来自 MAX_NUM_POINTS；不能照抄反编译表达式的第三方类名。没有 spawnPoolActions，不能复制其它关卡的玩家单位招募配置或增加招募按钮。

## 文本、头像、音频与结算

| 资源 | APK 英文基线 |
| --- | --- |
| 关卡名 T_LEVEL_NAME_14 | Traveller's Town |
| 简介 T_LEVEL_INFO_14 | Traveler's Town is a popular travel destination on the edge of the Mississippi River. |
| 单关胜利标题 T_LEVEL_NAME_WON_14 | The Rogue of Traveller's Town |
| 第 1 波 | Oh, honey, it's so beautiful here. We should take a rest soon and have a swim in the Mississippi! |
| 第 2 波 | A swim, huh? Ha! Who would do that? I have a much better idea... |
| 第 3 波 | Boss, there are some more on the way! We'll have some fireworks like on... what's that day called again? |
| 第 4 波 | It looks like someone got tipped off... They're trying from the other side! |
| 第 5 波 | How is our captain doing? He should let off some steam! |
| 第 6 波 | We should be careful, honey! Follow me, I know the way... |
| 第 7 波 | Someone scared the herd! We can't let any of them through! |
| 第 8 波 | Hey, Boss! I think these are the last! |

头像按波次顺序为 Settlers、Gunslinger、Mexican、Gunslinger、Mexican、Settlers、Gunslinger、Mexican；InGameGeneralMessageDialog 的通用头像语音映射为 Settlers→sound_siedler、Gunslinger→sound_desperado_yihaa、Mexican→sound_mexican_arriba。网页中文文案可翻译，但英文要保留 APK 原文。Mississippi 区域结束对白 T_END_CAMPAIGN_2 在 Mississippi 的局部关卡编号为 10 时使用，属于全球第 20 关区域结算，不是 Traveller’s Town 单关胜利标题。

## 已确认事实、推导与待查边界

- **已证实：**地图身份、尺寸和 TDM 格网；四个边缘出生点、两个出口；完整静态方向场可达性与七处双出边；地形候选、桥墩和铁路街道；对象工厂条件、两列列车、蒸汽船四个部件与 activity；level config index 10；八波与 18 个请求；APK 文案、头像/语音映射；Mississippi 图片/音频资源加载路径。
- **推导：**逐格的背景、街道和对象矩阵由 APK 派生 JSON 独立重算；路线可达性由 TDM marker 与方向场方法建立的 graph 得出，不是运行时路径记录。Mississippi 地形随机候选可用网页固定 seed 实现，但该 seed 不声称等同 APK 的随机状态。
- **待查：**`awesomeMessageMin=30000` 的消费者/语义，以及特定 APK 启动时的随机贴图抽样结果。前者不阻塞本关：本批不为其新增行为；后者不要求用 Android 重复启动消除。
- **不阻塞静态接入：**无须完整通关或启动 Android。只有后续发现纯静态材料无法判定的单一运行时问题，才提出最小、定点的模拟器观察。

## 网页接入状态

M11-B 已加入 `td_map_14.tdm`、真实背景/道路绘制数据，以及 8 组 `miss_tiles_*` 的 mdpi/hdpi 原图。M11-C1 的路线、静态装饰和两个新开局活动步兵，M11-C2 的两组列车，M11-C3 的蒸汽船四部件与 hdpi 船体/尾部/双炮图，以及 C4a/C4b 的水上行为和 type32 炮位规则，均已按 APK/TDM 静态资料接入并分别验收。M11-D1 已接入现金、生命、三档难度倍率、全局敌人设计、升级上限、阈值与宝箱规则；真实 map14 会话验证确认预览敌人只从四个物理出生标记生成，而不是按13条分支路线重复生成，宝箱在25,100ms到期后出现。M11-D2 已接入 APK 派生的8波、18个出生池请求、符号常量解析值及完整数量向量；真实 map14 短时检查确认首波在20,000ms前不生成敌人，第20,100ms出现pool 0的首个敌群。M11-E1 保留 APK 英文对白、波序、头像与通用语音映射，并定义 Mississippi 环境音乐及专属战斗循环；M11-E3-B 将其接入正式场景。两个 OGG 与提取文件逐字节一致，`ffprobe` 确认为44.1kHz双声道Vorbis；本批测试静音，未播放音频。M11-E2 按 marker 104/105 创建活动单位；code 96/97/101 和已解锁的130/131也会在新局创建 activity 4 可招募单位，其解锁可见性纳入 `contentVersion`。M11-E3-A 登记关卡及其 Free Play/回放版本；E3-B 还验证正式结算写入第11关完成与最高分，而 Free Play 不更改战役档案。原静态检查、类型检查、9项 M11 单测、10项受影响 E2E及独立新关卡 E2E 曾通过；新增招募单位与旧回放兼容仍待 M17 批次修正和复测。对白 portraits `settlers`、`gunslinger`、`mexican` 已存在。
