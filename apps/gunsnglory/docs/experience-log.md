# Guns’n’Glory 问题经验记录

本文记录本应用已复现问题和需要防止重演的工程经验，供开发 agent 阅读，也供后续调整项目约束时参考。按问题所属模块组织，不按日期排列。

## 记录规则

每个问题关闭时记录：

1. **表现与复现：**用户看到什么、从什么界面状态和操作顺序可以复现。
2. **根因与证据：**指向具体代码、样式、测试或浏览器观察；推测必须标为假设，未核实前不写成事实。
3. **漏测点：**此前的测试为何未发现，或错误断言了什么。
4. **修复与防回归：**改了什么、增加了哪条可重复的自动或浏览器验证。
5. **避免重复：**记录已经排除的路径及原因，只保留后续执行者可复用的信息。

修复未完成的问题可以先登记为“待验证”；实现和运行验证结束后，应在同一条记录中补充结论。记录根因时优先引用稳定的文件/选择器/测试名称，不抄录冗长日志、日期或散列值。

## 线上视觉核对应使用版本化页面地址

- **表现与复现：**内置浏览器直接打开无查询参数的公开游戏地址时，关卡详情页没有加载木框底图；本地当前源码有木框。读取根 `build-info.json` 后，以其中来源标识构造 `?release=<sourceSha>` 再打开同一页面，木框出现并与本地构图一致。
- **根因与证据：**页面地址是否带 `release` 参数会改变浏览器取到的静态页面资源。源码不读取该参数；本次对照支持“无版本标识的浏览器缓存仍提供旧页面资源”的判断，但没有定位具体缓存层，所以缓存机制仍标为推断。
- **漏测点：**曾只核对 `build-info.json`，随后在无版本参数的页面截图上判断最新 UI 缺陷；来源文件与浏览器当前实际渲染的资源可能不同。
- **修复与防回归：**验收线上页面时先读根 `build-info.json`，再将其来源标识放入 `?release=` 查询参数后检查画面；并确认版本化页面与部署来源一致。若两者仍不一致，再查实际资源来源，不重复改已在本地正确的 CSS。
- **避免重复：**部署 SHA 一致是必要条件，但单独不能证明截图使用了对应页面资源。所有线上 UI 截图和交互记录都要标注版本化页面地址；窗口模式与静音要求仍照常执行。

## 车马分叉必须复刻 APK 的坐标差移动

**状态：**核心移动向量已按 APK 更新；完整波次 seed 6 Wave 1 的岔口时序有回归测试，五张正式关卡的岔口矩阵通过。Fort Kaboom Wave 3 的“wagon 在 `(9,3)`、马在 `(13,4)`”曾在改变前序波次请求的隔离会话中被记录，但该随机位置前置条件不稳定，已移除对应测试；因此不再把它作为可重复覆盖。尚未记录用户当时运行的确切随机种子/帧，也没有 APK 实际运行截图，视觉逐帧等同性仍未核实。

- **表现与复现：**部分种子中马车会在岔路处走向不同，或车辆轨迹偏出原路。Cow Gulch 正式路线只有单向 redirect，不能复现分叉；Billy Hills Level 5 Wave 1 有 `(7,5)` 南北岔路及 Covered Wagon 组，但 32 种子测试只比较 `EnemyView.direction`，两者方向相同不足以证明实际移动向量一致。
- **网页根因：**`sameGroupPredecessorDirection()` 将前序同组单位与当前单位的整格坐标差压成一个 `Direction`；差值斜向时回退到前车方向。`moveEnemy()` 随后只按四方向之一移动，因此丢失 x/y 分量和坐标差幅度。正式复现为 Fort Kaboom Level 3 Wave 3、seed 6、`campaign-3-group-15`：车辆到达 `(9,3)` 时，前序马匹已在 `(13,4)`；该格 redirect 为 north/east，网页车辆却选了 south。
- **APK 证据：**APK 1.8.6 `EnemyDirector.moveEnemys()`（`smali_classes2/com/hg/gunsandglory/gamelogic/EnemyDirector.smali`，`.line 401–417`）先照常抽 redirect 随机方向，再在前序对象 `unitGroup` 相同的情况下，将方向分量改为前序敌人与当前敌人的 `fullX/fullY` 差。`GameObjectEnemy.setDirection(II)` 将两个原始分量分别乘以速度；`move()` 每帧分别更新 `fineX` 和 `fineY`。这不是“记住领车分支”，而是按当前相对位置移动；斜向或多格差值会造成对角/加速跟随，可能是 APK 行为本身的瑕疵，复刻时不得擅自用寻路、分支缓存或道路吸附改写。
- **漏测点：**人工岔路 fixture 和 Billy Hills 真实关卡检查都只观察四向 `direction` 或车辆是否同向，没有比较分量移动、前后到岔口的时间差与整格位置。测试通过因此曾被误写成“已按 APK 修复”。
- **修复与当前验证：**在内部 `MutableEnemy` 状态中把 x/y 移动分量与精灵图朝向分开；同组 follower 继续消费 APK 对应的随机 redirect 抽样，再应用前序对象的 `fullX/fullY` 差。移动与碰撞探测都使用两个原始分量；格中心跨越、坐标重新对齐及动画主轴按 APK 规则实现。`GAME_RULES_VERSION` 升至 `gng-rules-22`，回放格式版本不变，旧规则回放明确拒绝。Fort Kaboom Wave 3 的隔离测试曾保留原始地图与路线、清零前两波请求，并固定 seed 1；因为这改变了随机消耗，马匹 `(13,4)`、马车 `(9,3)` 只是该合成随机序列中的偶然坐标，不应被当作必须到达的规则状态。该精确坐标测试已删除；完整战役 seed 6 的跟随者转向时序回归仍保留。`official-wagon-route-matrix.test.ts` 使用正式 TDM、正式关卡岔口与正式车辆生成池，覆盖 Billy Hills 第 5 关、Cactusville 第 8 关、Lucky Lake 第 7 关、Lost City 第 10 关和 Railroad Ranch 第 9 关；5 项测试逐场景核对至少一个未被碰撞阻塞的车辆步长等于前序同组对象的 `fullX/fullY` 格差乘速度。该矩阵会清空其他波次或无关生成池以聚焦目标路线，因此不代表完整战役种子序列。包含 Fort seed 6 与正式路线矩阵的定向检查通过 188/188。
- **随机隔离夹具的断言边界：**隔离前序波次或生成池会改变随机数消耗顺序，因此固定 seed 不能保证复现完整战役中的随机单位/坐标。隔离会话适合验证有界规则（例如一个已知状态的移动分量），不适合把自然生成的具体单位位置写成必达前置条件。需要覆盖精确位置时，应直接构造状态或验证该状态局部规则；需要验证生成顺序时，应保留正式波次并固定完整输入。防回归时检查 fixture 是否改过请求数、间隔、随机调用次序，再决定断言是否可重复。
- **seed 6 岔口轨迹补查：**原始 Fort Kaboom、medium、seed 6、完整波次、无玩家命令仍会在 Wave 2 defeat，所以用仅把 `previewWave.initialLives` 提高到 500 的测试副本继续同一无操作模拟；地图、波次请求和随机种子不变，该字段只改变提前失败阈值。Wave 1 的 `campaign-1-group-14` 在 `(9,3)` 北向分支上，马于第 642 步（100 ms/步）转北；车继续向东，至第 650 步进入 `(9,3)`，第 657 步走到自己的控制点中心后转北。两者相差 15 步，即 **1,500 ms**，之后进入同一北向支路。这是逻辑位置轨迹，不是截图，也不是用户当时的确切 Wave 3 运行；它说明短时分路由 APK 的坐标差跟随规则产生，不能仅凭间隔画面判断最终走错路线。
- **APK 更新顺序和资源映射：**对 APK 1.8.6 的 `EnemyDirector.moveEnemys()` 重新检查确认：方法按 `gameObjectsEnemy` 列表索引逐个更新；到每个敌人自己的 redirect 时，才读取紧邻前一对象的 `unitGroup` 和 `fullX/fullY` 差。`GameObjectEnemy.setImageForUnit()` 将 type 4 映射到 `R.drawable.wagon`、type 8 映射到 `horse_wagon` 或 `horse_wagon_white`；`GameObjectEnemy.draw()` 按 fine 坐标加绘制偏移定位。网页亦以两只独立敌人绘制这两份独立图集。当前没有证据表明资源丢失；尚未将这段连续画面与 APK 实际运行帧并排比对。
- **完整 seed 6 的无输入基线：**使用正式 Fort Kaboom、medium、seed 6 和原波次数据，仅以 100 ms 步长推进 `GameSession`，没有模拟玩家操作。原始 50 lives 的模拟在 Wave 2 以 defeat 结束：239,200 ms 时 49 名敌人已逃脱、23 名仍存活、Wave 3 未开始；此后继续推进也不会改变结算。该终局是失败阈值阻塞，不代表路线逻辑已正确或错误。500 lives 诊断运行继续相同随机序列，但完整 seed 6 Wave 3 仍未实际到达；此前 seed 1 隔离测试的坐标前置条件不稳定，已移除，不再将其与完整战役轨迹并列为可重复证据。
- **生产画面与 APK 绘制顺序核对：**把同一条完整 seed 6 轨迹的 frame 643、651、658 输入生产 `drawGame()`，在内置浏览器查看整张地图，并测量马、wagon 和奖励箱的绘制框与贴图 alpha 边界。frame 643 马和 wagon 的脚底 y 为 314.36 与 314.38，中心相距约一格；源图透明边缘使可见轮廓间约留 10 个显示像素。type 8 使用 `horse_wagon_white` / 转向图，type 4 使用 `wagon`；它们是 APK 中两个独立对象。网页取相同 48×60 源帧并按一格宽、5/4 格高的逻辑尺寸绘制，脚底均使用 fineY 加 y 偏移。frame 651 两个 alpha 边界重叠；frame 658 两者已同向转北。
- **奖励箱覆盖车辆是 APK 原有层级：**REA 静态反编译 APK 1.8.6 的 `GameObjectManager.getValueByObject()`、`insertDrawOrder()`、`SpawnPoolManager.update()`、`GameObjectCollectable`、`GunsAndGloryThread.drawEnemies()` 与 `drawObjects()` 得到：奖励箱生成时 `fineZ=7680`，位置中心 y 再加 `UNIT_PLACEMENT_OFFSET_Y=1920`；深度按 `fineY + drawingOffsetY + fineZ×100` 排序。APK 先绘制深度小于 768000 的敌人，再绘道路，最后绘高层对象。网页对相同箱体使用同一 y 位置、+768000 深度及 768000 道路切层，所以 frame 643 箱体和 `$` 图标覆盖相邻车辆局部，属原版排序。frame 651 两张车辆贴图本身明显重叠。不要为了截图观感擅自把奖励箱移到车辆后面或把车马吸附到一起。
- **本次判定边界：**Fort Kaboom seed 6 的 Wave 1 代表帧没有发现网页移动、素材裁剪或排序偏离 APK 静态实现。Wave 3 隔离测试曾把一个依赖改变随机消耗的坐标设为必达条件，后来在单测运行中未能稳定满足，现已删除；不能再把它描述为可重复的轨迹证据。当前无需为已由静态代码与确定性会话解释的向量启动模拟器；若用户再次遇到不同路线结果，应记录关卡、波次、随机种子和马/车帧级坐标，再按该轨迹定点分析。
- **岔口脚底和绘制范围复核：**用正式地图、TDM 和车辆生成池隔离每关目标波次，以 seed 1、100 ms 步长记录转向前、转向帧和下一步。下表中的 `fine` 是逻辑坐标；贴图范围按渲染器的一格宽、车辆高度和 `drawingOffsetFine.y=2880` 计算，表示矩形范围而非贴图非透明像素。

  | 关卡 | 岔口前 → 转向 → 下一步（fine） | 转向格 / raw | 绘制脚底（格坐标） | 矩形触及的 TDM 格 | raw 36 边界 |
  | --- | --- | --- | --- | --- | --- |
  | Billy Hills L5 | `(57300,42240) → (57600,42242) → (57600,42742)` | `(7,5) / 58` | `(7.500,5.875)` | `(7,4)=32`、`(7,5)=58` | 未触及 |
  | Cactusville L8 | `(41882,126720) → (42240,126718) → (42240,126218)` | `(5,16) / 57` | `(5.500,16.875)` | `(5,15)=32`、`(5,16)=57` | 未触及 |
  | Lucky Lake L7 | `(180960,103680) → (180480,103678) → (180480,103153)` | `(23,13) / 58` | `(23.500,13.875)` | `(23,12)=32`、`(23,13)=58` | 未触及 |
  | Lost City L10 | `(57600,64882) → (57598,65280) → (57098,65280)` | `(7,8) / 59` | `(7.500,8.875)` | `(6,7)=36`、`(7,7)=32`、`(6,8)=32`、`(7,8)=59` | 包围框擦入约 `0.00026` 格；脚底仍在 `(7,8)` |
  | Railroad Ranch L9 | `(203960,49920) → (203520,49922) → (203520,50422)` | `(26,6) / 58` | `(26.500,6.875)` | `(26,5)=32`、`(26,6)=58` | 未触及 |

  五个转向格均是正式路线控制格，逻辑位置未进入 raw `36`。Lost City 的车体矩形在 x 边界因 `fineX=57598` 比格中心偏 2 个 fine 单位，理论边界擦入相邻 raw `36` 格约 `0.00026` 格；这不是路线中心偏移，也没有测量贴图透明边缘是否产生可见像素。该结果说明峡谷边缘可能与车体贴图相邻或轻微重叠，不支持移动 TDM 路线。静态 APK 方法显示车辆按绘制偏移锚定并整帧绘制；没有 APK 运行截图，不能证明网页和 APK 在该处视觉完全相同。
- **防回归：**现有自动矩阵覆盖上述五张关卡的实际车辆生成池与指定多向岔口，并断言岔口后的移动分量；完整波次 Fort Kaboom seed 6 回归检查 Wave 1 马与 wagon 相差 15 帧转向。此前用于 Wave 3 `(9,3)/(13,4)` 坐标差的隔离用例已删除，因为清空前序波次改变随机消耗，坐标不是稳定前置条件。当前 `fort-kaboom-wagon-route.test.ts` 只保留完整战役 seed 6 时序用例；本轮将其与 `enemy-route.test.ts` 和正式马车矩阵一起运行，188/188 通过。这些测试证明已覆盖样本遵循查明的 APK 移动规则，不证明所有完整战役随机序列或 APK 运行画面逐帧相同。更广泛的路线回归仍需覆盖碰撞等待、动画朝向、关卡出口和回放确定性；用正式内容及 APK 静态方法作为预期，不以“方向相等”替代行为比对。
- **适用边界：**上述结论来自 APK 静态反编译与网页 `GameSession` 探针，不是 Android 实机观察。敌方路线与敌人图片显示出的悬崖重叠需分开调查；本项不修改 TDM 路线点。

## 敌方碰撞与路口占位要拆成两层验证

- **表现与复现：**网页曾能让部分运输车互相挡住，但 horseman 和 boss 仍会从对向单位穿过；即使运输对象在岔路相交，也没有实现原版 action-2 转向格的先到先占。只看“两个组同时到过附近”或通用车辆测试，无法证明它们因哪种规则停下。
- **根因与 APK 证据：**APK `EnemyDirector.moveEnemys()` 对类型 3–8 做实体碰撞，类型 3、7、8 还会预占前方 action-2 转向格。占用冲突会撤销本帧移动，并让相邻同组下一成员停一帧；越过转向格中心释放占位。`GameObjectEnemy.startDying()` 会清除其路口占位，但不会立即移除 `CollisionObject`；`CollisionManager.testCollisionEnemy()` 不按存活状态过滤碰撞框，待死亡动画计时结束后 `EnemyDirector.moveEnemys()` 才将对象和碰撞框移除。因此，死亡会立即释放路口格，但死亡动画期间仍会作为物理障碍。
- **网页漏测点：**此前 `enemyCollisionBlocksMove()` 仅覆盖类型 4、5、6、8，现有正式交会测试也只检查运输实体；类型 3 horseman、类型 7 boss 及路口占位从未覆盖。把两个测试组沿同一直线对向放置，会先发生物理碰撞，不能单独验证转向格占用。
- **修复与防回归：**在 `src/game/index.ts` 内统一登记 3–8 碰撞类型，并为类型 3、7、8 保存波次级占位；占用冲突沿用本帧撤销与同组暂停，越过格中心或死亡时清除占位，死亡物理框保留到死亡计时结束。`tests/p1f-enemy-collision.test.ts` 7/7 定向通过，覆盖 horseman/boss 实体碰撞、type 1/2 不参与碰撞、垂直交叉路线的占位等待与通过释放，以及占位者死亡后的等待组恢复；`pnpm run typecheck` 通过。正式路线六个候选组合的回归仍按实施计划 C4-D3 执行，本测试不代表路线交会全面关闭。
- **避免重复：**测试要拆开“物理框碰撞”与“action-2 格预约”；用两条垂直接近路线证明预约发生在物理框接触前。比较距离时按 APK 的 `7678` 格碰撞框和碰撞框起点偏移计算，不能只比较精灵图边缘。占位者死亡后不应假设碰撞框同步消失；应等死亡动画结束后验证后续组恢复。上述依据为 APK 静态反编译和网页 `GameSession` 自动观察，不是 Android 实机画面对照。

### 出生区已重叠时，APK 碰撞检查可能让单位持续停住

**状态：**APK 静态算法、独立参考模型与 Fort Kaboom seed 42 Wave 3 的 GameSession 有界调度已出现一致的持续停滞证据；Fort 正式 E2E 是否因该状态失败仍待核对。严格复刻分支保留该碰撞规则，不加入网页专属“重叠后放行”。

- **表现与复现：**先前 Apache Valley/Fort Kaboom 的正式胜利 E2E 未结算。一个此前采集的网页会话样本中，type 5 stagecoach 位于 `(-6200,72960)`，type 3 horseman 位于 `(-11520,72960)`，两者同 y、碰撞框水平起点相差5,320 fine；APK 框宽7,678 fine，因此已经重叠2,358 fine。该坐标样本本身不证明它就是 E2E 的失败帧。
- **APK 根因证据：**REA 检查 APK 1.8.6 的 `EnemyDirector.moveEnemys()`：实体先执行 `GameObjectEnemy.move()`，随后对类型3–8 调 `CollisionManager.testAdvancedCollisionEnemy(co,xDir,yDir)`；返回碰撞时调用 `undoMove(oldXDir,oldYDir)`。`GameObjectEnemy.move()` 将框起点更新为 `fineX/Y−3840`；`CollisionManager.createCollisionObject()` 创建7,678×7,678框。`testAdvancedCollisionEnemy()` 转调 `testCollisionEnemy()`；后者先用反向的 `−xDir/−yDir` 检查对方框，未命中才正向检查当前框；`boxCheck()` 用移动后四角是否落入另一框判定。apktool 导出的 smali 将起点候选筛选范围确认为 X `0x5a00`、Y `0x3c00`。这些是 APK 静态证据，未在 Android 运行验证。
- **网页漏测点：**已有碰撞测试覆盖对向碰撞和分组排除，却没有独立重建“碰撞开始前框已经交叠、第一轮反向预测仍命中，于是正向分离机会也被短路”的条件；而 seed 42 E2E 只断言最后胜利，没有报告发生停滞时的碰撞框/位移/波次状态。
- **参考模型与验证：**[`apk-enemy-collision-reference.test.ts`](../tests/apk-enemy-collision-reference.test.ts) 以 APK 方法语义独立实现候选过滤、两次预测和四角检查；对上述坐标探针 `xDir=±1` 均预测阻挡，同组对象和任一轴分离的样本不阻挡。合成真实 `GameSession` 中，两组同向同点生成的运输单位与模型预测一致，连续五帧坐标不变。连同既有[`p1f-enemy-collision.test.ts`](../tests/p1f-enemy-collision.test.ts) 共10/10通过，类型检查通过。此前直接按100ms连续推进的无输入/初始输入短测未观察到重叠，但它没有复刻浏览器时钟调度，不能用于排除正式 E2E 路径。
- **正式调度下的观察：**按 `t28/t33` 测试的10,000ms时钟、4×速度、100ms步长、波次对白暂停/恢复和自动购买次序做不超过20个循环的 GameSession 探针。Apache Wave 1 首次 type 4/type 3 跨组碰撞框重叠后没有连续停帧。Fort Wave 3 在 step 2530、elapsed 253,000ms 遇到 stagecoach type 5 `campaign-3-enemy-147` / group `campaign-3-group-133`（`(-6200,72960)`，向东，speed 500）与 horseman type 3 `campaign-3-enemy-151` / group `campaign-3-group-137`（`(-11520,72960)`，向东，speed 460）。碰撞框重叠，APK 独立模型预测双方候选移动都被挡；网页会话连续5个100ms帧保持原坐标。其坐标对应此前报告的 Fort Wave 3 网页样本。这个程序化关卡会话没有 UI DOM，但重用了现有 E2E 的时序和购买策略；尚未证明它就是 Playwright 最终 Victory 断言失败的原因，也没有与 APK 运行帧并排对照。
- **诊断方法修正：**Playwright 使用 `SimulationTimeAccumulator.advanceElapsed(deltaMs, simulationSpeed)`，每个测试时钟步拆成多个不超过100ms的会话步。`showCampaignWaveIntroAfterWaveChange()` 在波次变化时暂停会话并跳出当前步进循环，因此对白确认等待会丢掉该批剩余时间；测试在同一循环迭代中确认对白，下一迭代才推进模拟。普通帧推进后才按余额和优先级购买。早期直接连续调用 `GameSession.advance({deltaMs:100})` 的短测没有复现这一节奏；已将它降级为简化基线，不用它排除正式 E2E 路径。
- **防回归与未决项：**若再遇到“敌人卡住”，先记录稳定的关卡/seed/波次、碰撞框坐标、组 ID 和本帧 xDir/yDir，再分别运行 APK 来源模型与网页会话；不要仅凭 UI 未结算就归因碰撞，也不要用 AABB“是否更重叠”启发式放行。下一步用 Fort 正式 E2E 单 worker 核对最终结算是否与该 Wave 3 停滞相关；只有失败状态支持该因果关系，才调整 E2E 验收，否则保留目前 Victory 预期并继续查实际失败原因。无论如何，网页规则不偏离 APK 来源模型。

## 地图雇佣框要消费 APK 的单位展示映射

**状态：**地图雇佣框已恢复原版主要信息与余额不足分支；New Mexico、Fort Kaboom、Tech Town、桌面和触屏的定向检查通过。本轮在手机横屏内置浏览器复查余额充足状态，头像、名称、介绍、价格与确认/取消动作均可见；只检查并取消，没有执行雇佣扣款。

- **表现与复现：**选中待雇佣地图角色后，网页只显示通用“Hire … for $…”标题；没有角色肖像或角色介绍。余额不足时显示通用资金提示，不显示角色原版台词。
- **根因与证据：**APK 的 `GameScreenActivity.onPrepareDialog` 对资金充足与不足分别调用 `InGameGeneralMessageDialog.setUpDialog`，传入单位 hire text、portrait、name，并独立设置 Price 图文和确认按钮可见性。单位映射由 `GameObjectUnit.getHireStringResId`、`getNotEnoughCashStringResId`、`getPortraitResId`、`getUnitNameResId` 提供；`TrainHorizontal` 和 `Steamer` 各自覆盖这些方法。布局 `dialog_hire.xml` 明确包含 portrait、headline、message、price 和 yes/no。网页原来只复用 HUD 单位名并把价格拼进一个标题，映射数据没有接入 UI。这是实现遗漏，不是 APK 证据缺失。
- **漏测点：**旧 E2E 只断言标题与余额不足通用文案；没有断言肖像实际加载、角色名/角色台词/价格各自所在的字段，也没有覆盖角色专属余额不足台词。
- **修复与防回归：**新增 `map-hire-presentation.ts`，按 APK 类型映射十种角色/载具雇佣展示，并提供中英文名称、正常和余额不足台词与 portrait；弹窗单独呈现羊皮纸上的肖像、名称、台词、价格和原版确认/取消状态。映射单测覆盖全部类型；`t01`、`t07`、`t25`、`t26`、`t28`、`t33`、`t36` 覆盖实际入口及状态。新增任何 `hirePrice` 单位时，需同时核对 APK 的展示 getter 和两种现金分支，不能只验证确认事件。
- **避免重复：**标准单位先查 `GameObjectUnit` 映射；列车和汽船等复合单位先查其 override，不能从游戏内 HUD 名称推测原版雇佣称呼。余额不足分支也有单位专属台词，不用网页通用资金错误文案替代。

## Cannon 弹丸必须使用独立 APK 贴图

- **表现与复现：**Cannon 发射时网页显示普通深红色小方块，外观不像原版炮弹。
- **根因与证据：**APK 的 `GameObjectShot.draw()` 对 damageStyle 4 选择 `sfx_cannon_ball`，命中后切换到 `sfx_explosion`。APK mdpi 资源是12×12，网页原先没有该资源、shot image 映射或预加载项，因此渲染器把它当成无贴图普通弹丸绘制。
- **修复与防回归：**将 APK mdpi `sfx_cannon_ball.png` 原图加入资源目录，并给 damageStyle 4 设置对应 imageAsset；渲染器以原生12×12帧绘制飞行炮弹，水平居中、底边锚定在弹道坐标，命中后优先绘制通用爆炸序列。`mississippi-11-cannon.test.ts` 覆盖真实 GameSession 产生的炮弹资源，`canvas-renderer.test.ts` 覆盖帧区域、尺寸、APK 底边锚点、命中爆炸和普通弹丸回退，资源路径测试确保使用 mdpi 文件。
- **验证边界：**资源与 APK mdpi PNG 字节相同；类型检查及27项定向单测通过。本批完整检查中单测、构建、203项 E2E 均通过；浏览器目视核对集中在马车组合和路线叠图，没有将单个弹丸截图作为验收证据。
- **避免重复：**新增 damageStyle 或弹丸类型时，从 APK `GameObjectShot.draw()` 同时核对飞行贴图、尺寸/锚点、命中动画和预加载；不能让非普通弹丸落入通用红色方块回退。

