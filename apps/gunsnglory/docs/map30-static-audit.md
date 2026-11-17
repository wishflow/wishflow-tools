# Oregon 第 10 关：Lumber Mill Hills 静态审计

## 关卡身份与来源

Lumber Mill Hills 是 Oregon 第 10 关、全局第 30 关，对应 APK `res/raw/td_map_33.tdm`。工作树将该 770 字节 TDM 保存为 [`td_map_33.tdm`](../tests/fixtures/td_map_33.tdm)，地图、路线和标记逐格验证见 [`oregon-10-map.test.ts`](../tests/oregon-10-map.test.ts) 与 [`oregon-10-route-graph.json`](../tests/fixtures/oregon-10-route-graph.json)。

以下逻辑来自用户提供的 Guns’n’Glory Android 1.8.6 APK 静态分析。Smali 不是原始 Java 源码；涉及控制流的结论按 APK 条件分支、字段写入和最终消费者交叉确认。当前审计范围为初始规则、敌方波次和玩家单位生成池；对白、正式登记及回放快照留在 M31-C3。

## 初始规则参数

`GameDesignData.<clinit>` 将该关参数写在 `gameDesignData[29]`。`GunsAndGloryThread.onLoadGame()` 与 `SpawnPoolManager.initNewSpawnPool()` 使用 `LevelPack.getLevel(...) - 1` 读取行；`GameDesignWaves.setWaves()` 的分支条件为 level `30`，因此这里的数组行与关卡编号对应关系已闭环。

| 字段（APK） | 原始值 | 网页映射 | 证据边界 |
| --- | ---: | --- | --- |
| `LEVEL_DATA_CASH` | 400 | 初始现金 `$400` | 开局直接写入 `GunsAndGloryThread.cash` |
| `LEVEL_DATA_LIVES` | 25 | 初始/最大生命 25 | APK 同值写入 `lives` 与 `maxLives` |
| `LEVEL_DATA_MAX_CHESTS` | 999 | 可生成奖励箱总数 999 | `SpawnPoolManager.remainingChestsToSpawn` |
| `LEVEL_DATA_CHEST_TIME` | 25,000 ms | 奖励箱生成间隔 | `chestSpawnTimerMax` |
| `LEVEL_DATA_MAX_UPGRADES` | 3 | 最大升级等级 3 | 写入 `maxUpgrades` |
| `LEVEL_DATA_AWESOME_MESSAGE_MIN` | 30,000 | 当前不单独映射 | 记录字段值；网页没有确认等价的独立消费者，不猜它的显示时序语义 |
| `LEVEL_DATA_AWESOME_MESSAGE_UNIT` | 5 | 特殊击杀反馈阈值 5 | 写入 `triggerMessageMinEnemy`；网页复用对应的阈值契约 |
| `LEVEL_DATA_MAX_CHESTS_PLAYFIELD` | 15 | 同时存在奖励箱上限 15 | `SpawnPoolManager.update()` 以场上箱数量比较该字段 |
| Easy / Medium / Hard HP | 86% / 115% / 175% | 难度 HP 倍率 | `EnemyDirector.setEnemyHPMultiplier()` 读取按难度索引的同一行 |
| `LEVEL_DATA_GAMBLER_TIME` | 119,000 ms | 不实例化 Gambler | 字段消费者是 Gambler 冷却；map33 无 Gambler/Casino marker，不据此创建对象 |

奖励箱类型数为 4：APK 的 `SpawnPoolManager.update()` 在第 41 关之前从 4 种奖励类型取随机值，再加 1 形成类型 1–4。该数量不是 `gameDesignData[29]` 的字段。

## 敌方波次

