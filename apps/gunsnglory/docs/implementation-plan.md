# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮开始先核对当前实现与进度，再细化接下来几个独立步骤的实现、依赖和验收；每完成一步就更新本计划并移除已完成事项。

## 当前状态

- M30 Snake River（Oregon 第 9 关／全局第 29 关）已完成并公开发布。发布提交 `9fbb26a48c6d75143aaa469ce249f70f18bc3684` 的 GitHub Actions `44023162078` 成功；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配该 SHA。发布页面由内置浏览器检查通过，详情见[经验记录](experience-log.md#新关卡集成的共享断言与启动预载)。
- 回同步提交 `9cafb9d` 已将发布提交合并进 Guns’n’Glory 集成分支；回同步后仅在本计划和经验记录中补齐最终状态，没有重新改动游戏实现。
- M30 最终 `CI=1 PLAYWRIGHT_PORT=4180 pnpm run test:ci` 通过类型检查、892 项单测、生产构建和180项 E2E。构建仍有既有大 JS chunk 提示；本批未做拆包重构。
- M31 Lumber Mill Hills（Oregon 第 10 关／全局第 30 关）已发布到 `master`：发布提交 `a37a7759036b7a67a69901d79592dcb15011bff7`，Actions `44058527187` 成功；GitHub Pages 与 Cloudflare Pages 的来源 SHA 一致，内置浏览器已验证 Free Play 入口及代表性开局。当前正在将发布提交回同步至 `gunsnglory`。
- M31 的单位池上限 `[6,6,6,6]` 与 APK global level 30 分支一致；M32 global level 31 分支使用不同上限 `[2,2,0,0]`。两关调用形状相似但参数不同，不能把相邻关卡值互相套用。此前计划草稿误把 M32 参数归给已发布的 M31，已在实现前依据完整 DEX 分支纠正；未改动 M31 实现。
- M31 发布验收已完成；其余项目进度和证据见下方 M31 批次。普通发布比例下一次更新时按仓库既有统计口径重算，分析、计划、测试及回同步提交不计入功能发布。
- M22 留下的旧版 M4–M7 回放导入探针仍未确认；M30 未重开该问题。后续若处理，先复核其复现条件和现有实现，不重复检查已经闭合的 Snake River 回放路径。
- M31 静态核查确认：`addToWave` 的10/11/12整数重载会分别补零到原始请求槽位2–11；槽位10由 APK 以请求类型7生成 Boss，槽位11以请求类型9生成 Doc。派生波次索引显示，global level 22–30 都有 Boss 请求，前30关无 Doc 请求；M31 的末两次请求均为 Boss。M31-A/B 已将网页请求索引8接到 Boss，并将 Oregon 关卡数据中的 Boss 数量移出 Doc 索引9。研究分支 `game-analysis.md` 对 Dynamite 102/110 的说明与 APK Smali 相反；相关实现和文档判断必须以原始分支表复核，并在经验记录中保留该文档冲突。
- M31 的规则、地图、波次、入口和玩家单位池上限均已正确实现并发布。M32 必须使用自己 `GameDesignWaves` level 31 条件分支的参数，不从 M31 派生。

## M31：Lumber Mill Hills

### M31-A：完成 Boss/Doc 波次槽位全局核对（已完成）

- **范围：**从 APK `Wave.setContentForSpawnPoint`、`WaveManager.updateWave`、`EnemyDirector.addEnemyAtSpawnPoint` 和 `GameObjectEnemy` 的 Smali 调用链，建立“网页请求索引 → 原始槽位 → 请求类型 → 最终敌人类型”的明确映射；用派生关卡波次与 M31 十波逐项找出非零槽位。核对所有已接入关卡中 Boss/Doc 数量及网页 helper 写入位置。调查分支的报告若与 Smali 不一致，以 Smali 为准并记录冲突。
- **验收：**交叉核对结果固定为：`requests[8] → APK slot 10 → request type 7 → Boss`，`requests[9] → APK slot 11 → request type 9 → Doc`；确认前30关的 Doc 数量均为零，global level 22–30 的 Boss 数量及入口与来源派生值一致。不得仅凭 `requests[n]`、变量名或关卡摘要下结论；每个非零末位请求都要追到 APK 的最终类型。
- **验证：**用 Smali 重载/写槽位方法和 Waves 派生数据建立独立期望，新增可读的槽位映射测试；扫描全部已接入关卡波次及 M31。该步只确立映射和测试，不改生成规则或关卡数据。

**完成结果：**Smali 重载、前30关 Waves 派生表和 M31 十波已交叉核对。回归测试发现 Cashcow Canyon、Billy Hills、Fort Echo、Apache Valley、Railroad Ranch、Mount Hood、Colt City、Snake River 八关均把唯一 Boss 数量写进 Doc 索引9；M31 末两次请求也是 Boss。`campaign-boss-source-slots.test.ts` 固定请求索引、十槽向量和前30关 Doc 为零的期望。

### M31-B：修正共享 Boss 波次契约（已完成）

- **依赖：**M31-A 通过，确认 Boss/Doc 的来源映射和当前受影响关卡。
- **范围：**在现有 `GameSession` 支持 M31 与前30关实际使用的 Boss（enemy type 7），接通请求槽位、生成、已确认属性、碰撞、动画/绘制和 HUD/结算名称；把 Oregon `bossCount` 与所有已接入 Boss 数据写入正确索引，按 A 的结果修正测试 fixture。Doc（enemy type 9）虽有 APK 槽位，但前30关没有请求，故本批只断言其数量为零，不实现未被 M31 使用的 Doc 行为。保持加权随机语义，不将请求向量当作固定出敌顺序；不新增地图上的伪造初始单位。
- **验收：**以源证据独立构造 Boss 请求，短 `GameSession` 能生成 enemy type 7、扣减 `requests[8]` 并使用核定属性；至少覆盖一个既有 Boss 关卡和 M31 末波。当前已接入关卡均无非零 `requests[9]`；其他无 Boss 请求的行为不变。测试覆盖数组索引、源槽位、最终类型、属性和生成事件，不依赖完整通关。
- **验证：**新增/更新槽位转换、Boss 生成与数值测试，以及 Oregon 既有 Boss 关卡定向测试；修复当前范围内的差异后再进入 M31 内容集成。若数据核对发现前30关存在 Doc 请求，则暂停扩展，先按 APK 静态证据调整范围。

**完成结果：**`GameSession` 支持 enemy type 7 Boss，按请求索引8消费并使用 APK 核实的数值、资源、动画和 HUD 名称；八个 Oregon 关卡的 `bossCount` 均写入索引8，Doc 索引9为零。Boss 短会话检查生成事件与来源池。Boss 槽位、生成、渲染、资源和 Oregon 规则共51项定向单测通过，`pnpm run typecheck` 通过。未实现 Doc，因为前30关没有 Doc 请求。

### M31-C1：地图、路线、静态对象与初始单位（已完成）

- **依赖：**M31-A/B 已完成；数据来源限定为 M31 的 TDM `td_map_33.tdm`、APK 地形/对象构造代码及对应派生索引，不借用相邻 Oregon 地图作事实。
- **范围：**接入32×24原始格网、Oregon背景与街道/铁路绘制、敌方 spawn/redirect/exit 全路径、TDM 静态物件、初始单位、可招募睡眠单位和一组火车（2节车头、3节车厢）。按 APK 对象构造与碰撞来源生成场景，不把波次单位伪造成初始单位。
- **验收：**770字节 TDM 的宽高与768个格值逐项匹配；背景、街道和地图对象分别与 APK 派生参考比对；所有 action marker 到网页出生点 ID/坐标映射明确；全部有向路线与完整分支可达性匹配；地图初始单位和静态对象的类型、格位、贴图与碰撞来源都有独立期望。
- **验证：**新增 map33 原始网格、地形绘制、路线、对象和单位测试；至少一条真实 `GameSession` 路线短会话检查运行时转向。静态期望从 APK/TDM/独立参考数据生成，不从 `oregon-10.json` 自身复制。

**完成结果：**将 APK 原始 `td_map_33.tdm` 作为测试 fixture，逐项核对 32×24/768 格及每种 marker 计数；背景768格、街道98条绘制指令与固定种子参考完全一致，碰撞背景与 APK 派生转换一致。比较发现最初的 `oregon-10.json` 虽有正确 TDM 网格和固定种子说明，背景变体及道路图块序列却与参考不一致；现已按参考重建，并用全数组断言防止再次漂移。四个出生口、28条有向边和运行时 action-2 方向均与独立 APK 路线图 fixture 对照；短 `GameSession` 确认首个出生口在 `(27,3)` 按原路线向西转向。地图装饰、招募/活动单位、一组双车头三车厢火车、Dynamite 触发器/箱配对、素材文件及静态碰撞框均有独立期望。map33 专项与 `player-collision.test.ts` 共15项通过，TypeScript 类型检查通过。尚未正式登记关卡；完整波次、单位池和网页入口留在后续切片。

### M31-C3：对白、正式目录、Free Play、回放与资源预载

#### C3-A：关卡身份、简介与十波对白（已完成）

**完成结果：**新增 `oregon-10-identity.ts`、`oregon-10-campaign-copy.ts` 与 `oregon-10-wave-intros.ts`。关卡身份、标题/简介资源 ID、10条英文原文及 Wave 顺序、drawable 头像映射均按 APK 资源和 `GameDesignWaves` 对照；中文作为网页翻译，不推断或播放语音。`oregon-10-campaign-content.test.ts` 3项通过，`pnpm run typecheck` 通过。正式页面入口与预载仍由 C3-C 接通。

#### C3-B：档案快照驱动的关卡 builder 与回放（已完成）

**完成结果：**新增关卡 builder、快照版本/parser 和浏览器 replay factory，组合 map33、十波规则、四类玩家池及 TDM 单位/炸药；回放根据记录版本恢复，不读取导入者档案。覆盖32种解锁组合、非法版本、档案快照一致性和实际 `Game.open` 回放工厂。C3-B 定向测试9项、类型检查通过；未推进完整战役。

#### C3-C：正式/自由入口、页面接线与预载（已完成）

**完成结果：**正式目录登记 global level 30、前置为 Snake River；菜单可按存档显示正式锁定状态，Free Play 可直达 map33。已接通双语标题/简介、地图预览、战斗 HUD、十波对白、正式/自由开局、结算与 Oregon 音乐识别，并预载完整场景和头像。修正全局29→30关及 Oregon 9→10关的旧快照和 E2E 断言。C3 定向单测34项、类型检查通过；Free Play 与正式锁定/开局 E2E 共2项通过。完整 `test:ci` 留给 M31-D。

### M31-D：批次收尾与发布（已完成）

- **依赖：**M31-A 至 M31-C 全部关闭。
- **范围：**核对改动及计划状态，运行 Guns’n’Glory `pnpm run test:ci` 一次；失败时只修复失败范围并重跑失败项，最后重跑完整检查。检查提交包含、构建版本和当前集成分支同步状态。
- **本地收尾结果：**`CI=1 PLAYWRIGHT_PORT=44631 pnpm run test:ci` 通过：类型检查、914 项单测、生产构建和182项 E2E。构建提示既有的大 JS chunk，本批未做拆包重构。更新共享敌人注册表和阶段总数的旧单测期望后，相关20项单测通过。此结果只证明本地工作树，不能代替集成、部署或线上验收。
- **发布与验收结果：**发布提交 `a37a7759036b7a67a69901d79592dcb15011bff7` 的 Actions `44058527187` 成功；GitHub Pages 与 Cloudflare Pages 的来源 SHA 一致。内置浏览器在静音、窗口模式确认 M31 从 Free Play 菜单可进入，开局对白、地图和 HUD 正常；未完整通关。
- **未通过处理：**任何来源数据差异、测试失败、部署 SHA 不一致或浏览器 provider 不可用均保持批次未完成，并在本计划写明具体阻塞项；不得把静态或自动化证据描述成未实际执行的浏览器观察。

## 当前批次：Loot Lakes（M32）

目标是接入 Oregon 第 11 关、全局第 31 关 `Loot Lakes`（APK `td_map_34.tdm`）。基线来自 APK 1.8.6 静态数据、Smali 消费链、现有关卡实现和测试；不完整通关。测试默认窗口模式、静音；除静态证据不能回答某一明确问题外，不启动 Android。

### M32-A：完成 map34 静态审计（已完成）

**完成结果：**[Loot Lakes 静态审计](map31-static-audit.md)记录 APK `td_map_34.tdm` 的 32×24 格网、全部非零 marker 坐标、3 个入口、43 个转向点、3 个出口和54条路线边；还记录 Dakota 地形转换阶段、参数行、9波16条请求、玩家池动作、对象/单位/碰撞、解锁、双语素材基线及未验证边界。独立读取 APK ZIP 的 TDM 字节，确认770字节、768格和marker计数；独立展开路线得到54条边，49个路线节点均从3个入口可达。Smali 直接核对相邻等级：`level == 0x1e`（M31/global level 30）的池上限为 `[6,6,6,6]`，`level == 0x1f`（M32/global level 31）为 `[2,2,0,0]`。同一检查纠正了报告初稿将 raw `36` 初始背景值误写为48的问题：APK `createBackgroundMap()` 对 raw `36` 默认写0；M32-C1 已逐格核对最终塑形、道路覆盖、绘制和背景码。报告不含已被用户要求清理的长哈希/Evidence ID；本步骤未改游戏代码或启动 Android。

### M32-B：接入玩家单位池规则（已完成）

**完成结果：**新增 Loot Lakes 玩家池配置，仅保留实际存在的 Saloon `(9,15)` 与 Gunslinger/Mexican 两类池单位。Wave 1 清空库存并把完整四槽上限设为 `[2,2,0,0]`；未伪造 Fort、Tipi、Cannon 或 Indian 出生路径。`intervalMs=15,000` 沿用网页共享实现；APK 每关全局刷新周期仍未确认，不把该值写成原版结论。M32 定向单测2项、M31 保护性规则测试5项和类型检查均通过。短 `GameSession` 雇佣并尝试派发六名单位，最终只从 Saloon 派出2名 Gunslinger 和2名 Mexican；零上限槽未派发。该实现独立于 M31，M31 `[6,6,6,6]` 保持不变。完整 `test:ci` 留到 M32 批次收尾。

### M32-C1：Dakota 地形绘制与最终地形栅格（已完成）

**完成结果：**从 APK `res/raw/td_map_34.tdm` 固定 770 字节测试夹具，并写入 Loot Lakes 24×32 原始格网。`oregon-11.json` 含 768 个背景绘制命令和 56 个道路/桥梁命令，使用 Dakota 的通用 `tiles_*` atlas；没有套用 Oregon/Mississippi 的 `miss_tiles_*` 别名。`oregon-11-scene.ts` 将绘制图集区域反映射为 24×32 最终背景码，并拒绝重复、越界或不完整格点。

**验证：**`tests/oregon-11-map.test.ts` 将 APK 字节、完整 marker 计数、所有绘制命令及最终背景码分别与 APK Smali 派生的独立测试参考逐项比较；检查实际图片存在、图集 source rectangle 不越界及未误用 `miss_tiles_*`。`node --import tsx --test tests/oregon-11-map.test.ts` 通过，`pnpm run typecheck` 通过。参考转换的随机变体使用固定 Java-compatible seed；这验证确定性网页基线，不声称重现 Android 每次启动的随机贴图序列。

**边界：**C1 完成时尚未添加场景对象或玩家单位，也未做浏览器视口视觉核对；静态对象和桥面移动在后续 M32-D1 验证。

### M32-C2：完整路线图与运行时转向（已完成）

**完成结果：**新增 Loot Lakes 全部 spawn-to-exit route definitions，并建立 action ID 到 row-major `spawnPointId` 的映射 `{0:2,1:1,2:0}`。独立路线图夹具收录 54 条唯一有向边、3 个入口、43 个转向和3个出口。静态审计按标记方向分组列出路线时包含57次边记录，其中3条共享边重复；测试夹具按 `from-cell + direction + to-cell` 去重后仍与审计结论的54条唯一边相符。

**验证：**`tests/oregon-11-routes.test.ts` 核对 marker→spawn ID、全部唯一边、所有转向方向、3个出口和每个路线 marker 的覆盖，并使用真实 `free` `GameSession` 分别让三个入口生成敌人并到达首个 APK 转向。Loot Lakes 同时加入共享 `wave-routes.test.ts`，与其他28张正式地图共同逐格检查 action-2 方向表，避免只由本关专属测试覆盖。相关测试和 `pnpm run typecheck` 通过。

**边界：**短会话验证了三个入口的来源映射和首个运行时转向；全部路径的静态有向边已逐项核对，但尚未用浏览器观察完整敌人行走，也未验证玩家在桥面或地图对象周围的移动/碰撞。

### M32-D1：静态地形对象、建筑与碰撞来源（已完成）

**完成结果：**为 marker `69/70/71/74/76/112/116/126` 接入 rocks、tree、windmill、bush、Saloon、shack 和 water rock；按 APK 锚点绘制 Saloon 与横向双格 shack。锁定时不绘制 raw `150` Casino，留待 D2 按 Gambler 解锁状态创建。静态碰撞只由原始 TDM marker 和 APK 碰撞表生成，不从贴图边界复制碰撞框。静态审计中的 shack 资源名笔误已按仓库实际 APK 资源映射更正为 `b_2x1_shack`。

**验证：**`tests/oregon-11-map-entities.test.ts` 逐项比对全部静态 marker 坐标、资源文件和独立 APK 碰撞框期望；真实 Loot Lakes `GameSession` 短移动确认 Saloon、shack、rocks 阻挡，raw `80/88` 桥面允许沿路移动，raw `36` 墙阻挡越界。与地图和路线定向测试合计 7 项通过；`pnpm run typecheck` 通过。完整 `test:ci` 留到 M32 批次收尾。

**边界：**D1 自身未接入初始/睡眠单位、炸药或解锁后的 Casino/Gambler；这些内容已由 M32-D2 完成。D1/D2 均未进行浏览器全视口观察，留待 F。

### M32-D2：新局单位、炸药与 Gambler/Casino 配对（已完成）

**完成结果：**按 map34 的 `96–101`、`130/131`、`132` marker 复用 TDM 单位构造器，默认单位里程碑只生成对应的睡眠招募单位；Indian marker 数量为 0，不伪造单位。所有门槛解锁后生成37个唯一 ID 单位。Gambler `132` 和 Casino `150` 仅在 Gambler 已解锁、且地图同时存在对应 marker 时成对创建。`102/110` 由最近配对规则生成两组独立 Dynamite，沿用 global level 20/30 完成门槛。

**验证：**`tests/oregon-11-map-entities.test.ts` 比对全部单位 marker 坐标、activity、默认/全解锁及 Pyromaniac/Salesman 部分解锁状态、唯一 ID、贴图文件、Gambler prize 模板、Casino 配对与条件碰撞框；另核对两组 Dynamite 配对、资源和锁定/解锁碰撞。真实短 `GameSession` 验证睡眠 Gunslinger 与已解锁 Dynamite 阻挡移动，锁定 Dynamite 不阻挡，地形墙仍按原规则阻挡。与 C1/C2/D1 地图及路线测试合计 10 项通过；`pnpm run typecheck` 通过。完整 `test:ci` 留到 M32 批次收尾。

**边界：**本切片只建立可被正式/自由内容工厂调用的实体与解锁构造；正式入口、保存内容版本及回放快照接入留待 F。未模拟完整关卡。

### M32-E：初态、难度、波次和玩家池（已完成）

**完成结果：**新增 Loot Lakes 独立规则与波次模块，按 global level 31 接入 `$250`、25 条生命、3级升级上限、Easy/Medium/Hard 敌人生命倍率 `56/75/100%`、999 个奖励箱、25秒生成间隔及 `[2,2,0,0]` 玩家池生命周期上限。9波共16条请求按 APK 原调用顺序还原；action ID 通过本图 marker 映射到网页 `spawnPointId`，第9波 Boss 保持在请求索引8，Doc 索引9为0。没有从相邻 M31 复用其 `$400`、难度倍率或 `[6,6,6,6]` 上限。

**验证：**`tests/oregon-11-campaign-rules.test.ts` 以独立于生产模块的 Smali 审计期望逐字段核对参数和全部16条请求；实际短 `GameSession` 检查开局现金/生命、奖励箱状态、Wave 1 来源入口及 Wave 9 Boss 类型。玩家池动作检查四种池槽全部清零并设置完整上限。连同 map、route、entity 定向测试共14项通过，`pnpm run typecheck` 通过；完整 `test:ci` 留到 M32 批次收尾。

**边界：**每关玩家单位池的全局刷新周期仍使用共享网页值15秒，APK 对应周期尚未确认；此值不是原版参数结论。对白、正式战役/Free Play 路由、内容版本和回放入口留待 M32-F。

| 顺序 | 切片 | 实现范围与验收 | 验证与状态 |
| --- | --- | --- | --- |
| M32-D1 | 静态地形对象、建筑与碰撞来源 | 依赖 C1 的原始格网和最终地形；按 map34 marker 接入 rocks、tree、windmill、bush、shack、Saloon 和水岩。Casino 的条件创建留待 D2。贴图、锚点和对象碰撞框分别按 APK 证据处理；正式 TDM 地图以原始 marker 生成静态碰撞，不把贴图外框当碰撞。 | **已完成。**静态 marker、资源和独立 APK 碰撞框期望逐项匹配；真实 `GameSession` 覆盖 Saloon、shack、rocks、raw `80/88` 桥和 raw `36` 墙。定向 7 项与类型检查通过；已本地提交。睡眠单位、炸药及解锁后的 Casino/Gambler 留待 D2。 |
| M32-D2 | 新局单位、炸药与 Gambler/Casino 配对 | 依赖 D1；从 TDM 生成 raw `96–101`、`130/131`、`132` 的正确 activity、唯一 ID 和解锁状态，并从 `102/110` 建立炸药配对。Casino 仅在 Gambler marker 和对应解锁都满足时创建；两者数量必须匹配。关卡访问、全局单位里程碑和新局对象语义分别判断；回放快照编码仍留在 M32-F。 | **已完成。**全部 marker、默认/全解锁/特殊部分解锁、ID、资源、Gambler/Casino 配对及 Dynamite 锁定碰撞均有独立期望；短 `GameSession` 验证睡眠单位和炸药阻挡。定向测试与类型检查通过；已本地提交。 |
| M32-E | 初态、难度、波次和玩家池 | 依赖 C2 的 spawn/action 映射、M32-B 的池契约及 D1–D2 的地图实体；按 `GameDesignData` 正确等级行接入经济、生命、升级、宝箱及三档难度，并按 APK 调用顺序实现9波、16条请求、间隔/HP/速度倍率和玩家池动作。 | **已完成。**独立期望核对参数与全部请求；短 `GameSession` 验证开局资源、Wave 1 来源入口及 Wave 9 Boss；玩家池完整上限验证通过。定向14项、类型检查通过；全量检查留到批次收尾，已本地提交。 |
| M32-F | 双语内容、正式/自由入口与真实视口验收 | 依赖 C1–E 完成；加入 APK 英文身份/对白、中文译文、正确头像/音频资源，建立内容版本和回放 factory；登记正式 Dakota 第31关（前置 `campaign-oregon-10`），开放已实现关卡 Free Play、结算和资源预载。沿用现有 1024×576 Canvas 与相机，不新增测试专用产品入口。 | **实现、本地全量验收及集成提交完成；远端 E2E 门槛未通过，尚未发布。**本地提交 `0394f36`；集成提交 `0c76dba`；发布候选 `afe9089`。正式/自由入口、快照回放、资源预载、对白和音乐轮换均有自动化覆盖；本地内置浏览器窗口模式、静音检查 Loot Lakes 实际地图视口与首波对白。地图路线及碰撞由 `GameSession` 定向测试覆盖，不表述为人工通关或 Android 运行观察。 |

**M32-F 完成结果：**关卡英文名称、简介和9波对白按 APK 资源顺序登记，中文为网页翻译；头像与 Dakota 环境/战斗音乐资源加入应用并验证文件可离线加载。关卡 builder 将四类单位解锁和炸药解锁编码成32种内容版本，正式关卡 global level 31 在 Lumber Mill Hills 完成后开放；Free Play 可选三档难度且不写入战役进度。浏览器菜单、预览地图、HUD 地区、首波对白、音乐事件和回放 factory 均接入 Loot Lakes。回放按录制快照重建单位及炸药状态，不读取导入者档案。

**M32-F 验收边界：**新增 `oregon-11-campaign-content.test.ts`、`oregon-11-formal.test.ts`、`oregon-11-replay-content.test.ts` 与 `t70-dakota-01-integration.spec.ts`。内置浏览器确认地图视口、原版对白、主要地图贴图和全屏控件已加载；未在浏览器手动移动我方单位或推进完整战斗，地图路线、桥面和对象边界由 APK 派生期望及真实 `GameSession` 短会话覆盖。测试默认窗口模式、静音；未启动 Android、未进入全屏、未播放音频。将 Loot Lakes 加入共享路线矩阵后，`CI=1 PLAYWRIGHT_PORT=43159 pnpm run test:ci` 首次复验出现2项 E2E 失败；其后 `CI=1 PLAYWRIGHT_PORT=43161 pnpm run test:ci` 通过类型检查、938项单测和生产构建，但 E2E 为166/184。随后18个失败用例逐项复跑全部通过；`CI=1 PLAYWRIGHT_PORT=43166 pnpm run test:ci` 再次通过类型检查、938项单测、生产构建和184项 E2E，耗时约6分钟。首次18项失败没有稳定复现，不据此归因为产品缺陷或特定基础设施机制；构建保留既有 JS chunk 超过500KB提示。发布候选在 GitHub Actions `44221923581` 的 attempt 1 和 attempt 2 均在 `t29-campaign-menu.spec.ts` 的 Escape 暂停板断言失败（其余183项 E2E 通过），部署 jobs 因此跳过；远端测试没有记录失败时的战斗波次和档案状态。该失败后新增测试战斗启动器的档案失败 fallback，并在 Escape 前断言 Wave 1 已初始化；本地完整 `t29-campaign-menu.spec.ts` 7 项 E2E、档案不可读 fallback 定向测试和类型检查通过。修复后 `CI=1 PLAYWRIGHT_PORT=43173 pnpm run test:ci` 通过类型检查、938项单测、生产构建和185项 E2E，耗时约5.8分钟。但 master 候选 `1cf4ade` 的 Actions `44231079917` 再次在同一 `pause-board` 可见断言失败，184项通过；新增的 `wave-status` 非空前置条件已通过，因此“远端只处于半初始化且没有 Wave 1”不足以解释本次失败。该 run 没有上传 Playwright 诊断附件，部署 jobs 再次跳过。当前仍不能确定是 Escape 事件被拦截、暂停守卫条件成立、焦点/页面状态差异还是其他运行时状态；不得继续把旧 fallback 假设写成根因。

### M32-F 收尾：定位并关闭 E2E 尾项

| 顺序 | 步骤 | 范围与验收 | 状态 |
| --- | --- | --- | --- |
| 1 | 失败用例归因 | 对最终复验的18个失败按页面导航、页面交互、全屏/缩放断言和长战斗拆组；逐组单独复跑。必须确定是产品行为、测试夹具、浏览器主线程/资源负载还是服务启动问题；仅因单测或 DOM 快照可见不能判通过。 | **已完成。**18个失败用例在独立单 worker 运行中全部通过；Fort Kaboom 长战役单项12秒通过，相关全屏、手机布局和缩放4项也通过。失败没有稳定复现，当前没有证据支持生产代码或断言修复；若再次出现，需根据 trace/浏览器状态调查，不推断具体机制。 |
| 2 | 修复有证据的根因 | 若单项稳定复现产品错误，修复对应生产逻辑并增加回归；若为测试夹具错误，修正事件探针或等待条件，但必须保留对用户可见行为的断言；若为启动/资源问题，依据请求和浏览器状态证据修复，不通过统一延长超时隐藏问题。 | **已完成。**定向复跑与后续完整套件通过；没有稳定根因需要改代码或测试。 |
| 3 | 完整批次检查 | 运行 `CI=1 pnpm run test:ci`，要求类型检查、全部938项以上单测、生产构建和184项以上 E2E 全部通过。失败时回到步骤1；不得以定向测试通过替代。 | **已完成。**`CI=1 PLAYWRIGHT_PORT=43166 pnpm run test:ci` 通过类型检查、938项单测、生产构建和184项 E2E，耗时约6分钟。此前单次完整复验出现18项失败，但逐项复跑与本次全套均通过。 |
| 4 | M32-F 本地提交 | 完整检查通过后复核差异与资源文件，只提交 Loot Lakes F 切片及必要计划更新；清除临时依赖链接和测试产物。 | **已完成。**提交 `0394f3631df668d4a68937f4bd5cef33960f9531` 包含53个相关文件；`git diff --cached --check` 通过，临时 `node_modules` 链接已移除。 |
| 5 | 集成与发布门槛 | 按 app 规则 squash 集成到 `gunsnglory`，经批次门槛后合并并推送 `master`；等待部署成功，核对部署 SHA，再以静音、窗口模式用内置浏览器验收 Loot Lakes 入口与开局。 | **已推送候选，未发布。**集成 squash `0c76dba`，master 候选 `afe9089`；GitHub Actions `44221923581` 两次完整运行都在同一 Escape 暂停板 E2E 失败，GitHub/Cloudflare Pages 部署 jobs 跳过。未核对部署 SHA，也未做发布后页面验收。 |
| 6 | 稳定测试战斗启动并验证 Escape 前置 | 仅调整开发用 `?testBattle=1` 启动路径，使测试场景不因档案是否可读而落在“显示战斗页面但没有 GameSession”的半初始化状态；保留真实 Cow Gulch 内容、正式战斗波次和对白。更新 `t29-campaign-menu.spec.ts`，在发送 Escape 前明确断言 Wave 1 已加载。不得改生产战斗流程或降低暂停断言。 | **本地完成。**有档案时继续使用正式关卡入口；档案不可读时使用相同 Cow Gulch 正式内容创建测试会话。Escape 用例先确认波次状态，再验证暂停板和模拟暂停。档案正常/不可读两种定向测试通过，完整 t29 文件7项通过，类型检查通过。两次远端失败当时的具体页面状态仍未知，不写成已证实根因。 |
| 7 | 集成、远端重验与发布 | 本地完整 `test:ci` 通过后，squash 集成修复到 `gunsnglory`，再将修复整合到 master 并重新触发 Pages workflow。确认全部测试和部署 jobs 成功；核对 GitHub Pages、Cloudflare Pages `build-info.json` 都指向最终 master SHA，再用内置浏览器检查 Free Play → Dakota → Loot Lakes、开场对白和地图。 | **未通过。**候选 `1cf4ade` 的 Actions `44231079917` 再次在 Escape 后找不到 `pause-board`，其余184项通过且部署 jobs 跳过。先定位失败时实际页面和事件状态，再决定是否需代码或测试修复；尚未部署、核对 SHA 或做线上验收。 |
| 8 | 采集 Escape 失败时状态 | 在 `t29-campaign-menu.spec.ts` 中保留失败断言，在按 Escape 前后记录 `.game-frame` 的 `data-ui-route`、`data-simulation-state`、`data-active-overlay`、波次状态、所有打开的 dialog、`document.hidden/visibilityState/fullscreenElement`、焦点元素，以及 Escape 事件在应用处理前后的 `defaultPrevented`。先核对监听顺序和暂停守卫，禁止只增加超时或删除断言。 | **本地完成，待远端观察。**t29 文件 `--repeat-each=3` 共21项通过；三次首次 Escape 前均为 `battle/running`、文档可见、无打开 dialog，事件在应用处理后 `defaultPrevented=true`，暂停板正常打开。`CI=1 PLAYWRIGHT_PORT=43292 pnpm run test:ci` 通过类型检查、938项单测、生产构建及185项 E2E（约5.9分钟）。本地未复现 Actions 失败；先推送诊断版本，以远端日志记录失败现场，不能据本地通过推断根因。 |

**批次发布策略：**M32 内容集成按完整功能批次发布；不为静态审计、单个实现提交或文档更新单独发版。只有整批本地检查、CI、部署 SHA 和浏览器验收都通过后才关闭批次；若发现核心静态数据与 APK 不一致，暂停后续依赖该数据的实现并先更正基线。

## 已完成批次的证据入口

- Snake River 的原始 TDM、参数、路线、单位和对白核验见[静态审计](map29-static-audit.md)。
- Loot Lakes 的 APK/TDM 静态基线见[静态审计](map31-static-audit.md)。
- 新关卡的共享进度断言、资源预载和运行时路线回归要求见[经验记录](experience-log.md)。
