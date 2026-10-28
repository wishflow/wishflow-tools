# P2 规格：真实 Token 与源码联动

对应整体计划：[P2 词法观察与源码联动](../implementation-plan.md)。本阶段在 P1 的 Pyodide/CPython 编译结果上增加真实 Token 列表和源码定位；不执行用户代码，也不改变已发布的 AST、代码对象和字节码语义。

## 1. 用户目标与范围

用户分析一段成功解析并编译的源码后，可以查看 CPython `tokenize` 生成的 Token，并在源码、Token、AST 节点和当前代码对象的字节码指令之间来回定位。映射只使用真实的源码范围；一个源码范围可以关联多个 AST 节点或字节码指令，也可以没有关联项。

本阶段包括：

- 在现有 Pyodide Worker 中使用固定运行时的 `tokenize.generate_tokens()` 生成真实 Token。
- 展示 Token 类型、运算符精确类型、文本、起止行列和截断状态。
- 在源码 textarea、Token 项、AST 节点和字节码指令之间建立多对多的范围映射。
- 显式转换 Python 位置单位与浏览器 textarea 的 UTF-16 选区单位，支持中文、非 BMP 字符、制表符和多行范围。
- 使用共享站点语言状态提供中英文界面；保持键盘可操作和窄屏布局。

不包括自研 tokenizer、高亮编辑器替换、词法语法错误恢复、逐字节码执行、Trace 回放和教学 VM。无需新增运行时依赖、路由或站点资源。

## 2. 数据来源和位置单位

固定 Pyodide 314.0.7 提供 CPython 3.14.2。Token 数据来自 `tokenize.generate_tokens(io.StringIO(source).readline)`；只有 `ast.parse()` 成功后才调用，因为 Python 官方文档说明该模块只保证处理语法有效的 Python 源码。若源码解析失败，继续显示 P1 的解析诊断，不展示 Token 或联动结果。

| 来源 | 行列约定 | 转换要求 |
| --- | --- | --- |
| `tokenize.TokenInfo.start/end` | 行号从 1 开始；列号从 0 开始，按 Unicode 码点计数；结束位置不包含在范围内 | 将每行码点列转换成 JS UTF-16 code unit 偏移 |
| `ast` 节点 `lineno/col_offset/end_lineno/end_col_offset` | 行号从 1 开始；列号是 UTF-8 字节偏移；结束列不包含在范围内 | 将每行 UTF-8 字节边界转换成 JS UTF-16 code unit 偏移 |
| `dis.Instruction.positions` | 使用编译器记录的精确起止位置；单位与 CPython 代码位置一致 | 复用 AST 的 UTF-8 字节位置转换；任一字段缺失或边界不合法时不建立映射 |
| 浏览器 textarea | `selectionStart/selectionEnd` 按 UTF-16 code unit 计数 | 直接使用统一的源码范围 |

范围统一表示为源码 UTF-16 偏移的半开区间 `[start, end)`。转换器为每行预计算码点列、UTF-8 字节列与 UTF-16 偏移的边界表；不按视觉列扩展 Tab。偏移落在多字节字符中间、超出行边界或位置缺失时返回“无源码范围”，禁止截断到邻近字符或推测整行位置。

