# Dakota 第 5 关：Ghost Town 静态审计

## 结论与范围

Ghost Town 是 Dakota 第 5 关、global level 35，读取 APK 的 res/raw/td_map_38.tdm。本轮已从目标 APK 重新核对关卡编号映射、TDM 网格、敌方路线、地图对象、关卡参数、波次调用、英文文案、头像、地形与音乐入口。静态内容已具备网页接入条件；对象碰撞和最终运行场景仍需在实现切片中用真实 GameSession 与独立 TDM 期望验证。

本报告中的 APK 分支结论来自 Smali/DEX 与资源；REA/JADX 输出是分析视图，不是原始源码。尤其 GameObjectManager.createGameObjectsFromBasicMap() 的 JADX 伪代码会把部分 fromLoadGame 分支还原反，因此新局对象语义以 Smali 条件跳转和构造调用为准。路线、地形绘制和派生清单均需按这里列出的原始数据独立重建；不以运行截图替代数据核对。

目标 APK 为 Guns’n’Glory FREE 1.8.6，包名 com.hg.gunsandgloryfree，versionCode 34，SHA-256 为 49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56。证据键使用可读主题名，不记录 REA 内部散列 ID。

## 编号映射

| 语义 | Ghost Town 对应值 | 核验方式 |
| --- | --- | --- |
| 战役顺序 | Dakota 第 5 关；global level 35 | 当前战役目录的下一关 |
| GameDesignData | 零基数组 index 34 | GameDesignData.<clinit> 中 array_910 经父级 aput-object 写入 index 0x22 |
| TDM | res/raw/td_map_38.tdm | APK 原始条目，770 字节；前两字节为宽32、高24，后续768字节按行存储 |
| 波次条件 | GameDesignWaves.setWaves() 的 i == 35 | 该方法使用 one-based global level |
| 标题与简介 | T_LEVEL_NAME_38、T_LEVEL_INFO_38 | APK default 字符串资源 |
| 波次对白 | T_CAMPAIGN_35_01 至 _09 | 按 global level 35 编号，不按 TDM 文件 38 编号 |
| 选关缩略图 | gng_levelmap_38.png | APK 有91×84缩略图；它不是战场底图 |

APK 含63个 td_map_*.tdm 文件，原版战役为60个可玩关卡。文件编号不是战役顺序；本关是 global level 35，却使用 TDM 文件38。

## 证据索引

| 证据键 | APK / 代码入口 | 可支持的结论 |
| --- | --- | --- |
| GT-APK | 目标 APK 与 manifest / resource decode | 包名、版本、文件身份和字符串来源 |
| GT-TDM | res/raw/td_map_38.tdm | 原始768格、频次、对象坐标及路线标记 |
| GT-INDEX | GameDesignData.<clinit>；字段常量及消费者 | index34 的12项参数和字段语义 |
| GT-WAVES | GameDesignWaves.setWaves() 的 i == 35；Smali 调用与 WaveManager / SpawnPoolManager | 9个波次头、19条敌人请求、2个玩家池动作和请求槽含义 |
| GT-ROUTE | EnemyDirector.createEnemyDirectorFieldsFromBasicMap、EnemyDirectorField、EnemyDirector.setSpawningDirection | action 到出生口、方向标记、路线边和完整出口路径 |
| GT-TERRAIN | BackgroundMap.createBackgroundMap、createStreetLayerMap、shapenBackgroundMap、shapenStreetLayerMap；Dakota 绘制方法 | 初始/塑形背景、街道覆盖、地形贴图层次 |
| GT-OBJECTS | GameObjectManager.createGameObjectsFromBasicMap、createTrainFromMap、createSteamerFromMap、GameObjectDecoration、GameObjectSpawnLocation | TDM 标记语义、活动/可招募对象、交通工具构造及建筑类型 |
| GT-COLLISION | GameObjectUnit.createCollisionObject、CollisionManager.testCollision、boxCheckX/Y、背景可达性方法 | 地形查询和对象边沿碰撞调用链；逐对象网页结果仍由实现测试确认 |
| GT-COPY | T_LEVEL_*_38、T_CAMPAIGN_35_* | 原版英文标题、简介、九段对白 |
| GT-MEDIA | Dakota.loadIngameImagesPack、drawBackgroundLayer、setBackgroundLoop、getNextLoop、<clinit> | Dakota 图集映射、环境音乐和战斗循环资源 |

所有以上结论针对同一 APK。APK SHA 标识目标文件；REA 的 engine artifact digest 标识工具，不可用来代替目标身份。

## 原始 TDM 与地形

TDM 为32×24，共768格；原始码频次如下，合计768：

