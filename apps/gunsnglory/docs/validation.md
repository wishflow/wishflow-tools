# Guns’n’Glory 验证记录

本文按交付批次保留历史证据；各节的“当前”“已完成”“尚未实现”和旧任务编号都指当时范围。当前进度、发布状态与有效排期统一见[实施计划](implementation-plan.md)。局部样本或工具通过不代表完整原版关卡通过。

第1–5节的历史范围为 [AGENTS.md](../AGENTS.md)、[架构设计](architecture.md)及其存储、模拟和实施计划文档；当时没有游戏代码、CLI、MCP 或后端实现。旧记录中的 M1、T25/T26 是历史命名，后续执行采用现行计划的 P0–P5/B 门槛。

## 1. 文档检查

- 检查本批全部 Markdown 的相对链接目标、代码围栏和尾空白。
- 检查 `CLAUDE.md` 仅包含 `@AGENTS.md`。
- 检查应用文档不依赖本机绝对工作目录。
- 交叉审阅模块依赖、运行数据类型归属、命令队列所有权、存储与执行职责、重试提交保护及阶段依赖；修正后复审未发现剩余阻断项。
- 提交前执行 `git diff --cached --check`，并核对暂存文件仅包含本应用的文档。

本批只验证文档及 agent 上下文加载。没有运行游戏构建、规则测试、浏览器游戏测试、存储集成或部署验证，因为相应实现尚不存在。

## 2. pi 实际加载与调用

工作目录为仓库下的 `apps/gunsnglory/`。通过以下实际命令执行只读检查；关闭扩展、skill 等发现，保留 AGENTS.md 上下文加载，仅开放 `read` 工具：

```sh
pi --no-extensions --no-skills --no-prompt-templates --no-themes \
  --no-session --no-approve --offline --tools read --mode json \
  -p '这是一次只读的 AGENTS.md 实际加载验证，不是开发任务。请先列出启动上下文中已经加载的 AGENTS.md 文件路径，确认其中有当前应用的 AGENTS.md；不要通过 read 读取 AGENTS.md 来代替启动加载。然后实际调用 read 工具读取 docs/architecture.md，报告读取到的标题和三个模块名称。最后依据已加载的应用约束，逐项回答：实时战斗在哪里运行；后端职责是什么；存储端口与逐帧步进分别同步还是异步；实验能否写正式档案；开发CLI/MCP后需要怎样通过pi验证。不要修改文件、运行命令或联系其他服务。' \
  > /tmp/gunsnglory-pi-context-check.jsonl \
  2> /tmp/gunsnglory-pi-context-check.stderr
```

这里的 `--offline` 关闭 pi 启动时的更新等网络操作，不代表推理使用离线模型；调用使用已有模型配置。读取权限限定为该次检查的工具配置，没有安装或修改 pi 的扩展、skill 或项目设置。

最终运行退出码为 0，stderr 为空。JSON 事件记录包含一次真实工具调用：

```json
{"toolName":"read","args":{"path":"docs/architecture.md","offset":1,"limit":2000}}
{"toolName":"read","isError":false}
```

模型返回确认了启动上下文中的根 AGENTS.md 与当前应用 AGENTS.md；本次没有对 AGENTS.md 发起 `read` 调用。为避免把本机目录固化进项目，下面将返回路径归一为仓库相对路径：

```text
已加载：AGENTS.md
已加载：apps/gunsnglory/AGENTS.md
实际读取标题：游戏架构设计
模块：core、application、ports
实时战斗：浏览器
后端：档案、内容资源管理、批量模拟
存储端口：异步；逐帧步进：同步
实验：不写正式进度、高分或解锁状态
后续 CLI/MCP：需要 pi 加载入口并完成真实调用，保留命令与关键输出
```

该记录证明本批上下文文档可被 pi 加载并被用于真实只读调用，不证明未来游戏接口或 CLI/MCP 已实现。未来每个新增 agent 入口仍需验证自身调用链。

## 3. 提交与成品范围

2026-10-26 的首次交付采用独立功能分支 `codex/gunsnglory-architecture-docs`。2026-10-27 按用户要求将本地及远端分支重命名为 `gunsnglory`，后续实现以该分支为集成分支。未合并 master、登记导航或发布游戏。Markdown 成品按仓库相对路径复制到 `/tmp/var/wishflow-tools/`；精确文件和提交以 Git 历史为准。

## 4. 2026-10-27：Matt 文档原则复核与讨论稿

本轮核对仓库内的 `writing-for-agents`、`codebase-design`、`domain-modeling`，并参考 `to-spec`、`to-tickets` 与 `implement-spec` 的规格、纵向切片和单集成分支要求。没有调用发布 Issue 或执行游戏实现的流程。

已完成产品规格与领域词汇的职责拆分、AGENTS 条件式指针与约束精简、时间随机规则去重，以及 `gunsnglory` 分支约定。三个公共 Module 与首批纵向切片是等待用户确认的候选；旧技术布局及阶段表明确标为待收敛，不报告整套架构已完成确认。

本轮检查了 10 份 Markdown 的相对链接、围栏与尾空白，`CLAUDE.md` 仍只导入 AGENTS；差异检查通过。首次 pi 检查发现根默认分支规则可能产生歧义，补充明确的用户指定优先规则后再次运行：

```sh
pi --no-extensions --no-skills --no-prompt-templates --no-themes \
  --no-session --no-approve --offline --tools read --mode json \
  -p '只读验证修订后的 AGENTS.md。列出启动已加载的两份 AGENTS.md，不用 read 读取它们代替启动加载。实际 read docs/spec.md 和 docs/architecture.md；说明后续任务分支应从哪里创建、为何不同于根规则，以及 Game/Progress/Experiments 是候选还是已确认。不要修改文件或运行命令。' \
  > /tmp/gunsnglory-pi-matt-doc-check-final.jsonl \
  2> /tmp/gunsnglory-pi-matt-doc-check-final.stderr
```

工作目录为应用目录；退出码 0，stderr 为空。日志确认两次真实 `read` 均返回 `isError: false`，没有使用 `read` 补读 AGENTS 代替启动加载。返回路径在下列摘录中归一为仓库相对路径：

```text
启动加载：AGENTS.md、apps/gunsnglory/AGENTS.md
实际读取：apps/gunsnglory/docs/spec.md、apps/gunsnglory/docs/architecture.md
后续任务：基于 gunsnglory 最新已验证提交创建 worktree
规则优先：本应用用户指定优先于根默认分支规则
Game / Progress / Experiments：候选，尚未确认
```

这是文档与上下文加载验证，不是游戏、存储或模拟实现验证。实现尚不存在，未运行相应构建、行为测试、真实介质测试或部署。

## 5. 2026-10-27：确认后统一契约与任务图

用户明确接受 Game、Progress、Experiments 三个公共深 Module，以及首五个纵向小切片的粒度。本轮移除旧技术层级和 P 阶段执行方案，统一公共 Interface、内部存储 Seam、内容与运行数据归属，并将规格及阅读指针更新为已确认状态。

实施任务图列出 T01–T26、B01–B05，并为完整内容定义逐项实例化的行为模板。27 条用户故事都有验收责任映射；具名任务的已列出依赖检查无环，内容模板实例化后仍须检查新增依赖。当时所有游戏任务仍未实现。

交叉审查补齐了三项契约：独立数值准备与普通开局复用同一实现；浏览器和 Node runner 有界让出以响应取消；回放使用新会话身份并拒绝正式结算。任务审查另补齐声音设置恢复、多波转场、生成与拾取的责任，首个单场景不依赖后续数值编辑能力。

### 文档与真实上下文检查

- 检查 10 份 Markdown、55 个相对文件链接、代码围栏、尾空白及 CLAUDE 单行导入。
- 检查旧分层、未确认状态和旧任务编号不再作为当前契约；历史验证记录保留其时间语境。
- 检查 27 条故事映射、具名任务依赖、Module 数据归属和错误/取消语义。
- 提交前执行 `git diff --check` 和暂存差异检查，只提交本应用文档。

在应用目录通过下列命令真实加载上下文并读取文档：

```sh
pi --no-extensions --no-skills --no-prompt-templates --no-themes \
  --no-session --no-approve --offline --tools read --mode json \
  -p '这是只读的最终文档验收，不是游戏实现任务。先列出启动上下文已加载的仓库与应用 AGENTS.md，不要通过 read 读取它们代替启动加载。按照应用指针实际 read docs/architecture.md、docs/implementation-plan.md 和 docs/spec.md。依据文档回答：公共 Module 与主要测试 Seam 是否已确认，分别是什么；普通意图是否需要调用者提供帧号；保存数值方案如何获得完整基线而不创建战局；替换存储时谁承担内部修订及重试；首五任务是什么且当前首个可执行任务是谁；任务分支基于哪里；是否已实现游戏。给出读取标题与结论，不修改文件、不运行命令。' \
  > /tmp/gunsnglory-pi-approved-design.jsonl \
  2> /tmp/gunsnglory-pi-approved-design.stderr
```

退出码为 0，stderr 为空。日志中三次真实 read 分别读取架构、任务图和规格，均为 `isError: false`，未使用 read 补读 AGENTS。关键返回归一如下：

```text
启动加载：仓库 AGENTS.md、apps/gunsnglory/AGENTS.md
实际读取：游戏架构设计、Guns’n’Glory 实施任务图、Guns’n’Glory 产品规格
公共 Module 与行为测试 Seam：Game / Progress / Experiments，已确认
普通意图：调用者不提供帧号，由 Game 内部排序
数值方案：Game.prepare 返回完整参数与精确版本，不创建战局或取样
正式保存：Progress 内部处理修订、合并与重试
首五切片：展示选中 → 单波移动扣命 → 击杀得金 → 胜败重开 → 保存恢复
首个可执行任务：T01；任务基于 gunsnglory 最新已验收提交
游戏实现：尚未开始
```

以上验证覆盖文档及 agent 上下文使用。没有游戏代码，因此未运行游戏构建、行为测试、真实存储或线上部署检查。Markdown 成品使用 cp 按相对路径复制到 `/tmp/var/wishflow-tools/`，并逐文件核对内容一致。

## 6. T01 可玩切片验收

交付范围是 Cow Gulch 单位选择预览：读取反解析的首关地图与图集，绘制固定 16:9 Canvas，支持鼠标/触屏选中枪手、空地或按钮取消，并沿用共享站点语言状态。当前没有波次、战斗、结算或进度存档。

