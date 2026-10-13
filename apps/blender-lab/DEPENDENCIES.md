# Blender Lab 依赖与接入清单

本文用于记录本机建模工作区依赖、MCP 状态检查、3D 静态网页模板、安装命令和凭据边界。Blender Lab 自身仍是本地工作区；将来由它创建的成品应用才登记到导航站。

## 1. 依赖总览

| 依赖/服务 | 用途 | 认证 | 检查方式 | 状态/说明 |
| --- | --- | --- | --- | --- |
| Blender | 场景建模、Python 自动化、glTF/GLB 导出 | 本机应用 | `blender --version` | 当前连接版本为 Blender 5.3.0 Beta；Beta 适合实验，正式交付前应单独检查目标浏览器兼容性。 |
| Blender Lab MCP 扩展 | 在 Blender 内接收 MCP 连接 | 本机扩展，无独立账号 | Blender 中查看扩展启用状态；MCP `get_objects_summary` 可检查连接 | 当前活动 Blender 已启用 `bl_ext.blender_lab.mcp`。 |
| `blender-mcp` | 为编码 Agent 提供 Blender 场景工具的 stdio 服务 | 本机命令，无 API key | `command -v blender-mcp`；`pnpm run check:integrations` | 当前机器已安装；服务端命令和 Blender 内扩展需要同时可用。 |
| 3D Assets MCP | 搜索并获取可下载的 3D 素材 | 公开 API，无 key | 配置后在客户端 MCP 列表检查 `3d-assets` | 端点：`https://3d.shep.bot/mcp`。下载素材仍需核对来源及单项许可。 |
| Blendkit（原 BlenderKit） | 在 Blender 内搜索/下载模型、材质、HDRI 等 | 部分素材免登录；账号功能按需登录 | Blender 插件列表中查看 `bl_ext.user_default.blenderkit` | 已从官方站下载并安装 `3.21.3-261002`，当前 Blender 5.3 Beta 已启用。 |
| Node.js / pnpm | 运行 MCP 检查脚本及成品网页模板 | 无 | `node --version`、`pnpm --version` | MCP 配置脚本只用 Node 内置模块；web-3d 模板独立维护 Vite、TypeScript、Three.js 和 Playwright 依赖及锁文件。 |

## 2. 支持的编码客户端

脚本会检测以下命令是否存在，不会安装 Agent 本体，也不会自动改写所有客户端：

| 客户端 | 检测命令 | 配置范围 |
| --- | --- | --- |
| Codex CLI | `codex` | 用户级 Codex MCP 配置 |
| Claude Code | `claude` | `--scope user` |
| Gemini CLI | `gemini` | `--scope user` |
| OpenCode | `opencode` | `--global` |
| Cursor | `cursor` | Cursor 用户配置；不传 `--mcp-workspace` |

先列出客户端并检查现状：

```sh
pnpm run check:integrations
```

交互式选择要配置的客户端：

```sh
pnpm run setup:integrations
```

非交互式地只配置指定客户端；`--agent` 可重复传入：

```sh
pnpm run setup:integrations -- --agent codex --agent claude
```

脚本只为选中的客户端处理 `blender` 与 `3d-assets`。已存在且目标传输、命令/参数或 URL 匹配的条目保持不变；同名但配置不同的条目会被跳过并报告冲突，不覆盖现有配置。脚本不会回显 MCP 环境变量、认证头或 token。

`blender-mcp` 未安装时，脚本会报告缺项但仍可添加免密 `3d-assets`。安装 Blender MCP 与 Blender Lab 扩展后，重新运行检查并重启所选客户端，以加载新工具。

## 3. Blender 与 Blendkit

Blendkit 官方下载页提供 Blender 插件 ZIP，官方 GitHub README 说明可在 Blender 偏好设置中安装并启用。当前通过官方站下载 ZIP，并安装到 Blender 的 `User Default` 扩展仓库。Blendkit 官方说明部分免费素材可免账号浏览/下载；收藏、评分等账号功能需要登录。安装本身没有弹出登录流程，因此目前保持未登录状态；需要账号功能时再由用户在 Blender 插件界面完成登录。不要把 API key 或登录数据复制到项目中。

