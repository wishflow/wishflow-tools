# 实施计划

本文只维护当前代码基线、未闭合问题和接下来可执行的切片。每轮开工前对照代码与 APK 证据；每完成一个切片，立即更新状态并移除已完成项。

## 当前实现与发布状态

- 当前集成树包含正式战役全局第 1–40 关，最后一关是 Dakota Level 40 Sioux Falls；目录共 60 关，Level 41–60 仍未实现。Sioux Falls 的地图、波次、规则、菜单、结算和回放入口已接入。
- 最新公开发布为 `f8dbfee04072d01e6a5ead7a704823cbe36ffe1d`。GitHub Actions run `45390291790` 的 Guns’n’Glory 完整测试、Pages 构建、GitHub Pages 部署与 Cloudflare Pages 部署均成功；两处公开根 `build-info.json` 的 `sourceSha` 均与该提交一致。
- 该版本已在内置浏览器以窗口模式、静音检查主菜单 Options、Cow Gulch Level 1 介绍页、Easy 开局对白及低余额 Bandito 雇佣弹窗。当前桌面截图中 Options 不再拥挤；关卡介绍标题、地图、说明、记录面板与 Play 按钮处于对应槽位；雇佣弹窗显示角色图、名称、对白、价格与确认槽。结论只覆盖这些桌面代表状态，不等于与 APK 运行画面逐像素一致，也未覆盖本轮窄屏目视检查。
- Fort Kaboom seed 6 的无操作轨迹已通过生产 `drawGame()` 检查：贴图裁剪、脚底锚点和奖励箱遮挡顺序均与 APK 静态绘制规则一致；该样本没有支持网页坐标或资源错误的证据。用户曾报告的 Wave 3 具体车辆组仍未复现，因此不能把那次观察标成已解决。Cannon 弹丸已映射到 APK 独立资源并有定向测试，见[经验记录](experience-log.md)。
- REA 已确认 Sioux Falls 的 `GameDesignWaves.setWaves(i == 40)` 有 10 个波次和 **28 条** `addToWave` 请求；`GameDesignData.<clinit>` 的第 40 关数据对应数组下标 39。详见[动态内容核对](sioux-falls-content-audit.md)与[空间静态审计](sioux-falls-static-audit.md)。

## 发布计数

| 统计点 | 公开发布次数 | 已验收实现切片 | 比例 |
| --- | ---: | ---: | ---: |
| 上次留存基线（`0bed82f`） | 31 | 173 | 17.9% |
| 当前发布后 | 45 | 236 | 19.1% |

沿用原统计口径：基线后增加 58 个代码实现提交、4 个内容切片和本轮 Pages 阻塞修复 1 个切片；公开发布为原有 12 次加 Sioux Falls 与 Pages 修复两次。累计为 `(31 + 12 + 2) / (173 + 58 + 4 + 1) = 45/236`，低于 20% 目标。

## 当前工作顺序

### 车马岔路连续性的定点复核

