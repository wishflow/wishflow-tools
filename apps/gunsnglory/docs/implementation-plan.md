# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮先核对当前代码与证据，再细化接下来几个可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- Horse Hills（M20）已发布并回同步；发布 SHA、完整检查和入口验收见下方 M20 批次记录。当前 `origin/gunsnglory` 已包含 `origin/master`，本轮开发分支从该集成头创建。
- M21 Eastwood Forest 已发布；回放审计确认 M21 新局漏掉 map24 招募 marker，M4–M7 的 profile-dependent 初始单位没有进入回放内容版本。M22-D/E 已实现修复，M22-F/G 负责实际回放入口、批次检查和发布；证据见[Eastwood Forest 静态审计](map21-static-audit.md)。
- 普通发布比例按25/125（20.0%）起算。本批规划5个实现切片及1次普通发布，完成后预计26/130（20.0%）；文档切片不计入实现数。

## 当前批次：回放内容快照补全（M22）

目标是使回放内容版本完整标识影响开局场景的档案状态，并修复 M21 新局遗漏的 map24 招募单位。APK 证据和修正后的 marker 语义见[Eastwood Forest 静态审计](map21-static-audit.md)。测试默认窗口模式、静音；不完整通关、不启动 Android。

| 顺序 | 切片 | 范围与验收 | 状态 |
| --- | --- | --- | --- |
| M22-A | 证据与计划纠正 | 以 Smali 条件跳转和 `Guns’n’GloryThread` 调用点确认 `fromLoadGame` 语义；改正 M21 静态审计、架构约束、经验记录及历史计划描述。链接有效、事实/历史结论可区分，`git diff --check` 通过，Markdown 按相对路径复制归档。 | 已完成 |
| M22-B | 全局解锁快照契约 | 新增 M4–M7 共用 v2 版本编解码器，编码四个全局单位里程碑位，另为 M4 编码 `mapAccessible`；精确识别各关固定 v1 版本，并拒绝畸形/跨关版本。 | 已完成；`new-mexico-replay-content-version.test.ts` 3项通过（16种解锁组合、M4访问位、v1及非法版本）。 |
| M22-C | M4–M7 内容版本生成 | 四关内容 builder 从有效档案快照生成 v2；将实际影响场景的单位门控和 Tech Town map-access 位纳入版本。正式及 Free Play 入口传入同一有效 completed IDs；各 milestone 与内容实体逐项对应。 | 已完成；4关 builder/浏览器版本组合矩阵与相关正式测试21项通过；`t31-free-play`、`t37-tech-town-formal` 定向 E2E 3项通过；`pnpm run typecheck` 通过。 |
| M22-D | M4–M7 回放工厂 | 为四关增加按录制版本还原场景的 factory，并接入导入路由。v2 replay 必须忽略导入时当前档案；v1 replay 继续按现有历史行为使用当前档案构造。未知/畸形版本不得退回当前内容。 | 已完成；v2 对四关全部16种解锁快照在不同导入档案下还原单位；v1 对空档案/全解锁档案保持原语义，Tech Town 保留旧路由补入 M3；未知和畸形版本均以 `content-unavailable` 拒绝。新增回放工厂测试及版本编解码测试共7项通过，`pnpm run typecheck` 通过。 |
| M22-E | Eastwood 新局招募与版本升级 | 按 map24 marker 96、97、100、101、130、131 从真实 TDM 生成 activity 4 招募单位并应用 APK 解锁门槛；保留 activity 5、Gambler/Casino 和奖品模板行为。升级至 v2；v1 replay 保持 M21 已发布的旧单位列表。核对坐标、类型、activity、唯一 ID、16种全局解锁组合及 v1/v2 分支。 | 已完成；31个 activity 4 marker 的坐标/类型/activity 按 TDM 对照，16种解锁组合及唯一 ID 通过；v2 使用新单位集，v1 恢复旧 activity 5 单位集且保留原快照门控。Eastwood/内容回归19项通过，M4–M7 与 Mississippi 兼容定向测试15项通过，`pnpm run typecheck` 通过。 |
| M22-F | 回放矩阵与入口回归 | 在录制档案和导入档案不同的条件下验证 M4–M7 每种快照、M4 map-access 状态和 Eastwood v1/v2 replay factory；验证未知版本拒绝。补足正式与 Free Play 入口的定向 E2E，不推进完整关卡。 | 已完成；M4–M7 的16种快照组合由工厂单测遍历，v1 与导入档案一致时保持旧内容；M4 `map-access=0` 即使当前档案已解锁 M3 仍由版本解析/prepare 保持关闭，开放状态的真实 replay 由浏览器导入覆盖。E2E 用短探针覆盖 M4–M7 与 Eastwood v1/v2 共10个可生成内容版本，frame 0 由真实 `GameSession` 摘要校验，frame 1 使用故意不匹配摘要以避免推进战斗；未知版本返回 `content-unavailable`。`t60`、两项 `t31-free-play`、`t37-tech-town-formal` 共4项 E2E 通过；M4–M7 工厂及 Eastwood 内容/规则单测共10项通过；`pnpm run typecheck` 通过。 |
| M22-G | 批次检查、发布与回同步 | 先运行 M22 定向测试并修复失败；整批结束后运行 `CI=1 PLAYWRIGHT_PORT=<空闲端口> pnpm run test:ci`。通过后以单个 squash commit 集成至 `master`，推送并等待 Pages 工作流；核对 GitHub Pages 与 Cloudflare Pages `build-info.json` 的 `sourceSha`，再用内置浏览器静音、窗口模式验证 M4–M7 replay 与 Eastwood Free Play 代表流程；最终合并已发布提交回 `gunsnglory` 并核对远端。不得完整通关、进入全屏或播放音频。 | 本地检查已完成，发布待进行；`CI=1 PLAYWRIGHT_PORT=43247 pnpm run test:ci` 通过：类型检查、734项单测、生产构建、156项E2E。首轮 CI 的 Billy Hills 测试夹具版本不匹配已修复，并新增经验记录。生产构建仅保留既有约2.45 MB JS chunk 警告。 |

## 最近完成批次：Eastwood Forest（M21；M22 复核更正）

