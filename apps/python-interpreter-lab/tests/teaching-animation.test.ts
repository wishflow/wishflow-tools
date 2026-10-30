import assert from 'node:assert/strict';
import test from 'node:test';
import { compileTeachingSource } from '../src/teaching-vm/compiler';
import { deriveTeachingAnimationTransitions } from '../src/teaching-vm/animation';
import { createTeachingMachine, getTeachingHistory, stepTeachingMachine } from '../src/teaching-vm/vm';
import type { TeachingFrameSnapshot, TeachingVmSnapshot } from '../src/teaching-vm/types';

function runProgram(source: string) {
  const program = compileTeachingSource(source);
  const machine = createTeachingMachine(program);
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') {
    stepTeachingMachine(machine);
  }
  return { program, history: getTeachingHistory(machine) };
}

function transitionsForEveryRecordedInstruction(program: ReturnType<typeof compileTeachingSource>, snapshots: ReturnType<typeof getTeachingHistory>['items']) {
  const transitions = [];
  for (let index = 1; index < snapshots.length; index += 1) {
    const before = snapshots[index - 1];
    const after = snapshots[index];
    if (!before || !after) continue;
    transitions.push(...deriveTeachingAnimationTransitions(program, before, [after]).transitions);
  }
  return transitions;
}

function replaceActiveFrame(
  snapshot: TeachingVmSnapshot,
  update: (frame: TeachingFrameSnapshot) => TeachingFrameSnapshot,
): TeachingVmSnapshot {
  const active = snapshot.frames.at(-1);
  assert.ok(active);
  const updated = update(active);
  const frames = Object.freeze(snapshot.frames.map((frame) => frame.id === active.id ? updated : frame));
  return Object.freeze({
    ...snapshot,
    pc: updated.pc,
    nextInstructionIndex: snapshot.status === 'finished' ? null : updated.pc,
    stack: updated.stack,
    variables: updated.variables,
    frames,
  });
}

test('derives real stack, binding, object creation, mutation, and arithmetic transitions', () => {
  const { program, history } = runProgram([
    'a = [1]',
    'b = a',
    'b[0] = 9',
    'b = [2]',
    'total = 1 + 2',
  ].join('\n'));
  const transitions = transitionsForEveryRecordedInstruction(program, history.items);

  const listCreations = transitions.filter(({ kind }) => kind === 'object-created');
  assert.equal(listCreations.length, 2);
  assert.deepEqual(listCreations.map(({ objectId }) => objectId), [1, 2]);

  const alias = transitions.find(({ kind, bindingName }) => kind === 'bind-name' && bindingName === 'b');
  assert.ok(alias);
  assert.equal(alias.value?.objectId, 1);
  assert.equal(alias.after.variables.find(({ name }) => name === 'a')?.value.objectId, alias.value?.objectId);

  const mutation = transitions.find(({ kind }) => kind === 'mutate-object');
  assert.ok(mutation);
  assert.equal(mutation.objectId, 1);
  assert.equal(mutation.itemIndex, 0);
  assert.equal(mutation.before.heap.find(({ id }) => id === 1)?.type, 'list');
  assert.equal(mutation.after.heap.find(({ id }) => id === 1)?.type, 'list');
  const item = mutation.after.heap.find(({ id }) => id === 1);
  assert.equal(item?.type === 'list' ? item.items[0]?.value : undefined, '9');

  const addition = transitions.find(({ kind, operands }) => kind === 'operate' && operands.length === 2);
  assert.ok(addition);
  assert.deepEqual(addition.operands.map(({ value }) => value), ['1', '2']);
  assert.equal(addition.value?.value, '3');
});

test('caps a source-step transition list and reports omitted recognized instructions', () => {
  const { program, history } = runProgram('value = 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8');
  const before = history.items[0];
  assert.ok(before);
  const result = deriveTeachingAnimationTransitions(program, before, history.items.slice(1));

  assert.equal(result.baselineAvailable, true);
  assert.equal(result.transitions.length, 12);
  assert.ok(result.omittedCount > 0);
});

