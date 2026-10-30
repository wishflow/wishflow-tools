# V0 Tasks：双语使用说明入口

依据：[V0 规格](../specs/v00-user-guide.md)。本阶段只实现静态帮助页和入口，不开始 V1 工作台改造。

## 实施顺序

- [x] **T00：先锁定 Markdown 转换行为**
  - 验收：两份当前指南要求的结构、转义、导航行过滤和内部链接处理均有单测；未知标签不会透传。
  - 验证：`pnpm --dir apps/python-interpreter-lab run test:unit -- --test-name-pattern="guide"`（若 Node 测试脚本不支持参数转发，则运行完整 `test:unit`）。
  - 文件：`apps/python-interpreter-lab/tests/guide-renderer.test.ts`、`apps/python-interpreter-lab/scripts/render-guide.ts`。

- [x] **T01：生成静态双语帮助页**
  - 验收：Vite 能在开发与构建时将两份 Markdown 转为带 `data-locale` 的静态片段；新增 `help.html` 只初始化共享站点外壳，不加载实验室 React 或 Worker；构建目录包含 `help.html`。
  - 验证：`pnpm --dir apps/python-interpreter-lab run build`；检查 `dist/help.html` 有正文、没有 Markdown 源链接或 Worker 脚本。
  - 文件：`apps/python-interpreter-lab/vite.config.ts`、`apps/python-interpreter-lab/help.html`、`apps/python-interpreter-lab/src/help.ts`、`apps/python-interpreter-lab/src/help.css`。

- [x] **T02：添加实验室新标签入口**
  - 验收：页眉链接使用共享语言词条，带新标签提示、`target="_blank"` 与安全 rel；打开帮助不触发原页状态变化。
  - 验证：组件单测或 Playwright 断言链接属性和中英文文本。
  - 文件：`apps/python-interpreter-lab/src/App.tsx`、`apps/python-interpreter-lab/src/locales.ts`、`apps/python-interpreter-lab/src/styles.css`。

- [x] **T03：让共享站点处理带外壳的二级页面**
  - 验收：根构建递归找到应用 dist 内的 HTML，只为含 `<wishflow-site-shell>` 的页面注入 catalog 项目；`help.html` 导航可用，其他非站点 HTML 不变。
  - 验证：`pnpm test:catalog`，覆盖临时嵌套帮助页和不含站点外壳的 HTML。
  - 文件：`scripts/build-site.mjs`、`scripts/project-catalog.mjs`、`scripts/project-catalog.test.mjs`。

- [x] **T04：完成浏览器与发布构建回归**
  - 验收：Playwright 验证新标签、帮助内容、共享语言切换、没有解释器资源加载，以及原工作台源码/引擎/程序状态不变；应用与共享站点输出均含正确二级页。
  - 验证：应用 typecheck、单测和构建；Playwright 全量及失败项定向重跑；`pnpm test:catalog`、`pnpm build:site`。
  - 文件：`apps/python-interpreter-lab/e2e/help-page.spec.ts`；必要时修正上述实现文件。

## 执行记录

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| 实现完成 | 已完成 | Markdown 构建转换器、Vite 多页帮助、共享壳本地导航与页眉入口已实现 |
| 本地验证 | 通过（两项首轮失败已定向复测） | 应用 typecheck、135 条单测、构建成功；Playwright 首轮 45/47，其中 1 项受 jsDelivr WASM 请求 `ERR_HTTP2_PROTOCOL_ERROR` 影响，1 项因默认运行速度与 UI 观察时序竞态失败；后者已明确选择慢速，两项均在隔离端口定向重跑通过，帮助页用例也在全量运行中通过；根 catalog 15 条测试，`pnpm build:site` 成功 |
| CI/CD | 成功 | [Actions #41034385992](https://github.com/wishflow/wishflow-tools/actions/runs/41034385992)：Python 实验室及共享站点测试通过，Cloudflare Pages 与 GitHub Pages 部署成功 |
| 线上验收 | 通过 | 按根 README 公布的域名访问 `/python-interpreter-lab/help.html` 成功，Pages 规范化为无扩展名路径；刷新后正文与英文语言状态保留，中英文切换和“打开实验室”链接正常 |

## 交付与回滚

- 提交范围限定为 V0 帮助页、静态站点二级页注入、对应测试和阶段文档。
- 发布前确认 `dist/help.html` 与 `_site/python-interpreter-lab/help.html`，成功发布后再进行线上深链接与语言切换验收。
- 回滚 V0 对应提交即可移除入口和公开帮助页；指南 Markdown 继续保留在仓库。
