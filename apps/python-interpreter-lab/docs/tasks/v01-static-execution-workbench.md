# V1 Tasks：静态执行工作台

依据：[V1 规格](../specs/v01-static-execution-workbench.md)及[体验实施计划 V1](../visual-execution-plan.md#v1静态执行现场与默认教学入口)。按独立、可验证的 UI 切片实施；不提前加入 V2 变化说明或动画。

## 实施顺序

- [x] **T01：锁定默认引擎与信息层级回归**
  - 验收：Playwright 覆盖首次打开默认教学 VM、未自动编译，以及切换到真实 CPython 后原分析/运行入口仍可用。
  - 验证：先运行新增用例确认旧默认行为下失败，再实现最小改动并运行该用例。
  - 文件：`apps/python-interpreter-lab/e2e/teaching-vm.spec.ts`、`src/App.tsx`。

- [x] **T02：重组静态运行现场**
  - 验收：运行现场先于编译细节；活动帧、各帧操作数栈、变量、对象堆、输出及历史使用当前快照；堆对象编号与容器引用一致；栈顶明确。
  - 验证：增加浏览器断言覆盖 `a/b` 别名、函数参数共享、帧检查不改变执行状态，并跑现有单测与调试浏览器用例。
  - 文件：`src/components/TeachingVmPanel.tsx`、`src/components/TeachingHeapPanel.tsx`、`src/styles.css`、`e2e/teaching-vm.spec.ts`。

- [x] **T03：将 AST 与完整教学指令设为按需面板**
  - 验收：两个面板初始折叠；键盘可展开；展开/收起不发执行操作；已存在的断点、源码联动、当前/下一/失败指令状态仍有效。
  - 验证：浏览器测试检查初始折叠、键盘展开、行断点及指令断点；相关旧测试全部通过。
  - 文件：`src/components/TeachingVmPanel.tsx`、`src/styles.css`、`e2e/teaching-vm.spec.ts`、必要的双语消息。

- [x] **T04：同步双语使用说明与阶段状态**
  - 验收：快速开始说明默认教学入口；描述新的静态帧/栈/绑定/堆分区；CPython 入口和既有操作说明准确；V1 状态按实际验证更新。
  - 验证：检查中英文一致、相对链接有效、未把 V2 能力写成已交付；运行 `git diff --check`。
  - 文件：`docs/guide/usage.zh-CN.md`、`docs/guide/usage.en.md`、`docs/visual-execution-plan.md`、本 tasks。

- [ ] **T05：完整本地站点、浏览器与线上验收**
  - 验收：320/768/1024/1440px 无整页横向溢出；键盘、中英切换、减少动态效果与真实 CPython 切换正常；应用及站点构建通过。
  - 验证：应用 typecheck、单测、build、Playwright；`pnpm test:catalog`、`pnpm build:site`；提交后等待 CI/CD 成功，再用 Codex 内置浏览器检查生产站点教学默认入口及 CPython 路径。
  - 文件：`e2e/teaching-vm.spec.ts`、按验证发现的必要修复文件。

## 检查点

- **检查点 A（T01–T02）**：默认入口和运行现场通过独立行为测试；已有 P8/P9 语义未改变。
- **检查点 B（T03–T05）**：编译材料、双语帮助、响应式、CI/CD 与生产页面全部与交付一致。

## 执行记录

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| 实现完成 | 已完成 | 默认入口、静态执行现场、按需编译详情及双语指南已实现 |
| 本地验证 | 已完成 | typecheck、135 条单测、应用 build、50 条 Playwright、15 条 catalog 测试、`pnpm build:site` 均通过；减少动态效果断言通过。临时移除移动端列断点时，320px 回归用例按预期失败（页面宽 614px）；恢复后该用例通过 |
| CI/CD | 待推送触发 | — |
| 线上验收 | 待 CI/CD 成功 | — |

## 回滚

回滚 V1 对应实现提交，恢复原默认引擎和教学面板顺序，并同步恢复 V0 指南中与 UI 有关的内容；保留 P1–P9 与 V0 功能。