## 敌方贴图压到峡谷美术不等于路线进入悬崖

**状态：**已核对当前接入的38张地图路线中心、绘制锚点和代表性网页画面；另测五个受双轴移动影响的官方岔口。没有路线中心或脚底进入 raw `36` 悬崖墙格。本轮不移动路线。

- **表现与复现：**敌人经过峡谷边缘时，较高的身体贴图与崖壁美术重叠，看起来像行走中心已经离开道路。
- **根因与证据：**网页路线中心由原始 TDM spawn、redirect 和 exit marker 展开。逐格检查38张已接入地图，路线访问格中没有 raw `36`，中心格是道路、桥面及路线控制标记；狭窄道路本身可紧邻悬崖美术。APK `GameObjectEnemy.draw()` 与网页均按脚底锚点及 `drawingOffsetY` 定位整张敌人贴图，车类另有垂直绘制偏移；精灵上半部因此可覆盖邻格的悬崖图像。浏览器在 Cashcow Canyon、Riverside Mountains、Fort Knockout 叠加中心线，中心落在道路/桥面。新增的五关车辆岔口测量显示，脚底都在正式 TDM 路线控制格；Lost City 的车体矩形因两 fine 单位的中心偏差约擦入 raw `36` 格 `0.00026` 格，属于绘制边界，不等于逻辑路线进入墙格。未做 APK 运行画面对照，不能把网页截图描述成原版运行截图。
- **漏测点：**旧路线检查关注路径格连通，用户观察的是完整精灵与地形美术的重叠；两种几何没有分开说明。只看一张单位截图会把精灵矩形误当成路径碰撞区域。
- **处理与防回归：**未找到 TDM 路径数据、脚底锚点或绘制偏移的网页差异，因此不为追求“贴图不碰崖边”手工挪路。后续遇到此类报告，分别核对 route center、position/drawing offset、脚底像素和 sprite bounds；只有中心或脚底超出 APK/TDM 允许格时才改路径。若需要声称完整画面与 APK 相同，须另有 APK 运行画面对照证据。

## 桥面边界与我方地图对象碰撞必须拆开核对

**状态：**APK 静态几何已复核，网页对象碰撞修正已发布。后续关卡扩展后，共享测试已把静态对象框、单位脚底/唤醒锚点及 raw36 墙边探针扩展到41张地图；新增 `all-maps-player-bridge.test.ts` 又为全部41张地图中每个实际渲染、两侧由 raw32/36 阻挡的连通桥段运行短 `GameSession` 边界移动，覆盖 raw80、Railroad Ranch 实际桥面 raw81 和 raw88。**剩余缺口是特殊对象类别的全图真实会话及生产画面锚点复核；桥面自动通过不代表 APK 画面对照通过。**见[地图覆盖矩阵](map-coverage-matrix.md)。

- **表现与复现：**我方单位在桥边看起来越过峡谷壁；未雇佣的睡眠角色、Saloon 等地图设施无法挡路；部分单位互相穿过。单纯把桥图整体移动或缩窄，不能修复这些对象问题。
- **根因与证据：**APK 的桥图是覆盖底图的道路层，资源字节、绘制矩形和网页一致；玩家脚底锚点和 `5068×4608` 碰撞框也与 APK `GameObjectUnit.createCollisionObject()` 一致。横桥 raw `80` 的贴图向左右各伸约 `0.25` 格，但碰撞可走范围由四角所在底图格及街道覆盖层决定；raw `36` 悬崖阻挡漏项已在前一批修复。对象碰撞的另一个调用链是 `CollisionManager.testCollision()` → `boxCheckX/Y()`：按当前碰撞框、本帧位移和正交轴重叠检测边沿穿越；`CollisionManager.boxCheck()` 不是该移动路径。静态 TDM 对象框由 `GameObjectManager.createGameObjectsFromBasicMap()`、`GameObjectDecoration`/`GameObjectSpawnLocation` 构造器和 `CollisionManager.createCollisionObject()` 的不同偏移共同决定。网页之前只查显式 `collisionBoxFine`，未包含单位列表，且测试把同一份内容框当成期望值，因此错框也能通过。睡眠单位只改状态和贴图，仍保留碰撞对象。`GameObjectSpawnLocation.update()` 使用零位移 `testBasicCollision()` 创建单位，不能把一般矩形重叠规则套用到 Fort Cannon 出生位置。
- **修复与防回归：**以原始 TDM 码生成静态物件框，并只在特殊非静态码装饰（如水岩）或缺少 TDM 的 fixture 中使用显式框；活动、睡眠和动态生成单位都参与碰撞，船体使用自己的框，组成员不与自身同时移动组互撞；Fort 生成继续采用零位移检查。地形四角判断与静态/单位边沿穿越分开实现。当前 `player-collision.test.ts` 对41张地图的每个静态对象 marker 断言唯一 APK 碰撞框，并覆盖睡眠/活动单位、Saloon/Fort/Shack、桥面、炸药、奖励等规则；另以 Tech Town 真实地图补测 raw77 高骨骸的长框边界和解锁后 raw150 Casino 的条件碰撞框。`player-unit-anchor.test.ts` 对41张地图核对单位脚底/唤醒锚点和 raw `36` 墙边移动；`all-maps-player-bridge.test.ts` 为41张地图中每个可走连通桥段做真实短会话移动和两侧边界探针。`oregon-09-collision.test.ts`、地图实体测试、Steamer 与奖励箱测试提供其他对象类别的真实短会话证据。
- **验证与发布边界：**原对象碰撞修复批次的定向测试122项通过；当时完整 `test:ci` 通过类型检查、853项单测、生产构建和175项 E2E。GitHub Actions `43833240368` 成功，GitHub Pages 与 Cloudflare Pages 的来源均为发布提交 `0eb4b42`。内置浏览器窗口模式、静音加载对应 Cow Gulch，可选中我方单位并下达移动指令；截图未能确认其最终停靠边界，因此不记作线上碰撞画面通过。上述发布数据是27张地图阶段的历史验收范围；当前网页接入41/60关，后续全图自动断言见本节状态与地图覆盖矩阵。证据来自 APK 静态方法/资源、TDM 与自动化会话；原批次未启动 Android。
- **避免重复：**看到脚底略超出桥面绘图边缘，先按贴图尺寸、脚底锚点、碰撞框底边分别计算，不以视觉矩形代替 walkable field。要改对象碰撞时先定位其 APK TDM 类型和构造器，再核对本帧的移动方法；不要拿独立的 `boxCheck()`、严格 AABB 或一个地图字段推测整条规则。新地图必须逐标记核对静态对象覆盖；单位状态、船体组和建筑 spawn 分别做测试。测试铁路覆盖是否阻挡时，选 raw0 开放地面跨越轨道；raw32 属于敌方道路地形，玩家本来就会被它阻挡，若把 raw32 路段作为测试起点/目标，停住不能说明铁路贴图层阻挡。本轮 Badlands 用 raw90 覆盖在 raw0 地面上的横向探针验证轨道可穿越。当前结论基于 APK 静态方法、资源与 `GameSession` 自动化检查，不代表 Android 实机/模拟器画面观察。
- **移动探针坐标也要覆盖对象碰撞框：**Ghost Town 首次静态石头探针把移动目标设在整数行 `y=14`，枪手最后的碰撞框底边为 `13.94` 格，而该 rock 的 APK 碰撞框从 `y=14.34` 格开始；角色实际从障碍上方经过。这是测试坐标错误，不是碰撞实现回归。把目标行设为 `y=14.75` 后，以 `positionFine + PLAYER_UNIT_COLLIDER_FINE` 比较实际玩家框和 TDM 对象框，石头、建筑、水塔及铁路缓冲器的短 `GameSession` 探针均在边界前停止。后续碰撞探针应验证实际矩形是否相交，不能只凭逻辑格行或角色贴图判断测试已触达障碍。
- **水上单位的边界要按最终碰撞图判断：**Ghost Town 的水上船体位于 raw120–123 覆盖的 raw124 水格上；y=11 的水道到地图最右侧仍是可航行碰撞码 `96`，不能因为 y=12 在 x=26 之后画成岸线就假设船会在那里停止。对应 `tiles_waterside` 的碰撞码 `103` 属于水上单位阻挡范围；普通地面单位与船体适用的水面规则不同。raw126 岸岩的 TDM 碰撞框底边低于船体碰撞框顶边，真实 `GameSession` 船组可从其旁边通过。测试最初把可视岸线误当成 y=11 的水域终点，也曾要求整个碰撞框不能越过地图边界；最终改为对照 APK 派生的背景碰撞码、检查船体锚点边界和真实组移动。水路、浅滩及地图边缘测试应分别核对渲染层、碰撞码类别和单位的实际碰撞框，不从 raw0 或画面颜色推导水上通行性。
- **运输端点审计要区分 TDM、派生背景码和对象碰撞框：**临时扫描曾把 Railroad Ranch raw68 误判成地形阻挡，并漏掉 TDM raw94/raw95 纵向缓冲对象；原因是把简化碰撞码范围直接用于原始 TDM。引擎先由 `backgroundCollisionCode()` 将 raw 转为背景码，raw68 则有独立 `PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE` 静态物件框。正式 `GameView` 审计并核对对象框后，48组/96个端方向的源格分类为 raw86 22端、raw87 22端、raw94 9端、raw95 9端、水岸码107/109/110/119/127合计10端、地图边界24端；没有普通地形码作为首个端点来源。永久测试 `official-static-transport-endpoint-audit.test.ts` 固化了该静态分类与对象框登记。此清单只定位来源，不证明移动停靠。
- **端点运动必须证明车辆真的撞到了端点：**旧 Ghost Town 蒸汽船测试虽称“地图边界停止”，但它的移动目标是 x=30，船在目标处停下并未触碰右边界。C4-B 新增正式地图 `GameSession` 定点，会把船目标设到地图外，分别检查西/东边缘；另用 Lucky Lake raw94/raw95 与 Mississippi/Oregon 五类水岸码检查整组停稳、APK 对象框/水面角点不越界、原始间距及反向移动。测试通过确认9个代表方向。后续不能依据“moving=false”或目标在边缘附近就称为碰撞停靠；须证明目标仍未到达、边界/碰撞框确实阻止本帧位移、整组稳定且新指令可离开。此结论是网页 `GameSession` 自动观察，不等同 APK 同帧运行验证。
- **路线交会验证必须保留正式波次，并尊重 action-2 的合法随机分岔：**临时扫描曾把请求数压成1、把间隔改为0，并把全图碰撞当成交会冲突；这会改变相遇时间并纳入无关对象。正式测试 `official-transport-crossing-behavior.test.ts` 保留官方车辆/horseman 请求数量、间隔和路线，只隔离其他波次、我方单位与奖励箱，推进真实 `GameSession` 并只在候选交会格周围检查路径与 APK 7678×7678 碰撞框。固定 seed 是隔离波次 seed，不是完整战役同 seed 回放。Level 17 spawn 3/5 的 horseman seed 1 中，spawn 3 在原图 action-2 格 `(6,21)` 选择北向合法分支并从 y=16 出口离开，因此没有经过 `(14,21)`；spawn 5 才经过该交会格。这不是漏路或越界，不应强制每个出生点经过同一格。六组车辆与六组 horseman 定向会话共12项通过，未见候选区域跨源碰撞框重叠；Level 31 的预约会让车辆错帧进入附近区域，也不应把同帧靠近作为通过条件。结论只覆盖固定 seed，不穷举随机路线；检查时要对照源 action 方向、实际路线分支与碰撞框，不能只按“候选交会清单”要求所有单位到同一点。

### 桥面画面探针按脚底锚点选目标

**状态：**M2 碰撞/桥面范围已按41图自动覆盖与类别级移动会话关闭。Cow Gulch raw80、Steam Valley raw88 与 Cow Gulch raw36 均通过真实 Canvas 输入及定向 E2E 观察；raw36 已按 APK 锚点/碰撞框关系判定。网页生产画面仅为三处代表样本，不是 APK 同帧运行证据，也不外推为41图逐帧核对。

- **表现与复现：**初次桥面探针把目标放在 raw80 `(12,9)` 格中心 `(12.5,9.5)`，实际枪手停在 `x=11.65`；这容易被误判为桥面碰撞错误。坐标点击脚底 `(8.5,8.75)` 也没有选中单位，沿用 E2E 已验证的精灵可选点 `(8.5,8.25)` 才能开始左键拖动。
- **根因与证据：**`PLAYER_UNIT_COLLIDER_FINE` 相对脚底的 y 范围是 `-5376..-768`（约 `-0.70..-0.10` 格）。Cow Gulch raw80 上方 `(12,8)` 为阻挡 raw32；脚底 y=9.5 时碰撞框仍覆盖该上邻格，因此横向移动在桥前被正确挡住。将脚底目标降到 y=9.75 后，真实 Canvas 拖动到达 raw80 `(12,9)`；调试十字读数约为 `fine=(93697,74765)`、`cell=(12.2001,9.7350)`，截图中的脚底标记落在桥面贴图范围内。对应位置来自 `cow-gulch.json` 与运行时检查面板，不代表 APK 同帧实机画面对照。
- **计划坐标纠错：**旧观察计划把 Cow Gulch `(8,13)` 的 raw32 称为可走侧，这是错误的：`BACKGROUND_BLOCKING_TILES` 包含 raw32，且 `STREET_LAYER_TILES` 不包含 raw32。raw36 `(8,12)` 墙的相邻可走侧改用 raw16 `(8,11)`；静态碰撞规则见 `src/game/index.ts`，墙边实会话断言见 `tests/player-unit-anchor.test.ts`。
- **Steam Valley 竖桥证据：**Level 12 的 TDM raw88 位于 `(11,8)`、`(11,9)`，实际桥图 `tiles_bridge_verti` 的纵向绘制范围为 `y=7.75–10.25`。Canvas 输入把 Gunslinger 移入上方 raw88 行，截图脚底标记为 `fine=(88320,67995)`、`cell=(11.5000,8.8535)`；这处位置处于 TDM row8 和桥图范围内。画面 `/tmp/gng-m2-d2-steam-valley-raw88.png`；测试直接复用运行时 16:9 内视口、显示像素缩放和地图 viewport 计算。
- **Cow Gulch raw36 边界读数：**Level 1 的 raw36 墙在 `(8,12)`，相邻 raw16 可走侧在 `(8,11)`。短 Canvas 移动停止时脚底锚点为 `fine=(65280,92700)`、`cell=(8.5000,12.0703)`；由于 APK `PLAYER_UNIT_COLLIDER_FINE` 的碰撞框终点位于脚底锚点上方约 `0.10` 格，碰撞框底边是 `y=11.9703`，仍未进入 raw36。不能把锚点的 `floor(y)=12` 单独当作碰撞越界。网页截图 `/tmp/gng-m2-d2-cow-gulch-wall.png` 说明实际视觉落点，但与 APK 原版同帧画面是否逐像素一致仍未知。
- **M2-D3 判定：**APK `GameObjectUnit.draw()` 使用 `fineY` 绘制角色帧的底边；网页 `createAnchoredMapRender()` 初始底边同为 `cell.y+0.75`，运行时 `unitRenderOffsetAt()` 保持 `render.y + render.height = positionFine.y/7680`。因此测得的脚底锚点进入 raw36 行约 `0.07` 格、但 APK 碰撞框仍留在 raw16 侧，是原版参数允许的轻微美术覆盖，不是网页碰撞网格整体偏移。这个结论只针对 Cow Gulch 测点；没有 APK 同帧运行截图时，不宣称贴图栅格逐像素相同。若其他地图的脚底越界超过 `0.10` 格或碰撞框角进入阻挡格，仍需单独调查。
- **E2E 坐标误报与防回归：**Steam Valley 首次测试把 map 点按 canvas 外框宽高线性映射，没有复用运行时 `fitAspectViewport()` 的内层 16:9 视口；之后又把目标放在桥格边缘并要求 `floor(y)` 必须跨格。前者可能产生输入坐标偏移，后者会与约 `0.31` 格的到达停止容差冲突。修正助手后确认应用实际接收的目标为 `(11.5000,9.2641)`；将目标放到 raw88 上方桥格内部 `(11.5,8.5)`，生产截图读数落在 row8，三项永久 E2E（Cow raw80、Cow raw36、Steam raw88）通过。测试必须使用与 `pointerLogicalPosition()` 同一视口变换，且将目标放在待验证格内部；先查输入映射、目标是否合法和到达容差，再判断碰撞规则。
- **防回归：**桥面目标不是一律放在 TDM 格中心；先读 `PLAYER_UNIT_COLLIDER_FINE` 和周边 TDM，再选择碰撞框完整落在桥格内的脚底坐标。Cow Gulch raw80 的可复现输入顺序为 `(8.5,8.25)` 选中，拖至 `(9.5,8.75)`，再至 `(9.5,9.75)`，最后沿桥拖至 `(12.5,9.75)`。测试 `floor(x), floor(y)` 时必须明确测的是逻辑锚点、碰撞框边缘还是所属 TDM 格；不可把 `stop-moving`、不合法锚点或测试选点失败写成产品碰撞缺陷。新增的定向 E2E `tests/e2e/t43-player-bridge-anchor.spec.ts` 需单独通过后才作为永久回归证据。

## 新增战役关卡后的进度断言

**状态：**M15 接入时发现并修复既有 E2E 断言过期；完整 `test:ci` 已通过。

- **表现与复现：**加入 Mississippi 第15关后，旧浏览器测试仍期待总进度为 `*/14`、区域中只有4个已实现关卡，并把第15关当作禁用关卡；实际页面正确显示15关和5个可玩关卡，因此相关测试失败。
- **根因与漏测：**新增关卡注册会影响全战役进度摘要、区域可玩数量及后续锁定范围。检查时只更新了部分单元测试和关卡入口测试，没有全仓搜索所有 E2E 的硬编码计数；首次完整 CI 暴露了遗漏。
- **修复与防回归：**将进度期望更新为15关，Mississippi 已实现数更新为5，并将未实现范围从16关开始。修复后相关定向测试通过，完整 `test:ci` 通过 630 项单测和143项 E2E。
- **避免重复：**登记新战役关卡时，搜索并核对全仓所有 `*/N stages`、区域“已实现关卡数”、可用/禁用关卡范围及阶段快照断言；不要只检查新关卡自己的测试。

M23-F 的首次完整检查再次暴露相同问题：748项中20项单测失败，包括16个旧正式关卡断言仍期待21关、Apache Valley/Cow Gulch/Fort Kaboom的完整目录快照缺少第22关，以及 Progress 快照少了锁定的 Cashcow Canyon；修正后20个单测定向复跑全部通过。全量 E2E 随后发现7项旧断言：6处仍期待 `*/21 stages complete`，另有 Eastwood Free Play 测试仍把可选的 Level 22 当成禁用关；对应断言已更新，相关6个 spec 共13项定向用例全部通过。最终 `CI=1 PLAYWRIGHT_PORT=43217 pnpm run test:ci` 通过类型检查、748项单测、生产构建和158项 E2E。构建 JS chunk 2.559 MB（gzip 281.36 KB），有超过500 KB的既有 chunk 警告；本批没有修改拆包架构。

M24-G 首次完整单测为762项、755通过、7失败：4项是 Apache Valley、Cow Gulch 主目录、Fort Kaboom 目录快照和 Progress 状态投影仍固定在22关；添加 level 23 及其前置/锁定关系后，相关5个 spec 共42项定向测试通过。另3项 Node worker CLI 子进程当时未解析隔离 worktree 中的 `tsx`；重建现有依赖链接后，`serial-batch-parallel.test.ts` 3项单独通过。完整检查未进入构建或 E2E 阶段；第二次完整运行用于确认子进程问题是否仅由 worktree 依赖链接造成。新增关卡时除了搜索数字断言，还要检查整份 stage 数组、Progress 投影和目录映射快照。

M38 再次暴露目录快照遗漏：G4-B 已正确登记 Level 37，但 G5 首轮全量单测发现 `content.test.ts`、`apache-valley.test.ts`、`progress.test.ts` 的旧目录/进度期望仍只有36关。原因是 G4-B 的定向测试覆盖了新关和 Dakota 区域，却没有触发这三份共享历史夹具。已将 Level 37 及其 `campaign-dakota-06` 前置关系补入目录快照，并在初始与结算后 Progress 快照中补入 locked 状态；三个文件共37项定向单测通过。修复后的完整 `CI=1 PLAYWRIGHT_PORT=4221 pnpm run test:ci` 通过类型检查、1112项单测、生产构建及200项 E2E；根目录 `pnpm run test:catalog` 通过18项。内置浏览器静音、窗口模式从真实菜单进入 Free Play → Dakota → Frost Station → Medium，确认 Level 37、首波对白与 Engineer 头像、铁路/桥面/列车、地图和 HUD；关闭对白后进入1/8波战斗，未通关、未进入全屏或播放音频。M36–M38 发布后，GitHub Actions、GitHub Pages 与 Cloudflare Pages 均成功；两个公开 `build-info.json` 的来源 SHA 一致，内置浏览器已在对应版本完成上述开局检查。此项是网页测试基线维护遗漏，不是 APK 内容或逆向结论错误。新增正式关卡仍需检查所有共享 stage/Progress fixture，不能只测新关入口。

M39 又重现了同一测试基线遗漏：Level 38 接入目录后，首轮完整单测发现32个旧关卡用例仍要求 `officialCampaignStages.length === 37`；更新这些数量后，完整阶段目录断言又在 `fort-kaboom-formal.test.ts` 发现只列到 Level 37。随后检索到12个 E2E 仍固定使用 `*/37 stages complete` 或 Dakota 的7关可玩数。M39 实现代码、Level 38 进度门槛和新关定向测试均正确；这是共享目录历史夹具未纳入变更清单造成的验证遗漏，不是 APK 解析错误。已把32个阶段数期望改为38、补齐完整目录快照，并更新12个受影响的 E2E。修复后完整 `test:ci` 通过类型检查、1135项单测、生产构建和203项 E2E；根目录 `pnpm run test:catalog` 通过18项。窗口模式、静音下通过内置浏览器从菜单进入 Free Play → Dakota → Wayne Waters → Medium，确认 Level 38 地图、Captain 首波对白/头像、关闭对白后 Wave 1/8、1×至1.25×缩放及复位；退出后检查正式战役空进度下 Level 38 为锁定。发布后 GitHub Actions run `44703168213` 成功；GitHub Pages 与 Cloudflare Pages 根 `build-info.json` 均匹配来源 SHA `7dcb8caabc436778e6880b26759e57dbb7898f7b`。部署版内置浏览器再次完成上述 Free Play 开局、缩放、暂停和未完成关卡退出流程。未通关、未全屏、未播放音频或启动 Android。构建保留既有 JavaScript chunk 超过500KB的提示，本批未改拆包策略。新增正式关卡必须在同一批次扫描所有正式关卡数量、完整目录数组、区域可玩数量与阶段摘要；只更新一条 `officialCampaignStages` 测试不足以关单。

## 新增关卡时同步战斗 HUD 的地区标签

- **表现与复现：**Cashcow Canyon 已出现在 Oregon 选关和正式战役中，但 Free Play 与正式开局后的战斗 HUD 仍显示 `NEW MEXICO`。从 Oregon 选择 Level 22 并开始战斗即可复现。
- **根因与证据：**`main.ts` 的 `campaignRegionLabel` 使用逐关 ID 判断地区，只列出 Oregon 的 Eastwood Forest；遇到 Cashcow 的 `officialStage` 时回退到默认 New Mexico。`t61-oregon-02-integration.spec.ts` 首次对 HUD 区域断言时捕获了该错误。
- **修复与防回归：**将 `oregon02CampaignId` 纳入 Oregon 标签判断。新增正式关卡时，除了检查选关所属地区，也要检查战斗 HUD 在正式和 Free Play 两种入口下显示的地区与关卡目录一致；`t61` 分别断言 `OREGON · 22` 和 `FREE PLAY · OREGON · 22`。

## 正式关卡登记后仍须接通菜单内容路由

**状态：**Fort Echo 的主页面接线已修复；菜单与 Free Play 的定向浏览器验收通过，正式解锁和回放入口继续由后续集成测试覆盖。

