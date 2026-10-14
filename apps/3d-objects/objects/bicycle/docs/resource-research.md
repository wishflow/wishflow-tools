# 自行车模块资源调研

调研日期：2026-10-14。目标是找到可公开静态托管、许可清楚、适合拆解交互和产品摄影风格的素材。第一轮逐项检查作品页；第二轮使用可用的3D资产连接器取得下载地址，并实际下载、打开源文件。授权仍以单项作品页、原作者声明和文件内许可证为依据；检索摘要不作为授权依据。

## 结论

- 已下载**8份模型/链条包、2套固定版本源码**，原件、许可证、SHA-256与检查结果保存到 `references/`，见下文。专项链条实际为非滚子链，已拒绝作为自行车链采用；整车和前轮需重定尺寸、轴心、部件层级与面数预算，不能直接标记为已采用整车。
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
| [Bicycle front wheel](https://blendswap.com/blend/22015)，piergi，BlendSwap | 已下载4,935,693字节ZIP，含Blender2.79源与原许可HTML，**CC0 1.0**；实测METRIC/Scale1。 | 轮组根下有独立轴芯、花鼓、圈、胎、气门及4类辐条子件；各类Array9形成36辐条，辐条与帽在源件内分别连通。可参考J弯、帽、气门及圈截面。 | 实测胎外径706.59/宽41.47，非目标698/38；求值912,822三角面。36改32、重建碟刹花鼓、重定轮圈胎体与减面后再用；不能整体缩放即视为符合目标。 |
| [Chain Assets](https://blendswap.com/blend/25745)，A_W_O_L__，BlendSwap | 已下载1,133,924字节BLEND，**CC0 1.0**；4集合为Classic、Heavy、Jewelry、Cuban。 | 实际为互扣金属环/首饰链，Array+Curve+Subdivision，当前开放路径；可参考沿曲线阵列的编辑方法。 | **不采用为自行车链条。** 没有内外链板/销/滚子，单环达0.5–3.25米量级，无12.7节距合同。每Core虽有1Bone，但无骨骼修改器/权重/骨约束，全场景无动作/Drivers；不是已完成自行车链条rig。 |
| [Simple Bicycle](https://blendswap.com/blend/21760)，brodysean1899，BlendSwap | 已下载1,035,057字节ZIP，含`Bicycle.blend`及原CC0许可HTML；实查剔除背景后69网格+2曲线、约44,001三角面、9个无贴图材质。 | **优先提取零件外形**：较轻、零件分离，可取座垫、车把、挡泥板/五金后按本规格重定尺寸与语义节点。 | 单位NONE、缩放未应用，无父子/约束/骨骼/动作；每轮仅12辐条候选。缩至698轮径后轴距1103.992/胎宽17.540，非目标1075/38；World有缺失HDR、另有unused参考图，提取时移除依赖。 |
| [Old Bicycle](https://blendswap.com/blend/26933)，5thElement，BlendSwap | 已下载32,175,384字节BLEND，**CC0 1.0**；米制，4车体大网格63,504三角面、4张packed4096 PBR图。 | 可拆连通片取座垫、挡泥板与五金造型；4组间使用Child Of约束，可供观察转向/轮组组织。 | 轴心间距1158.93、轮组直径包络897.56，比例不符；转向组原点在前轮中心，需重定。无骨骼/动作/Drivers；大组合不等于细零件。Metallic/Roughness源标sRGB须审核，4K图超当前1024预算。 |
| [Pink city bicycle](https://www.blendkit.com/asset-gallery-detail/4c1a83c1-829f-4c00-878e-9e73c6b89c3b/)，Kin Chen，Blendkit（原 BlenderKit） | 单项页为 Free、**CC0 1.0**，3.9 MiB，91,594 polygons；实际下载 `.blend` 4,058,371字节，METRIC/Scale1。 | 已检查44对象、38网格、5曲线、20骨骼/2动作，车架、前叉、车把、挡泥板、曲柄等有具名对象；轮胎/轮圈/辐条/花鼓在每个wheelset内部合并。篮子、配件与链条组织可作优先参考。 | 求值后710,112三角面，显著超过100k候选预算；前轮约0.582直径且使用V刹。当前帧部分Hook刹线/Bolt对象异常放大，整体包围盒不作物理整车尺寸。需取所需部件、重定尺寸/轴心/材质并减面，未接入网页。 |
| [City bike model only Blender curves](https://www.blendkit.com/asset-gallery-detail/b6c06691-d6bc-4b24-8d62-1f5bb50898b2/)，Joachim Bornemann，Blendkit | 作者称 Blender 4.3.1、全部使用曲线、略去螺丝等小细节，适合作背景；页面为 Free，但许可为 **Royalty free**；6.9 MiB，184,791 polygons。 | 可了解以曲线形成车架和挡泥板的表达方式，说明曲线建模并不要求从零探索。 | 未下载；尺寸/层级未知。免费获取不等于允许把源模型或可轻易提取的改编资产放入公开静态包；暂不采用其几何。作品也主动声明缺小零件，不能解决细节精度合同。 |
| [Vintage Bicycle](https://www.blendkit.com/asset-gallery-detail/32783d96-735c-4365-9bf4-818b9fc39727/)，Theo Müller，Blendkit | 作者说明是其 1936 年自行车，用 Drivers 让大链轮的局部 x 旋转驱动链条/车轮、转向 empty 的局部 z 旋转控制车把；Free、**Royalty free**，8.2 MiB，137,203 polygons。 | 公开说明可以补“驱动链条/车轮 + 转向空对象”的建模组织参考；不必把所有社区自行车都视为没有运动结构。 | 未下载；真实 driver 表达式、父子层级、单位、轴心仍未知；复古车型也不是本车。许可按上述 Royalty free 限制处理，暂不发布其源模型或生成资产。 |
| [ParametricChainSprocketGenerator](https://github.com/EricRorich/ParametricChainSprocketGenerator)，EricRorich | **GPL-3.0-or-later**，已下载源码/文档/完整许可，固定版本 `28779a74307f043059b5510c9af09618d7ad77cd`。按毫米输入换算米制、处理Unit Scale；齿廓局部x-y、厚度局部z。 | 3/32自行车预设为节距12.7、滚子7.75、片厚2.0、径向避让0.15、倒角0.10，每齿32采样；可参考滚子口袋/节圆生成。模型需旋转到本模块轴向。 | 已核对18源文件总清单中的所属文件哈希，未安装/执行。覆盖默认5齿、5孔和额外链支撑；对称通用齿采用tip angle0°，不套默认1.5°。未复制Shimano坡道/花键；软件许可与输出几何许可分别核对。 |
| [OpenSCAD-Sprockets](https://github.com/dallenwilson/OpenSCAD-Sprockets)，Dallen Wilson / 原作者 Shawn Steele | 已下载版本 `6f9fe967066f3c9aa58237296ac43f489fe1a7f6`；`Sprockets.scad`为 **MS-PL**，依赖`threads.scad`为 **GPL-3.0-or-later**，两份许可完整保留。自行车分支使用英寸并显式换算；修改者只测试ANSI。 | 可交叉核对链轮算法和参数组织，作为第二个文本实现。 | 未执行。默认片厚0.110 inch=2.794超过所选链内宽2.38125，滚子默认7.9375也不同；含打印fudge，不能直接套默认值/整体缩放。不同文件分别遵守其许可。 |
| [custom chain ring](https://grabcad.com/library/custom-chain-ring-1)，Robert Biehle，GrabCAD | [作者模型列表](https://grabcad.com/robert.biehle-1/models)公开说明 compact BCD 110 mm、齿数可变；同列表另有座垫导轨/轮组等尺寸说明。单项页面在本轮文本访问中只返回需 JavaScript 的壳页面。 | 可作为查找可编辑链轮 CAD、接口和通用车件的线索；110 mm BCD 仅属于作者这个设计。 | **未核验**格式、文件、单位、层级和作品许可；站点 terms 本轮返回 403。下载免费、可浏览或外观像品牌件都不能证明可再分发；当前不采用，也不把 110 mm BCD 填成本车事实。 |
| [Bicycle wheel dish diagram.svg](https://commons.wikimedia.org/wiki/File:Bicycle_wheel_dish_diagram.svg)，Keithonearth，Wikimedia Commons | 原作者 own work；SVG 395×730，51 KB；可选 **CC BY-SA 3.0** 或 GFDL。内容是后轮飞轮侧与非飞轮侧辐条长度/角度差异的图示。 | 可补“轮圈在车体中面，后花鼓法兰不对称、左右辐条夹角不同”的结构说明，避免把后轮做成前轮的对称复制。 | 这是无本车型毫米尺寸的 2D 示意图，没有 3D 层级/pivot；不能从 SVG 像素推出本车法兰或辐条长。只读其结构事实，不把原图复制进资产包；若未来引用图像需满足对应署名/同许可条件。 |

BlendSwap的 [API与许可说明](https://blendswap.com/3d-mcp-api/docs)明确作品许可由上传者声明（`uploader_declared`）；[下载说明](https://blendswap.com/about)要求账户。用户已在内置浏览器登录，四份CC0候选通过页面真实文件按钮下载；本轮不需要API凭证。前轮和简单整车ZIP带原许可HTML，旧站作品编号与当前URL编号不同，原文和对应关系保留在检查记录。下载后仍按实际部件/第三方内容和尺寸合同决定是否采用。

Blendkit 的 [Licensing FAQ](https://www.blendkit.com/docs/licenses/licensing-faq/)允许出售渲染，允许资产难以被用户提取的游戏用途，且不允许把源资产重售为模型/场景。本模块的静态文件可直接提取，现有说明不足以证明这种模型公开再分发方式获准，因此 **Free + Royalty free 候选不能默认获准随站点公开分发**；上表明确为 CC0 的 Pink city bicycle 可进入文件验收候选。

### 实际能够补齐与仍不能补齐的边界

| 缺口 | 本轮能补的内容 | 仍缺的证据及原因 |
| --- | --- | --- |
| 轮组细节 | 专项CC0前轮已测独立轴芯/花鼓/圈/胎/气门/辐条层级，另检查CC BY OBJ与整车wheelset。 | Giant原圈/花鼓型号及图仍缺；专项前轮36辐条/706.59×41.47、无碟片，须按目标重建而非直接采用。 |
| 链轮与链条 | 已下载Python/OpenSCAD核对算法；已检查Chain Assets并排除非自行车链型，Pink链条结构可作参考。 | CS-HG200专有坡道及KMC完整板廓仍缺，按固定D尺寸建滚子链；通用环链的路径/骨架不能自动转为自行车铰链。 |
| 曲面和配件 | 多个整车 `.blend` 与全曲线城市车候选可进入外形/结构审核。 | 照片和社区审美模型没有给本车管件截面、焊缝、前叉控制点、D-Fuse 截面或配件安装孔位；必须将通用设计值与车型事实分开。 |
| 运动层级 | 已检查Pink的20骨骼/2动作和Clint的7骨骼/1动作，可读实际对象、父级与原点；Vintage作者另提供公开Drivers说明。 | 未重建为目标车的稳定部件/运动根，GLB不会自动携带全部Drivers与约束；要按最终运动树适配与导出验证。 |

下一轮优先从Simple Bicycle提取分离的通用零件外形，从专项前轮参考辐条/圈/气门细节，再参考Pink/Old配件与参数化链轮源码，按最终规格适配。Chain Assets已排除为自行车链条几何。原车未知曲面已有同类车P依据与固定D值，见 [同类车研究](./similar-bike-dimensions.md)。原件放在独立`references/manifest.json`，网页`assets/manifest.json`只列实际采用贴图，真正提取/适配时再登记采用记录。

## 已下载资源与实际文件检查

8份模型/链条包合计 **50,759,241字节**；两套源码共18个原文件、194,121字节，无嵌套Git仓库。原件保持下载字节；没有运行第三方生成器或保存源场景改动。

| 资源/本地路径（相对模块） | 来源与许可 | 实际检查与下一步用途 |
| --- | --- | --- |
| `references/models/pink-city-bicycle.blend` | Kin Chen；[Pink city bicycle](https://www.blendkit.com/asset-gallery-detail/4c1a83c1-829f-4c00-878e-9e73c6b89c3b/)；CC0 1.0 | Blender源3.5.10可打开，METRIC/Scale1，20骨骼、2动作、12材质、2张内嵌1024纹理；轮组内部合并，求值710,112三角面。用配件/链条造型参考，改机械刹车类型和目标尺寸 |
| `references/models/blue-bicycle.blend` | Salman Ramezani；[Blue Bicycle](https://www.blendkit.com/asset-gallery-detail/ef778d6c-78cc-49fd-9f34-2347c23fd915/)；CC0 1.0 | 源3.3.6，METRIC/Scale1；只有一个合并网格、144,412三角面/15材质、无骨骼动作。原坐标横×纵×高外包约0.755×1.725×1.013米；小型车轮廓，拆分/重定轴心和尺寸成本高，作备选外形参考 |
| `references/models/bicycle-wheel.zip` | Rakshi Games；[Free Bicycle Wheel](https://opengameart.org/content/free-bicycle-wheel-0)；CC BY 3.0 | 含OBJ与AO/色/法线图；274顶点、240面、一个对象，无声明单位。OBJ引用的`BicycleWheel.mtl`不在包内；尺寸约5.513×5.522×0.560原生单位，需自己恢复材质/尺度。只作低面轮组组织参考 |
| `references/models/rigged-bicycle.zip` | Clint Bellanger；[Bicycle](https://opengameart.org/content/bicycle)；CC BY 3.0 | 含Blender2.62源和512纹理；当前帧2求值820三角面，一个网格/7骨骼/1动作，单位NONE。可参考轮/转向/脚踏骨骼组织，细节与物理尺度需重做 |
| `references/models/blendswap-front-wheel.zip` | piergi；[Bicycle front wheel](https://blendswap.com/blend/22015)；CC0 1.0 | 有9个轮组mesh子件；36辐条、轮径706.59/宽41.47、局部轴z，根当前倾斜且有动作。912,822求值三角面；3张packed图最大2048。圈外包径639.66/宽26.15/径深21.29为实测包络，不当622 BSD或ERD。花鼓外包法兰45.89径、法兰中面距64.5，型号/OLD/PCD语义不明；无碟片 |
| `references/models/blendswap-chain-assets.blend` | A_W_O_L__；[Chain Assets](https://blendswap.com/blend/25745)；CC0 1.0 | 4种互扣环链，METRIC/Scale1；当前viewport全场122,980三角面。Cuban渲染细分单项356,592面；开放曲线阵列、无actions/drivers，不作为自行车滚子链几何采用 |
| `references/models/blendswap-simple-bicycle.zip` | brodysean1899；[Simple Bicycle](https://blendswap.com/blend/21760)；CC0 1.0 | 原件Blender2.79，69车体网格+2曲线、44,001三角面，无层级/骨骼/约束/动作；单位NONE。按698轮径缩放仍轴距1103.992/胎宽17.540，仅12辐条/轮；无材质图但缺环境HDR，优先取分离零件后重定参数 |
| `references/models/blendswap-old-bicycle.blend` | 5thElement；[Old Bicycle](https://blendswap.com/blend/26933)；CC0 1.0 | 4大车体网格、63,504面，有Child Of但无骨骼/动作；单位METRIC/Scale1却尺寸不符。4张4096内嵌PBR、转向轴心需重建；通用配件造型备选 |
| `references/sources/parametric-chain-sprocket-generator/` | [EricRorich源码](https://github.com/EricRorich/ParametricChainSprocketGenerator/tree/28779a74307f043059b5510c9af09618d7ad77cd)；GPL-3.0-or-later | 保留Python源码、工具、原文档和完整LICENSE；没有现成BLEND/GLB/STL。首版按本模块指定齿数、滚子和片厚使用，不默认运行演示脚本 |
| `references/sources/openscad-sprockets/` | [Dallen Wilson源码](https://github.com/dallenwilson/OpenSCAD-Sprockets/tree/6f9fe967066f3c9aa58237296ac43f489fe1a7f6)；MS-PL/GPL分文件 | 保留SCAD、README与两份完整许可；默认自行车尺寸与所选链条不兼容，供算法交叉核对 |

清单、下载来源、大小和SHA-256见 [references/manifest.json](../references/manifest.json)，源码逐文件Git blob SHA/SHA-256见 [generator-checksums.json](../references/generator-checksums.json)。[检查入口](../references/inspection-report.json)及其`additionalReports`保存后台只读Blender检查、对象原点/父级/修改器/单位/面数和测量结果；各报告明确自己的Blender版本、帧和细分级别，原件未保存修改。原生坐标未转换为本模块坐标，轮组按自身根局部轴量测，Pink异常Hook/零件包围盒不用于推断整车长。OBJ仅文本检查，ZIP另作CRC检查，未进行新模型GLB/浏览器验收。

下载与许可投递规则见 [LICENSES.md](../references/LICENSES.md)。这些文件属于开发研究参考，未从应用源码导入，构建不复制它们到网页。未来提取CC BY几何时须在采用清单/用户可见署名中附作者、作品和许可，并说明改动；厂商技术PDF仅临时读取和引用尺寸事实，不复制到可公开资产目录。

### 获批实施时的优先复用路线

| 部位 | 优先源/方法 | 必须适配的条件 |
| --- | --- | --- |
| 座垫、把横、挡泥板、通用五金 | Simple Bicycle分离部件，其次Pink/Old外形 | 映射语义partId，按P/D尺寸改形，补连接实体/安装孔，移除缺环境或品牌参考依赖 |
| 辐条J弯、帽、气门、双层圈细节 | piergi专项前轮 | 将4×9阵列重建为32孔三交叉，按指定法兰/圈截面与698×38胎体重做，添加碟刹接口，降低细分并重定局部轴 |
| 40T牙盘/8片飞轮 | 已下载参数化源码作齿廓算法参考 | 应用本规格齿数/内宽/滚子与薄片厚，单独做蜘蛛/HG接口；不把默认孔径或专有坡道当原车事实 |
| 自行车链条 | 依据零件研究10.1生成内外链板/滚子/销，Pink只供外观组织参考 | 固定12.7欧氏销距、7.3销长与全挡同一偶数节数；排除Chain Assets互扣环链 |
| 后拨/机械碟刹/侧撑 | 固定D装配合同与同类P参考 | 实际网格求接触/避让/接地，按指定轴心运动；原模型V刹、低模骨架或错误pivot不能直接沿用 |

以上是可审阅的制作路线，尚未提取、改编或接入模型；性能和浏览器验收在实现阶段执行。

## 资源库检查记录

| 资源库 | 检查结果 | 处理 |
| --- | --- | --- |
| [Poly Haven 模型库](https://polyhaven.com/models) | 模型列表包含 521 项，Vehicles & Transport 分类为 11 项；通过目录/关键词检索未找到合适自行车。该库资产统一 CC0，但无适配的整车候选。 | 不选自行车模型。继续使用其公开 CC0 纹理目录作为备用来源。 |
| [Poly Haven Studio HDRI](https://polyhaven.com/a/studio_small_09) | Studio Small 09；作者 Sergej Majboroda；官方页注明 CC0，提供 1K 到 16K 等分辨率；柔和大面积灯光、白色无缝背景，适合作产品高光参考。 | **暂不采用。** 当前查看器已用 Hemisphere、主光、补光和轮廓光形成棚拍照明；本轮首要问题是几何而非反射环境。先复核管件、零件、接地点和材质分配；如金属反射仍不足，再比较 1K 本地 HDRI 的画面收益与贴图/处理成本，并登记实际采用文件。 |
| [ambientCG Metal 012](https://ambientcg.com/view?id=Metal012) | 单项页注明程序化资产、标签 Brushed / Bumpy / Metal / Scratches / Silver / Steel，并提供 1K JPG 下载。作者为 ambientCG / Lennart Demes。下载的 1K ZIP 为 3.8 MiB；本模块只保留三张所需贴图，合计约 1.4 MiB。 | **采用。** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) 允许复制、修改和再分发；无需署名。本地资源路径、用途和处理记录见 `assets/manifest.json`。 |
| [Sketchfab](https://sketchfab.com/3d-models) | 逐项检查上表 3 个可下载自行车模型。许可从每个作品页核验；各自适用的 CC BY 4.0 或 CC BY-SA 4.0 不限制公开再分发，但候选结构/风格不够适合。 | 仅前两项许可条件可接受；Carbon Frame Bike 的 ShareAlike 条件及车型不合适。均未打包。 |
| [Blendkit 授权说明](https://www.blendkit.com/docs/licenses/) | 已下载Pink与Blue两份CC0；City bike model only Blender curves、Vintage Bicycle及另一Bicycle候选为Royalty free。免费计划与许可是两个独立字段。 | CC0两份已做源文件检查但未采用；Royalty free候选未公开打包。 |
| [Kenney 资产库](https://kenney.nl/assets) | 检查了 City Kit、Racing Kit、Train Kit 等可下载 CC0 方向；是低多边形城市/汽车/轨道交通资源，没有满足该写实自行车模块要求的独立自行车。 | 不采用；造型语言与产品展示模型不符。 |
| [Quaternius](https://quaternius.com/) | 检查 Downtown City MegaKit 与模块化城市环境方向。页面提供 FBX、Blend、glTF 等格式和 CC0 许可，但内容是城市街景构件，不是可拆解自行车。 | 不采用；环境素材不进入本模块的简洁摄影棚场景。 |

## 已采用素材文件

| 本地文件 | 来源文件 | 修改情况 | 用途 |
| --- | --- | --- | --- |
| `assets/textures/Metal012_1K-JPG_Color.jpg` | `Metal012_1K-JPG_Color.jpg` | 原始 1K JPEG；未改像素 | 金属部件底色纹理 |
| `assets/textures/Metal012_1K-JPG_NormalGL.jpg` | `Metal012_1K-JPG_NormalGL.jpg` | 原始 1K OpenGL 法线 JPEG；未改像素 | 金属部件表面细节 |
| `assets/textures/Metal012_1K-JPG_Roughness.jpg` | `Metal012_1K-JPG_Roughness.jpg` | 原始 1K JPEG；未改像素 | 金属部件粗糙度变化 |

下载包还含有其他贴图、预览和源工程，但本页不需要它们，因此不发布。站点不调用外部 URL 加载素材。
