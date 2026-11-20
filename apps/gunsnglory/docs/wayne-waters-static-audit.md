# Dakota 第 8 关：Wayne Waters 静态审计

## 结论和范围

Wayne Waters 是全局第 38 关。APK 实际读取的地图为 res/raw/td_map_41.tdm；关卡参数使用零起始数组行 37；波次分支条件为 i == 38；标题/简介资源编号是 41，对白资源编号是 38。这五种编号分别服务于地图读取、参数、波次和字符串，不可互相代换。

本报告完成 APK 静态地图、路线、地形、对象、碰撞、参数、波次、对白、头像与音频资源核对。没有启动 Android、没有播放声音、没有模拟整场战役。路线和贴图结果是从原始 TDM、DEX/Smali、资源与网页独立参考算法推导，不是设备画面观察。

当前网页目录只有 Wayne Waters 的 Level 38 名称和资源编号；它尚未进入正式关卡阶段，也没有专属场景、规则、波次或回放工厂。地图、路线和地形基线已经足以开始实现。唯一保留的地图内容未知项是 raw 78 的作者意图；APK 没有给它专属对象、街道或贴图分支，不阻塞按原始数据实现。

## 证据入口

| 证据键 | 来源 | 可支持的结论和边界 |
| --- | --- | --- |
| APK186 | 用户提供的 Guns’n’Glory FREE APK，包名 com.hg.gunsandgloryfree，版本 1.8.6 / code 34 | 本报告固定的原版目标。Smali 是 DEX 反汇编，不是原始 Java 源码。 |
| TDM41 | APK ZIP 的 res/raw/td_map_41.tdm；[td_map_41.tdm](../tests/fixtures/td_map_41.tdm) | 770 字节原始地图；前两字节为 32×24，后续 768 字节为 y-major tile。fixture 与原 APK ZIP 项和 APKTool 提取件逐字节一致。 |
| ROUTE41 | APK EnemyDirectorField、PriorityMap 的方向与扫描规则；[wayne-waters-route-graph.json](../tests/fixtures/wayne-waters-route-graph.json) | 4 个出生点、46 个转向点、4 个出口、52 条唯一有向边及6条完整路径。与独立 REA 路线图的边集逐项一致；不是随机运行路径。 |
| TERRAIN41 | BackgroundMap.createBackgroundMap/createStreetLayerMap/shapenBackgroundMap/shapenStreetLayerMap/createVariationMap、Dakota 绘制入口；[wayne-waters-terrain-reference.json](../tests/fixtures/wayne-waters-terrain-reference.json) | 最终背景码、桥/路覆盖与绘制数量。固定 Java Random 种子用于可复现派生，不声称复现某次 Android 随机贴图选择。 |
| OBJECTS41 | GameObjectManager.createGameObjectsFromBasicMap/createSteamerFromMap、GameObjectDecoration、GameObjectUnit、DynamiteTrigger.selectDynamiteBox | TDM marker 的新局对象、招募门控、动态交通工具、最近炸药配对与对象类别。 |
| LEVEL38 | GunsAndGloryThread.onLoadGame、BasicMap.loadMap、GameDesignData.<clinit> | 全局关卡号到地图资源和零起始参数行的关系。 |
| WAVES38 | GameDesignWaves.setWaves() 的 i == 0x26 分支、WaveManager.addToWave、SpawnPoolManager.addActionForSpawnPool/performActionsForWave | 8个波次头、16条敌人请求、Wave 1 玩家单位池动作；请求数不是固定出敌顺序。 |
| COPY38 | APK res/values/strings.xml、res/values/public.xml | Wayne Waters 英文标题、简介、对白 key 与头像 drawable。网页中文翻译另属本地化。 |
| WEB37 | 当前 Level 37 的 Dakota 内容、目录和页面消费点；[实施计划](implementation-plan.md) | 复用方式与当前接入差异，不是 APK 证据。 |

## 关卡身份和索引链

GunsAndGloryThread.onLoadGame() 读取 LevelPack 的关卡号，创建 BasicMap(level)，再调用 GameDesignWaves.setWaves(..., level)。BasicMap.loadMap() 对大于 10 的关卡号加 3 后拼出地图资源名；因此全局 38 → 地图文件号 41。线程按 level - 1 从 GameDesignData.gameDesignData 读取参数，因此全局 38 → 零起始行 37。波次函数的十六进制条件 0x26 即十进制 38。

