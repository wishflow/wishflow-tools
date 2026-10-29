import assert from 'node:assert/strict';
import test from 'node:test';
import { compileTeachingSource } from '../src/teaching-vm/compiler';
import {
  createTeachingMachine,
  getTeachingHistory,
  stepTeachingMachine,
} from '../src/teaching-vm/vm';

test('steps each bytecode instruction and records stack, variables, output, and finish state', () => {
  const machine = createTeachingMachine(compileTeachingSource('x = 1 + 2 * 3\nprint(x)'));
  const expected = [
    { stack: [], variables: [], output: [], status: 'ready' },
    { stack: ['1'], variables: [], output: [], status: 'paused' },
    { stack: ['1', '2'], variables: [], output: [], status: 'paused' },
    { stack: ['1', '2', '3'], variables: [], output: [], status: 'paused' },
    { stack: ['1', '6'], variables: [], output: [], status: 'paused' },
    { stack: ['7'], variables: [], output: [], status: 'paused' },
    { stack: [], variables: [['x', '7']], output: [], status: 'paused' },
    { stack: ['7'], variables: [['x', '7']], output: [], status: 'paused' },
    { stack: [], variables: [['x', '7']], output: ['7'], status: 'paused' },
    { stack: [], variables: [['x', '7']], output: ['7'], status: 'finished' },
  ];

  const snapshots = [machine.current];
  while (machine.current.status !== 'finished') snapshots.push(stepTeachingMachine(machine));
  assert.deepEqual(snapshots.map(({ stack, variables, output, status }) => ({
    stack: stack.map(({ value }) => value),
    variables: variables.map(({ name, value }) => [name, value.value]),
    output,
    status,
  })), expected);
  assert.equal(snapshots.at(-1)?.lastExecutedInstructionIndex, 8);
  assert.equal(snapshots.at(-1)?.nextInstructionIndex, null);
  assert.equal(stepTeachingMachine(machine), snapshots.at(-1));
});

test('prints strings and zero arguments using Python-like output formatting', () => {
  const machine = createTeachingMachine(compileTeachingSource('print("hello", "🐍", 42)\nprint()'));
  while (machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.deepEqual(machine.current.output, ['hello 🐍 42', '']);
});

test('preserves the pre-error stack for NameError and TypeError', () => {
  const missing = createTeachingMachine(compileTeachingSource('print(missing)'));
  const nameError = stepTeachingMachine(missing);
  assert.equal(nameError.status, 'error');
  assert.equal(nameError.diagnostic?.code, 'name-error');
  assert.equal(nameError.faultInstructionIndex, 0);
  assert.deepEqual(nameError.stack, []);

  const typeErrorMachine = createTeachingMachine(compileTeachingSource('x = 1 + "a"'));
  stepTeachingMachine(typeErrorMachine);
  const beforeBinary = stepTeachingMachine(typeErrorMachine);
  const typeError = stepTeachingMachine(typeErrorMachine);
  assert.equal(typeError.status, 'error');
  assert.equal(typeError.diagnostic?.code, 'type-error');
  assert.deepEqual(typeError.stack, beforeBinary.stack);
});

test('enforces integer and string result budgets atomically', () => {
  const tooLargeInteger = createTeachingMachine(compileTeachingSource(`x = ${(1n << 4_096n) - 1n} + 1`));
  stepTeachingMachine(tooLargeInteger);
  const beforeOverflow = stepTeachingMachine(tooLargeInteger);
  const overflow = stepTeachingMachine(tooLargeInteger);
  assert.equal(overflow.diagnostic?.code, 'integer-too-large');
  assert.deepEqual(overflow.stack, beforeOverflow.stack);

  const tooLongString = createTeachingMachine(compileTeachingSource(`x = "${'a'.repeat(4_096)}" + "b"`));
  stepTeachingMachine(tooLongString);
  const beforeConcat = stepTeachingMachine(tooLongString);
  const concatError = stepTeachingMachine(tooLongString);
  assert.equal(concatError.diagnostic?.code, 'string-too-long');
  assert.deepEqual(concatError.stack, beforeConcat.stack);
});

test('limits total printed output without partially consuming the failing print', () => {
  const source = `s = "${'a'.repeat(4_096)}"\n${Array.from({ length: 8 }, () => 'print(s)').join('\n')}`;
  const machine = createTeachingMachine(compileTeachingSource(source));
  let previous = machine.current;

  while (machine.current.status !== 'error') {
    previous = machine.current;
    stepTeachingMachine(machine);
  }

  assert.equal(machine.current.diagnostic?.code, 'output-too-long');
  assert.equal(machine.current.output.length, 7);
  assert.equal(Array.from(machine.current.output.join('\n')).length + 1, 7 * 4_097);
  assert.deepEqual(machine.current.stack, previous.stack);
});

test('limits distinct variable bindings without consuming the failing value', () => {
  const source = Array.from({ length: 201 }, (_, index) => `v${index} = ${index}`).join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  while (machine.current.status !== 'error') stepTeachingMachine(machine);

  assert.equal(machine.current.diagnostic?.code, 'too-many-names');
  assert.equal(machine.current.variables.length, 200);
  assert.deepEqual(machine.current.stack.map(({ value }) => value), ['200']);
});

test('keeps immutable bounded history and reports when earlier snapshots were dropped', () => {
  const machine = createTeachingMachine(compileTeachingSource('print()\n'.repeat(500)));
  const initial = machine.current;
  for (let index = 0; index < 500; index += 1) stepTeachingMachine(machine);

  const history = getTeachingHistory(machine);
  assert.equal(history.items.length, 500);
  assert.equal(history.truncated, true);
  assert.equal(history.items[0]?.stepIndex, 1);
  assert.equal(initial.stepIndex, 0);
  assert.deepEqual(initial.stack, []);
  assert.equal(Object.isFrozen(initial), true);
  assert.equal(Object.isFrozen(initial.stack), true);
});
