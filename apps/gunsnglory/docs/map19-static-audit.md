# Mississippi 第19关：Dust Falls 静态审计

## 结论

**现有 APK 派生资料足以开始接入。**Dust Falls 是正式战役第19关，使用 `res/raw/td_map_22.tdm`。地图是32×24网格，包含4个敌人入口、34个转向 marker、4个出口和7条完整路线；场景有两名活动 Mexican、22个可招募单位 marker（其中 Sniper 与 Grandpa 受全局解锁约束）、一个 Tipi 玩家单位生成点、各一个 Pyromaniac/Salesman 解锁 marker，关卡有8波、24条敌人生成请求。wave 4 为 Tipi 的 Indian 单位池设置2名待生成单位、生命周期上限4名。

结论来自 Guns’n’Glory FREE 1.8.6 APK 的静态提取、DEX/Smali 和现有消费者代码交叉核对；没有运行 APK，也不是完整战役实测。APK 派生 JSON 与反编译 Java 只用于定位和复算，涉及分支语义以 Smali/DEX 为准。

## 证据来源和边界

研究归档 `R/` 指独立研究工作树中的 `apps/gunsnglory/docs/research/`；该归档不属于应用构建输入。本报告引用的关键材料如下：

| 结论 | 静态证据 | 边界 |
| --- | --- | --- |
| TDM 文件身份、原始字节网格、文件尺寸 | `R/data/map-inventory.json`、APK `res/raw/td_map_22.tdm`、`BasicMap.loadMap` | `map_index: 22` 对应 global campaign level 19；地图号不是关卡号。 |
| Mississippi 背景、道路、桥墩、候选贴图 | `R/data/terrain-render-index.json`、`terrain-render-rules.json`、`BackgroundMap` 的地形分支 | APK 每次启动按时间种子选变体；网页沿用项目的固定 Java 随机种子，只要求候选集和绘制语义一致。 |
| 路线 marker、方向和出口 | 原始 TDM 网格、`R/data/static-route-graph.json`、`EnemyDirector.createEnemyDirectorFieldsFromBasicMap`、`EnemyDirectorField` | 控制图可证明入口到出口路径，不等于逐帧移动或碰撞运行观察。 |
| 地图对象、初始单位、雇佣位置 | DEX/Smali `GameObjectManager.createGameObjectsFromBasicMap`、`GameObjectSpawnLocation`、`R/data/map-inventory.json` | 以 Smali 中 `fromLoadGame` 条件和 activity setter 判定新局/读档分支；不按 marker 数值范围猜测。 |
| 起始数值、波次和玩家单位池 | `R/data/level-config.json`、`waves.json`、`campaign-wave-paired-spawns.json`、`wave-constant-resolution.json`；DEX `GameDesignWaves`、`SpawnPoolManager` | `addToWave` 的8个显式请求槽需要在网页补齐到10槽；APK action ID 和网页出生点下标是不同契约，必须映射。 |
| 标题、简介、结算标题、对白、头像与音频 | `R/data/string-resources.json`、`wave-reference-resolution.json`、`resource-inventory.json`、APK `R.string` / `R.drawable` | APK default 英文是原文基线；中文为网页翻译。`newWave` 显式给出头像，不含独立的逐波音频参数；对白语音沿用应用已有角色声音映射。 |
| 正式入口和回放 | APK 关卡序号、四个全局解锁 marker 与现有 Mississippi 内容/回放模式 | APK 静态资料可确定关卡和单位状态；网页入口是否注册、结算是否写档仍须由 M19 内容与入口测试验证。 |

## 地图、地形与路线

- `td_map_22.tdm` 为 y-major、32×24 的 TDM 文件，原始文件770字节。63个地图资源中有60个对应战役关卡；map22 属于第19关，而不是第22关。
- `R/data/terrain-render-index.json` 将其归类为 Mississippi 地形。背景成形前的非零背景格有679个，街道层有18个非零格；另有14个桥墩绘制位置（7组左右桥墩）。桥墩是贴图绘制层，不是路线或额外碰撞实体。网格中有201个水域背景 marker 124 和13个水边岩石 marker 126。
- 路线控制图共有42个节点、41条有向控制边：4个入口、34个 redirector 和4个出口；42个节点均从入口可达，展开后得到7条入口至出口路线，无环路、断路或越界分支。