目标是将 Oregon 的全局第21关接入地图、规则、关卡目录、Free Play 和回放。完整静态依据见[Eastwood Forest 静态审计](map21-static-audit.md)。测试保持窗口模式与静音；只做代表性关卡入口验收，不完整通关、不启动 Android。

| 顺序 | 切片 | 范围与验收 | 状态 |
| --- | --- | --- | --- |
| M21-A | 静态审计与计划 | 核对 APK 地图、路线、marker、8波、初态、文本和资源；当时将96–101、130、131误判为读档专用，并据此安排兼容修复。M22-A 已依据 Smali 和调用点纠正该结论；链接、证据路径及 `git diff --check` 通过。 | 已完成，审计结论由 M22-A 更正 |
| M21-B | 地图、地形与路线 | 接入 map24 原始网格、Oregon 地形/街道图层、6个入口、2个出口和全部控制点；由测试逐格比较 TDM、绘制图层与路线边，不以截图目测替代。 | 已完成；770字节 TDM SHA 与 APK 一致，768个背景格、76个街道绘制项；碰撞层与固定随机渲染逐格匹配，背景变体与静态索引候选零差异；6条路线、42个转向点、47条有向边逐点匹配。地图定向测试2项和 `pnpm run typecheck` 通过。 |
| M21-C | 地图对象与新局单位 | 按 Oregon marker 规则接入树木/岩石装饰、活动单位、Gambler/Casino 和奖品模板。原实现误排除96–101、130、131。 | 已发布版本只由 activity 5 marker 创建2名 Gunslinger、2名 Mexican；10个 code79 树木与 Gambler/Casino、奖品模板均通过当时测试。M22 已确认其漏掉新局 activity 4 招募单位；M22-E 补回并保留 v1 replay 的已发布列表。 |
| M21-D | 初态、难度与8波 | 分别在 `oregon-01-campaign-rules.ts`、`oregon-01-campaign-waves.ts` 保存规则和波次。按 APK 接入 `$75`、25生命、3次升级、86/115/140% HP 倍率、999/25,000ms/15/4类奖励箱、Gambler 299,000ms 冷却；按 DEX 源调用顺序录入8波的延迟、HP/速度倍率、20条 action 0–3 请求和2500ms间隔，敌人向量保留10槽（末两槽为0）。测试完整参数/向量并用真实 `GameSession` 触发一个实际请求，验证出生点、敌型与初态；不添加不存在的单位池/Cannon。 | 已完成；完整8波/20个请求与10槽向量逐项匹配审计表，action 0–3 映射正确；真实 `GameSession` 验证 `$75`、25生命、999个奖励箱及首波 Settler 从 action0 的真实出生坐标生成，Medium HP 为185。无单位池；没有新增 `awesomeMessageMin` 行为。7项 Oregon 地图/实体/规则测试与 `pnpm run typecheck` 通过。 |
| M21-E | 双语内容与离线资源 | 接入简介、8段 APK 英文对白和中文译文、已确认头像；从用户提供的 APK 提取 Geezer 头像和 `music_oregon.ogg`，补齐 Oregon 音乐路由并核对文件格式/大小。未知胜利标题和专属语音不补造，声音不播放。 | 已完成；接入 Eastwood Forest 双语简介及8段对白，保留 APK 英文、项目中文译文和对应肖像；专属 Geezer 头像与 APK 文件逐字节一致，96×96。补入 APK 的 `music_oregon.ogg` 原文件（787,340字节），与 APK 提取文件逐字节一致；环境循环与三首战斗循环均有离线文件，按波次轮换。无未证实语音、无专属胜利标题。4项内容/资源/音乐测试和 `pnpm run typecheck` 通过。 |
| M21-F | 正式关卡、Free Play 与回放 | 1) 新建 `oregon-01-campaign.ts` 与 `oregon-01-content-version.ts`，从已核实的 map/rules/waves/entities 组装正式 `ScenarioContent`；版本快照复用 30/40/50/60 级解锁位，因为它们分别影响 Grandpa、Sniper、Gambler/Pyromaniac、Salesman 及 Gambler 奖品模板。2) 在 `official-campaign.ts` 将既有 level21/map24 目录条目登记为 `campaign-oregon-01`，前置 `campaign-mississippi-20`；在 browser bootstrap、内容版本解析、Free Play 入口和 replay 导入中注册同一构建器/快照恢复器。3) 仅补 M21 必要的 Campaign 概览构建、Oregon 区域标签和关卡标题路由；不改既有 level1–20 行为，不添加 APK 未提供的胜利标题。 | 已完成；正式关卡第21关依赖 Horse Hills，未完成第20关时锁定；正式胜利记录第21关，Free Play 三档都可启动且不改变档案。独立内容版本往返恢复30/40/50/60级快照；16种组合均核对 Gambler/Casino 可见性及奖品模板，replay factory 按录制版本重建。Campaign 概览、Oregon 标记、map24 缩略图、Pedro 首波对白/头像及未实现第22关禁用通过真实入口 E2E；Geezer 的 APK 头像用于其对应的后续波次，不是首波。`oregon-01-formal.test.ts` 3项、M21/M20 定向测试17项、既有战役注册回归60项、入口E2E 2项与 `pnpm run typecheck` 通过；完整 `test:ci` 留至 M21-G。 |
| M21-G | 批次检查、发布与回同步 | 1) 检查工作树、M21-A–F 提交和最新远端；确认 `origin/master` 是开发分支祖先且无本轮外改。2) 在 `apps/gunsnglory/` 执行一次 `CI=1 PLAYWRIGHT_PORT=43163 pnpm run test:ci`，收齐类型检查、全部单测、生产构建和全量 E2E；失败时修复失败项并重跑，直到最终全绿。3) 仅在全量检查通过后，把本分支相对 `origin/gunsnglory` 的完整 M21 改动 squash 为一个提交，集成到最新 `master`，并使用裸 `git push origin master` 触发发布。4) 用 GitHub CLI 确认 Pages workflow 成功；核对 GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 来源 SHA 均等于 squash 提交。5) 使用 Codex 内置浏览器打开该提交对应的 GitHub Pages 版本，保持窗口模式和静音，验证 Oregon Free Play → Eastwood Forest → Medium → 第1波对白/头像/地图/`1/8` HUD；不完整通关、不进全屏、不播放音频。6) 把已发布 master 合并回 `gunsnglory`，推送并核对 master、集成分支、远端和相关工作树均包含发布提交。 |

