# Guns’n’Glory 问题经验记录

本文记录本应用已复现问题和需要防止重演的工程经验，供开发 agent 阅读，也供后续调整项目约束时参考。按问题所属模块组织，不按日期排列。

## 记录规则

每个问题关闭时记录：

1. **表现与复现：**用户看到什么、从什么界面状态和操作顺序可以复现。
2. **根因与证据：**指向具体代码、样式、测试或浏览器观察；推测必须标为假设，未核实前不写成事实。
3. **漏测点：**此前的测试为何未发现，或错误断言了什么。
4. **修复与防回归：**改了什么、增加了哪条可重复的自动或浏览器验证。
5. **避免重复：**记录已经排除的路径及原因，只保留后续执行者可复用的信息。

修复未完成的问题可以先登记为“待验证”；实现和运行验证结束后，应在同一条记录中补充结论。记录根因时优先引用稳定的文件/选择器/测试名称，不抄录冗长日志、日期或散列值。

## 新增战役关卡后的进度断言

**状态：**M15 接入时发现并修复既有 E2E 断言过期；完整 `test:ci` 已通过。

- **表现与复现：**加入 Mississippi 第15关后，旧浏览器测试仍期待总进度为 `*/14`、区域中只有4个已实现关卡，并把第15关当作禁用关卡；实际页面正确显示15关和5个可玩关卡，因此相关测试失败。
- **根因与漏测：**新增关卡注册会影响全战役进度摘要、区域可玩数量及后续锁定范围。检查时只更新了部分单元测试和关卡入口测试，没有全仓搜索所有 E2E 的硬编码计数；首次完整 CI 暴露了遗漏。
- **修复与防回归：**将进度期望更新为15关，Mississippi 已实现数更新为5，并将未实现范围从16关开始。修复后相关定向测试通过，完整 `test:ci` 通过 630 项单测和143项 E2E。
- **避免重复：**登记新战役关卡时，搜索并核对全仓所有 `*/N stages`、区域“已实现关卡数”、可用/禁用关卡范围及阶段快照断言；不要只检查新关卡自己的测试。

M23-F 的首次完整检查再次暴露相同问题：748项中20项单测失败，包括16个旧正式关卡断言仍期待21关、Apache Valley/Cow Gulch/Fort Kaboom的完整目录快照缺少第22关，以及 Progress 快照少了锁定的 Cashcow Canyon；修正后20个单测定向复跑全部通过。全量 E2E 随后发现7项旧断言：6处仍期待 `*/21 stages complete`，另有 Eastwood Free Play 测试仍把可选的 Level 22 当成禁用关；对应断言已更新，相关6个 spec 共13项定向用例全部通过。最终 `CI=1 PLAYWRIGHT_PORT=43217 pnpm run test:ci` 通过类型检查、748项单测、生产构建和158项 E2E。构建 JS chunk 2.559 MB（gzip 281.36 KB），有超过500 KB的既有 chunk 警告；本批没有修改拆包架构。

## 新增关卡时同步战斗 HUD 的地区标签

- **表现与复现：**Cashcow Canyon 已出现在 Oregon 选关和正式战役中，但 Free Play 与正式开局后的战斗 HUD 仍显示 `NEW MEXICO`。从 Oregon 选择 Level 22 并开始战斗即可复现。
- **根因与证据：**`main.ts` 的 `campaignRegionLabel` 使用逐关 ID 判断地区，只列出 Oregon 的 Eastwood Forest；遇到 Cashcow 的 `officialStage` 时回退到默认 New Mexico。`t61-oregon-02-integration.spec.ts` 首次对 HUD 区域断言时捕获了该错误。
- **修复与防回归：**将 `oregon02CampaignId` 纳入 Oregon 标签判断。新增正式关卡时，除了检查选关所属地区，也要检查战斗 HUD 在正式和 Free Play 两种入口下显示的地区与关卡目录一致；`t61` 分别断言 `OREGON · 22` 和 `FREE PLAY · OREGON · 22`。

## DEX 伪代码分支与路线优先级复核

**状态：**Smali 判读规则已验证；M11–M16 均已修复并通过回归。

- **风险表现：**直接照搬 JADX 输出可能把新开局与读取未完成存档的对象创建分支看反；只凭一张地图预览断言路线正确，也可能漏掉不同入口和随机转向组合。
- **证据与核实：**`GameObjectManager.createGameObjectsFromBasicMap` 的 JADX 伪代码在 map-load 布尔分支处存在控制流重建歧义。Smali 中 code 96–101 与130/131都进入 `fromLoadGame == false` 的创建分支：前者按 type1–6 创建 activity 4 可招募单位，后者按 type35/36创建特殊招募单位；加载存档时跳过 TDM 的新局初始对象。网页先前误把96–101当作只在读档恢复的 marker，继而在 M11–M16 手工工厂中将其跳过。静态审计纠正了判断；六关现复用 TDM 单位构造器，v2 内容版本记录四种全局单位解锁位，M16 另记录 Dynamite 解锁位。旧 v1 回放仍按原单位列表重建，123项六关关联测试和类型检查通过。结论以 APK Smali 条件跳转和字段赋值为准，不把伪代码描述成原始源码。
- **路线复核：**解析 `EnemyDirectorField` 方向表和 `PriorityMap.recursiveLengthTracking` 后，用明确的具体路径独立计算所有路线格优先级，再与网页 TypeScript 算法逐格比较；map05 的 5 个路线变体、142 个路线格均匹配。属于静态算法交叉校验，不是 Android 或浏览器运行观察。
- **路线方向字段：**`WaveRouteDefinition.redirects[n].directions` 表示从该控制点离开的方向，不是从前一个节点进入该点的方向。map14 首次编写时把图边的方向误记在目标节点上；从原始 TDM 重新解出的方向图测试立即失败。修正后比较全部 13 条完整路径及 59 条有向边。新增地图路线时按控制点的出边填写，并用原始 TDM 独立展开每个分支；只检查路线经过了哪些格子不足以验证方向。
- **防回归：**碰到 `fromLoadGame`、`isNewGame` 等布尔分支或嵌套 switch 的反编译歧义时，先检查 smali 条件跳转及字段赋值，再参考 JADX 伪代码。多入口/随机岔路的关卡必须覆盖所有路线变体，保存格网、方向节点、出生点和出口的独立期望；不要用完整战役通关替代静态算法验证。
- **审计结论也要反向核对实现：**M16 审计虽改正了 `130/131` 的新局语义，却再次错误地将 `96–101` 写成仅读档创建；代码随后照此省略了 M11–M16 的可招募单位。M19 接入时，同一错误又进入 M19 审计和 M18 的专用工厂：TDM 96–101 实际在 `fromLoadGame == false` 时创建 activity 4 招募单位，读档时才跳过；仅更新报告或只测共享工厂都不够，必须检查每张地图工厂与最终 `ScenarioContent.units`。本轮已恢复 M18/M19 的 Mexican、Indian、Sniper、Grandpa marker 行为；M18 新内容升为 v2，旧 v1 回放继续使用原单位列表。后续逐图测试需从真实 TDM 核对坐标、activity、解锁门控和唯一 ID，并至少覆盖一条对应关卡的回放入口。

## 内容版本必须覆盖所有影响开局的档案状态

**状态：M22 修复中；M4–M7 回放工厂和 Eastwood 新局单位修复已完成，实际回放入口矩阵待验。**

- **表现与复现：**M4–M7 的部分地图单位受全局关卡里程碑解锁影响，但四关长期使用固定 `contentVersion`。同一回放在不同档案下可能重建出不同初始单位。M21 Eastwood 的定制实体工厂又误将 map24 的 96–101、130、131 marker 排除在新局之外；APK 实际在 `fromLoadGame == false` 时创建 activity 4 招募单位。
- **根因与证据：**M4–M7 内容构造器读取当前 `completedScenarioIds`，回放入口却没有把这些解锁状态编码进版本或重建快照。Eastwood 审计曾依赖错误重建的 JADX 伪代码，未根据 Smali 条件跳转和最终单位列表反核；Smali/DEX 及 `Guns’n’GloryThread` 调用点已确认新局/读档语义。
- **修复与防回归：**M22-D 为 M4–M7 新版本记录实际影响内容的全局解锁位，并按录制版本构建 replay factory；v1 保留导入时档案语义，Tech Town 继续补入 M3。M22-E 让 M21 新局通过共享 TDM 单位工厂生成 marker 96、97、100、101、130、131 的 activity 4 单位，M21 v2 记录新单位集，v1 replay 过滤 activity 4 并保留已发布版本的活动单位列表。M22-F 覆盖了实际导入路由、v1/v2 版本识别、未知版本拒绝、Free Play 与正式入口；M4–M7 的16种解锁组合和地图访问位另由工厂单测覆盖。
- **测试夹具边界：**M4–M7 v1 沿用导入时档案，因此生成带 `preparedSetup` 的 v1 探针时，录制档案必须与导入档案相同；否则数字参数路径集合可能不同，错误表现为 `prepared-setup-invalid`，不是内容版本路由失败。v2 探针则故意使用不同档案，验证录制快照。M4 `map-access=0` 表示不可进入状态，真实 Free Play 新局会补入 M3 并记录开放快照；关闭状态检查版本解析和 `prepare`，不伪造一场可回放战斗。
- **避免重复：**本轮不改 APK 已核实正确的共享 `createNewMexicoMapUnits()`，也不重新分析 marker 96–101 的 Smali。后续新增关卡时，从真实 TDM marker、最终 `ScenarioContent.units`、内容版本解析和不同当前档案下的 replay factory 四处闭环；不能仅凭固定版本字符串或单测中间映射通过判定。

## 档案驱动的关卡测试必须使用同一档案生成内容版本

**状态：**M22-G 首轮完整 CI 中发现并修复。

- **表现与复现：**`browser-bootstrap.test.ts` 用含关卡解锁的 completed IDs 创建 Billy Hills Game，但请求版本来自默认空档案；`Game.open` 以 `content-version-unavailable` 正确拒绝。该项在 M22-C 的内容版本快照改造后成为过时测试夹具。
- **根因与修复：**关卡 builder 根据输入档案生成内容版本；测试调用 `getBrowserScenarioContentVersion` 时省略了同一组 completed IDs。开局请求现将该档案传给版本解析器，避免用不同快照组装请求。
- **防回归：**任何测试若以档案构建 Game，`contentVersion` 必须从相同的 completed IDs 生成；若有意测试跨档案回放，需通过 replay factory 并明确记录 v1/v2 的不同语义，不能复用正式新局请求的默认版本。

## TDM Dynamite marker 与对象角色不能混写

**状态：M16 静态审计与关卡测试已校正。**

