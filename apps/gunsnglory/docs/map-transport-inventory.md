# 正式关卡交通实体清单

## 范围与结论

本清单只覆盖 `officialCampaignStages` 中已接入的正式关卡 Level 1–41。Level 42–60 不在范围内。

- 从正式 `GameSession` 初始 `units` 清点到 **27/41 关**有地图摆放的火车或蒸汽船，共 **48 个运输组、238 个部件**（火车 148 件、蒸汽船 90 件）。其余 14 关没有在关卡初始单位中生成 `train-*` 或 `steamer-*`；这不表示这些关没有敌方运输车。
- 41/41 关的正式战役波次数据都有至少一种敌方运输组请求。41 关原始波次数据合计 **2,012 个 covered-wagon 组请求、1,046 个 stagecoach 组请求、418 个 gold-transport 组请求**。这是 APK 派生波次数组中的请求数，不等于某次动态难度对局实际生成的敌人数或画面帧数。
- 该盘点关闭 M3-A 的存在性分类，不关闭移动、组距、岔路、阻挡等待、端点停止或贴图绘制验证；这些由 M3-B–D 继续处理。

## 判定依据

### 地图摆放的火车与蒸汽船

清点方法是用 `createBrowserGame(officialCampaignStages.map(...))` 创建正式战役内容，再以固定随机种子打开每关 `GameSession`，通过 `observe().units` 按 `movementGroupId` 分组。未推进模拟，不清波次，也没有把敌方波次运输车混入静态地图单位清单。

| 实体 | TDM 与运行时构造 | 组内部件代码 |
| --- | --- | --- |
| 横向火车 | TDM raw `83/84`；[位置解析](../src/content/campaign-map-unit-placements.ts)与[火车单位构造](../src/content/campaign-train-units.ts) | `train-10`、`train-11` 两节机车，后接一个或多个 `train-12` 车厢 |
| 纵向火车 | TDM raw `91/92/93`；[位置解析](../src/content/campaign-map-unit-placements.ts)与[火车单位构造](../src/content/campaign-train-units.ts) | 一个或多个 `train-22` 车厢，接 `train-20`、`train-21` 两节机车 |
| 蒸汽船 | TDM raw `120–123`；以 raw `120` 开始扫描，在地图专属 `*-steamer.ts` / `*-units.ts` 中生成组 | `steamer-30/31/32/33` 分别映射到 `steamboat_1/2/3/4a`（尾段可按位置切换 `4a/4b/4c`）；raw `121/122` 保留 `steamer-32` 的休眠/活动状态 |

坐标均为 TDM 格坐标，范围端点包含在内。`H(x1–x2,y)` 表示位于横向铁轨 y 的组，`V(x,y1–y2)` 表示位于纵向铁轨 x 的组，`S(x1–x2,y)` 表示位于水面横向移动的蒸汽船组。每个范围中的格子对应一个部件；组内实际部件代码按上表展开。

### 战役波次运输请求

波次数组的 `requests[i]` 对应运行时 `poolType = i + 2`。因此 `requests[5]`、`[6]`、`[7]` 分别请求 pool type 7、8、9：代码中的 covered-wagon pair、postcoach pair、gold transport。covered-wagon 组由 `spawnCoveredWagonPair()` 生成 type 8 的 `horse_wagon` / `horse_wagon_white` 牵引马精灵与 type 4 的 wagon 车体；代码入口见 [`game/index.ts`](../src/game/index.ts)。

下表 `C/P/G` 分别代表 covered-wagon、stagecoach、gold-transport 组请求，是正式波次定义中 `requests[5]/[6]/[7]` 的原始请求总数。游戏会按动态难度缩放运行时请求数；表中数字不承诺每局都会显示相同数量。表中“无”仅指没有地图摆放的火车/蒸汽船，波次请求仍独立列出。

## Level 1–41 明细

