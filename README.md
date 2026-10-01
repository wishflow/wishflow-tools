# WishFlow Tools

WishFlow 的小工具与实验项目集合。每个应用放在 `apps/` 下独立维护和构建，站点根路径提供统一导航入口。

## 当前应用

| 应用 | 路径 | 说明 |
| --- | --- | --- |
| Duolingo Avatar Editor | `/duolingo-avatar/` | 创建和编辑 Duolingo 风格头像；前端静态发布，AI 能力由现有 Cloudflare Worker 提供 |

## 线上地址

目前没有绑定自定义域名。公开入口使用 Cloudflare Pages、GitHub Pages 和 Workers 提供的默认域名：

| 内容 | Cloudflare Pages（主入口） | GitHub Pages（镜像） |
| --- | --- | --- |
| WishFlow Tools 导航站 | [wishflow-tools.pages.dev](https://wishflow-tools.pages.dev/) | [wishflow.github.io/wishflow-tools](https://wishflow.github.io/wishflow-tools/) |
| Duolingo Avatar Editor | [wishflow-tools.pages.dev/duolingo-avatar](https://wishflow-tools.pages.dev/duolingo-avatar/) | [wishflow.github.io/wishflow-tools/duolingo-avatar](https://wishflow.github.io/wishflow-tools/duolingo-avatar/) |
| AI API（Cloudflare Worker） | [duolingo-avator-creator.wei-shi-ws.workers.dev](https://duolingo-avator-creator.wei-shi-ws.workers.dev/) | — |

旧版头像编辑器仍保留在 [duolingo-avator-creator.pages.dev](https://duolingo-avator-creator.pages.dev/) 作为回退入口；它不是新的导航站地址。部署细节见 [`apps/duolingo-avatar/docs/deployment-plan.md`](apps/duolingo-avatar/docs/deployment-plan.md)。

## 本地开发

```bash
npm ci
npm run dev
```

开发服务器直接打开头像编辑器。构建完整站点并在本地预览：

```bash
npm run build:site
python3 -m http.server 8769 --directory _site
```

访问 `http://127.0.0.1:8769/` 查看导航页，或访问 `/duolingo-avatar/` 打开编辑器。

## 验证与发布

```bash
npm run test:ci
```

GitHub Pages 和 Cloudflare Pages 发布同一份 `_site` 静态产物；AI API 继续部署到现有 Cloudflare Worker，不为静态应用额外创建容器。

应用级代码、测试和部署说明见 [`apps/duolingo-avatar/README.md`](apps/duolingo-avatar/README.md)。
