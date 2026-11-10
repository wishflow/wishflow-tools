# New Mexico 第 8 关：Cactusville 静态审计

## 结论

APK 中 map08 的地图格网、两路敌人方向场、随机分支、静态对象、垂直列车、初始地图单位、炸药交互、实际消费的关卡参数、十波敌人请求、玩家生成池、对白和声音选择均已静态核对。另有一个 30,000 表值未找到消费点，已明确保留为未确认字段；它不影响复原实际玩法。没有需要启动 Android 或完整推进战役才能确定的关卡内容行为。

网页已有 Cactusville 目录名和地图预览图，但正式关卡内容仍只登记到第 7 关。本关需要接入炸药开关/箱子及其冷却、爆炸范围伤害；复用已完成的垂直列车能力。另有网页未收录的 APK 原始素材。实现门槛和测试拆分见[实施计划](implementation-plan.md)。

本审计是 APK 静态反编译与资源解析，不是原始 Java 源码，也没有执行 Android 运行观察、音频播放或完整关卡。

## 证据范围

原包为 Guns’n’Glory Free，包名 com.hg.gunsandgloryfree，版本 1.8.6 / versionCode 34，APK 位于 /Users/shiwei/Downloads/gunsnglory-1-8-6.apk。APK SHA-256：49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56。使用 REA 的 Android/JADX 检查及本地 APK 解包资源；对反编译警告较多的分支，用对应 smali 复核。

| 语义证据名 | 证据来源 | 支持的结论 |
| --- | --- | --- |
| MAP08-TDM | APK res/raw/td_map_08.tdm；网页地图解析器 | 原始格网尺寸、格值、坐标和对象标记 |
| MAP08-ROUTES | EnemyDirector.createEnemyDirectorFieldsFromBasicMap、EnemyDirectorField.directionMapping、EnemyDirector.moveEnemys | 出生池顺序、方向场转向、随机分支及三个可达路径 |
| MAP08-OBJECTS | GameObjectManager.createGameObjectsFromBasicMap、GameObjectUnit.registerUnitTypes、DynamiteTrigger、DynamiteBox | 静态对象、地图单位与炸药交互；102/110 关键分支用 smali 核验 |
| MAP08-PARAMS | GameDesignData.gameDesignData[7]、GameDesignData.isUnlocked、SpawnPoolManager | 开局参数、难度倍率、宝箱上限及炸药解锁 |
| MAP08-WAVES | GameDesignWaves.setWaves(i == 8)、WaveManager、SpawnPoolManager | 十波、两路敌人请求、玩家池动作与参数 |
| MAP08-TEXT-VOICE | APK res/values/strings.xml、InGameGeneralMessageDialog.setUpDialog | 关卡名、英文原文、头像和声音映射 |
| MAP08-ASSETS | APK res/drawable-*、res/raw 与网页 public/assets | 素材尺寸、网页现有资源与缺口 |
| MAP08-WEB-GAP | 当前网页代码与资源目录 | 本关未登记的内容和需要补齐的共享规则 |

证据标签按主题命名，便于搜索；REA 输出中的长 Evidence ID 保留在本地研究记录，不作为本报告的主要索引。

## 关卡身份与网页现状

- APK 的 td_map_08.tdm 对应 New Mexico 第 8 关 Cactusville；简介为 “Sheriff Starforce imposes law and order here. Nowhere will you find a more relaxed and carefree place to live than Cactusville!”；胜利标题为 “The Terror of Cactusville”。
- 资源表在第 13 关重复了 Cactusville 名称、简介和胜利标题，但地图文件、关卡波次分支和目录映射均指向 New Mexico 第 8 关。不能根据重复字符串把 map08 登记为第 13 关。
- APK 有 63 个 TDM 地图文件，但战役是 60 关。地图资源数量不是可玩战役关数。
- 网页的[关卡目录](../src/content/campaign-catalog.ts)已有 level 8 名称和预览位置，[预览图](../public/assets/menu/gng_levelmap_08.png)已存在；[正式战役登记](../src/content/official-campaign.ts)和内容文件仍只到 level 7。map08 尚不能正式游玩，也未接入 Free Play、回放内容路由或正式结算。

## 原始格网、地形与道路

td_map_08.tdm 共 410 字节：17 列 × 24 行，408 个格子；坐标原点在左上，x 向右、y 向下。全部格值频数如下，合计 408：

