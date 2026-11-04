# Guns’n’Glory

浏览器版 Guns’n’Glory FREE 1.8.6，用于完整离线战役、规则观察和数值实验；当前只验收了部分首关内容，状态见[实施计划](docs/implementation-plan.md)。

## 本地开发

```bash
./scripts/install.sh
pnpm run dev
pnpm run test:ci
```

从仓库根目录运行本地批次 CLI：

```bash
pnpm --dir apps/gunsnglory run simulate:batch -- --input examples/serial-batch.json --output /tmp/gunsnglory-batch.json
```

输入接受1–25个固定 seed，默认串行；`--workers 2` 使用两个 Node worker。CLI 的场景、预算、失败分类和退出码见[模拟与自动化契约](docs/simulation-and-automation.md)。

## 文档

| 文档 | 唯一职责 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | 稳定约束与按需阅读入口 |
| [产品规格](docs/spec.md) | 范围、可实现的游戏规则、内容与验收基线 |
| [架构](docs/architecture.md) | Game、Progress、Experiments 的边界与状态所有权 |
| [存储契约](docs/storage-contracts.md) | 档案、内容、实验数据的持久化语义 |
| [模拟与自动化契约](docs/simulation-and-automation.md) | 帧推进、命令、随机、回放和批量执行 |
| [实施计划](docs/implementation-plan.md) | 唯一进度、未完成任务、依赖和发布门槛 |

公开域名由仓库根 README 维护；共享站点语言状态由 `@wishflow/site-shell` 管理。