- **表现与复现：**正式目录已经包含 Oregon 第 24 关及 map27，但从 Oregon 选择 Fort Echo 时，菜单详情的内容工厂仍以 Chinook Woods 作为最后兜底；该路径会让地图预览使用错关内容。Level title、简介、HUD 地区判断及档案驱动的 `replaceSession()` 也各自使用显式关卡判断，单独注册 `officialCampaignStages` 不会自动接通它们。
- **根因与漏测：**`campaignMenuOverviewScreen()`、`campaignMenuLevelScreen()`、`renderStatus()`、`isOfficialOregonMusicSession()` 和 `replaceSession()` 是彼此独立的消费点。Fort Echo 的 builder、路线、波次、进度规则测试只覆盖内容层，因此无法发现网页入口仍缺少 level 24 分支；此前 Oregon E2E 又把关卡 24 预期为未实现。
- **修复与防回归：**为 Fort Echo 补齐菜单双语标题/简介、map27 预览 builder、战斗说明、Oregon 地区标签、档案快照驱动的场景重建，以及复用 Oregon 曲目的识别分支。`t63-oregon-04-integration.spec.ts` 从真实菜单路径检查 Free Play 可玩数量、map27 关卡图与缩略图尺寸、双语文案、Fort Echo 的地区/关卡上下文及首波对白头像。测试拦截媒体 `load()` 记录环境音乐资源地址；音效保持关闭，不加载或播放声音。
- **避免重复：**新增关卡不能以“目录和 Progress 已登记”作为 UI 集成完成标准。逐项搜索消费 `CampaignCatalog` / `officialCampaignStages` 的页面路由、标题/说明、缩略图 builder、HUD 分类、场景重建、音乐和 replay 工厂；至少从菜单实际进入新关卡，并验证预览身份、开局 ID/地区/波次。目录已有静态地图图并不能证明预览使用了正确的 `ScenarioContent`。
- **Ghost Town 再次验证：**G4-B 已接通目录、菜单和新局，但对白选择、Dakota 音乐识别、头像预载及 replay snapshot factory 仍是 `main.ts` / `bootstrap/browser.ts` 中互不自动联动的消费者。G4-C 接入后，`dakota-05-campaign-presentation.test.ts` 检查对白、音乐和预载路由，`dakota-05-replay-content.test.ts` 比较16种录制解锁快照与导入场景单位；t74 E2E 从菜单验证首段对白、头像实际加载和 HUD 地区/关卡上下文。新关验收应使用消费点矩阵逐项关单，不能把“菜单可进”推及到其他页面消费者。
- **Ice Rocks G4-B/G4-C 的 E2E 断言：**首次 Playwright 断言用了不存在的 `data-testid="scene-title"`；`game-page-template.ts` 实际提供的是 `id="scene-title"`。失败上下文已显示 Level 36 的战斗标题，故这次是测试定位器错误，不是开局失败。改用 `#scene-title` 后 t75 两项通过。G4-C 又在保持中文界面启动后断言英文标题和英文波次状态；页面实际已正确本地化，测试改为匹配当前语言后通过。新断言应先查模板和既有稳定 selector，并按当前语言状态写期望；失败时查看快照，不能只根据 locator/文本不匹配认定产品行为失败。首次快照还显示 Dakota HUD 地区回退为 `NEW MEXICO`，这是实际待修接线；G4-C 已补入 `dakota06CampaignId`，并由正式/自由 E2E 验证 Dakota/达科他地区与 Level 36 上下文。
- **Frost Station G4-B 复现：**identity、内容版本、builder、正式阶段和菜单预览都已注册，但真实菜单点击后旧场景仍保留并显示“无法打开关卡”。根因是 `main.ts` 的 `replaceSession()` 仍维护一份独立的关卡 ID 列表，遗漏了 `campaign-dakota-07`；builder 与直接 `GameSession` 测试绕过了这个消费点。将 Level 37 加入档案驱动的 browser-game 分支后，t77 从真实 Free Play/正式菜单都能进入。本例再次验证：注册目录和内容工厂不等于接通生产开局路径，必须用真实菜单入口测到 `replaceSession()`。

## DEX 伪代码分支与路线优先级复核

**状态：**Smali 判读规则已验证；M11–M16 均已修复并通过回归。

- **风险表现：**直接照搬 JADX 输出可能把新开局与读取未完成存档的对象创建分支看反；只凭一张地图预览断言路线正确，也可能漏掉不同入口和随机转向组合。
- **证据与核实：**`GameObjectManager.createGameObjectsFromBasicMap` 的 JADX 伪代码在 map-load 布尔分支处存在控制流重建歧义。Smali 中 code 96–101 与130/131都进入 `fromLoadGame == false` 的创建分支：前者按 type1–6 创建 activity 4 可招募单位，后者按 type35/36创建特殊招募单位；加载存档时跳过 TDM 的新局初始对象。网页先前误把96–101当作只在读档恢复的 marker，继而在 M11–M16 手工工厂中将其跳过。静态审计纠正了判断；六关现复用 TDM 单位构造器，v2 内容版本记录四种全局单位解锁位，M16 另记录 Dynamite 解锁位。旧 v1 回放仍按原单位列表重建，123项六关关联测试和类型检查通过。结论以 APK Smali 条件跳转和字段赋值为准，不把伪代码描述成原始源码。
- **路线复核：**解析 `EnemyDirectorField` 方向表和 `PriorityMap.recursiveLengthTracking` 后，用明确的具体路径独立计算所有路线格优先级，再与网页 TypeScript 算法逐格比较；map05 的 5 个路线变体、142 个路线格均匹配。属于静态算法交叉校验，不是 Android 或浏览器运行观察。
- **路线方向字段：**`WaveRouteDefinition.redirects[n].directions` 表示从该控制点离开的方向，不是从前一个节点进入该点的方向。map14 首次编写时把图边的方向误记在目标节点上；从原始 TDM 重新解出的方向图测试立即失败。修正后比较全部 13 条完整路径及 59 条有向边。新增地图路线时按控制点的出边填写，并用原始 TDM 独立展开每个分支；只检查路线经过了哪些格子不足以验证方向。
- **路线链数量不等于出生点数量：**Badlands 的静态路线定义有37条完整 spawn-to-exit 路线，但只有3个唯一出生 marker。初版关卡规则测试把 `routes.length` 错断言为3；定向测试立即以37对3失败，核对 `WaveRouteDefinition` 后改为分别断言37条路线链和3个唯一出生点。统计关卡入口时应按出生坐标/方向去重；统计完整路线时保留每条出生到出口的路线，不以其中一个数量替代另一个。
- **分组路线表需按有向边去重：**Loot Lakes 静态审计按 marker 方向分组列边，表格有57次边列项，其中三条共享边在基础方向组和多方向分支组各出现一次；归一化 `from-cell + direction + to-cell` 后是54条唯一有向边。生成网页路线 fixture 时按边身份去重，并将唯一边数与节点/marker 数量交叉校验；不要把表格列项数直接当作路线边数。
- **防回归：**碰到 `fromLoadGame`、`isNewGame` 等布尔分支或嵌套 switch 的反编译歧义时，先检查 smali 条件跳转及字段赋值，再参考 JADX 伪代码。多入口/随机岔路的关卡必须覆盖所有路线变体，保存格网、方向节点、出生点和出口的独立期望；不要用完整战役通关替代静态算法验证。
- **审计结论也要反向核对实现：**M16 审计虽改正了 `130/131` 的新局语义，却再次错误地将 `96–101` 写成仅读档创建；代码随后照此省略了 M11–M16 的可招募单位。M19 接入时，同一错误又进入 M19 审计和 M18 的专用工厂：TDM 96–101 实际在 `fromLoadGame == false` 时创建 activity 4 招募单位，读档时才跳过；仅更新报告或只测共享工厂都不够，必须检查每张地图工厂与最终 `ScenarioContent.units`。本轮已恢复 M18/M19 的 Mexican、Indian、Sniper、Grandpa marker 行为；M18 新内容升为 v2，旧 v1 回放继续使用原单位列表。后续逐图测试需从真实 TDM 核对坐标、activity、解锁门控和唯一 ID，并至少覆盖一条对应关卡的回放入口。

## 路线边数必须从原始 TDM 独立计数

- **表现与复核：**Ice Rocks 初步摘要沿用了56条边的旧汇总值；把 TDM 方向码按 APK 方向表展开后，52/53/54/55/56/61 共形成50条转向出口，加上3条出生出口，独立路线 fixture 与网页路线模块都得到53条唯一有向控制边。8条完整路线及460次中间格访问一致，且所有访问均在raw32/80/88道路格。
- **根因：**汇总没有写明边的归一化口径，也没有列出可复算的控制边清单；此前结论被直接沿用。问题是静态统计口径/汇总错误，不是 TDM 缺失，也不需要 Android 观察。
- **防回归：**逐关从原始 marker 展开并保存完整路线节点；按 `from-cell + direction + to-cell` 去重后再报数量，并与 marker 方向出口数交叉检查。路线 fixture 必须独立于生产路线生成结果。

## 更正事实要同步所有关卡报告，并核实派生数据的父级索引

- **表现与复现：**检查当前文档时发现，Golden River（M13）报告仍写着 raw96–101“仅在加载战局时创建”，而 M14 之后的 Smali 结论和本节既有核实均表明这些 marker 在新局时创建 activity 4 招募单位、读档时不重复创建。另一个常见混淆是把 REA Evidence 的 engine.artifact_sha256 当作目标 APK 摘要，或仅凭 Smali 数组标签名推断关卡索引。
- **根因与证据：**原始来源、全局研究摘要、逐关报告和经验记录分别保存了同一事实；后续更正没有同步所有副本，且没有显著标记哪条旧结论已经失效。这是文档缺少明确权威来源和更正传播规则，不只是一次上下文遗忘。REA 的 engine.artifact_sha256 标识 JADX 引擎工件，APK 身份应取 subject.digest.sha256。M35 Badlands 的 GameDesignData <clinit> 中，array_8f4 由父级 aput-object 写入 index 0x21；标签本身不能说明它属于哪个关卡。
- **修正与防回归：**M13 报告现改为新局创建、读取存档时恢复状态，并明确单位解锁门控。新的静态报告同时记录 APK 身份来源及“目标 level → 数组引用 → 父级索引”的映射；复核报告更正时，搜索全部关卡文档中的旧说法并同步修订。数组/lookup table 必须先沿数据流找到父级写入索引，再映射字段语义；REA 工具摘要不能代替目标文件 digest。

## 多分岔运行转向与地图道路图层必须一起核对

**状态：**level 1–27 的路线方向遗漏和 Apache Valley 桥层缺失已修正并发布。发布 SHA 为 `575f928257748dba63947ce90cac427dabe6ed9a`；Actions `43790402076` 成功，两处 Pages 的 `build-info.json` 均匹配。

- **表现与复现：**多个关卡的敌人看起来沿直线离开路面，甚至穿过峡谷。只看菜单预览、路线节点或单个出生口无法稳定复现；Riverside Mountains 的底部出生口最明确：敌人到 `(16,17)` 后应向南，却继续向东。Apache Valley 另有敌人沿峡谷底色经过桥位、但桥面贴图缺失的视觉错误。
- **根因与证据：**level 11–27 的 `previewWave.routes` 保存了完整多出口路线，但 `previewWave.redirects` 只保留第一条路线；[`moveEnemy()`](../src/game/index.ts) 只读 `redirects`，使17关遗漏每关16–61个合法转向方向。APK 的 TDM action-2 格定义真实可选方向；[`wave-routes.test.ts`](../tests/wave-routes.test.ts) 把27张地图逐格与这些 marker 比较，确认运行时集合不完整。另一个独立问题是 Apache Valley 的 [`new-mexico-02.json`](../src/content/new-mexico-02.json) 少画5段水平桥面和3对桥墩：TDM 派生绘制结果与网页地图指令不一致。
- **漏测点：**过去的路线检查主要验证控制节点/边界是否存在，未将“完整路线集合”与“运行时真正消费的转向表”逐格比较；单入口关卡或第一条路线不会覆盖其他出生口在共享路口的选择。道路图层测试也未把每个关卡的地图指令与 APK 派生绘制规则对照，因此地图数据里有路线却不代表玩家看得到正确的道路。
- **修复与防回归：**[`runtimeWaveRedirects()`](../src/game/wave-routes.ts) 从完整路线重建共享转向表，并以原始 TDM action-2 方向码补全合法选择；关卡显式覆盖仍优先，无路线定义的 legacy 场景继续使用原 `redirects`。敌人预览出生位置根据实际行进方向计算，避免所有边缘出生点被假定为向左进入。Apache Valley 补齐5段桥面和3对桥墩，不挪动路线点。后续每张地图必须同时核对：TDM marker→运行时方向表、所有 spawn→redirect→exit 分支、路径实际经过的道路/桥层、角色脚底锚点；不能只检查画出的路线折线，也不能为掩盖数据错位而手动偏移路线。
- **验证与边界：**[`wave-routes.test.ts`](../tests/wave-routes.test.ts) 逐项比较27关所有 action-2 格及方向；Riverside Mountains 的底部出生口通过短 `GameSession` 轨迹确认向南，[`apache-valley.test.ts`](../tests/apache-valley.test.ts) 确认敌人可到达原始桥面，且 Apache Valley 绘制命令与独立 TDM 参考生成器逐条一致。本地内置浏览器静音、窗口模式实看 Apache Valley 与 Riverside Mountains 的代表性移动；公开版内置浏览器进入 Free Play → New Mexico → Death Valley，在 Medium 下确认实际地图、桥面贴图和游戏状态可加载。测试模拟速度临时调至 `4×` 后恢复为 `1×`，声音保持关闭；全程未手动通关或启动 Android。GitHub Pages 与 Cloudflare Pages 的 `sourceSha` 均匹配发布 SHA。没有人工逐关观察全部随机路径，浏览器观察为代表性检查，不声称全关逐帧目视通过。

## 41 关路线联系表需要区分路线/图层核对与完整战斗画面

- **表现与复核：**用户指出已接入地图的路线普遍偏离道路，部分敌人看似走到峡谷。M1 对 Level 1–41 逐关生成联系表：底图取正式 `GameView.map.background` 与 `map.streets` 的 `RenderTile`，裁切使用生产图集资源及源矩形；路线取运行时 `route` 或 `routes`，叠加出生、转向和出口。41 张图逐一检查后，未见路线中心与可见道路/桥层整体错位，也未见直线回退。
- **交叉验证结果：**独立 TDM 路径展开器与正式运行时路线在 40/41 张地图逐条一致。唯一差异是 Cactusville 角落出生 `(0,23)`、`(1,23)`：通用检查器按边界命中顺序推断初始方向，错误选为东向；TDM 专用 `cactusville-map.test.ts` 依据 APK 方向动作确认实际方向为北，并覆盖三条正式路线、出口和路线格。此处是检查器方向假设错误，不能据此改路线。Tech Town code 66 铁轨交叉由 `tech-town-map.test.ts` 确认属于有效路线格，不应只因它不是常见道路码而报警。
- **审计器误报与漏测：**`GameView` 可能只提供单数 `route`，不能只读取 `routes`；关卡级别也不能直接当 TDM 文件号，必须通过 `campaignCatalog.mapFileNumber` 映射。否则会漏掉单路线地图或把关卡 11+ 标成错误 TDM。独立路线检查遇到角落出生时，不能仅用“先匹配到的边”决定移动方向，应读取 TDM/APK 方向动作并由地图专属测试交叉核对。
- **证据边界：**联系表复用了生产图块绘制命令和图集裁剪，但它不是完整 `drawGame()` 截图，不呈现动态敌人脚底、碰撞框、装饰物深度排序、相机裁切或运动动画。因此 M1 只关闭 41 关的路线中心/静态道路图层核对；我方可达范围与碰撞属于 M2，动态车辆/单位表现属于 M3，完整生产画面仍保留为独立视觉验收项。不能用联系表证明用户指出的我方桥面可移动范围或动态精灵与悬崖的每帧关系正确。
- **防回归：**地图审计同时读取 `route` 和 `routes`，TDM 编号从 catalog 取值，路线期望从 APK/TDM 独立数据生成；联系表保留入口、出口与桥端，不裁地图。路线中心、动态精灵包围范围和玩家碰撞区域分别记录、分别验收；图层静态通过不能替代真实 `GameSession` 移动和生产绘制检查。

## 内容版本必须覆盖所有影响开局的档案状态

**状态：M22 基础修复及后续 M36/M37 关卡快照接入均已完成；每个新增关卡仍需核对自己的页面导入分派。**

- **表现与复现：**M4–M7 的部分地图单位受全局关卡里程碑解锁影响，但四关长期使用固定 `contentVersion`。同一回放在不同档案下可能重建出不同初始单位。M21 Eastwood 的定制实体工厂又误将 map24 的 96–101、130、131 marker 排除在新局之外；APK 实际在 `fromLoadGame == false` 时创建 activity 4 招募单位。
- **根因与证据：**M4–M7 内容构造器读取当前 `completedScenarioIds`，回放入口却没有把这些解锁状态编码进版本或重建快照。Eastwood 审计曾依赖错误重建的 JADX 伪代码，未根据 Smali 条件跳转和最终单位列表反核；Smali/DEX 及 `Guns’n’GloryThread` 调用点已确认新局/读档语义。
- **修复与防回归：**M22-D 为 M4–M7 新版本记录实际影响内容的全局解锁位，并按录制版本构建 replay factory；v1 保留导入时档案语义，Tech Town 继续补入 M3。M22-E 让 M21 新局通过共享 TDM 单位工厂生成 marker 96、97、100、101、130、131 的 activity 4 单位，M21 v2 记录新单位集，v1 replay 过滤 activity 4 并保留已发布版本的活动单位列表。M22-F 覆盖了实际导入路由、v1/v2 版本识别、未知版本拒绝、Free Play 与正式入口；M4–M7 的16种解锁组合和地图访问位另由工厂单测覆盖。
- **测试夹具边界：**M4–M7 v1 沿用导入时档案，因此生成带 `preparedSetup` 的 v1 探针时，录制档案必须与导入档案相同；否则数字参数路径集合可能不同，错误表现为 `prepared-setup-invalid`，不是内容版本路由失败。v2 探针则故意使用不同档案，验证录制快照。M4 `map-access=0` 表示不可进入状态，真实 Free Play 新局会补入 M3 并记录开放快照；关闭状态检查版本解析和 `prepare`，不伪造一场可回放战斗。
- **避免重复：**本轮不改 APK 已核实正确的共享 `createNewMexicoMapUnits()`，也不重新分析 marker 96–101 的 Smali。后续新增关卡时，从真实 TDM marker、最终 `ScenarioContent.units`、内容版本解析和不同当前档案下的 replay factory 四处闭环；不能仅凭固定版本字符串或单测中间映射通过判定。

### 新关卡的回放入口必须测试主页面分派和录制快照

**状态：M37 Ice Rocks 的 replay factory 和页面导入分派已完成定向验证。**

- **表现与复现：**Ice Rocks 初始场景单位及可用炸药由档案里程碑改变；若导入回放时使用当前档案创建场景，同一个回放会重建出不同内容。只测试版本字符串解析或 factory 单独开局，无法确认主页面文件导入真的调用了该 factory。
- **根因与证据：**回放内容版本把 Grandpa、Sniper、Pyromaniac、Salesman 与 Dynamite 解锁状态编码在规范字符串中。`createBrowserGameForDakota06Replay()` 解析该快照并调用显式 snapshot builder；`main.ts` 的 `gameForReplay()` 必须按 `campaign-dakota-06` 将导入请求分派到该工厂。当前档案不参与这条重建路径。
- **漏测点：**原有直接 factory 测试只能证明传入版本能重建对应场景，不能证明网页实际导入分派正确；若 E2E 只验证错误提示，也可能没有证明带版本的回放先进入正确关卡工厂。
- **修复与验证：**M37 新增32种单位解锁与 Dynamite 组合测试，逐项比较版本 round-trip、单位集合和炸药状态；浏览器测试先保存空当前档案，再导入记录了 Grandpa 与 Pyromaniac 解锁状态的 Ice Rocks 回放。受支持版本进入回放校验后按测试设计在 frame 1 产生摘要不匹配；带额外后缀的非规范版本被拒绝为 `content-unavailable`。该 E2E 证明导入分派和版本拒绝，不代表完成过一场有效结算回放。
- **防回归：**每个新增关卡如有档案依赖内容，必须同时验证版本解析、snapshot factory、不同当前档案下的页面导入分派和非法版本拒绝。摘要不匹配的 E2E 只能证明导入到了可用场景工厂；需要宣称完整回放成功时，必须另用已完成的有效回放并核对 terminal settlement 与档案副作用。

## 正式开局必须使用与档案版本匹配的场景 builder

**状态：**M24-F2 接入 Chinook Woods 时发现并修复；浏览器正式入口已覆盖完整单位解锁快照。

- **表现与复现：**若当前档案解锁了会改变关卡初始单位的全局单位，而正式关卡选择仍复用页面初始化时的默认 `Game`，提交给 `Game.open` 的档案 `contentVersion` 会和默认场景版本不一致，开局以 `content-version-unavailable` 拒绝。当前代码通过解锁完整的正式 Chinook Woods 档案走真实菜单入口验证该条件。
- **根因与证据：**`main.ts` 的 `replaceSession()` 需要对依赖用户档案快照的正式/自由关卡创建 `createBrowserGame(completedScenarioIds)`。此前 Oregon 分支只包含 Eastwood，Cashcow 与 Chinook Woods 未全部列入；两关 builder 会根据 Grandpa、Sniper、Pyromaniac、Salesman 里程碑改变初始单位及内容版本。`GameSession.open()` 会比较请求版本与选中场景的 `contentVersion`，不匹配时按 `content-version-unavailable` 拒绝；对应的内容版本由 `bootstrap/browser.ts` 计算。
- **漏测点：**内容工厂和直接 `createBrowserGame(completedIds)` 测试可以通过，但它们绕过了主页面 `replaceSession()` 的场景选择。只有以具有不同解锁快照的档案从真实菜单进入，才能验证生产 UI 路径也选中了匹配 builder。
- **修复与防回归：**在 `replaceSession()` 将 Oregon 2、3 与已有档案依赖关卡一并路由到档案驱动的 browser game。`t62-oregon-03-integration.spec.ts` 的正式开局夹具包含四种解锁里程碑，确认第 23 关仍能打开；builder/回放测试覆盖全部16种组合，回放导入使用录制版本而不是导入档案。
- **避免重复：**增加正式或 Free Play 关卡时，不止测 builder 和 `GameSession`；从主菜单到 `replaceSession()` 检查 content builder 路由，再用至少一个与页面默认场景版本不同的用户档案进入。记录 snapshot 的关卡还需验证回放工厂忽略当前档案并从录制版本恢复。

## 档案驱动的关卡测试必须使用同一档案生成内容版本

**状态：**M22-G 首轮完整 CI 中发现并修复。

- **表现与复现：**`browser-bootstrap.test.ts` 用含关卡解锁的 completed IDs 创建 Billy Hills Game，但请求版本来自默认空档案；`Game.open` 以 `content-version-unavailable` 正确拒绝。该项在 M22-C 的内容版本快照改造后成为过时测试夹具。
- **根因与修复：**关卡 builder 根据输入档案生成内容版本；测试调用 `getBrowserScenarioContentVersion` 时省略了同一组 completed IDs。开局请求现将该档案传给版本解析器，避免用不同快照组装请求。
- **防回归：**任何测试若以档案构建 Game，`contentVersion` 必须从相同的 completed IDs 生成；若有意测试跨档案回放，需通过 replay factory 并明确记录 v1/v2 的不同语义，不能复用正式新局请求的默认版本。

## 内容版本快照位序不等于地图单位枚举顺序

**状态：**M24-F1、M36 G4-A 与 M37 G4-A 的测试期望均已修正；运行时代码符合共享快照契约。

- **表现与复现：**为 Chinook Woods 写 16 种解锁矩阵时，按地图 marker 顺序将 mask bit 0 解释为 Sniper，第一组测试与内容工厂结果不一致。
- **根因与证据：**共享 `mississippi-unit-unlocks.ts` 的 canonical suffix 固定按 `grandpa`、`sniper`、`pyro`、`salesman` 编码；TDM marker 清单通常按 Sniper、Grandpa、Pyromaniac、Salesman 排列。两种顺序不同，不能把枚举下标直接当作版本位。实际 `CampaignCatalog` milestone ID 和 builder 生成的活动单位才是行为基线。
- **修复与防回归：**修正测试矩阵，将 `campaign-oregon-10` / `campaign-dakota-10` 等 milestone ID 分别映射到对应单位类型；16 种状态均通过内容版本 round-trip 与 `GameSession` 初态核对。生产快照编码没有修改。
- **避免重复：**复用全局 unlock suffix 时，按 named snapshot field 或对应 milestone ID 生成测试数据；单独测试编码/解析顺序与最终地图单位，不从 marker 列表位置推导 bit order。
- **M36 复发与定位：**Ghost Town 首轮快照用例再次把 `campaign-dakota-10` 映射到 Grandpa，定向测试立即失败；实际里程碑是 `campaign-oregon-10` 解锁 Grandpa，`campaign-dakota-10` 解锁 Sniper。代码中的版本位序正确，问题仍在测试样例映射。修正后16种位组合、对应单位集及版本 round-trip 全部通过。写快照矩阵时需逐项引用 `mississippiUnitUnlockSnapshotFor()` 中的 global level 与 `campaignCatalog` 地区，不得只凭 region 名猜 milestone。
- **M37 复发与定位：**Ice Rocks 的 profile fixture 预期四个单位解锁位全开，却漏列 Sniper 对应的 `campaign-dakota-10`；比较生产 builder 与显式快照 factory 时因此报 `sniper0`/`sniper1` 不一致。`campaign-oregon-10`、`campaign-nevada-10` 和 `campaign-alaska-10` 分别不能替代 Sniper 里程碑。补入正确完成关卡后，profile 与快照工厂一致；17项 Ice Rocks 定向测试和类型检查通过，未改运行时代码。快照测试失败时先逐字段将 milestone ID 对到全局等级和具名解锁位，再判断生产实现。
- **M39 派生状态不可任意组合：**Wayne Waters 的内容版本测试遍历32种单位解锁位与炸药位组合，其中 `grandpa=true, dynamite=false` 可被显式快照编码器序列化，但不能由真实进度产生：解锁 Grandpa 的全局第30关同时满足炸药的20/30关解锁条件。首轮测试错误地要求 profile 派生快照与这个不可能状态相等。生产门控和版本解析均正确；修正后分别验证全部32种版本位组合，以及进度生成时 `dynamiteUnlocked = profileUnlock || grandpa`。此为测试夹具未表达里程碑依赖，不是反解析遗漏或内容版本文档误读；测试内容快照时要区分格式可表示状态和玩家实际可达状态。

## TDM Dynamite marker 与对象角色不能混写

**状态：M16 静态审计与关卡测试已校正。**

- **错误表现：**Highpoint Terrace 审计曾把 code `102` 写成炸药箱、把 `110` 写成触发器；而应用现有配对器将 `102` 作为 trigger、`110` 作为 box，导致按审计编写的坐标期望失败。
- **根因与证据：**`GameObjectManager.smali` 的 `createGameObjectsFromBasicMap` packed-switch 中，map value `102` 命中创建并加入 `DynamiteTrigger` 列表的分支；`110` 命中创建并加入 `DynamiteBox` 列表的分支。map19 网格位置分别为 `(28,10)` 与 `(27,11)`。此前审计将 marker 坐标与对象语义对调。复查发现研究分支的 `apps/gunsnglory/docs/research/game-analysis.md` 仍保留相反说法；直接按 packed-switch key 与分支内对象构造/列表写入核对后，确认该研究报告未随 M16 更正同步，不能作为当前语义基线。
- **修正与防回归：**[M16 静态审计](map16-static-audit.md)已改为 trigger `(28,10)`、box `(27,11)`；`mississippi-16-campaign-rules.test.ts` 从真实地图网格检查配对结果和 20/30 关解锁路径。新增炸药对象时同时核对 TDM 字节、Smali 对象构造分支和运行时字段语义，不能只根据对象名称或相邻 marker 推断。遇到研究总结、单关审计与经验记录对同一 marker 有冲突时，先回到原始 switch key 和分支副作用核对，再修正所有仍被后续 agent 读取的副本。

