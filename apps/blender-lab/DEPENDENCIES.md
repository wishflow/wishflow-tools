# Blender Lab 依赖与接入清单

本文用于记录本机建模工作区依赖、MCP 状态检查、安装命令和凭据边界。项目目前是本地工作区，没有网页 UI、静态发布或导航站登记。

## 1. 依赖总览

| 依赖/服务 | 用途 | 认证 | 检查方式 | 状态/说明 |
| --- | --- | --- | --- | --- |
| Blender | 场景建模、Python 自动化、glTF/GLB 导出 | 本机应用 | `blender --version` | 当前连接版本为 Blender 5.3.0 Beta；Beta 适合实验，正式交付前应单独检查目标浏览器兼容性。 |
| Blender Lab MCP 扩展 | 在 Blender 内接收 MCP 连接 | 本机扩展，无独立账号 | Blender 中查看扩展启用状态；MCP `get_objects_summary` 可检查连接 | 当前活动 Blender 已启用 `bl_ext.blender_lab.mcp`。 |
| `blender-mcp` | 为编码 Agent 提供 Blender 场景工具的 stdio 服务 | 本机命令，无 API key | `command -v blender-mcp`；`pnpm run check:integrations` | 当前机器已安装；服务端命令和 Blender 内扩展需要同时可用。 |
| 3D Assets MCP | 搜索并获取可下载的 3D 素材 | 公开 API，无 key | 配置后在客户端 MCP 列表检查 `3d-assets` | 端点：`https://3d.shep.bot/mcp`。下载素材仍需核对来源及单项许可。 |
| Blendkit（原 BlenderKit） | 在 Blender 内搜索/下载模型、材质、HDRI 等 | 部分素材免登录；账号功能按需登录 | Blender 插件列表中查看 `bl_ext.user_default.blenderkit` | 已从官方站下载并安装 `3.21.3-261002`，当前 Blender 5.3 Beta 已启用。 |
| Node.js / pnpm | 运行 MCP 客户端检查与安装脚本 | 无 | `node --version`、`pnpm --version` | 安装脚本只用 Node 内置模块；不添加项目运行时 npm 依赖。 |

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

## 6. 后续网页导出边界

当前项目只准备 Blender 本地建模与素材发现。将来导出网页场景时，可把 `.blend` 作为源文件，将优化后的 `.glb`、贴图和前端代码交给静态站点构建；模型压缩、贴图尺寸、加载预算、许可证清单、Three.js 加载和 GitHub/Cloudflare Pages 发布策略需要在对应网页项目中单独确定。不要把 Blender MCP、Python 自动化或任何凭据打包进静态站点。
