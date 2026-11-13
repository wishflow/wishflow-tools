# Oregon 第2关：Cashcow Canyon 静态审计

## 结论与边界

Cashcow Canyon 是 Oregon 区第2关、全局第22关，战役地图为 res/raw/td_map_25.tdm。APK派生清单记录地图32×24、770字节（2字节尺寸头加768个格子），初始现金250、生命25，敌人HP倍率86%/115%/140%，包含9次 newWave、33次 addToWave，没有炮池动作。

本报告基于APK资源、DEX/Smali、REA静态记录和当前网页资源目录，不是Android运行记录，也不包含完整战役模拟。APK SHA-256前缀为49a04818；派生网格摘要前缀为20ff05e2。研究附件留在本地 codex/gunsnglory-spec 分支，不作为网页构建或运行依赖。REA短编号可在该分支 evidence/rea/evidence-reference-index.json 定位。

| 结论类别 | 结果 |
| --- | --- |
| 已证实 | map25尺寸、地形tile、地图对象marker、关卡参数、9波调用及其顺序、标题/简介/对白资源和Oregon区域音乐调用都有APK或DEX依据。 |
| 静态推导 | 地图有6个出生点、3个出口、42个转向marker、52条有向路线边；42/42转向点与3/3出口可达，无异常路线。 |
| 资源核查 | 网页已有地图预览、地形atlas、对白头像和音乐；若干原版装饰PNG缺失或只有hdpi版，须在资源切片补齐。 |
| 未确认 | 地形索引不含设备随机种子和最终像素；无本关专属对白语音映射；awesomeMessageMin现有消费语义未闭环。不得伪称像素级运行一致，也不得虚构配音或计时规则。 |

## 证据入口

研究数据从 codex/gunsnglory-spec 分支读取，例如：

git show codex/gunsnglory-spec:apps/gunsnglory/docs/research/data/map-inventory.json

| 内容 | 证据来源 | 边界 |
| --- | --- | --- |
| 地图编号、维度、原始网格 | data/map-inventory.json index 25；REA-393 BasicMap.loadMap | 行序为y-major；关卡大于10时地图号=关卡号+3，因此global level 22使用map25。 |
| 出生点、转向点、路线出口 | data/static-route-graph.json；REA-404 EnemyDirector.createEnemyDirectorFieldsFromBasicMap；REA-409 EnemyDirectorField.<clinit> | 路线图从TDM和方向表派生，不是运行截图。 |
| 地形、道路、可走区域 | data/terrain-render-index.json；REA-386 BackgroundMap.createBackgroundMap；REA-391 BackgroundMap.isFreeToWalk；REA-107 Oregon.drawBackgroundLayer；REA-100 GunsAndGloryThread.drawStreetLayer | 静态渲染候选不包含随机种子与最终设备像素。 |
| TDM对象分派 | evidence/dex/GameObjectManager.dexdump.txt、recovered-source/smali/.../GameObjectManager.smali；REA-427 GameObjectManager.createGameObjectsFromBasicMap | 以DEX switch payload与目标指令为准；JADX在若干marker上有控制流重建错误。 |
| 初始参数 | data/level-config.json index 21；REA-416 GameDesignData.<clinit> | 字段值取APK原表；未知字段不猜语义。 |
| 波次 | GameDesignWaves.java中i == 22、data/waves.json level 22；REA-417 GameDesignWaves.setWaves | waves.json聚合调用，不保留交错顺序；下表以源调用顺序为准。 |
| 文案与声音 | data/string-resources.json、APK资源引用、levelpacks/Oregon.java | 默认字符串是APK英文；头像不证明存在角色配音。 |

## 地图与路线

- TDM是32列×24行，格子32×32像素，地图逻辑尺寸1024×768像素，总长770字节。
- 原始tile频次：0:335、32:161、36:71、40–45各1、48:3、52:9、53:8、55:21、58:3、61:1、70:1、75:1、76:2、78:20、79:11、80:4、88:12、89:6、90:9、91:2、92:1、94:1、95:1、96:16、97:19、100:1、101:6、104:2、105:1、115:20、116:1、118:5、119:6、130:1、131:1。
- 出生marker 40–45对应action ID 0–5，均从西向东；出口marker 48有3个。路线marker 52、53、55、58、61对应方向action ID 0、1、3、6、9。

42个转向点按action ID分组如下，坐标为(x,y)：

