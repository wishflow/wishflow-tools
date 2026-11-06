# 实施计划

本文是 Guns’n’Glory 唯一活动进度与任务来源，只保留未完成工作。产品行为见[产品规格](spec.md)，模块边界见[架构](architecture.md)，存储边界见[存储契约](storage-contracts.md)，步进和随机语义见[模拟与自动化契约](simulation-and-automation.md)。

每轮先对照实际代码、测试和近期提交，细化接下来的若干步骤及验收条件；计划可执行后，再按依赖逐步实现。每个切片针对性验证并本地提交，完成后立即删除已完成条目、校准后续步骤。整批结束才跑全套检查；不重复已通过的检查，除非相关代码变化或出现回归。

## 当前状态

- 正式关卡 **3/60**：Cow Gulch、Apache Valley、Fort Kaboom 已完成真实战役验收。
- map03 与移动端工具栏修复已完成。最近一次完整检查通过：类型检查、285 项单测、生产构建和 91/91 E2E；该结果早于当前 map04 开发批次，本批收口时再运行全套检查，不逐切片重复运行。
- 公开版本仍是 master 上的 e922c3f。当前开发分支另有尚未集成的已验收提交；整批完成前不将本地代码称为已发布。
- New Mexico 第 4 关 Tech Town 已在目录中列名，但尚未加入正式关卡或解锁链；当前应继续显示为未实现。map04 是当前唯一开发目标；Damage Style 6 火箭、Pyromaniac 地图单位、Salesman 毒瓶、Gambler/Casino 实体及特殊单位整合检查点 A 均已完成定向验证。Gambler 规则、共享随机、Game 会话结算和窗口内交互使用独立调试样例，尚不代表正式 Tech Town 战役。地图工厂已验证接收独立解锁回调；档案等级门槛尚未接入，留待正式关卡注册步骤处理。列车原图/图层与五节编组横向移动（3.5a–b）已完成定向测试、类型检查和本地浏览器核对；下一步为蒸汽表现与选择音效（3.5c）。
- 原始 32×24 TDM、四条方向场路线、全部相关标记坐标，以及 768 个地形图块和 147 个道路/铁路绘制项已导入并通过定向测试。`tech-town-scene.ts` 按 APK 码位组装 52 个非赌场静态装饰/建筑；解锁时再加入 Casino。资源锚点与 hdpi 原图已核对；此场景尚未接入正式战役。
- 本轮核对更正了地图单位码位：96–101 是 type 1–6 的休眠单位（activity 4）；104–109 是 type 1–6 的活动单位（activity 5），本图仅有 105，即 type 2 Mexican；130、131 分别是 type 35 Pyromaniac 与 type 36 Salesman 的休眠单位；132 是活动 Gambler（type 9）。这些对象仅在新局的 `fromLoadGame=false` 分支创建，并均受 `GameObjectUnit.create()` 的解锁检查。code 150 是仅在 type 9 解锁时创建的 Casino 生成点。JADX 对该方法的 Java `switch` 反编译存在控制流错误；此处以 APK 中对应 DEX 指令的 smali 分支为准，不照抄该方法的 Java 伪源码。
- `GameObjectUnit.isUnlocked()` 按 `unlockUnitData[type]` 判断：当前关卡达到门槛或档案已完成对应后续关卡时解锁。APK 的门槛数组为 Grandpa/type 6：21 或完成 30；Sniper/type 5：31 或完成 40；Pyromaniac/type 35：41 或完成 50；Salesman/type 36：51 或完成 60；Gambler/type 9：41 或完成 50。`hasAllUnitsUnlock()` 是 IAP 全单位解锁，本网页不提供该付费旁路。首次进入 Tech Town（global level 4）时，code 100、101、130、131、132 和 Casino code 150 均因未解锁而不创建；原始网格有 26 个休眠标记，不等于当时实际生成 26 个单位。
- 已实现 Tech Town 新局单位码位解析：逐行生成 source code、unit type、activity 和格坐标；原图含 26 个休眠标记、一个活动 Mexican、一个 Pyromaniac、一个 Salesman 和一个 Gambler。解析只记录原图对象，不应用档案解锁门槛，也尚未连接到可玩关卡。
- 已扩展 Tech Town 新局单位工厂，按传入的解锁判定生成 type 1–6、code 130/type 35 Pyromaniac、code 131/type 36 Salesman 和 code 132/type 9 Gambler。地图内容构造器用同一解锁结果控制 Gambler 与 Casino code 150，并在数量不一致时抛出内容错误。Gambler 使用原版 32×44 单帧图集和 96×96 肖像；其速度为 0、没有武器或升级，不能进入普通移动、攻击、升级流程。首次进入 level 4 时仍只生成原版已解锁对象；以上 map04 内容尚未接入正式战役。

