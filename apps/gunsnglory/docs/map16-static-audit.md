# Mississippi 第 16 关：Highpoint Terrace 静态审计

## 结论

**静态证据足以开始实现。**Highpoint Terrace 是正式战役第 16 关，使用 `res/raw/td_map_19.tdm`。TDM、地形索引、路线图、关卡数据、波次调用顺序、资源字符串和 `GameObjectManager` 的 DEX/Smali 分支已交叉核对。本关有六个敌人入口、四个 Fort、一个 Steamer、三名新局活动单位、四座炮池位置、Dynamite 配对对象和八波内容。无需启动 Android 或完整通关。

游戏研究资料位于 Guns’n’Glory `AGENTS.md` 指定的研究 worktree，以下以 `R/` 表示。REA/JADX Java 是 DEX 重建视图；遇到 `fromLoadGame` 条件歧义时，以 `GameObjectManager.smali` 的分支为准。

## 证据与结论边界

| 结论 | 来源 | 边界 |
| --- | --- | --- |
| map19 的字节网格、尺寸及关卡映射 | `R/data/map-inventory.json`、APK `res/raw/td_map_19.tdm`、`BasicMap.loadMap` | 静态地图数据，不是运行截图。 |
| 背景、街道、桥面与 Mississippi 图集映射 | `R/data/terrain-render-index.json`、`terrain-render-rules.json`、`BackgroundMap`、`Mississippi` | 变化帧是 APK 候选集合；不声称复现某次随机启动选择。 |
| 路线节点、方向与静态可达性 | `R/data/static-route-graph.json`、`EnemyDirector.createEnemyDirectorFieldsFromBasicMap`、`EnemyDirectorField`、`PriorityMap` | 是 action marker 的图推导，不含帧动画、速度和实机碰撞。 |
| 对象 marker 的新局/读档语义 | `R/data/map-inventory.json`、`GameObjectManager.smali` 中 `createGameObjectsFromBasicMap` 的 switch 与条件跳转 | 不以 JADX 伪代码或摘要表取代 DEX/Smali 条件。 |
| 初始参数、波次与炮池动作 | `R/data/level-config.json`、`waves.json`、`campaign-wave-paired-spawns.json`、`GameDesignData`、`GameDesignWaves`、`SpawnPoolManager` | 每波从 `newWave` 后的 `addToWave` 调用顺序归组；不把请求向量当成确定的逐敌顺序。 |
| 关卡名、简介、胜利标题、对白和头像 | `R/data/string-resources.json`、`wave-reference-resolution.json`、APK 字符串表 | APK 未提供中文 locale；中文由网页新增。 |

REA/JADX 重建代码不是原始源码。`R/data/map-inventory.json` 和路线图均为派生资料，不是 REA Evidence 本身。

## 地图、地形与路线

- TDM 为 770 字节，尺寸 `32×24`，网格按 y-major 存储。研究清单映射为 campaign level 16；战役关卡号、资源编号不能仅凭相邻关系推断。
- 地形和道路复用 Mississippi 图集及 `createMississippiMapScene`。原始 marker `80`（12 格）与 `88`（24 格）进入地形/街道构造，不是敌人路线。路线仍只由 action marker 解码，不能从视觉桥面推测。
- 静态路线图有 52 个节点、57 条有向边：6 个出生点、42 个转向点、4 个出口。42/42 转向点和 4/4 出口均可从出生点到达，无静态异常路径。

| 出生格 | 静态可达出口 |
| --- | --- |
| `(10,0)` | `(31,9)`、`(31,12)` |
| `(11,0)` | `(31,8)`、`(31,9)`、`(31,12)` |
| `(0,2)` | `(31,8)`、`(31,9)`、`(31,12)` |
| `(0,9)` | `(31,9)`、`(31,12)` |
| `(0,12)` | `(31,13)` |
| `(0,19)` | `(31,8)`、`(31,13)` |

路线实现应从 TDM action marker 生成，并与 `R/data/static-route-graph.json` 逐节点、逐边核对。静态可达不等于逐帧移动观察。

## 地图对象与新局单位

坐标以左上角为 `(0,0)`。数量和坐标来自 map19 原始网格；对象语义来自 APK 对象分派及已有 Mississippi 映射。

