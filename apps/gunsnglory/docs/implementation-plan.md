# 实施计划

本文只维护当前代码基线、未闭合问题和接下来可执行的切片。每轮开工前对照代码与 APK 证据；每完成一个切片，立即更新状态并移除已完成项。

## 当前实现与发布状态

- 当前集成树已接入正式战役全局第 1–40 关，最后一关是 Dakota Level 40 Sioux Falls；`officialCampaignStages`、Level 39 解锁依赖、Free Play、结算、十波内容、对白、音频路由和 replay factory 均已接线。完整目录仍为 60 关，Level 41–60 保持未实现。
- 公开 `master` 当前仍包含 Snow Town（Level 39），来源提交为 `9a96db6`。远端 `gunsnglory` 当前为 `ef3ac4e`；本地集成树已有 GitHub Pages 修复、Sioux Falls 空间/动态内容与关卡注册切片。完整本地检查已通过；切片 4 的实现和计划更新仍待本地提交，整批尚未 squash、推送或发布。
- Snow Town 批次的本地完整检查已通过：1,174 项单测、TypeScript、生产构建和 206 项 Playwright；catalog 检查与共享站点构建也通过。此处记录的是前一批结果，本轮没有重跑。
- 最近一次部署观察：Cloudflare Pages 的 `build-info.json` 对应 `9a96db6`；GitHub Pages 仍是旧版 `ede0a50`。GitHub Actions run `45360235333` 中 Guns’n’Glory 测试和 Cloudflare Pages 部署成功，但 GitHub Pages 的 `deploy-pages` 在上传步骤后立即查询到 0 个 `github-pages` artifact 并失败。故公开部署仍不一致，不能把 Snow Town 批次报告为两处站点均验收完成。
- 之前已完成马车双轴跟随规则修正，并以 Fort Kaboom 隔离用例及五关正式岔口矩阵验证；这不是所有关卡的逐帧视觉验收。雇佣框、Play 页面和 Options 已有当前源码下的 DOM/E2E 与内置浏览器检查，未建立 APK 原版运行画面的逐像素基线。大炮炮弹贴图对应关系仍未完成核对。
- 原始 APK、地图 43 TDM 和资源已在本机可读。REA 已确认 `GameDesignWaves.setWaves(i == 40)` 有 10 个波次和 **28 条** `addToWave` 调用；`GameDesignData.<clinit>` 的第 40 关数据对应数组下标 39。TDM marker、参数消费者、玩家池动作语义、地图单位/Steamer/炸药均已在切片 3 复核。旧计划写成 31 条是计数错误，现按源码调用及测试修正。

## 发布计数

| 统计点 | 公开发布次数 | 已验收实现切片 | 比例 |
| --- | ---: | ---: | ---: |
| 上次留存基线（`0bed82f`） | 31 | 173 | 17.9% |
| Sioux Falls 发布后累计 | 44 | 235 | 18.7% |

从基线到本批，Git 历史中新增 58 个代码实现提交（按 `feat`、`fix`、`refactor`、`build`、`ci` 计数；不计文档和单测提交），另有 12 次已发布批次；本批再增加 4 个实现切片和 1 次发布。因此累计为 `(31 + 12 + 1) / (173 + 58 + 4) = 44/235`，低于 20% 目标。后续批次继续用相同口径复核。

## 当前功能批次：Sioux Falls（全局 Level 40）

本批还包含 GitHub Pages artifact/deploy 分离修复，以便批次结束时两处公开站点能核对到同一发布来源。切片 1–4 已在本地关闭；接下来只做整批检查、集成和部署验收。批次只发布一次；不完整通关，不启用声音或全屏。

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

### 切片 5：整批检查、集成与部署验收（本地检查已通过）

- **本地验收：**`CI=1 PLAYWRIGHT_PORT=43325 pnpm run test:ci` 通过：1,190 项单测、TypeScript 检查、生产构建及 209 项 Playwright 全部通过。`pnpm run test:catalog` 18/18 通过；`pnpm run build:site` 成功。临时工作树未安装其余应用依赖，站点构建使用已有工作树的已安装依赖做本地链接，构建期间只写入当前工作树；干净环境的部署构建仍由 CI 验证。
- **剩余实现：**切片 1–4 已关闭；将切片 4 和计划更新提交到 `gunsnglory`，按应用流程 squash 集成到 `master`，复核普通发布比例后推送发布分支。发布后合并回 `gunsnglory` 并推送同步。
- **发布验收：**GitHub Actions 全部必要 job 成功；GitHub Pages 与 Cloudflare Pages 的 build-info 来源一致并等于预期发布 SHA；用内置浏览器打开该版本，保持窗口模式与静音，检查 Sioux Falls 选关、开局地图、路线/桥面、首波对白、HUD 和未完成关卡退出。运行时检查只推进代表性片段，不完整通关。

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
