# Oregon 第 4 关：Fort Echo 静态审计

## 结论与范围

Fort Echo 是全局第 24 关，对应 APK `res/raw/td_map_27.tdm`。地图为 32×24 格，包含 5 个敌人入口、59 个路线控制点、65 条控制点间有向边和 1 个共同出口；另有 5 条入口到首个控制点的初始直线段；按 APK 方向选择表枚举分支后，所有入口都能到达出口，未发现环路、死路或越界。关卡有 10 波、22 条敌人生成请求；第 1 波清空玩家单位池库存，并将 Cannon 池上限设为 4。Fort 是 TDM 中真实存在的单位生成点，不需要在地图上伪造 Cannon。

本报告覆盖原始地图、静态路线、对象与单位 marker、关卡参数、波次、英文文本、资源与现有网页差异。证据来自 APK 原始资源、REA/JADX 反编译和 APKTool Smali；反编译文本不是原始源码。路径枚举是根据 APK 方向表生成的静态推导，未运行 APK，也不代表 Android 设备截图或战役实测。

| 状态 | 结果 |
| --- | --- |
| 已证实 | APK 身份、TDM 字节、关卡参数数组、波次调用、资源字符串、路线 marker 解码与对象 marker 分派均有静态来源。 |
| 静态推导 | 5 个入口的 59/59 路线控制点均可达；65 条分支边最终都通往 `(0,12)`，没有环路、死路或越界。 |
| 网页差异 | level 24 / map 27 已在目录中，但网页尚无 `td_map_27.tdm`、地图 JSON 和关卡内容模块；地图缩略图已存在。 |
| 未知项 | `awesomeMessageMin=30,000` 的具体消费含义未闭环；原版单位池 timer 的最终赋值值未从本次检查的方法中定位；地图随机渲染最终像素与真实运行时种子未观察。 |

## 来源与证据索引

每个长 Evidence ID 只在本表记录一次；正文使用短键。APK 源文件是当前提供的 1.8.6 包。REA 的 Java 结果是 JADX 伪代码；方向 marker 与对象 marker 的关键分支另用同包 Smali 交叉核对。