**M21-G 已完成：**最终 `CI=1 PLAYWRIGHT_PORT=43163 pnpm run test:ci` 全部通过：TypeScript 检查、725 项单测、生产构建和 155 项 E2E。首次全量检查发现既有进度/目录测试仍固定断言20关；更新正式关卡清单和相关进度摘要预期后，定向单测31项、Apache Valley 8项、进度相关 E2E 11项及最终整套检查均通过。构建提示主 JS bundle 约2.45 MB（gzip约273 KB）；本批不含拆包变更。

批次 squash 发布提交为 `bf843595e7f4bcbc53d6afa06797f4d7169e5fc3`；GitHub Actions `43336290171` 的共享检查、Guns’n’Glory CI、GitHub Pages 和 Cloudflare Pages 均成功，两个 Pages 的 `build-info.json` `sourceSha` 都为 `bf843595e7f4bcbc53d6afa06797f4d7169e5fc3`。内置浏览器保持窗口模式和静音，从 Free Play → Oregon → Eastwood Forest → Medium 进入，确认第21关标题、Pedro 首波英文对白及头像、地图图像和 `Wave 1 of 8` 开场状态；继续后进入战场，没有推进完整关卡。浏览器截图接口对该标签返回零宽度，故像素外观未由截图单独确认；全量 E2E 已断言首波 HUD 状态。未进全屏、未播放音频、未启动 Android。发布内容已合并回 `gunsnglory`，本地与远端通过合并提交 `0372775526a21860d7e50fe7e564668b4280aadd` 对齐；该工作树原有未跟踪研究文档仍保留。

### M21 复核结果（由 M22 接手）

- Smali/DEX 与 `onLoadGame()` 调用点证明 marker 96–101、130、131 在 `fromLoadGame=false` 新局创建 activity 4 招募单位，读档时才跳过 TDM 初始对象。M21 审计和专用工厂把条件读反，故已发布 M21 省略这批招募单位；共享 `createNewMexicoMapUnits()` 与 M1–M20 不需要因此全局更改。M22-E 恢复 Eastwood 新局对象并升为 v2，v1 replay 精确保留已发布旧内容。
- M4–M7 的单位解锁受全局里程碑影响，但当时固定的 v1 `contentVersion` 未描述这些 profile-dependent 初始单位；M22-B–D 为新版本增加快照，保持 v1 导入语义。
- M21 的 TDM 没有 `spawnPoolActions`，故不扩展 `campaignUnitPool`、不新建 Cannon 模板，也不放置虚构炮位。只有后续 APK 关卡证据出现无地图 marker 的池单位时，才使用经用户批准的可选独立生成模板契约。

## 最近完成批次：Horse Hills（M20）

本批基于 APK 静态证据接入 Mississippi 第20关，并完成本地检查、squash 发布、部署 SHA 核对和内置浏览器代表流程验收；未完整通关、不启动 Android。5个实现切片和1次普通功能发布已计入累计发布比例24/120（20.0%）。文档审计不计入实现分母。

研究输入来自 `codex/gunsnglory-spec` 的 `apps/gunsnglory/docs/research/`：`content-inventory.md`、`data/map-inventory.json`、`data/level-config.json`、`data/waves.json`、`data/string-resources.json`、`data/wave-reference-resolution.json`、`data/resource-inventory.json` 及其中列出的 DEX/REA 证据。研究资料不加入页面构建依赖；M20 审计需摘录实现和测试真正需要的证据，并标明推导边界。

