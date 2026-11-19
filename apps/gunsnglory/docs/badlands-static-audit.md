# Badlands 静态审计

## 结论与范围

**关卡内容静态清单已闭合，可以进入关卡接入。**Badlands 是 Dakota 第 4 关、全局第 34 关，使用 APK 的 TDM 文件 37。原始地图、敌方路线、地图对象类型与 marker、难度参数、9 波内容、英文文案、头像和音乐调用均已与相应 APK 资源及消费代码交叉核对。本轮没有启动 Android，没有运行完整战役，也没有试听音频。各装饰物在网页中最终采用的碰撞形状仍须沿共享构造器逐项核对并通过真实 GameSession 移动测试；本清单不声称已证明每个对象的碰撞范围。

本报告区分 APK 事实、由 APK 派生的静态结果和网页实现要求。REA/JADX 的 Java 或 Smali 是分析视图，不是原作者源码；路线图与坐标表是对 APK 数据的推导。若派生摘要和目标 APK 不一致，以 APK 原始字节及具体消费分支为准。

目标文件为用户提供的 Guns’n’Glory FREE 1.8.6 APK，包名 com.hg.gunsandgloryfree、versionCode 34，SHA-256 为 49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56。本地 APK、逐字节副本和 Apktool 提取的 map37 均已核验。REA Evidence 的 subject digest 标识目标 APK；JADX engine 的 artifact digest 标识反编译工具，不可互换。

## 关卡身份与编号映射

| 语义 | 编号 / 资源 | 核验依据 |
| --- | --- | --- |
| 战役地区与关卡 | Dakota 第 4 关；global level 34 | 当前 campaign catalog 已登记为 Dakota / Badlands / map37 |
| 关卡总量与 TDM 文件量 | APK 内有63个 `td_map_*.tdm` 文件；原版战役有60个可玩关卡 | 文件编号还包含非战役用途或未对应可玩战役的地图；TDM 文件数不能当作战役关卡数。本关的 TDM 文件37也不是战役第37关 |
| GameDesignData | 零基数组 index 33 | GameDesignData.<clinit> 中 fill-array-data 的目标为 array_8f4；必须追到父级 aput-object 的 index 0x21（十进制 33） |
| 地图 | res/raw/td_map_37.tdm | APK ZIP 原始条目；770 字节，前两字节是宽32、高24，余下768格按行存储 |
| 波次 | GameDesignWaves.setWaves 的 i == 34 分支 | 当前方法中使用 one-based global level 作为 i |
| 标题和简介 | T_LEVEL_NAME_37、T_LEVEL_INFO_37 | APK default 字符串资源 |
| 对白 | T_CAMPAIGN_34_01 至 T_CAMPAIGN_34_09 | 九波对白资源；编号按战役关卡34，不按地图文件37 |

因此不能把 level 34、GameDesignData index 33、TDM 文件 37、T_LEVEL_* 后缀 37、T_CAMPAIGN_34 文案编号混成同一个“地图编号”。

## 证据索引

| 证据键 | APK 资料或代码入口 | 可支持的结论 |
| --- | --- | --- |
| BL-APK | 1.8.6 APK；Apktool 3.0.3 资源解码 | 目标身份、包版本、Android manifest、字符串资源和 APK 条目 |
| BL-TDM | APK ZIP 条目 res/raw/td_map_37.tdm | 原始768格、尺寸、marker 数量与坐标 |
| BL-ROUTE | EnemyDirector.createEnemyDirectorFieldsFromBasicMap、EnemyDirectorField.<clinit>、EnemyDirector.setSpawningDirection | 控制点方向码、出生方向和静态路线图 |
| BL-TERRAIN | BackgroundMap.createBackgroundMap、createStreetLayerMap、shapenBackgroundMap、shapenStreetLayerMap；Dakota.drawBackgroundLayer | 初始/塑形背景格、道路覆盖层、Dakota 地形绘制顺序 |
| BL-OBJECTS | GameObjectManager.createGameObjectsFromBasicMap、createTrainFromMap、CollisionManager.createCollisionObject、GameObjectDecoration 构造与 GameObjectUnit.create/isUnlocked | 地图对象种类、单位创建分支、解锁门控、列车构造及碰撞对象创建分支；网页各实例的碰撞边界仍由 M35-B2 逐项核验 |
| BL-RULES | GameDesignData.<clinit> 中 array_8f4 及 parent aput-object | index 33 对应的12项关卡参数；参数字段语义以常量消费者为准 |
| BL-WAVES | GameDesignWaves.setWaves 的 i == 34；WaveManager.addToWave 重载；Boss/Doc group 常量 | 9个波次头、13条敌人请求、每条向量、间隔、头像及末尾特殊槽 |
| BL-COPY | APK default strings T_LEVEL_NAME_37、T_LEVEL_INFO_37、T_CAMPAIGN_34_* | 原版英文标题、简介和9段对白；中文是网页新增翻译 |
| BL-MEDIA | Dakota 的 drawBackgroundLayer、loadIngameImagesPack、setBackgroundLoop、getNextLoop 与 <clinit> | 地图图集别名、环境音乐和三首战斗循环曲 |

