# 实施计划

本文件只记录 Guns’n’Glory 当前实施进度、已确认基线和未完成计划。每轮先核对代码与证据，再细化后续步骤和验收；逐项实现、定向验证、更新计划并本地提交。关闭的问题和可复用经验记入[经验记录](experience-log.md)，已完成项从活动计划移除。

## 当前基线

- **M35 Badlands 已完成并发布。**Dakota 第4关、global level 34、APK TDM 文件37。发布提交为 353dc8cb02bcf1f4993aad2c2c78e7e6291df53f，GitHub Actions 44454135458 全部成功。
- **完整检查通过。**CI=1 PLAYWRIGHT_PORT=4186 pnpm run test:ci 通过类型检查、1019项单测、生产构建和192项 E2E；pnpm test:catalog 的18项共享检查通过。
- **部署版本已核对。**GitHub Pages 与 Cloudflare Pages 的根路径 build-info.json 均返回上述完整来源 SHA。
- **内置浏览器验收通过。**窗口模式、静音打开发布页面，从 Free Play 进入 Dakota → Badlands（Level 34）→ Medium，确认 Pedro 开场对白、地图、HUD（$300、25 lives、Wave 1/9），关闭对白后进入战斗画面。没有完整通关，也没有启动 Android。
- **当前集成分支：**codex/gng-m36-ghost-town，基线为已包含 M35 发布的 e1f5b62。
- **M36 Ghost Town 静态基线已整理。**见[Ghost Town 静态审计](ghost-town-static-audit.md)：global level 35、GameDesignData index 34、TDM 38；地图、38条路线边、5条完整路线、实体标记、参数、9波/19请求/2池动作、对白与媒体均已列出并标明证据入口。反编译伪代码的已知错误分支按Smali判读。
- **M36 G1 地图/地形/敌方路线已完成。**新增map38原始网格、Dakota绘制与碰撞场景、四个出生action映射及五条路线；独立TDM/静态路线fixture核验768格、768条背景绘制、91条街道绘制、38条唯一有向边和全部路径格。4项定向测试与typecheck通过；未做浏览器视觉检查或完整运行战斗。
- **M36 G2-A 静态装饰与建筑碰撞已完成。**TDM中的22个静态场景对象已映射；独立标记和APK碰撞框期望验证所有位置/资源/几何，6种真实GameSession探针通过。相关2项定向测试与typecheck通过；建筑招募池和未雇佣单位尚未接入。
- **M36 G2-B 新局招募单位与解锁已完成。**raw96–99常驻18个activity 4单位；raw100/101/130仅按对应全局解锁位创建，且都保持activity 4。全部16种解锁组合、双语资源、脚底锚点以及睡眠单位/解锁Pyromaniac实际碰撞均有定向验证；未创建activity 5单位。
- **M36 G2-C 列车组与轨道碰撞已完成。**raw82作为开放地面的街道覆盖，raw83/84建立两段机车和三节车厢；五个部件共用水平移动组并复用 raw86/87 缓冲器。真实GameSession验证玩家跨 raw82、列车实体阻挡、整组无自撞移动并停在右缓冲器前。
- **M36 G2-D 蒸汽船组与水面碰撞已完成。**raw120 在 (3,11) 展开船头和发动机段；raw121 在 (5,11)、(6,11) 生成两处休眠 Cannon；raw123 在 (7,11) 形成尾段。五段共用水面移动组与 APK 船体碰撞框。真实GameSession确认全组沿 raw124 水路移动，raw126 岸岩不误挡，尾段保持间距并停在地图边界内。相关2项定向测试和类型检查通过，测试边界误判已记入经验记录。
- **M36 G3-A 关卡参数与奖励箱已完成。**index34 十二项参数逐项写入；仅将现金、生命、升级上限、HP难度和箱子规则绑定现有消费者，保留awesome-message和Gambler时间为数据字段，不虚构 Gambler 对象。2项GameSession/参数测试和类型检查通过。
- **M36 G3-B 九波数据与敌人请求已完成。**9个 wave header、19条 spawn-pool 请求均按独立APK期望实现；Wave 1 实际事件来自 action 1 对应入口，Wave 9 生成一个 Boss、没有 Doc。3项静态/短 GameSession 测试与类型检查通过。
- **M36 G3-C 玩家单位池与建筑生成已完成。**raw112/113/114 对应 Saloon `(24,15)`、Fort `(7,15)`、Tipi `(29,21)`；pool type 1–4 分别为 Gunslinger/Saloon、Mexican/Saloon、Cannon/Fort、Indian/Tipi。第1波库存清零并将四种上限设为7；四类池单位使用独立活动模板，不额外创建地图初始单位。静态期望和真实 GameSession 证明新雇佣的 Cannon 从 Fort `(7,15)` 生成；2项定向测试与类型检查通过。15秒仍只是网页默认，未被 APK 证实。
- **M36 G3-D 双语文案、头像与音乐映射已完成。**接入 APK 英文关卡标题/简介和9段对白资源、对应头像及网页中文翻译；Dakota 环境音乐与三条战斗循环已定义并核对离线 Ogg 资源，未试听或播放。3项静态测试和类型检查通过。场景/主菜单运行时接线留待 G4。
- **M36 G4-A 内容组合与版本快照已完成。**统一工厂组合地图、18个基础招募单位与可选解锁单位、列车、蒸汽船、规则、9波、玩家池和奖励箱；内容版本由四项共享单位解锁快照决定，回放解析只接受规范版本。16种快照、真实 GameSession 开局、场景/池模板资源清单及类型检查通过。遵循现有架构，关卡简介、波次对白与音乐仍由独立表现模块提供，不塞入 `ScenarioContent`；将在 G4-C 接到页面消费者。生产目录、菜单和档案驱动场景入口由 G4-B 接入。
- **M36 G4-B 战役目录与 Free Play 入口已完成。**正式 Dakota 5 / global level 35 登记为 Badlands 后继；菜单使用 Ghost Town 双语标题/简介、map38 缩略图和正确场景预览。Free Play 可选择该关并开放全部难度；正式入口须完成 Badlands，正式/自由开局均使用匹配当前档案的内容版本工厂。Ghost Town 场景引用图片已加入预载集合。目录/进度相关 44 项单测、类型检查和4项菜单 E2E 通过；全应用完整检查留到 G5。
- **M36 G4-C 表现与回放入口已完成。**Ghost Town 已接入 Dakota 地区/35 关上下文、九段双语对白、头像预载、环境/逐波音乐选择及按回放快照重建内容；正式关卡目录、Free Play 和回放工厂均使用同一内容版本契约。类型检查、6项回放/表现单测及4项 Ghost Town/Badlands 菜单 E2E 通过；完整应用检查与内置浏览器验收留到 G5。
- **M36 本地批次已验收，公开集成待处理。**G5 的应用完整检查、共享 catalog 检查及窗口模式/静音内置浏览器检查均通过；M36 尚未 squash 集成、推送或发布。当前本地继续开发分支在 M36 完成提交之上；本轮不执行公开发布。
- **M37 Ice Rocks 静态基线已核实。**Dakota 第6关、global level 36、GameDesignData index 35、TDM 文件39。完整地图、路线、实体、参数、九波及双语资源见[Ice Rocks 静态审计](ice-rocks-static-audit.md)。路线从3个出生 marker 展开成8条完整路径、53条唯一有向控制边；逐路径检查的460次中间格访问全部落在 raw32/80/88 路面。G4–G5 为剩余计划。
- **M37 G1 地图、地形碰撞输入与敌方路线已完成。**新增 TDM39 原始 fixture、768格背景绘制、105条街道/桥面/桥墩命令、Dakota 背景碰撞转换场景，以及3个出生 action 到网页行优先出生点的映射。独立路线 fixture 核对8条完整路径、53条唯一有向边和460次道路中间格访问。4项定向测试与类型检查通过；未接入对象、波次或页面入口。
- **M37 G2-A 静态场景对象与碰撞已完成。**raw69/70/71/72/76、112/113/114、116/117 共32个 marker 均映射到对应 Dakota 素材、锚点和 APK 静态碰撞框；独立坐标/几何期望及真实 GameSession 石块、Fort、木桩移动探针通过。2项定向测试与类型检查通过；单位、炸药和生成池尚未接入。
- **M37 G2-B 活动/睡眠单位与解锁已完成。**raw96–99 对应39个常驻 activity-4 招募单位，raw100/101/130/131 分别受共享解锁状态门控，raw104/105 生成4个 activity-5 活动单位。逐 marker 坐标、素材、唯一 ID、脚底锚点及16种解锁快照通过；睡眠与活动 Gunslinger 的真实 GameSession 碰撞探针通过。2项定向测试与类型检查通过。
- **M37 G2-C Dynamite 配对与全局解锁已完成。**raw102 `(7,17)` 与 raw110 `(6,18)` 配成唯一一组；第20或30关任一里程碑即可解锁。锁定态不加入动态碰撞框且触发无效，解锁态的 Box 会在真实 `GameSession` 中阻挡我方单位；Ice Rocks 原图短会话确认炸药箱中心三格边界上的敌人受伤。3项定向测试通过，类型检查通过；Content Version 中的 Dynamite 解锁快照留到 G4。
- **M37 G3 参数、九波与玩家单位池已完成。**核对并接入12项关卡参数、9个波次、16条敌人请求及 Wave 1 的两项玩家池操作；三个出生 action 到网页 spawn point 的映射与 G1 一致。短 `GameSession` 验证 Wave 1 出生来源和 Wave 9 Boss；玩家池核对 Saloon/Fort/Tipi、四种模板与库存上限。6项新增定向测试、相关 Dakota 05/共享玩家池回归共21项及类型检查通过。APK 未确认玩家池全局派发间隔，继续沿用网页默认15秒并明确标注。
- **M37 G4-A–G4-D 关卡工厂、目录、表现和回放入口已完成。**Ice Rocks 已接入档案驱动的正式/自由入口、地图预览、Dakota HUD、九段双语对白、音乐选择及 replay factory。G4-D 以32种单位/Dynamite 解锁快照验证回放内容重建和规范版本拒绝，并以页面导入 E2E 核实分派；完整应用检查与本地内置浏览器验收留在 G5。
- **发布比例基线为43/254=16.9%。**M36 有12个、M37 有9个已验收实现切片，均尚未公开发布。若 M36 与 M37 各按完整批次发布一次，则为45/254=17.7%。静态审计与文档提交不计实现切片。

