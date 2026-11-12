# Mississippi 第17关：Dead Rocks 静态审计

## 结论

**静态证据足以开始实现。**Dead Rocks 是正式战役第17关，使用 `res/raw/td_map_20.tdm`。TDM、路线图、地形绘制索引、关卡参数、波次调用及对象分派均已交叉核对。关卡有6个敌人入口、53个转向点、4个出口、8波和35个生成请求；没有 Fort、Cannon 地图单位、赌场或额外 spawn-pool 动作。无需启动 Android 或完整通关。

本审计针对本机 APK `Guns’n’Glory FREE 1.8.6`，SHA-256 `49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56`。TDM 为770字节，SHA-256 `c4eb52558c04ad79e83125a193ca8a695e15ce83b6c7efd7636a9d2d232e8f6d`。研究材料由应用 `AGENTS.md` 所指研究工作树提供，下文用 `R/` 表示 `apps/gunsnglory/docs/research/`。

## 证据基线和边界

| 结论 | 证据 | 边界 |
| --- | --- | --- |
| APK 身份、TDM 字节、32×24 尺寸和第17关映射 | `R/data/map-inventory.json`、`R/data/resource-inventory.json`、APK `res/raw/td_map_20.tdm`、`BasicMap.loadMap` | TDM 网格以 y-major 编码；文件号20不是关卡号20。 |
| Mississippi 背景、道路与桥墩图集选择 | `R/data/terrain-render-index.json`、`terrain-render-rules.json`、`BackgroundMap` 与 Mississippi 资源映射 | 变体是 APK 候选帧；网页固定 seed 仅保证可复现，不复现 APK 每次启动的时间随机结果。 |
| 路线动作、方向和静态可达性 | `R/data/static-route-graph.json`、`EnemyDirector.createEnemyDirectorFieldsFromBasicMap`、`EnemyDirectorField`、`PriorityMap` | 这是 TDM 控制点图，不代表逐帧寻路、动画或设备碰撞。 |
| 新局与读档单位标记语义 | DEX/Smali `GameObjectManager.smali` 的 `createGameObjectsFromBasicMap` switch、条件跳转和 `setUnitActivity(4)`；`GunsAndGloryThread.onLoadGame`、`restartLevel` | JADX Java 对该分支的重建曾给出相反解释；以 Smali 为准。 |
| 初始参数、波次与请求顺序 | `R/data/level-config.json`、`waves.json`、`wave-constant-resolution.json`、`GameDesignData.<clinit>`、`GameDesignWaves.setWaves` | 生成向量表示请求数量，不规定逐个敌人的确定生成顺序。 |
| 名称、介绍、胜利标题、对白和头像 | `R/data/string-resources.json`、`wave-reference-resolution.json`、APK 字符串/图片资源 | APK 的 default 字符串作为英文基线；中文为网页新增翻译。 |

`R/data/*.json` 是由 APK/DEX 派生的审计数据，不是 REA 原始 Evidence。JADX Java 也不是原始源码。

## 地图、地形与路线

- APK 原始地图共63个 TDM 文件，其中60个映射到可玩战役关卡；`td_map_20.tdm` 映射到第17关。网页关卡登记应按战役 level 17，不能按资源后缀登记为20。
- 地图网格为32×24，按行存储。Mississippi 的绘制数据含768格背景、对应街道层和16个水平桥墩贴图组件；背景、道路和桥面沿用现有 `createMississippiMapScene` 与 Mississippi 图集，不拉伸图块。
- 静态路线图共63个控制节点和74条有向边：6个出生点、53个转向点、4个出口。53/53转向点和4/4出口均可达，无不可达节点、越界或异常路径。

| TDM 出生点 | 初始方向 | 出口格 |
| --- | --- | --- |
| `(9,0)` | 南 | `(31,2)`、`(31,10)`、`(31,16)`、`(31,20)` |
| `(15,0)` | 南 | `(31,2)`、`(31,10)`、`(31,16)`、`(31,20)` |
| `(0,3)` | 东 | `(31,10)`、`(31,16)`、`(31,20)` |
| `(0,15)` | 东 | `(31,10)`、`(31,16)`、`(31,20)` |
| `(6,23)` | 北 | `(31,10)`、`(31,16)`、`(31,20)` |
| `(14,23)` | 北 | `(31,10)`、`(31,16)`、`(31,20)` |

正式路线应由原始动作 marker 生成，并逐点逐边对照 `R/data/static-route-graph.json`。画面上的桥或道路纹理不是路线证据。

