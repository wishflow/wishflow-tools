import assert from 'node:assert/strict';
import test from 'node:test';
import { compileTeachingSource } from '../src/teaching-vm/compiler';
import {
  compareTeachingObservationChanges,
  deriveTeachingObservationGroups,
} from '../src/teaching-vm/observation';
import {
  createTeachingSourceStepGoal,
  isTeachingSourceStepGoalReached,
  type TeachingSourceStepMode,
} from '../src/teaching-vm/source-step';
import type { TeachingCompileResult } from '../src/teaching-vm/types';
import {
  createTeachingMachine,
  getTeachingHistory,
  setTeachingMachineStatus,
  stepTeachingMachine,
} from '../src/teaching-vm/vm';

function runProgram(source: string) {
  const program = compileTeachingSource(source);
  const machine = createTeachingMachine(program);
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') {
    stepTeachingMachine(machine);
  }
  return { program, machine, history: getTeachingHistory(machine) };
}

function sourceStep(
  program: TeachingCompileResult,
  machine: ReturnType<typeof createTeachingMachine>,
  mode: TeachingSourceStepMode,
) {
  const goal = createTeachingSourceStepGoal(mode, program, machine.current);
  assert.ok(goal);
  let snapshot = machine.current;
  while (snapshot.status === 'ready' || snapshot.status === 'paused' || snapshot.status === 'running') {
    snapshot = stepTeachingMachine(machine, 'running');
    if (snapshot.status !== 'running' || isTeachingSourceStepGoalReached(goal, program, snapshot)) break;
  }
  if (snapshot.status === 'running' && isTeachingSourceStepGoalReached(goal, program, snapshot)) {
    return setTeachingMachineStatus(machine, 'paused', 'step');
  }
  return snapshot;
}

test('groups same-line instructions and exposes a separate terminal event', () => {
  const { program, history } = runProgram('x = 1 + 2\nprint(x)');
  const groups = deriveTeachingObservationGroups(program, history);

  assert.equal(groups[0]?.status, 'initial');
  const assignment = groups.find(({ sourceLine, points }) => sourceLine === 1 && points.some(({ kind }) => kind === 'instruction'));
  assert.ok(assignment);
  assert.equal(assignment.status, 'complete');
  assert.equal(assignment.points.length, 4);
  assert.deepEqual(assignment.points.map(({ kind }) => kind), Array(4).fill('instruction'));
  assert.equal(program.instructions[assignment.after.nextInstructionIndex ?? -1]?.span.line, 2);
  assert.equal(groups.find(({ sourceLine }) => sourceLine === 2)?.status, 'complete');
  assert.equal(groups.at(-1)?.status, 'finished');
  assert.equal(groups.at(-1)?.sourceLine, null);
});

test('keeps repeated loop lines in separate groups', () => {
  const { program, history } = runProgram([
    'i = 0',
    'while i < 2:',
    '  i = i + 1',
    'print(i)',
  ].join('\n'));
  const groups = deriveTeachingObservationGroups(program, history);

  assert.equal(groups.filter(({ sourceLine }) => sourceLine === 2).length, 3);
  assert.equal(groups.filter(({ sourceLine }) => sourceLine === 3).length, 2);
  assert.equal(groups.filter(({ sourceLine }) => sourceLine === 2).every(({ status }) => status === 'complete'), true);
});

test('groups a Step Over call through nested function instructions and return', () => {
  const program = compileTeachingSource([
    'def twice(n):',
    '  value = n * 2',
    '  return value',
    'result = twice(3)',
    'print(result)',
  ].join('\n'));
  const machine = createTeachingMachine(program);

  sourceStep(program, machine, 'over');
  const afterCall = sourceStep(program, machine, 'over');
  const groups = deriveTeachingObservationGroups(program, getTeachingHistory(machine));
  const callGroup = groups.find(({ sourceLine, startStepIndex }) => sourceLine === 4 && startStepIndex > 0);

  assert.ok(callGroup);
  assert.equal(callGroup.status, 'complete');
  assert.equal(callGroup.after.frames.length, 1);
  assert.equal(callGroup.after.variables.find(({ name }) => name === 'result')?.value.value, '6');
  assert.equal(callGroup.points.some(({ snapshot }) => snapshot.frames.length > 1), true);
  assert.equal(afterCall.frames.length, 1);
});