- **已知基线：**`sameGroupPredecessorMovementVector()` 已复原 APK 的双轴坐标差跟随；Fort Kaboom 隔离用例和五关正式岔口矩阵验证了移动分量。Fort Kaboom seed 6 的无操作轨迹也已重建：测试副本只提高 `initialLives`，地图、难度、波次请求、随机种子和规则步长不变，因此能越过原无操作局在 Wave 2 的 defeat。
- **当前发现：**在 `(9,3)` 北向分支，前序马先转北，后车仍沿东向进入同一控制格，约 1.5 秒后到达自己的控制点中心再转北。APK `EnemyDirector.moveEnemys()` 逐项遍历对象列表，并在 follower 自己到达 redirect 时才应用前序对象的 `fullX/fullY` 差；这能解释岔口短时看似分路的现象。APK `GameObjectEnemy.setImageForUnit()` 将 type 4 映射到 `wagon`、type 8 映射到 `horse_wagon` / `horse_wagon_white`，APK 与网页均把马和车作为分开的精灵绘制。
- **已完成的步骤：**
  1. **完整轨迹基线：**`fort-kaboom-wagon-route.test.ts` 使用原地图、完整波次、seed 6、medium 和 100 ms 步长；测试副本只提高 `initialLives` 阈值。无输入轨迹中马先转北，wagon 在自己的控制点转北，间隔15帧。
  2. **同一轨迹样本：**固定 `GameView` frame 643（马转向）、651（wagon 滞后）、658（wagon 转向），记录同组两个对象的位置、方向、绘制偏移、深度顺序和相机。
  3. **生产绘制：**三帧完整 Fort Kaboom 地图经生产 `drawGame()` 与 APK 派生原图绘制，并在内置浏览器查看；测量贴图源框、目标框和 alpha 边界。frame 643 两者脚底 y 分别为 314.36、314.38，几乎重合；中心相距约一个地图格，源图透明边缘留下约 10 个显示像素的空隙。frame 651 两张 alpha 边界重叠；frame 658 两者均已转北。
  4. **APK 交叉核对：**`GameObjectEnemy.draw()` 与网页都用独立马、wagon 精灵，并按 fineY 加绘制偏移作为脚底；`GameObjectManager.getValueByObject()` 的对象深度为 `fineY + drawingOffsetY + fineZ × 100`。APK 的 `SpawnPoolManager.update()` 以 `fineZ=7680` 生成奖励箱，`GameObjectCollectable` 再给 y 加 1920；网页奖励箱使用相同位置和 `+768000` 深度。APK 的 `drawEnemies()` 在 768000 阈值前画道路下方对象，之后画道路，再由 `drawObjects()` 画高层对象；网页按同一阈值分两次绘制。因此 frame 643 奖励箱图标覆盖车辆的一部分是原版排序规则，不能据此推断 wagon 贴图缺失或车辆选择了错误路线。
  5. **差异判定：**这个 seed 6 样本的移动、贴图裁剪、脚底锚点、车辆图层和奖励箱图层均未发现网页与 APK 静态规则的差异，不改路线或渲染代码。用户原先指出的 Wave 3 具体车辆组仍没有在当前样本中重现，须保留为未闭环，不能用本次 Wave 1 样本替代结论。
- **未闭环与后续动作：**现有证据足以排除“此帧网页把马、wagon 放错层或漏贴图”，但没有 APK 实际运行帧，不能声称运行画面逐像素一致；用户报告的 Wave 3 组别也未重现。后续若遇到具体差异，应以当时关卡、波次和车辆组在网页中定点复现，再核对该组两只独立对象的坐标、素材与 `drawOrder`；只有静态 APK 证据不足以裁决时才做一次 Android 定点观察。不重复检查启动页，不为已匹配的 seed 6 样本改动路线。
- **验证：**关闭此项前定向运行 `fort-kaboom-wagon-route.test.ts` 与 `canvas-renderer.test.ts`；不运行完整 `test:ci`，因为没有游戏源码变化且这不是完整代码批次。

### 已关闭的界面反馈

雇佣弹窗、Play 关卡介绍页和 Options 的原版布局修复已由经验记录中的 APK 坐标规则、定向测试及当前部署版桌面截图复核。最新复核显示角色图、文本、价格与按钮槽存在且布局未复现此前错位；若用户提交了新的差异截图，再按其页面状态和视口开独立切片，不重复实现已有修复。

### 非阻塞范围

- 已接入关卡有 TDM、路线和碰撞自动检查，但没有逐关完整运行截图；只对测试发现或用户新报的差异做针对性复核，不声称已人工逐帧验证全部地图。
- Level 41–60 尚无完整内容，继续保持选关禁用。每个新关卡接入前，先细化地图、单位、路线、波次、对白、资源和菜单入口的实现及验收。

## 稳定交付门槛

- 每个切片先跑针对性测试并本地提交；不在每个切片提交后重复跑全套。整批结束后再运行应用完整检查与共享检查。
- 浏览器验收默认窗口模式、静音；仅验收对应功能时才启用全屏或声音。优先用 APK、REA 与静态代码证据；仅在静态证据无法回答具体问题时做一次短时 Android 定点观察。
- 普通公开发布次数占已验收实现切片数的目标不高于 20%；每次发布前根据最新提交记录复核比例，不通过拆分或延后已验收切片调整统计。
- 每个关闭的已复现问题更新[经验记录](experience-log.md)；本计划移除已完成项，并明确仍未验证的结论与边界。
- 涉及 Markdown 的切片运行 `git diff --check`，再按仓库规则复制成品到 `/tmp/var/wishflow-tools/`。本计划修改本身不触发产品发布。