| 顺序 | 切片 | 实施范围 | 可判定验收 |
| --- | --- | --- | --- |
| M20-A（已完成） | 静态审计与参数核对 | 新建 [M20 静态审计](map20-static-audit.md)，记录地图身份、标记/路线、对象与解锁、完整关卡配置、波次和池动作、对白/资源、正式与回放边界；注明 APK 派生资料出处和 DEX 语义依据。 | `td_map_23.tdm` 为32×24、770字节，APK 摘要为 `4c8fb4fa0481fb3a7e3a848d756c4042e2f3648f5722176b360a5575228aa302`；配置中 $450、1生命、3次升级、75/100/110% HP、999总奖励箱、25秒间隔、12个场上上限、4类奖励、8条 `newWave`、16条 `addToWave`、2个 pool 动作及标题/简介/胜利标题/8段对白均可追溯；`awesomeMessageMin=30000` 与 `gamblerTime=119000` 的消费边界已标为未知，不凭字段名猜语义。链接和 `git diff --check` 通过。 |
| M20-B（已完成） | 地图、地形与路线 | 从 APK 派生网格还原原始 TDM 和 `mississippi-20.json`；复用 Mississippi 地形、桥/道路渲染、场景碰撞和控制点路线生成器。不得按编号推测路线或手工挪动节点。 | `td_map_23.tdm` 长770字节，SHA-256 与 M20 审计一致，头部为32×24且768格逐字节匹配；背景/街道绘制命令由现有 APK 网格复算器重算一致；2个入口、2个出口、46个 redirector、50条有向边及4条完整分支路线均被覆盖；M19 地图回归在内的定向测试7项通过。 |
| M20-C（已完成） | 地图对象、单位与生成池 | 按 TDM 对象构造规则实例化 Mississippi 装饰物、activity 4 招募对象、activity 5 活动对象、六节 Steamer 和 Indian Tipi 池模板。共享 New Mexico 单位工厂仅对 activity 4 应用全局招募解锁，已激活的 activity 5 对象不受睡眠招募门槛过滤；保留现有 `ScenarioUnit` 与可选 pool template 契约，不伪造 Cannon。 | M20 审计中的装饰 marker、单位类别/坐标/activity、Steamer 6 个部件与3门可招募 Cannon、Tipi 位置和池模板逐项匹配；Grandpa/Sniper/Pyromaniac/Salesman 锁定与全部解锁两组状态及 ID 唯一性通过；Indian 模板不进入初始单位。M20 实体与 M18/M19/M15 回归共22项定向测试通过；`pnpm run typecheck` 通过。 |
| M20-D（已完成） | 初态、8波与单位池规则 | 接入 `$450`/1生命/3级升级、三档 HP 倍率、奖励箱数量/时限/场上上限、已确认的反馈阈值、8波 metadata、16个按源顺序排列的生成调用，以及第2波 Indian pool 的 `set 2` / `set-max 4` 动作和已确认的全局派发周期。未确认的 `awesomeMessageMin`、`gamblerTime` 不映射为猜测行为。 | `GameSession` 初态和奖励箱（999/25秒/12/4类）、难度、阈值5、8条波次 metadata、16条生成向量、APK action ID 到网页出生点映射、池动作及 wave 2 Indian 从唯一 Tipi 实际生成逐项匹配 M20 审计；池模板没有进入初始场景单位。M20规则/实体/地图与 M19 规则/地图共17项定向测试通过；`pnpm run typecheck` 通过。 |
| M20-E（已完成） | 关卡文案和离线资源 | 新增 Horse Hills 稳定身份、APK 英文标题/简介/胜利标题、8段英文对白和中文项目译文；按已核实角色映射头像与语音。Captain 仅确认头像、不推断独立语音。不复制已存在的缩略图、肖像、音频或 Mississippi 音乐资产。 | APK 英文原文、资源键、说话人和头像逐项匹配 M20 审计；中文文本非空；Captain `voiceSound` 保持未设置；map23 PNG、全部头像/已映射语音以及8波 Mississippi 音乐可离线读取。M19 文案/资源回归在内共4项定向测试及 `pnpm run typecheck` 通过；未播放声音。 |
| M20-F（已完成） | 正式、自由、回放与批次收尾 | 将 M20 纳入 Mississippi Free Play 与正式关卡目录，正式关卡依赖 M19；为 M20 建独立 contentVersion 并按录制解锁状态还原单位；新增真实入口 E2E，只更新受 M20 影响的目录计数和快照。模块导入暴露 Tech Town 对关卡访问和单位里程碑复用同一 marker 路径的既有错误；在 Tech Town 构造器区分 mapAccessible 与 unit unlock，并让需 milestone 的 Gambler 始终遵守单位门槛，保留其它关卡的 activity 5 对象。 | 正式模式在 M19 未完成时锁定、完成后开放；Free Play 三种难度可进 M20；两个入口显示 map23 标题图、开场对白和 `1/8`；正式/自由结算语义及回放内容版本往返通过。Tech Town 地图锁定时不实例化单位 marker，开放时原活动单位正常、Gambler 与 Casino 同步受里程碑控制；M20 activity 5 单位不回归。静音、窗口模式，不推进整关。完整 `CI=1 PLAYWRIGHT_PORT=43181 pnpm run test:ci` 通过：TypeScript、710项单测、生产构建和153项 E2E。主 JS chunk 为2.342 MB（gzip 264.76 KB），保留既有大 chunk 警告。 |
| M20-R1（已完成） | squash 集成与发布 | 将完整检查通过的批次以一个 squash commit 集成到 `master` 并推送，等待现有工作流。 | 发布提交 `7963d0e1644b753b5a3df4b198b0c203faa894b7` 已推送到 `origin/master`；GitHub Actions `43312652418` 的应用完整检查和两个 Pages 部署均成功。 |
| M20-R2（已完成） | 部署来源 SHA 与浏览器验收 | 核对两个 Pages 的构建 SHA，并在内置浏览器从真实菜单进入 M20，保持静音和窗口模式。 | GitHub Pages 与 Cloudflare Pages 的根 `build-info.json` 均报告 `7963d0e1644b753b5a3df4b198b0c203faa894b7`。内置浏览器进入 Free Play → Mississippi → Horse Hills → Medium，关卡地图和 Mexican 首波对白可见；没有推进整关。正式解锁/锁定由 M20 集成 E2E 验证。 |
| M20-R3（已完成） | 发布回同步至集成分支 | 将发布提交和本计划更新合并回 `gunsnglory`，推送并更新相关工作树；保留主工作树已有未提交文件。 | 回同步合并提交 `3adab7a` 已推送到 `origin/gunsnglory`，包含 M20 发布提交 `7963d0e`；主工作树 `gunsnglory` 已更新且原有未跟踪研究文档保留。当前 M20 实现工作树已同步计划状态，应用代码与发布树一致。 |

## 最近完成批次：Dust Falls（M19）

本批次已将 APK 的 Mississippi 第19关 Dust Falls 接入既有地图、规则、正式战役、Free Play 与回放，并完成整批发布、部署验收及回同步。实现证据和适用边界见 [M19 静态审计](map19-static-audit.md)。

