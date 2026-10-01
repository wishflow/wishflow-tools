# Duolingo 头像编辑器

## 项目边界

- 应用从共享静态站发布到 `/duolingo-avatar/`，并登记在根目录 `apps/catalog.json`。
- 前端是独立 Vite 项目，依赖安装在本目录；`npm ci` 使用本地 `package-lock.json`。
- 前端保持 Vite `base: './'`，构建输出到本目录 `dist/`。根目录共享构建器将其复制到 `_site/duolingo-avatar/`。
- AI 密钥和调用保留在现有 Cloudflare Worker；保留现有 Worker 名称和 API wiring。
- Python 辅助工具使用本目录 `.venv/` 和依赖清单，不在全局 Python 环境安装项目依赖。

## 主要目录

- `src/`：React 应用和编辑器逻辑。
- `assets/`：Rive 文件、编辑器配置、语义目录和图标。
- `worker/`：API 路由、校验、AI 生成和 CORS。
- `tests/`：静态产物、Worker、浏览器集成和语义辅助逻辑检查。
- `docs/`：应用架构、部署和语义标注操作说明。

## 本地命令

- 在本目录执行 `npm ci` 安装 JavaScript 依赖。
- Python 工具需要时，执行 `./scripts/install.sh` 创建 `.venv/` 并安装本地依赖。
- `npm run dev` 启动 Vite；`npm run build` 构建到 `dist/`；`npm run test:ci` 运行应用完整验证。
- 根目录 `npm run build:site` 会读取项目目录并组装完整共享站点。