| action ID | 坐标 |
| ---: | --- |
| 0 | (3,4)、(17,5)、(3,11)、(17,11)、(10,15)、(25,19)、(21,20)、(18,21)、(14,23) |
| 1 | (10,2)、(23,2)、(3,6)、(17,6)、(17,12)、(3,13)、(10,16)、(21,16) |
| 3 | (3,2)、(4,2)、(17,2)、(10,5)、(10,6)、(23,7)、(17,8)、(3,9)、(4,9)、(17,9)、(25,9)、(10,11)、(10,12)、(4,15)、(3,16)、(17,16)、(21,19)、(18,20)、(14,21)、(4,23)、(10,23) |
| 6 | (4,5)、(10,9)、(4,12) |
| 9 | (4,16) |

| 出生action ID | 坐标 | 初始方向 | 可达出口 |
| ---: | --- | --- | --- |
| 0 | (0,4) | 东 | (31,7) |
| 1 | (0,5) | 东 | (31,7)、(31,8)、(31,9) |
| 2 | (0,6) | 东 | (31,8)、(31,9) |
| 3 | (0,11) | 东 | (31,8)、(31,9) |
| 4 | (0,12) | 东 | (31,8)、(31,9) |
| 5 | (0,13) | 东 | (31,9) |

三个出口坐标为(31,7)、(31,8)、(31,9)。完整图有52条有向边，42/42转向点和3/3出口可达，没有异常路线。后续测试应比较完整派生边表，不能只断言地图“有路线”。

## 地形、街道与可走区域

terrain-render-index的map25背景和街道基线均为24×32。街道层有34个非零格；派生绘图规则在(23,4)、(25,12)、(10,19)、(4,20)四处各放置左右桥墩，共8个桥墩sprite。Oregon背景使用通用canyon、desert、shadow、water、waterside与path atlas；Oregon.loadIngameImagesPack()把Mississippi命名的地区atlas映射到通用cache槽，不能把这张Oregon地图误套成Mississippi地貌。

TDM不保存独立碰撞位图。APK从TDM生成background和street层，再用背景值判断可走性：越界不可走；范围内只有背景值0或16–19可走。

| TDM tile | 背景/走路含义 |
| --- | --- |
| 32、40–46、48、52–66、80–81、110 | 背景48，峡谷区域，不可走 |
| 36 | 背景0，可走 |
| 88–89 | 同列上一行也是88/89时为48，否则为0 |
| 120–126 | 背景96，不可走 |
| 未单列tile | 背景默认0，随后按APK随机变体规则处理 |

街道是独立层；例如TDM 88→76、89→80、90–93→84。可走性不能由贴图明暗、道路候选帧或敌人路线图推测。玩家单位的可走检查与敌人按方向marker寻路是不同规则；不能仅因某格对玩家单位不可走就判定敌人路线错误。

terrain-render-index是可复算的候选帧索引，不是游戏截图，也不含最终随机种子、滤镜、遮挡或设备像素。接入时应沿用Oregon地形代码路径，逐格对照APK派生background、street和桥墩数据。

## 地图对象与初始单位

TDM位置为(x,y)。以下对象由DEX marker分支和GameObjectDecoration资源映射得出；装饰marker坐标列全：

| TDM tile | 数量 | 原版构造/资源 | 坐标 |
| ---: | ---: | --- | --- |
| 70 | 1 | 装饰ID 3，e_1x1_rocks_b | (6,12) |
| 75 | 1 | 装饰ID 8，b_1x1_watertower | (12,14) |
| 76 | 2 | 装饰ID 9，e_1x1_bush | (8,20)、(28,19) |
| 79 | 11 | 装饰ID 15，e_1x1_tree_green_a | (5,0)、(15,1)、(31,1)、(6,4)、(20,4)、(27,4)、(1,7)、(23,14)、(1,18)、(16,18)、(12,20) |
| 91、92 | 3 | 普通新局调用createTrainFromMap的列车组件 | 91：(13,17)、(13,18)；92：(13,16) |
| 94、95 | 2 | 装饰ID 18/19，tiles_railway_buffers_verti_up/down | 94：(13,1)；95：(13,20) |
| 115 | 20 | 装饰ID 48，e_1x1_tree_green_b | (10,0)、(1,1)、(28,1)、(25,3)、(30,3)、(2,8)、(15,8)、(0,9)、(20,12)、(29,12)、(1,14)、(27,15)、(15,16)、(29,16)、(6,19)、(30,19)、(2,20)、(0,21)、(21,22)、(26,22) |
| 116 | 1 | 装饰ID 12，b_2x1_shack | (23,11) |
| 118 | 5 | 装饰ID 51，e_1x1_tree_stump | (29,0)、(8,5)、(27,11)、(30,14)、(28,21) |
| 119 | 6 | 装饰ID 52，e_1x1_tree_green_c | (25,0)、(12,2)、(31,17)、(30,22)、(2,23)、(23,23) |

