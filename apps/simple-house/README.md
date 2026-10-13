# 小屋拆解观察台

一个由 Blender 场景驱动的纯静态 3D 页面。房屋模型支持旋转、缩放、平移和分层爆炸拆解；可切换构件组并点选查看说明。

## 本地运行

~~~sh
./scripts/install.sh
pnpm run dev
~~~

打开浏览器提示的本地地址。模型生成和质量检查需要本机安装 Blender：

~~~sh
pnpm run generate:scene
pnpm run check:assets
pnpm run check:scene
pnpm run test:ci
~~~

## 公开素材

- 屋面瓦片： [Grey Roof 01](https://polyhaven.com/a/grey_roof_01)，作者 Rob Tuytel / Poly Haven，CC0。
- 室内地板： [Wooden Planks](https://polyhaven.com/a/wooden_planks)，作者 Charlotte Baglioni、Dario Barresi / Poly Haven，CC0。
- 本项目仅打包 1K 漫反射图，纹理由 Blender 导出器嵌入 `public/models/scene.glb`；页面运行时无需访问素材站。完整许可、署名和文件信息见 `assets/manifest.json`。

## 项目文件

- `blender/generate_scene.py`：可重复生成 Blender 源场景与网页 GLB。
- `blender/scene.blend`：已生成的源场景。
- `scene-contract.json`：模型路径、对象名及性能预算。
- `assets/manifest.json`：外部贴图来源与再分发记录。
- `public/models/scene.glb`：网页加载的本地模型。