| 短键 | 来源与定位 | 支持内容与边界 |
| --- | --- | --- |
| `APK-186` | `/Users/shiwei/Downloads/gunsnglory-1-8-6.apk`；REA 包摘要 `ev_25177bf1d313f37c34730e7577d586f808374ae75cc967cbed7e147f47516081` | 包名 `com.hg.gunsandgloryfree`，版本 1.8.6 / code 34；APK SHA-256 `49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56`。 |
| `TDM-27` | `res/raw/td_map_27.tdm`，直接读取 APK ZIP 项 | 770 字节；首两字节为宽 32、高 24，随后 768 个 y-major tile byte；TDM SHA-256 `a0cf3d00f3991a4deef4b00afd74aa5beb75601fb81dc1fbf7c742f897aff5dd`。 |
| `LEVEL-DATA-24` | `GameDesignData.<clinit>`，DEX/Smali；REA `ev_233a77c32a8cf134e53d18db00a39f102b9c11a94ce750945fd5e181a63765bb` | index 23（全局 level 24）的 12 个原始整数字段。语义按游戏中已有读取点映射，未由字段名单独推断。 |
| `WAVES-24` | `GameDesignWaves.setWaves`，`i == 24` 分支；REA `ev_adf803fa2e9a7ddaa81efda4d341184b455d5cfb05a343ff84a32feb0af997c2` | 10 次 `newWave`、22 次 `addToWave` 与 2 条单位池 action 的完整调用顺序；JADX 输出不是原始 Java 源码。 |
| `ROUTE-MARKERS` | `EnemyDirector.createEnemyDirectorFieldsFromBasicMap`；REA `ev_dfe6e4e6f781bd2235464e46135486e902609c9261bc6e79921c5b86bee0ebe6` | 40–46 为入口 action，48 为出口，52–65 为方向 action；本图只用到 40–44、48、52–60。 |
| `ROUTE-DIRECTIONS` | `EnemyDirectorField.<clinit>`；REA `ev_387bcf63f6f9fb03326745d606ee7e52c5603f4999632d63ae0bba906cdf7f7d` | 方向 action 到方向集合的表。 Fort Echo 使用 action 0–8。 |
| `ROUTE-MOVEMENT` | `EnemyDirector.moveEnemys`；REA `ev_18348389bb85e290a383d26ef910c2f026159822d722a2a1db6bc058ee883715` | 敌人到达场格中心时消费路径控制点；分支方向选择发生在控制点。这里仅用来构建静态图，不是运行观察。 |
| `ROUTE-SPAWN` | `EnemyDirector.setSpawningDirection`；REA `ev_083e0edf7086b03f514d1bac851e5d2b6a84cd88b455c10f9433de93339c3ce5` | 地图边缘入口按所在边设置朝内初始方向。 |
| `MAP-OBJECTS` | `GameObjectManager.createGameObjectsFromBasicMap`；REA `ev_9b2ddfb20a76c438e7fe4c56e2df2e9da649e1c8a3a15ddec958c7cf13f19ad0` | tile 到装饰、生成点和新局单位的分派。JADX 对部分 switch 的呈现有歧义，关键数值区间已与该方法的 APKTool Smali switch 表核对。 |
| `POOL-ACTIONS` | `SpawnPoolManager.addActionForSpawnPool` / `performActionsForWave`；REA `ev_2ae1371fec35c5e8cf128f135146ed5ba86685a61ba16611efbf73bebaec25fd`、`ev_632de2946543cf19d74f403d48bbda4145350f83224570ee7a6ee46437c03188` | action 值写入与 wave action 语义：1=set、3=set max；值槽对应 pool type 1–4。 |
| `POOL-UNIT` | `SpawnPoolManager.update`、`initNewSpawnPool`、`addUnitToSpawnPool`；REA `ev_61b25a3df1ea7318de956cb926480a4f0b806d515f2de6cd8cdce048d450c2b7`、`ev_79d40904d3b86b50f31dd68ea967e77bad98f0cdbcebe7a487a603e4b47409d6`、`ev_be9d16d67559c19c7e69ecf2a2dbcbb436ac18e16b2ca6e30b7a1fc5aba92c0f` | 37 个 pool type 的库存、上限、选取和生成位置关系；初始化方法给 timer 使用 `spawnPoolTimerMax`，未在该方法内赋出关卡 timer 数值。 |
| `UNIT-HIRE` | `GameObjectUnit.hire` / `canSpawn`；REA `ev_860dff5d48ef079581798e878c47c411f55feb859255195eb7312aea16c80ff8`、`ev_4f8e1fca023af190722cdfe8c170d419d395f7ef2f54ed893d2a9d98cf89042e` | 雇佣扣款、激活单位并在允许生成时向单位池加库存；不表示所有雇佣单位都必须经 Fort 生成。 |
| `OREGON-RENDER` | `Oregon.drawBackgroundLayer` / `loadIngameImagesPack`；REA `ev_137857adc7e00b6e628d0c83f8033dcbd78bdf4ee312f693bcd8468b756ce5d4`、`ev_d006997c6893e3f8e344ac4b99c89fa0f17dac56a93450a3bb8511ab817ab6ff` | Oregon 地形 atlas 选择、资源 alias 和背景/街道绘制规则；只能支持绘制映射及候选帧，不能推出随机种子下的屏幕像素。 |
| `OREGON-MUSIC` | `Oregon.getNextLoop`、`setBackgroundLoop`、`<clinit>`；REA `ev_2821521565c9df665dd997dc71c014dfbe32825071495055ba682165dc6f16ab`、`ev_eb2074bd367c9cefbf1fd2859a1244ffdde8c05378d3dd4b4caacb66cb9ac7a5`、`ev_08b0baf699c5fd997a3e9ae5e0908d804c39cdb452cb5ff652ae481cfe0960ae` | Oregon 环境音与三条战斗 loop 的轮换关系；报告不播放音频，也不验证音量或实际混音。 |
| `STRINGS-27` | REA `decode_android_resources`；Evidence `ev_52e0d9edcaa5f1db93f82716b33ca87cc017673fce5ea13a439433afe6995203` | `T_LEVEL_NAME_27`、`T_LEVEL_INFO_27`、`T_CAMPAIGN_24_01..10` 默认英文资源值。 |

