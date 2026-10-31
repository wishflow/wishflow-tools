# V5 Tasks：控制流与既有运行错误的连续解释

依据：[V5 规格](../specs/v05-control-flow-explanations.md)及[执行可视化体验计划](../visual-execution-plan.md#v5控制流与既有运行错误)。本阶段只解释 Teaching VM 已记录的控制流和运行诊断，不更改执行语义。

## 前置

- V4 调用/返回动画和 P6/P9 Teaching VM 行为已作为现有能力；执行语义以 Python 语言行为为准。
- 不要求项目负责人通过口头答题证明理解 Python 语义。使用实现、自动化用例、固定 Pyodide CPython 对照和线上场景验证；教学效果观察可单独安排，不作为 V5 发布门槛。
- 代码从 `master` 最新提交创建独立分支；不在旧 V4 分支上继续开发。

### Python 语义核对

Python 的语言行为是 V4/V5 展示和解释的语义依据。V5 用 Teaching VM 测试验证实际快照与讲解一致，并对共享语法使用固定版本 Pyodide CPython 核对最终输出和错误类别；生产验收检查界面呈现真实帧、控制流目标、失败位置和最终状态。教学效果的目标用户观察可以另行记录，但不改变语言语义，也不阻塞本阶段发布。

## 实施顺序

- [x] **T01：从相邻快照派生分支、跳转、短路和迭代事件**
  - 验收：`POP_JUMP_IF_FALSE`、`JUMP`、两种短路指令和 `FOR_ITER` 的值栈、目标 PC、控制流摘要与前后帧一致时才产生事件；历史不连续或数据矛盾时退化。
  - 验证：单测覆盖两种分支结果、前/回边跳转、range 非空/为空、and/or 短路与右侧求值、目标错位、操作数/PC 不一致和指令上限省略。
  - 文件：`src/teaching-vm/animation.ts`、`tests/teaching-animation.test.ts`。

- [x] **T02：解释已支持运行错误且不制造成功状态**
  - 验收：诊断指向真实故障指令；前后态确认操作未写入时显示操作数和未提交结果；预算耗尽说明下一条指令尚未执行；V4 调用拒绝保持原样。
  - 验证：Teaching VM 单测覆盖 NameError、TypeError、下标/字典失败、零步长、失败 STORE_SUBSCR 无堆变化、输出/值栈保留、指令预算不执行及未知/不一致诊断退化；Playwright 使用真实 Worker 验证失败写入说明。
  - 文件：`src/teaching-vm/animation.ts`、`tests/teaching-animation.test.ts`。

- [x] **T03：在讲解卡呈现控制流目标与失败原因**
  - 验收：分支/跳转/短路/迭代显示实际目标指令和可用源码行；错误显示实际诊断并保留失败前操作数；调用/对象动画仍可共存且过渡顺序一致。
  - 验证：组件断言中英文文案、帧/栈/堆绑定同一快照、减少动态效果、目标缺少源码映射、键盘可读和窄屏无横向溢出。
  - 文件：`src/components/TeachingAnimationPanel.tsx`、必要时最小调整 `src/components/TeachingVmPanel.tsx`、`src/locales.ts`、`src/styles.css`。

- [x] **T04：真实 Worker 浏览器回归和双语指南**
  - 验收：if/elif/else、while/for、and/or、失败操作/资源耗尽、断点重复命中、历史、Pause/Reset 均与 P6/P9 一致；Guide 中英文同步解释。
  - 验证：Playwright 真实 Worker 用例覆盖分支/嵌套循环/短路副作用/错误状态和 320/768/1024/1440px；选共同语义用固定 Pyodide CPython 核对最终输出和错误类别。
  - 文件：`e2e/teaching-animation.spec.ts`、`docs/guide/usage.zh-CN.md`、`docs/guide/usage.en.md`。

- [x] **T05：全量验证、审查、提交、发布与线上实测**
  - 验收：应用 CI、catalog、整站构建、代码审查及文档链接检查通过；合并/推送后 Actions 成功；线上 Teaching VM 与真实 CPython 均实测；计划标记准确。
  - 验证：应用 `pnpm run test:ci`、根 `pnpm test:catalog`、`pnpm build:site`、`git diff --check`；按仓库规则复制 Markdown 成品到 `/tmp/var/wishflow-tools/` 并 `cmp`；使用 Codex 内置浏览器线上验收。
  - 文件：实现范围内文件、`docs/visual-execution-plan.md`、本 tasks。

## 检查点

- **A（T01）**：每条控制流动画都由实际指令、真实控制流摘要和相邻快照佐证。
- **B（T02–T03）**：任何失败/预算终止都不展示伪造写入或已执行状态；V4 调用与 V3 数据动画不回归。
- **C（T04–T05）**：双语、帮助内容、两引擎边界、发布状态、workflow 和线上行为一致。

## 执行记录

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| 规格与任务 | 已完成 | 范围来自已批准 V5 路线、P6 控制流语义、P9 调试约束及当前 V3/V4 快照动画模式 |
| Python 语义依据 | 已明确 | 用户要求按 Python 语言特性实现；V5 不以项目负责人回答语义问答作为发布门槛 |
| T01–T04 实现 | 已完成 | 新增严格校验的分支/跳转/短路/迭代和失败过渡；更新讲解卡、中英文词条及双语指南 |
| 定向验证 | 已通过 | `teaching-animation.test.ts` 23 项通过；V5 新增/扩展真实 Worker 与 Pyodide 浏览器场景通过，覆盖矛盾迭代快照回退和中英文前跳/回边文案 |
| 全量应用验证 | 已通过 | 基于最新 `master` 重放后，`pnpm run test:ci` 通过：typecheck、177 项单测、生产构建及 Playwright 78/78（含 V6 回归） |
| 根目录验证 | 已通过 | 重放后 `pnpm test:catalog` 15/15 通过；`pnpm build:site` 成功；3D Objects 仍有既有大 chunk 提示，gzip bundle 检查通过 |
| 代码审查 | 已通过 | 独立审查发现两项 Required：前跳/回边共用文案、迭代器产值及推进状态未交叉校验；已补中英文与矛盾快照回归，并复审关闭，两项均无遗留 Required |
| 提交与合并 | 已完成 | V5 功能提交 `b8cb755` 与语义门槛文档提交 `eef9d18` 已快进合并至 `master` 并推送 |
| CI/CD | 已成功 | GitHub Actions [41167790066](https://github.com/wishflow/wishflow-tools/actions/runs/41167790066) 中应用测试、共享测试、GitHub Pages 和 Cloudflare Pages 均成功；Worker 部署按变更分类跳过 |
| 线上验收 | 已通过 | 2026-10-31 生产页：教学 VM 分支、while/for、and/or 短路结果为 `zero / 2 / 3 / False / value / True`，与固定 Pyodide CPython 输出一致；未触发 `tick()` 输出，`missing` 未报错。`items[3] = 9` 停在 `STORE_SUBSCR`，堆中列表仍为 `[1]`；真实 CPython 3.14.2 同段错误为 `IndexError`。 |

## 回滚

撤回 V5 控制流/失败过渡与新增说明，保留 V4 调用/返回动画、P6/P9 VM 行为和真实 CPython 视图。