来源：Python 3.14 的 [AST 位置说明](https://docs.python.org/3.14/library/ast.html)、[`dis.Instruction.positions`](https://docs.python.org/3.14/library/dis.html#dis.Instruction.positions)、[`tokenize.generate_tokens` 与 `TokenInfo`](https://docs.python.org/3.14/library/tokenize.html#tokenize.TokenInfo) 以及 [PEP 657 位置语义](https://peps.python.org/pep-0657/)。

## 3. Token 结果结构与资源上限

成功的 `AnalysisResult` 增加 `tokens`、`tokensTruncated` 和可选的 `tokenizationError`：

| 字段 | 内容 |
| --- | --- |
| `tokens` | 按 CPython 生成顺序排列的 DTO；每项包含稳定序号、`type`、`exactType`、`text`、`textTruncated`、`start` 和 `end` |
| `tokensTruncated` | 达到 Token 数量上限时为 `true`，表明后续 Token 未发送 |
| `tokenizationError` | Tokenizer 在 AST 与 compile 成功后仍异常时记录有限长度的类型和消息；保留 AST/字节码结果 |

运算符和分隔符保留 CPython 的通用 `OP` 类型及 `exact_type`，界面可显示为 `OP · PLUS` 等形式。`generate_tokens()` 不产生 `ENCODING` token；空文本的 `ENDMARKER`、无文本的 `DEDENT` 等结构 Token 仍按真实结果列出，但没有非空源码范围时不可定位。

- 最多序列化 5,000 个 Token；超出后停止迭代并显示截断提示。
- 单个 Token 文本最多传输 256 个 Unicode 码点；超出时截断展示字符串并设置 `textTruncated`。定位始终依据原始源码范围，不依赖展示文本。
- 继续遵守 P1 的 20,000 UTF-16 code units 源码上限及 Worker 请求/会话隔离。
- Token 表默认折叠，展开后在自身滚动区域内浏览；不得引入页面横向滚动。
- Tokenizer 异常不能抹掉已成功的 AST、代码对象和字节码；展示双语局部诊断和重分析路径。

## 4. 交互行为

| 操作 | 结果 |
| --- | --- |
| 分析有效源码 | 同一份源码的 Token、AST 和字节码结果一起出现；源码绑定当前分析会话 |
| 在源码中选择一段文字 | 选区成为当前源码范围；高亮所有与之相交的 Token、AST 节点和当前代码对象指令 |
| 在源码中放置光标 | 若光标位于某个 Token 的半开范围内，以该 Token 的完整范围作为当前映射；空白位置不推断 Token，清除范围联动 |
| 激活 Token 项 | 将源码 textarea 聚焦并选中 Token 的真实范围；高亮所有与该范围相交的 AST 节点和当前代码对象指令 |
| 激活 AST 节点 | 展开/折叠树节点的同时定位其真实范围；高亮所有相交 Token 与字节码指令 |
| 激活字节码指令 | 定位该指令的真实范围；高亮所有相交 Token 与 AST 节点 |
| 激活没有有效范围的结构 Token、AST 节点或指令 | 保留触发项的键盘/视觉焦点，显示“无可定位源码范围”；清除其他面板的范围高亮，不以行号推测范围 |
| 源码更改、清空或恢复示例 | 立即清除旧 AST、Token、字节码和联动状态；继续沿用 P1 的分析流程 |
| 更换代码对象 | 保留当前源码选区；字节码面板只按当前所选代码对象中的真实范围更新匹配指令 |
| Token 数量达到上限 | 保留已返回 Token 并显示明确截断提示；已返回的范围仍可联动 |
| 语法错误 | 显示 P1 诊断，不调用 `tokenize`，不显示旧 Token 或旧映射 |
| AST 成功但 compile 失败 | 沿用 P1 当前错误响应合同，不保留本次的部分 AST/Token，也不显示旧映射 |

源码范围以半开区间判断相交：`a.start < b.end && b.start < a.end`。复合表达式中多个真实指令可能与一个 AST 节点或 Token 相交；必须全部标示，不人为选择唯一匹配。注释、空白和结构 Token 没有 AST/字节码匹配时，只显示其真实 Token 与源码，不伪造关系。

映射状态只属于当前源码和当前分析结果。程序化定位更新 textarea 选区时不能触发反馈循环并覆盖原始选择来源；源码编辑或新分析必须丢弃上一结果的所有映射。

## 5. 可访问性与文案

- Token 表、AST 节点和字节码定位操作都可通过键盘触发，焦点可见，控件名称说明其目标。
- 高亮除了颜色外还使用背景/边框或选中标记；满足 `prefers-reduced-motion` 时保持相同状态、不依赖动画。
- Token 表和字节码表在窄屏下各自滚动；新增面板不使页面产生横向溢出。
- 所有新文案经 `registerMessages`/共享语言状态注册，至少包括 Token 面板标题、类型/文本/起止位置、无范围、无匹配、截断及 Tokenizer 异常。
- 不增加应用本地的语言切换按钮或持久化状态。

## 6. 验收标准

1. 使用固定 Pyodide 中的 CPython Tokenizer：`x = 1 + 2` 中 `+` 显示为 `OP · PLUS`，字符串和注释保留其真实 Token 文本；缩进、换行和结束标记保留真实种类。
2. 光标位于 `x`、`1` 或 `+` 时，源码 Token、AST 节点和相关指令高亮一致；选中整个表达式时显示所有相交项。
3. 点击 Token、AST 节点和字节码指令可选中正确的源码范围；嵌套函数代码对象的指令仍映射到函数正文。
4. 中文标识符、包含 emoji 的字符串、Tab、跨行表达式及 CRLF 输入的定位准确；不同的码点/UTF-8/UTF-16 计数不造成偏移一位或半个代理对。
5. 常量折叠只呈现真实存在的指令；位置不存在的内部指令不扩展为整行映射。注释和空白显示无匹配，不虚构 AST/字节码。
6. Token 上限和长 Token 展示截断正确；Tokenizer 异常保留有效 AST/字节码；语法错误和 compile 错误清除旧联动并继续显示原诊断。
7. 键盘可完成各面板定位；中英文状态同步；320、768、1024、1440px 下无页面横向溢出。
8. 应用 `test:ci`、根 `test:catalog`、根 `build:site` 通过；P2 合并发布后，正式站点至少实测 Token、中文/emoji 偏移以及源码、AST、字节码双向定位。

## 7. 回滚

回滚本阶段的 Token 展示、位置转换与联动组件即可恢复 P1 的源码、AST 和字节码工作区。Worker 新增字段为加法，不改变 P1 字段；无需迁移存档或共享站点资源。