| 用途 | 正确编号 | 直接依据 |
| --- | ---: | --- |
| 全局战役关卡 | 38 | LevelPack.getLevel() 返回值及 GunsAndGloryThread.onLoadGame() |
| 地图资源 | td_map_41.tdm | BasicMap.loadMap()：level > 10 时资源号加 3 |
| 参数行 | 37 | GunsAndGloryThread 用关卡号减 1 读取数据数组；对应 array_25 |
| 波次分支 | 38 / 0x26 | GameDesignWaves.setWaves() 条件分支 |
| 标题/简介编号 | 41 | T_LEVEL_NAME_41、T_LEVEL_INFO_41 |
| 对白编号 | 38 | T_CAMPAIGN_38_01..08 |

因此不要使用 Level 37 的参数行36、td_map_40.tdm、波次分支37或对白编号37来补 Level 38。关卡目录中的 mapFileNumber: 41 只确认目录标识，不代替上面的代码索引链。

## 原始 TDM 和标记清单

TDM 尺寸是 32×24，原始 tile 数量合计768。完整坐标与顺序保存在 TDM fixture 中；下面是频次校验：

    0:332, 16:42, 32:131, 36:44
    40:1, 41:1, 42:1, 43:1, 48:4
    53:24, 54:9, 55:11, 60:1, 61:1
    69:7, 70:4, 71:6, 74:1, 76:6, 78:9, 80:8, 88:11
    96:15, 97:11, 98:9, 99:4, 100:1, 101:5
    102:4, 110:4, 112:1, 113:1
    120:1, 121:2, 123:1, 124:36, 125:14, 126:2
    130:1, 131:1

### 路线、出生点和出口

坐标为左上角原点的零起始 (x,y)。raw 40–43 是四个出生 marker，action ID 为 raw 值减40；raw 48 是出口。route redirect 53/54/55 分别表示南/西/东，60/61 分别带有西南/东南分支。方向是从控制点离开的方向。

| Marker | 坐标 |
| --- | --- |
| 出生 40–43 | 40@(0,3)；41@(14,0)；42@(15,0)；43@(28,0) |
| 出口 48 | (12,23)、(13,23)、(20,23)、(21,23) |
| 横桥 80 | (25,12)、(26,12)、(5,13)、(6,13)、(12,21)、(13,21)、(20,21)、(21,21) |
| 竖桥 88 | (10,2–4)、(20,3–5)、(28,8–9)、(16,17–19) |

静态路线图有46个 redirect marker、52条唯一有向边。四个出生点全部可达，全部46个转向点和四个出口均可达；展开得到6条完整出生到出口路径。路线覆盖 raw 32、route marker、出口与19次桥格访问，没有越界边、孤点或未达出口。

完整6条路线链保存在 wayne-waters-route-graph.json。它们分别从 action 1、1、2、2、3、0 出发；有两对路线共享同一出生 action 的不同分支。路径中间格累计访问214次：raw 32为139次、raw 53为30次、raw 54为11次、raw 55为13次、raw 60/61各2次、raw 80为12次、raw 88为5次。累计访问数不是唯一格数，也不是敌人随机路线选择概率。

### 其他原始标记

- raw 16 有42格，是 Dakota 街道层输入；raw 32 有131格，组成主要通道；raw 36 有44格，交由最终背景塑形确定悬崖/地形碰撞。不可把 raw 值直接当成最终图集格或碰撞分类。
- raw 124 有36格水域输入，raw 125 有14格岸线输入，raw 126 有2格水边岩石标记。raw 126 同时触发独立装饰对象构造。
- 本图没有 raw 82–87 铁轨/列车组件、raw 114 Tipi、raw 115/116 小屋、raw 150 Casino 或其他 Gambler 标记。不得从资源存在或参数非零推断本图有火车、Tipi、Casino 或 Gambler。
- raw 78 有9格，位于右侧边缘：(29,0)、(31,0–2)、(31,4–8)。GameObjectManager 没有对应静态对象分支；已核对的背景/道路转换也没有为它定义专属映射，因此背景走默认底图并可能受相邻塑形影响。APK 没有证据说明其作者意图，网页应保留原始字节，不凭贴图外观补造对象。

## 地形、绘制和桥面碰撞

### 最终地面与绘制层

APK 的地形流程先将 TDM 转成背景和街道层，再按邻格进行背景/街道塑形，最后生成随机变体。网页不得把地图 tile、最终背景码、街道覆盖码混成一张贴图数组。M39 静态派生结果如下：

