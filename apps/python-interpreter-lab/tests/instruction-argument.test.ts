import assert from 'node:assert/strict';
import test from 'node:test';
import { formatInstructionArgument } from '../src/analysis/instruction-argument';

test('shows the disassembler argument description when it is available', () => {
  assert.equal(formatInstructionArgument('x + y', 0), 'x + y');
});

test('falls back to the numeric argument when argrepr is empty', () => {
  assert.equal(formatInstructionArgument('', 3), '3');
});

test('shows a dash only when the instruction has no argument', () => {
  assert.equal(formatInstructionArgument('', null), '—');
});