test('prioritizes control-flow boundaries under the cap and preserves their order', () => {
  const condition = Array.from({ length: 16 }, () => '1').join(' + ');
  const longBranch = runProgram(`if ${condition}:\n    selected = 1\nelse:\n    selected = 0`);
  const branchBefore = longBranch.history.items[0];
  assert.ok(branchBefore);
  const branchResult = deriveTeachingAnimationTransitions(longBranch.program, branchBefore, longBranch.history.items.slice(1));
  assert.ok(branchResult.transitions.some(({ kind }) => kind === 'branch'));
  assert.equal(branchResult.transitions.length, 12);
  assert.ok(branchResult.omittedCount > 0);

  const loop = runProgram('index = 0\nwhile index < 8:\n    index = index + 1');
  const loopBefore = loop.history.items[0];
  assert.ok(loopBefore);
  const allTransitions = transitionsForEveryRecordedInstruction(loop.program, loop.history.items);
  const allBoundaries = allTransitions.filter(({ kind }) => ['branch', 'jump', 'short-circuit', 'iteration'].includes(kind));
  const result = deriveTeachingAnimationTransitions(loop.program, loopBefore, loop.history.items.slice(1));
  const selectedBoundaries = result.transitions.filter(({ kind }) => ['branch', 'jump', 'short-circuit', 'iteration'].includes(kind));
  const summarize = (transitions: typeof allBoundaries) => transitions.map(({ kind, instructionIndex, nextInstructionIndex, controlFlowOutcome }) => ({
    kind,
    instructionIndex,
    nextInstructionIndex,
    controlFlowOutcome,
  }));

  assert.ok(allBoundaries.length > 12);
  assert.equal(result.transitions.length, 12);
  assert.ok(result.omittedCount > 0);
  assert.deepEqual(summarize(selectedBoundaries), summarize([
    ...allBoundaries.slice(0, 6),
    ...allBoundaries.slice(-6),
  ]));
});

test('keeps call and return boundaries when ordinary instruction transitions exceed the cap', () => {
  const { program, history } = runProgram([
    'def descend(n):',
    '    if n == 0:',
    '        return n',
    '    return descend(n - 1)',
    'answer = descend(2)',
  ].join('\n'));
  const before = history.items[0];
  assert.ok(before);
  const allTransitions = transitionsForEveryRecordedInstruction(program, history.items);
  const expectedFrameTransitions = allTransitions.filter(({ kind }) => kind.startsWith('call-'));
  const result = deriveTeachingAnimationTransitions(program, before, history.items.slice(1));

  assert.equal(result.transitions.length, 12);
  const summarizeFrameTransitions = (transitions: typeof expectedFrameTransitions) => transitions.map(({ kind, callerFrameId, calleeFrameId, returnValue }) => ({
    kind,
    callerFrameId,
    calleeFrameId,
    returnValue: returnValue?.display ?? null,
  }));
  assert.deepEqual(
    summarizeFrameTransitions(result.transitions.filter(({ kind }) => kind.startsWith('call-'))),
    summarizeFrameTransitions(expectedFrameTransitions),
  );
  assert.ok(result.omittedCount > 0);
});

test('does not derive motion across discontinuous history and records known runtime failures', () => {
  const { program, history } = runProgram('value = 1 + 2');
  const before = history.items[0];
  const secondAfter = history.items[2];
  assert.ok(before);
  assert.ok(secondAfter);
  const discontinuous = deriveTeachingAnimationTransitions(program, before, [secondAfter]);
  assert.equal(discontinuous.baselineAvailable, false);
  assert.deepEqual(discontinuous.transitions, []);

  const failed = runProgram('value = missing');
  const failedBefore = failed.history.items[0];
  assert.ok(failedBefore);
  const failure = deriveTeachingAnimationTransitions(failed.program, failedBefore, failed.history.items.slice(1));
  assert.equal(failure.transitions.length, 1);
  assert.equal(failure.transitions[0]?.kind, 'runtime-error');
  assert.equal(failure.transitions[0]?.diagnostic?.code, 'name-error');
});