## M38：Dakota 第 7 关 Frost Station

**当前状态：G1 地图/路线、G2 实体/列车、G3 参数/波次/对白均已完成；G4–G5 尚未开始。**Frost Station 是 global level 37，APK 地图为 TDM40、参数 index 36、波次分支 `i == 37`。逐关证据以[Frost Station 静态审计](frost-station-static-audit.md)和原始 APK 资源为准；不从邻关复制地图、对象坐标、参数或波次。当前 `campaign-catalog.ts` 已有 Level 37 展示行，本批只接通关卡内容与消费者，不重复登记目录记录。

**依赖：**M36 Ghost Town 与 M37 Ice Rocks 已完成的 Dakota 地形、路线、单位、列车、正式/自由模式、回放和页面框架。M36–M37 仍是本地完成、未发布状态；M38 完成后统一复核三关批次是否一起集成发布，不为单个切片发版。

实施顺序及依赖：

```text
G1 原始地图、地形、完整路线
 ├─ G2 静态对象、睡眠/活动单位、四组列车
 └─ G3 参数、八波、对白与头像
G1–G3 → G4 内容快照、正式/自由入口、表现与回放
G4 → G5 批次检查与发布决策
```

### G1：TDM、绘制层、碰撞输入与敌人路线（已完成）

