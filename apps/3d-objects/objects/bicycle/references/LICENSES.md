# 自行车参考源文件：署名、许可与使用记录

下载日期：2026-10-14。这里保存建模研究原件，尚未改编、接入或发布为网页运行时模型。下载地址、字节数、SHA-256和固定源码版本见 [manifest.json](./manifest.json)，实际结构检查见 [inspection-report.json](./inspection-report.json)，源码逐文件记录见 [generator-checksums.json](./generator-checksums.json)，文档公式复算见 [parameter-check-report.json](./parameter-check-report.json)。

## 1. 模型作者与许可证

| 本地文件 | 作品、作者、来源 | 许可与当前修改记录 |
| --- | --- | --- |
| `models/pink-city-bicycle.blend` | **Pink city bicycle — Kin Chen**；[作品页](https://www.blendkit.com/asset-gallery-detail/4c1a83c1-829f-4c00-878e-9e73c6b89c3b/) | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)；原始下载文件，无修改 |
| `models/blue-bicycle.blend` | **Blue Bicycle — Salman Ramezani**；[作品页](https://www.blendkit.com/asset-gallery-detail/ef778d6c-78cc-49fd-9f34-2347c23fd915/) | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)；原始下载文件，无修改 |
| `models/bicycle-wheel.zip` | **Free Bicycle Wheel — Rakshi Games**；[作品页](https://opengameart.org/content/free-bicycle-wheel-0) | [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/)；原始下载ZIP，无修改 |
| `models/rigged-bicycle.zip` | **Bicycle — Clint Bellanger**；[作品页](https://opengameart.org/content/bicycle) | [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/)；原始下载ZIP，无修改 |
| `models/blendswap-front-wheel.zip` | **Bicycle front wheel — piergi**；[作品页](https://blendswap.com/blend/22015) | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)；原始ZIP，包含原许可HTML，无修改 |
| `models/blendswap-chain-assets.blend` | **Chain Assets — A_W_O_L__**；[作品页](https://blendswap.com/blend/25745) | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)；原始BLEND，无修改；检查确认为通用互扣链/首饰链，不作自行车滚子链采用 |
| `models/blendswap-simple-bicycle.zip` | **Simple Bicycle — brodysean1899**；[作品页](https://blendswap.com/blend/21760) | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)；原始ZIP，包含原许可HTML，无修改 |
| `models/blendswap-old-bicycle.blend` | **Old Bicycle — 5thElement**；[作品页](https://blendswap.com/blend/26933) | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)；原始BLEND，无修改 |

CC BY两份原件的署名已在本表保留。后续若提取、缩放、拆分、减面、替换材质或导出几何，采用清单及公开展示的素材署名须继续包含作品名、作者、上述作品/许可链接和具体改动说明。CC0无需强制署名，本项目仍保留来源以追溯。

下载包内第三方纹理或品牌内容的权利不会因平台标签自动得到额外证明；源文件检查记录与具体采用部件同时审核。当前下载包内材质/纹理仅作研究，目标车保持无品牌外观。

## 2. 参数化源码与保留的原始许可

| 目录/作者 | 固定版本 | 文件许可与使用方式 |
| --- | --- | --- |
| `sources/parametric-chain-sprocket-generator/`；EricRorich，代码信息署名Eric Roehrich / Hermes Agent | [28779a74307f043059b5510c9af09618d7ad77cd](https://github.com/EricRorich/ParametricChainSprocketGenerator/tree/28779a74307f043059b5510c9af09618d7ad77cd) | **GPL-3.0-or-later**；完整许可保留于 [LICENSE](./sources/parametric-chain-sprocket-generator/LICENSE)，原README/CHANGELOG及Python文件未改动 |
| `sources/openscad-sprockets/`；Dallen Wilson，原链轮作者Shawn Steele，螺纹库作者Dan Kirshner | [6f9fe967066f3c9aa58237296ac43f489fe1a7f6](https://github.com/dallenwilson/OpenSCAD-Sprockets/tree/6f9fe967066f3c9aa58237296ac43f489fe1a7f6) | `Sprockets.scad`采用 **MS-PL**，依赖`threads.scad`采用 **GPL-3.0-or-later**；保留 [LICENSE.ms-pl](./sources/openscad-sprockets/LICENSE.ms-pl) 与 [LICENSE.gpl-3](./sources/openscad-sprockets/LICENSE.gpl-3)，分别按文件许可处理 |

本轮直接下载固定提交中的18个文本文件，保留作者版权头及许可证；没有安装、执行、修改第三方生成器，没有复制嵌套`.git`。后续复用/修改源码时记录具体来源文件与改动，保留通知并按对应许可提供源码。软件许可不自动成为所有生成几何的许可，也不提供Shimano/Giant原厂齿形或CAD的权利证明。

校验区分原件完整性与自写文件格式：18源文件与上游Git blob SHA、SHA-256及字节数逐一一致。OpenSCAD原件包含7处行尾空白和1处文件尾空行，原样保留以维持上游哈希；`git diff --check`因此对自写文档/JSON和其他非原件文件按路径执行，原件不作格式修复。

源码包省略原README引用的预览PNG，省略清单见校验记录；本地原README的这些图链接因此不会显示。核心Blender生成器仅用Blender自带模块，可选绘图工具另需matplotlib/numpy；本轮未安装这些环境依赖。

## 3. 原件与后续改编的目录约定

1. 本目录原件保持下载时字节不变；哈希核验基于原件。
2. ZIP解压到临时目录或所属模块的工作目录后再检查，使用zip内贴图恢复相对路径；缺失MTL的轮组需要另建材质，不能报告原材质已完整导入。
3. 获批实施时，只把实际采用的部件/纹理放到模块运行时`assets/`，登记`assets/manifest.json`并完成尺寸、轴心、三角面和浏览器验收；研究目录不会被当前应用导入。
4. 制造商技术PDF/商品图不在本目录再分发。建模文档链接原网页并提炼尺寸事实；原车未公开值继续保留U，采用的同类/推测值分别记P/C/D。
5. 四份BlendSwap候选已通过用户登录的内置浏览器下载。前轮/简单整车ZIP内原许可页使用旧站作品编号92493/92090，标题与作品对应，原文件完整保留；清单使用当前公开作品页编号22015/21760。后续新增资源也先记录来源、许可、大小、哈希和实际检查，再决定采用。
