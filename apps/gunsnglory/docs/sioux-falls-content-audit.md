# Sioux Falls 动态内容与规则核对

## 范围与证据

本文核对 Guns’n’Glory FREE 1.8.6 的 Dakota Level 40（地图文件 43）动态内容：关卡参数、敌方波次、玩家生成池、地图单位、解锁、对白、音乐和回放内容快照。地图格码、地形、静态物件及路线几何见[地图静态核对](sioux-falls-static-audit.md)。

| 证据入口 | 用途 |
|---|---|
| APK `GameDesignData.<clinit>` 第 40 关分支及数组下标 | 12 个原始关卡参数；全局关卡 40 对应零起始下标 39 |
| JADX 对 `GameDesignWaves.setWaves(WaveManager, SpawnPoolManager, int)` 的反编译结果，条件 `i == 40` | 10 个波次、28 次 `addToWave` 调用、请求向量和间隔 |
| `WaveManager.addToWave` 重载与 `Wave.setContentForSpawnPoint` | 8 个普通请求槽及 Boss、Doc 两个尾部槽；短参数重载的缺省填零行为 |
| `SpawnPoolManager.addActionForSpawnPool`、`performActionsForWave` 和构造器 | 玩家单位池操作码及 15 秒生成间隔 |
| `res/raw/td_map_43.tdm`、`GameObjectManager` 与地图单位构造调用 | 初始单位、Steamer、炸药、招募位置和路线 action 映射 |
| APK `T_LEVEL_NAME_43`、`T_LEVEL_INFO_43`、`T_CAMPAIGN_40_01`–`10` 与 Dakota LevelPack | 标题、简介、10 段原文、头像资源和音乐选择 |

REA/JADX 展示的是从 DEX 反编译的 Java 表示，不是原始源码。APK 资源与当前网页实现交叉验证；没有对 Sioux Falls 进行 Android 实机画面采样，也没有打完整战役。

## GameDesignData 参数

原始行对应下标 39：`[250, 25, 999, 25000, 3, 30000, 5, 15, 56, 75, 110, 119000]`。

| 下标 | 原值 | 当前字段/含义 | 证据状态 |
|---:|---:|---|---|
| 0 | 250 | 开局现金 `initialCash` | `GunsAndGloryThread` 初始化消费者 |
| 1 | 25 | 开局生命 `initialLives` | 开局消费者 |
| 2 | 999 | 奖励箱总数上限 | 奖励箱池消费者 |
| 3 | 25,000 | 奖励箱生成间隔（毫秒） | 奖励箱池消费者 |
| 4 | 3 | 单位升级上限 | 升级消费者 |
| 5 | 30,000 | 保留为 `reservedParameter5` | 在本次 APK 调用点检查中未找到消费者；不推测含义 |
| 6 | 5 | 消息触发参数；APK 字段名为 `triggerMessageMinEnemy` | 代码字段表明它参与敌人相关提示触发；网页保留原值 5，不扩展语义 |
| 7 | 15 | 场上同时存在的奖励箱上限 | 奖励箱池消费者 |
| 8 | 56 | Easy 敌人生命倍率（百分比） | 难度参数消费者 |
| 9 | 75 | Medium 敌人生命倍率（百分比） | 难度参数消费者 |
| 10 | 110 | Hard 敌人生命倍率（百分比） | 难度参数消费者 |
| 11 | 119,000 | Gambler 计时器（毫秒） | 参数存在，但 TDM 43 没有 Gambler marker `132`；不据计时器伪造 Gambler 实体 |

敌人基础属性、移动速度和奖励箱奖励类型沿用已核实的 Dakota 通用规则，不由这 12 个值推导。实现保留了第 5 项原值并标记未解析。

## 波次头与请求槽

每个波次头包含 `delay / hit-point multiplier / speed multiplier`。向量位置依次为普通请求槽 1–8、Boss、Doc；网页数组对应索引 0–7、8、9。向量是池请求数量，不代表敌人实际出现顺序。

