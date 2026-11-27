# 实施计划

本文只记录当前基线、未闭合事项和近期可执行步骤。逐图证据与已关闭问题分别保存在地图矩阵、交通清单和经验记录中；本计划不重复归档已完成切片。

## 当前实现与发布状态

- 正式战役 Level 1–41 已接入；Level 42–60 尚未接入。M5 地图批次已完成，路线、我方碰撞、交通实体和生产渲染证据范围见[地图覆盖矩阵](map-coverage-matrix.md)、[交通实体清单](map-transport-inventory.md)、[玩家碰撞审计](player-collision-audit.md)及[经验记录](experience-log.md)。
- 最新公开发布为 `a5795522987fbebd45dab0752937862a8b9e9801`。GitHub Actions run `45784784585` 的应用测试、共享测试、GitHub Pages 与 Cloudflare Pages 发布均成功；两处根 `build-info.json` 的 `sourceSha` 均与发布提交一致。
- 已在内置浏览器打开带发布 SHA 的页面，以窗口模式、静音检查 Nevada Level 41 Free Play 的开局对白、暂停板、未完成战斗退出确认及返回菜单；另查看 Fort Kaboom Level 3 的战斗地图、HUD、地图缩放和页面外实验室。检查范围是代表性部署 smoke，不表示所有地图、每种弹窗或移动端画面均已逐项目视核对。
- 发布提交已合并回本地晋升候选并推送至 `origin/gunsnglory`；推送输出确认远端由 `05574e5` 前进至 `6897cc7`。旧工作树 `/private/tmp/gng-clean-integration` 仍保留 5 个未提交文件，不作为当前开发基线，也不覆盖或清理。
- Fort Kaboom 车马跟随、碰撞和 Cannon 弹丸映射均有 APK 静态证据及网页测试；它们不等于 Android 同种子运行画面对照。未逐关逐帧检查全部精灵，不能宣称全游戏已达到像素级一致。

## 发布计数

| 统计点 | 公开发布次数 | 已验收实现切片 | 比例 |
| --- | ---: | ---: | ---: |
| 上次留存基线（`0bed82f`） | 31 | 173 | 17.9% |
| M5 发布后 | 46 | 308 | 14.9% |

沿用上一版统计口径：之前为 `45/236`；本批新增 72 个非合并提交，均改动应用 `src/` 或 `public/` 实现内容，另增加 1 次公开发布，因此为 `(45 + 1)/(236 + 72) = 46/308`。统计低于 20% 目标；不将文档提交计为实现切片。

## 下一批：Level 42 Bombington

### 范围

接入 APK 正式战役中的 Nevada Level 42「Bombington」。M6-A 静态内容审计已通过；完整基线见 [Bombington 内容审计](bombington-content-audit.md)。当前目录条目指向地图文件 45 / 标题资源 45，但只有该审计明确了可实现内容。

只实现这一关及其必要的目录/存档集成。Level 43–60、全局规则重构、无证据的平衡调整、完整战役通关和 Android 实战不在本批范围。

### 当前切片状态

- **M6-A 审计已通过：**详见 [Bombington 内容审计](bombington-content-audit.md)。
- **M6-B1 地图基线已完成：**APK 中的 td_map_45.tdm、网页资源副本与测试 fixture 逐字节一致；nevada-02.json 保存 32×24 / 768 格 TDM 及 768 条背景、151 条 street-layer 绘制命令。bombington-map.test.ts 的2项测试及 TypeScript 检查通过；资源裁片与绘制边界均有效。当前仅交付原始地图和静态地形层，不含对象、路线、规则或正式关卡入口。
- **M6-B2 全路线图已完成：**新增 `bombington-routes.ts`，复用 APK marker 方向表生成全部 624 条出生到出口路径，并提供 APK spawn action 到 row-major spawn point 的映射。独立路线 fixture 与内容审计核对出 5 个出生、4 个出口、60 个转向 marker、82 条唯一有向边及完整出生/出口路径矩阵；短 GameSession 验证五个出生点都按地图边界方向生成并开始移动。`bombington-routes.test.ts` 的2项测试和 TypeScript 检查通过。当前不含生产地图视图、对象、波次或正式关卡入口。
- **下一步：M6-B3 生产地图视图。**将地图和完整路线接入生产绘制路径，核对路线与地形、地图边界及视口裁切。

### 后续步骤与验收

