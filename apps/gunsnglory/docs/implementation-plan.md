# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)和[模拟与自动化契约](simulation-and-automation.md)。每轮先核对当前代码与专题审计，再细化接下来可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- 正式战役内容已实现 10/60 关：Cow Gulch、Apache Valley、Fort Kaboom、Tech Town、Billy Hills、Murdock Mountains、Lucky Lake、Cactusville、Railroad Ranch、Lost City。
- [Cactusville 静态审计](map08-static-audit.md)及五个 map08 实现切片已完成；正式前置为 Lucky Lake，Free Play 可直接选择。该批公开提交为 `757acdef4d2650bf00e2151fe5b1682892b156f3`，工作流 `42913467245` 成功，两个 Pages 的构建 SHA 匹配。
- [Railroad Ranch 静态审计](map09-static-audit.md)和实现已完成：原始 32×24 TDM、路线、静态对象、六组列车、四组炸药、七波、双语对白、正式第 9 关解锁、Free Play、结算和回放版本均已接入。关键关卡数据与 APK/DEX 证据交叉核对；没有为 APK 中不存在的玩家生成池补造规则。
- map09 的完整本地检查通过：类型检查、503 项单测、生产构建和 131 项 E2E；仅保留既有主 JS chunk 超过 500 KB 的提示。两组因关卡目录扩充而过期的断言已更新。
- map09 公开发布提交为 `9320536cccc052c7c86308d067138f24b3d7b2e1`；工作流 `42949401613` 的测试、Cloudflare Pages 和 GitHub Pages 均成功。两个 `build-info.json` 均报告该 SHA，内置浏览器已验证线上 Free Play 选关、困难难度、首波对白和战场地图。空档案下炸药按原版进度门槛保持锁定，触发器配对、解锁和爆炸行为由自动化测试覆盖。
- map09 发布后的发布统计基线为 13 次 / 69 个已验收实现切片，比例 18.84%；Lost City 批次尚未发布，完成批次后再更新计数。
- map05–map08 与 map09 批次均已发布。下一批从 New Mexico 第 10 关 Lost City 开始；[静态审计](map10-static-audit.md)已确认 TDM、完整路线、地图对象、十波、单位池、参数、文本与资源证据，并列出未知项。无需启动 Android 或完整通关。
- Lost City 切片 A 已完成：从 APK 导入的 TDM 为 770 字节，SHA-256 与审计一致；新增 32×24 原始格网及 768 个背景格、157 个地形/铁路绘制命令。`node --import tsx --test tests/lost-city-map.test.ts` 通过。
- Lost City 切片 B 已完成：实现四个出生点、两个出口、38 个方向节点及十条路线，接入两组列车、40 个静态场景对象和 23 个 TDM 单位（档案全解锁时）；补上此前遗漏的 activity 5 Indian。`pnpm run typecheck` 与 map10、map08/map09、Tech Town、Fort Kaboom 地图/单位相关的 40 项定向测试通过。
- Lost City 切片 C 已完成：加入原版十波、29 个敌人请求池、四个玩家单位池及三个招募点、wave 1 库存/上限动作，并接入初始现金350、生命25、升级上限3、三档 HP 倍率与宝箱参数。6 项 map10 规则测试覆盖所有波次、生成入口、15秒开局延迟和无出敌结算；连同地图及相邻关卡回归共49项定向测试和类型检查通过。未完整模拟战役。
- Lost City 切片 D 已完成：加入 APK 原版简介、胜利标题、十段双语对白、头像及语音映射；从 APK 提取 Gunslinger/Mexican 原图；组装正式 level 10，要求完成 Railroad Ranch，Free Play 可直接以任意难度进入；四种特殊单位可见性进入内容版本与回放重建。补齐正式菜单介绍/结算标题及对白音频资产预加载。定向 40 项单测和类型检查通过；map10、map09、Free Play 与总菜单共 5 项 E2E 在独立端口通过。
- 首次 E2E 命令误连到默认端口上另一工作树的旧 Vite 服务，菜单只显示 7 个关卡并产生误报；已改用 `PLAYWRIGHT_PORT=4174`，确认本分支服务后通过。相关剪枝经验见[经验记录](experience-log.md#本地浏览器来源核对)。
- 完整 `CI=1 pnpm run test:ci` 已通过类型检查、523 项单测、生产构建和 133 项 E2E。首轮 E2E 曾因语音重试按钮的过期名称断言失败；模板、定位器已修正，专项用例与最终完整检查均通过。剩余工作是集成发布、核对部署 SHA 并做线上验收。

## Lost City 批次收尾

1. **完整检查。**再次运行 `pnpm run test:ci`；Playwright 使用空闲的专用 `PLAYWRIGHT_PORT`，避免复用其他工作树服务。若失败，先修当前批次并复跑失败项及完整 CI。
2. **集成发布与验收。**完整检查通过后按 Guns’n’Glory 规则 squash 集成发布，核对两个 Pages 的来源 SHA，再用内置浏览器检查 Free Play、正式解锁、开局对白、头像/声音资源及战场。窗口模式、静音，不完整通关。

**未知项处理：**已检索反编译生产源码，未发现 `awesomeMessageMin=30000` 对应消费者；保留未知且不作为内容接入阻塞项。APK 随机贴图的每次启动结果无需逐次复刻；网页沿用已验证的固定种子策略。