test('derives branch decisions and forward or backward jumps from confirmed targets', () => {
  const { program, history } = runProgram([
    'selected = 0',
    'if False:',
    '    selected = 1',
    'else:',
    '    selected = 2',
    'if True:',
    '    selected = 3',
    'else:',
    '    selected = 9',
    'while selected < 4:',
    '    selected = selected + 1',
  ].join('\n'));
  const control = transitionsForEveryRecordedInstruction(program, history.items)
    .filter(({ kind }) => kind === 'branch' || kind === 'jump');
  const branches = control.filter(({ kind }) => kind === 'branch');
  const jumps = control.filter(({ kind }) => kind === 'jump');

  assert.deepEqual(branches.map(({ controlFlowOutcome }) => controlFlowOutcome), [
    'branch-skipped',
    'branch-taken',
    'branch-taken',
    'branch-skipped',
  ]);
  assert.deepEqual(branches.map(({ operands }) => operands[0]?.display), ['False', 'True', 'True', 'False']);
  assert.ok(jumps.some(({ instructionIndex, nextInstructionIndex }) => nextInstructionIndex !== null && nextInstructionIndex > instructionIndex));
  assert.ok(jumps.some(({ instructionIndex, nextInstructionIndex }) => nextInstructionIndex !== null && nextInstructionIndex < instructionIndex));

  for (const transition of control) {
    assert.equal(transition.nextInstructionIndex, transition.after.nextInstructionIndex);
    assert.equal(transition.nextInstructionIndex, transition.after.frames.at(-1)?.pc);
    const target = transition.nextInstructionIndex === null ? undefined : program.instructions[transition.nextInstructionIndex];
    assert.equal(transition.nextInstructionSpan?.line ?? null, target?.opcode === 'HALT' ? null : target?.span.line ?? null);
  }
});

test('derives short-circuit outcomes and actual range iteration values', () => {
  const { program, history } = runProgram([
    'and_short = 0 and missing',
    'and_right = 2 and 3',
    'or_short = 2 or missing',
    'or_right = 0 or 4',
    'for item in range(2):',
    '    print(item)',
    'for empty_item in range(0):',
    '    print(empty_item)',
  ].join('\n'));
  const transitions = transitionsForEveryRecordedInstruction(program, history.items);
  const shortCircuit = transitions.filter(({ kind }) => kind === 'short-circuit');
  const iteration = transitions.filter(({ kind }) => kind === 'iteration');

  assert.deepEqual(shortCircuit.map(({ controlFlowOutcome, operands, value }) => ({
    outcome: controlFlowOutcome,
    left: operands[0]?.display,
    retained: value?.display ?? null,
  })), [
    { outcome: 'short-circuited', left: '0', retained: '0' },
    { outcome: 'evaluated-right', left: '2', retained: null },
    { outcome: 'short-circuited', left: '2', retained: '2' },
    { outcome: 'evaluated-right', left: '0', retained: null },
  ]);
  assert.deepEqual(iteration.map(({ controlFlowOutcome, value, instructionIndex, nextInstructionIndex }) => ({
    outcome: controlFlowOutcome,
    value: value?.display ?? null,
    line: program.instructions[instructionIndex]?.span.line,
    next: nextInstructionIndex,
  })), [
    { outcome: 'next-value', value: '0', line: 5, next: iteration[0]?.instructionIndex + 1 },
    { outcome: 'next-value', value: '1', line: 5, next: iteration[1]?.instructionIndex + 1 },
    { outcome: 'loop-finished', value: null, line: 5, next: program.instructions[iteration[2]?.instructionIndex ?? -1]?.argument },
    { outcome: 'loop-finished', value: null, line: 7, next: program.instructions[iteration[3]?.instructionIndex ?? -1]?.argument },
  ]);
  assert.equal(history.items.at(-1)?.variables.some(({ name }) => name === 'empty_item'), false);
});

test('rejects range iteration snapshots with an inconsistent yielded value or iterator update', () => {
  const { program, history } = runProgram('for item in range(0, 5, 2):\n  total = item');
  const iteration = transitionsForEveryRecordedInstruction(program, history.items)
    .find(({ kind, controlFlowOutcome }) => kind === 'iteration' && controlFlowOutcome === 'next-value');
  assert.ok(iteration);

  const wrongYield = replaceActiveFrame(iteration.after, (frame) => {
    const yielded = frame.stack.at(-1);
    assert.equal(yielded?.type, 'int');
    const corrupted = Object.freeze({ ...yielded!, value: '999', display: '999' });
    return Object.freeze({ ...frame, stack: Object.freeze([...frame.stack.slice(0, -1), corrupted]) });
  });
  const wrongIterator = replaceActiveFrame(iteration.after, (frame) => {
    const iteratorIndex = frame.stack.length - 2;
    const iterator = frame.stack[iteratorIndex];
    assert.equal(iterator?.type, 'iterator');
    const corrupted = Object.freeze({
      ...iterator!,
      value: 'iterator(range(0, 5, 2), next=4)',
      display: 'iterator(range(0, 5, 2), next=4)',
    });
    return Object.freeze({
      ...frame,
      stack: Object.freeze(frame.stack.map((value, index) => index === iteratorIndex ? corrupted : value)),
    });
  });

  for (const after of [wrongYield, wrongIterator]) {
    const result = deriveTeachingAnimationTransitions(program, iteration.before, [after]);
    assert.equal(result.baselineAvailable, false);
    assert.deepEqual(result.transitions, []);
  }
});

