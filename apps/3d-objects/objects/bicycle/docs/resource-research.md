# 自行车模块资源调研

调研日期：2026-10-14。目标是找到可公开静态托管、许可清楚、适合拆解交互和产品摄影风格的素材。当前环境没有可用的专用 3D 资产搜索连接器，因此按要求直接检查资源库的单项页面和许可说明；聚合检索摘要不作为授权依据。

## 结论

- 未找到同时满足城市通勤造型、可独立控制主要机械部件、比例可信和可公开再分发要求的自行车整车模型。三项 Sketchfab 候选的层级/pivot 信息、可下载源文件细节或视觉风格至少有一项不匹配，因此不把它们打包到站点。
- 使用自行车几何程序化建模，以精确控制 700C 轮径、车架尺寸、32 辐条、真实轴心 pivot、组件显隐和拆解。只补自行车这类专属机械几何，不重建基础金属表面微细节。
- 实际采用 ambientCG 的 **Metal 012** 1K PBR 图集，供碟片、牙盘、飞轮、花鼓和五金件使用。仅本地保存 Color、NormalGL 和 Roughness 三张 JPEG；着色时以金属材质和有限 UV 重复控制视觉强度。源图未做像素编辑。
- 另以 Giant Escape Disc 4（2025，美国版，M 码）作**几何与组件关系参考**，不下载、打包或发布其商品图/模型，也不把模型称作该品牌的官方复刻。品牌规格可锁定车架和原厂机构的可信基线；管件曲面与未公布尺寸仍是经视觉核对的近似值。

## 现实车型规格参考（不作为站点素材）

| 参考项 | 一手来源和可核对内容 | 未公开信息与建模限制 |
| --- | --- | --- |
| 车型与配色 | [Giant Escape Disc 4（2025，美国版）](https://www.giant-bicycles.com/us/escape-disc-4-2025)：车型为 Escape Disc 4；美国版尺码 S/M/L/XL，M 码建议身高 170–180 cm，配色 Black、Mars Dust。 | Giant 提醒不同地区尺码和规格可能变化；此处固定美国版 M 码作建模基准，不将品牌或配色当成授权素材。 |
| M 码车架几何 | [Giant 官方规格 PDF](https://static.giant-bicycles.com/pdf/giant-escape-disc-4-en-us-3878.pdf)：座管 485 mm、座管角 73°、有效上管 580 mm、头管 130 mm、头管角 71°、前叉偏移 50 mm、Trail 69.4 mm、轴距 1,075 mm、后下叉 445 mm、中轴落差 60 mm、Stack 556 mm、Reach 410 mm、跨高 754 mm；把宽 640 mm、把立 90 mm、曲柄 170 mm、轮径 700C。 | 没有车架节点坐标、各管外径/截面、壁厚、弯曲曲线、焊缝尺寸或可复刻 CAD。座垫高度按示意骑姿设置，不伪称厂方几何。 |
| 车架、前叉与安装位 | [Giant 官方车型页](https://www.giant-bicycles.com/us/escape-disc-4-2025)：ALUXX 级铝合金碟刹车架、高碳钢碟刹前叉、前叉和车架具有货架安装位。车型页的 ALUXX 说明为 6061 合金单抽管。 | 未列管件剖面、具体管径、前叉孔位尺寸和连接细节；只能用产品图辅助近似。安装位不代表标配货架。 |
| 传动 | Giant 车型页列出 Shimano Tourney TX 1×8、无前拨、Tourney TX 后拨、CS-HG200-8 12–32T、40T 锻造铝合金牙盘、KMC Z8.3 链条；M 码曲柄长 170 mm。[Shimano CS-HG200-8 官方页](https://bike.shimano.com/en-NA/products/components/pdp.P-CS-HG200-8.html)确认该飞轮为 8 速、12–32T。 | Giant 未给出拨把和后拨完整型号代码；Shimano 页面只确认飞轮范围，未列逐片齿数。因此模型不得把 11–32T 或一组未经确认的齿数组合写成本车精确规格。 |
| 后拨机构参考 | [Shimano RD-TX800 官方页](https://bike.shimano.com/en-UK/products/components/pdp.P-RD-TX800.html)说明该产品支持 8 速 SIS，可用于理解同系列后拨外形和运动关系。 | Giant 只写 Tourney TX，没有确认本车安装的就是 RD-TX800；仅作机构参考，不在资产/规格文案中宣称具体型号。 |
| 制动 | Giant 车型页明确写为 **Tektro 机械碟刹**，前后 Giant MPH 碟片均为 160 mm，刹车把为合金。 | 没有卡钳、刹把型号、碟片厚度/安装接口或具体刹线路径。不得建成液压碟刹；[Tektro MD-M280 官方页](https://www.tektro.com/mtb/product/41)只能帮助核对机械碟刹机构，不能证明 Escape Disc 4 装了该卡钳。 |
| 轮组与轮胎 | Giant 车型页及规格 PDF：Giant S-X3 防刺胎 700×38C、最大胎宽间隙 45 mm、双层铝圈、32 孔合金花鼓、不锈钢 14G 辐条。 | 没有轮圈截面/内宽、花鼓型号/尺寸、辐条长度和准确交叉数；可见辐条按 32 根建模，编法明确标为视觉近似。 |
| 通勤配件 | Giant 的 [Escape Disc 系列介绍](https://www.giant-bicycles.com/us/showcase/escape-disc)说明整合安装位可用于加装货架或挡泥板；Giant 规格没有把货架、挡泥板或脚撑列为 Escape Disc 4 的随车配件。 | [Escape R Disc MY25+ 挡泥板升级件](https://www.giant-bicycles.com/jp/fender-upgrade-kit-for-escape-r-disc-my25plus)、[Escape R QR 脚撑](https://www.giant-bicycles.com/jp/escape-r-qr-stand)和 [Escape R Skewer 脚撑](https://www.giant-bicycles.com/jp/escape-r-skewer-kickstand)页面没有确认适配 Escape Disc 4；不作为已验证配件或脚撑几何依据。 |

参考商品页面仅用于读尺寸、颜色、组成和外形。页面图片不复制到对象包；对象若采用自制几何，不在 `assets/manifest.json` 中把官网图片登记为已采用资源。所有未披露的形状均以“视觉近似”管理，并由 [bicycle-spec.md](./bicycle-spec.md) 的尺寸、接地和视角验收约束。

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
| [Poly Haven Studio HDRI](https://polyhaven.com/a/studio_small_09) | Studio Small 09；作者 Sergej Majboroda；官方页注明 CC0，提供 1K 到 16K 等分辨率；柔和大面积灯光、白色无缝背景，适合作产品高光参考。 | **暂不采用。** 当前查看器已用 Hemisphere、主光、补光和轮廓光形成棚拍照明；本轮首要问题是几何而非反射环境。先复核管件、零件、接地点和材质分配；如金属反射仍不足，再比较 1K 本地 HDRI 的画面收益与贴图/处理成本，并登记实际采用文件。 |
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
