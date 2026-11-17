# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮开始先核对当前实现与进度，再细化接下来几个独立步骤的实现、依赖和验收；每完成一步就更新本计划并移除已完成事项。

## 当前状态

- M30 Snake River（Oregon 第 9 关／全局第 29 关）已完成并公开发布。发布提交 `9fbb26a48c6d75143aaa469ce249f70f18bc3684` 的 GitHub Actions `44023162078` 成功；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配该 SHA。发布页面由内置浏览器检查通过，详情见[经验记录](experience-log.md#新关卡集成的共享断言与启动预载)。
- 回同步提交 `9cafb9d` 已将发布提交合并进 Guns’n’Glory 集成分支；回同步后仅在本计划和经验记录中补齐最终状态，没有重新改动游戏实现。
- M30 最终 `CI=1 PLAYWRIGHT_PORT=4180 pnpm run test:ci` 通过类型检查、892 项单测、生产构建和180项 E2E。构建仍有既有大 JS chunk 提示；本批未做拆包重构。
- 普通发布比例为 36/195（18.5%），低于 20% 目标；静态审计、完整检查、部署和回同步不计为实现切片。
- M22 留下的旧版 M4–M7 回放导入探针仍未确认；M30 未重开该问题。后续若处理，先复核其复现条件和现有实现，不重复检查已经闭合的 Snake River 回放路径。
- 当前没有已细化的下一批实现任务。下一轮先审查未关闭差异，再形成可独立验收的近期计划；不得直接复用已经完成的关卡接入步骤。

## 已完成批次的证据入口

- Snake River 的原始 TDM、参数、路线、单位和对白核验见[静态审计](map29-static-audit.md)。
- 新关卡的共享进度断言、资源预载和运行时路线回归要求见[经验记录](experience-log.md)。
