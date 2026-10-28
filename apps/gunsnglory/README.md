# Guns’n’Glory

用于学习、调试和平衡性实验的浏览器游戏项目，目标是实现 Guns’n’Glory FREE 1.8.6 的完整六区域、60 关离线玩法。

**实现进度、发布状态和下一执行任务统一见[实施计划](docs/implementation-plan.md)。** 现有样本、保存和实验工具的验收不代表完整原版关卡已经交付。

能力通过 Game、Progress、Experiments 三个公共深 Module 提供。每个阶段先明确内容范围、规格与独立验收预期，再用纵向切片交付真实关卡行为；参数和素材依据见[产品规格](docs/spec.md)，模块职责与环境隔离见[架构设计](docs/architecture.md)。

## 本地开发与验证

```bash
./scripts/install.sh
pnpm run dev
pnpm run test:ci
```

## 本地批次 CLI（T16–T17）

从仓库根目录运行示例批次并导出 JSON：

```bash
pnpm --dir apps/gunsnglory run simulate:batch -- --input examples/serial-batch.json --output /tmp/gunsnglory-batch.json
```

输入限制为 1–25 个固定 seed，运行 Cow Gulch 单波与 `start-wave@1` 策略；可在 JSON 的 `budgets` 中覆盖每场上限。默认串行；需要加速时可传 `--workers 2`，最多 4 个 Node worker。报告保留完整运行输入、结果、预算/取消/错误分类与失败样本；`Ctrl-C` 会协作停止并导出已完成部分。该开发工具不读取或修改正式档案，也不依赖 IndexedDB。输入、并发和退出码见[模拟与自动化契约](docs/simulation-and-automation.md#82-t16-串行批次与-cli-当前实现)及[8.3 节](docs/simulation-and-automation.md#83-t17-worker-并行批次)。

该 CLI 的结果只描述当前固定样本及已实现规则，不能用来推断完整原版的平衡性。真实关卡的规则覆盖与实验入口扩展按实施计划推进。

## 文档导航

| 文档 | 唯一负责的内容 | 什么时候读 |
| --- | --- | --- |
| [AGENTS.md](AGENTS.md) | 稳定协作约束和条件式阅读指针 | agent 开始工作 |
| [产品规格](docs/spec.md) | 目标、用户故事、内容与参数依据、对象行为、范围及产品验收 | 确定要实现什么及怎样判断正确 |
| [领域术语](docs/GLOSSARY.md) | 领域概念及其规范名称 | 定义或使用战局、场景、实验等概念 |
| [架构设计](docs/architecture.md) | Module、Interface、Seam、依赖与状态所有权 | 决定由谁实现、改动影响谁 |
| [存储契约](docs/storage-contracts.md) | 内部存储 Seam 的一致性、错误、迁移和 Adapter 验证 | 实现持久化或替换介质 |
| [模拟与自动化契约](docs/simulation-and-automation.md) | 战局操作、时间随机、回放、策略和实验格式 | 实现交互控制、复现与比较 |
| [实施计划](docs/implementation-plan.md) | 唯一进度、里程碑、内容阶段归属、任务契约、启动与完成门槛 | 选择和执行下一项工作 |
| [验证记录](docs/validation.md) | 历史任务、规划审计及 pi 上下文加载的实际检查证据 | 核对已验证与未验证的范围 |

## 维护方式

详细定义只在其所属文档维护，其他文档使用引用。规格描述用户行为，架构解释能力如何封装，计划只管理交付依赖与状态；不把同一组规则复制进三份文档。

完整公开域名由[仓库 README](../../README.md)维护，仓库协作和发布要求见[根 AGENTS.md](../../AGENTS.md)。