## 原始地图与路线

地图为 32×24 个逻辑格，每格 32×32 像素，世界尺寸 1024×768。tile 频次如下，合计 768 格：

`0:359, 16:21, 32:126, 36:85, 40:1, 41:1, 42:1, 43:1, 44:1, 48:1, 52:12, 53:13, 54:26, 55:2, 56:2, 58:1, 60:3, 72:1, 79:10, 80:4, 88:31, 96:14, 98:3, 99:7, 100:1, 101:8, 104:2, 107:1, 113:1, 115:6, 117:2, 118:3, 119:6, 124:6, 125:4, 130:1, 131:1`。

入口 marker 40–44 的 action ID 是 tile code 减 40；方向 marker 的 action ID 是 tile code 减 52。这是两套不同编码。Fort Echo 入口都位于东边界，初始朝西。入口和出口：

| marker | 坐标 | 初始方向或含义 |
| --- | --- | --- |
| 40 / action 0 | `(31,4)` | 向西；首个控制点 `(27,4)` |
| 41 / action 1 | `(31,8)` | 向西；首个控制点 `(25,8)` |
| 42 / action 2 | `(31,12)` | 向西；首个控制点 `(25,12)` |
| 43 / action 3 | `(31,16)` | 向西；首个控制点 `(25,16)` |
| 44 / action 4 | `(31,20)` | 向西；首个控制点 `(27,20)` |
| 48 | `(0,12)` | 全图唯一出口 |

方向 action 编码为 0=N、1=S、2=W、3=E、4=N/W、5=N/E、6=N/S、7=W/E、8=W/S。地图中出现 52(N)×12、53(S)×13、54(W)×26、55(E)×2、56(N/W)×2、58(N/S)×1、60(W/S)×3，共 59 个控制点。每个分支处敌人可在该节点所列方向中选择；静态图通过枚举所有可选方向建立，不给路径加入额外寻路或碰撞。

下面列出全部路线边。每行格式为 `tile@(x,y): direction=下一控制点或 EXIT`。单方向节点也列出，便于直接对照 TDM。路径计算按 APK 的入口朝向、方向 action 与直线移动规则连接下一个控制点；已检查全图而非只走一条演示路线。

```text
53@(21,2): S=(21,4)       54@(24,2): W=(21,2)
53@(2,3): S=(2,6)         54@(9,3): W=(2,3)          54@(10,3): W=(9,3)
53@(19,4): S=(19,6)       54@(21,4): W=(19,4)        52@(24,4): N=(24,2)
60@(27,4): W=(24,4), S=(27,7)
55@(2,6): E=(4,6)          53@(4,6): S=(4,12)          53@(14,6): S=(14,8)
54@(19,6): W=(14,6)
53@(23,7): S=(23,9)        54@(27,7): W=(23,7)
52@(10,8): N=(10,3)        54@(14,8): W=(10,8)        53@(24,8): S=(24,9)
60@(25,8): W=(24,8), S=(25,10)
52@(9,9): N=(9,3)          54@(14,9): W=(9,9)          52@(19,9): N=(19,6)
54@(23,9): W=(19,9)        54@(24,9): W=(23,9)
53@(19,10): S=(19,12)      60@(20,10): W=(19,10), S=(20,12)
54@(25,10): W=(20,10)
54@(4,12): W=EXIT          54@(6,12): W=(4,12)         52@(14,12): N=(14,9)
54@(19,12): W=(14,12)      54@(20,12): W=(19,12)
58@(25,12): N=(25,10), S=(25,14)
53@(14,13): S=(14,15)      54@(19,13): W=(14,13)      54@(20,13): W=(19,13)
52@(19,14): N=(19,13)      56@(20,14): N=(20,13), W=(19,14)
54@(25,14): W=(20,14)
53@(12,15): S=(12,17)      54@(14,15): W=(12,15)      53@(19,15): S=(19,18)
54@(24,15): W=(19,15)      54@(25,15): W=(24,15)
55@(3,16): E=(6,16)        52@(6,16): N=(6,12)         52@(25,16): N=(25,15)
53@(9,17): S=(9,20)        54@(12,17): W=(9,17)        52@(24,17): N=(24,15)
54@(27,17): W=(24,17)
52@(12,18): N=(12,17)       54@(19,18): W=(12,18)
52@(3,20): N=(3,16)        54@(9,20): W=(3,20)         53@(22,20): S=(22,21)
56@(27,20): N=(27,17), W=(22,20)
52@(19,21): N=(19,18)      54@(22,21): W=(19,21)
```