test('marks a Step Into call as a partial source-step group at function entry', () => {
  const program = compileTeachingSource([
    'def value():',
    '  return 1',
    'answer = value()',
    'print(answer)',
  ].join('\n'));
  const machine = createTeachingMachine(program);

  sourceStep(program, machine, 'over');
  const entered = sourceStep(program, machine, 'into');
  const groups = deriveTeachingObservationGroups(program, getTeachingHistory(machine));
  const callGroup = groups.find(({ sourceLine, startStepIndex }) => sourceLine === 3 && startStepIndex > 0);

  assert.equal(entered.frames.length, 2);
  assert.ok(callGroup);
  assert.equal(callGroup.status, 'partial');
  assert.equal(callGroup.after.stepIndex, entered.stepIndex);
});

test('records a breakpoint as a control pause before execution', () => {
  const program = compileTeachingSource('value = 1\nprint(value)');
  const machine = createTeachingMachine(program);
  machine.setBreakpoints([1]);
  const paused = stepTeachingMachine(machine);
  const groups = deriveTeachingObservationGroups(program, getTeachingHistory(machine));
  const breakpoint = groups.find(({ status }) => status === 'breakpoint');

  assert.equal(paused.executedInstructionCount, 0);
  assert.ok(breakpoint);
  assert.equal(breakpoint.before?.stepIndex, 0);
  assert.equal(breakpoint.after.executedInstructionCount, 0);
  assert.equal(breakpoint.points[0]?.kind, 'breakpoint');
  assert.equal(breakpoint.points[0]?.instructionIndex, paused.nextInstructionIndex);
});

test('classifies an instruction failure without describing it as a completed step', () => {
  const { program, history, machine } = runProgram('value = missing');
  const groups = deriveTeachingObservationGroups(program, history);
  const failure = groups.find(({ status }) => status === 'failed');

  assert.equal(machine.current.status, 'error');
  assert.ok(failure);
  assert.equal(failure.after.faultInstructionIndex, failure.points.at(-1)?.instructionIndex);
  assert.equal(failure.after.diagnostic?.code, 'name-error');
});

test('marks the first retained snapshot as a truncated prefix without inventing its prior state', () => {
  const { program, history } = runProgram([
    'i = 0',
    'while i < 200:',
    '  i = i + 1',
  ].join('\n'));
  const groups = deriveTeachingObservationGroups(program, history);

  assert.equal(history.truncated, true);
  assert.ok((history.items[0]?.stepIndex ?? 0) > 0);
  assert.equal(groups[0]?.status, 'unavailable');
  assert.equal(groups[0]?.coverage, 'prefix-truncated');
  assert.equal(groups[0]?.before, null);
  assert.equal(groups[0]?.after.stepIndex, history.items[0]?.stepIndex);
});

test('does not merge across a missing history index', () => {
  const { program, history } = runProgram('value = 1 + 2\nprint(value)');
  const items = history.items.filter((snapshot) => snapshot.stepIndex !== 2);
  const groups = deriveTeachingObservationGroups(program, { items, truncated: false });

  const discontinuity = groups.find(({ status, coverage }) => status === 'unavailable' && coverage === 'discontinuous');
  assert.ok(discontinuity);
  assert.equal(discontinuity.before, null);
});