test('rejects control-flow transitions when the recorded operand, outcome, or next PC disagrees', () => {
  const { program, history } = runProgram('if False:\n    value = 1\nelse:\n    value = 2');
  const branch = transitionsForEveryRecordedInstruction(program, history.items).find(({ kind }) => kind === 'branch');
  assert.ok(branch);

  const wrongOutcome = Object.freeze({
    ...branch.after,
    controlFlow: Object.freeze({
      kind: 'branch' as const,
      outcome: 'branch-taken',
      nextInstructionIndex: branch.after.pc,
    }),
  });
  const wrongTarget = Object.freeze({
    ...branch.after,
    controlFlow: Object.freeze({
      ...branch.after.controlFlow!,
      nextInstructionIndex: branch.after.pc + 1,
    }),
  });
  const wrongStack = replaceActiveFrame(branch.after, (frame) => Object.freeze({
    ...frame,
    stack: Object.freeze([...frame.stack, branch.operands[0]!]),
  }));

  for (const after of [wrongOutcome, wrongTarget, wrongStack]) {
    const result = deriveTeachingAnimationTransitions(program, branch.before, [after]);
    assert.equal(result.baselineAvailable, false);
    assert.deepEqual(result.transitions, []);
  }
});

test('derives common runtime failures only when the failed instruction commits no state', () => {
  const cases = [
    { source: 'value = missing', code: 'name-error', opcode: 'LOAD_NAME', operands: [] },
    { source: 'value = 1 + "x"', code: 'type-error', opcode: 'BINARY_ADD', operands: ['1', '"x"'] },
    { source: 'items = [1]\nvalue = items[2]', code: 'index-out-of-range', opcode: 'BINARY_SUBSCR', operands: ['list #1', '2'] },
    { source: 'mapping = {"a": 1}\nvalue = mapping["missing"]', code: 'key-not-found', opcode: 'BINARY_SUBSCR', operands: ['dict #1', '"missing"'] },
    { source: 'for item in range(1, 2, 0):\n    result = item', code: 'zero-range-step', opcode: 'BUILD_RANGE', operands: ['1', '2', '0'] },
    { source: 'items = [1]\nitems[2] = 9', code: 'index-out-of-range', opcode: 'STORE_SUBSCR', operands: ['9', 'list #1', '2'] },
  ] as const;

  for (const scenario of cases) {
    const { program, history } = runProgram(scenario.source);
    const before = history.items.at(-2);
    const after = history.items.at(-1);
    assert.ok(before);
    assert.ok(after);
    const result = deriveTeachingAnimationTransitions(program, before, [after]);
    const failure = result.transitions.at(-1);
    assert.equal(result.baselineAvailable, true, scenario.source);
    assert.equal(failure?.kind, 'runtime-error', scenario.source);
    assert.equal(failure?.opcode, scenario.opcode, scenario.source);
    assert.equal(failure?.diagnostic?.code, scenario.code, scenario.source);
    assert.deepEqual(failure?.operands.map(({ display }) => display), scenario.operands, scenario.source);
    assert.deepEqual(before.frames.map(({ id, pc, stack, variables }) => ({ id, pc, stack, variables })),
      after.frames.map(({ id, pc, stack, variables }) => ({ id, pc, stack, variables })), scenario.source);
    assert.deepEqual(before.heap, after.heap, scenario.source);
    assert.deepEqual(before.output, after.output, scenario.source);
  }
});