前述 Smali/REA 结果均针对同一个 APK。APKTool 提取件只用于交叉读取，不作为另一份目标版本。没有把 REA Evidence 的长随机 ID 抄入项目报告。

## 原始网格与路线

TDM 共有768格；完整频次如下，合计768：

| 原始值 | 数量 | 静态含义 |
| --- | ---: | --- |
| 0 / 32 / 36 | 358 / 117 / 95 | 空白、路径/地面、悬崖墙等背景原始标记；移动碰撞需看完整 BackgroundMap 转换及街道层，不可只按 raw 值推断 |
| 40 / 41 / 42 | 各1 | 敌人出生点 action 0、1、2 |
| 48 | 3 | 出口 |
| 52 / 53 / 54 | 4 / 11 / 28 | 北、南、西方向转向标记 |
| 56 / 58 / 60 | 2 / 7 / 2 | 北/西、南/北、南/西多方向转向标记 |
| 69 / 70 / 71 | 6 / 4 / 5 | 两类岩石、树 |
| 75 / 76 | 1 / 3 | 水塔、灌木 |
| 80 / 88 | 5 / 24 | 横桥与竖向桥/道路覆盖格 |
| 89 / 90 | 6 / 10 | 竖向铁路覆盖格 |
| 91 / 92 | 2 / 2 | 两段机车、两节车厢 |
| 94 / 95 | 各1 | 铁路顶部与底部挡车器 |
| 96 / 97 / 98 / 99 / 100 / 101 | 13 / 21 / 15 / 5 / 1 / 5 | Gunslinger、Mexican、Cannon、Indian、Sniper、Grandpa 招募位置 |
| 102 / 110 | 各1 | 炸药触发器、炸药箱 |
| 116 | 1 | 小屋 |
| 124 | 3 | 水域背景标记 |
| 130 / 131 | 各1 | Pyromaniac、Salesman 特殊招募位置 |

### 路线标记坐标

坐标为 (x,y)，原点在左上。转向码表示从该控制点离开的方向，不是进入控制点的方向。此图只出现 52、53、54、56、58、60 六种转向码。

| 标记 | 坐标 |
| --- | --- |
| Spawn 40 | (31,6) |
| Spawn 41 | (31,12) |
| Spawn 42 | (31,20) |
| Exit 48 | (0,8)、(0,13)、(0,18) |
| 52 / N | (14,6)、(4,20)、(24,21)、(9,22) |
| 53 / S | (14,1)、(7,3)、(4,4)、(20,4)、(25,8)、(19,13)、(9,15)、(25,16)、(14,19)、(29,20)、(12,21) |
| 54 / W | (22,1)、(10,3)、(7,4)、(14,4)、(26,4)、(16,6)、(4,8)、(10,8)、(20,8)、(22,8)、(26,8)、(16,11)、(25,11)、(27,11)、(9,13)、(10,13)、(22,13)、(15,15)、(19,15)、(27,16)、(24,17)、(25,17)、(4,18)、(19,19)、(9,20)、(14,21)、(29,21)、(12,22) |
| 56 / N,W | (22,4)、(10,15) |
| 58 / N,S | (10,4)、(26,6)、(16,8)、(10,11)、(22,11)、(27,12)、(19,17) |
| 60 / W,S | (15,11)、(14,15) |

