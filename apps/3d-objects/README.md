# 3D Objects

3D Objects 是一个静态对象模块集合。应用公共层自动发现 `objects/<slug>/` 下的模块，并据清单生成目录卡片和 `#/objects/<slug>` 详情路由；每个对象自行设计详情页面、交互和所需资源。应用使用仓库公共页头、侧栏、页脚和中英文语言状态，不新增运行时后端。

现有木结构小屋保留 `#/objects/house` 路由。新增对象不需要修改小屋模块、应用路由注册表、目录卡片或根部署 workflow。

## 本地运行与检查

~~~sh
./scripts/install.sh
pnpm run dev
~~~

应用代码改动运行完整 CI 检查：

~~~sh
pnpm run test:ci
~~~

`test:ci` 检查对象模块清单、素材许可、单元测试、类型、静态构建和 Playwright 浏览器回归，不需要安装 Blender。对象声明了 Blender 场景生成流程时，使用 Blender 运行发布检查：

~~~sh
pnpm run check:release
~~~

## 新增对象

在 `objects/<slug>/` 新建模块。目录名是稳定 ID，必须由小写字母、数字和连字符组成。至少添加：

~~~text
objects/<slug>/
├── manifest.json       # 双语目录信息和模块内缩略图路径
├── DetailPage.vue      # 模块详情入口
└── assets/
    └── thumbnail.svg   # 或 PNG、JPEG、WebP
~~~

清单字段如下：

| 字段 | 说明 |
| --- | --- |
| `title`、`titleZh` | 英文和中文名称 |
| `description`、`descriptionZh` | 英文和中文目录简介 |
| `category`、`categoryZh` | 英文和中文分类 |
| `thumbnail` | 相对模块根目录的 `thumbnail.svg`、`thumbnail.png`、`thumbnail.jpg` 或 `thumbnail.webp` 路径 |

模块还可以自带 `locales.ts`、`assets/manifest.json`、`scene-contract.json`、`blender/`、`docs/` 和 `tests/`。详情页不必使用统一查看器；只有确实需要三维场景时才增加模型或 Blender 工作流。新模块会自动加入目录、详情路由、本地化和对应检查。

完整接口约束与开发发布顺序见 [AGENTS.md](./AGENTS.md)。

## 当前模块

`objects/house/` 包含木结构小屋的详情页面、Three.js 场景、GLB 与贴图、Blender 源文件、素材许可清单、场景合同、规格文档和浏览器回归。素材来源、许可与再分发记录见该模块的 `assets/manifest.json`。

## 部署

应用仍登记在根目录 `apps/catalog.json`，由现有共享静态站点 workflow 按应用级变更范围构建和发布。对象模块不配置独立部署工作流。
