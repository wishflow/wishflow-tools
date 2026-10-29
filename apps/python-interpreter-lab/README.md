# Python 解释器实验室

在浏览器中查看固定版本 CPython 生成的 AST、代码对象、Tokens 和字节码，并运行 Python 后回放真实行级执行轨迹。真实视图不提供 CPython 内部值栈或实时单步；后续教学 VM 路线见[整体实施计划](docs/implementation-plan.md)。

## 本地运行

从仓库根目录执行：

```bash
cd apps/python-interpreter-lab
pnpm install --frozen-lockfile
pnpm run dev
```

Pyodide `314.0.7` 及其 WASM 运行时从固定版本 CDN 加载，首次使用需要浏览器网络访问。应用代码在浏览器的 module Web Worker 中执行；应用不会把源码上传到执行服务，但用户主动运行的 Python 可以访问浏览器 API 和网络，Worker 不构成恶意代码安全沙箱。

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

React + TypeScript + Vite 页面通过共享 `@wishflow/site-shell` 展示。主线程管理编辑和界面；Pyodide Worker 执行固定版本 CPython 的编译、分析和用户明确触发的运行。CPython 轨迹用于记录后回放；逐指令状态属于后续教学 VM 的范围。

- [协作约束](AGENTS.md)：前端、站点壳、语言、验证和文档规则。
- [ADR-0001](docs/adr/0001-browser-python-visualizer.md)：引擎路线与架构取舍。
- [整体实施计划](docs/implementation-plan.md)：阶段依赖、验收与发布状态。
- [站点外壳契约](../../packages/site-shell/README.md)：公共页面与语言接口。