### 路线边

所有出生点均在右边缘；EnemyDirector 将其初始方向设为向西。沿方向穿过地图道路格直到下一个路线控制点，可得到68条唯一有向边；全部54个转向点和3个出口均可达，无死路、环或越界边，展开后共有37条 spawn-to-exit 路径。图中路线格包含192个非出生格；raw36 悬崖格为0，5个横桥格均在路线中，24个竖向桥格中12个在路线中，铁路横穿路线3处。

| 起点 | 出边方向 | 终点 |
| --- | --- | --- |
| 40@(31,6) | W | 58@(26,6) |
| 41@(31,12) | W | 58@(27,12) |
| 42@(31,20) | W | 53@(29,20) |
| 52@(14,6) | N | 54@(14,4) |
| 52@(4,20) | N | 54@(4,18) |
| 52@(24,21) | N | 54@(24,17) |
| 52@(9,22) | N | 54@(9,20) |
| 53@(14,1) | S | 54@(14,4) |
| 53@(7,3) | S | 54@(7,4) |
| 53@(4,4) | S | 54@(4,8) |
| 53@(20,4) | S | 54@(20,8) |
| 53@(25,8) | S | 54@(25,11) |
| 53@(19,13) | S | 54@(19,15) |
| 53@(9,15) | S | 54@(9,20) |
| 53@(25,16) | S | 54@(25,17) |
| 53@(14,19) | S | 54@(14,21) |
| 53@(29,20) | S | 54@(29,21) |
| 53@(12,21) | S | 54@(12,22) |
| 54@(22,1) | W | 53@(14,1) |
| 54@(10,3) | W | 53@(7,3) |
| 54@(7,4) | W | 53@(4,4) |
| 54@(14,4) | W | 58@(10,4) |
| 54@(26,4) | W | 56@(22,4) |
| 54@(16,6) | W | 52@(14,6) |
| 54@(4,8) | W | 48@(0,8) |
| 54@(10,8) | W | 54@(4,8) |
| 54@(20,8) | W | 58@(16,8) |
| 54@(22,8) | W | 54@(20,8) |
| 54@(26,8) | W | 53@(25,8) |
| 54@(16,11) | W | 60@(15,11) |
| 54@(25,11) | W | 58@(22,11) |
| 54@(27,11) | W | 54@(25,11) |
| 54@(9,13) | W | 48@(0,13) |
| 54@(10,13) | W | 54@(9,13) |
| 54@(22,13) | W | 53@(19,13) |
| 54@(15,15) | W | 60@(14,15) |
| 54@(19,15) | W | 54@(15,15) |
| 54@(27,16) | W | 53@(25,16) |
| 54@(24,17) | W | 58@(19,17) |
| 54@(25,17) | W | 54@(24,17) |
| 54@(4,18) | W | 48@(0,18) |
| 54@(19,19) | W | 53@(14,19) |
| 54@(9,20) | W | 52@(4,20) |
| 54@(14,21) | W | 53@(12,21) |
| 54@(29,21) | W | 52@(24,21) |
| 54@(12,22) | W | 52@(9,22) |
| 56@(22,4) | N | 54@(22,1) |
| 56@(22,4) | W | 53@(20,4) |
| 56@(10,15) | N | 54@(10,13) |
| 56@(10,15) | W | 53@(9,15) |
| 58@(10,4) | N | 54@(10,3) |
| 58@(10,4) | S | 54@(10,8) |
| 58@(26,6) | N | 54@(26,4) |
| 58@(26,6) | S | 54@(26,8) |
| 58@(16,8) | N | 54@(16,6) |
| 58@(16,8) | S | 54@(16,11) |
| 58@(10,11) | N | 54@(10,8) |
| 58@(10,11) | S | 54@(10,13) |
| 58@(22,11) | N | 54@(22,8) |
| 58@(22,11) | S | 54@(22,13) |
| 58@(27,12) | N | 54@(27,11) |
| 58@(27,12) | S | 54@(27,16) |
| 58@(19,17) | N | 54@(19,15) |
| 58@(19,17) | S | 54@(19,19) |
| 60@(15,11) | W | 58@(10,11) |
| 60@(15,11) | S | 54@(15,15) |
| 60@(14,15) | W | 56@(10,15) |
| 60@(14,15) | S | 53@(14,19) |

