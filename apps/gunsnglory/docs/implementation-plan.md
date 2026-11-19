# 实施计划

本文件是 Guns’n’Glory 唯一活动进度。每轮先核对当前代码与证据，细化后续步骤和验收；逐项实现、定向验证、更新计划并本地提交。已完成项从活动计划移除，经验与领域规则分别记录在对应文档。

## 当前基线

- **M34 Fort Knockout 已发布并回同步。**公开发布提交为 0860041；M35 从集成基线 31658ca 开始，该基线包含当时的 origin/master，分支跟踪 origin/gunsnglory。本轮开始前已刷新远端并确认工作树干净；文档修改提交后 HEAD 将前进。M34 发布和线上验收不在本计划重复安排。
- **下一关：M35 Badlands。**Dakota 第4关、global level 34、APK TDM 文件37。现有 campaign catalog 已有 Badlands 身份和 map37，但尚无可玩的完整 scenario。静态基线见[Badlands 静态审计](badlands-static-audit.md)。
- **M35-B1 已完成。**map37 的原始格网、Dakota 背景/道路/桥/铁路绘制数据、最终地形码和敌方路线已接入；原始 TDM、68条唯一方向边、37条完整路线和三种出生 action 的短会话首转由 `dakota-04-map-and-routes.test.ts` 核对。
- **静态场景切片已完成。**raw69/70/71/75/76/94/95/116、单一纵向列车组和 raw102/110 炸药已经接入；marker 坐标、APK 碰撞表、解锁和资源由 `dakota-04-scene-entities.test.ts` 核对。
- **M35-B2 已完成。**62 个常规/特殊招募 marker、16种单位解锁快照和真实 map37 GameSession 碰撞已接入；`dakota-04-unit-collision.test.ts` 覆盖睡眠单位、横竖桥、raw36 悬崖、铁路、列车、建筑、炸药。
- **M35-C 已完成。**`dakota-04-campaign-rules.ts` 接入 index33 的12项参数，`dakota-04-campaign-waves.ts` 接入9波/13个请求；独立期望覆盖波次元数据、请求向量、action 到出生点映射、Boss/Doc 槽。短 `GameSession` 验证初始现金/生命、第一波请求和末波 Boss；无玩家生成池，也未因非零 Gambler 计时伪造 Gambler/Casino。新增3项定向测试及 TypeScript 检查通过。
- **M35-D1 已完成。**`dakota-04-identity.ts`、`dakota-04-campaign-copy.ts`、`dakota-04-wave-intros.ts` 和 `dakota-04-music.ts` 接入关卡身份、双语标题/简介、APK 九段对白和 Dakota 音乐轮换。英文原文保留资源中的外层引号；对白角色与头像顺序来自本关静态审计。新增 `dakota-04-campaign-presentation.test.ts` 的4项定向测试和 TypeScript 检查通过；核对头像、预览图和 Ogg 文件路径/签名，没有播放声音。
- **证据与回归约束。**所有关卡事实从本关 APK 字节、目标 level 分支和对应消费者独立建立；不从邻关或压缩摘要复制。REA/JADX 伪代码、派生清单和历史报告是检索入口，不替代原始来源。路线绘制、玩家碰撞、敌方路线和对象碰撞分开验收。
- **历史文档冲突已发现。**M13 静态报告中关于 raw96–101 的旧结论与 Smali 及后续关卡报告不一致，已在本轮一并更正；相关防回归见[经验记录](experience-log.md)。
- 浏览器验收默认窗口模式并静音；无明确静态分析缺口时不启动 Android，不完整通关。

## M35：Badlands

### M35-D2：内容快照、场景组装与回放工厂