test('does not partially append output when the output limit rejects a print', () => {
  const longLine = 'x'.repeat(4_096);
  const source = `for item in range(8):\n    print("${longLine}")`;
  const { program, history } = runProgram(source);
  const before = history.items.at(-2);
  const after = history.items.at(-1);
  assert.ok(before);
  assert.ok(after);
  const result = deriveTeachingAnimationTransitions(program, before, [after]);
  const failure = result.transitions.at(-1);

  assert.equal(after.diagnostic?.code, 'output-too-long');
  assert.equal(failure?.kind, 'runtime-error');
  assert.equal(failure?.opcode, 'PRINT');
  assert.equal(failure?.operands[0]?.value.length, 4_096);
  assert.deepEqual(after.output, before.output);
  assert.deepEqual(after.stack, before.stack);
});

test('marks the instruction-budget boundary as not executed and leaves state unchanged', () => {
  const { program, history } = runProgram('while True:\n    value = 1');
  const before = history.items.at(-2);
  const after = history.items.at(-1);
  assert.ok(before);
  assert.ok(after);
  const result = deriveTeachingAnimationTransitions(program, before, [after]);
  const failure = result.transitions.at(-1);

  assert.equal(after.diagnostic?.code, 'instruction-budget-exceeded');
  assert.equal(after.executedInstructionCount, before.executedInstructionCount);
  assert.equal(failure?.kind, 'budget-exhausted');
  assert.equal(failure?.instructionIndex, before.nextInstructionIndex);
  assert.equal(failure?.nextInstructionIndex, before.nextInstructionIndex);
  assert.equal(failure?.diagnostic?.code, 'instruction-budget-exceeded');
  assert.deepEqual(after.frames.map(({ id, pc, stack, variables }) => ({ id, pc, stack, variables })),
    before.frames.map(({ id, pc, stack, variables }) => ({ id, pc, stack, variables })));
  assert.deepEqual(after.heap, before.heap);
  assert.deepEqual(after.output, before.output);
});

test('does not explain unknown or inconsistent runtime failures as a committed event', () => {
  const { program, history } = runProgram('value = 1 + "x"');
  const before = history.items.at(-2);
  const after = history.items.at(-1);
  assert.ok(before);
  assert.ok(after);
  const unknown = Object.freeze({
    ...after,
    diagnostic: Object.freeze({ ...after.diagnostic!, code: 'internal-vm-error' }),
  });
  const wrongSpan = Object.freeze({
    ...after,
    diagnostic: Object.freeze({ ...after.diagnostic!, span: Object.freeze({ ...after.diagnostic!.span, line: 99 }) }),
  });
  const changedHeap = Object.freeze({ ...after, heap: Object.freeze([{ id: 999, type: 'list' as const, items: Object.freeze([]) }]) });

  for (const candidate of [unknown, wrongSpan, changedHeap]) {
    const result = deriveTeachingAnimationTransitions(program, before, [candidate]);
    assert.equal(result.baselineAvailable, true);
    assert.equal(result.transitions.some(({ kind }) => kind === 'runtime-error'), false);
  }
});

test('preserves a runtime-error boundary when ordinary instructions exceed the transition cap', () => {
  const expression = Array.from({ length: 16 }, () => '1').join(' + ');
  const { program, history } = runProgram(`result = (${expression}) + "x"`);
  const before = history.items[0];
  assert.ok(before);
  const result = deriveTeachingAnimationTransitions(program, before, history.items.slice(1));

  assert.equal(result.transitions.length, 12);
  assert.ok(result.omittedCount > 0);
  assert.equal(result.transitions.at(-1)?.kind, 'runtime-error');
  assert.equal(result.transitions.at(-1)?.diagnostic?.code, 'type-error');
});

test('identifies a circular list by object ID without expanding its contents', () => {
  const { program, history } = runProgram('items = [None]\nitems[0] = items');
  const transitions = transitionsForEveryRecordedInstruction(program, history.items);
  const mutation = transitions.find(({ kind }) => kind === 'mutate-object');
  assert.ok(mutation);
  assert.equal(mutation.objectId, 1);
  const object = mutation.after.heap.find(({ id }) => id === mutation.objectId);
  assert.equal(object?.type, 'list');
  assert.equal(object?.type === 'list' ? object.items[0]?.objectId : undefined, mutation.objectId);
});

