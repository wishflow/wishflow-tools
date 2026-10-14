# 自行车模块资源调研

调研日期：2026-10-14。目标是找到可公开静态托管、许可清楚、适合拆解交互和产品摄影风格的素材。当前环境没有可用的专用 3D 资产搜索连接器，因此按要求直接检查资源库的单项页面和许可说明；聚合检索摘要不作为授权依据。

## 结论

- 未找到同时满足城市通勤造型、可独立控制主要机械部件、比例可信和可公开再分发要求的自行车整车模型。三项 Sketchfab 候选的层级/pivot 信息、可下载源文件细节或视觉风格至少有一项不匹配，因此不把它们打包到站点。
- 使用自行车几何程序化建模，以精确控制 700C 轮径、车架尺寸、32 辐条、真实轴心 pivot、组件显隐和拆解。只补自行车这类专属机械几何，不重建基础金属表面微细节。
- 实际采用 ambientCG 的 **Metal 012** 1K PBR 图集，供碟片、牙盘、飞轮、花鼓和五金件使用。仅本地保存 Color、NormalGL 和 Roughness 三张 JPEG；着色时以金属材质和有限 UV 重复控制视觉强度。源图未做像素编辑。

## 自行车与机械模型候选

| 候选资源 | 来源、作者与链接 | 格式与结构 | 质量与体积 | 精确许可 | 结论 |
| --- | --- | --- | --- | --- | --- |
| Ultra Low Poly Bicycles — set of 3 | Sketchfab；MechanicalOnion（账号 `kambu_ch`）；[详情页](https://sketchfab.com/3d-models/ultra-low-poly-bicycles-set-of-3-fca3293dcac3417ebce7625f5261275c) | 页面允许下载，但未列出下载包格式；作者说明三组：车架（含后轮、后拨和座垫）、曲柄（含脚踏和牙盘）、转向（含前轮和车把）。未 rig，独立 pivot 未说明。 | 3.1k triangles、1.8k vertices、256×256 颜色 atlas；作者说明按米建模，轮径接近 622 mm。低面数但扁平低模与写实产品目标冲突，车轮/传动组不能独立操作。页面未给文件体积。 | 页面标记 CC Attribution；对应 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。可修改和再分发，需署名、附许可链接并说明修改。 | **仅作尺寸和分组参考。** 需将大组拆分并补足独立轮子、前叉、刹车和链传动，改造量大于按规格生成专属几何；最终视觉也不匹配。 |
| Bicycle Simple | Sketchfab；emelyarules；[详情页](https://sketchfab.com/3d-models/bicycle-simple-c0e5f00e1f3f47d2b19088ced9b85932) | 页面允许下载，但未列出文件格式、网格层级或 pivot/动画结构。 | 38.9k triangles、20.1k vertices；页面未说明物理比例、材质贴图清单或文件体积。标签含 cartoon，风格不确定。 | 页面标记 CC Attribution；对应 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。可修改和再分发，需署名、附许可链接并说明修改。 | **不采用。** 层级、比例、贴图和下载格式未披露，无法确认组件控制所需结构；仅凭预览和面数不能安全地当作可操作基础模型。 |
| Carbon Frame Bike | Sketchfab / Khronos glTF Sample Models；Robert Schweier，实时版本/动画 Felix Herbst（prefrontal cortex）；[详情页](https://sketchfab.com/3d-models/carbon-frame-bike-398999b3360b4e6997a9aae253d6acbd) | 页面列出 glTF 与 USDZ 样例模型；称为实体山地车的 digital twin，并有动画版本。单独网格层级、机械组件 pivot 与拆解结构未在页面说明。 | 115.2k triangles、59.4k vertices；较低模简单候选重，且是碳纤山地车而非城市通勤车。页面未列文件体积。 | **CC BY-SA 4.0**，详情页明确说明；可修改和再分发，改编内容须以相同许可共享并署名。许可条件适用面较广，且造型不符。 | **不采用。** 车型与目标不符、交互所需层级未核实，且 ShareAlike 会额外约束改编模型的发布许可。 |

上述 Sketchfab 页面当前只展示汇总三角面数/顶点数和作者公开说明；页面没有公开的包体积、材质贴图清单或完整 pivot 清单，故不把缺失信息写成已验证事实。Sketchfab 的 `CC Attribution` 对应 CC BY 4.0；各项的具体作品页与许可页均已单独核对。

## 资源库检查记录

| 资源库 | 检查结果 | 处理 |
| --- | --- | --- |
| [Poly Haven 模型库](https://polyhaven.com/models) | 模型列表包含 521 项，Vehicles & Transport 分类为 11 项；通过目录/关键词检索未找到合适自行车。该库资产统一 CC0，但无适配的整车候选。 | 不选自行车模型。继续使用其公开 CC0 纹理目录作为备用来源。 |
| [ambientCG Metal 012](https://ambientcg.com/view?id=Metal012) | 单项页注明程序化资产、标签 Brushed / Bumpy / Metal / Scratches / Silver / Steel，并提供 1K JPG 下载。作者为 ambientCG / Lennart Demes。下载的 1K ZIP 为 3.8 MiB；本模块只保留三张所需贴图，合计约 1.4 MiB。 | **采用。** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) 允许复制、修改和再分发；无需署名。本地资源路径、用途和处理记录见 `assets/manifest.json`。 |
| [Sketchfab](https://sketchfab.com/3d-models) | 逐项检查上表 3 个可下载自行车模型。许可从每个作品页核验；各自适用的 CC BY 4.0 或 CC BY-SA 4.0 不限制公开再分发，但候选结构/风格不够适合。 | 仅前两项许可条件可接受；Carbon Frame Bike 的 ShareAlike 条件及车型不合适。均未打包。 |
| [Blendkit 授权说明](https://www.blendkit.com/docs/licenses/) | 检查 Royalty Free 与 CC0 两种授权。Royalty Free 允许用于更高层级作品，但不允许把素材本身作为模型或资源包重新出售/再分发。未找到需要采用的具体自行车项目，因此没有借用 Blendkit 资产或要求账号下载的内容。 | 不选用。 |
| [Kenney 资产库](https://kenney.nl/assets) | 检查了 City Kit、Racing Kit、Train Kit 等可下载 CC0 方向；是低多边形城市/汽车/轨道交通资源，没有满足该写实自行车模块要求的独立自行车。 | 不采用；造型语言与产品展示模型不符。 |
| [Quaternius](https://quaternius.com/) | 检查 Downtown City MegaKit 与模块化城市环境方向。页面提供 FBX、Blend、glTF 等格式和 CC0 许可，但内容是城市街景构件，不是可拆解自行车。 | 不采用；环境素材不进入本模块的简洁摄影棚场景。 |

## 已采用素材文件

| 本地文件 | 来源文件 | 修改情况 | 用途 |
| --- | --- | --- | --- |
| `assets/textures/Metal012_1K-JPG_Color.jpg` | `Metal012_1K-JPG_Color.jpg` | 原始 1K JPEG；未改像素 | 金属部件底色纹理 |
| `assets/textures/Metal012_1K-JPG_NormalGL.jpg` | `Metal012_1K-JPG_NormalGL.jpg` | 原始 1K OpenGL 法线 JPEG；未改像素 | 金属部件表面细节 |
| `assets/textures/Metal012_1K-JPG_Roughness.jpg` | `Metal012_1K-JPG_Roughness.jpg` | 原始 1K JPEG；未改像素 | 金属部件粗糙度变化 |

下载包还含有其他贴图、预览和源工程，但本页不需要它们，因此不发布。站点不调用外部 URL 加载素材。
