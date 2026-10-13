# Usagi 动画预览与安装指南

Usagi 页面提供动画预览，并按 ChatGPT 桌面端、网页端和 Codex CLI 分别说明安装与选择步骤。宠物 ID 为 **uu-usagi**。导航页与详情页均支持中英切换，首次访问默认英文，并记住之后的选择。

页面顶部提供首页与其他工具入口，Codex 安装提示词放在内容最前面。安装步骤按 ChatGPT 桌面端、网页端、Codex CLI 和 Linux CLI 分成可切换子标签；每个标签都把安装与选择步骤放在一起。

预览直接读取原始 8 × 9 WebP 图集，以 CSS `steps()` 切帧，约每 250 毫秒切换一帧；页面状态切换不再由慢速定时器逐帧驱动。预览背景透明，与页面背景自然衔接。待机、运行中、等待输入、已就绪、已阻塞等状态，以及模拟对话仅供演示，不连接真实 Codex 会话，也不访问或修改文件。系统设置为减少动态效果时，各状态显示静帧。状态动画使用原图集对应行：运行中第 7 行、等待输入第 6 行、已就绪第 8 行、已阻塞第 5 行。

导航页使用同一原始图集显示 Usagi：默认播放待机动画，鼠标悬停或键盘聚焦卡片时播放跑步动画；减少动态效果时固定显示静帧。

导航页和每个工具详情页都显示悬浮 Usagi。其他页面点击 Usagi 会进入详情页；详情页点击会打开 Usagi / Mini 选择器。拖动或聚焦后按方向键可移动，按 Esc 返回默认位置；右键打开 Hide pet 菜单，键盘聚焦后也可按 Shift+F10 打开；隐藏后可用恢复按钮重新显示。显示模式和位置保存在当前浏览器。

悬停或键盘聚焦时显示三个桌面宠物控件：铅笔打开快速聊天，波形打开语音说明，铃铛打开活动线程托盘；托盘顶部的上箭头收起线程。快速聊天创建本地示例线程，状态按 Needs input、Blocked、Ready、Running 的顺序汇总；选中线程会打开本地对话预览。语音入口说明桌面端能力，不伪装成真实语音会话。详情页状态预览与悬浮宠物的本地交互相互独立。所有示例都不连接真实会话、不读取或修改文件、不请求麦克风；刷新页面会清除示例线程。网页宠物只在当前网页视口内显示，不能浮在其他应用上，也不支持桌面全局快捷键。原始图集字节不变。

## 选择使用场景

| 使用场景 | 安装或上传 | 安装后的选择 |
| --- | --- | --- |
| ChatGPT 桌面端（macOS / Windows） | 在当前电脑运行对应安装命令 | 打开 Settings → Pets，刷新后选择 Usagi |
| ChatGPT 网页端 | 下载原始图集并在宠物设置中上传 | 打开 Settings → Personalization → Pet，上传后选择 Usagi |
| Codex CLI | 在当前设备安装宠物文件 | 交互式 CLI 中输入 /pets uu-usagi |
| Linux CLI | 在 shell 中运行 POSIX 安装命令 | 使用支持 Kitty 图形协议或 Sixel 的终端 |

桌面端的自定义宠物保存在当前电脑，不会自动同步到网页端。网页端上传和桌面端文件安装是独立设置。账号或工作区是否提供相应 Pets 功能，以实际界面为准。

## ChatGPT 桌面端：macOS 与 Windows

### 1. 安装

macOS 终端：

    curl -fsSL "https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/install.sh" | sh

Windows PowerShell：

    irm "https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/install.ps1" | iex

安装器会先下载并验证素材，再将文件放入当前用户的 Codex 宠物目录。它不需要管理员权限，不会自动更改当前宠物选择。目标目录包含不同或额外内容时，安装器会停止并保留原文件。

### 2. 刷新并选择

1. 打开 ChatGPT 桌面应用。
2. 打开个人资料菜单并选择 **Pets**，或进入 **Settings → Pets**。
3. 选择 **Refresh**。
4. 在宠物列表中选择 **Usagi**。