| TDM tile | 数量/坐标 | 原版单位/activity |
| ---: | --- | --- |
| 104 | 2：(12,7)、(5,17) | type 1 Gunslinger，activity 5 |
| 105 | 1：(14,9) | type 2 Mexican，activity 5 |
| 96 | 16处 | type 1 Gunslinger，activity 4 |
| 97 | 19处 | type 2 Mexican，activity 4 |
| 100 | 1：(18,6) | type 5 Sniper，activity 4 |
| 101 | 6：(29,1)、(6,11)、(23,12)、(14,14)、(29,18)、(8,19) | type 6 Grandpa，activity 4 |
| 130 | 1：(0,16) | type 35 Pyromaniac，activity 4；受单位解锁状态约束 |
| 131 | 1：(18,14) | type 36 Salesman，activity 4；受单位解锁状态约束 |

tile 96坐标：(15,2)、(19,4)、(25,4)、(28,4)、(6,5)、(15,7)、(19,11)、(7,12)、(28,12)、(20,13)、(2,18)、(7,18)、(15,18)、(27,20)、(24,21)、(19,22)。

tile 97坐标：(14,1)、(25,1)、(28,2)、(7,4)、(21,4)、(30,4)、(8,6)、(12,8)、(8,11)、(30,12)、(23,16)、(28,16)、(12,17)、(18,18)、(7,20)、(2,21)、(0,22)、(25,22)、(28,22)。

Smali的createGameObjectsFromBasicMap读取fromLoadGame后执行if-nez跳过，因此96–101、130–131这些activity 4 marker是在fromLoadGame=false的新局路径创建，读档时由存档恢复。104–109也仅在新局创建activity 5单位。不要按JADX伪代码条件方向判断；REA-427、Smali和既有M21审计已复核该分支。

本图没有tile 106（type 3 Cannon）、tile 132（Gambler）、tile 150（Casino）或Dynamite marker，也没有spawnPoolActions。因此本关不创建炮位、炮池模板、赌徒或赌场。可选池模板契约无需在M23新增；M23-C须将招募marker、开局单位、列车组件、装饰及profile解锁状态分别映射。

## 初态与九波

APK level-config index 21（全局第22关）：

| 字段 | 原值 | 接入边界 |
| --- | ---: | --- |
| cash / lives | 250 / 25 | 新局初态 |
| maxUpgrades | 3 | 沿用现有关卡升级规则 |
| enemy HP倍率 Easy / Medium / Hard | 86% / 115% / 140% | 原始难度值 |
| maxChests / chestTime / maxChestsPlayfield | 999 / 25,000 ms / 15 | 沿用现有奖励箱机制 |
| awesomeMessageUnit | 5 | 按已有消费者实现 |
| awesomeMessageMin | 30,000 | 语义未闭环，不按字段名添加行为 |
| gamblerTime | 119,000 ms | 原始配置；本图无Gambler marker，不生成Gambler |

9条newWave：

| 波次 | 字符串 | 头像 | 延迟 | HP倍率 | 速度倍率 |
| ---: | --- | --- | ---: | ---: | ---: |
| 1 | T_CAMPAIGN_22_01 | portrait_gunslinger | 15,000 ms | 90% | 120% |
| 2 | T_CAMPAIGN_22_02 | portrait_settlers | 15,000 ms | 100% | 120% |
| 3 | T_CAMPAIGN_22_03 | portrait_settlers | 20,000 ms | 110% | 125% |
| 4 | T_CAMPAIGN_22_04 | portrait_pedro | 20,000 ms | 120% | 125% |
| 5 | T_CAMPAIGN_22_05 | oregon_dakota_portrait_geezer | 20,000 ms | 130% | 130% |
| 6 | T_CAMPAIGN_22_06 | portrait_mexican | 20,000 ms | 140% | 135% |
| 7 | T_CAMPAIGN_22_07 | portrait_gunslinger | 15,000 ms | 150% | 140% |
| 8 | T_CAMPAIGN_22_08 | oregon_dakota_portrait_boss | 15,000 ms | 160% | 145% |
| 9 | T_CAMPAIGN_22_09 | oregon_dakota_portrait_boss | 25,000 ms | 140% | 145% |

