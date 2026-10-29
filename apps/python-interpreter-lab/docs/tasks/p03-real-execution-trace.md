# P3 任务：真实执行、轨迹与回放

对应规格：[P3 真实执行、轨迹与回放](../specs/p03-real-execution-trace.md)。依赖 P1 已发布的 Pyodide Worker 与 P2 的源码位置联动；本阶段不开始 P4 结构化变量历史，也不引入新运行时依赖。

## T01：增加受限的 CPython 执行与 trace 消息

- **规格**：§1–4。
- **前置**：无；沿用当前 Pyodide runtime 314.0.7。
- **改动边界**：Worker request/response 类型、同一 module Worker 中的 `compile`/`exec`/`sys.settrace`、stdout/stderr 捕获、分批 DTO、资源限额。Python trace 只记录 `<input>` 用户帧，不执行 `repr`/`str` 查看任意对象。
- **验收**：全局变量可由函数读取；call/line/exception/return 事件类型与行号来自 CPython；捕获 stdout/stderr 和未捕获异常；会话/run 身份贯穿批次；finally 恢复 Worker 内 trace 与标准流。
- **验证**：后续 T02 接入运行控件后用固定 Pyodide 的真实浏览器测试覆盖；类型检查同时验证 Worker union 穷尽处理。
- **文件**：`src/analysis/types.ts`、`src/worker/pyodide.worker.ts`。

## T02：完成执行会话、停止与恢复

- **规格**：§2、§4、§6。
- **前置**：T01。
- **改动边界**：运行状态、增量批次累积、5 秒主线程 timer、手动停止、worker-error、Retry runtime 和源码编辑失效；不得将停止执行和回放暂停复用为同一状态。
- **验收**：Run 只在显式点击后执行；手动 Stop 立即让主线程保持可操作并留下不完整记录；超时终止 Worker；Retry 后新运行成功；源码编辑及旧 session/run 响应不会留下或覆盖旧映射/输出。
- **验证**：Playwright 用真实死循环进行手动停止/Retry；超时用例等待 5 秒并确认主线程可操作；捕获网络/控制台错误。
- **文件**：`src/analysis/usePyodideAnalysis.ts`、`src/App.tsx`、`src/components/SourcePanel.tsx`、`src/locales.ts`、`e2e/execution-trace.spec.ts`。

## T03：展示事件游标、调用状态与回放

- **规格**：§2、§3、§5–6。
- **前置**：T01、T02。
- **改动边界**：一个独立执行面板；按选中事件显示快照与对应 stdout/stderr 前缀；添加可访问的游标/播放控件、调速与显式源码定位；不构造逐指令值栈，不在回放中运行 Python。
- **验收**：同一循环行可逐事件浏览；函数调用路径与有限局部值正确；按事件显示输出不重复；捕获与未捕获异常区分正确；调速/上一条/下一条/末条/滑块都能操作；源码定位与 P2 映射一致。
- **验证**：Playwright 核对回放前后输出不变、事件语义标签、键盘操作、选中事件源码行及 320/768/1024/1440px 布局；单测核对 Unicode 码点输出 offset 到 textarea UTF-16 切片的转换。
- **文件**：`src/analysis/source-position.ts`、`src/analysis/execution-trace.ts`、`src/components/ExecutionPanel.tsx`、`src/components/ResultsPanel.tsx`、`tests/execution-trace.test.ts`、`e2e/execution-trace.spec.ts`。

## T04：安全文案、集成回归与发布

- **规格**：§5–7。
- **前置**：T01–T03。
- **改动边界**：中英文安全提示、P3 状态文案和整体计划的阶段结果；无关的共享壳、CI 或 Worker 配置不调整。
- **验收**：旧 P1/P2 分析能力无回归；执行安全提示准确说明应用行为和用户代码 Web API/网络边界；所有运行状态与截断提示可理解；构建和线上路径验证通过。
- **验证**：`pnpm run test:ci`、根 `pnpm run test:catalog`、根 `pnpm run build:site`、`git diff --check`、相对链接和 Markdown 副本核验；合并推送后等待 GH workflow 成功，再在线上实际 Run 并回放。
- **文件**：`src/locales.ts`、`src/styles.css`、`docs/implementation-plan.md`、本文件及新增/修改的 P3 spec。

## 依赖关系与检查点

```text
T01 Worker 执行协议
  └── T02 会话与停止
        └── T03 时间线和回放
              └── T04 回归、发布与线上验收
```

- **检查点 A（T01–T02）**：固定 Pyodide 能运行用户源码、分批发送轨迹和输出；死循环停止可终止 Worker；旧结果不能串入新 run。
- **检查点 B（T03）**：实际轨迹可逐事件回放，快照与标准输出对应到正确事件点；回放不重复执行代码。
- **完成门（T04）**：本地应用/根目录验证、部署 workflow 和线上实际运行/停止/回放均通过后，才将 P3 标为完成并开始 P4。

## 执行记录

| 任务 | 状态 | 验证与证据 |
| --- | --- | --- |
| T01 Worker 执行协议 | 本地完成 | 固定 Pyodide 314.0.7 / CPython 3.14.2 浏览器用例验证模块全局读取（输出 `12`）、真实 `call`/`line`/`exception`/`return` 事件、捕获/未捕获异常、stdout、事件批次及大整数/长标签限长。应用完整 Playwright 通过 15/15。 |
| T02 会话与停止 | 本地完成 | Playwright 用死循环验证手动 Stop、5 秒超时、重建 Worker 后 Retry；编辑运行中源码后旧轨迹清除，下一次执行只显示新源码结果。超时、停止及 Worker 故障的状态与不完整记录分开处理。 |
| T03 时间线与回放 | 本地完成 | Playwright 验证循环同一行出现 3 次、函数调用路径、源码行定位、捕获异常事件、播放前后输出不重复、键盘游标和四种视口；单测验证 emoji/中文输出偏移映射与源码行切片。 |
| T04 回归与发布 | 本地验证通过，待线上验收 | 应用 `pnpm run test:ci`：13/13 单测、15/15 Playwright；根 `pnpm run test:catalog`：14/14；`pnpm run build:site` 成功。临时将事件数比较从 `>= 5,000` 改为 `> 5,000` 后，限额用例按预期失败并显示 5,001 项；恢复实现后完整应用 CI 通过。`git diff --check` 与 3 份文档相对链接检查通过；Markdown 已复制到 `/tmp/var/wishflow-tools/` 并逐文件 `cmp` 一致。提交合并后的 GitHub workflow 成功后，再在线上验证运行、停止和回放并记录完成。 |
