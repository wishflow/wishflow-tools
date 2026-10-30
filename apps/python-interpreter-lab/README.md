# Python 解释器实验室

在浏览器中切换两种独立执行视图：查看固定版本真实 CPython 的编译结果和运行轨迹，或逐步运行一个明确限定语法的教学 VM。教学 VM 已支持列表、字典、对象引用和源码级调试控制；P8 发布记录见 [P8 tasks](docs/tasks/p08-mutable-containers.md)，P9 调试控制的发布状态与线上验收见 [P9 tasks](docs/tasks/p09-teaching-debugger.md)。

使用说明：[中文](docs/guide/usage.zh-CN.md) · [English](docs/guide/usage.en.md)。正文适用于当前界面；V0 根据两份正文生成静态帮助页，并在实验室内提供新标签入口，发布与线上验收状态见[体验实施计划](docs/visual-execution-plan.md)。

| 执行视图 | 可观察内容 | 执行语义 |
| --- | --- | --- |
| 真实 CPython | AST、Tokens、代码对象、真实字节码、行级执行轨迹、变量快照和输出 | 使用 Pyodide 内固定版本 CPython；轨迹是执行后回放，不提供真实 CPython 内部值栈或实时单步 |
| 教学 VM | `mini-vm-v5` AST、教学指令、值栈、模块/函数帧、变量、可变列表/字典、对象图、输出和有界历史 | 支持表达式、布尔/比较/短路、条件/循环、模块级函数、必需位置参数、递归和 `return`，以及列表/字典字面量、下标读写、别名、结构相等和循环安全打印；单步和运行推进 TypeScript 教学 VM，不执行 Python，也不代表 CPython 内部状态 |

教学 VM v5 延续 P5/P6 的标量表达式与控制流、P7 函数帧，并增加 P8 可变容器和 P9 调试控制。列表支持字面量、正/负/布尔下标读写和别名；字典支持字面量、整数/布尔/字符串/`None` 键以及读取和更新；列表与字典支持结构相等，打印循环对象时使用有界递归标记。调用前先解析函数名，再从左到右求值实参，因此未定义的函数名会在实参副作用发生前报告 `NameError`。可设置源码行和教学指令断点，并使用单指令 Step、Into、Over、Out、Continue、Pause、Reset 和慢/标准/快三档自动运行。Step Line 与 Step Over 合并；查看历史后 Continue 会回到真实执行头，Reset 保留当前断点，编辑或重新编译会清除断点。对象身份通过教学 VM 的 ID 与对象图观察，不代表 CPython 地址。活动帧上限为 64（含模块帧），单次运行最多执行 5,000 条动态教学指令；函数不支持默认参数、关键字参数、闭包、`global`/`nonlocal` 或作为普通值传递。容器不支持切片、方法、推导式或一般迭代。完整语义和限制见 [P5 规格](docs/specs/p05-minimal-teaching-vm.md)、[P6 规格](docs/specs/p06-control-flow.md)、[P7 规格](docs/specs/p07-functions-and-frames.md)、[P8 规格](docs/specs/p08-mutable-containers.md) 与 [P9 规格](docs/specs/p09-teaching-debugger.md)；架构路线与发布证据见[整体实施计划](docs/implementation-plan.md)。

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

React + TypeScript + Vite 页面通过共享 `@wishflow/site-shell` 展示。主线程管理编辑和界面；Pyodide Worker 负责真实 CPython，独立的教学 VM Worker 负责 `mini-vm-v5`。两个引擎只共享源码编辑和必要的展示交互，不混用编译结果、指令或运行状态。

- [协作约束](AGENTS.md)：前端、站点壳、语言、验证和文档规则。
- [ADR-0001](docs/adr/0001-browser-python-visualizer.md)：引擎路线与架构取舍。
- [整体实施计划](docs/implementation-plan.md)：阶段依赖、验收与发布状态。
- [ADR-0002](docs/adr/0002-coherent-execution-experience.md)：已接受的执行现场、默认教学入口、语句讲解、动画和双语帮助决策；V0 实施双语静态帮助页，V1–V6 按专项计划推进。
- [体验实施计划](docs/visual-execution-plan.md)：V0–V6 的阶段、依赖、验收、回滚与状态；详细 spec/tasks 在实施前补充。
- [执行可视化设计说明](docs/design/visual-execution-experience.md)：布局、视觉语法和教学例子的图示。
- [P9 教学调试控制](docs/specs/p09-teaching-debugger.md) 与 [P9 tasks](docs/tasks/p09-teaching-debugger.md)：断点、源码步进、继续/暂停、速度档及发布验收记录。
- [站点外壳契约](../../packages/site-shell/README.md)：公共页面与语言接口。
