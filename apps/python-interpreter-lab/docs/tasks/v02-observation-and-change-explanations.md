# V2 Tasks：统一观察位置、源码步进分组与变化说明

依据：[V2 规格](../specs/v02-observation-and-change-explanations.md)及[体验实施计划 V2](../visual-execution-plan.md#v2统一观察位置语句分组与变化说明)。阶段改动限于从有界教学历史派生观察分组/变化摘要及其界面；不改 VM/Worker 执行语义。

## 实施顺序

- [x] **T01：实现纯历史分组与停止状态分类**
  - 验收：按 Step Over 的帧 ID/源码行边界分组；覆盖同一行多指令、调用与返回、Step Into 部分组、循环重复行、递归、断点前暂停、失败、结束及历史截断。
  - 验证：新增纯函数单测；不调用 Worker，不改输入历史；对超过 500 条快照的历史保持有界处理。
  - 文件：`src/teaching-vm/observation.ts`、`tests/teaching-observation.test.ts`。

- [x] **T02：实现基于前后快照的净变化摘要**
  - 验收：按帧 ID/变量名区分绑定，按 `objectId` 区分对象身份；识别别名、等值新对象、列表/字典原位修改、帧进入/返回、输出增量；无前态时拒绝推断。
  - 验证：纯函数单测分别覆盖相同标量、别名、新对象、原位修改、递归帧和缺少前态；变更摘要最多 6 条并报告剩余数量。
  - 文件：`src/teaching-vm/observation.ts`、`tests/teaching-observation.test.ts`、按需要的类型定义。

- [ ] **T03：将 UI 观察导航改为源码步进组**
  - 验收：步进历史滑块按组定位；各运行现场面板共享组/指令所选快照；可展开某组查看已记录指令并通过键盘选择指令快照；显示本步一句话、净变化和真实停止原因；历史中运行先回执行头。
  - 验证：Playwright 覆盖绑定/别名/对象修改、breakpoint、Step Into/Over、历史切换、指令展开、Return to head、Reset/编辑后的状态清理及响应式。
  - 文件：`src/components/TeachingVmPanel.tsx`、必要的 `src/App.tsx` 传参、`src/locales.ts`、`src/styles.css`、相关 `e2e/*.spec.ts`。

- [ ] **T04：同步双语使用说明与路线状态**
  - 验收：帮助页准确说明按源码步进浏览、展开单步、净变化、历史截断与回到执行头；不把 V3–V6 写成现有能力；路线和本 tasks 记录实际验证。
  - 验证：中英文术语一致、相对链接有效、`git diff --check`。
  - 文件：`docs/guide/usage.zh-CN.md`、`docs/guide/usage.en.md`、`docs/visual-execution-plan.md`、本 tasks。

- [ ] **T05：完整回归与线上验收**
  - 验收：规格所列单测、浏览器、构建、catalog、整站构建与生产站点检查全部通过；如线上发现缺陷，记录具体复现并作为下一轮修复范围。
  - 验证：应用 typecheck、单测、build、Playwright；`pnpm test:catalog`、`pnpm build:site`；通过后提交，合并到 `master`、推送、等待 CI/CD，并用 Codex 内置浏览器在线实测。
  - 文件：依验证结果所需的相关 UI/测试文件。

## 检查点

- **检查点 A（T01–T02）**：分组与变化摘要是纯派生数据；对断点、失败、截断、相同值/对象身份有独立预期。
- **检查点 B（T03–T05）**：UI 只消费单一观察快照；P9 控制语义与两种引擎未回归；帮助、CI/CD 和生产页面与规格一致。

## 执行记录

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| Spec 与 tasks | 已完成 | 已依据 V2 计划细化分组边界、结构差异、无前态及历史控制；实现边界不含 Worker/VM 协议变更 |
| 实现 | 进行中 | T01/T02 已完成；观察分组、截断/断点/失败分类及绑定、对象、帧、输出差异均从有界历史派生；未改 VM/Worker 协议 |
| 本地验证 | 进行中 | `pnpm typecheck` 通过；`pnpm test:unit` 152/152 通过；新增观察 helper 单测 17/17 通过 |
| CI/CD | 待推送触发 | — |
| 线上验收 | 待 CI/CD 成功 | — |

## 回滚

撤回 V2 的分组导航、差异摘要及展示层 helper，回到 V1 逐指令历史观察；保留既有教学 VM 的运行和历史语义。
