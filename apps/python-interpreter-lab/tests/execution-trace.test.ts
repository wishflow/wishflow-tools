import assert from 'node:assert/strict';
import test from 'node:test';
import { sliceByCodePointOffset } from '../src/analysis/execution-trace';
import { createSourcePositionIndex, sourceLineRange } from '../src/analysis/source-position';

test('slices output by Python code-point offsets without splitting a surrogate pair', () => {
  assert.equal(sliceByCodePointOffset('a🐍b', 0), '');
  assert.equal(sliceByCodePointOffset('a🐍b', 2), 'a🐍');
  assert.equal(sliceByCodePointOffset('a🐍b', 99), 'a🐍b');
});

test('maps a traced source line to its full textarea range', () => {
  const index = createSourcePositionIndex('a🐍\n第二');
  assert.deepEqual(sourceLineRange(index, 1), { start: 0, end: 4 });
  assert.deepEqual(sourceLineRange(index, 2), { start: 4, end: 6 });
  assert.equal(sourceLineRange(index, 3), null);
});
