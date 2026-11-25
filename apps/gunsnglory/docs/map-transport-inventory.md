# 正式关卡交通实体清单

## 范围与结论

本清单只覆盖 `officialCampaignStages` 中已接入的正式关卡 Level 1–41。Level 42–60 不在范围内。

- 从正式 `GameSession` 初始 `units` 清点到 **27/41 关**有地图摆放的火车或蒸汽船，共 **48 个运输组、238 个部件**（火车 148 件、蒸汽船 90 件）。其余 14 关没有在关卡初始单位中生成 `train-*` 或 `steamer-*`；这不表示这些关没有敌方运输车。
- 41/41 关的正式战役波次数据都有至少一种敌方运输组请求。41 关原始波次数据合计 **2,012 个 covered-wagon 组请求、1,046 个 stagecoach 组请求、418 个 gold-transport 组请求**。这是 APK 派生波次数组中的请求数，不等于某次动态难度对局实际生成的敌人数或画面帧数。
- M3-A 已关闭存在性分类。M3-B 建立的初始基线为 18/48 个运输组有直接移动会话测试；M3-C1 与 C2 分别补齐 22 个火车组和 8 个蒸汽船组，目前 48/48 个静态运输组均有正式地图移动会话（火车 31/31、蒸汽船 17/17）。M3-C3 已为全部地区补齐182/182个正式分叉组合的同组跟随短会话。这些测试不等于所有端点、交叉阻挡或生产画面都已验证。

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

下表 `C/P/G` 分别代表 covered-wagon、stagecoach、gold-transport 组请求，是正式波次定义中 `requests[5]/[6]/[7]` 的原始请求总数。游戏会按动态难度缩放运行时请求数；表中数字不承诺每局都会显示相同数量。`地图组移动测试` 的 `n/m` 表示该关 m 个地图摆放运输组中，n 个有直接推进正式地图 `GameSession` 并检查组移动的测试；单位静态摆放、碰撞测试和敌方波次运输测试不计入。`无静态组` 表示初始地图没有火车/蒸汽船。表中“无”仅指没有地图摆放的火车/蒸汽船，波次请求仍独立列出。

## Level 1–41 明细

