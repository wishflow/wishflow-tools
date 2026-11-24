# 实施计划

本文只维护当前代码基线、未闭合问题和接下来可执行的切片。每轮开工前对照代码与 APK 证据；每完成一个切片，立即更新状态并移除已完成项。

## 当前实现与发布状态

- 当前集成树包含正式战役全局第 1–40 关，最后一关是 Dakota Level 40 Sioux Falls；`officialCampaignStages`、Level 39 解锁依赖、Free Play、结算、十波内容、对白、音频路由和 replay factory 均已接线。完整目录仍为 60 关，Level 41–60 保持未实现。
- 公开 `master` 与 `origin/master` 当前指向 Sioux Falls 发布提交 `7fb5c36`；集成树已通过普通 merge 纳入该发布。Level 40 本地完整检查与对应 CI 测试均通过，但发布验收未完成：Cloudflare Pages 的 `build-info.json` 已报告 `7fb5c36`，GitHub Pages 仍报告 `ede0a50`。
- Snow Town 批次的本地完整检查已通过：1,174 项单测、TypeScript、生产构建和 206 项 Playwright；catalog 检查与共享站点构建也通过。此处记录的是前一批结果，本轮没有重跑。
- 最近一次部署观察：GitHub Actions run `45385441233` 中 Guns’n’Glory 测试、共享检查、Cloudflare Pages 部署和 GitHub Pages artifact 构建均成功，但 `deploy-github-pages` 被跳过。根因已核实为部署 job 的 `if` 只检查 artifact 构建结果，没有 `always()`；依赖链中 `test-pet-windows` 被跳过时，GitHub Actions 会默认跳过后续 job。页面公开来源仍不一致，因此尚未进行这一发布的内置浏览器验收。
- 之前已完成马车双轴跟随规则修正，并以 Fort Kaboom 隔离用例及五关正式岔口矩阵验证；这不是所有关卡的逐帧视觉验收。雇佣框、Play 页面和 Options 已有当前源码下的 DOM/E2E 与内置浏览器检查，未建立 APK 原版运行画面的逐像素基线。大炮炮弹贴图对应关系仍未完成核对。
- 原始 APK、地图 43 TDM 和资源已在本机可读。REA 已确认 `GameDesignWaves.setWaves(i == 40)` 有 10 个波次和 **28 条** `addToWave` 调用；`GameDesignData.<clinit>` 的第 40 关数据对应数组下标 39。TDM marker、参数消费者、玩家池动作语义、地图单位/Steamer/炸药均已在切片 3 复核。旧计划写成 31 条是计数错误，现按源码调用及测试修正。

## 发布计数

| 统计点 | 公开发布次数 | 已验收实现切片 | 比例 |
| --- | ---: | ---: | ---: |
| 上次留存基线（`0bed82f`） | 31 | 173 | 17.9% |
| 计划发布 Sioux Falls 批次后 | 44 | 235 | 18.7% |

从基线到本批，Git 历史中新增 58 个代码实现提交（按 `feat`、`fix`、`refactor`、`build`、`ci` 计数；不计文档和单测提交），另有 12 次已发布批次；本批再增加 4 个实现切片和 1 次计划发布。因此累计为 `(31 + 12 + 1) / (173 + 58 + 4) = 44/235`，低于 20% 目标。后续批次继续用相同口径复核。

## 当前工作顺序

### 切片 A：修复 GitHub Pages 部署条件与触发分类（本地完成；发布待验收）

- **问题：**Level 40 的 GitHub Pages 构建 artifact 已成功生成，但部署 job 被跳过，导致公开站点版本不一致。
- **实现：**在 `deploy-github-pages` 的 job 条件中加入 `always()`，仍严格要求 `needs.build-github-pages.result == 'success'`；将 `.github/workflows/pages.yml` 纳入站点构建变更分类，确保 workflow 修复也触发两处静态站点重新生成；添加部署条件和变更分类回归测试。
- **本地验收：**部署条件测试在旧 job 条件下按预期失败；分类测试在旧变更分类下按预期失败。补齐两处修复后，`pnpm run test:catalog` 20/20、Ruby YAML 解析及 `git diff --check` 通过，代码已提交到集成分支。
- **发布验收：**Actions 中 `build-github-pages` 与 `deploy-github-pages` 都必须成功；两处 `build-info.json` 均须等于新发布 SHA，再用内置浏览器做窗口模式、静音的页面检查。尚未完成。
- **发布边界：**这是对已开始发布批次的阻塞性发布修复；修复单独集成，不能因 Level 40 的应用测试通过而略过部署 job。

### 后续 UI 与车辆视觉修复批次

以下均为用户已报告但尚未完整关闭的问题。先按 APK 资源/代码和当前实现建立可复核基线，再按顺序逐片修复；不能用 DOM 存在或单张菜单截图代替原版布局核对。

