# Nevada 第 2 关：Bombington 内容审计

## 结论与范围

Bombington 是全局第 42 关，Nevada 区域第 2 关，对应 APK 的 TDM 文件 45。APK 中地图、路线、对象、单位池、十波请求、关卡参数、对白、头像和音乐均已静态交叉核对。**M6-A 通过：可进入地图、场景、规则和正式关卡接入；没有需要 Android 运行观察才能回答的阻塞项。**

网页目录 [campaign-catalog.ts](../src/content/campaign-catalog.ts) 已列出 Bombington；M6-D3-A 已将关卡模块组装成 [bombington-campaign.ts](../src/content/bombington-campaign.ts) 的正式场景内容，M6-D3-B 已登记 Level 42 stage 并接通正式/Free Play 菜单；[official-campaign.ts](../src/content/official-campaign.ts) 要求正式模式先完成 Level 41。Level 43 尚未实现。报告只覆盖 APK 静态数据和当前网页代码结构，没有运行 Android、完整推进战役、播放声音或逐帧比较 Android 画面。反编译伪代码仅作导航；涉及有歧义的分支时以 DEX Smali 条件跳转、字段写入和调用消费者为准。

## 证据入口

| 键 | 来源 | 可支持的结论及边界 |
| --- | --- | --- |
| APK186 | 用户提供的本地 APK：/Users/shiwei/Downloads/gunsnglory-1-8-6.apk；包名 com.hg.gunsandgloryfree，版本 1.8.6，version code 34 | 本报告的原版目标。未执行 APK。 |
| TDM45 | APK 内 res/raw/td_map_45.tdm；770 字节，开头尺寸为 32×24 | 原始 768 格数据、频次和坐标。审计时将 ZIP 内字节与提取文件逐字节比较，结果一致。 |
| ROUTE42 | EnemyDirector.createEnemyDirectorFieldsFromBasicMap、setSpawningDirection、EnemyDirectorField 方向表；TDM 的 40–44、48、52–66 marker | 出生 action、离开方向、完整有向图与分支。路线图是静态算法推导，不是运行画面。 |
| TERRAIN42 | BackgroundMap.createBackgroundMap、createStreetLayerMap、createVariationMap、shapenBackgroundMap、shapenStreetLayerMap、isFreeToWalk、isReachable；Nevada.drawBackgroundLayer | 原始 TDM 如何变成背景、街道覆盖和最终可达性判断。贴图与碰撞需分层实现；不能仅用 raw code 直接断言可走。 |
| OBJECT42 | GameObjectManager.createGameObjectsFromBasicMap、createTrainFromMap；GameObjectSpawnLocation 构造；GameObjectUnit.create/isUnlocked；GameObjectDecoration 构造；DynamiteTrigger.selectDynamiteBox | marker 到初始对象、睡眠单位、建筑、玩家生成位置、炸药和列车组的对应。对象边界以 APK 碰撞逻辑为准，不能从图片矩形猜测。 |
| LEVEL42 | GameDesignData.<clinit> 中 global level 42 对应的第 42 行（零起始索引 41）及各字段读取者 | 12 个原始参数和经消费者验证的语义；单独的地图奖励未写在此行。 |
| WAVES42 | GameDesignWaves.setWaves 的 level == 42 分支；WaveManager.addToWave、Wave.setContentForSpawnPoint、WaveManager.updateWave；SpawnPoolManager 构造、performActionsForWave 和 update | 10 个 wave、39 条敌方请求及两条玩家单位池动作；玩家池类型与建筑类型的通用映射见单位池小节。向量是请求计数，不是确定的敌人出场顺序。 |
| CRATE42 | SpawnPoolManager.update() 中 LevelPack.getLevel(false) >= 41 ? 7 : 4 分支 | 第 42 关奖励箱可抽取类型 1–7；该数字不是 GameDesignData 参数行中的字段。证据来自 JADX 反编译视图，不是 APK 原始 Java 源码。 |
| COPY42 | APK strings：T_LEVEL_NAME_45、T_LEVEL_INFO_45、T_CAMPAIGN_42_1 至 T_CAMPAIGN_42_10；对应头像 drawable | 英文关名、介绍、逐波对白与头像。APK 不含中文本地化。 |
| AUDIO42 | Nevada.<clinit>、setBackgroundLoop、getNextLoop；APK raw 资源表 | Nevada 环境音乐和战斗循环选择。只证明资源与调用关系，不证明设备上的实际混音效果。 |
| WEB42 | 当前 campaign-catalog.ts、official-campaign.ts、Bombington/Nevada 内容模块与 public/assets | 说明目录已有记录；M6-B/C、D1、D2、D3-A/B 已接入地图规则、单位池、波次、对白、头像、音乐、完整 ScenarioContent、Level 42 正式 stage 和 Free Play 菜单；回放工厂仍待 M6-D3-C。资源文件存在不等于关卡已引用它们。 |

