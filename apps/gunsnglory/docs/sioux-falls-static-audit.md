# Sioux Falls 地图静态核对

## 范围与结论

本记录核对 APK 的地图文件 43，以及网页地图数据中的地形、道路/桥梁/铁路图层、敌方路线、静态物件和碰撞映射。它是 Sioux Falls 空间内容切片的静态基线，不代表已完成整关运行或 Android 画面逐像素比较。

| 类别 | 结论 | 依据 |
|---|---|---|
| 地图来源 | `res/raw/td_map_43.tdm`，32×24 格；头部 2 字节为宽高，随后 768 字节为行优先格码。 | APK 原始资源；`BasicMap` 的尺寸与格子读取逻辑 |
| 公开地图与夹具 | `public/content/maps/td_map_43.tdm`、`tests/fixtures/td_map_43.tdm` 与 APK 原始文件逐字节一致；网页 JSON 的 `originalTileGrid` 与这 768 个格码逐格一致。 | 解包后 `cmp`；`sioux-falls-static.test.ts` |
| 选关缩略图 | APK 的 `res/drawable-mdpi-v4/gng_levelmap_43.png` 与网页的 `public/assets/menu/gng_levelmap_43.png` 字节一致。 | 解包后 `cmp` |
| 静态路线 | 5 个出生标记经 31 个方向标记形成 9 条完整分支路线，均到达对应出口；线路格只经过原始道路/桥梁/铁路交叉点和方向标记。 | `EnemyDirectorField.directionMapping`、`EnemyDirector` 的字段扫描；独立 TDM 追踪夹具 |
| 地形与道路绘制 | 768 个背景格及路径、桥梁、桥墩和铁路图层均由 APK 地图格码派生；代码中的固定随机种子仅用于稳定网页画面，不声称还原 Android 每次启动的随机变体。 | `BackgroundMap` 的图层构建/塑形方法；独立绘制参考及自动测试 |
| 静态碰撞 | 场景物件使用 TDM 格码对应的原版碰撞框；桥面通行依赖背景/道路格，不把桥梁贴图尺寸当作碰撞范围。 | `CollisionManager.createCollisionObject`；`player-collision-geometry.ts`；场景碰撞测试 |

## APK 格码分布

下表是 TDM 文件中的完整非零/特殊格码频数。它用于发现遗漏 marker；最终网页绘制、碰撞和单位列表仍分别按引擎实际消费点判断。

| 用途 | 格码及数量 |
|---|---|
| 地形/道路底格 | `0×341`、`16×47`、`32×107`、`36×48` |
| 敌人出生与出口 | `40×1`、`41×1`、`42×1`、`43×1`、`44×1`；`48×2` |
| 路线控制 | `52×3`、`53×11`、`54×3`、`55×12`、`57×1`、`61×1`（共 31 个方向标记） |
| 地表物件/未实例化标记 | `69×2`、`70×3`、`71×3`、`72×1`、`76×3`、`78×7` |
| 桥与轨道 | `80×8`、`88×13`、`89×3`、`90×9`、`91×2`、`92×3`、`94×1`、`95×1` |
| 地图单位与炸药 | `96×11`、`97×9`、`98×6`、`99×8`、`101×5`、`102×1`、`108×1`、`110×1`、`130×1`、`131×1` |
| 建筑与水面载具标记 | `112×1`、`113×1`、`114×1`、`116×4`、`117×2`、`120×1`、`121×2`、`123×1` |
| 水域 | `124×45`、`125×22`、`126×4` |

完整 256 格值分布与每个坐标由原始夹具自动复核，不在此重复复制整张矩阵。

## 路线结构

原版方向动作 ID 由 `EnemyDirectorField` 的常量及 `directionMapping` 决定；地图中的方向 marker 是 `52 + actionId`。网页路线保持同一规则，扫描下一个方向/出口标记，不用直线拟合、A* 或人工挪动控制点。

| 动作 ID | TDM 出生格 | 分支路线数 | 出口 |
|---:|---|---:|---|
| 0 | `40`，(9, 0) | 2 | (31, 12) |
| 1 | `41`，(8, 0) | 2 | (31, 12) |
| 2 | `42`，(0, 5) | 2 | (31, 12) |
| 3 | `43`，(0, 14) | 1 | (31, 12) |
| 4 | `44`，(13, 0) | 2 | (31, 11)、(31, 12) |

全图共 9 条完整 spawn-to-exit 路径、38 条不同的有向控制边、155 个不重复的路线内部格。内部经过 raw `32×292`、桥格 `80×21` 与 `88×25`、铁路交叉格 `89×7`，以及方向 marker；未经过非路线地表或水域格。路线图完整记录于 [`sioux-falls-route-graph.json`](../tests/fixtures/sioux-falls-route-graph.json)，由独立 TDM 坐标追踪生成，并与生产路线展开逐项比较。