1. **车马岔路连续性：**使用已报告的分叉关卡与可复现 seed，记录马、车每个推进步的逻辑坐标、脚底坐标、绘制 bounds 和路线分支；把当前网页轨迹与 APK `EnemyDirector` 的双轴跟随规则对照。验收至少覆盖一个真实关卡岔口和现有正式车辆路线矩阵，证明马车没有因错误的路线选择或渲染深度与马分离；若与 APK 规则一致但 APK 本身也会分离，必须先呈现证据再决定产品取舍，不能暗中改变规则。
2. **雇佣面板：**基于 APK 的招募弹窗调用链、角色图集/头像裁剪和绘制位置，复核网页实际显示的角色图、姓名、介绍、价格及按钮锚点；修正缺图或相对位置差异。验收使用有代表性的 Gunslinger 和另一种招募角色，检查中英文、游戏窗口比例和实际开局来源。
3. **Play 与 Options 页面适配：**依据 APK 资源与布局关系，复核标题、说明、选择项、按钮的对齐轴、间距和可用区域；修正文字偏向一边、Options 内容集中拥挤的问题。保留原版字体与视觉层级，按游戏框尺寸适配布局，不照搬固定屏幕像素。验收覆盖桌面 16:9、窄屏横向和中英文；验证无偏移、遮挡、溢出，并保持非全屏、静音。
4. **批次检查：**每个切片先跑对应单测/E2E 并本地提交，完成后更新计划关闭项；整批结束运行 `pnpm run test:ci` 与适用的共享检查，再按重要缺陷修复批次统一集成和发布。发布 SHA 核对后，用内置浏览器检查以上修复及代表性车辆分叉，不通关、不启用声音或全屏。

### 当前功能批次：Sioux Falls（全局 Level 40）

本批包含 GitHub Pages artifact/deploy 分离；分离本身已完成，且部署条件补上 `always()` 的代码与本地回归检查已提交到集成分支，等待发布验证。Level 40 内容已于 `7fb5c36` 发布到 Cloudflare Pages；GitHub Pages 仍待部署。除部署闭环外，本批不再重做内容实现。保持窗口模式和静音；不完整通关，不启用全屏。

### 切片 1：校准 GitHub Pages artifact 交接（本地实现完成）

- **实现：**已将 Pages 静态站构建与 artifact 上传放在 `build-github-pages` job；部署放在依赖该 job 的 `deploy-github-pages`。Pages 与 OIDC 权限只授予部署 job；共享变更分类仍由应用文件变化触发完整站点构建和对应应用测试。
- **依据：**现有失败日志明确显示上传步骤后 `deploy-pages` 查到 0 个 artifact。GitHub 官方 `actions/deploy-pages` 指南建议使用独立部署 job，且让部署 job 依赖 artifact 上传 job。
- **本地验收：**workflow YAML 解析、build→deploy 依赖及部署权限检查通过；`pnpm run test:catalog` 18 项通过，覆盖应用代码变更会触发对应 app tests 与共享站点构建。真实部署成功尚未验证，保留在切片 5 的发布门槛中。

### 切片 2：复原 Sioux Falls 地图与空间规则（已完成）

- **实现：**已从 APK 原始 `td_map_43.tdm` 建立公开地图文件与 fixture，生成 32×24 `originalTileGrid` 和 Sioux Falls 场景。按原始 marker 接入敌人出生/出口/方向路线、静态物件、背景、道路、桥梁、桥墩、铁路及 Dakota 地形碰撞。已添加[空间静态审计](sioux-falls-static-audit.md)和独立路线图夹具，区分静态场景与切片 3 才接入的地图单位、Steamer、炸药和战役规则。
- **定向验收：**`node --import tsx --test tests/sioux-falls-static.test.ts` 4/4 通过；`pnpm --dir apps/gunsnglory run typecheck` 通过。覆盖 TDM 文件/网格/频数、独立绘制参考、独立完整路线分支追踪、APK 静态对象及碰撞框、资源存在和图集裁剪范围。APK 选关缩略图也已与 `drawable-mdpi-v4` 原文件逐字节比对。
- **边界：**固定 Java Random seed 仅提供稳定网页场景，不声称复现 Android 每次启动的随机变体；未做 Sioux Falls Android 运行画面采样，也未接入敌我单位或完整战役内容。

### 切片 3：接入 Sioux Falls 动态单位、规则、波次和对白（已完成）

- **实现：**12 项 GameDesignData 原始值均逐个映射；未找到消费者的 30,000 值保留为未解析字段。接入 10 个波次、28 条源级 `addToWave` 调用/请求池、出生点映射、两条玩家池动作、TDM 初始单位和解锁门、五节 Steamer、炸药配对、标题/简介、10 段对白与头像以及 Dakota 音乐路由。详细映射见[动态内容核对](sioux-falls-content-audit.md)。
- **验收：**`node --import tsx --test tests/dakota-10-campaign-content.test.ts` 7/7 通过；`pnpm run typecheck` 通过。测试比较独立转录的参数/波次/生成池期望，核对单位标记、解锁快照、对白/头像/音乐，并用真实 `GameSession` 只推进到 Wave 1 首次生成。未进行完整战役或 Android 运行观察。
- **边界：**波次向量表示生成池请求，不是固定敌人出现顺序。Wave 10 的 Boss 位于第 9 个请求槽，Doc 槽为零。未解析字段保留原值、不猜测。关卡目录、菜单、结算及 replay factory 已由切片 4 接入；回放观察边界见动态内容核对。

