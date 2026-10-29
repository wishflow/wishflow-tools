import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_SOURCE_LENGTH, validateSource } from '../src/analysis/source-limit';

test('accepts source at the UTF-16 code-unit limit', () => {
  assert.deepEqual(validateSource('x'.repeat(MAX_SOURCE_LENGTH)), { ok: true });
});

test('rejects source beyond the limit before it reaches the worker', () => {
  assert.deepEqual(validateSource('x'.repeat(MAX_SOURCE_LENGTH + 1)), {
    ok: false,
    actualLength: MAX_SOURCE_LENGTH + 1,
    maxLength: MAX_SOURCE_LENGTH,
  });
});

test('counts supplementary characters as two JavaScript UTF-16 code units', () => {
  assert.equal('🐍'.length, 2);
  assert.deepEqual(validateSource('🐍'.repeat(MAX_SOURCE_LENGTH / 2)), { ok: true });
});
