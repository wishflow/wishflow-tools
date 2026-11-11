# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮先核对当前代码与证据，再细化接下来几个可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- 正式战役已接入 11/60 关。Traveller’s Town 是 Mississippi 区域第 11 关；其 TDM 来源为 `res/raw/td_map_14.tdm`，不能根据关卡编号推测地图文件编号。
- Traveller’s Town 批次已发布到 `master`：提交 `b6e05ca20a2d04bc1939ea82d4656842404ce9db`，Actions `43018344472` 成功。GitHub Pages 和 Cloudflare Pages 的 `build-info.json` 均与该 SHA 一致。
- 最终 `CI=1 PLAYWRIGHT_PORT=4195 pnpm run test:ci` 通过：561 项单测、生产构建和 134 项 E2E。构建仍有 1.385 MB JavaScript chunk 超过 500 KB 的既有提示。
- 内置浏览器静音、窗口模式验证 Free Play → Mississippi → Traveller’s Town → Hard；地图、Settlers 首波对白正常，继续后无缺图错误。没有进入全屏、开启声音或完整通关。
- 发布后普通发布比例为 15 次 / 80 个已验收实现切片（18.75%），低于 20% 目标。

## 下一步：Mississippi 第 12 关静态审计

下一关入口显示为 Steam Valley。先完成静态审计，再细化实现计划；不得根据关卡顺序假设对应的 TDM 编号或复制 Traveller’s Town 参数。

1. 从 APK/REA 静态材料确认第 12 关的正式名称、实际 TDM 文件、完整地图尺寸与图层、路径、地图对象和资源引用。
2. 交叉核对敌人请求与波次、玩家单位池、难度数值、对白与音频、解锁条件、结算和回放兼容行为；未知项标出代码/资源入口及所需证据。
3. 产出主题化审计结果，并核对所有引用材料。审计通过门槛：地图文件对应关系明确；可实现内容清单与规则数据可追溯；关键未知项已解决或明确阻塞原因。
4. 审计通过后，再把第 12 关拆成独立实现与验收切片，列明依赖、定向测试和批次门槛；计划可判定前不开始写关卡代码。