## Tech Town（map04）已确认基线

| 范围 | 已核实的原版内容 | 对实现的要求 |
| --- | --- | --- |
| 地图身份 | APK 的 res/raw/td_map_04.tdm；32×24，共 770 字节。T_LEVEL_NAME_04 为 Tech Town。 | 原始网格逐格保留，不能按截图重画或缩放逻辑格。 |
| 入口和出口 | TDM 的 40–43 是四个入口，48 是两个出口；52–55 是该图使用的路径方向场。入口坐标为 (0,3)、(0,4)、(11,23)、(12,23)，出口为 (31,17)、(31,18)。 | 从方向场推导全部合法路线，并核对每个入口至出口的连通关系和路径边界。 |
| 地图对象 | 96–101 对应 type 1–6、activity 4 的休眠单位；104–109 对应 type 1–6、activity 5 的活动单位，本图 code 105 在 (13,11) 放置 Mexican。code 130 在 (0,20) 放置 type 35 Pyromaniac，code 131 在 (30,14) 放置 type 36 Salesman，两者 activity 4；code 132 在 (29,3) 放置 activity 5 的 type 9 Gambler。code 150 在 (30,3) 创建 Casino 生成点；type 9 未解锁时 Gambler 与 Casino 均不创建。96–101、104–109、130–132 都经 `GameObjectUnit.create()`，该方法按 `isUnlocked(type)` 决定是否生成。112、113、114 分别创建 Saloon、Fort、Tipi。静态装饰码包括 68–77、79、86–87、116–117、126。 | 先按新局创建分支还原原始对象，再以用户档案应用单位解锁。将单位对象与静态装饰分开，不能把 unit marker 当作贴图。保留 Casino/Gambler 配对约束和原始建筑锚点。 |
| 铁路编组与寻路 | TDM 第 12 行 x=4–8 为 83、83、84、84、84。`GameObjectManager.createTrainFromMap()` 将其变为同一 `unitGroup` 中的类型 10、11、12、12、12；10/11 初始 activity 5，三个 12 初始 activity 4。`TrainHorizontal` 复用 `GameObjectCompoundUnit` 绘制与组移动；类型 10/11/12 的基础速度均为 3000 fine/100ms。移动输入仅设置 X 方向，所有组员同步移动；各节按自己的碰撞框检查物体碰撞和地图边界。`createTrainFromMap()` 把原始码改为 82；背景街道图层仍把 82–85 映射到铁路绘制值 72，铁轨与列车对象是分开的。代码 12 有武器槽，但初始 activity 4，不绘制 Gatling 武器。PriorityMap 按入口方向和 52–65 方向标记递归，不以地形码判断通行；map04 的四条路线会经过铁路图块。 | 保留列车与轨道分层；不得把铁轨码当路线阻挡。实现中按先原图资产、再组移动、最后蒸汽与车厢武器的顺序逐项核对；不从道路贴图推断移动规则。 |
| 波次与动作 | GameDesignWaves.setWaves(..., 4) 定义 8 波。第 2 波前将敌方生成池计数数组设为 0，再将上限数组设为 5；SpawnPoolManager.performActionsForWave 已确认动作码 1/3 分别表示 set / set-max。 | 八波、生成池、难度参数和动作顺序逐项与 APK 对照，不能把敌方生成池动作误作玩家招募池。 |
| 关卡参数 | GameDesignData.gameDesignData[3] 对应 map04；原始十二项为 [0x12c, 0x32, 0x3e7, 0x61a8, 0, 0x7530, 5, 0x20, 0x4b, 0x96, 0xbc, 0x48ff8]。 | 实现前通过字段常量和消费者确认每项语义，再映射到网页内容；不得按相邻关卡猜字段。 |
| 文案和素材 | GameDesignWaves 引用 T_IA_CAMPAIGN_04_01 与 T_CAMPAIGN_04_02 至 _08，对白共 8 段，含 Engineer 肖像。APK 默认英文资源可读；其打包 locale 不含中文，中文对白需按站点语言补译。网页已迁入地图地形、路径、横向铁路、桥、静态装饰与 Saloon/Fort/Tipi/Casino 图像，以及 type 35 Pyromaniac、type 36 Salesman 的角色图集、肖像、投射物和相关音频；Gambler 图集与肖像已迁入并纳入预加载；列车原图已进入开发样例并完成轨道位置核对。列车蒸汽表现、Gatling 图像/动画、波次对白的场景接入仍待后续步骤。 | 只迁入 map04 可达的原版资源；补齐中文文案和正式资源预加载，不提前搬运其他地图素材。 |

### 本批后续实现步骤

