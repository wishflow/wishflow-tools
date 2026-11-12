# Mississippi 第18关：Shadow Town 静态审计

## 结论

**静态证据足以开始实现。**Shadow Town 是正式战役第18关，使用 `res/raw/td_map_21.tdm`。关卡有六个敌人入口、59个转向点、六个出口，包含两个 Saloon、一个 Fort、一组 Dynamite 对象、三名初始 Gunslinger，以及 wave 2 的 Saloon/Fort 玩家单位池动作。关卡有八波、37个敌人生成请求。无需启动 Android 或完整手动通关。

本审计基于本机 `Guns’n’Glory FREE 1.8.6` APK，SHA-256：`49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51a3a1fb56`。`res/raw/td_map_21.tdm` 为770字节，SHA-256：`8f1609f3ef8f5a46b77f240c35ed775b0c5623bcbbcfebde8018e42fe43d7a99`；与提取文件和派生地图清单摘要一致。研究工作树中的 `apps/gunsnglory/docs/research/` 下文简称 `R/`；派生 JSON 是审计材料，不是原始 APK 文件或原始源码。JADX Java 为重建伪代码，涉及地图 marker 的分支以 Smali 条件和 switch 为准。

## 证据来源与适用边界

| 结论 | 证据来源 | 边界 |
| --- | --- | --- |
| APK 版本、地图文件、尺寸和字节摘要 | APK；`R/data/map-inventory.json`、`resource-inventory.json`；`BasicMap.loadMap` | 地图文件号21对应战役第18关，不是第21关。 |
| 地形贴图、变体和桥墩绘制位置 | `R/data/terrain-render-index.json`、`terrain-render-rules.json`；`BackgroundMap` 的 Mississippi 绘制分支 | 背景变体按 APK 候选表复现；网页固定随机种子只保证稳定，不复现 APK 每次启动的时间随机结果。 |
| 路线节点、连接和出口可达性 | `R/data/static-route-graph.json`；`EnemyDirector.createEnemyDirectorFieldsFromBasicMap`、`EnemyDirectorField`、`PriorityMap` | 这是静态路线控制图，不涵盖逐帧移动、动画和设备碰撞。 |
| 新局单位、Dynamite、Saloon/Fort 和存档 marker 语义 | DEX/Smali `GameObjectManager.createGameObjectsFromBasicMap`；`GameObjectUnit.create`；`GameObjectSpawnLocation`；项目已有 `campaign-map-unit-placements.ts`、`dynamite.ts` | 96–101 是从存档恢复的玩家单位 marker；不得把它们当作新局初始单位。 |
| 起始参数、敌人请求和炮池动作 | `R/data/level-config.json`、`waves.json`、`wave-constant-resolution.json`；DEX `GameDesignWaves.setWaves`、`WaveManager.addToWave`、`SpawnPoolManager.addActionForSpawnPool/performActionsForWave/update` | `addToWave` 的10参数重载把最后两个请求槽补零；请求顺序按源调用次序保存。 |
| 标题、关卡说明、胜利标题、对白与头像 | `R/data/string-resources.json`、`wave-reference-resolution.json`、`drawable-use-index.json` | APK default 文本为英文基线；中文是网页翻译。不得把资源名 `T_CAMPAIGN_17_*` 当成战役第17关。 |

## 地图、地形与路线

- `td_map_21.tdm` 是32×24的 y-major 网格，总长770字节。它是63个 TDM 文件中映射至60个可玩战役关卡的一个；此文件对应 global level 18。
- 地图地形分区为 Mississippi。背景和街道按 APK 的 Mississippi atlas/render rules 生成；地图内有五组横向桥墩绘制件（共10个左右件），坐标为 `(3,2)`、`(27,9)`/`(29,9)`、`(2,12)`/`(4,12)`、`(2,19)`、`(21,22)`/`(22,22)`。桥墩属于绘制层，不能据此推导路线或单位碰撞。
- 路线图含71个控制节点、72条有向边、6个出生点、59个转向点和6个出口；59/59转向点与6/6出口可达，无异常路径、环路或越界。
- APK 将地图路线字段按 y-major 顺序扫描；`addToWave` 的第一个参数却是 marker action ID（由 `EnemyDirector.addEnemyAtSpawnPoint` 按 `EnemyDirectorField.actionID` 匹配）。网页 Game 的 `spawnPointId` 是 `previewWave.spawn + additionalSpawns` 中出生点的下标，不是完整路径 `routes` 的下标。因此关卡数据必须显式做 `actionID → row-major spawnPointId` 转换，不要直接复制 ID，也不需要改公共 Game 接口。