| Level | 地图摆放的运输组与初始格 | 波次请求 C/P/G | 地图组移动测试 | TDM 与波次来源 |
| ---: | --- | ---: | ---: | --- |
| 1 · Cow Gulch | 无 | 23/0/0 | 无静态组 | [地图](../src/content/cow-gulch.json) · [波次](../src/content/cow-gulch-campaign-waves.ts) |
| 2 · Apache Valley | 无 | 83/0/0 | 无静态组 | [地图](../src/content/new-mexico-02.json) · [波次](../src/content/apache-valley-waves.ts) |
| 3 · Fort Kaboom | 无 | 56/58/0 | 无静态组 | [地图](../src/content/new-mexico-03.json) · [波次](../src/content/fort-kaboom-waves.ts) |
| 4 · Tech Town | H(4–8,12) · 5 件 | 44/30/11 | 1/1 | [地图](../src/content/new-mexico-04.json) · [波次](../src/content/tech-town-campaign-waves.ts) |
| 5 · Billy Hills | H(9–15,22) · 7 件 | 28/32/17 | 1/1 | [地图](../src/content/new-mexico-05.json) · [波次](../src/content/billy-hills-campaign-waves.ts) |
| 6 · Murdock Mountains | 无 | 47/20/11 | 无静态组 | [地图](../src/content/new-mexico-06.json) · [波次](../src/content/murdock-mountains-campaign-waves.ts) |
| 7 · Lucky Lake | V(7,10–16) · 7 件 | 58/31/17 | 1/1 | [地图](../src/content/new-mexico-07.json) · [波次](../src/content/lucky-lake-campaign-waves.ts) |
| 8 · Cactusville | V(11,8–12) · 5 件 | 39/21/13 | 1/1 | [地图](../src/content/new-mexico-08.json) · [波次](../src/content/cactusville-campaign-waves.ts) |
| 9 · Railroad Ranch | H(17–20,3) · 4 件；H(13–17,10) · 5 件；V(2,11–14) · 4 件；V(24,13–16) · 4 件；V(7,14–17) · 4 件；H(16–19,17) · 4 件 | 28/8/3 | 6/6 | [地图](../src/content/new-mexico-09.json) · [波次](../src/content/railroad-ranch-campaign-waves.ts) |
| 10 · Lost City | H(4–8,11) · 5 件；H(21–25,11) · 5 件 | 81/46/31 | 2/2 | [地图](../src/content/new-mexico-10.json) · [波次](../src/content/lost-city-campaign-waves.ts) |
| 11 · Traveller's Town | H(3–6,18) · 4 件；H(26–28,18) · 3 件；S(7–10,22) · 4 件 | 42/22/0 | 3/3 | [地图](../src/content/mississippi-11.json) · [波次](../src/content/mississippi-11-campaign-waves.ts) |
| 12 · Steam Valley | S(15–20,3) · 6 件；S(9–13,4) · 5 件；S(2–6,19) · 5 件；S(20–25,20) · 6 件 | 35/18/0 | 4/4 | [地图](../src/content/mississippi-12.json) · [波次](../src/content/mississippi-12-campaign-waves.ts) |
| 13 · Golden River | S(2–7,11) · 6 件；S(20–25,12) · 6 件 | 0/0/48 | 2/2 | [地图](../src/content/mississippi-13.json) · [波次](../src/content/mississippi-13-campaign-waves.ts) |
| 14 · Riverside Mountains | S(2–6,13) · 5 件；S(22–26,14) · 5 件 | 53/28/12 | 2/2 | [地图](../src/content/mississippi-14.json) · [波次](../src/content/mississippi-14-campaign-waves.ts) |
| 15 · Railroad Canyon | H(3–5,6) · 3 件；V(11,12–17) · 6 件；H(22–27,12) · 6 件；S(19–24,22) · 6 件 | 93/51/18 | 4/4 | [地图](../src/content/mississippi-15.json) · [波次](../src/content/mississippi-15-campaign-waves.ts) |
| 16 · Highpoint Terrace | S(9–15,22) · 7 件 | 85/37/12 | 1/1 | [地图](../src/content/mississippi-16.json) · [波次](../src/content/mississippi-16-campaign-waves.ts) |
| 17 · Dead Rocks | 无 | 75/32/6 | 无静态组 | [地图](../src/content/mississippi-17.json) · [波次](../src/content/mississippi-17-campaign-waves.ts) |
| 18 · Shadow Town | 无 | 96/28/6 | 无静态组 | [地图](../src/content/mississippi-18.json) · [波次](../src/content/mississippi-18-campaign-waves.ts) |
| 19 · Dust Falls | 无 | 63/24/4 | 无静态组 | [地图](../src/content/mississippi-19.json) · [波次](../src/content/mississippi-19-campaign-waves.ts) |
| 20 · Horse Hills | S(12–17,3) · 6 件 | 48/36/6 | 1/1 | [地图](../src/content/mississippi-20.json) · [波次](../src/content/mississippi-20-campaign-waves.ts) |
| 21 · Eastwood Forest | 无 | 32/18/1 | 无静态组 | [地图](../src/content/oregon-01.json) · [波次](../src/content/oregon-01-campaign-waves.ts) |
| 22 · Cashcow Canyon | V(13,16–18) · 3 件 | 35/12/4 | 1/1 | [地图](../src/content/oregon-02.json) · [波次](../src/content/oregon-02-campaign-waves.ts) |
| 23 · Chinook Woods | V(15,3–7) · 5 件 | 21/15/5 | 1/1 | [地图](../src/content/oregon-03.json) · [波次](../src/content/oregon-03-campaign-waves.ts) |
| 24 · Fort Echo | 无 | 40/20/11 | 无静态组 | [地图](../src/content/oregon-04.json) · [波次](../src/content/oregon-04-campaign-waves.ts) |
| 25 · Dynamite Plains | 无 | 10/6/8 | 无静态组 | [地图](../src/content/oregon-05.json) · [波次](../src/content/oregon-05-campaign-waves.ts) |
| 26 · Columbia River | S(2–5,11) · 4 件 | 42/28/13 | 1/1 | [地图](../src/content/oregon-06.json) · [波次](../src/content/oregon-06-campaign-waves.ts) |
| 27 · Mount Hood | H(15–19,7) · 5 件；H(6–10,18) · 5 件 | 51/22/4 | 2/2 | [地图](../src/content/oregon-07.json) · [波次](../src/content/oregon-07-campaign-waves.ts) |
| 28 · Colt City | H(1–4,18) · 4 件 | 45/22/6 | 1/1 | [地图](../src/content/oregon-08.json) · [波次](../src/content/oregon-08-campaign-waves.ts) |
| 29 · Snake River | S(24–27,2) · 4 件 | 20/10/3 | 1/1 | [地图](../src/content/oregon-09.json) · [波次](../src/content/oregon-09-campaign-waves.ts) |
| 30 · Lumber Mill Hills | H(7–11,22) · 5 件 | 51/29/9 | 1/1 | [地图](../src/content/oregon-10.json) · [波次](../src/content/oregon-10-campaign-waves.ts) |
| 31 · Loot Lakes | 无 | 53/30/10 | 无静态组 | [地图](../src/content/oregon-11.json) · [波次](../src/content/oregon-11-campaign-waves.ts) |
| 32 · Six Grandfathers | H(10–15,21) · 6 件 | 32/19/15 | 1/1 | [地图](../src/content/dakota-02.json) · [波次](../src/content/dakota-02-campaign-waves.ts) |
| 33 · Fort Knockout | 无 | 63/38/18 | 无静态组 | [地图](../src/content/dakota-03.json) · [波次](../src/content/dakota-03-campaign-waves.ts) |
| 34 · Badlands | V(2,3–6) · 4 件 | 36/28/17 | 1/1 | [地图](../src/content/dakota-04.json) · [波次](../src/content/dakota-04-campaign-waves.ts) |
| 35 · Ghost Town | H(5–9,1) · 5 件；S(3–7,11) · 5 件 | 61/27/7 | 2/2 | [地图](../src/content/dakota-05.json) · [波次](../src/content/dakota-05-campaign-waves.ts) |
| 36 · Ice Rocks | 无 | 42/19/9 | 无静态组 | [地图](../src/content/dakota-06.json) · [波次](../src/content/dakota-06-campaign-waves.ts) |
| 37 · Frost Station | H(10–14,1) · 5 件；H(6–10,7) · 5 件；H(18–22,13) · 5 件；H(6–10,21) · 5 件 | 57/33/6 | 4/4 | [地图](../src/content/dakota-07.json) · [波次](../src/content/dakota-07-campaign-waves.ts) |
| 38 · Wayne Waters | S(11–15,11) · 5 件 | 51/23/9 | 1/1 | [地图](../src/content/dakota-08.json) · [波次](../src/content/dakota-08-campaign-waves.ts) |
| 39 · Snow Town | H(9–13,6) · 5 件 | 39/21/13 | 1/1 | [地图](../src/content/dakota-09.json) · [波次](../src/content/dakota-09-campaign-waves.ts) |
| 40 · Sioux Falls | S(14–18,20) · 5 件 | 86/64/20 | 1/1 | [地图](../src/content/dakota-10.json) · [波次](../src/content/dakota-10-campaign-waves.ts) |
| 41 · Labyrinth Gulch | 无 | 68/40/15 | 无静态组 | [地图](../src/content/nevada-01.json) · [波次](../src/content/nevada-01-campaign-waves.ts) |

