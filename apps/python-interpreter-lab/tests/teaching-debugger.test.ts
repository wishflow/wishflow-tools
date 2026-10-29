import assert from 'node:assert/strict';
import test from 'node:test';
import { compileTeachingSource } from '../src/teaching-vm/compiler';
import { mapTeachingSourceLines } from '../src/teaching-vm/source-mapping';
import {
  createTeachingSourceStepGoal,
  isTeachingSourceStepGoalReached,
  type TeachingSourceStepMode,
} from '../src/teaching-vm/source-step';
import {
  createTeachingMachine,
  setTeachingMachineStatus,
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

test('keeps the one-time breakpoint skip when breakpoint configuration changes while paused', () => {
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

  machine.setBreakpoints([2, 3]);
  snapshot = stepTeachingMachine(machine, 'running');

  assert.equal(snapshot.status, 'running');
  assert.equal(snapshot.pauseReason, null);
  assert.equal(snapshot.executedInstructionCount, firstHitCount + 1);
  assert.notEqual(snapshot.hitBreakpointId, 'source-line:2');
});

test('Step Into stops at the first instruction in the called function', () => {
  const program = compileTeachingSource([
    'def twice(n):',
    '  value = n * 2',
    '  return value',
    'result = twice(3)',
    'print(result)',
  ].join('\n'));
  const machine = createTeachingMachine(program);
  stepTeachingMachine(machine);

  const paused = advanceSourceStep(machine, 'into');
  const activeFrame = paused.frames.at(-1);

  assert.equal(paused.pauseReason, 'step');
  assert.equal(paused.frames.length, 2);
  assert.equal(activeFrame?.functionName, 'twice');
  assert.equal(activeFrame?.pc, program.functions[0]?.entryIndex);
  assert.equal(program.instructions[paused.nextInstructionIndex ?? -1]?.span.line, 2);
  assert.equal(paused.executedInstructionCount, 3);
});

test('Step Over runs a multi-instruction caller line and its function call to the next line', () => {
  const program = compileTeachingSource([
    'def twice(n):',
    '  value = n * 2',
    '  return value',
    'result = twice(3)',
    'print(result)',
  ].join('\n'));
  const machine = createTeachingMachine(program);
  stepTeachingMachine(machine);

  const paused = advanceSourceStep(machine, 'over');

  assert.equal(paused.pauseReason, 'step');
  assert.equal(paused.frames.length, 1);
  assert.equal(paused.variables.find(({ name }) => name === 'result')?.value.value, '6');
  assert.equal(program.instructions[paused.nextInstructionIndex ?? -1]?.span.line, 5);
});

test('Step Over stays in the current function line and Step Out stops at caller continuation', () => {
  const program = compileTeachingSource([
    'def twice(n):',
    '  value = n * 2',
    '  return value',
    'result = twice(3)',
    'print(result)',
  ].join('\n'));
  const machine = createTeachingMachine(program);
  stepTeachingMachine(machine);
  advanceSourceStep(machine, 'into');

  const afterOver = advanceSourceStep(machine, 'over');
  assert.equal(afterOver.pauseReason, 'step');
  assert.equal(afterOver.frames.at(-1)?.functionName, 'twice');
  assert.equal(program.instructions[afterOver.nextInstructionIndex ?? -1]?.span.line, 3);
  assert.equal(afterOver.variables.find(({ name }) => name === 'value')?.value.value, '6');

  const afterOut = advanceSourceStep(machine, 'out');
  assert.equal(afterOut.pauseReason, 'step');
  assert.equal(afterOut.frames.length, 1);
  assert.equal(afterOut.frames[0]?.kind, 'module');
  assert.equal(program.instructions[afterOut.nextInstructionIndex ?? -1]?.span.line, 4);
  assert.equal(afterOut.stack.at(-1)?.value, '6');
  assert.equal(createTeachingSourceStepGoal('out', program, afterOut), null);
});

test('source stepping crosses a loop condition as one source line and returns to it after the body', () => {
  const program = compileTeachingSource([
    'i = 0',
    'while i < 2:',
    '  i = i + 1',
    'print(i)',
  ].join('\n'));
  const machine = createTeachingMachine(program);

  const afterAssign = advanceSourceStep(machine, 'over');
  assert.equal(program.instructions[afterAssign.nextInstructionIndex ?? -1]?.span.line, 2);
  const beforeCondition = afterAssign.executedInstructionCount;
  const afterCondition = advanceSourceStep(machine, 'over');
  assert.equal(program.instructions[afterCondition.nextInstructionIndex ?? -1]?.span.line, 3);
  assert.ok(afterCondition.executedInstructionCount - beforeCondition > 1);

  const afterBody = advanceSourceStep(machine, 'over');
  assert.equal(program.instructions[afterBody.nextInstructionIndex ?? -1]?.span.line, 2);
  assert.equal(afterBody.variables.find(({ name }) => name === 'i')?.value.value, '1');
});

test('recursive Step Into and Step Out preserve the caller frame and continuation', () => {
  const program = compileTeachingSource([
    'def countdown(n):',
    '  if n > 0:',
    '    return countdown(n - 1)',
    '  return 0',
    'result = countdown(2)',
  ].join('\n'));
  const machine = createTeachingMachine(program);
  stepTeachingMachine(machine);
  const outerCall = advanceSourceStep(machine, 'into');
  assert.equal(program.instructions[outerCall.nextInstructionIndex ?? -1]?.span.line, 2);
  const outerFrameId = outerCall.frames.at(-1)?.id;

  const beforeRecursiveCall = advanceSourceStep(machine, 'over');
  assert.equal(program.instructions[beforeRecursiveCall.nextInstructionIndex ?? -1]?.span.line, 3);
  const innerCall = advanceSourceStep(machine, 'into');
  assert.equal(innerCall.frames.length, 3);
  assert.notEqual(innerCall.frames.at(-1)?.id, outerFrameId);
  assert.equal(innerCall.frames.at(-1)?.functionName, 'countdown');
  assert.equal(program.instructions[innerCall.nextInstructionIndex ?? -1]?.span.line, 2);

  const afterOut = advanceSourceStep(machine, 'out');
  assert.equal(afterOut.frames.length, 2);
  assert.equal(afterOut.frames.at(-1)?.id, outerFrameId);
  assert.equal(program.instructions[afterOut.nextInstructionIndex ?? -1]?.span.line, 3);
  assert.equal(afterOut.pauseReason, 'step');
});

function advanceSourceStep(
  machine: ReturnType<typeof createTeachingMachine>,
  mode: TeachingSourceStepMode,
) {
  const goal = createTeachingSourceStepGoal(mode, machine.program, machine.current);
  assert.ok(goal, `${mode} should have a valid source-step target`);

  for (let count = 0; count < 5_000; count += 1) {
    const snapshot = stepTeachingMachine(machine, 'running');
    if (snapshot.status !== 'running') return snapshot;
    if (isTeachingSourceStepGoalReached(goal, machine.program, snapshot)) {
      return setTeachingMachineStatus(machine, 'paused', 'step');
    }
  }
  throw new Error(`${mode} did not reach a source-step boundary within the instruction budget.`);
}