| 网页出生点数组下标 | TDM 坐标 / marker | APK action ID | 初始方向 | 可达出口 |
| --- | --- | --- | --- |
| 0 | `(3,0)` / 44 | 4 | 南 | `(24,0)` |
| 1 | `(0,9)` / 40 | 0 | 东 | `(25,0)`、`(31,11)` |
| 2 | `(0,10)` / 41 | 1 | 东 | `(24,0)`、`(31,11)`、`(31,12)`、`(21,23)` |
| 3 | `(0,15)` / 42 | 2 | 东 | `(25,0)`、`(31,11)`、`(31,12)`、`(21,23)` |
| 4 | `(0,16)` / 43 | 3 | 东 | `(31,11)`、`(22,23)` |
| 5 | `(2,23)` / 45 | 5 | 北 | `(21,23)` |

`spawnPointId` 对应上表第一列，即 `previewWave.spawn` 后接 `additionalSpawns` 的顺序；独立的完整路径集合 `routes` 不决定波次出生点下标。路线字段由原始 action marker 生成。不要用道路、桥或纹理边缘手工移动节点；地图美术不是路线证据。

## 新局对象、单位与进度门控

坐标为 `(x,y)`，原点在左上角。marker 语义由地图对象工厂的 Smali 分支确认，并与 TDM 网格交叉检查。

| Marker | 坐标 / 数量 | 新局含义与处理 |
| --- | --- | --- |
| `104` | `(9,10)`、`(17,10)`、`(22,13)` | 三名已激活的 Gunslinger（unit type 1，activity 5）。 |
| `112` | `(13,7)`、`(17,13)` | 两个玩家单位生成位置，类型1，对应 Saloon。 |
| `113` | `(20,8)` | 一个玩家单位生成位置，类型2，对应 Fort。不是初始 Cannon。 |
| `102` | `(21,16)` | DynamiteTrigger。 |
| `110` | `(22,17)` | DynamiteBox；与唯一的 marker 102 配对。 |
| `130` | `(28,17)` | Pyromaniac hire marker（unit type 35）；仅全局第50关解锁后出现。 |
| `131` | `(26,2)` | Snake Oil Salesman hire marker（unit type 36）；仅全局第60关解锁后出现。 |
| `97`、`99`、`100`、`101` | 共12个 | 存档恢复用 marker（96–101）；新局必须忽略。读取存档时由存档单位列表还原。 |
| `116` | `(10,9)`、`(17,9)`、`(13,12)`、`(22,12)` | 装饰对象编号12，对应 `b_2x1_shack`；横向双格锚点偏移 `-0.5`，占用左右相邻格。原 Mississippi 装饰表此前漏映射该 marker。 |

Dynamite 显示和可用状态沿用现有全局解锁规则：完成 global level 20 或30后开放。该关处于第18关，因此新档默认锁定；Free Play 只有在导入的正式进度满足条件时才显示。关卡内容版本和回放必须记录并恢复 Dynamite 与特殊单位的解锁快照。

其他装饰 marker 由 TDM 与现有 Mississippi 装饰表直接映射：68×6、71×4、73×6、74×2、75×2、76×6、77×2。marker 80/88 是地图绘制/结构输入，不创建独立游戏对象。地图上没有新局 Cannon marker；炮池生成 Cannon 时应使用 `CampaignUnitPoolDefinition` 的独立 `template`，不得添加假单位来满足模板查找。

## 起始参数与波次

关卡参数表的 `index: 17` 对应战役第18关。开局现金 `$425`、20条生命、升级上限3；三档敌人 HP 倍率为 Easy 75%、Medium 100%、Hard 110%。其余关卡级补给参数为 `maxChests=999`、`chestTime=25000`、`maxChestsPlayfield=16`；awesome-message 字段按共享规则复用，不猜测新的关卡效果。

APK 源分支为 `GameDesignWaves.setWaves(..., 18)`，共八波、37个请求。下表保留每波对白、头像、等待时间、HP/速度倍率和 APK action ID；每个请求的完整敌人类型数量向量见 `R/data/waves.json` 以及该分支的逐条 `addToWave` 调用。

| 波次 | APK 字符串 / 头像 | 开始等待 | HP倍率 | 速度倍率 | 请求数 / APK action ID |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | `T_CAMPAIGN_17_01` / Pedro | 15000 ms | 180% | 100% | 2 / 0,1 |
| 2 | `T_CAMPAIGN_17_02` / Mexican | 5000 ms | 225% | 105% | 2 / 0,1 |
| 3 | `T_CAMPAIGN_17_03` / Settlers | 5000 ms | 200% | 100% | 4 / 0–3 |
| 4 | `T_CAMPAIGN_17_04` / Gunslinger | 5000 ms | 200% | 115% | 5 / 0–4 |
| 5 | `T_CAMPAIGN_17_05` / Gunslinger | 5000 ms | 200% | 110% | 6 / 0–5 |
| 6 | `T_CAMPAIGN_17_06` / Mexican | 5000 ms | 180% | 150% | 6 / 0–5 |
| 7 | `T_CAMPAIGN_17_07` / Gunslinger | 5000 ms | 200% | 110% | 6 / 0–5 |
| 8 | `T_CAMPAIGN_17_08` / Mexican | 5000 ms | 200% | 110% | 6 / 0–5 |

