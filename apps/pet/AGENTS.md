# Usagi 宠物包应用约束

## 项目边界

- 本目录是 WishFlow Tools 的独立静态应用，slug 为 `pet`，由 `apps/catalog.json` 登记并发布到 `/pet/`。
- 前端使用原生 HTML、CSS 和 Node.js 内置模块构建；项目使用 pnpm，不加入跨应用 workspace；不增加框架、运行时服务、API、账号或同步功能。
- `install.sh` 和 `install.ps1` 是用户安装器；`scripts/install.sh` 只负责应用开发依赖安装。

## 素材完整性与声明

- 唯一素材来源为用户本机已有的 `~/.codex/pets/uu-usagi/`。
- `pets/uu-usagi/pet.json` 与 `spritesheet.webp` 必须原样保存。不得重绘、重编码、压缩、裁切或重排图集。
- 预期 SHA-256 以 `USAGI_PET_IMPLEMENTATION.md` 和 `SHA256SUMS` 记录为准；修改素材前必须先取得用户明确要求并同步更新校验与说明。
- 不宣称拥有图像版权或代表原作者授权。来源和原始许可未找到前，保留非商业备份用途声明。

## 安装器约束

- 固定从 `https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/` 下载素材；脚本内的哈希必须与 `SHA256SUMS` 一致。
- macOS/Linux 安装器保持 POSIX `sh` 语法；Windows 安装器保持 Windows PowerShell 5.1 兼容，不使用额外模块。
- 下载和校验先于目标写入；目标目录同文件系统暂存并完整验证后再移动。
- 已有目录仅在内容与本包逐字节一致且没有额外内容时视为已安装。冲突时失败并保留原文件，不覆盖或删除。
- 安装器不请求管理员权限、不写系统目录、不调用宠物服务、不更改当前宠物选择，也不操作其他宠物目录。

## 本地命令与验证

- `./scripts/install.sh`：安装此应用构建所需依赖（当前无第三方依赖）。
- `pnpm run build`：生成应用 `dist/`，保留原图集字节。
- `pnpm run test:ci`：验证素材元数据、哈希、安装器行为和静态构建。
- Windows PowerShell 5.1：运行 `tests/verify-windows.ps1`，检查语法、路径、幂等、冲突和失败清理。
- 根目录 `pnpm run build:site` 会构建并装配共享站点；本应用没有 Worker 或 Cloudflare Worker 配置。
