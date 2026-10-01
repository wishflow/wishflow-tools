# Duolingo Avatar Editor

WishFlow Tools 中的头像编辑应用，部署在 `/duolingo-avatar/`。前端由 Vite 构建为静态文件；AI 生成接口继续使用现有 Cloudflare Worker。

## 本地开发

从仓库根目录执行：

```bash
npm ci
npm run dev
```

构建完整导航站和应用：

```bash
npm run build:site
python3 -m http.server 8769 --directory _site
```

编辑器路径为 `http://127.0.0.1:8769/duolingo-avatar/`。

## 结构

- `src/`：React 前端与编辑器交互。
- `assets/`：Rive 文件、组件配置、语义目录和图标。
- `worker/`：AI 生成与公开配置 API。
- `tests/`：静态产物、Worker 和浏览器端检查。
- `docs/`：应用架构、部署和语义标注说明。

Vite 输出到仓库根目录 `_site/duolingo-avatar/`。`base: './'` 是必要配置，保证应用能在 GitHub Pages 项目路径和 Cloudflare Pages 子路径下加载资源。

## 验证

从仓库根目录运行 `npm run test:ci`。单独运行时可使用 `npm run test:static`、`npm run test:worker` 或 `npm run test:e2e`。
