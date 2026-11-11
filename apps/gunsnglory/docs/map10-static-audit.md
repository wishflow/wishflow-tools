# New Mexico 第 10 关：Lost City 静态审计

## 审计结论

Lost City 是 60 关战役中的第 10 关，使用 `res/raw/td_map_10.tdm`。原始 TDM 为 32×24 格、770 字节（2 字节尺寸头和 768 个 y-major 格值）。地图有 4 个北侧出生点、2 个南侧出口、38 个路线节点、2 组水平列车、3 个可雇佣建筑，以及 10 波敌人。APK 还配置了玩家单位池上限和 29 条敌人请求；不能把请求数当成波次数。

网页已接入 Lost City 原始 TDM、地形、路线、地图实体、十波、玩家单位池、双语对白与资源；正式 level 10 要求完成 Railroad Ranch，Free Play 不受此前置影响。角色解锁快照纳入内容版本以支持回放重建。关卡数据来自 APK 静态资源、REA/JADX 记录和去编译后的 DEX 表达式；路线是方向场静态派生结果，不是设备运行轨迹。本轮未启动 Android，也未推进原版战役。

## 证据来源与边界

完整派生材料在 `codex/gunsnglory-spec` 研究分支的 `apps/gunsnglory/docs/research/` 下。反编译 Java 是 DEX 去编译结果，不是原始源码。数据清单由 APK 资源静态派生；路线图由方向场实现和 TDM marker 推导，不等于设备运行轨迹。

| 证据名 | 研究材料 | 支持的结论与边界 |
| --- | --- | --- |
| MAP10-APK | `data/map-inventory.json` 的 `source` | APK SHA-256 为 `49a04818e58a411d90f907a6e4ed2d278484dc38bbfab178302c51b0a3a1fb56`；身份为 Guns’n’Glory FREE 1.8.6。 |
| MAP10-TDM | `data/map-inventory.json` 的 `td_map_10.tdm` 条目 | map index 10、战役 level 10、32×24、770 字节；TDM SHA-256 为 `6c9fb042d9d0545a84adc560ac3e68c004d58838cb10569cb809fd8ca382fc24`，含原始格网及值频数。 |
| MAP10-ROUTES | `data/static-route-graph.json` 的地图 10 条目；`EnemyDirector`、`EnemyDirectorField`、`PriorityMap` 的 DEX 与 REA 检查 | 38 个 redirector、4 个 spawn、2 个 exit、46 条边、10 条完整路线。路径长度和分支是静态推导，不是运行时实测。 |
| MAP10-TERRAIN | `data/terrain-render-index.json` 的地图 10 条目；`BackgroundMap` 的地形方法 | 地形图层、格值变化、贴图候选与水域背景。随机贴图变化按网页既有固定种子复现，不保证匹配 APK 每次启动的随机抽样。 |
| MAP10-OBJECTS | `data/train-map-object-inventory-2026-10-23.json` 的地图 10 条目；`GameObjectManager.createGameObjectsFromBasicMap` | 两组列车组件、装饰、单位和招募点 marker 的坐标及对象工厂分支。对象 inventory 是静态遍历。 |
| MAP10-PARAMETERS | `data/level-config.json` 第 10 行；`GameDesignData` 与 `GunsAndGloryThread` | 开局现金、生命、升级上限、难度 HP 倍率及原始配置字段。对未证实的字段不扩写语义。 |
| MAP10-WAVES | `GameDesignWaves.setWaves(..., 10)` 反编译块；`Wave`、`WaveManager`、`SpawnPoolManager` | 10 个 `newWave`、29 个 `addToWave`、池操作、向量槽位、常量解析和波次归属。必须按 Java 调用顺序分组。 |
| MAP10-TEXT-AUDIO | `data/string-resources.json`、`data/audio-use-index.json`；`InGameGeneralMessageDialog.setUpDialog` | APK 英文简介、胜利标题、10 段对白、头像与音频映射。网页中文文案属于新增翻译。 |
| MAP10-WEB | 当前 `src/content/lost-city-campaign.ts`、`official-campaign.ts`、`lost-city-wave-intros.ts`、`main.ts` 与 `public/assets/` | 正式 level 10、菜单/结算、对白与资源、Profile 单位解锁、Free Play 及回放内容版本均已接入。 |