每个切片只实现一项可独立测试的 map04 能力；APK 静态分析先于代码。凡表中标明“追踪”的行为，先核对列出的方法和调用者，再把确切数值、输入与随机消费顺序写入实现及测试，不从相似单位推测。

| 步骤 | 范围、依赖和预计改动 | 验收条件 | 针对性验证 |
| --- | --- | --- | --- |
| 3.5c 蒸汽表现与选择音效 | 依赖已完成的列车原图/图层和编组横向控制。接入 `LokSteam`/`SteamCloud` 的尾烟生成、更新、绘制、消失和 `sound_train` 选择提示。`LokSteam.update` 在列车静止和移动时有不同计时扣减，并通过 `Util.random(200)` 决定尾烟间隔；需先复核随机调用与生命期，再接入共享 RNG，不能把随机消费放进 Canvas 绘制。 | 蒸汽发射点、间隔、生命周期、移动时频率和音效触发与 APK 一致；静音不影响烟雾；Canvas 重绘或对象离屏不改变随机状态；同种子回放烟雾与后续战斗随机一致。 | 新增列车蒸汽定向测试，覆盖静止/移动间隔、烟雾帧与过期、选择音效、静音以及共享随机后续值；运行该测试、列车和音频播放测试、typecheck。 |
| 3.6 Gatling 车厢 | 依赖 3.5a–c。type 12 初始 activity 4，`TrainHorizontal.hasWeaponSlot()` 仅对 type 12 返回 true，基础 Gatling 数据第 0 级价格为 $125。继续追踪 `TrainHorizontal` 的 hire/upgrade、资金消费、目标选择、伤害/射速、投射物与资源调用者；网页当前没有 Gatling 资产或行为。只实现 APK 中实际可达的招募与攻击路径，不自行添加安装/拆卸按钮。 | 原版可达的车厢招募、槽位、价格、目标选择、射速/伤害、投射物和音画均由 APK 调用链决定；资金不足、取消、重复输入及重开地图不会多扣钱或遗留组件。 | 新增 `tech-town-gatling.test.ts` 覆盖来源确认的招募/战斗路径；运行该测试、列车与 `tests/game.test.ts`，再运行 typecheck。实际操控入口仅在静态证据确认后进行一次浏览器核对。 |
| 检查点 B：列车与 Gatling | 依赖 3.5a–c 与 3.6。使用真实 Tech Town 地图数据构造独立调试场景；不冒充正式战役。 | 车辆数量、位置、运动、槽位/武器、蒸汽与图层在同一场景中吻合 APK；角色寻路及普通招募/攻击不回归。 | 运行列车、Gatling、地图、路径、碰撞、绘制及相关 combat 定向测试；用本地浏览器实测移动、车厢交互和枪击入口。 |
| 4.1 八波、单位池与经济 | 依赖 3.3–3.6。根据 `GameDesignWaves`、`SpawnPoolManager.performActionsForWave()`、`GameDesignData.gameDesignData[3]` 及实际消费者实现波次、生成池、自然收入、商店/雇佣价格和结算参数；先逐项确定十二个关卡字段语义。 | 8 波的延迟、提示索引、生命/速度倍率、单位池和第 2 波 set/set-max 顺序逐项匹配 APK；所有影响经济的字段都追到消费者后再映射；不以其他关卡值填充未知字段。 | 新增 `tech-town-waves.test.ts` 和 `tech-town-unit-pool.test.ts`；运行 `pnpm --dir apps/gunsnglory exec node --import tsx --test tests/tech-town-waves.test.ts tests/tech-town-unit-pool.test.ts tests/campaign-unit-pool.test.ts tests/difficulty.test.ts`，再运行 typecheck。 |
| 4.2 波次对白、肖像与音频 | 依赖 4.1 的波次索引。迁入 8 段对白实际引用的中英文文本、Engineer 肖像与可达音频，接入现有窗口内对白/暂停流程和正式预加载。 | 第 1 段 `T_IA_CAMPAIGN_04_01` 与第 2–8 段 `T_CAMPAIGN_04_02` 至 `_08` 的波次、文本、肖像、播放和关闭行为逐项吻合；中英完整，静音及自动播放限制遵循现有共享音频契约。 | 新增 `tech-town-wave-intros.test.ts`；运行 `pnpm --dir apps/gunsnglory exec node --import tsx --test tests/tech-town-wave-intros.test.ts tests/fort-kaboom-wave-intros.test.ts tests/audio-playback.test.ts tests/game-asset-path.test.ts`，并运行 wave-intro E2E。 |
| 5 注册正式第 4 关 | 依赖 3.3–4.2。把 Tech Town 接入 `officialCampaignStages`、正式资源预加载、UI 和档案解锁判定；按已记录的 APK `unlockUnitData` 阈值把档案状态传入 map04 单位工厂，并由同一快照形成 Gambler 奖池。 | 目录仍列60关；完成map03后map04可进入、未完成map04前map05锁定。global level 4 首次进入仅生成23个 type 1–6 单位且无未解锁特殊单位；档案满足各独立门槛时相应地图标记、Casino及奖卡才解锁。真实map04八波胜利只写一个 settlement，刷新保留进度，未结算战局刷新后重开第一波；不得以fixture替代正式战役。 | 新增正式关卡解锁/单位门槛边界测试及固定seed的map04战役E2E；档案fixture只满足map01–03前置条件，并单独覆盖各单位阈值前后和“完成指定后续关卡”分支。 |
| 6 批次收口 | 依赖步骤 3.3–5。停止占用 Vite 预览的进程后运行一次完整检查，再启动本地预览做内置浏览器验收。 | `CI=1 pnpm --dir apps/gunsnglory run test:ci` 全部通过；内置浏览器桌面、390px 竖屏与 844×390 横屏中无空白/错图、截断、水平溢出或交互遮挡；画面比例、地图拖动、列车与八波 UI 正确。 | 完整 CI 一次；Codex 内置浏览器三个视口实测并查看 console error。 |