## 关卡编号链

| 概念 | Bombington 对应值 | 依据 |
| --- | ---: | --- |
| 全局关卡 | 42 | Nevada 第二关；上一关是 Labyrinth Gulch，Level 41。 |
| 地图文件编号 | 45 | BasicMap.loadMap 对大于 10 的全局关卡将地图号加 3；42 → 45。 |
| 标题及简介资源后缀 | 45 | T_LEVEL_NAME_45 与 T_LEVEL_INFO_45。 |
| 波次/对白编号 | 42 | GameDesignWaves 的 42 分支；对白 T_CAMPAIGN_42_1..10。 |
| GameDesignData 行 | 索引 41 | 消费者按 globalLevel − 1 读取；不是地图文件号。 |
| Nevada 区域关卡后缀 | 2 | 区域首关全局等级 41；42 是 Nevada 第 2 关。 |

网页目录 Level 42、APK 地图号 45 和波次编号 42 是不同用途的索引，不能互换。当前目录行正确写为 mapFileNumber 45、titleResourceNumber 45；Level 42 正式 stage 和菜单入口已由 M6-D3-B 接入。

## 原始 TDM、地形和控制标记

TDM 尺寸为 32×24，共 768 格。完整频次如下，计数总和为 768：

| 格码 | 数量 | 格码 | 数量 | 格码 | 数量 | 格码 | 数量 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 244 | 16 | 104 | 32 | 133 | 36 | 67 |
| 40 | 1 | 41 | 1 | 42 | 1 | 43 | 1 |
| 44 | 1 | 48 | 4 | 52 | 4 | 53 | 14 |
| 54 | 18 | 55 | 7 | 56 | 2 | 58 | 2 |
| 60 | 10 | 61 | 3 | 69 | 8 | 71 | 3 |
| 73 | 8 | 74 | 1 | 75 | 1 | 76 | 3 |
| 78 | 34 | 80 | 1 | 81 | 2 | 82 | 13 |
| 83 | 2 | 84 | 2 | 86 | 1 | 87 | 1 |
| 88 | 18 | 96 | 3 | 97 | 4 | 98 | 4 |
| 99 | 4 | 100 | 1 | 101 | 2 | 102 | 9 |
| 110 | 9 | 112 | 1 | 113 | 1 | 114 | 1 |
| 117 | 3 | 118 | 5 | 130 | 5 | 131 | 1 |

### 原始码到地图层的解释

| 原始码 | APK 处理 | Bombington 中的用途 |
| ---: | --- | --- |
| 0、16 | createBackgroundMap 的基础背景路径初始落到背景码 0；后续邻格塑形和 street layer 继续参与 | 普通地表/道路基础格。16 还可能作为建筑 marker 对应的街道值保留；不能只凭此码判定单位可达。 |
| 32 | 背景初始化映射到 48；随后经过形塑、变化贴图和路线/道路层判断 | 133 格。它参与峡谷地表与道路结构；不是可直接等同“墙”或“可走路”的最终碰撞结果。 |
| 36 | 背景初始化映射到 0；邻格形塑会影响可见地形边界 | 67 格。不能把所有 raw36 当成一整格悬崖墙；最终背景和碰撞由塑形后的网格及覆盖层共同决定。 |
| 40–44 | 出生标记；方向由边界位置及 APK 出生方向逻辑确定 | 五个出生点，详见路线章节。 |
| 48 | 出口标记 | 四个出口，详见路线章节。 |
| 52、53、54、55、56、58、60、61 | 路线控制 marker；用 EnemyDirectorField 的方向表解释离开方向 | 共 60 个转向/分支 marker；其余 52–66 码在本图未出现。 |
| 69、71、73–76 | GameObjectManager/装饰对象构造 | 岩石、树、仙人掌、风车、水塔、灌木。坐标见对象章节。 |
| 78 | 无单独 GameObject 或 street-layer 分支；背景转换落入默认处理 | 34 格。APK 未提供专属对象类型或单独行为，作者意图未知。该未知不影响按实际转换逻辑实现。 |
| 80–84、86–88 | 进入 street-layer 转换；80→64、81→68、82–85→72、88→76 | 本图中构成一段水平铁路及路轨/装饰覆盖，完整坐标见铁路章节。 |
| 96–102、110、112–114 | GameObjectManager 的单位、炸药与建筑分支 | 招募单位 marker、炸药触发器/箱子、Saloon/Fort/Tipi。 |
| 117、118 | GameObjectDecoration 对应小 Tipi、树桩装饰 | 3 个小 Tipi、5 个树桩。118 的树桩映射以 Smali packed-switch 为准；JADX Java 伪代码曾将该分支误显示为 no-op。 |
| 130、131 | 特殊招募单位构造；受全局解锁状态控制 | 5 个 Pyromaniac marker、1 个 Salesman marker；当前进度不足其解锁阈值时不可招募。 |