| 顺序 | 切片 | 实施范围 | 可判定验收 |
| --- | --- | --- | --- |
| M19-A（已完成） | APK 派生静态审计 | 交叉核对 map22 网格/路线/绘制、marker、level index18、波次原始调用、池动作、字符串及资源引用；记录 facts、适用边界与未确认项。 | TDM 身份与维度可追溯；所有路线节点从入口可达且各出口有有效路径；8波/24条 `addToWave` 按源调用分组，4波池动作参数按 DEX 语义解释；Markdown 链接与 `git diff --check` 通过。 |
| M19-B（已完成） | 地图、地形、路线 | 接入 APK 原始 TDM、Mississippi 地形/街道/水域与桥墩绘制；从真实 marker 生成敌人入口、路线和出口，并显式映射 APK action ID 与网页 `spawnPointId`。产物为 `public/content/maps/td_map_22.tdm`、`mississippi-19.json`、路线与场景模块。 | 770字节 SHA-256 与静态审计一致，地图为32×24；绘制层由 APK 网格复算，含11条横桥、4条竖桥和14个桥墩命令；路线测试逐边比对42个控制节点、41条有向边、4个入口、34个 redirector、4个出口和7条完整路径。`node --import tsx --test tests/mississippi-18-map.test.ts tests/mississippi-19-map.test.ts` 通过8项；`pnpm run typecheck` 通过。 |
| M19-C（已完成） | 地图对象、初始单位与 Tipi | 按 DEX/Smali 消费 code96–101、105、114、130、131；96–101 在新局生成 activity4 招募单位，105 生成活动 Mexican；在 Mississippi 场景绘制 Tipi；按 global 30/40/50/60 解锁 Grandpa、Sniper、Pyromaniac、Salesman。为只有 Tipi、没有 Saloon/Fort 的 Indian 池提供独立模板。同时修正 M18 工厂仍过滤 fresh-game marker 的已证实偏差；M18 新内容升为 v2，旧 v1 回放保留原单位列表。 | M19 marker 与生成实体逐格对应：8 Gunslinger、6 Mexican、4 Indian、1 Sniper、3 Grandpa 招募 marker（后两类受里程碑门控）、2名活动 Mexican、Pyromaniac/Salesman 解锁点；无假摆放活动单位；锁定、全解锁和重复类型场景均无重复 ID；Tipi 是唯一 type-3 生成点。M18 v2 逐 marker 创建 Mexican/Indian 招募单位并按里程碑门控 Sniper/Grandpa；v1 回放不新增这些单位、仍恢复原 special hires 与 Dynamite 快照。复用现有 `CampaignUnitPoolDefinition.template`，不改公共 `Game` API。M18/M19 内容、规则、实体、正式回放及地图定向测试26项通过；`pnpm run typecheck` 通过。 |
| M19-D（已完成） | 初态、8波与单位池规则 | 加入 `$365`、15生命、3级升级、三档 HP 倍率及 level-config 的奖励箱参数；逐行录入8波、24个请求、间隔/延迟/倍率，以及 wave4 Indian 池 count2/max4 和共享15秒派发周期。 | `GameSession` 初态与奖励箱设置、全部 wave metadata、24条8类型请求向量、4个 APK action ID 映射及两个 pool action 与 APK 派生数据逐项相等；短会话真实生成 Indian，并证明模板不进入初始场景单位列表。M18/M19 内容、规则、实体、正式回放及地图定向测试29项通过；`pnpm run typecheck` 通过。 |
| M19-E（已完成） | 文案、目录、正式/自由模式与回放 | 加入 Dust Falls 身份、双语简介/胜利标题、8段对白及头像/声音资源；开放正式 level19（依赖18）和 Mississippi Free Play；建立记录 Grandpa、Sniper、Pyromaniac、Salesman 四个全局解锁状态的内容版本及回放工厂。 | map22 缩略图、对白头像/音频均可离线读取；正式第19关依赖 Shadow Town；Free Play 三档难度可进入，且结算不改正式档案；正式胜利写入第19关；四个解锁位的16种组合均经内容版本往返并通过 GameSession 核对招募单位；未知版本不解析为已解锁状态。M19 内容与正式/回放定向测试5项通过，`pnpm run typecheck` 通过。 |
| M19-F（已完成） | 入口回归与批次收尾 | 新增 Dust Falls Free Play 与正式战役菜单 E2E：Free Play 检查 19 可进入、20 禁用；正式模式先以仅完成 M17 的档案验证 19 锁定，再以完成 M18 的档案验证 19 解锁。只更新 M19 引起的 Mississippi Free Play 数（8→9）、目录长度和进度摘要分母（18→19）、19/20 关按钮状态及正式目录快照，不改不相关内容。E2E 保持静音、窗口模式，不完整通关、不启动 Android。 | 两条 E2E 都从真实菜单开始；核对 M19 标题、`gng_levelmap_22.png` 缩略图、16:9 游戏画布、192×144 minimap、开场对白/头像、已加载地图资源与 `1/8` HUD；正式模式分别断言 19 锁定与解锁，Free Play 断言 19 启用、20 禁用。完整 `CI=1 PLAYWRIGHT_PORT=43129 pnpm run test:ci` 通过：TypeScript、695 项单测、生产构建和151项 E2E；构建提示主 JS chunk 为2.239 MB（gzip 258.12 KB），本批未加入无关拆包改动。 |
| M19-R1（已完成） | squash 集成与发布 | 将通过完整检查的 M19 批次 squash 集成到 `master` 并按现有静态站流程推送。 | 发布提交 `824680a1ce88dd3d222f812ef1728925019be067` 已推送；GitHub Actions `43294305789` 的应用测试和两个 Pages 部署全部成功，本地 `master` 与 `origin/master` 指向该提交。 |
| M19-R2（已完成） | 部署与浏览器验收 | 核对部署 `build-info.json` 来源 SHA；使用 Codex 内置浏览器静音、窗口模式验收 Free Play 入口和正式战役进度状态。 | GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均报告 `824680a1ce88dd3d222f812ef1728925019be067`。内置浏览器进入 Free Play → Mississippi → Dust Falls → Easy，核对 Mexican 的 Wave 1 of 8 对白，继续后进入活动战场；正式战役 0/10 时第19关保持锁定。入口 E2E 另核对 `01/08` HUD 和地图资源。未完整通关、未进入全屏，声音保持关闭。 |
| M19-R3（已完成） | 回同步至集成分支 | 将已发布 master 合并回 `gunsnglory` 并推送，核对相关工作树与远端。 | 回同步合并提交 `ecd422c59bbe24114b599242bece5aeb5d32763d` 已推送至 `origin/gunsnglory`，包含 M19 发布 SHA；本地 `gunsnglory` 主工作树已快进至同一合并提交，原有未跟踪研究文档保留。 |

### M19-F 完成结果

- Free Play 与正式战役均从真实菜单进入 Dust Falls；正式关卡在仅完成第17关时保持锁定，完成第18关后开放；Free Play 可选择第19关且第20关禁用。
- 两条入口 E2E 核对关卡标题、Map 22 缩略图、16:9 游戏画布、192×144 minimap、首波对白/头像、地图资源加载和 `1/8` HUD；未完整通关、未启动 Android，测试保持静音与窗口模式。
- 批次检查命令 `CI=1 PLAYWRIGHT_PORT=43129 pnpm run test:ci` 通过 TypeScript、695 项单测、生产构建和151项 E2E。构建报告主 JS chunk 为2.239 MB（gzip 258.12 KB），超过500 KB chunk 提示；本批不包含代码拆包范围。
- M19-A–F 与 M19-R1–R3 均已完成；公开正式战役已开放至第19关（共60关），批次发布后累计普通发布比例为23/115（20.0%）。静音、窗口模式完成线上入口检查；没有完整通关、启动 Android、进入全屏或试听音频。

## 最近完成：Railroad Canyon（M15）

M15 已完成本地实现、整批检查、squash 发布、部署 SHA 核验和内置浏览器验收。静态数据来源及关卡证据见 [M15 静态审计](map15-static-audit.md)。