| 网页出生点下标 | TDM 位置 / marker | APK action ID | 初始方向 | 可达出口 | 路线数量 |
| ---: | --- | ---: | --- | --- | ---: |
| 0 | `(1,0)` / 40 | 0 | 南 | `(0,16)` | 2 |
| 1 | `(2,0)` / 41 | 1 | 南 | `(0,17)` | 1 |
| 2 | `(29,0)` / 42 | 2 | 南 | `(31,17)` | 1 |
| 3 | `(30,0)` / 43 | 3 | 南 | `(31,16)` | 3 |

M19 四个入口按 TDM 行优先顺序排列，因此本关 action ID 与 `spawnPointId` 当前刚好一一相同；实现仍需显式产生映射并测试，不能把“碰巧相同”作为通用约定。出入口和路线位置取自 TDM redirector marker，不按路径贴图边缘手工移动。

## 地图对象与新局单位

坐标使用 `(x,y)`，原点在左上角。下表按 `GameObjectManager.createGameObjectsFromBasicMap` 的 DEX/Smali 控制流解码。96–101 及 130–131 在新局创建 activity 4 单位；进入读档路径时跳过它们。104–109 在新局创建 activity 5 单位，因此 map22 的 code105 是已活动的 Mexican，不是睡眠单位。

| Marker | 坐标 / 数量 | APK 语义与实现要求 |
| --- | --- | --- |
| `105` | `(7,4)`、`(28,6)` | 两名 unit type 2 Mexican，activity 5；新局活动单位。睡眠 Mexican 使用 code97。 |
| `114` | `(6,6)` | 一个 type 3 玩家单位生成位置，即 Tipi；对应 Indian 池。M19-C 已将其映射为 `b_2x1_tipi`，使用已核实的锚点偏移，并由 TDM marker 测试校验。 |
| `130` | `(21,17)` | unit type 35、activity 4；新局 Pyromaniac hire marker，global level 50 解锁前不生成。 |
| `131` | `(4,9)` | unit type 36、activity 4；新局 Snake Oil Salesman hire marker，global level 60 解锁前不生成。 |
| `96` | 8格 | unit type 1、activity 4；新局可招募 Gunslinger。 |
| `97` | 6格 | unit type 2、activity 4；新局可招募 Mexican。 |
| `98` | 0格 | unit type 3、activity 4；此图没有 Cannon hire marker。 |
| `99` | 4格 | unit type 4、activity 4；新局可招募 Indian。 |
| `100` | 1格 | unit type 5、activity 4；完成全局第40关后生成 Sniper hire。 |
| `101` | 3格 | unit type 6、activity 4；完成全局第30关后生成 Grandpa hire。 |
| `68`、`70`、`76`、`126` | 5、6、4、13个 | Mississippi 场景中的仙人掌、石头、灌木和水边岩石装饰；位置应直接使用 TDM 格。 |
| `120`–`123` | 共6个 | 水域背景的动画/贴图 marker，由地图背景绘制处理；不得创建成可招募单位。 |

Dust Falls 只有一个 type-3 Tipi 生成位置，没有 Saloon/Fort marker，也没有 code107 的活动 Indian marker；但有4个 code99 新局可招募 Indian。`GameObjectSpawnLocation` 将类型3定义为 `SPAWN_LOCATION_TIPI`；map22 的 wave4 池动作需要 pool type4 Indian。现有 `CampaignUnitPoolUnitDefinition.template` 已允许提供池专用 `ScenarioUnit`，运行时会优先使用它。使用独立 Indian 模板即可，不需要在地图上伪造一名活动单位，也不需要再扩展公共 Game 接口。`murdock-mountains-scene.ts` 中现有 Tipi 资源映射可用于核对贴图资产与锚点。

