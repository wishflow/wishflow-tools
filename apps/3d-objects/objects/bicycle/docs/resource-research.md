# 自行车模块资源调研

调研日期：2026-10-14。目标是找到可公开静态托管、许可清楚、适合拆解交互和产品摄影风格的素材。当前环境没有可用的专用 3D 资产搜索连接器，因此按要求直接检查资源库的单项页面和许可说明；聚合检索摘要不作为授权依据。

## 结论

- 已找到许可明确的社区整车、轮组和链条候选，以及可读源码的参数化链轮生成器；尚未找到**已核验**同时满足当前车型比例、主要机械部件独立控制和公开再分发要求的整车。不能把“尚未验证适配”写成“社区没有可用模型”。本轮核对作品页和公开文本源码，未下载、打开或验收候选模型。
- 使用自行车几何程序化建模，以精确控制 700C 轮径、车架尺寸、32 辐条、真实轴心 pivot、组件显隐和拆解。只补自行车这类专属机械几何，不重建基础金属表面微细节。
- 实际采用 ambientCG 的 **Metal 012** 1K PBR 图集，供碟片、牙盘、飞轮、花鼓和五金件使用。仅本地保存 Color、NormalGL 和 Roughness 三张 JPEG；着色时以金属材质和有限 UV 重复控制视觉强度。源图未做像素编辑。
- 另以 Giant Escape Disc 4（2025，美国版，M 码）作**几何与组件关系参考**，不下载、打包或发布其商品图/模型，也不把模型称作该品牌的官方复刻。品牌规格可锁定车架和原厂机构的可信基线；管件曲面与未公布尺寸仍是经视觉核对的近似值。

## 现实车型规格参考（不作为站点素材）