| 项目 | 派生结果 |
| --- | ---: |
| 地图背景命令 | 768格 |
| 道路命令 | 44格，其中 tiles_path 20、tiles_path_var 24 |
| 横桥资源命令 | tiles_bridge_hori 8 |
| 竖桥资源命令 | tiles_bridge_verti 11 |
| 桥墩命令 | 左、右各4 |
| 道路/桥命令合计 | 71 |
| 最终背景阻挡码格 | 308 |
| 由 raw 80/88 覆盖开放的阻挡格 | 19 |
| 覆盖后仍阻挡的背景格 | 289 |

横桥有4段、每段两个 raw 80 格：y=12, x=25–26；y=13, x=5–6；y=21, x=12–13、x=20–21。每段绘制一左一右桥墩。竖桥为四段 raw 88 连续区：x=10, y=2–4；x=20, y=3–5；x=28, y=8–9；x=16, y=17–19。map41 没有铁路，因此本图的道路命令由路径、桥面和桥墩组成。

桥资源的 APK mdpi 尺寸与既有网页绘制规格一致：

| 资源 | 图片尺寸 | 相对格绘制范围 |
| --- | ---: | --- |
| tiles_bridge_hori | 48×32 px | 1.5×1格，中心对齐单格，横向向两边各伸0.25格 |
| tiles_bridge_verti | 32×48 px | 1×1.5格，纵向向两端各伸0.25格 |
| tiles_bridge_pier_left/right | 各24×24 px | 单段横桥两端各一个桥墩 |

[wayne-waters-terrain-reference.json](../tests/fixtures/wayne-waters-terrain-reference.json) 保存完整最终背景码和24行阻挡视图。阻挡视图中 . 是底图可走，# 是底图阻挡，o 是被桥街道层覆盖后可走。其逐行结果为：

    ..............##............#...
    ..............##............###.
    ###....###o########.........###.
    ###...####o#########o###......#.
    ..#...####o#########o###......#.
    ..#######...##...###o######...#.
    ..#######........##...#####...#.
    ..#######.............#####...#.
    ..#####..................###o##.
    .....##....#########.....###o##.
    .....##..#############...##.....
    .....##..##############..##.....
    .....##..##############..oo.....
    .....oo.........######...##.....
    .....##..................##.....
    .....##..................##.....
    .....########.......#######.....
    .....###########o##########.....
    .....###########o##########.....
    .......#########o########.......
    ............##......##..........
    ............oo......oo..........
    ............##......##..........
    ............##......##..........

### 我方桥面实际行走范围

桥贴图伸出单格不代表它的全部可见像素都可走。APK 的玩家脚底锚点位于 TDM 格 (x+0.5,y+0.75)；碰撞框为 5068×4608 fine units，每格7680 units，相对锚点为左/右 −2534/+2534、上/下 −5376/−768。背景可达性检查碰撞框四角的底图与街道层。

当相邻地面是阻挡格且桥段本身由道路覆盖开放时：

- 横桥所在 TDM 行为 r，脚底锚点纵坐标的允许带为 [r+0.70, r+1.10) 格；相邻陆地可扩展连通区，不能仅凭桥标记范围断言整个区域边界。
- 竖桥所在 TDM 列为 c，脚底锚点横坐标的允许带约为 [c+0.3305, c+0.6695) 格；同样要结合上下端相邻地形计算整个可移动范围。
- 贴图、桥墩、敌方道路控制点和玩家四角碰撞分别是不同几何层。不要为了对齐贴图而平移路线或扩大/缩小 APK 的碰撞框。

上述是从 APK 碰撞框及地面四角判定静态推导的边界，不是本关 Android 实测。地图对象碰撞另由 GameObjectManager 的构造分支和对象自身碰撞框决定，见[我方桥面与地图对象碰撞审计](player-collision-audit.md)。

## 地图实体与对象阻挡

所有位置均来自 TDM 原始格，不用贴图包围盒代替对象碰撞框。普通静态装饰和大型物件按 APK 不同框处理；睡眠状态不会注销单位碰撞。完整共享框定义见[玩家碰撞审计](player-collision-audit.md)。