- **错误表现：**Highpoint Terrace 审计曾把 code `102` 写成炸药箱、把 `110` 写成触发器；而应用现有配对器将 `102` 作为 trigger、`110` 作为 box，导致按审计编写的坐标期望失败。
- **根因与证据：**`GameObjectManager.smali` 的 `createGameObjectsFromBasicMap` packed-switch 中，map value `102` 命中创建并加入 `DynamiteTrigger` 列表的分支；`110` 命中创建并加入 `DynamiteBox` 列表的分支。map19 网格位置分别为 `(28,10)` 与 `(27,11)`。此前审计将 marker 坐标与对象语义对调。
- **修正与防回归：**[M16 静态审计](map16-static-audit.md)已改为 trigger `(28,10)`、box `(27,11)`；`mississippi-16-campaign-rules.test.ts` 从真实地图网格检查配对结果和 20/30 关解锁路径。新增炸药对象时同时核对 TDM 字节、Smali 对象构造分支和运行时字段语义，不能只根据对象名称或相邻 marker 推断。

## TDM 单位 marker 必须验证到最终场景单位

**状态：map10 切片 B 已修复并由静态 marker 对照测试验证。**

- **表现与复现：**Lost City 的 tile 107 被解析成 unit type 4、activity 5，但网页场景中没有对应的活动 Indian。
- **根因与证据：**APK DEX/Smali 的 104–109 分支按 `tile − 103` 创建 unit type 1–6 并设为 activity 5；JADX 把该分支误还原成空块。网页共享工厂此前只创建 activity 5 的 Gunslinger、Mexican 与 Gambler，type 3–6 走到“只处理 activity 4”的分支后被跳过。map10 的 107 因此漏掉；已有 Tech Town 测试只核对 marker→类型/activity 的解码，没有用包含 type 4 activity 5 的真实 TDM 验证最终场景。
- **修复与防回归：**activity 5 的 Fort 类地图单位现在复用 APK 对应设计的 awake 素材、尺寸锚点、速度、音效与武器；map10 测试从实际 TDM 核对全部单位坐标、类型和 activity，并断言 active Indian 使用 `player_indian` 且不带 hire 状态。每张地图的检查应同时覆盖原始 marker、共享 placement 与最终 `ScenarioUnit`，不可把中间映射表测试当成对象已生成的证明。
- **避免重复：**不需要重新反编译这条 104–109 分支；总表和 Smali/DEX 已足以定类型。后续若再遇到同类问题，应先检查共享工厂是否真的消费所有已解码的类型/activity 组合。
- **地图范围：**不要为 Mississippi 单独过滤 code96–101。map14–20 的真实 TDM 数量和解锁状态应驱动新局单位；新内容测试逐格比较 TDM marker 与最终单位。旧回放需按旧 contentVersion 重建其原单位列表，不能为兼容回放而继续让新局内容漏单位。

## 同类型可招募 marker 必须生成唯一单位 ID

**状态：Dead Rocks 已修复并由全解锁场景测试验证。**

- **表现与复现：**Dead Rocks 有两个 code130 Pyromaniac 招募点。全局 Pyromaniac 解锁后打开 Free Play，Game 初始化因重复路径 `units/pyromaniac-hire-01/movementSpeedFinePer100Ms` 拒绝场景。
- **根因与漏测：**共享 New Mexico 单位工厂的 Pyromaniac 和 Salesman 构造器固定使用 `hire-01` ID；同类 Fort 单位已有按类型计数，而特殊招募单位没有。仅以默认锁定快照创建场景时，这些 marker 不生成，所以既有唯一性断言没覆盖真实解锁场景。
- **修复与防回归：**特殊招募单位也按同类型 marker 递增 ID；Dead Rocks 全解锁测试要求全部单位 ID 唯一，并逐 marker 核对对应类型和数量。以后添加解锁或重复 marker 时，应在至少一个包含全部解锁的实际地图场景上初始化 Game，不能只检查默认锁定场景。

## 出生池验证应使用来源 ID，不猜地图坐标

**状态：map10 短会话测试已采用来源事件验证。**

- **错误路径：**最初用第一帧敌人的 `positionFine.y` 推断出生池行。Lost City 四个入口都在 `y=0`，而敌人编组在出生标记外侧生成，因此测得的 y 行既相同又位于地图边界之外，不能区分四个 pool。
- **根因与证据：**`GameSession` 按 `CampaignSpawnPoolDefinition.spawnPointId` 选择 `previewWave` 中对应出生场，再在该方向的地图外侧创建敌人；编组偏移与首帧移动还会改变坐标。`EnemyView.positionFine` 是运行位置，不是原始 TDM marker 或 pool ID。
- **修正与防回归：**map10 每个波次的一帧会读取 `enemy-group-spawned` 事件中的 `spawnPointId`，与该波含请求的池编号逐项比较；出生 marker 的坐标和方向另由静态 TDM 测试验证。
- **避免重复：**多个 spawn 共用同一地图边时，不用 positionFine 的同轴行/列猜 pool。优先断言来源事件 ID；若需要视觉位置，再验证与静态 spawn marker 的方向偏移关系。

## 波次请求向量是生成权重，不是固定出敌顺序

**状态：已在 map05 短时模拟测试中验证。**

- **表现与复现：**测试把波次请求向量的第一列当作第一个生成敌人，并据此断言其血量；实际首敌可能是马车等其他类型，测试失败。
- **根因与证据：**`GameSession` 将请求向量作为各敌人类型的剩余生成数量，并通过带种子的随机选择决定下一次生成类型。向量列号不代表逐个生成的时间顺序。实际短时模拟和引擎选择逻辑确认了这一点。
- **漏测点：**测试只核对了请求向量静态内容，却把静态列顺序误当成运行事件顺序，没有检查生成器的随机选择。
- **修复与防回归：**测试按实际敌人类型核对血量和速度，并独立检查波次延迟后的生成、路线入口及请求向量。需要固定顺序时必须显式注入确定性随机源；否则不得断言向量第一项必然先生成。
- **新关卡数据交叉核验：**Dead Rocks 的8条波次元数据与35条生成请求已从 APK 派生配置独立提取，再与网页波次定义逐项比较；比较时保留每波10个请求槽位及末尾零值，并将 APK 整数常量解析为语义字段后比较。不要把资源中的整数枚举直接当成网页运行顺序，也不要用请求向量推断敌人出现先后。对白资源 ID、头像和角色映射分别与对应资源表核对；静态核对不等同于试听音频或完整实战。

## GameSession 的 debug 模式不执行战役波次

- **状态：问题已解决；下面的临时内容状态仅描述 map06 第 2 步数据切片期间。**map06 现在是正式登记关卡。
- **表现与复现：**map06 短测已配置 `campaignWaves`，但用 `mode: 'debug'` 推进到开局延迟后仍没有敌人；debug 视图也不提供正式/自由战役的 `totalWaves`。
- **根因与证据：**`src/game/index.ts` 只在 formal/free 会话，或其回放源模式为 formal/free 时启用 `campaignMode`；debug 模式只按普通预览波逻辑运行，不会消费 `CampaignWaveDefinition` 的请求池。内容数据正确，测试模式选错。
- **修复与防回归：**关卡波次短测改用 `free` 会话。map06 数据切片尚未登记时，测试副本临时设置 `formalSettlementSupported: true`，当时不改变产品可玩状态；随后正式内容接入已把该标志登记到生产关卡。真实 map06 波次由静态审计期望验证；池 1 的 GameSession 入口映射另用单请求测试副本定点检查，不完整推进原版十波。
- **避免重复：**验证 CampaignWaveDefinition 时先确认所用 GameSession mode 会启用 `campaignMode`。debug session 的初态可用于单位/渲染调试，不能当作正式波次生成证据。

## 快速推进到中途波次时不能把所有敌人池清空

**状态：**M19 单位池短会话测试夹具已修正；没有改动正式波次清算规则。

- **表现与复现：**为快速验证 Dust Falls 第4波 Indian 池而把测试用第1–8波全部改成空请求时，会话推进到第4波后很快结束该波，池单位尚未生成。
- **根因与边界：**网页 `GameSession` 的波次完成条件依据场上敌人、敌方待生成请求及 campaign 状态，不把玩家单位池的待生成数当作延迟波次完成的条件。真实 M19 第4波含两条敌人生成池；空波是测试夹具的人造状态，不能据此认定正式关卡有问题。
- **修正与防回归：**短会话只将目标波以外的请求置空；目标波保留一个远大于观察时长的待生成敌人请求，以稳定停留在该波，再观察玩家单位池的真实计时和出生点。该测试只推进约两秒，不更改 APK 关卡数据，也不要求完整实战。

## 实验室大块底板造成贴片感

**状态：首轮修正已公开发布到 `3c434917`；用户复核发现材质层级反了，后续整改见下节。**

- **表现与复现：**在公开实验室工作台中，整个内容区被圆角米色矩形包围；设置、结果和档案分组又各自拉伸大幅羊皮纸贴图。尤其报告与档案区域内部还有浅色操作面板，形成多层重复矩形，看起来像整张素材贴在站点页面上。
- **根因与漏测：**首轮诊断把所有大矩形都当成同一层，没区分工作台外框与原版主分组羊皮纸；`.lab-workbench` 的自制渐变框确实应移除，`.lab-card` 的 `gng_hud_2_textbox_large.png` 却是应保留的游戏原版素材。与此同时，内层自制浅色面板的框线没有清掉。测试只检查“不应有背景图”和“操作小面板仍在”，没有分别断言各层应使用的素材。
- **首轮修复与验证：**公开提交 `3c434917a628a9e68cd6b254a38e473d31234740` 移除了 `.lab-workbench` 外框和 `.lab-card` 贴图，却保留 `.experiment-panel`、档案及倍速区浅色方框。源代码定向测试和完整 `CI=1 pnpm run test:ci` 均通过；GitHub Actions `42752081368` 成功，两处 Pages `build-info.json` 均匹配该 SHA。线上截图确认外框已消失，但也暴露了原版羊皮纸一并丢失的问题。
- **防回归：**必须区分三层：页面工作台透明；主 `.lab-card` 使用原版羊皮纸；卡片内部内容面板透明。只让按钮、表单输入和数据表格保留必要控件边界。测试应逐层检查资源和框线，不能用“页面上没有背景图”作为统一验收。

## 实验室底图与内层框层级反转

**状态：已修复并通过完整本地检查；发布结果见实施计划。**