## 炸药爆炸半径要包含精确边界

- **表现与复现：**地图炸药中心到敌人的距离恰好为 3 格时，网页没有造成伤害；距离略小的目标会受伤。
- **根因与证据：**`src/game/dynamite.ts` 的 `isInsideDynamiteRadius()` 使用严格 `<`。APK `DynamiteBox.detonate` 对未量化的 fine-unit 距离平方使用 `<= radius²`，半径为 23,040 fine units。静态证据与网页函数可直接证明边界单位被排除。
- **漏测点：**旧辅助函数测试只覆盖半径减一和加一，没有断言等于半径；既有 `GameSession` 炸药测试目标位于半径内部，因此未发现边界差异。
- **修正与防回归：**比较改为 `<=`；单测同时检查 `radius−1`、`radius`、`radius+1`，并用真实 Dynamite Plains TDM 配对启动 `GameSession`，验证位于 3 格边界的敌人确实受伤。M26-C 定向回归 179 项通过，类型检查通过。
- **避免重复：**炸药以二维距离平方比较，保留 fine-unit 坐标精度；不要用格数取整、曼哈顿距离或 `<` 替代 APK 的边界规则。

## Dynamite 解锁碰撞探针要隔离地形格

- **表现与复现：**Ice Rocks 锁定与解锁两种 GameSession 移动探针都停在 Box 前；起初看起来像锁定态仍创建了动态碰撞框。
- **根因与证据：**探针把 raw102/110 marker 直接放进 `originalTileGrid`。玩家地形判定会读取这些 raw 格的背景碰撞语义；因此即使 `createPlayerMapCollisionBoxes()` 在锁定态不添加 Dynamite 动态框，底层地形判定也可能让两组探针停在相同位置。这是测试夹具把地形阻挡和解锁对象阻挡混在一起，不是共享碰撞规则缺陷。
- **修正与防回归：**Ice Rocks marker 坐标和配对从真实 map39 TDM 单独断言；动态碰撞差分探针使用同尺寸全开放地形，Dynamite Pair 仍由 Ice Rocks APK 派生构造器提供。锁定态穿过、解锁态停在 Box 碰撞边界前；实际地图另用 GameSession 核对爆炸与三格精确边界。
- **避免重复：**测试某个可解锁对象是否加入动态碰撞时，保持其他地形/对象输入相同且开放；TDM marker 坐标、marker 所在底图阻挡语义和解锁对象碰撞框分别断言，不能把“人在该格停下”直接归因于解锁对象。

## TDM 单位 marker 必须验证到最终场景单位

**状态：map10 切片 B 已修复并由静态 marker 对照测试验证。**

- **表现与复现：**Lost City 的 tile 107 被解析成 unit type 4、activity 5，但网页场景中没有对应的活动 Indian。
- **根因与证据：**APK DEX/Smali 的 104–109 分支按 `tile − 103` 创建 unit type 1–6 并设为 activity 5；JADX 把该分支误还原成空块。网页共享工厂此前只创建 activity 5 的 Gunslinger、Mexican 与 Gambler，type 3–6 走到“只处理 activity 4”的分支后被跳过。map10 的 107 因此漏掉；已有 Tech Town 测试只核对 marker→类型/activity 的解码，没有用包含 type 4 activity 5 的真实 TDM 验证最终场景。
- **修复与防回归：**activity 5 的 Fort 类地图单位现在复用 APK 对应设计的 awake 素材、尺寸锚点、速度、音效与武器；map10 测试从实际 TDM 核对全部单位坐标、类型和 activity，并断言 active Indian 使用 `player_indian` 且不带 hire 状态。每张地图的检查应同时覆盖原始 marker、共享 placement 与最终 `ScenarioUnit`，不可把中间映射表测试当成对象已生成的证明。
- **避免重复：**不需要重新反编译这条 104–109 分支；总表和 Smali/DEX 已足以定类型。后续若再遇到同类问题，应先检查共享工厂是否真的消费所有已解码的类型/activity 组合。
- **地图范围：**不要为 Mississippi 单独过滤 code96–101。map14–20 的真实 TDM 数量和解锁状态应驱动新局单位；新内容测试逐格比较 TDM marker 与最终单位。旧回放需按旧 contentVersion 重建其原单位列表，不能为兼容回放而继续让新局内容漏单位。

## 同类型可招募 marker 必须生成唯一单位 ID

**状态：Dead Rocks 已修复并由全解锁场景测试验证。**

- **表现与复现：**Dead Rocks 有两个 code130 Pyromaniac 招募点。全局 Pyromaniac 解锁后打开 Free Play，Game 初始化因重复路径 `units/pyromaniac-hire-01/movementSpeedFinePer100Ms` 拒绝场景。
- **根因与漏测：**共享 New Mexico 单位工厂的 Pyromaniac 和 Salesman 构造器固定使用 `hire-01` ID；同类 Fort 单位已有按类型计数，而特殊招募单位没有。仅以默认锁定快照创建场景时，这些 marker 不生成，所以既有唯一性断言没覆盖真实解锁场景。
- **修复与防回归：**特殊招募单位也按同类型 marker 递增 ID；Dead Rocks 全解锁测试要求全部单位 ID 唯一，并逐 marker 核对对应类型和数量。以后添加解锁或重复 marker 时，应在至少一个包含全部解锁的实际地图场景上初始化 Game，不能只检查默认锁定场景。

## 出生池验证应使用来源 ID，不猜地图坐标

**状态：map10 短会话测试已采用来源事件验证。**

- **错误路径：**最初用第一帧敌人的 `positionFine.y` 推断出生池行。Lost City 四个入口都在 `y=0`，而敌人编组在出生标记外侧生成，因此测得的 y 行既相同又位于地图边界之外，不能区分四个 pool。
- **根因与证据：**`GameSession` 按 `CampaignSpawnPoolDefinition.spawnPointId` 选择 `previewWave` 中对应出生场，再在该方向的地图外侧创建敌人；编组偏移与首帧移动还会改变坐标。`EnemyView.positionFine` 是运行位置，不是原始 TDM marker 或 pool ID。
- **修正与防回归：**map10 每个波次的一帧会读取 `enemy-group-spawned` 事件中的 `spawnPointId`，与该波含请求的池编号逐项比较；出生 marker 的坐标和方向另由静态 TDM 测试验证。
- **避免重复：**多个 spawn 共用同一地图边时，不用 positionFine 的同轴行/列猜 pool。优先断言来源事件 ID；若需要视觉位置，再验证与静态 spawn marker 的方向偏移关系。

## 波次请求向量是生成权重，不是固定出敌顺序

**状态：已在 map05 短时模拟测试中验证。**

- **表现与复现：**测试把波次请求向量的第一列当作第一个生成敌人，并据此断言其血量；实际首敌可能是马车等其他类型，测试失败。
- **根因与证据：**`GameSession` 将请求向量作为各敌人类型的剩余生成数量，并通过带种子的随机选择决定下一次生成类型。向量列号不代表逐个生成的时间顺序。实际短时模拟和引擎选择逻辑确认了这一点。
- **漏测点：**测试只核对了请求向量静态内容，却把静态列顺序误当成运行事件顺序，没有检查生成器的随机选择。
- **修复与防回归：**测试按实际敌人类型核对血量和速度，并独立检查波次延迟后的生成、路线入口及请求向量。需要固定顺序时必须显式注入确定性随机源；否则不得断言向量第一项必然先生成。
- **新关卡数据交叉核验：**Dead Rocks 的8条波次元数据与35条生成请求已从 APK 派生配置独立提取，再与网页波次定义逐项比较；比较时保留每波10个请求槽位及末尾零值，并将 APK 整数常量解析为语义字段后比较。不要把资源中的整数枚举直接当成网页运行顺序，也不要用请求向量推断敌人出现先后。对白资源 ID、头像和角色映射分别与对应资源表核对；静态核对不等同于试听音频或完整实战。

## Boss 与 Doc 请求槽位必须追到最终敌人类型

**状态：**Boss 请求槽位已校正；前30关的 Doc 请求数均为零，网页本批未实现 Doc。

- **表现与复现：**Cashcow Canyon、Billy Hills、Fort Echo、Apache Valley、Railroad Ranch、Mount Hood、Colt City、Snake River 的 Boss 请求都写入网页 `requests[9]`，而共享 `GameSession` 不消费该索引；因此这些关卡的数据虽然保留了十个请求槽位，Boss 实际不会生成。Lumber Mill Hills 的末两次请求也要求生成 Boss。
- **根因与证据：**APK `addToWave` 的重载会将请求补齐到原始槽位2–11；`Wave.setContentForSpawnPoint` 与 `WaveManager.updateWave` 将原始槽位10映射到请求类型7（Boss），槽位11映射到请求类型9（Doc）。网页请求数组从零开始，因此 Boss 是 `requests[8]`，Doc 才是 `requests[9]`。结论按 APK Smali 的槽位写入、消费分支和最终敌人构造交叉确认，不从 `bossCount` 变量名推断索引。
- **漏测点：**旧测试只检查十槽数组长度或照抄网页 helper 的索引，没有从源槽位追踪到最终 `enemy-group-spawned` 事件。Boss 类型7此前也未进入网页的敌人类型、属性、生成和绘制链。
- **修复与防回归：**八个 Oregon 波次 helper 改为写索引8并将索引9清零；共享 `GameSession` 增加 APK 已使用的 Boss 类型7及资源、核实属性、动画和 HUD 名称。`campaign-boss-source-slots.test.ts` 检查八关所有请求池的完整十槽及 Boss/Doc 计数；`campaign-boss-spawn.test.ts` 从真实关卡短会话确认请求索引、生成类型、属性和来源事件。新增末位敌人时必须核对“APK 槽位 → 网页索引 → 请求类型 → 最终敌人类型”，不能仅凭数组长度、名称或派生摘要判断。没有目标关卡请求的 APK 槽位只保留兼容位置，不扩展未被使用的敌人行为。
- **M31 收尾回归：**新增 Oregon 第 10 关后，完整单测又发现旧的 Mississippi 规则测试把全局敌人注册表写死为不含 Boss 类型7。将该测试期望补齐为共享注册表的 Boss 属性；这不表示 Mississippi 地图有 Boss 请求。新增关卡若扩展共享敌人注册表，需分别核对“全局可用类型”与“各关实际请求”，不能把共享属性表当作单关投放清单。

## GameSession 的 debug 模式不执行战役波次

- **状态：问题已解决；下面的临时内容状态仅描述 map06 第 2 步数据切片期间。**map06 现在是正式登记关卡。
- **表现与复现：**map06 短测已配置 `campaignWaves`，但用 `mode: 'debug'` 推进到开局延迟后仍没有敌人；debug 视图也不提供正式/自由战役的 `totalWaves`。
- **根因与证据：**`src/game/index.ts` 只在 formal/free 会话，或其回放源模式为 formal/free 时启用 `campaignMode`；debug 模式只按普通预览波逻辑运行，不会消费 `CampaignWaveDefinition` 的请求池。内容数据正确，测试模式选错。
- **修复与防回归：**关卡波次短测改用 `free` 会话。map06 数据切片尚未登记时，测试副本临时设置 `formalSettlementSupported: true`，当时不改变产品可玩状态；随后正式内容接入已把该标志登记到生产关卡。真实 map06 波次由静态审计期望验证；池 1 的 GameSession 入口映射另用单请求测试副本定点检查，不完整推进原版十波。
- **避免重复：**验证 CampaignWaveDefinition 时先确认所用 GameSession mode 会启用 `campaignMode`。debug session 的初态可用于单位/渲染调试，不能当作正式波次生成证据。

## GameSession 地图雇佣前必须选中单位

**状态：**Fort Echo 浏览器 Cannon pool 集成探针已修正并通过。

- **表现与复现：**直接从 `GameSession.observe()` 取到 Fort Echo 的休眠 Cannon 后立刻提交 `hire-map-unit`，`submitIntent()` 返回 `false`。这不是 Cannon 池或价格配置故障。
- **根因与证据：**`src/game/index.ts` 的 `GameSession.submitIntent()` 只接受已选中且 `activity === 4` 的地图单位雇佣请求；浏览器/UI 先通过 `select-at` 选择地图单位，后续才发送雇佣意图。E2E 第一轮探针遗漏了这一步，调用预条件与真实用户流程不一致。
- **修复与防回归：**测试先对 Cannon 格中心提交 `select-at` 并推进一帧，确认单位进入 selected 状态后才提交雇佣意图；再断言 `$150` 扣款、`map-unit-hired` 事件及 Fort `(10,12)` 的活动 Cannon。G2 的 5 项 Fort Echo 定向 E2E 全部通过。
- **避免重复：**用 `GameSession` API 直接模拟地图操作时，按“选择单位 → 推进命令 → 确认 selected → 雇佣”的顺序构造输入。只断言单位 ID 存在，不代表它已满足 `hire-map-unit` 的状态前提。

## 快速推进到中途波次时不能把所有敌人池清空

**状态：**M19 与 M36 玩家单位池短会话测试夹具均已修正；没有改动正式波次清算规则。

- **表现与复现：**为快速验证 Dust Falls 第4波 Indian 池而把测试用第1–8波全部改成空请求时，会话推进到第4波后很快结束该波，池单位尚未生成。
- **根因与边界：**网页 `GameSession` 的波次完成条件依据场上敌人、敌方待生成请求及 campaign 状态，不把玩家单位池的待生成数当作延迟波次完成的条件。真实 M19 第4波含两条敌人生成池；空波是测试夹具的人造状态，不能据此认定正式关卡有问题。
- **修正与防回归：**短会话只将目标波以外的请求置空；目标波保留一个远大于观察时长的待生成敌人请求，以稳定停留在该波，再观察玩家单位池的真实计时和出生点。该测试只推进约两秒，不更改 APK 关卡数据，也不要求完整实战。
- **M36 复发：**Ghost Town 单位池探针为避免敌人干扰，把第1波 `spawnPools` 设为空；`GameSession` 第一次零时推进便因空波结算，随后拒绝地图雇佣请求。加入一个生成间隔远大于观察时间的待生成请求后，雇佣和 Fort 出生探针通过。测试波次只需避免实际生成，不应清空最后一个待生成请求；提交雇佣意图前也要确认战斗仍处于未结算状态。

## 实验室大块底板造成贴片感

**状态：首轮修正已公开发布到 `3c434917`；用户复核发现材质层级反了，后续整改见下节。**

- **表现与复现：**在公开实验室工作台中，整个内容区被圆角米色矩形包围；设置、结果和档案分组又各自拉伸大幅羊皮纸贴图。尤其报告与档案区域内部还有浅色操作面板，形成多层重复矩形，看起来像整张素材贴在站点页面上。
- **根因与漏测：**首轮诊断把所有大矩形都当成同一层，没区分工作台外框与原版主分组羊皮纸；`.lab-workbench` 的自制渐变框确实应移除，`.lab-card` 的 `gng_hud_2_textbox_large.png` 却是应保留的游戏原版素材。与此同时，内层自制浅色面板的框线没有清掉。测试只检查“不应有背景图”和“操作小面板仍在”，没有分别断言各层应使用的素材。
- **首轮修复与验证：**公开提交 `3c434917a628a9e68cd6b254a38e473d31234740` 移除了 `.lab-workbench` 外框和 `.lab-card` 贴图，却保留 `.experiment-panel`、档案及倍速区浅色方框。源代码定向测试和完整 `CI=1 pnpm run test:ci` 均通过；GitHub Actions `42752081368` 成功，两处 Pages `build-info.json` 均匹配该 SHA。线上截图确认外框已消失，但也暴露了原版羊皮纸一并丢失的问题。
- **防回归：**必须区分三层：页面工作台透明；主 `.lab-card` 使用原版羊皮纸；卡片内部内容面板透明。只让按钮、表单输入和数据表格保留必要控件边界。测试应逐层检查资源和框线，不能用“页面上没有背景图”作为统一验收。

## 实验室底图与内层框层级反转

**状态：已修复并通过完整本地检查；发布结果见实施计划。**

- **表现与复现：**公开页面 `?release=3c43491#lab` 中，设置/结果/档案区没有原版破边羊皮纸；实验参数、保存比较、Profile、实验档案、回放和倍速仍分别显示浅色矩形框。
- **证据与根因：**内置浏览器截图及只读计算样式检查显示 `.lab-workbench` 透明；`.lab-card` 的 `background-image` 为 `none`，但 CSS 变量仍指向 `gng_hud_2_textbox_large.png`；`.experiment-panel`、`.lab-saved-comparisons`、`.campaign-profile-archive`、`.lab-experiment-archive`、`.replay-panel` 和 `.lab-speed-card` 仍有浅色填充及边框。首轮改动撤掉了该放在主内容层的原版贴图，却留下了自制内层框。
- **修复结果：**保持 `.lab-workbench` 透明，在三块 `.lab-card` 恢复 `gng_hud_2_textbox_large.png` 和避开破边的顶部、左右留白；实验设置、结果、档案、回放和倍速区域移除自制填充、边框与阴影。木按钮、输入/选择控件与表格单元格边界保留，避免操作对象黏在一起。未改 DOM、交互或数据行为。
- **防回归与验证：**`t41-lab-workbench.spec.ts` 断言主卡片引用的图片成功解码为384×192资源、留白足以避开破边、内层面板透明无框，并覆盖桌面/平板/手机几何和横向溢出；`t29-campaign-menu.spec.ts` 也要求实验室主卡片继续使用原版贴图。两个定向 spec 共9项通过。内置浏览器检查本地与发布页面，确认贴图在主层、内层无矩形框，按钮可读。发布提交 `cd3bd51` 对应 GitHub Actions `42757255799` 全部成功；GitHub Pages 与 Cloudflare Pages 根 `build-info.json` 均匹配来源 SHA。线上首次导航后立即截图时背景图片尚未显示；切到游戏页再经站点导航返回实验室后，羊皮纸和木按钮正常显示。截图验收需确认动态背景已加载，不能把过早截图认定为素材缺失。`CI=1 pnpm run test:ci` 通过类型检查、409项单测、生产构建及120项 Playwright E2E；构建仍有主 JS chunk 约655KB、超过500KB预算的既有提示。npm registry DNS 不可用，因此测试复用了本机同项目依赖；依赖清单与锁文件未改。发布比例和下一次普通发布门槛见实施计划。

## 实验档案导入按钮 hover 覆盖木按钮贴图

**状态：**纯 hover 的实色背景问题已修复；后续发现的焦点矩形也已修复并通过定向 E2E。

- **表现与复现：**在实验工作台悬停“Import experiment archive”，按钮下方出现深绿色矩形；相邻导出按钮仍显示木质按钮图。
- **根因与证据：**`.experiment-archive-actions .replay-import-label:hover` 设置纯色 `background` 简写。该悬浮选择器比 `.lab-workbench .replay-import-label` 更具体，因而清除了文件标签的木质背景图；普通按钮有较晚的木按钮规则，所以视觉上只有导入标签异常。
- **漏测点：**之前只检查木按钮静止状态，没有把鼠标悬浮到文件导入标签并比较计算后的背景图。
- **修复与防回归：**纯色悬浮背景只保留给普通按钮；文件导入标签沿用木按钮图，只用亮度滤镜反馈悬浮。`t41-lab-workbench.spec.ts` 对比标签悬浮前后的背景图和底色，并断言悬浮滤镜提亮，避免再出现实色方框。

### 焦点状态不能伪装成 hover 缺陷

- **复现与观察：**当前代码中，Playwright 纯鼠标 hover 后木按钮贴图仍在、底色透明；点击文件导入标签后，隐藏文件输入获得焦点，旧 `:focus-within` 规则会给标签加矩形轮廓。指针留在标签上时，焦点轮廓容易被误认为 hover 时新增的深色矩形。
- **根因与漏测：**`.experiment-archive-actions .replay-import-label:focus-within` 使用矩形 outline，和其他木按钮的美术反馈不一致。原 `t41-lab-workbench.spec.ts` 只验证纯 hover，没有单独覆盖文件输入焦点，也没有区分“hover-only”与“focus-within”。
- **修复与验证：**移除导入标签的矩形焦点 outline；文件输入聚焦时用暖金色滤镜高亮木按钮贴图，并显式保持底色透明。`t41-lab-workbench.spec.ts` 分别检查 hover 背景/贴图和 focus-within 轮廓/高亮；该 spec 3 项通过。内置浏览器截图确认焦点矩形已消失，按钮外观与同组木按钮一致。
- **防回归：**文件导入标签应分别验证 hover、focus-within 和 hover+focus 状态；不要仅因指针位于控件上就把焦点轮廓归因于 hover。标签背景始终透明，视觉反馈贴合按钮图案，不铺矩形实色底或矩形 outline。

## 羊皮纸告示牌下露出规则黄色底

**状态：**已随 Lost City 完整批次发布并完成线上核对。发布 SHA `9e4b41fd7b4d0002b8c794a2fe7ec47aa44a4b4a`，Actions `42963501481` 成功；两个 Pages 的构建来源 SHA 一致。内置浏览器确认羊皮纸卡片底色透明，撕边外露出页面背景。

- **表现与复现：**设置、结果、报告与档案三块不规则羊皮纸外沿后面还露出规整黄色矩形，削弱了破边贴图的形状。
- **根因与证据：**`.lab-card` 的 `background` 简写同时设置了 `#ead19e` 底色和原版 `gng_hud_2_textbox_large.png`。PNG 有透明外沿，底色从透明像素露出，形成贴图外侧的规则矩形。这个颜色同时填充 PNG 的透明像素以及贴图尚未加载时的区域，因而在正常显示中也形成矩形；正常构图不需要这层纯色。
- **漏测点：**旧测试确认了原版贴图路径和尺寸，却没有断言卡片的 `background-color` 透明，因此未发现透明撕边下面仍铺有纯色。
- **修复与防回归：**`.lab-card` 继续绘制原版羊皮纸和投影，只移除纯色回退底色。`t41-lab-workbench.spec.ts` 对三张卡片同时断言贴图存在、底色透明，防止修图时误删贴图或重新铺回矩形。
- **验证：**`t41-lab-workbench.spec.ts` 3项通过；`CI=1 pnpm run test:ci` 通过类型检查、409项单测、构建及120项 E2E。内置浏览器本地截图确认撕边外露出页面底色，黄色矩形消失。

## 游戏内 Help 与 Options 羊皮纸外露黄色方底

**状态：**已修复并通过定向检查；不单独公开发布。

- **表现与复现：**主菜单 Help 与 Options 打开后，撕边羊皮纸贴图外仍有一块规则的浅黄色矩形；本地截图显示页面背景与矩形边缘清楚可辨。
- **根因与证据：**`.campaign-help-card` 与 `.campaign-options-card` 的 `background` 简写把 `#e9cb94` 底色铺在原版 `gng_hud_2_textbox_large.png` 下方。与实验室卡片相同，贴图透明像素露出了矩形底色。对照 CSS 可见实验室 `.lab-card` 已仅绘制贴图，游戏内两个面板尚未采用该规则。
- **漏测点：**`t40-frame-controls.spec.ts` 检查了 Help/Options 的贴图、框内几何和内容溢出，但没有断言 `background-color` 透明；先前截图复核也未覆盖这两个面板的撕边外沿。
- **修复与防回归：**仅移除两张羊皮纸卡片的纯色回退填充，保留原版贴图与布局；扩展 `t40`，在桌面、竖屏和横屏分别确认贴图存在、底色透明、文字/按钮不溢出。`t40` 和 `t30` 共10项定向 E2E 通过。静音窗口模式下检查桌面及手机竖屏截图，撕边透明区直接显示场景背景，黄色矩形消失；未进入全屏或播放音效。此次没有运行完整 `test:ci`，完整检查留在后续产品批次收尾。
- **遗留覆盖：**网页实验室的“导入档案”确认框 `.lab-profile-confirmation` 仍单独设置了 `#ead19e` 回退底色。移除后继续显示原版羊皮纸贴图，让透明撕边露出页面遮罩；`t38-data-archives.spec.ts` 现在断言确认框底色透明，避免修复只覆盖主卡片和游戏内面板。

## 实验室布局偏离设计稿

**状态：已发布并通过线上验收。**桌面、平板、手机布局均已实现；定向检查、完整本地检查和内置浏览器公开页面检查通过。

- **表现与复现：**公开版本原有双栏；实验设置和比较结果在左侧，Profile/实验档案与回放在右侧，外框为深棕渐变。设计样稿则分为实验设置、结果、报告/档案三栏，主面采用浅羊皮纸。
- **根因与证据：**`game-page-template.ts` 曾将比较输入、已保存比较及结果表都放在一个实验面板里；`.lab-layout` 使用双栏，`.lab-workbench` 使用深棕渐变和强阴影。旧 `t41-lab-workbench.spec.ts` 断言两张卡片，只检查双栏位置，没有检查信息分组或三栏布局。
- **修复结果：**比较输入留在“实验设置”；空状态、真实报告和保存动作放进“比较结果”；已保存报告与 Profile/实验档案、战局回放放进“报告与档案”。速度控制作为结果栏内的独立浅纸面板，明确其只影响交互式运行。整体改为浅羊皮纸主面、原版木牌标题和木按钮。1280px 桌面三栏，900px 平板两栏且档案区跨栏，390px 手机单列；桌面报告表完整显示，手机只在表格自身滚动。`t41`、`t29`、`t38` 共11项定向 E2E 通过，覆盖断点几何、材质、标题留白、溢出、桌面与手机表格、站点导航、宠物层级、中英文、空状态、运行/保存/重新打开和档案行为。内置浏览器检查桌面与平板，并实际运行、保存、重新打开一次比较；全页桌面和手机截图确认视觉分组及单列堆叠。批次完整 `pnpm run test:ci` 通过：类型检查、409项单测、生产构建及120项 Playwright E2E 均通过；构建提示主 JS chunk 约655KB、超过500KB预算，但不影响构建或测试。截图保留在临时目录，不纳入产品资源。
- **发布验收：**squash 提交 `743bb0e` 已发布；GitHub Actions `42739278594` 最终成功。GitHub Pages 与 Cloudflare Pages 的根路径 `build-info.json` 均匹配来源 SHA `743bb0e3`。内置浏览器打开发布版，确认实验设置、比较结果、报告与档案的分组及西部风格样式已上线。
- **避免重复：**视觉改版必须核对截图和实际断点几何，不能以“卡片存在”判定布局通过。桌面报告表需完整呈现；窄屏横滚只限于表格自身，不能扩大页面。复用共享 `#game/#lab` 导航，不改站点外壳。

