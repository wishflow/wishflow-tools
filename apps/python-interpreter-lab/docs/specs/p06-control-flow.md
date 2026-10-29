# P6 规格候选：控制流、短路与循环

对应整体计划：[P6 控制流](../implementation-plan.md)。本文是实施前的范围提案，尚待用户确认；确认前不开始 P6 代码实现。P5 已发布能力和共同前端约束继续有效。

## 1. 目标

在教学 VM 中增加可逐指令观察的条件、逻辑求值和循环。用户应能从源码、嵌套 AST 和教学指令看出：条件如何决定分支、`and`/`or` 如何短路、循环如何回跳，以及运行步数上限如何阻止无限执行。

本阶段只扩展 TypeScript 教学 VM，不改变真实 CPython/Pyodide 的分析和执行语义。P5 的表达式、赋值、`print`、Worker 边界和历史行为继续工作。教学指令集若按本提案扩展，版本标记升为 `mini-vm-v2`，不得称为 CPython 字节码。

## 2. 待确认的范围提案

| 类别 | 提案纳入 | 明确暂不纳入 |
| --- | --- | --- |
| 语句 | `if/elif/else`、`while`、`for name in range(...)`；可嵌套块 | `break`、`continue`、循环 `else`、`pass`、一般迭代器 |
| 比较 | `==`、`!=`、`<`、`<=`、`>`、`>=`；单个比较运算 | 比较链、`is`、`in`（除 `for` 语法）、复杂对象比较 |
| 逻辑 | `not`、`and`、`or`；遵循 Python 的优先级、真值和短路返回值 | 位运算、赋值表达式 |
| 值 | 增加 `bool` 和 `True`/`False`；延续 `int`、`str` | `None`、浮点、容器和自定义对象 |
| 循环源 | `range(stop)`、`range(start, stop)`、`range(start, stop, step)`，参数为整数表达式 | `range` 作为任意表达式值、其他序列或迭代协议 |
| 块缩进 | 以空格缩进、可嵌套、精确匹配已打开的缩进层级 | Tab 缩进、行续接、括号隐式续行、分号语句 |

缩进提案允许任意正数个空格形成一个新层级；退回时必须匹配先前层级。Tab 不可出现在行首缩进中；代码行之间的普通空格与制表符仍可作分隔空白。空行及纯注释行不改变块结构。块必须至少包含一条语句。

## 3. 语法提案

```ebnf
program        ::= (NEWLINE | statement NEWLINE)* statement? EOF
statement      ::= simpleStatement | ifStatement | whileStatement | forStatement
simpleStatement ::= NAME "=" expression
                  | "print" "(" [expression ("," expression)*] ")"
ifStatement    ::= "if" expression ":" NEWLINE INDENT suite DEDENT
                   ("elif" expression ":" NEWLINE INDENT suite DEDENT)*
                   ("else" ":" NEWLINE INDENT suite DEDENT)?
whileStatement ::= "while" expression ":" NEWLINE INDENT suite DEDENT
forStatement   ::= "for" NAME "in" "range" "(" rangeArgs ")" ":"
                   NEWLINE INDENT suite DEDENT
rangeArgs      ::= expression ("," expression ("," expression)?)?
suite           ::= statement (NEWLINE statement)* NEWLINE*
expression      ::= orExpression
orExpression    ::= andExpression ("or" andExpression)*
andExpression   ::= notExpression ("and" notExpression)*
notExpression   ::= "not" notExpression | comparison
comparison      ::= additive [comparisonOperator additive]
comparisonOperator ::= "==" | "!=" | "<" | "<=" | ">" | ">="
additive        ::= multiplicative (("+" | "-") multiplicative)*
multiplicative  ::= unary ("*" unary)*
unary           ::= "-" unary | primary
primary         ::= INTEGER | STRING | "True" | "False" | NAME | "(" expression ")"
```

该语法仍不支持跨物理行的表达式。`range(...)` 只允许出现在 `for` 头部；`if`、`while` 和 `for` 的块可相互嵌套，最大嵌套深度沿用 100。词法器通过 `INDENT`/`DEDENT` 表示块边界；未匹配的缩进、意外缩进、缺少冒号、缺少块体均在执行前产生带源码位置的诊断。

## 4. 值与运算语义提案