- **结果：**保存原始 TDM fixture，新增 Frost Station 地图数据、Dakota 场景碰撞适配、独立路线图 fixture 与4个 action→spawnPoint 映射。原始格网、768条背景命令、131条街道命令、图集裁切、最终碰撞码、48条控制边、7条完整路线及396次道路格访问均与 APK 派生期望一致；访问格包括 raw81 铁路覆盖路面。
- **验证：**`node --import tsx --test --test-reporter=spec tests/dakota-07-map-and-routes.test.ts` 通过3项；`pnpm run typecheck` 通过。只验证静态派生数据与网页实现，不声称复现 Android 时间随机种子的逐次贴图；未启动 Android。对象、波次和菜单留在后续切片。

### G2：装饰、睡眠单位与四组列车（已完成）

- **结果：**raw69/70/75 及 raw86/87 均映射到 APK 资源与 TDM 碰撞框；47个 raw96–101 睡眠招募单位按全局里程碑门控，raw130/131 解锁单位坐标和唯一 ID 正确。四组水平列车各包含两台机车和三节车厢，按原有共享移动/碰撞规则构造。未添加 TDM 中不存在的炸药、Steamer 或玩家 spawn pool。
- **验证：**`dakota-07-entities.test.ts` 和 `dakota-07-trains.test.ts` 共7项通过；GameSession 检查睡眠 Gunslinger/Mexican 阻挡、列车整组移动与 raw87 端缓冲阻挡、raw82 铁路覆盖层通行和列车对玩家的阻挡。`pnpm run typecheck` 通过。