依赖顺序：

    Tech Town 网格/路线/图层/普通单位基线（已完成，含 Pyromaniac、Salesman） → Gambler 规则内核（已完成） → Gambler/Casino 地图实体 → APK Randomizer 共享序列与回放兼容（已完成） → Gambler GameSession 结算（已完成） → 窗口内赌场交互（已完成） → 检查点 A（已完成） → 列车原图与图层（3.5a，已完成） → 编组横向控制（3.5b，已完成） → 蒸汽与选择音效（3.5c） → Gatling 车厢 → 检查点 B → 八波/单位池/经济 → 波次对白/音频 → 正式解锁与结算 → 完整检查和浏览器验收

单位码位解析已对照 APK 网格、`GameObjectManager.createGameObjectsFromBasicMap()` 的分支和 `GameObjectUnit.create()/isUnlocked()`。该方法的 JADX Java `switch` 输出存在控制流错误，不能作为码位依据；已以 DEX smali 指令复核。每个后续步骤开工前只追踪该步骤列出的方法和消费者；遇到静态证据缺口先记明缺失能力与判定标准，再做一次最小定点核对，不靠反复启动页面或模拟通关猜规则。步骤 5 的真实胜利只用于验证新地图的完整战役链；不重跑 map01–03 的已验收战役。

### 本批完成门槛

- APK 中 map04 实际需要的离线能力都有可追溯静态证据；差异、未实现范围和剩余未知清楚记录。
- 地图字节、路径、初始单位、生成点、列车、波次、关卡参数和可达素材有相互校验的测试。
- 正式战役 E2E 使用生产内容、真实输入和自然收入，不注入现金或修改波次；档案唯一结算和刷新规则通过。
- 整批测试通过后再按 Guns’n’Glory 分支流程集成；本地图本身不自动触发公开发布。只有重要里程碑或核心缺陷才发布，且发布数/已验收实现切片数目标不高于 20%；发布前核对 master、部署来源 SHA 和线上整批功能。
- 静态代码可回答的问题不使用 ADB 重测；只在明确列出静态证据缺口、观察目标和判定标准后，才做一次定点运行核对。

## 后续阶段

- New Mexico map04 验收后，按顺序逐关交付 map05–10；每关先复核 APK 和现有消费者，只实现该关真实需要的能力。
- 之后依次完成 Mississippi map14–23、Oregon map24–33、Dakota map34–43、Nevada map44–53、Alaska map54–63。APK map11–13 不计入 60 关。
- 每关独立核对地图、对象、波次、数值、难度、解锁、音画和胜败存档；首次出现的新敌人、建筑、交通工具或规则在其真实消费者中验证。
- 实验与全战役分析继续复用现有确定性、版本冻结、预算和报告能力；未知机制必须拒绝或标记未支持，不以局部关卡通过宣称全战役平衡。

## 集成与发布门槛

当前累计为 5 次成功发布 / 27 个已验收实现切片（18.5%）。普通发布次数占比目标不高于 20%；计数只在本文件维护。批次代码通过完整检查后以一个 squash commit 集成；文档清理不计实现切片、不单独发布。公开发布按仓库流程合并到 master、推送并等待 CI；核对 build-info.json 的来源 SHA 与预期提交一致后，再用 Codex 内置浏览器验证公开版本。SHA 不一致、CI 未完成或线上验收未通过时，发布保持未完成状态。
