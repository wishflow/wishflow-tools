# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)和[模拟与自动化契约](simulation-and-automation.md)。每轮先核对当前代码与专题审计，再细化接下来可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- 正式战役内容已实现 9/60 关：Cow Gulch、Apache Valley、Fort Kaboom、Tech Town、Billy Hills、Murdock Mountains、Lucky Lake、Cactusville、Railroad Ranch。
- [Cactusville 静态审计](map08-static-audit.md)及五个 map08 实现切片已完成。Cactusville 已登记为 New Mexico 第 8 关，正式前置仅为 Lucky Lake；Free Play 可直接选择。
- [Railroad Ranch 静态审计](map09-static-audit.md)已完成，地图、路线、六个列车组、四组炸药、七波、参数和对白均与 APK 研究材料交叉核对。切片 1.1 逐字节接入 770 字节、32×24 原始 TDM，生成 768 个背景格、111 条 street 绘制命令及 3 段水平桥面/6 个桥墩；切片 1.2 接入方向路线、57 个场景装饰、六组共 25 个列车组件和四组炸药；切片 2.1 接入开局参数和七波、11 个敌人请求；切片 2.2 接入双语关卡文案、七段对白、正式第 9 关登记、Free Play、进度结算与回放内容版本。map09 没有 APK 玩家生成池动作或招募建筑，因此没有补造独立玩家单位池；地图上的 11 节 activity4 货车仍由已有地图交互招募。正式战役第 9 关仅在完成 Cactusville 后开放；Free Play 不受该前置限制。map09 回放版本会保存炸药解锁快照。当前定向单测、类型检查和 map07–09 浏览器测试通过；整批检查留到本批收尾。
- map09 炸药 tile 分派已按 `GameObjectManager` DEX 分支复核：102 是 type 7 触发器，110 是 type 8 炸药箱。研究清单的对象类型表对调了两者，已在本关审计中标明；网页共用配对实现无需修改。
- 共享列车 marker 解码支持多组水平/垂直列车，并保留 `92`/`93` 货车 activity 差异；map09 六组现在由关卡模块按各自 movement group 接入。
- 地形测试参考器已接受显式 `bridgeTileCodes`：Tech Town 将 tile `81` 保持为普通铁轨，Railroad Ranch 仅在自己的参考配置中将 tile `81` 覆绘为桥面。Tech Town 与 map09 定向地形测试共 12/12 通过。
- map09 将正式战役目录扩展到 9 关后，旧 E2E 对进度分母与 Free Play 可用关卡的断言已同步；6 个受影响测试文件共 12/12 通过。
- map09 整批 `CI=1 PLAYWRIGHT_PORT=4174 pnpm run test:ci` 已通过：类型检查、503 项单测、生产构建及 131 项 E2E 全部通过。构建保留既有 500 KB 主 chunk 提示；Playwright 端口 4173 有现存进程，因此整批使用 4174。
- 本地内置浏览器已进入 Free Play → New Mexico → Railroad Ranch → Hard，核对首波对白和实际战场地图；对一组横向列车做了短拖动观察。声音保持关闭，模拟速度测试时临时设为 0.25×，之后恢复原存档值 4×并重载回主菜单。空档案未达到原版炸药解锁条件，因此浏览器中炸药保持锁定；关卡内四组炸药配对、解锁条件和爆炸行为由 503 项单测覆盖。
- map05–map08 内容与实验室羊皮纸视觉修正已作为一个批次发布，公开提交为 `757acdef4d2650bf00e2151fe5b1682892b156f3`。发布内容包括 Billy Hills、Murdock Mountains、Lucky Lake、Cactusville，以及移除羊皮纸图像下方多余的黄色规则矩形。
- 发布工作流 `42913467245` 的共享检查、应用 CI、Cloudflare Pages 和 GitHub Pages 部署均成功。两个 Pages 的 `build-info.json` 均报告来源 SHA `757acdef4d2650bf00e2151fe5b1682892b156f3`。
- 本批 `CI=1 PLAYWRIGHT_PORT=4174 pnpm run test:ci` 通过：类型检查、483 项单测、生产构建和 129 项 Playwright E2E。生产构建仍有主 JS chunk 超过 500KB 的既有提示。
- 内置浏览器已在公开 SHA 对应页面验证 Free Play 的 8/10 关可选状态、Cactusville 困难难度、首波对白和战场地图；实验室羊皮纸保留不规则外轮廓，黄色矩形底色已消失。该验证对应 map05–map08 发布，不代表 map09 已发布。验收保持窗口模式与静音，未推进完整战役。
- 发布次数与实现切片统计：成功公开发布 12 次 / 65 个已验收实现切片，比例为 18.46%，低于 20% 目标。
- 发布提交已通过普通 merge 合入并推送到 `gunsnglory`，同步提交为 `ad524dcfad7497c8ec9e3c5128e60630f50df672`；该提交的代码树与公开 `master` 一致。

## 当前批次：New Mexico 第 9 关 Railroad Ranch

静态审计及实现切片 1.1、1.2、2.1、2.2 均已完成并分别通过针对性验证。正式战役仅在 Cactusville 完成后开放 map09；Free Play 可直接选择。APK 英文简介、胜利标题和七段对白已接入；Engineer 对白只显示头像，不播放未经确认的声音。正式结算、Free Play 隔离和带炸药状态快照的回放已覆盖。实验室羊皮纸底色修正属于前一批且已经发布，不并入 map09。

### 批次收尾门槛

- [ ] 从最新 `origin/gunsnglory` 对齐 map09 批次，使用一个 squash commit 集成到发布路径并推送 `master`；保留逐切片提交作为来源记录，不发布其他本地工作树中的未集成修正。
- [ ] 等待发布工作流成功，核对公开 `build-info.json` 来源 SHA；用内置浏览器在公开版本复验第 9 关入口、对白与战场地图。完成后把发布提交合并回 `gunsnglory`、推送远端并同步相关干净工作树。
