# Dakota 第 2 关：Six Grandfathers 静态审计

## 结论与范围

Six Grandfathers 是 Dakota 第 2 关、全局第 32 关，对应 APK `res/raw/td_map_35.tdm`。map35 为 32×24、770 字节；TDM 解码后有 768 个格点。地图同时包含多岔路、铁路、横桥/竖桥、两类单位池来源建筑、大量睡眠单位和一列火车。本审计固定关卡实现基线，不把贴图范围当作行走范围，不把敌方路线图当成全部地图的碰撞模型。

所有结论来自用户提供的 Guns’n’Glory FREE 1.8.6 APK 静态资源、Smali/REA 和 APK 数据派生表，不代表原版 APK 运行观察。反编译 Java 伪代码不等同于原始源码；关键字段、条件分支和地图 marker 语义应以 DEX/Smali 及其消费者为准。当前 M32 仍是上一关，Six Grandfathers 尚未接入网页正式目录或 Free Play 内容。

## 来源索引

| 短键 | 来源与定位 | 支持范围 |
| --- | --- | --- |
| `APK186` | `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk`，包名 `com.hg.gunsandgloryfree`，版本 1.8.6；REA Android 静态检查 | 本关唯一原版目标。APK 未运行。 |
| `TDM35` | APK ZIP 项 `res/raw/td_map_35.tdm`；也可在本地用 `unzip -p <apk> res/raw/td_map_35.tdm` 复核 | 原始 770 字节、宽高、逐格 marker 计数与坐标。 |
| `TERRAIN35` | DEX `BackgroundMap` 的 `createBackgroundMap/createStreetLayerMap/shapenBackgroundMap/shapenStreetLayerMap/createVariationMap`；`levelpacks.Dakota.drawBackgroundLayer` | 地形与街道图层顺序、邻格塑形、随机变体、图集与原始碰撞值的区别。 |
| `ROUTE35` | DEX `EnemyDirector`、`EnemyDirectorField`、`PriorityMap`；直接根据 map35 spawn/redirect/exit markers 派生 | 3个 spawn、43个 redirect、3个 exit、48条唯一有向边及静态可达性。 |
| `OBJECT35` | DEX `GameObjectManager.createGameObjectsFromBasicMap`、`GameObjectDecoration.<init>`、`GameObjectSpawnLocation.<init>`、`GameObjectUnit.create`、列车 placement 调用 | 静态装饰、建筑、sleeping/active 单位、特殊单位和列车构造语义。switch 反编译有错误提示的分支必须用 Smali 核对。 |
| `POOL32` | `GameDesignWaves.setWaves()` 的 `i == 32` 分支、`SpawnPoolManager.addActionForSpawnPool`、`SpawnPoolAction` 与 spawn-location 消费者 | 初始库存重置、Wave 1 单位池上限和来源建筑类型。 |
| `LEVEL32` | `GameDesignData.gameDesignData[31]`，以及线程按 global level−1 读取参数的调用 | 全局第32关的初始现金、生命、宝箱、升级、难度倍率和配置字段。不能使用 map34 的 index 30 参数。 |
| `WAVES32` | `GameDesignWaves.setWaves()` 的 `i == 32` 分支；`waves.json` 对应 `levelId=32` | 八个 `newWave`、十三条 `addToWave` 和波次内玩家池动作。检查分支本身，不能以先前摘要计数代替。 |
| `COPY32` | `T_LEVEL_NAME_35`、`T_LEVEL_INFO_35`、`T_CAMPAIGN_32_01..08` 与对应 drawable 参数 | 英文关卡身份、对白原文与头像。中文只作为网页翻译。 |
| `WEBBASE` | 本项目 M32 代码与[上一关静态审计](map31-static-audit.md)；共用碰撞基线见[玩家碰撞审计](player-collision-audit.md) | 现有可复用模块和代码边界；不能据此推断 M33 已实现。研究派生 JSON 位于本地 `codex/gunsnglory-spec` 分支的 `apps/gunsnglory/docs/research/data/`。 |

## TDM 网格和关键 marker

非零 marker 计数如下，连同 348 个 raw 0 合计 768：

```text
16:79, 32:109, 36:53, 40:1, 41:1, 42:1, 48:3,
52:6, 53:13, 54:22, 58:1, 60:1,
69:6, 70:2, 71:5, 72:1, 75:1, 76:9,
80:1, 82:12, 83:2, 84:4, 86:1, 87:1, 88:4,
96:14, 97:11, 98:8, 99:6, 100:1, 101:6,
112:1, 114:1, 117:4, 124:26, 126:1, 130:1, 131:1
```