test('highlights empty container creation and repeated equal list values by index', () => {
  const { program, history } = runProgram('empty = []\nvalues = [1, 1]\nvalues[1] = 1');
  const transitions = transitionsForEveryRecordedInstruction(program, history.items);
  const emptyObject = transitions.find(({ kind, objectId }) => kind === 'object-created' && objectId === 1);
  const repeatedValueMutation = transitions.find(({ kind }) => kind === 'mutate-object');

  assert.equal(emptyObject?.objectType, 'list');
  assert.ok(repeatedValueMutation);
  assert.equal(repeatedValueMutation.itemIndex, 1);
  assert.equal(repeatedValueMutation.value?.value, '1');
});

test('matches bool and int keys using the teaching VM dictionary key rules', () => {
  const { program, history } = runProgram("mapping = {1: 'before'}\nmapping[True] = 'after'");
  const mutation = transitionsForEveryRecordedInstruction(program, history.items)
    .find(({ kind }) => kind === 'mutate-object');

  assert.ok(mutation);
  assert.equal(mutation.objectType, 'dict');
  assert.equal(mutation.itemKey?.type, 'int');
  assert.equal(mutation.itemKey?.value, '1');
  assert.equal(mutation.value?.value, 'after');
});

test('derives call parameter transfer and return value from adjacent frame snapshots', () => {
  const { program, history } = runProgram([
    'def echo(first, second):',
    '    return first',
    'shared = [1]',
    'result = echo(shared, shared)',
  ].join('\n'));
  const transitions = transitionsForEveryRecordedInstruction(program, history.items);
  const call = transitions.find(({ kind }) => kind === 'call-enter');
  const returned = transitions.find(({ kind }) => kind === 'call-return');

  assert.ok(call);
  assert.equal(call.functionName, 'echo');
  assert.equal(call.callerFrameId, 0);
  assert.equal(call.calleeFrameId, 1);
  assert.equal(call.frameId, call.calleeFrameId);
  assert.equal(call.callSite?.line, 4);
  assert.equal(call.returnPc, call.after.frames[0]?.pc);
  assert.deepEqual(call.callBindings.map(({ name, argumentIndex, value }) => ({
    name,
    argumentIndex,
    value: value.display,
  })), [
    { name: 'first', argumentIndex: 0, value: 'list #1' },
    { name: 'second', argumentIndex: 1, value: 'list #1' },
  ]);
  assert.deepEqual(call.callBindings.map(({ stackIndex }) => stackIndex), [0, 1]);
  assert.equal(call.after.frames.at(-1)?.variables.find(({ name }) => name === 'first')?.value.objectId, 1);
  assert.equal(call.after.frames.at(-1)?.variables.find(({ name }) => name === 'second')?.value.objectId, 1);
  assert.equal(call.before.frames.at(-1)?.stack.length, 2);
  assert.equal(call.after.frames.at(-1)?.stack.length, 0);

  assert.ok(returned);
  assert.equal(returned.functionName, 'echo');
  assert.equal(returned.calleeFrameId, call.calleeFrameId);
  assert.equal(returned.callerFrameId, call.callerFrameId);
  assert.equal(returned.returnValue?.objectId, 1);
  assert.equal(returned.after.frames.at(-1)?.stack.at(-1)?.objectId, 1);
  assert.equal(returned.after.frames.at(-1)?.variables.some(({ name }) => name === 'result'), false);
});

test('keeps recursive calls with the same name distinct and returns them in stack order', () => {
  const { program, history } = runProgram([
    'def count_down(n):',
    '    if n == 0:',
    '        return n',
    '    return count_down(n - 1)',
    'answer = count_down(2)',
  ].join('\n'));
  const transitions = transitionsForEveryRecordedInstruction(program, history.items);
  const calls = transitions.filter(({ kind }) => kind === 'call-enter');
  const returns = transitions.filter(({ kind }) => kind === 'call-return');

  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map(({ functionName }) => functionName), ['count_down', 'count_down', 'count_down']);
  assert.deepEqual(calls.map(({ callBindings }) => callBindings[0]?.value.value), ['2', '1', '0']);
  const frameIds = calls.map(({ calleeFrameId }) => calleeFrameId);
  assert.equal(new Set(frameIds).size, 3);
  assert.deepEqual(returns.map(({ calleeFrameId }) => calleeFrameId), [...frameIds].reverse());
  assert.deepEqual(returns.map(({ callerFrameId }, index) => callerFrameId), [frameIds[1], frameIds[0], 0]);
  assert.ok(returns.every(({ returnPc }) => returnPc !== null));
});

