# V5 Tasks：控制流与既有运行错误的连续解释

依据：[V5 规格](../specs/v05-control-flow-explanations.md)及[执行可视化体验计划](../visual-execution-plan.md#v5控制流与既有运行错误)。本阶段只解释 Teaching VM 已记录的控制流和运行诊断，不更改执行语义。

## 前置

- 核对 V4 的 `bump(xs)` 与 `fact(3)` 两个核心场景理解检查。规格记录当前状态为“仓库暂无用户理解结果”；未有证据前不得将其写为已通过。
- 代码从 `master` 最新提交创建独立分支；不在旧 V4 分支上继续开发。

### 理解检查执行卡

在生产页面运行[设计说明中的 `bump(xs)` 示例](../design/visual-execution-experience.md#83-函数引用跨帧共享返回值进入调用者)，并编译、播放 `fact(3)`。先让体验者自行检查界面，不提示预期答案，再询问：

| 场景 | 问题 | 通过标准 |
| --- | --- | --- |
| `bump(xs)` | 函数里的 `xs` 与调用者的 `a` 指向什么？修改 `xs[0]` 后，调用者会看到什么？ | 能指出两者共享同一列表对象，元素变更通过别名可见；不是复制参数。 |
| `bump(xs)` | 函数返回的 `2` 先到哪里？`n` 何时绑定？ | 能区分返回值先进入调用者操作数栈，再由后续指令绑定到 `n`。 |
| `fact(3)` | 多个 `fact` 调用为什么不会覆盖彼此的 `n`？ | 能指出递归调用有各自帧 ID 和局部状态。 |
| `fact(3)` | 递归返回时先恢复哪一层？每层返回后如何继续？ | 能描述按后进先出恢复调用帧，并沿各自返回位置继续。 |

单个体验者能独立回答全部问题，只能记录为一次初步理解核对，不代表 3–5 位目标用户观察已完成。记录日期、页面版本、两段代码的实际观察结果和误解点；不要记录未经同意的身份信息。任何问题未答对、未执行或结果不明，均保持“待确认”，不以自动化测试或开发者自评代替体验者反馈。

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

- [ ] **T05：全量验证、审查、提交、发布与线上实测**
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
| 规格与任务 | 草案已创建 | 范围来自已批准 V5 路线、P6 控制流语义、P9 调试约束及当前 V3/V4 快照动画模式 |
| V4 理解检查 | 待确认 | V5 规格列出两个前置场景；仓库无用户理解反馈记录，自动化和线上技术验证不替代理解验证 |
| T01–T04 实现 | 已完成 | 新增严格校验的分支/跳转/短路/迭代和失败过渡；更新讲解卡、中英文词条及双语指南 |
| 定向验证 | 已通过 | `teaching-animation.test.ts` 23 项通过；V5 新增/扩展真实 Worker 与 Pyodide 浏览器场景通过，覆盖矛盾迭代快照回退和中英文前跳/回边文案 |
| 全量应用验证 | 已通过 | 最终 `pnpm run test:ci` 完整通过：typecheck、176 项单测、生产构建及 Playwright 75/75。此前一次 E2E 出现既有 Pyodide 下载告警超时；单项复测和之后两次完整 E2E 均通过 |
| 根目录验证 | 已通过 | `pnpm test:catalog` 15/15 通过；`pnpm build:site` 成功；3D Objects 仍有既有大 chunk 提示，gzip bundle 检查通过；`git diff --check` 通过 |
| 代码审查 | 已通过 | 独立审查发现两项 Required：前跳/回边共用文案、迭代器产值及推进状态未交叉校验；已补中英文与矛盾快照回归，并复审关闭，两项均无遗留 Required |
| 提交与合并 | 功能分支已提交并重放 | `codex/python-lab-v5-control-flow` 已基于 `master` `7fed2e8`；尚未合入主分支，等待 V4 理解检查结果 |
| CI/CD | 未开始 | — |
| 线上验收 | 未开始 | — |

## 回滚

撤回 V5 控制流/失败过渡与新增说明，保留 V4 调用/返回动画、P6/P9 VM 行为和真实 CPython 视图。