### G3：参数、八波、对白与头像（已完成）

- **结果：**接入 GameDesignData index36 的12项参数、`i == 37` 的8个 wave header 与18条敌人请求、8段英文资源原文及中文翻译、portrait 和 Dakota 共用音乐选择。四个 action 均映射到本图 TDM 出生点；Wave 8 请求一个 Boss、Doc 请求为0。未创建玩家 spawn pool；未对30000ms、5等字段推断未知效果。
- **验证：**`dakota-07-campaign-rules.test.ts`、`dakota-07-campaign-waves.test.ts`、`dakota-07-campaign-presentation.test.ts` 共7项通过；短 GameSession 验证四个 action 的实际出生映射及 Wave 8 Boss；参数通过 Easy/Medium/Hard 开局检查。`pnpm run typecheck` 通过。音频只核对离线资源和轨道选择，未播放。

### G4：内容快照、目录消费者、正式/自由入口与回放

- **G4-A 内容工厂：**新增 `campaign-dakota-07` identity、具名单位解锁快照、规范 content-version 解析和 `ScenarioContent` builder；组合 G1–G3。快照只编码会影响单位集合的全局解锁位；正式/自由新局和 replay factory 都以相应档案/录制快照创建内容。覆盖全部16种解锁组合、唯一实体 ID 和真实 `GameSession.open()`。
- **G4-B 菜单与正式目录：**登记为 global level 37，正式解锁前置为 `campaign-dakota-06`（Ice Rocks）；复用已存在 catalog 行。Free Play 无条件开放 Frost Station 的已实现内容及三档难度。核对菜单地图预览、标题/简介、正式进度初始/结算快照、地区已实现数和禁用边界；从真实菜单入口检查，不能只调用 builder。
- **G4-C 表现接线与预载：**接入 Level 37/Dakota HUD、双语对白/头像、Dakota 音乐选择以及完整 Frost Station 场景图像预载。声音保持静音，只验证资源和选择结果。扩展全目录/菜单 E2E，查找所有硬编码关卡总数、地区计数和 Free Play 范围。
- **G4-D 回放入口：**主页面 replay dispatch 按 `campaign-dakota-07` 及录制内容版本重建单位解锁快照；覆盖缺少/未知/非规范版本拒绝及导入当前档案与录制快照不同的情形。不得改旧回放格式或正式结算语义。
- **验收与针对性验证：**builder 输出地图、单位、8波/18请求、正式结算能力和版本；16种解锁快照往返；正式前置锁定/解锁及 Free Play 真实菜单 E2E；中英文 title/overview/dialogue、HUD、地图预载和 replay dispatch 均指向 Level 37。各 G4 子步分别跑受影响单测/E2E和类型检查，完成后更新本计划、关闭已完成子项并本地提交。

### G5：整批本地检查、内置浏览器验收与集成决策

- **本地完整检查：**G1–G4 全部定向检查通过后，运行一次 `CI=1 pnpm run test:ci` 与 `pnpm test:catalog`；修复失败后重跑失败项及最终整套检查。确认 `git diff --check`、资源路径映射、Markdown 相对链接、所有 changed files 与本批范围一致。
- **内置浏览器：**本地窗口模式、静音，从真实主菜单进入 Free Play → Dakota → Frost Station → Medium；核对 Level 37 文案、首波对白/头像、铁路/桥面/列车、单位与 HUD，关闭对白后确认战场正常。使用小幅模拟推进或短交互，不完成关卡；不进入全屏、不播放音频。
- **集成发布：**G5 通过后重新核对 M36–M38 的完整内容、分支状态和发布比例，再按 Guns’n’Glory 规则决定以一个完整批次 squash 集成到 master；需要发布时 push 后核对 Actions 与部署来源 SHA，再用内置浏览器验收。任何来源 SHA 或线上关卡入口不一致时保持发布未完成。不得把 M38 单关的小切片单独发布。

## M36：Ghost Town 内容接入

依赖：M35 Dakota 内容与共享地图/碰撞/路线框架。接入数据仅以本关静态审计和 APK 原始资源为准；旧摘要只能作检索线索。实现过程中如发现差异，先回原始 TDM/Smali/resource consumer 核实，再更新审计与本计划。

### G3：关卡规则与内容数据

各步骤使用 `ghost-town-static-audit.md` 的独立 APK 派生表做期望值；波次请求向量按“剩余数量”验证，不把它们误读为确定的逐个敌人顺序。池计时目前沿用网页现有15秒默认值，静态报告尚未证明它是 APK 针对本关的专属间隔，测试与交付说明必须保留这一限制。