路网只回答敌方控制路线，不等于玩家单位的可走范围。网页须分别检查静态绘制道路、EnemyDirector 方向、最终背景碰撞网格和对象碰撞。

## 地形与轨道

map37 使用 Dakota 地形图集。APK 的背景图层把地面、峡谷壁/地面、阴影、水边和水域按层绘制；网页应复用 Dakota 的已验证图集映射，不把道路路线折线绘制成路面。APK 会在地形构造后按相邻格塑形背景及街道；网页逐格碰撞期望应从完整转换链输出，而非把原始 raw32/raw36 直接作为最终碰撞码。

raw80 横桥格为 (22,2)、(10,5)、(20,5)、(27,13)、(9,17)。raw88 竖向桥/覆盖格：

| 行 y | x 坐标 |
| ---: | --- |
| 3–4 | 24 |
| 5–6 | 29 |
| 7–8 | 7、18 |
| 10 | 12 |
| 11 | 12、29 |
| 12 | 5、29 |
| 13 | 5 |
| 14–15 | 12、17 |
| 16–17 | 21 |
| 18 | 17 |
| 19 | 6、17 |
| 20 | 6 |

铁路轨道为 x=2，raw89 出现在 y=7、8、12、13、17、18；raw90 出现在 y=2、9、10、11、14、15、16、19、20、21。raw92 车厢在 (2,3)、(2,4)，raw91 机车在 (2,5)、(2,6)；raw94 顶端挡车器在 (2,1)，raw95 底端挡车器在 (2,22)。APK 的 createTrainFromMap 将相邻片段组成一个运动组；网页不能将四个片段处理成四列互不相关的车。

raw124 水域背景在 (0,0)、(0,1)、(0,2)。raw69 岩石 A 位于 (11,0)、(20,9)、(4,10)、(6,16)、(4,22)、(31,23)；raw70 岩石 B 位于 (1,4)、(12,7)、(18,16)、(0,23)；raw71 树位于 (30,0)、(17,2)、(25,13)、(31,14)、(20,23)；raw75 水塔位于 (1,10)；raw76 灌木位于 (14,12)、(4,14)、(18,20)；raw116 小屋位于 (5,0)。

raw36 的完整坐标按行压缩如下，可用目标 TDM fixture 逐格展开；路线图中不应有任何 raw36 墙格：

| y | raw36 的 x |
| ---: | --- |
| 0 | 14–22 |
| 2 | 7–10 |
| 3 | 4–6、11–13、20–21、23、25–26 |
| 5 | 15–16、27–28、30–31 |
| 7 | 0–1、3、5–6、8–9、17、19、21–22、25 |
| 10 | 11、13–15、23–24、27 |
| 11 | 28、30–31 |
| 12 | 0–1、3–4、6–9、19–21 |
| 14 | 11、13–14、16、18 |
| 15 | 25–26 |
| 16 | 20、22–24 |
| 17 | 0–1、3–4 |
| 18 | 15–16、18 |
| 19 | 5、7–8、29–31 |
| 20 | 12–13、25–28 |
| 21 | 10–11 |

## 招募单位、炸药与初始场景

新局 raw96–101 依 marker 对应 Gunslinger、Mexican、Cannon、Indian、Sniper、Grandpa，activity 为可招募状态；GameObjectUnit.create/isUnlocked 按单位解锁快照决定该 marker 是否实例化。raw130/131 是 Pyromaniac/Salesman 特殊招募 marker，也受各自全局里程碑门控。marker 是位置集合，不保证在每一份新档案下都显示全部单位。