street-layer 的其余转换为 89→80、90–93→84；该图没有这些码。raw88/89 的背景底图还会参考上方格。变化贴图和邻格塑形之后，isFreeToWalk 只按最终背景码 0 或 16–19 放行，isReachable 另考虑塑形背景与道路覆盖。因此 M6-B 必须使用网页生产地图转换对照 APK 派生结果；不能以原始格码或路线经过某格单独证明道路贴合或碰撞正确。

## 出生、路线与出口

出生 action 编号是 raw marker 减 40；动作号与路线方向码属于不同编码：

| action | raw marker 坐标 | 初始方向 |
| ---: | --- | --- |
| 0 | 40@(3,0) | 南 |
| 1 | 41@(15,0) | 南 |
| 2 | 42@(31,4) | 西 |
| 3 | 43@(31,17) | 西 |
| 4 | 44@(21,23) | 北 |

出口 marker 48 位于 (0,19)、(0,20)、(3,23)、(4,23)。控制节点方向表示“从该节点离开”的方向。

### 全部路线控制边

以下列出完整的控制节点邻接关系；方向后的坐标是下一个控制节点或出口。图中 69 个控制节点包含 5 个出生、60 个转向和 4 个出口；去重后 82 条有向边，其中出生边 5 条、转向边 77 条。所有 60 个转向 marker 均可达，没有悬空节点、越界边或路径循环。枚举所有分支得到 624 条 spawn-to-exit 控制点序列；这不是 624 种随机敌人队列。

| 控制点 | 离开方向 → 下一控制点 |
| --- | --- |
| 40@(3,0) | 南→61@(3,2) |
| 41@(15,0) | 南→53@(15,2) |
| 61@(3,2) | 东→53@(5,2)；南→61@(3,4) |
| 53@(5,2) | 南→55@(5,4) |
| 53@(15,2) | 南→53@(15,4) |
| 54@(17,2) | 西→53@(15,2) |
| 58@(17,3) | 北→54@(17,2)；南→54@(17,4) |
| 54@(18,3) | 西→58@(17,3) |
| 60@(22,3) | 西→54@(18,3)；南→54@(22,11) |
| 54@(26,3) | 西→60@(22,3) |
| 54@(28,3) | 西→54@(26,3) |
| 61@(3,4) | 东→55@(5,4)；南→55@(3,5) |
| 55@(5,4) | 东→55@(6,4) |
| 55@(6,4) | 东→53@(15,4) |
| 53@(15,4) | 南→55@(15,5) |
| 53@(16,4) | 南→53@(16,5) |
| 54@(17,4) | 西→53@(16,4) |
| 58@(28,4) | 北→54@(28,3)；南→54@(28,5) |
| 42@(31,4) | 西→58@(28,4) |
| 55@(3,5) | 东→53@(4,5) |
| 53@(4,5) | 南→55@(4,9) |
| 55@(15,5) | 东→53@(16,5) |
| 53@(16,5) | 南→55@(16,10) |
| 52@(26,5) | 北→54@(26,3) |
| 54@(28,5) | 西→52@(26,5) |
| 55@(4,9) | 东→53@(9,9) |
| 53@(9,9) | 南→53@(9,11) |
| 55@(16,10) | 东→53@(17,10) |
| 53@(17,10) | 南→53@(17,11) |
| 53@(9,11) | 南→61@(9,13) |
| 60@(11,11) | 西→53@(9,11)；南→54@(11,13) |
| 54@(15,11) | 西→60@(11,11) |
| 53@(17,11) | 南→54@(17,12) |
| 54@(22,11) | 西→53@(17,11) |
| 52@(15,12) | 北→54@(15,11) |
| 54@(17,12) | 西→52@(15,12) |
| 61@(9,13) | 东→53@(10,13)；南→55@(9,14) |
| 53@(10,13) | 南→53@(10,14) |
| 54@(11,13) | 西→53@(10,13) |
| 55@(9,14) | 东→53@(10,14) |
| 53@(10,14) | 南→54@(10,19) |
| 53@(20,17) | 南→54@(20,19) |
| 56@(22,17) | 北→54@(22,11)；西→53@(20,17) |
| 60@(23,17) | 西→56@(22,17)；南→60@(23,18) |
| 54@(26,17) | 西→60@(23,17) |
| 54@(28,17) | 西→54@(26,17) |
| 43@(31,17) | 西→54@(28,17) |
| 53@(2,18) | 南→54@(2,19) |
| 60@(3,18) | 西→53@(2,18)；南→60@(3,19) |
| 60@(4,18) | 西→60@(3,18)；南→60@(4,19) |
| 54@(5,18) | 西→60@(4,18) |
| 52@(22,18) | 北→56@(22,17) |
| 60@(23,18) | 西→52@(22,18)；南→54@(23,19) |
| 54@(2,19) | 西→48@(0,19) |
| 60@(3,19) | 西→54@(2,19)；南→60@(3,20) |
| 60@(4,19) | 西→60@(3,19)；南→60@(4,20) |
| 56@(5,19) | 北→54@(5,18)；西→60@(4,19) |
| 54@(10,19) | 西→56@(5,19) |
| 54@(20,19) | 西→54@(10,19) |
| 54@(21,19) | 西→54@(20,19) |
| 54@(23,19) | 西→54@(21,19) |
| 60@(3,20) | 西→48@(0,20)；南→48@(3,23) |
| 60@(4,20) | 西→60@(3,20)；南→48@(4,23) |
| 52@(21,21) | 北→54@(21,19) |
| 44@(21,23) | 北→52@(21,21) |