| 检查 | 实际结果 |
| --- | --- |
| `./scripts/install.sh` | 冻结安装成功。 |
| `pnpm run test:ci` | TypeScript 检查、8 个单元/内容/视口测试、生产构建、2 个 Playwright 场景全部通过。 |
| CI Chrome 路径 | 设置 `CHROME_EXEC` 后重新运行 2 个浏览器场景，全部通过。 |
| `pnpm run test:catalog` | 14 个共享站点与发布分类测试全部通过。 |
| catalog 触发的应用测试矩阵 | Guns’n’Glory、Duolingo Avatar、Ball Growth Lab、3D Objects、Pet 五个已登记应用的 `test:ci` 均通过。 |
| `pnpm run build:site` | 所有已登记应用构建成功；完整 `_site` 通过目录与产物校验。 |
| Codex 内置浏览器本地实测 | 从导航卡片进入 `/gunsnglory/`，地图和枪手可见；选择显示 `Gunslinger selected · Cell (9, 9)`，取消恢复未选状态；共享语言切换后中文文案与选中/取消行为正常。 |
| Codex 内置浏览器公网实测 | 从导航页进入正式 `/gunsnglory/`；当共享浮动宠物已保存在地图中心时，地图仍可选中枪手并显示 `Cell (9, 9)`，取消选择正常；中英文切换及两种语言下选中/取消均正常。测试后恢复原中文偏好，没有改动宠物保存位置。 |
| 正式 CI 与发布 | Guns’n’Glory 测试、共享检查、Cloudflare Pages 和 GitHub Pages 部署均通过；[发布 workflow](https://github.com/wishflow/wishflow-tools/actions/runs/40461901062)。 |

本地复跑提示：多个应用的 Playwright 配置复用 `4173` 端口，先停止旧预览再启动测试矩阵，避免测试连到错误应用。Duolingo Avatar 的 Python 依赖要求较新版本；本机默认 Python 3.9 不满足，需要显式用 Python 3.11 建立应用自己的 `.venv`，不改全局 Python；仓库 CI 使用 Python 3.12。

CI 依赖策略：首次 GitHub workflow 因 `postcss@8.5.32` 发布不足 24 小时而拒绝安装；随后尝试把 `postcss` 固定到仓库内已有的 `8.5.29`，但 CI 的 pnpm 12 不再读取 `package.json` 中的 `pnpm.overrides`，冻结安装因此报告配置与锁文件不匹配。现已将 `overrides` 移到应用自己的 `pnpm-workspace.yaml`，并沿用其他独立应用的 `allowBuilds.esbuild` 配置。pnpm 12.15.0 的 supply-chain 检查、冻结安装及完整 `test:ci` 均通过。

公网实测发现，共享站点的浮动宠物位置保存在浏览器中；当宠物位于地图上时，它会遮住枪手并截获点击。游戏画布已置于该叠层之上，保留宠物原位置并让地图操作优先。正式 CI 测试及 Cloudflare Pages、GitHub Pages 部署通过；Codex 内置浏览器在这一保存位置下验证地图选中/取消和中英切换均正常。触屏选择与取消由 `test:e2e` 的移动端场景验证。

## 7. T02 单个拓荒者离场扣命验收

交付范围是 Cow Gulch 首波中的一个男性拓荒者样本：开波前不生成，确认后从地图生成点进入；按反解析路线和原版时间步长移动，抵达出口后扣 1 点生命。样本使用 APK 的 `pioneer_male` mdpi 图集。完整首波调度、攻击、结算和存档仍未实现。

自动验证覆盖固定随机种子与启动记录、Java `Random` 的有界抽样、不同战局隔离、`0–100 ms` 可变步长、每步截断、首个路线转向、出口扣命仅一次，以及观察不推进游戏时间或随机流。

| 检查 | 实际结果 |
| --- | --- |
| `./scripts/install.sh` | 按锁文件安装成功；未改依赖清单或锁文件。 |
| `pnpm run test:ci` | TypeScript 检查通过；13 项内容、Game 与视口测试通过；Vite 生产构建通过；4 个 Playwright 场景通过，覆盖桌面开波和 Canvas 变化、触屏选择与开波。 |
| Codex 内置浏览器本地实测 | 在 `http://127.0.0.1:4173/` 检查中文待开波状态；鼠标确认后画布出现并移动拓荒者。约 60 秒内，状态显示“第 1 波完成 · 生命 49 · 逃脱 1”。切换到英文显示 `Wave 1 complete · Lives 49 · Escaped 1`，再恢复原中文偏好。 |
| 变更范围 | 仅修改 Guns’n’Glory 应用代码、T02 测试和任务/验证文档；没有新增依赖、存档或发布。 |

Playwright 的触屏场景仅覆盖手机视口下触摸开波；完整路线和扣命由确定性 Game 行为测试及 Codex 内置浏览器实测覆盖。

## 8. T03 单单位击杀与现金奖励验收

交付范围限定为 Cow Gulch 的一名枪手、一名男性拓荒者和普通投射物。依据已逆向的武器、单位、敌人和首波数据，验证攻击范围、半装填初始冷却、投射物飞行、伤害截断、死亡动画、一次性现金奖励；不实现完整武器系统、波次调度或正式结算。

Game 公共行为测试覆盖射程边界、同分目标的稳定次序、非致命伤害、击杀事件与现金，以及相同启动记录和步进输入的可重复结果；T02 无战斗离场场景仍验证扣命一次。Playwright 覆盖 4× 倍速下开始波次、击败拓荒者、显示奖励和现金更新。

**调试记录：** T03 加入攻击后，T02 的固定等待截图用例会在 4× 下等到敌人被击败并消失，画布恢复到近似初态；现改为等待波次完成与奖励值。另以 3 秒主线程停顿模拟卡帧，复现过补进多个逻辑步后击杀提示丢失；浏览器驱动现合并同一显示帧推进期间收到的 Game 事件，Playwright 回归通过。

| 检查 | 实际结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、33 项单元测试、生产构建和 10 个 Playwright 场景。 |
| 死亡条件变异检查 | 在 `/tmp` 临时副本中反转死亡判断；击杀/奖励公共行为测试按预期失败，证明该测试能检测此回归。原工作树未被变异。 |
| Codex 内置浏览器本地实测 | 在 `http://127.0.0.1:4173/` 用中文启动 Cow Gulch 样本并调到 4×；页面显示“第 1 波完成 · 生命 50 · 逃脱 0 · 击败 1 · 现金 $66”和“拓荒者被击败 · +$1”。英文说明及结果正常，再恢复中文和 1×。 |
| GitHub Actions 与部署 | [workflow 40515083324](https://github.com/wishflow/wishflow-tools/actions/runs/40515083324) 对 commit `a095873` 完成且成功；Guns’n’Glory 测试、Cloudflare Pages 与 GitHub Pages 部署通过。Worker 未触发（本次未改 Worker）。 |
| Codex 内置浏览器公网实测 | 刷新 `https://wishflow-tools.pages.dev/gunsnglory/` 后，中文说明及 65 初始现金可见；调至 4×并启动样本，显示“第 1 波完成 · 生命 50 · 逃脱 0 · 击败 1 · 现金 $66”与“拓荒者被击败 · +$1”。测试后恢复原有中文和 1× 设置。 |

## 9. T04 胜败结算与干净重开验收

交付范围是单波开发样例的胜利/败北结算以及重开。结算显示波次状态、现金、画面分数和原版高分文件候选值；候选值明确标注尚未保存。T05 才负责正式档案、进度和高分写入。

Game 行为测试验证生命耗尽优先级、结算只发生一次、胜败两种结果、分数舍入，以及相同随机种子重开后恢复初态并关闭旧战局。浏览器测试还覆盖中英文切换、键盘焦点、手机触屏重开和 `pagehide` 关闭。

| 检查 | 实际结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、36 项单元/规则测试、Vite 生产构建、14 个 Playwright 场景。 |
| Codex 内置浏览器本地胜利实测 | 在 `http://127.0.0.1:4174/` 调至 4× 并启动样例；显示 Victory、Lives 50、Escaped 0、Defeated 1、Cash $66、画面分数 $50、高分候选 $50。结算焦点落在重开按钮。 |
| Codex 内置浏览器本地败北实测 | 重开后启动单生命样例；显示 Defeat、Lives 0、Escaped 1、Defeated 0、Cash $65、画面分数 $49、高分候选 $48。 |
| 窄屏实测 | 内置浏览器 390×844 视口下，标准样例胜利结算正常显示；Canvas 比例 1.786，页面宽度为视口宽度 390px，结算面板左右边界约为 45px 和 345px。Playwright 的触屏用例以 `hasTouch` 和 `tap()` 验证结算及重开。 |
| 浏览器运行时 | 实测期间没有捕获到 console error；将本地倍速恢复为 1×，恢复默认视口。 |
| 集成分支与提交 | `2684438` 已 fast-forward 到 `gunsnglory` 和 `master`。 |
| GitHub Actions 与 Pages | [workflow 40524750429](https://github.com/wishflow/wishflow-tools/actions/runs/40524750429) 成功；Guns’n’Glory 与共享站点测试通过，Cloudflare Pages、GitHub Pages 部署通过。Worker 未触发（本次未改 Worker）。 |
| Codex 内置浏览器公网实测 | 刷新 `https://wishflow-tools.pages.dev/gunsnglory/` 后，中文标准样例显示胜利、50 条命、0 逃脱、击败 1 名、现金 $66、画面分数 $50、高分候选 $50；单生命样例显示败北、0 条命、逃脱 1 名、现金 $65、画面分数 $49、高分候选 $48。测试后刷新回标准样例，恢复原中文和 1×，结算页面无 console error。 |
| 交互观察 | 公网浏览器保存的 Usagi 浮层会随视口覆盖不同控件：此前桌面视口中段覆盖倍速滑杆，T06 的 390×844 视口中覆盖调试败北按钮。当前截图中地图和拖动区域未被覆盖；遮挡下鼠标/触屏命中仍未验证，作为共享页面叠层问题单独跟进。 |

## 10. T05 样本结算档案验收

本切片只将已标记支持正式结算的 Cow Gulch 单波样本写入档案，并不表示完整关卡或战役已经完成。正式终局记录包含会话、场景、模式和波次标识；Progress 将胜利样本的最高分及完成标记写入默认档案。调试败北样本不写档。未完成战局不持久化，刷新后从初态开始。

| 检查 | 实际结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、43 项单元测试、Vite 生产构建、17 个 Playwright 场景。 |
| 双 Adapter 契约 | 内存和真实 IndexedDB 均执行相同 `ProfileRepository` 契约；验证新建、往返、条件写入并发、冲突、相同操作重试幂等、同 ID 不同内容拒绝。 |
| 旧档兼容 | Playwright 以旧 `schemaVersion: 1` 档案写入 `soundEnabled: false`，保存倍速后转为格式 2；既有声音字段保留，刷新后倍速恢复。 |
| 实际刷新行为 | Playwright 在 Cow Gulch 波次进行中刷新，验证回到 Wave 1 初态且档案仍无结算；完成样本后验证最高分 $50 与完成标记在刷新后仍存在。 |
| 实际介质失败 | Playwright 在档案 `put` 后中止真实 IndexedDB 读写事务；界面显示“Result is not saved”，提供重试；重试成功后档案只登记一份结算。 |
| 调试结果隔离 | Progress 拒绝 debug、experiment、replay 模式；实际一条命败北样本显示为调试结算，不写入档案。 |
| Codex 内置浏览器本地实测 | `http://127.0.0.1:5174/` 设为 4× 启动 Cow Gulch 样本，画面显示胜利、Cash $66、Displayed score $50、High-score saved $50、Result saved to this browser、Cow Gulch sample complete · Best $50。切换中文后各项结算和档案状态正确翻译。 |
| 公网结算与刷新 | 发布后在 `https://wishflow-tools.pages.dev/gunsnglory/` 以 4× 运行样本，胜利结算显示已保存最高分 $50；刷新后仍显示样本已完成和最高分 $50。4× 设置也经刷新恢复，验收结束后恢复为原先的 1×。 |
| 调试败北隔离 | 公网一条生命败北样本显示“调试结果 · 不会写入已保存档案”；再次刷新后，胜利样本完成状态和最高分 $50 仍保留。 |
| 发布流水线 | [workflow 40535910442](https://github.com/wishflow/wishflow-tools/actions/runs/40535910442) 成功；Guns’n’Glory 与共享站点测试通过，Cloudflare Pages 和 GitHub Pages 部署通过，Worker 未触发。 |
| 发布状态 | T05 已合入本地 `gunsnglory` 与 `master`；`master` 已推送，线上行为已按上述路径实测。 |

## 11. T06 拖动单位与地形碰撞验收

本切片允许玩家在 Cow Gulch 拖动枪手，按指针方向连续移动；以原始地图碰撞层阻挡不可通行地形，释放、取消或失去指针捕获后停止。进度和 IndexedDB 档案格式不变。

实现按原版 APK（`com.hg.gunsandgloryfree` 1.8.6）的静态反编译结果核对：`GunsAndGloryThread` 的拖动容差为 20 个逻辑像素，移动命令传递指针相对单位的位置方向；`GameObjectUnit` 按单位速度归一化方向，使用不超过 100 ms 的时间步长移动，并对碰撞矩形四角检查地形，分别测试横纵轴以允许沿障碍滑动。枪手速度为 1500 fine units/100 ms；近距离停止阈值对应两个方向分量均小于 10 个逻辑像素。`BackgroundMap` 将原始 TDM 地形码映射到阻挡层，非空街道覆盖层允许通过；Cow Gulch 的 7680 fine units/格原始网格由场景内容提供给 Game。此处是对 Android 反编译逻辑的复现，不代表已通过原版运行时比对。

Game 行为测试覆盖速度、移动位置、释放、无选择与非法坐标拒绝、清除选择停止、墙体阻挡、障碍边缘滑动、桥面放行及相同意图和时间序列的确定性。Playwright 覆盖鼠标拖动到地形边界、`pointercancel`、捕获丢失及真实触屏拖动释放。

| 检查 | 实际结果 |
| --- | --- |
| `pnpm run test:ci` | 通过：TypeScript 检查、48 项单元测试、Vite 生产构建及 20 个 Playwright 场景；含 3 个 T06 桌面/触屏输入场景。 |
| Codex 内置浏览器本地实测 | 在 `http://127.0.0.1:5174/` 以中文及原有 4× 设置启动 Cow Gulch 样本，鼠标拖动枪手后看到其从初始位置向峡谷壁移动并停在壁边；样本随即完成。最高分仍为 $50，速度恢复为 4×，浏览器控制台无错误。释放后的稳定状态由 Playwright Canvas 像素回归验证。 |
| 变更边界 | 只增加首图枪手移动与碰撞规则；没有修改 Progress、存档结构、关卡路线或资源贴图。 |
| 集成分支与提交 | `db7283d` 已快进合入本地 `gunsnglory` 和 `master`。 |
| GitHub Actions 与发布 | [workflow 40547256881](https://github.com/wishflow/wishflow-tools/actions/runs/40547256881) 成功；Guns’n’Glory 测试、共享站点检查、Cloudflare Pages 和 GitHub Pages 部署均通过，Worker 未触发。 |
| Codex 内置浏览器公网实测 | 刷新 `https://wishflow-tools.pages.dev/gunsnglory/` 后，以 4× 在 Cow Gulch 未开波样本中连续鼠标拖动枪手至右侧墙边；状态停在 `Cell (12, 8)`，再向墙外拖动仍不能穿过，释放后 Canvas 稳定。保存最高分仍为 $50，未启动战斗或写入新结算。将速度恢复至原有 1×、重载回未选择单位的初态，并恢复浏览器视口；控制台无错误。 |
| 手机视口与触屏 | 内置浏览器在 390×844 视口下检查地图比例和 HUD 换行；Usagi 浮层覆盖调试败北按钮，但未覆盖地图拖动区。触屏拖动、释放及状态由同一发布提交的 Playwright 移动端真实触摸场景验证。检查后恢复内置浏览器视口。 |

## 12. T07 招募 Gunslinger 验收

本切片增加首关 Gunslinger 的招募报价（$75）、确认操作、余额拒绝、生成池计数和幂等命令。价格来自 Guns’n’Glory FREE 1.8.6 的 `GameDesignData.unitDataDesperado[0]`；原版 `GameObjectUnit.hire()` 扣除 `costs` 并调用 `SpawnPoolManager.addUnitToSpawnPool()`，单位由匹配的 `GameObjectSpawnLocation` 后续生成。Cow Gulch 原始地图没有 tile 112–114 的酒馆、堡垒或 tipi 生成点，因此本切片只把招募结果保留在生成池，不把单位摆到未经证据支持的地图位置。

Cow Gulch 的正式样本初始现金为 $65，低于原版 $75 报价；页面保留可操作的招募按钮，点击后明确显示所需与现有现金，现金和生成池不变。成功路径通过 Game 公共 Interface 的 $75 余额夹具验证。购买只属于当前未完成战局；不写入 Progress 或 IndexedDB，重开会恢复 $65 和空生成池。

| 检查 | 实际结果 |
| --- | --- |
| `pnpm run test:ci` | 通过：53 项单元测试、Vite 生产构建、22 个 Playwright 场景；包含资金刚好足够、余额不足无部分扣款、重复命令去重、不同命令分别扣款、命令 ID 与载荷冲突拒绝、重开清空生成池。 |
| Playwright 桌面与触屏 | 桌面核对 $75 报价、$65 余额拒绝、现金与生成池保持不变及中英文文案；390×844 触屏视口可操作招募并获得同一拒绝结果。 |
| Codex 内置浏览器本地实测 | 在 `http://127.0.0.1:5174/` 查看 Cow Gulch 地图和 HUD，点击“招募枪手 · $75”后显示“现金不足，无法招募枪手：需要 $75，当前 $65”；现金仍为 $65、预备单位仍为空。切换到英文确认 `Not enough cash for Gunslinger: need $75, have $65`，然后恢复原中文偏好；没有启动波次或写入结算。 |
| 存档边界 | 未修改 IndexedDB schema、Progress 或正式结算流程；招募只存在于 GameSession。 |
| 集成分支与提交 | `832a7d9` 已快进合入本地 `gunsnglory` 和 `master`；`master` 已推送至 origin。 |
| GitHub Actions 与发布 | [workflow 40555388204](https://github.com/wishflow/wishflow-tools/actions/runs/40555388204) 成功；Guns’n’Glory 与共享站点测试通过，Cloudflare Pages 和 GitHub Pages 部署通过，Worker 未触发。 |
| Codex 内置浏览器公网实测 | 刷新 `https://wishflow-tools.pages.dev/gunsnglory/` 后看到 T07 招募控件；Cow Gulch 初始现金 $65，点击“招募枪手 · $75”显示“现金不足，无法招募枪手：需要 $75，当前 $65”，现金未扣、预备单位为空。没有启动战斗或写入结算。 |

## 13. T08 升级 Cow Gulch Gunslinger

升级属性来自 APK 1.8.6 的 `GameDesignData.unitDataDesperado` 后续等级数据：等级 0 的移动速度为 1500 fine units/100 ms、普通装填 500 ms、特殊装填 1500 ms；等级 1 升级价 $25，移动速度 1750、普通装填 400 ms、特殊装填 1250 ms，伤害 140 与射程 38400 不变。原版 `GameObjectUnit.isUpgradePossible(max)` 同时受关卡 `maxUpgrades` 与单位数据等级数限制；Cow Gulch 的 `maxUpgrades` 为 0，因此正式 Cow Gulch 样本必须保持不可升级。

为验证升级行为而不篡改正式关卡，浏览器额外提供明确标注的 debug rules sample：复用 Cow Gulch 地图与 Gunslinger，升级上限为 1、初始现金 $25，运行模式为 debug，且不支持正式结算。成功后扣款、升级等级、移动速度、武器与冷却在 Game 内一起更新；余额不足时不部分扣款；相同命令重试不会再次扣款。此样本不写入 Progress / IndexedDB，返回 Cow Gulch 会重新打开其 $65、升级上限 0 的标准状态。

| 检查 | 实际结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、57 项单元测试、Vite 生产构建和 24 个 Playwright 场景。新增覆盖升级价格与扣款、命令重试幂等、余额不足无部分变更、原关卡上限、移动速度、普通攻击冷却、桌面取消/确认及 390×844 触屏操作。 |
| 余额边界变异检查 | 临时将“现金少于价格才拒绝”改为“现金少于或等于价格就拒绝”；两个升级测试按预期失败，证明刚好 $25 的成功路径受测试保护。源文件已恢复后继续验证。 |
| 仓库集成验证 | `pnpm run test:catalog` 的 14 项测试通过；冻结安装登记应用依赖后，`pnpm run build:site` 完整构建通过，包含所有静态应用。 |
| Codex 内置浏览器本地实测 | `http://127.0.0.1:5174/` 中打开调试规则样本，选择枪手并核对升级框：等级 0→1、速度 1500→1750、普通装填 500→400 ms、特殊装填 1500→1250 ms、价格/现金 $25。取消后现金未变；确认后余额为 $0、显示升至等级 1。档案高分仍为 $50；返回原样本后现金恢复 $65，Cow Gulch 升级上限仍为 0。未开始波次或结算。 |
| 集成分支与提交 | `9fcf8db` 已快进合入本地 `gunsnglory` 和 `master`。 |
| GitHub Actions 与发布 | [workflow 40563999941](https://github.com/wishflow/wishflow-tools/actions/runs/40563999941) 成功；Guns’n’Glory 测试、共享站点检查、Cloudflare Pages 和 GitHub Pages 部署均通过，Worker 未触发。 |
| Codex 内置浏览器公网实测 | 刷新 `https://wishflow-tools.pages.dev/gunsnglory/` 后打开升级规则调试样本，点击画布中心选中枪手，确认升级框显示等级 0→1、速度 1500→1750、伤害与射程不变、普通装填 500→400 ms、特殊装填 1500→1250 ms、价格/现金 $25。取消后现金仍为 $25；再次确认后现金为 $0，界面显示升至等级 1。档案最高分仍为 $50；返回正式 Cow Gulch 后现金为 $65、未选择单位且正式升级上限为 0。全程未开始波次或正式结算。 |


## 14. T09 暂停恢复及后台返回验收

T09 将暂停状态纳入 `Game` 的公开会话行为，并由浏览器控制处理手动暂停、后台自动暂停和返回。暂停期间帧、战斗时间与画面冻结，游戏意图不入队；恢复时重设浏览器计时基准，不追补后台经过的时间。人工暂停在切换到后台再返回后仍保持暂停；后台触发的暂停则在页面恢复可见时自动恢复。未暂停时，只有活动战斗或单位移动阶段才能手动暂停；进入暂停状态后，恢复按钮保持可用。

| 检查 | 结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、58 项单元测试、Vite 生产构建及 27 个 Playwright 场景。新增 3 个 T09 场景覆盖暂停画面冻结、手动暂停的后台往返、后台自动暂停与恢复、以及 390×844 触屏操作。 |
| 暂停规则变异检查 | 临时反转 Game 的暂停推进保护后，专门的暂停回归测试按预期失败；文件已自动恢复。 |
| `pnpm run test:catalog` 与 `pnpm run build:site` | 通过：14 项仓库目录/变更分类测试通过；共享站点及全部登记应用完成生产构建。 |
| Codex 内置浏览器本地实测 | 在 `http://127.0.0.1:5179/` 的升级规则调试样本中以 4× 开始单个敌人，点击暂停后显示“战斗已暂停。”和“继续战斗”；等待后画面保持不变，点击继续后恢复“暂停战斗”控件，画面重新推进。 |
| 集成与部署 | `e6b1105` 已快进合入本地 `gunsnglory` 和 `master` 并推送。 [GitHub Actions workflow 40569651906](https://github.com/wishflow/wishflow-tools/actions/runs/40569651906) 成功；Guns’n’Glory 测试、共享站点检查、Cloudflare Pages 和 GitHub Pages 部署通过，Worker 未触发。 |
| Codex 内置浏览器公网实测 | 刷新 `https://wishflow-tools.pages.dev/gunsnglory/`，打开不写入正式档案的升级规则调试样本并开始一个拓荒者。暂停后状态提示和“继续战斗”可见，等待 500 ms 后画面不变；恢复后提示消失、按钮回到“暂停战斗”，等待后战斗画面继续变化。档案最高分仍显示 $50；未完成正式关卡或写入结算。 |

## 15. T10 触屏缩放与命中验收

T10 在表现层加入临时地图相机：初始视图保持原地图适配；双指以两指中点为焦点缩放和平移，缩放限制为 1×–3×，相机保持在地图边界内。绘制与指针命中共用同一 `MapViewport` 变换。单指点按选择枪手、拖动移动；单指拖动转为多指时立即停止单位移动，直到全部触点释放前不再把剩余手指转换成游戏命令。相机不写入 Game 规则、Progress 或 IndexedDB，重开场景时恢复初始视图。

| 检查 | 实际结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 修复缩放上限后通过：TypeScript 检查、61 项单元测试、Vite 生产构建和 29 个 Playwright 场景。新增测试验证焦点保持、相机边界/设备像素、双指缩放后的命中，以及拖动转多指时停止并锁定剩余触点。 |
| 视口变异检查 | 临时把最大缩放从 3× 改为 4×，边界测试按预期以 `4 !== 3` 失败，证明上限回归可检出。变异清理失误曾使临时值进入 `adb016a`，工作流 `40620136843` 因此失败且没有部署；修复提交 `faf018c` 恢复 3× 后，完整 CI 与部署工作流通过。 |
| 仓库集成构建 | `pnpm run test:catalog` 的 14 项测试通过；运行 `pnpm run install:apps` 后，`pnpm run build:site` 完整构建所有登记应用通过。 |
| Codex 内置浏览器本地实测 | 本地页面 Canvas 为 1022×574 CSS 像素（外框 1024×576）；地图完整显示在画布内。点击画布选中枪手，页面持续显示 `Gunslinger selected · Cell (9, 9)`。 |
| Codex 内置浏览器公网实测 | 修复版发布后打开 `https://wishflow-tools.pages.dev/gunsnglory/`；桌面 Canvas 为 1022×574，点击枪手后显示“已选择枪手 · Cell (9, 9)”。390×844 窄屏检查中 Canvas 为 326.2×182.6，页面内容宽 375px、视口宽 390px，无横向溢出；随后恢复默认视口。检查只选择单位，没有启动战斗或写入新的结算；已有档案仍显示 Cow Gulch 最高分 $50。 |
| 触控与设备边界 | Playwright 移动浏览器通过实际多点触摸事件验证缩放焦点、缩放后命中和多指状态转换。ADB 确认 `emulator-5554` 已启动，Android Studio Device Manager 显示 AVD 在线；但 Codex CUA 未暴露独立 Emulator 窗口，无法在该 AVD 内实际操作游戏，因此真实 Android 触控仍未验证。 |
| 集成提交 | `adb016a` 实现触屏相机；`faf018c` 修复并恢复 3× 上限。两者均已快进合入本地 `gunsnglory` 与 `master`，最终 `master` 提交为 `faf018c`。 |
| GitHub Actions 与发布 | [workflow 40620555023](https://github.com/wishflow/wishflow-tools/actions/runs/40620555023) 成功；Guns’n’Glory CI、共享站点检查、Cloudflare Pages 和 GitHub Pages 部署均通过，Worker 未触发。 |

## 16. T11 单步与只读检查验收

T11 为 `GameSession` 增加暂停态 `singleStep`：它使用同一条 `advance` 规则路径，只执行一次给定时间输入，随后保持暂停；未暂停或已结算会话拒绝单步。浏览器学习控件以 16 ms 为一帧，并只在暂停时可用。检查面板从只读 `GameView` 展示帧号、时间、单位/敌人位置与生命、单位射程和路线点；Canvas 覆盖层按 Cow Gulch 出生偏移、转向格中心与出口绘制路线，同时显示单位射程和对象标签。切换覆盖层只重绘，不调用 Game。

| 检查 | 实际结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、63 项单元测试、Vite 生产构建及 31 个 Playwright 场景。新增规则测试将暂停单步与普通推进结果对照，Game 观察验证攻击中心/严格射程边界，Canvas 测试校验路线段、单位射程及对象标签，移动端场景验证触屏操作。 |
| 单步行为 | Game 测试验证帧号恰增 1、经过时间只增加指定的 37 ms、单步后继续暂停；同随机种子下与普通 `advance(37)` 结果完全一致；未暂停会话拒绝单步。 |
| 检查无副作用 | Playwright 在暂停战局中检查帧、单位、敌人和路线，开启/关闭覆盖层只改变 Canvas 像素；帧号、游戏时间和波次状态保持不变，等待期间画面继续冻结。 |
| Codex 内置浏览器本地实测 | `http://127.0.0.1:5175/` 启动 Cow Gulch 波次并暂停；实测单步前为 Frame 464 / 964 ms，单步后为 Frame 465 / 980 ms，暂停提示仍显示。检查面板显示枪手、拓荒者、严格小于 5.0 格的攻击距离阈值及从出生点到出口的路线；开启覆盖层后画布显示青色路线、黄色射程边界和对象标签，并验证边缘标签未裁切及中英文切换。 |
| 公网内置浏览器实测 | `https://wishflow-tools.pages.dev/gunsnglory/` 加载最新页面；启动 Cow Gulch 波次并暂停，单步前为 Frame 680 / 5851 ms，单步后为 Frame 681 / 5867 ms，仍保持暂停。检查面板和地图覆盖层均正常，页面显示路线、枪手射程圈、拓荒者生命标签及完整只读状态。 |
| 集成与发布 | 提交 `de78951` 快进合入本地 `gunsnglory` 与 `master` 并推送 `origin master`。 [workflow 40625808761](https://github.com/wishflow/wishflow-tools/actions/runs/40625808761) 成功；Guns’n’Glory CI、共享站点检查、GitHub Pages 和 Cloudflare Pages 部署均通过，Worker 未触发。 |

## 17. T12 记录与重放战局

T12 由 Game 记录实际消费的逐帧 `deltaMs` 和按顺序接受的命令；战局达到终局后才允许导出。回放文件固定格式、规则和内容版本及 Java `Random` 初始 seed，包含帧 0、每 120 帧和终局的 SHA-256 状态检查点。导入时从帧 0 创建新的 `replay` 会话并验证检查点和终局；重放结果不写入正式档案。界面通过 JSON 文件显式导入、导出，保留用户已有记录。

| 检查 | 实际结果 |
| --- | --- |
| `pnpm run test:ci` | 通过：TypeScript 检查、64 项单元测试、Vite 生产构建及 32 个 Playwright 场景。新增规则覆盖真实消费帧输入、版本和内容固定、周期/终局检查点、回放会话 ID/模式、结算一致、无正式存档权限及缺版本、损坏输入、摘要不符、结果不符、随机算法不支持、来源模式不支持和内容不可用错误。 |
| 回放 UI 端到端 | Playwright 在 Cow Gulch 正式胜利后下载 JSON，再通过文件输入导回；状态报告核验通过的检查点数量和 Victory。Replay 结算显示不写入档案，正式档案仍为 $50；随后切换中英文确认动态状态正确，导入缺少版本的 JSON 时显示专属错误且保留当前重放结果；重启后重新进行正式胜利结算并成功保存，验证来源正式模式只用于“重新开始”，不会赋予重放正式资格。 |
| Codex 内置浏览器本地实测 | 在本地 Vite 页面以 4× 完成单个正式战斗，下载战局 JSON 后通过可见的“Import replay”按钮选回文件；页面显示 `Replay verified · 4 checkpoints · Victory.`，结算为 Victory、最高分显示候选 $50，状态明确为 `Replay result · not added to the saved profile.`。检查窄屏布局后确认操作按钮单列、没有重复文件选择控件；本地档案仍保持 Cow Gulch $50。 |
| 集成与部署 | `8b4938b` 已快进合入本地 `gunsnglory` 和 `master` 并推送 `origin master`。[GitHub Actions workflow 40631844247](https://github.com/wishflow/wishflow-tools/actions/runs/40631844247) 成功；Guns’n’Glory 测试、共享检查、Cloudflare Pages 和 GitHub Pages 部署均通过，Worker 未触发。Cloudflare Pages 本次部署为 [`7c6dce31.wishflow-tools.pages.dev`](https://7c6dce31.wishflow-tools.pages.dev/gunsnglory/)。 |
| 公网内置浏览器验收 | 在标准地址 `https://wishflow-tools.pages.dev/gunsnglory/` 刷新后验证：以 4× 完成 Cow Gulch 单波胜利，结算为生命 50、逃脱 0、击败 1、现金 $66、分数 $50；导出 JSON 并导入后显示“重放验证通过 · 4 个检查点 · 胜利”，重放结算明确“不写入已保存档案”，档案最高分保持 $50。测试将倍速恢复为 1×；页面无 console error。部署后已打开的旧标签页最初仍显示旧脚本，刷新标准地址后加载新重放面板。 |

## 18. T13 无画面运行单个场景

T13 增加 `Experiments.run()`，通过真实 `Game` 公共 Interface 执行一个固定版本场景。测试策略只观察冻结的玩家可见白名单；Game 开局记录在首帧前校验。运行记录精确区分胜负、预算耗尽、取消、无效输入和执行错误，不读取或修改正式进度。T13 切片本身不含实验 UI 或方案编辑；T14 后续增加了数值方案及比较面板，T15 增加比较保存，T16 增加固定场景的串行批次 CLI。完整边界见[模拟与自动化契约](simulation-and-automation.md#63-t13-当前实现范围)。

| 检查 | 结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、84 项单元测试、Vite 生产构建及 33 个 Playwright 场景。Experiments 覆盖固定 seed 胜利/败北、内容/规则/策略版本不符、未知场景、拒绝 `latest`、帧/模拟时长/实体/墙钟预算、取消与会话关闭、非法意图/策略异常及无效/故障/倒退时钟。 |
| T13 Playwright 浏览器集成 | Chromium 页面动态加载正式 Cow Gulch 内容、Game 和 Experiments Module；经 `Experiments.run()` 得到 Victory、`mode: experiment`、seed 42 和终局现金 $66。单场景行为不依赖 UI、Progress 或 IndexedDB。 |
| `pnpm run test:catalog` | 通过：14 项导航目录、发布分类及静态站输出检查。 |
| `pnpm run install:apps` 与 `pnpm run build:site` | 冻结安装全部登记应用依赖成功，共享站点及全部静态应用构建成功。3D Objects 输出既有的单 chunk 体积提示，其 bundle 检查仍通过。 |
| Codex 内置浏览器本地预览 | 打开 Guns’n’Glory 生产构建预览 `http://127.0.0.1:4174/`；页面正常显示 Cow Gulch、HUD 与现有控制。浏览器 console 的 error/warn 为空。T13 没有新增可见控件，其真实运行已由上一行 Chromium 行为测试核验。 |
| 集成与发布 | `c3c80d6` 已快进合入本地 `gunsnglory` 与 `master`，并推送 `master`。GitHub Actions [40638987841](https://github.com/wishflow/wishflow-tools/actions/runs/40638987841) 以 `success` 完成。重新加载公网标准地址 `https://wishflow-tools.pages.dev/gunsnglory/` 后，内置浏览器显示 Cow Gulch 地图、状态、倍速控件和现有操作；控制台 error/warn 为空。T13 无可见游戏控件，其单场景真实行为由前述 Chromium Playwright 测试覆盖。 |

## 19. Cow Gulch 贴图变体与桥位路线核对

这次视觉差异来自地图数据只选用了每种贴图的首候选，漏掉了原版随机变化图集。原版基础图集和路径几何没有错位；原版逻辑地图仍使用 32×32 方形地格，桥梁是跨格绘制的长方形精灵。

| 检查项 | 结果 |
| --- | --- |
| APK 地图变体逻辑 | JADX 对 BackgroundMap.createVariationMap() 的反编译显示，原版用 Util.random(4) 为符合条件的背景格和道路格选择候选；Util.random(int) 调用 java.util.Random.nextInt(int)。Cow Gulch 的候选范围包括沙地、峡壁、阴影、河岸和道路变体。 |
| 静态图集 | 从 Guns’n’Glory FREE 1.8.6 的 drawable-mdpi-v4 中补入 tiles_desert_var、tiles_canyon_wall_var、tiles_waterside_var、tiles_shadow_var 和 tiles_path_var。逐项与 APK 内 mdpi 资源做字节比较，5 张全部一致。 |
| 稳定网页画面 | 网页地图使用 Java Random 算法与固定种子 0x47524e31 生成一个稳定候选。原版每次加载使用未固定的随机种子，所以网页复现的是原版候选集合中的固定画面，不声称复现某一次 Android 随机结果。 |
| 地图几何 | 17×17、289 个背景绘制命令；31 个道路格、2 个竖桥精灵、1 个横桥精灵和 2 个桥墩。新数据只改图集与裁片选择，不改 TDM、格数、路线、碰撞或坐标变换。 |
| 路线与桥位 | 原版路线从 (-1.5, 10.5) 走到 (4.5, 10.5)，经过竖桥中心 (2.5, 10.5)；随后从 (12.5, 13.5) 到 (12.5, 6.5)，经过横桥中心 (12.5, 9.5)。所以敌人走上桥是原版 TDM 路线的必经行为，不是寻路从峡谷任意穿墙。桥梁绘制在敌人之后，敌人穿越时会被桥面图层覆盖。 |
| 内置浏览器本地检查 | 重新加载 http://127.0.0.1:5186/ 后，Cow Gulch 显示了沙地、峡壁、河岸和道路变体；检查面板展示了原版路线节点。单波样本结束后已重置到 Frame 0，倍速恢复 1×，档案仍显示 Best $50。 |

验证入口：

- [terrain-rendering.test.ts](../tests/terrain-rendering.test.ts) 从 TDM 原始格和 Android 背景整形、随机变体及图集映射重建地图，并逐格对照静态 draw commands；同时锁定道路、桥梁与桥墩数量。
- [content.test.ts](../tests/content.test.ts) 检查路线格落在阴影通道内，并检查两座桥覆盖原版路线中心。
- [game.test.ts](../tests/game.test.ts) 与 [canvas-renderer.test.ts](../tests/canvas-renderer.test.ts) 检查敌人沿 TDM 路线经过出生、转向和出口格，桥位图层绘制在敌人上方，敌人脚底锚点与路线格一致。
- test:ci 通过：TypeScript 检查、87 项单元测试、Vite 生产构建及 33 个 Playwright 桌面/触屏场景。

## 20. T14 比较两套数值方案

T14 在 Game Interface 增加 `prepare()`：返回当前场景完整可调数值、精确内容/规则版本及摘要，不建立战局、不读取时钟、不消耗随机数。Experiments 增加不可变内存方案版本和配对比较；正式开局仍拒绝修改过的数值方案。页面提供 Cow Gulch 拓荒者现金奖励草稿，以及 1、3、5 个配对样本选项。

| 检查 | 结果 |
| --- | --- |
| `pnpm run test:ci` | 通过：TypeScript 检查、92 项单元测试、Vite 生产构建及 35 个 Playwright 场景。 |
| Game 与 Experiments 单测 | 验证准备结果包含升级上限、可选配置的有效默认值、其他数值、版本和摘要且深度冻结；准备不创建 session、不读取随机或时间；篡改摘要无效，正式模式拒绝自定义方案；冻结方案不可原地改写；两边运行使用相同场景、策略和 seed；取消时按所有计划运行计算未完成率。 |
| Playwright 桌面流程 | 使用 seed 42、43、44 完成 3 组配对样本，共 6/6 场运行完成。原版与现金奖励 $5 草稿均为 3 胜、0 败、50 条剩余生命；平均结算现金分别为 $66 与 $70，平均胜利用时均为 10.1 秒，未完成率为 0%。修改输入框不会改写已显示报告；切换中文后方案值、表头和档案状态仍正确。 |
| Playwright 窄屏触控 | 390×844 视口下可触控启动比较并读到报告；页面没有横向溢出，宽指标表在自身容器内滚动。 |
| Codex 内置浏览器实测 | 本地 Vite `http://127.0.0.1:5191/` 中手动启动 3 组比较，看到 6/6 完成、原版 $66/草稿 $70、现金变化 +$1/+$5。桌面和 390px 窄视口截图核对了排版；窄屏页面宽度未超过视口，表格由内部滚动区承载。控制台 error/warn 为空。 |
| Progress 与持久化 | 比较结果未改变正式档案状态，也不写 IndexedDB；方案版本和报告只驻留当前页面内存。持久化由 T15 负责。 |
| 发布状态 | 本轮只提交到本地 `gunsnglory` 集成分支；没有合入 `master` 或推送。按任务图，整体发布在 T25 验收和 T26 登记发布阶段进行，T14 不代表 M1 完成。 |

验证入口：[Game 数值准备测试](../tests/game.test.ts)、[Experiments 方案比较测试](../tests/experiments.test.ts)、[浏览器方案比较测试](../tests/e2e/t14-scheme-comparison.spec.ts)。

## 21. T15 保存并重新打开实验

T15 为不可变数值方案与配对比较报告增加内存和 IndexedDB 仓储。浏览器数据库 `gunsnglory-experiments` 与正式档案数据库分离，按 `schemes`、`comparisons`、`artifacts` 保存方案、摘要和完整报告。摘要与完整报告在同一个 IndexedDB 读写事务中提交；重开时验证摘要、方案引用和报告内容，不重跑样本。该切片不保存 `Experiments.run()` 的单次运行、不续算刷新前尚未结束的比较，也不改变 Progress。

| 检查 | 结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、93 项单元测试、Vite 生产构建和 39 个 Playwright 场景。 |
| 仓储契约与 IndexedDB 集成 | Node 单测让内存仓储通过共享 `ExperimentRepository` 契约；Chromium 再让真实 IndexedDB 仓储通过同一契约。浏览器测试还验证同时间戳记录的稳定倒序分页、跨页游标，以及删除完整报告附件后 `openComparison()` 返回 `corrupt-data`。 |
| 桌面刷新与重开 | 使用 seed 42、43、44 执行 3 组配对样本（6/6 场完成），显示基线结算现金 $66、候选方案 $70。保存后切换中文并刷新；列表重新出现记录，显式选择后打开，报告摘要、方案值及候选现金与刷新前相同，已打开的报告不能重复保存。 |
| 正式档案隔离 | Playwright 在比较前后读取 `gunsnglory-profile` 的默认档案记录并逐字段比较，结果完全一致；T15 只写独立的实验数据库。 |
| 窄屏触控 | 390×844 视口中可触控运行比较、保存并重开；页面无横向溢出。Playwright 流程捕获的 console error、warning 与 pageerror 均为空。 |
| Codex 内置浏览器本地实测 | 在 `http://127.0.0.1:5192/` 手动运行比较、保存、刷新、从列表选择并重开；报告仍显示相同的 3 组样本及 $66/$70 结果。切换站点语言后，保存状态与实验界面文案随之切换为中文。实测截图保存在 `/tmp/var/wishflow-tools/t15-experiment-reopen.png`，不纳入应用资源。 |
| 分支与发布边界 | T15 已完成本地验证；本提交只进入 `gunsnglory` 本地分支，不合并 `master`、不 push。按实施计划，整体发布仍由 T25/T26 门槛控制，T15 不代表 M1 完成。 |

验证入口：[实验仓储共享契约](../tests/experiment-repository-contract.ts)、[内存仓储契约测试](../tests/experiment-repository.test.ts)、[IndexedDB 契约与分页测试](../tests/e2e/t15-indexeddb-contract.spec.ts)、[保存与重开测试](../tests/e2e/t15-experiment-persistence.spec.ts)。

## 22. T16 CLI 串行批次

T16 在 `Experiments` 公共接口增加有界串行批次，并提供固定 Cow Gulch 单波场景的 Node CLI。批次先整体校验，再按输入顺序执行；预算耗尽和单次执行错误作为运行结果分类，取消会保留当前结果和未启动输入。此能力不读取正式档案、IndexedDB 或实验仓库。

| 检查 | 结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、101 项单元测试、Vite 生产构建及 39 个 Playwright 场景。 |
| T16 单元测试 | 8 项通过：批次串行顺序与重复 seed、预算分类、取消后不启动剩余项、执行错误与无效策略区分、整批输入预校验，以及 CLI JSON 版本、预算边界、重复 ID、seed 与 25 项上限。 |
| CLI 成功样例 | `pnpm run simulate:batch -- --input examples/serial-batch.json --output /tmp/var/wishflow-tools/t16-pi-batch-final.json` 退出码 0；3 项计划、3 项启动，seed 42/43/44 均为 victory、终局现金 `$66`，`failureInputs` 与 `notStarted` 均为空。 |
| pi agent 入口实调 | pi 加载根与应用 `AGENTS.md`，通过 bash 实际调用 CLI；pi 退出码 0、stderr 为空，返回同一批次的 3/3 胜利结果，现金均为 `$66`。实际命令如下。 |
| 预算超限 | 使用 `maxFrames=1`、`yieldEveryFrames=1` 的真实 CLI 进程退出码为 1；报告中调度状态为 `completed`（计划项均已处理），`budget-exceeded=1`、停止原因 `max-frames`，失败输入仍保留 seed 42。 |
| SIGINT 取消 | 对 25 项批次设置 `yieldEveryFrames=1`，在运行 350 ms 后发送 SIGINT；进程以 130 退出，报告为 `cancelled`，25 项计划、2 项启动、23 项未启动，已启动项中有 1 项分类为取消。默认让出间隔下 25 项在首次信号前已完成；将让出间隔降为 1 后才形成稳定的进程级取消观察。 |
| 持久化与发布边界 | CLI 只写 JSON 报告文件，不访问正式档案、IndexedDB 或实验仓库。T16 只在本地 `gunsnglory` 集成分支验证；未合并、未 push、未发布。 |

验证入口：[批次调度测试](../tests/serial-batch.test.ts)、[CLI 输入解析测试](../tests/serial-batch-cli-input.test.ts)、[批次示例](../examples/serial-batch.json)、[CLI 实现](../src/cli/run-batch.ts)。

pi 实际加载调用命令（工作目录 `apps/gunsnglory/`）：

```sh
pi --no-extensions --no-skills --no-prompt-templates --no-themes --no-mcp --no-session --approve --offline --tools bash --mode json -p '请用 bash 工具从当前目录真实运行 `pnpm run simulate:batch -- --input examples/serial-batch.json --output /tmp/var/wishflow-tools/t16-pi-batch-final.json`。然后读取该 JSON，仅报告 report.status、plannedRunCount、startedRunCount、每个结果的 runId、终局 outcome 与 finalCash、failureInputs 数及 notStarted 数。不要修改项目文件。'
```

## 23. T17 worker 并行批次

T17 扩展 `Experiments.runBatch()`，以有界 Node worker 并行运行同一批次。并发缺省为 1、上限为 4；worker 线程只在 Node CLI 装配，浏览器构建仍只使用 Game 与 Experiments 的原有实现，不新增依赖。

| 检查 | 结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、108 项单元测试、Vite 生产构建及 39 个 Playwright 场景。 |
| T17 新增行为测试 | 7 项通过：有界调度与输入顺序、串并行结果对照、worker executor 异常归因、并行取消与未启动样本、执行器缺失/并发范围、worker 数上限及 worker 内预算失败输入保留。 |
| 串并行结果一致 | 集成测试分别通过默认串行和 `--workers 2` 运行同一示例，按 `runId` 顺序比较完整结果；规则状态、动作、结算和指标一致。只排除真实墙钟 `wallClockMs` 与运行实例 `sessionId`/`settlementId`。并行报告的 session ID 各自唯一。 |
| Worker 预算与输入上限 | 两个 worker 各触发 `maxFrames=1`；CLI 退出码 1，报告仍为 `completed`（所有计划项均已处理），分类计数 `budget-exceeded=2`，两个原始 seed 和 `max-frames` 原因都保留。`--workers 5` 在读取输入前以退出码 2 拒绝。 |
| Worker 进程取消 | 对 25 项批次以 `--workers 2` 运行并在 800 ms 后向 CLI 发送 SIGINT；进程退出码 130，报告 `cancelled`，25 项计划、8 项启动、2 项活动运行分类为取消、17 项未启动。取消后未再分发新输入。 |
| pi agent 入口实调 | pi 加载根与应用 `AGENTS.md` 后，通过 bash 实际调用 worker 模式；pi 退出码 0、stderr 为空。报告为 `completed`、`maxConcurrency=2`、3/3 项启动，seed 42/43/44 均 victory、终局现金 `$66`，失败和未启动均为 0。实际命令如下。 |
| 存储、依赖与发布边界 | 批次仍不读写正式档案、IndexedDB 或实验仓库。使用 Node 内建 `worker_threads` 和已有 `tsx`，未改 lockfile。T17 只在本地 `gunsnglory` 集成分支验证；未合并、未 push、未发布。 |

验证入口：[批次调度行为测试](../tests/serial-batch.test.ts)、[真实 worker CLI 测试](../tests/serial-batch-parallel.test.ts)、[Node worker 执行器](../src/experiments/node-batch-executor.ts)、[worker 入口](../src/experiments/node-batch-worker.ts)、[批次 CLI](../src/cli/run-batch.ts)。

pi 实际加载调用命令（工作目录 `apps/gunsnglory/`）：

```sh
pi --no-extensions --no-skills --no-prompt-templates --no-themes --no-mcp --no-session --approve --offline --tools bash --mode json -p '请使用 bash 工具从当前应用目录真实运行 `pnpm run simulate:batch -- --input examples/serial-batch.json --workers 2 --output /tmp/var/wishflow-tools/t17-pi-batch.json`。然后用 bash 工具读取该 JSON，只输出 report.status、report.maxConcurrency、plannedRunCount、startedRunCount、每个结果的 runId/outcome/finalCash、failureInputs 数和 notStarted 数。不要修改项目文件。'
```

## 24. T18 档案冲突与恢复

T18 沿用 IndexedDB 数据库版本 1 与档案格式 `schemaVersion: 2`，没有格式迁移或覆盖既有记录。设置保存以本标签页最后一次读取的修订为条件；遇到其他标签页的更新时返回冲突并要求显式重载。临时失败可用原操作重试。损坏档案可以导出原始 JSON；重置会先核对导出快照和当前记录，并且只删除仍被判定为损坏的记录。未知较新格式只允许备份导出。

| 检查 | 结果 |
| --- | --- |
| `pnpm run test:ci` | 通过：TypeScript 类型检查、112 项单元测试、Vite 生产构建及 44 个 Playwright 场景。 |
| Progress 公共行为 | 通过：两个实例读取相同版本后，陈旧设置写入返回 `conflict`；读取最新档案后可保存新选择。设置事务失败后通过 `retrySettings()` 重用原请求。 |
| IndexedDB 多标签页 | 通过：两个真实页面从空档案启动；第一标签页保存 `4×` 后，第二页保存 `0.25×` 得到冲突，点击“重新加载已保存档案”后显示 `4×`。 |
| IndexedDB 临时失败 | 通过：测试中止设置写事务，页面显示失败并提供重试；同一操作重试后设置保存成功。 |
| 损坏档案恢复 | 通过：页面下载文件名为 `gunsnglory-profile-backup.json` 的原记录，测试核对文件内容；确认后只在快照匹配时删除损坏记录并回到空档案。旧快照冲突和有效档案禁止重置均由 Progress 单测覆盖。 |
| IndexedDB 恢复竞争 | 通过：真实 IndexedDB 在备份后被改动时，旧快照重置返回 `conflict`，更新后的损坏记录仍保留。 |
| 未知新版保护 | 通过：`schemaVersion: 99` 可以导出备份，重置按钮不出现，IndexedDB 原记录仍保持不变。 |
| Codex 内置浏览器与发布 | 内置浏览器成功打开本地应用并显示地图、档案状态和倍速控件；状态交互由 Playwright 覆盖。没有发布或对公网执行验收，需按 M1 发布门槛继续推进。 |

验证入口：[Progress 行为测试](../tests/progress.test.ts)、[T05/T18 IndexedDB 浏览器测试](../tests/e2e/t05.spec.ts)、[档案存储契约](storage-contracts.md#4-正式档案契约)。

## 25. T19 内容缺失与版本错误恢复

T19 让 `Game.open()` 接受可选的精确内容版本请求，并将缺失场景、内容版本不可用、规则版本不支持、准备数据损坏和场景不匹配分别返回稳定错误码。版本校验和 `PreparedSetup` 校验均在随机源、会话 ID 与会话状态分配前完成。网页场景切换沿用当前战局记录中的内容版本与 seed；失败时保留原 `GameSession`，显示双语原因，提供重试同一请求或返回原场景的操作。

| 检查 | 结果 |
| --- | --- |
| `pnpm run test:ci` | 通过：TypeScript 检查、114 项单元测试、Vite 生产构建及 44 个 Playwright 场景。 |
| Game 版本错误与原子性 | 通过：请求缺失内容版本、准备数据引用缺失内容版本和不支持的规则版本分别得到 `content-version-unavailable`、`rules-version-unsupported`；拒绝时随机源与 session ID 生成器均未调用。使用精确版本仍可正常开局，记录中的版本与请求一致。独立测试还核对三个浏览器样本 ID 各自解析到注册内容的精确版本。 |
| 场景失败恢复实现 | 通过代码路径复核：加载失败不会替换或关闭原 session；重试保存并复用完全相同的场景、内容版本、seed 与模式；返回会清除错误并保留原战局。若旧战局正在推进，失败后恢复推进循环。 |
| Codex 内置浏览器 | 本地 Vite `http://127.0.0.1:5175/` 手动打开升级规则样本并返回 Cow Gulch，两个场景的地图、状态与控件均正常；中英文切换正确，最后恢复为原英文状态。控制台 error/warn 未发现记录。缺失版本的 UI 分支没有可从产品控件触发的自然输入；该错误在 Game 单测覆盖，浏览器通过有效场景切换验证 session 替换流程。 |
| 持久化与发布边界 | T19 不改 IndexedDB 格式，不替换内容、不删除进度。本轮尚未发布，仍需等待后续任务与整体发布门槛。 |

验证入口：[Game 版本与原子性测试](../tests/game.test.ts)、[浏览器内容版本注册测试](../tests/browser-bootstrap.test.ts)、[T08 场景切换浏览器测试](../tests/e2e/t08.spec.ts)、[T04 重开浏览器测试](../tests/e2e/t04.spec.ts)。

## 26. T20 选择开放关卡与查看进度

T20 将战役阶段定义与解锁投影归属 `Progress`。网页显示每关名称、可进入/锁定/已完成状态、最高分与总完成数；每次点选都会重新读取 Progress，锁定或不存在的阶段不能调用 `Game.open()`。正式胜利经既有结算路径保存完成 ID 和最高分，刷新后恢复解锁。未完成战局没有续玩档案，重新进入时回到关卡初始状态。

当前只提供两个 T20 验收样本：它们使用独立场景 ID，复用已研究的 Cow Gulch 地图；第二关以 40 条生命和 $75 初始现金证明载入了对应内容版本。本次不声称提供完整生产战役关卡。

| 检查 | 结果 |
| --- | --- |
| `pnpm run test:ci` | 通过：TypeScript 检查、116 项单元测试、Vite 生产构建及 46 个 Playwright 场景。 |
| Progress 投影 | 通过：历史 `cow-gulch` 样本不会误解锁 T20 第一关；第一关正式胜利后投影为已完成，第二关变为可进入，并保留 $50 最高分。 |
| 锁定保护 | 通过：Playwright 移除第二关按钮的 `disabled` 属性后直接点击，网页重新读取 Progress 并拒绝开局；原有场景保持不变。 |
| IndexedDB 与未完成关卡 | 通过：真实浏览器 IndexedDB 在刷新后保留 1/2 进度与第一关最高分；第二关载入 40 条生命、$75 现金。启动第二关后刷新，再次进入会回到第 1 波初态，进度仍为 1/2。 |
| 触屏与语言 | 通过：390×844 触屏视口可切换中文并进入第一关，状态文案正确，页面没有横向溢出。 |
| Codex 内置浏览器 | 本地 `http://127.0.0.1:5175/` 实际操作：中英文切换、设置 4× 倍速、打开第一关并完成胜利，看到 1/2 和 $50 最高分，再打开第二关并核对 40 条生命、$75 现金。测试后恢复英文和 1× 设置。 |
| 存档格式与回归边界 | 未修改数据库版本或 `schemaVersion: 2`。`loadCampaign()` 的读取不清除待重试的设置写入，新增 Progress 回归测试验证原请求仍可重试。完整六区域和生产解锁关系仍由后续关卡内容任务补齐。 |

验证入口：[Progress 投影与重试回归](../tests/progress.test.ts)、[浏览器版本注册](../tests/browser-bootstrap.test.ts)、[T20 桌面/触屏流程](../tests/e2e/t20-campaign-progress.spec.ts)、[存储契约](storage-contracts.md#46-当前已实现倍速设置与样本结算档案)。

## 27. T21 难度选择与困难模式解锁

T21 将下一场战斗的难度保存在既有 Progress 设置中，并将本次实际难度写入 Game 启动记录及回放来源记录。Cow Gulch 第 1 关采用逆向结果中的敌人生命倍率：简单 100%、中等 125%、困难 155%；分数倍率为 75%、100%、150%。Progress 按已完成阶段的全局关卡号计算困难模式解锁：完成 10 的倍数关卡后开放。未解锁时界面禁用困难选项，Progress 保存接口也拒绝绕过 UI 直接写入困难设置。

当前战役目录只含 T20 的第 1、2 关验收样本，故网页真实进度仍保持困难锁定。本次通过 Progress 合成第 10 关阶段验证胜利结算解锁；没有把合成关卡加入产品目录，也未宣称完整战役已实现。数据库版本、`schemaVersion: 2` 和现有 IndexedDB 记录均未迁移；旧设置缺少难度字段时映射为简单模式。

| 检查 | 结果 |
| --- | --- |
| `pnpm run test:ci` | 通过：TypeScript 检查、120 项单元测试、Vite 生产构建及 48 个 Playwright 场景。 |
| Game 难度行为 | 通过：中等模式将 Cow Gulch 敌人生命设为 157（基准 125%）；困难模式从基准分数 67 得到画面分数 101、存档候选值 100，分别验证原版浮点取整和整数截断。 |
| Progress 解锁与回退 | 通过：未完成第 10 关时直接保存 Hard 返回 `difficulty-locked`；第 10 关胜利后允许保存 Hard，再切回 Easy，已解锁状态仍保留。旧设置和缺少难度字段的档案默认 Easy；非法值报告 `corrupt-data`。 |
| 回放兼容 | 通过：新记录保留实际难度并按相同规则回放；缺少难度字段的旧启动记录按 Easy 处理。 |
| IndexedDB 与桌面/触屏浏览器 | 通过：Playwright 验证 Medium 写入 `gunsnglory-profile`、刷新恢复、关卡启动标签、结算显示分数及独立保存高分；第 1 关完成后 Hard 仍锁定。手机视口控件可操作且无横向溢出。 |
| Codex 内置浏览器 | 本地 `http://127.0.0.1:5175/` 清洁刷新后，从 IndexedDB 恢复 Medium、1× 和 1/2 进度，初始正式场景显示 `DIFFICULTY · MEDIUM`，Hard 仍禁用。切换 Easy 时等待中的正式初始场景同步显示 Easy；切回 Medium 并再次刷新后，设置与场景标签仍为 Medium，进度保持 1/2。此次刷新未产生新 console error；日志仅包含 2026-10-28 热更新期间的历史错误。 |
| 发布边界 | 仅在 `gunsnglory` 本地集成分支验证；尚未合并、push 或发布。Hard UI 完整解锁仍需后续加入真实第 10 关及生产战役目录。 |

验证入口：[难度规则与解锁测试](../tests/difficulty.test.ts)、[Progress 设置兼容测试](../tests/progress.test.ts)、[T21 桌面/触屏流程](../tests/e2e/t21-difficulty.spec.ts)、[难度与存档契约](storage-contracts.md#46-当前已实现倍速设置与样本结算档案)。

## 28. 2026-10-28 规划与内容覆盖审计

本次只读审计基准为 `03821da`，并检查了当时尚未提交的 T20 进度样本。结论是：旧计划允许连续完成样本工具任务，却没有强制进入完整原版首关。首五个技术切片本身有用，问题在于后续缺少具名内容责任和产品门槛；不是实现任务没有遵守旧计划。

| 审计面 | 当时观察到的事实 | 对既有验收的限制 |
| --- | --- | --- |
| 内容与资源 | 1 张 TDM、17 张 PNG；仅地形、枪手和男性拓荒者 | 地图能显示不代表初始对象、波次或表现完整 |
| 敌人与波次 | `PreviewWaveDefinition` 为单敌人定义；敌人类型/素材固定；开波直接创建样本 | 没有完整请求池、时序、多波、车组和死亡派生 |
| 招募 | `recruitPool` 只增加计数，没有消费它产生可操作单位 | 局部扣款测试不证明真实雇用闭环；原版地图睡眠对象激活与建筑生成须区分 |
| 升级与装填 | 只测枪手0→1；特殊装填字段已进入数据与展示，开火只重设普通冷却 | 参数存在不代表规则已经消费；一枪即死样本无法暴露周期问题 |
| 路线与碰撞 | 手工首关转向点、静态地形四角检查及逐轴移动子集 | 不能证明多敌占格、建筑或车辆组件组合正确 |
| 动画与特效 | 枪手固定帧、拓荒者基础行走；弹点/描边/淡出 | 原版状态、方向、图集、残片、爆炸与声音未覆盖 |
| 结算与切关 | 样本清空即整局结束；T20 使用同图复制样本 | 不能证明完整八波、待生成乘员、不同地图资源与真实战役进度 |
| 实验 | 回放、方案、串行/worker 跑固定样本 | 只能证明样本可重复，不能据此判断完整原版平衡 |

当时读取的关键入口为[首关配置](../src/content/cow-gulch.ts)、[单波样本](../src/content/cow-gulch-preview-wave.ts)、[Game](../src/game/index.ts)、[Renderer](../src/render/canvas-renderer.ts)、[浏览器入口](../src/main.ts)。这些文件会继续演进，复核历史事实应使用对应提交。

研究树已有完整战役/数值/波次及资源索引。另发现地图对象创建条件与炸药对象分派的摘要错误，并回查归档 Smali；明确勘误和规格依据现统一维护于[产品规格](spec.md)。本次没有重新运行 Android、穷举随机轨迹或改写研究 worktree，静态核对不冒充原版完整运行交叉验证。

审计与修订稿当时提交为 `f03f974`。已执行空白/链接检查，并从应用目录用 `pi --no-extensions --no-skills --no-prompt-templates --no-themes --no-session --no-approve --offline --tools read --mode json` 实际读取该稿：自动加载根和应用两份 AGENTS，`read` 返回 `isError=false`，退出0、stderr为空。日志为 `/tmp/gunsnglory-plan-review-final-pi.jsonl`。它验证了规划与立即实现的区别、P0门槛、任务依赖与接口职责，不代表规划中的功能已经实现。

## 29. 2026-10-29 主文档整合

本次按用户要求将修订稿纳入正式文档，并删除独立修订稿。整合只修改文档，不实现游戏、不重跑先前功能验收，也不将 P0 标为完成。

| 文档 | 接收内容 |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | 任务启动、规格真源、完整行为、fixture 限制与独立预期等稳定约束 |
| [产品规格](spec.md) | 目标、规格深度、内容集合、来源/勘误、参数与对象行为、产品验收 |
| [架构设计](architecture.md) | 内容/素材组织、表现元数据、生命周期与接口职责 |
| [实施计划](implementation-plan.md) | 生效的 P0–P5/B 排期、任务契约、内容归属要求、风险、验收与历史任务映射 |
| [模拟契约](simulation-and-automation.md)、[存储契约](storage-contracts.md) | 实验可信范围、样本与生产身份兼容；具体已有格式仍保留 |
| [README](../README.md) | 主文档导航与单一进度入口 |
| 本文 | 历史规划审计范围及本轮实际验证证据 |

本轮实际检查：

| 检查 | 结果与边界 |
| --- | --- |
| `git diff --check` | 通过；本批仅修改应用 Markdown 文档 |
| `python3 /tmp/check-gunsnglory-docs.py` | 10份受版本控制的 Markdown、157个本地链接及锚点通过；代码围栏闭合；27条用户故事逐字保留；CLAUDE 仍只导入 AGENTS |
| 交叉复核 | 逐项覆盖状态归计划第10节，规则参数归规格第4节；保留 T01–T21 历史证据；第三波配对和炸药范围边界未因整合丢失 |
| 删除检查 | 独立修订稿已删除，仓库 Markdown 无残留文件引用 |
| `pi` 实读 | 自动加载根和应用 AGENTS；对三份主文档各执行一次 `read`，均 `isError=false`，全文未截断；进程退出0，stderr为0字节 |

在应用目录实际执行的最终验证命令：

```bash
pi --no-extensions --no-skills --no-prompt-templates --no-themes --no-session --no-approve --offline --tools read --mode json -p '只读复核主文档，不修改文件，不实现功能。先报告启动时自动加载的 AGENTS.md 路径，不通过 read 它们替代。实际调用 read 读取 docs/implementation-plan.md、docs/spec.md、docs/architecture.md 全文，截断则继续。回答当前执行门槛、覆盖表与规则参数的唯一维护位置、fixture能否计为真实内容完成、原始开局现金与雇用价格边界的区别、区域开放与开发顺序的区别、UI与Game内容职责。指出关键矛盾；不要读取外部研究树。' > /tmp/gunsnglory-main-docs-pi.jsonl 2> /tmp/gunsnglory-main-docs-pi.stderr
```

关键返回确认：当前为未完成的 P0，不能按旧 T22 流水线或直接跳入 P1；计划第10节尚待逐项补齐；fixture 不计真实关卡完成；65是首关原始现金，75/74是雇用动作边界；各区域首关开放与开发排期分离；UI 不读取 Game 私有内容或计算规则。首次实读指出现金“初态”措辞容易混淆，已澄清并用上述命令复核。此次实读只证明上下文加载、工具调用和关键要求可读取，不证明游戏功能通过。

成品8份 Markdown 按相对路径以 `cp -R` 复制到 `/tmp/var/wishflow-tools/`，逐文件比较一致；交付目录中的旧修订稿同步删除。未运行游戏测试、构建、Android 或浏览器验收，因为本批没有改动游戏代码与资源。Mermaid 检查了文本结构及围栏，未进行图形渲染验收。

## 30. 逐轮交付流程与发布验收

每轮要求完成实现、对应测试、提交、合并到 `master`、推送、等待 CI/CD，并在 Codex 内置浏览器完成线上实测。记录本轮 T14–T21 发布时，P0 覆盖表与 P1 任务契约尚未闭合；随后在第 33 节完成规格门槛审计。该状态不改变游戏实现仍为 0/60 完整关卡的事实。

CI 首次运行暴露设置冲突和保存重试用例无法点击：长升级规则提示参与右侧自动宽度列计算，挤压相邻按钮列。将提示限制为 `24rem` 并允许断词换行后，既避免提示覆盖按钮，也保留原有按钮列尺寸。

| 检查 | 结果 |
| --- | --- |
| 应用完整本地验证 | `pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript 检查、120 项单测、生产构建及 48 项 Playwright。 |
| 失败复现与修复 | 提交 `a94ffaa` 的 CI 两次在 T05 设置冲突/重试用例失败；失败日志显示 `upgrade-sample-status` 截获按钮指针事件。新增样式后，Chrome 下 T01 和 T05 定点回归 10/10 通过；完整本地 CI 再次 120/120 单测、48/48 Playwright 通过。 |
| 共享目录与整站构建 | `pnpm run test:catalog` 通过 14 项；`pnpm run build:site` 完成所有登记静态应用构建。 |
| 提交与合并 | `558176c` 修复提示宽度；已快进合并至 `master`。 |
| GitHub Actions 与发布 | [workflow 40734672557](https://github.com/wishflow/wishflow-tools/actions/runs/40734672557) 成功；Guns’n’Glory 测试、共享目录检查、Cloudflare Pages 与 GitHub Pages 部署均通过，Worker 未触发。 |
| Codex 内置浏览器公网实测 | `https://wishflow-tools.pages.dev/gunsnglory/?release=558176c` 显示包含战役进度和实验面板的新版本；长升级提示换行，操作按钮可见。倍速由原有 4× 调至 3.75×，界面显示设置已保存，再恢复为 4×；档案进度与最高分未改动。 |
| 当次开发门槛 | 当次发布后完整原版关卡仍为 0/60，P0 任务契约仍在审查；随后完成情况见本记录第 33 节。 |

## 31. P0 战役静态清单映射

本轮只完成战役内容编目与阶段/逐关任务分配，没有迁入新关卡或新增运行时功能。静态数据交叉核对通过后，将清单写入[实施计划第 10 节](implementation-plan.md#10-内容覆盖与实现状态)。

| 核对项 | 结果 |
| --- | --- |
| 战役条目 | 内容清单、level 配置和波次数据各有 60 个关卡；地图清单有 63 个文件、其中 60 个带战役映射。每个关卡名、初始现金/生命、升级上限、三档敌人 HP 倍率及波次配置行数逐项一致。 |
| 地图编号 | 关卡 1–10 对应 map01–10，关卡 11–60 对应 map14–63；无重复/缺失战役 ID。map11–13 不由当前映射公式选取，未推断为整个 APK 未使用。 |
| 地图构造标记 | 只统计原始 tile 频数；所有炸药箱/触发器与赌徒/赌场配对数量相等。tile 频数不证明对象在新局中实际创建、已解锁或可交互。 |
| 逐关任务 | L01 归入 P1-A–F；L02–10 各有 P2 任务 ID；L11–60 各有对应区域 P3 任务 ID。该映射固定关卡数据/装配责任；P1-A–F 契约随后已在第 33 节补齐。 |
| 实现与验收状态 | 只有 L01 的地图、单位和样本规则/表现已有局部实现，均为“部分”；完整原版关卡验收记录 0/60。其他 59 关尚未迁入。两个进度样本复用 Cow Gulch，未计作真实关卡。 |
| 文档检查 | Markdown 相对链接、表格行数和静态映射交叉核对通过；未修改游戏代码。 |

## 32. P0 对象、规则和表现首次消费矩阵

本轮将对象/敌人、共享规则与表现资源族纳入[实施计划第 10 节](implementation-plan.md#10-内容覆盖与实现状态)。资料仍由 `R/` 研究目录和产品规格作真源；矩阵中的“首次”区分 TDM marker、解锁后可用关卡和波次配置，不能解释为每次随机运行必然创建该对象。

| 核对项 | 结果 |
| --- | --- |
| 玩家对象映射 | 覆盖 `unitTypeMap` 全部 21 个 type、14 个升级数据组及 6 组独立解锁门槛；类型映射与 tile marker 从 `level-config.json`、`map-inventory.json` 对照，首用状态按 `isUnlocked` 门槛筛选。 |
| 敌人目录与波次首次配置 | 9 类 enemy 数据均归入矩阵。pool 首次配置为 Settler 与 Covered Wagon：L01，Rider：L02，Stage Coach：L03，Gold Transport：L04，Boss：L22，Doc：L52；type8 Horse Neutral 按 Covered Wagon 的派生组记录，不与玩家 unit type8 炸药箱混淆。 |
| 解锁后地图 | Grandpa：L21、Sniper：L31、Pyromaniac：L41、Salesman：L51；Dynamite 首个解锁后含 marker 的关为 L25，Gambler/Casino 为 L43。规则为当前全局关卡门槛与 `isLevelFinished(progressCode)` 二选一，不能用 marker 首次出现代替解锁状态。 |
| 共享规则范围 | 将 60 张战役图的背景/道路/路线字段、527 条 `newWave`、1,377 个 `addToWave` 配置、86 个 spawn-pool action、敌人碰撞/组队/重试、战斗数据、运输死亡派生及进度/结算责任接回 P1–P3。静态图摘要不是实际寻路或生成结果。 |
| 表现资源范围 | 记录地形、装饰、人物/敌人、投射物/状态效果、HUD/Help/文本和音频的首用任务。APK 943 个 PNG 路径不作为功能分母；20 个无直接命中的 PNG 候选与3个无直接游戏引用 OGG 保留为边界，不推断它们必须显示/播放或可删除。 |
| 交付状态 | 本轮只改 Markdown；旧样本中的 Cow Gulch 内容仍为“部分”，完整关卡为 0/60。未运行游戏构建、自动化游戏测试、ADB 或浏览器，因为没有代码或资源变更。 |

执行了只读交叉核对：从 `map-inventory.json` 计算原始 marker 首次出现与解锁后首次出现；从 `waves.json` 按 `Wave` pool 常量找首次非零配置；核对 `level-config.json` 的类型、单位数据组、解锁门槛与地图/波次行。此前 60 关表的逐行检查继续通过。该次记录中的 P0 审查尚未结束；后续逐任务结论及关闭状态见第 33 节。

## 33. P1-A–F 任务契约审计

本轮按[任务契约门槛](implementation-plan.md#21-每项任务必须具备的规格)、[产品规格](spec.md)及 APK 静态消费者逐项补齐 P1-A–F。审查只读 APK 反编译源码、配置数据和已有研究索引；没有重复启动 ADB、推进整场战役或修改游戏代码。

| 闭合项 | 静态结论及独立预期 |
| --- | --- |
| 原始开局与对象身份 | L01 使用 map01，原始配置现金65、生命50、升级上限0、8波；tile96/97/104 的对象数量与 activity 已定，fresh profile 的 tile101/130 受解锁规则限制。P1-A 规定从 TDM 字节独立解码，与 GameObjectManager 构造分支核对。 |
| 波次请求与生成 | Wave01/02 的 newWave 参数和 pool type 2–11 原始请求向量列入 P1-B；Wave03 原始 covered-wagon 请求为3，后续波实际池数会按动态难度缩放（四舍五入、最小为1）。`WaveManager.updateWave()` 按剩余池计数抽取，仅成功生成后消耗请求，阻塞重试不丢池内容。请求数不等于实际敌人数。 |
| 枪手特殊装填 | `GameObjectUnit` 初始 `specialCoolDownCounter=6`；第6次实际 `shoot()` 将普通装填与特殊装填相加；无目标不消耗计数、移动时活动冷却仍随 `dt` 递减、升级重置计数与当前冷却。四档第6发冷却为2000/1650/1650/1300 ms。 |
| 第三波运输派生 | L01 Wave03 原始配置3个 covered-wagon 请求；进入该波时按上一波动态难度缩放实际池数，最低为1。每次成功请求形成同组 type8 牵引与 type4 车厢。P1-C 固定3000ms基础值、成功间隔6000ms、首轮失败重试3000ms，并检查死亡计数500/499、0–4乘员、方向/偏移/倍率/组号与单次奖励。 |
| 表现边界 | 枪手/Mexican 射击帧按“当前累计计时选帧，再加 dt”核对；P1-F 绑定1024×576逻辑画布和原版固定状态截图，不以帧文件存在代替动画验收。 |
| 战役解锁与终局 | 区域首关、进度前沿、两个 `isLevelFinished` 重载已区分；终局先判 `lives<=0`，否则要求 `waveEmpty && enemyList.length==0` 再推进。P1-E 明确正式关卡 ID 与 `cow-gulch`、两个 T20 样本 ID 隔离，并复用现有 v2 档案字段；不续玩未完成局。 |
| 2.1 契约字段 | A–F 分别具有目标/范围、初态与输入、状态变化、表现、依赖、独立预期、异常边界和完成证据；依赖图无环。真实战局与边界 fixture 分开，fixture 不替代 Cow Gulch 连续玩法。 |

**P0 规格门槛通过，可开始 P1-A。** 这是可执行计划的验收，不是游戏能力通过：实际代码仍处于既有 T01–T21 样本基线，完整原版关卡仍为0/60。P1-A–F 后续需逐项实现、运行、发布和浏览器核验。

| 检查 | 结果 |
| --- | --- |
| 原始静态数据复算 | `level-config.json`：21个 unit type、14组单位数据、6组解锁门槛、9行敌人；`map-inventory.json`：63张地图；`waves.json`：60关。地图 marker 首用和解锁后首用复算通过。 |
| P1 表格结构 | 6项任务，每项均含输入/初态、独立预期、边界与证据。 |
| 文档链接与结构 | `python3 /tmp/check-gunsnglory-docs.py` 通过：10份受跟踪 Markdown、171个本地链接/锚点、代码围栏闭合、27个用户故事保留；P1 表格为6项×4列；`git diff --check` 通过。 |
| 游戏验证范围 | 本轮仅修改 Markdown，不运行游戏构建、游戏测试、ADB 或内置浏览器；没有代码/资源变更，不触发应用部署。 |

## 34. P1-A Cow Gulch 原始开局

本轮实现 P1-A 的固定初态与可见对象，覆盖 Cow Gulch/map01；没有推进波次或验证整关。独立预期来自手工复核的 `td_map_01.tdm` 字节及 `GameObjectManager` 构造/解锁分支，具体基线见[产品规格 §4.4](spec.md#44-地图构造首关初态与雇用)。完整首关仍为0/60，P1-B–F 未完成。

| 验收面 | 实际结果 |
| --- | --- |
| 对象与解锁 | fresh profile 创建8个 tile96 枪手睡眠槽、7个 tile97 Mexican 睡眠槽及 tile104 活动枪手；坐标按原 TDM 行优先解码。tile101/130 锁定对象不实例化，tile98–100/131 不属于本图。 |
| 初态与版本 | Game 视图包含16个单位；Wave1 初态为50生命、$65、未开始，升级上限仍为0。场景内容版本升至 `gng-free-1.8.6-map1-objects-v2`，隔离新增对象集合与旧回放。 |
| 资源与反馈 | 从 APK 提取并纳入游戏的枪手/Mexican 睡眠贴图和3帧 `sfx_sleeping`；Canvas 按脚底锚点绘制，帧每200ms轮换并在暂停时冻结。英文/中文选择提示分别区分枪手与 Mexican 的“待招募”状态。 |
| 行为 | 可选中睡眠槽但不激活、不扣款、不增加招募池；对其移动命令被拒绝。桌面及触屏浏览器测试确认选中枪手和 Mexican 睡眠槽时现金仍为$65、招募池为空；桌面浏览器再通过站点语言开关核对 Mexican 的中英文待招募提示。 |
| `typecheck`、`test:unit`、`build` | `pnpm --dir apps/gunsnglory run typecheck` 通过；`pnpm --dir apps/gunsnglory run test:unit` 124项通过；`pnpm --dir apps/gunsnglory run build` 通过，构建目录包含三张新增 PNG。 |
| 浏览器测试 | `pnpm --dir apps/gunsnglory run test:e2e` 全套48项通过；增加 Mexican 点选断言后，`pnpm --dir apps/gunsnglory exec playwright test tests/e2e/t01.spec.ts` 两项桌面/触屏测试再次通过。Codex 内置浏览器打开本地 Vite 画面，截图确认地图中睡眠贴图和 Zzz 图层已加载。 |
| 审查 | 条件反转变异使移动规则及睡眠对象测试按预期失败，恢复后 `game.test.ts` 的46项全部通过。 |
| 合并与发布 | 实现提交 `1e567d2` 通过合并提交 `c7a8f8b` 进入 `master` 并推送。GitHub Actions run `40755487772` 成功；`test-shared`、`test (gunsnglory)`、`deploy-cloudflare-pages` 和 `deploy-github-pages` 均通过，Worker 检查/部署因未涉及而跳过。 |
| 公开页面与内置浏览器 | 在 Codex 内置浏览器打开 `https://wishflow-tools.pages.dev/gunsnglory/?release=1e567d2`。截图确认地图睡眠人物和 Zzz 图层已加载；实点 tile96 枪手槽显示“枪手待招募，尚未雇用 · Cell (7, 2)”，实点 tile97 Mexican 槽显示“墨西哥人待招募，尚未雇用 · Cell (4, 4)”。两次选择后战局仍为50生命、$65，预备单位为空；没有推进波次或尝试完成整关。 |

本轮只完成 P1-A 原始开局；没有声称原版雇用闭环、完整前两波或完整 Cow Gulch 已通过。后续 B 从原始初态继续实现真实雇用与前两波，不能把本节中的静态对象/初态验收当作 B–F 的通过证据。


## 35. P1-B 设计可达性复核

复核发现旧验收把两种雇用和两类武器行为放在同一个真实两波初局中，经济上不可达。该约束按独立原始波次、pool 类型组大小、敌人奖励和简单难度动态难度上限复算：Wave01 原始池最多生成 `6×1 + 2×2 + 2×3 = 16` 名拓荒者；Wave02 原始池为 `[0,2,2,3]`，在简单模式上限1250下各正请求按原版四舍五入后为 `[0,3,3,4]`，最多生成 `3×2 + 3×3 + 4×4 = 31` 名拓荒者。两种拓荒者奖励均为 `$1`，加上首关 `$65`，即使两波全部击败最多 `$112`。额外枪手与 Mexican 的原价合计 `$175`，不能在同一真实两波初局同时雇用。

依据：`R/data/waves.json`、`R/data/level-config.json`、`R/recovered-source/java/.../GameDesignWaves.java`、`Wave.java`、`WaveManager.java`、`EnemyDirector.smali`；pool 类型2–5分别为拓荒者 x1–x4，简单难度动态人数上限见[产品规格 §4.3](spec.md#43-参数确定单位与规则消费)。

**已调整 P1-B 验收：**真实65现金开局只要求在真实 Wave01–02 路线中赚到 `$75` 并雇用同一枪手对象，验证控制与特殊装填；Mexican 的 `$99/$100` 雇用边界、AOE 群体攻击、弹道/爆炸、表现与声音改由独立 Game 行为 fixture 验证。Fixture 不进入正式档案、不计为真实关卡进度，也不改变真实场景现金。不得用“同时购买两类单位”作为一局通关门槛。

另核对 `GameObjectUnit` 构造时从 `unitDataMexican[0][0]` 读取速度0，`move()` 将速度乘以移动方向形成位移，`hire()` 不修改 `speed`。因此 P1-B 的 Mexican 验收修正为“可选中并原地攻击，不可移动”；先前计划中要求 Mexican 移动的条文已删除。该边界来自代码数据与消费路径核对，不依赖原版运行观察。

## 36. P1-B 原版前两波与战斗切片

本轮从 P1-A 的 Cow Gulch 原始对象开局继续实现，范围包括原版 Wave01–02 调度、地图 Gunslinger 的真实 `$75` 雇用、Gunslinger 第六次实际射击后的特殊装填，以及 Mexican 雇用与重型炸药攻击。为避免把未完成内容伪装成正式关卡，保留原来的单波 `cow-gulch` 样本和存档身份；新增独立的 `cow-gulch-original-waves` 场景，仅提供已实现的前两波。其总波数仍显示为8；第3–8波和整关结算明确不可用，不写战役进度。

Mexican 的 `$99` 拒绝、`$100` 原地唤醒、零移速不可移动、重型 AOE 群体命中及边界目标、击杀奖励、投射物/爆炸帧和炸药音效事件由独立 Game fixture 验证。该 fixture 使用显式测试身份，不改变真实关卡现金或存档。枪手特殊装填同时有通用固定时间测试和直接使用原版 Cow Gulch 波次内容的真实规则测试；真实第一波推进到第二波，并核对第六次枪手射击使用特殊装填。

| 验收面 | 实际结果 |
| --- | --- |
| 原版内容身份 | `cow-gulch` 一波正式样本保持独立内容版本；新场景 ID 为 `cow-gulch-original-waves`，内容版本为 `gng-free-1.8.6-map1-p1b-waves-1-2-v1`。原始 Wave01/02 数据以 `cowGulchCampaignWaves` 装载，源向量和缩放规则见[产品规格 §4.3](spec.md#43-参数确定单位与规则消费)。 |
| 真实首波规则 | Game 行为测试使用真实 Cow Gulch 内容和 seed 42，确认 Wave01 清除后进入 Wave02，原地图枪手至少完成6次实际射击，前六发只有第六发触发特殊装填。前两波内容测试核对原始HP/速度倍率、spawn pool、请求向量、入口间隔与波次身份。 |
| 真实枪手雇用 | Playwright 以4×从 `$65` 原始开局运行 Wave01，等待实际击杀收入达到 `$75`，在地图 Gunslinger 槽确认雇用并扣款，随后再次点选同一地图位置确认枪手可控；启动 Wave02。浏览器路径没有注入现金。 |
| Mexican 规则与音画 | Game fixture 覆盖 `$99` 资金不足、`$100` 雇用、原地攻击/零移速，以及一颗炸药命中半径内两个敌人，半径边界及外侧目标不受伤、现金奖励各一次。画面事件绑定 APK 弹道/爆炸及枪手/Mexican 射击图集；Mexican 用例断言 `sound_dynamite` 请求，真实浏览器另确认 `sound_revolver.ogg` 被请求。 |
| APK 资源 | 构建并加载 `pioneer_female.png`、`player_gunslinger_shot.png`、`player_mexican.png`、`player_mexican_shot.png`、`sfx_mexican_dynamite.png`、`sfx_explosion.png`，以及 `sound_revolver.ogg`、`sound_revolver2.ogg`、`sound_dynamite.ogg`、`sound_desperado_yihaa.ogg`、`sound_mexican_arriba.ogg`。Canvas 单测核对原始图集裁切、攻击帧、弹道和爆炸；本轮没有宣称所有音频变体都已逐一听辨。 |
| 本地 CI | `pnpm run test:ci` 通过：TypeScript 检查、134 项单元测试、生产构建及49个 Playwright 场景。E2E 覆盖桌面真实前两波/雇用、OGG 请求，并回归原先的桌面选择、手机触控、存档、倍速和其它既有流程。 |
| 回归测试灵敏度 | 临时把波次缩放的 `count <= 0` 守卫改为 `count < 0`，真实两波规则测试因 Wave02 剩余请求由预期4变成11而失败；自动恢复源文件后，同一测试再次通过。 |
| Codex 内置浏览器本地实测 | 在 `http://localhost:5176/` 打开原版前两波场景，使用4×运行 Wave01，显示 Wave02、50生命、$81；在地图槽确认以$75雇用后，现金为$6、预备池显示 `Gunslinger ×1`，再选中同一槽。启动 Wave02 后显示 Wave02 完成、47生命、3名逃脱、44名击败、现金$34，并明确提示 Wave03 未实现。没有生成正式战役结算；恢复1×并返回原单波样本后，档案仍显示没有 Cow Gulch 结算。 |
| 浏览器适配回归 | 新增前两波入口后，原有窄屏主操作按钮宽度回归被 E2E 捕获；将手机视口下的“开始波次”设为跨两列后，原始宽度断言保留并通过，触控与页面布局测试全部通过。 |
| CI 时序故障与回归保护 | 首次工作流 `40803732373` 在两波 E2E 失败：截图显示第一波尚有2名敌人，测试只在招募现金达标后用默认5秒等待第二波编号。游戏规则状态正常，失败来自测试对波次结算时序的假设。修正为等待精确状态 `Wave 2/8 ready`，该用例总时限60秒、状态断言30秒；临时把波次数量守卫 `count <= 0` 改为 `< 0` 时真实两波测试失败，恢复后通过。 |
| 公网浏览器验收 | 在 Codex 内置浏览器打开 `https://wishflow-tools.pages.dev/gunsnglory/?release=3a8f7f6`。原版前两波入口、Wave01 启动及 `$65` 开局正常；4×后 Wave01 结算为 Wave02 待开始、50生命、$81。地图枪手槽位 `(7, 2)` 以 `$75` 雇佣后现金为 `$6`；清除选择并重新点选同格仍显示“已选择枪手 · Cell (7, 2)”。公网启动 Wave02 后显示完成、49生命、1名逃脱、46名击败、现金 `$36`，并明确提示 Wave03 未实现。返回旧 Cow Gulch 样例后显示原有 `$50` 最高分，战役进度仍为 `0/2`。 |
| 发布状态 | 实现提交 `91a69ec` 经集成提交 `9960266`、CI 修复提交 `3a8f7f6` 快进进入 `master`；`master` 已推送至 `3a8f7f6601f7b99d8a7bc788e745040725218fa5`。GitHub Actions run `40804914440` 成功：`test (gunsnglory)`、`test-shared`、`deploy-cloudflare-pages`、`deploy-github-pages` 通过；Worker 与配置校验因本次不涉及而跳过。公网验收使用上述发布 URL。 |

此处只标记 P1-B 切片已完成本地验收，不表示 P1 完成。Wave03–08、运输组、完整首关结算、正式战役入口及完整 Cow Gulch 仍待对应 P1-C–F 实现，完整原版关卡仍计为0/60。


## 37. P1-C 原版第三波运输队

本轮将原版 Cow Gulch Wave03 加入独立内容版本 cow-gulch-original-waves-1-3。既有单波样本与 P1-B 的 cow-gulch-original-waves 身份保留；公共入口改为打开前三波版本。当前范围止于 Wave03，不保存战役结算，Wave04–08 仍不可玩。

Wave03 原始请求向量为 [0,0,0,0,0,3,0,0,0,0]。第6项是 pool type7，映射成 EnemyDirector request type4；每次成功生成一组 type8 马匹牵引与 type4 车厢，普通速度按波次100%。原始 base delay 3000ms 乘成功间隔系数2后为6000ms；生成冲突保留池请求，并以3000ms首轮间隔重试。车辆死亡链依据已归档的 EnemyDirector、GameObjectEnemy、EnemyWagonPart 反编译结果实现：type4 击毁奖励一次并使同组牵引件死亡；死亡计数从799降至499时一次性生成20个残片及0–4名乘员，计数为500时不生成。乘员按原行进方向移动，偏移不改变寻路坐标；原版只在目标优先级、绘制和投射物落点等明确分支消费偏移，碰撞仍使用物理坐标。乘员组号独立，速度比例为90–109%。type8不可被普通武器选为目标。

| 验收面 | 结果 |
| --- | --- |
| 内容与数值 | 固定数据测试核对 Wave03 的HP/速度倍率、spawn ID、pool type7 请求3次及 pool type 到 request type 的区分。P1-C 使用独立 content version，不改变 P1-B 场景 ID。 |
| 生成与重试 | Game 行为测试验证原始三次配对请求、每次 type8/type4 组大小、6000ms成功间隔、待处理请求数及运输组仍存活时不提前结束波次；独立冲突 fixture 验证请求不扣减且3000ms重试后可生成。 |
| 战斗与派生 | 固定随机种子测试验证type8不可受击、type4奖励与组死亡只执行一次、500/499ms边界、20个残片、乘员数量/类型/速度、路由坐标和绘制偏移、独立组号；额外覆盖原版运输预检框位于临时 spawn field 前一格、只比较 type4/type8 物理碰撞坐标，乘员显示偏移不会错误阻塞后续生成。 |
| 贴图与效果 | 迁入 horse_wagon、wagon 及转向图集、烟雾/残片图集和 sound_wagon_explode.ogg。Canvas 测试覆盖车辆帧裁切、脚底锚点、转向图集镜像与死亡效果；修正了转向帧的镜像选择，不再同时叠加当前方向镜像。 |
| 语言与入口 | 站点共享语言状态下，中英文入口、前三波标题及未完成范围说明同步更新。现有 P1-B 入口仍注册，以保留旧内容版本的可读取性。 |
| 本地 CI | pnpm run test:ci 通过：TypeScript 检查、141 项单元测试、生产构建、49 个 Playwright 场景。专项 pnpm exec playwright test tests/e2e/t22-original-waves.spec.ts 通过，从 Wave01 开始、取得雇用资金、雇佣地图枪手、清除 Wave02 并启动 Wave03。 |
| 本地内置浏览器 | Codex 内置浏览器本次以4×实际运行前三波：Wave01 结算后显示50生命、$81；Wave02 结算后显示50生命、$107；Wave03 活动截图可见运输组贴图沿地图路线移动，地图保持视口裁切。Wave03 结算时显示44生命、逃脱6、击败45、现金$119。该手动场景未固定随机种子，这些是本次观察值而非稳定断言。随后显示 Wave04 未实现；正式档案仍无 Cow Gulch 结算，战役进度为0/2。 |
| 发布与公网验证 | 实现提交 `ebeb7ef` 经集成提交 `588b2d5` 合入并推送 `master`（`588b2d52a493b344edcf7bb8ab31a9f26da3d1cf`）。GitHub Actions [run 40818009364](https://github.com/wishflow/wishflow-tools/actions/runs/40818009364) 成功：应用测试、共享站点测试、GitHub Pages 与 Cloudflare Pages 部署均通过；Worker/config 校验按变更范围跳过。Codex 内置浏览器在 `https://wishflow-tools.pages.dev/gunsnglory/?release=588b2d5` 实际运行前三波：Wave01 后生命50/$81，Wave02 后生命50/$107；Wave03 活动截图可见马匹与车厢沿峡谷路线移动，结算显示生命44、逃脱6、击败43、现金$117，并明确停在3/8、Wave04未实现。浏览器控制台 error/warn 为空；既有样本最高分$50、战役进度0/2未变化。本次运行未固定随机种子，结算数字仅为观察值。 |

本节只证明 Cow Gulch Wave03 的 type4/type8 运输切片通过测试；不表示 type5/6 运输对象、其他地图组合、完整战役或 Cow Gulch 整关已完成。完整原版关卡仍为0/60。


## 38. P1-D Cow Gulch 原版八波与自动推进

本轮将原版 Wave04–08 加入独立内容版本 `cow-gulch-original-waves-1-8`，并把原版 campaign 的首波和后续波改为自动开始。Cow Gulch L01 八次 `newWave` 的 `waveDelay` 均为0，因此本场景不显示逐波开波按钮或波间倒数；单波预览仍保留手动开始。Wave08 的请求、敌人、投射物及死亡清理结束后才胜利；生命降至0时败北，重开从 Wave01 初态开始。

原始波次数据仍来自 REA/JADX 归档的 `R/data/waves.json` 与 `GameDesignWaves` 调用行。Wave04–08 的HP/速度倍率、pool type 2–11 请求向量和间隔由独立常量测试逐项核对；完整规则测试以空请求隔离夹具验证八次自动推进、终局胜利和无人工开波输入的确定性回放，另以败北夹具验证重开。正式战役入口、关卡解锁和 P1-E 档案接通仍未由本轮实现。

| 验收面 | 本地结果 |
| --- | --- |
| 自动状态机 | 正式 campaign 开局即为活动态；`start-wave` 输入被拒绝；清除一波后直接进入下一波。单波预览测试仍验证必须输入 `start-wave`。 |
| 波次与结算 | P1-D 测试逐项检查8波原始倍率/间隔/请求，验证第1–7波不结算、第8波胜利、失败后以同一随机种子重新打开时恢复 Wave01。 |
| 浏览器入口与循环 | 页面切换到活动场景后在替换锁解除时启动帧循环；E2E 选择4×、确认 Wave01 自动开始、手动开波控件隐藏、真实地图雇佣枪手，并完成 Wave08 胜利。E2E 用虚拟时钟和100ms帧间隔加速等待，游戏仍调用正式时间累加器并遵守4×与单步上限。 |
| 变异审查 | 临时反转 campaign 首波初始 phase 后，自动开波与败北/重开测试按预期失败；恢复后 P1-D 测试通过。 |
| 全量本地 CI | `pnpm run test:ci` 通过：145项单元测试、生产构建、49项 Playwright 测试；TypeScript 检查通过。审查后受影响的64项 Game/P1-C/P1-D 单元测试再次通过。 |
| 发布与公开浏览器 | P1-D 实现提交 `139a48a` 经 `837c2a2` 合入并推送，首次部署 [run 40824917785](https://github.com/wishflow/wishflow-tools/actions/runs/40824917785)。首次公网核对发现静态说明仍写“目前可玩原版前三波”；修复提交 `7386738` 经 `0280903` 再次合并发布，后续 [run 40826519688](https://github.com/wishflow/wishflow-tools/actions/runs/40826519688) 的应用测试、共享检查及 Cloudflare Pages、GitHub Pages 部署成功。Codex 内置浏览器在 `?release=0280903` 验证中文和英文说明、4× 自动开波；约10秒后进入 Wave02，继续至 Wave03/8 时暂停，生命50、现金$107。控制台 error/warn 为空；波次与现金为本次随机观察值，完整八波胜利由 Playwright 覆盖。 |


## 39. P1-E 正式战役入口与档案

P1-E 将 Cow Gulch L01 接入正式战役流程，同时保留旧样本和 P1-D 内容身份。正式关卡 ID 为 `campaign-new-mexico-01`，内容版本为 `gng-free-1.8.6-new-mexico-01-p1e-v1`，全局关卡号为1，正式结算已启用。Progress/IndexedDB 既有 schema 与数据库版本不变；正式通关和最高分只写入该关卡 ID，旧 `cow-gulch`、P1-D 波次场景及两个进度样本的既有记录不会自动转换成正式进度。新墨西哥州第2关在第1关通关后可显示为已解锁，但关卡内容未实现，仍不能进入。

启动时在资源和设置加载完成后进入正式牛溪谷第1关。默认难度从已保存设置读取，并只影响下一场战斗；已经开始的战局不因设置切换而改变。设置面板的模拟速度范围为0.25×–4×，速度设置与站点共享语言偏好均能在刷新后保留。未完成战局不保存波次状态，刷新后从 Wave01 初态重开。正式胜利/失败结算使用独立战役 ID 更新档案；缺少必需资源时阻止正式关卡进入，同时保留可操作的恢复场景和重试入口。

| 验收面 | 结果 |
| --- | --- |
| 身份与内容 | 内容测试核对正式场景 ID、版本、全局关卡号、八波及正式结算标记；旧样本 ID 与内容版本继续独立。 |
| 正式档案隔离 | 进度测试及浏览器测试证明，旧样本胜利不会完成官方 L01；完成正式八波后，`completedScenarios` 与 `highScores` 只按 `campaign-new-mexico-01` 写入，刷新后正式进度仍显示已完成。 |
| 战局生命周期与设置 | Playwright 覆盖未完成战局刷新后回到 Wave01、难度只应用于下一场、模拟速度边界和持久化，以及资源缺失时禁用正式入口并允许重试。 |
| 本地 CI | `pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript 检查、147项单元测试、生产构建及50项 Playwright 测试。 |
| 公开页面 | GitHub Actions [run 40833708396](https://github.com/wishflow/wishflow-tools/actions/runs/40833708396) 成功；`test-shared`、`test (gunsnglory)`、`deploy-cloudflare-pages`、`deploy-github-pages` 均通过，Worker/config 检查因静态应用变更而跳过。Codex 内置浏览器访问 `https://wishflow-tools.pages.dev/gunsnglory/?release=593fe5a`，确认中文正式入口、0/1 初始进度、L01 可进入、L02 显示未实现且禁用；切到英文后相同信息正常本地化。 |
| 内置浏览器操作与视口 | 公开页面核对了模拟速度4×和0.25×边界，设置保存反馈正常；暂停后刷新，战局回到 Wave01，速度设置保留。390×844 手机视口下页面改为单列、地图保持比例，截图未见横向溢出；检查后恢复桌面视口、中文和原有4×设置。公网检查只运行并暂停首关，完整八波胜利由本地 Playwright 覆盖。 |

P1-E 已完成并发布，但不代表 P1-F 对原版首关的地图/对象、规则、表现及输入行为完成整体对照。真实 Android AVD 触控仍未验证；P1-F 通过前，完整原版关卡计数仍为0/60。
## 40. P1-F 视口缩放与音效设置增量

本轮在 P1-F 首关对照中修正地图视口缩放和点选坐标，并将音效开关纳入 IndexedDB 设置。P1-F 的完整地图/对象、规则、表现及结算对照仍未完成，L01 继续按0/60计数。

| 验收面 | 结果 |
| --- | --- |
| APK 缩放依据 | `codex/gunsnglory-spec` 研究分支的视口与输入分析根据目标 APK 的 REA/JADX 记录归纳：地图比例目标按 `widthPixels / (mapWidthTiles × 32)` 计算，并受 Splash 缩放下限 `0.85×` 和上限 `max(2×, 1.0)` 约束；比例先按百分位取整，再将格宽截为整数。`initCamera()` 按地图和 Canvas 尺寸初始化中心相机。关键方法证据为 REA-214（地图目标比例）、REA-211（相机初始化）及 REA-216（相机尺寸/边界）。这些是静态分析结论，不代表已完成原版设备像素级运行对照。 |
| 视口与边界 | 网页按屏宽目标、原版缩放上下限、百分位取整和显示像素取整计算格宽；地图绘制、对象锚点及点选使用同一视口变换，绘制限定在16:9逻辑画布。Cow Gulch 的17×17地图在1024×576画布中为60px格、1020×1020地图、原点(2,-222)，超出画布的上下部分被裁切。40格宽地图的下限测试确认按0.85×缩放，格宽27px并由相机裁切左右边缘。 |
| 地图点选 | 更新桌面与触屏 E2E 点位，改用新视口下可见的枪手/Mexican 睡眠槽；旧坐标针对先前“按高度缩放”的地图，不再作为点选预期。Canvas 边缘采样验证视口外仍显示画布背景，地图内显示纹理。该改动未修改路线、地形或寻路规则。 |
| 音效与旧档 | 新增中英文 Sound On/Off 控件；音效偏好保存在现有设置记录中，不升级 IndexedDB schema 或数据库版本。旧记录缺少 `soundEnabled` 时默认为开启；调整倍速或难度会保留音效值。浏览器测试覆盖实际战斗声音请求在开启时调用播放、关闭时不调用播放，并验证静音与4×设置在刷新/新同源页中保留。测试拦截播放方法确认请求分派，不等同于逐个音频资源的听感验收。 |
| 本地 CI | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4175 CI=1 nvm exec 22.23.3 pnpm run test:ci` 通过：TypeScript 检查、148项单元测试、生产构建及51项 Playwright 测试。CI 浏览器测试固定为单 worker，避免并行战局争用帧循环和时间敏感断言。测试覆盖桌面鼠标、390×844触屏选择、地图缩放/裁切、音效设置、存档兼容与既有关卡流程。 |
| Codex 内置浏览器本地实测 | 在 `http://127.0.0.1:4174/gunsnglory/`（1280×720 浏览器视口）检查 Cow Gulch 画面；将速度设为4×、音效关闭后，页面显示“Settings saved.”。在同源新页确认4×和 Sound Off 被恢复；刷新原页后战局回到 Wave01，设置仍为4×/Off。该页面控制台没有 error。手机触屏与390×844布局由完整 Playwright E2E 覆盖。 |
| 发布与部署 | master 提交 `d40a494` 的 [GitHub Actions 运行](https://github.com/wishflow/wishflow-tools/actions/runs/40851500700)通过；Guns’n’Glory 测试、Cloudflare Pages 与 GitHub Pages 部署均成功。Worker 发布按静态站点变更规则跳过。 |
| Codex 内置浏览器公网实测 | [公开版](https://wishflow-tools.pages.dev/gunsnglory/?release=d40a494)在1280×720视口下正常加载；Canvas CSS 尺寸1022×574，内部分辨率2044×1150，保持16:9比例且页面没有横向溢出。检查地图裁切、地图纹理及倍速/音效控件；倍速0.25×与4×边界、音效关闭并刷新后的设置恢复均正常。测试前原设置为4×/开启，结束时已恢复；战役完成数仍为0/1，未提交正式结算。页面控制台错误数为0。390×844触屏布局与操作由上述51项 Playwright 测试覆盖。 |

本地浏览器测试期间曾遗留4个 `127.0.0.1:4174` 页面继续以4×推进战局，随后将 Cow Gulch 第1关胜利写入该 localhost 来源的 IndexedDB，本地档案变为1/1。完整测试前档案快照不可用，因此没有擅自清除该本地记录；公开域名档案独立，实测仍为0/1。后续本地浏览器测试应使用隔离存储，并在检查结束前暂停或关闭测试页。

本轮只确认宽度缩放、裁切坐标及设置回归，不证明 APK 每个分辨率的最终像素完全一致；未逐个听辨 OGG 资源，也未完成 Android 真机/AVD 触控或 P1-F 完整首关对照。

## 41. P1-F 原版战斗 HUD 与小地图增量

本轮按原版战斗画面补齐 Canvas 顶栏、数字图集、暂停图标、生命星章和小地图，并让顶栏点击命中 HUD 自身。此项是 P1-F 的表现/输入切片；没有改动寻路、战斗规则或正式存档格式，完整首关仍为0/60。

| 验收面 | 结果 |
| --- | --- |
| 原版资源与显示 | 从 APK 资源中迁入顶栏中段/两端、暂停/按下暂停、星章底/填充及数字图集。Canvas 使用原图按逻辑画布坐标绘制现金、当前波次/总波次、剩余生命；星章填充按剩余生命占初始生命比例裁切。资源清单只覆盖当前 Cow Gulch 战斗 HUD，不代表菜单和其它关卡 UI 已迁入。 |
| 小地图 | 使用 TDM 原始格值映射 Cow Gulch 水域、冰面、峡谷与荒地基础色，在原版66×50面板中以2px/格居中显示17×17地图，并叠加道路、单位/敌人标记和地图视口框。独立 Canvas 测试与浏览器像素断言核对水域、荒地样本及内外描边；复杂岸线及所有随机贴图变体仍需后续固定状态对照，当前不宣称逐像素完全一致。 |
| HUD 输入 | 暂停图标切换既有暂停状态；顶栏其余区域消费点击，避免点穿到底层地图。完整 E2E 首轮发现旧测试仍点击被 HUD 覆盖的枪手格，导致正确的遮挡行为表现为测试失败；用例已改为选择画面可见的枪手格，并从 HUD 下方空地清除选择。暂停、覆盖区不穿透与地图选择回归通过。 |
| 自动化验证 | `PLAYWRIGHT_PORT=4178 CI=1 nvm exec 22.23.3 pnpm run test:ci` 通过：TypeScript 检查、149项单元测试、生产构建及52项 Playwright 测试。E2E 覆盖桌面点击、触屏选择、顶栏暂停、HUD 覆盖点击、小地图颜色像素和原八波整关结算；全套运行约1.9分钟。随后加强“HUD 覆盖区不点穿”的桌面断言，`PLAYWRIGHT_PORT=4179 nvm exec 22.23.3 pnpm exec playwright test tests/e2e/t01.spec.ts --reporter=line` 的3项测试再次通过。 |
| 回归测试灵敏度 | 临时把暂停图标的命中结果从 `pause` 反转成 `covered`，Canvas HUD 测试因期望暂停命中而失败；恢复实现后单测/整套 CI 与3项 T01 浏览器测试通过。 |
| Codex 内置浏览器本地检查 | 在 `http://127.0.0.1:4176/` 的桌面视口检查地图与新 HUD 同屏；截图可见原图顶栏、现金/波次/生命数字、星章和小地图，暂停按钮切换成 Resume，页面状态显示“Battle paused.”。浏览器控制台 error 为空。画面检查未推进到战役结算；本机 profile 原有完成记录保持原样。 |
| 发布与部署 | 功能提交 `18a2301` 经 `gunsnglory` 集成后合入 `master`，合并提交为 `5120cf2`。GitHub Actions [run 40870354973](https://github.com/wishflow/wishflow-tools/actions/runs/40870354973) 成功；`test-shared`、`test (gunsnglory)`、Cloudflare Pages 与 GitHub Pages 均通过。Worker 与 Cloudflare 配置任务因本次只改静态应用而跳过。 |
| Codex 内置浏览器公网实测 | 在 `https://wishflow-tools.pages.dev/gunsnglory/?release=5120cf2` 打开已部署版本。1280px 桌面视口下可见 Cow Gulch 第1关原图顶栏、现金/波次/生命数字、星章、小地图和地图对象；点击暂停后辅助状态显示“战斗已暂停”，页面存档仍为正式第1关未结算（0/1）。浏览器控制台 error 为空。该公开来源此前已保存4×速度设置，初始战斗在检查期间推进至3/8后暂停；没有推进到结算，也没有改变速度、音效或战役档案。 |

本轮只补齐并验证战斗 HUD 的代表画面与点击分发，不代表小地图所有地形变体、所有界面状态、真实设备触控或 P1-F 首关完整对照已通过。完成完整随机状态/输入重放和结算对照前，Cow Gulch 仍不计入已通过的60关分母。

## 42. P1-F Cow Gulch 地图装饰增量

本轮按 Cow Gulch 原始 TDM 对象码恢复静态场景装饰，补上仙人掌、岩石、树、风车、灌木、骨骸、棚屋及水边岩石等10种原版图集。装饰清单由 `td_map_01.tdm` 的31个对象格生成，使用与地图/单位一致的缩放变换；以对象脚底锚定，按来源行列排序，在道路和单位之上绘制，并保留逻辑画布边界裁切。未改动地形数据、路线、寻路、战斗规则或存档。

| 验收面 | 结果 |
| --- | --- |
| 原始地图与图集映射 | 内容测试从原始 `.tdm` 字节独立解析对象格，核对31个装饰的位置及图集映射；所有新增 PNG 均通过文件格式检查。 |
| 坐标与图层 | Canvas 测试覆盖来源行列绘制顺序、脚底锚点、双格棚屋水平偏移、道路/单位上层绘制以及地图外溢出仍受逻辑画布裁切。 |
| 专项测试 | `pnpm exec node --import tsx --test tests/content.test.ts tests/canvas-renderer.test.ts` 通过14项测试；`git diff --check` 通过。 |
| 本地完整 CI | `pnpm run test:ci` 通过：TypeScript 检查、151项单元测试、生产构建及52项 Playwright 测试。 |
| Codex 内置浏览器公网检查 | 在 `https://wishflow-tools.pages.dev/gunsnglory/?release=331076d` 的1280×720视口检查正式 Cow Gulch 画面，截图可见峡谷道路、桥与岩壁，以及映射后的装饰贴图。页面原有4×设置未调整；战局推进到第3/8波后暂停，正式档案仍为0/1且无结算。浏览器 error/warn 均为空。该运行状态仅用于核对地图绘制，不作为完整战役或随机战斗结果的验收。 |
| 集成与发布 | 功能提交 `001c8e8` 合入 `gunsnglory`（`f80e79b`），再合入并推送 `master`（`331076d`）。GitHub Actions [run 40879745455](https://github.com/wishflow/wishflow-tools/actions/runs/40879745455) 成功，应用测试、共享站点检查、Cloudflare Pages 和 GitHub Pages 部署均通过；Worker 与 Cloudflare 配置检查按静态站变更范围跳过。 |

本轮只完成静态地图装饰的内容与代表性画面核验，不代表全部随机地图变体、逐像素原版对照、全动画/方向帧、声音播放或真实设备触控已通过。P1-F 完整首关对照仍未完成，Cow Gulch 仍不计入已通过的60关分母。

## 43. P1-F Cow Gulch 静态装饰碰撞增量

本轮将原版静态装饰物的碰撞框纳入枪手移动判定，修复单位可穿过骨骸、棚屋和小型装饰物的问题。坐标按原版对象格中心换算到网页地图格左上角；保留原背景瓦片阻挡和道路覆盖规则，也不改变敌人的固定路线逻辑。

### DEX 依据与坐标

`GameObjectManager.createGameObjectsFromBasicMap` 按 `cell × 7680 + 3840` 设置对象的 `fineX/fineY` 中心锚点（研究分支 `codex/gunsnglory-spec` 中的 `apps/gunsnglory/docs/research/evidence/dex/GameObjectManager.dexdump.txt`，DEX `0x407cd0` 与 `0x407d2c–0x407d38`）。`CollisionManager.createCollisionObject` 按装饰物类型构造矩形（同研究分支的 `CollisionManager.dexdump.txt`，DEX `0x401d7c–0x401eb6`）；下表将其换算成相对对象格左上角的 `collisionBoxFine`：

| TDM 对象码 | 原版类型 | 相对格子碰撞框（x, y, 宽, 高；fine units） |
| --- | --- | --- |
| 68、69、71、73、74、76、126 | 通用小型装饰 | `(1920, -1228, 3840, 2534)` |
| 70 | 岩石类型3 | `(1306, -1920, 5068, 3840)` |
| 77 | 骨骸类型10 | `(0, -9600, 7680, 11520)` |
| 116 | 棚屋类型12 | `(-3840, -1228, 15360, 3840)` |

移动时用枪手既有 AABB 与装饰碰撞框做严格矩形相交测试，仍按既有逐轴移动，因而可贴着边界行走。地图数据内容版本同步升为 v4/P1-A 至 P1-E 对应的 v2；Game 规则升为 `gng-rules-3`，避免新旧移动/回放语义共用版本。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 内容映射 | 独立解析原始 TDM 并逐对象比对图集、31 个格子位置和碰撞框；覆盖通用装饰、石堆、骨骸及棚屋。 |
| 移动规则 | Game 测试让单位持续向装饰物移动，断言枪手右侧碰撞边不越过原版矩形；同时验证棚屋前仍可接近。地形碰撞及道路覆盖回归继续通过。 |
| 拖拽与触屏 | Playwright 桌面拖拽验证路径被 Cow Gulch 原始仙人掌/石堆挡住、释放后停止；pointercancel、lostpointercapture 和手机触屏拖动回归通过。 |
| 测试修正记录 | 首个新增 fixture 只推进500ms，单位尚未到障碍，因此无碰撞的旧实现也误通过。延长持续移动并比较 AABB 与障碍边界后稳定复现穿行（枪手中心 x 从11520推进到24912）；后续不再用“尚未走到下一格”作为阻挡证据。 |
| 本地完整 CI | `CI=1 PLAYWRIGHT_PORT=4180 pnpm run test:ci` 通过：TypeScript 检查、152项单元测试、生产构建及52项 Playwright 测试。桌面拖动用例改为断言单位在原始仙人掌/石堆前停止，桌面、触屏及指针取消回归通过。 |
| Codex 内置浏览器公网实测 | 在 `https://wishflow-tools.pages.dev/gunsnglory/?release=1968397` 打开已发布页面；中文正式关卡和 Cow Gulch 地图正常加载，进度为0/1。战局推进到第7/8波后暂停；检查面板显示初始枪手位置为`(8.50, 8.75)`、生命30，路线起点为`(-1.5, 10.5)`；截图中画布外敌人不可见。模拟速度临时调至0.25×后恢复为用户原存档4×，未提交结算或更改战役档案。暂停时拖动不会下达移动指令；继续战斗以实测装饰碰撞的操作被浏览器自动审批拦截，因此公网移动/碰撞交互未验证，也未绕过限制。页面加载和暂停交互通过；碰撞回归以本地规则与Playwright测试为证。 |
| 集成与发布 | 功能提交`80d7d1c`已合入`gunsnglory`，并以`1968397`合入、推送`master`。GitHub Actions [run 40894857581](https://github.com/wishflow/wishflow-tools/actions/runs/40894857581)成功；应用测试、共享站点检查、Cloudflare Pages和GitHub Pages部署均通过，Worker/config检查按静态站变更范围跳过。 |

本轮只修复玩家单位与静态装饰碰撞框的相交判定。敌人路线、其他地图的装饰类型及所有对象组合仍需各自依据对应内容与原版行为核验；Cow Gulch 整关对照仍未完成，继续不计入已通过的60关分母。

## 44. P1-F Cow Gulch 装饰与单位深度排序

网页原先先绘制全部玩家单位，再统一绘制静态装饰，因此无论对象在地图中的前后位置，装饰都会覆盖单位。此轮将两类场景对象放入同一深度队列，保留地图、敌人、道路、投射物和残骸的现有图层顺序。

### APK 静态依据

REA/JADX 归档中的 `GunsAndGloryThread` 先绘制背景，再由 `drawEnemies()` 遍历 `gameObjectsDraworder`，处理排序值小于 `768000` 的队列前段；该遍历包含 `GameObjectShot` 与 `GameObjectEnemy`（DEX 方法入口 `0x3fbe5c`）。随后绘制网格框和道路层，`drawObjects()` 从 `currentElement` 继续绘制剩余的非敌人对象（方法入口 `0x3fc270`；主绘制调用点 `0x3ff632`）。`GameObjectManager.getValueByObject` 的排序值为 `fineY + drawingOffsetY + fineZ × 100`（DEX `0x407a30–0x407a44`）；因此在 Cow Gulch 的坐标范围内，`fineZ=0` 对象位于道路前，`fineZ=7680` 对象位于道路后。`insertDrawOrder` 按此值升序插入，值相同时新对象插在已有对象之前（DEX `0x408674–0x4086e8`）。Cow Gulch 地图对象由 `createGameObjectsFromBasicMap` 按行列扫描，装饰对象以格中心坐标和 `fineZ=7680` 创建（DEX `0x407d2c–0x407d38`、`0x407dfa–0x407e1a`）。

在本轮比较的 Cow Gulch 静态装饰和玩家单位中，深度随地面锚点的 `fineY` 增长，二者 `fineZ` 相同；装饰地面锚点为其地图格底边，单位使用当前 `positionFine.y`。网页据此按 `(decoration.cell.y + 1) × 7680` 和 `unit.positionFine.y` 排序。REA/JADX 反编译文本是分析产物，不是原始 Java 源码。相同深度时网页使用确定性的集合顺序；动态新建对象与原版插入序列的逐项一致性尚未纳入此切片。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 回归测试 | 先修改 Canvas 测试，使单位位于后排树木与前排灌木之间；旧实现因所有装饰都在单位之后绘制而失败。按深度排序后，树先于单位、单位先于灌木；地图背景/敌人/道路层级、装饰锚点和逻辑画布裁切断言保持通过。 |
| 单位绘制行为 | 单位绘制函数只从既有循环提取，射击帧、镜像、睡眠 Zzz、选中标记和命中框保留原逻辑；同文件测试继续覆盖睡眠动画和其它 Canvas 表现。 |
| 专项测试 | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4180 nvm exec 22.23.3 pnpm --dir apps/gunsnglory exec node --import tsx --test tests/canvas-renderer.test.ts` 通过5项测试。 |
| 本地完整 CI | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4180 CI=1 nvm exec 22.23.3 pnpm run test:ci` 通过：TypeScript 检查、152 项单元测试、生产构建及52项 Playwright 测试。 |
| Codex 内置浏览器本地检查 | 在 `http://127.0.0.1:5176/gunsnglory/` 检查 Cow Gulch 静态装饰、单位、敌人、桥和 HUD；地图检查叠层可显示路线、单位锚点和射程，关闭叠层后原画正常。暂停在 Wave02/8，状态显示50条命且正式档案无结果；未完成关卡结算。浏览器实测用于确认发布前页面绘制正常，单位与装饰的深度顺序由上述 Canvas 回归测试作精确断言。 |
| 发布与公网实测 | `master` 合并提交 `1ff50d3` 已推送。GitHub Actions [run 40911621390](https://github.com/wishflow/wishflow-tools/actions/runs/40911621390) 中 `test (gunsnglory)`、`test-shared`、Cloudflare Pages 和 GitHub Pages 均成功；Worker/config 检查因静态应用变更而跳过。Codex 内置浏览器访问 [公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=1ff50d3)，确认 Cow Gulch 地图、道路/桥、静态装饰、单位和战斗 HUD 正常；暂停在 Wave01/8，50条生命，未结算。测试前后原有正式档案均为1/1、最高分 $356；没有修改速度或档案。随后 master 上的 P8 文档提交 `86aba9e` 触发 [run 40911778860](https://github.com/wishflow/wishflow-tools/actions/runs/40911778860)，文档检查通过，应用测试和部署按 docs-only 变更规则跳过。 |

静态装饰之间的同深度地图扫描插入顺序现由第48节补齐；动态对象、单位与装饰之间的逐实例同深度队列、敌人与装饰的完整遮挡对照及其它关卡仍属于 P1-F 后续对照范围。本轮不据此调整路线、地形或战斗逻辑，也不将 Cow Gulch 计为已验收关卡。

## 45. P1-F Cow Gulch 投射物与残骸深度排序

本轮将投射物和车厢碎片并入玩家单位、静态装饰共用的地面深度队列。原版低 Z 敌人与投射物在道路前按同一排序值绘制；网页将其对应为道路前的敌人与低 Z 投射物深度队列。玩家单位、装饰、车厢碎片和高 Z 投射物在道路后排序。车厢碎片单独运动，但排序沿用原版 `GameObjectWagonParts.fineY` 父锚点，不随碎片的空中轨迹改变。

### APK 静态依据与边界

REA/JADX 归档中的 `GunsAndGloryThread.drawEnemies()` 按 `GameObjectManager.gameObjectsDraworder` 遍历并绘制 `getValueByObject() < 768000` 的对象，然后绘制道路；`drawObjects()` 再绘制剩余非敌人对象。排序值为 `fineY + drawingOffsetY + fineZ × 100`，同一 `fineZ` 下等价于按地面 Y 排序。Cow Gulch 静态装饰、玩家单位和 `GameObjectWagonParts` 使用 `fineZ=7680`；碎片由 `GameObjectWagonParts` 按父对象固定 `fineY` 绘制。依据位于研究分支 `codex/gunsnglory-spec` 的 `apps/gunsnglory/docs/research/recovered-source/java/com/hg/gunsandglory/game/GunsAndGloryThread.java`、`gamelogic/GameObjectManager.java` 与 `gamelogic/GameObjectWagonParts.java`；这些 REA/JADX 反编译文件是分析产物，不是原始 Java 源码。

`GameObjectShot` 初始继承射手的 `fineZ`。伤害类型 3、4、5、6 的未命中投射物在 `f < 0.5`、计算出的垂直偏移 `< 7680` 且 `fullZ == 1` 时把 `fineZ` 从 7680 改为0，并更新 draw order；峡谷且非道路条件只包围拖尾线绘制，不限制深度切换。依据为研究分支同目录 `gamelogic/GameObjectShot.java` 与 Smali `GameObjectShot.draw()` 的独立分支。本节记录的是本轮开始前的网页状态：`ShotView` 未暴露 `fineZ` 和原版弹道高度，因此投射物被统一排在道路之后；该实现缺口已由验证记录第 46 节处理。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 回归测试 | Canvas 夹具让树木、单位、投射物、车厢碎片和前排灌木按不同地面 Y 交错，断言绘制序列为背景→敌人→道路→后排装饰→单位→投射物→残骸→前排装饰；同时保留视口裁切及锚点断言。 |
| 残骸锚点 | P1-C 运输死亡测试确认所有20个碎片使用车厢父对象的固定 `fineY` 排序；推进100ms后碎片位置已移动，但深度锚点不变。 |
| 本地完整 CI | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4180 CI=1 nvm exec 22.23.3 pnpm run test:ci` 通过：TypeScript 检查、152 项单元测试、生产构建及52项 Playwright 测试。 |
| Codex 内置浏览器本地检查 | 在 `http://127.0.0.1:5177/` 以 1280×720 视口检查 Cow Gulch；截图可见 HUD、峡谷岩壁、两座桥、静态装饰、枪手、敌人及车厢碎片。检查时本地测试页显示 Wave04/8，生命46，敌人7，现金$139；随即暂停，正式档案仍为0/1，未产生结算。该画面核对地图与层级呈现，不作为战斗随机结果的验收证据。 |
| 浏览器控制台 | 本地内置浏览器错误及警告日志为空。 |
| 发布与公网实测 | `master` 提交 `816f98fa74b885b6a526b04205d3ac8ac6b04acd` 已推送。GitHub Actions [run 40922924699](https://github.com/wishflow/wishflow-tools/actions/runs/40922924699) 的 `test (gunsnglory)`、`test-shared`、Cloudflare Pages 与 GitHub Pages 均通过；Worker/config 检查按静态应用变更范围跳过。Codex 内置浏览器访问[公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=816f98f)，截图核对 Cow Gulch 峡谷道路、桥、静态装饰、枪手、敌人和车厢；暂停时为 Wave01/8、生命50、敌人13、现金$68。已保存战役档案前后均为1/1、最高分$356；速度仍为4×，没有提交结算或改动设置。浏览器控制台错误与警告为空。战斗 HUD 的短时数值仅记录当次观察，不作规则预期。 |

本轮验证的是道路后的共享地面深度队列和车厢碎片锚点；特殊投射物的动态 `fineZ` 在当时尚未实现，现由第 46 节补齐。敌人不是固定图层；敌人、投射物、单位和装饰跨类型的动态同深度队列顺序仍待核验，静态装饰之间的同深度顺序见第48节。Cow Gulch 首关仍为0/60。

## 46. P1-F Cow Gulch 特殊投射物弹道与道路图层

本轮补齐伤害类型 3、4、5、6 未命中投射物的弹道偏移与动态 `fineZ`。投射物的地面锚点保持原位置，绘制位置使用 `positionFine.y - heightFine`；当原版条件满足时，弹道高度与地面层级分开维护，低层投射物在道路之前绘制。

### 规则依据与实现

依据为研究分支 `codex/gunsnglory-spec` 中的 `GameObjectShot.java`、`GameObjectShot.draw()` Smali 和 `GameObjectUnit.UNIT_PLACEMENT_OFFSET_Y=1920`。原版 `f` 是 Java float，计算弹道前保留 float32 舍入；位置项乘法也保留 float32，传给正弦函数时再提升为 double。`fullZ==1` 的投射物仅在 `f < 0.5`、垂直偏移 `< 7680` 且尚未命中时从 `fineZ=7680` 切到0。峡谷且非道路只决定拖尾线绘制。完整公式见[产品规格 §4.7](spec.md#47-动画与声音必须对应真实行为)。

网页在 `ShotView` 中加入派生高度和绘制深度；回放 canonical state 继续排除两项渲染字段，保持规则状态格式不变。为了保持同一模拟帧的 `advance()`、`observe()` 和暂停重绘一致，满足条件后先记录待切层标记，待下一游戏帧开始时应用；这对应原版在绘制当前投射物后更新顺序、下一帧显示新层级的行为。

### 验证

| 验收面 | 结果 |
| --- | --- |
| Java 数值精度 | 以飞行总时长 300 ms、剩余 50 ms 的固定夹具验证伤害类型 3/4/5/6；分别断言高度 7681、6080、7681、1088 fine units，覆盖 Java float32 比值、位置项舍入和整数截断。 |
| 切层时序 | Game 测试先复现高弹道保持 `fineZ=7680`，再验证下降且偏移 `<7680` 时当前帧仍绘制于道路上方，后续游戏帧切至0；在阈值帧重复 `observe()`、暂停重绘及暂停推进，均断言 `fineZ` 不变。 |
| 地形适用范围 | 特殊投射物夹具没有峡谷或道路，仍按高度与飞行进度切层；确认深度转换没有错误依赖拖尾专用的地形条件。 |
| 回放状态边界 | 断言 `fineZ` 与 `heightFine` 不进入 replay canonical shot shape；已有 replay 确定性测试继续覆盖帧推进。 |
| Canvas 绘制 | Canvas 测试断言低层投射物画在道路下方，炸药 sprite 的绘制底边对齐弹道锚点；背景、敌人、道路及对象深度队列已有层级测试继续运行。 |
| 本地完整 CI | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4181 CI=1 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript 检查、154 项单元测试、生产构建及52项 Playwright 测试；`pnpm run test:catalog` 的14项共享站点检查通过。首次在受限沙箱内运行构建时，Vite 写入工作树 `node_modules/.vite-temp` 被系统拒绝；获准在该工作树运行同一测试命令后完整通过。 |
| Codex 内置浏览器本地检查 | 在 `http://127.0.0.1:5176/`、1280×720视口检查导航、Cow Gulch、HUD、地图和测试控件。自动战局短暂运行至 Wave06/8、36条生命、26名敌人、$179 后立即暂停；正式档案仍显示1/1、最佳分数 $360，没有产生新结算。浏览器 error/warn 为空。页面目视不用于宣称动态炸药画面已实测；其高度、锚点与道路前后层级由本节固定数值和 Canvas 断言验证。 |
| 发布与公网实测 | `master` 发布提交 `666c6c1b5b6a493adac7cef674a8cf7b8530499a` 已推送。GitHub Actions [run 40933632292](https://github.com/wishflow/wishflow-tools/actions/runs/40933632292) 中 `test (gunsnglory)`、`test-shared`、Cloudflare Pages 和 GitHub Pages 均通过；Worker/config 检查按静态应用变更范围跳过。Codex 内置浏览器访问[公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=666c6c1)，以1280×720视口确认导航、战役档案、Cow Gulch 地图与战斗 HUD 正常。战局暂停在 Wave01/8、50条生命、5名敌人、$76；正式档案测试前后均为1/1、最高分 $356，速度保持原存档4×，未产生结算。浏览器 error/warn 为空。 |

本轮只补齐 Cow Gulch 当前实现所用特殊投射物的高度和道路层级，不代表所有弹道帧、拖尾动画、所有地图对象遮挡及整关原版对照完成。Cow Gulch 首关仍为0/60。

### 开发预览排错记录

本地 Vite 开发预览在重命名弹道切层函数后，热更新期间短暂报告旧符号 `updateShotFineZ` 未定义；整页重载后恢复。该日志来自热更新状态，不是最终源码构建或公开页面错误。今后若 HMR 在函数改名后报旧符号，先做整页重载并检查最终浏览器日志，再判断是否为可复现的代码缺陷。

## 47. P1-F Cow Gulch 受损敌方生命条

补齐原版对受损敌人的生命条绘制。仅敌人类型大于2、仍存活、`0 < HP < trunc(maxHP × 95 / 100)` 时显示；满血、达到95%门槛、死亡或无有效生命值时隐藏。生命条沿敌人的中心 X 和脚底 Y 锚定，背景为 `RGB(63,0,0)`，填充高度为背景的一半；原版缩放低于1时，背景底边缩短1个画布像素。填充宽度按 float32 转整数、再整数除法的顺序计算，颜色通道也按 Java float32 取整。原版几何以48像素/格和 `mScalingFactor` 表达；网页以32逻辑像素/格渲染，`mScalingFactor` 对应 `viewport.tileSize / 48`。

实现依据为研究分支 `codex/gunsnglory-spec` 的 REA/JADX 反编译 `GunsAndGloryThread.drawEnemies()`；规则和源坐标换算已收录在[产品规格 §4.7](spec.md#47-动画与声音必须对应真实行为)。反编译结果是分析产物，不是原始源码。当前网页可用敌人类型没有9型，因此源码中的类型9例外不影响现有类型集合。

### 验证

| 验收面 | 结果 |
| --- | --- |
| TDD 回归 | Canvas 断言先确认原实现缺少生命条而失败；逐行对照源码后，新增断言也捕获了填充误用整条高度及宽度误缩放。修正后，底条/半高填充几何、float32/整数宽度、缩放低于1时的底边修正、普通与奇数 max HP 的95%门槛均通过。 |
| 专项测试 | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4182 nvm exec 22.23.3 pnpm --dir apps/gunsnglory exec node --import tsx --test tests/canvas-renderer.test.ts` 通过，5项测试。 |
| 类型检查 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm --dir apps/gunsnglory run typecheck` 通过。 |
| 开发分支完整 CI | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4183 CI=1 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript 检查、154项单元测试、生产构建及52项 Playwright 测试。 |
| 合并后 master 检查 | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4184 CI=1 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 的 TypeScript、154项单元测试和生产构建通过；首轮 52 项 E2E 中，`t05` 的结算状态断言失败一次，详见下方排错记录。 |
| E2E 复核 | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4185 CI=1 nvm exec 22.23.3 pnpm --dir apps/gunsnglory exec playwright test tests/e2e/t05.spec.ts -g "saves a formal result across reload and discards an unfinished wave" --workers=1` 单项通过（5.3秒）；`source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4186 CI=1 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:e2e` 全部52项通过（1.8分钟）。 |
| 共享站点目录 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm run test:catalog` 在 master 通过，14项测试。 |
| 内置浏览器与公网发布 | master 发布提交 `add71f94a45a750e41adf2efae1450fd410d55ed` 已推送。GitHub Actions [run 40985798994](https://github.com/wishflow/wishflow-tools/actions/runs/40985798994) 的 `test (gunsnglory)`、`test-shared`、Cloudflare Pages 和 GitHub Pages 成功；Worker 检查因本次只改静态应用而跳过。Codex 内置浏览器访问[公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=add71f9)，确认页面、Cow Gulch 地图/桥、战役 HUD、暂停状态正常。战局暂停在 Wave02/8，生命50、敌人26、现金$81；正式档案仍为1/1、最高分 $356，速度仍为4×，未结算。该 smoke test 未等待满足类型与受伤门槛的敌人出现；生命条几何由本节 Canvas 断言验证。 |

### 合并后 E2E 排错记录

master 首轮 `test:ci` 的 `tests/e2e/t05.spec.ts` 在 `settlement-save-status` 等待“Result saved to this browser.”时超时；错误现场显示仍处于 Wave01/8、敌人10、现金$71。相同测试单独复跑通过，整套 E2E 随后52/52通过，当前没有证据能复现为产品缺陷。若再次出现，先核实 `openSingleWaveSample()` 的场景切换结果和结算状态，再决定是否改动规则或延长超时；不要仅凭一次状态超时修改存档实现。

本节只覆盖受损敌方生命条的绘制规则，不代表 Cow Gulch 或 P1-F 首关验收完成；关卡完成计数仍为0/60。

## 48. P1-F Cow Gulch 静态装饰同深度插入顺序

网页原先在同一绘制深度上按地图行、列升序绘制静态装饰。原版在相同深度插入新对象时，将其放在已有对象之前；按绘制队列从前向后绘制后，先创建的旧对象最后落笔，在绘制范围重叠时覆盖较新的对象。本轮把静态装饰行内次序改为列降序，使同一地图行的并列对象按原版覆盖关系绘制。

### APK 静态依据

REA/JADX 证据 `REA-427 · GameObjectManager.createGameObjectsFromBasicMap` 的反编译输出以 `y` 外循环、`x` 内循环扫描地图；Cow Gulch 对应装饰 tile 在扫描时调用 `addNewGameObject()`。该方法的 object-tile switch 有已记录的 JADX 控制流警告，本结论只使用扫描次序及装饰创建调用。独立 DEX 复核的 `getValueByObject()` 按 `fineY + drawingOffsetY + fineZ × 100` 计算（`0x407a30–0x407a44`）；`insertDrawOrder()` 只在旧值严格小于新值时越过旧对象，所以相等值会把新对象插到旧对象之前（`0x408674–0x4086e8`）。绘制调用顺序见[第44节](validation.md#44-p1-f-cow-gulch-装饰与单位深度排序)。`GameObjectDecoration` 的反编译构造代码把 `fineY` 设为地图单元底边、并接收 `fineZ=7680`（`GameObjectDecoration.java` 反编译行注释 158–164）。这些是研究分支 `codex/gunsnglory-spec` 中 REA/JADX 的分析产物，不是原始 Java 源码。

Cow Gulch 的静态装饰深度为 `(cell.y + 1) × 7680` fine units，同一行的静态装饰因此有相同深度。网页从原始 TDM 网格按行、列升序生成装饰；渲染端只在同深度的静态装饰之间按列降序排序，恢复原版“较新先绘制、较旧后覆盖”的次序。

### 验证

| 验收面 | 结果 |
| --- | --- |
| TDD 回归 | 使用 Cow Gulch 原图同一行的树、仙人掌、岩石和宽棚屋构成 Canvas fixture，断言四种静态装饰的 drawCall 坐标按原版倒序；旧实现按列升序得到相反次序并失败，倒序实现通过。fixture 验证绘制顺序，不宣称这些精简素材发生像素重叠。原有地面深度、路线锚点、画布裁切及跨行对象顺序断言通过。 |
| 专项测试 | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4187 nvm exec 22.23.3 pnpm --dir apps/gunsnglory exec node --import tsx --test tests/canvas-renderer.test.ts` 通过，5项测试。 |
| 完整本地 CI | `source /Users/shiwei/.nvm/nvm.sh && PLAYWRIGHT_PORT=4287 CI=1 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript、154项单元测试、Vite构建及52项Playwright测试。首次使用端口4187时被既有服务占用，完整复跑改用4287后通过。 |
| 站点目录 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm run test:catalog` 通过，14项测试。 |
| Codex 内置浏览器本地检查 | 在 `http://127.0.0.1:5176/` 打开当前开发分支预览；画面中的 Cow Gulch 地图、装饰、桥、单位、战斗 HUD 和视口裁切正常。由于本地预览已有进行中的正式战局，检查时暂停于 Wave01/8；正式档案仍显示1/1、最高分 `$360`，未完成结算。内置浏览器控制台 error/warn 为空。该目视检查是回归烟测，不声称静态装饰同深度排列在实际 Cow Gulch 截图中可见；精确顺序由 Canvas fixture 断言。 |
| 合并、部署与线上实测 | 开发提交 `7c6a21b` 合入 `master`，发布提交 `21294f33bed2f8ed977a7d8cc8e23fdfcd9259a0` 已推送。GitHub Actions [run 40991762223](https://github.com/wishflow/wishflow-tools/actions/runs/40991762223) 的 `test (gunsnglory)`、`test-shared`、Cloudflare Pages 与 GitHub Pages 均成功；Worker/config 检查按本次静态应用变更范围跳过。Codex 内置浏览器访问[公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=21294f3)，确认战役首页、Cow Gulch 地图、桥、静态装饰和 HUD 正常；暂停时为 Wave01/8、生命50、敌人5、现金$76，速度4×。正式档案仍为1/1、最高分 `$356`，未提交结算；控制台 error/warn 为空。此目视核对不代替 Canvas 同深度 drawCall 顺序断言。 |

本轮只对 Cow Gulch 静态装饰之间的同深度地图扫描次序给出确定性保证。单位移动后的历史队列顺序、静态装饰与动态对象之间以及敌人/投射物之间的逐对象同深度次序仍待 P1-F 对照；Cow Gulch 首关仍为0/60。

## 49. P1-F Cow Gulch 敌人行走动画帧推进

敌人移动距离到行走图帧的映射原先只对 type1/2 使用了正确的四段序列，type4 和 type8 则按帧数等分循环，造成 type4 第三段错帧、type8 在边界提前切帧。本轮将网页逻辑改为按 APK 中已实现敌型各自的动画阈值表选帧；移动距离累计、转向期间暂停行走动画以及方向行选择维持原有实现。

### APK 静态依据

研究分支 `codex/gunsnglory-spec` 的 JADX 反编译产物 `GameDesignOptics.java`（`enemyAnimationWalk`，第19行）给出类型帧/距离阈值；`GameObjectEnemy.java`（`move()`，反编译行注释 436–477）累加本帧 `fineX/fineY` 位移，按最后阈值取模，再在 `animStep > 当前阈值` 时前进到下一项。因此表中阈值为包含端点，3,072 fine units 处回到循环起点。相同方法只在 `turningAnimationCounter <= 0` 时更新行走帧。以上是从 APK 反编译得到的分析产物，不是原始 Java 源码。

| 敌型 | 循环内移动距离（fine units） | 帧号 |
| --- | --- | --- |
| type1、type2、type4 | 0–768 | 0 |
| type1、type2、type4 | 769–1,536 | 1 |
| type1、type2、type4 | 1,537–2,304 | 0 |
| type1、type2、type4 | 2,305–3,071 | 2 |
| type8 | 0–768 | 0 |
| type8 | 769–1,536 | 1 |
| type8 | 1,537–2,304 | 2 |
| type8 | 2,305–3,071 | 3 |
| 全部已实现敌型 | 3,072 | 回到帧0 |

### 验证

| 验收面 | 结果 |
| --- | --- |
| TDD 帧阈值 | 新增 `tests/enemy-animation.test.ts`，通过 Cow Gulch 第三波运输队真实生成 type8/type4 敌组，固定速度为每100ms移动768 fine units，并关闭路线转弯以隔离动画状态。type8 在768阈值仍为帧0、跨过后为帧1、跨过1,536后为帧2；type4 覆盖0、1、0、2序列和3,072回绕。修改前 type8 在恰好768处变为帧1，type4 在2,304处显示帧2；修改后断言通过。 |
| 本地检查 | Node 22.23.3 下 TypeScript 检查、全部156项单元测试和 Vite 生产构建通过。Playwright 因沙箱拒绝本地服务器 `listen`（`EPERM`）未能在同一 `test:ci` 进程内启动；启用本地网络后单独重跑 E2E，52项全部通过。 |
| 内置浏览器（本地） | 在 `http://127.0.0.1:5287/` 打开本地页面，官方战役界面、Cow Gulch 地图和 HUD 正常加载，浏览器控制台 error/warn 为空。页面在暂停前有敌人移动，但截图没有可靠地展示 type4/type8 的逐帧变化；这两种车辆敌型的帧状态由上方确定性关卡测试核验，不把静态画面当作动画实测。 |
| 发布流水线 | 开发提交 `c05c277` 已合并到 `master` 提交 `b9a315e` 并推送。Actions run [40995213533](https://github.com/wishflow/wishflow-tools/actions/runs/40995213533) 中共享测试、Guns’n’Glory CI、Cloudflare Pages 和 GitHub Pages 检查通过；静态应用改动未触发 Worker/config 发布。 |
| 公网内置浏览器 | 在 [公网 Guns’n’Glory 页面](https://wishflow-tools.pages.dev/gunsnglory/?release=b9a315e) 加载发布版本，标题、Cow Gulch 战役界面、地图和 HUD 正常，浏览器控制台 error/warn 为空。既有浏览器档案显示1/1完成与最高分 `$356`；页面以4×运行后暂停，未产生新的结算。此检查确认发布页可加载和交互，不替代逐帧动画对照。 |

本轮只闭合已实现敌型 type1/2/4/8 的行走帧距离映射。敌人攻击、受击、状态效果、车辆死亡等动画，以及其它关卡、完整像素裁切和动画节奏观察仍待后续 P1-F 对照；普通步兵 type1/2 的死亡帧另见第50节。Cow Gulch 首关验收仍为0/60。

## 50. P1-F Cow Gulch 普通步兵死亡动画

网页此前对死亡中的 type1/2 步兵使用透明度淡出和红色轮廓。APK 为这两类敌人切换到独立死亡图集，并按剩余死亡计时选择六帧；本轮补入原图并按原版帧阈值绘制，移除死亡状态的额外轮廓。

### APK 静态依据

本地研究分支 `codex/gunsnglory-spec` 中，JADX 对 APK 的分析产物 `apps/gunsnglory/docs/research/recovered-source/java/com/hg/gunsandglory/gamelogic/GameObjectEnemy.java` 显示，unit type 1/2 的 `deathAnimationStyle` 为 1、初始死亡计时为 599 ms；`updateDeathAnimation()` 选择 `sfx_death_pioneers`，帧号为 `5 - floor(deathAnimationCounter / 100)`。`draw()` 把图集横向分成六帧，步兵原帧宽高沿用 16×24，并在死亡期间不对该图层应用淡出。对应 DEX 分析材料位于同分支 `apps/gunsnglory/docs/research/evidence/dex/GameObjectEnemy.dexdump.txt`，可按方法名复核。这些是反编译分析产物，不是原始 Java 源码，也不随本应用发布包提供。

素材从用户提供 APK 的 `res/drawable-mdpi-v4/sfx_death_pioneers.png` 提取，尺寸为 96×24（6 帧，每帧16×24），纳入游戏自身资源目录 [`sfx_death_pioneers.png`](../public/assets/sfx_death_pioneers.png)。当前网页敌型只包含 type1/2/4/8，因此 type9 虽在 APK 构造逻辑中使用相同死亡样式，仍不属于本轮范围。

### 验证

| 验收面 | 结果 |
| --- | --- |
| TDD 帧阈值 | Canvas 行为测试先在旧实现上失败：死亡敌人599 ms 时没有调用死亡图集。修复后核对 599/500/499/100/99 ms 分别选中第 0/0/1/4/5 帧，并断言图集源矩形和全不透明状态。 |
| APK 资源 | 从 APK 提取的 mdpi 图集为 96×24；应用构建清单加载 `sfx_death_pioneers`，不依赖研究目录或 APK 运行时访问。 |
| 本地完整验证 | `CI=1 PLAYWRIGHT_PORT=4180 nvm exec 22.23.3 pnpm run test:ci` 通过：TypeScript 检查、156项单元测试、Vite 生产构建和52项 Playwright 测试。 |
| Codex 内置浏览器本地检查 | 在 `http://localhost:5186/` 用内置浏览器启动单个 Pioneer 样例并确认胜利结算、击败数、现金和样例档案保存；速度设置曾调至0.25×后恢复1×。控制台 error/warn 为空。该浏览器观察确认页面交互和存档可用，但没有把截图作为死亡动画逐帧证据；帧裁切与计时边界由上方 Canvas 行为测试验证。 |
| 发布与公网验证 | `master` 提交 `d609bea` 已推送。GitHub Actions [run 41002619950](https://github.com/wishflow/wishflow-tools/actions/runs/41002619950) 完成且结论为 success：`test-shared`、`test (gunsnglory)`、Cloudflare Pages 与 GitHub Pages 通过；`docs-only`、宠物 Windows、Cloudflare 配置和 Worker 作业按变更范围跳过。Codex 内置浏览器访问[发布页](https://wishflow-tools.pages.dev/gunsnglory/?release=d609bea)，确认标题、Cow Gulch 地图/HUD、现有档案1/1关卡与最高分 `$356`。资源加载后页面自动进入首关；为避免推进战役，短时运行后暂停在 Wave 3/8、生命50、敌人4、现金$107，未结算并关闭临时标签。模拟速度沿用页面读取到的4×偏好，没有更改设置；浏览器 error/warn 为空。直接打开[线上死亡图集](https://wishflow-tools.pages.dev/gunsnglory/assets/sfx_death_pioneers.png?release=d609bea)显示96×24 PNG。浏览器检查验证发布页和资源可加载，不替代 Canvas 帧阈值测试。 |

本轮仅闭合 Cow Gulch 已实现 type1/2 步兵的死亡图集帧选择；车辆烟雾的计时零边界由第51节补齐。其他敌型、受击/状态效果的完整逐帧视觉对照，以及 Cow Gulch 首关整体验收仍未完成；关卡计数保持0/60。

## 51. P1-F Cow Gulch 死亡动画计时零边界

原版 type1/2 步兵在死亡计时恰为0时仍绘制死亡图集最后一帧；type4 车厢和 type8 牵引马车仍绘制烟雾第7帧。EnemyDirector 逐帧减去 dt，并在计时严格小于0时才移除死亡对象。网页此前将计时钳制到0，却在大于0时才保留对象，因此精确抵达0会跳过最后一帧，也可能提前一帧清空波次。

APK 依据是研究分支 REA/JADX 的 GameObjectEnemy 构造、draw() 和 EnemyDirector 更新分析：type4 使用死亡样式11，type8使用21，二者初始计时均为799 ms；主体仅在计时大于350 ms时绘制。烟雾资源 `sfx_smoke_explosion.png` 为384×64，横向八帧，每帧48×64；帧号为 `7 - floor(counter / 100)`，以中心和脚底为锚点。type1/2 仍按第50节的599 ms六帧死亡图集规则处理。REA/JADX 文件是分析产物，不是原始源码。

网页现在保留死亡计时的负值计算，并在计时大于或等于0时保留敌人对象；烟雾在0 ms仍绘制第7帧，下一次推进后计时变负并清理。该修正保持死亡计时为 Game 的规则状态，不更改正式档案、内容版本或回放字段。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 红灯用例 | 修改前，Canvas 用例在0 ms未找到 type4/8 烟雾；Game 用例在预期保留0 ms车厢时得到`undefined`。 |
| Canvas 动画边界 | type1/2在0 ms绘制第5帧；type4/8在799、700、699、351、350、1、0 ms分别使用烟雾帧0、0、1、4、4、7、7。断言车体在350 ms停止、烟雾帧裁切及48×64绘制区域与脚底锚点。 |
| Game 生命周期 | Wave03运输死亡用例确认车厢和牵引件在0 ms仍保留，推进1 ms后因计时为负而一并清除；现有499 ms残车、乘员派生、奖励一次性与清理断言继续通过。 |
| 本地完整 CI | `source /Users/shiwei/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=4188 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript检查、156项单元测试、生产构建及52项Playwright测试。 |
| 集成与公网实测 | 开发提交 `04347c5` 已合入并推送到 `master`。GitHub Actions [run 41006909631](https://github.com/wishflow/wishflow-tools/actions/runs/41006909631) 成功：Guns’n’Glory CI、共享站点检查、Cloudflare Pages 与 GitHub Pages 部署通过；Worker/config 与文档专用作业按变更范围跳过。Codex 内置浏览器打开[公网版本](https://wishflow-tools.pages.dev/gunsnglory/?release=04347c5)，页面与游戏资源正常加载，控制台 error/warn 为空。页面自动开始战斗，检查时暂停在第4/8波、生命43、敌人28、现金$118；正式档案仍为1/1、最高分 `$356`，速度仍为4×，未产生新结算。截图中的地图、暂停控件和战斗 HUD 正常。该公网烟测确认部署和暂停交互可用；死亡计时0 ms的末帧由上方确定性 Canvas/Game 测试覆盖。验证记录提交 `8164cb4` 的文档专用工作流 [run 41007827042](https://github.com/wishflow/wishflow-tools/actions/runs/41007827042) 通过，应用测试与部署按变更范围跳过。 |

完整 Cow Gulch 首关仍为0/60。动态对象跨类型的同深度队列、其他动画/状态和音频实测仍待逐项处理。

## 52. P1-F Cow Gulch 枪手与 Mexican 攻击动画帧顺序

网页原先在更新计时后重新推导当前绘制帧，导致计时刚跨过阈值时提前换帧；移动目标一经设置也会清除攻击动画，即使单位尚未发生实际位移。本轮保存每次更新按旧计时值选出的帧，并在位置确实变化时才取消攻击动画。

APK 依据为研究分支 `codex/gunsnglory-spec` 的 JADX 分析产物：`GameDesignOptics.java` 的攻击帧表给出 Gunslinger `(0,100),(1,200),(0,1000)`、Mexican `(0,200),(1,400)`；`GameObjectUnit.shoot()` 将计时器置0并开始动画；`GameObjectUnit.move()` 以更新开始时的计时值选择帧，执行 `(int)(counter + dt)` 后再检查计时是否严格大于最后阈值。该方法仅在 X/Y 实际位移分量获准变化时清除攻击状态。反编译代码是 APK 分析产物，不是原始 Java 源码。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 红灯用例 | 新增公共 `Game` Interface 测试后，旧实现分别在 Gunslinger 阈值跨越步提前显示帧1、以及仅有移动意图且位置不变时提前清除攻击图集；两项用例均按预期失败。 |
| APK 帧阈值 | Gunslinger 与 Mexican 分别覆盖阈值前、恰等于阈值、跨过后下一更新，以及最后阈值等于/严格大于的状态；按游戏每次最多推进100ms的约束组织固定 `dt` 序列。新逻辑保留更新开始时选出的帧，并在整数化计时超过末阈值时清理图集。 |
| 位移取消 | 移动意图产生不足一个 fine unit 的步进时保持攻击帧；后续实际移动一个 fine unit 后立即清除。 |
| 完整本地 CI | `source /Users/shiwei/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=4193 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript 检查、158项单元测试、Vite 生产构建及52项 Playwright 测试。 |
| 合并、部署与公网实测 | 开发提交 `580d5cf` 已合入并推送到 `master`。GitHub Actions [run 41011178936](https://github.com/wishflow/wishflow-tools/actions/runs/41011178936) 成功：Guns’n’Glory CI、共享检查、Cloudflare Pages 和 GitHub Pages 通过；Worker/config 与文档专用作业按变更范围跳过。Codex 内置浏览器打开[公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=580d5cf)，标题、战役档案、Cow Gulch 地图、桥和 HUD 正常；页面自动进入第1/8波后暂停，显示生命50、敌人7、现金$74。正式档案仍为1/1、最高分 `$356`；模拟速度仍为4×，没有产生新结算。浏览器控制台 error/warn 为空。公网烟测核对部署、画面、暂停交互和存档展示；逐帧阈值由上述固定 `Game` Interface 测试验证。 |

本轮闭合 Cow Gulch Gunslinger/Mexican 攻击帧的阈值顺序和实际位移取消行为，不代表其他单位、动画状态或首关整体验收完成；Cow Gulch 首关仍为0/60。

## 53. P1-F Cow Gulch 移除通用受击光圈

网页此前在每次命中后设置120ms的`hitFlashMs`，并在所有存活敌人周围画金色椭圆。该状态和表现不属于原版：本轮从游戏状态和渲染端一并移除；实际生命变化、投射物定义的持续伤害/减速，以及受损敌人生命条保持原样。

### APK 静态依据

REA-005（`GameObjectEnemy` 类清单）未列出通用命中闪光字段；REA-420（`getsDamaged()`）只扣除生命值，并按投射物设置持续伤害或减速计时；REA-012（`draw()`）绘制敌人图集、死亡动画及实际存在的持续伤害、减速和治疗效果，没有按普通命中画轮廓的分支。REA/JADX 是 APK 静态分析证据，不等同原始 Java 源码或运行时观察。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 红灯回归 | Canvas 测试注入兼容用的120ms旧字段并记录椭圆绘制次数；旧渲染实现会多画一个敌人椭圆，因此按预期失败。 |
| 修复后渲染测试 | 移除`EnemyView`/内部敌人状态中的`hitFlashMs`、命中赋值、计时更新和金色椭圆后，Canvas 渲染测试文件5项全部通过；敌人图集、死亡帧、生命条、地图绘制顺序等既有断言继续通过。 |
| 本地完整验证 | `source /Users/shiwei/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=4389 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript 检查、158项单元测试、Vite生产构建及52项Playwright测试。另运行 `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm run test:catalog`，14项全部通过。 |
| 内置浏览器（本地） | Codex 内置浏览器打开 `http://127.0.0.1:5187/`，确认 Cow Gulch 正式入口、地图/HUD 和速度控件正常；暂停后状态为 Wave 1/8，AX 显示“Battle paused.”，正式档案尚无 L01 结果。浏览器 console 的 error/warn 为空。旧光圈特定回归由 Canvas 断言验证：传入旧`hitFlashMs`字段时椭圆绘制次数不增加。 |
| 合并、部署与公网内置浏览器 | `c268df0` 已快进合并并推送至 `master`。GitHub Actions [run 41015038053](https://github.com/wishflow/wishflow-tools/actions/runs/41015038053) 成功：Guns’n’Glory CI、共享检查、Cloudflare Pages 与 GitHub Pages 均通过；Worker/config 与文档专用作业按变更范围跳过。Codex 内置浏览器打开[本次公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=c268df0)，确认战役进度、Cow Gulch 地图、桥、HUD 与4×速度控件加载正常；自动进入Wave 1/8后暂停，页面显示生命50、敌人9、现金$72。档案仍显示1/1完成和最高分 `$356`，未产生新结算；浏览器console error/warn为空。公网烟测核对部署、画面与暂停交互；不把无命中画面当作受击反馈证据，后者由Canvas回归断言验证。 |

本轮只删除没有 APK 依据的通用受击装饰，不改变战斗扣血、真实状态特效、敌人生命条和胜负规则。完整首关验收仍为0/60；其他敌型、状态效果和剩余动画继续按首次消费场景对照。

## 54. P1-F 音效播放失败提示与恢复入口

网页此前吞掉了 `HTMLAudioElement.play()` 的拒绝结果，用户无法分辨浏览器阻止自动播放、资源解码/加载失败，还是场景没有声音。本轮保留静音继续游玩的规则；播放 Promise 拒绝或媒体 `error` 事件会显示双语状态和重试按钮。按钮在声音启用时调用最近一次失败的音频，播放成功后清除对应失败；静音设置仍会阻止新的播放请求。文案通过现有语言状态更新，不新增语言存储或切换控件。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 红灯用例 | 新浏览器用例在旧实现下因缺少 `sound-playback-status` 元素失败，证明静默吞错路径未提供恢复反馈。 |
| 播放拒绝与恢复 | Playwright 模拟 `NotAllowedError`，确认状态和重试按钮出现；用户手势重试成功后提示消失，播放调用次数增加。 |
| 解码/加载错误入口 | Playwright 对创建的音频元素派发 `error` 事件，确认同一提示与重试入口出现；随后成功重试并清除。 |
| 中英文 | 使用 site-shell 语言切换，英文错误状态更新为“音效无法播放。你可以继续静音游玩，或重试播放。”，按钮为“重试播放音效”。 |
| 完整本地 CI | `source /Users/shiwei/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=4390 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript 检查、158 项单元测试、Vite 生产构建及 53 项 Playwright 测试。 |
| 内置浏览器（本地） | Codex 内置浏览器打开 `http://127.0.0.1:5191/`。浏览器实际拒绝未由用户手势启动的音频后，页面显示英文失败状态与重试按钮；切换 site-shell 语言后显示中文提示。窄屏截图确认提示可换行且按钮可见；播放/错误恢复按钮的成功清除由上方 Playwright 用例验证。 |
| 合并、部署与公网内置浏览器 | `ed4bb49` 已快进合入并推送到 `master`。GitHub Actions [run 41018773697](https://github.com/wishflow/wishflow-tools/actions/runs/41018773697) 全部成功：Guns’n’Glory CI、共享站点检查、Cloudflare Pages 与 GitHub Pages 部署通过；Worker/config 与宠物专用作业按变更范围跳过。Codex 内置浏览器打开[公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=ed4bb49)，实际显示中文音效失败提示与重试按钮；点击重试后提示消失。随后将声音设置恢复为原来的“关”，并暂停页面；档案仍为1/1、最高分 `$356`，未产生新结算，暂停时战局为第5/8波、生命42、敌人18、现金$153。 |

本轮只补齐音频失败可见性与恢复入口，不代表所有音效、循环、暂停/恢复及 60 关声音表现验收完成；Cow Gulch 首关仍为 0/60。

## 55. P1-F Cow Gulch 同深度目标投射物遮挡

网页此前按“敌人数组在前、投射物数组在后”稳定排序；当低层投射物与其目标敌人具有相同地面深度时，投射物会覆盖在敌人身上。APK 将所有对象放入同一个深度队列，且新对象在相同深度时插到已有对象之前；队列正向绘制，因此后创建的投射物先画，较早创建的目标敌人随后覆盖。

REA/JADX 反编译分析中，`GameObject.addToObjectManager()` 先把对象加入全局对象表，再调用 `GameObjectManager.insertDrawOrder()`；后者按 `fineY + drawingOffsetY + fineZ × 100` 升序插入，只在旧深度严格小于新对象时越过旧条目，故相等值由新对象插在前方。`GameObjectShot.addToObjectManager()` 先调用父类插入，再记录到投射物列表；`GameObjectShot` 构造时绑定其目标敌人。依据为研究分支 `codex/gunsnglory-spec` 中反编译分析产物 `GameObject.java`、`GameObjectManager.java` 与 `GameObjectShot.java`；JADX/REA 输出不是原始 Java 源码。

低层渲染队列现在只在投射物与其目标敌人同深度时，将该投射物排到目标前方；同一目标的多枚投射物按较新者先画。其它对象之间仍按现有稳定次序处理。本轮不引入跨帧历史队列，也不声称已闭合移动越过后保留的相对顺序。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 红灯用例 | 将现有低层投射物 fixture 的 `positionFine.y` 对齐目标敌人地面深度；旧实现 draw-call 次序为“敌人、投射物”，与 APK 插入/绘制规则相反，定向 Canvas 测试按预期失败。 |
| 修复后 Canvas 行为 | 目标配对且同深度时 draw-call 次序为“投射物、敌人”；不等深度和不同目标对象沿用已有深度/稳定顺序逻辑。Canvas 测试文件 5 项全部通过。 |
| 本地完整 CI | `source /Users/shiwei/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=4393 nvm exec 22.23.3 pnpm run test:ci` 通过：TypeScript 检查、158 项单元测试、Vite 生产构建及 53 项 Playwright 测试。 |
| Codex 内置浏览器本地检查 | 打开 `http://localhost:5191/`，确认正式 Cow Gulch 入口、地图、战斗 HUD 和暂停/恢复控件显示正常；在第 1 波暂停，档案未结算。控制台 error/warn 为空。由于不推进整关，本轮浏览器截图作为页面烟测，不声称其中单帧呈现目标敌人与投射物精确同深度；该遮挡由上方 Canvas draw-call 断言验证。 |
| 合并、部署与公网实测 | `b4d1176` 已快进合入并推送至 `master`。GitHub Actions [run 41022653505](https://github.com/wishflow/wishflow-tools/actions/runs/41022653505) 成功：Guns’n’Glory CI、共享检查、Cloudflare Pages 和 GitHub Pages 部署通过；Worker、Cloudflare 配置与宠物专用作业按变更范围跳过。Codex 内置浏览器打开[本次公网版本](https://wishflow-tools.pages.dev/gunsnglory/?release=b4d1176)，确认 Cow Gulch 地图、HUD、语言切换和 4× 速度控件加载；正式档案仍为 1/1、最高分 `$356`，音效仍为关。页面自动开始后立即暂停于 Wave 1/8、生命 50、敌人 11、现金 `$70`；未产生新结算，暂停状态可见，浏览器控制台 error/warn 为空。公网截图核对部署与主要画面，不声称截图中的动态帧能单独证明同深度遮挡；对应 draw-call 次序由 Canvas 行为断言验证。 |

本轮闭合的是 Cow Gulch 低层渲染中“后创建目标投射物与其既存目标敌人恰好同深度”的遮挡关系。其它跨类型同深度组合、对象深度变化后的历史队列、完整首关 P1-F 验收仍未完成；Cow Gulch 首关保持 0/60。

## 56. P1-F Cow Gulch 跨类型绘制历史队列

第55节的目标投射物特例无法复现对象移动后保留的队列顺序，也不能覆盖静态装饰、单位、敌人、投射物和车厢残骸之间的一般关系。本轮把这些可见对象放进同一条深度队列，避免按对象类型分批排序。

REA/JADX 反编译分析显示，`GameObjectManager.getValueByObject()` 使用 `fineY + drawingOffsetY + fineZ × 100` 计算深度；`insertDrawOrder()` 只越过严格浅于新对象的条目，故新对象在相等深度时插到已有对象之前。`correctDrawOrder()` 在对象移动后只向移动方向越过严格深浅的邻项；相等时不重排，从而保留历史顺序。`GunsAndGloryThread` 先调用 `EnemyDirector.moveEnemys()`，再调用 `UnitDirector.moveUnits()` 和 `moveShots()`；绘制时队列深度低于 `768000` 的对象在道路前绘制，其余对象在道路之后继续绘制。依据为研究分支 `codex/gunsnglory-spec` 的 REA/JADX 产物 `GameObjectManager.java`、`GunsAndGloryThread.java`、`EnemyDirector.java`、`UnitDirector.java` 及对应 DEX dump；反编译结果不是原始 Java 源码。

该历史版本由 Canvas 渲染器按原始地图扫描顺序初始化装饰和单位，再将敌人、投射物、残骸加入同一 `DrawOrderQueue`；同一个 Canvas 通过弱映射保留绘制历史，按对象更新阶段修正深度，并在 `768000` 处分成道路前后两次绘制。当时尚未修改 `GameView`、规则状态、存档或回放格式。

该实现只根据相邻两次 Canvas 绘制观察到的状态更新。若一次绘制前连续推进多个模拟步，或首次绘制发生在关卡中途，队列会丢失未观察到的更新历史。这个缺口已在[验证记录第57节](validation.md#57-p1-f-cow-gulch-模拟步绘制顺序)修正；第56节保留的是修正前的设计与验证历史。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 深度队列规则 | 新对象在相等深度时先于旧对象；对象仅越过严格更深或更浅的邻项；移到相等深度时保持队列历史。对应单元测试覆盖插入、向上与向下移动。 |
| Canvas 回归 | 原有同深度目标投射物仍先于目标敌人绘制；新增用例让单位下移到静态灌木的同一深度，断言单位保留先前队列位置；地图、道路分层和其它 Canvas 断言通过。 |
| 本地验证 | Node 22.23.3 下 160 项单元测试通过，TypeScript 检查通过，Vite 生产构建通过，Playwright 53 项 E2E 通过。第一次 E2E 启动因沙箱阻止 `127.0.0.1` 绑定而得到 `EPERM`；受限提权后重跑 E2E 成功。 |
| 合并、部署与内置浏览器 | 代码提交 `0cf3f1f` 已快进合入并推送到 `master`。GitHub Actions [run 41028040067](https://github.com/wishflow/wishflow-tools/actions/runs/41028040067) 成功：Guns’n’Glory 测试、共享检查、Cloudflare Pages 与 GitHub Pages 部署通过；Worker/config 与宠物任务按变更范围跳过。Codex 内置浏览器打开[公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=0cf3f1f)，检查页面标题、战役档案、Cow Gulch 全图、峡谷道路/桥、HUD 与 4× 倍速控件均正常。页面按已有 4× 设置启动未完成战局，进入第 3/8 波后暂停；画面和 AX 状态显示生命 50、敌人 6、现金 `$117`。正式档案仍为 1/1 完成、最高分 `$356`，没有新结算；浏览器控制台 error/warn 为空。公网烟测验证部署、主要画面和暂停控件；截图不单独证明同深度排序，具体绘制次序由上方 Canvas 定向断言和队列单元测试验证。 |

本轮把渲染排序从目标投射物特例扩展为全对象队列；当时队列状态仍由绘制帧推导。该历史缺口已由第57节闭合。Cow Gulch 首关仍为 0/60。

## 57. P1-F Cow Gulch 模拟步绘制顺序

第56节的 Canvas 弱映射只能在绘制发生时观察对象位置；浏览器可能在一次绘制前推进多个模拟步，或者在页面恢复后首次绘制时已错过队列变化。本轮将队列状态移入 `GameSession`，使其随确定性游戏状态逐步推进。

`GameSession.open()` 按静态地图扫描顺序创建初始队列；每次 `advance()` 完成敌人、单位、投射物、残骸及结算状态更新后、生成该步 `GameView` 前，按 APK 的对象更新阶段同步队列。深度仍使用原版公式：敌人 `fineY + drawingOffsetY`，单位 `fineY + 768000`，投射物 `fineY + fineZ × 100`，车厢残骸 `depthFineY + 768000`，静态装饰使用其地面锚点再加 `768000`。`GameView.drawOrder` 只读暴露稳定对象键；Canvas 根据这些键选择绘制闭包，并继续以 `768000` 将对象分到道路前后两层。绘制器不再自行保存或推进队列。

此改动覆盖跳帧渲染及中途首次绘制的顺序历史，且不更改 IndexedDB 档案、正式规则输入、回放格式或游戏结果。回放仍逐步运行相同规则并从新会话确定性重建该派生队列。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 模拟步回归 | 新增 `tests/game-draw-order.test.ts`：单位越过静态装饰后，在不绘制中间画面的条件下回到相等深度，`GameView` 保留越过后形成的队列历史；夹具同时断言移动确实越过深度并回到同一坐标。 |
| 队列及 Canvas 回归 | 原有队列严格深度、同深度插入测试通过；Canvas 手工视图改为提供 `drawOrder`，原有道路层、静态装饰、敌人、投射物和残骸的 draw-call 次序断言通过。 |
| 回归敏感性复核 | 临时将向上排序的同深度比较从非严格条件改为严格条件后，队列测试与模拟步集成测试均按预期失败；恢复原文件后，3 项定向测试通过。 |
| 完整 CI 模式 | `source /Users/shiwei/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=4387 nvm exec 22.23.3 pnpm run test:ci` 通过：TypeScript 检查、161 项单元测试、Vite 生产构建和53项 Playwright E2E。 |
| Playwright E2E | 完整 CI 命令在 `CI=1` 下按项目配置使用1个 worker，53项全部通过。未设置 `CI=1` 的诊断运行使用5个 worker时有3项超时；三项串行复跑及2 worker全套复跑均通过，因此未改项目并发配置。 |
| 公网部署与内置浏览器 | 提交 `10910e1` 已部署；GitHub Actions [run 41036709955](https://github.com/wishflow/wishflow-tools/actions/runs/41036709955) 中 Guns’n’Glory 测试、共享站点 catalog 检查、GitHub Pages 与 Cloudflare Pages 部署均成功，Worker/config 与宠物任务按变更范围跳过。Codex 内置浏览器打开[本轮公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=10910e1)，确认页面标题、Cow Gulch 地图、峡谷/桥、HUD 与倍速滑杆可见；游戏在 4× 下推进至 Wave 4/8 后可暂停，AX 状态为 Lives 44、Enemies 25、Cash `$122`，暂停按钮切换为 Resume battle。正式档案仍为 Cow Gulch 1/1 完成、最高分 `$356`，本次未结算战斗。浏览器 console 的 error/warn 日志为空。公网截图只验证部署、画面与控件；跨模拟步的排序历史由上方定向自动化测试验证。 |

本轮闭合的是第56节提出的“模拟步之间及首次绘制前丢失绘制历史”问题。它只解决 P1-F 的跨类型绘制队列所有权与时序，不代表 Cow Gulch 首关画面和规则已完成全量对照；首关仍为 0/60。

## 58. P1-F Cow Gulch 玩家行走动画

Gunslinger 和 Mexican 实际移动时，网页此前保持静态图集首帧。本轮按 APK 的移动距离阈值选择循环帧，并按本次实际位移选择方向行与镜像；单位停止后保留最后的行走姿态，射击动画仍优先绘制，移动则继续中断正在播放的射击动画。

### APK 静态依据

研究分支 `codex/gunsnglory-spec` 的 JADX 分析产物 `GameDesignOptics.java` 将默认玩家行走表记录为 `{0,1536, 1,3072, 0,4608, 2,6144}`，并将其用于 Gunslinger 和 Mexican 等玩家单位。`GameObjectUnit.move()` 按主位移轴累计实际 fine 坐标变化，达到6144后回绕；选择帧时只在累计距离**严格大于**1536、3072、4608时切换到下一项。它再依实际方向选择图集第0–4行，按半轴阈值切到斜向帧，必要时水平镜像。奇数位移的半轴比较采用 Java 整数除法语义。

同一研究资料中的 APK drawable 图集为96×220像素，玩家动画裁片为32×44像素，即3列、5行。上述路径是 APK 的反编译分析结果，不是原始 Java 源码；本轮没有依赖原版 ADB 运行观察。

### 实现与验证

| 检查 | 结果 |
| --- | --- |
| 红灯回归 | 先加入通过 Game 公共 Interface 选择并移动单位的测试；修改前 `walkingAnimation` 缺失，在1536 fine units时对比预期 `{frame:0,row:1,mirrored:true}` 失败。 |
| 帧阈值、方向与静止 | 新测试覆盖1536/1537、3072/3073、4608/4609的严格边界和6144回绕；验证西、南、北及东南方向的图集行/镜像，并验证停止移动后姿态保持。Gunslinger 与 Mexican 均由相同 APK 默认行走表驱动。 |
| Canvas 裁片 | 定向 draw-call 断言核对第2帧、第4行裁切为`64,176,32,44`，并确认镜像状态实际进入 Canvas 变换。 |
| 回放兼容 | `captureReplayState()` 去除新增的渲染专用 `walkingAnimation` 字段，避免旧版重放检查点摘要因显示帧字段改变；规则版本、回放格式和战斗输入不变。 |
| 边界敏感性复核 | 临时把帧切换比较从`>`改为`>=`，定向测试在1536处失败（错误地提前到frame 1）；恢复实现后重新通过。 |
| 本地验证 | 显式使用 Node 22.23.3，应用 `pnpm run test:ci` 全部通过：TypeScript 检查、162项单元测试、Vite 生产构建及53项 Playwright 测试；仓库 `pnpm run test:catalog` 15项全部通过。 |
| 内置浏览器实测 | 本地生产预览 `http://127.0.0.1:4398/`：桌面视口 1440×900 下画布约1022×574，手机视口390×844下画布约326×183，页面横向滚动宽度仍为375px；两种视口均保持约16:9画布。用鼠标选中并拖动 Gunslinger，检查面板从初始 `(8.5, 8.75)` 更新到 `(7.77, 8.32)`，界面显示 Cell `(8, 8)`；随后暂停在 Wave 3/8，没有完成关卡或产生通关档案。浏览器控制台无 error/warn。 |
| 公网发布与实测 | 提交 `719872f` 已部署；GitHub Actions [run 41047277405](https://github.com/wishflow/wishflow-tools/actions/runs/41047277405) 的 Guns’n’Glory CI、共享 catalog 检查、GitHub Pages 与 Cloudflare Pages 均成功；Worker/config 和宠物任务按变更范围跳过。Codex 内置浏览器打开[本次公网版本](https://wishflow-tools.pages.dev/gunsnglory/?release=719872f)，检查地图、桥、HUD、4×速度控件和单位画面；鼠标选中并拖动 Gunslinger 后，状态从 Cell `(9, 9)` 变为 `(8, 8)`，检查面板坐标从 `(8.50, 8.75)` 变为 `(7.74, 8.40)`。暂停于 Wave 4/8、Lives 42，未结算本次战斗；原有正式档案仍为 Cow Gulch 1/1、Best `$356`。调试覆盖已关闭，控制台无 error/warn。 |

本轮只补齐 Cow Gulch 玩家步行图集状态；不改变移动距离、碰撞、路线或速度。其它玩家类型、命中/睡眠等角色状态及完整 P1-F 首关对照仍待完成，首关验收计数保持0/60。

## 59. P1-F Cow Gulch 单位选中反馈

网页先前在选中单位时画黄色椭圆和虚线矩形，属于自定义调试样式。APK 的 `GameCursor.draw()` 则在单位上方画四向呼吸箭头，并由 `GameObjectUnit.drawRangeCircle()` 绘制射程圈。本轮将调试样式替换为 APK 的反馈表现，不改变选择、战斗、射程判定、路线或存档规则。

APK 静态依据来自研究分支 `codex/gunsnglory-spec` 的 JADX 产物：`GameCursor.java` 以 `cursor.png` 宽度四等分，依次绘制左上、右上、左下、右下方向帧；箭头间距按 `abs(sin(angle))` 呼吸，动画角每帧加5度；选中单位时调用 `drawRangeCircle()` 并将其裁切到地图矩形。`GameObjectUnit.java` 将普通单位射程圈半径换算为整格，绘制中心为单位 fine 坐标并向上减半个当前帧高。Gunslinger 与 Mexican 使用的 `getSelectorHeightAdd()` 为0。此处描述的是反编译结果，不是原始 Java 源码。

网页直接使用 APK 的 `cursor.png`（64×16，四个16×16方向帧），按当前地图视口缩放；射程半径沿用单位的最大射程十分格数并向下取整，使用 APK 的白色40/255透明度，箭头按5度/帧的相位呼吸。地图、单位与反馈共用同一视口变换，射程圈及箭头都裁切在地图边界内。资源经 `assetNames` 纳入运行时加载；缺失时按现有必需资源策略阻止进入游戏。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 定向 Canvas 测试 | 新增测试先于实现失败：旧调试椭圆调用了选择绘制 mock 未实现的 `ellipse()`。实现后断言地图裁切范围、半透明白色圆形半径、四个原始图集源帧、呼吸相位下的箭头落点，以及反馈绘制在世界对象之后。 |
| 变异敏感性复核 | 临时反转“未选中单位则跳过”条件后，定向射程圈断言失败，其他选择画布用例也因被错误要求加载光标资源而失败；恢复条件后6项 Canvas 测试全部通过。 |
| 本地应用 CI | Node 22.23.3 下 TypeScript 检查、163项单元测试、Vite 生产构建均通过；53项 Playwright E2E 全部通过。首次完整命令因 sandbox 禁止本地监听而在 E2E 启动时报 `listen EPERM 127.0.0.1:4173`；在授权环境单独重跑 `PLAYWRIGHT_PORT=5195 CI=1 pnpm --dir apps/gunsnglory run test:e2e` 后53项通过。仓库 `pnpm run test:catalog` 15项通过。 |
| Codex 内置浏览器本地实测 | 在 `http://127.0.0.1:5176/` 打开 Cow Gulch 首关，点击地图中央后页面显示 `Gunslinger selected · Cell (9, 9)`；截图可见单位周围四向白色箭头、半透明射程圈及地图裁切。暂停于 Wave 2/8，未完成正式关卡；正式档案仍为1/1、最高分 `$360`。控制台 error/warn 为空。单波样本测试期间曾自然结算并记录 `$50` 样本高分；该记录属于独立样本，不更改正式战役档案。 |
| GitHub Actions 与 Pages 部署 | `master` 推送提交 `ca3db61` 后，[workflow 41055292521](https://github.com/wishflow/wishflow-tools/actions/runs/41055292521) 成功；Guns’n’Glory 与共享 catalog 测试通过，Cloudflare Pages 和 GitHub Pages 部署通过。Worker/config 与宠物任务按变更范围跳过。 |
| Codex 内置浏览器公网实测 | 打开[本次公网版本](https://wishflow-tools.pages.dev/gunsnglory/?release=ca3db61)，截图显示 Cow Gulch 地图、`Gunslinger selected · Cell (9, 9)`、四向白色箭头和半透明射程圈；状态读取显示官方档案仍为1/1、最佳 `$356`，速度设置恢复为原先的4×。测试单波隔离样例时它自然结算，独立样例记录保存为 `$50`，不影响官方档案。首次使用过期的无障碍控件索引，意外打开了已完成的正式战役；发现后在 Wave 3/8 立即暂停，未结算，再从刷新后的无障碍树进入隔离样例。 |
| 集成分支与提交 | 功能提交 `67fa5c9` 在 `gunsnglory` 验证后合并进 `master`；合并时纳入远端 Python 教学应用更新，无冲突。合并提交 `ca3db61` 已推送并完成上表工作流与线上实测。 |

本轮闭合的是单位选择反馈与 APK 静态实现之间的表现差异；不等同于射程命中、其他单位类型或整关画面完成对照。P1-F 仍未完成，Cow Gulch 首关验收计数保持0/60。首轮公网操作曾使用失效索引，后续 GUI 检查先刷新可访问性树再按最新控件操作；隔离样例会自动保存独立高分，今后验证这类样例时应将此副作用纳入记录。

## 60. 投射物 damageStyle 4 命中音效

网页原先只在爆炸表现分支发出 `sound_dynamite`，且只识别 `damageStyle=3`。APK 的 `UnitDirector.moveShots()` 在投射物首次结算时，对 `damageStyle=3` 与 `4` 都调用 `requestSfx(10, ...)`；研究资料将声音 ID 10 映射为 `sound_dynamite`。这是 REA/JADX 反编译结果，不是原始 Java 源码，来源位于研究分支 `codex/gunsnglory-spec` 的 `UnitDirector.java` 和 `resources-and-audio.md`。

Game 现在在首次命中结算处按 damage style 3/4 发出同一声音事件；该事件与爆炸/范围伤害表现分开。浏览器适配器已通过 [`playRequestedSounds()`](../src/main.ts) 将 `sound-requested` 事件映射到 `assets/sounds/<name>.ogg`；规则改动在 [Game](../src/game/index.ts)，定向测试在 [game.test.ts](../tests/game.test.ts)。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 红灯测试 | 新增 `damageStyle=4`、`areaDamageFine=0` 的真实 Game 会话 fixture；旧代码在投射物命中后没有发出 `sound_dynamite` 事件，测试按预期失败。 |
| 修复后行为 | 新增事件在爆炸分支之外发送，因此 style 4 命中音效不依赖 AOE；原有 style 3 Mexican 炸药用例仍断言该音效事件。Game 测试文件62项全部通过。 |
| 应用本地验证 | Node 22.23.3 下 TypeScript 检查、164项单元测试、Vite 生产构建通过。完整 `test:ci` 首次在 sandbox 内因 Playwright 无法绑定 `127.0.0.1:5371` 报 `EPERM`；授权环境重跑相同端口的 E2E 后53项通过。`pnpm run test:catalog` 15项通过。 |
| GitHub Actions 与部署 | 提交 `c25a78b` 推送 `master` 后，[workflow 41061331545](https://github.com/wishflow/wishflow-tools/actions/runs/41061331545) 成功；Guns’n’Glory 测试、共享 catalog 检查、Cloudflare Pages 与 GitHub Pages 部署通过，Worker/config 和宠物专用任务按变更范围跳过。 |
| Codex 内置浏览器公网实测 | 打开[本次公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=c25a78b)，确认页面标题、Cow Gulch 地图、战役面板、4× 控件及暂停操作正常，控制台无 error/warn。游戏自动推进至 Wave 4/8 后立即暂停；正式档案仍为 Cow Gulch 1/1、最高分 `$356`，未结算本次战斗。style 4 单位尚未接入当前可玩关卡，因此线上检查没有声称直接触发 style 4；该事件由上方 Game fixture 验证。 |

本轮只修复已实现规则对 APK 音效触发条件的遗漏，不改变伤害、AOE、随机或单位内容。其它武器音效和音乐仍待首次消费关卡实现时对照，P1-F 首关验收计数保持0/60。

## 61. P1-F Cow Gulch 逐波叙事对白

正式 Cow Gulch 关卡此前缺少 APK 每波开始前的 Pedro 叙事对白。本轮按原版波次顺序加入 8 条对白、Pedro 肖像和语音；对白期间暂停游戏，玩家继续或按 Escape 关闭后才恢复。该变化只接入表现与交互，不修改波次、寻路、战斗规则、随机数、档案结构或回放格式；未完成战役仍在刷新后从 Wave01 重新开始。

### APK 依据与实现

研究分支 `codex/gunsnglory-spec` 的 REA/JADX 反编译资料显示：`GameScreenActivity` 在初始难度选择后调用 `displayDialog(0)`；后续波次也显示对白 ID 0。`InGameGeneralMessageDialog` 显示 `WaveManager.getCurrentText()` 与 `getCurrentImage()`，并在 Pedro 肖像对白中请求 `sound_pedro`。八组 Cow Gulch 文案和 Pedro 头像映射来自 `GameDesignWaves` 与 APK 字符串资源。以上是反编译结果，不是原始 Java 源码。APK 的 `res/drawable-mdpi-v4/portrait_pedro.png` 与 `res/raw/sound_pedro.ogg` 已复制到应用资源目录。

`cow-gulch-wave-intros.ts` 按 Wave01–08 定义英文原版文案、中文翻译、Pedro 肖像和语音资源；顺序游标确保每次战斗每波只显示一次。`main.ts` 仅对正式关卡启用对白：开局时暂停当前 Wave，自动推进发现波次变化时暂停并显示下一条；Continue 和 Escape 都恢复原会话，不提交额外 `start-wave` 输入。语言由 site-shell 管理，静音设置复用既有 IndexedDB 字段。浏览器拒绝无手势自动播放时，对白内显示中英双语的语音重试入口；成功后该入口自动隐藏。资源、文字映射与会话游标测试位于 `tests/cow-gulch-wave-intros.test.ts`，浏览器流程位于 `tests/e2e/t23-campaign-wave-intros.spec.ts`。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 内容与顺序 | 单元测试核对八条文案的波次顺序、原版英文关键文本、双语、Pedro 头像/语音映射；游标拒绝重复、倒序、越界及无效波次。 |
| 桌面与触屏 | Playwright 确认 Wave01 首条对白与头像载入、对白暂停帧推进；点 Continue 后自动到达 Wave02 对白并再次暂停。手机视口确认对话框和触屏按钮位于屏幕边界内。 |
| 语言与音频 | 对话框显示时通过 site-shell 切换中英文；测试确认存档静音设置在刷新后阻止语音播放，并模拟自动播放被拒绝后通过对话框内的用户手势重试恢复。 |
| 旧回归隔离 | 其它 E2E 页面通过共享测试夹具自动继续叙事对白，使既有游戏控制、存储和结算测试仍覆盖其原目标；对白专用测试使用原始 Playwright 页面直接检查行为。夹具观察 `document`，避免应用启动时 `<html>` 尚未创建而触发观察器错误。 |
| 本地应用 CI | 显式使用 Node 22.23.3 执行 `CI=1 PLAYWRIGHT_PORT=5429 pnpm --dir apps/gunsnglory run test:ci`：TypeScript 检查、166 项单元测试、Vite 生产构建和 57 项 Playwright 测试全部通过。`pnpm run test:catalog` 的15项仓库目录测试通过。 |
| 首关范围 | 定向新用例仅把虚拟时间推进到 Wave02 对白，不完成整关或更改正式档案。Cow Gulch 首关 P1-F 全量地图、规则和表现对照仍未通过，验收计数保持 0/60。 |
| 集成、发布与内置浏览器 | 功能提交 `179c4b5` 已并入并发布到 `master`（部署提交 `f5be4ef`）。GitHub Actions [run 41080228296](https://github.com/wishflow/wishflow-tools/actions/runs/41080228296) 中 Guns’n’Glory CI、共享 catalog 检查、Cloudflare Pages 与 GitHub Pages 全部成功；Worker/config 与宠物任务按变更范围跳过。Codex 内置浏览器打开[公网版本](https://wishflow-tools.pages.dev/gunsnglory/?release=f5be4ef)，核对首波 Pedro 肖像与原版英文对白、站点语言切换后的中文对白；继续后进入 Wave 1 战斗，再暂停时页面显示 `Wave 1/8`、Lives 50、Enemies 10、Cash `$71`。正式档案仍为 Cow Gulch 1/1、最高分 `$356`；静音设置为关闭，控制台 error/warn 为空。 |

## 62. P1-F Cow Gulch 背景音乐

Cow Gulch 正式关卡此前缺少原版环境曲、波次战斗循环和胜利曲。本轮依 APK 的音乐调用链补齐 Cow Gulch 配乐，不扩展到其它区域，也不把该局部表现提升为 P1-F 完成。原版音轨来自 APK 研究资料的已导出 OGG；按 `NewMexico.java`，环境曲为 `music_loop1`，战斗循环为 `music_loop2/3/4`；`UnitDirector.java` 在每波第一名单位实际开火时请求切换，`GunsAndGloryThread.wave` 从0开始，Wave01–08 依次选择 loop2、loop3、loop4 并循环。新波次及败北返回环境曲，胜利切换到 `music_level_won`。播放器静音及前后台行为由 `Sound.java` 控制。这些是 REA/JADX 反编译产物，不是原始 Java 源码；结论来自研究分支 `codex/gunsnglory-spec` 的上述文件和 `data/audio-use-index.json`。

应用仅为正式 Cow Gulch L01 创建循环背景播放器，并在原 `GameEvent` 发生后由浏览器适配器选择曲目。`GameView` 使用从1开始的显示波次，适配层转换成 APK 的零基 wave index。背景曲复用既有 `soundEnabled` 设置和播放失败提示；静音时暂停并从当前曲开头恢复，标签页隐藏时暂停且保留播放位置，重新显示后继续。自动播放被拒时，Continue 或通用音频重试按钮以用户手势恢复；重试按钮会一次重试当前全部失败媒体，避免 BGM 与音效同时失败时只清除一项。其它场景继续不播放本轮新增的 Cow Gulch BGM。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 资源与波次索引 | 单元测试核对 ambient、三首战斗循环及胜利曲标识和零基波次取模；定向 Playwright 确认五个 OGG URL 均返回 HTTP 200。正式八波浏览器测试断言先请求 Wave01 对应的 `music_loop2`，并在胜利时请求 `music_level_won`，战役过程中三首 battle loop 均出现。 |
| 播放控制 | 定向 Playwright 模拟浏览器自动播放拒绝，Continue 手势恢复后错误提示清除；声音开关暂停/恢复循环曲；将页面切到后台再切回，检查当前曲分别收到暂停与续播调用。 |
| 音效兼容回归 | `t02` 覆盖多条媒体同时播放失败后的统一重试，以及音效媒体的解码错误恢复；`t23` 将 Pedro 语音计数限定为 `/assets/sounds/`，不把新加入的 BGM 计入语音断言。 |
| 本地应用 CI | `source /Users/shiwei/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=4394 nvm exec 22.23.3 pnpm run test:ci` 通过：TypeScript 检查、168 项单元测试、Vite 生产构建和58项 Playwright 测试全部通过。仓库 `pnpm run test:catalog` 15项通过；`git diff --check` 通过。Node 使用 nvm 显式指定22.23.3，未改变默认版本。 |
| 内置浏览器（本地） | Codex 内置浏览器打开 `http://127.0.0.1:5193/`。Cow Gulch 正式关卡及 Wave01 对白、地图和 HUD 正常显示；继续后进入 `Wave 1/8`，浏览器自动播放拦截提示出现，通过“重试播放音效”后提示清除，随后手动暂停确认状态为 `Battle paused.`。控制台 error/warn 为空。该检查确认浏览器播放请求的恢复路径和页面行为；未对实际扬声器输出做声学测量。 |
| 首次 CI 失败与诊断 | 首次推送的 [run 41090342971](https://github.com/wishflow/wishflow-tools/actions/runs/41090342971) 有两项 T15 存档 E2E 记录到未包含 URL 的 HTTP 404，因此部署 job 被跳过。为让后续故障包含完整请求地址，诊断提交 `d552635` 在 T15 记录所有 HTTP 4xx/5xx 响应 URL；之后的完整 CI 通过，该错误未重现，所以首次 404 来源仍未确定。 |
| 合并、公开部署与内置浏览器 | BGM 实现提交 `a49d0c5` 和 4xx 诊断提交 `d552635` 已合入并推送到 `master`。GitHub Actions [run 41092577884](https://github.com/wishflow/wishflow-tools/actions/runs/41092577884) 成功：168 项单元测试、Vite 构建、58 项 Playwright 测试、共享 catalog 检查、Cloudflare Pages 和 GitHub Pages 部署均通过；Worker 检查/部署按变更范围跳过。Codex 内置浏览器访问[公网版本](https://wishflow-tools.pages.dev/gunsnglory/?release=d552635)，核对 Cow Gulch L01、Wave 1/8 对话与音乐开启控件；音乐开启 2 秒内未显示播放失败或重试控件，控制台 error/warn 为空。之后将音效设置恢复为关；当前战役档案仍为 1/1 关卡已完成、最高分 `$356`，本次没有继续战斗或生成新结算。浏览器仅验证部署、UI 播放失败结果与操作回复；未对实际扬声器输出做声学测量。 |
| 完整首关门槛 | 本轮只增加音乐表现；未完成 P1-F 全部对象、地图、动画、战斗和设备对照。Cow Gulch 首关仍不计为已验收，整体关卡计数保持0/60。 |

Cloudflare Pages 和 GitHub Pages 均已部署这个发布提交；本次仅补入 Cow Gulch BGM，P1-F 与0/60关卡门槛状态不变。

## 63. Cow Gulch 正式战役触屏交互回归

补充正式关卡中的手机触屏回归：在 390×844 视口打开 Cow Gulch L01，将速度调至4×并推进到可支付 `$75`，用真实触屏 Pointer Events 拖动初始 Gunslinger，再招募地图上的睡眠 Gunslinger 并验证扣款与选中。触屏按住期间推进游戏时钟，抬手后停止移动；状态格号按单位脚底锚点和一基显示核对。该路径未发现产品交互缺陷，无需改动游戏规则或浏览器输入实现。

测试位于[`t25-official-campaign-touch.spec.ts`](../tests/e2e/t25-official-campaign-touch.spec.ts)。它复用正式八波战役、真实地图内容和原有 IndexedDB 档案路径；本测试不推进至关卡结算，也不更改正式关卡完成记录。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 触屏战役流程 | Playwright 手机上下文通过 CDP `Input.dispatchTouchEvent` 发出 touch start/move/end；真实战役到 Wave 2–8 范围且现金不少于 `$75` 后，拖动初始枪手至目标格、招募地图枪手并扣除 `$75`、再次选择已招募枪手，定向测试通过。 |
| 应用完整 CI | `source /Users/shiwei/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=5438 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript 检查、168 项单元测试、Vite 生产构建和59项 Playwright E2E 全部通过。 |
| 共享站点回归 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm run test:catalog` 15项全部通过。 |
| Codex 内置浏览器本地检查 | 生产预览在桌面1440×900和手机390×844视口打开；确认 Cow Gulch 地图、Pedro 对白和 HUD 正常。手机画布为341.20×191.05，比例1.786，接近16:9，页面 `scrollWidth` 与 `clientWidth` 均为390，没有横向溢出。Playwright 定向触屏测试另行验证真实移动和招募操作。 |
| 发布与公网实测 | 触屏变更提交 `4b4262e` 已合入 `master`。GitHub Actions [run 41102853277](https://github.com/wishflow/wishflow-tools/actions/runs/41102853277) 最终成功：Guns’n’Glory 59项 E2E、共享站点检查及 Cloudflare Pages、GitHub Pages 部署均通过；Worker/config 检查按静态应用变更范围跳过。首次执行中两项 T15 存档 E2E 出现未带 URL 的 404，失败任务重跑后通过；错误未在重跑中复现。随后包含该应用版本的 master SHA `42c5789` 对应 [run 41104135193](https://github.com/wishflow/wishflow-tools/actions/runs/41104135193) 成功，两个 Pages 部署再次完成。Codex 内置浏览器访问[公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=42c5789)，确认牛溪谷正式战役、地图、Pedro 对话和 HUD 显示正常；继续后进入第1波，再暂停确认“战斗已暂停”。公开页控制台 error/warn 为空。浏览器档案始终为已完成1/1、最高分 `$356`；没有结算本次战斗。手机390×844下画布341.20×191.05（比例1.786），页面无横向溢出；桌面1440×900也已检查。 |

本轮仅增加正式战役触屏路径的行为覆盖，不代表 Cow Gulch 首关地图、规则或全套交互的 P1-F 对照已完成；关卡完成验收仍为0/60。

## 64. P1-B 正式关卡 Mexican 招募与 Wave02 范围攻击

将 Mexican 从独立行为样例接入正式 Cow Gulch L01 路径验证：使用固定种子42打开真实战役，保留初始现金 `$65`，不注资；让 Wave01/02 自然运行到现金 `$100`，选择原图 tile97（零基格 `(4,15)`）并支付 `$100`。唤醒后的 Mexican 保持原版速度0，不能移动，但会在真实 Wave02 对敌群发射重型炸药。该增量不改变单位、经济、波次或战役代码，只增加正式场景的行为与浏览器交互覆盖。

Game 测试 [`game.test.ts`](../tests/game.test.ts) 直接打开 [`campaign-new-mexico-01`](../src/content/official-campaign.ts) 正式身份，确认初始现金65、生命50、Wave01 自动开始和 tile97 原始坐标；之后以100ms步长推进真实战斗，确认现金自然到达100、成功扣款、同一对象从 activity4 唤醒为 `player_mexican`、发出原版唤醒音效请求且拒绝移动。测试继续推进同一 Wave02，确认 Mexican 的实际投射物在群体中影响至少两个敌人。所有权威输入来自游戏的公开行为接口，没有读取或写入内部会话状态。

浏览器测试 [`t26-official-mexican.spec.ts`](../tests/e2e/t26-official-mexican.spec.ts) 在390×844移动触屏上下文中验证真实 UI 路径：速度设为4×、正式战役自然赚钱、发送双指触控事件平移/放大地图、触摸选中 Mexican、点招募按钮并检查扣款及选中状态；测试在整关结算前结束，不写入完成进度。独立 Game 测试覆盖后续实际开火和 AOE 命中，避免浏览器测试为了检查这个武器而完成战役。

第一次 E2E 草稿直接点击地图零基 `(4,15)` 的默认镜头位置，浏览器返回“未选中”。检查实际视口后确认该点在屏幕下缘之外：地图经原版宽度规则放大后高于 16:9 逻辑画布，默认镜头只显示中段。问题来自测试把地图坐标当作画布坐标，并非单位位置错位；本轮未改游戏输入/镜头规则。后续测试先通过实际触屏双指手势把下缘带入视口，再按变换后的画布位置点选。P1-F 仍须独立核对桌面鼠标和其他镜头状态。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 正式开局与经济 | 固定随机种子42；`campaign-new-mexico-01` 初始现金 `$65`、生命50、Wave01自动开始。Game 测试不提交逐波 `start-wave`，不注入现金；实际推进到 Wave02 现金 `$100` 后招募 tile97 Mexican，支付后余额 `$0`。 |
| Mexican 正式战斗行为 | 唤醒同一 tile97 对象，activity4→5、资源切换到 `player_mexican`、移动速度0、播放 `sound_mexican_arriba`；选中后移动意图被拒绝。真实 Wave02 投射物爆炸事件的 `affectedEnemyIds` 大于1且包含主目标。 |
| 触屏 UI | Playwright/CDP 在390×844上下文通过两指 touch start/move/end 平移地图，再触摸 `(4,15)` Mexican；招募按钮文本、可用状态、扣款、选中反馈和未结算状态均通过。测试文件：[`t26-official-mexican.spec.ts`](../tests/e2e/t26-official-mexican.spec.ts)。 |
| 完整应用 CI | `source /Users/shiwei/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=5446 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript 检查、169项单元测试、Vite 生产构建和60项 Playwright 测试全部通过。 |
| 共享站点目录 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm run test:catalog` 15项全部通过。Node 使用 nvm 显式指定22.23.3，未改变默认版本。 |
| 验收边界 | 本轮不完整通关；浏览器路径在整关结算前结束，Game 测试确认正式会话没有 settlement。P1-F 的全地图/对象/动画/音画/鼠标与触屏对照仍未通过，Cow Gulch 首关与关卡验收计数保持0/60。 |
| 集成与公开发布 | `e49383b` 已并入并推送到 `master`。GitHub Actions [run 41118308536](https://github.com/wishflow/wishflow-tools/actions/runs/41118308536) 成功：Guns’n’Glory 测试、共享 catalog 检查、Cloudflare Pages 与 GitHub Pages 部署通过；Worker/config 按变更范围跳过。 |
| Codex 内置浏览器公网复核 | 打开[公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=e49383b)，确认战役面板、Cow Gulch 地图、HUD 与4×速度控件显示正常。继续后观察到 Wave01 实际推进（生命50、现金 `$79`、敌人2），随后自然进入 Wave02 对白；刷新后未完成战役从 Wave01 重新开始，已存档的1/1完成记录和最高分 `$356` 保持不变。测试没有结算战役；控制台 error/warn 为空。 |

本轮关闭的是正式 L01 内 Mexican 招募及 Wave02 群体命中的行为证据缺口；独立 fixture 仍用于价格和 AOE 边界回归。它不代表 P1-B 全部内容完成，也不改变 P1-F 首关验收状态。

**后续修订：**本节正式战役与触屏测试记录的是越界清理尚未按 APK 实现时的网页结果。第69节核实了 APK 每帧越界移除和 Cow Gulch 共享生成点持续后退；原现金 `$100`、Wave02 招募及群体命中结果不能继续作为 APK 行为证据。历史网页观察保留，但 P1-B 真实战役验收以新源证据和后续原版运行核对为准。

## 65. P1-F Cow Gulch 波次敌人生成时序

正式战役的波次请求池原先在网页模拟步中先于单位和敌人更新处理，导致本帧新生成的敌人立即移动，并可能在同一帧被枪手选为攻击目标。按 APK 调用顺序调整后，既有对象在当前帧完成移动、射击和投射物处理，波次请求池随后生成新敌人；新敌人下一帧才开始移动并进入射击目标集合。波次间隔、随机抽取、请求扣减、重试和动态难度未改。

### APK 依据与实现

REA/JADX 对 APK 1.8.6 的反编译资料显示，`GunsAndGloryThread` 主循环在 `GunsAndGloryThread.java:1087–1097` 的调用次序为 `gom.update(dt) → ed.moveEnemys() → ud.updateSpawns() → ud.moveUnits() → ud.moveShots() → wm.updateWave() → spawnPoolManager.update()`；另一个线程变体 `GunsAndGloryThread.java:1600–1610` 保持相同关键顺序。`WaveManager.updateWave()`（`WaveManager.java:195–288`）消费波次请求池。反编译文件位于研究分支 `codex/gunsnglory-spec` 的 `apps/gunsnglory/docs/research/recovered-source/java/com/hg/gunsandglory/` 归档；它们是 JADX 分析产物，不是原始 Java 源码。

网页在 [`GameSession.advance()`](../src/game/index.ts) 中把正式战役池更新移到敌人、单位和投射物移动/攻击之后、波次清空判定之前。新增的 [`campaign wave requests spawn after current-frame movement and attacks`](../tests/game.test.ts) 使用正式 Cow Gulch L01 内容，仅保留首波一个生成请求并固定随机种子：首个100ms模拟步生成一名敌人，没有 `unit-fired` 事件，敌人仍位于原始生成坐标；第二个100ms步敌人位置变化且出现 `unit-fired`。该测试在旧顺序下因本帧开火而失败，调整后通过。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 本地应用 CI | 显式使用 Node 22.23.3；`CI=1 PLAYWRIGHT_PORT=4186 pnpm run test:ci` 通过：TypeScript 检查、170项单元测试、Vite 生产构建及60项 Playwright E2E 全部通过。 |
| 共享站点与构建 | `pnpm run test:catalog` 的15项测试通过；完整六应用共享站构建成功。3D 应用报告既有 chunk size warning，构建退出码为0。 |
| GitHub Actions 与发布 | 功能提交 `7e977b6` 合入并推送 `master`。GitHub Actions [run 41125554910](https://github.com/wishflow/wishflow-tools/actions/runs/41125554910) 成功；Guns’n’Glory CI、共享 catalog 检查、Cloudflare Pages 与 GitHub Pages 部署通过。文档、宠物及 Cloudflare Worker/config 专项按本次文件变更范围跳过。 |
| Codex 内置浏览器公网实测 | 打开[公开版本](https://wishflow-tools.pages.dev/gunsnglory/?release=7e977b6)，检查桌面页面、正式战役面板、Cow Gulch 地图、HUD、4×速度控件及 Pedro 首波对白。继续后战局推进，状态仍为 Wave 1/8、生命50；随后暂停，未进入终局或生成新结算。浏览器日志为空。该浏览器已有的档案在测试开始和结束时均显示牛溪谷第1关已完成、最高分 `$356`；本次没有更改通关记录或速度设置。 |
| 验收边界 | 本轮只对齐波次生成的当前帧/下一帧时序。其余首关地图、对象、规则和表现的完整对照仍未完成，P1-F 及完整关卡验收计数保持0/60。 |

本轮完成波次生成顺序的一个可追溯差异修复，不代表 Cow Gulch 首关对照通过或完整游戏完成。

## 66. P1-F Cow Gulch 步兵速度与阵型随机

正式 Cow Gulch 的步兵生成此前省略了 APK 的请求级速度比例和成员出生槽随机：同一请求始终使用基准速度，并按偏移表顺序放置成员。由于速度与出生槽抽样属于共享 Java Random 序列，这还会让后续敌人性别、颜色及战斗随机结果偏离原版。

### APK 依据与实现

研究分支 `codex/gunsnglory-spec` 中的 `apps/gunsnglory/docs/research/recovered-source/java/com/hg/gunsandglory/gamelogic/WaveManager.java` 将 Cow Gulch Wave01/02 的 pool type 2–5 映射到 `EnemyDirector.addEnemyAtSpawnPoint(..., type=1, count=1..4, ...)`。同一分支的 `recovered-source/java-fallback/.../EnemyDirector.java` 指令恢复体在该方法的 type1 分支先取一次 `Util.random(20) + 90`，然后循环以 `Util.random(4)` 选未使用的出生槽；每个成员再随机选择 type1/2，构造器抽取颜色，并用 `addEnemy(..., true)` 递增 `unitGroupCounter`。这是依据 DEX/Smali 的反编译分析产物，不是原始 Java 源码。车毁派生乘员走另一条分支，不因本次修正而改变。

网页 [`spawnSettlerGroup()`](../src/game/index.ts) 现按同一顺序消费随机数：每个请求抽一次90%–109%的速度比例并共享给全组，成员以四个原版偏移无放回随机选槽，每名步兵得到独立组号。波次数量、波次倍率和 HP 公式不变。因为新增抽样会改变后续随机序列，[`GAME_RULES_VERSION`](../src/game/replay.ts) 升为 `gng-rules-4`；旧规则回放会按既有版本检查拒绝重放，IndexedDB 档案结构不变。

[`p1b-settler-spawn.test.ts`](../tests/p1b-settler-spawn.test.ts) 通过 Game 公共入口打开真实 Cow Gulch 内容，覆盖1–4人的步兵请求，seed 固定为1。测试独立按 `java.util.Random` 的48位 LCG 计算类型、共享速度和绘制偏移，并核对成员槽位不重复、组号各自独立。两人请求的预期速度均为485，偏移表索引为1和2。测试在旧实现上失败，修改后通过。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 定向行为测试 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 node --import tsx --test tests/p1b-settler-spawn.test.ts` 通过；修改前以固定seed重现了速度与槽位差异。 |
| 本地应用 CI | `source /Users/shiwei/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=4201 nvm exec 22.23.3 pnpm run test:ci` 通过：TypeScript 检查、171项单元测试、Vite 生产构建及60项 Playwright E2E 全部通过。临时 worktree 的 frozen lockfile 安装因 DNS 不可用未完成；本地测试复用了现有应用依赖的临时 overlay。 |
| 共享站点目录检查 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm run test:catalog` 的15项测试全部通过。完整共享站构建由发布工作流验证。 |
| GitHub Actions 与部署 | master 提交 `8279a79` 对应 [Actions run 41133123887](https://github.com/wishflow/wishflow-tools/actions/runs/41133123887) 成功；Guns’n’Glory 测试、共享 catalog、Cloudflare Pages 与 GitHub Pages 部署通过。Cloudflare Worker/config 任务按变更范围跳过。 |
| Codex 内置浏览器公网实测 | 打开 [`?release=8279a79`](https://wishflow-tools.pages.dev/gunsnglory/?release=8279a79)，确认正式战役及 Cow Gulch 地图加载，Wave01 HUD 显示生命50、敌人数11；全地图画面可见，浏览器 error/warn 日志为空。观察时临时将模拟速度从已保存的4×改为0.25×，随后暂停并恢复4×；结束时未完成关卡仍可重新开始，战役档案仍为已完成1/1、最高分 `$356`，没有新增结算。 |
| 完整首关门槛 | 本轮只修复 Wave01/02 步兵请求的随机速度与阵型槽位；P1-F 的地图、对象、剩余战斗表现和鼠标/触屏完整对照仍未通过。Cow Gulch 与整体关卡验收计数保持0/60。 |

## 67. P1-F Cow Gulch 桥面与生成边界路线复核

针对“峡谷里的敌人为什么会走到桥上”复核了 APK map01 控制字段、路线图、桥面覆盖范围及敌人碰撞配置。结论是：**经过 Cow Gulch 东侧桥面属于原版路线；不能为阻止这一段路径给敌人添加通用地形碰撞。**

APK map01 的敌人路线从 spawn `(0,10)` 依次经过 redirect `(4,10) → (4,13) → (12,13) → (12,6) → (9,6) → (9,2) → (12,2) → (12,3) → (15,3)`，最后从 exit `(16,3)` 离场。`(12,13) → (12,6)` 的直线路段经过 `(12,9)`；原始地图的水平桥面绘制范围为 `x=11.75..13.25, y=9`，覆盖该路线中心。因此敌人经过这里是路线字段与贴图桥面的对应结果。依据为研究资料 `R/data/map-inventory.json`、`R/data/static-route-graph.json` 和 `R/route-and-wave-model.md`，并与网页 `cow-gulch-preview-wave.ts`、`cow-gulch.json` 对照。

同一来源还确认生成池成功生成时，会把共享 spawn 字段沿反方向移动两格；Cow Gulch spawn `(0,10)` 朝东，所以后续生成会继续向西偏移。第69节进一步核对了成功生成保留偏移、每帧越界清理及 type8 免扣命分支。APK 的敌人碰撞管理器关闭背景地形碰撞，路线由 action 1/2/3 字段驱动。该证据解释生成位置在地图外与桥面路线为何可能出现，但不能单独证明原版渲染时的可见边界；渲染规则见第70节。本轮没有据此修改路线或地图碰撞。

### 验证边界

| 验收面 | 结果 |
| --- | --- |
| APK 路线字段与静态图 | map01 的 spawn、redirect、exit 顺序在 `R/data/map-inventory.json` 与 `R/data/static-route-graph.json` 中一致；静态路线图只描述字段连接，不等价于随机战局轨迹。 |
| 桥面重叠 | Cow Gulch 水平桥面 bounds 与路线 cell `(12,9)` 相交，路径属于原版线路。 |
| 背景碰撞 | `R/route-and-wave-model.md` 依据 `GunsAndGloryThread.onLoadGame` 和 `CollisionManager` 证据记录 `backgroundMapCollisions=false`；网页不得加入与 APK 相反的全图地形阻挡。 |
| 线上运行观察 | 本轮公开实测只覆盖 Wave01 的整体推进与地图显示，没有逐帧记录 `(12,9)` 通过事件；此条结论来自可复算静态资料，不计为动态坐标观察。 |
| P1-F 总门槛 | 该路线复核不代表完整移动、碰撞、离场、桥面遮挡或全关卡验收通过；Cow Gulch 与完整关卡计数仍为0/60。 |

## 68. P1-F Cow Gulch 异组敌人碰撞

网页此前只在运输队生成前检查同类碰撞，运输敌人进入路线后没有执行 APK 的异组阻挡，迎面运输队可能互相穿过。本次按 APK 碰撞查询补上 type4/type8 行进阻挡，并保留步兵无碰撞框、同组关系及“背景地形碰撞关闭”的原版边界。此项不改变路线、桥面贴图或玩家单位碰撞规则。

### APK 规则与范围

研究分支 `codex/gunsnglory-spec` 的 DEX/Smali 分析显示，`GunsAndGloryThread.onLoadGame()` 分别创建玩家单位碰撞管理器和敌人碰撞管理器；敌人管理器参数为 `backgroundMapCollisions=false`、`ignoreSameUnitGroup=false`。`EnemyDirector.isCollsionObject()` 只为 type8、4、5、6、3、7 注册敌人碰撞对象，敌方管理器的列表仅由 `EnemyDirector.addEnemy()` 添加这些敌人；它不含地形、地图装饰、生成点或玩家单位。

每个敌人碰撞框尺寸为 `7678×7678` fine units。构造时起点是 `(fineX - 3840 + 1, fineY - 3840 + 1)`；`GameObjectEnemy.move()` 更新后改用 `(fineX - 3840, fineY - 3840)`。碰撞查询根据当前 `xDir/yDir` 运行 `CollisionManager.testCollisionEnemy()` 与 `boxCheck()`；候选条件是“候选组号不同，或 `ignoreSameUnitGroup=true`”。敌人管理器传入 `false`，故同组对象会被跳过，只有异组候选参与碰撞。`EnemyDirector.moveEnemys()` 在命中时调用 `undoMove(xDir, yDir)` 恢复上次存储的位置并恢复方向。若碰撞者列表中紧接着的对象同组，则把该对象标为 `movementBlocked`，使其本次 `move()` 不移动。

Cow Gulch 已实现敌人类型为1、2、4、8，因此当前只有 type4 车厢和 type8 牵引对象进入碰撞查询；type1/2 步兵没有碰撞对象，敌人与桥面、峡谷、装饰或玩家单位之间也不会由该管理器阻挡。type8/type4 同组运输对生成时中心间距为7680，碰撞框宽7678；同组过滤使牵引件和车厢保持各自移动，不会互相回退。异组运输对象按列表顺序更新时，碰撞管理器用当前方向作两段预测；命中时才回退。该规则确认“敌人经过东侧桥面是原版路线”，不能据此增加全图地形碰撞。

网页 [`enemyCollisionBlocksMove()`](../src/game/index.ts) 复用上述碰撞框、过滤同组对象的规则、APK `boxCheck` 角点判定及速度方向预测。碰撞时恢复上一步位置和方向，将行走距离累计清零，并让列表中的同组下一成员跳过本次移动。规则版本升至 [`gng-rules-5`](../src/game/replay.ts)，因为旧回放没有该移动碰撞行为；IndexedDB 档案结构未变。

### 行为覆盖

[`p1f-enemy-collision.test.ts`](../tests/p1f-enemy-collision.test.ts) 从真实 Cow Gulch 战役内容派生两组相向运输敌人，使用 Game 公共 Interface 推进并逐帧核对异组碰撞框不重叠；碰撞时双方保持停止。同组 type8/type4 运输对在整个观察区间保持原始间距，验证 `ignoreSameUnitGroup=false` 会过滤同组候选。相同路线上的步兵测试核对 type1/2 会互相穿过，防止把所有敌人错误加入碰撞管理器。

第一次运行红测在第27帧复现运输敌人跨组碰撞框相交，中心差 `7440`；实现后定向测试和 TypeScript 检查通过。该用例是依据反编译 CollisionManager 行为的静态/本地模型对照，不是 Android 实机帧录制。

碰撞实现期间先发现越界清理差异，详见[第69节](#69-p1-f-cow-gulch生成点漂移与越界清理)。当时三项旧战斗测试失败，表现为现金/射击进度变化及 Wave03 存活组数减少；这些用例建立在缺少逐帧清理的网页模型上，不能据此否定 Smali。第69节已单独调整规则与测试预期；本节异组碰撞范围与结论不变。

### 验证

| 验收面 | 结果 |
| --- | --- |
| 定向行为测试 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm --dir apps/gunsnglory exec node --import tsx --test tests/p1f-enemy-collision.test.ts` 两项通过；修改前第一项按独立预期在第27帧失败。 |
| 本地应用 CI | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 env CI=1 PLAYWRIGHT_PORT=4201 pnpm --dir apps/gunsnglory test:ci` 通过：TypeScript、173项单元测试、Vite生产构建及60项 Playwright E2E 全通过。临时 worktree 使用已有应用依赖的本地 `node_modules` 链接；未改依赖或 lockfile。 |
| 共享站点目录检查 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm run test:catalog` 15项通过。 |
| 发布与内置浏览器 | 待本地提交合并、推送并由工作流部署后实测。 |
| P1-F 总门槛 | 异组敌人碰撞这一局部行为通过，不代表整个 Cow Gulch 首关视觉/交互对照通过；完整关卡验收计数仍为0/60。 |

## 69. P1-F Cow Gulch 生成点漂移与越界清理

网页此前只在敌人通过格心、进入路线节点分支时检查地图边界。APK 在该分支之后仍对每个存活敌人逐帧执行地图范围检查；网页敌人能因此多走若干格，后续请求和波次结果也随之偏离。本轮按 Smali 消费顺序修正，并补上越界移除时 type8 牵引马车的免扣命规则。

### APK 证据与可下结论

| 行为 | APK 证据 | 结论 |
| --- | --- | --- |
| action1 生成字段移动 | `codex/gunsnglory-spec` 中 `EnemyDirector.smali` 的 `addEnemyAtSpawnPoint()`，`.line 792–793` | 每次请求先将所选共享 action1 字段的 `fineX/fineY` 减去 `spawnDirectionX/Y × 2 × 0x1e00`；`0x1e00 = 7680` fine units，即沿生成反方向移动两格。 |
| 成功/失败的位移差异 | 同方法 `.line 909–910` 和成功生成分支 `.line 814–901` | 只有预检碰撞失败时才把字段加回两格；成功生成会保留位移，后续成功请求复用已变更字段。该逻辑跨波次共享。 |
| 越界时机及阈值 | `EnemyDirector.moveEnemys()` `.line 503–505` | `passesFieldCenter()` 仅控制转向/路线离场分支；其后分支外检查 fullX/fullY。坐标到达 `-3` 或达到地图宽/高加3时立即移除。 |
| fullX/fullY 换算 | `GameObjectEnemy.move()` 及构造逻辑；DEX/Smali 反编译记录 | `fineX/fineY ÷ 7680.0f` 转成 Java `int`，对负数向零截断；不能替换为向下取整。 |
| 移除扣命 | `EnemyDirector.removeEnemyWithPenalty()` `.line 722–742` | 所有类型从对象/绘制/碰撞集合移除；type8 在扣生命和更新逃逸难度前跳过，其它类型调用 `getPenaltyForSurviving()` 并扣相应生命。 |

Cow Gulch map01 的原始 action1 是 `(0,10)` 向东，且地图目录只列出一个该生成点。因生成字段在成功请求后持续向西移动，后续敌人可在地图西侧生成；越界检查会在它们的首次或后续移动更新中移除。这个结论来自静态 Smali 与地图数据交叉核对。它证明网页必须复现这套行为，但**尚未单独证明原版 1.8.6 运行时的整关最终现金、死亡波次或能否通过玩家操作获胜**。

### 网页修正与独立预期

网页 `moveEnemy()` 现在在每个移动更新后直接计算边界结果，不等待 `passedCenter`；汇总移除时仅对 `type !== 8` 扣生命和更新逃逸难度，type8 仍移除并计入网页诊断的移除数量。路线节点、地图数据、相机裁切和碰撞框均未因该修正移动。

固定 Java 随机种子42、无玩家命令的当前模型在 Wave04 以 `$66` 和0生命进入 defeat；这是网页规则模型的可复现结果，不是 APK 运行记录，也不代表手动操控下必然同样失败。第64节的 Wave02 `$100` 与 Mexican 招募结果来自旧网页规则，已标为无效 APK oracle；对应正式场景与触屏测试改为验证当前源规则，单位招募及 Mexican AOE 由隔离行为测试覆盖。

新增 [`p1f-map-boundary-cleanup.test.ts`](../tests/p1f-map-boundary-cleanup.test.ts) 确认敌人越过 `fullX <= -3` 的当前帧即被移除并只扣一次命；修正前断言失败，修正后通过。`p1c-campaign.test.ts` 的 Wave03 测试保留全部三个请求和六秒间隔断言，同时确认第二/第三运输组在边界处移除、牵引 type8 不扣命、车厢 type4 各扣一次。`game.test.ts` 固定种子路径回归当前模型现金、波次和 defeat 结果；Gunslinger 特殊装填本身仍由实际六发 fixture 验证，不依赖已被清理的正式敌群。

### 验证边界

| 验收面 | 结果 |
| --- | --- |
| APK 静态证据 | `EnemyDirector` 生成、移动清理、扣命三处 Smali 与 `GameObjectEnemy` fullX 换算交叉核对；反编译文件不是原始源码。 |
| Game 与应用 CI | `source ~/.nvm/nvm.sh && CI=1 PLAYWRIGHT_PORT=4220 nvm exec 22.23.3 pnpm --dir apps/gunsnglory run test:ci` 通过：TypeScript、174 项单元测试、Vite 生产构建及60项 Playwright E2E。根目录 `source ~/.nvm/nvm.sh && nvm exec 22.23.3 pnpm run test:catalog` 的15项测试通过。 |
| 浏览器测试时间边界 | 原 T22 只推进60秒浏览器时钟，按4×累计规则实际只推进约4分钟游戏时间，固定种子战役尚未败北；增加到100秒后定向测试通过。未设置 `CI=1` 的5 worker 初跑还使两个其他 E2E 超时；它们单 worker 复测及最终 `CI=1` 全套均通过。之后运行此套件应沿用 CI 单 worker 配置，并根据模拟器时长设置虚拟时间。 |
| Codex 内置浏览器本地检查 | 在隔离的新 origin `http://127.0.0.1:5237/` 检查初始0/1档案、Cow Gulch 地图/HUD 与 Pedro 的第一波提示；继续后可见战斗 HUD。没有完成正式战役结算，未写入新档案。 |
| GitHub Actions 与发布 | 代码提交 `d482dbb` 经合并提交 `952e360` 推入 `master`；[workflow 41169809259](https://github.com/wishflow/wishflow-tools/actions/runs/41169809259) 成功。应用测试（2分18秒）、共享目录检查、Cloudflare Pages 与 GitHub Pages 部署全部通过；Worker 按变更分类跳过。 |
| Codex 内置浏览器公网实测 | 打开 [`?release=952e360`](https://wishflow-tools.pages.dev/gunsnglory/?release=952e360)，检查原版战役页和 Cow Gulch 场景，关闭 Pedro 第一波提示后 HUD 正常显示；切回不结算正式战役的样本，确认 Wave 1 待开始、生命50、现金 `$65`、模拟速度4×。页面保留已有档案“已完成1/1、最高分 `$356`”；未运行至战局结算。控制台 error/warn 查询无返回。 |
| 原版运行核对 | 尚未记录相同地图/波次/生成请求的 APK 运行画面或坐标；不把网页固定种子输出写作原版运行观察。若后续确认其输出与 Smali 推导不同，记录具体点位及新证据并重新检查字段初始化/恢复路径。 |
| P1-F 总门槛 | 越界清理这一行为差异关闭；Cow Gulch 完整规则、画面、触屏/鼠标及原版运行对照未完成，关卡与整体计数仍为0/60。 |

## 70. P1-F Cow Gulch 敌人地图边缘可见性

网页此前只按 1024×576 游戏视口裁切世界对象；Cow Gulch 地图比视口高时，生成在地图西侧之外但仍落在画布内的敌人会被画出来。APK 对敌人贴图另有地图范围相交检查：全身贴图完全离开地图后隐藏，贴图仍与地图相交时完整绘制，允许部分越过地图边缘。它不把敌人贴图裁成地图边缘形状。

### APK 依据与网页修正

APK 1.8.6 的 `GunsAndGloryThread.drawEnemies()` 按对象顺序调用 `GameObjectEnemy.draw(Canvas,int,int)`；`GameObjectEnemy.draw()` 在绘制主体前用 `GunsAndGloryThread.isObjectOnScreen(Rect)` 检查对象是否仍在 playfield。该检查将对象矩形交给 `isObjectOnPlayfield(...)`，以整数边界判断矩形与地图范围是否相交。主循环对画布应用的是屏幕矩形裁切，没有再按地图矩形裁切敌人贴图。因此，不能因贴图越过地图边缘就判定原版错误；判断条件是敌人矩形是否还与地图相交。以上来自 APK 1.8.6 的 JADX/REA 反编译结果，不是原始 Java 源码。

网页 [`intersectsMapPlayfield()`](../src/render/canvas-renderer.ts) 现使用相同的整数矩形相交条件。敌人主体及运输车烟雾在完全离开地图后不画；仍有相交时保留整张贴图，外沿交由游戏画布视口裁切。健康条仍按其独立绘制逻辑处理。本轮只调整可见性，不改变地图贴图、路线、碰撞或相机。

### 回归与验证

[`canvas-renderer.test.ts`](../tests/canvas-renderer.test.ts) 对同一渲染调用记录三种情况：地图内敌人正常绘制；完全位于地图外的敌人不绘制；只部分压入地图的敌人仍绘制，且目标矩形仍越过地图边界。该断言防止网页误把“是否可见”改成“按地图裁切贴图”。

| 验收面 | 结果 |
| --- | --- |
| 定向渲染回归 | `canvas-renderer.test.ts` 通过，覆盖全离图隐藏与部分越界保留。 |
| 本地应用 CI | 显式使用 Node 22.23.3 执行 `CI=1 PLAYWRIGHT_PORT=4221 pnpm --dir apps/gunsnglory run test:ci`：TypeScript、174 项单元测试、Vite 生产构建和60项 Playwright E2E 全部通过。根目录 `pnpm run test:catalog` 的15项测试通过。 |
| GitHub Actions 与发布 | 代码提交 `6e61788` 合入 `master` 发布提交 `e24dc69`；[Actions run 41172716366](https://github.com/wishflow/wishflow-tools/actions/runs/41172716366) 成功，Guns’n’Glory 测试、共享 catalog、Cloudflare Pages 与 GitHub Pages 部署均通过。Worker 按变更范围跳过。 |
| Codex 内置浏览器公网核对 | 打开[线上版本](https://wishflow-tools.pages.dev/gunsnglory/?release=e24dc69)，确认战役地图及单个拓荒者隔离样例可加载和结算；样例结果为生命50、逃脱0、击败1、现金 `$66`。正式档案仍为已完成1/1、最高分 `$356`；测试后把临时调低的速度恢复到已保存的4×。这是发布烟测，不是整关对照；全离图/部分越界的逐帧公网页面画面对照未单独录制，边缘判定由 APK 反编译证据与渲染调用测试验证。 |
| P1-F 总门槛 | 本轮只关闭敌人贴图完全离开地图时仍显示的网页差异；原版允许仍与地图相交的贴图越过边缘。完整 Cow Gulch 地图、规则及鼠标/触屏对照仍未完成，关卡验收计数保持0/60。 |

## 71. P1-F Cow Gulch 玩家地图边界

网页先前用两条额外规则限制玩家移动：碰撞框任一角越过地图格索引就判为碰撞，并要求完整精灵矩形位于地图纹理内。这与 APK 的玩家移动边界不一致，可能让单位在应可通行的边缘提前停下。现按 APK 的单位中心边界、地图越界背景返回值和实际显示图块像素宽修正。

### APK 静态依据

APK 1.8.6 `GameObjectUnit.makeMoveCheck()` 先逐轴调用玩家碰撞管理器，然后对移动后的 `fineX/fineY` 单位中心应用独立边界公式；其 margin 为整数除法 `30720 / realTilesize`。X 下界为 `3840 - margin`，X 上界为 `mapWidth × 7680 - 3840 + margin`；Y 下界为 `7680 - margin`，Y 上界为 `mapHeight × 7680 + margin`。`BackgroundMap.getBackground()` 对越界格返回 `-1`，`isReachableXGround()` / `isReachableYGround()` 不将 `-1` 列入阻挡地形。因此，地图越界探测本身不会阻挡玩家，独立中心边界才限制可移动范围。上述内容来自 APK 反编译后的 DEX/Smali 对照，不是原始 Java 源码，也没有额外假定完整贴图须留在地图内。

`realTilesize` 会随场景显示缩放变化。网页每帧把未应用用户镜头缩放的底图 `tileSizePixels` 作为规则环境输入；Game 使用其整数值复现 APK 的边界除法，Replay 同帧保存并重放该值。规则版本升为 `gng-rules-7`、回放格式升为2，避免将缺少该输入的旧格式静默解释为新规则。

### 网页规则与验证

网页 `playerAxisWithinOriginalMapBounds()` 现在应用以上逐轴中心边界；`mapBlocksUnit()` 只对地图内的碰撞探测格读取地形，越界探测视为原版 `-1`。玩家实体碰撞框、装饰碰撞、逐轴移动和地图尺寸均未因此重设。镜头缩放只改变观察，不进入 `tileSizePixels`，所以缩放/平移不会修改游戏边界。

`game.test.ts` 使用空地图把单位向四个地图外目标移动，核对每个坐标都停在公式边界之内且离边界不到一个移动步长；另以60与80设备像素图块宽复核 margin 的反比变化，固定慢速枪手结果分别为3380与3480 fine units。坏的 `tileSizePixels` 必须在消费帧前拒绝。回放用例检查每帧保存正整数环境值、格式版本2、损坏的环境值被拒绝，且完整确定性重放一致。

移动端集成回归还把镜头与输入串起来：在 Cow Gulch 单波隔离样本中，以枪手位置为焦点放大1.5倍，再按变换后的同一地图坐标触屏拖动；页面到达 `Cell (10, 9)`，抬手后 Canvas 像素保持稳定。该用例不启动波次、不写正式档案，验证相机变换不会让绘制与触屏输入分叉。

| 验收面 | 结果 |
| --- | --- |
| 定向移动端浏览器回归 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm exec playwright test tests/e2e/t10-camera.spec.ts --reporter=line` 通过：3项镜头/触屏用例。 |
| 应用 CI | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 env CI=1 PLAYWRIGHT_PORT=4271 pnpm run test:ci` 通过：TypeScript、176项单元测试、Vite 生产构建及61项 Playwright E2E。 |
| 共享站点目录 | `source /Users/shiwei/.nvm/nvm.sh && nvm exec 22.23.3 pnpm run test:catalog` 的15项测试通过。 |
| Codex 内置浏览器本地操作 | 在本地 Vite 页面打开 Cow Gulch 单波样本，点击选中枪手并把拖动目标移到地图左缘；状态从 Cell (9, 9) 更新为 Cell (8, 9)，截图确认枪手随输入移动并停在峡谷地形边缘。样本仍为 Wave 1 ready、生命50、现金 `$65`，未结算或修改正式进度；浏览器 error/warn 日志为空。 |
| GitHub Actions 与公开部署 | 提交 `df89ebb` 的 [Actions run 41185318893](https://github.com/wishflow/wishflow-tools/actions/runs/41185318893) 成功；Guns’n’Glory 测试、共享站点检查及 Cloudflare Pages、GitHub Pages 部署均通过。 |
| Codex 内置浏览器公开版 | 打开 [`df89ebb` 公开版](https://wishflow-tools.pages.dev/gunsnglory/?release=df89ebb)，切到隔离样本后用鼠标拖动枪手，界面从“尚未选择单位”更新为“已选择枪手 · Cell (10, 9)”；战局检查显示 `gunslinger-1` 位于 `(9.07, 8.65)`，无敌人，松开后再次读取状态未变化。样本保持第1波待开始、生命50、现金 `$65`；正式档案仍显示已完成1/1、最高分 `$356`，模拟速度4×、音效关闭；浏览器 error/warn 日志为空。此为桌面鼠标公网烟测，缩放后触屏拖动由本地 Playwright 回归覆盖。 |
| P1-F 总门槛 | 玩家边界规则和相机后触屏拖动的坐标一致性已有覆盖；不代表路线、绘制、所有关卡及鼠标/触屏对照完成，首关整体验收仍为0/60。 |