| raw marker | 单位 | 数量与坐标 |
| --- | --- | --- |
| 96 | Gunslinger | 13： (9,1)、(30,4)、(11,5)、(21,5)、(31,13)、(21,14)、(3,16)、(13,17)、(23,19)、(26,19)、(1,20)、(14,23)、(28,23) |
| 97 | Mexican | 21： (25,1)、(18,2)、(28,3)、(16,4)、(6,5)、(23,5)、(13,6)、(30,7)、(14,8)、(5,9)、(29,9)、(20,10)、(8,11)、(23,14)、(5,15)、(29,15)、(7,17)、(11,17)、(28,18)、(21,20)、(17,22) |
| 98 | Cannon | 15： (7,1)、(28,1)、(11,2)、(16,2)、(9,4)、(9,9)、(17,9)、(31,10)、(0,15)、(7,15)、(15,16)、(30,17)、(12,19)、(6,22)、(19,22) |
| 99 | Indian | 5： (23,1)、(4,2)、(24,8)、(6,11)、(25,23) |
| 100 | Sniper | 1： (13,12) |
| 101 | Grandpa | 5： (30,2)、(18,4)、(0,6)、(12,8)、(22,22) |
| 130 | Pyromaniac | 1： (30,23) |
| 131 | Salesman | 1： (16,12) |

地图上共有60个常规与2个特殊候选招募 marker。TDM 没有104–109活动初始单位标记；也没有112–114 Saloon/Fort/Tipi spawn、132 Gambler 或150 Casino marker。不得因某个参数非零或 Fort 资源存在而添加不存在的建筑、赌场或单位。

raw102 是 DynamiteTrigger，位于 (27,9)；raw110 是 DynamiteBox，位于 (26,10)。地图对象的配对、显示门槛及碰撞框须按共享 APK 构造器和本图坐标实现。raw130/131 不得和炸药码混淆。

## 参数、难度和波次

GameDesignData.<clinit> 中 array_8f4 经父级 aput-object 写入 index 0x21，因此对应 global level 34 的 index 33。不能用 array_8f4 标签序号猜关卡。

| index | 十进制值 | 已确认字段 | 边界 |
| ---: | ---: | --- | --- |
| 0 | 300 | 开局现金 | — |
| 1 | 25 | 生命 | — |
| 2 | 999 | MAX_CHESTS | 上限字段，不等于地图上有999个可见箱子 |
| 3 | 25000 | CHEST_TIME（ms） | — |
| 4 | 3 | MAX_UPGRADES | — |
| 5 | 30000 | AWESOME_MESSAGE_MIN（ms） | 本关按字段设置记录，未推断额外效果 |
| 6 | 5 | AWESOME_MESSAGE_UNIT | 本关按字段设置记录，未推断额外效果 |
| 7 | 15 | MAX_CHESTS_PLAYFIELD | — |
| 8 / 9 / 10 | 56 / 75 / 110 | Easy / Medium / Hard wave HP 百分比 | 依字段常量与实际消费者映射 |
| 11 | 119000 | GAMBLER_TIME（ms） | TDM 无 Gambler/Casino marker，不单凭该计时生成对象 |

每个 addToWave 记录 action ID、生成间隔、八个普通请求槽；Boss/Doc 由其重载末尾槽位决定。以下向量以现有网页顺序描述普通槽 [Settler×1, Settler×2, Settler×3, Settler×4, Rider, Covered Wagon, Post Coach, Gold Transport]。数字是生成请求数量，不是敌人出现顺序；生成选择按游戏运行逻辑处理。

| Wave | 头像 | 开始延时 / HP% / 速度% | 请求：action@interval ms → 八槽向量；末尾特殊槽 |
| ---: | --- | --- | --- |
| 1 | Pedro | 15000 / 120 / 120 | 0@2000 → [2,3,4,5,3,2,1,0] |
| 2 | Gunslinger | 15000 / 125 / 125 | 0@2000 → [2,3,4,5,3,2,2,0] |
| 3 | Pedro | 15000 / 130 / 130 | 0@2000 → [2,2,4,5,3,2,2,1] |
| 4 | Mexican | 15000 / 140 / 135 | 1@2000 → [2,2,4,5,3,2,2,1] |
| 5 | Calamity | 15000 / 150 / 140 | 0@2500、1@2500；每条 [2,2,4,5,3,3,2,1] |
| 6 | Gunslinger | 15000 / 180 / 145 | 0@2500 → [1,2,3,4,3,3,3,2]；1@2500 → [2,1,2,3,3,3,2,3] |
| 7 | Calamity | 25000 / 190 / 150 | 2@2500 → [1,2,3,4,3,4,3,2] |
| 8 | Gunslinger | 25000 / 200 / 155 | 0、1、2 各@2500；每条 [0,0,2,3,2,4,3,2] |
| 9 | Dakota Boss | 25000 / 200 / 145 | 0@500 → 普通八槽全0，Boss槽1，Doc槽0 |

