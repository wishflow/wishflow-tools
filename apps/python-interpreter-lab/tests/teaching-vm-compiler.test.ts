import assert from 'node:assert/strict';
import test from 'node:test';
import { compileTeachingSource } from '../src/teaching-vm/compiler';
import { TeachingDiagnostic } from '../src/teaching-vm/types';

test('compiles arithmetic precedence and print into versioned teaching instructions', () => {
  const result = compileTeachingSource('x = 1 + 2 * 3\nprint(x)');

  assert.equal(result.version, 'mini-vm-v3');
  assert.deepEqual(result.constants, [
    { type: 'int', value: '1' },
    { type: 'int', value: '2' },
    { type: 'int', value: '3' },
  ]);
  assert.deepEqual(result.instructions.map(({ opcode, argument }) => [opcode, argument]), [
    ['LOAD_CONST', 0],
    ['LOAD_CONST', 1],
    ['LOAD_CONST', 2],
    ['BINARY_MULTIPLY', null],
    ['BINARY_ADD', null],
    ['STORE_NAME', 'x'],
    ['LOAD_NAME', 'x'],
    ['PRINT', 1],
    ['HALT', null],
  ]);
  assert.deepEqual(result.instructions.map(({ index }) => index), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test('compiles None to a dedicated constant without treating it as a name', () => {
  const result = compileTeachingSource('x = None\nprint(x)');
  assert.deepEqual(result.constants, [{ type: 'none', value: 'None' }]);
  assert.deepEqual(result.instructions.map(({ opcode, argument }) => [opcode, argument]), [
    ['LOAD_CONST', 0],
    ['STORE_NAME', 'x'],
    ['LOAD_NAME', 'x'],
    ['PRINT', 1],
    ['HALT', null],
  ]);
});

test('compiles short-circuit jumps with patched instruction-index targets', () => {
  const result = compileTeachingSource('print(False and missing, True or fallback)');
  assert.deepEqual(result.constants, [
    { type: 'bool', value: 'False' },
    { type: 'bool', value: 'True' },
  ]);
  assert.deepEqual(result.instructions.map(({ opcode, argument }) => [opcode, argument]), [
    ['LOAD_CONST', 0],
    ['JUMP_IF_FALSE_OR_POP', 3],
    ['LOAD_NAME', 'missing'],
    ['LOAD_CONST', 1],
    ['JUMP_IF_TRUE_OR_POP', 6],
    ['LOAD_NAME', 'fallback'],
    ['PRINT', 2],
    ['HALT', null],
  ]);
});

test('compiles if/elif/else into bounded instruction-index jumps', () => {
  const result = compileTeachingSource('if False:\n  print(1)\nelif True:\n  print(2)\nelse:\n  print(3)');
  const jumps = result.instructions.filter(({ opcode }) => opcode === 'JUMP' || opcode === 'POP_JUMP_IF_FALSE');
  assert.deepEqual(jumps.map(({ opcode, argument }) => [opcode, argument]), [
    ['POP_JUMP_IF_FALSE', 5],
    ['JUMP', 12],
    ['POP_JUMP_IF_FALSE', 10],
    ['JUMP', 12],
  ]);
  assert.ok(jumps.every(({ argument }) => typeof argument === 'number' && argument >= 0 && argument < result.instructions.length));
});

test('compiles while conditions with a backward loop jump', () => {
  const result = compileTeachingSource('i = 0\nwhile i < 3:\n  i = i + 1');
  assert.deepEqual(result.instructions.map(({ opcode, argument }) => [opcode, argument]), [
    ['LOAD_CONST', 0],
    ['STORE_NAME', 'i'],
    ['LOAD_NAME', 'i'],
    ['LOAD_CONST', 1],
    ['COMPARE_OP', '<'],
    ['POP_JUMP_IF_FALSE', 11],
    ['LOAD_NAME', 'i'],
    ['LOAD_CONST', 2],
    ['BINARY_ADD', null],
    ['STORE_NAME', 'i'],
    ['JUMP', 2],
    ['HALT', null],
  ]);
});

test('compiles for-range as a lazy iterator loop with an exit target', () => {
  const result = compileTeachingSource('for i in range(1, 3):\n  print(i)');
  assert.deepEqual(result.instructions.map(({ opcode, argument }) => [opcode, argument]), [
    ['LOAD_CONST', 0],
    ['LOAD_CONST', 1],
    ['BUILD_RANGE', 2],
    ['GET_ITER', null],
    ['FOR_ITER', 9],
    ['STORE_NAME', 'i'],
    ['LOAD_NAME', 'i'],
    ['PRINT', 1],
    ['JUMP', 4],
    ['HALT', null],
  ]);
});

test('compiles strings, unary operations, and names with source mappings', () => {
  const result = compileTeachingSource('x = -1\ny = "🐍" + "🐍"\nprint(x, y)');

  assert.deepEqual(result.constants, [
    { type: 'int', value: '1' },
    { type: 'str', value: '🐍' },
  ]);
  assert.deepEqual(result.instructions.map(({ opcode, argument }) => [opcode, argument]), [
    ['LOAD_CONST', 0],
    ['UNARY_NEGATIVE', null],
    ['STORE_NAME', 'x'],
    ['LOAD_CONST', 1],
    ['LOAD_CONST', 1],
    ['BINARY_ADD', null],
    ['STORE_NAME', 'y'],
    ['LOAD_NAME', 'x'],
    ['LOAD_NAME', 'y'],
    ['PRINT', 2],
    ['HALT', null],
  ]);
  assert.deepEqual(result.instructions[0]?.span, {
    start: 5, end: 6, line: 1, column: 6, endLine: 1, endColumn: 7,
  });
  assert.deepEqual(result.instructions.at(-1)?.span, {
    start: 0, end: 34, line: 1, column: 1, endLine: 3, endColumn: 12,
  });
});

test('deduplicates identical constants while preserving the teaching AST', () => {
  const result = compileTeachingSource('x = 1\ny = 1');
  assert.equal(result.constants.length, 1);
  assert.equal(result.instructions[0]?.argument, 0);
  assert.equal(result.instructions[2]?.argument, 0);
  assert.equal(result.ast.statements.length, 2);
});

test('rejects integer literals above 4096 bits without producing code', () => {
  const largest = (1n << 4_095n).toString();
  const tooLarge = (1n << 4_096n).toString();

  assert.equal(compileTeachingSource(`x = ${largest}`).constants[0]?.value, largest);
  assert.throws(
    () => compileTeachingSource(`x = ${tooLarge}`),
    (error: unknown) => error instanceof TeachingDiagnostic
      && error.stage === 'compile'
      && error.code === 'integer-too-large',
  );
});

test('enforces the instruction limit including the terminal HALT instruction', () => {
  assert.equal(compileTeachingSource('x = 1\n'.repeat(999)).instructions.length, 1_999);
  assert.throws(
    () => compileTeachingSource('x = 1\n'.repeat(1_000)),
    (error: unknown) => error instanceof TeachingDiagnostic
      && error.stage === 'compile'
      && error.code === 'too-many-instructions',
  );
});
