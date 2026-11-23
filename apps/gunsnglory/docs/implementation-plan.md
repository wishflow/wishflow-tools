# 实施计划

本文件只维护当前实施基线与尚未开始的工作。每轮开始先核对代码、APK 专题审计和测试状态，再细化后续步骤；每个切片结束后关闭已完成项。已完成步骤的实现细节保留在代码审查、逐关静态审计和 Git 提交历史中，不继续堆在活动计划里。

## 当前基线

- **M36–M39 连续关卡批次已完成并发布：**Dakota Level 35 Ghost Town、Level 36 Ice Rocks、Level 37 Frost Station 和 Level 38 Wayne Waters。共33个实现切片，分两次公开发布。
- **最新发布：**M39 squash 提交 `7dcb8caabc436778e6880b26759e57dbb7898f7b`；GitHub Actions run `44703168213` 成功。GitHub Pages 与 Cloudflare Pages 的根 `build-info.json` 均返回该来源 SHA。
- **完整检查通过：**`CI=1 PLAYWRIGHT_PORT=43179 pnpm run test:ci` 通过类型检查、1135 项单测、生产构建及203项 E2E；`pnpm run test:catalog` 通过18项。构建仍有既有的 JavaScript chunk 超过500KB提示，本批未改拆包策略。
- **内置浏览器验收通过：**发布页面保持窗口模式和静音，从主菜单进入 Free Play → Dakota → Wayne Waters（Level 38）→ Medium；核对地图、Captain 首波对白与头像，关闭对白后进入 Wave 1/8；缩放从1×到1.25×并复位；暂停后退出未完成的自由模式并返回主菜单。未通关、未进入全屏、未播放音频，也未启动 Android。
- **发布频率：**M35 后基线为43次发布 / 233个实现切片；M36–M38 增加28个切片和一次发布，M39 再增加5个切片和一次发布，累计为 **45/266 = 16.9%**，低于20%目标。静态审计、文档整理、批次检查和分支回同步不计入实现切片。
- **已接入内容的证据入口：**[Ghost Town 静态审计](ghost-town-static-audit.md)、[Ice Rocks 静态审计](ice-rocks-static-audit.md)、[Frost Station 静态审计](frost-station-static-audit.md)、[Wayne Waters 静态审计](wayne-waters-static-audit.md)。新实现继续以对应 APK 原始资源和 Smali 为最终依据；REA/JADX 摘要、旧计划和经验条目仅作检索线索，结论冲突时回到原始证据复核。Wayne Waters raw 78 的作者意图仍未知，但没有专属对象/道路分支，不阻塞网页实现。

## 本轮四项核对结果

1. **雇佣弹窗：已修复。**已按 APK 恢复单位肖像、名称、介绍、单独价格，以及余额不足时的专属台词和确认按钮状态；对应映射、真实入口及两种余额状态已有定向测试。
2. **Cannon 炮弹：已修复。**damageStyle 4 使用 APK 的 `sfx_cannon_ball` 原图，命中后使用爆炸序列；普通弹丸回退不变。图像与 APK mdpi 资源逐字节一致，绘制尺寸、锚点和命中行为已有定向测试。
3. **马车与马：核对后确认是两个对象，不是贴图丢马。**APK 分别创建并绘制 horse 和 wagon；网页两种对象及其资源都存在。Cow Gulch、Dakota 和 Mississippi 的短会话截图中，两者直行及转弯时均可见；转弯过程可能因一格间距短暂呈斜向分离，不能将它们误作单张合成图。
4. **敌方路线与峡谷边缘：未发现路线中心进入悬崖墙格。**逐格核对当前接入的38张地图，中心线由 TDM 路标生成，落在道路、桥梁和对应转向标记上；部分路段紧邻峡谷贴图。较高单位贴图会越过脚底所在格显示，APK 与网页的脚底锚点和车辆绘制偏移一致。现有证据不支持为消除贴图边缘重叠而移动路径或改变规则。

## 本轮剩余：批次完整验收

- **应用完整检查已通过：**`typecheck`、`test:unit`（1138项）、生产构建和 `test:e2e`（203项）全部通过。`test:ci` 的首次 E2E 启动被沙箱的 localhost 监听限制阻止；在获准本地监听后单独重跑 E2E 通过。构建仅有既存的 JavaScript chunk 超过500KB提示。
- 本地浏览器已在窗口模式、静音下检查 covered-wagon 直行/转弯，以及 Cashcow Canyon、Riverside Mountains、Fort Knockout 的路线中心叠图；雇佣入口与 Cannon 弹丸由真实会话 E2E 和 renderer/session 定向测试覆盖。没有启动 Android。
- **剩余：**检查本轮体验记录、Markdown 链接与 diff；随后按应用流程 squash 集成、发布，核对 Actions 和公开构建来源 SHA，再以内置浏览器检查部署版。发布次数按完整修复批次计。

## 批次执行约束

- 每个切片运行相关定向测试并本地提交；一组计划步骤全部结束后运行一次 `test:ci` 和适用的共享检查。失败在当前批次内修复，并重跑失败项及最终完整检查。
- 公开发布按完整功能批次进行，不为单关或单切片单独发布。通过 CI 后核对 Pages 来源 SHA，再以内置浏览器验证该批代表性菜单入口和开局流程。
- 默认窗口模式、静音；只有对应验收需要时才进入全屏或启用音效。只在静态证据不能回答具体问题时，设计最小 Android 定点观察；不完整游玩或通关。
- 新增正式关卡时，除新关自身外，还需搜索并更新正式阶段数组、Progress 投影、关卡总数、地区可玩数、Free Play 边界、回放工厂、E2E 历史 fixture 和启动资源收集器。
