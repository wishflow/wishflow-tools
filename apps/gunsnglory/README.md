# Guns’n’Glory

用于学习、调试和平衡性实验的浏览器游戏项目。

**当前处于设计阶段，尚无可运行游戏。** 产品范围以[产品规格](docs/spec.md)为准，实现状态以[实施计划](docs/implementation-plan.md)为准。后续开发统一在 `gunsnglory` 集成分支推进。

## 文档导航

| 文档 | 唯一负责的内容 | 什么时候读 |
| --- | --- | --- |
| [AGENTS.md](AGENTS.md) | 稳定协作约束和条件式阅读指针 | agent 开始工作 |
| [产品规格](docs/spec.md) | 问题、目标、用户故事、范围与产品验收 | 确定要实现什么 |
| [领域术语](docs/GLOSSARY.md) | 领域概念及其规范名称 | 定义或使用战局、场景、实验等概念 |
| [架构设计](docs/architecture.md) | Module、Interface、Seam、依赖与状态所有权 | 决定由谁实现、改动影响谁 |
| [存储契约](docs/storage-contracts.md) | 内部存储 Seam 的一致性、错误、迁移和 Adapter 验证 | 实现持久化或替换介质 |
| [模拟与自动化契约](docs/simulation-and-automation.md) | 战局操作、时间随机、回放、策略和实验格式 | 实现交互控制、复现与比较 |
| [实施计划](docs/implementation-plan.md) | 里程碑、纵向任务、阻塞关系与交付条件 | 选择和执行下一项工作 |
| [验证记录](docs/validation.md) | 本批文档及 pi 上下文加载的实际检查证据 | 核对已验证与未验证的范围 |

## 维护方式

详细定义只在其所属文档维护，其他文档使用引用。规格描述用户行为，架构解释能力如何封装，计划只管理交付依赖与状态；不把同一组规则复制进三份文档。

命令以未来实现后的应用配置为准，当前不提供尚不存在的安装或运行步骤。完整公开域名由[仓库 README](../../README.md)维护，仓库协作和发布要求见[根 AGENTS.md](../../AGENTS.md)。
