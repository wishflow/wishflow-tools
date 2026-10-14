# Plants vs. Zombies GOTY Web

浏览器端单机入口，目标是尽可能忠实运行 PC《Plants vs. Zombies: Game of the Year Edition》。当前网页把 PvZ-Portable 0.2.5 WebAssembly 运行时作为实际游戏；不再用手绘界面或 TypeScript 原型冒充原作画面。

## 启动与资源导入

本站不包含 PopCap/EA 的游戏资源。首次使用时，玩家需从自己拥有的 GOTY 游戏副本导入 **main.pak** 和 **properties/**：

- 可选择包含两者的 ZIP，或选择资源文件夹。
- 导入只在当前浏览器页内处理，资源不会上传到服务器。
- 刷新或重新打开页面后，需要再次选择资源文件。
- 游戏存档由 WASM 运行时写入当前站点的浏览器 IndexedDB；页面提供导入和导出存档 ZIP 的入口。

桌面使用鼠标。运行时保持原作 4:3 画面比例。移动浏览器通过 SDL 将触控映射为鼠标输入；上游没有做手机专用操作优化，因此移动端建议横屏使用。

## 架构

~~~~mermaid
flowchart LR
  Shell["@wishflow/site-shell"] --> Page["plants-vs-zombies 页面"]
  Page --> Frame["同源 iframe：PvZ-Portable WebAssembly 0.2.5"]
  Frame --> Import["本地导入 main.pak + properties/"]
  Import --> VFS["WASM 虚拟文件系统"]
  VFS --> Game["GOTY 运行时：原作菜单、模式、场景和游戏流程"]
  Game --> Save["IDBFS / 浏览器 IndexedDB"]
  Model["src/core TypeScript 模拟原型"] --> Hooks["注册表、规则钩子、种子与事件"]
  Hooks --> Unit["Node headless 单测"]
  Hooks -. 后续接入 .-> Simulation["simulation-testkit / 批量平衡模拟"]
~~~~

| 目录/模块 | 职责 | 当前边界 |
|---|---|---|
| **public/portable/** | 固定版本的 HTML、JavaScript、WASM、JSZip 和许可证文件 | 游戏资源不在目录内；runtime-manifest.json 记录版本与校验值 |
| **index.html、src/launcher.ts、src/runtime.css** | 接入公共站点外壳并嵌入同源运行时 | 不绘制或重建游戏菜单、单位和战场 |
| **src/core/、src/content/、src/modes/** | 无 DOM 的 TypeScript 规则/数据模拟原型 | 不驱动 WASM 实际游戏，不能当作逐项平衡已与原作一致 |
| **tests/、e2e/** | 模拟规则、运行时文件完整性及浏览器加载/导入流程 | 未导入真实游戏资源时不启动原作游戏或假造关卡 |

模拟原型提供稳定 ID、注册表、内部事件钩子、可替换规则、固定随机种子和无界面测试入口。后续数值模拟可继续完善此层，并接入 **@wishflow/simulation-testkit**。如果要求模拟结果与 WASM 实际规则逐帧一致，需要另行给 PvZ-Portable 引擎增加 headless 驱动/数据桥接，并用两侧一致性 fixture 校验；当前没有从 TypeScript 模型直接控制 WASM 的接口。

## 运行时版本与依赖

| 依赖 | 版本/来源 | 用途 |
|---|---|---|
| PvZ-Portable WebAssembly | 0.2.5；**public/portable/runtime-manifest.json** 记录上游 Release SHA-256 | PC GOTY 兼容游戏运行时；上游代码许可为 LGPL-3.0-or-later |
| JSZip | 3.10.1，随运行时本地托管 | 读取本地资源包和存档 ZIP；MIT 许可证 |
| TypeScript | 使用仓库现有配置 | 模拟原型和类型检查 |
| Vite | 使用子应用 lockfile | 开发、生产静态构建和预览 |
| Node **node:test** + **tsx** | 使用子应用 lockfile | 模拟规则与资源包完整性测试 |
| Playwright | 使用子应用 lockfile | 生产构建的桌面、资源导入和横屏浏览器回归 |
| **@wishflow/site-shell** | **file:../../packages/site-shell** | 共享页眉、页脚、项目导航和语言状态 |

不需要游戏服务器、账号服务、Worker、云数据库或第三方插件加载器。

## 开发与验证

~~~~bash
cd apps/plants-vs-zombies
./scripts/install.sh
pnpm run dev
~~~~

完整本地验证：

~~~~bash
pnpm run test:unit
pnpm run build
pnpm run test:e2e
pnpm run test:ci
~~~~

**test:e2e** 会先构建 **dist/**，再通过 Vite Preview 对生产文件运行 Playwright，验证：

- 页面加载同源的 HTML、JS 和 WASM，WASM 初始化完成。
- ZIP 导入能识别 **main.pak** 与 **properties/**，且运行时没有请求外部脚本 CDN。
- 手机横屏视口中导入控件可用，画布保持 800×600 原始尺寸并由上游页面缩放。
- 发布包哈希、版本和第三方许可证通知与 manifest 一致。

自动化测试使用最小临时 ZIP 只检查导入流程，不把它当成有效游戏资源。启动完整 GOTY 菜单、关卡及触控玩法需要由测试者在本机选择真实游戏文件；本站不会提供或留存该文件。

## 发布

应用在 **apps/catalog.json** 登记为 **/plants-vs-zombies/**，静态文件随共享站点发布到 **_site/plants-vs-zombies/**。沿用 **.github/workflows/pages.yml**；不创建新 Worker 或后端资源。

PvZ-Portable 的 WASM 文件约 7.2 MB，首访会由浏览器从本站静态路径加载。完整发布前应确认 CI 产物包含 **public/portable/** 全部文件、页面线上可达、资源导入不发出跨域上传请求，并在具备真实资源的浏览器中完成一次人工运行验收。

## 调研来源、许可与素材边界

| 来源 | 使用方式 |
|---|---|
| [PvZ-Portable 0.2.5](https://github.com/wszqkzqk/PvZ-Portable/tree/0.2.5) | 同源发布其 HTML/JS/WASM 静态构建，并保留上游 LGPL-3.0-or-later / GPL 文本、源码链接和本地补丁说明 |
| [Patoke/re-plants-vs-zombies](https://github.com/Patoke/re-plants-vs-zombies) | 反向工程关卡和行为研究；现有 TypeScript 模拟数据仍只作模型原型 |
| [FregD156/PvZ_Assets](https://github.com/FregD156/PvZ_Assets) | 仅核对资源目录结构；仓库自述其文件从原版 main.pak 提取，未发现覆盖原版素材公网再分发的许可，不打包其素材 |
| [JSZip 3.10.1](https://www.npmjs.com/package/jszip/v/3.10.1) | 本地提供压缩包解析脚本，随附 MIT 许可证文本 |

HTML/JS/WASM 只包含社区实现代码，不包含原作图像、音效、动画或字体。上游游戏资源由玩家本地导入，运行时仅在浏览器内存中读取。README 引用来源用于归属与追溯，不替代原作素材授权。第三方通知、许可证和校验值分别见 **public/portable/THIRD-PARTY-NOTICES.txt**、**public/portable/licenses/** 与 **public/portable/runtime-manifest.json**。
