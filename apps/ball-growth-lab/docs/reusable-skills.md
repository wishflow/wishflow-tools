# 可复用 Codex skills

以下 skills 已安装到 Codex 全局目录，其他项目可以复用。Codex 不会自动扫描某个应用里的普通 `skills/` 目录；标准全局技能位置是 `$CODEX_HOME/skills/`。当前环境解析到 `/home/codespace/.codex/skills/`。全局内容位于本仓库之外，仓库只跟踪来源清单和重装说明。

| Skill | 用途 | 上游来源 |
| --- | --- | --- |
| `frontend-design` | 视觉方向、组件质感与前端设计执行 | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) |
| `web-design-guidelines` | 可访问性、交互、响应式和 UI 代码审查 | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) |
| `open-game-skills` | 游戏规划、状态、交互、QA 和玩法验证的技能集合 | [jammyfu/open-game-skills](https://github.com/jammyfu/open-game-skills/tree/main/skills) |
| `pixijs-performance` | PixiJS v8 的绘制、对象生命周期和性能分析 | [pixijs/pixijs](https://github.com/pixijs/pixijs/tree/dev/skills/pixijs-performance) |

## 重装

通过 Codex 的 `skill-installer` 按上表仓库路径安装。`open-game-skills` 按整个 `skills/` pack 安装，以保留技能之间的引用资源。PixiJS 性能 skill 当前位于上游 `dev` 分支。

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
installer="$CODEX_HOME/skills/.system/skill-installer/scripts/install-skill-from-github.py"
python3 "$installer" --repo anthropics/skills --path skills/frontend-design
python3 "$installer" --repo vercel-labs/agent-skills --path skills/web-design-guidelines
python3 "$installer" --repo jammyfu/open-game-skills --path skills --name open-game-skills
python3 "$installer" --repo pixijs/pixijs --path skills/pixijs-performance --ref dev
```

安装完成后，在新的 Codex 会话中即可按任务选择这些全局 skills。

如果运行环境没有 Codex 的 installer，可从对应上游仓库把 skill 目录复制到 `$CODEX_HOME/skills/<skill-name>/`；完整游戏技能包应保留其目录树。不要把这些目录放入应用源码，也不要提交上游 skill 文件副本。
