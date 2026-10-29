# Python 解释器实验室

在浏览器中切换两种独立执行视图：查看固定版本真实 CPython 的编译结果和运行轨迹，或逐步运行一个明确限定语法的教学 VM。

| 执行视图 | 可观察内容 | 执行语义 |
| --- | --- | --- |
| 真实 CPython | AST、Tokens、代码对象、真实字节码、行级执行轨迹、变量快照和输出 | 使用 Pyodide 内固定版本 CPython；轨迹是执行后回放，不提供真实 CPython 内部值栈或实时单步 |
| 教学 VM | `mini-vm-v1` AST、教学指令、值栈、变量、输出和有界历史 | 只支持已列出的 Python 子集；单步和运行推进 TypeScript 教学 VM，不执行 Python，也不代表 CPython 内部状态 |

教学 VM v1 支持顶层赋值、`print`、整数和字符串，以及 `+`、`-`、`*` 和一元负号；控制流、函数、容器等范围见[阶段规格](docs/specs/p05-minimal-teaching-vm.md)。架构路线与发布状态见[整体实施计划](docs/implementation-plan.md)。

## 本地运行

从仓库根目录执行：

```bash
cd apps/python-interpreter-lab
pnpm install --frozen-lockfile
pnpm run dev
```

真实 CPython 视图通过固定版本 Pyodide `314.0.7` 及其 WASM 运行时运行，首次使用需要浏览器网络访问。两种引擎各自在浏览器 module Web Worker 中执行，源码不会上传到执行服务。用户主动运行的真实 Python 仍可能访问浏览器 API 和网络；Web Worker 不构成恶意代码安全沙箱。教学 VM 只执行其自身限定的 TypeScript 语义，不调用 Python 或浏览器 API。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm run dev` | 启动 Vite 开发服务器 |
| `pnpm run typecheck` | 运行 TypeScript 类型检查 |
| `pnpm run test:unit` | 运行纯 TypeScript 单元测试 |
| `pnpm run test:e2e` | 运行 Playwright 浏览器测试 |
| `pnpm run build` | 先做类型检查，再构建到 `dist/` |
| `pnpm run test:ci` | 运行类型检查、单测、构建和浏览器测试 |

## 架构与文档

React + TypeScript + Vite 页面通过共享 `@wishflow/site-shell` 展示。主线程管理编辑和界面；Pyodide Worker 负责真实 CPython，独立的教学 VM Worker 负责 `mini-vm-v1`。两个引擎只共享源码编辑和必要的展示交互，不混用编译结果、指令或运行状态。

- [协作约束](AGENTS.md)：前端、站点壳、语言、验证和文档规则。
- [ADR-0001](docs/adr/0001-browser-python-visualizer.md)：引擎路线与架构取舍。
- [整体实施计划](docs/implementation-plan.md)：阶段依赖、验收与发布状态。
- [站点外壳契约](../../packages/site-shell/README.md)：公共页面与语言接口。