教学运行时新增 `bool`。`True`/`False` 在显示和快照中保留布尔类型；在本阶段承诺的数值运算中按 Python 的整数子类型规则参与 `+`、`-`、`*`、一元负号和整数比较，运算结果为 `int`。`print` 输出 `True` 或 `False`。字符串拼接仍只接受 `str + str`。

比较规则如下：

| 左右值 | `==` / `!=` | 大小比较 |
| --- | --- | --- |
| `int` 与 `int`，或 `bool` 与 `int/bool` | 按数值比较（`False == 0`、`True == 1`） | 按数值比较 |
| `str` 与 `str` | 按内容比较 | 按 Unicode 码点的字典序比较 |
| 其他不同类型 | `==` 为假，`!=` 为真 | 运行期 `TypeError` 诊断 |

比较结果和 `not` 结果为 `bool`。真值规则：`False`、整数 `0` 和空字符串为假；其余当前支持的标量为真。`and` 与 `or` 从左到右求值并短路，分别返回决定结果的左操作数，或在需要时返回右操作数；不强制转换为布尔值。优先级为算术、比较、`not`、`and`、`or`。比较链（如 `1 < x < 3`）不纳入本阶段。

`range` 参数必须是 `int` 或 `bool`，并按整数值解释；参数表达式在进入循环前只求值一次。停止值不包含在迭代结果中；默认起点为 `0`、默认步长为 `1`，允许正负步长，步长为 `0` 时产生明确运行期诊断。空区间不执行循环体。非空循环结束后保留最后一次绑定的循环变量；零次循环不创建该绑定，也不覆盖先前绑定。

## 5. 教学指令提案

P6 扩展后的版本标记提案为 `mini-vm-v2`。跳转参数是教学指令数组索引，绝不是 CPython offset。

| 新指令 | 行为 |
| --- | --- |
| `COMPARE_OP operator` | 弹出两个值，按比较规则压入 `bool` |
| `JUMP target` | 无条件设置下一指令位置 |
| `POP_JUMP_IF_FALSE target` | 弹出条件值；假则跳到目标，否则顺序执行 |
| `JUMP_IF_FALSE_OR_POP target` | 栈顶为假时保留左值并跳转；为真时弹出左值、求值右侧 |
| `JUMP_IF_TRUE_OR_POP target` | 栈顶为真时保留左值并跳转；为假时弹出左值、求值右侧 |
| `BUILD_RANGE count` | 消费 1–3 个已求值参数，压入惰性教学 range 值 |
| `GET_ITER` | 将教学 range 值转换为教学迭代器并压栈 |
| `FOR_ITER target` | 有下一个值时压入该值；迭代结束时弹出迭代器并跳到目标 |

编译器负责回填所有跳转目标，并确保目标在 `[0, instructionCount)` 范围内。`FOR_ITER` 的内部迭代状态以有界、不可变的快照摘要显示，不复制与区间长度成比例的值。

## 6. 执行状态和用户可见反馈

- `step` 仍然恰好执行一条教学指令；跳转指令改变 `pc` 后，当前指令、下一条指令和历史快照必须保持一致。
- 快照增加只读控制流转移摘要，至少标明最近一次条件/短路/迭代决策、决策结果及实际下一条教学指令。摘要属于教学 VM 状态，不代表 CPython 内部执行事件。
- 指令面板展示跳转目标；执行后同时高亮刚执行指令与实际下一指令。分支、短路和 `FOR_ITER` 的决策以中英文状态文案解释。嵌套 AST 节点仍支持源码定位。
- 程序在 Worker 内运行并沿用每 8 条指令让出约 16 ms 的既有调度；收到暂停后在指令边界确认暂停。
- 教学 VM 每次编译/重置创建新的预算。动态执行总量候选上限为 5,000 条指令（包含跳转和 `HALT`）；达到上限时，以明确 runtime 诊断标出下一条尚未执行的指令，支持复位后重新运行。编译指令、源码、Token、整数、字符串、输出和历史仍沿用 P5 预算。
- 栈值与变量面板必须安全显示 `bool`、range 和迭代器摘要；不得通过任意 JS 求值、Python 执行或网络访问展示值。

## 7. 前端与兼容性