| 原始码 | 数量 | 用途边界 |
| --- | ---: | --- |
| 0 | 361 | 空白/地面背景输入；最终地形和碰撞需经过背景塑形 |
| 16 | 42 | Dakota 背景/道路层输入；依完整转换与绘制层解释 |
| 32 | 99 | 道路/地面输入；不单独代表敌我双方通行 |
| 36 | 62 | 悬崖墙背景输入；必须核对塑形后的背景及街道覆盖，不能直接把 raw 值当最终碰撞码 |
| 40–43 | 各1 | 四个敌人出生点 |
| 48 | 3 | 出口 |
| 52 / 53 / 54 / 56 | 7 / 8 / 17 / 1 | 北、南、西、北/西方向控制标记 |
| 69 / 70 / 71 / 74 / 75 / 76 | 4 / 1 / 3 / 1 / 1 / 4 | 岩石A、岩石B、树、风车、水塔、灌木 |
| 82 / 83 / 84 / 86 / 87 / 88 | 14 / 2 / 3 / 1 / 1 / 27 | 水平铁路、机车标记、车厢、铁路端缓冲器、竖桥/道路覆盖格 |
| 96–101 | 6 / 5 / 3 / 4 / 1 / 3 | 新局可招募的 Gunslinger、Mexican、Cannon、Indian、Sniper、Grandpa marker |
| 112 / 113 / 114 | 各1 | Saloon、Fort、Tipi 招募建筑 |
| 116 | 2 | Shack |
| 120 / 121 / 123 | 1 / 2 / 1 | 蒸汽船起始/炮位/尾部片段 |
| 124 | 69 | 水域背景 |
| 126 | 1 | 水边岩石装饰 |
| 130 | 1 | Pyromaniac 特殊招募 marker |

### 敌方路线

方向标记表示从该格离开的方向。四个出生 action 与网页行优先出生点的映射为：action 0 → (25,0)，action 1 → (31,7)，action 2 → (31,15)，action 3 → (18,23)。出口为 (0,4)、(0,5)、(0,20)。路线网共有33个方向标记、38条唯一有向边、5条出生到出口的完整路径；路径中间格只经过 raw32/raw88，没有 raw0 或 raw36。

| action / 起点 | 完整节点序列（坐标:raw码） |
| --- | --- |
| 0 (25,0):40 | (25,0):40 → (25,4):54 → (20,4):53 → (20,6):54 → (16,6):52 → (16,4):54 → (10,4):53 → (10,6):54 → (5,6):52 → (5,4):54 → (0,4):48 |
| 1 (31,7):41 | (31,7):41 → (25,7):52 → (25,5):54 → (21,5):53 → (21,7):54 → (16,7):53 → (16,8):54 → (10,8):52 → (10,7):54 → (4,7):52 → (4,5):54 → (0,5):48 |
| 2 (31,15):42 | (31,15):42 → (28,15):53 → (28,18):54 → (26,18):53 → (26,21):54 → (19,21):52 → (19,16):54 → (11,16):53 → (11,20):54 → (4,20):54 → (0,20):48 |
| 3 (18,23):43 | (18,23):43 → (18,21):56 → (18,17):54 → (12,17):53 → (12,21):54 → (4,21):52 → (4,20):54 → (0,20):48 |
| 3 (18,23):43 | (18,23):43 → (18,21):56 → (12,21):54 → (4,21):52 → (4,20):54 → (0,20):48 |

这张路网只描述敌方寻路。玩家单位可走范围仍须分别核对 APK 最终背景格、道路覆盖、对象碰撞和角色脚底锚点。

### 地形绘制与铁路

从完整 Dakota 地形转换及绘制规则派生，背景层有768个格命令，街道层有91个绘制命令：tiles_railway_hori 19个、tiles_path 26个、tiles_bridge_verti 27个、tiles_path_var 19个。固定网页随机种子只保证可复现的候选纹理，不代表每次 Android 启动都选同一贴图变体。

raw82 是水平轨道覆盖输入；raw83 在 (5,1)、(6,1) 启动同一列车构造链，raw84 在 (7,1) 至 (9,1) 形成三节车厢；raw86、raw87 分别位于 (2,1)、(22,1) 作为轨道左右缓冲器。轨道在 y=1 的 raw82 格包括 x=3、4 和10–21。列车部件由 APK 横向连续扫描创建为活动/可招募单位组，不得按互不相关的静态贴图处理。

raw88 竖桥/道路覆盖坐标为：
- y=3–4：x=13、23
- y=5–7：x=7、18；另 y=5 有 x=23，y=6–7 有 x=29，y=7 另有 x=13
- y=8：x=13
- y=15–17：x=15
- y=19：x=2、8；y=20：x=2、8、15、23；y=21：x=8、15、23

水域 raw124 可按行复核：y=10 的 x=0–7、24、26–31；y=11 的 x=0–2、4、8–31；y=12 的 x=0–25。raw126 水边岩石位于 (25,10)。

