import assert from 'node:assert/strict';
import test from 'node:test';
import { compileTeachingSource } from '../src/teaching-vm/compiler';
import { deriveTeachingAnimationTransitions } from '../src/teaching-vm/animation';
import { createTeachingMachine, getTeachingHistory, stepTeachingMachine } from '../src/teaching-vm/vm';

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

test('does not derive motion across discontinuous history or failed instructions', () => {
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
  assert.equal(failure.transitions.length, 0);
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
