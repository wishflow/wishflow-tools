# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)和[模拟与自动化契约](simulation-and-automation.md)。每轮先核对当前代码与专题审计，再细化接下来可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- 正式战役内容已实现 9/60 关：Cow Gulch、Apache Valley、Fort Kaboom、Tech Town、Billy Hills、Murdock Mountains、Lucky Lake、Cactusville、Railroad Ranch。
- [Cactusville 静态审计](map08-static-audit.md)及五个 map08 实现切片已完成；正式前置为 Lucky Lake，Free Play 可直接选择。该批公开提交为 `757acdef4d2650bf00e2151fe5b1682892b156f3`，工作流 `42913467245` 成功，两个 Pages 的构建 SHA 匹配。
- [Railroad Ranch 静态审计](map09-static-audit.md)和实现已完成：原始 32×24 TDM、路线、静态对象、六组列车、四组炸药、七波、双语对白、正式第 9 关解锁、Free Play、结算和回放版本均已接入。关键关卡数据与 APK/DEX 证据交叉核对；没有为 APK 中不存在的玩家生成池补造规则。
- map09 的完整本地检查通过：类型检查、503 项单测、生产构建和 131 项 E2E；仅保留既有主 JS chunk 超过 500 KB 的提示。两组因关卡目录扩充而过期的断言已更新。
- map09 公开发布提交为 `9320536cccc052c7c86308d067138f24b3d7b2e1`；工作流 `42949401613` 的测试、Cloudflare Pages 和 GitHub Pages 均成功。两个 `build-info.json` 均报告该 SHA，内置浏览器已验证线上 Free Play 选关、困难难度、首波对白和战场地图。空档案下炸药按原版进度门槛保持锁定，触发器配对、解锁和爆炸行为由自动化测试覆盖。
- 发布统计更新为 13 次 / 69 个已验收实现切片，比例 18.84%，低于 20% 目标。
- map05–map08 与 map09 批次均已发布。下一批从 New Mexico 第 10 关 Lost City 开始，先审计已有 APK/REA/资源证据，再细化独立实现切片；不根据关卡顺序猜测内容。

## 下一批：New Mexico 第 10 关 Lost City

1. **证据审计：**盘点 map10 TDM、对象标记、路线、单位、波次、经济、对白、音画及正式解锁依赖；区分证实、推导、推断和未知项，优先追到游戏实际消费点。
2. **细化实施计划：**依据审计结果确定地图与对象、路线与单位、战役规则、正式登记等切片及依赖；只有证据表明现有框架不支持目标行为时，才拆新规则能力。
3. **逐片实现与验收：**每片运行针对性检查并提交、更新计划；整批完成后运行完整 CI，用内置浏览器检查选关、对白、地图视口及少量代表性交互，不完整通关。
4. **批次发布：**完整检查通过后按 Guns’n’Glory 发布规则 squash 集成；部署后核对 SHA 并在内置浏览器验收。保持窗口模式和静音，除非专门验证全屏或音效。