| 顺序 | 切片 | 结果 |
| --- | --- | --- |
| M15-A | map18 地图、路线、静态对象与场景单位 | 已完成；TDM 网格和 APK 派生索引核对，出生点、转向点和出口可达性通过定向测试。 |
| M15-B | 初始数值、九波、生成请求与招募池 | 已完成；真实 `GameSession` 短会话验证初态和波次推进。 |
| M15-C | 双语对白、关卡解锁、Free Play、结算与回放 | 已完成；正式档案边界、特殊单位解锁快照和回放路径通过测试。 |
| M15-D | 真实入口 E2E、旧关卡计数回归与完整检查 | 已完成；630项单测、TypeScript、生产构建和143项 Playwright E2E 通过。 |
| M15-R1 | squash 到 `master` 并发布 | 已完成；发布提交 `62905bb5af8e387e44752dbdb8a05399bb7151df`，Actions `43199072558` 成功。 |
| M15-R2 | 部署来源 SHA 与浏览器验收 | 已完成；两处 Pages 的 `build-info.json` 与发布 SHA 一致；内置浏览器看到 Railroad Canyon 的 Settlers 开场对白及 `01/09` HUD。 |
| M15-R3 | 发布回同步至 `gunsnglory` | 已完成；集成提交 `3abedce` 已推送至 `origin/gunsnglory`，并包含发布提交 `62905bb`。 |

## 最近完成：Highpoint Terrace（M16）

Highpoint Terrace（Mississippi 第16关）已接入正式战役、Free Play 和回放。预期数据以 [M16 静态审计](map16-static-audit.md) 及应用实际消费代码为准；无需 Android 运行或完整手动通关。

| 顺序 | 切片 | 实施范围与结果 |
| --- | --- | --- |
| M16-A | 地图、路线与实体 | 接入 APK 对应的 map19、地形、路线、静态对象和初始单位；与静态审计及路线测试核对通过。 |
| M16-B | 波次、炮池与单位 | 接入八波生成、关卡炮池、Dynamite 与关卡单位；Cannon 使用现有单位池模板契约生成，没有伪造地图单位。定向规则和实体测试通过。 |
| M16-C | 关卡内容与正式入口 | 接入双语关卡信息、对白、正式解锁和结算、Free Play 与回放；正式进度与自由模式档案边界通过测试。 |
| M16-D | 入口回归与完整检查 | 正式战役第16关依赖第15关，Mississippi Free Play 开放六关，第17关及之后保持禁用。CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci 通过 TypeScript、645 项单测、生产构建和145项 E2E；构建有主 JS chunk 超过500 KB的预算提示，本批未做无关拆包。 |
| M16-R1 | 集成发布 | 已 squash 推送至 master：f0ea3060de5fadc9cd337ee782581a50d73fef26。GitHub Actions 43211885210 的适用 CI 与 Pages 部署均成功。 |
| M16-R2 | 部署与浏览器验收 | GitHub Pages 与 Cloudflare Pages 根 build-info.json 均报告来源 SHA f0ea3060de5fadc9cd337ee782581a50d73fef26。内置浏览器以静音、窗口模式从 Free Play → Mississippi → Highpoint Terrace → Easy 进入，显示开场对白、地图及第1/8波；未完整通关或启动 Android。 |
| M16-R3 | 回同步至集成分支 | 已完成；合并提交 412605c 将发布提交并回 gunsnglory，且已推送至 origin/gunsnglory。原主工作树已与远端一致，未跟踪研究文档原样保留。 |

M16 发布后累计普通发布比例为20/100（20.0%）。批次已关闭：master 与 origin/master 为发布提交 f0ea306，gunsnglory 与 origin/gunsnglory 均包含该发布提交；回同步提交为 412605c，原主工作树未跟踪研究文档已保留。

## 最近完成：Dead Rocks（M17）

Dead Rocks 使用 APK 的 `res/raw/td_map_20.tdm`，作为 Mississippi 第17关接入正式战役、Free Play 和回放。静态数据、路线与关卡参数见 [M17 静态审计](map17-static-audit.md)。

| 顺序 | 切片 | 实施范围与结果 |
| --- | --- | --- |
| M17-A | 地图、地形与路线 | 接入32×24地图、Mississippi地形/桥面、静态对象，以及6个出生点、53个转向点、4个出口；74条有向路线边与 APK 派生图逐项核对。 |
| M17-B | 初始实体与解锁 | 按新局 marker 创建地图单位和可招募单位；恢复 M11–M16 的 code96–101 新局单位，旧 v1 回放仍按录制单位列表重建。 |
| M17-C | 规则与关卡内容 | 接入初始经济、生命、升级上限、三档难度、8波/35个生成请求、双语介绍与对白、音乐路由及资源预加载；未创建 APK 不存在的 Fort/Cannon 或赌场对象。 |
| M17-D/E | 正式登记与入口回归 | 登记为 global level 17，接入正式解锁、Free Play、结算和回放解锁快照；同步全局关卡目录、Progress 快照及旧关卡回归。 |
| M17-F1 | 完整检查中的快照修复 | 修复四处旧测试目录/Progress 期望仍停在16关的问题；不改运行时进度逻辑。 |
| M17-F2 | 批次发布与验收 | `CI=1 PLAYWRIGHT_PORT=43027 pnpm run test:ci` 通过 TypeScript、661项单测、构建及147项 E2E。发布提交 `4ca738c2bf01d2bc6d6e565cfd2a117d33b37aa5` 的 Actions `43246826051` 成功；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配。内置浏览器静音、窗口模式进入 Free Play → Mississippi → Dead Rocks → Medium，地图、开场对白及 `1/8` HUD 正常；未完整通关、启动 Android、进入全屏或播放声音。 |
| M17-F3 | 发布回同步至集成分支 | 将 `master` 发布提交并回 `gunsnglory`，保留 M13–M16 既有集成历史。 | 合并提交 `fcf622e376c34ab0efff7a4c5a6705f0f4fa4c24` 已推送至 `origin/gunsnglory`；本地与远端分支一致，并包含 M17 发布提交。 |

M17 发布后累计普通发布比例为21/105（20.0%）。批次已关闭：`master` 与 `origin/master` 为 M17 发布提交，`gunsnglory` 与 `origin/gunsnglory` 均包含该发布提交和回同步合并提交。