test('shows actual None values for bare and natural function returns', () => {
  const { program, history } = runProgram([
    'def bare_return():',
    '    return',
    'def natural_return():',
    '    value = 1',
    'first = bare_return()',
    'second = natural_return()',
  ].join('\n'));
  const returns = transitionsForEveryRecordedInstruction(program, history.items)
    .filter(({ kind }) => kind === 'call-return');

  assert.deepEqual(returns.map(({ functionName, opcode, returnValue }) => ({
    functionName,
    opcode,
    value: returnValue?.display,
    type: returnValue?.type,
  })), [
    { functionName: 'bare_return', opcode: 'RETURN_NONE', value: 'None', type: 'none' },
    { functionName: 'natural_return', opcode: 'RETURN_NONE', value: 'None', type: 'none' },
  ]);
});

test('shows rejected target and argument calls without a successful frame entry', () => {
  for (const source of ['result = missing(1)', 'def add(left, right):\n    return left + right\nresult = add(1)']) {
    const { program, history } = runProgram(source);
    const transitions = transitionsForEveryRecordedInstruction(program, history.items);
    const rejected = transitions.filter(({ kind }) => kind === 'call-rejected');

    assert.equal(rejected.length, 1);
    assert.equal(transitions.some(({ kind }) => kind === 'call-enter'), false);
    assert.equal(rejected[0]?.diagnostic?.code, source.startsWith('result = missing') ? 'name-error' : 'argument-count-mismatch');
    assert.equal(rejected[0]?.before.frames.length, rejected[0]?.after.frames.length);
    assert.deepEqual(
      rejected[0]?.before.frames.map(({ id }) => id),
      rejected[0]?.after.frames.map(({ id }) => id),
    );
  }

  const missingCall = runProgram('result = missing(1)');
  const before = missingCall.history.items[0];
  const failure = missingCall.history.items.at(-1);
  assert.ok(before);
  assert.ok(failure?.diagnostic);
  const unrelatedDiagnostic = Object.freeze({
    ...failure,
    diagnostic: Object.freeze({
      ...failure.diagnostic,
      span: Object.freeze({ ...failure.diagnostic.span, line: failure.diagnostic.span.line + 1 }),
    }),
  });
  const unrelatedFailure = deriveTeachingAnimationTransitions(missingCall.program, before, [
    ...missingCall.history.items.slice(1, -1),
    unrelatedDiagnostic,
  ]);
  assert.equal(unrelatedFailure.transitions.some(({ kind }) => kind === 'call-rejected'), false);
});

test('preserves successful frame transitions before a later function runtime error', () => {
  const { program, history } = runProgram('def broken():\n    return missing\nresult = broken()');
  const before = history.items[0];
  assert.ok(before);
  const result = deriveTeachingAnimationTransitions(program, before, history.items.slice(1));

  assert.equal(result.baselineAvailable, true);
  assert.ok(result.transitions.some(({ kind }) => kind === 'call-enter'));
  assert.equal(result.transitions.some(({ kind }) => kind === 'call-return'), false);
  assert.equal(history.items.at(-1)?.diagnostic?.code, 'name-error');
});

test('shows frame and local-name budget errors without claiming a callee frame was created', () => {
  const frameLimited = runProgram('def recurse(n):\n    return recurse(n + 1)\nvalue = recurse(0)');
  const frameTransitions = transitionsForEveryRecordedInstruction(frameLimited.program, frameLimited.history.items);
  assert.equal(frameLimited.history.items.at(-1)?.diagnostic?.code, 'frame-limit-exceeded');
  assert.equal(frameLimited.history.items.at(-1)?.frames.length, 64);
  assert.equal(frameTransitions.filter(({ kind }) => kind === 'call-enter').length, 63);
  assert.equal(frameTransitions.at(-1)?.kind, 'call-rejected');

  const localAssignments = Array.from({ length: 200 }, (_, index) => `    local_${index} = 1`).join('\n');
  const nameLimited = runProgram(`def too_many():\n${localAssignments}\nvalue = too_many()`);
  const nameTransitions = transitionsForEveryRecordedInstruction(nameLimited.program, nameLimited.history.items);
  assert.equal(nameLimited.history.items.at(-1)?.diagnostic?.code, 'too-many-names');
  assert.equal(nameTransitions.at(-1)?.kind, 'call-rejected');
  assert.equal(nameTransitions.some(({ kind }) => kind === 'call-enter'), false);
});