1. **M6-B2：接入 APK 全路线图。**复用 createMississippiRouteDefinitions 和 APK 方向表，新增 Bombington route definitions 与 spawn action → row-major spawn point 映射。新增 bombington-routes.test.ts，独立断言 5 个出生、4 个出口、全部 60 个转向 marker、82 条唯一有向边、spawn-to-exit 分支矩阵、无回路/越界/孤立节点；再用短 GameSession 核对各出生 action 的首个实际方向。定向命令：node --import tsx --test tests/bombington-routes.test.ts。
2. **M6-B3：核对生产地图视图与路线/地形贴合。**把 Level 42 map JSON 和路线图接进仅含地形的 map scene；用生产 drawGame() / Renderer 路径检查裁片、桥/铁路覆盖、地图坐标、路线节点及视口裁切关系。测试必须从 APK TDM 和 draw-command 参考各自构造预期，禁止仅比较 JSON 与自身复制数据；对路线中间格逐条检查最终背景/街道码和地图边界。若发现偏差，修复当前地图转换并加定位明确的回归断言。定向命令：node --import tsx --test tests/bombington-map-render.test.ts。
3. **M6-C1：接入静态对象、建筑和睡眠招募单位。**依据 M6-A marker 类别及坐标创建 decoration、spawn location、单位 activity/解锁状态；验证 96–101、130/131 的新局语义和最终 ScenarioContent。短 GameSession 检查对象碰撞框与单位脚底锚点；资源核对对应公开素材。通过条件：每个静态 marker 只有一个对应对象，碰撞框来自 APK 构造器；所有 activity 4 单位依旧注册碰撞，锁定单位不误开放。
4. **M6-C2：接入铁路组和炸药。**把 83/84 列车部件登记为同组运输实体，核对水平移动、组距、缓冲器停止与生产绘制；按 APK nearest-unused 规则配好 9 组炸药触发器/箱子。通过条件：所有部件坐标和类型逐项符合 TDM/Smali；短会话覆盖列车推进与端点；每个触发器唯一映射到最近未用箱子，炸药未解锁时行为正确。
5. **M6-D1：接入数值、敌人和十波请求。**使用 Level 42 的 12 个原始参数、难度 HP 百分比、敌人定义和全部 39 条请求；实现 wave delay、speed/HP、出生 action、十槽映射与逐波玩家池动作。通过条件：所有原始值逐项断言；短会话覆盖请求向量、随机抽取语义、波次边界和 Boss 槽，不要求完整通关。
6. **M6-D2：接入关卡表现与音频。**加入十段 APK 英文对白、对应头像和站点中文翻译；沿用 Nevada 环境曲与三曲战斗循环。通过条件：逐波文本/头像顺序与 APK 相符，所需图像与 OGG 文件均能加载；测试保持静音，音轨路由单测验证波次索引循环。
7. **M6-D3：登记正式关卡、Free Play 和 replay。**将 Level 42 加入正式战役，要求完成 Level 41；接通 Nevada 关卡选择、地图说明、档案快照、难度、正式结算、Free Play 与 replay factory。通过条件：正式开局使用记录的内容版本，Free Play 三种难度可开且不写战役进度，replay 使用录制版本，Level 43 仍按目录规则锁定。
8. **M6-E：整批验收与发布。**先逐切片定向验证和本地提交；随后运行应用 pnpm run test:ci、catalog 检查及共享站点构建。内置浏览器窗口模式、静音检查 Bombington 正式入口、实际全图、代表性路线/对白/战斗 HUD；不完整通关、不进入全屏、不播放声音。通过后核算发布比例，以单一 squash 提交集成并发布；核对 Pages 来源 SHA 一致后完成线上验收。

### M6-B 当前切片

当前实施 M6-B3。B1 已固定 APK 地图和地形图层，B2 已核对完整路线及出生映射。B3 只接入生产地图视图并核对渲染、路线/地形关系和视口，不加对象/单位/波次或关卡入口。

### 本批边界与停止条件

- APK 静态分析优先。只有静态代码和资源无法回答一个明确行为问题时，才考虑 Android 定点观察；不为收集通关记录启动整场战役。
- 贴图边缘、动画逐帧和 APK 同种子动态画面对照不由静态反编译证明。发现用户可见偏差时记录关卡、视口、对象和时间/回放证据，再单独判断是否阻塞。
- 不新增游戏引擎或依赖。只有现有内容接口明确无法表达 APK 行为时，才提出最小接口扩展，并先说明消费者、存储兼容和测试影响。

## 稳定交付门槛

- 每个切片先跑针对性测试并本地提交；批次完成后再跑完整应用与相关共享检查，不在每个提交后重复整套测试。
- 浏览器默认窗口模式、静音；仅对应验收时使用全屏或声音。无需手动完成整场战役。
- 发布前按最新已验收实现切片和公开发布次数复核比例，目标不高于 20%；不拆分或延后已验收工作美化比例。
- 每个已复现并关闭的问题更新[经验记录](experience-log.md)；结论写明证据与边界。
- 修改 Markdown 后检查链接和 `git diff --check`，并按相对路径复制成品到 `/tmp/var/wishflow-tools/`。文档更新本身不触发公开发布。
