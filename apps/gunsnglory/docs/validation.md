# 设计文档交付验证

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
