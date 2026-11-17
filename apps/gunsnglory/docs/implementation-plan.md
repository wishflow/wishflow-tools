# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮开始先核对当前实现与进度，再细化接下来几个独立步骤的实现、依赖和验收；每完成一步就更新本计划并移除已完成事项。

## 当前状态

- M30 Snake River（Oregon 第 9 关／全局第 29 关）已完成并公开发布。发布提交 `9fbb26a48c6d75143aaa469ce249f70f18bc3684` 的 GitHub Actions `44023162078` 成功；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配该 SHA。发布页面由内置浏览器检查通过，详情见[经验记录](experience-log.md#新关卡集成的共享断言与启动预载)。
- 回同步提交 `9cafb9d` 已将发布提交合并进 Guns’n’Glory 集成分支；回同步后仅在本计划和经验记录中补齐最终状态，没有重新改动游戏实现。
- M30 最终 `CI=1 PLAYWRIGHT_PORT=4180 pnpm run test:ci` 通过类型检查、892 项单测、生产构建和180项 E2E。构建仍有既有大 JS chunk 提示；本批未做拆包重构。
- 普通发布比例为 36/195（18.5%），低于 20% 目标；静态审计、完整检查、部署和回同步不计为实现切片。
- M22 留下的旧版 M4–M7 回放导入探针仍未确认；M30 未重开该问题。后续若处理，先复核其复现条件和现有实现，不重复检查已经闭合的 Snake River 回放路径。
- 当前开发目标为 Lumber Mill Hills（Oregon 第 10 关／全局第 30 关，M31，TDM map33）。独立工作树 `codex/gng-m31-lumber-mill-hills` 基于已同步的 Guns’n’Glory 集成分支。M31-A/B、C1、C2 与 C3-A/B/C 已完成；C2 包含参数/波次静态审计、规则数据、四类玩家池及短 GameSession 验证，C3 已接通 APK 文案、快照 builder/回放、正式目录、Free Play、菜单/结算路由与资源预载。M31-D 本地完整检查通过：类型检查、914 项单测、生产构建和182项 E2E 均成功。首次单测暴露两处共享测试期望过期（Mississippi 全局敌人表未列 Boss 类型7、Progress 阶段快照仍为29关），已修正并记录于经验文档。集成、发布和部署 SHA 核对仍待执行。
- M31 静态核查确认：`addToWave` 的10/11/12整数重载会分别补零到原始请求槽位2–11；槽位10由 APK 以请求类型7生成 Boss，槽位11以请求类型9生成 Doc。派生波次索引显示，global level 22–30 都有 Boss 请求，前30关无 Doc 请求；M31 的末两次请求均为 Boss。M31-A/B 已将网页请求索引8接到 Boss，并将 Oregon 关卡数据中的 Boss 数量移出 Doc 索引9。研究分支 `game-analysis.md` 对 Dynamite 102/110 的说明与 APK Smali 相反；相关实现和文档判断必须以原始分支表复核，并在经验记录中保留该文档冲突。
- M31 按以下依赖步骤推进；每步完成后删除对应活动项并更新后续验收范围。

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

### M31-D：批次收尾与发布

- **依赖：**M31-A 至 M31-C 全部关闭。
- **范围：**核对改动及计划状态，运行 Guns’n’Glory `pnpm run test:ci` 一次；失败时只修复失败范围并重跑失败项，最后重跑完整检查。检查提交包含、构建版本和当前集成分支同步状态。
- **本地收尾结果：**`CI=1 PLAYWRIGHT_PORT=44631 pnpm run test:ci` 通过：类型检查、914 项单测、生产构建和182项 E2E。构建提示既有的大 JS chunk，本批未做拆包重构。更新共享敌人注册表和阶段总数的旧单测期望后，相关20项单测通过。此结果只证明本地工作树，不能代替集成、部署或线上验收。
- **待完成验收：**检查提交包含和集成分支同步状态；以一个 squash commit 集成发布；Pages workflow 成功且 GitHub Pages/Cloudflare Pages 报告来源 SHA 与发布提交一致；用内置浏览器从关卡菜单检查 M31 入口、预览、开局对白及地图加载。保持静音/窗口模式，不以人工通关作为验收。
- **未通过处理：**任何来源数据差异、测试失败、部署 SHA 不一致或浏览器 provider 不可用均保持批次未完成，并在本计划写明具体阻塞项；不得把静态或自动化证据描述成未实际执行的浏览器观察。

## 已完成批次的证据入口

- Snake River 的原始 TDM、参数、路线、单位和对白核验见[静态审计](map29-static-audit.md)。
- 新关卡的共享进度断言、资源预载和运行时路线回归要求见[经验记录](experience-log.md)。
