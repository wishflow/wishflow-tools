# 球群生长实验室

## 项目边界

- 纯前端 Vite 应用，登记于根目录 `apps/catalog.json`，发布到 `/ball-growth-lab/`。
- React 负责设置和统计；PixiJS 负责绘制；Rapier 物理世界只在 Web Worker 内运行。Planck.js 仅作基准对照。
- `src/physics/` 拥有物理规则和 Rapier 适配器，`src/rendering/` 只处理画面，React 不逐帧管理球的位置。
- 所有随机初始条件和繁殖判定使用配置种子，重置应可复现。
- 不增加后端、Cloudflare Worker、账号或持久化服务。

## 本地命令

- `./scripts/install.sh` 安装本应用依赖。
- `npm run dev` 启动本地开发服务器。
- `npm run build` 进行 TypeScript 检查并构建到 `dist/`。
- `npm run test:ci` 运行类型检查、确定性单元测试和 Playwright 端到端流程。
- `npm run benchmark` 运行本地物理步进基准；结果不代表真实手机性能。

## 可复用 skills

相关 skills 安装在 Codex 全局目录 `$CODEX_HOME/skills/`，可供其他仓库复用。仓库内的来源与重装说明见 `docs/reusable-skills.md`。不要复制到应用自身的 `skills/` 目录；该目录不会自动加载。
