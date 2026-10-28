# Python 解释器实验室协作契约

根 [AGENTS.md](../../AGENTS.md) 继续生效。本文件只维护应用的稳定约束和阅读入口；架构理由、阶段安排和详细行为分别由对应文档负责。

## 开始工作

| 工作内容 | 必读内容 |
| --- | --- |
| 选择引擎、调整执行边界、设计可视化数据来源或引入依赖 | [ADR-0001](docs/adr/0001-browser-python-visualizer.md)，核对已确认方向与待阶段确认事项 |
| 选择下一阶段、判断范围、准备实现或验收交付 | [整体实施计划](docs/implementation-plan.md)，核对真实前置、启动条件及完成标准 |
| 实现某一阶段 | 按整体计划先补齐该阶段的 spec 和 tasks，再读取其中与本次任务相关的内容；文件尚不存在时先完成规格工作 |

## 稳定约束

- 应用用于解释 Python 的编译和执行过程。真实视图的数据来自固定版本的 Pyodide/CPython；教学视图使用显式声明语义范围的 Mini VM。两个视图分别标明引擎、版本和观察粒度。
- 可公开访问的版本是 `apps/python-interpreter-lab/` 下的独立 pnpm 前端应用；`python-interpreter-lab` 同时决定 catalog slug、`/python-interpreter-lab/` URL 和 `_site/python-interpreter-lab/` 输出路径。应用提供自己的 lockfile、可执行 `scripts/install.sh`、`build`、`test:ci`，构建输出写入 `dist/`；catalog 维护中英文标题与简介，只在已有可构建、可验证的首版时登记 `apps/catalog.json`。
- UI 默认沿用仓库已有的 React + TypeScript + Vite 应用模式。Vite 使用相对 `base: './'` 并输出到 `dist/`，避免站点子路径下的根绝对资源引用。Python 分析与执行使用由 Vite 正确打包的浏览器 module Web Worker；它属于应用静态资源，不是 Cloudflare Worker 或远程执行服务。
- 公开页面按 [站点外壳契约](../../packages/site-shell/README.md)接入 `@wishflow/site-shell`：HTML 壳提供 `data-app="python-interpreter-lab"`、正确的 `data-base`/`data-home-href`、双语标题，并把应用根节点放入 `content` 插槽；应用入口导入共享组件。应用的 `package.json` 使用仓库本地 `file:../../packages/site-shell` 依赖。
- 单页面板应用默认不启用应用内侧栏。只有引入真实的多页面路由时才提供双语 `data-local-nav` 并启用侧栏；使用 `history.pushState` 的路由在完成跳转后通知共享壳刷新路由状态。
- 所有动态/静态文案使用共享语言状态：静态内容用 `data-locale`；应用消息通过 `registerMessages` 注册，必要时用 `subscribeLanguage` 更新已生成的非 DOM 文案。不自建语言按钮、存储键或检测逻辑。
- 浏览器主线程负责编辑、交互和展示；源码分析、编译和执行放在浏览器 Web Worker。应用保持纯前端，不依赖远程代码执行服务。
- 编辑器、AST、字节码、栈及帧面板需支持键盘可达、可见焦点和明确名称；窄屏下调整面板布局而不要求页面横向滚动，代码容器可独立滚动。动画提供减少动态效果时的等价静态状态。具体断点和布局由 UI 阶段 spec 验收。
- 每次分析、运行和历史记录绑定同一份源码及引擎版本。编辑源码、切换引擎或重置后，旧响应不得覆盖新状态；切换引擎从新的会话开始。
- CPython 轨迹回放只移动观察位置。教学 VM 的实时单步由 VM 推进执行状态；历史浏览与继续执行分别处理，具体边界以 ADR 为准。
- 展示内容必须能追溯到真实分析结果、实际轨迹事件或教学 VM 快照。教学指令不冒充 CPython 字节码；行级事件不推导不存在的逐指令值栈。
- 编译、执行、输出、历史和对象展开均须有资源边界及恢复路径。Worker 隔离执行线程，不等同于任意不可信代码的安全沙箱。
- 从单应用、普通模块和实际消费者需要的数据开始。UI 框架、编辑器、图形库和协议细节在对应阶段确定；新增依赖或实现范式按根规则确认。

## 实现与交付

1. 阶段开始前，确定用户可见目标、支持边界、错误行为、验收样例、真实依赖和回滚方式，再补充该阶段 spec/tasks；整体计划不能替代可执行规格。
2. 验证与观察粒度匹配：编译结果核对固定版本 CPython，轨迹核对事件时机，教学 VM 同时验证逐步状态和支持子集的最终语义。测试使用独立预期，保留跨版本差异说明。
3. 首次公开版本按上述路径与站点外壳契约接入独立 pnpm 构建和语言状态。先验证子路径构建和 Worker 资源地址，再登记导航；开发、测试命令以实际配置为准。
4. 文档变更检查差异、相对链接和跨文档一致性。AGENTS 入口通过 `pi` 启动加载，并按指针真实读取领域文档；未来 CLI/MCP/skill 另验自身调用链。
5. 验证记录区分文档、运行实现和发布结果；未验证项说明原因。Markdown 成品按根规则复制到 `/tmp/var/wishflow-tools/`，保持仓库相对路径。

[CLAUDE.md](CLAUDE.md) 仅导入本文件。
