import assert from 'node:assert/strict';
import test from 'node:test';
import { compileTeachingSource } from '../src/teaching-vm/compiler';
import { mapTeachingSourceLines } from '../src/teaching-vm/source-mapping';
import {
  createTeachingMachine,
  stepTeachingMachine,
} from '../src/teaching-vm/vm';

test('maps executable source lines to their first instruction across module and function code', () => {
  const program = compileTeachingSource([
    '# heading',
    '',
    'def double(value):',
    '  return value * 2',
    '',
    'answer = double(3)',
    'print(answer)',
  ].join('\n'));

  const mappings = mapTeachingSourceLines(program);
  assert.deepEqual(mappings.map(({ line }) => line), [3, 4, 6, 7]);
  assert.equal(mappings.find(({ line }) => line === 3)?.instructionIndex, 0);
  assert.equal(mappings.find(({ line }) => line === 4)?.instructionIndex, program.functions[0]?.entryIndex);
  assert.equal(mappings.find(({ line }) => line === 6)?.instructionIndex, 1);
  assert.equal(mappings.find(({ line }) => line === 7)?.instructionIndex, 4);
  assert.equal(mappings.some(({ line }) => line === 1 || line === 2 || line === 5), false);
});

test('does not bind an empty or comment-only program to the synthetic HALT instruction', () => {
  const program = compileTeachingSource('# comment only\n\n');
  assert.deepEqual(mapTeachingSourceLines(program), []);
});

test('creates stable source-line breakpoint IDs and rejects unmapped, duplicate, and excessive lines', () => {
  const program = compileTeachingSource('x = 1 + 2\nprint(x)');
  const machine = createTeachingMachine(program);

  assert.deepEqual(machine.setBreakpoints([2, 1]), [
    { id: 'source-line:1', line: 1, instructionIndex: 0 },
    { id: 'source-line:2', line: 2, instructionIndex: 4 },
  ]);
  assert.deepEqual(machine.setBreakpoints([1]), [
    { id: 'source-line:1', line: 1, instructionIndex: 0 },
  ]);
  assert.throws(() => machine.setBreakpoints([3]), /no executable instruction/);
  assert.throws(() => machine.setBreakpoints([1, 1]), /Duplicate source line/);
  assert.throws(() => machine.setBreakpoints(Array(2_001).fill(1)), /exceeds 2000/);
});

test('combines bounded source and instruction breakpoints in one compiled program', () => {
  const program = compileTeachingSource('x = 1\nprint(x)');
  const machine = createTeachingMachine(program);

  assert.deepEqual(machine.setBreakpoints([2], [3]), [
    { id: 'source-line:2', line: 2, instructionIndex: 2 },
    { id: 'instruction:3', instructionIndex: 3 },
  ]);
  assert.throws(() => machine.setBreakpoints([], [-1]), /outside the compiled program/);
  assert.throws(() => machine.setBreakpoints([], [program.instructions.length]), /outside the compiled program/);
  assert.throws(() => machine.setBreakpoints([1], Array(2_000).fill(0)), /exceeds 2000/);
});

test('pauses before a source breakpoint without changing runtime state or instruction budget', () => {
  const machine = createTeachingMachine(compileTeachingSource('items = [1]\nitems[0] = 2\nprint(items)'));
  const breakpoint = machine.setBreakpoints([2])[0];
  assert.ok(breakpoint);

  while (machine.current.nextInstructionIndex !== breakpoint.instructionIndex) stepTeachingMachine(machine);
  const beforeBreakpoint = machine.current;
  const paused = stepTeachingMachine(machine);

  assert.equal(paused.status, 'paused');
  assert.equal(paused.pauseReason, 'breakpoint');
  assert.equal(paused.hitBreakpointId, 'source-line:2');
  assert.equal(paused.pc, beforeBreakpoint.pc);
  assert.equal(paused.nextInstructionIndex, beforeBreakpoint.nextInstructionIndex);
  assert.equal(paused.executedInstructionCount, beforeBreakpoint.executedInstructionCount);
  assert.deepEqual(paused.frames, beforeBreakpoint.frames);
  assert.deepEqual(paused.stack, beforeBreakpoint.stack);
  assert.deepEqual(paused.variables, beforeBreakpoint.variables);
  assert.deepEqual(paused.heap, beforeBreakpoint.heap);
  assert.deepEqual(paused.output, beforeBreakpoint.output);
});

test('pauses before an instruction breakpoint and records its stable identifier', () => {
  const machine = createTeachingMachine(compileTeachingSource('x = 1'));
  machine.setBreakpoints([], [1]);

  stepTeachingMachine(machine);
  const snapshot = stepTeachingMachine(machine);

  assert.equal(snapshot.pauseReason, 'breakpoint');
  assert.equal(snapshot.hitBreakpointId, 'instruction:1');
  assert.equal(snapshot.pc, 1);
  assert.equal(snapshot.executedInstructionCount, 1);
  assert.deepEqual(snapshot.stack.map(({ value }) => value), ['1']);
});

test('skips the current breakpoint once and pauses again when a loop returns to it', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'i = 0',
    'while i < 2:',
    '  i = i + 1',
    'print(i)',
  ].join('\n')));
  const breakpoint = machine.setBreakpoints([2])[0];
  assert.ok(breakpoint);

  let snapshot = machine.current;
  while (snapshot.nextInstructionIndex !== breakpoint.instructionIndex) {
    snapshot = stepTeachingMachine(machine);
  }
  snapshot = stepTeachingMachine(machine);
  assert.equal(snapshot.pauseReason, 'breakpoint');
  const firstHitCount = snapshot.executedInstructionCount;

  snapshot = stepTeachingMachine(machine);
  assert.equal(snapshot.pauseReason, 'step');
  assert.equal(snapshot.executedInstructionCount, firstHitCount + 1);

  for (let count = 0; count < 20 && snapshot.pauseReason !== 'breakpoint'; count += 1) {
    snapshot = stepTeachingMachine(machine);
  }

  assert.equal(snapshot.pauseReason, 'breakpoint');
  assert.equal(snapshot.hitBreakpointId, 'source-line:2');
  assert.ok(snapshot.executedInstructionCount > firstHitCount + 1);
});