按入口分别枚举：`40` 可达 20 个控制点、2 条出口路径；`41` 可达 23 个控制点、3 条路径；`42` 可达 29 个控制点、4 条路径；`43` 可达 14 个控制点、1 条路径；`44` 可达 18 个控制点、2 条路径。入口可达点集合合并为 59 个控制点；控制点到下一个控制点/出口共有 65 条有向边，另有 5 条入口到首控制点边；所有选择都抵达 `(0,12)`。这是一项可复算的图遍历结果，不是 Android 实测。

地形和道路输入要与敌人路线分开验证：code 80 有 4 格、code 88 有 31 格，Oregon 的街道层转换分别写为 tile 64 与 76；背景/街道绘制会再根据邻接关系选候选 atlas 帧。code 124×6 与 125×4 构成地图底部的水域输入。实现时应从原版 TDM 走现有 Oregon 绘制规则，验证各层绘制命令、格坐标、碰撞码与裁切；不能把道路层或背景候选帧伪装成路线，也不能仅凭 tile 名字臆断桥的完整外观。

## 地图对象与玩家单位

坐标均为原始 TDM `(x,y)`。对象分派由 `GameObjectManager.createGameObjectsFromBasicMap` 的 DEX/Smali 核对；活动单位 marker、新局招募 marker、装饰和 Fort 生成点应作为不同实体处理。

| tile | 数量 | 静态语义 | 坐标 |
| ---: | ---: | --- | --- |
| 72 | 1 | 装饰 ID 5，`b_1x1_stake` | `(17,3)` |
| 79 | 10 | 树 `e_1x1_tree_green_a` | `(14,0)、(31,1)、(3,4)、(11,4)、(8,8)、(1,9)、(30,13)、(27,22)、(10,23)、(17,23)` |
| 115 | 6 | 树 `e_1x1_tree_green_b` | `(1,0)、(7,5)、(21,6)、(27,9)、(21,17)、(1,22)` |
| 117 | 2 | 小帐篷 `b_1x1_tipi_small` | `(16,1)、(14,2)` |
| 118 | 3 | 树桩 `e_1x1_tree_stump` | `(26,5)、(17,15)、(1,17)` |
| 119 | 6 | 树 `e_1x1_tree_green_c` | `(9,0)、(0,3)、(17,9)、(31,17)、(23,21)、(5,22)` |
| 113 | 1 | `GameObjectSpawnLocation` type 2，Fort 贴图 `b_3x2_fort` | `(10,12)` |
| 96 | 14 | type 1 Gunslinger，activity 4，新局可雇佣 | `(29,1)、(13,3)、(30,5)、(2,8)、(16,8)、(11,10)、(27,13)、(0,14)、(10,15)、(22,17)、(30,18)、(17,20)、(25,21)、(2,22)` |
| 98 | 3 | type 3 Cannon，activity 4，新局可雇佣 | `(6,9)、(13,12)、(7,14)` |
| 99 | 7 | type 4 Indian，activity 4，新局可雇佣 | `(12,1)、(18,1)、(16,3)、(0,5)、(24,11)、(7,22)、(29,22)` |
| 100 | 1 | type 5 Sniper，activity 4，里程碑解锁门控 | `(17,14)` |
| 101 | 8 | type 6 Grandpa，activity 4，里程碑解锁门控 | `(27,1)、(13,5)、(20,5)、(7,6)、(18,10)、(30,10)、(1,19)、(11,20)` |
| 104 | 2 | type 1 Gunslinger，activity 5，开局已激活 | `(23,3)、(21,12)` |
| 107 | 1 | type 4 Indian，activity 5，开局已激活 | `(15,9)` |
| 130 | 1 | type 35 Pyromaniac，activity 4，里程碑解锁门控 | `(21,23)` |
| 131 | 1 | type 36 Salesman，activity 4，里程碑解锁门控 | `(4,1)` |