## 最近完成批次：Shadow Town（M18）

目标是将 APK 的 Mississippi 第18关 Shadow Town（`res/raw/td_map_21.tdm`）接入现有地图、规则、关卡目录和回放契约。先完成静态数据审计，再按下表顺序逐片实现；每片运行针对性检查、本地提交并同步更新本计划。

| 顺序 | 切片 | 实施范围 | 可判定验收 |
| --- | --- | --- | --- |
| M18-A | 静态审计（已完成） | 整理 map21 的 TDM 身份、地形与路线图、初始实体、地图对象、解锁条件、起始数值、八波、玩家单位池动作、英文字串和资源引用，见 [M18 静态审计](map18-static-audit.md)。 | TDM 摘要与提取字节 SHA 匹配；路由/波次/对象和规则均已交叉核对；action ID 到网页出生点数组下标的差异已明确；Markdown 链接及 `git diff --check` 通过。 |
| M18-B（已完成） | 地图、地形、路线 | 加入原始32×24 TDM 网格、Mississippi 背景与街道、桥层及全部路线控制点；新增 `actionID → row-major spawnPointId` 映射，不改公共 Game 接口。 | 770字节 TDM、768个背景格和73条街道/桥绘制指令匹配 APK 派生数据；768个背景格及道路/桥绘制候选按共享随机流与 terrain index 一致；六个入口、59个转向点、六个出口及72条有向边逐项匹配；验证 `actionID 4/0/1/2/3/5 → spawnPointId 0/1/2/3/4/5`。4项地图测试与 TypeScript 检查通过。 |
| M18-C（已完成） | 地图对象、单位与解锁 | 接入三名初始 Gunslinger、两处 Saloon 和 Fort、Dynamite 配对；修复 Mississippi 共用场景表遗漏的4个 `116` 双格木屋及其碰撞；按全局进度快照显示 marker 130/131。新局忽略 marker 96–101；修复共享单位工厂对多名同类初始角色生成重复 ID 的问题。 | 坐标、数量、贴图、锚点/占格与 TDM/Smali 一致；三名 Gunslinger ID 唯一；Dynamite 完成 global level 20/30 才解锁；Pyromaniac/Salesman 分别遵守第50/60关解锁；不生成存档恢复单位或伪造初始 Cannon。21项 M14–M18 实体/地图定向测试及 TypeScript 检查通过。 |
| M18-D（已完成） | 波次、炮池与数值规则 | 接入 `$425`、20条生命、3级升级上限、三档敌人 HP 倍率、八波/37个敌人生成请求及 wave 2 的 Saloon/Fort 玩家单位池动作。Cannon 与地图没有新局 marker 的 Mexican 使用已有 `template` 契约，不在地图上伪造单位；Mexican 模板由共享 New Mexico 单位工厂导出。 | `GameSession` 初态及全部 wave metadata、APK action ID 到 `spawnPointId` 映射、十槽请求向量、池类型/计数/上限与 `GameDesignWaves` 源调用逐项一致；短会话验证 wave 2 单位池真实生成、Saloon/Fort 坐标和 pool-only Cannon 激活。M18规则5项、地图/实体回归7项及 TypeScript 检查通过。 |
| M18-E（已完成） | 关卡目录、双语与回放 | 新建 `mississippi-18-identity/copy/wave-intros/content-version/campaign` 模块，接入八波对白与肖像、英文原版/中文项目译文、Map 21 图标、正式关卡18及 level17 前置、Free Play、结算与解锁快照回放。沿用 `template` 池契约；不改 `campaignCatalog` 已有的 level18/map21 条目。并修复选关、概览和难度地图按 global level 而非 `mapFileNumber` 取缩略图的问题。 | 正式关卡目录共18项且 Shadow Town 依赖 Dead Rocks；无进度时锁定，完成17解锁；Free Play三档可进入。文本/对白/肖像/声音及 `gng_levelmap_21` 离线资源可用。正式胜利写入 level18，Free Play 不写正式档案；特殊单位与 Dynamite 回放快照通过。M18 内容、正式进度/回放、规则、地图/实体定向测试共18项及 TypeScript 检查通过。 |
| M18-F（已完成） | 入口回归与批次验收 | 添加 Shadow Town 真实入口 E2E；更新只因新增正式关卡或 Mississippi Free Play 可玩关卡数变化而过期的目录/Progress 测试；回归 M17 入口与内容，不重测无关地图功能。 | Free Play 与正式战役分别从选关进入 Shadow Town，检查锁定/解锁、map21 图标、标题、首波对白和 `1/8` HUD；目录计数与阶段快照一致。完整 `CI=1 PLAYWRIGHT_PORT=43125 pnpm run test:ci` 通过：TypeScript、679项单测、生产构建和149项 E2E；本地内置浏览器静音、窗口模式验证 Free Play → Mississippi → Shadow Town → Medium，开场对白和 `01/08` HUD 正常。 |
| M18-R1（已完成） | squash 集成与发布 | 将 M18-A–F 合并为一个发布提交并推送 `master`。 | 发布提交 `5bb027186ea34eec06468c0fb365238c6e33a053`；GitHub Actions `43270314726` 全部适用工作通过，GitHub Pages 与 Cloudflare Pages 均完成部署。 |
| M18-R2（已完成） | 来源 SHA 与公开浏览器验收 | 核对两个 Pages 的 `build-info.json`，并以静音、窗口模式完成 Shadow Town 代表性流程。 | 两个 Pages 的 `sourceSha` 均为 `5bb027186ea34eec06468c0fb365238c6e33a053`；内置浏览器确认 Shadow Town、地图、Pedro 开场对白与 `01/08` HUD 正常。首次加载曾提示一项必需图片失败，重试后恢复；失败资源名称及首次失败原因未知。 |
| M18-R3（已完成） | 发布回同步至集成分支 | 将已发布 master 与最终计划更新合并回 `gunsnglory` 并推送。 | 合并提交 `482cbdd` 将 M18 发布 SHA 纳入 `gunsnglory`；最终计划随本次同步提交，两分支远端均与同一发布历史对齐。 |

### M18-E 完成结果

