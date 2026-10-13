# Usagi 本地宠物包

这是 `uu-usagi` 的本地备份包，包含原始 `pet.json`、原始 WebP 图集以及适用于 macOS、Linux 和 Windows 的安装器。网站预览位于 [WishFlow Tools `/pet/`](https://wishflow-tools.pages.dev/pet/)；页面展示整张图集和安装指引，不重建动画。

## 平台范围

- **macOS**：运行 POSIX shell 安装器，安装到用户 Codex 宠物目录。
- **Windows**：使用 Windows PowerShell 5.1 安装器，不要求额外模块或管理员权限。
- **Linux**：保证本包文件安装。CLI 显示依赖支持 Kitty 图形协议或 Sixel 的终端；不承诺 Linux 桌面浮动宠物功能。tmux、Zellij 等环境可能无法显示相应图形输出。

## 一行安装

macOS / Linux：

```sh
curl -fsSL "https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/install.sh" | sh
```

Windows PowerShell：

```powershell
irm "https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/install.ps1" | iex
```

安装器把下载内容放入临时目录，验证固定 SHA-256 和元数据引用后再安装。若目标目录已有不同或额外内容，安装器会报错并保留原目录。

## 安装位置与选择

- macOS / Linux：`$CODEX_HOME/pets/uu-usagi`；`CODEX_HOME` 未设置或为空时为 `$HOME/.codex/pets/uu-usagi`。
- Windows：`$env:CODEX_HOME\pets\uu-usagi`；变量未设置或为空时为 `$env:USERPROFILE\.codex\pets\uu-usagi`。

安装器只复制文件，不会自动更改当前选择。安装后在 ChatGPT / Codex 的 Pets 设置中刷新列表并手动选择 Usagi；CLI 可运行：

```text
/pets uu-usagi
```

桌面端宠物保存在本机，不会自动同步到网页。更多说明见 [Pets 官方文档](https://learn.chatgpt.com/docs/pets)。

## 卸载

先关闭或退出正在使用该宠物的界面，然后只删除 `pets/uu-usagi` 目录。使用自定义 `CODEX_HOME` 时，先确认变量值。

macOS / Linux：

```sh
rm -r "${CODEX_HOME:-$HOME/.codex}/pets/uu-usagi"
```

Windows PowerShell：

```powershell
$codexHome = if ([string]::IsNullOrWhiteSpace($env:CODEX_HOME)) {
  Join-Path $env:USERPROFILE '.codex'
} else {
  $env:CODEX_HOME
}
Remove-Item -LiteralPath (Join-Path (Join-Path $codexHome 'pets') 'uu-usagi') -Recurse
```

安装器不提供自动卸载，不要删除整个 `.codex`、`pets` 或其他宠物目录。

## 素材与许可

**非原创，仅供非商业备份和分享。** 素材来自用户本机已有安装；本项目不声称是素材作者。原作者与原始许可目前无法追溯，因此该声明不代表原作者授权，也不代替正式许可。若找到来源，应补充作者署名、来源链接和原许可，并遵循原许可调整分发方式。详见 [素材声明](ASSET_NOTICE.md)。

## 开发与验证

```sh
./scripts/install.sh
pnpm run build
pnpm run test:ci
```

完整站点由仓库根目录构建：

```sh
pnpm run build:site
```

Windows PowerShell 5.1 安装器检查：

```powershell
./tests/verify-windows.ps1
```
