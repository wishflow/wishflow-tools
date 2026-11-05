# Guns’n’Glory 协作约束

仓库根 [AGENTS.md](../../AGENTS.md) 始终生效；本文件只补充应用约束。详细定义按任务触发加载，唯一进度见[实施计划](docs/implementation-plan.md)。

## 分支与工作树

- 本应用以 `gunsnglory` 作为长期集成分支，以 `master` 作为公开发布分支；此约定覆盖根规则中的默认分支模型，根规则的测试、文档和交付要求仍适用。
- 开始或恢复工作时，检查 `git rev-parse --show-toplevel`、`git status --short --branch`、`git worktree list`、`git branch -vv`，并执行 `git fetch origin master gunsnglory`。确认选中的工作树跟踪预期分支、没有未提交改动，且集成分支包含最新 `origin/master`。落后时用普通 merge 同步，不 rebase、不强推。
- 同一分支存在多个工作树时，先确认每个工作树的 HEAD、上游和脏状态；在干净且最新的工作树继续。保留所有未提交现场，不用旧工作树或旧构建产物判断代码版本。
- 发布后核对 `master` 与 `origin/master` 指向同一发布提交；再将发布提交合并回 `gunsnglory`，推送 `origin/gunsnglory` 并核对两者一致。更新相关工作树并确认其 HEAD 对应各自上游，且集成分支包含已发布代码。两个分支在继续开发后可以有不同 HEAD，但不得存在漏掉发布提交的工作树。

## 开始工作

| 任务 | 必读资料 |
| --- | --- |
| 确定玩法、原版参数、内容或验收 | [产品规格](docs/spec.md)相关部分；资料冲突先追到实际消费点 |
| 改 Module、接口、依赖或类型归属 | [架构](docs/architecture.md) |
| 改档案、内容读取或实验持久化 | [存储契约](docs/storage-contracts.md) |
| 改步进、随机、回放、脚本或批次 | [模拟与自动化契约](docs/simulation-and-automation.md) |
| 选择任务、依赖、验收门槛或发布批次 | [实施计划](docs/implementation-plan.md) |

每次开始或恢复任务，先用 `git rev-parse --show-toplevel`、`git status --short --branch`、`git worktree list` 和 `git branch -vv` 确认仓库、工作树、分支和上游；不得默认当前目录对应最新集成状态。需在 `gunsnglory` 集成分支工作时，先 `git fetch origin master gunsnglory`，确认本地 `master` 与 `origin/master` 对齐、`gunsnglory` 已包含 `origin/master` 且跟踪 `origin/gunsnglory`。若落后，使用普通 merge 同步并完成适用验证；不 rebase、不强推。发现旧工作树有未提交改动时，保留其现场并改用干净工作树，不切分支或覆盖改动。提交推送后再核对本地与远端状态。

## 稳定约束

- 公共能力只有 `Game`、`Progress`、`Experiments`；以公共 Interface 作为主要行为测试边界。具体实现状态不能从目标架构推断。
- 规则在 Game 的同步会话内计算。时间、输入、随机与影响规则的环境信息须显式提供；UI、渲染和存储不得写规则状态。
- 以已确认的原版语义为基线。网页适配与主动平衡调整分开；未知数值不得猜测补齐。
- 内容由游戏自有数据与资源提供。研究材料不进入构建/运行依赖，资源迁入不等于玩法验收。
- 先做单应用、最小依赖和真实纵向切片；只有真实消费者需要时才加 Seam、Adapter、worker 或后端。
- 正式档案只接受正式结算；实验、调试和回放与个人进度隔离。

## 实施与交付

1. 开工前审查当前代码、近期提交与计划状态，只实施尚未闭合且有证据支持的差异。完成任务立即从活动计划删除；不得因旧清单存在而重复修复或重复运行已通过检查，除非回归或验收链失效。
2. 切片同时交付所需规则、内容、表现、交互和行为测试。预期须来自独立来源；真实关卡验收不能由 fixture 代替。每个切片运行针对性测试并本地提交；整批切片完成后运行 `pnpm run test:ci` 和适用的共享检查。失败在当前批次内修复，不逐提交重复跑全套。
3. 整批检查通过后，以一个 squash commit 将验收批次从 `gunsnglory` 集成到 `master` 并发布。修复批次完整验收后发布；普通功能按完整功能批次发布，不按单个 commit 发布。每次成功发布后将发布提交合并回 `gunsnglory`、推送远端并更新相关工作树。
4. 普通公开发布次数除以已验收实现切片数的目标不高于20%；修复批次按完整批次发布所造成的实际比例如实记录，不拆散或延迟已验收修复来美化比例。当前计数及下一次普通发布门槛只在实施计划维护。文档整理不计产品切片、不单独发布。
5. 每个实现提交说明写明行为变化、范围、针对性验证命令与结果，以及未验证项或限制；批次交付说明补充全套验证与发布结果，不维护逐任务验证日志。静态应用发布后等待 CI 成功，核对公开构建来源 SHA，再以 Codex 内置浏览器验证整批功能；未完成这些检查不得报告发布完成。
6. 文档交付检查链接、唯一职责与事实依据，运行 `git diff --check`，并按仓库规则复制成品 Markdown 到 `/tmp/var/wishflow-tools/`。

[CLAUDE.md](CLAUDE.md) 仅导入本文件；用户明确的项目分支约定优先于根规则的默认分支约定。