- 新增关卡身份、双语文案、八波对白、解锁快照版本与关卡组装；接通正式目录、Free Play、结算和 Shadow Town replay factory。
- Campaign 列表、概览和难度页的地图图标统一按目录 `mapFileNumber` 选择；Shadow Town 使用 `gng_levelmap_21.png`，不错误显示 global level 18 对应的图片。
- 验证英文原文、中文译文、八波资源键/肖像/语音、离线 Map 21 图片、正式解锁、三档 Free Play、正式结算、Free Play 档案隔离、四种 Mississippi 解锁位和 Dynamite 回放恢复。
- 定向命令：`node --import tsx --test tests/mississippi-18-campaign-content.test.ts tests/mississippi-18-formal.test.ts tests/mississippi-18-campaign-rules.test.ts tests/mississippi-18-entities.test.ts tests/mississippi-18-map.test.ts`（18项通过）；`pnpm run typecheck` 通过。完整 `test:ci` 留至 M18-F 批次收尾。

### M18-F 实施清单与进度

- **入口 E2E（已完成）：**新增 Shadow Town Free Play 与正式战役入口流程；验证选关、map21 缩略图、概览、难度、首波对白与 `1/8` HUD，不推进完整关卡。IndexedDB fixture 证明完成到第16关时第18关锁定，记录第17关完成后开放；Free Play 不要求战役进度。
- **目录与回归（已完成）：**将旧正式目录长度断言从17更新为18，补齐 Apache Valley、Cow Gulch、Progress 与 Fort Kaboom 的第18关目录/状态快照；将 Mississippi Free Play 可玩数断言从7更新为8，并调整其第18关禁用断言。59项战役目录相关单测通过；修正完整检查发现的3处遗留快照后，Apache Valley、内容清单和 Progress 定向测试共35项通过。M17 及其他 Mississippi 入口回归与 M18 新入口共15项 E2E 通过。
- **批次完整检查（本地已完成）：**最终 `CI=1 PLAYWRIGHT_PORT=43125 pnpm run test:ci` 通过 TypeScript、679项单测、生产构建及149项 E2E。构建仍提示主 JS chunk 为2.137 MB（gzip 251.14 KB），本批没有引入无关拆包改动。首次全量检查暴露了3处单测快照和6项 E2E 进度摘要仍期望17关；已补齐，相关35项单测和6项 E2E 定向复跑通过后，完整检查再次全绿。
- **本地与公开浏览器（已完成）：**静音、窗口模式从 Free Play → Mississippi → Shadow Town → Medium 进入；核对 map21 关卡入口和概览、Pedro 第1波对白、地图与 `01/08` HUD。公开版首次载入提示一项必需图片失败；点击重试后资源加载完成并自动进入 Cow Gulch，之后 Shadow Town 可正常进入。失败资源名称和首次失败原因未能从页面观察中确定，作为部署观察项保留；未完整通关、未启动 Android、未全屏或播放声音。
- 测试默认窗口模式、静音；不完整通关、不启动 Android。完整检查通过后才进入 squash 集成与发布流程。

### M18 批次收尾

- M18-A–F 的实现和本地验收已完成；整批以单个 squash commit 发布至 `master`，GitHub Actions 和两个 Pages 部署均成功。
- 发布来源 SHA 已核对：GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均为 `5bb027186ea34eec06468c0fb365238c6e33a053`。内置浏览器以静音、窗口模式验证 Free Play → Mississippi → Shadow Town → Medium、地图、Pedro 开场对白和 `01/08` HUD。首次页面载入提示一项必需图片加载失败；手动重试后加载成功并自动进入 Cow Gulch，之后 Shadow Town 正常。失败资源和首次失败原因未知，需留作后续部署观察，不影响本次地图已成功显示的结论。
- 发布提交和最终计划已回同步至 `gunsnglory`；`master` 与 `gunsnglory` 远端均包含 M18 发布历史，M18 批次关闭。全程未完整通关、未启动 Android、未进入全屏或播放声音。
## 已完成批次

### M13 Golden River 接入批次

APK 的 map16 关卡已接入正式战役、Free Play 和回放。四个实现切片、批次级完整检查、squash 发布、Pages 来源 SHA 核对、公开浏览器代表流程和集成分支回同步均已通过。

| 顺序 | 切片 | 实施范围 | 定向验收 |
| --- | --- | --- | --- |
| M13-R1 | Squash 集成并推送（已完成） | 将 M13-A 至 M13-D 相对 `origin/master` 的全部成品 squash 为一个 `master` 提交，并执行 `git push origin master`。 | 发布提交 `d35678a7c4cdbed699a1e8cc73dc3a424385d5d5` 已推送；不把单切片提交逐个发布。 |
| M13-R2 | 部署与浏览器验收（已完成） | 等待 Pages workflow；核对公开 `build-info.json` 来源 SHA；使用 Codex 内置浏览器以静音、窗口模式检查 Mississippi 第 13 关入口和开场状态。 | Actions `43165717255` 成功；两个 Pages 来源 SHA 与发布提交一致；Golden River 可进入并显示第 1 波对白。 |
| M13-R3 | 回同步集成分支（已完成） | 将已发布提交及本计划更新合并至 `gunsnglory`，推送远端，并核对相关工作树分支和上游状态。 | `gunsnglory` 本地与远端包含发布 SHA 和本计划；主工作树已快进，既有未跟踪研究文档未改动。 |

#### 批次门槛与发布

- M13-A 到 M13-D 的内容预期均来自 [M13 静态审计](map13-static-audit.md) 和应用消费代码。若发现数据冲突，先追到 APK 的实际消费者并更新审计，不得以地图相邻编号猜参数。
- 每个切片只运行其定向测试并提交；批次收尾运行 `CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci`。若共享调用测试需要独立端口，记录实际端口并保持串行。
- 4 个 M13 实现切片加一次普通发布后，累计比例为 17/85（20.0%）；不得额外增加无范围切片。静态文档审计不计入实现分母。
- 发布与回同步门槛均已通过；M13 批次关闭。后续关卡尚未排期，新一轮开始时先按当前代码和证据细化可执行步骤。
- 本批默认窗口模式、静音，不启动 Android，不完整手动通关；浏览器只进行选关和首波代表流程验收。

M13 上游关卡数据以 map16 清单为准。`awesomeMessageMin=30000` 的消费者仍未知，M13 不新增依赖其语义的功能；前一关来源与边界见 [M12 静态审计](map12-static-audit.md)。
