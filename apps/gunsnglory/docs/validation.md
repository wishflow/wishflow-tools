# Guns’n’Glory 验证记录

T01 当前验收见第 6 节。第 1–5 节记录设计文档与 agent 上下文的历史检查；其中“尚未实现”描述的是当时状态，不代表当前交付状态。

历史范围为本批 [AGENTS.md](../AGENTS.md)、[架构设计](architecture.md)及其存储、模拟和[实施计划](implementation-plan.md)文档；当时没有游戏代码、CLI、MCP 或后端实现。

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

T13 增加 `Experiments.run()`，通过真实 `Game` 公共 Interface 执行一个固定版本场景。测试策略只观察冻结的玩家可见白名单；Game 开局记录在首帧前校验。运行记录精确区分胜负、预算耗尽、取消、无效输入和执行错误，不读取或修改正式进度。当前没有实验 UI、方案编辑、持久化、批量或 CLI；完整实现边界见[模拟与自动化契约](simulation-and-automation.md#63-t13-当前实现范围)。

| 检查 | 结果 |
| --- | --- |
| `pnpm --dir apps/gunsnglory run test:ci` | 通过：TypeScript 检查、84 项单元测试、Vite 生产构建及 33 个 Playwright 场景。Experiments 覆盖固定 seed 胜利/败北、内容/规则/策略版本不符、未知场景、拒绝 `latest`、帧/模拟时长/实体/墙钟预算、取消与会话关闭、非法意图/策略异常及无效/故障/倒退时钟。 |
| T13 Playwright 浏览器集成 | Chromium 页面动态加载正式 Cow Gulch 内容、Game 和 Experiments Module；经 `Experiments.run()` 得到 Victory、`mode: experiment`、seed 42 和终局现金 $66。单场景行为不依赖 UI、Progress 或 IndexedDB。 |
| `pnpm run test:catalog` | 通过：14 项导航目录、发布分类及静态站输出检查。 |
| `pnpm run install:apps` 与 `pnpm run build:site` | 冻结安装全部登记应用依赖成功，共享站点及全部静态应用构建成功。3D Objects 输出既有的单 chunk 体积提示，其 bundle 检查仍通过。 |
| Codex 内置浏览器本地预览 | 打开 Guns’n’Glory 生产构建预览 `http://127.0.0.1:4174/`；页面正常显示 Cow Gulch、HUD 与现有控制。浏览器 console 的 error/warn 为空。T13 没有新增可见控件，其真实运行已由上一行 Chromium 行为测试核验。 |
| 集成与发布 | `c3c80d6` 已快进合入本地 `gunsnglory` 与 `master`，并推送 `master`。GitHub Actions [40638987841](https://github.com/wishflow/wishflow-tools/actions/runs/40638987841) 以 `success` 完成。重新加载公网标准地址 `https://wishflow-tools.pages.dev/gunsnglory/` 后，内置浏览器显示 Cow Gulch 地图、状态、倍速控件和现有操作；控制台 error/warn 为空。T13 无可见游戏控件，其单场景真实行为由前述 Chromium Playwright 测试覆盖。 |

## 19. T14 Cow Gulch 贴图变体与桥位路线核对

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