地图有 3 个 sleeping Cannon marker，它们是可雇佣单位；此外 Fort 是独立 pool spawn location。第 1 波将 pool type 3 (Cannon) 的上限设为 4，故 Cannon 也可按该池机制从 `(10,12)` Fort 生成。Fort marker 的 spawn type 为 2，pool entry 应使用 `poolType=3`、`unitType=cannon`、`spawnLocationType=2`。网页现有 `CampaignUnitPoolDefinition.units[].template` 已支持只供单位池生成的独立模板；应将 Cannon 模板挂在真实 Fort 位置，不要在地图再插入一个假 Cannon，也不要把三个 sleeping Cannon 误认为自动生成物。

应用已有 `createActiveFortKaboomUnit('cannon', cell, ...)` 生成模板模式及 `template` 字段；M25 不需要新增公共契约。`GameObjectUnit.hire()` 只有在单位类型 `canSpawn()` 且池管理器存在时才往池中加库存。用户已批准如确有必要可做最小契约扩展，但当前代码已具备独立模板能力，优先复用现有接口。

地图没有 Mexican、Gambler、Gold Transport hire marker，也没有 Tipi/Saloon pool spawn marker。不要因其他 Oregon 关出现这些实体就加入 Fort Echo。四类受全局解锁状态影响的新局单位是 Sniper、Grandpa、Pyromaniac、Salesman；内容版本/replay snapshot 应沿用前几关的四位全局解锁编码。固定 Cannon pool 内容不属于这四位档案快照。

## 关卡参数与波次

`GameDesignData` index 23 对应全局第 24 关。APK 的原始十进制字段顺序为 `[250,25,999,25000,3,30000,5,15,86,115,140,119000]`；按现有读取点解释如下：

| 字段 | 数值 | 备注 |
| --- | ---: | --- |
| 初始现金 / 生命 | 250 / 25 | 新战役或 Free Play 初态 |
| 最大奖励箱 / 奖励箱间隔 | 999 / 25,000 ms | 沿用既有奖励箱系统 |
| 最大升级 | 3 | 使用当前关卡升级规则 |
| `awesomeMessageMin` / `awesomeMessageUnit` | 30,000 / 5 | 前者消费语义未知，不新增行为 |
| 场上奖励箱上限 | 15 | 按共同参数字段解释 |
| Easy / Medium / Hard 敌人 HP | 86% / 115% / 140% | 继承原始百分点值 |
| Gambler 时间 | 119,000 ms | TDM 没有 Gambler marker；不创建角色 |

十条 `newWave` 和二十二条 `addToWave` 的数值按 APK 调用顺序列出。槽 1–8 沿用通用敌人请求映射：Settler×1、Settler×2、Settler×3、Settler×4、Rider、Covered Wagon、Post Coach、Gold Transport；槽 9 是 Boss。出生 action ID 是 wave 入口编号，与地图方向 action ID 无关。

