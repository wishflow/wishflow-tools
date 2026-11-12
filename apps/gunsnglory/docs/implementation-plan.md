# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮先核对代码与 APK 派生证据，细化后续几个可独立验收的步骤；每步完成后更新本计划、关闭已完成项并本地提交。

## 当前状态

- 最新公开内容仍为 16/60 关：Mississippi 第16关 Highpoint Terrace，公开 `master` 提交 `f0ea306`；回同步提交 `412605c` 已将其纳入 `gunsnglory`。当前隔离批次已在开发分支接入第17关，但尚未集成或发布。
- 下一关为 Mississippi 第17关 **Dead Rocks**，对应 `res/raw/td_map_20.tdm`，不是 map17 文件。静态证据和未知项见[Dead Rocks 静态审计](map17-static-audit.md)。
- 工作分支为 `codex/gng-map17-dead-rocks`，从已同步的 `gunsnglory` 提交 `b1bb1f0` 开始；本轮在隔离克隆中工作，保留其他工作树上的未提交 UI 改动。
- M17 静态复核发现 M11–M16 均有 code96–101 新局可招募标记，现有网页地图工厂却跳过了它们；旧审计及经验记录把该分支误写成仅存档恢复。本批先纠正内容和回放兼容，再接入 M17，避免沿用此差异。 Smali 分支证据及各地图数量见[静态审计](map17-static-audit.md)。
- M17-A/B/C/D/E 和 F1 已完成：M11–M16 现按全部96–101标记创建新局可招募单位，旧 v1 回放继续按录制时单位列表重建；Dead Rocks 已接入32×24 TDM、地形与路线、对象/单位、初始参数、8波/35个请求、对白、正式目录、Free Play、正式结算和回放解锁快照。M17-D 的23项内容/地图定向回归通过；M17-E 正式/回放与 M15/M16 进度回归53项单测通过；受目录变化影响的24项选关 E2E 最终全部通过；F1 修复了四处停在 level16 的目录/Progress 测试快照。最终 `test:ci` 通过类型检查、661项单测、生产构建和147项 E2E；APK 派生关卡数据已独立交叉核对。当前只剩 M17-F2 的分支集成、发布、SHA 核对、内置浏览器验收和回同步。
- Dead Rocks 没有 `113` Fort、`98` Cannon 或 `spawnPoolActions`，因此不为本关创建炮池或假 Cannon。波次炮池可选独立模板契约已由先前 Riverside Mountains 修复提供；M17 不使用，因为没有对应消费者。
- 发布比例基线为 20 次普通发布 / 100 个已验收切片（20%）。本批完成后按实际切片数更新；整批完成前不单独发布。

## 剩余步骤：接入 Dead Rocks

| 顺序 | 切片 | 实施范围与前置 | 可判定验收 | 定向验证 |
| --- | --- | --- | --- | --- |
| M17-F1 | 同步正式关卡目录快照 | 首轮完整检查发现四处静态目录/Progress 期望仍停在16关；仅修复测试期望，不改正确的运行时进度逻辑。 | Apache Valley 前置列表、Cow Gulch 完整目录、Fort Kaboom 目录和 Progress 初态/结算状态都包含 level17；四个相关测试文件通过。 | `node --import tsx --test tests/apache-valley.test.ts tests/content.test.ts tests/fort-kaboom-formal.test.ts tests/progress.test.ts`；更新经验记录。 |
| M17-F2 | 整批验收、集成发布与回同步 | 前置为 M17-A–E 和 F1 均已提交且定向测试通过。完整检查通过后再 squash 到 `master`，发布并回同步到 `gunsnglory`。 | `pnpm run test:ci` 全通过；Pages 构建来源 SHA 与发布提交一致；Codex 内置浏览器静音、窗口模式进入 Dead Rocks 并确认地图、对白、波次 HUD；未完整手动通关。`gunsnglory` 本地/远端包含发布 SHA，其他脏工作树保持不变。 | `CI=1 PLAYWRIGHT_PORT=<空闲端口> pnpm run test:ci`；其后核对 Actions/Pages SHA 并完成内置浏览器验收。 |

### 证据和边界

- 关卡号从 `campaignCatalog` 与 `GameDesignWaves.setWaves` 的实际消费关系确认；不按 TDM 文件号推断关卡号。TDM 全集有63个文件，只有60个映射到可玩战役关卡；map20 对应第17关。
- APK 的新局/读档分支以 `GameObjectManager.smali` 为准；JADX Java 对该 switch 的控制流曾产生相反结论。96–101 在新局分支创建 activity 4 单位，读档时跳过；重启关卡也走新局分支。网页未实现未完成关卡续玩，不改变这个 APK 语义。
- 不启动 Android，不进行全关手动通关；仅在静态代码或数据不能回答具体规则问题时再计划一次定点观察。声音默认关闭。
- `awesomeMessageMin=30000` 与 `awesomeMessageUnit=5` 的网页消费者语义尚未确认；不得据此臆造内容。本关沿用经验证的 Mississippi 通用规则映射，并单独记录未知项。

## 批次完成与发布门槛

- 每个切片只跑其针对性测试并本地提交，提交说明记录行为变化、测试结果及未验证限制；关闭已完成计划项，不重复重跑已通过检查。
- 所有切片完成后运行一次应用完整检查及适用共享检查。若失败，将失败转为本批修复任务，修复后重跑失败项和最终完整检查。
- 完整检查通过后以一个 squash commit 集成到 `master` 并裸 `git push origin master`。等待既有 Pages workflow 成功，核对公开 `build-info.json` 来源 SHA，再用 Codex 内置浏览器检查发布页面。发布未核验完成前不得标记批次关闭。
- 发布后将发布提交合并回 `gunsnglory` 并推送；确认 `master`、`origin/master`、`gunsnglory` 与 `origin/gunsnglory` 的包含关系及相关工作树状态。不得覆盖或清理其他工作树中的未提交改动。
