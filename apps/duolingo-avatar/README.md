# Duolingo Avatar Editor

WishFlow Tools 中的头像编辑应用，部署在 `/duolingo-avatar/`。前端由 Vite 构建为静态文件；AI 生成接口继续使用现有 Cloudflare Worker。

## 线上地址

从 [WishFlow Tools 统一入口](../../README.md#线上地址) 导航到本应用。应用使用 `/duolingo-avatar/` 子路径；这里不重复列站点域名或后端 API 地址。

## 本地开发

在本目录安装应用自己的 JavaScript 和 Python 依赖并启动开发服务器：

```bash
./scripts/install.sh
npm run dev
```

`npm run build` 只构建此应用到本地 `dist/`。从仓库根目录构建完整导航站和所有已登记应用：

```bash
cd ../..
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

Vite 输出到本目录 `dist/`，共享构建器再复制到 `_site/duolingo-avatar/`。`base: './'` 保证应用能在 GitHub Pages 项目路径和 Cloudflare Pages 子路径下加载资源。

## 验证

在本目录运行 `npm run test:ci`。单独验证可使用 `npm run test:static`、`npm run test:worker` 或 `npm run test:e2e`。
