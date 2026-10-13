# Usagi Pet 本地备份与静态应用实现规格

## 1. 文档目的

本文记录 `apps/pet/` 的实现规格。该目录是 WishFlow Tools 中 slug 为 `pet` 的独立静态应用，保存本机现存的 Usagi 宠物包，并提供 macOS、Linux 和 Windows 的本地安装器与安装说明。静态页面通过共享站点发布到 `/pet/`，展示原始图集和安装指引。

本实现遵循仓库根目录 `AGENTS.md` 的应用、文档、验证和交付约定：项目位于当前仓库 `apps/pet/`，静态页登记发布到 `/pet/`，完成后按根目录规则推送现有 `origin master`；不创建新的仓库或 remote。

目标是备份并分发当前本机已有的宠物包，并通过静态页预览整张图集。没有帧坐标资料，不重建动画；不重新绘制或重新编码图集，不引入 API、服务端或账号同步改动。

## 2. 已确认的素材

唯一素材来源是本机当前安装的宠物目录：

- 元数据：`~/.codex/pets/uu-usagi/pet.json`
- 图集：`~/.codex/pets/uu-usagi/spritesheet.webp`

已确认的包信息：

| 项目 | 值 |
|---|---|
| 宠物 ID | `uu-usagi` |
| 显示名称 | `Usagi` |
| 描述 | `A preview build of the animated yellow bunny pet.` |
| 类型 | `animal` |
| 图集文件名 | `spritesheet.webp` |
| 图集尺寸 | 1536 × 1872 |
| 图集 SHA-256 | `3bb176b93e06e7a9d73717f26ac102f816f64d083e77d11691f3aa63958306a0` |
| 原始 `pet.json` SHA-256 | `9279ef338ef91cb56b99753f56f4335fa1dc55f38a765a7008a182fc5a92b2da` |

原始 `pet.json` 内容如下。实现时应原样复制，不改 ID、描述、字段或格式：

    {
      "id": "uu-usagi",
      "displayName": "Usagi",
      "description": "A preview build of the animated yellow bunny pet.",
      "spritesheetPath": "spritesheet.webp",
      "kind": "animal"
    }

复制图集时保留原始字节；不得重新绘图、转换格式、压缩、裁切或重排帧。复制前后图集 SHA-256 必须一致。不要从已下线的网站重新获取或替换素材。

## 3. 项目文件结构

应用至少包含以下文件：

    apps/pet/
    ├── README.md
    ├── ASSET_NOTICE.md
    ├── AGENTS.md
    ├── CLAUDE.md
    ├── SHA256SUMS
    ├── package.json
    ├── pnpm-lock.yaml
    ├── index.html
    ├── styles.css
    ├── install.sh
    ├── install.ps1
    ├── scripts/
    │   ├── build.mjs
    │   └── install.sh
    ├── tests/
    └── pets/
        └── uu-usagi/
            ├── pet.json
            └── spritesheet.webp

要求：

- `pets/uu-usagi/pet.json` 与 `pets/uu-usagi/spritesheet.webp` 必须对应第 2 节的原包。
- `SHA256SUMS` 使用相对项目根目录的路径，记录两个素材文件的 SHA-256。其条目至少应与下列值一致：

        9279ef338ef91cb56b99753f56f4335fa1dc55f38a765a7008a182fc5a92b2da  pets/uu-usagi/pet.json
        3bb176b93e06e7a9d73717f26ac102f816f64d083e77d11691f3aa63958306a0  pets/uu-usagi/spritesheet.webp

- 脚本内应固定预期 SHA-256，且与 `SHA256SUMS` 一致。这样下载到的清单与素材都要通过脚本内预期值校验；只下载一个可被同时替换的校验清单再信任它，不满足此要求。
- README 和素材声明均使用中文，简明说明用途、来源状态、安装、选择和卸载步骤。
- 静态应用使用原生 HTML/CSS 和 Node.js 内置模块，不增加前端框架或第三方依赖；使用 pnpm 独立维护 `pnpm-lock.yaml`，按仓库应用契约提供 `build`、`test:ci` 和可执行的 `scripts/install.sh`。
- `build` 将静态页面和原始图集复制到本应用 `dist/`；根目录共享构建器负责把它发布到 `_site/pet/`。

## 4. 素材声明与署名边界

在 `ASSET_NOTICE.md` 和 README 中说明：

> 非原创，仅供非商业备份和分享。

同时写明：

