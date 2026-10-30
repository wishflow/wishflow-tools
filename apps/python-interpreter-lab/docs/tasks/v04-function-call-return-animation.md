# V4 Tasks：函数调用、参数与返回的连续解释

依据：[V4 规格](../specs/v04-function-call-return-animation.md)及[执行可视化体验计划](../visual-execution-plan.md#v4函数调用参数与返回的连续解释)。保留 P7 教学 VM 与 V3 快照动画语义；本阶段只增加教学解释。

## 实施顺序

- [x] **T01：从真实帧变化派生调用、返回与调用失败事件**
  - 验收：连续的 `CALL_FUNCTION` 入帧映射、参数、frame ID 和续行；`RETURN_VALUE`/`RETURN_NONE` 退帧只向 caller 栈追加真实返回值；调用失败无成功入帧事件；递归帧不按名称合并。
  - 验证：先写失败单测，覆盖空参/多参、标量与容器别名参数、显式/隐式/None 返回、递归、多次相同返回值、不连续历史、参数错误、帧/名称预算错误及运行错误前已有成功过渡。
  - 文件：`src/teaching-vm/animation.ts`、`tests/teaching-animation.test.ts`。

- [x] **T02：讲解播放中呈现参数传递和帧进出**
  - 验收：讲解卡显示 caller/callee ID、函数名、调用位置、参数绑定或返回目标；活动帧、值栈与变量区域仍由同一实际快照驱动；对象参数/返回显示稳定 ID；后续变量绑定仍由 `STORE_NAME` 单独说明。
  - 验证：React 页面断言调用前后与返回前后的内容和快照一致；双语；键盘可读；减少动态效果保留相同说明；窄屏不横向溢出。
  - 文件：`src/components/TeachingAnimationPanel.tsx`、`src/components/TeachingVmPanel.tsx`、`src/locales.ts`、`src/styles.css`。

- [x] **T03：生产 Worker 端到端覆盖步进、递归与失败路径**
  - 验收：真实 Worker 播放普通/嵌套调用、递归入帧与逐层返回；Step Into/Over/Out、函数内暂停、历史只读和 Reset 与 P9 语义一致；参数/帧预算错误不出现成功入帧动画。
  - 验证：Playwright 覆盖 `bump(xs)`、`fact(3)`、裸与隐式 None、错误、历史、双语和已存在的 V3 别名动画回归。
  - 文件：`e2e/teaching-animation.spec.ts`，按测试结果最小修改相关动画代码。

- [x] **T04：中英文说明与路线状态**
  - 验收：帮助页说明真实调用/参数传递/返回值动画，明确教学帧与 CPython 帧的边界；V4 状态和验收证据准确。
  - 验证：中英文术语一致、相对链接有效、`git diff --check`；Markdown 成品复制到 `/tmp/var/wishflow-tools/`。
  - 文件：`docs/guide/usage.zh-CN.md`、`docs/guide/usage.en.md`、`docs/visual-execution-plan.md`、本 tasks。

- [x] **T05：整体验证、审查、提交、发布与线上实测**
  - 验收：应用 CI、catalog、整站构建及代码审查通过；提交并快进合并到 `master`，推送后相关 Actions 成功；线上 Teaching VM 函数动画和真实 CPython 视图均实测通过。
  - 验证：应用 `CI=1 PLAYWRIGHT_PORT=43871 pnpm run test:ci`（166 条单测、68 条 Playwright、类型检查和生产构建）、根 `pnpm test:catalog`（15 项）、`pnpm build:site`、`git diff --check` 均通过；代码审查无阻塞项。提交 `42c5789` 已快进合并并推送至 `master`；[GitHub Actions 41104135193](https://github.com/wishflow/wishflow-tools/actions/runs/41104135193) 的测试与 GitHub Pages、Cloudflare Pages 部署成功。通过 Codex 内置浏览器实测：Teaching VM 的 `bump(items)` 讲解播放完成，历史显示进入帧 #1、`CALL_FUNCTION`、`RETURN_VALUE` 和从帧 #1 返回，结果为 `9`；真实 CPython 为同一源码生成 AST、两个代码对象和 26 条字节码指令，运行轨迹记录 9 个事件且最终输出为 `9`。
  - 文件：依验证结果涉及的实现/测试/文档文件。

## 检查点

- **检查点 A（T01）**：每个调用/返回动画都有真实指令和相邻 Worker 快照佐证；递归身份稳定；没有失败后伪造的新帧。
- **检查点 B（T02–T03）**：调用方/被调方的可视位置变化与 Worker 帧历史完全同步；暂停、历史、错误与重置没有过期画面。
- **检查点 C（T04–T05）**：帮助、路线、测试、生产 UI、教学指令版本和双引擎说明一致；完成部署后再标记 V4 已发布。

## 执行记录

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| Spec 与 tasks | 已完成 | 从已批准 V4 路线细化调用/返回帧不变量、真实快照要求、错误边界及验收案例 |
| 实现 | 已完成 | T01 派生真实调用/返回/拒绝事件，并在 12 条上限内优先保留帧边界；T02 展示帧路线、调用位置、返回续行、参数/实际返回值与栈/变量高亮；T03 新增真实 Worker 用例覆盖 `bump(xs)`、`fact(3)`、NameError 无帧和中文文案。 |
| 定向验证 | 已完成 | `tests/teaching-animation.test.ts` 13 条通过；定向 Playwright 验证函数别名与标量返回、递归 3 次调用/返回、失败无新帧和中英文说明通过。 |
| 本地全量验证 | 已完成 | 应用 `test:ci`（166 条单测、68 条 Playwright、类型检查和生产构建）、`pnpm test:catalog`（15 项）、`pnpm build:site`、`git diff --check` 均通过；代码审查无阻塞项。 |
| 提交与合并 | 已完成 | `42c5789 feat(python-lab): animate function calls and returns` 已快进合并至 `master` 并推送至 `origin/master`。 |
| CI/CD | 已完成 | [GitHub Actions 41104135193](https://github.com/wishflow/wishflow-tools/actions/runs/41104135193) 全部必需检查成功；GitHub Pages 和 Cloudflare Pages 部署成功，Worker 按变更范围跳过。 |
| 线上验收 | 已完成 | 公开 Python 解释器实验室页面实测 Teaching VM 调用/返回动画及最终输出 `9`，并切换至真实 CPython 验证 AST、字节码和执行轨迹输出 `9`。 |

## 回滚

移除 V4 调用/返回事件及其讲解视图，保留 V3 数据动作动画、静态帧快照和 P7/P9 VM 行为；不回滚函数语义、Worker 协议或指令集版本。