| 波次 | 延迟（毫秒） | 生命倍率 | 速度倍率 | 池数 |
|---:|---:|---:|---:|---:|
| 1 | 15,000 | 115% | 120% | 1 |
| 2 | 15,000 | 130% | 125% | 1 |
| 3 | 15,000 | 140% | 130% | 2 |
| 4 | 15,000 | 155% | 135% | 2 |
| 5 | 15,000 | 170% | 140% | 3 |
| 6 | 15,000 | 170% | 145% | 4 |
| 7 | 15,000 | 185% | 150% | 4 |
| 8 | 25,000 | 200% | 155% | 5 |
| 9 | 15,000 | 210% | 160% | 5 |
| 10 | 25,000 | 240% | 165% | 1 |

APK 分支中共有 **28 次 `addToWave` 调用**，形成 28 条请求池记录。先前计划里的“31 次”是计数错误；本关没有把多次相同 action 合并后再少算的情况。各波次请求如下，格式为 `spawn action @ 间隔毫秒： [槽1…槽8, Boss, Doc]`。

| 波次 | 原始请求池 |
|---:|---|
| 1 | `1 @ 2000: [2,3,4,5,3,2,0,0,0,0]` |
| 2 | `1 @ 2000: [1,2,3,4,5,2,2,0,0,0]` |
| 3 | `1 @ 2500: [1,2,3,4,3,4,2,0,0,0]`<br>`2 @ 2500: [1,2,3,4,3,4,2,0,0,0]` |
| 4 | `1 @ 2500: [1,2,3,4,3,4,2,1,0,0]`<br>`2 @ 2500: [1,2,3,4,3,4,2,0,0,0]` |
| 5 | `0 @ 2500: [0,2,3,4,3,4,3,0,0,0]`<br>`1 @ 2500: [0,2,3,4,3,5,2,1,0,0]`<br>`2 @ 2500: [0,2,3,4,3,4,3,1,0,0]` |
| 6 | `0 @ 2500: [0,1,2,3,2,2,3,1,0,0]`<br>`1 @ 2500: [0,1,2,3,1,3,3,1,0,0]`<br>`2 @ 2500: [0,1,2,3,2,4,3,1,0,0]`<br>`3 @ 3000: [0,1,2,3,1,4,2,0,0,0]` |
| 7 | `0 @ 2500: [0,1,2,3,2,2,3,1,0,0]`<br>`1 @ 2500: [0,1,2,3,1,3,3,1,0,0]`<br>`2 @ 2500: [0,1,2,3,2,4,3,1,0,0]`<br>`3 @ 2500: [0,1,2,3,1,4,3,1,0,0]` |
| 8 | `0 @ 2500: [0,0,1,3,2,2,3,1,0,0]`<br>`1 @ 2500: [0,0,1,3,1,3,3,1,0,0]`<br>`2 @ 2500: [0,0,1,3,2,4,3,1,0,0]`<br>`3 @ 2500: [0,0,2,3,1,3,2,1,0,0]`<br>`4 @ 3000: [0,1,2,3,3,3,1,1,0,0]` |
| 9 | `0 @ 2500: [0,0,1,3,1,2,3,1,0,0]`<br>`1 @ 2500: [0,0,1,3,1,4,2,1,0,0]`<br>`2 @ 2500: [0,0,1,3,1,2,3,1,0,0]`<br>`3 @ 2500: [0,0,2,3,1,2,2,1,0,0]`<br>`4 @ 2500: [0,1,2,3,1,2,1,1,0,0]` |
| 10 | `1 @ 500: [0,0,0,0,0,0,0,0,1,0]` |

Wave 10 的 500 毫秒是该波次请求池的生成间隔。Boss 位于第 9 槽，Doc 为 0；没有把 500 毫秒误写成全关的生成间隔。