`GameDesignWaves.setWaves(..., level=30)` 按源码调用顺序创建10波。`newWave` 参数中的延迟和倍率为十进制毫秒/百分比。每条 `addToWave` 保留 action ID、生成间隔和完整10槽网页向量；网页向量前8槽对应该重载直接提供的普通请求，Boss 放在 `requests[8]`，Doc 放在 `requests[9]`。重载补零规则及敌人类型映射见[经验记录：Boss 与 Doc 请求槽位](experience-log.md#boss-与-doc-请求槽位必须追到最终敌人类型)。

| 波次 | 开始延迟 | HP / 速度 | `action ID @ 间隔` 与完整十槽请求 |
| ---: | ---: | ---: | --- |
| 1 | 15,000 | 130% / 120% | `2 @ 2,000`: `[2,2,2,3,2,3,0,0,0,0]` |
| 2 | 15,000 | 135% / 125% | `2 @ 2,000`: `[2,2,2,3,2,3,1,0,0,0]` |
| 3 | 15,000 | 130% / 125% | `2 @ 2,500`: `[3,3,2,3,2,3,1,0,0,0]`; `3 @ 3,000`: `[3,3,1,1,3,2,1,0,0,0]` |
| 4 | 15,000 | 150% / 130% | `2 @ 2,500`: `[1,2,2,3,2,2,1,0,0,0]`; `3 @ 2,500`: `[1,2,1,1,3,2,1,0,0,0]` |
| 5 | 25,000 | 160% / 135% | `1 @ 2,500`: `[1,2,2,3,2,3,2,0,0,0]` |
| 6 | 15,000 | 160% / 135% | `0 @ 2,500`: `[1,2,3,3,2,2,2,0,0,0]`; `1 @ 2,500`: `[1,2,2,3,2,2,2,0,0,0]` |
| 7 | 15,000 | 180% / 150% | `0 @ 2,500`: `[1,2,3,3,3,2,1,1,0,0]`; `1 @ 2,500`: `[1,2,2,3,3,2,1,1,0,0]` |
| 8 | 25,000 | 180% / 150% | `0 @ 2,500`: `[1,2,3,3,3,3,2,1,0,0]`; `1 @ 2,500`: `[1,2,2,3,3,3,2,1,0,0]`; `2 @ 2,500`: `[1,2,2,3,3,3,2,1,0,0]` |
| 9 | 15,000 | 170% / 155% | `0 @ 2,500`: `[0,1,1,2,4,4,3,1,0,0]`; `1 @ 2,500`: `[0,0,1,2,4,4,2,1,0,0]`; `2 @ 2,500`: `[0,1,1,2,4,4,3,1,0,0]`; `3 @ 2,500`: `[0,0,1,2,4,4,2,1,0,0]` |
| 10 | 30,000 | 150% / 120% | `1 @ 500`: `[0,0,0,0,0,0,0,0,1,0]`; `2 @ 5,000`: `[0,0,0,0,0,0,0,0,1,0]` |

该分支共10个 `newWave`、20个 `addToWave` 请求调用，另有2个玩家池动作调用。波次向量是各敌型待生成计数，不是固定出敌顺序；action ID 是原始 TDM 敌方入口编号，网页 `spawnPointId` 按 map33 的真实出生 marker 映射，不能用数组下标或向量顺序代替路线身份。

## 玩家单位池和建筑出生点

`GameObjectManager.createGameObjectsFromBasicMap()` 将 map33 的 marker 112、113、114 分别创建为 `GameObjectSpawnLocation` 类型 1、2、3。`GameObjectSpawnLocation` 常量及 `R$drawable` 资源表确认三者对应 Saloon、Fort、Tipi。`SpawnPoolManager.update()` 将单位池 type 1/2 分配到 Saloon、type 3 分配到 Fort、type 4 分配到 Tipi；`GameObjectUnit.hire()` 把已招募地图单位计入对应 pool slot。四类单位池与三处建筑不是同一计数。

| TDM marker | 建筑类型 | 坐标 `(x,y)` | APK spawn-location type | 接受的单位池类型 |
| ---: | --- | --- | ---: | --- |
| 112 | Saloon | `(23,10)` | 1 | 1 Gunslinger、2 Mexican |
| 113 | Fort | `(3,10)` | 2 | 3 Cannon |
| 114 | Tipi | `(13,1)` | 3 | 4 Indian |

map33 的 hires marker 96–99 各有一个，分别提供上述四种单位。`GameDesignWaves.setWaves(level=30)` 在 Wave 1 添加两项玩家池动作：`(action=SET, wave=1, slots 1–4 = 0)` 清空四类待生成数量；`(action=SET_MAX, wave=1, slots 1–4 = 6)` 设置每种类型最多发出6名。`SpawnPoolManager` 的构造默认全局发兵间隔为15,000ms；`GameObjectSpawnLocation.MAX_RESPAWN_COUNTER` 为1,500ms。间隔是管理器默认，不是波次或关卡参数。单位池动作不会凭空创建初始单位；只有已招募单位进入对应 pending pool。

## 网页实现边界

| 已证实 | 网页应实现 | 未证实或不应外推 |
| --- | --- | --- |
| 10波、20个源请求调用、全部波次参数与完整请求槽 | `campaignWaves` 保留源顺序、入口 ID、间隔、十槽计数；末波两个 Boss 请求使用已核实的槽位 | 不从向量推断敌人随机出场顺序；无请求的 Doc 不新增 |
| 初始现金/生命、难度、最大升级、奖励箱数量/时限/场上上限 | M31 rules 文件及短 GameSession 开局摘要 | `awesomeMessageMin` 未映射为独立行为；不套用相邻关卡现金/波次 |
| Wave 1 清空四类玩家 pool 并将每类 lifetime maximum 置为6 | `campaignUnitPool` 使用 slot 1–4 与三处 map33 建筑位置；测试真实雇佣后的代表性发兵位置 | 不把四个 pool slot 写成四栋建筑；不把池模板当作地图初始单位 |
| Gambler 冷却字段为119,000ms，但 TDM 无 Gambler/Casino marker | 不创建 Gambler/Casino | 非零字段值不能证明该关实际使用了该功能 |

## 后续验证入口

M31-C2-B 将通过 [`oregon-10-campaign-rules.test.ts`](../tests/oregon-10-campaign-rules.test.ts) 比较本审计的独立期望，并用真实 `GameSession` 做短程初态、普通敌人、玩家池出兵和末波 Boss 检查；不完整推进十波、不要求 Android 运行观察。
