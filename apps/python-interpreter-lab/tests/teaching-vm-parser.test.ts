import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTeachingSource } from '../src/teaching-vm/parser';
import { tokenizeTeachingSource } from '../src/teaching-vm/tokenizer';
import { TeachingDiagnostic } from '../src/teaching-vm/types';

test('tokenizes escaped strings, comments, CRLF, and UTF-16 source positions', () => {
  const tokens = tokenizeTeachingSource('x = "🐍\\n" # note\r\nprint(x)');

  assert.deepEqual(tokens.map(({ type, lexeme, literal, span }) => ({
    type,
    lexeme,
    literal,
    start: span.start,
    end: span.end,
    line: span.line,
    column: span.column,
    endLine: span.endLine,
    endColumn: span.endColumn,
  })), [
    { type: 'NAME', lexeme: 'x', literal: null, start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 },
    { type: 'EQUAL', lexeme: '=', literal: null, start: 2, end: 3, line: 1, column: 3, endLine: 1, endColumn: 4 },
    { type: 'STRING', lexeme: '"🐍\\n"', literal: '🐍\n', start: 4, end: 10, line: 1, column: 5, endLine: 1, endColumn: 11 },
    { type: 'NEWLINE', lexeme: '\r\n', literal: null, start: 17, end: 19, line: 1, column: 18, endLine: 2, endColumn: 1 },
    { type: 'PRINT', lexeme: 'print', literal: null, start: 19, end: 24, line: 2, column: 1, endLine: 2, endColumn: 6 },
    { type: 'LEFT_PAREN', lexeme: '(', literal: null, start: 24, end: 25, line: 2, column: 6, endLine: 2, endColumn: 7 },
    { type: 'NAME', lexeme: 'x', literal: null, start: 25, end: 26, line: 2, column: 7, endLine: 2, endColumn: 8 },
    { type: 'RIGHT_PAREN', lexeme: ')', literal: null, start: 26, end: 27, line: 2, column: 8, endLine: 2, endColumn: 9 },
    { type: 'EOF', lexeme: '', literal: null, start: 27, end: 27, line: 2, column: 9, endLine: 2, endColumn: 9 },
  ]);
});

test('ignores blank lines and comments while keeping logical newlines', () => {
  const tokens = tokenizeTeachingSource('\n# comment\nx = 1 # end');
  assert.deepEqual(tokens.map(({ type }) => type), ['NEWLINE', 'NEWLINE', 'NAME', 'EQUAL', 'INTEGER', 'EOF']);
});

test('emits indentation boundaries while ignoring blank and comment-only indentation', () => {
  const tokens = tokenizeTeachingSource('if True:\r\n  # empty\r\n  print(1)\r\nprint(2)');
  assert.deepEqual(tokens.map(({ type }) => type), [
    'IF', 'TRUE', 'COLON', 'NEWLINE', 'NEWLINE', 'INDENT', 'PRINT', 'LEFT_PAREN', 'INTEGER',
    'RIGHT_PAREN', 'NEWLINE', 'DEDENT', 'PRINT', 'LEFT_PAREN', 'INTEGER', 'RIGHT_PAREN', 'EOF',
  ]);
});

test('reports lexical failures with exact UTF-16 ranges', () => {
  const cases = [
    { source: 'x = "bad\\q"', code: 'invalid-escape', start: 8, end: 10 },
    { source: 'x = "open', code: 'unterminated-string', start: 4, end: 9 },
    { source: 'x = 1; y = 2', code: 'unexpected-character', start: 5, end: 6 },
    { source: 'x = 00', code: 'leading-zero-integer', start: 4, end: 6 },
  ];

  for (const expected of cases) {
    assert.throws(
      () => tokenizeTeachingSource(expected.source),
      (error: unknown) => error instanceof TeachingDiagnostic
        && error.stage === 'lex'
        && error.code === expected.code
        && error.span.start === expected.start
        && error.span.end === expected.end,
    );
  }
});

test('enforces source, token, and decoded string budgets', () => {
  assert.throws(
    () => tokenizeTeachingSource(`x = ${' '.repeat(20_000)}`),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'source-too-long',
  );
  assert.equal(tokenizeTeachingSource('x = 1\n'.repeat(1_250)).length, 5_001);
  assert.throws(
    () => tokenizeTeachingSource('x = 1\n'.repeat(1_251)),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'too-many-tokens',
  );
  assert.equal(tokenizeTeachingSource(`x = "${'a'.repeat(4_096)}"`).length, 4);
  assert.throws(
    () => tokenizeTeachingSource(`x = "${'a'.repeat(4_097)}"`),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'string-too-long',
  );
});

