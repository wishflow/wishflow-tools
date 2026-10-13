# Blender Lab

Blender Lab 是由 coding agent 驱动的本地 3D 建模到静态网页工作流框架。Agent 读 Idea、写需求与场景规格、生成 Blender 脚本和网页；质量脚本只负责可重复检查，不提供独立的交互式工作流 CLI。

## 从 Idea 到发布

1. 依据 **templates/idea/** 写出 Idea 简报、需求、SceneSpec 和素材计划，并把关键约束同步到 scene-contract.json。
2. 在建模前向用户展示规格并等待确认。
3. 将 **templates/web-3d/** 复制到仓库中的新目录 **apps/<slug>/**，把 package.json 的 name 改为项目专属名称；将已确认的 Markdown 放入该应用 docs/，将素材计划整理到 assets/manifest.json。
4. 按 SceneSpec 实现并导出 GLB；运行本机 Blender 检查、网页构建和浏览器检查。失败时按报告修复，最多三轮。
5. 所有检查通过后，Agent 提交并 push master。共享站点 CI 负责测试并发布登记过的静态应用。

完整阶段、提示词和门禁见 [Agent 工作流](docs/workflow.md)。项目依赖和素材来源见 [依赖与接入清单](DEPENDENCIES.md)。

## 框架本身

本目录中的工作流规则与网页模板用于复用；**apps/blender-lab** 不登记到 apps/catalog.json，不作为网站页面部署。每个成品 Idea 独立成为 **apps/<slug>** 下的静态应用。

框架检查：

~~~sh
./apps/blender-lab/scripts/install.sh
pnpm --dir apps/blender-lab run test:ci
~~~

模板应用的场景生成与发布前检查命令见其 README。Blender 场景结构检查需要本机 Blender；CI 不安装 Blender，只验证静态资源、页面构建和浏览器 GLB 加载。