| 参考项 | 一手来源和可核对内容 | 未公开信息与建模限制 |
| --- | --- | --- |
| 车型与配色 | [Giant Escape Disc 4（2025，美国版）](https://www.giant-bicycles.com/us/escape-disc-4-2025)：车型为 Escape Disc 4；美国版尺码 S/M/L/XL，M 码建议身高 170–180 cm，配色 Black、Mars Dust。 | Giant 提醒不同地区尺码和规格可能变化；此处固定美国版 M 码作建模基准，不将品牌或配色当成授权素材。 |
| M 码车架几何 | [Giant 官方规格 PDF](https://static.giant-bicycles.com/pdf/giant-escape-disc-4-en-us-3878.pdf)：座管 485 mm、座管角 73°、有效上管 580 mm、头管 130 mm、头管角 71°、前叉偏移 50 mm、Trail 69.4 mm、轴距 1,075 mm、后下叉 445 mm、中轴落差 60 mm、Stack 556 mm、Reach 410 mm、跨高 754 mm；把宽 640 mm、把立 90 mm、曲柄 170 mm、轮径 700C。 | 没有车架节点坐标、各管外径/截面、壁厚、弯曲曲线、焊缝尺寸或可复刻 CAD。座垫高度按示意骑姿设置，不伪称厂方几何。 |
| 车架、前叉与安装位 | [Giant 官方车型页](https://www.giant-bicycles.com/us/escape-disc-4-2025)：ALUXX 级铝合金碟刹车架、高碳钢碟刹前叉、前叉和车架具有货架安装位。车型页的 ALUXX 说明为 6061 合金单抽管。 | 未列管件剖面、具体管径、前叉孔位尺寸和连接细节；只能用产品图辅助近似。安装位不代表标配货架。 |
| 传动 | Giant 车型页列出 Shimano Tourney TX 1×8、无前拨、Tourney TX 后拨、CS-HG200-8 12–32T、40T 锻造铝合金牙盘、KMC Z8.3 链条；M 码曲柄长170 mm。[Shimano CS-HG200-8 官方页](https://bike.shimano.com/en-NA/products/components/pdp.P-CS-HG200-8.html)确认范围；[官方EV的br-group](https://si.shimano.com/en/pdfs/ev/CS-HG200-8-3749/EV-CS-HG200-8-3749.pdf)补齐12/14/16/18/21/24/28/32T。 | Giant 未给拨把和后拨完整型号；HG200齿廓、轴向堆栈和装车链长仍未确认，详见 [零件技术研究](./component-reference-research.md)。旧11–32T序列不采用。 |
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

## 本轮补齐：社区模型、公开源码与技术图

本轮针对轮组、链条、链轮、曲面和通勤配件检索具体作品。下表的“页面确认”是作者或平台公开说明，**不等于已从源文件测量**。有 `.blend` 文件也不能自动证明模型是米制、网格已拆分、轴心正确或精度符合目标。

| 候选及作者 | 页面/源码已确认内容与许可 | 可补的模型输入 | 尚未核验与采用结论 |
| --- | --- | --- | --- |
| [Bicycle front wheel](https://blendswap.com/blend/22015)，piergi，BlendSwap | Blender 2.7x / Cycles，4.71 MB；作者称为研究辐条安装而制作的完整前轮，标签包含花鼓、轮圈、辐条、轮胎和气门；作品页标 **CC0**。 | 是优先检查的**零件级候选**；可参考轮圈、花鼓、辐条端部与气门的几何组织，避免从整车装饰网格里猜结构。 | 未下载；实际单位、轮径、辐条数/编法、法兰尺寸、对象层级和轴心未知；不能把页面说明直接当作 700×38C / 32 辐条。拿到源文件后需测量、重新定位与减面，再决定是否复用。 |
| [Chain Assets](https://blendswap.com/blend/25745)，A_W_O_L__，BlendSwap | Blender 2.8x / Cycles，1.08 MB；4 种链条、按 collection 分开，可经 armature 移动、经 path 改形和尺寸；作品页标 **CC0**。 | 可检查链节沿闭合路径分布的制作方法；作者已描述集合、骨架和路径关系，信息比只有整车渲染完整。 | 未下载；是否包含自行车滚子链、内外链板/滚子分离、12.7 mm 节距及真实转轴未知。不可把四类通用链条默认当 KMC Z8.3；应先检查链型和节距。 |
| [Simple Bicycle](https://blendswap.com/blend/21760)，brodysean1899，BlendSwap | Blender 2.7x / Cycles，1010 KB；作者声明中等面数、简单材质、无贴图；作品页标 **CC0**。 | 可作为干净的整车形状/部件拆分备选，比需要整理品牌贴图的整车更便于审查。 | 未下载；未公布单位、真实尺寸、零件层级、面数或 pivot。暂未采用；先做源文件清单和测量，不能只凭“中等面数”判定满足预算。 |
| [Old Bicycle](https://blendswap.com/blend/26933)，5thElement，BlendSwap | Blender 2.9x / Cycles，30.7 MB；作者说明在 Silo 建模、Substance 贴图、Blender UV；作品页标 **CC0**。 | 可作为座垫、挡泥板和五金等近距离造型候选；这是已有精细材质流程的整车。 | 未下载；轮径、车型、层级、pivot、网格/贴图分配未知。复古风格与本模块的 M 码混合通勤车不同；不能整车缩放后声称保持正确的每个零件尺寸。 |
| [Pink city bicycle](https://www.blendkit.com/asset-gallery-detail/4c1a83c1-829f-4c00-878e-9e73c6b89c3b/)，Kin Chen，Blendkit（原 BlenderKit） | 单项页为 Free、**Creative commons zero**，3.9 MiB，91,594 polygons；作者说明带篮子的粉色城市车。 | 提供一个已核对到 CC0 的城市车备选，纠正此前“没有具体 Blendkit 自行车候选”的记录。可检查篮子、挡泥板和通勤配件组织。 | 未下载；网页没有确认下载格式、单位、层级或 pivot；本站公开静态包可提取，只有确认为 CC0 的资源才可按本流程继续评估。原车型与材质仍需替换，不能用于证明 Giant 零件尺寸。 |
| [City bike model only Blender curves](https://www.blendkit.com/asset-gallery-detail/b6c06691-d6bc-4b24-8d62-1f5bb50898b2/)，Joachim Bornemann，Blendkit | 作者称 Blender 4.3.1、全部使用曲线、略去螺丝等小细节，适合作背景；页面为 Free，但许可为 **Royalty free**；6.9 MiB，184,791 polygons。 | 可了解以曲线形成车架和挡泥板的表达方式，说明曲线建模并不要求从零探索。 | 未下载；尺寸/层级未知。免费获取不等于允许把源模型或可轻易提取的改编资产放入公开静态包；暂不采用其几何。作品也主动声明缺小零件，不能解决细节精度合同。 |
| [Vintage Bicycle](https://www.blendkit.com/asset-gallery-detail/32783d96-735c-4365-9bf4-818b9fc39727/)，Theo Müller，Blendkit | 作者说明是其 1936 年自行车，用 Drivers 让大链轮的局部 x 旋转驱动链条/车轮、转向 empty 的局部 z 旋转控制车把；Free、**Royalty free**，8.2 MiB，137,203 polygons。 | 公开说明可以补“驱动链条/车轮 + 转向空对象”的建模组织参考；不必把所有社区自行车都视为没有运动结构。 | 未下载；真实 driver 表达式、父子层级、单位、轴心仍未知；复古车型也不是本车。许可按上述 Royalty free 限制处理，暂不发布其源模型或生成资产。 |
| [ParametricChainSprocketGenerator](https://github.com/EricRorich/ParametricChainSprocketGenerator)，EricRorich | **GPL-3.0-or-later** Python 源码，安装目标 Blender 3.6+；公开 README 与 `parametric_chain_sprocket/__init__.py` 可读。核对版本为 `28779a74307f043059b5510c9af09618d7ad77cd`。源码按节距/齿数计算节圆，按毫米输入换算米制并处理 Blender Unit Scale；齿廓位于局部 x-y，厚度沿局部 z。 | **最可直接审计的建模方法候选**：可补滚子链轮的节圆、滚子座、齿廓、厚度和单位转换，供 Blender Agent 逐参数生成链轮；模型需旋转到本模块轴向并对准中轴/后轴。 | 本轮只读取源码，没有安装、执行或导出。作者明确不复刻 Shimano 换挡坡道、短齿或花键接口；默认滚子直径和片厚只是通用起点，应以 KMC/实际飞轮资料为准。直接复用/修改 Python 源码需遵守 GPL；不要把软件许可自动当成所有生成几何的许可，也不要未经核对将其称作 Shimano 精确模型。 |
| [OpenSCAD-Sprockets](https://github.com/dallenwilson/OpenSCAD-Sprockets)，Dallen Wilson / 原作者 Shawn Steele | `Sprockets.scad` 文件头标 **MS-PL**，依赖 `threads.scad` 标 **GPL-3**；公开源码有有后拨/无后拨的自行车链轮分支，孔径/轮毂参数使用英寸并显式换算。README 说明修改者只测试过 ANSI 链尺寸。 | 可交叉核对链轮按节距/齿数生成的思路和参数组织，作为第二个公开文本实现。 | 本轮未执行。含打印用 fudge 常数，且自行车分支未获修改者实测；不能把输出当工程规格或整体缩放。导入需另做单位、孔径和齿廓验收；不把仓库“两个许可证”错误写成整个文件可任选一种。 |
| [custom chain ring](https://grabcad.com/library/custom-chain-ring-1)，Robert Biehle，GrabCAD | [作者模型列表](https://grabcad.com/robert.biehle-1/models)公开说明 compact BCD 110 mm、齿数可变；同列表另有座垫导轨/轮组等尺寸说明。单项页面在本轮文本访问中只返回需 JavaScript 的壳页面。 | 可作为查找可编辑链轮 CAD、接口和通用车件的线索；110 mm BCD 仅属于作者这个设计。 | **未核验**格式、文件、单位、层级和作品许可；站点 terms 本轮返回 403。下载免费、可浏览或外观像品牌件都不能证明可再分发；当前不采用，也不把 110 mm BCD 填成本车事实。 |
| [Bicycle wheel dish diagram.svg](https://commons.wikimedia.org/wiki/File:Bicycle_wheel_dish_diagram.svg)，Keithonearth，Wikimedia Commons | 原作者 own work；SVG 395×730，51 KB；可选 **CC BY-SA 3.0** 或 GFDL。内容是后轮飞轮侧与非飞轮侧辐条长度/角度差异的图示。 | 可补“轮圈在车体中面，后花鼓法兰不对称、左右辐条夹角不同”的结构说明，避免把后轮做成前轮的对称复制。 | 这是无本车型毫米尺寸的 2D 示意图，没有 3D 层级/pivot；不能从 SVG 像素推出本车法兰或辐条长。只读其结构事实，不把原图复制进资产包；若未来引用图像需满足对应署名/同许可条件。 |

BlendSwap 的 [API 与许可说明](https://blendswap.com/3d-mcp-api/docs)明确作品许可由上传者声明（`uploader_declared`），平台不替上传者证明权利；[下载说明](https://blendswap.com/about)要求账户。因本轮没有登录和下载作品，表中源文件内部结构全部保持“未核验”。后续拿到文件还需保留作品页/许可记录，并检查文件中第三方贴图与品牌内容，不能只保存一个 CC0 标签。

Blendkit 的 [Licensing FAQ](https://www.blendkit.com/docs/licenses/licensing-faq/)允许出售渲染，允许资产难以被用户提取的游戏用途，且不允许把源资产重售为模型/场景。本模块的静态文件可直接提取，现有说明不足以证明这种模型公开再分发方式获准，因此 **Free + Royalty free 候选不能默认获准随站点公开分发**；上表明确为 CC0 的 Pink city bicycle 可进入文件验收候选。

### 实际能够补齐与仍不能补齐的边界

| 缺口 | 本轮能补的内容 | 仍缺的证据及原因 |
| --- | --- | --- |
| 轮组细节 | 已有轮组专项 `.blend` 候选与后轮 dish 结构图，可确定轮圈、气门、花鼓法兰、辐条端部应分别表达。 | 未获得 Giant 原轮圈/花鼓型号和其技术图，候选前轮单位/尺寸未测；社区通用轮组不会自动成为 S-X3 32 孔的工程几何。 |
| 链轮与链条 | 公开 Python/OpenSCAD 可以核对节圆公式、齿数阵列、滚子座和单位；CC0 链条资源公开了 path/armature 组织。 | CS-HG200 专有换挡齿形/花键及 KMC 链板完整轮廓需要厂商图或实测；生成器通用预设不能替代零件厂家数据。 |
| 曲面和配件 | 多个整车 `.blend` 与全曲线城市车候选可进入外形/结构审核。 | 照片和社区审美模型没有给本车管件截面、焊缝、前叉控制点、D-Fuse 截面或配件安装孔位；必须将通用设计值与车型事实分开。 |
| 运动层级 | Vintage Bicycle 的作者明确提供了 Drivers 与 steering empty 方案，说明完整联动模型可找到。 | 页面未提供实际 pivot 坐标/driver 表达式；GlTF 不会自动带走所有 Blender Drivers 约束，且此候选许可不满足直接公开包。 |

下一轮模型制作优先检查 **Bicycle front wheel → Chain Assets → Pink city bicycle / Simple Bicycle** 的源文件；先写对象名、父子层级、单位、轮径、接点与 pivot 清单，再按本规格选择复用零件。对原车型的未知曲面，要么获得实物多角度测量/厂家图，要么制定带明确数值和容差的通用示例零件。当前尚未采用任何新增社区模型、脚本或图像，`assets/manifest.json` 因此不增加虚假的“已采用”记录。

## 资源库检查记录

| 资源库 | 检查结果 | 处理 |
| --- | --- | --- |
| [Poly Haven 模型库](https://polyhaven.com/models) | 模型列表包含 521 项，Vehicles & Transport 分类为 11 项；通过目录/关键词检索未找到合适自行车。该库资产统一 CC0，但无适配的整车候选。 | 不选自行车模型。继续使用其公开 CC0 纹理目录作为备用来源。 |
| [Poly Haven Studio HDRI](https://polyhaven.com/a/studio_small_09) | Studio Small 09；作者 Sergej Majboroda；官方页注明 CC0，提供 1K 到 16K 等分辨率；柔和大面积灯光、白色无缝背景，适合作产品高光参考。 | **暂不采用。** 当前查看器已用 Hemisphere、主光、补光和轮廓光形成棚拍照明；本轮首要问题是几何而非反射环境。先复核管件、零件、接地点和材质分配；如金属反射仍不足，再比较 1K 本地 HDRI 的画面收益与贴图/处理成本，并登记实际采用文件。 |
| [ambientCG Metal 012](https://ambientcg.com/view?id=Metal012) | 单项页注明程序化资产、标签 Brushed / Bumpy / Metal / Scratches / Silver / Steel，并提供 1K JPG 下载。作者为 ambientCG / Lennart Demes。下载的 1K ZIP 为 3.8 MiB；本模块只保留三张所需贴图，合计约 1.4 MiB。 | **采用。** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) 允许复制、修改和再分发；无需署名。本地资源路径、用途和处理记录见 `assets/manifest.json`。 |
| [Sketchfab](https://sketchfab.com/3d-models) | 逐项检查上表 3 个可下载自行车模型。许可从每个作品页核验；各自适用的 CC BY 4.0 或 CC BY-SA 4.0 不限制公开再分发，但候选结构/风格不够适合。 | 仅前两项许可条件可接受；Carbon Frame Bike 的 ShareAlike 条件及车型不合适。均未打包。 |
| [Blendkit 授权说明](https://www.blendkit.com/docs/licenses/) | 本轮检查具体自行车：Pink city bicycle 为 CC0；City bike model only Blender curves、Vintage Bicycle 与 Bicycle 为 Royalty free。免费计划与许可是两个独立字段。详细证据、来源链接和未验证项见上表。 | CC0 候选可进入源文件审核；Royalty free 候选暂不公开打包。所有新增候选均未下载、采用。 |
| [Kenney 资产库](https://kenney.nl/assets) | 检查了 City Kit、Racing Kit、Train Kit 等可下载 CC0 方向；是低多边形城市/汽车/轨道交通资源，没有满足该写实自行车模块要求的独立自行车。 | 不采用；造型语言与产品展示模型不符。 |
| [Quaternius](https://quaternius.com/) | 检查 Downtown City MegaKit 与模块化城市环境方向。页面提供 FBX、Blend、glTF 等格式和 CC0 许可，但内容是城市街景构件，不是可拆解自行车。 | 不采用；环境素材不进入本模块的简洁摄影棚场景。 |

## 已采用素材文件

| 本地文件 | 来源文件 | 修改情况 | 用途 |
| --- | --- | --- | --- |
| `assets/textures/Metal012_1K-JPG_Color.jpg` | `Metal012_1K-JPG_Color.jpg` | 原始 1K JPEG；未改像素 | 金属部件底色纹理 |
| `assets/textures/Metal012_1K-JPG_NormalGL.jpg` | `Metal012_1K-JPG_NormalGL.jpg` | 原始 1K OpenGL 法线 JPEG；未改像素 | 金属部件表面细节 |
| `assets/textures/Metal012_1K-JPG_Roughness.jpg` | `Metal012_1K-JPG_Roughness.jpg` | 原始 1K JPEG；未改像素 | 金属部件粗糙度变化 |

下载包还含有其他贴图、预览和源工程，但本页不需要它们，因此不发布。站点不调用外部 URL 加载素材。