## 对象、单位与解锁

以下坐标均为 `(x,y)`，原点在左上角。数量和坐标来自 map20 原始 TDM；语义来自 Smali 分支与现有 Mississippi 对象映射。

| Marker | 坐标 / 数量 | APK 新局语义 |
| --- | --- | --- |
| `68` | `(17,22)` | Mississippi `e_1x1_cactus_a` 装饰。 |
| `69` | 16格 | `e_1x1_rocks_a` 装饰。 |
| `71` | 5格 | `e_1x1_tree` 装饰。 |
| `77` | 8格 | `e_1x2_bones` 装饰和阻挡范围。 |
| `80`、`88` | 8格、28格 | 地形/街道构造输入，不是额外单位或路线节点。 |
| `96` | 11格 | unit type 1、activity 4：可招募 Gunslinger。 |
| `97` | 10格 | unit type 2、activity 4：可招募 Mexican。 |
| `99` | 5格 | unit type 4、activity 4：可招募 Indian。 |
| `100` | `(1,9)` | unit type 5、activity 4：达到全局第40关解锁后可招募 Sniper。 |
| `101` | 3格 | unit type 6、activity 4：达到全局第30关解锁后可招募 Grandpa。 |
| `104` | `(4,9)` | 新局活动 Gunslinger，unit type 1。 |
| `105` | `(4,12)` | 新局活动 Mexican，unit type 2。 |
| `107` | `(13,9)` | 新局活动 Indian，unit type 4。 |
| `130` | `(16,10)`、`(8,14)` | unit type 35、activity 4：全局第50关解锁后生成 Pyromaniac。 |
| `131` | `(5,10)` | unit type 36、activity 4：全局第60关解锁后生成 Salesman。 |

### 96–101 的控制流判定

Smali `createGameObjectsFromBasicMap` 将96–101分派到同一单位创建分支：`fromLoadGame == true` 时跳过；`fromLoadGame == false` 时按 marker 生成单位，成功后明确设置 activity 4。`GunsAndGloryThread` 在无存档新开局及 `restartLevel()` 中使用新局路径。由此可证实这些 marker **在新局创建可招募单位**；它们不是“仅用于读档恢复”的存档标记。Sniper 和 Grandpa 是否实际创建仍受 `GameObjectUnit.isUnlocked` 全局里程碑约束；类型1–4在本关均可用。

本结论也适用于已有 Mississippi map14–19，当前网页工厂漏掉了这些新局单位。之前 M11、M14、M15、M16 审计里关于“save-only”的陈述应以本段更正；旧回放仍须保留它录制时的旧单位列表。

map20 没有 `98` Cannon、`113` Fort、`112` Saloon、`132` Gambler 或 `150` Casino spawn marker；`waves.json` 中 `spawnPoolActions` 为空。因此不创建 Cannon 炮池、赌场/赌徒或假地图单位，也不需要新增 `campaignUnitPool` 配置。

## 初始参数与敌人波次

`level-config.json` 的 `index: 16` 对应 campaign level 17：初始 `$365`、20条生命、升级上限3；宝箱上限999、出现时间25,000ms、同时最多10个；Easy/Medium/Hard 敌人 HP 倍率分别为75%/100%/120%。记录中的 `awesomeMessageMin=30000`、`awesomeMessageUnit=5` 消费语义尚未确认，不据此新增玩法。

请求向量为 APK `addToWave` 的8个数量字段；现有网页十槽结构的最后两项应补零。每项 `出生点@间隔:[向量]` 对应一条原始生成请求。