- **表现与复现：**公开页面 `?release=3c43491#lab` 中，设置/结果/档案区没有原版破边羊皮纸；实验参数、保存比较、Profile、实验档案、回放和倍速仍分别显示浅色矩形框。
- **证据与根因：**内置浏览器截图及只读计算样式检查显示 `.lab-workbench` 透明；`.lab-card` 的 `background-image` 为 `none`，但 CSS 变量仍指向 `gng_hud_2_textbox_large.png`；`.experiment-panel`、`.lab-saved-comparisons`、`.campaign-profile-archive`、`.lab-experiment-archive`、`.replay-panel` 和 `.lab-speed-card` 仍有浅色填充及边框。首轮改动撤掉了该放在主内容层的原版贴图，却留下了自制内层框。
- **修复结果：**保持 `.lab-workbench` 透明，在三块 `.lab-card` 恢复 `gng_hud_2_textbox_large.png` 和避开破边的顶部、左右留白；实验设置、结果、档案、回放和倍速区域移除自制填充、边框与阴影。木按钮、输入/选择控件与表格单元格边界保留，避免操作对象黏在一起。未改 DOM、交互或数据行为。
- **防回归与验证：**`t41-lab-workbench.spec.ts` 断言主卡片引用的图片成功解码为384×192资源、留白足以避开破边、内层面板透明无框，并覆盖桌面/平板/手机几何和横向溢出；`t29-campaign-menu.spec.ts` 也要求实验室主卡片继续使用原版贴图。两个定向 spec 共9项通过。内置浏览器检查本地与发布页面，确认贴图在主层、内层无矩形框，按钮可读。发布提交 `cd3bd51` 对应 GitHub Actions `42757255799` 全部成功；GitHub Pages 与 Cloudflare Pages 根 `build-info.json` 均匹配来源 SHA。线上首次导航后立即截图时背景图片尚未显示；切到游戏页再经站点导航返回实验室后，羊皮纸和木按钮正常显示。截图验收需确认动态背景已加载，不能把过早截图认定为素材缺失。`CI=1 pnpm run test:ci` 通过类型检查、409项单测、生产构建及120项 Playwright E2E；构建仍有主 JS chunk 约655KB、超过500KB预算的既有提示。npm registry DNS 不可用，因此测试复用了本机同项目依赖；依赖清单与锁文件未改。发布比例和下一次普通发布门槛见实施计划。

## 实验档案导入按钮 hover 覆盖木按钮贴图

**状态：**纯 hover 的实色背景问题已修复；后续发现的焦点矩形也已修复并通过定向 E2E。

- **表现与复现：**在实验工作台悬停“Import experiment archive”，按钮下方出现深绿色矩形；相邻导出按钮仍显示木质按钮图。
- **根因与证据：**`.experiment-archive-actions .replay-import-label:hover` 设置纯色 `background` 简写。该悬浮选择器比 `.lab-workbench .replay-import-label` 更具体，因而清除了文件标签的木质背景图；普通按钮有较晚的木按钮规则，所以视觉上只有导入标签异常。
- **漏测点：**之前只检查木按钮静止状态，没有把鼠标悬浮到文件导入标签并比较计算后的背景图。
- **修复与防回归：**纯色悬浮背景只保留给普通按钮；文件导入标签沿用木按钮图，只用亮度滤镜反馈悬浮。`t41-lab-workbench.spec.ts` 对比标签悬浮前后的背景图和底色，并断言悬浮滤镜提亮，避免再出现实色方框。

### 焦点状态不能伪装成 hover 缺陷

- **复现与观察：**当前代码中，Playwright 纯鼠标 hover 后木按钮贴图仍在、底色透明；点击文件导入标签后，隐藏文件输入获得焦点，旧 `:focus-within` 规则会给标签加矩形轮廓。指针留在标签上时，焦点轮廓容易被误认为 hover 时新增的深色矩形。
- **根因与漏测：**`.experiment-archive-actions .replay-import-label:focus-within` 使用矩形 outline，和其他木按钮的美术反馈不一致。原 `t41-lab-workbench.spec.ts` 只验证纯 hover，没有单独覆盖文件输入焦点，也没有区分“hover-only”与“focus-within”。
- **修复与验证：**移除导入标签的矩形焦点 outline；文件输入聚焦时用暖金色滤镜高亮木按钮贴图，并显式保持底色透明。`t41-lab-workbench.spec.ts` 分别检查 hover 背景/贴图和 focus-within 轮廓/高亮；该 spec 3 项通过。内置浏览器截图确认焦点矩形已消失，按钮外观与同组木按钮一致。
- **防回归：**文件导入标签应分别验证 hover、focus-within 和 hover+focus 状态；不要仅因指针位于控件上就把焦点轮廓归因于 hover。标签背景始终透明，视觉反馈贴合按钮图案，不铺矩形实色底或矩形 outline。

## 羊皮纸告示牌下露出规则黄色底

**状态：**已随 Lost City 完整批次发布并完成线上核对。发布 SHA `9e4b41fd7b4d0002b8c794a2fe7ec47aa44a4b4a`，Actions `42963501481` 成功；两个 Pages 的构建来源 SHA 一致。内置浏览器确认羊皮纸卡片底色透明，撕边外露出页面背景。

- **表现与复现：**设置、结果、报告与档案三块不规则羊皮纸外沿后面还露出规整黄色矩形，削弱了破边贴图的形状。
- **根因与证据：**`.lab-card` 的 `background` 简写同时设置了 `#ead19e` 底色和原版 `gng_hud_2_textbox_large.png`。PNG 有透明外沿，底色从透明像素露出，形成贴图外侧的规则矩形。这个颜色同时填充 PNG 的透明像素以及贴图尚未加载时的区域，因而在正常显示中也形成矩形；正常构图不需要这层纯色。
- **漏测点：**旧测试确认了原版贴图路径和尺寸，却没有断言卡片的 `background-color` 透明，因此未发现透明撕边下面仍铺有纯色。
- **修复与防回归：**`.lab-card` 继续绘制原版羊皮纸和投影，只移除纯色回退底色。`t41-lab-workbench.spec.ts` 对三张卡片同时断言贴图存在、底色透明，防止修图时误删贴图或重新铺回矩形。
- **验证：**`t41-lab-workbench.spec.ts` 3项通过；`CI=1 pnpm run test:ci` 通过类型检查、409项单测、构建及120项 E2E。内置浏览器本地截图确认撕边外露出页面底色，黄色矩形消失。

## 游戏内 Help 与 Options 羊皮纸外露黄色方底

**状态：**已修复并通过定向检查；不单独公开发布。

- **表现与复现：**主菜单 Help 与 Options 打开后，撕边羊皮纸贴图外仍有一块规则的浅黄色矩形；本地截图显示页面背景与矩形边缘清楚可辨。
- **根因与证据：**`.campaign-help-card` 与 `.campaign-options-card` 的 `background` 简写把 `#e9cb94` 底色铺在原版 `gng_hud_2_textbox_large.png` 下方。与实验室卡片相同，贴图透明像素露出了矩形底色。对照 CSS 可见实验室 `.lab-card` 已仅绘制贴图，游戏内两个面板尚未采用该规则。
- **漏测点：**`t40-frame-controls.spec.ts` 检查了 Help/Options 的贴图、框内几何和内容溢出，但没有断言 `background-color` 透明；先前截图复核也未覆盖这两个面板的撕边外沿。
- **修复与防回归：**仅移除两张羊皮纸卡片的纯色回退填充，保留原版贴图与布局；扩展 `t40`，在桌面、竖屏和横屏分别确认贴图存在、底色透明、文字/按钮不溢出。`t40` 和 `t30` 共10项定向 E2E 通过。静音窗口模式下检查桌面及手机竖屏截图，撕边透明区直接显示场景背景，黄色矩形消失；未进入全屏或播放音效。此次没有运行完整 `test:ci`，完整检查留在后续产品批次收尾。
- **遗留覆盖：**网页实验室的“导入档案”确认框 `.lab-profile-confirmation` 仍单独设置了 `#ead19e` 回退底色。移除后继续显示原版羊皮纸贴图，让透明撕边露出页面遮罩；`t38-data-archives.spec.ts` 现在断言确认框底色透明，避免修复只覆盖主卡片和游戏内面板。

## 实验室布局偏离设计稿

**状态：已发布并通过线上验收。**桌面、平板、手机布局均已实现；定向检查、完整本地检查和内置浏览器公开页面检查通过。

- **表现与复现：**公开版本原有双栏；实验设置和比较结果在左侧，Profile/实验档案与回放在右侧，外框为深棕渐变。设计样稿则分为实验设置、结果、报告/档案三栏，主面采用浅羊皮纸。
- **根因与证据：**`game-page-template.ts` 曾将比较输入、已保存比较及结果表都放在一个实验面板里；`.lab-layout` 使用双栏，`.lab-workbench` 使用深棕渐变和强阴影。旧 `t41-lab-workbench.spec.ts` 断言两张卡片，只检查双栏位置，没有检查信息分组或三栏布局。
- **修复结果：**比较输入留在“实验设置”；空状态、真实报告和保存动作放进“比较结果”；已保存报告与 Profile/实验档案、战局回放放进“报告与档案”。速度控制作为结果栏内的独立浅纸面板，明确其只影响交互式运行。整体改为浅羊皮纸主面、原版木牌标题和木按钮。1280px 桌面三栏，900px 平板两栏且档案区跨栏，390px 手机单列；桌面报告表完整显示，手机只在表格自身滚动。`t41`、`t29`、`t38` 共11项定向 E2E 通过，覆盖断点几何、材质、标题留白、溢出、桌面与手机表格、站点导航、宠物层级、中英文、空状态、运行/保存/重新打开和档案行为。内置浏览器检查桌面与平板，并实际运行、保存、重新打开一次比较；全页桌面和手机截图确认视觉分组及单列堆叠。批次完整 `pnpm run test:ci` 通过：类型检查、409项单测、生产构建及120项 Playwright E2E 均通过；构建提示主 JS chunk 约655KB、超过500KB预算，但不影响构建或测试。截图保留在临时目录，不纳入产品资源。
- **发布验收：**squash 提交 `743bb0e` 已发布；GitHub Actions `42739278594` 最终成功。GitHub Pages 与 Cloudflare Pages 的根路径 `build-info.json` 均匹配来源 SHA `743bb0e3`。内置浏览器打开发布版，确认实验设置、比较结果、报告与档案的分组及西部风格样式已上线。
- **避免重复：**视觉改版必须核对截图和实际断点几何，不能以“卡片存在”判定布局通过。桌面报告表需完整呈现；窄屏横滚只限于表格自身，不能扩大页面。复用共享 `#game/#lab` 导航，不改站点外壳。

## 旧实验库中的固定基线方案冲突

**状态：待单独复核；不在当前视觉批次修复。**