| Marker | 坐标/数量 | 新局语义与接入 |
| --- | --- | --- |
| `70` | `(23,3)`、`(18,7)`、`(2,10)` | Mississippi 装饰 `e_1x1_rocks_b`。 |
| `71` | `(30,5)`、`(0,16)`、`(31,18)` | Mississippi 装饰 `e_1x1_tree`。 |
| `76` | `(31,2)`、`(13,4)`、`(30,10)`、`(13,20)` | Mississippi 装饰 `e_1x1_bush`。 |
| `78` | 5 格 | `createGameObjectsFromBasicMap` 不为 78 创建对象；其在其他地图层的具体含义未在本次确认，保留原始值，不按外观猜作路线或装饰。 |
| `102`、`110` | Trigger `(28,10)`；Dynamite box `(27,11)` | `GameObjectManager.smali` 的 `createGameObjectsFromBasicMap` packed-switch 将 102 分派为 `DynamiteTrigger`、110 分派为 `DynamiteBox`，新局分支分别加入 trigger/box 集合。沿用现有 Dynamite 解锁规则（正式关卡 20 或 30 完成）；内容版本须记录解锁快照。 |
| `104`、`105`、`106` | `(13,8)`、`(17,16)`、`(8,13)` | 普通新局创建活动 unit type 1/2/3：Desperado（网页现称 Gunslinger）、Mexican、Cannon。需断言最终单位位置、素材、activity。 |
| `113` | `(5,5)`、`(26,5)`、`(5,16)`、`(26,16)` | 四个 Fort / spawn type 2。作为地图建筑和 Cannon 炮池位置，不额外伪造已摆放 Cannon。 |
| `120`、`121`、`123` | `(9,22)` 起；`121` 在 x=11–14，尾件 `(15,22)` | 一组 Steamer；无 code122，四个炮件为休眠 activity 4。复用现有 Mississippi Steamer 组件及水上移动规则。 |
| `124`、`125` | 48 个水域格、2 个水边格 | Mississippi 水域/水边渲染与不可行走背景；不是路线控制点或招募单位。 |
| `130`、`131` | `(22,7)`、`(9,7)` | 新局按里程碑解锁尝试创建 type35 Pyromaniac、type36 Salesman。对照 Smali：此分支仅在 `fromLoadGame == false` 创建；内容版本记录两种解锁状态。 |

map19 没有列车 marker、Saloon 或 Tipi。Fort 是唯一招募地点。关卡图标 `public/assets/menu/gng_levelmap_19.png`、Fort/Dynamite/Steamer/Mississippi 图集及对白头像已存在于应用资源中；实现仍需验证它们进入资源预加载集合。

**证据冲突提醒：**研究资料中的旧版内容汇总把 `130/131` 描述为读档恢复 marker；这与 `GameObjectManager.smali` 的实际 `fromLoadGame` 条件相反。对 map19 应遵循 Smali：`130/131` 是新局 type35/36，存档专用 marker 是 `96–101`。不能只复制旧汇总表结论。

## 关卡数值、敌人波次与炮池

`level-config.json` 的 `index: 15` 对应战役第16关：初始 `$365`、20 生命、3 次升级；宝箱参数为 999、25,000 ms、同屏最多10个；Easy/Medium/Hard 敌人 HP 倍率为 75%/100%/110%。敌人类型设计复用已验证的 Mississippi 全局表，不在本关复制或改写。

敌人请求向量顺序为 `[Settler×1, Settler×2, Settler×3, Settler×4, Rider, Covered Wagon, Post Coach, Gold Transport]`。下表每个 `出生点@间隔:[向量]` 都对应一条实际 `addToWave`；网页十槽契约在末尾补两个零。数字是生成请求数量，不是固定出生顺序。

| 波 | 对白头像 | 延迟 / HP / 速度倍率 | 出生请求 |
| ---: | --- | --- | --- |
| 1 | Settlers | 15,000 ms / 180% / 100% | `0@2000:[1,1,1,2,3,2,0,0]`；`1@2000:[1,1,1,2,3,2,0,0]` |
| 2 | Settlers | 5,000 ms / 250% / 100% | `2@2000:[1,1,2,2,2,3,1,0]`；`3@2000:[1,1,1,2,3,2,0,0]` |
| 3 | Settlers | 5,000 ms / 200% / 110% | `0@2500:[1,2,1,2,3,3,1,0]`；`1@2500:[0,1,1,1,2,3,1,0]`；`2@2000:[1,1,2,2,2,3,1,0]`；`3@2000:[1,1,1,2,3,2,0,0]` |
| 4 | Settlers | 5,000 ms / 250% / 115% | 与第3波相同的四条请求向量和出生点。 |
| 5 | Deserter | 6,000 ms / 300% / 110% | `4@2500:[0,1,1,1,2,3,1,0]`；`5@2500:[1,2,1,2,3,3,1,0]` |
| 6 | Mexican | 5,000 ms / 200% / 150% | `0@3500:[0,0,1,1,2,3,2,1]`；`2@3500:[0,0,1,1,2,3,2,1]`；`4@2500:[0,1,1,1,2,3,1,0]`；`5@2500:[1,2,1,2,3,3,1,0]` |
| 7 | Gunslinger | 5,000 ms / 225% / 110% | `0@3500:[0,0,1,1,2,3,2,1]`；`1@3500:[1,0,1,0,2,3,2,1]`；`2@4000:[1,1,0,0,3,3,2,1]`；`3@3500:[1,1,0,0,3,3,2,1]`；`4@2500:[0,1,1,1,2,3,1,0]`；`5@2500:[1,2,1,2,3,3,1,0]` |
| 8 | Deserter | 5,000 ms / 250% / 120% | `0@3500:[0,0,1,1,2,3,2,1]`；`1@3500:[1,0,1,0,2,3,2,1]`；`2@4000:[1,1,0,0,3,3,2,1]`；`3@3500:[1,1,0,0,3,3,2,1]`；`4@4000:[1,1,0,0,3,3,2,1]`；`5@3500:[1,1,0,0,3,3,2,1]` |