## 旧实验库中的固定基线方案冲突

**状态：待单独复核；不在当前视觉批次修复。**

- **表现与复现：**含既有实验数据的本地浏览器会话运行一次配对比较后显示通用失败；干净 IndexedDB origin 上用同一源码和参数完成比较、保存及重新打开。
- **证据与根因判断：**`main.ts` 每次保存固定 `cow-gulch-original@1`；`experiments/index.ts` 对同一方案 `(id, version)` 的不同 `preparedSetup.digest` 抛出不可变冲突。旧浏览器中的基线记录尚未直接读取；冲突是目前最符合代码和对照运行的推断，不是已确认的数据库事实。
- **后续要求：**用旧档案 fixture 确认冲突，改进提示或为内容/规则变化提供不覆盖旧记录的新版本；保留并继续读取原始方案、报告和导入数据。不得为视觉验收清空用户实验库；干净 origin 仅作为隔离的视觉/新用户检查环境。

## Options 应随内容大小布局，按钮字号不能被菜单默认值覆盖

**状态：已改为紧凑居中面板；桌面、手机竖屏/横屏和中英文定向检查通过。**

- **表现与复现：**Options 页面只有 Help 和 Sound 两项，却使用接近全屏的大羊皮纸框，控件挤在上方的小区域，下面留出大块空白；木按钮文字也比原版菜单显得过小。
- **根因与证据：**网页 `.campaign-options-card` 固定占父层70%高度，而 `renderOptionsPanelView()` 只放标题、Help 和 Sound。APK `dialog_options.xml` 将实际选项放入 AlertDialog 的竖向内容列，并未使用全屏固定高度的面板。另有 `.game-menu-panel button { font: inherit }`，其选择器优先级高于单独的 `.campaign-options-help/.campaign-options-sound`；只给后两者写 `font-size` 不会生效，旧测试只检查背景和控件可见，未检测实际字号、按钮间距或面板比例。
- **漏测点：**背景图正确、按钮存在不代表控件布局合适；测试没有验证面板相对游戏框的尺寸，也没测标题、按钮的垂直顺序和控件宽度。
- **修复与防回归：**面板改为内容驱动、居中显示的羊皮纸卡片，设置合理最大宽度与最小高度；两项木按钮统一宽度并分开排列。通过更高优先级的菜单选择器设定按钮 serif 字体、字号和粗体，避免被 `font: inherit` 复位。`t29-campaign-menu.spec.ts` 检查桌面几何、字形和层级；`t40-frame-controls.spec.ts` 检查桌面及手机竖屏/横屏下边界、溢出和中英文排列。
- **避免重复：**菜单面板新增控件时先按实际内容量决定卡片宽高；定向测试要检查 computed font、边界和纵向间距。遇到样式规则“不生效”，检查 `font` 等 shorthand 和选择器优先级，不要继续叠加相同或更低优先级的声明。

## UI 图层与全屏弹窗

