# 3D Objects 应用约束

## 1. 开发、验证与发布顺序

所有改动都在独立功能分支完成，不直接在 `master` 上开发。交付顺序固定为：

1. 从 `master` 创建功能分支，在分支内实现改动。
2. 运行与改动范围匹配的检查；应用代码改动至少运行 `pnpm run test:ci`。涉及声明了 Blender 流程的场景时，还要运行 `pnpm run check:release`。
3. 检查 `git status` 和 `git diff`，确认只包含本次相关文件；运行 `git diff --check`。检查通过后再提交。
4. 将已验证的功能分支合并到 `master`。
5. 使用 `git push origin master` 推送主分支，等待现有共享站点 workflow 完成。
6. 部署完成后访问公开站点，对本次改动做线上实测并记录结果。

测试或构建失败时先修复并重新验证，不提交未通过的改动，也不提前 push 或进行线上验证。纯 Git 操作使用 `git` 命令。

## 2. 应用边界

- 应用是 Vue 3、TypeScript、Vite 与 Three.js 构成的纯静态站点，不增加运行时 API、数据库、Worker、CDN 依赖或浏览器端密钥。
- `objects/<slug>/` 是对象模块边界。目录名使用小写字母、数字和连字符，作为稳定对象 ID 和 `#/objects/<slug>` 路由。
- 每个模块必须提供 `manifest.json` 和固定入口 `DetailPage.vue`。模块自行决定详情页与交互形式，不要求所有对象使用 3D 查看器。
- 模块拥有自己的页面、样式、翻译、图片、模型、规格文档、测试，以及按需提供的素材清单、场景合同和 Blender 工具。
- 应用公共层只负责模块发现、目录卡片、详情路由、通用翻译接入、应用级预算与统一检查。新增对象不应要求修改已有对象、路由注册表、目录卡片或根部署 workflow。
- 保留 `#/objects/house` 路由。未知对象路由返回对象目录。
- 公共页头、项目侧栏、页脚和语言状态由 `@wishflow/site-shell` 提供。`index.html` 的 `data-local-nav` 只登记应用通用目录入口。

## 3. 对象模块接口

`objects/<slug>/manifest.json` 必须包含以下非空字符串字段：

| 字段 | 用途 |
| --- | --- |
| `title` / `titleZh` | 英文和中文名称 |
| `description` / `descriptionZh` | 英文和中文目录简介 |
| `category` / `categoryZh` | 英文和中文分类 |
| `thumbnail` | 相对模块根目录的 `thumbnail.svg`、`thumbnail.png`、`thumbnail.jpg` 或 `thumbnail.webp` 路径 |

`DetailPage.vue` 是必需入口。下列文件按模块能力选配：

- `locales.ts`：该对象详情页的中英文词条和动态翻译规则。
- `assets/manifest.json`：外部素材许可、作者、来源、署名、再分发状态及本地路径。
- `scene-contract.json`：场景对象名、模型路径和对象级性能预算。
- `blender/generate_scene.py`、`blender/scene.blend`：可复现的 Blender 源场景和生成流程。
- `tests/`、`docs/`：对象专属自动化检查、规格和设计说明。

所有模块资源使用相对模块根目录的路径，并通过 Vite 构建为独立静态文件。不要将运行时模型路径、场景预算或对象文案写入应用级路由和目录代码。

## 4. 素材、场景与页面要求

- 外部素材必须在模块的 `assets/manifest.json` 中记录来源、作者、许可、署名、再分发状态和本地文件；许可未知或不允许再分发时检查失败。
- Blender 脚本只处理所属模块的源文件和资源；不要用 Blender MCP 操作用户当前打开的场景替代项目生成脚本。
- `app-contract.json` 管理应用级 JavaScript gzip 预算；对象级场景预算写入所属模块的 `scene-contract.json`。
- 模型加载页面提供加载中、已加载和错误状态；失败时说明问题并提供可访问的重试入口，不能留空画布。
- 保持控件可访问、页面适配窄屏，并限制设备像素比以控制渲染成本。
- 页面文案接入 `@wishflow/site-shell` 的 `registerMessages`，不另建语言存储键或切换按钮。
- 在 macOS Codex 桌面应用中预览本地网页时使用 Codex 内置浏览器。CI 中的无头 Playwright 检查可以继续运行。

## 5. 命令

- `./scripts/install.sh`：安装独立 pnpm 依赖。
- `pnpm run dev`：启动本地开发服务器。
- `pnpm run check:assets`：发现并检查所有模块声明的素材清单，不要求 Blender。
- `pnpm run test:ci`：运行素材与模块合同检查、单元测试、类型检查、静态构建和 Playwright 浏览器回归，不要求 Blender。
- `pnpm run generate:scene`：遍历并生成声明了 `blender/generate_scene.py` 的模块场景。
- `pnpm run check:scene`：遍历并检查声明了 Blender 生成流程的对象场景，需要本机 Blender。
- `pnpm run check:release`：生成场景、检查 Blender 合同，并运行完整 `test:ci`。

## 6. 新增对象步骤

1. 在 `objects/<slug>/` 创建模块目录、双语 `manifest.json` 和 `DetailPage.vue`。
2. 在模块目录内添加缩略图，以及该对象所需的页面、样式、翻译、模型、文档和测试。
3. 如有外部素材，补齐 `assets/manifest.json`；如有 Blender 场景，补齐 `scene-contract.json`、生成脚本和源场景。
4. 运行 `pnpm run test:ci`；若模块声明 Blender 流程，再运行 `pnpm run check:release`。
5. 按本文件第 1 节完成分支验证、提交、合并、推送和线上实测。