135×0，53×16，98×32，35×36，1×40，1×41，2×48，10×52，5×54，8×55，1×57，2×68，1×69，1×70，1×71，1×72，2×73，1×75，1×76，2×77，2×80，3×89，7×90，2×91，3×92，1×94，1×95，6×96，5×97，4×98，2×99，1×100，2×101，1×102，1×110，1×112，1×113，1×114，1×116，1×130，1×131。

原始格值不是图集编号。网页应继续通过 New Mexico 的背景、道路和对象派生逻辑转换：

| 原始格值 | map08 含义与坐标 |
| --- | --- |
| 16 | 小路，共 53 格 |
| 32 / 36 | 峡谷底面 / 峡谷壁相关层，共 98 / 35 格 |
| 80 | 水平桥面：(5,4)、(5,13) |
| 89 | 垂直铁路段：(11,14)、(11,15)、(11,16)；街道层 code 80 对应垂直铁轨 |
| 90 / 94 / 95 | 垂直铁路和上/下缓冲器；轨道在 x=11，缓冲器位于 (11,3)、(11,19) |
| 91 / 92 | 垂直列车机车 / 货车，详见下文 |
| 48 | 两个出口：(0,1)、(0,2) |

## 出生点、方向场与完整路线

EnemyDirector 按 y 外层、x 内层扫描 TDM。生成点数组顺序决定波次池编号；不能把格码减去 40 得到的 action ID 当作池编号。

| 波次池 | 原始码 | 出生格与初始方向 | 出口 |
| ---: | ---: | --- | --- |
| 0 | 41 | (0,23)，向北 | (0,2) |
| 1 | 40 | (1,23)，向北 | (0,1) |

方向动作码 52/53/54/55 分别表示北/南/西/东；本图使用 52（北）、54（西）和 55（东）。code 57 对应 APK 的北/东随机分支。池 0 在 (5,16) 处分成短、长两条路线；分支是原图方向场行为，不是网页 A* 寻路结果。

下表列出从出生格到出口的方向场控制点。控制点之间按水平方向或垂直方向逐格直行；路径长度含出生格与出口格。

| 路径 | 格数 | 控制点 |
| --- | ---: | --- |
| 池 0 短支 | 36 | (0,23) → (0,17) → (3,17) → (3,16) → (5,16)[北/东分支后取北] → (5,11) → (3,11) → (3,7) → (5,7) → (5,2) → (0,2) |
| 池 0 长支 | 52 | (0,23) → (0,17) → (3,17) → (3,16) → (5,16)[北/东分支后取东] → (8,16) → (8,15) → (15,15) → (15,4) → (14,4) → (14,2) → (5,2) → (0,2) |
| 池 1 | 54 | (1,23) → (1,20) → (2,20) → (2,18) → (6,18) → (6,17) → (9,17) → (9,16) → (16,16) → (16,1) → (0,1) |

池 0 两条路线共享许多路径格。路线枚举必须使用每条路径自己的循环检测；若对所有路线共用一个全局 visited 集合，会在共享段上错误丢掉另一条合法分支。实现测试应分别走完两个终点并覆盖原图所有方向场节点。

## 地图对象、列车与可雇佣单位

### 方向列车和场景物件

map08 已可复用网页在 map07 加入的垂直列车能力：轨道中心 x=11；code 92 的 3 节货车在 y=8–10，code 91 的 2 段机车在 y=11–12。code 89/90 构成列车前后及道路交叉处的垂直铁轨，code 89 在 y=14–16。REA 对 `BackgroundMap.createStreetLayerMap` 的结果是 code 89 → 街道层 80、code 90–93 → 街道层 84；网页均映射为垂直铁轨。原始 map08 清单先前把 code 89 误标为垂直桥，现按 APK 映射和现有图层转换更正。无需重新旋转或实现列车移动规则。

装饰原始码与坐标：

| TDM 码 | 坐标 |
| ---: | --- |
| 68 | (7,9)、(0,13) |
| 69 | (7,23) |
| 70 | (0,8) |
| 71 | (2,22) |
| 72 | (2,6) |
| 73 | (9,19)、(14,23) |
| 75 | (12,11) |
| 76 | (10,12) |
| 77 | (12,6)、(4,23) |
| 116 | 2×1 小屋，左上角 (13,23) |

招募建筑使用 APK 的原生尺寸和锚点，不将大型建筑缩成 1×1 图块：