**状态：已关闭。**弹窗图层、按钮样式、同语言布局和手机输入已通过本地完整检查，修复通过[手机工具栏部署检查](https://github.com/wishflow/wishflow-tools/actions/runs/42459138730)与[补充发布检查](https://github.com/wishflow/wishflow-tools/actions/runs/42460770199)。最终部署提交为 `50289f2`；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配。内置浏览器窗口模式、静音实测确认战役退出弹窗可打开；浏览器拒绝 Fullscreen API 后提示不遮挡标题/正文，Keep playing 可关闭弹窗并恢复战斗。该宿主拒绝真实全屏请求，因此本轮未验证成功进入/退出原生全屏；自动化 mock 只验证应用状态和布局逻辑。

> 本节是已发布 CSS/可见性修补的历史记录，不是当前 UI 架构约束。其“将全屏控件移入 `showModal()`”做法已被后续重构计划废止；当前要求见下文“原版 UI 流程与状态管理”。

### 当前证据

- `.game-frame:has(dialog[open])` 原先会隐藏全屏按钮和状态提示；这是弹窗期间无法使用页面全屏按钮的直接原因。Gambler E2E 还把该错误行为断言为正确，已改成断言按钮仍可见。
- 全屏开关改为独立控制组并置于最高游戏层；普通 `.show()` 弹窗与帮助、遮罩、舞台的层级经 `elementFromPoint()` 和真实点击核验。遮罩位于弹窗下方且仍拦截画布。
- 战役退出由 `showModal()` 打开。原生模态框会令框外内容 inert，因此只提高 `z-index` 无效。打开前将全屏控件组移入模态框，`close` 事件后移回游戏框；`t30-fullscreen.spec.ts` 已验证切换前后弹窗可交互、全屏控件位置可还原。
- 战役退出框原先没有在舞台内定位；全屏定向测试测到其按钮超出视口。现已居中并限制最大高度。
- 实际结算的“Campaign map”动作原先保留结算面板，导致菜单仍被结算层盖住。现在进入菜单会隐藏已结算面板；定向 E2E 已真实跑完单波结算、进入全屏检查按钮命中、退出全屏并点击返回菜单。
- 图层与全屏定向检查：`t30-fullscreen.spec.ts`、`t34-tech-town-gambler.spec.ts`、`t37-tech-town-formal.spec.ts`、`t04.spec.ts`、`t20-campaign-progress.spec.ts` 共 19 项通过。自动化使用 Fullscreen API mock 验证状态流转；公开版本在内置浏览器中的原生全屏请求被宿主拒绝，故本轮未验证成功进入/退出原生全屏。
- 定向验证：图层切片的 19 个 E2E 通过；按钮/布局切片的 `t09-pause.spec.ts`、`t30-fullscreen.spec.ts`、`t34-tech-town-gambler.spec.ts` 共 13 个 E2E 通过。远端 `t22-playfield-focus.spec.ts` 两次失败后，测试在失败时输出坐标和计算样式。Actions `42458377072` 的 Linux Chrome 实测：390px 竖屏下操作区从 x=29.1875 到 284.8125（宽 255.625px），Pause、Campaign 和 Clear selection 的右边界分别为 122.1875、189.75、286.5；Clear selection 溢出 1.6875px。计算样式内边距每侧 1.6px。将三颗主按钮的每侧内边距从 `0.1rem` 降至 `0.05rem`，预计总计收窄 4.8px；手机标题覆盖层与工具栏位置保持不变。修复后 `t22` 与 `t09-pause` 共 7 项定向检查、类型检查和完整 `pnpm run test:ci`（399 单测、103 E2E、生产构建）通过。将标题移到正常布局流的实验导致 9 项手机触屏地图用例失败，已撤回；回退相关 `t01`、`t06`、`t08`、`t10`、`t22`、`t25` 共 17 项 E2E 通过。Linux CI 实测工具栏越界修复后，后续 `pnpm run test:ci`（399 单测、104 E2E、生产构建）与两次发布 Actions 均通过，最终部署来源 SHA 与公开 `build-info.json` 一致。保留失败时的几何日志，方便未来发现类似平台差异。Vite 主 JS chunk 超过 500KB 的警告不影响构建或测试。

## 普通弹窗样式与工具栏布局

- 战役退出框按钮原先未命中 `.recruit-confirmation button` 选择器，显示浏览器默认外观。现在战役退出、招募/地图雇佣/升级/Gambler 确认框和结算动作共用按钮底色、边框、字体、悬停、禁用及键盘焦点规则；波次羊皮纸和战役菜单的专属表现未改。`t30-fullscreen.spec.ts` 对这些按钮的计算样式做等值比较，并检查焦点和禁用状态。
- Pause 与 Resume 曾按各自文本决定宽度，状态切换会影响工具栏布局。`syncPauseButtonWidth()` 按当前语言用 Canvas 测量两种标签，叠加当前按钮字体、内边距和边框后固定宽度；容器缩放或语言切换时重新计算。`t09-pause.spec.ts` 在桌面/手机宽度及中英文下比较 Pause 与 Campaign 的位置，并检查按钮都在游戏框内且互不遮挡。
- 本地内置浏览器截图发现全屏图标同时来自按钮文本 `⛶` 和 `.game-frame-fullscreen-toggle::before`，形成重复小图标；移除伪元素，保留按钮文本，并在 `t30-fullscreen.spec.ts` 断言伪元素不再绘制。此前的自动化只看按钮可见性和 accessible name，没检查图标是否重复，今后完成控件视觉切片时需查看真实浏览器截图。
- 一次布局 E2E 失败不是产品位移：切换语言时点击页眉语言按钮把页面滚到顶部，下一次 Playwright 点击又把画布滚回视口，导致测试把不同页面滚动位置下的屏幕 `y` 坐标当成控件跳动。修正为每次测量前先 `scrollIntoViewIfNeeded()`；布局比较需先归一化页面滚动，再比较边界。
- Pause/Resume 固定同宽后，GitHub Actions 的手机竖屏检查只差 1.6875px，但“按钮可见”和“无遮挡”断言无法指出具体哪颗按钮越界。失败时记录所有主按钮边界、操作区边界、字体和内边距，避免猜测。缩小三个主按钮每侧内边距 `0.05rem` 后回收 4.8px，并保持工具栏原位置；移动标题的较大改版会让覆盖区挡住触屏地图，完整回归发现后已撤回。后续工具栏变更要同时验证精确边界、触屏地图输入与 CI/Linux 390px 竖屏。
- 内置浏览器在公开版本 `2cf6bd8` 的弹窗复核中，战役退出框内点击全屏后，IAB 宿主拒绝 Fullscreen API 并显示提示；截图显示提示盖住弹窗标题。根因是失败提示在顶部控件组下方纵向占位。修复在提示出现时将控件组改为顶部横向排列，图标在右、提示在左；`t30-fullscreen.spec.ts` 检查提示与标题矩形不相交，并实际点击 Keep playing。修复发布到 `50289f2` 后在内置浏览器复验：标题和正文未被覆盖，Keep playing 关闭弹窗后战斗控件恢复可用。该宿主拒绝原生全屏，因此自动化 Fullscreen mock 和浏览器拒绝场景都不证明真实浏览器成功进入全屏。

### 防回归要求

- 不以“元素可见”代替交互验证：对关键控件检查命中目标，并实际点击确认按钮产生预期结果；当前定向 E2E 已覆盖此路径。
- 全屏控制不得因游戏弹窗打开而被隐藏、搬动或被遮罩挡住；全屏状态变化必须保留当前覆盖层及模拟状态。游戏内面板使用受 `.game-frame` 约束的 OverlayHost，不使用会让整页进入 top layer 的 `showModal()`。
- 帮助框、遮罩、弹窗和全屏控制应遵循 `.game-frame` 的层级变量。遮罩拦截底层但不能盖住弹窗。
- 同一语言中的状态文案变化不应导致按钮或相邻控件跳动；语言变化可以重排，但不得造成溢出或遮挡。
- 同时覆盖窗口模式与真实全屏。用内置浏览器验收时，先确认页面构建来源 SHA 与待测代码一致。

## 原版 UI 流程与状态管理

**状态：已集成发布并完成线上流程验收。**`CI=1 pnpm run test:ci` 通过 409 项单测、生产构建与 117 项 Playwright E2E；GitHub Actions `42597743682` 成功。发布 SHA `505643c5173bee21104cb2caac2192235fe02152` 已部署到 GitHub Pages 与 Cloudflare Pages，两处根路径 `build-info.json` 均匹配。内置浏览器静音、窗口模式下验证菜单、选关、暂停、Options/Help 返回和确认取消；原生 Fullscreen API 仍被宿主拒绝，未将模拟测试当作真实全屏证据。原始脏工作树未被改写。

### 已证实的 APK 流程

- `MainMenuScreenActivity.onStartButtonClick` 进入地图选择；`onHelpButtonClick` 进入独立 Help 页；`onOptionsButtonClick` 调用 `GameActivity.showOptionsDialog`；声音入口切换档案中的声音设置。
- `GameScreenActivity.onPauseButtonClick` 调用 `displayDialog(4)`；战斗中的 Android Back 键在没有活动对话框时也打开同一个暂停面板。
- `GameScreenActivity.onPrepareDialog(4)` 为暂停面板注册 Continue、Restart、Options、Close、Sound。Options 调用 `showOptionsDialog()`，未关闭暂停面板；Restart/Close 分别打开确认 ID 6/5。取消确认仅关闭确认面板，父暂停面板仍保留。
- `GameActivity.showOptionsDialog` 创建 `dialog_options`，声音/震动设置在该面板中；平台隐私入口属于网页移除的平台/广告相关内容。HelpScreenActivity 的左右按钮翻页，边界按钮返回主菜单。
- `GameScreenActivity.displayDialog` 会停止游戏线程。游戏内招募、升级等面板必须按具体调用路径确认何时暂停、何时恢复；不将所有 UI 状态推断为“游戏继续运行”。以上为 APK 静态 DEX/JADX 观察，不代表 Android 实机运行记录。

### 本轮结构修正

- `GameUiController` 是页面路由和面板返回栈的唯一所有者；纯 TypeScript 事件处理页面、面板及 Help 页码。模拟状态仍只由 `GameSession` 持有，全屏状态仍由 `FrameChromeController` 根据浏览器事件持有。
- 页面模板、Options/Help 内容、FrameChrome 和 OverlayHost 分置在 `src/ui/game-page-template.ts`、`menu-panels.ts`、`frame-chrome.ts` 与 `overlay-host.ts`。`main.ts` 仍负责应用副作用和业务事件接线，不再从面板 `hidden` 状态重建页面路由。
- OverlayHost 只接收控制器生成的显示列表，不保存面板导航栈。暂停板→Options 保留不可操作的暂停板底层；Help 显示为单独页面，控制器保留它的调用路径，返回后恢复 Options/暂停板。档案替换确认显示在 Options 内的游戏框中。
- 过去 Options 关闭暂停板并用菜单页替代原生选项面板，造成返回路径断裂；现在暂停板仍暂停并留在 Options 下方。`t09-pause.spec.ts`、`t29-campaign-menu.spec.ts`、`t23-campaign-wave-intros.spec.ts` 和 `t40-frame-controls.spec.ts` 从真实菜单/HUD 入口核验该路径。

### 重构约束与防回归

- 单一 `GameUiController` 持有页面、唯一活动面板和显式返回目标；GameSession 独占模拟状态；FullscreenController 仅响应浏览器 `fullscreenchange`。OverlayHost 只负责遮罩、挂载、焦点和输入阻断，不保存第二份面板栈。
- 暂停板 Options 必须叠在暂停板上方；Help 从 Options 进入并逐级返回 Options、暂停板或菜单。确认取消返回父面板且保持会话暂停；全屏切换不改变 UI 或模拟状态。
- 所有面板限制在固定 16:9 `.game-frame`，不调用 `showModal()`、不搬动 FrameChrome、不允许遮罩覆盖全页。只允许一个面板可交互，叠层中的父面板不可点击。
- 原版木牌、羊皮纸、确认按钮和特殊面板保留各自美术；新增 Free Play、网页操作说明、倍速和档案也使用原版风格与返回关系。常规战斗无通用控制条；桌面缩放辅助控件位于地图边缘，触屏保留手势。
- 关键测试必须从真实入口操作，检查状态、返回目标、底层阻断与 `elementFromPoint()` 命中；仅见到 DOM 或仅使用调试路线不算流程验收。浏览器默认窗口模式、静音；全屏仅用于全屏专项验收。

### Help/Options 素材与手机布局

- **表现与复现：**Help 从 Options 打开后，暂停/选项两个父面板仍同时显示，造成多层边框和重复返回箭头；Options 的说明文字横跨高分牌资源右侧的头像装饰区。手机竖屏下，常驻档案和实验内容让 Options 高度超出羊皮纸。
- **根因与证据：**高分牌 `gng_highscore_0_box.png` 是左侧文字区加右侧肖像框，不适合承载横跨整卡的选项文案；Options 和 Help 被当作可见叠层，未按“保持返回状态、替换当前页面”的 Help 语义渲染。Playwright 390×844 初测测得 Options 内容 `scrollHeight=353`、面板 `clientHeight=180`；将档案折叠后仍有 217/180px 溢出。截图与几何结果均在本地隔离工作树检查。
- **修复与防回归：**Options/Help 改用原版 `gng_hud_2_textbox_large.png` 羊皮纸；Help 打开时只绘制 Help，返回时恢复 Options，Options 的调用暂停板继续留在 Options 下面。实验与档案收在可展开区，手机窄屏压紧 Options 间距；Summary、档案操作和实验按钮沿用原版木按钮图。`t29-campaign-menu.spec.ts` 检查资源背景，`t40-frame-controls.spec.ts` 检查桌面、390×844 竖屏、844×390 横屏的英文/中文面板边界、内部溢出及 Help/Options 返回状态。
- **漏测点：**此前只核对 Help 与 Options 各自能打开、并断言按钮可见；没有检查它们同时出现时的视觉重复，也没有把整张选项卡的文本边界与底图留白区域对照。手机测试只检查外框，没有测内部滚动高度。
- **避免重复：**为带肖像分区的原版资源先看实图再选择用途；嵌套页面测试必须同时断言“调用面板是否应该继续可见”与返回后恢复。移动版内容容器需比较 `scrollHeight/clientHeight`，不能只比较整个页面的 `scrollWidth`。

### 已发布版本的线上流程复验

- **验证范围：**打开带 `release=505643c` 的 GitHub Pages 公开页面，并以根路径 `build-info.json` 核对来源 SHA。内置浏览器保持静音和窗口模式；从主菜单进入 Options、Help 并逐级返回，再从 Start 进入 New Mexico、Cow Gulch、Easy 和 Pedro 开场对白。关闭对白后打开 HUD 暂停板，检查木按钮、Options→Help→Options→暂停板的返回链；关闭确认选择 No 后仍返回暂停板，Continue 恢复战斗。
- **观察结果：**选项、帮助、暂停、确认框均限制在游戏框；暂停及确认期间 FrameChrome 全屏按钮仍显示。上述代表性路径与公开构建一致，没有手动完成关卡或写入胜利结算。
- **全屏边界：**在暂停板仍打开时点击 FrameChrome，宿主拒绝 Fullscreen API 并提示改用浏览器自己的全屏控件；面板与模拟状态未被关闭。故本次公开版本没有真实浏览器全屏进出证据；响应布局和应用状态由桌面、390×844 竖屏、844×390 横屏 E2E 覆盖。

### 本地浏览器来源核对

- **表现与复现：**多个 Vite 服务同时监听默认端口时，内置浏览器可能连到旧工作树，即使测试代码来自新的隔离工作树。
- **根因与证据：**本地已有服务占用了 5175；本轮首次检查发现被服务的源码目录与当前实现工作树不同。隔离实现改用严格端口 `5189`，并检查内置浏览器地址为 `http://localhost:5189/`，再查看实际菜单、Options 与 Help 截图。
- **本轮补充：**`5189` 再次被占用，内置浏览器页面缺少当前工作台且仍显示旧全屏符号，说明不能只凭端口号或页面标题判断来源。未终止未知服务；改用严格端口 `5191`，并在内置浏览器确认 `#lab`、实验入口和新按钮资源均来自当前隔离工作树。
- **map10 补充：**Playwright 默认端口 `4173` 已服务于另一工作树，页面仍只显示 7 个关卡；测试命令没有检查运行实例来源时，造成旧版误报。另在 `pnpm run test:e2e -- <files>` 中，分隔符让 Playwright 忽略文件筛选并启动整套用例；输出显示 133 项，超出预期的 5 项。改为 `PLAYWRIGHT_PORT=4174 pnpm run test:e2e <files> --workers=1` 后，使用当前工作树启动严格端口服务，map09、map10、Free Play 5 项 E2E 通过。
- **防回归：**开启本地浏览器验收前先检查监听端口对应的服务来源；测试/浏览器端口使用专用端口且启用 strict 模式，确认标签 URL 对应本次工作树后再评价 UI。传 Playwright 文件路径时不要在 pnpm 脚本与筛选参数间添加 `--`，并确认 `Running N tests` 与预期筛选数一致。旧标签和旧 `dist` 不能作为新源码的证据。

### Options 遮罩与菜单声音测试顺序

- **表现与复现：**完整 E2E 中，自由模式用例打开 Options 后直接点击其下方主菜单的 Sound 按钮，Playwright 等待点击超时。
- **根因与证据：**这是过时的测试操作顺序，不是声音按钮失效。Options 属于游戏框内活动面板，OverlayHost 的遮罩会阻断底层主菜单；测试失败快照显示 Options 仍为活动界面、焦点在其返回按钮。暂停/对话面板期间也应遵守同一输入阻断规则。
- **漏测点：**旧测试只按“按钮仍可定位/可见”推断可点击，没有把活动面板的遮罩命中规则纳入前置流程。
- **修复与防回归：**更新自由模式用例，先从 Options 返回主菜单，再切换 Sound，随后重新打开 Options 检查保存状态；主菜单导航的重复 `campaign-menu-back` 测试标识按当前活动容器限定。面板打开时的底层控件必须通过真实点击命中测试，不能从遮罩下操作。

### 倍速入口迁移后的长关卡用例

- **表现与复现：**完整 E2E 的 Apache Valley 与 Fort Kaboom 长关卡用例在战斗中查找 `Simulation speed` 滑块，超时后仍停留在对白/战斗状态。
- **根因与证据：**UI 重构已按产品约束把倍速收进 Options；旧测试仍依赖已移除的常驻工具栏。定向重跑确认用例本身的核心战斗流程和规则可通过。
- **漏测点：**只更新了菜单与工具栏可见性断言，没有迁移依赖旧倍速位置的正式长流程用例。
- **修复与防回归：**新增 E2E 辅助流程：从 HUD 打开暂停板，进入 Options 设置倍速，返回仍暂停的暂停板，再继续模拟。Apache Valley、Fort Kaboom 两条完整关卡用例均按此路径并行外串行通过；后续设置入口迁移时搜索并更新所有调用点。

### 内置浏览器的原生全屏能力

- **表现与复现：**本地 `http://localhost:5189/` 的 Options 打开时，点击固定 FrameChrome 全屏按钮没有进入浏览器全屏。
- **根因与证据：**页面显示“Could not enter fullscreen. Use your browser’s fullscreen control instead.”；只读页面检查确认 `document.fullscreenElement` 仍为空，而 Options 面板保持可见。该结果表明当前内置浏览器宿主拒绝 Fullscreen API 请求，不构成应用已成功进入全屏的证据。
- **漏测点：**自动化 Fullscreen mock 可以验证应用响应和画面几何，但不能证明宿主允许真实浏览器全屏。
- **修复与防回归：**不改变失败恢复行为；记录真实全屏实测受宿主限制。自动化继续验证状态变化和面板保留；若之后宿主提供全屏能力，再单独执行窗口↔全屏转换实测。当前不得把 mock 描述为真实全屏验证。

### 升级确认说明在手机画框内被截断

- **状态：已关闭。**`t08.spec.ts` 通过手机视口检查升级详情的 `scrollHeight <= clientHeight`，并执行按钮命中。
- **表现与复现：**390px 竖屏打开升级确认，详情文本需要 50px 高，flex 布局只分配 46px，末尾内容出现内部滚动/裁切。
- **根因与证据：**`.game-original-confirmation` 的默认内容上下内缩量与底部 28% 按钮区在短画框内共同挤压详情段落。Playwright 读取到 `scrollHeight=50`、`clientHeight=46`，不是字体资源加载失败。
- **漏测点：**原用例只断言文字存在，没有检查可视文本是否完整。
- **修复与防回归：**仅扩大 `.upgrade-confirmation .game-confirmation-content` 的垂直区域，不改弹窗图像比例；手机 E2E 断言 `scrollHeight <= clientHeight`，并继续检查操作按钮命中。

### 普通战斗仍显示开发控制栏

- **状态：已关闭。**`t29-campaign-menu.spec.ts` 与 `t40-frame-controls.spec.ts` 从正式菜单/HUD 入口确认普通战斗无通用工具栏；倍速只从 Options 调整。
- **表现与复现：**从普通主菜单进入 Cow Gulch 并关闭开场对白后，游戏框底部仍出现 `Game controls` 折叠栏、`Clear selection`、测试用开波/招募入口和倍速滑条；这不是 APK 战斗 HUD。
- **根因与证据：**`showBattleScene()` 无条件执行 `gameToolbar.hidden = false`；该容器同时承载测试操作和网页倍速。内置浏览器在不带 `testBattle` 参数的正常战役流程中直接观察到该面板。此前计划误把移除 Pause/Resume、Campaign 和文字 Sound 当成整个控制栏已删除；`t29` 还断言普通战斗工具栏可见，错误固化了现状。
- **修复与防回归：**普通战斗移除通用开发工具栏，专用调试入口仍隔离；倍速移入 Options 并经暂停板调用。E2E 从正式菜单进入并断言无通用控制条。

### 手机地图缩放控件遮住 Canvas HUD 暂停图标

- **状态：已关闭。**`t40-frame-controls.spec.ts` 检查桌面缩放控件边界与命中、手机竖屏/横屏隐藏按钮并可用原版 HUD 暂停入口；`t10-camera.spec.ts` 覆盖触屏捏合缩放。
- **根因与证据：**Canvas HUD 和地图按固定1024×576逻辑画布缩小；网页缩放控件则按 CSS 像素维持近似固定尺寸。桌面左上角不与 HUD 暂停按钮重叠，但窄画框会让按钮变成地图上的大块覆盖；390px触屏竖屏中还会覆盖暂停图标。内置浏览器截图确认下移左下虽然避开 HUD，却会挡住地图路线。项目契约已明确桌面使用网页缩放按钮、触屏继续使用捏合缩放。
- **漏测点：**此前只检查控件是否在画框内，没有区分桌面与触屏入口，也没有验证固定 CSS 控件在缩小地图上遮挡可玩区域。桌面视口无法暴露控件与触屏 HUD 的冲突。
- **修复与防回归：**桌面按钮放在 `.game-stage` 边缘，在窄框/触屏设备隐藏；触屏继续捏合，桌面滚轮缩放保留。测试检查控件边界、命中目标、缩放动作及手机捏合，避免按钮压住地图或 HUD。

### 手机竖屏波次对白的角色遮住正文

- **状态：已关闭。**`t40-frame-controls.spec.ts` 在桌面、390×844 手机竖屏及 844×390 手机横屏检查对白角色与正文矩形不相交、内容及按钮完整位于游戏框内。
- **根因与证据：**基础对白用顶部居中立绘和下方文本；`@media (max-width: 600px)` 将立绘尺寸放大并把文本区上移，立绘仍盖在正文上。当前 `t40` 只检查对白面板在 `.game-frame` 内，没有检查角色与正文矩形是否相交。
- **修复与防回归：**窄屏 Pedro 立绘放入左侧槽位，正文从右侧开始。跨视口 E2E 计算立绘/文本边界，要求无交叠、无裁切且对白完整位于游戏框内。

## 关卡预览页的文字和按钮必须共用原版设计坐标系

**状态：已按 APK 的 480×320 设计框重排；中英文、桌面和窄屏几何定向检查通过。**

- **表现与复现：**进入关卡详情后，标题、地图说明、高分区、Play 和返回控件看起来各自向一边漂，宽度变化时彼此比例也不一致。
- **根因与证据：**APK `dialog_level_overview.xml` 的背景及全部子控件位于居中的 480×320 相对布局；其 dimens 文件给出标题 x=52/y=47、图像行 x=52/宽213/最小高75、说明 x=52/宽213/高111、高分区 x=314 或318/y=49、Play x=306/y=221、返回 x=23/y=275。网页此前只把背景图放在全屏舞台的伪卡片里，子元素却分别按 16:9 舞台百分比定位，未共享 480×320 原点和尺度；并额外放了一个舞台级左箭头，与 APK 卡内的返回按钮重复。APK 对话框主题使用系统 serif，TextView 沿用 Android 默认 TextView 外观，木按钮为粗体 serif、白字和阴影；网页之前按全舞台 cqw 单独估字号。
- **漏测点：**旧 E2E 检查了标题、地图缩略图、文案和按钮能否显示/点击，没有比较卡片内相对坐标、字体类别、不同语言或窄视口下的位置；因此各节点在不同父级下“各自可见”就误判为对齐。
- **修复与防回归：**把原图 3:2 比例作为单一卡片容器，按 APK dp 坐标归一化定位所有元素；设计字号随卡片缩放，保留系统 serif、黑色正文、居中标题和木按钮白色粗体阴影，不把某设备的 sp 像素值硬编码到所有尺寸。移除多余的舞台级返回箭头，只保留 APK 卡片内的 X 返回槽位。`t29-campaign-menu.spec.ts` 比较卡片宽高比与标题、图像行、说明、Play、返回、高分海报的归一化锚点，并覆盖英文/中文及1280×720/640×360。
- **避免重复：**复刻带固定坐标的原版界面时，把背景、文字、图像和按钮放入同一个设计坐标容器；测试其相对位置、字体类别、对齐和边界，而非只验 DOM 可见。测试中临时切换视口后，应恢复后续流程所需的视口，避免把布局测试中的尺寸状态带入战斗用例。

## 战役对白 E2E 的 fixture 选择与回放边界

- **表现与复现：**map05 正式关卡 E2E 进入战斗后，测试断言首波对白可见，却观察到对白已关闭。
- **根因与证据：**用例导入 `tests/e2e/auto-continue-fixtures.ts` 导出的 `test`。该 fixture 的 `MutationObserver` 会自动点击对白 Continue，目的是让普通战斗流程测试不被剧情提示阻塞；产品代码正确打开了对白，随后测试桩立即关闭它。
- **修复与防回归：**需要检查对白内容、头像、资源或关闭后状态的专项用例直接从 `@playwright/test` 导入 `test` 和 `expect`；不检查对白且需跨过提示的普通战斗用例继续使用 auto-continue fixture。失败后先检查测试 fixture 是否主动操作目标元素，再判断产品逻辑。
- **回放边界：**`GameSession.exportReplay()` 要求会话已经完成并形成正式结算。未完成的 map05 关卡不能直接导出回放；不要为验证内容注册或 profile 单位集合而完整模拟八波。需要覆盖 map05 回放往返时，另准备有明确来源的已结算 fixture，或单独安排经确认的完整模拟范围。
- **内容版本边界：**若测试为快速结算而把波次请求替换为零，源回放与重放端必须使用同一份零请求 fixture。不可用正式浏览器场景工厂重放该 fixture，即便 `contentVersion` 相同；该版本标识的是正式内容，fixture 修改后的波次仍会在首个状态校验点造成回放差异。生产解锁快照工厂应另行按版本验证。

## 增加正式关卡后同步阶段快照与进度摘要

- **状态：map10 快照问题已关闭；M14 复现并正在修正。**map05/map06 时曾修正摘要分母和阶段列表；新增 map10 后，首轮完整单测又发现四处正式 stage 快照过期，Progress 另有结算后的状态序列少列一个 locked 关卡。M14 首轮完整 CI 再次发现两处新增关卡快照未同步；已修正并通过25项定向测试，随后完整 CI 通过614项单测和141项 E2E。
- **表现与复现：**map10 登记后，`tests/apache-valley.test.ts`、`tests/content.test.ts`、`tests/fort-kaboom-formal.test.ts` 和 `tests/progress.test.ts` 的精确阶段列表仍停在 map09。初次更新四处列表后，Progress 的 post-settlement 状态数组仍比实际 stages 少一项。
- **根因与证据：**摘要分母取自 `officialCampaignStages.length`；正式阶段关系和 Progress 状态测试还有独立硬编码数组。新增正式 stage 后，这些快照需要同步；关卡选择与 Progress 本身按新目录正确工作，没有修改其运行逻辑。
- **修复与防回归：**map10 时更新四个测试文件中的五处期望，补入 level10 和其 map09 前置条件；Progress 初态与结算后均列出 level10 的 locked 状态。相关定向测试与类型检查通过，后续批次完整检查通过。M14 新增关卡后，完整单测重新暴露两处旧快照遗漏（见下项）。
- **漏测点：**此前只搜索并修改 `stages complete` 和 `campaign-progress-summary`，没有一并搜索直接比较 `officialCampaignStages`、`globalLevel`、前置 ID 以及结算后完整状态数组的快照。
- **M14 复现：**新增 level14 后，首轮完整单测发现 `tests/apache-valley.test.ts` 的正式关卡关系数组遗漏 M14，`tests/progress.test.ts` 的初始阶段列表和结算后状态数组也各少一个 locked stage。目录和 Progress 运行结果正确，修正的是这三处旧测试快照；Apache Valley 与 Progress 共25项定向测试通过；随后完整 CI 通过614项单测、生产构建和141项 E2E。
- **修复与防回归：**map05 的 E2E 分母、map06 的 Apache/Fort stage 快照和 map10 相关五处期望现均同步。以后新增或重排关卡时，搜索 `officialCampaignStages`、`globalLevel`、`requiresCompletedScenarioIds`、`stages complete` 和 `campaign-progress-summary`，检查所有静态快照、结算后状态数组及选择状态；不要为了让旧断言通过而改动正确的 Progress 逻辑。
- **M17 复现：**正式目录增加 Dead Rocks 后，首轮 `test:ci` 的单测阶段又发现 Apache Valley 前置关系、Cow Gulch 完整目录快照、Fort Kaboom 阶段目录和 Progress 初态/结算后状态四处仍停在第16关。失败均为显式期望遗漏第17关及其 `campaign-mississippi-16` 前置，Progress 实际状态正确。
- **M17 修复与验证：**四处测试快照现补入 level17；Progress 在初始和既有关卡结算后均把 level17 列为 locked。最终 `CI=1 PLAYWRIGHT_PORT=43027 pnpm run test:ci` 通过类型检查、661项单测、生产构建和147项 E2E。新增正式关卡时，除逐关测试外还要审查这些跨关卡目录和进度快照。

## 战役与自由模式的关卡说明按存档语义区分

- **表现与复现：**map06 可同时从正式战役和 Free Play 进入；若两种模式都显示“胜利会记录战役完成与最高分”，Free Play 的提示就会误导玩家。
- **根因与证据：**`sceneCaption` 过去只按 `scenarioId` 选文案。正式与自由会话共用 `campaign-new-mexico-06`，无法从关卡 ID 判断是否会写正式 Progress。
- **漏测点：**既有首波 E2E 验证标题、难度和开局数值，却没有核对 Free Play 场景说明是否符合存档隔离规则。
- **修复与防回归：**scene caption 按会话 `mode` 生成：Formal 说明正式结算；Free Play 明确说明不会改战役进度或最高分。`t43-murdock-mountains-formal.spec.ts` 对 Free Play caption 加断言，并比较进入前后 Profile。以后关卡可在多种模式启动时，说明文案应依据 session mode，而非仅凭 scenario ID。

## 本地完整 E2E 使用 CI worker 数

- **表现与复现：**本地默认 5-worker `test:ci` 中，t08 的地图选择、t20 的页面重载状态以及 t22 的模拟波次重载检查出现超时或模拟推进到下一波；相同三项在 `CI=1 --workers=1` 下全部通过。首次 5-worker 完整运行仅发现正式关卡计数断言问题，第二次才在高并发时复现上述时序问题。
- **根因判断（有复现证据，机制仍属推断）：**这些测试依赖实时游戏循环和页面/画布交互；本地多个浏览器 worker 同时运行时会争用进程资源，扩大可观察时序窗口。单 worker 重跑通过，未发现同样的产品状态错误。
- **修复与防回归：**产品逻辑未改。完整本地验收设置 `CI=1 pnpm run test:ci`，Playwright 配置会与 CI 一样使用一个 worker；若单 worker仍失败，再按具体页面状态调查，不把并行超时直接归因于游戏代码。
- **定向 spec 命令：**尝试 `pnpm run test:e2e -- tests/e2e/t73-dakota-04-integration.spec.ts` 时，命令实际启动了全量192项 E2E；未等批次收尾就停止了该进程。它不是测试失败或产品回归。定向执行使用 `pnpm exec playwright test tests/e2e/t73-dakota-04-integration.spec.ts`，实测只运行该文件的2项并通过。以后需要传单个 spec 时先确认 Playwright 报告的 `Running N tests` 与预期一致；全量批次仍用 `CI=1 pnpm run test:ci`。

## 波次语音重试 E2E 不应依赖旧角色名

- **表现与复现：**map10 批次完整 E2E 中，132 项通过，波次对白语音重试一项因找不到 `Retry Pedro’s voice` 失败；产品按钮已使用统一的“Retry this voice”文案。
- **根因与漏测：**运行时根据语言设置更新可访问名称，模板仍留着旧默认文案，测试又把角色名写死。测试没有以当前用户可见名称或稳定语义定位控件。
- **修复与防回归：**模板默认值与通用按钮文案统一，E2E 按当前可访问名称查找；失败项定向重跑通过。后续调整本地化控件文案时，同步检查模板 fallback、运行时可访问名称和用例定位，不把过期角色名断言当成产品回归。

## Free Play 关卡说明挤入高分栏

**状态：已修复。**定向菜单 E2E 8/8 通过；桌面内置浏览器已检查英文和中文，手机窄屏由视口 E2E 检查。

- **表现与复现：**桌面窗口模式进入 Free Play → New Mexico → Billy Hills 关卡预览时，提示“Free play does not change the saved campaign score or progress.” 被排进右侧狭窄的高分区域，英文句子逐词窄行换行，视觉上难以阅读。
- **证据与根因：**本地内置浏览器截图确认异常；`.campaign-overview-no-score` 复用了高分栏槽位，原版的短“无最高分”文案与 Free Play 说明长度不同，旧测试只检查文字存在，没有检查宽度和边界。
- **漏测点：**`t29-campaign-menu.spec.ts` 原先没有检查 Free Play 提示的实际宽度、换行数、与介绍/按钮的重叠或窄屏边界。
- **修复：**将 Free Play 提示改成独立的标签与说明两行；英文精简为“No campaign progress or score is saved.”，中文对应“不记录战役进度或分数”。保留 480×320 卡片和正式模式 Wanted/高分区域，通过更宽的 Free Play 专属栏位承载说明，不缩小字号。扩展 `t29-campaign-menu.spec.ts`，覆盖桌面 1280×720、较小横屏 640×360、手机竖屏 390×844 的中英文状态，并检查卡片边界、栏宽、溢出、重叠及 Play/返回入口。定向 E2E 8/8 与类型检查通过；内置浏览器窗口模式、静音检查桌面中英文；最近批次的 213 项单 worker E2E 全部通过。
- **避免重复：**正式战役“尚无最高分”和 Free Play“结果不写入战役”语义不同，分开布局和文案；桌面截图不能代替窄视口检查，E2E 也不能代替实际桌面字体与贴图观察。

## Playwright 并发失败须按项目标准复核

- **表现与复现：**本批五 worker 首次跑完整 E2E 时，213 项中 211 项通过；两项失败分别是倍速用例耗时 11.919 秒、超过 10 秒断言，以及 frame controls 用例在 30 秒时等待关闭已关闭页面的 context。之后按项目约定以 `CI=1` 单 worker 重跑，213 项全部通过。
- **证据边界：**单 worker 没有复现这两项失败，支持“并发/调度可能造成时间波动”的判断，但没有 worker 级 trace 证明首次失败的唯一根因；不能删除或放宽产品断言来掩盖失败，也不能仅凭后续通过宣称根因已确定。单 worker 复跑因 4173 被占用及沙箱拒绝绑定，改用 `PLAYWRIGHT_PORT=4174` 完成。
- **防回归：**本应用完整 E2E 使用 `CI=1` 单 worker 作为验收基线。若必须调查并发失败，保留首次失败上下文，并在相同代码上用单 worker、并发方式分别复现；报告失败数、错误信息和复现情况。

## 实验工作台与游戏内设置归属

**状态：已部署，后续修复批次已关闭窄屏遮挡问题。**首版发布 SHA `d92c7fc9d1754420767bc7b4e4003e15365aa2cb`；GitHub Actions `42616244687` 的应用测试、共享检查和 GitHub/Cloudflare Pages 部署均成功，两个 `build-info.json` 均匹配。实现提交 `bef0ced`、测试补强 `3652185` 和坐标 helper 修正 `c5999e4` 已包含在首版部署中。

- **表现与复现：**主菜单 Options 曾包含 Profile 档案、实验数据、比较报告及倍速；回放入口在其他页面区域；全屏按钮则显示通用字符，均与原版游戏选项和按钮美术混杂。内置浏览器在 390px 窄屏还显示工作台标题压在羊皮纸的烧边装饰上。
- **根因与证据：**旧 `renderOptionsPanelView()` 输出网页实验工具，`renderOptionsPanel()` 动态搬动实验面板，回放及倍速还有独立入口。旧全屏控件由 `frame-chrome.ts` 写入 `⛶`。首次窄屏截图发现新工作台 h3 与羊皮纸上缘装饰交叠；工作台卡片顶部留白不足。声音开关原有通用按钮底色，E2E 也证实它没有木按钮图。
- **修复：**实验、比较报告、Profile/实验档案、回放和唯一倍速入口集中到游戏框外的 `#lab`；Options 仅保留 Help/Sound，Sound 与菜单和暂停板状态同步。工作台使用羊皮纸背景、浅色内衬、木按钮及响应式列布局；增加上边距避开烧边装饰。全屏按钮使用项目资源 `public/assets/gng-frame-fullscreen-states.png`，横向精灵图尺寸为 1774×887，按 200% 背景宽度切换两个状态；按钮文本为空，辅助名称仍随状态本地化。
- **防回归：**`t29-campaign-menu.spec.ts` 与 `t41-lab-workbench.spec.ts` 确认入口在 `.game-frame` 外、Options 只含 Help/Sound、local nav 锚点有效、桌面和 360px 窄屏无页面溢出、卡片标题避开装饰且中英文可读。`t30-fullscreen.spec.ts` 检查图像两态、可访问名称、键盘焦点、真实可点击状态；`t38-data-archives.spec.ts` 保留 Profile 替换确认、实验合并冲突及回放行为。受影响 9 份 Playwright spec 共 31 项通过；补充的 13 项检查有重叠，不重复累计。批次最终 `CI=1 pnpm run test:ci` 通过，包括类型检查、409 项单测、生产构建和 119 项 Playwright E2E。构建的主 JS chunk 超过 500KB 提示仍存在，但测试和构建成功。
- **浏览器验证边界：**内置浏览器在 `http://localhost:5191/` 实测桌面、390×844、中文和本地导航。对全屏按钮仅尝试一次真实 Fullscreen API，宿主拒绝并显示失败提示，因此没有真实原生全屏进出证据；Playwright mock 只证明状态图和状态处理正确。全程默认窗口模式、静音。
- **兼容边界：**仅迁移呈现入口，不改公共 API、规则、IndexedDB、Profile/实验 JSON 或回放格式；导入导出语义和站点语言状态不变。
- **地图点击 E2E 的视口假设：**完整检查首轮中 `t36-tech-town-gatling.spec.ts` 的地图雇佣用例失败。复现后确认，Playwright 点击位于页面下方的调试样本入口会滚动页面；helper 随后读取到画布 `y=-529.69`，却仍按画布矩形发出屏幕点击，坐标落在可视区外，因此状态显示“未选择单位”。修复为点击前 `scrollIntoViewIfNeeded()`，再读取画布矩形；定向用例通过。地图坐标测试在页面滚动后必须先把画布带回视口，不能直接把负的 bounding-box 坐标交给鼠标 API。
- **线上窄屏层级问题（已修复并验收）：**首版部署390×844竖屏中，站点 `aside.usagi-widget` 固定层为 `x=12..124, y=549..697, z-index:80`；工作台标题为 `x=22..368, y=595.6..626.9`，文字被宠物挡住。页面宽度仍为390px，根因是 `.lab-workbench` 没有建立高于共享浮层的层叠上下文，既有 Playwright 也没检查外部浮层与工作台的实际命中。
- **修复与防回归：**窄屏 `.lab-workbench` 建立 `position:relative; z-index:81`，不改共享站点外壳及游戏框层级。`t41-lab-workbench.spec.ts` 增加390×844层级/交叠命中检查；`CI=1 pnpm run test:ci` 通过，包括409项单测、生产构建和119项 Playwright E2E。修复 squash 发布 SHA 为 `0aab63b9b85455bf97caea9f30dc2563d3de19b8`，Actions `42621072039` 成功，GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配。内置浏览器用390×844窗口模式、静音复验：页面无横向溢出；工作台层级高于宠物，宠物框内测试点均由工作台接收；Options 仅含 Help/Sound，全屏按钮使用新图像资源。未重复请求宿主已拒绝的原生全屏。

## 新关卡对象映射需逐关核对

- **状态：**map06 场景切片已修正并添加防回归断言。
- **表现与复现：**构建 Murdock Mountains 场景时，初版复用了 Cow Gulch 装饰表，却漏掉 map06 的 code 72 路桩和 code 75 水塔；第一轮对象坐标测试因此失败。
- **根因与证据：**共享 `cowGulchDecorationCodes` 只覆盖 Cow Gulch 与少量共用类型，不能代表每张 New Mexico 地图的全部对象码。map06 审计格网明确包含 code 72/75，APK 对应贴图分别是 `b_1x1_stake` 和 `b_1x1_watertower`。
- **漏测点：**若只测试共享构造器或贴图文件存在性，不会发现特定关卡的原始标记没有被场景层消费。
- **修复与防回归：**map06 场景显式加入 72/75 映射；测试逐项从独立 TDM 基线生成“对象码→资产→格子”期望，并检查所有资产可加载。后续新地图必须核对该关完整对象码表，再决定继承共享项或增加关卡专属映射。

M32-D1 再次证明，marker 表完成后还要核对仓库内实际资源名：Loot Lakes 初稿把 shack 写成不存在的 `b_1x2_shack`，资源目录及其他关卡中 APK 对应贴图的正式映射为 `b_2x1_shack`。在编写场景前通过资源存在性检查发现并更正，未进入游戏实现。新地图验收应从原始 marker 逐项走到“APK drawable 名→网页资源别名→文件路径”，不得仅凭外形描述或宽高顺序拼资源名。**防回归补充：**资源测试也不能直接拼 `${asset}.png`；地图图集别名可能由 `gameAssetRelativePath()` 映射到 `hdpi/` 或其他正式文件名。Fort Knockout C5 首次测试曾因直拼路径误报 `tiles_canyon_floor_var` 缺文件，改按项目资源映射核验后通过。写预载测试前要先读 `src/render/game-asset-path.ts`，并用它计算测试路径。D1 的浏览器场景探针也曾把静态 `ScenarioUnit` 和运行时 `GameViewUnit` 整体深比较；后者会合法增加 `positionFine`、`moving`、`selected`、`attackRange` 等字段。跨层对照应只比较明确的业务投影（marker ID、类型、活动状态、贴图和格位），运行时字段按各自契约另测。

### 登记新关卡时同步检查场景上下文

- **表现与复现：**Fort Knockout 已能从 Dakota 菜单正确显示标题、简介和地图，但启动后 HUD 场景上下文仍写着 `NEW MEXICO`。
- **根因与漏测：**`campaignRegionLabel` 由正式关卡 ID 手工分支映射；新增 Dakota03 后未加入 Dakota 分支，遗漏项回退到了 New Mexico。此前 D1 的内容与正式进度单测未走菜单到实际场景的完整链路，因此标题和关卡已正确仍漏掉 HUD 文案差异。
- **修复与验证：**将 `dakota03CampaignId` 纳入 Dakota 上下文映射；`t72-dakota-03-integration.spec.ts` 同时启动 Free Play 和正式模式，断言场景上下文分别为 `FREE PLAY · DAKOTA · 33` 和 `DAKOTA · 33`，并检查 Level 32 门槛、开场对白、头像与资源加载。两项 E2E 通过。
- **防回归：**新增正式关卡时，除了目录、browser factory、菜单标题和预览，还要沿实际启动链检查 scene title、region context、difficulty、wave intro 与资源加载；若 UI 派生值使用 ID 手工枚举，必须将新关卡纳入对应分支并由菜单 E2E 断言。

### 新增正式关卡要检索完整阶段快照与显示计数

- **表现与复现：**注册 Fort Knockout 后，单测第一次完整运行有4项失败。阶段数量断言已从32改为33，但全关卡依赖列表、全阶段进度状态快照仍遗漏末尾的 Dakota03；菜单 E2E 也仍断言 `0/32`、`1/32` 等旧总数。
- **根因与漏测：**更新时只检索了 `officialCampaignStages.length`，没有检索所有把正式目录完整投影成数组的 `deepEqual` 断言，也没有搜索由进度 UI 输出的固定总数。失败分别出现在 `apache-valley.test.ts`、`fort-kaboom-formal.test.ts`、`content.test.ts`、`progress.test.ts` 及 `t20`、`t22`、`t25`、`t28`、`t33` E2E。
- **修复与验证：**四份单测加入 Level 33 及其 `campaign-dakota-02` 前置条件/锁定状态；五份 E2E 总数断言改为33。四个受影响单测文件合计41项通过。完整 `test:ci` 最终通过类型检查、989项单测、生产构建和190项 E2E。
- **收尾复核：**完整 E2E 首次运行中，188 项通过、2 项失败；失败是 `t70`、`t71` 的 Dakota Free Play 区域可玩数仍期待2，Level 33 接入后正确值为3。定向复跑这两个 spec 的4项通过后，完整回归全部通过。地区可玩数也是正式关卡目录的消费者，不能只搜索战役总数与进度分母。生产构建仍报告约3.77 MB 的主 JS chunk 超过 Vite 500 KB 提示阈值；这是既有构建警告，本批未调整拆包。
- **防回归：**新增正式阶段时，搜索并核对 `officialCampaignStages` 的长度、完整阶段投影、进度状态顺序、固定进度 UI 总数和地图菜单可用数。只改数量断言不算目录变更验收完成。
- **M35 复发：**加入 Badlands level34 后，批次完整单测再次因旧快照失败：`apache-valley.test.ts` 依赖链缺 Dakota04，`fort-kaboom-formal.test.ts` 的全目录投影缺 level34，`progress.test.ts` 初始和结算后状态缺一个 locked stage。目录、锁定逻辑和 Progress 实现均正确；补入三处期望后，这三份文件共31项定向测试通过。
- **复发原因：**已有经验文档清楚列出完整阶段投影和状态顺序，但本轮没有检索并执行该项；只批量改了 `officialCampaignStages.length` 和 UI 分母。因此这是执行检查遗漏，不是 APK/REA 证据缺失，也不是证据组织结构导致无法找到答案。新增正式关卡前必须逐项执行上一条列出的搜索，而不能把读过经验记录当成检查已完成。
- **M36 复发：**登记 Ghost Town level35 后，目录长度与多数完整快照已更新，`progress.test.ts` 的重载后状态向量仍少一个 `locked`。定向测试首轮 43/44；补齐末尾状态后，相关目录/进度测试 44/44 通过，类型检查通过。正式目录和解锁逻辑正确，遗漏来自同一测试文件的第二个完整投影未随第一处一起更新。
- **M37 复发：**登记 Ice Rocks level36 后，首轮完整 `test:ci` 的单测再次发现 `content.test.ts` 内 Cow Gulch 用例的 `officialCampaignStages` 全目录快照只列到 level35。实际目录已正确加入 `campaign-dakota-06`，内容版本、双语标题、global level 36 和前置关卡均正确；失败源于该独立完整投影未纳入 G4-B 的旧断言检索。已在独立期望中补入 level36；`content.test.ts`、`dakota-06-formal.test.ts`、`progress.test.ts` 共30项通过。随后完整检查通过1084项单测、生产构建和197项 E2E，类型检查与共享 catalog 18项通过。
- **分类与防回归：**这仍是测试维护/执行清单漏检，不是反解析遗漏或文档结论读错。更新关卡数时应在所有受影响测试中搜索阶段长度、目录全量数组、加载前后状态数组、解锁链和页面计数；新增关卡自身测试通过后，至少运行这些共享目录消费者的定向测试。

## 地形图层不能只画 tile 的表面标记

**状态：**Railroad Ranch 静态地形切片已修正并通过定向检查。

- **表现与复现：**把 map09 原始 TDM 转成网页地形时，3 个水平桥位只出现铁轨和桥墩，缺少横跨桥面的完整木桥贴图。
- **根因与证据：**APK 派生的 `terrain-render-index.json` 显示原始 tile 81 在 (15,3)、(26,3)、(14,17) 变为 street code 68；code 68 的绘制规则同时发出 `tiles_railway_hori` 和完整 `tiles_bridge_hori`，另有左右桥墩。旧参考生成器只为 code 68 发出铁轨与桥墩，遗漏了桥面；map08 没有这些铁路 marker，因此此前测试未覆盖这类复合地形格。
- **修复与防回归：**参考生成器和 map09 JSON 补入桥面层，保持铁轨→桥面→桥墩的绘制顺序。`railroad-ranch-terrain.test.ts` 核对 TDM 每格、APK 派生的背景/street 命令、三段桥面和六个桥墩坐标、贴图 source rectangle 与地图边界。静态索引只证明绘制候选和源码规则，不冒充 Android 截图或逐帧随机结果。
- **验证：**定向地形测试 2 项通过，TypeScript 类型检查通过。完整 `test:ci` 留到 map09 批次收尾运行。
- **Dead Rocks 延伸验证：**Mississippi 关卡沿用同一套 TDM 地形规则，但要逐格校验背景随机候选和桥墩，不用一张预览图代替路线证据。M17 测试从 map20 TDM 核对全部网格、背景与桥面绘制数据、对象 marker 坐标；路线另与 APK 派生的74条有向边逐项比较。固定 Java Random seed 只为网页复现 APK 候选，不声称复现 APK 每次启动的时间随机结果。

## 波次炮池模板应与地图初始单位分离

**状态：已关闭。**

- **表现与复现：**Riverside Mountains 的 Fort 炮池需要在第2波生成 Cannon，但新局地图没有摆放 Cannon 初始单位。旧运行接口只能从地图已摆放单位里找同类型模板；若为满足接口而伪造一个地图 Cannon，会错误地把波次单位显示为初始单位。
- **证据与根因：**[M14 静态审计](map14-static-audit.md)区分地图 Fort 出生点与 Cannon 波次池。关卡内容中的 `template` 是生成所需的单位定义，不代表地图上已有一个该单位；原接口没有表达这种区分的字段。
- **修复：**在战役单位池定义增加可选独立 `template`，生成时仍校验池类型并沿用正常单位规则；未指定时保留从地图单位推导模板的原行为。资源收集同时包含模板引用的图像与序列。M14 数据保留 Fort 炮池作为唯一生成位置，不添加假的初始 Cannon。
- **验证与防回归：**M14 实体/正式关卡测试覆盖无初始 Cannon、炮池正确生成及资源预加载；完整 `CI=1 PLAYWRIGHT_PORT=4204 pnpm run test:ci` 通过614项单测、构建和141项 E2E。发布 SHA `ebf35d3` 的 Actions `43184402532` 与两处 Pages 来源 SHA 均通过核对；内置浏览器确认 Free Play 开场与首波地图正常。今后遇到只在波次中出现、未摆在地图上的单位，先明确“生成模板”和“地图实体”边界，不添加伪造初始对象。

## Playwright 不应复用其他 worktree 的本地服务器

- **表现与复现：**不带 `CI=1` 在当前 worktree 运行多个 Playwright spec 时，测试复用了端口 4173 上已运行的开发服务器。错误页面仍显示旧版 `7/10` Free Play 文案和旧关卡可用状态，因此多项用例看似与当前改动冲突。
- **根因与证据：**`playwright.config.ts` 设置 `reuseExistingServer: !process.env.CI`。Playwright 可以连接任意已占用该端口的服务，不会确认服务属于当前 worktree；失败上下文与当前 `src/main.ts` 的新文案不一致。使用 `CI=1` 并指定独立 `PLAYWRIGHT_PORT=4183` 后，浏览器测试由当前 worktree 的 Vite 服务运行，受影响 10 项通过；独立端口上新增 M11 E2E 也通过。
- **修复与防回归：**产品代码无需为该测试环境问题调整。验证源码行为时使用 `CI=1`；并行 worktree 手动运行 Playwright 时使用各自独立端口。出现与当前源码不一致的页面状态时，先确认服务进程和端口，再改产品代码或断言。
- **本轮复发记录：**第一次定向运行未指定 `PLAYWRIGHT_PORT`，又连到旧的 `4173` 服务，两个样式断言仍读到旧背景图。改用 `PLAYWRIGHT_PORT=4196` 后，当前工作树启动了独立服务，相关 9 项 E2E 全部通过。跑 Playwright 前必须先选独立端口，不能因之前已有同类记录就省略环境核对。
- **Dead Rocks 复发：**非 CI 的首轮测试再次复用了旧 `4173` 进程，关卡状态与本次代码不符。以 `CI=1 PLAYWRIGHT_PORT=4177` 启动严格隔离服务后，Dead Rocks 两项浏览器测试通过；不结束来源不明的旧服务器，直接换独立端口，并确保 `CI=1` 关闭服务器复用。
- **本地监听权限：**M17 最终整套检查时，即使端口空闲，沙箱仍以 `EPERM` 拒绝 Playwright 的本地 Vite 监听；换端口仍失败。获得仅限本地测试服务器监听的提权后，147 项 E2E 通过。遇到该错误先确认端口空闲，再申请只覆盖本地测试监听的权限；不改 Playwright 主机配置、不停掉不明进程，也不把环境限制当成产品故障。

## 关卡发布需同时核对部署来源与真实入口

**状态：M17 Dead Rocks 已发布、完成公开入口验收并回同步至 `gunsnglory`。**合并提交 `fcf622e` 已推送，集成分支现包含发布 SHA。

- **本批发布：**提交 `4ca738c2bf01d2bc6d6e565cfd2a117d33b37aa5` 的 GitHub Actions `43246826051` 成功；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均返回该来源 SHA。
- **入口观察：**内置浏览器在静音、窗口模式进入 Free Play → Mississippi → Dead Rocks → Medium，确认关卡标题、地图、Settlers 开场对白和 `1/8` 波次 HUD 显示正常；随后仅继续到首波准备状态，没有完整手动通关。未启动 Android、进入全屏或播放音效。
- **防回归：**关卡发布只有在 Actions 成功且两个公开部署端的来源 SHA 与预期发布提交一致后才算部署完成；浏览器使用对应 release SHA 的 URL，并检查从菜单到实际关卡内容的代表流程。截图或单纯菜单可见不足以证明新关卡已加载。

## 内置浏览器 provider 不可用时不得替代线上交互验收

**状态：M22 发布构建与来源 SHA 已通过；线上交互验收待补。**

- **表现与证据：**M22 squash 发布提交 `b5dec97` 的 GitHub Actions 全绿，GitHub Pages 与 Cloudflare Pages 的公开 `build-info.json` 均返回该提交 SHA；但本次 Computer Use 的 `getState()` 显示 `browsers: []`，创建 `iab` 标签返回 `Browser is not available`，按 URL 获取 browser 也返回 `No browser is available`。
- **根因与边界：**这是当前会话没有可用内置浏览器 provider 的环境问题，不是游戏页面已通过视觉验收。公开构建信息只能证明部署来源，自动化 E2E 只能证明其覆盖的行为；二者都不能代替人工可见的线上交互检查。
- **防回归：**保持 M22-G 浏览器验收未完成；恢复内置浏览器后，打开与部署 SHA 一致的页面，在窗口模式、静音状态验证 M4–M7 replay 导入及 Eastwood Free Play 入口。遵守仓库规则，不改用外部浏览器或 DevTools，并在观察到实际页面状态后才关闭该项。

## 战役进度快照断言要跟随正式关卡目录

- **表现与复现：**新增全球第 11、12 关后，完整单测曾因旧阶段快照缺少新关而失败；map12 批次中 `apache-valley.test.ts`、`fort-kaboom-formal.test.ts` 和 `progress.test.ts` 的固定目录/状态期望只列到第 11 关。
- **根因与证据：**`officialCampaignStages` 已正确登记 Steam Valley 为 global level 12、以前置 `campaign-mississippi-11` 解锁；失败来自测试仍硬编码 11 项，与关卡注册或 Progress 运行逻辑无关。
- **修复与防回归：**加入正式关卡时同步更新目录快照、Progress 初态和结算后的状态数组；本次仅补入第 12 关及 locked 状态，三个文件的 29 项定向测试通过。每次登记正式关卡后，搜索完整 `officialCampaignStages` 列表、globalLevel、解锁前置、结算后状态数组及进度文案；不要为了迎合旧快照改动正确的进度逻辑。

**M33 复现：**登记 Dakota 第32关后，首次完整 `test:ci` 的187项 E2E 中有6项只因 `campaign-progress-summary` 仍断言 `*/31 stages complete` 而失败，实际目录及页面正确显示 `/32`。失败分布在 `t20`、`t22`、`t25`、`t28`、`t33` 五个 spec；单测阶段已通过，M33 新关入口 E2E 也通过。根因是检查只更新了目录快照和新增关卡用例，没有在首次失败后用全仓 `rg` 搜索所有摘要字符串。5个 spec 的6条期望现已更新为32，五个 spec 共11项定向 E2E 全部通过；随后完整 `CI=1 PLAYWRIGHT_PORT=43363 pnpm run test:ci` 通过类型检查、959项单测、生产构建和187项 E2E。以后先搜索精确的 `stages complete` 文案，再运行完整 E2E；只检查单测和新关卡入口会漏掉跨批次旧用例。

### 新正式关卡要同步更新目录快照、E2E 与 Free Play 可用性

- **M24 复现：**新增 global level 23 后，第二次完整 `test:ci` 中 6 项 E2E 仍断言战役摘要总数为 22；另 1 项 Oregon Free Play 测试仍将已实现的 level 23 判为禁用。
- **M25 复现：**新增正式 level 24 后，旧 E2E 摘要和 Free Play 可用性断言未全部更新；第一次完整检查还发现 Apache Valley 的正式目录依赖快照和 Progress 初始状态快照缺少 Fort Echo。
- **根因：**单测的完整目录快照与浏览器摘要/关卡按钮断言分散在不同文件。只搜索一类固定字符串会漏掉其他目录消费者；定向 E2E 通过也不能覆盖未运行的单测快照。
- **修复与防回归：**M24 将摘要更新为 23/23，并让 Oregon 测试检查 21–23 可用、24 禁用；M25 更新 8 个旧 E2E spec 的 23→24 摘要及 Free Play 四关可用、level 25 禁用断言，并在 `apache-valley.test.ts`、`progress.test.ts` 补齐第 24 关的解锁前置和 locked 状态。M25 受影响的 9 个 spec 共 22 项 E2E 通过，失败的 2 个单测文件 25 项复跑通过；最终 `test:ci` 全绿：779 项单测和 165 项 E2E，构建仅有大 JS chunk 提示。以后登记关卡，需同时检查正式目录及解锁链、Progress 初态/结算快照、战役进度摘要、Free Play 可玩/禁用范围；先定向覆盖修改文件，再运行一次最终完整检查。

## 正式关卡的专属资源必须加入启动预加载

- **表现与复现：**Free Play 打开 Traveller’s Town 后，对白、标题和规则正常，但 Canvas 被错误恢复画面替换，并出现“必需游戏图片未加载”的提示；按下对白 Continue 后仍无法绘制地图。
- **根因与证据：**`main.ts` 的 `assetNames` 是应用启动时加载游戏图像的唯一清单，原清单只收集到 Lucky Lake 等已有内容，没有收集 `createMississippi11CampaignContent()`。Mississippi 专属 `miss_tiles_*` 地形、`steamboat_*` 及该地图引用的列车/装饰资产因此不在 `images` 中；`drawGame()` 遇到首个缺失资源便绘制黑色错误恢复画面。逐项检查确认关卡引用的贴图文件均在 `public/assets`，问题是未预加载而非资源文件缺失。原 `t49` 只检查菜单、对白和波次文本，没有检查 Canvas 资源错误面板，因而该缺陷可在测试通过时漏出。
- **修复与防回归：**把所有解锁状态下的 Traveller’s Town 内容加入资源收集集合，使地图、静态对象、列车、蒸汽船和单位资源一并预加载；`t49-mississippi-11-integration.spec.ts` 在对白显示后及继续进入战场后断言 `asset-load-error` 隐藏。若新关卡首屏内容正确而地图是黑色，先核对地图对象/单位对资源清单的引用，不要用占位贴图或吞掉 renderer 错误掩盖问题。
- **验证：**Node 22 对地图背景、道路、装饰和单位资源做路径存在性核对，所有引用文件存在；`pnpm run typecheck` 通过；`CI=1 PLAYWRIGHT_PORT=4192 pnpm exec playwright test tests/e2e/t49-mississippi-11-integration.spec.ts --workers=1` 通过（1 项）。内置浏览器在本地窗口模式、静音下确认 Mississippi 地形、静态对象、铁路和两列列车正常显示，错误面板未出现。新增 390×844 窄屏布局断言后，最终 `CI=1 PLAYWRIGHT_PORT=4195 pnpm run test:ci` 通过：类型检查、561 项单测、生产构建和 134 项 Playwright E2E；构建保留既有 1.385 MB JS chunk 警告。线上发布提交 `b6e05ca` 的 Actions `43018344472` 成功，GitHub Pages 与 Cloudflare Pages 均报告匹配来源 SHA；内置浏览器再确认 Free Play 第 11 关对白、地图和继续进入首波正常。全程未进入全屏或播放声音。

## 实验室告示牌下不应重复铺整张羊皮纸

- **状态：已集成发布并通过线上核对。**发布 SHA `8baa286ed32f4266e0636e1cfd1152a42c42caf1`；Actions `43152356792` 成功，GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均匹配。内置浏览器确认木质告示牌标题直接落在页面底色上，未再叠加规则黄色卡片；输入控件仍保留浅色表面以维持可读性。
- **表现：**实验室各区的木质告示牌标题下方还铺着大张黄色羊皮纸，整体读成“告示牌叠在规则黄矩形上”。
- **根因与证据：**`styles.css` 的 `.lab-card` 同时绘制 `gng_hud_2_textbox_large.png` 和阴影，`.lab-card > h3` 再叠原版木按钮图。输入框及实验报告已有独立表面，外层羊皮纸只是重复装饰。旧 `t29`、`t41` 还把整卡羊皮纸断言为设计要求，没有验证叠层是否必要。
- **修复与防回归：**`.lab-card` 改为透明并移除阴影，缩小标题上方留白；木牌标题、浅色输入控件、报告表格及游戏内确认弹窗保留各自外观。`t29-campaign-menu.spec.ts` 与 `t41-lab-workbench.spec.ts` 断言卡片无背景图、标题继续使用木按钮贴图，并覆盖导入按钮 hover/focus 与 1280px、900px、390px 布局。定向 E2E 9 项通过；批次完整 `test:ci` 通过 584 项单测和 137 项 E2E。内置浏览器对发布页截图确认视觉结果。后续不要为了保留“木牌”而给父卡片再加规则底色；需要分组时优先用间距和标题层级，只有具体内容对比度不足时才增加局部表面。

## 关卡访问与活动地图单位解锁必须分开处理

- **状态：已关闭。**M20-F 完整检查通过；Tech Town 正式/地图测试与 M20 单位/正式测试共同覆盖本修复。
- **表现与复现：**Horse Hills 接入正式关卡目录时，Tech Town 的单位/Casino 配对断言在模块加载阶段失败；既有 Tech Town 正式内容测试也发现未解锁地图仍含活动 Mexican。
- **根因与证据：**New Mexico marker 工厂为保留原版 activity 5 活动单位，会跳过普通单位解锁回调；但 Tech Town 的 Gambler marker 也属于 activity 5，必须遵守全局里程碑，而未解锁 Tech Town 的活动 marker 还必须服从关卡访问条件。把关卡访问与 unit milestone 混成一条过滤规则，或全局过滤所有 activity 5，分别会导致 Gambler/Casino 不配对，或误删 Horse Hills 活动 Grandpa。既有 Tech Town 与 M20 实体测试明确覆盖这两组边界。
- **修复与防回归：**New Mexico 工厂只对需 milestone 的 Gambler marker 使用 unit unlock；Tech Town 构造器用独立 `mapAccessible` 决定是否生成该地图的活动 marker。M20 activity 5 marker 继续不受招募 milestone 过滤。新地图需分别验证 stage access、activity 和全局 unit unlock，不应互相替代。

## 我方单位绘制脚底与地形碰撞锚点错开

**状态：代码修复、整批验收、集成发布与来源 SHA 核对已完成。**

- **表现与复现：**用户在多关卡截图中看到我方角色脚底落到峡谷/河道贴图外；在 Cow Gulch 窄桥上沿纵向移动时，角色看起来超出桥面可走范围。窗口模式悬停右上角全屏按钮时，金属图标消失。
- **根因与证据：**APK `GameObjectUnit.createCollisionObject()` 的碰撞框与网页相同，为 `x=-2534、y=-5376、宽5068、高4608` 个细单位。APK `GameObjectUnit.draw()` 将活动单位帧的底边绘制在 `fineY`；网页 `initialUnitPosition()` 的锚点是 `cell.y+0.75`，但 Gunslinger/Mexican 活动贴图和部分可招募单位的醒来贴图底边是 `cell.y+1.0`，所以人物相对正确的碰撞坐标向下偏 `0.25` 格。逐一检查 27 个正式关卡的网页内容生成结果，发现 47 个活动可移动单位中 37 个、分布于 19 关存在此偏差；另有 374 个睡眠单位的醒来贴图有相同偏差。APK `BackgroundMap.isReachableXGround/YGround()` 和网页 `mapBlocksUnit()` 都用同一矩形四角检查地形，街道层覆盖桥面，因此现有证据指向绘制锚点，不支持全图碰撞平移。
- **全屏按钮复现：**纯 hover 时 `.game-frame-fullscreen-toggle:hover` 的旧 `background` 简写覆盖了后续定义的背景精灵图并将其清空为 `none`；较后的 hover 规则只重设背景色，没有重设精灵。窗口模式内置浏览器已复现该计算样式。
- **漏测点：**既有道路检查主要核对敌方 TDM 路线与地图图层，没有在每个正式关卡比较我方 `positionFine` 和活动/醒来贴图底边；单位几何断言未检查 Awake sprite。全屏控件测试检查静止及按下状态，却未在 hover 状态检查背景图和帧位置。
- **修复结果：**活动 Gunslinger/Mexican、Apache Valley 地图单位、374个醒来贴图与命中区、Cow Gulch 初始单位及 Gambler 样例统一使用 `createAnchoredMapRender`。全关扫描覆盖27关的47个活动可移动单位和374个醒来贴图；Cow Gulch 原始TDM桥行9及相邻阻挡行8/10由短 `GameSession` 核对。57项定向单测、类型检查通过。内置浏览器在窗口/静音下检查本地地图和单位画面；没有逐关进行人工移动，也没有完成完整桥面视觉路径。全屏 hover 规则已移除背景简写，定向 E2E 9项通过，覆盖未按下悬停与已按下图帧。批次 `CI=1 pnpm run test:ci` 通过841项单测、175项 E2E、类型检查和生产构建；主 JS chunk 体积提示仍存在且与本次改动无关。
- **公开验收边界：**发布提交 `358bcaa5c66bd7d890c3eccb45f27574da90ea7e` 对应 GitHub Actions `43801487993` 成功；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均报告相同 `sourceSha`。内置浏览器以静音、窗口模式进入 Cow Gulch，确认地图、玩家单位、缩放和全屏控件已渲染；浏览器流程在第二波对白出现前后中止，未完成桥面连续移动观察。桥面行走范围的证据来自原始 TDM 与短 `GameSession` 边界测试，不能表述为线上完整实走验证。
- **防回归要求：**后续新增我方单位构造时，逐关扫描活动贴图、醒来贴图和命中区，确保脚底锚点与 `positionFine.y` 一致。若报告地图边界错位，先对照该关原始 TDM、逻辑位置与渲染脚底，再决定是否涉及碰撞层；不可仅凭敌方路线或贴图边缘推断碰撞网格。全屏双态按钮的 hover/focus 反馈只用滤镜或颜色属性，不使用会清除背景精灵的 `background` 简写，并在两个 `aria-pressed` 状态都运行悬停测试。
- **避免重复：**先区分逻辑碰撞锚点、人物贴图脚底和背景图层；敌人路线通过不能作为我方移动验收。后续如再见角色“走进”峡谷，先检查 `render.y + render.height` 是否等于 `positionFine.y / 7680`，再检查相应 TDM raw tile 与街道层，勿先整体平移地图或改碰撞常量。


## TDM raw 36 悬崖墙被误判为可通行

**状态：**网页已修复 Cow Gulch 的 raw `36` 可穿越问题并发布；Snake River/map32 的陆地阻挡分类已按 APK 最终背景与街道层逐格核对，其他地图仍需逐图对照。对象碰撞补全见本文件前面的“桥面边界与我方地图对象碰撞必须拆开核对”。

- **表现：**角色能被移动到 Cow Gulch 等地图的悬崖立面贴图区域；桥边界看起来也比可见桥面宽。第一张用户截图中的角色确实覆盖悬崖墙纹理，这不是可接受的站位。
- **根因与证据：**网页 `backgroundCollisionCode()` 的 `BACKGROUND_BLOCKING_TILES` 原先包含 `32`、遗漏 `36`，因此 Cow Gulch 中 raw `36` 墙格可被网页移动规则穿过。APK 的 `BackgroundMap.createBackgroundMap()` 初始阶段将 raw `32` 转为背景码 `48`，raw `36` 则走默认分支写入 `0`；之后 `shapenBackgroundMap()` 会根据邻格重塑背景。APK 的 `isReachableXGround()` / `isReachableYGround()` 检查的是最终背景码和街道覆盖层，不是 raw marker 的直接映射。此前经验记录把 raw `36` 的最终阻挡现象误写成初始映射规则，这一说法不准确。
- **摘要复用复发：**Loot Lakes 静态审计初稿又沿用了“raw `36` 初始背景值为48”的旧摘要。直接检查本 APK 的 `createBackgroundMap()` Smali 后确认 raw `36` 走默认分支写 `0`，已在实现和测试期望建立前更正。经验记录和上下文摘要只能作为检索线索，不能替代目标 APK 的分支核对。
- **此前漏测：**Cow Gulch 桥测试只走了 raw `80` 桥格及相邻 raw `32` 阻挡格，没有测试桥端附近 raw `36` 墙格；全关贴图锚点扫描没有把每个可见墙格与最终塑形后的 TDM 碰撞语义逐格核对。之前的短会话证明网页在所测 raw `36` 格会阻挡，不能单独证明网页与 APK 的最终 shaped background 全图等价。
- **修复与验证：**网页 `BACKGROUND_BLOCKING_TILES` 补入 raw `36`，Cow Gulch 真实枪手会话沿原道路在该关 row 12 raw `36` 悬崖墙外停止；27 张已接入地图各自的 raw `36` 短会话测试通过。该修复证明所测网页边界行为，不证明所有地图的转换算法与 APK 最终地形逐格相同。旧批次完整测试、部署 SHA 与浏览器观察记录仍有效，但不应将其表述为已验证 APK 的全图映射等价。
- **Snake River 对照：**M30-B3 的独立参考转换显示 map32 768 个格点的陆地阻挡分类在“网页 raw tile + street overlay”与“APK shaped background + street overlay”之间 `0/768` 不同；raw `36` `(2,15)` 的最终码为 `14`，raw `80` `(4,13)` 为 `67`，raw `88` `(20,10)` 为 `23`，后两者通过道路层放行。真实 `GameSession` 又在这张图上分别验证 raw `80/88` 桥、raw `36` 墙、睡眠 Grandpa 和 shack 碰撞；10 项地图/对象/移动定向测试及类型检查通过。此结果仅适用于 map32，不代表其余 Oregon 地图已逐格对照；没有发现需要改共享碰撞行为的差异。
- **防回归：**地形碰撞问题必须分别记录 raw TDM、`createBackgroundMap()` 初始值、`shapenBackgroundMap()` 后最终值、street 覆盖和碰撞查询结果；不能把中间阶段称为最终碰撞规则。新增地形转换参考测试应从 APK Smali 的完整转换链独立生成最终格网，并与网页逐格比较；修共享转换时回归桥行和墙格。

## 玩家移动画面对照必须遵循 Canvas 指针语义

- **状态：**排查方法已校正；本次没有完成桥缘画面对照，也没有发现新的碰撞缺陷。
- **误判风险：**对 Cow Gulch Level 1 发出鼠标右键移动后，单位没有移动；如果据此判断路径或碰撞错误，会把无效输入当成产品复现。
- **代码依据：**`main.ts` 的 Canvas `pointerdown` 处理器直接忽略鼠标非左键事件。玩家单位通过按住左键拖动发出 `move-unit`；指针释放进入 `finishPointerMovement()`，进而发送 `stop-moving`，`GameSession` 会清除单位的 `movementTargetFine`。因此释放后再单步不能继续刚才的移动目标。
- **本次浏览器观察：**本地 `?testBattle=1` 以 Cow Gulch Wave 1、1×、静音启动。右键点击 raw80 `(12,9)` 后位置未变，属于无效输入，不是桥不可通行。随后多次短左拖将 `gunslinger-1` 从 `(8.50,8.75)` 移至 `(9.92,9.08)`；中途开发态十字报告 `fine=(68513.0,66693.0)`，并与该帧单位位置重合。操作没有把角色带到 raw80 桥格，终点是否受阻也未作判定，故不能作为桥缘或碰撞结论。战斗保持 Wave 1 暂停，未完成关卡、未写入战役结算。
- **防回归与复用：**浏览器移动验证先左键命中活动单位，再用左键拖动；每次释放后重新读取 `positionFine`，不得把单次短拖当作完整路线。若目标需要连续移动，应使用能维持按压的自动化动作或多个有坐标记录的短拖，并在到达后暂停截图。单测/`GameSession` 的 `move-unit` 命令测试与生产画面观察分别记录；不能用右键试探代替真实玩家输入，也不能因单次拖动距离短就推断边界。

## 新关卡数据必须以本关 APK 资源为准

- **表现与复现：**Snake River 初步计划把关卡参数末项写为 `299000`，并沿用旧摘要中“Colt City/map31 含 Steamer marker”的说法；波次第 4 波第二条请求入口也被记成 action 2。
- **根因与证据：**这些都是跨关卡摘要或 Smali 调用重建带来的错误。直接读取 Snake River 的 `GameDesignData` index 28 得到末项 `119000`；直接检查 `td_map_31.tdm`，raw `120–123` 均为 0；重新逐条模拟 `GameDesignWaves` 分支的寄存器赋值后，第 4 波入口顺序为 `0、1、2`。对应证据和边界记录在[Snake River 静态审计](map29-static-audit.md)。
- **漏测点：**初步计划和旧摘要没有与本关参数数组、TDM 字节及 Smali 调用顺序做独立交叉核验；把相邻关卡或已生成摘要当作当前地图事实。
- **防回归：**每关单独建立 `campaign level ↔ TDM index ↔ 参数数组 index ↔ wave 分支` 映射；参数从目标 index 读取，地图对象从目标 TDM 计数，波次按 Smali 调用实际顺序还原寄存器。旧摘要仅作为检索线索，不能覆盖 APK 原始数据。未知参数语义继续标未知，不因非零字段或相邻地图对象推断玩法。统计波次数时只数目标 level 条件分支内的调用，并分别计数 `newWave`、`addToWave` 和玩家池动作；M31-C2 初稿沿用此前提取摘要中的23次请求数，直接核对 map33 的 Smali 分支后确认是20次 `addToWave` 与2次池动作，已在实现前更正。
- **相邻关卡参数复核：**Loot Lakes 实施前，初步上下文摘要把 map33（`level == 30`）与 map34（`level == 31`）的玩家池上限串成同一组。REA 对完整 `GameDesignWaves.setWaves` 条件分支确认：map33 为 `[6,6,6,6]`，map34 为 `[2,2,0,0]`；两关清空库存的 `SET` 调用相同，但 `SET_MAX` 参数不同。该草稿错误在改代码前被发现，M31 实现、审计和测试没有缺陷。后续引用历史摘要时必须回到准确的 level 条件分支，不能因为调用结构相似就复用邻关参数。
- **Dakota 地区贴图必须覆盖首关：**Loot Lakes（全局关卡31）在 Dakota LevelPack 中仍使用普通树和岩石，而同包后续关卡与 Snow Town 已切换雪地资源。APK `Dakota.getFirstLevelIdPack()` 返回31，`loadIngameImagesPack()` 在 LevelPack 层把雪地树/岩石 A/B 写入通用缓存槽；Loot Lakes 的 TDM 含 raw 69/70/71。遗漏原因是早先只把目录从 Dakota 第2关起命名为 `dakota-02`，雪地图集测试也从这些文件名开始，没有把旧命名 `oregon-11` 的 Dakota 首关纳入覆盖矩阵。现已将 Loot Lakes 的三个 marker 改用雪地资源，并把区域首关加入 `dakota-snow-biome-assets.test.ts`；`oregon-11-map-entities.test.ts` 继续核对坐标和碰撞不变。以后按 APK LevelPack 的起始关卡及资源替换调用范围确定区域资源覆盖，不按 TypeScript 模块前缀或新增地图名称缩小范围；若旧模块名与地区目录不一致，测试清单应同时记录全局关卡号、区域序号和地图文件号。
- **单个对象行必须与 TDM 频次和坐标表闭合：**Six Grandfathers 的静态审计表误记 raw `109@(13,1)` 为活动 Grandpa；同一报告的 raw marker 频次表并没有 `109`，且该坐标的 TDM 实际为 raw `32`。APK TDM fixture 与派生网格一致，错误发生在报告转录/汇总，没有证据表明 DEX 对象构造分析错误。M33-C 测试在实现前发现矛盾，现已删除虚构对象。新地图审计的每个对象行必须同时满足：目标 TDM 的 marker 频次、全部坐标、对象构造/activity 分支三者一致；汇总频次和原始字节要能反向覆盖表格的每一行。


- **玩家池动作的 wave 与 action 参数要追到消费端：**Wayne Waters 的两个 addActionForSpawnPool 调用都指定 wave 1；第一个 action 1 表示 SET，第二个 action 3 表示 SET_MAX。初稿曾把第二个调用的 action 值误当成发生波次。复核时应从方法签名、字段写入和 performActionsForWave 消费逻辑确认参数顺序，不按数值或调用位置推测。
- **TDM 对象分派要同时检查直接比较和 packed-switch：**Wayne Waters 的 raw 126 由 createGameObjectsFromBasicMap 中 packed-switch 之前的直接相等分支创建水边石块。只看 packed-switch 会漏掉该对象。检查 marker 时应覆盖整个分派方法、构造器及绘制/碰撞副作用，不把 switch 表当作完整分派清单。

## 新关卡波次统计必须核对目标分支

- **表现与复现：**Six Grandfathers 的前置批次摘要把 `GameDesignWaves.setWaves()` 中的 `addToWave` 调用数写成12。
- **根因与证据：**APK 反解析没有漏掉调用；错误来自读取压缩后的上下文摘要时未重数完整 `i == 32` 分支。REA 当前返回的完整分支和独立 `waves.json` 都含13条调用（Wave 1–8 分别有1、1、1、1、2、3、3、1条），原来的分组摘要少算了一条。关卡内容表和实现计划现以13为准。
- **漏测点：**曾用波次数及整理后的摘要估算请求总数，没有核对分支中的实际调用数，也没有用另一个派生清单交叉计数。
- **防回归：**每关分别数目标分支的 `newWave`、`addToWave` 和池动作；按各波汇总请求条数后与 DEX/REA 分支及派生表双向对照。压缩摘要只作定位线索，不作计数事实；自动化测试固定波次数、总请求数、分波数和每条参数。
- **调用数与最终池数必须分开：**Snow Town 的 `GameDesignWaves.setWaves(i == 39)` 有17次 `addToWave` 调用，但 Wave 2 对 action 1 连续写入两次相同参数。`WaveManager.addToWave()` 调用 `Wave.setContentForSpawnPoint()`，后者按 action ID 写入固定行；第二次调用覆盖同一行，不会创建第二个独立池。因此 APK 源调用数为17，最终有效 spawn row 为16。实现前用 setter 的写入语义确认过这一点，并分别核对源调用数和最终状态。以后遇到重复 action ID，必须比较整行参数并检查接收者是覆盖还是追加，不能把每个方法调用直接当成一个运行时请求池。

## 固定随机种子说明必须由完整地形指令验证

- **表现与复现：**Lumber Mill Hills 的初始 `oregon-10.json` 与 APK map33 的 770 字节 TDM 网格一致，文件说明也记录了固定 Java Random seed；但与独立地形参考逐项比较时，背景变体和道路图块仍不一致。
- **根因与证据：**`deriveOriginalTdmMapDrawCommands()` 仅从原始 TDM 网格按固定种子和 APK 行扫描顺序重新派生背景、街道和铁路命令。逐项比较失败，证明“使用相同种子”的文字说明不足以证明随机调用顺序和每个贴图源矩形一致。初始生成脚本不在本工作树，因此不能进一步断言是其随机调用顺序、输入版本还是其他一次性生成差异导致；不能据此归因于 APK 原始数据。
- **修复与防回归：**重建 map33 的背景及街道绘制数组；新增 `oregon-10-map.test.ts`，对768个背景格和98条街道/铁路绘制指令逐项比较独立参考，并检查素材文件、图集裁切边界及最终碰撞背景。TDM 网格、固定种子变体和 APK 每次启动的时间随机结果是三个不同概念；固定种子只用于网页可复现的合法候选，不代表逐次复现原版随机启动。
- **避免重复：**新关卡地形不能只验网格尺寸、marker 数量或随机种子说明。必须从原始 TDM 独立重建完整绘制指令，并比较贴图、源矩形、位置、层序和碰撞结果；若一次性生成程序不在仓库，记录实际差异和未知原因，不猜生成错误机制。

## 新关卡必须进入共享运行时路线回归

**状态：Colt City（Oregon 第 8 关／全局第 28 关）已发布。**发布提交 `8a75d52128bc885aeb091ecc17d2875d6649bda1` 的 GitHub Actions `44001377789` 成功；GitHub Pages 与 Cloudflare Pages 的 `build-info.json` 均返回该 SHA。发布已合并回 `gunsnglory`，回同步 merge 为 `be593d4`；验收记录已提交并推送，集成分支本地与远端一致。

- **根因分类：**未发现 APK 路线反解析错误。第一处是网页测试矩阵维护遗漏：静态地图测试与共享寻路消费者测试分开维护，新地图完成自己的路线拓扑测试后，没有同步进入共用矩阵。第二处是本轮测试计划把 `spawnPointId=2` 误读成 `(31,8)`：APK action ID 先映射到网页 spawn ID，spawn ID 再按 TDM 行优先顺序对应坐标；没有核对第二段映射。静态 `oregon08SpawnPointIdByActionId`、出生点清单和路线定义本身都正确。
- **修复与验证：**将 Colt City 正式内容加入共用集合，计数更新为28关；新增短 `GameSession` 使用真实 Wave 1 action 1，请求事件确认 `spawnPointId=2`，再核对该点是 `(31,19)`，跟踪无防守单位干扰的敌人到 `(25,19)` 并确认其按 TDM 方向转北。定向 `wave-routes.test.ts` 通过6项，`pnpm run typecheck` 通过；完整 `CI=1 PLAYWRIGHT_PORT=43324 pnpm run test:ci` 通过类型检查、872项单测、生产构建和178项 E2E。反转 marker 52 的方向映射时，路线构造/测试失败，确认测试能捕捉方向错误。内置浏览器静音、窗口模式进入 Free Play → Oregon → Colt City → Medium，确认开场对白、头像及地图加载；短时4×未操作导致第一波败北，结果没有写入战役档案，随后恢复设置为1×。浏览器未目视证明连续行走或池单位战斗；这些运行时路线结论来自短 `GameSession` 与自动化测试，不描述为浏览器实测。
- **防回归：**每个新关卡都要同时完成静态路线图、`runtimeWaveRedirects()` 对照和至少一条真实短会话转弯断言；对 `actionId → spawnPointId → TDM 坐标` 逐段核实，不从编号或数组位置猜坐标。核对共享关卡清单数量与正式目录一致。不要把静态 `routes` 完整当成运行时路线正确的证明，也不需要通过完整战役或 Android 实测来验证这个确定性分岔。

- **Wayne Waters 同类错误复发：**M39-C 首轮波次测试把 action 2 直接写成 `spawnPointId=2`，测试失败后才查看该地图从 TDM 出生 marker 派生的映射：action 2 实际对应 row-major `spawnPointId=1`。REA 路线、TDM marker 和生产映射都正确；错误是新测试没有逐项读取当前地图的映射表，重犯了本节已经记录的 ID 混淆。修正后短 `GameSession` 检查通过。经验条目已存在仍未阻止复发，说明阅读经验记录不能替代实际执行核对；测试必须同时断言 `actionId → spawnPointId → TDM 坐标`，并把目标地图的映射作为明确期望。

## 玩家池动作槽位可以没有本地图生成模板

- **表现与复现：**Wayne Waters APK 的 Wave 1 `SET`/`SET_MAX` 动作覆盖 raw pool slot 1–4；本图只有 Saloon 和 Fort，没有 Tipi。旧网页校验要求每个动作槽都必须有单位模板，因此无法忠实保留 slot 4 的最大值，又不伪造 Indian pool 或 Tipi。
- **根因与证据：**APK 的玩家池动作写入独立的37槽计数数组；单位模板和地图生成点则由实际可用的单位/建筑决定。`performActionsForWave()` 按原始 slot 应用动作，`SpawnPoolManager` 后续只会从实际定义的单位模板和匹配地点中派发。M39 静态审计确认两条 Wave 1 动作分别把四槽清零并设为3；TDM 仅有 Saloon raw112、Fort raw113，没有 Tipi raw114。
- **修正与防回归：**动作校验改为验证 raw slot 位于0–36且同一全表动作不重复，不再要求每个有效槽都拥有本图模板。Wayne Waters 保留四槽的原始动作值，但只定义 Gunslinger/Mexican/Cannon 模板与 Saloon/Fort 生成点；不创建 Indian 模板、Tipi 或虚构出生位置。`dakota-08-campaign-rules.test.ts` 检查四槽动作状态、实际模板和建筑；`campaign-unit-pool.test.ts` 验证无模板槽位可保留计数而不会创造派发单位。
- **根因分类：**这是网页数据契约把“原始计数槽”和“本图可派发模板”过度绑定，不是 APK 反解析遗漏。新增地图前先比较原始动作数组与可用生成对象；空槽/无来源槽仍可保留原始状态，但不能据此创造场景实体。

## 新关卡集成的共享断言与启动预载

**状态：**Snake River（Oregon 第 9 关／全局第 29 关）相关问题已修复、完成整批检查并发布。

### 正式目录变化必须同步旧进度断言

- **表现与复现：**登记第 29 关后，首次完整单测发现 `apache-valley.test.ts`、`content.test.ts`、`progress.test.ts` 的阶段数或目录快照仍停在旧基线；完整 E2E 又发现六处总进度仍写 28 关，以及一个 Free Play 用例仍把已开放的关卡当作禁用。Snake River 自身内容正常，失败来自既有断言过期。
- **根因与证据：**正式关卡登记会同时改变阶段总数、地区可玩数、未实现关卡边界和 Progress 投影。只更新新关内容及本关测试，遗漏了共享目录消费方和其他关卡的历史快照。相关旧断言经核对后均是待更新预期，不是 APK 数据或规则实现问题；这类遗漏不属于逆向证据缺失或反编译文档误读。
- **漏测点：**实现前后只搜索了部分关卡入口，没有全仓检索固定阶段数、地区可玩数、Free Play 可用/禁用边界和 Progress 快照；受影响的旧测试直到批次完整检查才暴露。
- **修复与防回归：**更新三个单测基线及六个 E2E 文件中的七处断言。新增正式关卡时，逐项搜索并核对阶段目录、总进度摘要、地区可玩数、Free Play 边界和所有依赖全局目录的历史 fixture；将完整 `test:ci` 留在批次收尾运行一次，不能用新关定向测试替代。
- **M31 收尾回归：**新增第 30 关后，完整单测发现 `progress.test.ts` 的完整阶段状态快照仍只有29项。补入 `campaign-oregon-10` 的 locked 状态。正式目录增长也会影响尚未覆盖到的完整快照；更新目录时搜索所有固定阶段数组及 Progress projection 断言。

### 地图场景图片必须进入启动预载集合

- **表现与复现：**首波头像预载检查已通过，但代码审查发现 Snake River 的地图、装饰和单位场景图片没有通过启动资源收集器注册。只检查对白头像无法证明新关地图完整进入离线预载。
- **根因与证据：**`src/main.ts` 把头像加入图片列表，却未把 `createOregon09CampaignContent(...)` 的完整关卡内容传给 `collectScenarioImageAssetNames(...)`。关卡 builder、资源文件存在性和对白头像测试各自通过，但它们不覆盖 `main.ts` 的预载接线。此问题是网页集成消费点遗漏，不是 APK 反解析遗漏。
- **漏测点：**`oregon-09-wave-intros.test.ts` 原先只覆盖头像映射与预载，没有断言场景、装饰及单位所引用的图片也在启动集合中。
- **修复与防回归：**将完整 Snake River 场景内容交给启动收集器；扩展 `oregon-09-wave-intros.test.ts`，同时核对场景/装饰/单位图片被收集且对应资源文件存在。新增关卡应分别检查目录、地图预览、`GameSession` 内容、回放工厂和启动图片收集器，不能因为 builder 可生成就假定所有消费点已接通。

- **整批验证与发布：**`CI=1 PLAYWRIGHT_PORT=4180 pnpm run test:ci` 通过类型检查、892 项单测、生产构建和180项 E2E。发布提交 `9fbb26a48c6d75143aaa469ce249f70f18bc3684` 的 GitHub Actions `44023162078` 成功，GitHub Pages 与 Cloudflare Pages 来源 SHA 均匹配。内置浏览器窗口模式、静音验证 Free Play → Oregon → Snake River → 中等难度 → 首波对白与地图；390×844 窄屏画布为约 16:9，页面无横向溢出。没有完整通关、进入全屏或播放音效。

## 自动化暂停测试必须先确认战斗会话已就绪

**状态：M32 已发布并完成线上验收；此前间歇性失败的历史根因仍未查明。**诊断版发布提交 `a14edaa47058a379459e58374828ad7b8f2265d9` 的 Actions `44236563151` 全部相关检查与 Pages 部署成功；远端诊断用例通过并记录到正常的 Escape→暂停板状态流。该成功运行没有解释先前两次失败当时的现场。

- **表现与复现：**GitHub Actions `44221923581` 的 attempt 1、2 都在 `t29-campaign-menu.spec.ts` 中按 Escape 后找不到 `pause-board`；各次其余183项 E2E 通过。本地对该用例单跑并连续重复五次，共6/6通过。加入启动 fallback 和 Wave 1 前置断言后，Actions `44231079917` 仍在 `pause-board` 可见断言失败，其余184项通过；日志显示新增 `wave-status` 非空断言已通过。
- **代码事实与假设边界：**开发用 `?testBattle=1` 曾在 `assetLoadFailureNames` 非空或 `campaignProgressView` 未加载时跳过会话初始化，却仍调用 `showBattleScene()`；此时 `view.wave` 可能为空，`pauseBattleFromHud()` 会因 `!view.wave` 返回。这是已发现且已修正的半初始化路径，但新 Actions 在 `wave-status` 非空前置断言通过后仍失败，所以它不能解释本次失败；也不能排除 `wave-status` 非空与当前有效、可暂停会话并非同一件事。该失败 run 没有记录其他页面/会话状态。
- **漏测点：**原 E2E 只等待 OverlayHost 隐藏；首次补充后只断言 `wave-status` 非空。该文本不能单独证明 UI route 为 battle、会话状态为 running/ready，或 Escape 没有被浏览器/其他监听器拦截。Actions 当前没有上传 Playwright error-context 附件，失败日志也没有应用状态转储。
- **本地诊断：**`t29-campaign-menu.spec.ts` 现在在首个 Escape 前后输出游戏 route、模拟状态、活动 overlay、波次文字、打开的 dialog、页面可见性、Fullscreen 状态和焦点；window capture 与 document bubble 两处记录 Escape target、`defaultPrevented` 及处理后的焦点。`CI=1 PLAYWRIGHT_PORT=43291 pnpm run test:e2e tests/e2e/t29-campaign-menu.spec.ts --workers=1 --repeat-each=3` 三次都得到 `battle/running`、页面可见、无活动 dialog；Escape 到达应用后 `defaultPrevented=true`，状态转为 `battle/paused` 且 `pause-board` 打开。随后 `CI=1 PLAYWRIGHT_PORT=43292 pnpm run test:ci` 通过类型检查、938项单测、生产构建及185项 E2E。该本地结果没有复现 Actions 失败，不能据此判断远端根因；需要远端新 run 的事件与页面状态。
- **修复与防回归：**当档案已加载时，开发测试入口仍按原正式关卡流程打开 Cow Gulch；档案不可读时，通过现有 `requestScenarioOpen()` 与 `replaceSession()` 打开相同正式内容，不改正式菜单或战斗逻辑。`t29-campaign-menu.spec.ts` 现在在 Escape 前确认 `wave-status` 非空，并新增 IndexedDB 不可用时的启动/暂停回归。定向两项和完整 t29 文件7项 E2E、TypeScript 类型检查通过。
- **完整本地检查：**`CI=1 PLAYWRIGHT_PORT=43173 pnpm run test:ci` 通过类型检查、938项单测、生产构建和185项 E2E，耗时约5.8分钟；保留既有 JS chunk 大于500KB提示。
- **远端诊断与发布验收：**此前失败的 Actions `44221923581`、`44231079917` 没有上传 trace/error-context，无法还原失败现场。诊断版 Actions `44236563151` 的远端 E2E 通过，日志记录首次 Escape 前 route=`battle`、simulation=`running`、Wave 1/8、文档可见、无活动 dialog；window capture 时 `defaultPrevented=false`，应用处理后的 document bubble 时为 `true`、焦点是 `pause-continue`；随后 simulation=`paused`、active overlay=`pause-board`。这是一次成功运行的观测，不证明旧失败根因已确定。该 Actions 的应用测试、共享检查和两处 Pages 部署均成功；GitHub Pages 与 Cloudflare Pages 根 `build-info.json` 均返回来源 SHA `a14edaa47058a379459e58374828ad7b8f2265d9`。内置浏览器静音、窗口模式进入 Free Play → Dakota → Loot Lakes → Medium，确认开场对白与地图；未手动通关、未进入全屏或播放音频。
- **结论与防回归：**保留失败时的状态与按键阶段诊断、有效会话前置断言和暂停板可见断言；下一次若复现，先比较失败 run 与本次成功 run 的页面、会话、焦点和事件日志。不要把一次通过写成旧失败已找到原因，也不要重复检查菜单截图、启动 Android、统一延长超时或删掉暂停断言来代替定位。
- **避免重复：**启动测试入口存在的潜在缺陷只能解释它实际满足的失败状态；后来观测不符合该状态时，必须撤销原假设而不是继续把它当成根因。单项本地通过和 `wave-status` 非空都不能代替远端失败点的状态证据。

## 雇佣弹窗必须复刻坐标关系，不只填充文案

- **表现与复现：**雇佣页虽然能取得角色名称、介绍、价格和头像，但文字挤在面板上缘、头像偏离原位，正文最多显示三行；余额不足时隐藏的确认按钮仍留下图标/点击槽，关闭按钮跑到左侧。第一次按新比例改 CSS 后，Playwright 发现通用确认框后定义的 `aspect-ratio: 2 / 1` 覆盖了雇佣框的 `384 / 272`；窄屏几何检查又发现价格会与按钮区重叠。内置浏览器截图还揭示了正文与价格被 `grid` 的弹性空白行拉开，低余额焦点环围出整块按钮空槽。
- **根因与证据：**APK `res/layout/dialog_hire.xml` 与 `res/values/dimens.xml` 给出可恢复的单一坐标系：外框384×272，羊皮纸384×192贴底；头像对齐羊皮纸左上后偏移 x=230、y=−80，换算至外框为 `(230,0)`；文字区边距左/右57、顶部距羊皮纸30、底部35，内侧右填充10；动作按钮在左右20、底部25。网页原有数据入口正确，`src/ui/map-hire-presentation.ts` 已包含姓名、分余额对白与头像文件；缺失在 CSS 布局、优先级和 HTML 动作槽位置。首轮 CSS 几何测试与截图分别找出了比例覆盖、手机重叠、内容空行和隐藏按钮样式覆盖。
- **修复：**让雇佣对话框使用 384:272 比例并等比适配游戏框，羊皮纸按 APK 比例贴底；头像按 APK 的 x=230 位置锚定并保留各资源固有比例（枪手头像为96×96）；标题、对白、价格按原有阅读顺序排列，文字容器滚动而不截断；确认/取消槽独立锚定在框底两侧。缺钱时确认按钮明确 `display:none`，取消按钮仍靠右；键盘焦点环围绕图标，而非包住整块点击区。Playwright 断言覆盖比例、归一化锚点、资源加载、正文/价格/按钮间距及低余额/可雇佣分支。桌面与390×844触屏、中英文定向测试及 TypeScript 检查通过；内置浏览器在窗口模式、静音与0.25×下目视核对低余额和可雇佣状态。
- **漏测点：**旧测试只确认名称和对白文本存在、面板可见且按钮可点击，未测头像 `naturalWidth`、面板设计比例、归一化 dp 锚点、正文省略、低余额隐藏元素是否真的不绘制，或按钮焦点反馈是否符合素材风格。只看 DOM 的 `hidden` 属性不足以证明元素不会绘制；后续还需核对命中和计算样式。
- **防回归：**APK 对话框应先建立外框设计坐标，再将头像、正文、价格和动作分别映射到同一坐标系；将长宽比/归一化位置写成断言，不能只搬字面 font-size 或凭单张桌面截图判断。样式审查须留意后定义的同优先级通用规则覆盖专属布局、作者样式覆盖 `[hidden]`、窄屏内容把价格推入动作槽、焦点环框出大块透明按钮槽等情况。通过截图核对字重/对齐/素材关系，同时用可计算的几何断言防止布局回归。

- **整批发布与线上验收：**修复批次发布提交为 `ede0a501680244b16e99898ee4baf0e387c91f9d`；GitHub Actions `45149494428` 的应用测试、共享检查、GitHub Pages 和 Cloudflare Pages 部署均成功，两处 `build-info.json` 返回相同 `sourceSha`。本地 `CI=1 PLAYWRIGHT_PORT=4193 pnpm run test:ci` 通过类型检查、1140项单测、生产构建及203项 E2E；保留主 JS chunk 超500KB提示。内置浏览器静音、窗口模式核对主菜单、Options、关卡介绍和低余额雇佣弹窗；公开截图显示角色头像位于羊皮纸上方，名字、对话和价格位于左侧，弹窗留在游戏框内。未启用全屏、声音、Android，也未完整游玩关卡。
