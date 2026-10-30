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