- **表现与复现：**含既有实验数据的本地浏览器会话运行一次配对比较后显示通用失败；干净 IndexedDB origin 上用同一源码和参数完成比较、保存及重新打开。
- **证据与根因判断：**`main.ts` 每次保存固定 `cow-gulch-original@1`；`experiments/index.ts` 对同一方案 `(id, version)` 的不同 `preparedSetup.digest` 抛出不可变冲突。旧浏览器中的基线记录尚未直接读取；冲突是目前最符合代码和对照运行的推断，不是已确认的数据库事实。
- **后续要求：**用旧档案 fixture 确认冲突，改进提示或为内容/规则变化提供不覆盖旧记录的新版本；保留并继续读取原始方案、报告和导入数据。不得为视觉验收清空用户实验库；干净 origin 仅作为隔离的视觉/新用户检查环境。

## UI 图层与全屏弹窗

**状态：已关闭。**弹窗图层、按钮样式、同语言布局和手机输入已通过本地完整检查，修复通过[手机工具栏部署检查](https://github.com/wishflow/wishflow-tools/actions/runs/42459138730)与[补充发布检查](https://github.com/wishflow/wishflow-tools/actions/runs/42460770199)。最终部署提交为 `50289f2`；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配。内置浏览器窗口模式、静音实测确认战役退出弹窗可打开；浏览器拒绝 Fullscreen API 后提示不遮挡标题/正文，Keep playing 可关闭弹窗并恢复战斗。该宿主拒绝真实全屏请求，因此本轮未验证成功进入/退出原生全屏；自动化 mock 只验证应用状态和布局逻辑。

> 本节是已发布 CSS/可见性修补的历史记录，不是当前 UI 架构约束。其“将全屏控件移入 `showModal()`”做法已被后续重构计划废止；当前要求见下文“原版 UI 流程与状态管理”。

### 当前证据

- `.game-frame:has(dialog[open])` 原先会隐藏全屏按钮和状态提示；这是弹窗期间无法使用页面全屏按钮的直接原因。Gambler E2E 还把该错误行为断言为正确，已改成断言按钮仍可见。
- 全屏开关改为独立控制组并置于最高游戏层；普通 `.show()` 弹窗与帮助、遮罩、舞台的层级经 `elementFromPoint()` 和真实点击核验。遮罩位于弹窗下方且仍拦截画布。
- 战役退出由 `showModal()` 打开。原生模态框会令框外内容 inert，因此只提高 `z-index` 无效。打开前将全屏控件组移入模态框，`close` 事件后移回游戏框；`t30-fullscreen.spec.ts` 已验证切换前后弹窗可交互、全屏控件位置可还原。
- 战役退出框原先没有在舞台内定位；全屏定向测试测到其按钮超出视口。现已居中并限制最大高度。
- 实际结算的“Campaign map”动作原先保留结算面板，导致菜单仍被结算层盖住。现在进入菜单会隐藏已结算面板；定向 E2E 已真实跑完单波结算、进入全屏检查按钮命中、退出全屏并点击返回菜单。
- 图层与全屏定向检查：`t30-fullscreen.spec.ts`、`t34-tech-town-gambler.spec.ts`、`t37-tech-town-formal.spec.ts`、`t04.spec.ts`、`t20-campaign-progress.spec.ts` 共 19 项通过。自动化使用 Fullscreen API mock 验证状态流转；公开版本在内置浏览器中的原生全屏请求被宿主拒绝，故本轮未验证成功进入/退出原生全屏。
- 定向验证：图层切片的 19 个 E2E 通过；按钮/布局切片的 `t09-pause.spec.ts`、`t30-fullscreen.spec.ts`、`t34-tech-town-gambler.spec.ts` 共 13 个 E2E 通过。远端 `t22-playfield-focus.spec.ts` 两次失败后，测试在失败时输出坐标和计算样式。Actions `42458377072` 的 Linux Chrome 实测：390px 竖屏下操作区从 x=29.1875 到 284.8125（宽 255.625px），Pause、Campaign 和 Clear selection 的右边界分别为 122.1875、189.75、286.5；Clear selection 溢出 1.6875px。计算样式内边距每侧 1.6px。将三颗主按钮的每侧内边距从 `0.1rem` 降至 `0.05rem`，预计总计收窄 4.8px；手机标题覆盖层与工具栏位置保持不变。修复后 `t22` 与 `t09-pause` 共 7 项定向检查、类型检查和完整 `pnpm run test:ci`（399 单测、103 E2E、生产构建）通过。将标题移到正常布局流的实验导致 9 项手机触屏地图用例失败，已撤回；回退相关 `t01`、`t06`、`t08`、`t10`、`t22`、`t25` 共 17 项 E2E 通过。Linux CI 实测工具栏越界修复后，后续 `pnpm run test:ci`（399 单测、104 E2E、生产构建）与两次发布 Actions 均通过，最终部署来源 SHA 与公开 `build-info.json` 一致。保留失败时的几何日志，方便未来发现类似平台差异。Vite 主 JS chunk 超过 500KB 的警告不影响构建或测试。

## 普通弹窗样式与工具栏布局

- 战役退出框按钮原先未命中 `.recruit-confirmation button` 选择器，显示浏览器默认外观。现在战役退出、招募/地图雇佣/升级/Gambler 确认框和结算动作共用按钮底色、边框、字体、悬停、禁用及键盘焦点规则；波次羊皮纸和战役菜单的专属表现未改。`t30-fullscreen.spec.ts` 对这些按钮的计算样式做等值比较，并检查焦点和禁用状态。
- Pause 与 Resume 曾按各自文本决定宽度，状态切换会影响工具栏布局。`syncPauseButtonWidth()` 按当前语言用 Canvas 测量两种标签，叠加当前按钮字体、内边距和边框后固定宽度；容器缩放或语言切换时重新计算。`t09-pause.spec.ts` 在桌面/手机宽度及中英文下比较 Pause 与 Campaign 的位置，并检查按钮都在游戏框内且互不遮挡。
- 本地内置浏览器截图发现全屏图标同时来自按钮文本 `⛶` 和 `.game-frame-fullscreen-toggle::before`，形成重复小图标；移除伪元素，保留按钮文本，并在 `t30-fullscreen.spec.ts` 断言伪元素不再绘制。此前的自动化只看按钮可见性和 accessible name，没检查图标是否重复，今后完成控件视觉切片时需查看真实浏览器截图。
- 一次布局 E2E 失败不是产品位移：切换语言时点击页眉语言按钮把页面滚到顶部，下一次 Playwright 点击又把画布滚回视口，导致测试把不同页面滚动位置下的屏幕 `y` 坐标当成控件跳动。修正为每次测量前先 `scrollIntoViewIfNeeded()`；布局比较需先归一化页面滚动，再比较边界。
- Pause/Resume 固定同宽后，GitHub Actions 的手机竖屏检查只差 1.6875px，但“按钮可见”和“无遮挡”断言无法指出具体哪颗按钮越界。失败时记录所有主按钮边界、操作区边界、字体和内边距，避免猜测。缩小三个主按钮每侧内边距 `0.05rem` 后回收 4.8px，并保持工具栏原位置；移动标题的较大改版会让覆盖区挡住触屏地图，完整回归发现后已撤回。后续工具栏变更要同时验证精确边界、触屏地图输入与 CI/Linux 390px 竖屏。
- 内置浏览器在公开版本 `2cf6bd8` 的弹窗复核中，战役退出框内点击全屏后，IAB 宿主拒绝 Fullscreen API 并显示提示；截图显示提示盖住弹窗标题。根因是失败提示在顶部控件组下方纵向占位。修复在提示出现时将控件组改为顶部横向排列，图标在右、提示在左；`t30-fullscreen.spec.ts` 检查提示与标题矩形不相交，并实际点击 Keep playing。修复发布到 `50289f2` 后在内置浏览器复验：标题和正文未被覆盖，Keep playing 关闭弹窗后战斗控件恢复可用。该宿主拒绝原生全屏，因此自动化 Fullscreen mock 和浏览器拒绝场景都不证明真实浏览器成功进入全屏。

### 防回归要求

- 不以“元素可见”代替交互验证：对关键控件检查命中目标，并实际点击确认按钮产生预期结果；当前定向 E2E 已覆盖此路径。
- 全屏控制不得因游戏弹窗打开而被隐藏、搬动或被遮罩挡住；全屏状态变化必须保留当前覆盖层及模拟状态。游戏内面板使用受 `.game-frame` 约束的 OverlayHost，不使用会让整页进入 top layer 的 `showModal()`。
- 帮助框、遮罩、弹窗和全屏控制应遵循 `.game-frame` 的层级变量。遮罩拦截底层但不能盖住弹窗。
- 同一语言中的状态文案变化不应导致按钮或相邻控件跳动；语言变化可以重排，但不得造成溢出或遮挡。
- 同时覆盖窗口模式与真实全屏。用内置浏览器验收时，先确认页面构建来源 SHA 与待测代码一致。

## 原版 UI 流程与状态管理

**状态：已集成发布并完成线上流程验收。**`CI=1 pnpm run test:ci` 通过 409 项单测、生产构建与 117 项 Playwright E2E；GitHub Actions `42597743682` 成功。发布 SHA `505643c5173bee21104cb2caac2192235fe02152` 已部署到 GitHub Pages 与 Cloudflare Pages，两处根路径 `build-info.json` 均匹配。内置浏览器静音、窗口模式下验证菜单、选关、暂停、Options/Help 返回和确认取消；原生 Fullscreen API 仍被宿主拒绝，未将模拟测试当作真实全屏证据。原始脏工作树未被改写。

### 已证实的 APK 流程

- `MainMenuScreenActivity.onStartButtonClick` 进入地图选择；`onHelpButtonClick` 进入独立 Help 页；`onOptionsButtonClick` 调用 `GameActivity.showOptionsDialog`；声音入口切换档案中的声音设置。
- `GameScreenActivity.onPauseButtonClick` 调用 `displayDialog(4)`；战斗中的 Android Back 键在没有活动对话框时也打开同一个暂停面板。
- `GameScreenActivity.onPrepareDialog(4)` 为暂停面板注册 Continue、Restart、Options、Close、Sound。Options 调用 `showOptionsDialog()`，未关闭暂停面板；Restart/Close 分别打开确认 ID 6/5。取消确认仅关闭确认面板，父暂停面板仍保留。
- `GameActivity.showOptionsDialog` 创建 `dialog_options`，声音/震动设置在该面板中；平台隐私入口属于网页移除的平台/广告相关内容。HelpScreenActivity 的左右按钮翻页，边界按钮返回主菜单。
- `GameScreenActivity.displayDialog` 会停止游戏线程。游戏内招募、升级等面板必须按具体调用路径确认何时暂停、何时恢复；不将所有 UI 状态推断为“游戏继续运行”。以上为 APK 静态 DEX/JADX 观察，不代表 Android 实机运行记录。

### 本轮结构修正

- `GameUiController` 是页面路由和面板返回栈的唯一所有者；纯 TypeScript 事件处理页面、面板及 Help 页码。模拟状态仍只由 `GameSession` 持有，全屏状态仍由 `FrameChromeController` 根据浏览器事件持有。
- 页面模板、Options/Help 内容、FrameChrome 和 OverlayHost 分置在 `src/ui/game-page-template.ts`、`menu-panels.ts`、`frame-chrome.ts` 与 `overlay-host.ts`。`main.ts` 仍负责应用副作用和业务事件接线，不再从面板 `hidden` 状态重建页面路由。
- OverlayHost 只接收控制器生成的显示列表，不保存面板导航栈。暂停板→Options 保留不可操作的暂停板底层；Help 显示为单独页面，控制器保留它的调用路径，返回后恢复 Options/暂停板。档案替换确认显示在 Options 内的游戏框中。
- 过去 Options 关闭暂停板并用菜单页替代原生选项面板，造成返回路径断裂；现在暂停板仍暂停并留在 Options 下方。`t09-pause.spec.ts`、`t29-campaign-menu.spec.ts`、`t23-campaign-wave-intros.spec.ts` 和 `t40-frame-controls.spec.ts` 从真实菜单/HUD 入口核验该路径。

### 重构约束与防回归

- 单一 `GameUiController` 持有页面、唯一活动面板和显式返回目标；GameSession 独占模拟状态；FullscreenController 仅响应浏览器 `fullscreenchange`。OverlayHost 只负责遮罩、挂载、焦点和输入阻断，不保存第二份面板栈。
- 暂停板 Options 必须叠在暂停板上方；Help 从 Options 进入并逐级返回 Options、暂停板或菜单。确认取消返回父面板且保持会话暂停；全屏切换不改变 UI 或模拟状态。
- 所有面板限制在固定 16:9 `.game-frame`，不调用 `showModal()`、不搬动 FrameChrome、不允许遮罩覆盖全页。只允许一个面板可交互，叠层中的父面板不可点击。
- 原版木牌、羊皮纸、确认按钮和特殊面板保留各自美术；新增 Free Play、网页操作说明、倍速和档案也使用原版风格与返回关系。常规战斗无通用控制条；桌面缩放辅助控件位于地图边缘，触屏保留手势。
- 关键测试必须从真实入口操作，检查状态、返回目标、底层阻断与 `elementFromPoint()` 命中；仅见到 DOM 或仅使用调试路线不算流程验收。浏览器默认窗口模式、静音；全屏仅用于全屏专项验收。

### Help/Options 素材与手机布局

- **表现与复现：**Help 从 Options 打开后，暂停/选项两个父面板仍同时显示，造成多层边框和重复返回箭头；Options 的说明文字横跨高分牌资源右侧的头像装饰区。手机竖屏下，常驻档案和实验内容让 Options 高度超出羊皮纸。
- **根因与证据：**高分牌 `gng_highscore_0_box.png` 是左侧文字区加右侧肖像框，不适合承载横跨整卡的选项文案；Options 和 Help 被当作可见叠层，未按“保持返回状态、替换当前页面”的 Help 语义渲染。Playwright 390×844 初测测得 Options 内容 `scrollHeight=353`、面板 `clientHeight=180`；将档案折叠后仍有 217/180px 溢出。截图与几何结果均在本地隔离工作树检查。
- **修复与防回归：**Options/Help 改用原版 `gng_hud_2_textbox_large.png` 羊皮纸；Help 打开时只绘制 Help，返回时恢复 Options，Options 的调用暂停板继续留在 Options 下面。实验与档案收在可展开区，手机窄屏压紧 Options 间距；Summary、档案操作和实验按钮沿用原版木按钮图。`t29-campaign-menu.spec.ts` 检查资源背景，`t40-frame-controls.spec.ts` 检查桌面、390×844 竖屏、844×390 横屏的英文/中文面板边界、内部溢出及 Help/Options 返回状态。
- **漏测点：**此前只核对 Help 与 Options 各自能打开、并断言按钮可见；没有检查它们同时出现时的视觉重复，也没有把整张选项卡的文本边界与底图留白区域对照。手机测试只检查外框，没有测内部滚动高度。
- **避免重复：**为带肖像分区的原版资源先看实图再选择用途；嵌套页面测试必须同时断言“调用面板是否应该继续可见”与返回后恢复。移动版内容容器需比较 `scrollHeight/clientHeight`，不能只比较整个页面的 `scrollWidth`。

### 已发布版本的线上流程复验

- **验证范围：**打开带 `release=505643c` 的 GitHub Pages 公开页面，并以根路径 `build-info.json` 核对来源 SHA。内置浏览器保持静音和窗口模式；从主菜单进入 Options、Help 并逐级返回，再从 Start 进入 New Mexico、Cow Gulch、Easy 和 Pedro 开场对白。关闭对白后打开 HUD 暂停板，检查木按钮、Options→Help→Options→暂停板的返回链；关闭确认选择 No 后仍返回暂停板，Continue 恢复战斗。
- **观察结果：**选项、帮助、暂停、确认框均限制在游戏框；暂停及确认期间 FrameChrome 全屏按钮仍显示。上述代表性路径与公开构建一致，没有手动完成关卡或写入胜利结算。
- **全屏边界：**在暂停板仍打开时点击 FrameChrome，宿主拒绝 Fullscreen API 并提示改用浏览器自己的全屏控件；面板与模拟状态未被关闭。故本次公开版本没有真实浏览器全屏进出证据；响应布局和应用状态由桌面、390×844 竖屏、844×390 横屏 E2E 覆盖。

### 本地浏览器来源核对

- **表现与复现：**多个 Vite 服务同时监听默认端口时，内置浏览器可能连到旧工作树，即使测试代码来自新的隔离工作树。
- **根因与证据：**本地已有服务占用了 5175；本轮首次检查发现被服务的源码目录与当前实现工作树不同。隔离实现改用严格端口 `5189`，并检查内置浏览器地址为 `http://localhost:5189/`，再查看实际菜单、Options 与 Help 截图。
- **本轮补充：**`5189` 再次被占用，内置浏览器页面缺少当前工作台且仍显示旧全屏符号，说明不能只凭端口号或页面标题判断来源。未终止未知服务；改用严格端口 `5191`，并在内置浏览器确认 `#lab`、实验入口和新按钮资源均来自当前隔离工作树。
- **map10 补充：**Playwright 默认端口 `4173` 已服务于另一工作树，页面仍只显示 7 个关卡；测试命令没有检查运行实例来源时，造成旧版误报。另在 `pnpm run test:e2e -- <files>` 中，分隔符让 Playwright 忽略文件筛选并启动整套用例；输出显示 133 项，超出预期的 5 项。改为 `PLAYWRIGHT_PORT=4174 pnpm run test:e2e <files> --workers=1` 后，使用当前工作树启动严格端口服务，map09、map10、Free Play 5 项 E2E 通过。
- **防回归：**开启本地浏览器验收前先检查监听端口对应的服务来源；测试/浏览器端口使用专用端口且启用 strict 模式，确认标签 URL 对应本次工作树后再评价 UI。传 Playwright 文件路径时不要在 pnpm 脚本与筛选参数间添加 `--`，并确认 `Running N tests` 与预期筛选数一致。旧标签和旧 `dist` 不能作为新源码的证据。

### Options 遮罩与菜单声音测试顺序

- **表现与复现：**完整 E2E 中，自由模式用例打开 Options 后直接点击其下方主菜单的 Sound 按钮，Playwright 等待点击超时。
- **根因与证据：**这是过时的测试操作顺序，不是声音按钮失效。Options 属于游戏框内活动面板，OverlayHost 的遮罩会阻断底层主菜单；测试失败快照显示 Options 仍为活动界面、焦点在其返回按钮。暂停/对话面板期间也应遵守同一输入阻断规则。
- **漏测点：**旧测试只按“按钮仍可定位/可见”推断可点击，没有把活动面板的遮罩命中规则纳入前置流程。
- **修复与防回归：**更新自由模式用例，先从 Options 返回主菜单，再切换 Sound，随后重新打开 Options 检查保存状态；主菜单导航的重复 `campaign-menu-back` 测试标识按当前活动容器限定。面板打开时的底层控件必须通过真实点击命中测试，不能从遮罩下操作。

### 倍速入口迁移后的长关卡用例

- **表现与复现：**完整 E2E 的 Apache Valley 与 Fort Kaboom 长关卡用例在战斗中查找 `Simulation speed` 滑块，超时后仍停留在对白/战斗状态。
- **根因与证据：**UI 重构已按产品约束把倍速收进 Options；旧测试仍依赖已移除的常驻工具栏。定向重跑确认用例本身的核心战斗流程和规则可通过。
- **漏测点：**只更新了菜单与工具栏可见性断言，没有迁移依赖旧倍速位置的正式长流程用例。
- **修复与防回归：**新增 E2E 辅助流程：从 HUD 打开暂停板，进入 Options 设置倍速，返回仍暂停的暂停板，再继续模拟。Apache Valley、Fort Kaboom 两条完整关卡用例均按此路径并行外串行通过；后续设置入口迁移时搜索并更新所有调用点。

### 内置浏览器的原生全屏能力

- **表现与复现：**本地 `http://localhost:5189/` 的 Options 打开时，点击固定 FrameChrome 全屏按钮没有进入浏览器全屏。
- **根因与证据：**页面显示“Could not enter fullscreen. Use your browser’s fullscreen control instead.”；只读页面检查确认 `document.fullscreenElement` 仍为空，而 Options 面板保持可见。该结果表明当前内置浏览器宿主拒绝 Fullscreen API 请求，不构成应用已成功进入全屏的证据。
- **漏测点：**自动化 Fullscreen mock 可以验证应用响应和画面几何，但不能证明宿主允许真实浏览器全屏。
- **修复与防回归：**不改变失败恢复行为；记录真实全屏实测受宿主限制。自动化继续验证状态变化和面板保留；若之后宿主提供全屏能力，再单独执行窗口↔全屏转换实测。当前不得把 mock 描述为真实全屏验证。

### 升级确认说明在手机画框内被截断

- **状态：已关闭。**`t08.spec.ts` 通过手机视口检查升级详情的 `scrollHeight <= clientHeight`，并执行按钮命中。
- **表现与复现：**390px 竖屏打开升级确认，详情文本需要 50px 高，flex 布局只分配 46px，末尾内容出现内部滚动/裁切。
- **根因与证据：**`.game-original-confirmation` 的默认内容上下内缩量与底部 28% 按钮区在短画框内共同挤压详情段落。Playwright 读取到 `scrollHeight=50`、`clientHeight=46`，不是字体资源加载失败。
- **漏测点：**原用例只断言文字存在，没有检查可视文本是否完整。
- **修复与防回归：**仅扩大 `.upgrade-confirmation .game-confirmation-content` 的垂直区域，不改弹窗图像比例；手机 E2E 断言 `scrollHeight <= clientHeight`，并继续检查操作按钮命中。

### 普通战斗仍显示开发控制栏

- **状态：已关闭。**`t29-campaign-menu.spec.ts` 与 `t40-frame-controls.spec.ts` 从正式菜单/HUD 入口确认普通战斗无通用工具栏；倍速只从 Options 调整。
- **表现与复现：**从普通主菜单进入 Cow Gulch 并关闭开场对白后，游戏框底部仍出现 `Game controls` 折叠栏、`Clear selection`、测试用开波/招募入口和倍速滑条；这不是 APK 战斗 HUD。
- **根因与证据：**`showBattleScene()` 无条件执行 `gameToolbar.hidden = false`；该容器同时承载测试操作和网页倍速。内置浏览器在不带 `testBattle` 参数的正常战役流程中直接观察到该面板。此前计划误把移除 Pause/Resume、Campaign 和文字 Sound 当成整个控制栏已删除；`t29` 还断言普通战斗工具栏可见，错误固化了现状。
- **修复与防回归：**普通战斗移除通用开发工具栏，专用调试入口仍隔离；倍速移入 Options 并经暂停板调用。E2E 从正式菜单进入并断言无通用控制条。

### 手机地图缩放控件遮住 Canvas HUD 暂停图标

- **状态：已关闭。**`t40-frame-controls.spec.ts` 检查桌面缩放控件边界与命中、手机竖屏/横屏隐藏按钮并可用原版 HUD 暂停入口；`t10-camera.spec.ts` 覆盖触屏捏合缩放。
- **根因与证据：**Canvas HUD 和地图按固定1024×576逻辑画布缩小；网页缩放控件则按 CSS 像素维持近似固定尺寸。桌面左上角不与 HUD 暂停按钮重叠，但窄画框会让按钮变成地图上的大块覆盖；390px触屏竖屏中还会覆盖暂停图标。内置浏览器截图确认下移左下虽然避开 HUD，却会挡住地图路线。项目契约已明确桌面使用网页缩放按钮、触屏继续使用捏合缩放。
- **漏测点：**此前只检查控件是否在画框内，没有区分桌面与触屏入口，也没有验证固定 CSS 控件在缩小地图上遮挡可玩区域。桌面视口无法暴露控件与触屏 HUD 的冲突。
- **修复与防回归：**桌面按钮放在 `.game-stage` 边缘，在窄框/触屏设备隐藏；触屏继续捏合，桌面滚轮缩放保留。测试检查控件边界、命中目标、缩放动作及手机捏合，避免按钮压住地图或 HUD。

### 手机竖屏波次对白的角色遮住正文

- **状态：已关闭。**`t40-frame-controls.spec.ts` 在桌面、390×844 手机竖屏及 844×390 手机横屏检查对白角色与正文矩形不相交、内容及按钮完整位于游戏框内。
- **根因与证据：**基础对白用顶部居中立绘和下方文本；`@media (max-width: 600px)` 将立绘尺寸放大并把文本区上移，立绘仍盖在正文上。当前 `t40` 只检查对白面板在 `.game-frame` 内，没有检查角色与正文矩形是否相交。
- **修复与防回归：**窄屏 Pedro 立绘放入左侧槽位，正文从右侧开始。跨视口 E2E 计算立绘/文本边界，要求无交叠、无裁切且对白完整位于游戏框内。

## 战役对白 E2E 的 fixture 选择与回放边界

- **表现与复现：**map05 正式关卡 E2E 进入战斗后，测试断言首波对白可见，却观察到对白已关闭。
- **根因与证据：**用例导入 `tests/e2e/auto-continue-fixtures.ts` 导出的 `test`。该 fixture 的 `MutationObserver` 会自动点击对白 Continue，目的是让普通战斗流程测试不被剧情提示阻塞；产品代码正确打开了对白，随后测试桩立即关闭它。
- **修复与防回归：**需要检查对白内容、头像、资源或关闭后状态的专项用例直接从 `@playwright/test` 导入 `test` 和 `expect`；不检查对白且需跨过提示的普通战斗用例继续使用 auto-continue fixture。失败后先检查测试 fixture 是否主动操作目标元素，再判断产品逻辑。
- **回放边界：**`GameSession.exportReplay()` 要求会话已经完成并形成正式结算。未完成的 map05 关卡不能直接导出回放；不要为验证内容注册或 profile 单位集合而完整模拟八波。需要覆盖 map05 回放往返时，另准备有明确来源的已结算 fixture，或单独安排经确认的完整模拟范围。
- **内容版本边界：**若测试为快速结算而把波次请求替换为零，源回放与重放端必须使用同一份零请求 fixture。不可用正式浏览器场景工厂重放该 fixture，即便 `contentVersion` 相同；该版本标识的是正式内容，fixture 修改后的波次仍会在首个状态校验点造成回放差异。生产解锁快照工厂应另行按版本验证。

## 增加正式关卡后同步阶段快照与进度摘要

- **状态：map10 快照问题已关闭；M14 复现并正在修正。**map05/map06 时曾修正摘要分母和阶段列表；新增 map10 后，首轮完整单测又发现四处正式 stage 快照过期，Progress 另有结算后的状态序列少列一个 locked 关卡。M14 首轮完整 CI 再次发现两处新增关卡快照未同步；已修正并通过25项定向测试，随后完整 CI 通过614项单测和141项 E2E。
- **表现与复现：**map10 登记后，`tests/apache-valley.test.ts`、`tests/content.test.ts`、`tests/fort-kaboom-formal.test.ts` 和 `tests/progress.test.ts` 的精确阶段列表仍停在 map09。初次更新四处列表后，Progress 的 post-settlement 状态数组仍比实际 stages 少一项。
- **根因与证据：**摘要分母取自 `officialCampaignStages.length`；正式阶段关系和 Progress 状态测试还有独立硬编码数组。新增正式 stage 后，这些快照需要同步；关卡选择与 Progress 本身按新目录正确工作，没有修改其运行逻辑。
- **修复与防回归：**map10 时更新四个测试文件中的五处期望，补入 level10 和其 map09 前置条件；Progress 初态与结算后均列出 level10 的 locked 状态。相关定向测试与类型检查通过，后续批次完整检查通过。M14 新增关卡后，完整单测重新暴露两处旧快照遗漏（见下项）。
- **漏测点：**此前只搜索并修改 `stages complete` 和 `campaign-progress-summary`，没有一并搜索直接比较 `officialCampaignStages`、`globalLevel`、前置 ID 以及结算后完整状态数组的快照。
- **M14 复现：**新增 level14 后，首轮完整单测发现 `tests/apache-valley.test.ts` 的正式关卡关系数组遗漏 M14，`tests/progress.test.ts` 的初始阶段列表和结算后状态数组也各少一个 locked stage。目录和 Progress 运行结果正确，修正的是这三处旧测试快照；Apache Valley 与 Progress 共25项定向测试通过；随后完整 CI 通过614项单测、生产构建和141项 E2E。
- **修复与防回归：**map05 的 E2E 分母、map06 的 Apache/Fort stage 快照和 map10 相关五处期望现均同步。以后新增或重排关卡时，搜索 `officialCampaignStages`、`globalLevel`、`requiresCompletedScenarioIds`、`stages complete` 和 `campaign-progress-summary`，检查所有静态快照、结算后状态数组及选择状态；不要为了让旧断言通过而改动正确的 Progress 逻辑。
- **M17 复现：**正式目录增加 Dead Rocks 后，首轮 `test:ci` 的单测阶段又发现 Apache Valley 前置关系、Cow Gulch 完整目录快照、Fort Kaboom 阶段目录和 Progress 初态/结算后状态四处仍停在第16关。失败均为显式期望遗漏第17关及其 `campaign-mississippi-16` 前置，Progress 实际状态正确。
- **M17 修复与验证：**四处测试快照现补入 level17；Progress 在初始和既有关卡结算后均把 level17 列为 locked。最终 `CI=1 PLAYWRIGHT_PORT=43027 pnpm run test:ci` 通过类型检查、661项单测、生产构建和147项 E2E。新增正式关卡时，除逐关测试外还要审查这些跨关卡目录和进度快照。

## 战役与自由模式的关卡说明按存档语义区分

- **表现与复现：**map06 可同时从正式战役和 Free Play 进入；若两种模式都显示“胜利会记录战役完成与最高分”，Free Play 的提示就会误导玩家。
- **根因与证据：**`sceneCaption` 过去只按 `scenarioId` 选文案。正式与自由会话共用 `campaign-new-mexico-06`，无法从关卡 ID 判断是否会写正式 Progress。
- **漏测点：**既有首波 E2E 验证标题、难度和开局数值，却没有核对 Free Play 场景说明是否符合存档隔离规则。
- **修复与防回归：**scene caption 按会话 `mode` 生成：Formal 说明正式结算；Free Play 明确说明不会改战役进度或最高分。`t43-murdock-mountains-formal.spec.ts` 对 Free Play caption 加断言，并比较进入前后 Profile。以后关卡可在多种模式启动时，说明文案应依据 session mode，而非仅凭 scenario ID。

## 本地完整 E2E 使用 CI worker 数

- **表现与复现：**本地默认 5-worker `test:ci` 中，t08 的地图选择、t20 的页面重载状态以及 t22 的模拟波次重载检查出现超时或模拟推进到下一波；相同三项在 `CI=1 --workers=1` 下全部通过。首次 5-worker 完整运行仅发现正式关卡计数断言问题，第二次才在高并发时复现上述时序问题。
- **根因判断（有复现证据，机制仍属推断）：**这些测试依赖实时游戏循环和页面/画布交互；本地多个浏览器 worker 同时运行时会争用进程资源，扩大可观察时序窗口。单 worker 重跑通过，未发现同样的产品状态错误。
- **修复与防回归：**产品逻辑未改。完整本地验收设置 `CI=1 pnpm run test:ci`，Playwright 配置会与 CI 一样使用一个 worker；若单 worker仍失败，再按具体页面状态调查，不把并行超时直接归因于游戏代码。

## 波次语音重试 E2E 不应依赖旧角色名

- **表现与复现：**map10 批次完整 E2E 中，132 项通过，波次对白语音重试一项因找不到 `Retry Pedro’s voice` 失败；产品按钮已使用统一的“Retry this voice”文案。
- **根因与漏测：**运行时根据语言设置更新可访问名称，模板仍留着旧默认文案，测试又把角色名写死。测试没有以当前用户可见名称或稳定语义定位控件。
- **修复与防回归：**模板默认值与通用按钮文案统一，E2E 按当前可访问名称查找；失败项定向重跑通过。后续调整本地化控件文案时，同步检查模板 fallback、运行时可访问名称和用例定位，不把过期角色名断言当成产品回归。

## Free Play 关卡说明挤入高分栏

**状态：待修复；不阻塞关卡内容接入。**

- **表现与复现：**桌面窗口模式进入 Free Play → New Mexico → Billy Hills 关卡预览时，提示“Free play does not change the saved campaign score or progress.” 被排进右侧狭窄的高分区域，英文句子逐词窄行换行，视觉上难以阅读。
- **证据与根因：**本地内置浏览器截图确认异常；`.campaign-overview-no-score` 在 `styles.css` 中以绝对定位复用海报高分区，仅占预览宽度的17%。该文案明显长于高分标签，现有规则没有给 Free Play 提示设置独立宽度。
- **漏测点：**`t29-campaign-menu.spec.ts` 只断言提示文案完整存在，没有检查提示的实际宽度、换行数、与海报元素的重叠或窄屏边界。
- **修复方向：**让 Free Play 提示使用足够宽的独立文本区域，或精简文案；保留正式战役 Wanted/高分海报的位置与样式，不通过压小字号解决。覆盖中英文、桌面及手机布局，检查文本不溢出、不逐词窄排且不遮挡海报。
- **避免重复：**map05 内容批次只记录此项，不顺手改菜单视觉；下一次处理该 UI 时先核对 `.campaign-overview-no-score` 与正式高分元素的共用定位关系，并为两种模式分别断言几何。

## 实验工作台与游戏内设置归属

**状态：已部署，后续修复批次已关闭窄屏遮挡问题。**首版发布 SHA `d92c7fc9d1754420767bc7b4e4003e15365aa2cb`；GitHub Actions `42616244687` 的应用测试、共享检查和 GitHub/Cloudflare Pages 部署均成功，两个 `build-info.json` 均匹配。实现提交 `bef0ced`、测试补强 `3652185` 和坐标 helper 修正 `c5999e4` 已包含在首版部署中。

- **表现与复现：**主菜单 Options 曾包含 Profile 档案、实验数据、比较报告及倍速；回放入口在其他页面区域；全屏按钮则显示通用字符，均与原版游戏选项和按钮美术混杂。内置浏览器在 390px 窄屏还显示工作台标题压在羊皮纸的烧边装饰上。
- **根因与证据：**旧 `renderOptionsPanelView()` 输出网页实验工具，`renderOptionsPanel()` 动态搬动实验面板，回放及倍速还有独立入口。旧全屏控件由 `frame-chrome.ts` 写入 `⛶`。首次窄屏截图发现新工作台 h3 与羊皮纸上缘装饰交叠；工作台卡片顶部留白不足。声音开关原有通用按钮底色，E2E 也证实它没有木按钮图。
- **修复：**实验、比较报告、Profile/实验档案、回放和唯一倍速入口集中到游戏框外的 `#lab`；Options 仅保留 Help/Sound，Sound 与菜单和暂停板状态同步。工作台使用羊皮纸背景、浅色内衬、木按钮及响应式列布局；增加上边距避开烧边装饰。全屏按钮使用项目资源 `public/assets/gng-frame-fullscreen-states.png`，横向精灵图尺寸为 1774×887，按 200% 背景宽度切换两个状态；按钮文本为空，辅助名称仍随状态本地化。
- **防回归：**`t29-campaign-menu.spec.ts` 与 `t41-lab-workbench.spec.ts` 确认入口在 `.game-frame` 外、Options 只含 Help/Sound、local nav 锚点有效、桌面和 360px 窄屏无页面溢出、卡片标题避开装饰且中英文可读。`t30-fullscreen.spec.ts` 检查图像两态、可访问名称、键盘焦点、真实可点击状态；`t38-data-archives.spec.ts` 保留 Profile 替换确认、实验合并冲突及回放行为。受影响 9 份 Playwright spec 共 31 项通过；补充的 13 项检查有重叠，不重复累计。批次最终 `CI=1 pnpm run test:ci` 通过，包括类型检查、409 项单测、生产构建和 119 项 Playwright E2E。构建的主 JS chunk 超过 500KB 提示仍存在，但测试和构建成功。
- **浏览器验证边界：**内置浏览器在 `http://localhost:5191/` 实测桌面、390×844、中文和本地导航。对全屏按钮仅尝试一次真实 Fullscreen API，宿主拒绝并显示失败提示，因此没有真实原生全屏进出证据；Playwright mock 只证明状态图和状态处理正确。全程默认窗口模式、静音。
- **兼容边界：**仅迁移呈现入口，不改公共 API、规则、IndexedDB、Profile/实验 JSON 或回放格式；导入导出语义和站点语言状态不变。
- **地图点击 E2E 的视口假设：**完整检查首轮中 `t36-tech-town-gatling.spec.ts` 的地图雇佣用例失败。复现后确认，Playwright 点击位于页面下方的调试样本入口会滚动页面；helper 随后读取到画布 `y=-529.69`，却仍按画布矩形发出屏幕点击，坐标落在可视区外，因此状态显示“未选择单位”。修复为点击前 `scrollIntoViewIfNeeded()`，再读取画布矩形；定向用例通过。地图坐标测试在页面滚动后必须先把画布带回视口，不能直接把负的 bounding-box 坐标交给鼠标 API。
- **线上窄屏层级问题（已修复并验收）：**首版部署390×844竖屏中，站点 `aside.usagi-widget` 固定层为 `x=12..124, y=549..697, z-index:80`；工作台标题为 `x=22..368, y=595.6..626.9`，文字被宠物挡住。页面宽度仍为390px，根因是 `.lab-workbench` 没有建立高于共享浮层的层叠上下文，既有 Playwright 也没检查外部浮层与工作台的实际命中。
- **修复与防回归：**窄屏 `.lab-workbench` 建立 `position:relative; z-index:81`，不改共享站点外壳及游戏框层级。`t41-lab-workbench.spec.ts` 增加390×844层级/交叠命中检查；`CI=1 pnpm run test:ci` 通过，包括409项单测、生产构建和119项 Playwright E2E。修复 squash 发布 SHA 为 `0aab63b9b85455bf97caea9f30dc2563d3de19b8`，Actions `42621072039` 成功，GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配。内置浏览器用390×844窗口模式、静音复验：页面无横向溢出；工作台层级高于宠物，宠物框内测试点均由工作台接收；Options 仅含 Help/Sound，全屏按钮使用新图像资源。未重复请求宿主已拒绝的原生全屏。

## 新关卡对象映射需逐关核对

- **状态：**map06 场景切片已修正并添加防回归断言。
- **表现与复现：**构建 Murdock Mountains 场景时，初版复用了 Cow Gulch 装饰表，却漏掉 map06 的 code 72 路桩和 code 75 水塔；第一轮对象坐标测试因此失败。
- **根因与证据：**共享 `cowGulchDecorationCodes` 只覆盖 Cow Gulch 与少量共用类型，不能代表每张 New Mexico 地图的全部对象码。map06 审计格网明确包含 code 72/75，APK 对应贴图分别是 `b_1x1_stake` 和 `b_1x1_watertower`。
- **漏测点：**若只测试共享构造器或贴图文件存在性，不会发现特定关卡的原始标记没有被场景层消费。
- **修复与防回归：**map06 场景显式加入 72/75 映射；测试逐项从独立 TDM 基线生成“对象码→资产→格子”期望，并检查所有资产可加载。后续新地图必须核对该关完整对象码表，再决定继承共享项或增加关卡专属映射。

## 地形图层不能只画 tile 的表面标记

**状态：**Railroad Ranch 静态地形切片已修正并通过定向检查。

- **表现与复现：**把 map09 原始 TDM 转成网页地形时，3 个水平桥位只出现铁轨和桥墩，缺少横跨桥面的完整木桥贴图。
- **根因与证据：**APK 派生的 `terrain-render-index.json` 显示原始 tile 81 在 (15,3)、(26,3)、(14,17) 变为 street code 68；code 68 的绘制规则同时发出 `tiles_railway_hori` 和完整 `tiles_bridge_hori`，另有左右桥墩。旧参考生成器只为 code 68 发出铁轨与桥墩，遗漏了桥面；map08 没有这些铁路 marker，因此此前测试未覆盖这类复合地形格。
- **修复与防回归：**参考生成器和 map09 JSON 补入桥面层，保持铁轨→桥面→桥墩的绘制顺序。`railroad-ranch-terrain.test.ts` 核对 TDM 每格、APK 派生的背景/street 命令、三段桥面和六个桥墩坐标、贴图 source rectangle 与地图边界。静态索引只证明绘制候选和源码规则，不冒充 Android 截图或逐帧随机结果。
- **验证：**定向地形测试 2 项通过，TypeScript 类型检查通过。完整 `test:ci` 留到 map09 批次收尾运行。
- **Dead Rocks 延伸验证：**Mississippi 关卡沿用同一套 TDM 地形规则，但要逐格校验背景随机候选和桥墩，不用一张预览图代替路线证据。M17 测试从 map20 TDM 核对全部网格、背景与桥面绘制数据、对象 marker 坐标；路线另与 APK 派生的74条有向边逐项比较。固定 Java Random seed 只为网页复现 APK 候选，不声称复现 APK 每次启动的时间随机结果。

## 波次炮池模板应与地图初始单位分离

**状态：已关闭。**

- **表现与复现：**Riverside Mountains 的 Fort 炮池需要在第2波生成 Cannon，但新局地图没有摆放 Cannon 初始单位。旧运行接口只能从地图已摆放单位里找同类型模板；若为满足接口而伪造一个地图 Cannon，会错误地把波次单位显示为初始单位。
- **证据与根因：**[M14 静态审计](map14-static-audit.md)区分地图 Fort 出生点与 Cannon 波次池。关卡内容中的 `template` 是生成所需的单位定义，不代表地图上已有一个该单位；原接口没有表达这种区分的字段。
- **修复：**在战役单位池定义增加可选独立 `template`，生成时仍校验池类型并沿用正常单位规则；未指定时保留从地图单位推导模板的原行为。资源收集同时包含模板引用的图像与序列。M14 数据保留 Fort 炮池作为唯一生成位置，不添加假的初始 Cannon。
- **验证与防回归：**M14 实体/正式关卡测试覆盖无初始 Cannon、炮池正确生成及资源预加载；完整 `CI=1 PLAYWRIGHT_PORT=4204 pnpm run test:ci` 通过614项单测、构建和141项 E2E。发布 SHA `ebf35d3` 的 Actions `43184402532` 与两处 Pages 来源 SHA 均通过核对；内置浏览器确认 Free Play 开场与首波地图正常。今后遇到只在波次中出现、未摆在地图上的单位，先明确“生成模板”和“地图实体”边界，不添加伪造初始对象。

## Playwright 不应复用其他 worktree 的本地服务器

- **表现与复现：**不带 `CI=1` 在当前 worktree 运行多个 Playwright spec 时，测试复用了端口 4173 上已运行的开发服务器。错误页面仍显示旧版 `7/10` Free Play 文案和旧关卡可用状态，因此多项用例看似与当前改动冲突。
- **根因与证据：**`playwright.config.ts` 设置 `reuseExistingServer: !process.env.CI`。Playwright 可以连接任意已占用该端口的服务，不会确认服务属于当前 worktree；失败上下文与当前 `src/main.ts` 的新文案不一致。使用 `CI=1` 并指定独立 `PLAYWRIGHT_PORT=4183` 后，浏览器测试由当前 worktree 的 Vite 服务运行，受影响 10 项通过；独立端口上新增 M11 E2E 也通过。
- **修复与防回归：**产品代码无需为该测试环境问题调整。验证源码行为时使用 `CI=1`；并行 worktree 手动运行 Playwright 时使用各自独立端口。出现与当前源码不一致的页面状态时，先确认服务进程和端口，再改产品代码或断言。
- **本轮复发记录：**第一次定向运行未指定 `PLAYWRIGHT_PORT`，又连到旧的 `4173` 服务，两个样式断言仍读到旧背景图。改用 `PLAYWRIGHT_PORT=4196` 后，当前工作树启动了独立服务，相关 9 项 E2E 全部通过。跑 Playwright 前必须先选独立端口，不能因之前已有同类记录就省略环境核对。
- **Dead Rocks 复发：**非 CI 的首轮测试再次复用了旧 `4173` 进程，关卡状态与本次代码不符。以 `CI=1 PLAYWRIGHT_PORT=4177` 启动严格隔离服务后，Dead Rocks 两项浏览器测试通过；不结束来源不明的旧服务器，直接换独立端口，并确保 `CI=1` 关闭服务器复用。
- **本地监听权限：**M17 最终整套检查时，即使端口空闲，沙箱仍以 `EPERM` 拒绝 Playwright 的本地 Vite 监听；换端口仍失败。获得仅限本地测试服务器监听的提权后，147 项 E2E 通过。遇到该错误先确认端口空闲，再申请只覆盖本地测试监听的权限；不改 Playwright 主机配置、不停掉不明进程，也不把环境限制当成产品故障。

## 关卡发布需同时核对部署来源与真实入口

**状态：M17 Dead Rocks 已发布、完成公开入口验收并回同步至 `gunsnglory`。**合并提交 `fcf622e` 已推送，集成分支现包含发布 SHA。

- **本批发布：**提交 `4ca738c2bf01d2bc6d6e565cfd2a117d33b37aa5` 的 GitHub Actions `43246826051` 成功；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均返回该来源 SHA。
- **入口观察：**内置浏览器在静音、窗口模式进入 Free Play → Mississippi → Dead Rocks → Medium，确认关卡标题、地图、Settlers 开场对白和 `1/8` 波次 HUD 显示正常；随后仅继续到首波准备状态，没有完整手动通关。未启动 Android、进入全屏或播放音效。
- **防回归：**关卡发布只有在 Actions 成功且两个公开部署端的来源 SHA 与预期发布提交一致后才算部署完成；浏览器使用对应 release SHA 的 URL，并检查从菜单到实际关卡内容的代表流程。截图或单纯菜单可见不足以证明新关卡已加载。

## 内置浏览器 provider 不可用时不得替代线上交互验收

**状态：M22 发布构建与来源 SHA 已通过；线上交互验收待补。**

- **表现与证据：**M22 squash 发布提交 `b5dec97` 的 GitHub Actions 全绿，GitHub Pages 与 Cloudflare Pages 的公开 `build-info.json` 均返回该提交 SHA；但本次 Computer Use 的 `getState()` 显示 `browsers: []`，创建 `iab` 标签返回 `Browser is not available`，按 URL 获取 browser 也返回 `No browser is available`。
- **根因与边界：**这是当前会话没有可用内置浏览器 provider 的环境问题，不是游戏页面已通过视觉验收。公开构建信息只能证明部署来源，自动化 E2E 只能证明其覆盖的行为；二者都不能代替人工可见的线上交互检查。
- **防回归：**保持 M22-G 浏览器验收未完成；恢复内置浏览器后，打开与部署 SHA 一致的页面，在窗口模式、静音状态验证 M4–M7 replay 导入及 Eastwood Free Play 入口。遵守仓库规则，不改用外部浏览器或 DevTools，并在观察到实际页面状态后才关闭该项。

## 战役进度快照断言要跟随正式关卡目录

- **表现与复现：**新增全球第 11、12 关后，完整单测曾因旧阶段快照缺少新关而失败；map12 批次中 `apache-valley.test.ts`、`fort-kaboom-formal.test.ts` 和 `progress.test.ts` 的固定目录/状态期望只列到第 11 关。
- **根因与证据：**`officialCampaignStages` 已正确登记 Steam Valley 为 global level 12、以前置 `campaign-mississippi-11` 解锁；失败来自测试仍硬编码 11 项，与关卡注册或 Progress 运行逻辑无关。
- **修复与防回归：**加入正式关卡时同步更新目录快照、Progress 初态和结算后的状态数组；本次仅补入第 12 关及 locked 状态，三个文件的 29 项定向测试通过。每次登记正式关卡后，搜索完整 `officialCampaignStages` 列表、globalLevel、解锁前置、结算后状态数组及进度文案；不要为了迎合旧快照改动正确的进度逻辑。

## 正式关卡的专属资源必须加入启动预加载

- **表现与复现：**Free Play 打开 Traveller’s Town 后，对白、标题和规则正常，但 Canvas 被错误恢复画面替换，并出现“必需游戏图片未加载”的提示；按下对白 Continue 后仍无法绘制地图。
- **根因与证据：**`main.ts` 的 `assetNames` 是应用启动时加载游戏图像的唯一清单，原清单只收集到 Lucky Lake 等已有内容，没有收集 `createMississippi11CampaignContent()`。Mississippi 专属 `miss_tiles_*` 地形、`steamboat_*` 及该地图引用的列车/装饰资产因此不在 `images` 中；`drawGame()` 遇到首个缺失资源便绘制黑色错误恢复画面。逐项检查确认关卡引用的贴图文件均在 `public/assets`，问题是未预加载而非资源文件缺失。原 `t49` 只检查菜单、对白和波次文本，没有检查 Canvas 资源错误面板，因而该缺陷可在测试通过时漏出。
- **修复与防回归：**把所有解锁状态下的 Traveller’s Town 内容加入资源收集集合，使地图、静态对象、列车、蒸汽船和单位资源一并预加载；`t49-mississippi-11-integration.spec.ts` 在对白显示后及继续进入战场后断言 `asset-load-error` 隐藏。若新关卡首屏内容正确而地图是黑色，先核对地图对象/单位对资源清单的引用，不要用占位贴图或吞掉 renderer 错误掩盖问题。
- **验证：**Node 22 对地图背景、道路、装饰和单位资源做路径存在性核对，所有引用文件存在；`pnpm run typecheck` 通过；`CI=1 PLAYWRIGHT_PORT=4192 pnpm exec playwright test tests/e2e/t49-mississippi-11-integration.spec.ts --workers=1` 通过（1 项）。内置浏览器在本地窗口模式、静音下确认 Mississippi 地形、静态对象、铁路和两列列车正常显示，错误面板未出现。新增 390×844 窄屏布局断言后，最终 `CI=1 PLAYWRIGHT_PORT=4195 pnpm run test:ci` 通过：类型检查、561 项单测、生产构建和 134 项 Playwright E2E；构建保留既有 1.385 MB JS chunk 警告。线上发布提交 `b6e05ca` 的 Actions `43018344472` 成功，GitHub Pages 与 Cloudflare Pages 均报告匹配来源 SHA；内置浏览器再确认 Free Play 第 11 关对白、地图和继续进入首波正常。全程未进入全屏或播放声音。

## 实验室告示牌下不应重复铺整张羊皮纸

- **状态：已集成发布并通过线上核对。**发布 SHA `8baa286ed32f4266e0636e1cfd1152a42c42caf1`；Actions `43152356792` 成功，GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配。内置浏览器确认木质告示牌标题直接落在页面底色上，未再叠加规则黄色卡片；输入控件仍保留浅色表面以维持可读性。
- **表现：**实验室各区的木质告示牌标题下方还铺着大张黄色羊皮纸，整体读成“告示牌叠在规则黄矩形上”。
- **根因与证据：**`styles.css` 的 `.lab-card` 同时绘制 `gng_hud_2_textbox_large.png` 和阴影，`.lab-card > h3` 再叠原版木按钮图。输入框及实验报告已有独立表面，外层羊皮纸只是重复装饰。旧 `t29`、`t41` 还把整卡羊皮纸断言为设计要求，没有验证叠层是否必要。
- **修复与防回归：**`.lab-card` 改为透明并移除阴影，缩小标题上方留白；木牌标题、浅色输入控件、报告表格及游戏内确认弹窗保留各自外观。`t29-campaign-menu.spec.ts` 与 `t41-lab-workbench.spec.ts` 断言卡片无背景图、标题继续使用木按钮贴图，并覆盖导入按钮 hover/focus 与 1280px、900px、390px 布局。定向 E2E 9 项通过；批次完整 `test:ci` 通过 584 项单测和 137 项 E2E。内置浏览器对发布页截图确认视觉结果。后续不要为了保留“木牌”而给父卡片再加规则底色；需要分组时优先用间距和标题层级，只有具体内容对比度不足时才增加局部表面。

## 关卡访问与活动地图单位解锁必须分开处理

- **状态：已关闭。**M20-F 完整检查通过；Tech Town 正式/地图测试与 M20 单位/正式测试共同覆盖本修复。
- **表现与复现：**Horse Hills 接入正式关卡目录时，Tech Town 的单位/Casino 配对断言在模块加载阶段失败；既有 Tech Town 正式内容测试也发现未解锁地图仍含活动 Mexican。
- **根因与证据：**New Mexico marker 工厂为保留原版 activity 5 活动单位，会跳过普通单位解锁回调；但 Tech Town 的 Gambler marker 也属于 activity 5，必须遵守全局里程碑，而未解锁 Tech Town 的活动 marker 还必须服从关卡访问条件。把关卡访问与 unit milestone 混成一条过滤规则，或全局过滤所有 activity 5，分别会导致 Gambler/Casino 不配对，或误删 Horse Hills 活动 Grandpa。既有 Tech Town 与 M20 实体测试明确覆盖这两组边界。
- **修复与防回归：**New Mexico 工厂只对需 milestone 的 Gambler marker 使用 unit unlock；Tech Town 构造器用独立 `mapAccessible` 决定是否生成该地图的活动 marker。M20 activity 5 marker 继续不受招募 milestone 过滤。新地图需分别验证 stage access、activity 和全局 unit unlock，不应互相替代。
