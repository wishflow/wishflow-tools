# Guns’n’Glory 问题经验记录

本文记录本应用已复现问题和需要防止重演的工程经验，供开发 agent 阅读，也供后续调整项目约束时参考。按问题所属模块组织，不按日期排列。

## 记录规则

每个问题关闭时记录：

1. **表现与复现：**用户看到什么、从什么界面状态和操作顺序可以复现。
2. **根因与证据：**指向具体代码、样式、测试或浏览器观察；推测必须标为假设，未核实前不写成事实。
3. **漏测点：**此前的测试为何未发现，或错误断言了什么。
4. **修复与防回归：**改了什么、增加了哪条可重复的自动或浏览器验证。
5. **避免重复：**记录已经排除的路径及原因，只保留后续执行者可复用的信息。

修复未完成的问题可以先登记为“待验证”；实现和运行验证结束后，应在同一条记录中补充结论。记录根因时优先引用稳定的文件/选择器/测试名称，不抄录冗长日志、日期或散列值。

## UI 图层与全屏弹窗

**状态：已关闭。**弹窗图层、按钮样式、同语言布局和手机输入已通过本地完整检查，修复通过[手机工具栏部署检查](https://github.com/wishflow/wishflow-tools/actions/runs/42459138730)与[补充发布检查](https://github.com/wishflow/wishflow-tools/actions/runs/42460770199)。最终部署提交为 `50289f2`；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配。内置浏览器窗口模式、静音实测确认战役退出弹窗可打开；浏览器拒绝 Fullscreen API 后提示不遮挡标题/正文，Keep playing 可关闭弹窗并恢复战斗。该宿主拒绝真实全屏请求，因此本轮未验证成功进入/退出原生全屏；自动化 mock 只验证应用状态和布局逻辑。

> 本节是已发布 CSS/可见性修补的历史记录，不是当前 UI 架构约束。其“将全屏控件移入 `showModal()`”做法已被后续重构计划废止；当前要求见下文“原版 UI 流程与状态管理”。

### 当前证据

- `.game-frame:has(dialog[open])` 原先会隐藏全屏按钮和状态提示；这是弹窗期间无法使用页面全屏按钮的直接原因。Gambler E2E 还把该错误行为断言为正确，已改成断言按钮仍可见。
- 全屏开关改为独立控制组并置于最高游戏层；普通 `.show()` 弹窗与帮助、遮罩、舞台的层级经 `elementFromPoint()` 和真实点击核验。遮罩位于弹窗下方且仍拦截画布。
- 战役退出由 `showModal()` 打开。原生模态框会令框外内容 inert，因此只提高 `z-index` 无效。打开前将全屏控件组移入模态框，`close` 事件后移回游戏框；`t30-fullscreen.spec.ts` 已验证切换前后弹窗可交互、全屏控件位置可还原。
- 战役退出框原先没有在舞台内定位；全屏定向测试测到其按钮超出视口。现已居中并限制最大高度。
- 实际结算的“Campaign map”动作原先保留结算面板，导致菜单仍被结算层盖住。现在进入菜单会隐藏已结算面板；定向 E2E 已真实跑完单波结算、进入全屏检查按钮命中、退出全屏并点击返回菜单。
- 图层与全屏定向检查：`t30-fullscreen.spec.ts`、`t34-tech-town-gambler.spec.ts`、`t37-tech-town-formal.spec.ts`、`t04.spec.ts`、`t20-campaign-progress.spec.ts` 共 19 项通过。自动化使用 Fullscreen API mock 验证状态流转；公开版本在内置浏览器中的原生全屏请求被宿主拒绝，故本轮未验证成功进入/退出原生全屏。
- 定向验证：图层切片的 19 个 E2E 通过；按钮/布局切片的 `t09-pause.spec.ts`、`t30-fullscreen.spec.ts`、`t34-tech-town-gambler.spec.ts` 共 13 个 E2E 通过。远端 `t22-playfield-focus.spec.ts` 两次失败后，测试在失败时输出坐标和计算样式。Actions `42458377072` 的 Linux Chrome 实测：390px 竖屏下操作区从 x=29.1875 到 284.8125（宽 255.625px），Pause、Campaign 和 Clear selection 的右边界分别为 122.1875、189.75、286.5；Clear selection 溢出 1.6875px。计算样式内边距每侧 1.6px。将三颗主按钮的每侧内边距从 `0.1rem` 降至 `0.05rem`，预计总计收窄 4.8px；手机标题覆盖层与工具栏位置保持不变。修复后 `t22` 与 `t09-pause` 共 7 项定向检查、类型检查和完整 `pnpm run test:ci`（399 单测、103 E2E、生产构建）通过。将标题移到正常布局流的实验导致 9 项手机触屏地图用例失败，已撤回；回退相关 `t01`、`t06`、`t08`、`t10`、`t22`、`t25` 共 17 项 E2E 通过。Linux CI 实测工具栏越界修复后，后续 `pnpm run test:ci`（399 单测、104 E2E、生产构建）与两次发布 Actions 均通过，最终部署来源 SHA 与公开 `build-info.json` 一致。保留失败时的几何日志，方便未来发现类似平台差异。Vite 主 JS chunk 超过 500KB 的警告不影响构建或测试。

## 普通弹窗样式与工具栏布局

- 战役退出框按钮原先未命中 `.recruit-confirmation button` 选择器，显示浏览器默认外观。现在战役退出、招募/地图雇佣/升级/Gambler 确认框和结算动作共用按钮底色、边框、字体、悬停、禁用及键盘焦点规则；波次羊皮纸和战役菜单的专属表现未改。`t30-fullscreen.spec.ts` 对这些按钮的计算样式做等值比较，并检查焦点和禁用状态。
- Pause 与 Resume 曾按各自文本决定宽度，状态切换会影响工具栏布局。`syncPauseButtonWidth()` 按当前语言用 Canvas 测量两种标签，叠加当前按钮字体、内边距和边框后固定宽度；容器缩放或语言切换时重新计算。`t09-pause.spec.ts` 在桌面/手机宽度及中英文下比较 Pause 与 Campaign 的位置，并检查按钮都在游戏框内且互不遮挡。
- 本地内置浏览器截图发现全屏图标同时来自按钮文本 `⛶` 和 `.game-frame-fullscreen-toggle::before`，形成重复小图标；移除伪元素，保留按钮文本，并在 `t30-fullscreen.spec.ts` 断言伪元素不再绘制。此前的自动化只看按钮可见性和 accessible name，没检查图标是否重复，今后完成控件视觉切片时需查看真实浏览器截图。
- 一次布局 E2E 失败不是产品位移：切换语言时点击页眉语言按钮把页面滚到顶部，下一次 Playwright 点击又把画布滚回视口，导致测试把不同页面滚动位置下的屏幕 `y` 坐标当成控件跳动。修正为每次测量前先 `scrollIntoViewIfNeeded()`；布局比较需先归一化页面滚动，再比较边界。
- Pause/Resume 固定同宽后，GitHub Actions 的手机竖屏检查只差 1.6875px，但“按钮可见”和“无遮挡”断言无法指出具体哪颗按钮越界。失败时记录所有主按钮边界、操作区边界、字体和内边距，避免猜测。缩小三个主按钮每侧内边距 `0.05rem` 后回收 4.8px，并保持工具栏原位置；移动标题的较大改版会让覆盖区挡住触屏地图，完整回归发现后已撤回。后续工具栏变更要同时验证精确边界、触屏地图输入与 CI/Linux 390px 竖屏。
- 内置浏览器在公开版本 `2cf6bd8` 的弹窗复核中，战役退出框内点击全屏后，IAB 宿主拒绝 Fullscreen API 并显示提示；截图显示提示盖住弹窗标题。根因是失败提示在顶部控件组下方纵向占位。修复在提示出现时将控件组改为顶部横向排列，图标在右、提示在左；`t30-fullscreen.spec.ts` 检查提示与标题矩形不相交，并实际点击 Keep playing。修复发布到 `50289f2` 后在内置浏览器复验：标题和正文未被覆盖，Keep playing 关闭弹窗后战斗控件恢复可用。该宿主拒绝原生全屏，因此自动化 Fullscreen mock 和浏览器拒绝场景都不证明真实浏览器成功进入全屏。

### 防回归要求

- 不以“元素可见”代替交互验证：对关键控件检查命中目标，并实际点击确认按钮产生预期结果；当前定向 E2E 已覆盖此路径。
- 全屏控制不得因游戏弹窗打开而被隐藏、搬动或被遮罩挡住；全屏状态变化必须保留当前覆盖层及模拟状态。游戏内面板使用受 `.game-frame` 约束的 OverlayHost，不使用会让整页进入 top layer 的 `showModal()`。
- 帮助框、遮罩、弹窗和全屏控制应遵循 `.game-frame` 的层级变量。遮罩拦截底层但不能盖住弹窗。
- 同一语言中的状态文案变化不应导致按钮或相邻控件跳动；语言变化可以重排，但不得造成溢出或遮挡。
- 同时覆盖窗口模式与真实全屏。用内置浏览器验收时，先确认页面构建来源 SHA 与待测代码一致。

## 原版 UI 流程与状态管理

**状态：本地 UI 重构实现及完整检查完成；整批发布与公开 SHA 验收待完成。**`CI=1 pnpm run test:ci` 通过 409 项单测、生产构建与 117 项 Playwright E2E。内置浏览器窗口模式视觉检查通过；实际请求原生全屏时宿主拒绝，显示浏览器全屏控制提示，故真实全屏转换未验证。当前公开版本尚未包含本批次；发布前必须核对 `build-info.json` 来源 SHA。原始脏工作树未被改写，本轮在隔离工作树完成实现与本地浏览器检查。

### 已证实的 APK 流程

- `MainMenuScreenActivity.onStartButtonClick` 进入地图选择；`onHelpButtonClick` 进入独立 Help 页；`onOptionsButtonClick` 调用 `GameActivity.showOptionsDialog`；声音入口切换档案中的声音设置。
- `GameScreenActivity.onPauseButtonClick` 调用 `displayDialog(4)`；战斗中的 Android Back 键在没有活动对话框时也打开同一个暂停面板。
- `GameScreenActivity.onPrepareDialog(4)` 为暂停面板注册 Continue、Restart、Options、Close、Sound。Options 调用 `showOptionsDialog()`，未关闭暂停面板；Restart/Close 分别打开确认 ID 6/5。取消确认仅关闭确认面板，父暂停面板仍保留。
- `GameActivity.showOptionsDialog` 创建 `dialog_options`，声音/震动设置在该面板中；平台隐私入口属于网页移除的平台/广告相关内容。HelpScreenActivity 的左右按钮翻页，边界按钮返回主菜单。
- `GameScreenActivity.displayDialog` 会停止游戏线程。游戏内招募、升级等面板必须按具体调用路径确认何时暂停、何时恢复；不将所有 UI 状态推断为“游戏继续运行”。以上为 APK 静态 DEX/JADX 观察，不代表 Android 实机运行记录。

### 本轮结构修正

- `GameUiController` 是页面路由和面板返回栈的唯一所有者；纯 TypeScript 事件处理页面、面板及 Help 页码。模拟状态仍只由 `GameSession` 持有，全屏状态仍由 `FrameChromeController` 根据浏览器事件持有。
- 页面模板、Options/Help 内容、FrameChrome 和 OverlayHost 分置在 `src/ui/game-page-template.ts`、`menu-panels.ts`、`frame-chrome.ts` 与 `overlay-host.ts`。`main.ts` 仍负责应用副作用和业务事件接线，不再从面板 `hidden` 状态重建页面路由。
- OverlayHost 只接收控制器生成的显示列表，不保存面板导航栈。暂停板→Options 保留不可操作的暂停板底层；Help 显示为单独页面，控制器保留它的调用路径，返回后恢复 Options/暂停板。档案替换确认显示在 Options 内的游戏框中。
- 过去 Options 关闭暂停板并用菜单页替代原生选项面板，造成返回路径断裂；现在暂停板仍暂停并留在 Options 下方。`t09-pause.spec.ts`、`t29-campaign-menu.spec.ts`、`t23-campaign-wave-intros.spec.ts` 和 `t40-frame-controls.spec.ts` 从真实菜单/HUD 入口核验该路径。

### 重构约束与防回归

- 单一 `GameUiController` 持有页面、唯一活动面板和显式返回目标；GameSession 独占模拟状态；FullscreenController 仅响应浏览器 `fullscreenchange`。OverlayHost 只负责遮罩、挂载、焦点和输入阻断，不保存第二份面板栈。
- 暂停板 Options 必须叠在暂停板上方；Help 从 Options 进入并逐级返回 Options、暂停板或菜单。确认取消返回父面板且保持会话暂停；全屏切换不改变 UI 或模拟状态。
- 所有面板限制在固定 16:9 `.game-frame`，不调用 `showModal()`、不搬动 FrameChrome、不允许遮罩覆盖全页。只允许一个面板可交互，叠层中的父面板不可点击。
- 原版木牌、羊皮纸、确认按钮和特殊面板保留各自美术；新增 Free Play、网页操作说明、倍速和档案也使用原版风格与返回关系。常规战斗无通用控制条；桌面缩放辅助控件位于地图边缘，触屏保留手势。
- 关键测试必须从真实入口操作，检查状态、返回目标、底层阻断与 `elementFromPoint()` 命中；仅见到 DOM 或仅使用调试路线不算流程验收。浏览器默认窗口模式、静音；全屏仅用于全屏专项验收。

### Help/Options 素材与手机布局

- **表现与复现：**Help 从 Options 打开后，暂停/选项两个父面板仍同时显示，造成多层边框和重复返回箭头；Options 的说明文字横跨高分牌资源右侧的头像装饰区。手机竖屏下，常驻档案和实验内容让 Options 高度超出羊皮纸。
- **根因与证据：**高分牌 `gng_highscore_0_box.png` 是左侧文字区加右侧肖像框，不适合承载横跨整卡的选项文案；Options 和 Help 被当作可见叠层，未按“保持返回状态、替换当前页面”的 Help 语义渲染。Playwright 390×844 初测测得 Options 内容 `scrollHeight=353`、面板 `clientHeight=180`；将档案折叠后仍有 217/180px 溢出。截图与几何结果均在本地隔离工作树检查。
- **修复与防回归：**Options/Help 改用原版 `gng_hud_2_textbox_large.png` 羊皮纸；Help 打开时只绘制 Help，返回时恢复 Options，Options 的调用暂停板继续留在 Options 下面。实验与档案收在可展开区，手机窄屏压紧 Options 间距；Summary、档案操作和实验按钮沿用原版木按钮图。`t29-campaign-menu.spec.ts` 检查资源背景，`t40-frame-controls.spec.ts` 检查桌面、390×844 竖屏、844×390 横屏的英文/中文面板边界、内部溢出及 Help/Options 返回状态。
- **漏测点：**此前只核对 Help 与 Options 各自能打开、并断言按钮可见；没有检查它们同时出现时的视觉重复，也没有把整张选项卡的文本边界与底图留白区域对照。手机测试只检查外框，没有测内部滚动高度。
- **避免重复：**为带肖像分区的原版资源先看实图再选择用途；嵌套页面测试必须同时断言“调用面板是否应该继续可见”与返回后恢复。移动版内容容器需比较 `scrollHeight/clientHeight`，不能只比较整个页面的 `scrollWidth`。

### 本地浏览器来源核对

- **表现与复现：**多个 Vite 服务同时监听默认端口时，内置浏览器可能连到旧工作树，即使测试代码来自新的隔离工作树。
- **根因与证据：**本地已有服务占用了 5175；本轮首次检查发现被服务的源码目录与当前实现工作树不同。隔离实现改用严格端口 `5189`，并检查内置浏览器地址为 `http://localhost:5189/`，再查看实际菜单、Options 与 Help 截图。
- **防回归：**开启本地浏览器验收前先检查监听端口对应的服务来源；测试/浏览器端口使用专用端口且启用 strict 模式，确认标签 URL 对应本次工作树后再评价 UI。旧标签和旧 `dist` 不能作为新源码的证据。

### Options 遮罩与菜单声音测试顺序

- **表现与复现：**完整 E2E 中，自由模式用例打开 Options 后直接点击其下方主菜单的 Sound 按钮，Playwright 等待点击超时。
- **根因与证据：**这是过时的测试操作顺序，不是声音按钮失效。Options 属于游戏框内活动面板，OverlayHost 的遮罩会阻断底层主菜单；测试失败快照显示 Options 仍为活动界面、焦点在其返回按钮。暂停/对话面板期间也应遵守同一输入阻断规则。
- **漏测点：**旧测试只按“按钮仍可定位/可见”推断可点击，没有把活动面板的遮罩命中规则纳入前置流程。
- **修复与防回归：**更新自由模式用例，先从 Options 返回主菜单，再切换 Sound，随后重新打开 Options 检查保存状态；主菜单导航的重复 `campaign-menu-back` 测试标识按当前活动容器限定。面板打开时的底层控件必须通过真实点击命中测试，不能从遮罩下操作。

### 倍速入口迁移后的长关卡用例

- **表现与复现：**完整 E2E 的 Apache Valley 与 Fort Kaboom 长关卡用例在战斗中查找 `Simulation speed` 滑块，超时后仍停留在对白/战斗状态。
- **根因与证据：**UI 重构已按产品约束把倍速收进 Options；旧测试仍依赖已移除的常驻工具栏。定向重跑确认用例本身的核心战斗流程和规则可通过。
- **漏测点：**只更新了菜单与工具栏可见性断言，没有迁移依赖旧倍速位置的正式长流程用例。
- **修复与防回归：**新增 E2E 辅助流程：从 HUD 打开暂停板，进入 Options 设置倍速，返回仍暂停的暂停板，再继续模拟。Apache Valley、Fort Kaboom 两条完整关卡用例均按此路径并行外串行通过；后续设置入口迁移时搜索并更新所有调用点。

### 内置浏览器的原生全屏能力

- **表现与复现：**本地 `http://localhost:5189/` 的 Options 打开时，点击固定 FrameChrome 全屏按钮没有进入浏览器全屏。
- **根因与证据：**页面显示“Could not enter fullscreen. Use your browser’s fullscreen control instead.”；只读页面检查确认 `document.fullscreenElement` 仍为空，而 Options 面板保持可见。该结果表明当前内置浏览器宿主拒绝 Fullscreen API 请求，不构成应用已成功进入全屏的证据。
- **漏测点：**自动化 Fullscreen mock 可以验证应用响应和画面几何，但不能证明宿主允许真实浏览器全屏。
- **修复与防回归：**不改变失败恢复行为；记录真实全屏实测受宿主限制。自动化继续验证状态变化和面板保留；若之后宿主提供全屏能力，再单独执行窗口↔全屏转换实测。当前不得把 mock 描述为真实全屏验证。

### 升级确认说明在手机画框内被截断

- **状态：已关闭。**`t08.spec.ts` 通过手机视口检查升级详情的 `scrollHeight <= clientHeight`，并执行按钮命中。
- **表现与复现：**390px 竖屏打开升级确认，详情文本需要 50px 高，flex 布局只分配 46px，末尾内容出现内部滚动/裁切。
- **根因与证据：**`.game-original-confirmation` 的默认内容上下内缩量与底部 28% 按钮区在短画框内共同挤压详情段落。Playwright 读取到 `scrollHeight=50`、`clientHeight=46`，不是字体资源加载失败。
- **漏测点：**原用例只断言文字存在，没有检查可视文本是否完整。
- **修复与防回归：**仅扩大 `.upgrade-confirmation .game-confirmation-content` 的垂直区域，不改弹窗图像比例；手机 E2E 断言 `scrollHeight <= clientHeight`，并继续检查操作按钮命中。

### 普通战斗仍显示开发控制栏

- **状态：已关闭。**`t29-campaign-menu.spec.ts` 与 `t40-frame-controls.spec.ts` 从正式菜单/HUD 入口确认普通战斗无通用工具栏；倍速只从 Options 调整。
- **表现与复现：**从普通主菜单进入 Cow Gulch 并关闭开场对白后，游戏框底部仍出现 `Game controls` 折叠栏、`Clear selection`、测试用开波/招募入口和倍速滑条；这不是 APK 战斗 HUD。
- **根因与证据：**`showBattleScene()` 无条件执行 `gameToolbar.hidden = false`；该容器同时承载测试操作和网页倍速。内置浏览器在不带 `testBattle` 参数的正常战役流程中直接观察到该面板。此前计划误把移除 Pause/Resume、Campaign 和文字 Sound 当成整个控制栏已删除；`t29` 还断言普通战斗工具栏可见，错误固化了现状。
- **修复与防回归：**普通战斗移除通用开发工具栏，专用调试入口仍隔离；倍速移入 Options 并经暂停板调用。E2E 从正式菜单进入并断言无通用控制条。

### 手机地图缩放控件遮住 Canvas HUD 暂停图标

- **状态：已关闭。**`t40-frame-controls.spec.ts` 检查桌面缩放控件边界与命中、手机竖屏/横屏隐藏按钮并可用原版 HUD 暂停入口；`t10-camera.spec.ts` 覆盖触屏捏合缩放。
- **根因与证据：**Canvas HUD 和地图按固定1024×576逻辑画布缩小；网页缩放控件则按 CSS 像素维持近似固定尺寸。桌面左上角不与 HUD 暂停按钮重叠，但窄画框会让按钮变成地图上的大块覆盖；390px触屏竖屏中还会覆盖暂停图标。内置浏览器截图确认下移左下虽然避开 HUD，却会挡住地图路线。项目契约已明确桌面使用网页缩放按钮、触屏继续使用捏合缩放。
- **漏测点：**此前只检查控件是否在画框内，没有区分桌面与触屏入口，也没有验证固定 CSS 控件在缩小地图上遮挡可玩区域。桌面视口无法暴露控件与触屏 HUD 的冲突。
- **修复与防回归：**桌面按钮放在 `.game-stage` 边缘，在窄框/触屏设备隐藏；触屏继续捏合，桌面滚轮缩放保留。测试检查控件边界、命中目标、缩放动作及手机捏合，避免按钮压住地图或 HUD。

### 手机竖屏波次对白的角色遮住正文

- **状态：已关闭。**`t40-frame-controls.spec.ts` 在桌面、390×844 手机竖屏及 844×390 手机横屏检查对白角色与正文矩形不相交、内容及按钮完整位于游戏框内。
- **根因与证据：**基础对白用顶部居中立绘和下方文本；`@media (max-width: 600px)` 将立绘尺寸放大并把文本区上移，立绘仍盖在正文上。当前 `t40` 只检查对白面板在 `.game-frame` 内，没有检查角色与正文矩形是否相交。
- **修复与防回归：**窄屏 Pedro 立绘放入左侧槽位，正文从右侧开始。跨视口 E2E 计算立绘/文本边界，要求无交叠、无裁切且对白完整位于游戏框内。