共9个 wave header、13条 addToWave 请求：各波请求数为1、1、1、1、2、2、1、3、1。末波使用 LokSteam.MAX_CLOUD_SPAWN_INTERVAL，常量值500 ms；末尾1是 Boss，不是 Doc。GameDesignWaves 没有 SpawnPoolManager.addActionForSpawnPool 调用，因此没有玩家单位生成池动作，也不需要新增 pool-only Cannon 模板。

## 文案、头像和音乐

| 资源 | APK 英文 |
| --- | --- |
| T_LEVEL_NAME_37 | Badlands |
| T_LEVEL_INFO_37 | "The Badlands aren't as bad as their reputation says." |
| T_CAMPAIGN_34_01 | I still remember when my father sent me here as a child… |
| T_CAMPAIGN_34_02 | Probably so you would get lost and never find your way back home! |
| T_CAMPAIGN_34_03 | "Hey, that's not funny! I grew up here! Alone!" |
| T_CAMPAIGN_34_04 | "The settlers are coming! The settlers are coming! Get into safety or they'll throw their clothes or some horse apples at you!" |
| T_CAMPAIGN_34_05 | "Get out of my line of fire or I'll give you a third nostril, gunslinger!" |
| T_CAMPAIGN_34_06 | "Sweetheart, I'll forgive you, because it's you." |
| T_CAMPAIGN_34_07 | "You better move your butt to the south, or you'll have four buttocks!" |
| T_CAMPAIGN_34_08 | "Save up your ammunition for the settlers, honey! They're charging the Badlands now!" |
| T_CAMPAIGN_34_09 | "I'm sure that I will be saved! Listen to me, bandits, you don't have to make an effort!" |

对白头像顺序为 Pedro、Gunslinger、Pedro、Mexican、Calamity、Gunslinger、Calamity、Gunslinger、Dakota Boss。T_LEVEL_INFO_37 与对白03–09资源值本身带有外层引号；应按当前应用资源读取与显示规则保留，不要从转录时的标点猜测。

Dakota 的地图背景循环为 music_atmo_snow。Dakota.getNextLoop 按当前 wave 在三首 battleLoops 中轮换；网页现有 Dakota 映射为 music_dakota、music_loop2、music_loop3。本次只核对资源映射和调用，不加载或播放音频。中文对白是项目翻译，不能标成 APK 原文。

## 接入门槛与非阻塞未知项

| 项目 | 当前结论 | 后续验收 |
| --- | --- | --- |
| 地图和路线 | 静态图完整；68条边、37条完整路径全部可达 | 对原始 TDM fixture 独立生成网页路线；核对地图绘制/最终碰撞，不以截图或折线代替 |
| 单位 marker 与解锁 | 62个候选招募位置；实际实例化依存档解锁 | 对默认与全解锁快照分别核对坐标、类型、activity、唯一 ID 和资源 |
| 地图碰撞 | 静态构造与地图 raw marker 已确认 | 用真实 GameSession 验证桥、墙、静态设施、睡眠单位和炸药的可走/阻挡边界 |
| 波次 | 9波、13请求、末波 Boss、无玩家池动作 | 用独立 APK 期望检查全部调用；用短 GameSession 核对首波、入口和 Boss 类型 |
| 关卡入口与进度 | catalog 已有 level34 / Badlands / map37；当前实现基线为 level33 | 接入时检查正式前置、Free Play、菜单预览、HUD 地区、结算与回放 builder |
| 随机地形 | APK 依运行期随机选择候选帧 | 固定网页 seed 用于稳定可复现，不声称逐次复刻 Android 启动的随机画面 |
| 音频 | 静态资源别名和调用链已确认 | 本批默认静音；不试听不阻塞静态接入 |
| 参数5/6消息字段 | 数值及常量名可确认，额外游戏效果未闭合 | 不猜测新行为；只有网页需要该字段且现有规则无法解释时再定位消费者 |

本报告没有 Android 运行观察或完整战役结果。只有后续具体行为无法由现有 APK 静态调用链解释时，才设计一次对应的最小观察。