## 地图、路线与对象

TDM 使用 `[width:u8, height:u8, y-major cell bytes]`。坐标从左上角 `(0,0)` 起，x 向右、y 向下。核心 marker 如下：

| 内容 | 格值与数量 | 坐标/说明 |
| --- | --- | --- |
| 出生点 | `40`、`41`、`42`、`43` 各 1 | `(9,0)`、`(10,0)`、`(18,0)`、`(19,0)`；按 y-major 扫描对应 spawn pool 0–3，四处都向南进入地图。 |
| 出口 | `48×2` | `(11,23)`、`(19,23)`。 |
| 路线节点 | `53×18`、`54×7`、`55×9`、`59×4` | 共 38 个；53/54/55 是单向节点，59 对应 action id 7 的东西向分支。 |
| 水域 | `124×28`、`125×6`、`126×1` | 左下与右上水域；BackgroundMap 将 124–126 映射到水背景，126 还会由对象工厂生成水边石块。 |
| 铁路 | `80–88` | 铁路横贯地图第 11 行；`83/84` 用于列车组件，`86/87` 是静态装饰。 |
| 活动地图单位 | `104×1`、`105×1`、`107×1` | 位于 `(14,10)`、`(13,10)`、`(15,10)`，分别创建 Gunslinger、Mexican、Indian，activity 5。JADX 将 104–109 分支误还原为空；Smali/DEX 的共同分支以 `tile − 103` 作为单位类型并创建单位，研究总表也有交叉确认。 |

方向图有 38/38 个 redirector 可达，两处出口均可达，没有静态图报告的异常路径。按每个 redirector 的实际出边枚举，所有路径如下；节点后的 `S/W/E` 表示从上一个控制点进入当前控制格的方向，末尾为出口；行进步数是 spawn marker 到 exit marker 的 Manhattan 步数，不把起点格重复计为一步：

| Spawn | 完整路径（控制格:入向） | 行进步数 |
| --- | --- | ---: |
| `(9,0)` | `(9,3):S → (7,3):W → (7,8):S → (3,8):W → (3,9):S → (2,9):W → (2,13):S → (3,13):E → (3,14):S → (7,14):E → (7,18):S → (9,18):E → (9,19):S → (11,19):E → (11,23)` | 39 |
| `(9,0)` | `(9,3):S → (7,3):W → (7,8):S → (11,8):E → (11,14):S → (7,14):W → (7,18):S → (9,18):E → (9,19):S → (11,19):E → (11,23)` | 37 |
| `(9,0)` | `(9,3):S → (7,3):W → (7,8):S → (11,8):E → (11,14):S → (15,14):E → (15,19):S → (11,19):W → (11,23)` | 37 |
| `(10,0)` | `(10,3):S → (14,3):E → (14,8):S → (11,8):W → (11,14):S → (7,14):W → (7,18):S → (9,18):E → (9,19):S → (11,19):E → (11,23)` | 38 |
| `(10,0)` | `(10,3):S → (14,3):E → (14,8):S → (11,8):W → (11,14):S → (15,14):E → (15,19):S → (11,19):W → (11,23)` | 38 |
| `(18,0)` | `(18,3):S → (15,3):W → (15,8):S → (18,8):E → (18,14):S → (16,14):W → (16,19):S → (19,19):E → (19,23)` | 34 |
| `(18,0)` | `(18,3):S → (15,3):W → (15,8):S → (18,8):E → (18,14):S → (23,14):E → (23,19):S → (19,19):W → (19,23)` | 38 |
| `(19,0)` | `(19,3):S → (22,3):E → (22,8):S → (18,8):W → (18,14):S → (16,14):W → (16,19):S → (19,19):E → (19,23)` | 35 |
| `(19,0)` | `(19,3):S → (22,3):E → (22,8):S → (18,8):W → (18,14):S → (23,14):E → (23,19):S → (19,19):W → (19,23)` | 39 |
| `(19,0)` | `(19,3):S → (22,3):E → (22,8):S → (24,8):E → (24,10):S → (26,10):E → (26,14):S → (23,14):W → (23,19):S → (19,19):W → (19,23)` | 37 |