## 地图对象与初始单位

### 装饰、建筑和交通工具

| raw码 | APK 对象 | 坐标 |
| --- | --- | --- |
| 69 | Rocks A | (27,1)、(22,6)、(5,14)、(13,18) |
| 70 | Rocks B | (0,14) |
| 71 | Tree | (21,9)、(31,13)、(17,19) |
| 74 | Windmill | (20,23) |
| 75 | Water tower | (7,2) |
| 76 | Bush | (30,4)、(19,8)、(25,19)、(9,23) |
| 112 | Saloon | (24,15) |
| 113 | Fort | (7,15) |
| 114 | Tipi | (29,21) |
| 116 | Shack | (27,15)、(1,23) |
| 120–123 | Steamer 五段运动组；raw120 (3,11) 起建，raw121 (5,11)、(6,11) 为两处 Cannon，raw123 (7,11) 为尾段 | (3,11) 至 (7,11)，连续同组 |

Steamer 的成员位置来自 createSteamerFromMap() 对 raw120 起点的扫描与相邻片段构造；raw124 水域格不属于船体段。它的组移动和成员碰撞不能用普通单单位矩形替代。

### 可招募单位

Smali 显示 raw96–101 和 raw130 在 fromLoadGame == false 的新局构造分支创建 activity 4 单位；JADX 对 raw96–101 的伪代码分支不可靠。各 marker 是否实际实例化仍受单位全局解锁状态控制。

| raw码 | 单位 | 坐标 |
| --- | --- | --- |
| 96 | Gunslinger | (6,4)、(17,4)、(0,6)、(24,6)、(27,8)、(31,9) |
| 97 | Mexican | (24,1)、(29,1)、(5,8)、(23,9)、(17,10) |
| 98 | Cannon | (31,4)、(2,6)、(11,6) |
| 99 | Indian | (8,3)、(27,3)、(1,8)、(13,10) |
| 100 | Sniper | (9,8) |
| 101 | Grandpa | (19,3)、(14,5)、(28,5) |
| 130 | Pyromaniac | (15,2) |

地图没有 raw104–109 活动初始单位，没有 raw102/110 炸药配对，没有 Gambler/Casino marker。不能因对应资源或全局系统存在，就在本关额外创建这些对象。raw96–101 新局活动/可招募语义、地图访问门槛与全局单位解锁门槛必须分别落实。

## 关卡参数与波次

GameDesignData.<clinit> 中 index34 对应数组 array_910。原始12项为 [300,25,999,25000,3,30000,5,15,56,75,95,118000]；字段语义追到常量及消费者后如下：

| index | 值 | 字段含义 | 备注 |
| ---: | ---: | --- | --- |
| 0 | 300 | 初始现金 | — |
| 1 | 25 | 初始生命 | — |
| 2 | 999 | MAX_CHESTS | 上限，不代表地图固定放置999个箱子 |
| 3 | 25000 | CHEST_TIME，毫秒 | — |
| 4 | 3 | MAX_UPGRADES | — |
| 5 | 30000 | AWESOME_MESSAGE_MIN，毫秒 | 记录字段值，不自行推导额外效果 |
| 6 | 5 | AWESOME_MESSAGE_UNIT | 记录字段值，不自行推导额外效果 |
| 7 | 15 | MAX_CHESTS_PLAYFIELD | — |
| 8 / 9 / 10 | 56 / 75 / 95 | Easy / Medium / Hard 波次 HP 百分比 | 按字段消费者映射 |
| 11 | 118000 | GAMBLER_TIME，毫秒 | 本图无 Gambler/Casino marker，不由此创建赌场或赌徒 |

波次请求向量是剩余生成数量，不是固定敌人出现顺序。action 0–3 分别指向本报告列出的四个出生口；Boss 使用第九个计数槽，Doc 是其后的第十槽。