## 地图组移动行为测试覆盖

本节按测试断言列当前覆盖范围；M3-B 建立的原始覆盖基线是 18/48，M3-C1/C2 随后分别为 22 个火车组和 8 个蒸汽船组补上正式短会话，目前覆盖 48/48 个地图运输组。静态构成断言不计作移动行为证据。

| 关卡 | 直接移动测试 | 覆盖范围 |
| --- | --- | --- |
| Level 4 · Tech Town | [tech-town-train](../tests/tech-town-train.test.ts) | 1/1 火车组；验证组内同速移动和两端缓冲停止 |
| Level 5 · Billy Hills | [billy-hills-map](../tests/billy-hills-map.test.ts) | 1/1 火车组；验证七节列车保持原始组距 |
| Level 7 · Lucky Lake | [lucky-lake-vertical-train](../tests/lucky-lake-vertical-train.test.ts) | 1/1 火车组；验证纵向移动、阻挡格和地图边界停止 |
| Level 8 · Cactusville | [official-static-train-movement](../tests/official-static-train-movement.test.ts) | 1/1 火车组；验证正式地图移动、轨道轴、组内同步和组距 |
| Level 9 · Railroad Ranch | [official-static-train-movement](../tests/official-static-train-movement.test.ts) | 6/6 火车组；逐组验证正式地图移动、轨道轴、组内同步和组距 |
| Level 10 · Lost City | [official-static-train-movement](../tests/official-static-train-movement.test.ts) | 2/2 火车组；逐组验证正式地图移动、轨道轴、组内同步和组距 |
| Level 11 · Traveller's Town | [mississippi-11-trains](../tests/mississippi-11-trains.test.ts)、[mississippi-11-steamer](../tests/mississippi-11-steamer.test.ts) | 2/2 火车组、1/1 蒸汽船组；包括火车独立移动、列车缓冲和蒸汽船水路移动 |
| Level 12 · Steam Valley | [mississippi-12-steamer](../tests/mississippi-12-steamer.test.ts) | 4/4 蒸汽船组；逐组验证横向移动 |
| Level 13 · Golden River | [official-static-steamer-movement](../tests/official-static-steamer-movement.test.ts) | 2/2 蒸汽船组；逐组验证水面移动、航道、组内同步和组距 |
| Level 14 · Riverside Mountains | [mississippi-14-entities](../tests/mississippi-14-entities.test.ts) | 2/2 蒸汽船组；逐组验证水路移动 |
| Level 15 · Railroad Canyon | [official-static-train-movement](../tests/official-static-train-movement.test.ts)、[official-static-steamer-movement](../tests/official-static-steamer-movement.test.ts) | 4/4 运输组；3 个火车组、1 个蒸汽船组均有直接移动断言 |
| Level 16 · Highpoint Terrace | [official-static-steamer-movement](../tests/official-static-steamer-movement.test.ts) | 1/1 蒸汽船组；验证水面移动、航道、组内同步和组距 |
| Level 20 · Horse Hills | [official-static-steamer-movement](../tests/official-static-steamer-movement.test.ts) | 1/1 蒸汽船组；验证水面移动、航道、组内同步和组距 |
| Level 22 · Cashcow Canyon | [official-static-train-movement](../tests/official-static-train-movement.test.ts) | 1/1 火车组；验证正式地图移动、轨道轴、组内同步和组距 |
| Level 23 · Chinook Woods | [official-static-train-movement](../tests/official-static-train-movement.test.ts) | 1/1 火车组；验证正式地图移动、轨道轴、组内同步和组距 |
| Level 26 · Columbia River | [official-static-steamer-movement](../tests/official-static-steamer-movement.test.ts) | 1/1 蒸汽船组；验证水面移动、航道、组内同步和组距 |
| Level 27 · Mount Hood | [oregon-07-map-entities](../tests/oregon-07-map-entities.test.ts)、[official-static-train-movement](../tests/official-static-train-movement.test.ts) | 2/2 火车组；两组均有直接移动断言，并验证独立控制与组距 |
| Level 28 · Colt City | [official-static-train-movement](../tests/official-static-train-movement.test.ts) | 1/1 火车组；验证正式地图移动、轨道轴、组内同步和组距 |
| Level 29 · Snake River | [official-static-steamer-movement](../tests/official-static-steamer-movement.test.ts) | 1/1 蒸汽船组；验证水面移动、航道、组内同步和组距 |
| Level 30 · Lumber Mill Hills | [official-static-train-movement](../tests/official-static-train-movement.test.ts) | 1/1 火车组；验证正式地图移动、轨道轴、组内同步和组距 |
| Level 32 · Six Grandfathers | [official-static-train-movement](../tests/official-static-train-movement.test.ts) | 1/1 火车组；验证正式地图移动、轨道轴、组内同步和组距 |
| Level 34 · Badlands | [official-static-train-movement](../tests/official-static-train-movement.test.ts) | 1/1 火车组；验证正式地图移动、轨道轴、组内同步和组距 |
| Level 35 · Ghost Town | [dakota-05-trains](../tests/dakota-05-trains.test.ts)、[dakota-05-steamer](../tests/dakota-05-steamer.test.ts) | 1/1 火车组、1/1 蒸汽船组；列车缓冲、船体从 raw126 岸岩旁通过及地图边界停止；raw126 不与船体碰撞框相交，不算水岸阻挡 |
| Level 37 · Frost Station | [dakota-07-trains](../tests/dakota-07-trains.test.ts)、[official-static-train-movement](../tests/official-static-train-movement.test.ts) | 4/4 火车组；逐组直接检查移动，另有第一组 raw87 端部阻挡断言 |
| Level 38 · Wayne Waters | [dakota-08-steamer](../tests/dakota-08-steamer.test.ts) | 1/1 蒸汽船组；验证水路移动 |
| Level 39 · Snow Town | [dakota-09-units](../tests/dakota-09-units.test.ts) | 1/1 火车组；验证组移动和原始右端缓冲 |
| Level 40 · Sioux Falls | [official-static-steamer-movement](../tests/official-static-steamer-movement.test.ts) | 1/1 蒸汽船组；验证水面移动、航道、组内同步和组距 |