每个出生点到四个出口的完整路线数：

| 出生 action | 出口 (0,19) | 出口 (0,20) | 出口 (3,23) | 出口 (4,23) |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 32 | 40 | 40 | 16 |
| 1 | 12 | 15 | 15 | 6 |
| 2 | 72 | 90 | 90 | 36 |
| 3 | 36 | 45 | 45 | 18 |
| 4 | 4 | 5 | 5 | 2 |

展开所有控制边的中间原始格访问次数为 raw32×84、raw80×1、raw81×2、raw88×9；没有 raw36。中间格是图边采样事实，不是路线动画完整逐帧坐标，也不代表 80/81/88 的视觉纹理必然与网页地图对齐。路线中心、最终背景、道路覆盖和敌人精灵锚点需在 M6-B 分开核对。

## 场景对象、招募单位、铁路与炸药

坐标均为 TDM 零起始坐标。单位 marker 在新局分支中建立 activity 4 的休眠/可招募角色；读档分支由保存数据恢复，不能再次把 TDM marker 当成新实体。特殊单位还受全局解锁状态控制。

| Marker | 对象及坐标 |
| ---: | --- |
| 69 | Rocks A ×8：(14,0)、(26,0)、(9,1)、(18,6)、(30,6)、(30,13)、(31,18)、(1,22) |
| 71 | Tree ×3：(18,0)、(7,14)、(22,23) |
| 73 | Cactus B ×8：(22,0)、(1,5)、(10,9)、(19,9)、(30,9)、(15,16)、(10,23)、(31,23) |
| 74 | Windmill ×1：(6,1) |
| 75 | Water tower ×1：(1,11) |
| 76 | Bush ×3：(30,1)、(8,10)、(25,23) |
| 96 | Gunslinger type 1 ×3：(7,7)、(19,13)、(7,23) |
| 97 | Mexican type 2 ×4：(2,6)、(19,6)、(20,15)、(7,20) |
| 98 | Cannon type 3 ×4：(4,10)、(4,13)、(3,16)、(7,17) |
| 99 | Indian type 4 ×4：(25,6)、(26,10)、(24,11)、(30,11) |
| 100 | Sniper type 5 ×1：(27,21) |
| 101 | Grandpa type 6 ×2：(21,4)、(11,21) |
| 102 | Dynamite trigger ×9：(2,1)、(18,4)、(27,6)、(12,12)、(17,13)、(27,13)、(21,15)、(6,20)、(15,20) |
| 110 | Dynamite box ×9：(4,3)、(16,3)、(27,4)、(16,11)、(10,12)、(27,16)、(21,18)、(5,20)、(13,18) |
| 112 | Saloon spawn building ×1：(29,21) |
| 113 | Fort spawn building ×1：(2,14) |
| 114 | Tipi spawn building ×1：(29,9) |
| 117 | Small tipi decoration ×3：(25,9)、(24,13)、(31,13) |
| 118 | Tree stump decoration ×5：(1,1)、(2,8)、(4,14)、(11,14)、(16,21) |
| 130 | Pyromaniac type 35 ×5：(25,1)、(15,9)、(7,10)、(11,17)、(24,18)；全局关卡 50 解锁门槛 |
| 131 | Salesman type 36 ×1：(27,9)；全局关卡 60 解锁门槛 |

### 铁路

TDM 中有一条 y=7 的水平铁路：

| raw marker | 坐标 | APK 解释 |
| ---: | --- | --- |
| 86 | (11,7) | 左侧缓冲装饰 |
| 83 | (12,7)、(13,7) | createTrainFromMap 从第一个 83 向东扫描并生成同组机车实体，unit type 10、11 |
| 84 | (14,7)、(15,7) | 同一组中的车厢实体，unit type 12 |
| 81 | (16,7)、(22,7) | street-layer 桥/轨道覆盖格 |
| 82 | x=17–21、23–30，y=7 | 共 13 格水平轨道 |
| 87 | (31,7) | 右侧缓冲装饰 |