`80` 与 `88` 分别是横桥和竖桥的绘制标记；桥面周围水域仍按背景地形阻挡。`89` 是轨道层标记，处于路线交叉点时仍需保留原版图层叠画。该判断来自 TDM 的不同图层处理和逐格路线 trace，并非从桥梁 PNG 的外观推定可通行范围。

## 静态物件与碰撞

| TDM 格码 | 网页场景资源 | 数量/位置 | 碰撞依据 |
|---:|---|---|---|
| 69、70、71 | Dakota 雪地石块 A/B、雪树 | `2 / 3 / 3` | APK 静态物件默认小型碰撞框；70 使用其专属较大框 |
| 72、76 | 木桩、灌木 | `1 / 3` | 默认小型碰撞框 |
| 94、95 | 竖向铁路尽头挡车器上/下 | 各 1 | 原版以一个完整格阻挡 |
| 112、113、114 | Saloon、Fort、Tipi | 各 1 | 原版大型建筑碰撞框；Fort 不靠绘图锚点推算 |
| 116、117 | Shack、小 Tipi | `4 / 2` | Shack 宽碰撞框；小 Tipi 使用默认框 |
| 126 | 水边石块 | 4 | 原版默认小型碰撞框 |

静态物件坐标由 `dakota-10.json` 中的原始 marker 逐格生成；碰撞框由集中 TDM 碰撞表生成。路线/桥的视觉覆盖不改变底层地形碰撞。

格码 `78` 在 `GameObjectManager.createGameObjectsFromBasicMap` 中没有对应物件实例分支，也没有静态阻挡条目；因此没有将它误画成装饰或额外碰撞体。`102` 与 `110` 是配对炸药对象，只有解锁时才参加碰撞；它们将在战役数据切片中接入，而非伪装成地形装饰。

## 动态单位标记的交接

以下原始标记已由[动态内容核对](sioux-falls-content-audit.md)中的切片 3 接入单位与战役数据。切片 4 现已将关卡注册为正式 Level 40，并接入菜单入口、Progress 解锁、结算和 replay 分派；此处只保留 marker 到游戏对象的空间对照。

| 格码 | 引擎语义 | Sioux Falls 标记 | 后续处理 |
|---|---|---:|---|
| 96–99、101 | 初始地图单位类型 1–4、6；新局创建受对应单位解锁状态控制 | 39 个 | 已按原 marker 和解锁快照创建；raw 101 的 Grandpa 受 Level 30 解锁门控制 |
| 108 | 单位类型 5、activity 5 | 1 个 | 已创建为活动 Sniper；不误当作睡眠招募 marker |
| 130、131 | 单位类型 35/36，即 Pyromaniac / Salesman 的休眠招募标记 | 各 1 个 | 已按 Level 50/60 全局解锁快照创建睡眠实体；未解锁时不出现 |
| 120–123 | Steamer 车头、驾驶段、炮位段和尾段的组合标记 | `1 / 2 / 0 / 1` | 已组合成 x=14–18 的五节水平水上移动组；完整映射见动态内容核对 |
| 102、110 | Dynamite Trigger 与 Dynamite Box | 各 1 个 | 已按原始坐标配对；是否可用沿用全局炸药解锁规则 |

## 实现核对入口

- 原始地图：`public/content/maps/td_map_43.tdm`、`tests/fixtures/td_map_43.tdm`。
- 派生地图与图层：`src/content/dakota-10.json`；独立参考在 `tests/helpers/terrain-render-reference.ts`。
- 路线：`src/content/dakota-10-routes.ts`；独立分支图在 `tests/fixtures/sioux-falls-route-graph.json`。
- 场景与静态物件：`src/content/dakota-10-scene.ts`；碰撞生成由 `src/game/player-collision-geometry.ts` 提供。
- 目标 APK 静态入口：`BasicMap`、`BackgroundMap.createBackgroundMap/createStreetLayerMap/shapenBackgroundMap/shapenStreetLayerMap`、`EnemyDirectorField.directionMapping`、`EnemyDirector`、`GameObjectManager.createGameObjectsFromBasicMap/createSteamerFromMap`、`GameObjectDecoration`、`CollisionManager.createCollisionObject`。
- 定向验证：`node --import tsx --test tests/sioux-falls-static.test.ts`，本轮 4 项通过。

## 适用边界

- 本文证明网页数据与 APK 的静态 TDM、引擎格码消费和当前固定变体参考一致；不证明在 Android 设备上记录过 Sioux Falls 的实际开局画面。
- 选择固定 Java Random seed 是网页的可重复表现约定。原版启动共享随机源，树叶、沙地/水面变体等随机表现不保证每次相同。
- 本文不宣称动态单位运行画面或 Steamer 长时运动已与 Android 运行截图逐帧核对；规则、单位、波次、对白和音乐数据的静态接入与短时测试范围见[动态内容核对](sioux-falls-content-audit.md)。正式菜单、解锁、结算和 replay factory 已由切片 4 注册；整批应用检查与部署验收仍待完成。