### 列车、地图单位与招募点

地图包含两组独立的水平列车，每组由 2 节机车和 3 节货车构成；必须使用不同的 movement group，不能合并为一列。`83` 在组首生成 type 10/activity 5，组内第二个 `83` 生成 type 11/activity 5；每个 `84` 生成 type 12/activity 4。

| 列车组 | 起点和组件 | 生成类型/activity |
| --- | --- | --- |
| 1 | `(4,11)` 至 `(8,11)`：`83,83,84,84,84` | `10/5, 11/5, 12/4, 12/4, 12/4` |
| 2 | `(21,11)` 至 `(25,11)`：`83,83,84,84,84` | `10/5, 11/5, 12/4, 12/4, 12/4` |

可雇佣/休眠单位 marker 与坐标：

| TDM 码 | 单位 | 坐标 | APK 解锁条件 |
| ---: | --- | --- | --- |
| 96 | Gunslinger | `(25,4)`、`(11,5)`、`(28,13)`、`(4,16)`、`(7,20)` | 前四种基础单位不需要额外地图里程碑 |
| 97 | Mexican | `(19,6)`、`(16,21)` | 同上 |
| 98 | Cannon | `(6,10)`、`(21,10)`、`(5,19)`、`(27,20)` | 同上 |
| 99 | Indian | `(3,5)`、`(26,7)`、`(1,15)`、`(10,16)` | 同上 |
| 100 | Sniper | `(14,17)` | 完成全局第 40 关后出现 |
| 101 | Grandpa | `(18,4)`、`(19,15)` | 完成全局第 30 关后出现 |
| 130 | Pyromaniac | `(21,21)` | 完成全局第 50 关后出现 |
| 131 | Salesman | `(16,6)` | 完成全局第 60 关后出现 |

地图 10 中还包含上表的 20 个基础/特殊休眠单位，以及 3 个 activity 5 的活动单位，共 23 个地图单位。Sniper、Grandpa、Pyromaniac 和 Salesman 按当前档案解锁状态显示；相应回放内容版本需记录 30/40/50/60 关里程碑快照。tile 107 的 unit type 是 4（Indian），不是 Cannon；tile 与 unit type 的关系为 `unitType = tile − 103`。此表只描述地图静态对象生成与可见性，不将 activity 5 解读成“敌人单位”。

三个招募建筑 marker 为 `112` Saloon `(27,3)`、`113` Fort `(28,17)`、`114` Tipi `(3,2)`。玩家生成池动作在第 1 波先将类型 1–4 当前库存设为 0，再设置最大招募/生成数量为 `[7,6,4,5]`；库存和上限由 `SpawnPoolManager` 分开保存。网页可复用现有 `CampaignUnitPoolDefinition`。

装饰码可沿用现有 New Mexico 对象资产：`68` 仙人掌 A、`69` 岩石 A、`70` 岩石 B、`71` 树、`72` 木桩、`73` 仙人掌 B、`74` 风车、`75` 水塔、`76` 灌木、`116` 小屋、`117` 小型 Tipi、`126` 水边石块。装饰坐标以 TDM 网格为准，图像锚点、碰撞盒和绘制层沿用已实现的对象构造规则。网页现有对应图集、装饰素材及 `gng_levelmap_10.png` 预览图。

### 关卡参数与敌人波次

配置行是 `level-config.json` 中 `index: 9` 的行，对应人类关卡编号 10。下表仅列代码消费点确认的含义；保留字段不做推断：