坐标为零起始 `(x,y)`：

| Marker | 坐标 |
| --- | --- |
| Spawn `40–42` | `40@(31,7)` action 0；`41@(31,17)` action 1；`42@(13,0)` action 2 |
| Exit `48` | `(0,13)、(0,14)、(0,15)` |
| Redirect `52` 北 | `(18,8)、(5,16)、(4,17)、(8,18)、(7,19)、(22,20)` |
| Redirect `53` 南 | `(9,5)、(8,6)、(10,6)、(5,7)、(9,7)、(28,7)、(7,8)、(4,11)、(6,11)、(19,13)、(17,16)、(18,17)、(26,17)` |
| Redirect `54` 西 | `(13,5)、(9,6)、(18,6)、(8,7)、(10,7)、(9,8)、(20,8)、(28,10)、(5,11)、(7,11)、(4,13)、(20,13)、(5,14)、(6,14)、(4,15)、(8,16)、(19,16)、(7,17)、(22,17)、(17,18)、(18,19)、(26,20)` |
| Redirect `58` 北/南 | `(20,10)` |
| Redirect `60` 西/南 | `(6,13)` |
| Horizontal bridge `80` | `(13,2)` |
| Vertical bridge `88` | `(24,9)、(24,10)、(24,19)、(24,20)` |

由 DEX action direction map 独立逐格展开：map35 有49个路线控制节点；各 spawn 分支累计50条边记录，按 `from + direction + to` 去重后为48条唯一有向边，其中2条是共享边。3个入口能够到达43个 redirect 和全部3个出口，无越界边、循环或孤立路线节点。action 到行优先网页出生点编号应为 `{0:1,1:2,2:0}`。142个唯一路线格（不含3个 spawn）由93个 raw 32走廊格、43个 redirect、3个 exit、1个 raw 80桥格和2个 raw 88桥格组成；路径不进入 raw 36墙、水域或 raw 16铁路层。该结论证明 TDM 路线控制与地图通道一致，不单独证明网页单位锚点或每帧移动贴合。

## 地形、道路和碰撞基线

map35 使用 `Dakota` pack，而不是 Oregon 或 Mississippi 的 atlas 命名。原版创建顺序是背景/街道层转换、按邻格塑形、变体抽取，之后 Dakota 将其绘制成 `tiles_*` 图集；raw marker、中间 background 值和最终 walkability 不是同一层数据。网页固定随机种子只为确定性，不声称复现 Android 每次启动的随机贴图序列。

- 32×24 地图必须有 768 条背景绘制指令；道路/铁路/桥梁覆盖根据该 TDM 建立，不能继承 map34 的格数组。
- raw `80@(13,2)` 生成 1.5×1 格的横桥；raw `88` 生成 1×1.5 格的竖桥图块。图像覆盖范围不是玩家碰撞框或可走矩形。
- 敌方路径使用 raw 32走廊和指定桥层。静态边界与玩家移动范围必须基于最终背景码、道路覆盖及 APK 碰撞框单独核对；raw 36是墙相关输入，不能未经最终形塑就直接当作背景码。
- 玩家碰撞框、建筑、静态装饰、sleeping/active 单位、火车与桥面各自采用 APK 对应对象/地形检查。共享对象框和 X/Y 移动边界语义见[玩家碰撞审计](player-collision-audit.md)。

### Dakota 图层资源

`Dakota.drawBackgroundLayer()` 使用 `tiles_desert`、`tiles_canyon`、`tiles_canyon_floor`、`tiles_canyon_wall_var`、`tiles_shadow`、`tiles_waterside` 和 `tiles_water` 等共享图集；道路层含 `tiles_path`、`tiles_bridge_hori`、`tiles_bridge_verti`，列车轨道另有铁路 atlas。验证时需比较每格贴图、图集 source rectangle、位置与层序，并检查全部素材确实随页面离线加载。

## 初始单位、建筑、铁路和静态对象

`GameObjectManager.createGameObjectsFromBasicMap()` 从 TDM markers 创建新局实体。对象码不可只按贴图或数值推断；特别是经过 switch 的 activity 状态需要 Smali 对照。