整组列车共用 unitGroup ID。此静态审计确认生成方向和组件；动画间距、实时位置、碰撞范围和遮挡需 M6-C 依据 APK 对象参数及网页 GameSession/生产绘制单独检查。

### 炸药配对

APK DynamiteTrigger.selectDynamiteBox 按遍历顺序为每个 trigger 选择最近且未使用的 box。网页计算采用同一最近未用规则；本图 9 组配对没有等距歧义：

| Trigger → box | Trigger → box | Trigger → box |
| --- | --- | --- |
| (2,1) → (4,3) | (18,4) → (16,3) | (27,6) → (27,4) |
| (12,12) → (10,12) | (17,13) → (16,11) | (27,13) → (27,16) |
| (21,15) → (21,18) | (6,20) → (5,20) | (15,20) → (13,18) |

global level 42 已超过炸药解锁等级 20。地图没有 raw132 Gambler marker 或 raw150 Casino marker；参数中的非零 Gambler 时间不会自行创建该角色。

## 关卡参数与单位池

GameDesignData 的 Level 42 原始行（零起始索引 41）为：

| 字段序号 | APK 字段 | 原始值 | 消费者可证语义 |
| ---: | --- | ---: | --- |
| 0 | LEVEL_DATA_CASH | 300 | 开局现金 |
| 1 | LEVEL_DATA_LIVES | 25 | 初始生命 |
| 2 | LEVEL_DATA_MAX_CHESTS | 999 | 关卡奖励箱总量上限 |
| 3 | LEVEL_DATA_CHEST_TIME | 25000 | 奖励箱计时，单位毫秒 |
| 4 | LEVEL_DATA_MAX_UPGRADES | 3 | 单位升级上限 |
| 5 | LEVEL_DATA_AWESOME_MESSAGE_MIN | 30000 | awesome-message 对应时间字段，毫秒 |
| 6 | LEVEL_DATA_AWESOME_MESSAGE_UNIT | 5 | awesome-message 对应单位/计数字段；不据字段名推导未证实效果 |
| 7 | LEVEL_DATA_MAX_CHESTS_PLAYFIELD | 15 | 同时留在场景中的奖励箱上限 |
| 8 | 难度生命倍率槽 1 | 75 | Easy 敌人 HP 为基准的 75% |
| 9 | 难度生命倍率槽 2 | 110 | Medium 敌人 HP 为基准的 110% |
| 10 | 难度生命倍率槽 3 | 155 | Hard 敌人 HP 为基准的 155% |
| 11 | LEVEL_DATA_GAMBLER_TIME | 119000 | Gambler 计时字段；没有相应地图 marker，不足以创建 Gambler |

原始数组为 [300, 25, 999, 25000, 3, 30000, 5, 15, 75, 110, 155, 119000]。此行没有“通关奖励”字段；战斗中的现金来自敌人奖励/场景收集等通用规则。M6-D3-B 已复用并测试通用正式结算，不得臆造 Bombington 专属奖金；回放导入将在 M6-D3-C 验证。

奖励箱奖励类型范围由 SpawnPoolManager.update() 的关卡门槛控制，不在该 12 项参数行中：APK 反编译视图显示 global level 41 及之后使用 7 类，之前使用 4 类。因此 Bombington（global level 42）使用 1–7；网页 rewardTypeCount 应为 7。

Wave 1 有两条单位池动作，位序为玩家单位 type 1–4（Gunslinger、Mexican、Cannon、Indian）：

| wave | 动作码 | 动作语义 | 四类单位值 |
| ---: | ---: | --- | --- |
| 1 | 1 | SET，替换当前库存 | [0, 0, 0, 0] |
| 1 | 3 | SET_MAX，替换各类库存上限 | [4, 4, 4, 4] |

动作值由 SpawnPoolManager 的 ACTION_SET、ACTION_SET_MAX 和数组写入位置确认。它们不是四种单位的初始数量；睡眠招募对象仍以 TDM marker 为准。此关没有另行写入 type 5/6 的池上限动作。

APK 通用单位池规则将 pool type 1 Gunslinger 与 type 2 Mexican 分配到 type 1 Saloon，type 3 Cannon 分配到 type 2 Fort，type 4 Indian 分配到 type 3 Tipi；规则和建筑类型由 `GameObjectSpawnLocation` 与 `SpawnPoolManager.update()` 确认，详见 [Map 30 静态审计](map30-static-audit.md)。Bombington 的 TDM 在 `(29,21)`、`(2,14)`、`(29,9)` 分别放置 raw112 Saloon、raw113 Fort、raw114 Tipi；坐标见上方对象表。生成模板只描述招募后的单位，不会额外加入初始单位列表。玩家单位池使用 `SpawnPoolManager` 的共享 15 秒间隔，不是 Level 42 参数行中的独立数值。