统计结果为 48/48 个静态地图组，其中火车 31/31、蒸汽船 17/17。此覆盖限于至少一个无阻挡方向上的组移动、组内同步及构件间距；特定端点、交叉阻挡、等待行为与生产绘制仍分别按后续任务核对。

## 敌方车马分叉覆盖审计

初步枚举所有 41 个正式关卡的 `campaignWaves`、出生点和 `previewWave.routes`：750 个波次/出生点请求项去重后为 **294 个关卡/出生点/车辆类型组合**；其中 **182 个组合**至少一条官方路线经过 TDM 多向字段（raw 56–65）。此处“车辆类型”区分 covered-wagon 与 stagecoach；不含 gold-transport。该枚举已由[覆盖审计测试](../tests/official-wagon-route-coverage.test.ts)及[测试辅助器](../tests/helpers/official-wagon-route-coverage.ts)固化，定向审计 1/1 通过。分地区结果如下，M3-C3-B–E 将按此范围补动态跟随证据。

| 地区 | 全部关卡/出生点/车辆类型组合 | 路线含多向字段 | 当前计划 |
| --- | ---: | ---: | --- |
| New Mexico · Levels 1–10 | 50 | 24 | M3-C3-B |
| Mississippi · Levels 11–20 | 84 | 68 | M3-C3-C |
| Oregon · Levels 21–31 | 86 | 48 | M3-C3-D |
| Dakota/Nevada · Levels 32–41 | 74 | 42 | M3-C3-E |
| **合计** | **294** | **182** | 按地区逐批补测 |