- **范围：**建立 `campaign-dakota-04` 的 `ScenarioContent` builder、canonical 内容版本与 replay factory。快照只编码会改变地图初始招募单位的四种全局解锁；场景组装地图、静态对象、列车、单位、M35-C 波次和资源。把对应场景与九段对白头像加入浏览器注册和启动预载。
- **依赖：**M35-B1、静态场景、M35-B2、M35-C、M35-D1 全部通过。
- **验收：**16种解锁组合均能从版本往返恢复，默认档案与全解锁档案产生对应单位集合；回放使用录制快照而非导入者档案；缺失、未知及非 canonical 版本拒绝。地图、单位、对白头像资产均通过项目别名映射进入启动预载并解析到现存文件。
- **验证：**新增 `dakota-04-content-version.test.ts` 和 `dakota-04-replay-content.test.ts`，覆盖 builder、回放导入和预载；完成后更新计划并提交。

### M35-D3：正式战役、Free Play 与菜单入口

- **范围：**将 Badlands 登记为 global level34，正式前置为 Fort Knockout（`campaign-dakota-03`）；Free Play 直接开放三档难度。接通菜单地图预览、关卡标题/简介、Dakota HUD 标签、对白与音乐会话。同步所有正式阶段数、区域计数、Progress 快照和 Free Play 可用范围。
- **依赖：**M35-D1、M35-D2 已通过。
- **验收：**无进度时正式 level34 禁用，完成 level33 后可进入；Free Play 三档均能从真实菜单进入且不写正式进度/高分。两种模式都显示 Badlands/map37、正确对白与 `1/9` HUD；回放入口保持独立。所有旧的33关目录/进度断言更新为34关，且不改变已有关卡规则。
- **验证：**新增 `dakota-04-formal.test.ts` 与 `t73-dakota-04-integration.spec.ts`；检查真实菜单锁定/解锁、Free Play、开场对白、地图和首波状态，不完整通关。更新计划后提交。

### M35-E：批次检查、集成发布和线上验收

- **依赖：**M35-B1、静态场景、M35-B2、M35-C、M35-D1–D3 全部关闭并分别本地提交。
- **本地门槛：**修复当前批次已发现失败；运行 Guns’n’Glory 完整 pnpm run test:ci 与适用的共享 catalog 检查。先确认测试进程来自当前 worktree；完整检查在批次收尾运行，不在每个切片后重复。
- **发布门槛：**将 M35 完整批次以一个 squash commit 集成到 master；推送后等待现有 workflow 成功，核对 GitHub Pages 与 Cloudflare Pages 的构建 source SHA 均匹配，再合并发布提交回 gunsnglory 并核对分支/worktree 同步。
- **线上验收：**内置浏览器窗口模式、静音打开与部署 SHA 一致的页面；从菜单验证 Free Play 与正式锁定/解锁入口、Badlands 预览、对白、地图、HUD 以及代表性游戏状态。只做代表性流程，不完整通关；除非某项静态证据无法回答，不启动 Android。

## 发布比例

- M30 结束时的核实基线为 36 次公开发布 / 195 个已验收实现切片。
- M31–M34 新增实现切片按已合并计划逐项核算：M31 7、M32 8、M33 5、M34 11，共31个；同期有6次公开部署，包含4个关卡功能批次和2个修复/诊断发布批次。
- **当前累计：42 / 231 = 18.2%。**计入修复批次实际部署，不计静态审计、文档、完整检查和分支回同步。M35-B1、静态场景、单位与碰撞、M35-C、M35-D1 各增加1个实现切片，尚未发布；目标仍是不高于20%。
- M35-D2–D3 每片完成时按实际实现切片更新分母；若两片均保留且本批仅发布一次，预期为43 / 233 = 18.5%。文档提交不算产品切片，也不单独发布。

## 批次执行规则

- 每个实现切片先运行针对性验证、更新本计划并本地提交；一组步骤完成后审查尚未完成项并调整后续范围。
- 整批结束时运行完整应用检查和适用共享检查一次。失败留在当前批次修复，再重跑失败项及最终完整检查。
- APK 数据期望必须独立于生产数据；路线、绘制、碰撞、单位、规则、内容入口分别验证。不能用 DOM 可见、fixture 自洽或单张预览图证明完整行为。
- 发布是完整功能批次的决定，不按文档或单个实现切片发布。部署与内置浏览器门槛未通过时，批次保持未完成。