test('does not compare a discontinuous execution-count transition', () => {
  const { program, history } = runProgram('value = 1');
  const items = history.items.map((snapshot, index) => index === 1
    ? { ...snapshot, executedInstructionCount: (history.items[0]?.executedInstructionCount ?? 0) + 2 }
    : snapshot);
  const discontinuity = deriveTeachingObservationGroups(program, { items, truncated: false })
    .find(({ coverage }) => coverage === 'discontinuous');
  assert.ok(discontinuity);

  const diff = compareTeachingObservationChanges(discontinuity);
  assert.equal(diff.baseline, false);
  assert.equal(diff.hasChanges, false);
  assert.deepEqual(diff.changes, []);
});

test('reports a new alias without marking the existing binding as changed', () => {
  const { program, history } = runProgram('items = [1]\nalias = items');
  const group = deriveTeachingObservationGroups(program, history).find(({ sourceLine, points }) => (
    sourceLine === 2 && points.some(({ kind }) => kind === 'instruction')
  ));
  assert.ok(group);

  const diff = compareTeachingObservationChanges(group);
  const alias = diff.changes.find((change) => change.kind === 'binding-added' && change.name === 'alias');
  assert.equal(diff.baseline, true);
  assert.ok(alias);
  if (alias.kind !== 'binding-added') assert.fail('expected a new binding change');
  assert.equal(alias?.objectId, 1);
  assert.equal(alias?.isAlias, true);
  assert.equal(diff.changes.some((change) => change.kind === 'binding-updated' && change.name === 'items'), false);
});

test('does not report an unchanged scalar binding as a change', () => {
  const { program, history } = runProgram('value = 1\nvalue = 1');
  const group = deriveTeachingObservationGroups(program, history).find(({ sourceLine, points }) => (
    sourceLine === 2 && points.some(({ kind }) => kind === 'instruction')
  ));
  assert.ok(group);

  const diff = compareTeachingObservationChanges(group);
  assert.equal(diff.hasChanges, false);
  assert.deepEqual(diff.changes, []);
  assert.equal(diff.omittedCount, 0);
});

test('reports an in-place list change separately from its stable object binding', () => {
  const { program, history } = runProgram('items = [1]\nitems[0] = 9');
  const group = deriveTeachingObservationGroups(program, history).find(({ sourceLine, points }) => (
    sourceLine === 2 && points.some(({ kind }) => kind === 'instruction')
  ));
  assert.ok(group);

  const diff = compareTeachingObservationChanges(group);
  assert.equal(diff.changes.some((change) => (
    change.kind === 'list-item-updated'
      && change.objectId === 1
      && change.index === 0
      && change.beforeValue === '1'
      && change.afterValue === '9'
  )), true);
  assert.equal(diff.changes.some((change) => change.kind === 'binding-updated' && change.name === 'items'), false);
});

test('reports dictionary entry updates and additions using Python key identity', () => {
  const { program, history } = runProgram("mapping = {1: 2}\nmapping[True] = 3\nmapping['x'] = 4");
  const groups = deriveTeachingObservationGroups(program, history);
  const update = groups.find(({ sourceLine, points }) => (
    sourceLine === 2 && points.some(({ kind }) => kind === 'instruction')
  ));
  const addition = groups.find(({ sourceLine, points }) => (
    sourceLine === 3 && points.some(({ kind }) => kind === 'instruction')
  ));
  assert.ok(update);
  assert.ok(addition);

  const updateDiff = compareTeachingObservationChanges(update);
  const updatedEntry = updateDiff.changes.find((change) => change.kind === 'dict-entry-updated');
  assert.ok(updatedEntry);
  if (updatedEntry.kind !== 'dict-entry-updated') assert.fail('expected dictionary entry update');
  assert.equal(updatedEntry.key, '1');
  assert.equal(updatedEntry.beforeValue, '2');
  assert.equal(updatedEntry.afterValue, '3');

  const additionDiff = compareTeachingObservationChanges(addition);
  const addedEntry = additionDiff.changes.find((change) => change.kind === 'dict-entry-added');
  assert.ok(addedEntry);
  if (addedEntry.kind !== 'dict-entry-added') assert.fail('expected dictionary entry addition');
  assert.equal(addedEntry.key, '"x"');
  assert.equal(addedEntry.afterValue, '4');
});

