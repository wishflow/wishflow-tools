# P6 任务：控制流、短路与循环

对应规格：[P6 控制流](../specs/p06-control-flow.md)。用户已确认支持表；本文件和规格是实施基线。实现沿用 P5 的纯前端、独立 Teaching VM Worker、共享站点壳和语言状态约束。

## 顺序与依赖

```mermaid
flowchart LR
    A[已确认 P6 支持表] --> T01[T01 布尔与比较表达式]
    T01 --> T02[T02 缩进块与 if/elif/else]
    T02 --> T03[T03 while 与动态步数预算]
    T03 --> T04[T04 惰性 range 与 for]
    T04 --> T05[T05 双引擎回归、可访问性与验收]
    T05 --> T06[T06 发布与线上验证]
```

每个 T01–T04 都是完整的可编译、可步进、可运行切片，不长期交付只有 Lexer/Parser、只有 Compiler 或只有 UI 的孤立阶段。引入新依赖、通用语法框架、共享执行协议或改变站点壳都不在本阶段范围内；如确需调整先更新文档并确认。

## T01：布尔值、比较与短路表达式

- **用户结果**：教学 VM 能观察 `True`/`False`、真值、比较、`not`、短路 `and/or`，并在 `print` 中显示表达式结果。
- **改动范围**：词法关键字与比较运算符、表达式 AST/Parser/Compiler、`mini-vm-v2` 值与指令、教学面板值格式和中英文词条。
- **验收**：比较优先级正确；`and/or` 保留并返回决定结果的操作数；短路右侧未定义名字不报错；bool 数值子类型规则按确认后的运算表执行；不支持的比较在正确阶段给出定位诊断。
- **验证**：词法/AST/编译单测对照独立预期；VM 单步检查布尔栈值与比较结果；Playwright 覆盖短路和 UI 文案；既有 P5 算术、字符串和 `print` 样例继续通过。
- **依赖**：P6 支持表已确认。
- **主要文件**：`src/teaching-vm/types.ts`、`tokenizer.ts`、`parser.ts`、`compiler.ts`、`vm.ts`、教学视图及对应 tests/e2e。

## T02：空格缩进块与 `if/elif/else`

- **用户结果**：输入嵌套条件块，逐步看到条件判断、跳转目标和选中分支的输出。
- **改动范围**：行首缩进扫描、`INDENT`/`DEDENT`、条件语句 AST、跳转指令生成和执行、嵌套 AST/source link。
- **验收**：正确处理空行、注释、CRLF、嵌套层级、多个 `elif`、可选 `else`；空块、缺冒号、意外缩进、Tab 缩进、错误 dedent 均在执行前报错；未选分支没有运行期副作用。
- **验证**：Token/Parser 测试精确检查缩进 token 与 UTF-16 源码范围；Compiler 测试核对跳转目标；VM 对每条指令核对 `pc`、栈和输出；Playwright 验证状态摘要解释真实下一指令。
- **依赖**：T01。
- **主要文件**：`src/teaching-vm/tokenizer.ts`、`parser.ts`、`types.ts`、`compiler.ts`、`vm.ts`、`TeachingVmPanel.tsx`、相关 styles/locales 和 tests/e2e。

## T03：`while` 与动态执行预算

- **用户结果**：逐步执行循环条件回测与回跳；死循环可暂停，并在未暂停时获得明确预算诊断。
- **改动范围**：`while` AST/编译、条件指令、VM 动态指令计数和状态快照，不改变 Worker 消息身份协议。
- **验收**：每次回跳都会重新求值条件；零次循环不执行块；嵌套循环顺序正确；每次单步只执行一条指令；达到已确认的 5,000 步预算时在下一条指令位置终止并允许复位重跑。
- **验证**：VM 单测用手算步数检查边界；真实 Worker/Playwright 验证暂停响应和预算错误；覆盖步数超限后的 reset 与新会话。
- **依赖**：T02。
- **主要文件**：`src/teaching-vm/resource-limits.ts`、`compiler.ts`、`vm.ts`、`src/worker/teaching-vm.worker.ts`（仅在必要时）、对应 tests/e2e。