下表按源码调用顺序列出33条addToWave。槽1–8依次为Settler×1、Settler×2、Settler×3、Settler×4、Rider、Covered Wagon、Post Coach、Gold Transport；Boss槽为额外参数。PathInterpolatorCompat.MAX_NUM_POINTS保留APK表达式，不猜替换数值。

| 波次 | 出生action ID | 间隔 | 槽1–8请求 | Boss槽 |
| ---: | ---: | --- | --- | ---: |
| 1 | 5 | 2,500 ms | [1,1,3,2,1,2,0,0] | 0 |
| 2 | 4 | 2,500 ms | [0,0,2,1,2,1,1,0] | 0 |
| 3 | 3 | 3,500 ms | [0,0,2,3,1,1,0,0] | 0 |
| 3 | 4 | 3,500 ms | [0,0,2,1,2,1,0,0] | 0 |
| 3 | 5 | 3,500 ms | [0,0,3,3,2,1,0,0] | 0 |
| 4 | 2 | 3,500 ms | [0,0,2,3,1,1,0,0] | 0 |
| 4 | 3 | 4,000 ms | [0,0,1,2,0,1,0,0] | 0 |
| 4 | 4 | 3,500 ms | [0,0,2,1,2,1,0,0] | 0 |
| 4 | 5 | 3,500 ms | [0,0,3,3,2,1,0,0] | 0 |
| 5 | 1 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,0,2,3,1,1,0,0] | 0 |
| 5 | 2 | 3,250 ms | [0,0,2,3,1,1,0,0] | 0 |
| 5 | 3 | 3,500 ms | [0,0,1,2,0,1,0,0] | 0 |
| 5 | 4 | 3,250 ms | [0,0,2,1,2,1,0,0] | 0 |
| 5 | 5 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,0,3,3,2,1,0,0] | 0 |
| 6 | 0 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,1,2,3,1,1,1,0] | 0 |
| 6 | 1 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,0,2,3,1,1,0,0] | 0 |
| 6 | 2 | 3,250 ms | [0,0,2,3,1,1,1,0] | 0 |
| 6 | 3 | 3,500 ms | [0,0,1,2,0,1,0,0] | 0 |
| 6 | 4 | 3,250 ms | [0,0,2,1,2,1,0,0] | 0 |
| 6 | 5 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,0,3,3,2,1,1,0] | 0 |
| 7 | 0 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,1,2,3,2,1,1,0] | 0 |
| 7 | 1 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,0,3,3,1,1,0,0] | 0 |
| 7 | 2 | 3,250 ms | [0,0,2,3,2,1,1,0] | 0 |
| 7 | 3 | 3,500 ms | [0,0,2,3,0,1,1,1] | 0 |
| 7 | 4 | 3,250 ms | [0,0,3,2,2,1,0,0] | 0 |
| 7 | 5 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,0,3,4,2,2,1,0] | 0 |
| 8 | 0 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,1,3,3,2,1,1,1] | 0 |
| 8 | 1 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,0,2,3,1,1,0,1] | 0 |
| 8 | 2 | 3,250 ms | [0,0,2,3,2,1,1,0] | 0 |
| 8 | 3 | 3,500 ms | [0,0,2,3,0,1,0,0] | 0 |
| 8 | 4 | 3,250 ms | [0,0,3,2,2,1,1,1] | 0 |
| 8 | 5 | PathInterpolatorCompat.MAX_NUM_POINTS | [0,0,3,3,2,2,1,0] | 0 |
| 9 | 4 | 2,500 ms | [0,0,0,0,0,0,0,0] | 1 |

每波调用数为1、1、3、4、5、6、6、6、1，共33。第9波只将Boss槽设为1；本关没有spawn-pool动作。

## 文案、声音与网页资源

APK默认英文：

- T_LEVEL_NAME_25：Cashcow Canyon
- T_LEVEL_INFO_25：The sun reaches its highest spot above this beautiful valley at noon.
- 9段对白使用T_CAMPAIGN_22_01至T_CAMPAIGN_22_09；对白编号是战役序号，与标题/简介使用的地图编号25不同。

