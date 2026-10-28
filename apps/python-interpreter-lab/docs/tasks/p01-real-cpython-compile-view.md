# P1 任务：真实 CPython 编译视图

对应规格：[P1 真实 CPython 编译视图](../specs/p01-real-cpython-compile-view.md)。按依赖顺序纵向交付；每项任务完成后运行其验证，P1 整体验收通过后再集成。

当前状态：T01–T05 的本地实现与验证已完成；catalog 和整站产物已生成。提交、合并、推送、GitHub Actions 状态确认及线上实测尚未完成，发布门仍待通过。

## T01：搭建独立前端应用

- 配置独立 React/TypeScript/Vite package、pnpm lockfile、可执行安装脚本和本地 build/typecheck/test 入口。
- 配置相对 `base: './'` 与 `dist/` 输出；安装仓库 site-shell，建立 `index.html` content slot 和双语消息注册。
- 首版仅单页工作区；设置符合规范的 `data-app`、`data-base`、`data-home-href`、双语标题。
- 验证：`pnpm run build`、子路径资源静态检查、语言切换与 keyboard smoke；site-shell import 在生产 bundle 中可用。

## T02：建立 Pyodide module Worker 与版本握手

- 新建 Vite module Worker；从固定的 `v314.0.7` CDN URL 导入 `pyodide.mjs`，初始化 runtime，给主线程发送实际 Pyodide/Python 版本。
- 主线程管理 Worker 生命周期、初始化错误、重试、终止和重建；所有消息携带 request/session ID。
- 验证：实际浏览器加载 Pyodide 和 WASM；模拟 CDN 加载失败后可重试；取消运行时加载后可建立新 Worker。

## T03：实现 AST、code object 和反汇编分析

- Worker 内调用 `ast.parse`、`compile`、`types.CodeType` 和 `dis.get_instructions`；不调用 `exec`、`eval` 或执行用户输入。
- 输出受限、可传输的 AST/代码对象/指令 DTO；实现 20,000 字符、5,000 AST 节点、深度 100、200 个代码对象、总计 50,000 条指令及每个对象 20,000 条指令的边界。
- 将 Python 错误转换为结构化诊断；成功结果绑定 requestId、Worker sessionId 与运行时版本。
- 验证：真实固定版本编译常量折叠、函数嵌套 code object、语法错误与编译错误；serializer 不泄漏 Python proxy。

## T04：交付双语编译工作区

- 提供源码 textarea/样例恢复、分析/取消、运行时状态、可展开 AST、code object 选择器、字节码表和错误反馈。
- 源码修改清除当前结果；切换 code object 只切换展示；React 文案订阅共享语言状态。
- 实现桌面双栏/窄屏单栏、面板自身滚动、可见焦点、键盘可操作和减少动态效果。
- 验证：桌面及窄屏、中文与英文、键盘只读操作；页面和源码内容无不必要的横向溢出。

## T05：测试、CI 集成和 catalog 登记

- 增加针对真实运行时分析/序列化边界的单元测试，以及基于生产构建的 Playwright 浏览器流程。
- `test:ci` 覆盖类型检查、构建、静态子路径验证、单元测试和浏览器测试；浏览器通过 Vite/Node 静态服务器挂载 `/python-interpreter-lab/` 前缀。
- catalog 加入双语标题、简介及图标；确认现有站点 change classifier 自动把本应用源码列入测试矩阵并触发静态站部署。
- 验证：应用 `pnpm run test:ci`、根 `pnpm run test:catalog`、根 `pnpm run build:site`；检查完整 `_site/python-interpreter-lab/` 输出。
- 发布门：完成本地验证后按用户要求提交、合并 `master`、push；使用可用 GitHub CLI 查询 workflow 结果，workflow 通过后从线上应用路径运行同一组代表性编译案例。无法检查的 CI 状态或线上场景如实记录，不视为已完成。

## 本地验证记录

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| T01 独立应用与共享壳 | 通过 | `build` 与 `test:ci`；site-shell 的中英文切换同步更新应用文案 |
| T02 固定 Pyodide module Worker | 通过 | Chrome 实测 Pyodide 314.0.7 / CPython 3.14.2；CDN 请求失败后可重试 |
| T03 真实 AST、代码对象与 `dis` | 通过 | `LOAD_SMALL_INT 3`、嵌套函数 `BINARY_OP`、语法/编译诊断、超限提示均来自实际运行时用例 |
| T04 工作区与交互 | 通过 | AST 可展开；键盘焦点可达；共享语言切换有效；320/768/1024/1440px 无横向溢出 |
| T05 catalog、CI 与整站产物 | 通过 | 应用 6 条单测 + 5 条 E2E；根 catalog 14 条检查；`build:site` 生成完整应用目录 |
| 部署与线上实测 | 待完成 | 需先提交、合并和推送，再依据 CI 结果及公开站点验证更新 |