| raw marker | APK 对象 | 数量及位置 |
| ---: | --- | --- |
| 69 | Rocks A | 7：y0:x13；y8:x24；y9:x31；y14:x9；y17:x3；y22:x31；y23:x4 |
| 70 | Rocks B | 4：y0:x30；y15:x23；y18:x29；y20:x0 |
| 71 | Tree | 6：y1:x24；y3:x31；y5:x0；y14:x31；y21:x17；y22:x9 |
| 74 | Windmill | 1：(16,15) |
| 76 | Bush | 6：(29,3)、(3,4)、(9,5)、(5,19)、(27,20)、(18,23) |
| 78 | 未识别专属对象 | 9；保留 TDM 原码，不创建装饰碰撞框 |
| 112 | Saloon / pool spawn type 1 | 1：(29,12)；APK 建筑碰撞框 |
| 113 | Fort / pool spawn type 2 | 1：(2,12)；APK 大型 Fort 碰撞框 |
| 126 | Water rock decoration | 2：(13,10)、(18,13)；由 manager 中 raw 126 的直接比较分支创建 decoration type 20，绘制 e_1x1_rocks_water 并有普通装饰碰撞 |

raw 126 是重要的分支检查案例：createGameObjectsFromBasicMap() 先用直接 if-eq 检查十进制126（Smali常量 0x7e），再进入 packed-switch。该分支把 tile - 0x6a 作为装饰类型，因此得到 type 20。只查 packed-switch 表会误判它没有对象消费。

### 单位、炸药和 Steamer

| raw marker | 对象 | 数量及坐标 | APK 创建条件与接入语义 |
| ---: | --- | --- | --- |
| 96 | Gunslinger | 15：y1:x12,17,25；y7:x11,29；y8:x7,21；y13:x14,23；y15:x3,7；y16:x27；y19:x28；y20:x9,15 | 新局创建 activity 4 睡眠/招募单位。 |
| 97 | Mexican | 11：y1:x5,22；y5:x28；y8:x0,14；y9:x10；y10:x23；y13:x9；y21:x5,29；y22:x15 | 新局创建 activity 4；单位生成仍遵循来源建筑规则。 |
| 98 | Cannon | 9：y1:x8,20；y3:x4,25；y15:x30；y18:x2；y21:x18,25；y22:x10 | 新局创建 activity 4；Fort 是本图 Cannon pool 来源。 |
| 99 | Indian | 4：(1,1)、(21,6)、(8,11)、(0,16) | 新局创建 activity 4；本图没有 Tipi 生成建筑。 |
| 100 | Sniper | 1：(1,22) | activity 4；受全局 Sniper 解锁门控。 |
| 101 | Grandpa | 5：(27,1)、(2,9)、(12,13)、(31,18)、(27,23) | activity 4；受全局 Grandpa 解锁门控。 |
| 102 / 110 | Dynamite trigger / box | 各4：trigger (13,6)、(17,7)、(11,15)、(22,15)；box (12,5)、(18,6)、(11,17)、(22,17) | 新局且 Dynamite 已解锁时创建；数量不匹配时 APK 抛错。Trigger 逐个按距离平方选最近未分配箱，最近配对如上。 |
| 130 / 131 | Pyromaniac / Salesman | 各1：(18,16) / (9,6) | 特殊 activity 4 招募单位，分别按全局解锁状态创建。 |
| 120 / 121 / 123 | Steamer 组件输入 | 120@(11,11)；121@(13,11)、(14,11)；123@(15,11) | 由 createSteamerFromMap() 按原版组件规则展开为5个动态单位组件；不是静态地面装饰。 |

标准睡眠单位共45个，另有两个需要解锁的特殊招募 marker。APK 的 setUnitActivity(4) 改状态与图像，但单位对象仍注册到我方碰撞管理器；不应因“正在睡觉”让角色穿过它们。Water rock、建筑、Dynamite 和 Steamer 也不能只按画面矩形推断阻挡区域。

### 玩家单位池

GameDesignWaves.setWaves(i == 38) 包含两项 SpawnPoolManager.addActionForSpawnPool 调用，实际参数顺序和含义已追到 SpawnPoolManager.performActionsForWave()：

| 调用参数 | 发生波次 | 动作 | 四个 pool slot 的效果 |
| --- | ---: | --- | --- |
| (wave=1, action=1, 0,0,0,0) | Wave 1 | SET 当前池数量 | Gunslinger、Mexican、Cannon、Indian 均清零 |
| (wave=1, action=3, 3,3,3,3) | Wave 1 | SET_MAX | 四个单位池的最大数量均设为3 |

这两个动作都在第1波；第二个 1 是 action code 1（SET），第二个调用的 3 才是 action code 3（SET_MAX）。performActionsForWave() 读取储存的 wave 与 action 字段并区分当前数量和上限。不得把第二个调用错读成第3波。

