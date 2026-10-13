# Blender Lab 项目规则

## 项目边界

- 本目录是本机 Blender 建模、自动化和静态场景实验工作区，不是当前导航站前端应用。
- 未明确要求前，不登记到 `apps/catalog.json`，不创建网页 UI、公开部署流程或 Worker。
- Blender 场景和导出物只放在本项目明确约定的目录；新增目录前先查看当前目录内容，避免覆盖用户文件。
- Blender MCP 可以读取和修改当前打开的场景。操作前先检查场景、对象、集合、材质和保存状态；不清空场景、不删除或覆盖既有对象/文件，除非用户明确要求。

## AI 建模与场景交付

- 建模前先把需求整理成场景目标、主体/配件、尺度、构图、材质、灯光、相机和网页交互约束；复杂模型分阶段创建，先完成可检查的灰盒，再逐步加细节。
- 生成脚本应可重复执行、命名稳定、尽量幂等；创建对象时捕获实际对象引用，避免依赖 Blender 自动生成的 `.001` 名称。
- 交付网页场景时，优先把 Blender 场景导出为 glTF/GLB，前端使用 Three.js 等加载导出文件；不要把 Blender Python 或 MCP 凭据放进浏览器端。
- 发布前检查模型尺度与朝向、法线、材质贴图路径、三角面数、文件体积、相机视野、色彩空间、浏览器加载和移动端性能。场景截图或测试渲染应能对应到交付版本。

## MCP 与本机工具

- MCP 用户级配置由 `scripts/setup-mcp.mjs` 管理。先检查目标客户端和当前配置，再只安装用户选择的客户端；脚本不得安装或升级 Codex、Claude Code、Gemini CLI、OpenCode、Cursor 等 Agent 本体。
- `blender` MCP 使用 PATH 中的 `blender-mcp` stdio 命令；`3d-assets` 使用公开 HTTP MCP `https://3d.shep.bot/mcp`。
- 若服务器同名且传输/命令或 URL 不同，只报告冲突并跳过，绝不自动删除或覆盖。配置值、认证头、环境变量不得打印到日志。
- Blender MCP 的 `blender-mcp` 服务端与 Blender 内的连接扩展都必须可用；不要因客户端显示已安装就推断 Blender 当前已连接。
- Sketchfab 因下载集成需要 OAuth 应用注册，当前不接入。不要收集或写入 Sketchfab token。

## 资产、许可和凭据

- 使用外部模型、材质、贴图、HDRI、字体或音频时，记录来源 URL、作者、资产名称/ID、下载日期、许可和署名要求；检查许可是否允许静态网页托管、缓存和二次分发。
- 3D Assets MCP 的搜索结果包含来源和许可信息；下载后复核具体资产许可。Blendkit 免费账号/素材也须依据对应资产条款判断可否用于公开部署。
- API key、登录 token、Cookie、MCP Header、`.env.local` 等凭据只能保留在本机或客户端的用户配置中，不得写入仓库、`.blend` 文件、网页代码、构建产物或截图。
- 不要把凭据放入 `VITE_*`、`NEXT_PUBLIC_*` 等前端公开环境变量。静态站点只发布模型、贴图和必要的前端资源。

## 依赖与验证

- JavaScript 工具使用项目独立 `package.json` 与 `pnpm-lock.yaml`；目前仅用 Node.js 内置模块，不增加运行时依赖。
- Python 自动化如需第三方包，使用本项目 `.venv/` 和项目依赖清单，不安装到全局 Python。
- 配置客户端前运行 `pnpm run check:integrations`；配置后重新检查，并视客户端要求重启或刷新 MCP。
- 文档或脚本改动后运行与变更范围匹配的轻量检查以及 `git diff --check`；不为本地初始化添加独立测试框架。
- 提交时只包含 Blender Lab 相关文件，保留仓库内其他应用的未提交更改。Markdown 成品遵循仓库根 `AGENTS.md` 的交付规则。
