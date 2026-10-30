# Python 解释器实验室协作契约

仓库根 [AGENTS.md](../../AGENTS.md) 持续生效。本文件只记录本应用特有的产品状态、前端边界和协作入口；通用仓库规则不在此重复。

## 工作入口

| 工作内容 | 必读内容 |
| --- | --- |
| 运行应用、查命令或了解已发布能力 | [README](README.md) |
| 选择引擎、改变执行边界、引入依赖或调整运行时资源 | [ADR-0001](docs/adr/0001-browser-python-visualizer.md) |
| 判断阶段范围、启动条件、验收与发布状态 | [整体实施计划](docs/implementation-plan.md) |
| 修改教学列表/字典语义、对象图或容器资源预算 | [P8 规格](docs/specs/p08-mutable-containers.md) 和 [P8 tasks](docs/tasks/p08-mutable-containers.md) |
| 修改教学 VM 断点、步进、暂停/继续或运行速度 | [P9 规格](docs/specs/p09-teaching-debugger.md) 和 [P9 tasks](docs/tasks/p09-teaching-debugger.md) |
| 实现一个阶段 | 先核对计划，再完成该阶段的 spec 和 tasks；实现仅按已确认的规格进行 |

## 产品与前端边界

- 本应用包含浏览器内真实 CPython 的编译观察和运行轨迹回放，以及教学 Mini VM `mini-vm-v5`。P8 增加列表/字典、可变对象引用、历史对象图、循环安全打印和结构相等；P9 增加源码行/教学指令断点、单指令和源码步进、Continue/Pause/Reset 与自动运行速度选择。教学 VM 支持范围见 [P5 规格](docs/specs/p05-minimal-teaching-vm.md)、[P6 规格](docs/specs/p06-control-flow.md)、[P7 规格](docs/specs/p07-functions-and-frames.md)、[P8 规格](docs/specs/p08-mutable-containers.md) 和 [P9 规格](docs/specs/p09-teaching-debugger.md)。教学 VM 不是完整 Python，也不呈现 CPython 内部状态；正式页面版本和发布证据以 README 与整体计划为准。
- 本应用是 `apps/catalog.json` 登记的静态前端应用。slug、导航卡片和发布路径以该文件为准；不在应用页面或构建代码中复制全站应用目录。依赖、构建和测试遵循根规则及本应用 `package.json`。
- 页面沿用仓库已有 React、TypeScript、Vite 模式，使用 `base: './'` 构建到 `dist/`，并通过仓库本地 `@wishflow/site-shell` 包挂载在 `content` 插槽内。HTML 属性、入口接法及导航行为以[站点外壳契约](../../packages/site-shell/README.md)为准。公共页眉、项目导航、页脚、语言选择和语言持久化由共享外壳提供。当前为单页工作区，不启用空的应用内侧栏；只有出现真实的多页面路由时才按共享契约接入本地导航。
- 页面文案使用共享外壳的语言状态，应用只维护自己的中英文词条。不得另建语言按钮、语言存储键、语言检测或持久化逻辑。
- 源码分析、编译和执行在浏览器 Web Worker 中进行，Worker 由 Vite 作为应用静态资源打包。它不是 Cloudflare Worker，也不构成远程代码执行后端。Pyodide 使用固定版本的浏览器资源；升级或更改托管方式时按 ADR 和阶段 spec 验证版本、资源地址、跨域策略、失败恢复及子路径部署。
- Worker 让 UI 保持响应，但不提供任意 Python 代码的安全沙箱。应用不主动上传用户源码、不向执行环境注入账号凭据或业务能力；用户运行的代码仍可能使用其运行时可访问的浏览器能力和网络。

## 语义与状态约束

- 真实视图只显示固定 Pyodide/CPython 运行时实际生成的 AST、代码对象、Tokens、字节码和轨迹；不得根据源码推测不存在的指令、执行状态或值栈。
- 教学模式必须单独标明教学引擎和指令集版本。教学 AST、字节码、值栈及帧状态来自教学 VM 自身，不能称为真实 CPython 内部状态；不得声称教学指令与 CPython 指令逐条对应。
- 编译结果、执行轨迹和历史记录都绑定到对应源码版本与引擎版本。编辑源码、重置或切换引擎后，旧 Worker 响应不得覆盖当前状态。
- CPython 轨迹回放只改变观察位置，不重新执行代码。教学 VM 的实时单步才推进 VM；浏览历史保持只读，Continue 从历史位置执行时先回到真实执行头，不恢复旧快照或创建分支。
- 教学 VM 源码断点只绑定源码行首条可执行指令；Continue 仅跳过当前命中一次，后续循环/递归命中仍暂停。Reset 保留当前编译结果的断点，编辑源码或重新编译清除断点；Step Line 与 Step Over 共用同一操作语义。速度档只改变自动 Run/Continue 调度，不改变单步、断点、预算或终态语义。
- 输出、源码和运行时值按文本安全展示。编译、执行、输出和历史必须有明确资源预算、超限状态及重新开始的恢复路径；具体数值由对应阶段 spec 规定。

## 前端验收

- 前端改动保持共享外壳和公共语言状态不回归，并在应用发布子路径下验证入口、样式、静态资源及 module Worker 地址。
- 新增面板和控件支持键盘操作、可见焦点和明确名称；窄屏布局不要求页面横向滚动，长代码和结果在各自容器内滚动，动画尊重 `prefers-reduced-motion`。具体视口与交互样例由阶段 spec 验收。
- 验证命令以应用 `package.json` 和仓库现有构建/测试流程为准；文档变更检查 Markdown 链接、差异与跨文档状态一致性。编辑 agent 入口时，按仓库适用要求使用 `pi` 验证真实加载和文档指针读取。

[CLAUDE.md](CLAUDE.md) 仅导入本文件。