## 十波、三十九条敌方请求

请求向量十个槽位依次为：Settler×1、Settler×2、Settler×3、Settler×4、Rider、Covered Wagon、Post Coach、Gold Transport、Boss、Doc。每条请求写为“spawn action @ 间隔毫秒 → 十槽向量”；spawn action 0–4 映射 raw spawn marker 40–44。向量是尚待生成的请求数，WaveManager 会从可用类型中选择，不应实现成固定逐个出场序列。

| 波次 | 对白/头像 | delay / HP / speed | 请求 |
| ---: | --- | --- | --- |
| 1 | T_CAMPAIGN_42_1 / portrait_mexican | 25000 ms / 115% / 115% | 2 @ 2500 → [2,3,4,5,3,2,0,0,0,0] |
| 2 | _2 / portrait_pyromaniac | 15000 / 120% / 115% | 1 @ 2500 → [0,3,4,5,2,3,0,0,0,0]<br>2 @ 2500 → [1,3,4,5,3,1,1,0,0,0] |
| 3 | _3 / portrait_pyromaniac | 15000 / 125% / 125% | 0 @ 2500 → [0,3,4,5,3,1,1,0,0,0]<br>1 @ 2500 → [0,3,5,5,2,3,0,0,0,0]<br>2 @ 2500 → [0,3,4,4,4,3,0,0,0,0] |
| 4 | _4 / portrait_pyromaniac | 15000 / 135% / 130% | 0 @ 2500 → [0,2,5,5,3,1,1,1,0,0]<br>1 @ 2500 → [0,2,4,5,2,2,0,0,0,0]<br>2 @ 2500 → [0,2,3,3,3,2,0,0,0,0]<br>3 @ 2500 → [0,1,2,3,3,0,0,1,0,0] |
| 5 | _5 / portrait_gunslinger | 15000 / 150% / 140% | 0 @ 2300 → [1,3,4,5,3,1,1,0,0,0]<br>1 @ 2300 → [0,3,5,5,2,3,0,1,0,0]<br>2 @ 2300 → [0,3,4,5,3,3,1,1,0,0]<br>3 @ 2300 → [0,1,2,3,3,0,0,1,0,0] |
| 6 | _6 / portrait_pedro | 15000 / 170% / 145% | 0 @ 2300 → [1,3,4,5,3,1,1,0,0,0]<br>1 @ 2300 → [0,3,5,5,2,3,1,1,0,0]<br>2 @ 2300 → [0,3,4,5,3,3,2,1,0,0]<br>3 @ 2300 → [0,1,2,3,3,1,1,1,0,0]<br>4 @ 2300 → [0,1,2,3,3,1,0,0,0,0] |
| 7 | _7 / portrait_mexican | 15000 / 190% / 140% | 0 @ 2500 → [0,2,3,5,3,1,2,1,0,0]<br>1 @ 2500 → [0,2,4,5,2,3,2,1,0,0]<br>2 @ 2500 → [0,2,3,4,3,3,2,1,0,0]<br>3 @ 2500 → [0,0,1,2,3,2,1,1,0,0]<br>4 @ 2500 → [0,0,1,2,3,2,2,0,0,0] |
| 8 | _8 / portrait_deserter | 15000 / 210% / 150% | 0 @ 2500 → [0,0,0,3,6,1,2,2,0,0]<br>1 @ 2500 → [0,0,0,3,6,2,3,1,0,0]<br>2 @ 2500 → [0,0,0,3,6,2,2,2,0,0]<br>3 @ 2500 → [0,0,0,2,3,2,2,1,0,0]<br>4 @ 2500 → [0,0,0,2,3,2,2,2,0,0] |
| 9 | _9 / portrait_pedro | 15000 / 245% / 155% | 0 @ 2300 → [0,0,3,4,3,1,2,1,0,0]<br>1 @ 2300 → [0,0,3,4,2,2,2,1,0,0]<br>2 @ 2300 → [0,0,2,4,3,2,2,1,0,0]<br>3 @ 2300 → [0,0,0,2,3,2,1,1,0,0]<br>4 @ 2300 → [0,0,0,2,3,2,2,0,0,0] |
| 10 | _10 / oregon_dakota_portrait_boss | 15000 / 240% / 125% | 0 @ 2500 → [0,0,0,2,0,0,1,2,0,0]<br>1 @ 2500 → [0,0,0,0,3,0,0,0,0,0]<br>2 @ 2500 → [0,0,0,0,4,0,0,0,0,0]<br>3 @ 2500 → [0,0,0,3,0,0,0,0,0,0]<br>4 @ 2500 → [0,0,0,1,0,0,0,0,1,0] |