| Marker | 数量/位置 | APK 对象与网页约束 |
| --- | --- | --- |
| `69` | 6：`(9,1)、(25,1)、(23,4)、(29,13)、(23,14)、(29,22)` | rocks A；普通静态装饰碰撞。 |
| `70` | 2：`(21,1)、(26,12)` | rocks B；使用独立大碰撞框。 |
| `71` | 5：`(17,0)、(30,0)、(2,7)、(2,19)、(30,20)` | tree；按静态对象碰撞规则阻挡。 |
| `72` | 1：`(12,13)` | stake 装饰。 |
| `75` | 1：`(8,22)` | watertower。 |
| `76` | 9：`(8,4)、(31,5)、(0,6)、(22,7)、(17,11)、(30,11)、(2,17)、(5,19)、(20,23)` | bush。 |
| `86/87` | `86@(1,21)、87@(20,21)` | 铁路缓冲器左右贴图，按 APK 静态对象类别处理。 |
| `117` | 4：`(9,12)、(15,12)、(14,14)、(12,15)` | 小 tipi 静态装饰。 |
| `126` | `(1,1)` | 水边岩石装饰及对应碰撞对象。 |
| `112/114` | Saloon `(29,3)`；Tipi `(12,10)` | 来源建筑 type 1/3；无 Fort、Casino 或 Gambler marker。 |
| `96–101` | Gunslinger 14、Mexican 11、Cannon 8、Indian 6、Sniper 1、Grandpa 6 | 合计46个 marker；Sniper 与 Grandpa 按全局解锁条件创建 activity 4 睡眠/招募单位，睡眠状态不能移除碰撞。 |
| `104–109` | 无 | map35 TDM 不包含 activity 5 初始单位 marker；此前“raw 109 在 (13,1) 创建活动 Grandpa”的条目是转录错误，`(13,1)` 实际为 raw 32。 |
| `130/131` | Pyromaniac `(13,23)`；Salesman `(27,6)` | activity 4 的特殊招募单位；按各自解锁状态决定睡眠单位是否可招募，不为地图访问额外解锁。 |
| `82–84` | 12个 raw 82轨道格 `(2–9,21)、(16–19,21)`；机车 `(10,21)、(11,21)`；车厢 `(12–15,21)` | 一列原版横向移动列车：2台引擎、4节车厢；不是静态贴图。 |
| `80/88` | 横桥1格；竖桥4格 | 地形覆盖层，不创建普通装饰碰撞框。 |

地图没有 marker `102/110`，不生成 Dynamite；没有 marker `132/150`，不生成 Gambler/Casino。解锁系统也不能因为地图有相近资源或单位池槽就伪造这些实体。

## 初始规则与单位池

GameDesignData index 31 的12项为 `[250,25,999,25000,3,30000,5,15,56,75,98,119000]`，读取规则是 global level − 1：

| 字段 | 值 | 用途/结论 |
| --- | ---: | --- |
| 初始现金 | 250 | $250。 |
| 初始生命 | 25 | 25。 |
| maxChests / chestTime | 999 / 25,000 ms | 奖励箱额度与生成计时。 |
| maxUpgrades | 3 | 最大升级等级。 |
| awesomeMessageMin / Unit | 30,000 / 5 | 原始字段值；字段语义按既有消费者验证，不从字段名猜测。 |
| 同时奖励箱 | 15 | playfield 上限。 |
| Easy/Medium/Hard HP | 56% / 75% / 98% | 敌人生命倍率。 |
| gamblerTime | 119,000 ms | 原始关卡配置；本地图没有 Gambler marker，不因此创建 Gambler。 |

`SpawnPoolManager.addActionForSpawnPool(wave, action, values...)` 的 Wave 1 调用为：

- `(1,1,0,0,0,0)`：重置 Gunslinger、Mexican、Cannon、Indian 待发池。
- `(1,3,3,3,0,3)`：SET_MAX 为 `[3,3,0,3]`。

单位池类型对应 Gunslinger、Mexican、Cannon、Indian；地图只含 Saloon type 1 和 Tipi type 3。因而 Gunslinger/Mexican 从 Saloon 派发，Indian 从 Tipi 派发，Cannon 上限为 0。网页公共池间隔可能沿用 15 秒，但 APK 本关级刷新周期尚未在本审计中确认；不可标作原版参数。

## 八波与十三条敌人请求

`GameDesignWaves.setWaves()` 的 `i == 32` 条件分支明确对应全局第32关：8个 `newWave` 和13个 `addToWave`。第9个请求槽是 Boss，网页请求索引为8；Doc 槽索引9补零。请求向量是类型请求权重，不保证固定生成顺序。