| TDM 码 | 建筑 | 坐标 |
| ---: | --- | --- |
| 114 | Tipi | (1,4) |
| 113 | Fort | (9,7) |
| 112 | Saloon | (12,21) |

### 休眠地图单位

code 96–101 表示基础单位 1–6，activity 4；code 130/131 表示 Pyromaniac/Salesman，也为 activity 4。地图总共 22 个休眠单位：

| TDM 码 | 单位 | 数量与坐标 |
| ---: | --- | --- |
| 96 | Gunslinger（1） | 6：(13,7)、(2,9)、(8,10)、(6,11)、(9,20)、(4,21) |
| 97 | Mexican（2） | 5：(12,9)、(8,12)、(2,14)、(7,20)、(5,22) |
| 98 | Cannon（3） | 4：(8,5)、(7,10)、(10,11)、(13,17) |
| 99 | Indian（4） | 2：(4,5)、(0,10) |
| 100 | Sniper（5） | 1：(7,18) |
| 101 | Grandpa（6） | 2：(4,8)、(16,19) |
| 130 | Pyromaniac（35） | 1：(14,11) |
| 131 | Salesman（36） | 1：(16,22) |

基础类型 1–4 可用；地图里的特殊单位遵循 APK 全局解锁门槛：Grandpa 需完成第 30 关，Sniper 第 40 关，Pyromaniac 第 50 关，Salesman 第 60 关。普通第 8 关进度不能绕过这些条件。Free Play 也读取已有 Progress 解锁快照。

## 炸药开关和箱子

原始码 102 在 (14,6)，创建单位类型 7 DynamiteTrigger；原始码 110 在 (14,8)，创建单位类型 8 DynamiteBox。两者 activity 5。GameObjectManager 要求开关与箱子数量配对，并为每个开关选择最近的未配对箱子。本图是一对。GameDesignData 的炸药解锁行为同时作用于两者：达到全局第 21 关，或档案已完成第 30 关时开放。第 8 关的新档案因此不显示炸药；后期档案重玩或自由游玩时可能出现。

- 用户点击开关时由触发器执行，不进入普通地图单位选中状态；点击释放后，若箱子已绑定且冷却为 0，则按下开关并引爆箱子。
- 爆炸半径为 23,040 fine units，即 3 个 7,680-unit 地图格；使用欧氏距离平方判断影响范围。
- 基础伤害为 5,000，再乘敌人的 heavy penetration 百分比并按 Java 整数规则截断。APK 对 enemy unit 类型 8 跳过本次伤害。
- 引爆后开关冷却为 59,000 ms。箱子非活动且开关剩余冷却不超过 500 ms 时，触发器启动箱子重生；箱子使用 5 帧 sfx_dynamite_box.png 重生动画。冷却期间再次点开关会弹出 APK 对应的等待提示。
- 爆炸通过 FxFactory.createAoeExplosion 生成效果并请求 sound_explosion。不要因资源名 sound_dynamite.ogg 存在，就把它绑定到地图开关；该声音属于另一条游戏行为路径。

核心依据为 DynamiteTrigger.select/deselect/update、DynamiteBox.detonate/respawn/getRespawnAnimationtime 和 GameDesignData.unlockDynamite。DynamiteBox.detonate 的复杂伪代码以 smali 核对；无需用 Android 实测重复确认静态已经明确的伤害和冷却规则。

## 关卡参数、宝箱与玩家池

GameDesignData.gameDesignData[7] 是关卡第 8 行：

| 索引/参数 | 值 | 解释 |
| --- | ---: | --- |
| 0：开始现金 | 350 | 开局余额 |
| 1：初始生命 | 10 | 失败条件基础值 |
| 2：宝箱总量 | 999 | 关卡内累计投放上限 |
| 3：投放间隔 | 25,000 ms | 宝箱生成间隔 |
| 4：最大升级级数 | 3 | 本关升级上限 |
| 5：APK 表值 | 30,000 | 名称提示与使用点未能确认；保留原始值，不推断成消息间隔 |
| 6：特殊消息单位阈值 | 5 | 敌人单位类型达到该值才可能触发特殊鼓励气泡 |
| 7：同时存在宝箱上限 | 17 | 场景同时数量上限 |
| 8–10：Easy/Medium/Hard HP 倍率 | 75% / 125% / 150% | 和波次 HP 倍率分别应用 |
| 11：Gambler 冷却字段 | 119,000 ms | 数据表值；本图没有 Gambler/Casino 入口 |