- 当前素材来自用户本机已有安装；本项目不声称是素材作者。
- 原作者和原始许可目前无法追溯，因此声明仅描述本备份用途，不代表原作者授权，也不代替正式许可。
- 如果之后找到原始来源，应补充作者署名、来源链接和原许可，并按原许可调整分发方式。
- 不要擅自添加会让人误以为用户或项目作者拥有图像版权的表述，也不要代替原作者授予下游正式许可。

## 5. 安装目标与通用行为

### 5.1 安装位置

- macOS / Linux：使用 `CODEX_HOME` 环境变量；未设置或为空时使用用户主目录下的 `.codex`。最终路径为 `<CODEX_HOME>/pets/uu-usagi`，等价于 `${CODEX_HOME:-$HOME/.codex}/pets/uu-usagi`。
- Windows PowerShell：使用 `$env:CODEX_HOME`；未设置或为空时使用 `$env:USERPROFILE\.codex`。最终路径为该根目录下的 `pets\uu-usagi`。
- 不使用管理员权限，不写入系统级目录，不修改其他宠物目录。
- 安装后不自动更改账号当前选择的宠物。

### 5.2 安全与幂等要求

两个安装器都必须遵守以下行为：

1. 先把所需文件下载到临时目录，不直接下载到最终宠物目录。
2. 校验两个文件的 SHA-256，并确保元数据指向同目录下的 `spritesheet.webp`。任何下载或校验失败都应非零退出、清理临时文件，不能留下半成品宠物目录。
3. 在最终目录尚不存在时，先在目标目录同一文件系统内准备完整临时目录，再一次性移动到最终路径，避免用户看到只装了一半的目录。
4. 如果最终目录不存在，完整校验后才安装。
5. 如果最终目录已存在且只包含与本包逐字节相同的预期文件，则提示“已安装”并成功退出，不重写文件。
6. 如果最终目录已有不同内容、缺少预期文件或包含冲突内容，则提示路径和处理建议，非零退出；不得覆盖、删除或改动已有内容。
7. 临时目录和安装过程中的暂存目录在成功或失败后均应清理。校验失败、网络中断或冲突退出时保留用户原有文件。
8. 所有下载地址统一从 `https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/` 读取；不可从用户输入拼接下载地址。
9. 不调用宠物服务，不登录账号，不触发宠物选择，不修改原包或其他已安装宠物。

推荐安装流程：

    解析 CODEX_HOME 并确定目标路径
      → 下载到系统临时目录
      → 校验 SHA-256 和 pet.json 引用
      → 检查目标目录是否相同、冲突或不存在
      → 不存在时暂存完整目录并原子移动
      → 清理临时文件并输出后续选择说明

冲突判断应检查目标目录的内容，而不只是其中一个文件；存在额外或不匹配文件都按冲突处理。不得为“修复”冲突而自动覆盖。

## 6. 跨平台安装器要求

### 6.1 `install.sh`：macOS 与 Linux

- 使用 POSIX `sh` 可执行，避免 Bash 专属语法。
- 从固定仓库地址下载 `pet.json` 和 `spritesheet.webp` 到 `mktemp` 创建的临时目录。
- macOS 常见校验工具为 `shasum -a 256`，Linux 常见工具为 `sha256sum`。脚本可检测并调用可用工具；两者均不存在时应清楚报错并退出。
- 仅依赖常见系统工具（例如 `curl`、`mktemp`、校验工具、`cmp`、`mkdir`、`mv`）；发现必需工具缺失时在写入目标目录前失败。
- 捕获退出、错误和中断信号以清理下载和暂存目录。
- 对 `CODEX_HOME` 做路径处理时应保留空格；不要对路径做不安全的字符串拼接或使用 `eval`。
- 不要求在 macOS 或 Linux 上支持桌面浮动宠物覆盖层。

### 6.2 `install.ps1`：Windows PowerShell

- 使用 Windows PowerShell 5.1 可用的语法与系统组件；不得要求额外模块。
- 临时下载和哈希校验使用 PowerShell/.NET 内置能力，例如 `Get-FileHash -Algorithm SHA256`。
- 目标路径使用 `Join-Path` 等路径 API 拼接，正确处理含空格路径。
- 使用 `try/finally` 清理下载目录与暂存目录；冲突、网络或哈希错误时以非零状态退出。
- 在目标路径不存在且文件均已校验后，才将完整暂存目录移动到最终路径；不覆盖已存在目录或文件。
- 从 `irm ... | iex` 运行时，脚本应在输出中明确显示最终安装位置和后续手动选择步骤。

## 7. README 使用说明