| Wave | key / 头像 | delay / HP / speed | action、interval、8个普通槽；特殊槽 |
| ---: | --- | --- | --- |
| 1 | `T_CAMPAIGN_32_01` / Indian | 15,000 / 120% / 120% | `1 @ 2,000`: `[3,3,4,5,3,3,0,0]` |
| 2 | `_02` / Gunslinger | 15,000 / 135% / 125% | `1 @ 2,500`: `[2,2,3,4,3,3,1,0]` |
| 3 | `_03` / Mexican | 15,000 / 145% / 130% | `1 @ 2,500`: `[1,2,4,4,3,3,2,1]` |
| 4 | `_04` / Pedro | 25,000 / 160% / 135% | `0 @ 2,500`: `[1,2,4,4,3,3,2,1]` |
| 5 | `_05` / Calamity | 25,000 / 160% / 135% | `0 @ 2,500` 与 `1 @ 2,500`：均为 `[1,2,4,4,3,3,2,1]` |
| 6 | `_06` / Geezer | 25,000 / 175% / 140% | `0 @ 6,000`: `[0,0,0,0,0,1,2,4]`；`1 @ 2,500`: `[1,2,4,4,3,3,2,1]`；`2 @ 3,500`: `[1,2,4,4,3,2,1,0]` |
| 7 | `_07` / Gunslinger | 25,000 / 200% / 150% | `0 @ 6,000`: `[0,0,0,0,0,0,1,4]`；`1 @ 2,500`: `[0,1,2,4,2,4,2,1]`；`2 @ 2,500`: 同向量 |
| 8 | `_08` / Boss | 15,000 / 200% / 160% | `0 @ 500`: 普通槽全 0；Boss 槽为 1，Doc 为 0 |

Wave 8 的 500 ms 来自 DEX 静态常量 `LokSteam.MAX_CLOUD_SPAWN_INTERVAL = 0x1f4`，不是根据地图或前一波推测。所有 wave delay、interval 和计数来自目标条件分支；新摘要曾把13次请求少记为12次，已经由 REA 分支与独立 `waves.json` 复核纠正，详见[经验记录](experience-log.md#新关卡波次统计必须核对目标分支)。

## 名称、对白与音乐

标题资源是 `T_LEVEL_NAME_35`，英文 “Six Grandfathers”；简介资源 `T_LEVEL_INFO_35` 英文原文为 “The famous rock formations of the Six Grandfathers attract many travelers every year.”

| Wave | speaker / drawable | APK 英文原文 |
| ---: | --- | --- |
| 1 | Indian / `portrait_indian` | Our ancestors called this mountain Six Grandfathers. From a distance, its shape looks like a collection of giant heads! |
| 2 | Gunslinger / `portrait_gunslinger` | You're right, the mountain is staring at me! |
| 3 | Mexican / `portrait_mexican` | With enough dynamite, I could sculpt this rock so that it shows our own faces! |
| 4 | Pedro / `portrait_pedro` | Nobody wants to see your face! |
| 5 | Calamity / `oregon_dakota_portrait_calamity` | Men and their vanity! You better save up your dynamite for those settlers! |
| 6 | Geezer / `oregon_dakota_portrait_geezer` | I see dark shadows in the north! Gotta be a cloudburst! |
| 7 | Gunslinger / `portrait_gunslinger` | Pa, I told you thousand times: take your glasses along when you're hunting settlers! |
| 8 | Boss / `oregon_dakota_portrait_boss` | Hahaha! Seedy bunch of bandits! You can't harm me when I have this bullet- and dynamite-proof vest! |

`Dakota.setBackgroundLoop(false)` selects `music_atmo_snow`; `getNextLoop()` indexes `battleLoops[wave % 3]`. Existing Dakota mappings identify the loops as `music_dakota`, `music_loop2` and `music_loop3`. M33 must reuse/verify those offline resources; default verification remains muted.

## 网页现状与边界

已有目录列出 global level 32 “Six Grandfathers”，但它没有正式内容 builder 或正式阶段注册，也没有 map35 的网页场景、路线、单位、波次、专属回放快照及 E2E 覆盖。实现后应沿用公开 M32 的存档语义和 Dakota 渲染，不改公共 API、全局碰撞规则或历史关卡内容。

本审计未通过 Android 运行原版，也未手动通关；APK 静态证据足以确定本关数据与调用顺序。网页的固定随机贴图、碰撞短会话和浏览器视觉表现需在对应切片独立验收。
