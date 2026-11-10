# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)和[模拟与自动化契约](simulation-and-automation.md)。每轮先核对当前代码与专题审计，细化接下来可独立验收的切片；每完成一个切片就更新本计划、移除已完成项并本地提交。

## 当前状态

- 正式战役内容已实现 8/60 关：Cow Gulch、Apache Valley、Fort Kaboom、Tech Town、Billy Hills、Murdock Mountains、Lucky Lake、Cactusville。
- [Cactusville 静态审计](map08-static-audit.md)及五个 map08 实现切片已完成。Cactusville 已登记为 New Mexico 第 8 关，正式前置仅为 Lucky Lake；Free Play 可直接选择。
- `CI=1 PLAYWRIGHT_PORT=4174 pnpm run test:ci` 已通过：类型检查、483 项单测、生产构建和 129 项 Playwright E2E。构建仍有主 JS chunk 超过 500KB 的既有提示。
- 内置浏览器已在当前工作树验证 Free Play 的 8/10 关可选状态、Cactusville 困难难度、首波对白和战场地图；保持窗口模式与静音，未推进整关。
- **分支对照修正发布状态：**当前公开 `origin/master` 仍只有 4/60 关；远端 `origin/gunsnglory` 有最新实验室视觉修正，但也未包含 Billy Hills、Murdock Mountains、Lucky Lake 或 Cactusville。此前把 map06/map07 记为已发布的描述不符合远端代码，不能继续沿用。当前候选分支包含待公开的 map05–map08 内容及实验室羊皮纸底色修正；这次发布必须按这一完整候选范围审核，不能称为“只发布 map08”。
- 公开主分支当前基线为 11 次成功发布 / 44 个已验收实现切片。当前候选计划累计 65 个切片；若经提交历史复核仍为 65，则将 map05–map08 合并为一次发布后为 12/65（18.46%）。推送前需按发布历史复核这个计数并据实更新。
- 浏览器测试默认窗口模式、静音。优先用 APK/REA 静态证据；本轮不启动 Android、不启用全屏或音效、不完整推进关卡。

## map05–map08 待发布批次

所有实现切片已完成并通过定向检查：通用炸药、地图/路线/单位、关卡波次与对白、Awesome 击杀反馈、正式登记与 Free Play。内容版本会区分炸药及特殊地图单位的可见解锁快照；回放按记录的版本重建该快照。正式胜负结算写入 Progress，Free Play 结果不进入档案。

批次验证已完成；剩余工作是核清候选发布范围与比例、集成发布并核验部署：

- 用 Git 提交历史复核 44 个已公开切片和当前候选中的 21 个待发布切片，确认一次发布后比例；若总数与当前计划不符，先据实修正文档。
- 将已验收候选作为一个 squash commit 集成到 `master`，范围包括 map05–map08 与候选中已验收的实验室羊皮纸底色修正。不得遗漏 map05–07，也不得混入其他工作树的未提交 UI 改动。
- `git push origin master` 触发 CI/CD；等待成功后核对 Pages 部署的 `build-info.json` 来源 SHA 与预期提交一致，再用内置浏览器检查公开版本的四关入口、Cactusville 预览、困难难度、首波对白和代表性战场画面。窗口模式、静音，不完整通关。
- 发布验证完成后，将发布提交合并回 `gunsnglory` 并推送远端；更新相关工作树，使 master 与 origin/master、gunsnglory 与 origin/gunsnglory 对齐。未完成 SHA 核对、线上浏览器验收和分支同步前不得报告发布完成。

map08 共 5 个实现切片，均已完成。map05–map08 的公开状态以 `origin/master` 的代码和来源 SHA 为准；当前四关尚未出现在该分支，须作为一个经完整检查的待发布批次集成。发布前核对 44 个既有切片、21 个待发布切片及成功发布次数；任何计数与文档不符时，先校准比例再推送。
