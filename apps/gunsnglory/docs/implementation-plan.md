# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮先核对当前代码与证据，再细化接下来几个可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- 正式战役已接入 12/60 关。Traveller’s Town 是 Mississippi 区域第 11 关，Steam Valley 是第 12 关；分别读取 `res/raw/td_map_14.tdm` 和 `res/raw/td_map_15.tdm`，不能根据关卡编号推测地图文件编号。
- Traveller’s Town 批次已发布到 `master`：提交 `b6e05ca20a2d04bc1939ea82d4656842404ce9db`，Actions `43018344472` 成功。GitHub Pages 和 Cloudflare Pages 的 `build-info.json` 均与该 SHA 一致。
- Steam Valley 本地实现已完成：真实 map15、路线/桥和静态对象、单位/汽船、七波、对白与资源、正式关卡 12、Free Play 三种难度，以及按录制解锁状态还原的回放。
- 最终 `CI=1 PLAYWRIGHT_PORT=4198 pnpm run test:ci` 通过：584 项单测、TypeScript 检查、生产构建和 137 项 E2E。构建有 1.488 MB JavaScript chunk 超过 500 KB 的提示。
- 内置浏览器在当前工作树静音、窗口模式验证 Free Play → Mississippi → Steam Valley → Easy → Captain 开场对白 → 第一波。地图和两艘汽船正常显示，HUD 为 `01/07`，没有完整手动通关。
- 发布后普通发布比例为 15 次 / 80 个已验收实现切片（18.75%），低于 20% 目标。

## 下一步：Steam Valley 批次集成与发布

本地功能与完整检查均已完成；地图来源与 `awesomeMessageMin=30000` 边界见[Steam Valley 静态审计](map12-static-audit.md)。剩余工作只涉及分支集成与公开部署，不再重复开展已通过的玩法分析或完整本地检查。

1. 以 `origin/gunsnglory` 和 `origin/master` 为准检查目标工作树。`origin/gunsnglory` 已包含 `origin/master`；本地长期集成分支落后远端，需先普通 merge 同步，不 rebase、不强推。
2. 把已验证的 Steam Valley 实现、实验室背景修正和阶段快照修复作为一个批次 squash 集成到 `gunsnglory`。若冲突导致源码改变，重跑相关测试；无源码变化时复用本轮 `test:ci` 结果。
3. Steam Valley 是新的正式战役关卡，按完整功能批次发布到 `master`。确认发布前 `master` 与 `origin/master` 同步，再以单一 squash 提交发布；推送后等待 Pages 工作流通过，并核对 GitHub Pages 与 Cloudflare Pages 的来源 SHA。
4. 发布 SHA 核验成功后，以内置浏览器窗口模式、静音检查公开版 Mississippi 选关、Steam Valley 地图/开场对白和第一波；不进入全屏或完整手动通关。最后把发布提交合并回 `gunsnglory`、推送远端并核对两个分支与相关工作树。
