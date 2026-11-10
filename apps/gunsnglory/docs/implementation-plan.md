# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)和[模拟与自动化契约](simulation-and-automation.md)。每轮先核对当前代码与专题审计，再细化接下来可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- 正式战役内容已实现 8/60 关：Cow Gulch、Apache Valley、Fort Kaboom、Tech Town、Billy Hills、Murdock Mountains、Lucky Lake、Cactusville。
- [Cactusville 静态审计](map08-static-audit.md)及五个 map08 实现切片已完成。Cactusville 已登记为 New Mexico 第 8 关，正式前置仅为 Lucky Lake；Free Play 可直接选择。
- map05–map08 内容与实验室羊皮纸视觉修正已作为一个批次发布，公开提交为 `757acdef4d2650bf00e2151fe5b1682892b156f3`。发布内容包括 Billy Hills、Murdock Mountains、Lucky Lake、Cactusville，以及移除羊皮纸图像下方多余的黄色规则矩形。
- 发布工作流 `42913467245` 的共享检查、应用 CI、Cloudflare Pages 和 GitHub Pages 部署均成功。两个 Pages 的 `build-info.json` 均报告来源 SHA `757acdef4d2650bf00e2151fe5b1682892b156f3`。
- 本批 `CI=1 PLAYWRIGHT_PORT=4174 pnpm run test:ci` 通过：类型检查、483 项单测、生产构建和 129 项 Playwright E2E。生产构建仍有主 JS chunk 超过 500KB 的既有提示。
- 内置浏览器已在公开 SHA 对应页面验证 Free Play 的 8/10 关可选状态、Cactusville 困难难度、首波对白和战场地图；实验室羊皮纸保留不规则外轮廓，黄色矩形底色已消失。验收保持窗口模式与静音，未推进完整战役。
- 发布次数与实现切片统计：成功公开发布 12 次 / 65 个已验收实现切片，比例为 18.46%，低于 20% 目标。
- 发布提交已通过普通 merge 合入并推送到 `gunsnglory`，同步提交为 `ad524dcfad7497c8ec9e3c5128e60630f50df672`；该提交的代码树与公开 `master` 一致。

## 后续工作入口

map05–map08 批次已关闭，当前没有遗留的该批次实现或发布门槛。开始下一批前，先检查 `gunsnglory`、`master` 及远端分支状态和对应内容证据；根据实际可用资源、数据与当前实现，细化下一组关卡或能力的范围、依赖、针对性验收和批次完整检查，再开始逐切片实现。不得将未检查的旧清单当作待办，也不得重复验证已通过且未回归的项目。