### Spawn action 与地图出生点

`WaveManager` 的 spawn action 映射到地图行优先出生点；它与玩家单位池的 pool type 以及 `SpawnPoolManager` 操作码不是同一概念。

| Spawn action | 原始出生标记 | TDM 坐标 | 行优先出生点 ID |
|---:|---:|---:|---:|
| 0 | 40 | (9, 0) | 1 |
| 1 | 41 | (8, 0) | 0 |
| 2 | 42 | (0, 5) | 3 |
| 3 | 43 | (0, 14) | 4 |
| 4 | 44 | (13, 0) | 2 |

### 玩家单位池

`SpawnPoolManager` 构造器将玩家池间隔设为 15,000 毫秒。原版 Level 40 有两条 Wave 1 动作：操作码 1（SET）把 pool type 1–4 的待生成数设为 0；操作码 3（SET_MAX）把四个上限设为 4。操作码对应关系为 0=ADD、1=SET、2=ADD_MAX、3=SET_MAX。

| Pool type | 可招募单位 | APK 地点类别 | 原始地图地点 |
|---:|---|---|---|
| 1 | Gunslinger | Saloon | marker 112，(23, 10) |
| 2 | Mexican | Saloon | marker 112，(23, 10) |
| 3 | Cannon | Fort | marker 113，(30, 1) |
| 4 | Indian | Tipi | marker 114，(1, 19) |

Cannon 只通过 Fort 生成池提供，地图上没有初始 Cannon；实现使用独立生成模板，不在地图上添加伪造实体。当前内容 builder 与模板扩展已通过内容单测，正式关卡注册仍在下一切片。

## 初始单位、特殊对象与解锁快照

| TDM marker | 数量/坐标 | APK 类型与活动 | 新局处理 |
|---:|---|---|---|
| 96 | 11 个 | 类型 1，睡眠 | Gunslinger 招募对象，满足已有基础解锁条件时创建 |
| 97 | 9 个 | 类型 2，睡眠 | Mexican 招募对象，满足已有基础解锁条件时创建 |
| 98 | 6 个 | 类型 3，睡眠 | Cannon 招募对象，满足已有基础解锁条件时创建 |
| 99 | 8 个 | 类型 4，睡眠 | Indian 招募对象，满足已有基础解锁条件时创建 |
| 101 | 5 个 | 类型 6，睡眠 | Grandpa；全局 Level 30 解锁后创建 |
| 108 | (22, 22) 一个 | 类型 5，活动 | 初始活动 Sniper；不是睡眠招募标记 |
| 130 | (20, 4) 一个 | 类型 35，睡眠 | Pyromaniac；全局 Level 50 解锁后创建 |
| 131 | (16, 3) 一个 | 类型 36，睡眠 | Salesman；全局 Level 60 解锁后创建 |
| 120、121、123 | (14–18, 20) 五个车体部分 | Steamer 类型 30、31、32×2、33 | 组合成一个水平水上移动组；两个 32 部件 activity=4，其余 activity=5 |
| 102、110 | Trigger (24, 4)，Box (25, 5) | Dynamite 配对对象 | 遵循全局规则：完成全局第 20 或第 30 关后解锁 |

原始单位解锁快照由全局结算记录生成：Grandpa 看第 30 关、Sniper 看第 40 关、Pyromaniac 看第 50 关、Salesman 看第 60 关。地图中已活动的 marker 108 Sniper 按 APK activity 5 创建，不因其类型存在休眠招募解锁快照而错误删除。

内容版本将这四项单位快照和 Dynamite 开关编码进规范字符串。回放解析拒绝未知前缀、非法后缀和非规范值；从回放重建时使用记录的快照，不读取导入时档案。切片 4 已在 `bootstrap/browser.ts` 注册 Level 40 replay factory，并从主应用的 replay 导入分派接入。单测以记录快照重建本关单位；Playwright 通过首帧状态检查确认受支持版本进入 replay 校验器，并确认非规范版本返回“当前构建不可用”。该 E2E 后续帧故意使用不匹配摘要，因此不将其描述为完整成功回放；本切片未做 Sioux Falls 完整 replay 往返通关。

