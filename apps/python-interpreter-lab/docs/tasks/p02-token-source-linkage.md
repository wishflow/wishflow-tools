# P2 任务：真实 Token 与源码联动

对应规格：[P2 真实 Token 与源码联动](../specs/p02-token-source-linkage.md)。P1 已发布并通过线上验收；本阶段只扩展真实编译视图，不开始 P3 执行轨迹。

## T01：Pyodide Worker 返回受限 Token DTO

- 按 spec §2–3 使用固定 CPython `tokenize.generate_tokens()`，仅在 `ast.parse()` 成功后生成 Token。
- 序列化 `type`、`exactType`、短文本、文本截断状态和原始码点起止位置；增加 5,000 项上限及 Tokenizer 局部错误字段。
- 保持用户源码不执行，复用 request/session ID 及现有源码上限。
- 验证：实际 Pyodide Token API 输出 `OP/PLUS`、`NAME`、`STRING`、注释、`INDENT/DEDENT`；语法错误不调用 tokenizer；超限标志及长 Token 截断正确。

## T02：实现源码位置索引与多源范围映射

- 新增纯 TypeScript 位置工具，将 tokenizer 码点列、AST/bytecode UTF-8 字节列映射到 textarea UTF-16 偏移；使用预计算边界，拒绝无效或非边界偏移。
- 定义半开区间及交集函数；统一 token、AST 节点、指令和编辑器选区的数据范围。
- 验证：ASCII、中文、emoji、Tab、多行和 CRLF；测试半开区间相邻不误判、无位置/零宽 Token 返回无范围。

## T03：交付 Token 面板及联动交互

- 增加双语 Token 表，默认折叠，显示类型、精确运算符类型、文本、起止位置及截断/局部错误状态。
- 将当前源码选择状态提升到工作区，使 textarea、Token、AST 和当前代码对象的字节码共享映射；范围缺失或源码变更时清理高亮。
- 为 Token、AST 节点和字节码项提供键盘可达的定位操作；定位源码时选中 textarea 中实际范围，并防止程序化选择回调覆盖联动来源。
- 验证：所有方向双向定位、多重映射、无匹配注释/空白、代码对象切换、中英文、键盘及窄屏布局。

## T04：完整验证与发布

- 增加位置转换单测和生产构建 Playwright 流程，覆盖 tokenize 结果、Unicode 偏移、范围联动、语法错误、截断和响应式布局。
- 运行应用 `pnpm run test:ci`、根 `pnpm run test:catalog`、根 `pnpm run build:site`，检查 `/python-interpreter-lab/` 子路径产物。
- 文档至少运行 `git diff --check` 与相对链接检查，并按根规则复制 Markdown 成品。
- 按用户已授权的流程提交、合并 `master`、推送；使用 `gh` 等待 CI/CD 成功，之后从线上 URL 实测 Token、中文/emoji 位置和双向联动。
- 发布证据和任何仍未覆盖的边界回填本文件；未通过线上 gate 不标记 P2 完成。

## 依赖关系

```text
T01 ──┐
      ├──> T03 ──> T04
T02 ──┘
```

## 本地验证记录

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| T01 Worker Token DTO | 待验证 | 实现后记录 Pyodide 真实调用与上限案例 |
| T02 源码位置索引 | 待验证 | 实现后记录单测与 Unicode/多行映射结果 |
| T03 面板和联动 | 待验证 | 实现后记录 Playwright 操作及无匹配边界 |
| T04 CI、部署与线上实测 | 待验证 | P2 开发期间更新；未完成前发布门保持关闭 |