| 波 | 头像 / 生成延迟 / HP倍率 / 速度倍率 | 出生请求 |
| ---: | --- | --- |
| 1 | Settlers / 15,000ms / 250% / 100% | `0@2000:[1,1,2,3,0,0,0,0]`; `1@2000:[1,1,2,3,0,0,0,0]` |
| 2 | Gunslinger / 8,000ms / 180% / 100% | `0@2000:[1,1,2,2,2,1,0,0]`; `1@2000:[1,1,1,2,1,1,0,0]`; `2@2000:[1,1,2,2,2,1,0,0]` |
| 3 | Mexican / 5,000ms / 175% / 100% | `0@2500:[1,2,1,2,3,2,0,0]`; `1@2500:[0,1,1,2,3,1,0,0]`; `3@2000:[1,1,1,1,2,1,0,0]` |
| 4 | Settlers / 8,000ms / 175% / 100% | `0@2500:[1,2,1,2,3,2,1,0]`; `1@2500:[0,1,1,1,3,1,1,0]`; `2@2000:[1,1,2,2,2,2,1,0]`; `3@2000:[1,1,1,2,2,2,0,0]` |
| 5 | Pedro / 5,000ms / 180% / 100% | `0@2500:[1,2,1,2,3,3,1,0]`; `1@2500:[0,1,1,1,2,3,1,0]`; `2@2000:[1,1,2,2,2,3,1,0]`; `3@2000:[1,1,1,2,3,2,1,0]`; `4@2000:[1,1,1,2,3,2,1,0]` |
| 6 | Settlers / 5,000ms / 200% / 110% | `0@2500:[1,2,1,2,3,3,1,0]`; `1@2500:[0,1,1,1,2,3,1,0]`; `2@2000:[1,1,2,2,2,3,1,0]`; `3–5@2000:[1,1,1,2,3,2,1,0]` |
| 7 | Settlers / 5,000ms / 250% / 110% | `0@2500:[1,2,1,2,3,3,1,0]`; `1@2500:[0,1,1,1,2,3,1,0]`; `2@2000:[1,1,2,2,2,3,1,0]`; `3–5@2000:[1,1,1,2,3,2,1,0]` |
| 8 | Mexican / 5,000ms / 275% / 110% | `0@3500:[0,0,1,1,2,3,2,1]`; `1@3500:[1,0,1,0,2,3,2,1]`; `2@4000:[1,1,0,0,3,3,2,1]`; `3@3500`、`4@4000`、`5@3500` 均为 `[1,1,0,0,3,3,2,1]` |

符号值已按 APK 依赖解析：`ItemTouchHelper.Callback.DEFAULT_SWIPE_ANIMATION_DURATION=250ms`，`GameObjectShot.UNIT_BONUS_DURATION_FIRE=5000ms`。请求数量按 `newWave` 调用顺序归组为2、3、3、4、5、6、6、6，共35条；不是固定逐敌人出生顺序。本关不定义额外 Fort spawn pool 动作。

## 英文资源与网页内容

| 资源 | APK default 文案 |
| --- | --- |
| `T_LEVEL_NAME_20` | Dead Rocks |
| `T_LEVEL_INFO_20` | There are lots of spooky night-time stories about Dead Rocks, none of which are true, of course. |
| `T_LEVEL_NAME_WON_20` | The Dread of Dead Rocks |
| `T_CAMPAIGN_18_01` | It's so creepy here... hold me tight, honey, so we don't lose each other! |
| `T_CAMPAIGN_18_02` | We'll really have to keep our eyes peeled here! I can't tell the settlers from the corpses! |
| `T_CAMPAIGN_18_03` | Boss... where are you? I think I'm lost! |
| `T_CAMPAIGN_18_04` | We have to go left up here... no, right... or is it straight ahead? |
| `T_CAMPAIGN_18_05` | Señor... I... am really... out of breath... from so much running around! But that should be enough to knock 'em down! |
| `T_CAMPAIGN_18_06` | Honey, are you sure we have to stay here for a while? |
| `T_CAMPAIGN_18_07` | Hmm, I was using this stone as a landmark... I didn't realize there are lots of stones here! |
| `T_CAMPAIGN_18_08` | Boss, everything is spinning around! We should rob the last settlers fast and get outta here! |

波次资源名是 `T_CAMPAIGN_18_01..08`，虽然关卡 id 为17、标题资源号为20；实现以 `GameDesignWaves.setWaves` 实际引用为准。网页应提供对应中文翻译。关卡图 `gng_levelmap_20.png`、四类对白头像、Mississippi 地形资源及 `music_loop2_mississippi.ogg` 已在应用资源中。音效保持关闭，未作试听；新场景只复用现有音频引用，不据此声明音频体验已验收。

## 实现门槛和未确认项

- 地图测试逐格比较原始 TDM、地图尺寸、地形/街道层、桥墩、静态装饰及路线控制图；路线测试覆盖6个出生点的全部可达分支。
- 单位测试核对活动单位、休眠招募 marker、解锁快照和旧回放单位列表。正式入口测试覆盖关卡依赖、Free Play、三种难度、结算档案边界和回放重建。
- `awesomeMessageMin`/`awesomeMessageUnit` 的具体 UI/规则消费者未闭环；它不阻塞地图、波次及正式关卡接入，不据猜测实现额外功能。
- APK 的时间随机地形选择、真实音频播放、逐帧战斗效果和全关手动通关不是静态接入门槛。若后续代码检查不能解释具体行为，再为该单点设计最小观察。
