# 实施计划

规则见[产品规格](spec.md)、[架构](architecture.md)、[存储契约](storage-contracts.md)、[模拟与自动化契约](simulation-and-automation.md)和[经验记录](experience-log.md)。每轮先核对当前代码与证据，再细化接下来几个可独立验收的切片；每完成一个切片就更新本计划、关闭已完成项并本地提交。

## 当前状态

- 公开版本正式战役接入 10/60 关；Traveller’s Town 已在本地 M11 批次登记为第 11 关，待本批完整验收与发布。游戏目录已列出 60 关；未实现的关卡在战役和自由模式中仍不可进入。
- Lost City（全球第 10 关）批次已通过完整本地检查并发布到 `master`，发布 SHA 为 `9e4b41f`；GitHub Pages 与 Cloudflare Pages 的构建来源 SHA 一致。最后一次批次检查通过 523 项单测和 133 项 E2E。
- `gunsnglory` 集成分支已包含该发布；当前集成基线为 `ac1a940`。Lost City 发布后普通发布比例为 14 次 / 73 个实现切片（19.18%）。Traveller’s Town 批次按 7 个实现切片计；发布后预计为 15 次 / 80 个切片（18.75%），低于 20% 目标。
- 下一批为 Mississippi 区域全球第 11 关 Traveller’s Town，使用 `res/raw/td_map_14.tdm`。地图文件编号与战役关卡编号不同；地图 11–13 不是战役关卡，不得顺延改用 map11。

## 下一批：Traveller’s Town

当前进行第 11 关内容批次：M11-A 静态审计、M11-B 地图/地形接入、M11-C1–C4b 路线与地图对象、M11-D1 参数规则、M11-D2 八波、M11-E1 对白/音频资源、M11-E2 解锁快照/回放版本及 M11-E3-A/B 正式接入均已完成并本地提交。M11-E3-B 接入关卡文案、对白/头像/语音展示、Mississippi 音乐路由，并验证正式结算与 Free Play 存档隔离。定向类型检查、9 项 M11 单测及 10 项受影响浏览器回归通过；新增中英文关卡入口与开场对白浏览器检查另通过。地图数据在 [mississippi-11.json](../src/content/mississippi-11.json)，静态证据与接入结果见 [map11-static-audit.md](map11-static-audit.md)。剩余工作转为 M11-F 批次验收、集成与发布。

M11-E3-A 定向检查通过：52 项相关单测及类型检查。覆盖第 10 关结算解锁第 11 关、Free Play 三档难度、后续未实现关卡状态，以及三种可达单位解锁快照的回放重建。

目标是按 APK/DEX 证据接入一关完整可玩的正式关卡：原始地图和 Mississippi 地形图集、全部路线与地图对象、关卡参数和八波、对白/头像/音频、战役解锁、自由游玩及回放版本。不得复制 Lost City 数值或用空壳素材填补缺失内容。测试和浏览器检查默认窗口模式、静音；不手动通关战役，不因习惯性核对而启动 Android。

### M11-F：批次集成与发布

首轮完整本地 CI 通过后，内置浏览器发现 Traveller’s Town Canvas 进入黑色恢复画面，提示有必需图像未加载。原因是关卡的动态内容未加入启动时的资源收集列表；贴图文件本身均存在。M11-F 按以下顺序关闭：

1. **补齐关卡资源预加载（已完成）。**将所有单位解锁状态下的 `createMississippi11CampaignContent()` 纳入 `assetNames` 来源集合，使背景、道路、装饰、列车和蒸汽船贴图随游戏资源一同预加载。扩展 `t49-mississippi-11-integration.spec.ts`，在开场对白及继续进入战斗后断言 `asset-load-error` 隐藏。定向 E2E 1 项、类型检查通过；本地内置浏览器桌面画面确认地形、对象和列车正常显示。
2. **定向与完整检查（已完成）。**资源修复后的 M11 定向 E2E、类型检查及最终 `CI=1 PLAYWRIGHT_PORT=4195 pnpm run test:ci` 均通过：561 项单测、生产构建、134 项 E2E。构建保留既有 1.385 MB JS chunk 警告。Playwright 使用 `CI=1` 并指定独立 `PLAYWRIGHT_PORT`，避免复用其他 worktree 的旧服务器。
3. **桌面及窄屏验收（已完成）。**内置浏览器在桌面窗口模式、静音下验证 Free Play 进入 Traveller’s Town、首波对白及地图渲染，黑色恢复画面和错误提示均消失。`t49-mississippi-11-integration.spec.ts` 另在 390×844 视口断言无横向溢出、游戏框与 Canvas 边界有效、对白在框内且资源错误提示隐藏；未使用全屏或声音。
4. **集成与发布。**检查 M11 分支相对 `gunsnglory`/`master` 的完整差异。整批验收通过后按应用流程 squash 集成到 `master` 并发布；核对 CI 成功以及 GitHub Pages、Cloudflare Pages 暴露的构建 SHA，再合并发布提交回 `gunsnglory`。来源 SHA 不一致或公网/CI 不可达时，发布保持未完成并记录具体阻塞。