## 起始参数、敌人波次与玩家单位池

`R/data/level-config.json` 的 `index: 18` 是从0开始的 level row，对应 global campaign level 19：开局 `$365`、15条生命、升级上限3；Easy/Medium/Hard 敌人 HP 倍率分别为75%/100%/110%。补给参数为 `maxChests=999`、`chestTime=25000`、`maxChestsPlayfield=10`；映射到网页奖励箱池的存量、生成间隔和同时上限。奖励箱使用现有4种奖励类型。共享敌人设计及难度应用沿用现有 Mississippi 规则，不为本关自行调参。

`GameDesignWaves` 对 global level 19 配置8波、24条 `addToWave` 调用。请求数组以下按8个显式敌人类型槽记录；网页定义需附加两个0，成为 Game 的10槽契约。`action` 列是 APK marker action ID；`interval` 是该出生池内请求间隔。

| 波次 | 开始延迟 | HP倍率 | 速度倍率 | APK对白 / 头像 | action / interval / 8槽请求向量 |
| ---: | ---: | ---: | ---: | --- | --- |
| 1 | 15000 ms | 225% | 100% | `T_CAMPAIGN_19_01` / Mexican | `0 / 2000 / [1,1,1,2,3,2,0,0]`；`1 / 2000 / [1,1,1,2,3,2,0,0]` |
| 2 | 5000 ms | 250% | 105% | `T_CAMPAIGN_19_02` / Settlers | `0 / 2000 / [1,1,2,2,2,3,1,0]`；`1 / 2000 / [1,1,1,2,3,2,0,0]` |
| 3 | 5000 ms | 250% | 115% | `T_CAMPAIGN_19_03` / Settlers | `0 / 2500 / [1,2,1,2,3,3,1,0]`；`1 / 2500 / [0,1,1,1,2,3,1,0]` |
| 4 | 10000 ms | 200% | 115% | `T_CAMPAIGN_19_04` / Indian | `2 / 2000 / [1,1,2,2,2,3,1,0]`；`3 / 2000 / [1,1,1,2,3,2,0,0]` |
| 5 | 5000 ms | 225% | 110% | `T_CAMPAIGN_19_05` / Pedro | `0 / 2000 / [1,1,1,2,3,2,1,0]`；`1 / 2000 / [1,1,1,2,3,2,1,0]`；`2 / 2000 / [1,1,2,2,2,3,1,0]`；`3 / 2000 / [1,1,1,2,3,2,0,0]` |
| 6 | 5000 ms | 225% | 150% | `T_CAMPAIGN_19_06` / Mexican | `0 / 2500 / [1,2,1,2,3,3,1,0]`；`1 / 2500 / [0,1,1,1,2,3,1,0]`；`2 / 2000 / [1,1,2,2,2,3,1,0]`；`3 / 2000 / [1,1,1,2,3,2,0,0]` |
| 7 | 5000 ms | 250% | 115% | `T_CAMPAIGN_19_07` / Pedro | `0 / 2500 / [1,2,1,2,3,3,1,0]`；`1 / 2500 / [0,1,1,1,2,3,2,0]`；`2 / 2000 / [1,1,2,2,2,3,1,0]`；`3 / 2000 / [1,1,1,2,3,2,2,0]` |
| 8 | 5000 ms | 250% | 115% | `T_CAMPAIGN_19_08` / Gunslinger | `0 / 3500 / [0,0,1,1,2,3,2,1]`；`1 / 3500 / [1,0,1,0,2,3,2,1]`；`2 / 4000 / [1,1,0,0,3,3,2,1]`；`3 / 3500 / [1,1,0,0,3,3,2,1]` |

`GameObjectShot.UNIT_BONUS_DURATION_FIRE` 在 APK 常量表中为5000 ms，`ItemTouchHelper.Callback.DEFAULT_SWIPE_ANIMATION_DURATION` 为250 ms；上表已换算成实际延迟/HP数值。请求顺序与 `GameDesignWaves` 调用顺序一致。波次1–8的请求数量按源分组为2、2、2、2、4、4、4、4。

