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
| 交互观察 | 当前公网浏览器保存的 Usagi 浮层位置覆盖倍速滑杆中段；本次可访问性控件操作通过，浮层遮挡下的鼠标/触屏命中尚未验证，作为共享页面叠层问题单独跟进。 |

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
