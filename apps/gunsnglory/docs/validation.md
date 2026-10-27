# 设计文档交付验证

最新状态见第 5 节：用户已确认三个公共 Module 和纵向切片，文档已统一更新。第 1–4 节保留历史交付证据，其中的候选状态不代表当前设计状态。

日期：2026-10-26。范围为本批 [AGENTS.md](../AGENTS.md)、[架构设计](architecture.md)及其存储、模拟和[实施计划](implementation-plan.md)文档。当前没有游戏代码、CLI、MCP 或后端实现。

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

实施任务图列出 T01–T26、B01–B05，并为完整内容定义逐项实例化的行为模板。27 条用户故事都有验收责任映射；具名任务的已列出依赖检查无环，内容模板实例化后仍须检查新增依赖。所有游戏任务仍未实现。

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
