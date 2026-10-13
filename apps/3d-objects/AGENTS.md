# 3D 静态页面项目

## 交付边界

- 本应用是独立的 Vite + TypeScript + Three.js 静态站点，登记到根目录 apps/catalog.json 后由共享站点部署。
- 页面只加载项目内 public/models/scene.glb 和随项目构建的静态资源。不得引入后端、运行时 CDN、认证 API 或浏览器端密钥。
- Blender 生成脚本输出 blender/scene.blend 和 public/models/scene.glb；不要用 Blender MCP 操作用户当前打开的场景来替代项目生成脚本。

## 场景与素材

- 在开始实现前完成并确认 docs/idea-brief.md、docs/requirements.md 与 docs/scene-spec.md。
- scene-contract.json 是 Blender 检查器使用的机器可读场景合同；修改预算或必需对象时同步更新 SceneSpec，并重新获取用户确认。
- assets/manifest.json 必须记录每个外部素材的来源、作者、许可、署名、再分发状态和本地文件；许可未知或不允许再分发时检查失败。
- 不将 API key、Cookie、客户端登录态或 MCP 配置写入项目、.blend、页面源码或 dist。

## 命令

- scripts/install.sh 安装独立 pnpm 依赖。
- pnpm run generate:scene 使用本机 Blender 重建源场景和 GLB。
- pnpm run check:assets 检查素材许可记录。
- pnpm run check:scene 需要本机 Blender，检查场景结构与 GLB。
- pnpm run test:ci 检查素材、代码、构建和 Chromium 浏览器中的 GLB 加载。
- pnpm run check:release 汇总本机 Blender 检查和 test:ci；全部通过后才可提交并推送。

## 实现要求

- 前端使用 Vue 3 单文件组件和 Vue Router。页面外壳由 `@wishflow/site-shell` 提供；本应用的目录与房屋详情导航通过 `index.html` 的 `data-local-nav` 接入公共侧栏。
- 可复用的场景组件放在 `src/components/`，页面放在 `src/pages/`，翻译词条放在 `src/locales.ts`。Three.js 场景逻辑集中在 `src/scene/`，由 Vue 组件的挂载/卸载生命周期启动和释放，不访问应用外部的全局页面元素。
- 页面需要有加载中、已加载、错误状态；用文本说明问题，不能留空画布。
- 保持 HTML 控件可访问、页面适配窄屏；降低设备像素比上限，避免无意义的高分辨率渲染。
- 在 macOS 的 Codex 桌面应用中预览或检查本地页面时，使用 Codex 内置浏览器；不要打开系统外部浏览器，也不要改用外部 Chrome DevTools。CI 所需的无头 Playwright 自动化检查可以继续运行。
- 保留 GLB 文件本身和场景生成/检查脚本。对外部素材的修改和来源变化要同步更新清单。