本表由 level 42 分支逐条抄录并核算：10 个 wave、39 个 addToWave。短重载会将缺省尾槽补零；Wave.setContentForSpawnPoint 按 spawn action 写入请求行，同一出生点的不同 action 是不同请求组。WaveManager.updateWave 根据剩余计数选择可用敌人类别，所以不能把每个向量解释为同一敌种固定数量。末波 Boss 位于第 9 槽，Doc 槽为 0；关卡测试应验证 Boss 索引而不是把它并入普通 Gold Transport。

## 标题、对白、头像与音频

| 资源 | APK 英文内容 |
| --- | --- |
| T_LEVEL_NAME_45 | Bombington |
| T_LEVEL_INFO_45 | This town is a Mecca for all lovers of large and impressive explosions. |
| T_CAMPAIGN_42_1 | Ay caramba! I like it here! Explosions and plenty horchata drinks! |
| T_CAMPAIGN_42_2 | Explosions, we need more explosions! |
| T_CAMPAIGN_42_3 | More settlers are coming, and one by one they are finding all the entrances to Bombington. |
| T_CAMPAIGN_42_4 | Don't worry, my rockets can even reach those settlers in the south-east. |
| T_CAMPAIGN_42_5 | More settlers! Nothing my gun couldn't handle, yeehaw! |
| T_CAMPAIGN_42_6 | They have found the last remaining passage in the south. Prepare the dynamite! |
| T_CAMPAIGN_42_7 | Oh my god, I love this region! So many explosions and so much gold! |
| T_CAMPAIGN_42_8 | Load the cannons, the gold wagons are coming! |
| T_CAMPAIGN_42_9 | Great, one more group and we are almost done here! |
| T_CAMPAIGN_42_10 | You won't get my gold! I've survived worse things than this. |

波次头像依次为 Mexican、Pyromaniac、Pyromaniac、Pyromaniac、Gunslinger、Pedro、Mexican、Deserter、Pedro、Oregon/Dakota Boss。对应仓库已有资源 portrait_mexican、portrait_pyromaniac、portrait_gunslinger、portrait_pedro、portrait_deserter、oregon_dakota_portrait_boss。APK strings 解码包含德、西、法、意、葡、俄、土语；没有中文。网页中文需要单独翻译，不可标成 APK 原文。

| 音轨类型 | Nevada 资源/选择规则 | 网页资源现状 |
| --- | --- | --- |
| 环境循环 | music_atmo_nevada | public/assets/music/music_atmo_nevada.ogg 存在 |
| 战斗循环序列 | music_nevada、music_loop3、music_loop4 | music_nevada.ogg、music_loop3.ogg、music_loop4.ogg 均存在；nevada-01-music.ts 已登记同一循环序列 |
| 选择方式 | Nevada battleLoops 初始化为上述三条；getNextLoop 按波次索引对 3 取模 | `bombington-music.ts` 复用 Nevada 循环；`bombington-presentation.test.ts` 静态核对波次循环和 OGG 资源，不播放声音 |

地图相关仓库素材已存在：根目录有 tiles_canyon.png、tiles_canyon_wall_var.png、tiles_desert.png、tiles_desert_var.png、tiles_path.png、tiles_path_var.png、tiles_waterside.png、tiles_waterside_var.png；tiles_canyon_floor.png 与 tiles_canyon_floor_var.png 位于 hdpi/。railway horizontal/vertical 图块和左右/上下 buffer 也位于 hdpi/。rocks、tree、cactus、windmill、bush 等装饰图已存在；water tower、Saloon、Fort、Tipi、tree stump 等对象素材位于 hdpi/。部分贴图只有 hdpi 版本。M6-B/C 已由 Bombington 地图、对象和交通模块引用相关资源；Level 42 正式场景已由 M6-D3-A 组装；Level 42 campaign stage 与正式/Free Play 菜单入口已由 M6-D3-B 接通。

## 正式解锁、结算与网页差异