| 波次 | intro 资源 / 肖像 | 对白延迟 | HP / 速度 | 入口 action / 间隔 / 槽 1–8 请求（槽 9 Boss 单列） |
| ---: | --- | ---: | --- | --- |
| 1 | `T_CAMPAIGN_24_01` / `portrait_deserter` | 15,000 ms | 150% / 120% | `0 / 2,000 / [1,1,2,3,4,1,0,0]` |
| 2 | `T_CAMPAIGN_24_02` / `portrait_settlers` | 15,000 ms | 160% / 125% | `1 / 2,000 / [1,1,2,3,4,1,0,0]` |
| 3 | `T_CAMPAIGN_24_03` / `portrait_settlers` | 15,000 ms | 170% / 130% | `0 / 2,500 / [2,1,2,3,2,1,0,0]`；`1 / 2,500 / [1,2,2,2,2,1,0,0]` |
| 4 | `T_CAMPAIGN_24_04` / `oregon_dakota_portrait_geezer` | 20,000 ms | 155% / 135% | `2 / 2,500 / [1,1,2,3,4,2,1,0]` |
| 5 | `T_CAMPAIGN_24_05` / `portrait_indian` | 15,000 ms | 180% / 140% | `2 / 2,500 / [0,0,2,3,4,2,1,0]`；`1 / 2,500 / [0,0,2,2,2,1,0,1]` |
| 6 | `T_CAMPAIGN_24_06` / `portrait_mexican` | 15,000 ms | 190% / 145% | `0 / 3,000 / [0,1,1,3,3,2,1,0]`；`1 / 3,000 / [0,0,2,2,2,2,0,1]`；`2 / 3,000 / [0,1,2,1,2,2,1,1]` |
| 7 | `T_CAMPAIGN_24_07` / `portrait_pedro` | 20,000 ms | 200% / 150% | `2 / 3,000 / [0,1,1,3,3,2,2,1]`；`3 / 3,000 / [0,1,2,2,3,3,2,0]` |
| 8 | `T_CAMPAIGN_24_08` / `oregon_dakota_portrait_geezer` | 15,000 ms | 210% / 155% | `0 / 3,500 / [0,1,1,2,3,2,1,0]`；`1 / 3,500 / [0,0,2,2,2,2,0,1]`；`2 / 3,500 / [0,1,1,2,3,2,2,1]`；`3 / 3,500 / [0,1,2,2,3,3,2,0]` |
| 9 | `T_CAMPAIGN_24_09` / `portrait_deserter` | 15,000 ms | 220% / 160% | `0 / 3,500 / [0,1,1,2,3,2,1,1]`；`1 / 3,500 / [0,0,2,2,2,2,0,1]`；`2 / 3,500 / [0,1,1,2,3,2,2,1]`；`3 / 3,500 / [0,1,2,2,3,3,2,1]`；`4 / 3,500 / [0,1,2,2,3,2,2,1]` |
| 10 | `T_CAMPAIGN_24_10` / `oregon_dakota_portrait_boss` | 25,000 ms | 200% / 150% | `0 / 500 / [0,0,0,2,0,0,0,0]`；槽 9 Boss=`1` |

Wave 1 另声明两条池 action：`(wave 1, action 1, values 0,0,0,0)` 将 pool type 1–4 当前库存设为零；`(wave 1, action 3, values 0,0,4,0)` 将 pool type 3 Cannon 上限设为 4。没有其他 pool action。网页测试应检查池初始为空、首次雇佣 Cannon 后可在 Fort 生成，并校验生成上限；不需要把 4 个炮预先放在 Fort。

## 文本、肖像与声音资源

默认英文资源值如下。中文文案属于网页新增译文，不在 APK 字符串中；新增译文由实现切片维护，英文不得替换成摘要或占位词。

| 资源键 | 英文文本 / 标题 |
| --- | --- |
| `T_LEVEL_NAME_27` | `Fort Echo` |
| `T_LEVEL_INFO_27` | `The surround sound around the high placed Fort Echo is fabulous for every traveler.` |
| `T_CAMPAIGN_24_01` | `"Sir, the cannons of Fort Echo are ready to fire! We're waiting for your orders… orders… orders…"` |
| `T_CAMPAIGN_24_02` | `"Honey, we should have taken a map with us! We' ll never find a way out of here… here… here…"` |
| `T_CAMPAIGN_24_03` | `Fiddlesticks! A map just costs gold! You should trust my instincts! I know the way… way… way…` |
| `T_CAMPAIGN_24_04` | `Hell, my back hurts from all this valley bending… bending… bending…` |
| `T_CAMPAIGN_24_05` | `Old man should drink more fire-water! Wakes up the spirits and burns down the enemy! …enemy… enemy…` |
| `T_CAMPAIGN_24_06` | `"Ay, those settlers breed like the flies on Pedro's back! …back…back…"` |
| `T_CAMPAIGN_24_07` | `"Boss, now they're trying in the south-east! …east… east…"` |
| `T_CAMPAIGN_24_08` | `"Upon my soul, they're everywhere! My legs won't play along anymore… more… more…"` |
| `T_CAMPAIGN_24_09` | `Sir, we need more guns! …guns… guns…` |
| `T_CAMPAIGN_24_10` | `Ugh! Men, women, your country needs you! Be my shield and get me through this damned valley! …valley… valley…` |