README 至少包括以下内容。

### 7.1 项目内容与平台范围

说明这是 `uu-usagi` 的本地宠物包备份和静态图集预览，列明 macOS、Windows 安装脚本与 Linux 文件安装支持范围。页面原样显示完整图集，不推断帧坐标或模拟动画。明确 Linux 仅保证文件安装；CLI 中的显示依赖兼容 Kitty 图形协议或 Sixel 的终端环境，不承诺 Linux 桌面浮动宠物功能。

### 7.2 一行安装命令

macOS / Linux：

    curl -fsSL "https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/install.sh" | sh

Windows PowerShell：

    irm "https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/install.ps1" | iex

脚本的下载基址使用相同仓库目录。发布由仓库现有 `master` 分支和 Pages 工作流处理。

### 7.3 安装后的选择方式

安装器只复制文件。用户需要在 ChatGPT / Codex 的 Pets 设置中刷新列表，然后手动选择 Usagi。CLI 可以使用：

    /pets uu-usagi

官方 Pets 文档介绍了桌面宠物保存在本机的行为及 CLI 选择方式：<https://learn.chatgpt.com/docs/pets>。文档说明桌面端宠物不会自动同步到网页；Linux CLI 是否可见还取决于终端的 Kitty 图形协议或 Sixel 支持，并且不适用于 tmux/Zellij 等不支持相应图形输出的环境。README 应避免承诺未确认的平台能力。

### 7.4 卸载方式

提供手动卸载说明：关闭或退出正在使用宠物的相关界面后，只删除本包对应的 `pets/uu-usagi` 目录。命令行示例必须指向上文安装目标的准确目录，并提醒使用了自定义 `CODEX_HOME` 时先确认变量值。

不要提供会删除整个 `.codex`、`pets` 或其他宠物目录的命令；安装器本身不实现自动卸载。

## 8. 后续实现验收清单

实现完成后，应逐项验证并在交接回复中报告结果。应用需登记在 `apps/catalog.json`，根 README 记录 `/pet/` 入口，并遵守仓库文档归档和 Git 交付约定。

### 素材与元数据

- [ ] 项目中的 `pet.json` 可解析为 JSON。
- [ ] `id`、`displayName`、`description`、`kind` 与本文件记录一致。
- [ ] `spritesheetPath` 指向宠物目录内实际存在的 `spritesheet.webp`。
- [ ] 图集像素尺寸是 1536 × 1872。
- [ ] 拷贝前后 SHA-256 与本文件记录一致。
- [ ] `SHA256SUMS`、两个安装器的内置预期值和实际素材三者一致。

### 安装器行为

- [ ] 在临时 `CODEX_HOME` 下，macOS/Linux 安装到 `pets/uu-usagi`。
- [ ] 在临时 `CODEX_HOME` 下，Windows PowerShell 安装到相同相对目录。
- [ ] 已安装相同包时重复执行成功退出，且文件不变。
- [ ] 目标目录已有不同内容时非零退出，原文件哈希和目录内容保持不变。
- [ ] 下载失败、哈希不匹配和缺少必需校验工具时均非零退出，不留下部分宠物目录。
- [ ] 安装成功后只出现目标宠物文件，不触碰其他宠物，也不改变 active/selected 状态。
- [ ] 检查 shell 语法：`sh -n install.sh`。
- [ ] 检查 PowerShell 语法：调用 PowerShell AST Parser 解析 `install.ps1`，确认无语法错误。
- [ ] 检查 macOS/Linux 与 Windows 的默认路径、`CODEX_HOME` 自定义路径和含空格路径。
- [ ] 安装器不需要管理员权限。
- [ ] 执行应用 `pnpm run test:ci`、根目录 `pnpm run test:catalog` 与 `pnpm run build:site`。
- [ ] Windows CI 使用 PowerShell 5.1 AST Parser 与临时用户目录验证安装器。
- [ ] 执行 `git diff --check`，按仓库规范提交并推送 `origin master`。

Markdown 文件变更完成后，将最终文档按仓库相对路径复制到 `/tmp/var/wishflow-tools/`。

## 9. 不在范围内

- 不重新创作或修改 Usagi 图像、元数据、动画帧或宠物 ID。
- 不复刻或依赖已下线的素材网站。
- 不安装或更改当前 ChatGPT/Codex 账号的宠物选择。
- 不引入 API、服务端、类型系统或账号同步功能。
- 不创建新的 GitHub 仓库或 Git remote，不创建 release、tag 或 PR。