test('distinguishes an equal-valued new object from an alias', () => {
  const { program, history } = runProgram('first = [1]\nsecond = [1]');
  const group = deriveTeachingObservationGroups(program, history).find(({ sourceLine, points }) => (
    sourceLine === 2 && points.some(({ kind }) => kind === 'instruction')
  ));
  assert.ok(group);

  const diff = compareTeachingObservationChanges(group);
  const second = diff.changes.find((change) => change.kind === 'binding-added' && change.name === 'second');
  assert.ok(second);
  if (second.kind !== 'binding-added') assert.fail('expected a new binding change');
  assert.equal(second?.objectId, 2);
  assert.equal(second?.isAlias, false);
  assert.equal(diff.changes.some((change) => change.kind === 'object-created' && change.objectId === 2), true);
});

test('detects transient function frame entry and return within a source-step group', () => {
  const { program, history } = runProgram([
    'def bump(xs):',
    '  xs[0] = 9',
    '  return xs',
    'items = [1]',
    'result = bump(items)',
  ].join('\n'));
  const group = deriveTeachingObservationGroups(program, history).find(({ sourceLine, points }) => (
    sourceLine === 5 && points.some(({ kind }) => kind === 'instruction')
  ));
  assert.ok(group);

  const diff = compareTeachingObservationChanges(group);
  const frameEvents = diff.changes.reduce<Array<[string, string]>>((events, change) => {
    if (change.kind === 'frame-entered' || change.kind === 'frame-returned') {
      events.push([change.kind, change.frameName]);
    }
    return events;
  }, []);
  assert.deepEqual(frameEvents, [
    ['frame-entered', 'bump'],
    ['frame-returned', 'bump'],
  ]);
  assert.equal(diff.changes.some((change) => change.kind === 'list-item-updated' && change.objectId === 1), true);
});

test('reports output appended after the source-step baseline', () => {
  const { program, history } = runProgram("print('hello')");
  const group = deriveTeachingObservationGroups(program, history).find(({ sourceLine, points }) => (
    sourceLine === 1 && points.some(({ kind }) => kind === 'instruction')
  ));
  assert.ok(group);

  const diff = compareTeachingObservationChanges(group);
  const output = diff.changes.find((change) => change.kind === 'output-added');
  assert.ok(output);
  if (output.kind !== 'output-added') assert.fail('expected output change');
  assert.deepEqual(output.outputLines, ['hello']);
});

test('caps the rendered change list and reports omitted changes', () => {
  const body = Array.from({ length: 8 }, (_, index) => `  items[${index}] = ${index + 10}`);
  const source = [
    'def change(items):',
    ...body,
    '  return items',
    'items = [0, 1, 2, 3, 4, 5, 6, 7]',
    'result = change(items)',
  ].join('\n');
  const { program, history } = runProgram(source);
  const group = deriveTeachingObservationGroups(program, history).find(({ sourceLine, points }) => (
    sourceLine === body.length + 4 && points.some(({ kind }) => kind === 'instruction')
  ));
  assert.ok(group);

  const diff = compareTeachingObservationChanges(group);
  assert.equal(diff.changes.length, 6);
  assert.ok(diff.omittedCount >= 3);
  assert.equal(diff.hasChanges, true);
});

test('does not invent a diff when the group has no retained before snapshot', () => {
  const { program, history } = runProgram([
    'i = 0',
    'while i < 200:',
    '  i = i + 1',
  ].join('\n'));
  const prefix = deriveTeachingObservationGroups(program, history)[0];
  assert.ok(prefix);

  const diff = compareTeachingObservationChanges(prefix);
  assert.equal(diff.baseline, false);
  assert.equal(diff.hasChanges, false);
  assert.deepEqual(diff.changes, []);
});
