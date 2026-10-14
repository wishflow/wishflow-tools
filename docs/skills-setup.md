# 本地初始化与项目级 Skills

## 初始化

在仓库根目录运行：

```bash
pnpm run init
```

初始化依次执行以下操作：

1. 调用 `pnpm run install:apps`，按各应用自己的 lockfile 安装依赖。
2. 使用 `npx` 临时运行 `skills@latest`，从上游 GitHub `main` 分支安装或刷新项目级 skills。
3. 确保 Claude Code 的 `.claude/skills` 指向 Codex 和通用 Agent 可读取的 `.agents/skills/`。

重复运行即可刷新上游内容。命令不需要交互，也不固定 skill 的 Git 提交或版本。

## Skills 来源与目录

| 上游 | 安装范围 | 本地名称 |
| --- | --- | --- |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `skills/engineering/` 下正式 skills | 按上游名称安装 |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `skills/productivity/` 下正式 skills | 按上游名称安装 |
| [morluto/rea](https://github.com/morluto/rea) | `reverse-engineer-anything` | `reverse-engineer-anything` |

Matt Pocock 的 `in-progress/` 内容不在安装范围内。Skills 实体存放于 `.agents/skills/`；`.claude/skills` 是指向该目录的软链接，避免维护两份副本。

`.agents/skills/`、`.claude/` 和 `skills-lock.json` 均由 `.gitignore` 忽略。`skills-lock.json` 只记录本机安装状态，不作为项目版本锁定文件提交。

## CI 与应用依赖

`pnpm run install:apps` 仍只安装 `apps/catalog.json` 登记应用的依赖。GitHub Actions 部署工作流继续调用该入口，不下载 skills；只有本地 `pnpm run init` 会安装和刷新 skills。

## REA MCP

REA skill 随项目初始化安装到 `.agents/skills/reverse-engineer-anything/`。REA MCP 则单独注册到当前用户的 Codex 配置，不属于项目依赖，也不会由 `pnpm run init` 修改。

如需重新配置当前用户的 Codex MCP，先预览，再应用；`--skill=false` 可避免 setup 流程在用户级目录另装一份 REA skill：

```bash
npx -y rea-agents@latest setup --client codex --skill=false --dry-run
npx -y rea-agents@latest setup --client codex --skill=false
npx -y rea-agents@latest doctor --client codex
```

REA setup 会把本次获取的 npm 版本写入 Codex MCP 注册，升级 MCP 时重新预览并应用 setup。运行 setup 和 doctor 时，Node.js 需符合 [REA 当前支持范围](https://github.com/morluto/rea/blob/main/docs/installation.md)；本次 setup 使用 `rea-agents@latest`，并由 setup 注册其实际获取的版本。

REA MCP 工具能力由已注册的服务版本决定；如果其工具清单与项目中的最新 REA skill 短暂不一致，按已注册 MCP 实际提供的工具使用。

## Matt skills 仓库配置

GitHub Issues、triage 标签和多上下文领域文档约定记录在 [`docs/agents/`](agents/)。项目初始化不会自动修改 GitHub 或用户级 Codex MCP 配置。