建筑来源类型为 Saloon type 1、Fort type 2、Tipi type 3；单位池 slot 1–4 分别为 Gunslinger、Mexican、Cannon、Indian。Wayne Waters 有 Saloon 与 Fort，没有 Tipi，因此没有原版 Indian pool 的 Tipi 出生建筑。池动作是库存约束，不代表存在四种新局可招募入口，也不是初始地图角色清单。

## 参数和敌方波次

### 关卡参数

GameDesignData.gameDesignData[37] 对应 array_25，原始12项为：

    [250, 25, 999, 25000, 3, 30000, 5, 15, 56, 75, 100, 119000]

| Index | 原始值 | 已证实用途 |
| ---: | ---: | --- |
| 0 | 250 | 初始现金 $250 |
| 1 | 25 | 初始生命与生命上限 |
| 2 | 999 | 奖励箱总数限制 |
| 3 | 25,000 ms | 奖励箱间隔字段 |
| 4 | 3 | 最大升级级数 |
| 5 | 30,000 | 保留原始字段；本关额外效果尚未由消费链确认 |
| 6 | 5 | GunsAndGloryThread.onLoadGame() 写入特殊击杀反馈阈值字段 |
| 7 | 15 | 同时存在的奖励箱数量上限字段 |
| 8–10 | 56 / 75 / 100 | Easy / Medium / Hard 敌方 HP 百分比 |
| 11 | 119,000 ms | Gambler timer 字段；本图没有 Gambler/Casino，不因此创建对象 |

不要把 GameDesignData 的邻近数组行当成本关参数，也不要仅因 Gambler timer 非零就在地图上添加赌徒。

### 八波与十六条敌人请求

GameDesignWaves 的目标分支为 i == 38。共有8个 newWave、16个 addToWave。portrait 来自各波的 drawable 参数；时间单位毫秒，倍率为百分比。下表的8槽是普通敌人请求，Boss 和 Doc 是额外槽。短重载补零后，向量仍是“剩余请求数”，不代表固定出兵次序。

| Wave | 对白/头像 | 开始延迟 / HP / speed | action ID @ interval → 8个普通请求；Boss / Doc |
| ---: | --- | --- | --- |
| 1 | 01 / Captain | 15,000 / 115% / 120% | 2 @ 2,000 → [2,3,4,5,5,4,0,0]；0/0 |
| 2 | 02 / Pedro | 15,000 / 125% / 125% | 2 @ 2,000 → [1,3,4,5,4,3,2,0]；0/0 |
| 3 | 03 / Mexican | 15,000 / 135% / 130% | 2 @ 2,500 → [0,2,3,4,4,3,2,0]；3 @ 2,500 → [1,3,4,4,3,3,1,0]；0/0 |
| 4 | 04 / Settlers | 20,000 / 145% / 135% | 1 @ 2,500 → [1,3,4,5,4,3,2,0]；2 @ 2,500 → [1,3,4,4,3,3,1,0]；0/0 |
| 5 | 05 / Geezer | 20,000 / 160% / 140% | 0 @ 2,500 → [1,2,3,4,3,3,1,0]；1 @ 2,500 → [1,2,3,5,4,3,2,1]；0/0 |
| 6 | 06 / Gunslinger | 15,000 / 170% / 145% | 0 @ 2,500 → [1,2,4,4,3,4,1,0]；1 @ 2,500 → [0,2,3,4,4,3,2,1]；2 @ 2,500 → [0,2,3,4,3,4,1,1]；0/0 |
| 7 | 07 / Captain | 15,000 / 190% / 150% | 0 @ 2,500 → [0,1,3,3,4,4,2,1]；1 @ 2,500 → [0,1,3,3,4,3,2,2]；2 @ 2,500 → [0,1,3,3,4,4,2,2]；3 @ 2,500 → [0,1,3,3,4,4,2,1]；0/0 |
| 8 | 08 / Boss | 25,000 / 190% / 155% | 2 @ 50,000 → [0,0,0,0,0,0,0,0]；1/0 |

action ID 是 WaveManager 请求中指定的敌方出生 action，不是单位类型或关卡波次编号。它必须通过本图四个 raw 40–43 出生点映射到网页 spawnPointId；不能直接当行优先下标。

## 标题、对白、头像和音频

APK T_LEVEL_NAME_41 为 “Wayne Waters”；T_LEVEL_INFO_41 原文为 “The swimming lake of Wayne Waters is perfect for splashing and diving for gold.”