### G4：正式目录、Free Play、回放与页面入口

#### G4-C：回放、HUD、资源预载和浏览器入口

- **状态：已完成。**主页面接入 Dakota 地区/35 关上下文、Ghost Town 的九段双语开场对白、头像启动预载、Dakota 环境音乐与逐波战斗音乐；回放导入按记录中的四项单位解锁快照重建，不依赖当前档案。正式结算仍由现有 formal 模式语义控制。
- **范围：**接入内容快照回放、HUD 地区/关卡上下文、G3-D 的双语对白/音乐模块及头像/音频资源映射。G4-B 已接通 Ghost Town 目录、菜单预览、档案驱动开局和场景图片预载；本步补齐剩余表现消费者。沿用 `main.ts` 现有关卡消费者，不把页面表现字段扩展进 `ScenarioContent`。最终浏览器检查窗口模式和静音；不进入全屏、不推进完整战役。
- **验收：**正式战役和 Free Play 都能从菜单进入 Ghost Town；标题、简介、对白、音乐选择、HUD、地图与缩略图均指向 Dakota 第5关；回放按记录的内容版本重建；图片和音频文件离线存在；完成结算只写正式模式进度。只检查音乐选择和资源，不播放音频。
- **定向验证：**`pnpm run typecheck` 通过；`node --import tsx --test tests/dakota-05-replay-content.test.ts tests/dakota-05-campaign-presentation.test.ts` 通过6项；`CI=1 PLAYWRIGHT_PORT=43480 pnpm exec playwright test tests/e2e/t74-dakota-05-integration.spec.ts tests/e2e/t73-dakota-04-integration.spec.ts --workers=1` 通过4项。E2E 覆盖 Free Play 菜单、标题/简介、地图预览、地区/关卡上下文、首段对白与头像加载、静音开局，以及正式关卡前置解锁。完整应用检查和内置浏览器验收留到 G5；本步没有播放音频。

### G5：批次收尾与发布

- **状态：本地验收通过；发布待执行。**完整应用检查：`CI=1 PLAYWRIGHT_PORT=43480 pnpm run test:ci` 通过类型检查、1053项单测、生产构建及194项E2E；`pnpm test:catalog` 通过18项。构建保留既有约3.99 MB JS chunk 警告。内置浏览器本地窗口模式、静音检查 Ghost Town 选关、Level 35/地图预览、Wave 1/9 对白与头像加载及战场地图；未进入全屏或播放音频。本轮只完成本地验收，不执行 push、发布或线上 SHA 核验，因此发布门槛仍未关闭。
- **范围：**G4-B–G4-C逐片验收后执行本应用完整检查与适用共享检查；修复本批暴露的回归后再做最终完整检查。
- **验收：**pnpm run test:ci、pnpm test:catalog通过；文档和经验记录链接有效；工作树与Git diff仅包含本批；本地页面窗口模式、静音完成菜单/地图/首波代表流程检查。
- **发布：**按Guns’n’Glory流程将完整M36批次squash集成到master并发布，核对 Actions、Pages来源SHA及部署页面，再将发布提交同步回gunsnglory。未完成线上SHA和内置浏览器检查前不得标记发布完成。
- **观察边界：**不完整通关、不启动Android、不进入全屏、不播放音频；遇到静态证据无法回答的单一问题才设计最小定点观察。

## M37：Dakota 第 6 关 Ice Rocks

**依赖：**M36 Ghost Town 与现有 Dakota 场景、单位、路由、规则、回放和菜单框架。实施前已从目标 APK 重新核对 TDM 文件39、GameDesignData index35 的父级数组写入、`GameDesignWaves.setWaves(i == 36)`、资源字符串和相关 TDM 构造调用。逐关值以[Ice Rocks 静态审计](ice-rocks-static-audit.md)及 APK 原始条目为准；邻关数据仅用于复用已证实的共享规则。

### G2-C：Dynamite 配对与全局解锁（已完成）

