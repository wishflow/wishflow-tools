# Duolingo 头像编辑器

## 项目边界

- 应用位于 `apps/duolingo-avatar/`，从共享静态站发布到 `/duolingo-avatar/`。
- 前端是静态站点；AI 密钥和调用保留在现有 Cloudflare Worker。
- 保留 `wrangler.toml` 中的 Worker 名称，确保当前 `workers.dev` API 地址不变。
- 保留 Vite 的 `base: './'` 和输出路径 `../../_site/duolingo-avatar`，使资源能在子路径下正常加载。

## 主要目录

- `src/`：React 应用和编辑器逻辑。
- `assets/`：Rive 文件、编辑器配置、语义目录和图标。
- `worker/`：API 路由、校验、AI 生成和 CORS。
- `tests/`：静态产物、Worker、浏览器集成和语义辅助逻辑检查。
- `docs/`：应用架构、部署和语义标注操作说明。

从仓库根目录运行 `npm run dev`、`npm run build:site` 和 `npm run test:ci`。应用部署和语义工具命令由根目录 npm workspace 脚本代理。