| 参数 | 原始值 | 可确认含义 |
| --- | ---: | --- |
| 开始现金 | 350 | 开局余额 |
| 初始生命 | 25 | 开局和生命上限 |
| 最大升级级数 | 3 | 单位升级上限 |
| Easy / Medium / Hard 敌人 HP 倍率 | 75% / 150% / 188% | 当前关卡难度倍率 |
| 宝箱总数 / 投放间隔 / 同时存在上限 | 999 / 25,000 ms / 32 | SpawnPoolManager 分别将行索引 2、3、7 用作剩余总数、计时器和当前箱数上限 |
| Awesome 消息字段 | `30000`, `5` | 行索引 6 被赋给 `triggerMessageMinEnemy`，EnemyDirector 用其筛选敌人类型；索引 5 的 30000 在反编译 Java 中没有发现消费者，保留未知 |
| Gambler 时间字段 | 119,000 ms | 表中存在该值；TDM 没有 gambler marker `132`，不能因此创建赌场或 Gambler |

`GameDesignWaves` 的 map10 源码块顺序含 10 个 `newWave` 和 29 个 `addToWave`。每个 wave call 的前两项是 spawn pool 编号和请求间隔；后 8 项按 `Wave` 常量顺序代表 Settler×1、×2、×3、×4、Rider、Covered Wagon、Post Coach、Gold Transport。10 参数 `addToWave` 重载会在尾部补 2 个 0（Boss、Doc），不能漏掉或错移槽位。单位向量不能视作确定生成顺序，运行时仍会按剩余数量抽取。

| 波 | 开始延迟；HP/速度倍率；头像 | Spawn pool 请求（间隔 ms：八槽向量） |
| ---: | --- | --- |
| 1 | 15,000 ms；200% / 100%；Pedro | P0 `2000:[1,1,1,2,3,2,0,0]` |
| 2 | 5,000 ms；250% / 105%；Gunslinger | P0 `2000:[1,1,2,2,2,3,1,0]` |
| 3 | 5,000 ms；200% / 110%；Pedro | P0 `2500:[0,1,1,1,2,3,1,0]`；P1 `2500:[1,2,1,2,3,3,1,0]` |
| 4 | 5,000 ms；175% / 110%；Settlers | P0 `3000:[1,0,2,2,3,4,1,0]`；P1 `3000:[1,2,2,2,3,3,2,1]`；P2 `3000:[1,0,2,2,3,3,1,0]` |
| 5 | 5,000 ms；200% / 110%；Mexican | P0 `3500:[0,0,1,2,2,3,1,1]`；P1 `3500:[0,0,1,2,2,2,1,0]`；P2 `3500:[0,0,1,2,2,2,2,0]` |
| 6 | 5,000 ms；180% / 115%；Indian | P0 `3500:[0,0,1,1,2,3,2,1]`；P1 `3500:[1,0,1,0,2,3,2,1]`；P2 `3500:[0,2,1,0,2,3,2,1]` |
| 7 | 5,000 ms；200% / 110%；Settlers | P0 `4000:[1,1,0,0,3,3,2,1]`；P1 `3500:[1,1,0,0,3,3,2,1]`；P2 `3500:[0,2,0,0,3,3,2,1]`；P3 `4000:[0,2,0,0,3,3,2,1]` |
| 8 | 5,000 ms；225% / 120%；Indian | P0 `4000:[1,1,0,0,3,4,3,1]`；P1 `3500:[1,1,0,0,3,4,2,1]`；P2 `3500:[0,2,0,0,3,4,3,1]`；P3 `4000:[0,2,0,0,3,4,2,1]` |
| 9 | 5,000 ms；250% / 110%；Mexican | P0 `6000:[0,0,0,0,0,0,0,3]`；P1 `6500:[0,0,0,0,0,0,0,3]`；P2 `6500:[0,0,0,0,0,0,0,3]`；P3 `6000:[0,0,0,0,0,0,0,3]` |
| 10 | 5,000 ms；280% / 120%；Pedro | P0 `4000:[1,1,0,0,5,4,3,1]`；P1 `3500:[1,1,0,0,5,4,2,2]`；P2 `3500:[0,2,0,0,5,4,3,1]`；P3 `4000:[0,2,0,0,5,4,3,2]` |