Wave 1 至8的请求数相加为37。原始 `addToWave` 为10参数形式（APK action ID、间隔、8种类型数量）；`WaveManager.addToWave` 将最后两种类型数量补为0，因此网页 `requests` 必须保持10槽。`spawnPointId` 应先按上表转换到网页路线数组下标。不要从 wave 标题或 `newWave` 数量推断请求数量。

### 玩家单位池

波次1的请求不能替代玩家单位池。APK 在 wave 2 执行两条独立动作：

| 原始调用 | 解释 |
| --- | --- |
| `addActionForSpawnPool(2, 1, 2, 2, 1, 0)` | 第2波 `set`：pool type 1 Gunslinger 数量2、type 2 Mexican 数量2、type 3 Cannon 数量1。 |
| `addActionForSpawnPool(2, 3, 6, 4, 2, 0)` | 第2波 `set-max`：type 1上限6、type 2上限4、type 3上限2。 |

`SpawnPoolManager.update` 将 pool type 1/2 分配到类型1的 Saloon 生成位置，将 pool type 3 分配到类型2的 Fort。全局派发周期为15秒。pool 模板是可以雇佣的单位定义，不是 TDM 上额外摆放的地图单位；Mexican 和 Cannon 模板不应伪造成初始地图角色。

网页关卡把 Gunslinger 与 Mexican 作为 Saloon 池类型，把 Cannon 作为 Fort 池类型。TDM 没有新局 Mexican 或 Cannon 单位 marker；两者应由关卡单位池的独立模板生成。Mexican 模板复用共享 New Mexico 活跃单位工厂，Cannon 模板复用 Fort/Kaboom 单位设计；这些模板仅供池生成克隆，不进入新局地图单位列表。

## 文案与资源

- 英文关卡名：`T_LEVEL_NAME_21` → “Shadow Town”。简介：`T_LEVEL_INFO_21` → “There's only one town where you're faster than your shadow: Shadow Town.” 胜利标题：`T_LEVEL_NAME_WON_21` → “The Shadow of Shadow Town”。
- 八段对白使用 APK default 字符串：
  1. `T_CAMPAIGN_17_01` — “Welcome to Shadow Town!”
  2. `T_CAMPAIGN_17_02` — “Welcome? Are you talking to me?”
  3. `T_CAMPAIGN_17_03` — “A town... at last! I'm sure we'll be able to rest here!”
  4. `T_CAMPAIGN_17_04` — “More are on their way! Let's show them some hospitality!”
  5. `T_CAMPAIGN_17_05` — “All roads lead to... Shadow Town!”
  6. `T_CAMPAIGN_17_06` — “Boss, when I see all the settlers here, I realize we still don't have a cemetery!”
  7. `T_CAMPAIGN_17_07` — “Whaddya mean, cemetery? We have two saloons; what more do you want?”
  8. `T_CAMPAIGN_17_08` — “That's what I call a boom town! BOOM!”
- 头像依次为 `portrait_pedro`、`portrait_mexican`、`portrait_settlers`、`portrait_gunslinger`、`portrait_gunslinger`、`portrait_mexican`、`portrait_gunslinger`、`portrait_mexican`。关卡选择缩略图为 `gng_levelmap_21`。
- 中文标题、介绍、胜利标题和对白为网页新增翻译；不得把中文翻译伪称为 APK 原文。默认静音；本关无需通过播放音效来确认关卡规则。

## 尚未验证与实现注意事项

- 没有通过 Android 运行验证；本关的关键地图、波次、关卡数据和对象行为均有静态数据与消费者代码交叉证据，因此当前没有需要启动模拟器才能决定的实现项。
- 地图随机贴图的具体单次结果受 APK 启动时随机种子影响；网页遵循已验证的固定种子策略，不追求每次启动都与手机截图逐像素一致。
- `T_CAMPAIGN_17_*` 与 `T_LEVEL_*_21` 的编号体系不同；正式关卡 ID 和 Free Play 入口必须用 global level 18，而不是直接复用资源后缀或字符串序号。
- 任何在实施中发现与本报告冲突的代码行为，都先核对 APK 的实际 DEX/Smali 消费点，更新报告和计划，再修改游戏实现。