test('parses assignment and print with Python arithmetic precedence and left associativity', () => {
  const program = parseTeachingSource('x = 1 + 2 * 3 - 4\nprint(x, "ok")');
  const assignment = program.statements[0];

  assert.equal(program.type, 'Program');
  assert.equal(program.statements.length, 2);
  assert.equal(assignment.type, 'Assign');
  if (assignment.type !== 'Assign') assert.fail('expected assignment');
  assert.equal(assignment.name, 'x');
  assert.deepEqual(assignment.value, {
    type: 'Binary',
    operator: '-',
    left: {
      type: 'Binary',
      operator: '+',
      left: { type: 'IntegerLiteral', value: '1', span: { start: 4, end: 5, line: 1, column: 5, endLine: 1, endColumn: 6 } },
      right: {
        type: 'Binary',
        operator: '*',
        left: { type: 'IntegerLiteral', value: '2', span: { start: 8, end: 9, line: 1, column: 9, endLine: 1, endColumn: 10 } },
        right: { type: 'IntegerLiteral', value: '3', span: { start: 12, end: 13, line: 1, column: 13, endLine: 1, endColumn: 14 } },
        span: { start: 8, end: 13, line: 1, column: 9, endLine: 1, endColumn: 14 },
      },
      span: { start: 4, end: 13, line: 1, column: 5, endLine: 1, endColumn: 14 },
    },
    right: { type: 'IntegerLiteral', value: '4', span: { start: 16, end: 17, line: 1, column: 17, endLine: 1, endColumn: 18 } },
    span: { start: 4, end: 17, line: 1, column: 5, endLine: 1, endColumn: 18 },
  });

  const print = program.statements[1];
  assert.equal(print.type, 'Print');
  if (print.type !== 'Print') assert.fail('expected print statement');
  assert.equal(print.arguments.length, 2);
  assert.deepEqual(program.span, { start: 0, end: 32, line: 1, column: 1, endLine: 2, endColumn: 15 });
});

test('parses unary negation and parenthesized expressions', () => {
  const program = parseTeachingSource('x = -(1 + 2)');
  const assignment = program.statements[0];
  assert.equal(assignment.type, 'Assign');
  if (assignment.type !== 'Assign') assert.fail('expected assignment');
  assert.equal(assignment.value.type, 'Unary');
  if (assignment.value.type !== 'Unary') assert.fail('expected unary expression');
  assert.equal(assignment.value.operator, '-');
  assert.equal(assignment.value.operand.type, 'Binary');
});

test('parses Python boolean, comparison, not, and logical precedence', () => {
  const program = parseTeachingSource('x = not 1 + 1 == 2 or False and True');
  const assignment = program.statements[0];
  assert.equal(assignment.type, 'Assign');
  if (assignment.type !== 'Assign') assert.fail('expected assignment');
  assert.equal(assignment.value.type, 'Logical');
  if (assignment.value.type !== 'Logical') assert.fail('expected logical expression');
  assert.equal(assignment.value.operator, 'or');
  assert.equal(assignment.value.left.type, 'Unary');
  assert.equal(assignment.value.right.type, 'Logical');
  if (assignment.value.left.type === 'Unary') assert.equal(assignment.value.left.operator, 'not');
  if (assignment.value.right.type === 'Logical') assert.equal(assignment.value.right.operator, 'and');
  assert.throws(
    () => parseTeachingSource('print(1 < 2 < 3)'),
    (error: unknown) => error instanceof TeachingDiagnostic && error.stage === 'parse',
  );
});

test('tokenizes and parses None as a dedicated literal with a source span', () => {
  assert.deepEqual(tokenizeTeachingSource('x = None').map(({ type }) => type), [
    'NAME', 'EQUAL', 'NONE', 'EOF',
  ]);
  const program = parseTeachingSource('x = None');
  const statement = program.statements[0];
  assert.equal(statement?.type, 'Assign');
  if (statement?.type !== 'Assign') assert.fail('expected assignment');
  assert.deepEqual(statement.value, {
    type: 'NoneLiteral',
    span: { start: 4, end: 8, line: 1, column: 5, endLine: 1, endColumn: 9 },
  });
  assert.throws(
    () => parseTeachingSource('None = 1'),
    (error: unknown) => error instanceof TeachingDiagnostic && error.stage === 'parse',
  );
});

test('parses module-level zero-parameter functions, return statements, and direct calls', () => {
  const program = parseTeachingSource('def answer():\n  return\nx = answer()');
  const definition = program.statements[0];
  assert.equal(definition?.type, 'FunctionDef');
  if (definition?.type !== 'FunctionDef') assert.fail('expected function definition');
  assert.equal(definition.name, 'answer');
  assert.deepEqual(definition.parameters, []);
  assert.equal(definition.body[0]?.type, 'Return');
  if (definition.body[0]?.type !== 'Return') assert.fail('expected return statement');
  assert.equal(definition.body[0].value, null);

  const assignment = program.statements[1];
  assert.equal(assignment?.type, 'Assign');
  if (assignment?.type !== 'Assign') assert.fail('expected assignment');
  assert.deepEqual(assignment.value, {
    type: 'Call',
    name: 'answer',
    arguments: [],
    span: { start: 27, end: 35, line: 3, column: 5, endLine: 3, endColumn: 13 },
  });
});