- **范围与实现：**raw102 Trigger `(7,17)` 与 raw110 Box `(6,18)` 作为本图唯一配对；沿用全局 Level 20/30 解锁条件和共享爆炸、碰撞规则。没有改变规则接口；内容版本中的 Dynamite 解锁快照留待 G4 接通。
- **验收与结果：**真实 TDM marker 坐标与配对结果一致；Level 20、Level 30 两条解锁路径及快照状态构造函数均通过。完整回放导入路由与录制解锁快照的接线仍由 G4 验收。锁定态没有 Trigger/Box 动态阻挡框且点击不会爆炸；解锁态的真实 GameSession 移动会被炸药箱阻挡。Ice Rocks 原图短会话中，距炸药箱中心精确三格的敌人受伤，锁定态点击不造成伤害。
- **针对性验证：**`node --import tsx --test tests/dakota-06-dynamite.test.ts` 通过3项；`pnpm run typecheck` 通过。不手动完整游玩。
- **测试夹具注意：**动态对象碰撞探针使用全开放地形，只保留 APK 配对器生成的炸药对象；若直接将 raw102/110 放在移动测试网格中，地形格自身的碰撞判定会混入结果，不能据此单独判断动态解锁碰撞框是否生效。详见[经验记录](experience-log.md)。

### G3：关卡参数、9波、16条敌人请求与玩家生成池（已完成）

- **范围与实现：**接入 GameDesignData index 35 的12项参数、`i == 36` 的9个波次头、16条 `addToWave` 请求及 Wave 1 两项 SpawnPool 操作。敌人池 action ID 按 G1 映射到原始 TDM 出生点；波次向量保留为剩余请求数，不解释成固定逐敌顺序。
- **验收与结果：**原始参数 `[200,25,999,25000,3,30000,5,15,56,75,125,118000]` 与已确认字段语义逐项一致；三档难度 HP 为56/75/125%。9波延迟、HP/速度倍率、16个请求的 action、间隔、八槽向量及 Boss/Doc 槽与独立审计表一致。Wave 1 将四类库存设为0、上限设为3；pool type 1–4 分别映射 Gunslinger/Mexican→Saloon、Cannon→Fort、Indian→Tipi。未知参数未推测额外效果；非零 Gambler timer 没有生成地图中不存在的 Gambler/Casino。
- **定向验证：**新规则、波次、玩家池测试共6项；加 Dakota 05 同契约及共享玩家池回归共21项通过；`pnpm run typecheck` 通过。短 `GameSession` 验证 Wave 1 action 1 的 spawn point 与首个敌人事件、Wave 9 Boss 请求槽；没有推进完整关卡。
- **未证实边界：**APK 未提供或尚未确认本关 `SpawnPoolManager` 全局派发间隔，沿用现有网页15秒默认并在代码中标注为非 APK 结论。Dynamite 与单位解锁快照的完整回放导入接线留到 G4。

### G4：关卡内容工厂、目录接入、表现与回放

**静态依据：**所有关卡专属值、资源与编号关系以[Ice Rocks 静态审计](ice-rocks-static-audit.md)和 APK 原始条目为准。不得把 global level 36、TDM 39、参数 index 35、对白编号 36 混为同一索引；邻关只提供已经确认的共享机制。`campaign-catalog.ts` 已有 Level 36 的 Ice Rocks 展示记录，本批需接入正式阶段及各实际消费点，不重复登记目录行。

消费点依赖关系：

```text
G4-A 内容版本快照与 ScenarioContent 工厂
 ├─ G4-B 正式阶段、Free Play/正式菜单与档案驱动开局
 ├─ G4-C 标题/简介、对白/头像、HUD、音乐及启动预载
 └─ G4-D 回放版本解析与录制快照重建
G4-B、G4-C、G4-D 全部通过后 → G5 批次验收
```

#### G4-A：内容工厂与开局快照