| 波次 | 英文对白 | 头像 |
| ---: | --- | --- |
| 1 | The greener the grass, the more golden the gold! And I love gold! Yeehaaaah! | portrait_gunslinger |
| 2 | Honey, I love this place. Why don't we just settle here? | portrait_settlers |
| 3 | Darling, the whole area belongs to that smelly, old cattle baron who's following us… I'm glad he's walking in the back of our group! | portrait_settlers |
| 4 | Boss, they're all coming to us! Let's welcome them! | portrait_pedro |
| 5 | Now that reminds me of the old days! Back when I was young! | oregon_dakota_portrait_geezer |
| 6 | When you were young? There weren't even any settlers back then, old man! | portrait_mexican |
| 7 | I'll buy a red horse with all that gold! Newly imported from Italy! | portrait_gunslinger |
| 8 | Can't you walk faster? I don't like it when someone tramps down my grass! You better not be here anymore when I catch up with you in a few minutes! | oregon_dakota_portrait_boss |
| 9 | What's going on here? Bandits? I don't wanna see any settlers or scoundrels here! I'm going to report this to the Sheriff! | oregon_dakota_portrait_boss |

Oregon环境循环使用music_atmo_forest，战斗循环为music_oregon、music_loop2、music_loop3。网页资源已有预览图gng_levelmap_25.png、四种普通头像、Oregon Geezer/Boss头像和这些音乐；验收保持静音。未发现本关专属对白语音映射，不按头像添音效。

当前网页装饰图缺口：

- e_1x1_tree_green_b、e_1x1_tree_stump、e_1x1_tree_green_c在public/assets中完全缺失。
- b_1x1_watertower、tiles_railway_buffers_verti_up/down、e_1x1_tree_green_a目前只有hdpi资源。
- e_1x1_rocks_b、e_1x1_bush、b_2x1_shack和e_1x1_tree已有基础资源。

APK已核对这些资源均提供ldpi、mdpi与hdpi原图。M23-E应从APK提取缺失的hdpi原版PNG，并逐项验证网页现有hdpi文件与APK一致；按现有装饰加载约定将hdpi显示尺寸还原至mdpi逻辑尺寸。禁止用相近树、栅栏或桥图替代。完整APK字符串表中没有T_LEVEL_NAME_WON_25；Oregon.getSuccessTextId只对地区第10关提供Oregon专属结算文字，因此本关沿用通用结算，不新增胜利标题。

## 网页接入边界

- campaign-catalog.ts已有global level 22、Oregon、Cashcow Canyon、map25和title resource 25，不得重复登记；关卡builder和正式入口尚需实现。
- 正式战役在完成Eastwood Forest（global level 21）后开放；Free Play可直接选Easy、Medium、Hard。
- 将activity 4招募marker、activity 5初始单位、列车组件、装饰和profile解锁状态分别映射；内容版本和回放工厂要保存会改变开局单位的解锁状态。
- 9波、33条请求按上表接入现有GameSession；profile无Cannon购买或炮池动作，不创建Fort Cannon或幽灵单位。
- 增加中文标题、简介和对白，英文保持APK文本；头像不代表语音。
- 资产迁入不等于地图或规则验收。定点GameSession推进只检查代表性请求，不完整模拟战役。

## 未闭环项的处置

| 项目 | 当前结论 | 后续处理 |
| --- | --- | --- |
| 随机贴图最终帧 | 静态索引只含候选帧和规则 | M23-B逐格对照候选帧；若仍有依赖Android滤镜的差异，再做一次定点观察。 |
| 玩家可走背景 | APK谓词和TDM转换已静态复核；网页应由同一背景层生成碰撞代码 | M23-B逐格比较backgroundCollisionCodes和边界；不得用它代替敌人路线验证。 |
| Pyromaniac/Salesman解锁 | tile130/131对应type35/36 | M23-C覆盖锁定/解锁及回放内容快照。 |
| 原版装饰图 | 三个变体完全缺失，四个图仅有hdpi | M23-E从APK提取并校验资源名、密度与装饰ID。 |
| awesomeMessageMin | 值30,000，消费语义未闭环 | 仅复用已验证消费者；没有证据则不新增行为。 |
| 对白语音 | 未发现专属映射 | 不新增语音；默认静音。 |
| 运行画面对照 | 此文档是静态审计 | 只在静态证据不足以判断具体渲染差异时做一次定点观察。 |

## DEX与现有清单的冲突

研究分支content-inventory.md对tile 96–101、130–131的fromLoadGame条件描述与DEX Smali及网页experience-log.md复核结论相反。Smali在读取fromLoadGame后执行if-nez跳过对象创建，因此activity 4 marker在fromLoadGame=false的新局路径创建，读档时由存档恢复。

JADX重建还把94/95的装饰ID以及115/118/119分支恢复错位。M23接入以GameObjectManager Smali的packed-switch和目标指令为准：94/95为装饰ID18/19；115、118、119分别为装饰ID48、51、52。后续审计不能只依赖JADX伪代码；已有研究清单的相关行应在其后续维护批次校正。
