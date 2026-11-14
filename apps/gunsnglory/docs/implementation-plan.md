# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮先核对当前代码与证据，再细化接下来几个可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- M20 Horse Hills、M21 Eastwood Forest 均已发布并回同步；对应批次记录保留来源 SHA、检查和入口证据。
- M22 代码已发布到 `master`（`b5dec97`），并回同步到 `gunsnglory`（`ebb52b8`）。当前 M23 发布版包含 M22 内容；已在该版本通过 Free Play → Oregon → Eastwood Forest → Medium，核对关卡预览、Pedro 首波对白及游戏地图。M22 的游戏流程已核对；M4–M7 回放在本地 E2E 通过，但公开页面导入探针没有得到预期路由结果，故 M22-G 的浏览器回放项仍未关闭。未重新部署或单独核验历史 M22 版本。M22 修复依据见[Eastwood Forest 静态审计](map21-static-audit.md)。
- M23 代码已发布到 `master`（`55ef7f5`）并回同步到 `gunsnglory`。两处公开 Pages 的 `build-info.json` 均报告来源 SHA `55ef7f5fe6d64dd6ee2e18d358b1485c4410c01c`；已在发布版通过 Free Play → Oregon → Cashcow Canyon → Medium，核对关卡预览、首波对白及游戏地图。M23 开发和发布记录见下方。
- M24–M26 共21个实现切片已合并为单个 squash 发布提交 `78f684fea799cf8c0cc39f143d98fbd9f8a054e0`。本地 `CI=1 PLAYWRIGHT_PORT=42129 pnpm run test:ci` 通过：800项单测、生产构建、169项 E2E；GitHub Actions [43497562929](https://github.com/wishflow/wishflow-tools/actions/runs/43497562929) 的适用测试与两个 Pages 部署作业均成功。GitHub Pages 和 Cloudflare Pages 的公开 `build-info.json` 都报告同一来源 SHA。内置浏览器已检查 Oregon 21–25 的自由模式预览，Dynamite Plains Easy 首波对白和实际地图，以及当前档案的正式战役 0/10 和 21–25 锁定状态；未修改用户档案、完整通关、进入全屏或播放音频。普通发布累计比例为28/156（17.9%）。
- 发布提交已回同步至 `origin/gunsnglory`，代码同步合并提交为 `25d30a11042bfe0e1e6fcebbed9915b20ed4d913`；本地 `master` 与 `origin/master` 对齐，本地 `gunsnglory` 主 worktree 已更新并包含该集成提交，原有未跟踪研究文档保留。M22-G 的 M4–M7 公开回放导入仍未确认，属于独立的历史浏览器验收债务；本批完整测试里的回放快照回归通过，不代表该在线导入项已关闭。

## 下一批：Columbia River（M27，Oregon 第 6 关／全局第 26 关）

本批目标是接入 APK 已登记、网页仍禁用的 Columbia River：全局第 26 关，对应 `res/raw/td_map_29.tdm`。`campaign-catalog.ts` 已有 level 26、map 29 和标题资源 29；网页已含与 APK 字节一致的 91×84 预览图及共享 Oregon、水面、桥、对象、肖像和声音资源。不要重复登记或搬运这些内容。完整静态基线见[Columbia River 静态审计](map26-static-audit.md)。默认窗口模式、静音，不启动 Android、不完整通关。

| 顺序 | 切片 | 实施范围与可判定验收 | 状态 |
| --- | --- | --- | --- |
| M27-A | 静态审计与计划 | 记录 APK/TDM 身份、34 个路线节点和 38 条边、完整 marker 坐标、activity/新局分支、12 个初态参数、8 波/19 请求/两条池动作、英文资源与素材现状；未知项单独列明。用 APKTool Smali 交叉核对 `GameObjectManager` 的单位/装饰/建筑/Steamer 分派，不将 JADX 伪代码当源码；复算 TDM 频次、路线可达性、炸药配对和预览图摘要。检查相对链接并通过 `git diff --check`。 | **已完成**；[静态审计](map26-static-audit.md) 已列完整路线与 marker，确认 Fort Cannon 是 pool-only 模板、Steamer 是一组多部件对象；APK 预览已在网页且字节一致。没有需 Android 运行才能解决的审计阻塞。 |
| M27-B | 原始地图、地形、碰撞与路线 | 将 APK 原始 `td_map_29.tdm` 复制到应用资源，生成 32×24 `oregon-06.json`、场景和路线。验收原始 770 字节及 768 格逐字节对应；检查所有 tile 频次、4 个入口到 34 节点/38 条路线边/2 个出口的完整图和边界可达性。按 Oregon 绘制与碰撞消费者分别核对背景、水/河岸、街道、桥和贴图裁切；不加 A* 或路线偏移。复用已有预览与共享贴图。 | **已完成**；APK 原始 TDM 逐字节核对通过；路线断言覆盖 38 条路线边与 4 条入口连接、全部 34 节点和 2 个出口，无越界/循环/断边。绘制数据为 768 个背景格、98 条街道/桥命令，碰撞网格及共享 atlas 范围检查通过；map29 定向测试 2/2、`pnpm run typecheck` 通过。首轮测试修正了街道素材分类的预期计数后复跑通过。 |
| M27-C | 地图对象、单位、Steamer 与 Dynamite | 按静态审计接入 3 个 activity 5 起始单位、全部 activity 4 招募单位、解锁位、Saloon/Fort/Tipi、装饰、Steamer 和两对炸药。逐一断言 marker 数量、TDM 坐标、类型/activity、稳定 ID、贴图锚点/占格/碰撞；确认 Steamer 仅由 tile 120 触发扫描并生成完整多部件组合，tile 121/123 不重复实例化。Dynamite 配对为 `(19,6)→(21,7)` 与 `(15,15)→(17,16)`，沿用共享半径边界和 level20/30 解锁。Wave 1 池动作记入关卡数据；此步只验证四个 pool type 绑定实际建筑、Fort `(21,21)` 的独立 Cannon template 不进入地图单位列表。Fort 实际派发需等 M27-D 接入 wave action 后由短 `GameSession` 验证。 | **已完成**；装饰/建筑 marker 与碰撞锚点、3 个活动单位、全部招募坐标及稳定 ID、16 种单位解锁快照、4 部件 Steamer 组合、真实建筑池映射、pool-only Fort Cannon template 和两组 Dynamite 最近距离配对均由定向测试校验。4 项 map-entities 测试与 M27-B 的 2 项 map/route 回归通过，`pnpm run typecheck` 通过；实际 Fort 池派发按依赖留在 M27-D。 |
| M27-D | 初态、难度、8 波与单位池动作 | 接入审计表中的 `$375`、25 生命、3 次升级、补给箱参数、Easy/Medium/Hard HP 86/115/175%、8 个 header、19 个按 APK 调用顺序排列的请求及 Boss 槽。逐字段/数组测试 wave 延迟、HP/速度倍率、入口 action、间隔和 8 槽向量；验证 pool action 1 将 type 1–4 当前库存设为 0、action 3 将上限设为 2。固定 seed 的短 `GameSession` 验证初态、代表请求、实际 Fort Cannon 池派发；不推进完整关卡。`awesomeMessageMin` 与 APK pool timer 保持未知，不给关卡加猜测值。 | **已完成**；8 波的全部 header/倍率、19 个按 APK 顺序排列的请求向量、四入口 action 映射及 Boss 槽与静态审计逐项相等。Wave 1 的 pool SET 清空四种库存、SET_MAX 将上限设为 2。固定 seed 的真实 `GameSession` 验证 `$375`、25 生命、999 补给箱及首波敌人；随后在地图招募 Cannon，确认从真实 Fort `(21,21)` 派发。规则、实体、地图及路线定向测试共 10 项通过，`pnpm run typecheck` 通过；未推进完整关卡。`awesomeMessageMin` 和 APK pool timer 仍保留为未知。 |
| M27-E | 双语剧情与离线资源接线 | 建立稳定 scenario ID；接入 APK 的 `T_LEVEL_NAME_29`、`T_LEVEL_INFO_29`、8 段 `T_CAMPAIGN_26_01..08` 英文原文、项目中文译文和 Wave 表指定肖像。接入游戏启动肖像预加载和 scenario→wave intro 路由，菜单文案槽供 F2 复用。用测试逐字核对英文资源、键、波次顺序、肖像尺寸/路径；确认已有 91×84 map preview、Oregon 音乐、对象/动画/音效在离线资源中可读取。已有素材不复制；APK 中不存在的语音不补造。 | **已完成**；新建 `campaign-oregon-06` 稳定 ID，接入关卡英中标题/简介、APK 八段英文对白及项目中文译文、speaker/portrait 对照，并接入对白路由和启动预加载。内容测试 3 项通过，确认资源键及原文次序、PNG 实际尺寸（含 96×110 Pedro/Boss）、map29 91×84 预览图、Oregon OGG、加载器映射的河水/桥/建筑/爆炸图以及共用爆炸声音可离线读取；`pnpm run typecheck` 通过。没有添加未证实语音或复制既有素材。 |
| M27-F1 | 正式内容 builder 与回放版本 | 基于 M27-E 的稳定 ID 建立 Oregon 06 builder 和 canonical replay version，正式、Free Play、replay 共用相同关卡构造。版本快照编码 Grandpa、Sniper、Pyromaniac、Salesman 四个位和 Dynamite 解锁位（共 32 种组合）；Dynamite 位按现有 level20/30 解锁规则重建，不能依赖导入者当前 profile。逐一核对 32 种 builder/回放往返，验证 4 类招募门控、固定 Fort Cannon pool、不随快照变化，以及两种 Dynamite 状态；未知、非 canonical、跨关版本拒绝。 | **已完成**；新建共享关卡 builder 与 canonical replay version，浏览器 bootstrap 能按录制快照重建并拒绝未知版本。32 种 unit/Dynamite 组合均通过 builder 和真实 `GameSession` 回放重建：Sniper/Grandpa/Pyromaniac/Salesman 门控与 marker 数量一致，Dynamite 两种状态一致，Fort Cannon 模板不随 profile 改变。另验证缺失、格式错误、跨关、越界位和多余后缀都被拒绝；M27 定向测试 12 项和 `pnpm run typecheck` 通过。 |
| M27-F2 | 正式/自由入口与页面接线 | 将 level 26 登记为正式关卡并以前一正式关 level25 为解锁条件；Free Play 三种难度均可开局，level27 保持未实现禁用。接入现有 map29 预览、标题/简介、8 段对白、Oregon 音乐、HUD 和 replay factory。测试未完成 level25 时锁定、完成后开放、正式结算只记录 level26、Free Play 不污染正式进度/高分/解锁；从不同 profile snapshot 导入回放仍重建录制内容。桌面和窄屏 E2E 覆盖选关、代表性对白与真实地图开局；Fort Cannon 池派发由 M27-D 固定 seed GameSession 测试验证，不人工打完整关。 | **已完成**；Level 26 正式登记并依赖 level25，Free Play 开放 Easy/Medium/Hard，level27 仍禁用。正式结算写入 level26 完成、高分与去重 ID；Free Play 结算不改变档案。回放导入按记录中的 canonical snapshot 重建。`oregon-06-formal.test.ts` 3 项通过；新增 `t65-oregon-06-integration.spec.ts` 的桌面、窄屏、进度门槛、开场对白及回放路由 3 项 E2E 通过；`pnpm run typecheck` 通过。 |
| M27-G1 | 目录与历史断言回归 | 复核 Level 26 对完整正式目录、Progress、Free Play、版本快照和历史测试的影响。将旧 `officialCampaignStages.length === 25` 断言更新为 26，补全 Fort Kaboom 的正式关卡序列，并更新 Oregon Free Play 数量和边界（Level 26 可玩、27 禁用）；Level 25 未完成时正式 Level 26 仍须锁定。定向运行所有被改动的单测及 T59、T61–T65 浏览器用例。 | **已完成**；更新 20 个历史目录计数断言和 Fort Kaboom 关卡序列；T59/T61–T64 现检查六个 Oregon 关卡可玩且 27 禁用。受影响单测 87 项、Oregon E2E 18 项通过。 |
| M27-G1b | Progress 摘要分母回归 | 整批 E2E 首次运行发现 T20、T22、T25、T28、T33 的旧正式进度摘要仍使用 `/25`。统一改为 `/26`，再只重跑首轮失败的六个浏览器用例，确认结算数值和解锁行为不变。 | **已完成**；Progress 摘要断言已从 `/25` 更新为 `/26`，六个失败用例定向复跑 6/6 通过（38 秒）；完整 E2E 首轮其余 166 项通过。 |
| M27-G2 | M27 整批完整检查 | 在 G1 与 G1b 通过后运行最终 `CI=1 PLAYWRIGHT_PORT=<空闲端口> pnpm run test:ci`，覆盖 TypeScript、全部单测、生产构建和完整 E2E。先前整批运行因目录期望和摘要分母的测试基线过期而未通过；修正后必须重新完成全部检查。若最终运行出现其他失败，修复根因并重跑失败项及完整检查；不重复做 APK 或 Android 观察。 | **已完成**；`CI=1 PLAYWRIGHT_PORT=4192 pnpm run test:ci` 通过：TypeScript 检查、816 项单测、生产构建和 172 项完整 E2E 均成功。生产构建仅报告 bundle 超过 500 kB 的非阻塞提示。 |
| M27-H | 整批发布与回同步 | M27-B–G2 全部通过后，将完整批次以单个 squash commit 集成到最新 `master`，裸 `git push origin master`。等 Pages workflow 成功，核对 GitHub/Cloudflare `build-info.json` 来源 SHA 与发布提交一致；随后用 Codex 内置浏览器静音、窗口模式检查 level26 选关、地图、对白、桌面/窄屏布局和代表性 gameplay。确认后将发布历史与最终计划回同步至 `gunsnglory` 并更新相关 worktree；任一发布 SHA 或线上验收未核实则不标记发布完成。 | 待执行 |

M27-A–F2、G1、G1b、G2 已完成并分别本地提交。最终完整检查通过；接下来进入整批发布与回同步。正式功能批次验收后再发布，不按单切片发版。
## 已完成批次：Chinook Woods（M24，Oregon 第 3 关／全局第 23 关）

目标是把 APK 已登记、但网页尚未接入的 Chinook Woods 加入现有 Oregon 内容框架。完整静态依据见[Chinook Woods 静态审计](map23-static-audit.md)。本关需要补齐 map 26、三入口路线、两种遗漏的装饰 marker、activity 4 招募、Tipi 的 Indian 单位池、9 波、双语文本和正式/Free Play/回放入口；不改通用游戏规则或单位池公共接口，不完整通关、不启动 Android，验收默认窗口模式和静音。

调研确认 `campaign-catalog.ts` 已有 level 23 / map 26 / Chinook Woods 条目，不重复登记。原始 TDM 为 32×24、770 字节；静态路线图有 3 个出生点、27 个转向点、3 个出口、30 条有向边且全部可达。关卡参数为 `$300`、25 生命、3 次升级、Easy/Medium/Hard HP 倍率 97/125/150；波次是 9 个 `newWave`、14 个 `addToWave`。Tipi spawn type 3 对应 pool type 4 Indian；第 1 波把当前库存设为 0、上限设为 5。现有 `CampaignUnitPoolDefinition` 已有 pool-only template 能力，本关复用 Horse Hills 实现，不扩展契约。Oregon 场景目前漏映射 tile 72 木桩与 tile 117 小 Tipi。

| 顺序 | 切片 | 实施范围与可判定验收 | 状态 |
| --- | --- | --- | --- |
| M24-A | 静态审计与计划 | 从 APK/REA 核对原始地图、路线、地形、对象、初态、波次、pool action、文本与网页差异；记录事实/推导/未知项和短证据键。检查计划与报告链接、证据出处及 `git diff --check`，复制 Markdown 到项目归档目录。 | 已完成；详见 [Chinook Woods 静态审计](map23-static-audit.md)。 |
| M24-B | 原始地图、场景与路线 | 迁入 `td_map_26.tdm` 并生成与原字节一致的网格 JSON；建立 `oregon-03` 地图/路线模块。逐格对照 APK-derived 32×24 地形与街道矩阵、碰撞码及随机候选帧；核对 8 个桥墩命令、3 个出生点、27 个转向点、3 个出口、30 条有向边，路线不得越界或产生不可达节点。 | 已完成；地图定向测试 2 项和 TypeScript 检查通过；原始 TDM SHA-256、逐格地形/道路、碰撞、候选帧和全部路线断言通过。 |
| M24-C | 地图对象与玩家单位池 | 按 marker 接入装饰、纵向列车、activity 4 招募、activity 5 起始单位、解锁门控和 tile 114 Tipi。补 Oregon code 72 `b_1x1_stake`、code 117 `b_1x1_tipi_small`。复用现有 pool type 4 Indian template 和波次 1 的 set=0/set-max=5 动作。测试所有实际 marker 的数量、坐标、类型、activity、资源；覆盖 type 5/6/35/36 的四位解锁状态、零初始库存和 5 个上限；确认没有凭空创建炮、Gambler 或开局 Indian。 | 已完成；装饰、列车、全部 TDM 单位与 16 种解锁组合、Tipi pool template/初态/波次动作的 3 项定向测试及 TypeScript 检查通过。pool timer 暂沿用网页已有 15,000 ms cadence，该数值未宣称为 APK 已证实参数。 |
| M24-D | 关卡参数与九波 | 接入现金/生命/升级/奖励箱/难度参数、9 个 wave 参数和 14 条按源码顺序排列的敌人请求；每条请求核对出生 action、间隔、槽 1–8 数组及末波 Boss 槽。验证真实 `GameSession` 初态、首波代表请求和 Tipi pool 状态/生成，不完整推进战役；`awesomeMessageMin` 不新增未证实行为。 | 已完成；新增 rules/waves 模块和 3 项规则测试。全 9 波、14 请求、action 映射、初态及奖励箱参数与静态审计表一致；`GameSession` 首个 Settler 为 Medium 225 HP，地图 Indian 经真实选中/雇佣后从 `(1,18)` Tipi 生成。与 M24-B/C 相关测试共 8 项通过，`pnpm run typecheck` 通过。未推进完整波次。 |
| M24-E | 双语对白与资源接线 | 新增 `oregon-03-campaign-copy.ts` 与 `oregon-03-wave-intros.ts`：标题/简介按 `T_LEVEL_NAME_26`、`T_LEVEL_INFO_26`，9 段对白逐项按 `T_CAMPAIGN_23_01..09` 录入 APK 英文，中文作为项目译文；头像按静态审计的 speaker/portrait 列接入。将标题/简介加入现有关卡目录文案，将波次对白接入既有 intro 查找路径。复用 map 26 预览、头像、Oregon 装饰及已有音乐资源，不复制图片、不增加语音推断。新增内容测试核对资源键、每段英文原文、speaker、portrait、波次顺序，以及图片/文案的资源解析和启动预加载入口。验收不得用资源 key 或占位文本替代英文原文；所有资源均从现有公共资产路径解析。 | 已完成；新增关卡身份、英中标题/简介、APK 9 段英文对白与 speaker/portrait 映射；已将文案接入关卡标题/简介和波次 intro 查询，并明确将 6 张头像放入启动预加载集合。资源检查确认 map26 缩略图、全部头像文件均存在；3 项内容测试和 TypeScript 检查通过。未增加语音映射。 |
| M24-F1 | 正式关卡 builder 与内容版本 | 新增 `oregon-03-campaign.ts` 与 `oregon-03-content-version.ts`。builder 从 completed IDs 生成四位 unlock snapshot 并接好 M24-B–E 地图、规则、9 段对白、Indian pool；版本前缀固定为 M24 的 Oregon 03 v1，使用 M23 相同四位解锁 suffix 编解码。验证 16 种 type 5/6/35/36 门控组合逐一对应地图 marker；解析只接受 canonical 版本，未知、缺位、多位、越界和跨版本字符串均返回 unavailable；pool-only Indian 固定纳入内容但不编码为档案快照。新增内容版本/工厂测试，并以 `GameSession` 检查 version 下单位集合和 9 波初态。 | 已完成；16 种 snapshot 均通过 builder、version round-trip 与 `GameSession` 单位集合检查；Indian pool 内容固定不随快照变化。未知、缺失、越界、跨关和多余后缀版本均被拒绝；定向 8 项测试与 TypeScript 检查通过。 |
| M24-F2 | 正式、自由与回放入口集成 | `official-campaign.ts` 将 level 23 登记为 Oregon 正式关卡，前置 `campaign-oregon-02`；`bootstrap/browser.ts` 增加版本查询、正式/Free Play scenarios 和拒绝未知版本的 replay factory；`main.ts` 接入场景创建、Oregon music 判定、目录标题/简介/overview、Free Play 数量、波次 intro、HUD 的 global level 23 与资源预载。以 progress repository 验证未完成 Cashcow 时锁定、完成后开放并仅正式胜利写 level23；Easy/Medium/Hard Free Play 可开局且不改档案；回放在导入档案与录制档案不同的 16 种快照下仍还原地图单位。新增正式规则测试与真实菜单入口 E2E，覆盖 map26 缩略图、英中标题/简介、首波对白/头像、Free Play 与正式解锁。 | 已完成；level 23 已登记为正式关卡并纳入 Oregon Free Play/音乐/HUD/资源预载；Cashcow 未完成时锁定，完成后开放，正式胜利写 level23；三档 Free Play 开局不改档案；回放工厂和实际导入路由核对 16 种单位解锁快照，未知版本返回 `content-unavailable`。还修正了 Oregon 2/3 正式开局按当前档案选择 builder 的遗漏。定向单测 81 项、`pnpm run typecheck` 通过；`t60`、`t61`、`t62` 共 5 项 E2E 通过，覆盖菜单入口、英中标题/简介、map26、首波对白/头像、Cashcow 解锁和完整解锁档案下的正式开局。完整 `test:ci` 留在 M24-G。 |
| M24-G1 | 修复首次完整检查发现的旧目录快照 | 完整单测发现有旧测试把官方目录长度、进度映射或全目录快照固定到 level 22。将第 23 关按顺序追加到 Apache Valley、主内容目录、Fort Kaboom 目录和 Progress 档案投影期望；不得只改数字而省略 `campaign-oregon-02 → campaign-oregon-03` 前置关系或锁定状态。定向复跑所有失败测试，并检查 Node worker CLI 子进程在独立 worktree 中可解析项目 `tsx`。 | 已完成；首次完整单测为 762 项、755 通过、7 失败：4 项为目录期望缺少 level 23，已补齐；相关 5 个 spec 共 42 项定向测试通过。另 3 项 worker CLI 测试在首次运行中未解析独立 worktree 的 `tsx`；依赖链接恢复后 3 项专项复跑通过。完整 `test:ci` 必须再运行一次确认。 |
| M24-G2 | 最终完整检查 | G2-R1 定向修复完成后，再运行一次 `CI=1 PLAYWRIGHT_PORT=<空闲端口> pnpm run test:ci`，收齐类型检查、全量单测、生产构建和 E2E。若失败，将失败项补入计划、对根因作证后修复，并重跑失败项及最后完整检查。测试期间确保本 worktree 能解析其 app 依赖，尤其是会以 `node --import tsx` 启动的 worker 子进程。 | 已完成；`CI=1 PLAYWRIGHT_PORT=4190 pnpm run test:ci` 通过 TypeScript、762 项单测、生产构建和 160 项 E2E。构建保留既有约 2.67 MB 主 JS chunk 警告。 |
| M24-G2-R1 | 补齐新增正式关后的 E2E 期望 | 将正式战役进度总数从 22 更新为 23；修正 Oregon Free Play 测试，使 level23 可进入、level24 禁用。仅调整过期断言，不改已通过的游戏逻辑；运行 6 个受影响 Playwright spec，确认关卡入口、解锁和战役进度结果。 | 已完成；6 个受影响 spec 共 13 项 E2E 通过。 |
| M24-G3 | 批次发布前置核验（整批发布并入 M26-H） | 确认 M22/M23 当前生产版本与历史实现关系；优先核对 GitHub Pages 和 Cloudflare Pages 公开 `build-info.json`，无法读取公开来源 SHA 时再申请 Cloudflare CLI/API 凭据。用内置浏览器核对当前发布版的代表流程，不通关、不进全屏、不播放音频。M24–M26 不拆开发版，统一由 M26-H 完成批次检查、squash 集成、部署 SHA 核验及回同步。 | 前置核验已完成；两处 Pages `build-info.json` 均为 M23 提交 `55ef7f5fe6d64dd6ee2e18d358b1485c4410c01c`。在当时的 M23 发布版核对 M22 Eastwood Forest 与 M23 Cashcow Canyon 的 Free Play 目录、关卡预览、Medium 首波对白和游戏地图；另核对正式 Oregon 菜单的 0/10 状态及 level 21–25 锁定。该项是 M24–M26 集成发布前置，不替代 M26-H 新版本验收；M22-G 的 M4–M7 公共回放导入继续单独跟踪。 |


## 已完成批次：Fort Echo（M25，Oregon 第 4 关／全局第 24 关）

目标是将 APK 已登记、但网页尚未接入的 Fort Echo 加入现有 Oregon 内容框架。静态来源和逐项数据见[Fort Echo 静态审计](map24-static-audit.md)。本关使用 map 27，TDM 为 32×24、770 字节；图遍历确认 5 个入口、59 个控制点、65 条有向边和单一出口。关卡有 10 波、22 条敌人请求，并在第一波清空玩家单位池、将 Cannon 池上限设为 4。地图已有 Fort spawn marker，可把 Cannon 的 pool-only 模板绑定到真实 Fort；现有 `CampaignUnitPoolDefinition.units[].template` 已支持该能力，不新增契约。M24–M26 已由 M26-H 整批集成与发布。

| 顺序 | 切片 | 实施范围与可判定验收 | 状态 |
| --- | --- | --- | --- |
| M25-A | APK 静态审计与内容基线 | 从 APK 核对 map27 原始字节与 tile 矩阵、入口和所有分支路线、地图对象和单位 marker、Fort Cannon pool、关卡参数、10 波请求、对白/肖像和 Oregon 绘制/音乐资源。所有结论区分 APK 事实、静态推导和未知项；Evidence ID 仅在审计来源表记录。链接、路径、地图与边数交叉复核，`git diff --check` 通过，并复制 Markdown 到项目归档目录。 | 已完成；[Fort Echo 静态审计](map24-static-audit.md) 已记录地图频次与 65 条路线边、对象坐标、完整波次/对白、Fort pool 语义、资源差异及未知项。来自 APK 字节的维度/频次与 REA 方向/代码证据交叉核对；不运行 Android。 |
| M25-B | 原始地图、Oregon 场景与路线 | 迁入 APK `td_map_27.tdm` 原始字节，生成逐格相同的 32×24 JSON，并新建 `oregon-04` scene/routes，复用 Oregon renderer。定向测试直接读取 TDM，断言 768 个 cell、tile 频次、二进制一致；核对背景、街道、水层绘制映射及每条路线边。图必须为 5 个入口、59/59 控制点可达、65 条控制点间有向边及 5 条入口初始段、唯一出口 `(0,12)`，无循环、断路、死路、越界。道路/背景不进入敌人路线，不引入 A*。 | 已完成；TDM 字节/网格/频次、768 个背景 command、65 个街道 command 与所有 atlas crop 通过；12 条完整路线覆盖 59 个控制点、65 条控制边和 5 条入口段，无循环或越界。`oregon-04-map.test.ts` 2/2、改动文件 TypeScript 检查通过。 |
| M25-C | 装饰、地图单位与 Fort Cannon 池 | 按审计接入 code 72/79/115/117/118/119 装饰，96/98/99/100/101 可雇佣单位、104/107 开局单位、130/131 解锁单位，以及 code113 真实 Fort 生成点。复用现有单位工厂、四位解锁 snapshot 与 `CampaignUnitPoolDefinition.units[].template`：Cannon pool entry 使用 type 3 / spawn type 2，模板挂到 Fort `(10,12)`；不在地图伪造单位、不新增接口。 | 已完成；各 marker 坐标/类型/activity 与 16 种解锁组合通过；Fort 装饰和 pool-only Cannon 模板分离，spawn type 2、pool type 3、无假地图单位。M25-B/C 定向测试 5 项通过，改动文件 TypeScript 检查通过；pool wave actions 留到 M25-D。 |
| M25-D | 初态、规则、10 波与 Cannon 池 | 新建 `oregon-04` rules/waves/pool，接入 250 现金、25 生命、3 次升级、Easy/Medium/Hard HP 86/115/140%，完整 10 波、22 个生成池及两条 Wave 1 pool action。定向测试逐字段核对初态、生成入口、间隔、普通请求槽和 Boss 槽；验证 Wave 1 清空 Cannon 库存、Cannon max=4、实际 Fort 生成。只做代表性短 `GameSession`，不推进完整战役；`awesomeMessageMin` 和对白/肖像不新增未证实语义，后者留在 M25-E。 | 已完成；APK 波次表逐项匹配，包含 10 波、22 个 pool、每池 10 槽及 Wave 10 Boss；初始经济、生命、难度倍率、升级数、补给箱及单位池动作均通过核对。短 GameSession 验证敌人生成、地图 Cannon 雇佣扣款及从唯一 Fort `(10,12)` 出兵。与 M25-B/C 合计定向测试 8/8、改动文件 TypeScript 检查通过。Cannon pool 的 15 秒间隔沿用网页已有值；APK 定时器语义仍标为未知，不作为已逆向结论。 |
| M25-E | 双语文本、肖像与资源接线 | 添加 Fort Echo 英文原文和中文译文、关卡简介及 10 段对白；每段对白逐项关联 APK 资源键、肖像和所在波次，波次延迟沿用已核对的规则数据。复用现有 map27 缩略图、Oregon 图块及 `oregon-01-music.ts` 资源，并将对白实际使用的肖像加入预加载。先核对 `oregon_dakota_portrait_dynamite.png` 的网页消费点：只有明确实现的 UI 调用点需要它时，才从 APK 精确导入并验证；若当前不存在调用点，则记录为未使用资源并暂不打包。定向验证英文逐字匹配 APK、10 段对白的资源键/肖像/顺序、中文文案完整、必需资源可解析且预加载。保持静音，不增加无证据语音映射。 | 已完成；关卡名、简介及 10 段双语对白逐项与 APK 资源键、肖像和波次延迟对照；英文原文、7 个实际对白肖像和 PNG 文件通过测试，主程序预加载了这些肖像。静态搜索确认 APK 的 `oregon_dakota_portrait_dynamite.png` 在网页代码无消费点；`portrait_pyromaniac` 目前只有预加载和资源测试，没有展示调用，因此不导入无用文件，待出现实际 UI 消费者时再处理。对白 speaker 标签按 portrait 身份提供网页文案，不声称是 APK 独立字符串；未增加 voiceSound。11 项 M25-B–E 定向测试及变更模块和 `main.ts` TypeScript 检查通过。 |
| M25-F1 | identity、版本与内容 builder | 新建 `oregon04-identity.ts`、`oregon04-content-version.ts` 和 `oregon04-campaign.ts`。稳定 ID 使用 `campaign-oregon-04`；版本沿用 Oregon 的四位全局解锁快照，覆盖 Sniper、Grandpa、Pyromaniac、Salesman。Builder 组合 map27、规则、单位池、双语简介和十波内容，profile/replay snapshot 只影响四类开局单位，不影响真实 Fort 的固定 Cannon 池。测试全部 16 种快照、版本往返及 canonical 校验，确认默认地图和规则一致。 | 已完成；全 16 种全局解锁快照、回放版本往返和非法/跨关/非 canonical 版本拒绝通过；短 GameSession 验证 32×24 地图、10 波、250 现金及 25 生命。与 M25-B–E 合计定向测试 14/14，新增 builder/version 模块 TypeScript 检查通过；无新接口。 |
| M25-F2 | 浏览器内容解析与 replay 工厂 | 在 `bootstrap/browser.ts` 注册 Oregon 4 builder、版本解析和 `createBrowserGameForOregon04Replay`；replay 只按录制版本恢复四位快照，不读取导入者当前 profile。为 `waveIntrosForScenario` 接入 Oregon 4 的十段对白。测试不同 profile 导入同一录制版本得到相同 map units；缺少必需版本字段沿用 replay parser 的 `missing-version`，非法/跨关/非 canonical 版本返回 `content-unavailable`，不回退到当前 profile。 | 已完成；浏览器已注册 Fort Echo content builder、版本生成和回放工厂，主界面回放路由及十段对白路由接通。16 种快照均从录制版本恢复，导入档案不同也不会改写 map units；缺少版本由既有 parser 返回 `missing-version`，未知/非法/跨关/非 canonical 版本返回 `content-unavailable`。M25-B–F2 定向测试 16/16、`browser.ts`/`main.ts`/回放测试 TypeScript 检查通过。浏览器端到端导入仍留在 M25-G。 |
| M25-F3 | 正式进度与 Free Play 规则 | 将 level 24 登记到 `officialCampaignStages`，以前置 level 23 (`oregon03CampaignId`) 解锁；该登记同时让已实现关卡进入现有 Free Play stage 列表。更新旧正式关卡测试中“总数为 23”的断言和完整目录快照。测试无前置时锁定、完成 level 23 后开放；Free Play 三种难度用清空敌人请求的短会话达到胜利，确认结算仍是 `free`、进度服务拒绝持久化，档案完成项/高分/结算记录不变；正式模式胜利后确认 level 24 完成且高分写入。只走零请求短会话，不手动通关十波战役。 | 已完成；level 24 已正式登记并只依赖 level 23；无前置时锁定、已有 level 23 时开放。Easy/Medium/Hard 三档 Free Play 零请求胜利均保持 `free`，Progress 拒绝写入且档案不变；正式胜利记录完成项、高分和结算 ID。18 个旧总数断言、完整正式目录快照和 Fort Kaboom 关卡链快照已同步到 24 关。M25-F3 相关测试 90/90 通过；最终 typecheck 随定向验证完成。 |
| M25-G1 | 主界面内容与场景接线 | 保留已有正式目录、Oregon 区域及 map27 静态图登记；补齐主界面对 level 24 的双语标题/简介、关卡按钮和详情标题、详情地图内容工厂、场景说明、Oregon HUD 区域标签、正式/自由模式场景重建，以及 Oregon 背景/波次音乐识别。音乐继续复用已审计的 `oregon-01-music.ts` 轨道；不新增素材或播放测试声音。定向检查证明 level 24 预览确实使用 32×24 map27 内容，正式入口/Free Play 共用 Fort Echo builder，Oregon 仍按 10 关区域布局；保留所有既有可玩数及 level 23→24 解锁链。 | 已完成；双语关卡/简介、map27 预览 builder、Fort Echo 场景说明、Oregon HUD 标签、档案驱动场景重建和 Oregon 音乐识别已接线。`t63-oregon-04-integration.spec.ts` 定向 E2E 验证 Free Play 入口、4 个可玩关卡、map27 关卡图、缩略图 `data-scenario-id`、192×144 地图预览、中英文文案、第 1/10 波对白/头像及静音状态下加载 Oregon 环境音乐资源通过；测试拦截媒体 `load()`，未加载或播放音频。受影响 `main.ts` 和 Fort Echo 内容模块 TypeScript 检查通过。 |
| M25-G2 | Fort Echo 浏览器集成验收 | 扩展独立 Playwright 场景：无 level 23 时正式 level 24 禁用，档案完成 level 23 后开放并能从正式菜单进入；Free Play 以 Easy、Medium、Hard 分别打开 Fort Echo，核对地区/关卡上下文和第 1/10 波对白/头像。验证 Cannon 代表行为：从 Fort Echo 真实地图单位中雇佣一门休眠 Cannon，通过游戏引擎短时推进观察 Fort pool 在真实 Fort `(10,12)` 生成 awake Cannon，断言扣款、单位状态和生成格；只推进到首次生成，不清关。回放用具有 canonical Fort Echo contentVersion 的一帧故意不匹配 checkpoint 探针：导入应越过版本/内容路由并在该 checkpoint 返回预期 `result-mismatch`；此项只验证 UI 导入和 snapshot builder 路由，不声称是成功回放，不推进完整十波。测试全程静音、窗口模式。 | 已完成；`t63-oregon-04-integration.spec.ts` 5/5 通过：正式菜单未解锁时锁定第 24 关、完成第 23 关后开放且第 25 关仍禁用；Free Play 三档（Medium 在 G1，Easy/Hard 本切片）均从首波正确启动；浏览器正式 builder 的 Cannon 雇佣扣款 `$150`，短时推进后由真实 Fort `(10,12)` 生成活动 Cannon；canonical snapshot 回放导入通过版本路由并在预设 checkpoint 返回预期不匹配。`main.ts`、Fort Echo 内容模块和新 E2E TypeScript 检查通过。开发中的一次探针先遗漏选中单位状态，已按 `GameSession` 合约修正并记录经验；没有完整模拟关卡、播放音频或进入全屏。 |
| M25-G3 | 关卡目录回归与批次完整检查 | 扫描并更新所有受 stage 数从 23 增至 24 影响的正式目录、区域可玩数、Free Play 数和锁定范围快照；核实 level 25 仍未实现且不会误开放。运行 M25-G 定向单测、类型检查及 E2E；最后只运行一次 `CI=1 PLAYWRIGHT_PORT=<空闲端口> pnpm run test:ci` 完成整批检查。完整检查通过后更新计划并本地提交。 | 已完成；更新 8 个旧 E2E spec 的进度摘要和 Oregon 可玩/锁定断言，并补齐 Apache Valley 与 Progress 单测中的第 24 关依赖及 locked 状态快照；确认 level 25 仍禁用。受影响的 9 个 E2E spec 共 22 项通过，目录/关卡单测 28 项通过，初次完整检查发现的 2 个旧快照在修复后 25 项定向测试通过。最终 `CI=1 PLAYWRIGHT_PORT=43196 pnpm run test:ci` 全绿：779 项单测、构建、165 项 E2E；构建仅有既有的大 JS chunk 提示。 |
| M25-H | 批次集成、发布与回同步 | 本批与 M24、M26 合并为一个 Oregon 内容发布批次，不单独发布。最终代码基线、完整检查、来源 SHA、代表性浏览器验收和分支回同步统一由 M26-H 执行。 | 已由 M26-H 完成；M24–M26 作为同一批次公开发布并回同步。 |

## 已完成批次：Dynamite Plains（M26，Oregon 第 5 关／全局第 25 关）

目标是按现有 Oregon 内容模块接入 Dynamite Plains（`td_map_28.tdm`）。M26-A 至 M26-G 已完成：原始 map28 TDM、网格、地形/道路、路线、地图对象、炸药、初态、波次、招募池、双语文案、对白、资源、正式/自由/回放入口及目录回归均已接入。静态基线为 32×24、4 个入口、37 个路线控制点、43 条边、2 个可达出口；关卡初始现金 `$65`、1 条生命、9 波、23 条敌人请求及 2 条 Wave 1 pool action。3 组炸药触发器/箱体坐标和实际交互已核实。详细基线与未知项见[Dynamite Plains 静态审计](map25-static-audit.md)；实现和验收结果见下方切片表。

该批次在 M26-H 与 M24/M25 合并为一次完整发布。默认窗口模式和静音；不运行 Android、不手动完整通关。复用 Oregon 绘制、路线、单位、进度和回放架构；只有 M26-A 证明现有规则不能表达炸药箱/触发器行为时，才另行细化共享规则改动。

| 顺序 | 切片 | 范围与可判定验收 | 状态 |
| --- | --- | --- | --- |
| M26-A | APK 静态审计与实现基线 | 新建 `map25-static-audit.md`。从用户 APK 复核 TDM 字节/SHA、关卡到地图映射、地形和 marker 频次、全部路线、单位/建筑/炸药配对、关卡参数、9 波与 23 条请求、pool action、英文资源键、头像与音乐；与 REA/Smali、研究归档和既有 Oregon 实现交叉核对。逐项标为 APK 事实、静态推导、网页差异或未知；明确一条生命的档案/结算边界和炸药机制，不完整通关、不启动 Android。审核报告的来源定位、路径和链接，`git diff --check` 通过并复制 Markdown 到归档目录。 | 已完成；[Dynamite Plains 静态审计](map25-static-audit.md) 记录 TDM 原始 SHA/频次、37 个路线控制点和完整路径边、所有地图对象坐标、三组炸药配对、初态、9 波/23 请求、pool actions、英文资源和网页资产差异。APK 原始 TDM 重新解析后与派生地图/路线资料一致；REA `GameDesignWaves.setWaves(i==25)` 用实际交错调用顺序恢复波次分组；无 Android 或完整战役测试。 |
| M26-B | Oregon 地图、绘制层与敌人路线 | 迁入 APK 原始 map28 TDM 和 y-major 网格，复用 Oregon 地形/道路 renderer；以原字节比对验证 32×24 网格和 tile 频次。按 APK 方向表重建四入口、全部路线分支和两个出口，逐边核对无越界、死路、环路或不可达点；绘制输入、碰撞地形和敌人路由分别测试，不加 A* 或自创偏移。对照[静态审计](map25-static-audit.md)的 43 条有向边（含 4 条入口连接）与 37 个控制点；不得重新猜路线。 | 已完成；新增 map28 原始 770 字节 TDM、y-major JSON、Oregon 绘制层/背景碰撞层及 route module。定向测试以 APK 原字节校验 SHA、维度和全部 tile 频次，校验 768 背景格、76 道路/桥梁命令、资源图集裁切与 24×32 碰撞格；路线图精确匹配审计的 43 条边，覆盖 37 个控制点、4 个入口及 2 个出口。`node --import tsx --test tests/oregon-05-map.test.ts`（2 项）与 `pnpm run typecheck` 通过。 |
| M26-C | 地图对象、可雇佣单位与炸药 | 按审计接入装饰、新局/招募 marker、解锁单位和 Saloon/Tipi spawn 建筑；地图没有 Fort，pool Cannon 上限为 0，不创建 Fort/Cannon 生成点。接入三组 DynamiteTrigger/Box 的已核坐标，并以实际 APK `DynamiteBox.detonate` 语义覆盖测试。当前共享 `isInsideDynamiteRadius` 使用严格 `<`，APK 使用 `<=`；修为含 3 格半径边界，测试 `radius−1/radius/radius+1`，并复跑受影响的既有炸药规则测试。验证点击触发、冷却、消失/重生、伤害、marker、解锁单位、Saloon/Tipi 和地形碰撞；不按名称臆造行为、不增加假地图物体。 | 已完成；37 个装饰 marker/资产和木桩碰撞、31 个全解锁单位、16 种解锁组合、Saloon/Tipi 与无 Fort/Cannon 池、三组炸药配对/解锁均与 TDM 核对。`GameSession` 定向测试确认场景内触发器可伤害恰在 3 格半径的敌人；共享判断修为 APK 的含边界 `<=`，并验证半径前一单位/边界/后一单位。复跑共享炸药点击、冷却、箱体消失/重生和受影响地图回归共 179 项定向单测；`pnpm run typecheck` 通过。 |
| M26-D | 初态、难度、波次与单位池 | 逐字段接入 `$65`、1 条生命、升级/补给箱参数、Easy/Medium/Hard HP 倍率、9 个 wave header、23 条 spawn 请求及两条 Wave 1 pool action；将 `[3,3,0,3]` 解释为 pool type 1–4 的上限，不让 Cannon 形成虚构地图生成点。依据 APK 方法消费顺序实现，不照搬研究 JSON 的符号字符串。用固定 seed 的短 `GameSession` 验证首波、代表性后续请求、池状态与一生命初态；以单个 Gold Transport 的失败结算检查一生命边界，不清空整关。 | 已完成；新增 rules、waves、player pool 模块。所有 9 个 header、23 条请求、8 槽到 10 槽映射、Boss 末槽、初态、难度及补给箱参数与静态审计表逐项匹配；短 `GameSession` 在三档难度实际生成 Wave 1 Gold Transport，HP 分别为 2,150/2,850/3,500。Wave 1 运行时 pool 状态为 pending `[0,0,0,0]`、maximum `[3,3,0,3]`；用真实关卡 marker 招募后，`GameSession` 将 Gunslinger 从 TDM Saloon `(2,2)` 派发。单位池辅助测试确认三类雇佣单位只从真实 Saloon/Tipi 派发，没有 Cannon/Fort 入口。单生命失败夹具产生唯一正式 defeat settlement。Oregon 03/04、Oregon 05 地图/对象、共享 pool 与炸药定向测试共 35 项通过；`pnpm run typecheck` 通过。15 秒 pool cadence 沿用现有网页实现，APK 最终 timer 赋值仍未知；M26-F1 已验收正式进度与 Free Play 隔离，实际网页/回放入口留在 M26-F2。 |
| M26-E | 关卡文案、稳定身份与肖像资源 | 新建 identity 常量 `campaign-oregon-05`、copy 和 wave intro 模块；按 APK `T_LEVEL_NAME_28`、`T_LEVEL_INFO_28`、`T_CAMPAIGN_25_01..09` 接入标题、简介、speaker/portrait 和 9 段精确英文，补项目中文译文。把关卡标题/简介接入现有全局 level 25 菜单文案及该 ID 的 intro dispatcher。将 APK `oregon_dakota_portrait_dynamite.png`（96×96）原样迁入资产，并以原 APK 字节比较及 PNG 尺寸核验；其它五种头像和 map28 菜单预览复用现有文件。把对白头像放入启动预载列表；地图预览仍沿用菜单资源 URL 按需加载，不混入战斗 sprite 预载。沿用 Oregon 音乐映射；静音验收、不播放音频。 | 已完成；新增 `campaign-oregon-05` identity、双语标题/简介、9 段 APK 英文对白与中文译文，并按静态审计映射 speaker、portrait 和菜单/波次分发。Dynamite 肖像从 APK 原样提取；`cmp` 与 SHA 输出确认与原 ZIP entry 字节一致，PNG 为 96×96、8,888 字节。六种对白肖像均通过文件检查并进入启动预载数组；map28 缩略图沿用菜单 URL 按需载入。内容与相关 Oregon 文案回归 12 项通过；`pnpm run typecheck`、`pnpm run build` 通过，构建保留主 JS chunk 超过 500 KB 的既有警告；未播放音频。 |
| M26-F1 | builder、回放快照和正式进度 | 复用 M26-E 的 identity；新增 Oregon 05 builder/version factory，快照编码会改变开局地图单位的四个全局解锁位，以及会改变 DynamiteTrigger 可见/可用状态的炸药解锁位；把 global level 25 登记为 `campaign-oregon-05`、前置 `campaign-oregon-04`。正式、Free Play 与回放必须使用同一 builder；回放由录制快照还原单位与炸药状态，不读取导入者当前档案；Free Play 和 replay 不修改正式完成数、高分或解锁。 | 已完成；新增 `createOregon05CampaignContent` 和 canonical contentVersion/replay factory，覆盖四类单位解锁及 Dynamite 解锁快照；正式目录新增 level 25，依赖 level 24。32 种完成记录组合经 builder 与 replay factory 检查；Free Play 三档结算均拒绝写入正式档案，formal victory 写入完成度/高分/结算 ID。Oregon 04/05、波次与文案定向检查 19 项通过，`pnpm run typecheck` 通过。level 25 主菜单、关卡预览、实际战斗和真实 replay import UI 留在 M26-F2。 |
| M26-F2 | 主菜单与浏览器场景集成 | 接入目录标题/简介、map28 预览、Oregon HUD、场景说明、9 段对白和资源预载。Free Play level 21–25 可选，level 26 仍禁用；正式 level 25 在完成 24 后开放。桌面和窄屏 Playwright 覆盖入口、难度、地图预览、开场对白、正式锁定/解锁、炸药代表行为及回放导入路由；不推进完整关卡。 | 已完成；level 25 已连到正式/Free Play 概览与同一 builder、Oregon 地区 HUD、9 波对白和回放导入分派。新增 `t64-oregon-05-integration.spec.ts` 的入口、解锁、炸药触发和回放快照 4 项通过；受影响的 Oregon 01–04 菜单回归 11 项通过，`pnpm run typecheck` 通过。全仓库历史进度总数与正式目录快照留在 M26-G；未做完整战役。 |
| M26-G | 目录回归与完整检查 | 将正式目录及所有测试快照/摘要总数从 24 对齐到 25；扫描旧关卡的 progress、回放、地区计数和 E2E 断言，保证新增关卡不改变旧场景行为。确认 Oregon Free Play 21–25 可进入、26 禁用；正式 25 仅依赖完成 24。先跑受影响单测和浏览器 spec，再只运行一次完整 `CI=1 PLAYWRIGHT_PORT=<空闲端口> pnpm run test:ci`。修复失败后复跑相关失败项与最终完整检查；更新计划并本地提交。 | 已完成；将 18 个关卡单测长度断言、5 份历史 E2E 进度摘要，以及主目录、Fort Kaboom、Progress、Apache Valley 的 4 处全目录/状态快照对齐到 25；确认 Free Play 26 仍禁用、正式 level 25 仅依赖 24。受影响 23 个单测文件共 111 项通过，Oregon 入口回归 15 项通过，Apache Valley 补齐快照后定向测试 8/8 通过。最终 `CI=1 PLAYWRIGHT_PORT=42129 pnpm run test:ci` 全绿：800 项单测、生产构建、169 项 E2E。构建仅有既有的大 JS chunk 提示；首次全量检查发现并补齐 Apache Valley 全目录快照后，重跑完整检查通过。 |
| M26-H | M24–M26 整批集成、发布与回同步 | 以 `origin/master=ecbe192` 为发布基线，检查 M24–M26 完整差异及21个实现切片；整批 squash 到 `master` 并推送。GitHub Actions 适用检查须成功，两个公开 Pages 的 `build-info.json` 来源 SHA 必须等于发布提交。内置浏览器窗口模式、静音检查 Free Play Oregon 21–25 的预览和第25关开局；正式 level 25 的 level 24 前置由自动化核验，浏览器只读检查当前档案状态，不替换用户档案；核对 Dynamite Plains 首波对白及地图。不完整通关、不进全屏、不播放音频。最后回同步 `gunsnglory`，更新相关工作树。 | 已完成。发布 squash 提交 `78f684fea799cf8c0cc39f143d98fbd9f8a054e0`；GitHub Actions [43497562929](https://github.com/wishflow/wishflow-tools/actions/runs/43497562929) 的共享检查、Guns’n’Glory 完整检查及 GitHub/Cloudflare Pages 部署成功。两个站点的 `build-info.json` 都报告该 SHA。内置浏览器核对 Free Play Oregon 的 21–25 关卡预览、Dynamite Plains Easy 首波对白及 map28 实战地图；正式战役显示 0/10，level 21–25 锁定，未替换用户档案。发布提交已回同步至 `origin/gunsnglory`（合并提交 `25d30a1`），本地 `master`、`gunsnglory` 主 worktree 均已更新；窗口模式、静音，未完整通关。M22-G 的 M4–M7 公共回放导入仍为独立历史浏览器验收债务。普通发布比例由 27/156（17.3%）变为28/156（17.9%）。 |

M24–M26 的实现切片与共享发布门槛均已关闭。M22-G 的 M4–M7 公开回放导入仍单独列为历史浏览器验收债务；本批回放快照自动化通过不等同于该导入项已验证。

## 最近完成批次：回放内容快照补全（M22）

目标是使回放内容版本完整标识影响开局场景的档案状态，并修复 M21 新局遗漏的 map24 招募单位。APK 证据和修正后的 marker 语义见[Eastwood Forest 静态审计](map21-static-audit.md)。测试默认窗口模式、静音；不完整通关、不启动 Android。

| 顺序 | 切片 | 范围与验收 | 状态 |
| --- | --- | --- | --- |
| M22-A | 证据与计划纠正 | 以 Smali 条件跳转和 `Guns’n’GloryThread` 调用点确认 `fromLoadGame` 语义；改正 M21 静态审计、架构约束、经验记录及历史计划描述。链接有效、事实/历史结论可区分，`git diff --check` 通过，Markdown 按相对路径复制归档。 | 已完成 |
| M22-B | 全局解锁快照契约 | 新增 M4–M7 共用 v2 版本编解码器，编码四个全局单位里程碑位，另为 M4 编码 `mapAccessible`；精确识别各关固定 v1 版本，并拒绝畸形/跨关版本。 | 已完成；`new-mexico-replay-content-version.test.ts` 3项通过（16种解锁组合、M4访问位、v1及非法版本）。 |
| M22-C | M4–M7 内容版本生成 | 四关内容 builder 从有效档案快照生成 v2；将实际影响场景的单位门控和 Tech Town map-access 位纳入版本。正式及 Free Play 入口传入同一有效 completed IDs；各 milestone 与内容实体逐项对应。 | 已完成；4关 builder/浏览器版本组合矩阵与相关正式测试21项通过；`t31-free-play`、`t37-tech-town-formal` 定向 E2E 3项通过；`pnpm run typecheck` 通过。 |
| M22-D | M4–M7 回放工厂 | 为四关增加按录制版本还原场景的 factory，并接入导入路由。v2 replay 必须忽略导入时当前档案；v1 replay 继续按现有历史行为使用当前档案构造。未知/畸形版本不得退回当前内容。 | 已完成；v2 对四关全部16种解锁快照在不同导入档案下还原单位；v1 对空档案/全解锁档案保持原语义，Tech Town 保留旧路由补入 M3；未知和畸形版本均以 `content-unavailable` 拒绝。新增回放工厂测试及版本编解码测试共7项通过，`pnpm run typecheck` 通过。 |
| M22-E | Eastwood 新局招募与版本升级 | 按 map24 marker 96、97、100、101、130、131 从真实 TDM 生成 activity 4 招募单位并应用 APK 解锁门槛；保留 activity 5、Gambler/Casino 和奖品模板行为。升级至 v2；v1 replay 保持 M21 已发布的旧单位列表。核对坐标、类型、activity、唯一 ID、16种全局解锁组合及 v1/v2 分支。 | 已完成；31个 activity 4 marker 的坐标/类型/activity 按 TDM 对照，16种解锁组合及唯一 ID 通过；v2 使用新单位集，v1 恢复旧 activity 5 单位集且保留原快照门控。Eastwood/内容回归19项通过，M4–M7 与 Mississippi 兼容定向测试15项通过，`pnpm run typecheck` 通过。 |
| M22-F | 回放矩阵与入口回归 | 在录制档案和导入档案不同的条件下验证 M4–M7 每种快照、M4 map-access 状态和 Eastwood v1/v2 replay factory；验证未知版本拒绝。补足正式与 Free Play 入口的定向 E2E，不推进完整关卡。 | 已完成；M4–M7 的16种快照组合由工厂单测遍历，v1 与导入档案一致时保持旧内容；M4 `map-access=0` 即使当前档案已解锁 M3 仍由版本解析/prepare 保持关闭，开放状态的真实 replay 由浏览器导入覆盖。E2E 用短探针覆盖 M4–M7 与 Eastwood v1/v2 共10个可生成内容版本，frame 0 由真实 `GameSession` 摘要校验，frame 1 使用故意不匹配摘要以避免推进战斗；未知版本返回 `content-unavailable`。`t60`、两项 `t31-free-play`、`t37-tech-town-formal` 共4项 E2E 通过；M4–M7 工厂及 Eastwood 内容/规则单测共10项通过；`pnpm run typecheck` 通过。 |
| M22-G | 批次检查、发布与回同步 | 先运行 M22 定向测试并修复失败；整批结束后运行 `CI=1 PLAYWRIGHT_PORT=<空闲端口> pnpm run test:ci`。通过后以单个 squash commit 集成至 `master`，推送并等待 Pages 工作流；核对 GitHub Pages 与 Cloudflare Pages `build-info.json` 的 `sourceSha`，再用内置浏览器静音、窗口模式验证 M4–M7 replay 与 Eastwood Free Play 代表流程；最终合并已发布提交回 `gunsnglory` 并核对远端。不得完整通关、进入全屏或播放音频。 | 本地 `test:ci` 通过（类型检查、734项单测、生产构建、156项 E2E）；GitHub Actions run [43357707974](https://github.com/wishflow/wishflow-tools/actions/runs/43357707974) 全绿；squash 发布提交 [b5dec97](https://github.com/wishflow/wishflow-tools/commit/b5dec97926b7ebfb2643922809eeb2660ebcd071) 已部署，GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均返回相同 `sourceSha`；发布内容已合并回 `gunsnglory`。后续在当前 M23 发布版完成 Eastwood Free Play 菜单、关卡预览、Pedro 首波对白及游戏地图验收；M4–M7 合成内容路由探针在本地解析并按预期到达 `result-mismatch`，但通过内置浏览器导入后显示“Replay file is invalid or incomplete.”，原因未能区分应用解析与文件选择桥接，故 M22-G 的浏览器回放项仍待补；不得据此断言公开回放实现失败，也不得标记 M22-G 全部关闭。M22/M23 的当前公开 SHA 与 Free Play 游戏流程已核验；此项只保留为历史回放浏览器验收债务。构建保留约 2.45 MB JS chunk 警告。 |

## 已发布实现批次（M23）：Cashcow Canyon（Oregon 第 2 关／全局第 22 关）

目标是把 APK 已登记但网页仍禁用的 Cashcow Canyon 接入当前规则、地图、内容版本、正式战役与 Free Play。内容清单将其映射为 `td_map_25.tdm`：32×24、初始 `$250`/25生命、86/115/140 HP倍率、9个 `newWave` 行、33个 `addToWave` 行、0个炮池动作。逐项静态审计已完成，基线见[Cashcow Canyon静态审计](map22-static-audit.md)；不完整通关、不启动 Android，验收默认窗口模式和静音。M22-G 的内置浏览器门槛仍单独保持未关闭。

研究归档位于本地 codex/gunsnglory-spec 分支。M23-A 静态审计已完成，详见[Cashcow Canyon静态审计](map22-static-audit.md)；审计以Smali/DEX为准，并记录了研究清单中与DEX不一致的对象分支。M23-B/C/D/E已按审计基线接入地图、路线、对象、开局单位、波次规则、双语剧情和原版装饰资源，不重复抽取已验证的全局API。本关没有Cannon marker或炮池动作。

| 顺序 | 切片 | 范围与验收 | 状态 |
| --- | --- | --- | --- |
| M23-F | 正式关卡、Free Play 与回放 | 新建 `oregon-02-identity.ts`、内容版本编解码和 `oregon-02-campaign.ts`；版本沿用已验证的全球单位解锁位，仅将实际改变 Cashcow 开局 activity 4 单位的 Pyromaniac/Salesman 两位作为内容差异测试依据。复用 `campaignCatalog` 已有的 level22/map25 条目，在 `official-campaign.ts` 登记 level22 并以前一关 Eastwood 为前置；把同一builder接入正式、Free Play、replay factory、主菜单中英文标题/简介、9段对白、Oregon音乐和启动资源预加载。新增 `oregon-02-formal.test.ts`；扩展 `t60-replay-content-snapshots.spec.ts` 并新增 `t61-oregon-02-integration.spec.ts`。验收：无进度时正式22锁定、完成21后开放；正式胜利记录22，Free Play 的三档难度均不污染档案；2×2个Pyromaniac/Salesman解锁组合和不同导入档案下均按录制快照还原开局单位，未知/非法版本以 `content-unavailable` 拒绝；桌面/移动E2E检查选关、map25简介与预览、首波对白、音乐/资源接线和真实开局摘要，不手动通关。 | 已完成；正式、Free Play、内容版本快照回放及入口 E2E 均通过，详情见下方完成结果；批次检查和发布状态见 M23-G。 |
| M23-G | 批次检查、发布与回同步 | 在确认空闲端口 `43217` 后运行一次 `CI=1 PLAYWRIGHT_PORT=43217 pnpm run test:ci`；失败时修复当前失败并重跑失败项及最终完整检查。通过后 fetch 并核对最新 `origin/gunsnglory`、`origin/master`，把本批相对集成基线的改动 squash 到 `master`，再裸 `git push origin master`；用 GitHub CLI 等待适用 job 成功，核对 GitHub Pages 与 Cloudflare Pages `build-info.json` 来源 SHA；内置浏览器静音、窗口模式验证 Cashcow Canyon 正式/Free Play 代表入口；最后回同步 `gunsnglory` 并检查远端和工作树。不得完整通关、进全屏或播放音频。M22 未完成的浏览器验收若 provider 仍不可用，继续明确保留，不得以 M23 自动化测试冒充 M22 线上视觉验收。 | 本地 `CI=1 PLAYWRIGHT_PORT=43217 pnpm run test:ci` 通过：类型检查、748项单测、生产构建、158项E2E。GitHub Actions [43374309294](https://github.com/wishflow/wishflow-tools/actions/runs/43374309294) 的应用/共享测试及两个 Pages 部署均成功；squash 发布提交为 [55ef7f5](https://github.com/wishflow/wishflow-tools/commit/55ef7f5fe6d64dd6ee2e18d358b1485c4410c01c)，GitHub Pages deployment `7758372664` 的 SHA 与其一致。发布时 Cloudflare CLI 未登录，`build-info.json` SHA 尚未核实；回同步提交 `9007172` 已推送到 `origin/gunsnglory`。后续补充核验：GitHub Pages 和 Cloudflare Pages 的当前 `build-info.json` 均报告 SHA `55ef7f5fe6d64dd6ee2e18d358b1485c4410c01c`；在该当前发布版通过 M22 Eastwood Forest 和 M23 Cashcow Canyon 的 Free Play 目录、地图预览、Medium 首波对白及地图实景。由此关闭 M22/M23 当前版本的公开来源 SHA 与浏览器代表流程待验项；不声称重新验证旧历史部署。

### M23-B 完成结果

- 新增 map25 的原始 TDM、Oregon 绘制层、碰撞场景和路线模块。TDM 为770字节，SHA-256与APK派生网格一致；768个背景格、34个非零街道路格和8个桥墩绘制命令逐项验证。背景/街道候选矩阵及桥墩坐标使用APK派生 terrain index 作为测试基线，所有贴图裁切范围有效。
- 六个出生点、42个转向点、三个出口、52条有向边和13条完整出生至出口路径与静态路线图一致；敌人路径均在地图边界内。Eastwood map24 地图、碰撞与路线回归通过。
- 定向命令 `node --import tsx --test tests/oregon-02-map.test.ts tests/oregon-01-map.test.ts` 通过4项；`pnpm run typecheck` 通过。未改玩家单位规则、关卡注册、战役/Free Play 或内容参数；这些留在后续切片。

### M23-C 完成结果

- 将 TDM code79/115/118/119 映射为四种 Oregon 树木/树桩装饰；共享地图场景继续提供 rocks_b、水塔、灌木、铁路挡车器和棚屋。49个装饰按 marker 坐标及资源 ID 逐项核对；缺失 PNG 的提取和裁切仍属于 M23-E。
- activity 4 招募单位按 profile 解锁快照生成，activity 5 的三名起始单位按 APK 新局语义始终生成；130/131 的 Pyromaniac、Salesman 分别验证锁定/解锁。91/92 marker 还原为 `(13,16)` 至 `(13,18)` 的三节纵向列车，共享一个移动组并使用对应竖向 sprite/activity。无炮、Gambler 或 Casino。
- 定向命令 `node --import tsx --test tests/oregon-02-map-entities.test.ts tests/lucky-lake-vertical-train.test.ts tests/oregon-01-map-entities.test.ts` 通过13项；`pnpm run typecheck` 通过。

### M23-D 完成结果

- 接入 `$250`/25生命/3次升级、86/115/140 HP倍率、999个奖励箱/25秒间隔/15个场上上限/4种奖励箱和阈值5；未将语义未闭环的 `awesomeMessageMin` 变成规则，也未为不存在的Gambler添加冷却行为。M11/M12已有测试支持的 `PathInterpolatorCompat.MAX_NUM_POINTS` 间隔取3,000ms。
- 按 APK 源顺序录入9个波次和33条请求；各波延迟、HP/速度倍率、出生 action、间隔和10槽向量逐项对照，最后一波仅第10个Boss槽为1；未创建战役单位池。
- 确定性 `GameSession` 从 Cashcow Canyon 初态推进至第一个真实请求，验证 action 5、Settler、Medium HP 185 和生成点；未推进完整战役。M23-D、M23-B地图、M21规则回归共6项通过，`pnpm run typecheck` 通过。

### M23-E 完成结果

- 英文标题/简介按 `T_LEVEL_NAME_25`、`T_LEVEL_INFO_25` 录入；9段对白按 `T_CAMPAIGN_22_01..09` 逐条匹配APK英文和头像。资源编号使用不同命名空间；中文版作为项目译文。未推断对白音效，也没有新增胜利标题。
- 从APK原样提取 tree_green_b、tree_stump、tree_green_c 的hdpi PNG；逐字节核对water tower、两个竖向挡车器和tree_green_a的网页hdpi文件与APK资源一致。APK中这七种资源均有ldpi/mdpi/hdpi变体；新增树木/树桩沿用高密度装饰2/3逻辑缩放。
- 定向命令 `pnpm run typecheck && node --import tsx --test tests/game-asset-path.test.ts tests/oregon-02-campaign-content.test.ts tests/oregon-02-map-entities.test.ts` 通过：类型检查通过、15项测试通过。启动预加载及正式/Free Play/回放接线留在M23-F验收。

### M23-F 完成结果

- 将 Cashcow Canyon 登记为 Oregon 正式第22关，前置为 Eastwood Forest；同一内容构建器接入 Free Play、正式战役、回放导入、英文/中文选关文案、9段波次对白、Oregon 音乐和启动资源预加载。正式模式胜利写入第22关进度；Free Play 三档难度可开局且不写入正式进度。
- 回放内容版本保存全局招募解锁快照；四种 Pyromaniac/Salesman 组合和与录制档案不同的导入档案均恢复相同开局招募对象。非法/未知版本不回退到当前内容，并由真实回放入口以 `content-unavailable` 拒绝。
- 定向检查通过：`pnpm run typecheck`；16项 Cashcow/目录单测；`t60-replay-content-snapshots.spec.ts` 与 `t61-oregon-02-integration.spec.ts` 共3项 E2E。E2E 覆盖桌面与390×844窄屏 Free Play、地图预览和首波对白、正式关卡解锁/锁定及资源加载；未通关、未进全屏、未播放音频。
- 浏览器集成测试发现 Level 22 的战斗 HUD 区域标签仍回退为 New Mexico，已在 `main.ts` 将第二个 Oregon 正式关卡纳入区域映射，并在两种入口的首屏断言 Oregon 标签。M23-G 本地与远端完整检查、发布及分支回同步均已通过；后续在当前 M23 发布版补齐两处 Pages 来源 SHA 及 M22/M23 游戏流程核验。M4–M7 公共回放导入仍未在浏览器确认，历史发布记录未重新部署或单独复测。

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