- **状态：已完成。**新增 Ice Rocks identity、规范化 content-version、按档案/快照构造正式 `ScenarioContent`；接入地图单位和 Dynamite 两种解锁快照，未加入静态审计不存在的列车、蒸汽船、赌场或奖励箱。
- **范围：**新增 Ice Rocks 的 identity、content-version 与正式 `ScenarioContent` builder；组合 G1–G3 的 map39 场景、单位、Dynamite、规则、波次和玩家池。按静态审计，不创建本关没有 marker 的列车、蒸汽船、赌场或奖励箱。快照包含四个全局招募单位解锁位及 Dynamite 解锁位；正式/自由新局都由传入的 `completedScenarioIds` 生成一致的版本与内容。
- **依据与边界：**照用已审计的 Dakota 共享规则；单位解锁位按具名字段，Dynamite 按现有 Level 20/30 里程碑函数计算。不得将网页默认池间隔或其他未证实字段伪装为 APK 专属事实；内容版本只编码会改变初始场景的状态。
- **验收：**覆盖 `16 × 2 = 32` 个单位/Dynamite 快照组合，断言版本生成—解析往返、规范版本拒绝、最终初始单位集合和 Dynamite 状态一致；builder 输出正式结算能力、地图 ID、9 波、16 个敌人请求及玩家池契约。使用真实 Ice Rocks 场景创建 `GameSession`，确保 G1–G3 内容可以开局且单位/对象 ID 唯一。
- **定向验证：**`node --import tsx --test --test-reporter=spec tests/dakota-06-content-version.test.ts tests/dakota-06-campaign.test.ts tests/dakota-06-dynamite.test.ts tests/dakota-06-units.test.ts tests/dakota-06-campaign-rules.test.ts tests/dakota-06-campaign-waves.test.ts tests/dakota-06-unit-pool.test.ts` 通过17项；`pnpm run typecheck` 通过。首轮暴露 profile fixture 漏列 Sniper 里程碑 `campaign-dakota-10`，修正测试 fixture 后全绿，生产代码未因该错误调整。内容工厂本身及 32 个快照编码、单位集合和炸药状态验收通过。本步不接页面、不测试回放导入，也不推进完整关卡。

#### G4-B：正式阶段、Free Play 与菜单开局

- **状态：已完成。**Level 36 已加入正式目录并以前置 Ghost Town 解锁；菜单双语文案、map39 预览、Free Play 三档难度、正式入口和档案快照驱动场景工厂均已接通，Ice Rocks 场景图像已进入启动预载集合。
- **范围：**将 Level 36 加入 `officialCampaignStages`，要求 `campaign-dakota-05`（Ghost Town）完成；复用 `campaign-catalog.ts` 已有 Level 36 行。接通菜单双语标题/简介、map39 缩略图与场景预览、正式/Free Play 开局、难度选择和基于当前档案的场景 builder；将全解锁 Ice Rocks 场景引用交给启动图片收集器，确保真实开局可绘制。正式结算保持现有 Progress 语义；HUD 地区标签和对白头像预载留给 G4-C。
- **验收：**从真实菜单验证 Free Play 可直接选择 Ice Rocks 且三档难度可进；正式模式在 Ghost Town 未完成时不可进，完成后可进。菜单标题/简介、场景 ID、内容版本、map39 地图/缩略图、难度和开局波次均对应 Ice Rocks。对至少一种与默认测试档案不同的全局解锁档案，确认页面选择的 builder 和 `GameSession.open` 使用同一快照。HUD 地区标签和 Level 36 上下文由 G4-C 验收，避免与表现接线重复。
- **定向验证：**正式目录/Progress 与菜单状态单测；真实菜单路径 E2E 覆盖 Free Play、正式锁定与解锁、档案驱动开局以及中文/英文名称。不得用静态目录存在或直接调用 builder 代替菜单路径验收。`dakota-06-formal.test.ts` 等5个定向单测文件共36项通过，`pnpm run typecheck` 通过；Dakota 01–06、共享进度/关卡菜单等定向 E2E 共24项通过。新建用例最初误用了不存在的 `data-testid="scene-title"`，改用页面现有 `#scene-title` 后，t75 两项复跑通过。G4-B 不验收地区 HUD；错误上下文显示该项仍回退为 New Mexico，按计划交给 G4-C 修复和断言。完整 `test:ci` 留到 G5。

#### G4-C：对白、HUD 与表现资源预载

- **状态：已完成。**Ice Rocks 已接入九段 APK 英文对白资源、中文翻译、头像、Dakota 地区/36 关 HUD、正式/自由说明、头像预载，以及 Dakota 共用环境音乐和逐波循环选择。回放导入已由 G4-D 接入；批次完整检查仍由 G5 执行。
- **范围：**沿用 G4-A/G4-B 已接入菜单的双语标题/简介；按 `ICE-COPY` 接入九段对白原文、中文翻译和头像映射。补上 Ice Rocks 的战斗说明、Dakota HUD 地区/Level 36 上下文、对白选择、头像等表现资源预载、环境音乐与逐波音乐选择。地图、静态对象和单位场景图像由 G4-B 预载。音乐沿用 Dakota 共用资源；不发明本关独立曲目或语音。
- **验收：**九段对白顺序、resource ID、speaker、portrait 与独立审计表一致；中英文均能显示。正式与 Free Play 的标题、地区和 Level 36 HUD 正确；地图、单位、头像等图像以及音乐文件离线可读取。音频保持静音，只核对选择函数和资源文件，不播放试听。
- **定向验证：**`node --import tsx --test --test-reporter=spec tests/dakota-06-campaign-presentation.test.ts tests/dakota-06-formal.test.ts` 通过6项；`pnpm run typecheck` 通过。`CI=1 PLAYWRIGHT_PORT=43497 pnpm exec playwright test tests/e2e/t74-dakota-05-integration.spec.ts tests/e2e/t75-dakota-06-integration.spec.ts --workers=1` 中 Ghost Town 2项通过；Ice Rocks 两项先后在修正本地化断言后通过，最终 t75 2/2。E2E 检查九波开场文案及 portrait 实际加载、中文/英文 HUD、Free Play/正式说明和无资源错误；声音保持关闭。未播放音乐。`git diff --check` 通过；G4-D 已完成，G5 未完成。

