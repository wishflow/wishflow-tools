# V3 Tasks：操作数栈与对象引用动画

依据：[V3 规格](../specs/v03-operand-stack-and-reference-animation.md)及[体验实施计划 V3](../visual-execution-plan.md#v3操作数栈与对象引用动画)。实现只从教学 VM 的有界快照历史派生讲解画面；Worker 与 VM 执行语义保持不变。

## 实施顺序

- [ ] **T01：派生有界指令过渡**
  - 验收：从相邻历史快照和真实教学指令识别 LOAD、运算、STORE_NAME、BUILD_LIST/BUILD_MAP、STORE_SUBSCR；根据稳定帧/变量/对象身份说明动作。
  - 验证：纯函数测试覆盖算术、别名、列表原位修改、新对象、空栈、重复标量、循环引用、断续/截断历史、帧变化、未知指令；每个源码步最多返回 12 个动画过渡并报告省略数。
  - 文件：新增 `src/teaching-vm/animation.ts`；新增 `tests/teaching-animation.test.ts`；按需复用现有 observation 辅助逻辑，不重复实现 VM 状态比较。

- [ ] **T02：串行讲解播放与生命周期**
  - 验收：新增独立播放控制；一次只请求 `stepSource('over')`，等 Worker 响应并完成本步展示后才发下一请求；运行与演示速度分离。Worker 执行中暂停必须等待真实响应；展示中暂停取消定时器且不再推进。
  - 验证：对连续播放、Worker 暂停、展示中暂停、断点、终态、运行错误、历史游标限制、Reset/编辑/编译/引擎切换和快速连续点击验证无并发请求或旧帧回流。
  - 文件：按最小边界实现 `src/teaching-vm/useTeachingPlayback.ts` 或在现有教学 VM hook 中增加小型调度；`src/App.tsx` 连接已确认的 VM API；不增加 Worker 消息。

- [ ] **T03：快照驱动的栈/变量/堆演示 UI**
  - 验收：同一展示快照驱动源码动作、栈、变量和堆；局部高亮不移动对象；别名、对象创建和条目修改可辨；播放结束/暂停后展示 Worker 最新确认快照。
  - 验证：键盘/焦点、无动画与减少动态效果状态、中英切换及 320/768/1024/1440px；自动化覆盖主例和已有调试控制回归。
  - 文件：`src/components/SourcePanel.tsx`、`src/components/TeachingVmPanel.tsx`、`src/components/TeachingHeapPanel.tsx`（若需要目标高亮）、`src/locales.ts`、`src/styles.css`、相关 `e2e/*.spec.ts`。

- [ ] **T04：双语使用说明与路线状态同步**
  - 验收：中英文帮助页说明讲解播放与 Run 的差异、暂停确认、对象引用动画与减少动态效果；仅记录已实现能力。路线将 V3 状态更新为实际本地/线上验证结果。
  - 验证：两种语言术语一致、相对链接有效、`git diff --check`。
  - 文件：`docs/guide/usage.zh-CN.md`、`docs/guide/usage.en.md`、`docs/visual-execution-plan.md`、本 tasks。

- [ ] **T05：整体验证、提交、发布与线上实测**
  - 验收：规格所列单测、类型检查、构建、浏览器测试、catalog 和整站构建均通过；部署成功后线上核对讲解播放与双引擎。
  - 验证：应用 `typecheck`、`test:unit`、`build`、`test:e2e`；`pnpm test:catalog`、`pnpm build:site`；通过后提交，合并到 `master`、推送并等待相关 Actions，通过 Codex 内置浏览器在线验收。
  - 文件：依测试结果所需的教学 UI/测试/说明文件。

## 检查点

- **检查点 A（T01）**：动作只由连续记录的前后态和真实 VM 指令构造；对象身份不以显示文本代替；历史/队列有界。
- **检查点 B（T02–T03）**：播放调度与 Worker 确认可区分；连续请求严格串行；暂停/取消/会话代次不会造成幽灵动画；所有运行现场同源于一个展示快照。
- **检查点 C（T04–T05）**：Help、V3 路线、生产 UI 和双引擎现状一致；线上数据来源没有被描述为真实 CPython。

## 执行记录

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| Spec 与 tasks | 已完成 | 已确认独立讲解播放、串行 Step Over、Worker 暂停确认、12 条上限与 240ms 固定演示时长 |
| 实现 | 未开始 | — |
| 本地验证 | 未开始 | — |
| CI/CD | 未开始 | — |
| 线上验收 | 未开始 | — |

## 回滚

移除 V3 展示调度与栈/引用高亮，回到 V2 的静态分组/差异和既有运行控制；不回滚教学 VM/Worker 执行语义。