## 标题、对白、头像与音频

`T_LEVEL_NAME_43` 为 “Sioux Falls”；`T_LEVEL_INFO_43` 的英语原文为 “In Sioux Falls, you can watch the local Dakota natives at their daily morning washing rituals.” APK 不含中文文本，中文为网页本地化。

| 波次 | APK 文本资源 | 说话者 | 头像资源 | 英文对白 |
|---:|---|---|---|---|
| 1 | `T_CAMPAIGN_40_01` | Pedro | `portrait_pedro` | `"It's very wet here, Boss! Can we do some cliff diving later?"` |
| 2 | `T_CAMPAIGN_40_02` | Calamity | `oregon_dakota_portrait_calamity` | `"You want to jump off the cliff? Go ahead! I won't stop you!"` |
| 3 | `T_CAMPAIGN_40_03` | Gunslinger | `portrait_gunslinger` | Sweetheart, I bet you just want to admire our muscular torsos when we jump off the cliffs! |
| 4 | `T_CAMPAIGN_40_04` | Calamity | `oregon_dakota_portrait_calamity` | Sure… Especially when your torsos hit the rocks down there! |
| 5 | `T_CAMPAIGN_40_05` | Dakota Geezer | `oregon_dakota_portrait_geezer` | Rocks? What rocks? I thought we were looking for gold! |
| 6 | `T_CAMPAIGN_40_06` | Captain | `portrait_captain` | Settlers ahead in the south-west! Load the cannons! |
| 7 | `T_CAMPAIGN_40_07` | Engineer | `portrait_engineer` | `"It's full of settlers here! Maybe I should go straight and get paid for driving passengers with my train!"` |
| 8 | `T_CAMPAIGN_40_08` | Calamity | `oregon_dakota_portrait_calamity` | `"You want to go straight? Go ahead! Then I can rob you after the end of every working day, and we're all happy!"` |
| 9 | `T_CAMPAIGN_40_09` | Indian | `portrait_indian` | Dakota, gather for the final battle! |
| 10 | `T_CAMPAIGN_40_10` | Dakota Boss | `oregon_dakota_portrait_boss` | `"Bunch of scoundrels, you'll never get me! Dakota will never be yours! This is all nationalized!"` |

APK 的 Dakota LevelPack 设置 ambient 为 `music_atmo_snow`，战斗循环资源为 `music_dakota`、`music_loop2`、`music_loop3`，按零起始 wave index 循环选择。中文说话者名和对白由网站本地化维护，不冒充 APK 原文。

## 网页实现与本轮验证

动态内容由以下模块组合；此处是 `officialCampaignStages` 注册前的 builder 切片：

- [关卡参数与预览规则](../src/content/dakota-10-campaign-rules.ts)
- [波次请求](../src/content/dakota-10-campaign-waves.ts)
- [玩家单位池](../src/content/dakota-10-unit-pool.ts)
- [初始单位与 Steamer](../src/content/dakota-10-units.ts)
- [Dynamite 配对](../src/content/dakota-10-dynamite.ts)
- [内容版本快照](../src/content/dakota-10-content-version.ts)
- [完整内容 builder](../src/content/dakota-10-campaign.ts)
- [内容核对测试](../tests/dakota-10-campaign-content.test.ts)

本切片运行结果：定向内容测试 7/7 通过；TypeScript `typecheck` 通过。`GameSession` 测试只推进到 Wave 1 第一次敌人生成，未清空波次或完成关卡。完整应用 CI、catalog/站点构建、切片 4 的正式菜单/存档/replay 接入、公开部署和内置浏览器验收均尚未在本切片执行。