这里按“关卡、出生点、车辆类型”去重，不把每个波次或每种路径排列重复计数。动态短会话将挑选每个组合最早出现该请求类型的正式波次，隔离其余无关请求，并以固定 seed 检查对应车体在至少一个多向字段处跟随同组前车；这不等于播放完整战役，也不声称每个随机分支排列都已动态跑过。全部 TDM 分支和路线是否成立仍由静态地图/路线证据判定。

New Mexico Levels 1–10、Mississippi Levels 11–20、Oregon Levels 21–31 和 Dakota/Nevada Levels 32–41 的[正式马车路线矩阵](../tests/official-wagon-route-matrix.test.ts)已从覆盖审计动态生成并通过全部182个关卡/出生点/车辆类型组合（24/24、68/68、48/48、42/42）。测试保留正式地图、TDM、路线、出生点、目标波次和车辆请求，隔离其他波次/出生池及我方防御单位/招募池，只验证车马实际到达多向字段后的同组跟随。初次运行中 Lost City 的4例被防御单位在抵达分岔前击毁；这是测试夹具隔离不足，不是路线错误证据。此地区测试隔离后会改变完整战役随机消耗，也不评价单位生存结果。当前剩余的 M3-C 项为运输端点行为与正式路线交叉阻挡。

[Fort Kaboom 回归](../tests/fort-kaboom-wagon-route.test.ts)补充 Wave 3 落后马车双轴跟随隔离会话，以及 seed 6 完整正式波次分叉时序。[enemy-animation](../tests/enemy-animation.test.ts)还验证 Billy Hills 的正式首个分叉及合成分叉组。通用 [post-coach](../tests/post-coach.test.ts) 和 [gold-transport](../tests/gold-transport.test.ts) 覆盖车辆组移动/生成机制，不增加正式地图分叉组合数。182项矩阵确认马匹与车体在已触达的正式分支处按同一组位移；它不检查生产渲染中的资源可见性、锚点或层级，用户报告的“马车分开”仍需 M3-D 画面复核。