参考： [Blendkit 官方下载页](https://www.blendkit.com/get-blendkit/)、[官方 GitHub README](https://github.com/BlenderKit/Blendkit)、[官方排障文档](https://www.blenderkit.com/docs/add-on-troubleshooting/)。

当前环境检查结果：

- Blender 可执行文件：`blender`，版本 `5.3.0 Beta`。
- Blender Lab MCP 扩展：当前连接的 Blender 已启用。
- Blendkit：`bl_ext.user_default.blenderkit` 已启用，插件偏好设置中未发现登录凭据；本次安装未触发登录流程。
- MCP 服务：当前 Codex 已能看到 `blender` 和 `3d-assets`。对其他客户端先运行检查，再由用户显式选择。

## 4. 素材来源与许可

- **3D Assets**：公开 MCP，可搜索第三方模型/贴图资源。查看每个条目的来源、许可、作者署名和再分发限制；网页静态托管会公开下载内容。
- **Blendkit**：从官方插件/素材服务取用。逐个检查资产许可证和免费/付费状态；不要因插件可下载就默认素材可任意再分发。
- **Sketchfab**：当前不接入。下载 API 需要账号授权与 OAuth 应用流程，本地资源工作区暂不承担此接入复杂度。
- 每个纳入场景或网站的外部资源，应在项目的资产清单中记录来源 URL、作者、资源 ID、获取时间、许可证和署名要求。

## 5. 凭据与安全边界

- 公开的 3D Assets MCP 不需要 API key；安装脚本不会索取任何 key。
- 客户端个人登录态由对应 Agent/插件存放在各自的用户级配置目录。严禁复制到仓库、`apps/blender-lab` 的 `.env`、网页源码、`.blend` 场景、构建目录或 GitHub Pages/Cloudflare Pages 静态产物。
- 根仓库 `.gitignore` 忽略 `.env` 与 `.env.*`（保留 `.env.example`）；提交前可核实：

  ```sh
  git check-ignore apps/blender-lab/.env.local
  ```

- 若未来接入需要密钥的服务，先检查官方认证方式、用户数据存储位置和静态部署边界；密钥只能留在本机/客户端用户配置或服务端 Secret Store，不能放进浏览器可读取的变量。

## 6. 3D 静态网页模板

**templates/web-3d/** 是供 Agent 复制的独立静态应用模板，不登记到目录。它包含：

- Vite、TypeScript 与 Three.js；GLTFLoader 加载仓库内的 GLB，OrbitControls 提供基础旋转和缩放交互。
- 本地 Blender Python 生成脚本、场景合同文件和场景检查器。
- 素材许可清单验证、静态网页检查、Playwright 浏览器冒烟测试和独立 pnpm 锁文件。

Three.js 的 GLTFLoader 与 OrbitControls 是 Three.js 提供的 addons，需从 **three/addons/...** 显式导入；不需要另外安装 loader 或 controls 包。参考 [Three.js 安装与 addons 文档](https://threejs.org/manual/pages/installation.html)。

复制模板时：

1. 为新项目建立 **apps/<slug>**，先复制 **templates/web-3d/** 并把 package.json 的 name 改成项目专属名称。
2. 填写 **templates/idea/** 的文档；确认后复制 Markdown 到新应用的 docs/，将素材计划整理到 assets/manifest.json。
3. 更新项目标题、SceneSpec 和 scene-contract.json，再开始建模。
4. 在本机运行 Blender 生成/检查场景；页面应用自身运行 build/test:ci；最后登记到 **apps/catalog.json**。
5. 凭据只留在 MCP 客户端或 Blender 插件的用户级登录态。静态项目不得含密钥或依赖认证 API。

模板的默认网页预算为最多 250,000 个三角面、GLB 不超过 20 MiB、贴图最长边不超过 2,048 像素、JavaScript 总 gzip 体积不超过 256 KiB。每个 Idea 在审批规格时必须明确这些值；需要调整时由用户确认，不能为了通过检查而自行放宽。

## 7. 工作流命令与检查边界

Blender Lab 自身的 **pnpm run test:ci** 验证工作流文档模板、资产验证规则和 3D 网页模板。模板成品应用提供以下命令：

| 命令 | 作用 | 执行环境 |
| --- | --- | --- |
| **pnpm run generate:scene** | 从项目 Blender Python 脚本生成 .blend 和 GLB | 本机 Blender |
| **pnpm run check:assets** | 检查资产来源、许可、署名和本地文件路径 | 本机或 CI |
| **pnpm run check:scene** | 检查相机、网格、贴图、预算和导出 GLB | 本机 Blender |
| **pnpm run check:bundle** | 检查构建后 JavaScript gzip 总体积 | 本机或 CI |
| **pnpm run test:ci** | 运行资产/网页检查、单元测试、静态构建和浏览器冒烟测试 | 本机或 CI |
| **pnpm run check:release** | 合并运行素材、场景与 CI 检查，作为本地提交前门禁 | 本机 Blender 与浏览器 |

GitHub Actions 不安装 Blender：Blender 结构检查在 Agent 本机完成，CI 检查已经提交的 GLB、前端构建和浏览器加载。框架目录的代码改动会运行自身 CI 测试，但不会触发网站发布。只有注册的 **apps/<slug>** 成品应用才进入共享站点部署。