- 不增加依赖、路由、共享语言状态或应用内侧栏；继续使用现有 React、TypeScript、Vite、`@wishflow/site-shell` 与独立 Teaching VM Worker。
- 教学面板标明 `mini-vm-v2`。真实 CPython 面板保持真实运行时和既有回放语义，不复用教学跳转状态。
- 所有新增错误、AST 节点、指令状态和控件说明接入共享中英文词条；键盘操作、可见焦点、窄屏内部滚动及 `prefers-reduced-motion` 与 P5 保持一致。
- 编译结果无持久化。P6 若整体回滚，回退到 P5 `mini-vm-v1`；不迁移或重写真实 CPython 编译结果。

## 8. 验收提案

### 8.1 编译与步进

- AST 正确表达嵌套块、`elif` 链、比较、逻辑运算和源码范围；缩进错误均在运行前诊断。
- 指令目标、条件弹栈与短路保留操作数符合手算预期；`for/range` 使用惰性迭代，不展开整个区间。
- 单步只推进一条指令；浏览历史不更改执行头；暂停、重置和旧会话隔离继续有效。

### 8.2 语义样例

| 源码要点 | 预期结果 |
| --- | --- |
| `print(False or "fallback")` | 输出 `fallback` |
| `print(True and 3)` | 输出 `3`；短路指令先执行且保留左值 |
| `print(False and missing)` 与 `print(True or missing)` | 不读取 `missing`，不产生 `NameError` |
| `if 0 / elif "x" / else` | 只执行 `elif` 块 |
| `while i < 3`，每轮打印并自增 | 依次输出 `0`、`1`、`2` |
| `range(2, -1, -1)` | 依次迭代 `2`、`1`、`0` |
| `range(0)` | 循环体零次执行；循环变量不新建 |
| `range(1, 2, 0)` | 可定位的步长为零诊断 |
| `while True` 且无退出条件 | 可请求暂停；未暂停时到达 5,000 指令预算并说明原因 |

### 8.3 回归和发布

- 单测独立核对 Token/indent/dedent、AST、指令目标、每条 VM 状态、真值、比较、短路、range 边界、动态步数上限及历史不可变性。
- 浏览器测试用真实页面与 Worker 覆盖分支、嵌套循环、暂停/预算、错误定位、双语和历史回看；检查 320/768/1024/1440px 页面无横向溢出。
- 对共同子集使用固定 Pyodide CPython 3.14.2 核对最终输出和对应错误类别；对短路样例确认未执行分支不会触发未定义名字错误。
- 应用 `pnpm run test:ci`、根 `pnpm run test:catalog`、根 `pnpm run build:site` 和 `git diff --check` 通过后，按仓库发布流程合并、推送，等待 workflow 成功并在正式 URL 实测双引擎。

## 9. 风险与处理

| 风险 | 影响 | 提案处理 |
| --- | --- | --- |
| INDENT/DEDENT 与空行、注释和 CRLF 组合处理不一致 | AST 块层级错或诊断位置不准 | 先定义行首空白扫描规则；以空格计列，给每种边界准备独立词法和 Parser 预期 |
| 回填跳转目标偏移一位 | 分支或循环执行错位 | 将目标定义为下一条指令索引；测试执行头与每次转移结果 |
| 无限循环占用 Worker | 页面操作无响应 | 继承批次让出与暂停控制，并加 5,000 动态指令预算 |
| bool、int 关系与 JavaScript 类型规则混淆 | 输出看似正确但教学语义错误 | 使用显式运行时类型和逐项运算表，不依赖 JS 真值或宽松比较 |
| 循环历史过大 | 序列化和 UI 渲染成本升高 | 保留最近 500 个快照，range 惰性迭代，沿用增量历史协议 |

## 10. 回滚

P6 所有语义由独立教学引擎提供；回退 P6 的提交集合并恢复 `mini-vm-v1` 标签和支持说明，即可保留真实 CPython 和 P5 能力。若后续阶段依赖 P6，按整体计划的依赖回滚规则处理。

## 11. 用户确认项

开始实现前需确认：布尔值/真值及 `and/or` 返回操作数的 Python 语义；字符串比较、bool 与 int 的比较和数值规则；空格缩进与嵌套块范围；`range` 参数形式与步长错误；5,000 条动态指令预算；不含 `break/continue`、比较链和循环 `else` 的边界。确认后本文件转为实施基线，任何变化先更新 spec 和 tasks。