[正式路线交叉审计](../tests/official-transport-route-intersections.test.ts)找到6组可能发生同波次交会的不同出生路线：Level 11 spawn 0/1；Level 14 spawn 0/1 与 3/5；Level 17 spawn 3/5 与 4/5；Level 31 spawn 1/2。审计同时展开路线转弯方向并要求两个出生池在同一正式波次请求马车；不将平行同路或未转向的共享格算成交叉。它是 C4-C 的测试候选，不证明该波次中两辆车会在同一时间抵达交会格。

**端点静态源格审计**已由[正式运输端点测试](../tests/official-static-transport-endpoint-audit.test.ts)覆盖48组/96个方向，首个沿轴阻挡来源分类如下。该扫描用正式 `GameView` TDM、背景碰撞码与 APK 对象碰撞框表定位来源，不等于车辆已在该端点实测停靠。

| 首个源格类别 | 端数 | 来源说明 |
| --- | ---: | --- |
| raw86 / raw87 水平轨道缓冲 | 22 / 22 | 两种 TDM 缓冲对象均登记 APK 静态碰撞框 |
| raw94 / raw95 垂直轨道缓冲 | 9 / 9 | 端部 TDM 对象，逐格核对对象碰撞框来源 |
| 背景水岸码107 / 109 / 110 / 119 / 127 | 1 / 1 / 2 / 3 / 3 | 读取场景派生背景碰撞码；普通 raw126 岸岩不计入此类 |
| 地图边界 | 24 | 轨道/航道扫描抵达 TDM 网格边缘 |

Ghost Town 的 raw126 岸岩碰撞框没有与船体框相交；已有测试仅证明船能从岩旁通过并在地图边界停止，不能作为水岸阻挡证据。原临时扫描把 raw68 错当作地形碰撞并漏掉 raw94/95；原因是把简化的碰撞码范围直接套在原始 TDM 上。正式审计已按运行时 raw→背景碰撞码转换及对象碰撞表更正。首个阻挡来源只建立静态候选；各类实际停靠坐标、整组反向移动及敌方组间等待仍待 M3-C4 行为测试补证。

## 后续验证边界

- 现有正式敌方马车岔路测试只覆盖上述六个关卡组合，不代表 41 关所有波次或路线。
- 48 个静态地图运输组都已有至少一个方向的直接移动会话断言；此项不覆盖所有端点、交叉阻挡和车辆绘制，相关缺口见 M3-C3/C4 与 M3-D。
- 生产 Canvas 的部件绘制、脚底锚点和层级排序属于 M3-D。启动单位清单和资源图集只能证明对象构成，不能证明运行画面中车马没有分离、船车没有错层。
- 不对“无地图摆放运输组”的关卡推断整关不含运输车；这些关的正式波次数据仍含敌方运输请求。也不把波次原始请求总数当成截图中应同时出现的实体数量。
