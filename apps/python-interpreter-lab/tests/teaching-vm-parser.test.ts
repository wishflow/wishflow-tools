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
