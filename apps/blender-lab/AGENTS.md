# Blender Lab 工作流框架

## 项目边界

- 本目录保存 Agent 工作规范、Idea 文档模板、3D 静态网页起步模板和本机 Blender 质量检查脚本；它不是导航站应用，不登记到 apps/catalog.json。
- 每个公开 Idea 项目必须是 apps/<slug>/ 下的独立应用，并登记到 apps/catalog.json；不要把成品应用嵌套到本目录。
- 不新增交互式工作流 CLI。Coding agent 负责写文档、场景脚本和网页；项目脚本只负责可重复检查，由 Agent、应用脚本或 CI 调用。
- 不创建后端、Worker、数据库、认证层或在线模型服务。

## 标准 Agent 流程

1. 先读取 templates/idea 中的模板，根据原始 Idea 写出 Idea 简报、需求、SceneSpec 和素材清单。
2. SceneSpec 至少确定目标受众与核心操作、对象层级、实际尺度、相机与构图、材质和灯光、网页交互、目标设备、模型/纹理/文件体积预算及验收条件。
3. 把人类可读 SceneSpec 与 scene-contract.json 对齐。后者承载场景检查脚本需要的机器可读约束。
4. 在开始建模前向用户展示这组文档，等待用户确认。若用户改变已确认的主体、交互或性能目标，先更新文档并重新确认。
5. 先复制 templates/web-3d 到 apps/<slug>，把 package.json 的 name 改成项目专属名称；再把已确认的 Idea Markdown 放入该应用的 docs/，将素材计划写入 assets/manifest.json。
6. 将其补全为独立 pnpm 应用，写入项目专属 Blender 生成与检查脚本，并登记 catalog。
7. 在已确认的预算内建模，保留可重跑的 Python 生成脚本；导出 .blend 和 public/models/scene.glb。外部资产须先检查并记录许可。
8. 依次执行素材清单、Blender 场景、网页构建和浏览器检查；查看 Blender 渲染与浏览器预览，并按已确认的 SceneSpec 自检。
9. 每轮修复后重跑受影响的检查，最多自动修复三轮。仍失败、素材许可不明或机器检查无法满足 SceneSpec 时停止，不提交、不推送，向用户报告具体阻塞项。
10. 全部检查通过后，按仓库约定提交相关文件并 push origin master；现有 CI 成功后由共享站点流程发布。

## 页面应用契约

- 使用 Vite、TypeScript 和 Three.js 的静态模板，GLB 从应用自身的 public 目录加载；Three.js、GLB、贴图及 UI 均随应用构建，不从运行时 CDN 获取关键资源。
- 每个登记应用维护独立的 package.json、pnpm-lock.yaml、scripts/install.sh、build 和 test:ci；构建产物写到自己的 dist/。
- 页面必须提供加载中、加载成功和加载失败状态；有模型加载、WebGL 或网络错误时显示可理解的提示，不能只留下空白画布。
- 保持可访问的状态文本、键盘可达的页面控件、响应式视口与移动端可用的基础交互。
- 项目自己的 SceneSpec.md 与 scene-contract.json 是验收依据；数值预算在规格确认时明确，禁止悄悄放宽门槛。

## Blender 与素材

- 本机 Blender 场景生成使用 Blender Python；不要在浏览器端运行 bpy 或打包 MCP 凭据。
- 生成脚本应从干净场景可重复执行，名称稳定，输出位置固定。不要对用户当前打开的 Blender 场景执行清空或覆盖操作。
- Blender 场景检查至少验证活动相机、非空网格、对象变换、材质贴图引用、三角面预算、贴图边长预算和 GLB 头部/大小。
- 素材清单记录每项外部素材的来源 URL、作者、资源名或 ID、许可、署名要求、再分发许可和仓库内路径。许可未知或不允许网页静态托管时，发布检查失败。
- 优先复用已接入的免密 3D Assets MCP 与本机 Blendkit。认证信息只保存在客户端/插件用户配置，不能放入仓库、.blend、静态源码或 dist。
- 不接入 Sketchfab OAuth/API；不要收集或保存其 token。

## 命令与验证

- 本地 Blender Lab 框架命令：pnpm run test:ci。
- 成品应用的常用命令：pnpm run generate:scene、pnpm run check:assets、pnpm run check:scene、pnpm run test:ci、pnpm run check:release。
- check:scene 依赖本机 Blender；CI 不安装 Blender，test:ci 验证素材清单、静态构建和浏览器 GLB 加载。
- 只在工作区内生成测试应用和构建文件；提交前检查 git status、git diff 与 git diff --check，仅包含本次目标文件。
- 修改 Markdown 后按仓库根规则复制成品到 /tmp/var/blender-lab/。
