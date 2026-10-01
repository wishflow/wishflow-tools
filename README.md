# WishFlow Tools

WishFlow Tools 将多个独立工具汇集到一个导航站。前端应用放在 `apps/<slug>/`，入口卡片、标题、简介和图标统一登记在 [`apps/catalog.json`](apps/catalog.json)；`slug` 决定应用子路径。

当前头像编辑器位于 `/duolingo-avatar/`。应用路径和 Worker 部署说明见 [`apps/duolingo-avatar/docs/deployment-plan.md`](apps/duolingo-avatar/docs/deployment-plan.md)。

## 线上地址

统一对外入口：[wishflow-tools.pages.dev](https://wishflow-tools.pages.dev/)。各应用从导航站进入，并使用自己的子路径。

## 本地开发

为头像编辑器安装 JavaScript 和 Python 依赖：

```bash
cd apps/duolingo-avatar
./scripts/install.sh
npm run dev
```

构建所有已登记应用并预览完整导航站：

```bash
cd ../..
npm run build:site
python3 -m http.server 8769 --directory _site
```

访问 `http://127.0.0.1:8769/` 查看导航页，或访问 `/duolingo-avatar/` 打开编辑器。新增已登记应用后，先在该应用目录运行其 `scripts/install.sh`。

## 验证与发布

```bash
npm run test:catalog
cd apps/duolingo-avatar && npm run test:ci
```

GitHub Pages 和 Cloudflare Pages 发布同一份 `_site` 静态产物；AI API 继续部署到现有 Cloudflare Worker，不为静态应用额外创建容器。CI 按变更选择应用测试，并只在 Worker 源码或配置变化时部署 Worker。

应用级代码、测试和部署说明见 [`apps/duolingo-avatar/README.md`](apps/duolingo-avatar/README.md)。