静态代码解析的常量值：`UNIT_BONUS_DURATION_FIRE=5000 ms`、`DEFAULT_SWIPE_ANIMATION_DURATION=250 ms`、`MAX_NUM_POINTS=3000 ms`。当前内容抽取 JSON 的 `rawCalls` 并非按源码调用交错顺序，不能按它把 `addToWave` 批量分配给某一波；应以 `GameDesignWaves.java` 的 map10 代码块为准，并用 DEX/REA 核对常量和重载。

### 文本、头像、音效和复用资源

| 文本 | APK 英文原文 |
| --- | --- |
| 简介 | Winding valleys lead to a forgotten city, steeped in legend. |
| 胜利标题 | The Bandit Boss of Lost City |
| 第 1 波 | The gulch to the lost city branches out in all directions. We can't lose the settlers there! |
| 第 2 波 | Yeehah! Give me a target! |
| 第 3 波 | The lost city is the destination of all the settlers. If we can take control of the city, we'll have the settlers totally in our hands! |
| 第 4 波 | Frank, have you got the compass handy? I thought the lost city was more to the west... |
| 第 5 波 | We have to spread out, or we'll lose them! |
| 第 6 波 | The lost city is the homeland of our ancestors. No settler must ever enter here! |
| 第 7 波 | There's an arrow in your hat. How did that get there? Is that a souvenir? |
| 第 8 波 | Palefaces are welcome to more souvenirs. They just have to keep still for a moment. |
| 第 9 波 | They're arriving again with lots of wagons full of gold! |
| 第 10 波 | Victory will soon be ours! Then the lost city will belong only to us! |

对白头像顺序为 Pedro、Gunslinger、Pedro、Settlers、Mexican、Indian、Settlers、Indian、Mexican、Pedro。APK 对话头像语音映射为 Pedro→`sound_pedro`、Gunslinger→`sound_desperado_yihaa`、Mexican→`sound_mexican_arriba`、Indian→`sound_indian_hugh`、Settlers→`sound_siedler`；对应网页音效文件已存在。APK 的 `portrait_gunslinger.png` 与 `portrait_mexican.png` 是独立资源，已从 APK 导入为原图；不把不同肖像名视为等价素材。对白沿用 `portrait_pedro`、`portrait_settlers`、`portrait_indian` 等已有资源与通用对话渲染路径。

## 网页实现状态与剩余边界

- 32×24 TDM、静态路线/对象、两列火车、十波与玩家池分别由 Lost City 内容模块组装。正式关卡 `campaign-new-mexico-10` 的先决条件是 `campaign-new-mexico-09`，Free Play 可跳过进度门槛并选择任意难度。
- map10 的四类特殊地图单位由全局 level 30/40/50/60 解锁；对应标记纳入 replay content version，导入回放按记录快照还原可见性。地图基础单位和正式战役结算沿用既有通用机制。
- 十条波次对白保留 APK 英文、字符串资源 ID、头像顺序和语音映射。`portrait_gunslinger.png`、`portrait_mexican.png` 已从 APK `drawable-mdpi-v4` 导入；不以其他头像替代。
- map10 没有 dynamite marker `102/110`、Gambler marker `132`；不得从其它地图复制炸药或赌徒。
- map10 地图随机变化只要求稳定、可复现，并与 APK 的地形生成规则相符；不要求强行复制 APK 每次启动的随机种子结果。
- 路线、静态场景、地图单位、十波、玩家池、对白、关卡解锁及回放快照通过定向测试；完整 `CI=1 pnpm run test:ci` 已通过，发布版内置浏览器已验证关卡目录、困难难度首波对白和战场。数据表中的 `awesomeMessageMin=30000` 消费含义仍未知，保留原始字段且不阻塞已证实内容。