test('parses required positional parameters and positional call arguments', () => {
  const program = parseTeachingSource('def add(left, right):\n  return left + right\nresult = add(1, 2)');
  const definition = program.statements[0];
  assert.equal(definition?.type, 'FunctionDef');
  if (definition?.type !== 'FunctionDef') assert.fail('expected function definition');
  assert.deepEqual(definition.parameters, ['left', 'right']);
  const assignment = program.statements[1];
  assert.equal(assignment?.type, 'Assign');
  if (assignment?.type !== 'Assign') assert.fail('expected assignment');
  assert.equal(assignment.value.type, 'Call');
  if (assignment.value.type !== 'Call') assert.fail('expected function call');
  assert.deepEqual(assignment.value.arguments.map((argument) => argument.type), ['IntegerLiteral', 'IntegerLiteral']);
});

test('rejects trailing commas in function parameters and call arguments', () => {
  for (const source of [
    'def one(value,):\n  return value',
    'def one(value):\n  return value\nprint(one(1,))',
  ]) {
    assert.throws(
      () => parseTeachingSource(source),
      (error: unknown) => error instanceof TeachingDiagnostic && error.stage === 'parse',
    );
  }
});

test('rejects return outside a function and nested function definitions', () => {
  assert.throws(
    () => parseTeachingSource('return 1'),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'return-outside-function',
  );
  assert.throws(
    () => parseTeachingSource('if True:\n  def inner():\n    return 1'),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'nested-function-definition',
  );
});

test('parses nested if/elif/else suites and closes a final block at end of source', () => {
  const program = parseTeachingSource([
    'if 0:',
    '  print(1)',
    '# comment between branches',
    'elif "x":',
    '  if True:',
    '    print(2)',
    '# comment before else',
    'else:',
    '  print(3)',
  ].join('\n'));
  const statement = program.statements[0];
  assert.equal(statement.type, 'If');
  if (statement.type !== 'If') assert.fail('expected if statement');
  assert.equal(statement.branches.length, 2);
  assert.equal(statement.branches[1]?.body[0]?.type, 'If');
  assert.equal(statement.elseBody?.[0]?.type, 'Print');
  assert.throws(
    () => parseTeachingSource('if True:\n  print(1)\n print(2)'),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'inconsistent-indentation',
  );
  assert.throws(
    () => parseTeachingSource('if True:\n\tprint(1)'),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'tab-indentation',
  );
  assert.throws(
    () => parseTeachingSource('if True:\n'),
    (error: unknown) => error instanceof TeachingDiagnostic && error.stage === 'parse',
  );
});

test('parses while suites with a boolean expression and nested control flow', () => {
  const program = parseTeachingSource('while not done:\n  if ready:\n    print(True)');
  const statement = program.statements[0];
  assert.equal(statement.type, 'While');
  if (statement.type !== 'While') assert.fail('expected while statement');
  assert.equal(statement.condition.type, 'Unary');
  assert.equal(statement.body[0]?.type, 'If');
});

test('parses one to three range expressions in a for suite', () => {
  const program = parseTeachingSource('for item in range(1, end + 1, True):\n  print(item)');
  const statement = program.statements[0];
  assert.equal(statement.type, 'For');
  if (statement.type !== 'For') assert.fail('expected for statement');
  assert.equal(statement.name, 'item');
  assert.equal(statement.rangeArguments.length, 3);
  assert.equal(statement.rangeArguments[1]?.type, 'Binary');
  assert.throws(
    () => parseTeachingSource('for item in range():\n  print(item)'),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'expected-range-argument',
  );
  assert.throws(
    () => parseTeachingSource('for item in range(1, 2, 3, 4):\n  print(item)'),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'too-many-range-arguments',
  );
  assert.throws(
    () => parseTeachingSource('for item in values:\n  print(item)'),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'unsupported-iterator',
  );
});

test('limits block nesting independently at 100 levels', () => {
  const nestedSource = (depth: number) => [
    ...Array.from({ length: depth }, (_, index) => `${' '.repeat(index)}if True:`),
    `${' '.repeat(depth)}print(${`${'('.repeat(100)}1${')'.repeat(100)}`})`,
  ].join('\n');
  assert.equal(parseTeachingSource(nestedSource(100)).statements.length, 1);
  assert.throws(
    () => parseTeachingSource(nestedSource(101)),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'block-too-deep',
  );
});

test('rejects unsupported keywords, expression statements, and trailing commas', () => {
  for (const source of ['if x = 1', 'True = 1', '1 + 2', 'print(1,)']) {
    assert.throws(
      () => parseTeachingSource(source),
      (error: unknown) => error instanceof TeachingDiagnostic && error.stage === 'parse',
    );
  }
});

test('limits nested expressions and supports empty programs and print calls', () => {
  assert.equal(parseTeachingSource('\n# only a comment\n').statements.length, 0);
  assert.equal(parseTeachingSource('print()').statements[0]?.type, 'Print');
  assert.throws(
    () => parseTeachingSource(`x = ${'('.repeat(101)}1${')'.repeat(101)}`),
    (error: unknown) => error instanceof TeachingDiagnostic && error.code === 'expression-too-deep',
  );
});