池动作来自 `addActionForSpawnPool(4, 1, 0, 0, 0, 2)` 和 `addActionForSpawnPool(4, 3, 0, 0, 0, 4)`：在第4波执行 `set` 与 `set-max`，分别将 pool type 4（Indian）待生成数设为2、上限设为4；Gunslinger/Mexican/Cannon 三种其他池均设为0。派发间隔使用已验证的全局15秒池周期。Indian 在唯一的 Tipi 生成，模板使用项目现有 Fort/Kaboom Indian 单位设计；不把池专用模板放进初始场景单位数组。

## 文案与离线资源

- 关卡标题：`T_LEVEL_NAME_22` → `Dust Falls`。
- 简介：`T_LEVEL_INFO_22` → “Soggy dust fills the air when you jump into the water from Dust Falls.”
- 胜利标题：`T_LEVEL_NAME_WON_22` → “The Strangeness of Dust Falls”。
- 八段 APK default 对白与头像：
  1. `T_CAMPAIGN_19_01` — “The sound of the waterfall makes me want to take a leak!” / Mexican。
  2. `T_CAMPAIGN_19_02` — “I wonder how deep it is here...” / Settlers。
  3. `T_CAMPAIGN_19_03` — “I can't tell you how deep it is here, honey! So it must be three-dimensional!” / Settlers。
  4. `T_CAMPAIGN_19_04` — “Palefaces on right! Blue Buffalo is drawing his bow!” / Indian。
  5. `T_CAMPAIGN_19_05` — “The settlers are splashing around!” / Pedro。
  6. `T_CAMPAIGN_19_06` — “Boss! I can't cross the waterfall! I can't jump!” / Mexican。
  7. `T_CAMPAIGN_19_07` — “The settlers are coming in droves!” / Pedro。
  8. `T_CAMPAIGN_19_08` — “The waterfall should soon be covered in dust.” / Gunslinger。
- 现有页面资源已包含 `gng_levelmap_22.png`、Mississippi 地形 atlas、各头像、角色语音和 `b_2x1_tipi`。实现只需登记现有资源，不重复复制资产；仍须验证所有引用能由离线资源表解析。
- 中文标题/简介/胜利标题/对白使用项目翻译，不宣称为 APK 原文。默认静音；声音文件和引用静态核对即可，本批不以试听作为验收门槛。

## 正式入口、Free Play 与回放要求

- `campaign-catalog.ts` 的 global level 19 使用 `mapFileNumber: 22`、`titleResourceNumber: 22`。当前开发分支已由 `official-campaign.ts` 注册正式第19关并依赖第18关；公开版仍需等 M19 批次发布后才可进入。
- 当前开发分支已将 Dust Falls 纳入 Mississippi Free Play。加入后只更新受影响的正式关卡总数、Mississippi Free Play 数量及后续禁用范围，不重写与 M19 无关的旧快照。
- map22 的 marker100/101/130/131 分别随 global level40/30/50/60 解锁。因此正式场景、Free Play 和回放必须记录并还原 Grandpa、Sniper、Pyromaniac、Salesman 四个全局解锁位；Free Play 仍不得写正式进度。回放版本使用独立的 M19 contentVersion 前缀，不能复用 M18 身份。
- 正式胜利写入第19关完成状态；Free Play 不写正式进度。M19-E 已添加独立 contentVersion，记录 Grandpa、Sniper、Pyromaniac、Salesman 四个解锁位，并由回放入口还原。已存在的 `gng_levelmap_22.png` 只用于目录缩略图；可玩地图仍来自独立 TDM 与地形绘制数据，已在 M19-B 接入。

## 未通过 Android 验证的事项

无。当前可决定的规则均有 APK 静态数据、DEX/Smali 语义和网页消费代码支持；本批不启动 Android，也不完整手动通关。若实现时出现 Tipi 绘制层级或 Indian 模板行为与现有代码冲突，先核查 `GameObjectSpawnLocation` 与资源映射，不以装饰截图替代 marker 语义。
