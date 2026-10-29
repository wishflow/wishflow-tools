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

test('uses Python truthiness, operand-returning short circuit, and boolean integer arithmetic', () => {
  const source = [
    'print(False and missing, True or missing)',
    'print(False or "fallback", True and 3)',
    'print(not 0, not "", not "x", not False)',
    'print(True + True, False * 4, -True)',
  ].join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, [
    'False True',
    'fallback 3',
    'True True False True',
    '2 0 -1',
  ]);
});

test('compares bools and ints numerically and strings by Unicode code point', () => {
  const machine = createTeachingMachine(compileTeachingSource('print(False == 0, True == 1, "a" < "b", "🐍" < "\uE000")'));
  while (machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.deepEqual(machine.current.output, ['True True True False']);

  const mismatch = createTeachingMachine(compileTeachingSource('print("a" < 1)'));
  while (mismatch.current.status !== 'error') stepTeachingMachine(mismatch);
  assert.equal(mismatch.current.diagnostic?.code, 'type-error');
});

test('records the actual next instruction and result of a short-circuit decision', () => {
  const machine = createTeachingMachine(compileTeachingSource('print(False and missing)'));
  stepTeachingMachine(machine);
  const shortCircuit = stepTeachingMachine(machine);
  assert.equal(shortCircuit.pc, 3);
  assert.deepEqual(shortCircuit.controlFlow, {
    kind: 'shortCircuit',
    outcome: 'short-circuited',
    nextInstructionIndex: 3,
  });
  while (machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.deepEqual(machine.current.output, ['False']);
});

test('executes only the selected nested if/elif/else branch and reports branch decisions', () => {
  const source = [
    'if 0:',
    '  print(missing)',
    'elif "x":',
    '  if True:',
    '    print("chosen")',
    'else:',
    '  print("fallback")',
    'print("done")',
  ].join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  stepTeachingMachine(machine);
  const skipped = stepTeachingMachine(machine);
  assert.equal(skipped.controlFlow?.kind, 'branch');
  assert.equal(skipped.controlFlow?.outcome, 'branch-skipped');
  assert.equal(skipped.nextInstructionIndex, skipped.controlFlow?.nextInstructionIndex);

  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['chosen', 'done']);
});

test('repeats while bodies until the condition becomes false', () => {
  const source = [
    'i = 0',
    'while i < 3:',
    '  print(i)',
    '  i = i + 1',
    'print(i)',
  ].join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['0', '1', '2', '3']);
  assert.equal(machine.current.variables.find(({ name }) => name === 'i')?.value.value, '3');
});

test('stops an infinite while loop at the 5,000-instruction budget and points to the next instruction', () => {
  const machine = createTeachingMachine(compileTeachingSource('while True:\n  x = 1'));
  while (machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.executedInstructionCount, 5_000);
  assert.equal(machine.current.diagnostic?.code, 'instruction-budget-exceeded');
  assert.equal(machine.current.faultInstructionIndex, machine.current.pc);
  assert.equal(machine.current.nextInstructionIndex, machine.current.pc);
  assert.match(machine.current.diagnostic?.message ?? '', /5000/);
});

test('iterates positive, negative, and boolean ranges and preserves a previous loop binding on zero trips', () => {
  const source = [
    'for i in range(3):',
    '  print(i)',
    'for i in range(2, 5):',
    '  print(i)',
    'for i in range(2, -1, -1):',
    '  print(i)',
    'for i in range(True, False, -True):',
    '  print(i)',
    'i = 99',
    'for i in range(0):',
    '  print(missing)',
    'print(i)',
  ].join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['0', '1', '2', '2', '3', '4', '2', '1', '0', '1', '99']);
  assert.equal(machine.current.variables.find(({ name }) => name === 'i')?.value.value, '99');

  const missingBinding = createTeachingMachine(compileTeachingSource('for item in range(0):\n  print("never")\nprint(item)'));
  while (missingBinding.current.diagnostic === null && missingBinding.current.status !== 'finished') {
    stepTeachingMachine(missingBinding);
  }
  assert.equal(missingBinding.current.diagnostic?.code, 'name-error');
  assert.deepEqual(missingBinding.current.output, []);
});

test('reports zero range step and non-integer arguments without consuming stack values', () => {
  const zeroStep = createTeachingMachine(compileTeachingSource('for i in range(1, 2, 0):\n  print(i)'));
  while (zeroStep.current.diagnostic === null) stepTeachingMachine(zeroStep);
  assert.equal(zeroStep.current.diagnostic?.code, 'zero-range-step');
  assert.deepEqual(zeroStep.current.stack.map(({ value }) => value), ['1', '2', '0']);

  const wrongType = createTeachingMachine(compileTeachingSource('for i in range("x"):\n  print(i)'));
  while (wrongType.current.diagnostic === null) stepTeachingMachine(wrongType);
  assert.equal(wrongType.current.diagnostic?.code, 'type-error');
  assert.equal(wrongType.current.stack[0]?.value, 'x');
});

test('keeps range iteration lazy and shows a bounded iterator summary', () => {
  const stop = (1n << 4_000n).toString();
  const machine = createTeachingMachine(compileTeachingSource(`for i in range(${stop}):\n  print(i)`));
  stepTeachingMachine(machine);
  const rangeSnapshot = stepTeachingMachine(machine);
  assert.equal(rangeSnapshot.stack[0]?.type, 'range');
  assert.match(rangeSnapshot.stack[0]?.display ?? '', /^range\(\d+\)$/);
  stepTeachingMachine(machine);
  stepTeachingMachine(machine);
  assert.equal(machine.current.stack[0]?.type, 'iterator');
  assert.match(machine.current.stack[0]?.display ?? '', /next=1/);
  assert.equal(machine.current.stack.length, 2);
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