### 切片 4：注册关卡、解锁与回放（已完成）

- **实现：**`officialCampaignStages` 新增 Level 40，依赖 `campaign-dakota-09`；Progress 快照与全部旧的阶段总数/摘要断言更新到 40。`bootstrap/browser.ts` 注册 Sioux Falls builder 与 canonical content version，并由 Level 40 replay factory 按记录中的单位和 Dynamite 快照重建。`main.ts` 接入选关与地图预览、正式/Free Play 标题和简介、三档 Free Play 难度、正式关卡开局与结算、十段对白/头像、Dakota 音乐、资源预载及回放文件分派。
- **定向验收：**`node --import tsx --test tests/dakota-10-formal.test.ts tests/dakota-10-replay-factory.test.ts tests/dakota-10-campaign-content.test.ts tests/dakota-09-formal.test.ts tests/progress.test.ts tests/content.test.ts tests/apache-valley.test.ts tests/fort-kaboom-formal.test.ts` 54/54 通过；`pnpm run typecheck` 通过。受影响的进度摘要、Snow Town 与 Sioux Falls 集成/回放 E2E 定向集 17/17 通过。覆盖初始锁定、Level 39 结算解锁、地图/波次、Free Play 三种难度、正式结算与 Free Play 隔离、内容快照重建和不支持版本拒绝。
- **边界：**Sioux Falls E2E 只检查菜单、开局和首波对白，不完整游玩或通关；完整批次检查结果记录在切片 5。

### 切片 5：整批检查、集成与部署验收（本地检查通过；线上验收未完成）

- **本地验收：**`CI=1 PLAYWRIGHT_PORT=43325 pnpm run test:ci` 通过：1,190 项单测、TypeScript 检查、生产构建及 209 项 Playwright 全部通过。`pnpm run test:catalog` 18/18 通过；`pnpm run build:site` 成功。临时工作树未安装其余应用依赖，站点构建使用已有工作树的已安装依赖做本地链接，构建期间只写入当前工作树；干净环境的部署构建仍由 CI 验证。
- **本地提交：**切片 4 和计划更新已提交为 `a26e4b0`、`6bc2291`；切片 1–4 均已关闭。
- **集成与发布：**Level 40 已 squash 到 `master` 并推送。集成树现已 merge 纳入 `origin/master`，但远端 `gunsnglory` 尚待本轮修复与发布同步。
- **发布验收：**本批 GitHub Pages 部署 job 被跳过，故尚未通过发布门槛。切片 A 已完成本地代码和回归检查；待修复随发布流程推送后，核对两处 build-info 来源与修复发布 SHA 一致，再用内置浏览器在窗口模式、静音下检查 Sioux Falls 选关、开局地图、路线/桥面、首波对白、HUD 和未完成关卡退出。运行时检查只推进代表性片段，不完整通关。

## 本批之外仍待确认

- **马车与马的画面连续性：**逻辑双轴跟随和五关分叉测试已完成；仍需在部署版本以短片段观察代表性分叉处马车与马是否持续相连。此前修复不再重复做静态路线矩阵，除非出现新回归。
- **招募、Play、Options 的原版视觉基线：**当前源码的文字、头像、几何与交互已有自动及浏览器核对；与 APK 原版运行画面的完整视觉对照仍未建立。若当前版本重新出现错位，再针对具体视口和页面状态修，不重跑已通过的通用检查。
- **大炮炮弹贴图：**尚未完成 APK 发射调用、炮弹资源 ID、网页资源映射和实际绘制结果的闭环；安排独立定点核对，不阻塞 Sioux Falls 内容实现。
- **全关地图视觉：**当前集成树已接入 40/60。已有逐图 TDM、路线和碰撞测试按关卡覆盖，但没有对 40 张地图进行完整人工逐帧观察；不以少量代表图截图声称“所有关卡完全一致”。只对测试发现或用户新报的差异做针对性复核。

## 稳定交付门槛

- 每个切片先跑针对性测试并本地提交；不在每个切片提交后重复跑全套。整批结束后再运行应用完整检查与共享检查。
- 浏览器验收默认窗口模式、静音；仅验收对应功能时才启用全屏或声音。优先用 APK、REA 与静态代码证据；仅在静态证据无法回答具体问题时做一次短时 Android 定点观察。
- 普通公开发布次数占已验收实现切片数的目标不高于 20%；每次发布前根据最新提交记录复核比例，不通过拆分或延后已验收切片调整统计。
- 每个关闭的已复现问题更新[经验记录](experience-log.md)；本计划移除已完成项，并明确仍未验证的结论与边界。
- 涉及 Markdown 的切片运行 `git diff --check`，再按仓库规则复制成品到 `/tmp/var/wishflow-tools/`。本计划修改本身不触发产品发布。