### 3. 显示或隐藏

- 在桌面应用中输入 **/pet**，或从命令菜单选择 **Show pet**，即可显示宠物。
- 右键点击宠物并选择 **Hide**，或从命令菜单 / Settings → Pets 中选择 **Hide pet**，即可隐藏。

## ChatGPT 网页端

网页宠物由网页设置管理，不会因桌面端安装而自动出现。

1. 下载页面提供的原始文件： [spritesheet.webp](pets/uu-usagi/spritesheet.webp)。
2. 在 ChatGPT 网页端打开 **Settings → Personalization → Pet**。
3. 选择 **Upload pet**，上传下载的 WebP 图集。
4. 在 **Select pet** 中选择 **Usagi**。

图集规格为 1536 × 1872 WebP。上传功能是否可用取决于账号与工作区设置。

## Codex CLI

1. 在当前设备运行与操作系统对应的安装命令。macOS / Linux 使用上面的 shell 命令；Windows 使用 PowerShell 命令。
2. 启动交互式 Codex CLI。
3. 输入以下命令选择 Usagi：

    /pets uu-usagi

终端宠物需要支持 Kitty 图形协议或 Sixel 的终端；具体终端兼容性可能变化，使用前可查看 [Pets 官方说明](https://learn.chatgpt.com/docs/pets)。tmux 和 Zellij 中不可用。Linux 说明只覆盖 CLI 终端显示，不承诺桌面浮动宠物能力。

## 复制给 Codex 的安装提示词

详情页的 **Copy install prompt** 按钮会生成适用于当前语言的提示词。将它粘贴到要安装 Usagi 的那台设备上的 Codex，Codex 会识别系统，并使用本仓库现有安装器。

提示词要求安装器保留 SHA-256 检查：目标内容冲突时停止并报告，不覆盖或删除原文件，也不接触其他宠物。安装成功后，仅当当前界面提供明确、受支持的选择方式时才尝试选择 Usagi；否则给出该界面的手动操作步骤。网页端仍需单独上传图集。若剪贴板不可用，页面会展开可手动选择和复制的提示词文本框。

## 素材声明

**非原创，仅供非商业备份和分享。** 原作者和原始许可目前无法追溯。本项目不声称是素材作者；这项声明只说明本副本的用途，不代表原作者授权，也不代替正式许可。如果找到原始来源，应补充作者署名、来源链接和原许可，并按原许可调整分发方式。

项目中的宠物元数据和图集保留原始内容。原始图集 SHA-256：

    3bb176b93e06e7a9d73717f26ac102f816f64d083e77d11691f3aa63958306a0

平台流程以 [Pets 官方文档](https://learn.chatgpt.com/docs/pets) 为准。

## 卸载

先退出正在使用宠物的 ChatGPT / Codex 界面，再仅删除 uu-usagi 目录。若设置了自定义 CODEX_HOME，请先确认变量指向的位置。

macOS / Linux（默认位置）：

    rm -r "$HOME/.codex/pets/uu-usagi"

使用自定义 CODEX_HOME 时，将上面的根路径改为该变量指向的目录，再执行相同的 pets/uu-usagi 删除操作。

Windows PowerShell：

    $codexHome = if ([string]::IsNullOrWhiteSpace($env:CODEX_HOME)) {
      Join-Path $env:USERPROFILE '.codex'
    } else {
      $env:CODEX_HOME
    }
    Remove-Item -LiteralPath (Join-Path (Join-Path $codexHome 'pets') 'uu-usagi') -Recurse

不要删除整个 .codex、pets 或其他宠物目录。

## 开发与验证

本应用使用原生 HTML、CSS、少量 JavaScript 和 Node.js 内置模块，不引入前端框架或服务端。

    ./scripts/install.sh
    pnpm run build
    pnpm run test:ci

根目录构建共享导航站点：

    pnpm run test:catalog
    pnpm run build:site

Windows PowerShell 安装器另有语法和行为检查：

    ./tests/verify-windows.ps1