## T04：惰性 `range` 与 `for`

- **用户结果**：逐步查看 `for name in range(...)` 如何产出迭代值、执行循环体并结束。
- **改动范围**：for/range 语法、Compiler 迭代指令、range/iterator 内部值与有界快照格式。
- **验收**：1/2/3 参数、默认值、正负步长、停止值排除、空区间、零步长和目标变量绑定符合确认的表；在范围很大时不按区间长度分配内存；零次迭代不覆盖名字；每次单步和历史都能解释迭代器状态。
- **验证**：编译器核对 `BUILD_RANGE`/`GET_ITER`/`FOR_ITER` 目标；VM 单测覆盖参数顺序及正负区间；Playwright 检查迭代器快照、输出和历史截断。
- **依赖**：T03。
- **主要文件**：`types.ts`、`parser.ts`、`compiler.ts`、`vm.ts`、`TeachingVmPanel.tsx`、locales、styles 和 tests/e2e。

## T05：双引擎回归、可访问性与 P6 验收

- **用户结果**：P6 控制流在中英文、键盘和窄屏下可观察，真实 CPython 模式仍能独立分析和运行。
- **验收**：覆盖 P5 全量既有边界、P6 已确认语法与错误；检查 320/768/1024/1440px 无页面横向溢出、焦点可见、动态效果遵守偏好；Pyodide 3.14.2 对照共同子集输出和错误类别。
- **验证**：完整应用 CI、根 catalog 检查、共享站点构建、生产子路径资源检查；按 P6 spec 完成一次真实页面与 Worker 操作。
- **依赖**：T01–T04。
- **主要文件**：相关测试、必要的样式/文案，以及本阶段执行记录。

## T06：文档、发布与线上验证

- **用户结果**：`mini-vm-v2` 在正式站点公开，计划、README、应用契约准确反映发布范围。
- **验收**：完成代码审查、文档链接与差异检查，按仓库流程提交、合并 `master`、推送；现有 workflow 成功；Codex 内置浏览器验证真实 CPython 与教学模式、分支、循环、预算和暂停。
- **验证**：发布前运行 `pnpm run test:ci`、根 `pnpm run test:catalog`、根 `pnpm run build:site`；发布后记录 workflow URL、正式页面结果及文档副本。
- **依赖**：T01–T05。
- **当前状态**：T01–T05 本地验收完成；进入 T06，待提交、合并、发布及正式站点验证。

## 执行记录

| 任务 | 状态 | 结果 |
| --- | --- | --- |
| T01 布尔值、比较与短路表达式 | 完成 | 单测覆盖布尔数值语义、Unicode 码点比较和短路操作数；58 项应用单测通过，真实 Worker 浏览器用例通过。 |
| T02 空格缩进块与 `if/elif/else` | 完成 | 单测覆盖空行、注释、CRLF、嵌套、Tab 和错位缩进；嵌套分支 Worker 用例通过。 |
| T03 `while` 与动态执行预算 | 完成 | 单测验证回跳及第 5,000 条动态指令边界；浏览器验证无限循环预算诊断、暂停与重置。 |
| T04 惰性 `range` 与 `for` | 完成 | 单测覆盖 1–3 参数、bool 参数、正负步长、空区间、零步长及大区间惰性摘要；浏览器输出和迭代器状态通过。 |
| T05 双引擎回归、可访问性与 P6 验收 | 完成 | 在应用目录运行 `env CI=1 PLAYWRIGHT_PORT=49332 pnpm run test:ci` 通过：58 项应用单测、28 项 Playwright 用例、类型检查和应用构建通过；仓库根目录 `pnpm run test:catalog` 的 14 项检查通过；根 `pnpm run build:site` 成功构建共享站点及应用子路径资源。Pyodide 3.14.2 共同子集结果与错误类别对照、P6 AST 展示、Worker 暂停/重置/预算及响应式视口检查均通过。 |
| T06 文档、发布与线上验证 | 进行中 | 本地验收通过；待提交、合并、推送 `master`，确认现有发布 workflow 成功，并在正式站点验证真实 CPython 和教学模式。 |