#### G4-D：回放导入按录制快照重建

- **状态：已完成。**新增 `createBrowserGameForDakota06Replay()`，从回放的规范版本恢复四种单位解锁位和 Dynamite 位；`gameForReplay()` 将 `campaign-dakota-06` 分派给该工厂。缺失版本报告 `missing-version`，不支持或非规范版本报告 `content-unavailable`。
- **验收：**32 种单位/Dynamite 快照分别通过版本 round-trip，并在导入档案与录制快照不同的条件下比较重建单位集和炸药解锁状态。真实页面导入 E2E 使用不同的当前档案：受支持版本成功进入回放校验阶段，随后因测试特意设置的 frame 1 摘要不匹配而报告 `result-mismatch`；追加后缀的非规范版本报告 `content-unavailable`。这验证了主页面的工厂分派及版本拒绝，不声称完成了一场结算回放或验证了正式进度写入。
- **定向验证：**`node --import tsx --test tests/dakota-06-replay-content.test.ts` 通过2项（含32种状态矩阵及缺失/非规范版本）；`pnpm run typecheck` 通过；`PLAYWRIGHT_PORT=4198 pnpm exec playwright test tests/e2e/t76-dakota-06-replay.spec.ts --workers=1` 通过1项。全应用 `test:ci`、共享 catalog 检查和本地内置浏览器验收留在 G5。

### G5：本地批次验收

- **状态：本地验收完成；本批不推送或发布。**首轮完整检查发现 `tests/content.test.ts` 的 Cow Gulch 全目录断言只列到 Level 35；已补入 Dakota 06 的 Level 36 独立期望。定向 `content.test.ts`、`dakota-06-formal.test.ts`、`progress.test.ts` 共30项通过。
- **完整检查：**`CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci` 通过类型检查、1084项单测、生产构建和197项 E2E；`pnpm test:catalog` 通过18项。生产构建保留约4.1 MB 主 JS chunk 体积提示。
- **内置浏览器：**本地窗口模式、静音，从主菜单进入 Free Play → Dakota → Ice Rocks → Medium，确认 Level 36 身份、首波对话与头像、地图、HUD、缩放和全屏控件；关闭对白后战场正常显示。没有进入全屏、播放音频或通关。
- **本地批次范围：**G4-A–G4-D 各切片均已针对性验收并本地提交；M37 在当前分支完成本地验证。本轮不 push、不 squash、不合并、不发布。
- **交付边界：**静态 APK 证据和真实 `GameSession` 已能回答本批问题，没有启动 Android；全屏与音频未作验收。

## 发布比例

- M30结束时的核实基线为36次公开发布 / 195个已验收实现切片。
- M31–M34新增31个切片，同期6次公开部署；累计为42 / 226 = 18.6%。
- M35增加7个切片并完成1次公开发布；累计为43 / 233 = 18.5%。M36 增加12个、M37 增加9个切片，尚未公开发布；当前为43 / 254 = 16.9%。若 M36 与 M37 各按一个完整批次发布，则为45 / 254 = 17.7%，低于20%目标。静态审计、文档提交、完整检查和分支回同步不计为实现切片。

## 批次执行规则

- 每个实现切片先运行针对性验证、更新本计划并本地提交；一组步骤完成后重新核对未完成项和依赖。
- 整批结束时运行完整应用检查和适用共享检查一次。失败留在当前批次修复，再重跑失败项及最终完整检查。
- APK数据期望必须独立于生产数据；路线、绘制、碰撞、单位、规则、内容入口分别验证。不能用DOM可见、fixture自洽或单张预览图证明完整行为。
- 发布是完整功能批次的决定，不按文档或单个实现切片发布。部署与内置浏览器门槛未通过时，批次保持未完成。