| Level | 地图摆放的运输组与初始格 | 波次请求 C/P/G | TDM 与波次来源 |
| ---: | --- | ---: | --- |
| 1 · Cow Gulch | 无 | 23/0/0 | [地图](../src/content/cow-gulch.json) · [波次](../src/content/cow-gulch-campaign-waves.ts) |
| 2 · Apache Valley | 无 | 83/0/0 | [地图](../src/content/new-mexico-02.json) · [波次](../src/content/apache-valley-waves.ts) |
| 3 · Fort Kaboom | 无 | 56/58/0 | [地图](../src/content/new-mexico-03.json) · [波次](../src/content/fort-kaboom-waves.ts) |
| 4 · Tech Town | H(4–8,12) · 5 件 | 44/30/11 | [地图](../src/content/new-mexico-04.json) · [波次](../src/content/tech-town-campaign-waves.ts) |
| 5 · Billy Hills | H(9–15,22) · 7 件 | 28/32/17 | [地图](../src/content/new-mexico-05.json) · [波次](../src/content/billy-hills-campaign-waves.ts) |
| 6 · Murdock Mountains | 无 | 47/20/11 | [地图](../src/content/new-mexico-06.json) · [波次](../src/content/murdock-mountains-campaign-waves.ts) |
| 7 · Lucky Lake | V(7,10–16) · 7 件 | 58/31/17 | [地图](../src/content/new-mexico-07.json) · [波次](../src/content/lucky-lake-campaign-waves.ts) |
| 8 · Cactusville | V(11,8–12) · 5 件 | 39/21/13 | [地图](../src/content/new-mexico-08.json) · [波次](../src/content/cactusville-campaign-waves.ts) |
| 9 · Railroad Ranch | H(17–20,3) · 4 件；H(13–17,10) · 5 件；V(2,11–14) · 4 件；V(24,13–16) · 4 件；V(7,14–17) · 4 件；H(16–19,17) · 4 件 | 28/8/3 | [地图](../src/content/new-mexico-09.json) · [波次](../src/content/railroad-ranch-campaign-waves.ts) |
| 10 · Lost City | H(4–8,11) · 5 件；H(21–25,11) · 5 件 | 81/46/31 | [地图](../src/content/new-mexico-10.json) · [波次](../src/content/lost-city-campaign-waves.ts) |
| 11 · Traveller's Town | H(3–6,18) · 4 件；H(26–28,18) · 3 件；S(7–10,22) · 4 件 | 42/22/0 | [地图](../src/content/mississippi-11.json) · [波次](../src/content/mississippi-11-campaign-waves.ts) |
| 12 · Steam Valley | S(15–20,3) · 6 件；S(9–13,4) · 5 件；S(2–6,19) · 5 件；S(20–25,20) · 6 件 | 35/18/0 | [地图](../src/content/mississippi-12.json) · [波次](../src/content/mississippi-12-campaign-waves.ts) |
| 13 · Golden River | S(2–7,11) · 6 件；S(20–25,12) · 6 件 | 0/0/48 | [地图](../src/content/mississippi-13.json) · [波次](../src/content/mississippi-13-campaign-waves.ts) |
| 14 · Riverside Mountains | S(2–6,13) · 5 件；S(22–26,14) · 5 件 | 53/28/12 | [地图](../src/content/mississippi-14.json) · [波次](../src/content/mississippi-14-campaign-waves.ts) |
| 15 · Railroad Canyon | H(3–5,6) · 3 件；V(11,12–17) · 6 件；H(22–27,12) · 6 件；S(19–24,22) · 6 件 | 93/51/18 | [地图](../src/content/mississippi-15.json) · [波次](../src/content/mississippi-15-campaign-waves.ts) |
| 16 · Highpoint Terrace | S(9–15,22) · 7 件 | 85/37/12 | [地图](../src/content/mississippi-16.json) · [波次](../src/content/mississippi-16-campaign-waves.ts) |
| 17 · Dead Rocks | 无 | 75/32/6 | [地图](../src/content/mississippi-17.json) · [波次](../src/content/mississippi-17-campaign-waves.ts) |
| 18 · Shadow Town | 无 | 96/28/6 | [地图](../src/content/mississippi-18.json) · [波次](../src/content/mississippi-18-campaign-waves.ts) |
| 19 · Dust Falls | 无 | 63/24/4 | [地图](../src/content/mississippi-19.json) · [波次](../src/content/mississippi-19-campaign-waves.ts) |
| 20 · Horse Hills | S(12–17,3) · 6 件 | 48/36/6 | [地图](../src/content/mississippi-20.json) · [波次](../src/content/mississippi-20-campaign-waves.ts) |
| 21 · Eastwood Forest | 无 | 32/18/1 | [地图](../src/content/oregon-01.json) · [波次](../src/content/oregon-01-campaign-waves.ts) |
| 22 · Cashcow Canyon | V(13,16–18) · 3 件 | 35/12/4 | [地图](../src/content/oregon-02.json) · [波次](../src/content/oregon-02-campaign-waves.ts) |
| 23 · Chinook Woods | V(15,3–7) · 5 件 | 21/15/5 | [地图](../src/content/oregon-03.json) · [波次](../src/content/oregon-03-campaign-waves.ts) |
| 24 · Fort Echo | 无 | 40/20/11 | [地图](../src/content/oregon-04.json) · [波次](../src/content/oregon-04-campaign-waves.ts) |
| 25 · Dynamite Plains | 无 | 10/6/8 | [地图](../src/content/oregon-05.json) · [波次](../src/content/oregon-05-campaign-waves.ts) |
| 26 · Columbia River | S(2–5,11) · 4 件 | 42/28/13 | [地图](../src/content/oregon-06.json) · [波次](../src/content/oregon-06-campaign-waves.ts) |
| 27 · Mount Hood | H(15–19,7) · 5 件；H(6–10,18) · 5 件 | 51/22/4 | [地图](../src/content/oregon-07.json) · [波次](../src/content/oregon-07-campaign-waves.ts) |
| 28 · Colt City | H(1–4,18) · 4 件 | 45/22/6 | [地图](../src/content/oregon-08.json) · [波次](../src/content/oregon-08-campaign-waves.ts) |
| 29 · Snake River | S(24–27,2) · 4 件 | 20/10/3 | [地图](../src/content/oregon-09.json) · [波次](../src/content/oregon-09-campaign-waves.ts) |
| 30 · Lumber Mill Hills | H(7–11,22) · 5 件 | 51/29/9 | [地图](../src/content/oregon-10.json) · [波次](../src/content/oregon-10-campaign-waves.ts) |
| 31 · Loot Lakes | 无 | 53/30/10 | [地图](../src/content/oregon-11.json) · [波次](../src/content/oregon-11-campaign-waves.ts) |
| 32 · Six Grandfathers | H(10–15,21) · 6 件 | 32/19/15 | [地图](../src/content/dakota-02.json) · [波次](../src/content/dakota-02-campaign-waves.ts) |
| 33 · Fort Knockout | 无 | 63/38/18 | [地图](../src/content/dakota-03.json) · [波次](../src/content/dakota-03-campaign-waves.ts) |
| 34 · Badlands | V(2,3–6) · 4 件 | 36/28/17 | [地图](../src/content/dakota-04.json) · [波次](../src/content/dakota-04-campaign-waves.ts) |
| 35 · Ghost Town | H(5–9,1) · 5 件；S(3–7,11) · 5 件 | 61/27/7 | [地图](../src/content/dakota-05.json) · [波次](../src/content/dakota-05-campaign-waves.ts) |
| 36 · Ice Rocks | 无 | 42/19/9 | [地图](../src/content/dakota-06.json) · [波次](../src/content/dakota-06-campaign-waves.ts) |
| 37 · Frost Station | H(10–14,1) · 5 件；H(6–10,7) · 5 件；H(18–22,13) · 5 件；H(6–10,21) · 5 件 | 57/33/6 | [地图](../src/content/dakota-07.json) · [波次](../src/content/dakota-07-campaign-waves.ts) |
| 38 · Wayne Waters | S(11–15,11) · 5 件 | 51/23/9 | [地图](../src/content/dakota-08.json) · [波次](../src/content/dakota-08-campaign-waves.ts) |
| 39 · Snow Town | H(9–13,6) · 5 件 | 39/21/13 | [地图](../src/content/dakota-09.json) · [波次](../src/content/dakota-09-campaign-waves.ts) |
| 40 · Sioux Falls | S(14–18,20) · 5 件 | 86/64/20 | [地图](../src/content/dakota-10.json) · [波次](../src/content/dakota-10-campaign-waves.ts) |
| 41 · Labyrinth Gulch | 无 | 68/40/15 | [地图](../src/content/nevada-01.json) · [波次](../src/content/nevada-01-campaign-waves.ts) |

## 后续验证边界

- 现有 `official-wagon-route-matrix.test.ts` 只抽查 Billy Hills、Cactusville、Lucky Lake、Lost City、Railroad Ranch 五关的正式岔路；Fort Kaboom 另有 Wave 3 车辆跟随与分叉回归。它们不能代表 41 关所有波次或路线。
- 火车与蒸汽船有地图专项测试，但该测试集合仍需按本清单的 48 个运输组核对缺口；M3-B 会逐组登记已有行为证据，只给缺口补短确定性会话。
- 生产 Canvas 的部件绘制、脚底锚点和层级排序属于 M3-D。启动单位清单和资源图集只能证明对象构成，不能证明运行画面中车马没有分离、船车没有错层。
- 不对“无地图摆放运输组”的关卡推断整关不含运输车；这些关的正式波次数据仍含敌方运输请求。也不把波次原始请求总数当成截图中应同时出现的实体数量。