| Wave | APK dialogue key | APK 英文文本 | 头像 |
| ---: | --- | --- | --- |
| 1 | T_CAMPAIGN_38_01 | There's a beautiful view on this rough sea! Show me some settlers and I'll make my calliopes glow! | portrait_captain |
| 2 | T_CAMPAIGN_38_02 | You're talking about a rough sea, when your ship ran aground in a small pond? | portrait_pedro |
| 3 | T_CAMPAIGN_38_03 | Here come some guests from the north-east! I bet they want to splash around in our pond! | portrait_mexican |
| 4 | T_CAMPAIGN_38_04 | Honey, look! There's a swimming pool ahead! Just for us! | portrait_settlers |
| 5 | T_CAMPAIGN_38_05 | Hm, those female settlers from the west get more beautiful every day! Well, well, If I only was younger… | oregon_dakota_portrait_geezer |
| 6 | T_CAMPAIGN_38_06 | When you still were young, Pa, the grandmothers of those settlers weren't even born! | oregon_dakota_portrait_geezer |
| 7 | T_CAMPAIGN_38_07 | Sailors, load the cannons! We have visitors from all directions! | portrait_gunslinger |
| 8 | T_CAMPAIGN_38_08 | Go on with your swim, bandits, I'll hightail out of here in the meantime! | oregon_dakota_portrait_boss |

Dakota pack 的 ambient resource 是 music_atmo_snow；战斗循环数组是 [music_dakota, music_loop2, music_loop3]，按 Dakota 的 getNextLoop() 波次索引轮换。上述 OGG 均已存在网页本地资源目录，但本次未加载或播放。页面接入时仍需核对该关的对白/头像预载、环境音乐和波次切换路由；默认验收保持静音。

## 网页接入点和实现边界

当前正式内容以 dakota-07 为 Level 37 Frost Station。Level 38 仅有 campaign-catalog.ts 的标题/地图编号，不等于已注册可玩内容。集成 Wayne Waters 时须追踪以下独立消费者：

- 内容模块：身份、TDM JSON、路线、地形/场景、单位与对象、规则、波次、双语 copy、头像、音乐、内容版本和正式 campaign builder。
- src/main.ts：新局/回放场景分派、地图预览 builder 与缩略图、标题/说明、Dakota HUD 标签、对白、头像资源预载、环境/战斗音乐、结算与回放导入/导出。
- src/bootstrap/browser.ts：内容版本解析、场景内容 registry、档案驱动的 replay factory。
- src/content/official-campaign.ts、campaign-catalog.ts 和进度 fixture：正式关卡解锁、总数和 Dakota 区完成数、地图选择状态。
- 启动资源收集器、历史关卡/E2E fixture、Free Play 边界与本地化消息。

下一轮实现必须在新增内容前再搜一次当前代码消费点；不能沿用旧计划中的行号或旧 registry 摘录。已有本地图集、桥图、Portrait 和背景/战斗音乐可以优先复用；素材文件存在本身不代表场景已正确加载或运行时触发正确。

## 尚存未知项和静态结论边界

| 项目 | 状态 | 对实现的影响 |
| --- | --- | --- |
| raw 78 的作者意图 | 未知；未发现对象/街道专属分支，背景走默认码 | 保留 raw 值，不造实体；不阻塞关卡接入 |
| 地图最终碰撞图及路线 | 已由 APK 转换和方向规则静态派生；路线边集与 REA 派生图逐项一致 | 可建立独立 fixture 并对照网页内容，不需要 Android 观察 |
| 贴图随机选择 | APK 使用运行时随机；固定种子参考只保证可重复合法派生 | 实现验收检查图集、source rect、目的矩形及层序；不声称逐次贴图序列完全一致 |
| Android 实机像素和音频表现 | 本轮未观察/播放 | 只有网页静态资源映射仍存在具体无法解释的差异时，才设计定点观察；目前不是阻塞项 |
| 网页真正可玩 | 尚未接入 | 实现后再以真实 GameSession、浏览器正式/Free Play 入口及回放工厂验收 |

## 审计门槛结论

- APK 身份、地图文件号、参数行、波次条件、字符串编号已分别从实际消费链闭合。
- TDM 原始 marker、52条边/6条路径、最终背景、桥覆盖、对象/单位坐标、参数、波次、pool 动作、对白/头像和离线音频资源均有可追溯证据。
- 唯一未解释 marker 是 raw 78 的作者意图；其默认背景和无静态碰撞分支已确定，未知意图不会影响安全实现。
- APK 静态证据足以进入 Wayne Waters 网页实现。无需启动 Android、无需完整通关；网页绘制、短时规则/碰撞和真实菜单入口由后续切片验收。