GameDesignWaves 对 level 8 配置 10 波。波次开始延迟、HP/速度百分比与对白头像：

| 波 | 开始延迟 | 波次 HP / 速度 | 对白头像 |
| ---: | ---: | --- | --- |
| 1 | 15,000 ms | 125% / 100% | Sheriff |
| 2 | 5,000 ms | 150% / 100% | Pedro |
| 3 | 10,000 ms | 125% / 90% | Settlers |
| 4 | 5,000 ms | 200% / 105% | Pedro |
| 5 | 5,000 ms | 400% / 110% | Pedro |
| 6 | 5,000 ms | 450% / 120% | Engineer |
| 7 | 5,000 ms | 300% / 110% | Pedro |
| 8 | 5,000 ms | 300% / 110% | Pedro |
| 9 | 5,000 ms | 450% / 115% | Settlers |
| 10 | 5,000 ms | 450% / 120% | Pedro |

敌人请求向量来自 APK addToWave 的 8 个实际请求槽，按顺序表示敌方生成池类型 2–9；网页 CampaignWaveDefinition 使用 10 槽类型 2–11，因此转录时在末尾补两个 0。请求数是生成池参数，不应解释为每类敌人的独立个数。

| 波 | 池 0：间隔 ms / 8 槽请求 | 池 1：间隔 ms / 8 槽请求 |
| ---: | --- | --- |
| 1 | 1,800 / [2,3,4,3,4,2,1,0] | — |
| 2 | 1,800 / [1,1,2,3,4,2,1,1] | — |
| 3 | 2,500 / [1,3,2,4,3,3,1,0] | 2,500 / [2,3,2,3,3,3,1,1] |
| 4 | 3,000 / [3,3,2,2,2,4,2,0] | 3,000 / [3,3,2,2,2,3,1,1] |
| 5 | 2,000 / [3,3,3,4,0,0,0,0] | 2,000 / [3,3,3,4,0,0,0,0] |
| 6 | 2,000 / [0,0,0,0,8,0,0,0] | 2,000 / [0,0,0,0,8,0,0,0] |
| 7 | 2,500 / [2,0,1,0,3,4,2,1] | 2,500 / [0,2,0,0,3,4,2,0] |
| 8 | 2,500 / [0,0,1,0,3,3,2,0] | 2,500 / [1,0,0,1,3,3,3,1] |
| 9 | 4,500 / [0,0,0,0,0,0,0,2] | 6,500 / [0,0,0,0,0,0,0,2] |
| 10 | 2,500 / [2,2,0,2,3,4,3,2] | 2,500 / [0,2,3,0,3,4,2,2] |

SpawnPoolManager 第 1 波先为 pool type 1–4 设置库存 [0,0,0,0]，然后设置库存上限 [7,6,4,5]。后者是四类基础单位的上限，不是开局现有单位数。招募建筑分别为 Saloon、Fort 和 Tipi，仍使用既有招募与升级行为。

## 对白、肖像和声音

APK 的 T_CAMPAIGN_08_01–10 对白由下表列出；_SMALL 变体虽存在，但 setWaves(i == 8) 使用的是不带 _SMALL 的完整资源键。

| 波 | 肖像与通用语音 | APK 英文原文 |
| ---: | --- | --- |
| 1 | Sheriff / sound_sheriff | Gentlemen, I'm Sheriff Jimmy Starforce. If I see or hear that any of you is stirring up the tiniest bit of trouble, I'll take you apart like you won't believe! |
| 2 | Pedro / sound_pedro | He'll have to get down off his high horse. He won't hear anything bad about us, so we have to attack with everything we've got to make sure! |
| 3 | Settlers / sound_siedler | Do you see the narrow pass up ahead? Maybe it's a shortcut... |
| 4 | Pedro / sound_pedro | How annoying that we can't barricade this shortcut. |
| 5 | Pedro / sound_pedro | There are hardly any wagons coming. Only the weary ranks on foot! |
| 6 | Engineer / 无本头像语音分支 | Riders ahead! More fodder for my Gatling. |
| 7 | Pedro / sound_pedro | Those settlers are really talented... at being living targets! |
| 8 | Pedro / sound_pedro | Watch out! We can't let anyone get away. Sheriff Starforce is really tough! |
| 9 | Settlers / sound_siedler | Let's send the precious gold wagon on ahead. |
| 10 | Pedro / sound_pedro | There's still a wagon train in sight, and then we'd better vamoose before the Sheriff shows up. |