共 8 波、30 条出生请求。对白资源依次为 `T_CAMPAIGN_16_01..08`；使用 Settlers、Deserter、Mexican、Gunslinger 头像。`GameDesignWaves` 在第1波登记 Cannon 炮池：`addActionForSpawnPool(1,1,0,0,4,0)` 将 poolType 3 设为4，`addActionForSpawnPool(1,3,0,0,12,0)` 将其上限设为12。poolType 3 是 Cannon，spawn type 2 是 Fort。

应用的 `CampaignUnitPoolUnitDefinition.template` 已能为没有对应静态睡眠单位的池提供独立 Cannon 生成模板。本关使用这一既有能力；不在 Fort 上放置假 Cannon，也不扩展公共 API。

## 英文内容与存档边界

| 资源 | APK 英文 |
| --- | --- |
| `T_LEVEL_NAME_19` | Highpoint Terrace |
| `T_LEVEL_INFO_19` | The notorious Highpoint Terrace was once a dangerous spot, but soldiers now guard the area from their forts located up high. |
| `T_LEVEL_NAME_WON_19` | The Sharpshooter of Highpoint Terrace |
| 波次对白 | `T_CAMPAIGN_16_01..08`，依次对应 Settlers、Settlers、Settlers、Settlers、Deserter、Mexican、Gunslinger、Deserter。 |

| 波 | 英文对白 |
| ---: | --- |
| 1 | We're safe here, honey! The soldiers from the forts would never get mixed up with bandits! |
| 2 | I can't hear the others any more. It must be safe here. |
| 3 | Look! The soldier up there is waving to us with his cannon! |
| 4 | I wonder if the poor soldiers have to climb up here to their fort every day. |
| 5 | Enemy sighted at 12 o'clock! |
| 6 | Enemy at 12 o'clock? Is it that time already? And whaddya mean, enemy? I thought we were the enemy! |
| 7 | It's practically an invasion! |
| 8 | We need more cannons! |

网页中文标题、简介、胜利标题和对白是项目翻译。正式关卡依赖 Mississippi 第15关；Free Play 为已实现的三种难度开放，并且不写战役结算。回放与内容版本需还原 Pyromaniac、Salesman 和 Dynamite 的录制时解锁快照，不能读取导入者当前档案代替。

## 非阻塞边界与实现门槛

| 项目 | 状态与处理 |
| --- | --- |
| 地形运行时随机帧 | APK 给出合法候选帧；使用现有稳定网页 seed，不为追逐某次 Android 随机画面而启动设备。 |
| `awesomeMessageMin` 消费语义、逐帧碰撞/动画 | 对 M16 当前内容不是必要前提；沿用已实现 Mississippi 规则，不据未证实语义新增行为。 |
| 声音实际播放、完整战役通关 | 静态内容接入不要求；测试默认静音，仅校验资源引用，不完整手动通关。 |
| M16 地图、路线与实体 | 自动测试逐格对照 APK TDM、生产路线对照派生图，核验 Fort/Dynamite/Steamer/三类活动单位与解锁单位。 |
| M16 规则与正式入口 | 自动测试核对初态、8波/30请求、首波 Cannon set/set-max、Fort 生成池、Dynamite 解锁快照、双语内容、正式依赖、Free Play 隔离和回放重建。 |

**静态审计通过。**可按[实施计划](implementation-plan.md)进入 M16-A 至 M16-D；无须重复反编译 Mississippi 共用移动、随机地形和音效框架。