- **APK 关卡身份与解锁：**Level 42 是 Nevada pack 的第二关，位于 Level 41 之后。关卡数据、波次和地图读取使用各自的编号链，不能用标题资源号直接作为 GameDesignData 行索引。特殊单位 Pyromaniac/Salesman 另受 global level 50/60 解锁门槛控制；普通 96–101 marker 仍按全局已解锁类型初始化为可招募对象。
- **结算边界：**Level 42 参数行没有专属通关奖励字段。Enemy 的 cashReward 与场景收集属于共享战斗规则；正式关卡完成/进度写入走共享 campaign 结算。M6-D3-B 已验证正式与 Free Play 结算差异，不新增 Bombington 专属奖金；replay 导入仍待 M6-D3-C 验证。
- **目录及内容注册：**campaign-catalog 已有 Nevada / Bombington / map 45 / title resource 45 一行；M6-D3-A 已建立正式 ScenarioContent，M6-D3-B 已将 Level 42 注册为正式 stage、设置 Level 41 前置条件，并接通 Free Play 菜单入口；Level 43 仍未实现。replay 路由待 M6-D3-C。
- **网页关卡专属文件：**已建立 nevada-02.json、Bombington 地图/路线/对象/单位/炸药/铁路、Level 42 规则与十波、玩家池、对白和音乐模块；M6-D3-A 的 bombington-campaign.ts 将这些内容组装成正式 ScenarioContent，并把四类单位解锁状态及独立炸药解锁状态写入内容版本。M6-D3-B 已完成 stage、正式与 Free Play 菜单，M6-D3-C 仍需接入 replay factory 并验证导入内容版本恢复。
- **画面与碰撞：**M6-B/C 已用网页地图转换、GameSession 和生产 Renderer 完成目标检查，范围和限制见地图覆盖矩阵、玩家碰撞审计及实现计划；没有 Android 同 seed 运行截图，也不据此宣称逐帧画面一致。

## 未知项与后续边界

| 项目 | 状态 | 是否阻塞关卡实现 |
| --- | --- | --- |
| raw78 的关卡作者意图 | 未知；没有专属 GameObject 或 street-layer 分支，现有处理可由默认背景转换确定 | 否；遵循 APK 实际转换。 |
| 随机图块的某次 Android 抽样结果 | 不能从静态分析固定为每次一致的图块选择 | 否；网页使用确定随机种子，验证 atlas 映射与图层，而非伪称复现某次运行随机值。 |
| 动画逐帧、动态单位遮挡与真实音频混音 | 静态资源/调用链不能证明设备实际每帧视觉和听感 | 不阻塞结构与数据接入；若实现后出现具体差异，再以网页截图/短会话定位。当前没有需要启动 Android 的具体问题。 |
| level 42 专属结算金额 | 参数行无此字段；共享结算与敌人/collectable 奖励另有通用规则 | 不阻塞；沿用共享结算，不发明关卡独有奖励。 |

## M6-A 验收记录

| 门槛 | 结果 |
| --- | --- |
| TDM 原始尺寸、逐格字节、完整格码频次 | 通过：32×24，768 格；APK ZIP 内资源与提取输入字节一致，频次总和 768。 |
| 每个出现的非地表格码均有映射或明确未知 | 通过：出生/出口/路线、地形、对象、铁路、单位、炸药、建筑均逐项说明；raw78 明确保留未知作者意图但转换路径已知。 |
| 路线分支可复算，无未解释节点、循环、越界 | 通过：5 个出生、4 个出口、60 个转向节点、82 条唯一有向边、624 条完整控制点序列；全部转向可达。 |
| 波次行及单位池动作无漏项 | 通过：10 个 newWave、39 个 addToWave、2 个玩家池动作；所有 10 槽请求向量逐项列出，按 SpawnPoolManager 语义核对。 |
| 参数、解锁、单位、文本、音频与当前网页差异 | 通过：保留 12 个原值，语义只在消费者证明时确认；对象及坐标、阈值、十条对白/头像、音乐入口和网页缺项均有清单。 |
| 关键未知对 M6-B–D 的影响 | 通过：剩余未知是设计意图或设备级画面/声音观察，不阻止静态内容和网页关卡接入；没有待用户补充的外部输入。 |

### M6-B 实现基线

1. 从 TDM45 重建 32×24 输入，保存与上述直方图及控制 marker 坐标相符的独立 fixture。
2. 从 ROUTE42 邻接表独立生成路线定义，测试五个出生 action 到四个出口的全部可达性和 82 条唯一有向边；不要以线性路线替代分支。
3. 比较 APK 派生背景转换、street layer、邻格塑形、道路覆盖与网页生产绘制命令；路线经过 raw32/80/81/88 不等于贴图已对齐。
4. 对每条路线检查地图边界和最终地形；分开验证路线中心、敌人脚底锚点、铁路/桥覆盖和玩家碰撞，不根据 raw36 或 sprite 矩形直接推断。
5. M6-C 已接入本报告列出的对象、睡眠招募单位、炮池、铁路组和炸药；M6-D1/D2 已接入参数、十波、玩家池、双语对白、头像和音乐，M6-D3-A 已组装正式场景并编码解锁快照，M6-D3-B 已接通正式与 Free Play 关卡入口及结算。M6-D3-C 尚需完成 replay 路由与快照恢复；当前剩余步骤见[实施计划](implementation-plan.md)。
