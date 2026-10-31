import assert from 'node:assert/strict';
import test from 'node:test';
import {
  astNodeSourceRange,
  createSourcePositionIndex,
  findTokenAtOffset,
  instructionSourceRange,
  isValidSourceRange,
  rangesOverlap,
  sourcePositionOffset,
  sourcePositionRange,
  tokenSourceRange,
} from '../src/analysis/source-position';
import type { AstNode } from '../src/analysis/types';

test('converts tokenize code-point columns and CPython UTF-8 byte columns to UTF-16 offsets', () => {
  const source = '变量 = "🐍"\nnext = 1';
  const index = createSourcePositionIndex(source);

  assert.equal(sourcePositionOffset(index, { line: 1, column: 2 }, 'code-point'), 2);
  assert.equal(sourcePositionOffset(index, { line: 1, column: 5 }, 'code-point'), 5);
  assert.equal(sourcePositionOffset(index, { line: 1, column: 9 }, 'utf8-byte'), 5);
  assert.equal(sourcePositionOffset(index, { line: 1, column: 15 }, 'utf8-byte'), 9);
  assert.deepEqual(
    sourcePositionRange(index, { line: 1, column: 9 }, { line: 1, column: 15 }, 'utf8-byte'),
    { start: 5, end: 9 },
  );
  assert.deepEqual(
    sourcePositionRange(index, { line: 1, column: 5 }, { line: 1, column: 8 }, 'code-point'),
    { start: 5, end: 9 },
  );
});

test('maps multi-line code-point ranges across CRLF without expanding tabs', () => {
  const source = 'first = 1\r\n值 = first + 2';
  const index = createSourcePositionIndex(source);

  assert.deepEqual(
    sourcePositionRange(index, { line: 2, column: 4 }, { line: 2, column: 9 }, 'code-point'),
    { start: 15, end: 20 },
  );
  assert.deepEqual(
    sourcePositionRange(index, { line: 1, column: 9 }, { line: 1, column: 11 }, 'code-point'),
    { start: 9, end: 11 },
  );
  const withTab = createSourcePositionIndex('\tname = 1');
  assert.equal(sourcePositionOffset(withTab, { line: 1, column: 1 }, 'code-point'), 1);
});

test('rejects invalid lines, columns, and UTF-8 offsets inside a code point', () => {
  const index = createSourcePositionIndex('变x\n');

  assert.equal(sourcePositionOffset(index, { line: 1, column: 1 }, 'utf8-byte'), null);
  assert.equal(sourcePositionOffset(index, { line: 1, column: 6 }, 'utf8-byte'), null);
  assert.equal(sourcePositionOffset(index, { line: 3, column: 0 }, 'code-point'), null);
  assert.equal(
    sourcePositionRange(index, { line: 1, column: 2 }, { line: 1, column: 2 }, 'code-point'),
    null,
  );
});

test('uses half-open ranges and finds the token under a caret', () => {
  const source = 'x + 1';
  const index = createSourcePositionIndex(source);
  const tokens = [
    { index: 0, type: 'NAME', exactType: 'NAME', text: 'x', textTruncated: false, start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
    { index: 1, type: 'OP', exactType: 'PLUS', text: '+', textTruncated: false, start: { line: 1, column: 2 }, end: { line: 1, column: 3 } },
    { index: 2, type: 'NUMBER', exactType: 'NUMBER', text: '1', textTruncated: false, start: { line: 1, column: 4 }, end: { line: 1, column: 5 } },
  ];

  assert.equal(findTokenAtOffset(tokens, index, 0)?.index, 0);
  assert.equal(findTokenAtOffset(tokens, index, 2)?.index, 1);
  assert.equal(findTokenAtOffset(tokens, index, 3), null);
  assert.equal(findTokenAtOffset(tokens, index, 4)?.index, 2);
  assert.equal(rangesOverlap({ start: 0, end: 2 }, { start: 1, end: 3 }), true);
  assert.equal(rangesOverlap({ start: 0, end: 2 }, { start: 2, end: 4 }), false);
  assert.deepEqual(tokenSourceRange(tokens[1], index), { start: 2, end: 3 });
});

test('accepts only non-empty source ranges within the UTF-16 source bounds', () => {
  const sourceLength = 'x🐍'.length;

  assert.equal(isValidSourceRange({ start: 0, end: sourceLength }, sourceLength), true);
  assert.equal(isValidSourceRange(null, sourceLength), false);
  assert.equal(isValidSourceRange({ start: 1, end: 1 }, sourceLength), false);
  assert.equal(isValidSourceRange({ start: -1, end: 1 }, sourceLength), false);
  assert.equal(isValidSourceRange({ start: 0, end: sourceLength + 1 }, sourceLength), false);
  assert.equal(isValidSourceRange({ start: 0.5, end: 1 }, sourceLength), false);
});

test('maps AST and bytecode UTF-8 locations and rejects missing positions', () => {
  const index = createSourcePositionIndex('变量 = "🐍"');
  const node: AstNode = {
    id: 'ast-1',
    type: 'Assign',
    fields: {},
    location: { lineno: 1, col_offset: 0, end_lineno: 1, end_col_offset: 15 },
  };

  assert.deepEqual(astNodeSourceRange(node, index), { start: 0, end: 9 });
  assert.deepEqual(instructionSourceRange({ positions: {
    lineno: 1,
    end_lineno: 1,
    col_offset: 9,
    end_col_offset: 15,
  } }, index), { start: 5, end: 9 });
  assert.equal(instructionSourceRange({ positions: null }, index), null);
  assert.equal(astNodeSourceRange({ ...node, location: { lineno: 1, col_offset: 0 } }, index), null);
});