### 特殊鼓励气泡

EnemyDirector.moveEnemys 在敌人死亡结算处还有一个共享行为，map08 的阈值字段会激活它：死亡敌人类型 ID ≥ 5、平均难度 > 800、气泡队列为空时，创建一个 1,200 ms 的屏幕中央气泡。平均难度是 enemyDifficultyValue / enemyDifficultyValueCounter 的整数商。文案从五条资源中选择：Yeah!、Yeehah!、Hit!、Direct hit!、KA-BOOM!。 smali 公式先算 (averageDifficulty - 900) / 100，再加 Random.nextInt(3) − 1，最后夹到 0–4；Java 整数除法向 0 截断。该选择不影响游戏规则，网页应复用现有气泡外观并使用独立表现随机数，不消耗战斗规则随机序列。

## 网页资源差异与未决项

网页已有 gng_speechbubble.png、地图预览、通用 New Mexico 地形和垂直列车资源；但缺少以下 APK 原始资源：

| 原 APK 资源 | APK 尺寸 | 当前网页状态 |
| --- | --- | --- |
| dynamite_detonator.png、dynamite_detonator_pressed.png | MDPI 各 32×40；HDPI 各 48×60 | 网页已有 HDPI 原图；MDPI 资源未导入 |
| dynamite_box.png | MDPI 32×32；HDPI 48×48 | 网页已有 HDPI 原图；MDPI 资源未导入 |
| sfx_dynamite_box.png | MDPI 160×44；HDPI 240×66，5 帧 | 网页已有 HDPI 原图；它是重生动画图集，不是音频 |
| portrait_sheriff.png | APK Drawable 原图 | 已原样导入 `public/assets/portrait_sheriff.png` |
| sound_sheriff.ogg | APK 原始语音 | 已原样导入 `public/assets/sounds/sound_sheriff.ogg` |
| sound_explosion.ogg | APK 爆炸音效 | 网页已有原始音频 |

网页已有 sounds/sound_dynamite.ogg，但它不是地图开关的爆炸调用；现有 map08 引爆调用链请求 sound_explosion。波次 6 Engineer 肖像资源和其他三个通用肖像、Pedro/Settlers 语音已经存在；Engineer 在 InGameGeneralMessageDialog 的头像语音映射中没有专属分支，不能擅自加声音。

当前接入状态：

- TDM 102/110 已生成成对炸药对象，并使用通用炸药规则；达到全局第 21 关或完成第 30 关的档案可见，零进度档案不显示可用炸药。
- Awesome 击杀反馈已按敌人类型阈值、击杀后的难度均值与空闲消息队列接入；使用原版气泡图和独立表现随机流，不消耗战斗随机数。
- Cactusville 已登记为 `campaign-new-mexico-08`，正式前置只有 `campaign-new-mexico-07`。主菜单预览、双语标题/简介/波次对白、场景预载、Free Play、正式胜负结算和回放路由均已接入。
- Content version 将炸药和 Grandpa、Sniper、Pyromaniac、Salesman 的可见解锁编码为稳定快照；回放导入按录制版本还原地图对象与单位，不依赖导入时的当前档案。正式胜利更新关卡进度和最高分；Free Play 结果不写入 Progress。
- 定向单测覆盖 stage 前置、三种 Free Play 难度、里程碑开关、胜负/重复结算和内容快照回放路由；Playwright 覆盖 map07 解锁、选关预览、首波对白及 Free Play 未完成退出。

参数边界：GameDesignData 第 8 行索引 5 的 30,000 原始值尚未找到明确消费点；保留值并明确标注未确认含义，不猜测用途。其余用于本关空间、对战、进度和 UI 的字段均有明确 APK 数据/调用路径。

## 审计方法约束

- 地图和内容的预期数据直接从 APK 原始 TDM、资源表和 GameDesignWaves/Dex 推导；不能从新网页实现反向生成期望值。
- 路线测试针对每条路径单独记录访问状态，校验两个随机分支都到达对应出口；不得对所有分支使用一个共享的全局 visited 集。
- 对 Android 无需新增启动或重复观察：本关规则问题可以从 APK 的静态资源和调用路径回答。网页集成后只使用本地应用测试、代表性浏览器场景和截图检查，不完整通关。