| 波次 | 对白头像；开始延时 / HP% / 速度% | action@间隔毫秒 → 8个普通请求槽；特殊槽 |
| ---: | --- | --- |
| 1 | Mexican；15000 / 115 / 120 | 1@2000 → [2,3,4,5,4,3,0,0] |
| 2 | Pedro；15000 / 130 / 125 | 1@2000 → [1,2,4,5,3,2,1,0] |
| 3 | Gunslinger；15000 / 115 / 130 | 0@2500 → [1,2,4,5,3,3,1,0]；1@2500 → [0,0,4,5,3,4,2,0] |
| 4 | Indian；15000 / 155 / 140 | 0@2500 → [1,2,4,5,3,3,1,0]；1@2500 → [1,2,4,5,2,3,1,0] |
| 5 | Pedro；25000 / 145 / 140 | 2@2500 → [1,2,4,5,4,2,1,0] |
| 6 | Gunslinger；15000 / 155 / 145 | 0@2500 → [0,2,4,5,5,4,2,1]；1@2500 → [0,0,4,5,3,4,2,0]；2@3000 → [1,1,3,5,3,3,1,0] |
| 7 | Captain；15000 / 170 / 150 | 0@2500 → [0,2,4,5,3,4,2,1]；1@2500 → [0,0,4,5,2,4,2,0]；2@2500 → [1,1,3,5,3,3,2,1]；3@2500 → [0,2,3,4,3,3,1,0] |
| 8 | Geezer；15000 / 190 / 155 | 0@2500 → [0,1,4,4,3,4,2,1]；1@2500 → [1,0,4,4,2,4,2,1]；2@2500 → [1,0,3,4,4,4,2,1]；3@2500 → [0,1,3,4,3,4,2,1] |
| 9 | Dakota Boss；25000 / 210 / 160 | 0@500 → [0,0,0,0,0,0,0,0]；Boss=1，Doc=0 |

setWaves(i == 35) 中共有9个 newWave、19个 addToWave 和2个 addActionForSpawnPool。玩家池动作均在第1波：action 1 将第1池四种普通单位计数清零；action 3 把这四种单位的库存上限设为7。末波500毫秒间隔来自 LokSteam.MAX_CLOUD_SPAWN_INTERVAL 的常量消费者；第6波 action 2 的3000毫秒来自 PathInterpolatorCompat.MAX_NUM_POINTS = 0xbb8，不是按名字猜测的值。

## 英文文案、头像与音乐

| 资源 | APK 原文 |
| --- | --- |
| T_LEVEL_NAME_38 | Ghost Town |
| T_LEVEL_INFO_38 | In Ghost Town, settlers can get away from the noise of the bustling big city. |
| T_CAMPAIGN_35_01 | “Boss, I'm scared… They say that Ghost Town is haunted!” |
| T_CAMPAIGN_35_02 | “Those aren't ghosts, those are sleepy desperadoes, bandits and deserters! But they're just as ugly!” |
| T_CAMPAIGN_35_03 | “I'm not really sure… Or is it really just chance that a new bandit enters the town for every one that gets hired.” |
| T_CAMPAIGN_35_04 | These are the lost souls of our ancestors! Control them and you will control the south! |
| T_CAMPAIGN_35_05 | It looks like some settlers actually dared to cross the streets of Ghost Town in the south! Scare them to death! |
| T_CAMPAIGN_35_06 | “Whether it's ghosts or just sleepy gringos, what matters is that they all want just one thing: gold!” |
| T_CAMPAIGN_35_07 | Reporting enemy movement in the north and south! |
| T_CAMPAIGN_35_08 | North and south? Yes, I remember that one… |
| T_CAMPAIGN_35_09 | You wanna see a ghost? Here I am! And now tremble to death… And just let me pass through, okay? |

波次头像依次为 portrait_mexican、portrait_pedro、portrait_gunslinger、portrait_indian、portrait_pedro、oregon_dakota_portrait_geezer、portrait_captain、portrait_indian、oregon_dakota_portrait_boss。中文文本属于网页新增翻译。

Dakota 的环境音乐由 setBackgroundLoop() 指向 music_atmo_snow；getNextLoop() 按波次索引循环选择 battleLoops，Dakota 类初始化的资源依次为 music_dakota、music_loop2、music_loop3。本轮只核对资源和调用关系，没有加载或试听音频。Dakota 的图集加载把专用地形纹理映射到共享网页 tiles_canyon、tiles_desert 等资源名；关卡专属缩略图不是实际战场地图。

## 接入门槛与边界

| 部分 | 静态基线 | 接入验收 |
| --- | --- | --- |
| 地图/路线 | 768格；38条有向边；5条完整路线；背景绘制768条、街道绘制91条 | 从原始 TDM 独立生成数据；逐格比较背景、街道、路线节点和最终碰撞输入 |
| 对象 | 全量marker频次与坐标见上文；铁路列车、蒸汽船、建筑和解锁单位均有调用链 | 每个marker映射到最终 ScenarioContent；真实 GameSession 检查活动/睡眠对象、聘用、船组与碰撞 |
| 规则 | 参数12项；9波、19个敌人请求、2个池动作 | APK期望与网页波次逐项比较；短会话检查出生action、池行为、Boss生成及结算隔离 |
| 文案/资源 | 9段英文对白、9种头像映射、关卡缩略图及Dakota媒体入口 | 中英文与资源预载从真实关卡入口验收；声音保持静音，只验证资源映射 |
| 运行观察 | 静态资料足以界定本关内容和确定性规则 | 不要求Android运行、完整战役或通关；只有静态调用链无法回答的具体行为才定点运行 |