网页已有 `public/assets/menu/gng_levelmap_27.png`，尺寸 91×84，与 APK 同名缩略图一致。当前已确认存在的单位肖像包括 `portrait_indian`、`portrait_engineer`、`oregon_dakota_portrait_geezer`、`portrait_gunslinger`、`portrait_mexican`、`portrait_pedro`、`oregon_dakota_portrait_boss`、`portrait_settlers`、`portrait_deserter`。APK 还含 `oregon_dakota_portrait_dynamite.png`（96×96，8,888 字节），网页资产目录目前缺少此文件；静态搜索未找到网页消费点，`portrait_pyromaniac` 当前仅列入预加载与资源测试，暂无展示调用。因此本关不打包该图片；若以后增加真实消费者，再从 APK 精确提取，不用相似图替代。Fort Echo 十段对白使用的七种肖像均已存在并加入预加载。地图的 Oregon battle loops 和 `music_atmo_forest` 已有共享音频资产/`oregon-01-music.ts` 映射可复用；本轮未播放音频、不推断未列出的语音。

## 实现约束与后续验收

- Fort Echo 的地图、路线、实体、Fort Cannon 池、初态、10 波和双语对白已按 [实施计划](implementation-plan.md) 的 M25-B–E 接入；正式关卡 builder、Free Play/replay 版本还原由 M25-F 处理，目录入口和 E2E 由 M25-G 处理。此报告保留静态逆向事实，不再重复记录活跃进度。
- Oregon 第 3 关提供 `createMississippiMapScene`、Oregon 地形/街道 renderer、marker 单位工厂、全局四位解锁快照和 replay factory；Fort Echo 复用这些边界。`CampaignUnitPoolDefinition.units[].template` 已支持独立 pool 模板，无需重复扩展接口。
- 正式关卡 builder 需覆盖 Sniper、Grandpa、Pyromaniac、Salesman 四类可解锁开局单位；正式关卡以前一关 level 23 为前置；Free Play 不写正式进度；回放按录制版本而非当前 profile 还原单位集合。
- 已完成的定向验证覆盖 TDM 字节/矩阵、对象坐标、地形/街道层、5 个入口所有分支、59/59 控制点可达、65 条有向边、单一出口、无循环/越界、marker 单位与 16 种解锁组合、真实 Fort Cannon 出兵，以及 10 波/22 个生成池和对白资源。后续不要重复这些检查，除非代码变更引入回归。
- M25-G 的浏览器验收覆盖目录/缩略图、正式锁定与解锁、Free Play 难度、首波对白和单位解锁快照回放。按实施计划不完整推进全战役；规则只用 `GameSession` 短会话验证，不需要为本关重复启动 Android。

## 未闭环项

| 项目 | 状态 | 处理 |
| --- | --- | --- |
| `awesomeMessageMin` 消费规则 | 原始值 `30,000` 已证实，消费者语义未从本关调用或现有分析中确定 | 不新增基于此值的特殊游戏行为；若未来全局规则任务需要，再追踪实际消费者。 |
| 单位池 timer 数值 | 初始化使用 `spawnPoolTimerMax`；其关卡赋值点尚未定位 | 延续网页已发布 pool cadence，并清楚标成兼容约定；不把 15 秒宣称为 APK 本关实测值。 |
| 随机地图外观 | Oregon 资源 alias、绘制层和候选帧映射已静态检查 | 仅按规则/候选集合验证；不为随机种子造一张“原版像素截图”。需要视觉验收时用网页自身截图核对几何和层序。 |
| 实际 APK 运行行为 | 未运行 | 当前静态证据已足以实现地图、路线、单位池和波次；不需要为本关重复启动 Android 或完整通关。 |
