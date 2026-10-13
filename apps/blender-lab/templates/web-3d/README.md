# 3D 静态页面模板

这是一个可复制到仓库 apps/<slug>/ 的独立静态页面。它使用 Three.js 加载 Blender 导出的 glTF 二进制文件，默认场景只是可构建、可检查的占位内容；Agent 应按已确认的 SceneSpec 替换生成脚本和页面文案。

复制后将 package.json 的 name 改为项目专属名称，并把 Idea 文档放进 docs/；把确认后的素材计划整理到 assets/manifest.json。

## 第一次运行

~~~sh
./scripts/install.sh
pnpm run generate:scene
pnpm run dev
~~~

## 发布前检查

~~~sh
pnpm run check:assets
pnpm run check:scene
pnpm run test:ci
pnpm run check:release
~~~

check:scene 和 check:release 需要本机 Blender。GitHub Actions 不生成 Blender 场景；它安装模板依赖、运行应用的 test:ci，并验证页面能够加载已提交的 GLB。首次在本机运行浏览器测试时，可设置 CHROME_EXEC 指向已安装的 Chromium/Chrome，或运行 pnpm exec playwright install chromium 安装 Playwright 管理的 Chromium。

## 项目文件

- blender/generate_scene.py：幂等生成场景的起点。
- scripts/check-scene.py：通过 Blender Python 检查活动相机、网格、预算、贴图和 GLB。
- scene-contract.json：数值预算、模型路径和必须存在的对象名。
- assets/manifest.json：原创与外部素材的来源/许可记录。
- public/models/scene.glb：网页构建复制和加载的静态模型。

Agent 每轮按质量报告作最小修复，最多三轮。仍失败或许可无法确认时停止，不提交、不推送。
