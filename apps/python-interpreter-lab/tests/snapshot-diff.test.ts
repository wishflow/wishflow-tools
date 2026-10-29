import assert from 'node:assert/strict';
import test from 'node:test';
import type { EventSnapshot, FrameSnapshot, SnapshotValue, TraceEvent } from '../src/analysis/types';
import { compareTraceSnapshots } from '../src/analysis/snapshot-diff';

function scalar(name: string, value: string): SnapshotValue {
  return { name, type: 'int', kind: 'scalar', summary: value, valueText: value };
}

function container(name: string, referenceId: number, children: SnapshotValue[] = []): SnapshotValue {
  return {
    name,
    type: 'list',
    kind: 'container',
    summary: '<list · 1 items>',
    itemCount: 1,
    referenceId,
    children,
  };
}

function frame(frameId: number, functionName: string, locals: SnapshotValue[], localsTruncated = false): FrameSnapshot {
  return { frameId, functionName, line: 1, locals, localsTruncated };
}

function event(
  snapshot: Partial<EventSnapshot> & Pick<EventSnapshot, 'globals' | 'frames'>,
  callStackTruncated = false,
): TraceEvent {
  return {
    index: 0,
    event: 'line',
    phase: 'line-before',
    line: 1,
    functionName: '<module>',
    callStack: ['<module>'],
    callStackTruncated,
    snapshot: {
      globalsTruncated: false,
      currentFrameId: 1,
      truncated: false,
      budgetExhausted: false,
      ...snapshot,
    },
    stdoutOffset: 0,
    stderrOffset: 0,
  };
}

function statuses(previous: TraceEvent | null, current: TraceEvent) {
  return new Map(compareTraceSnapshots(previous, current).changes.map((change) => [
    `${change.scope === 'globals' ? 'global' : change.scope}:${change.frameId ?? ''}:${change.name}`,
    change.status,
  ]));
}

test('classifies complete global and local ranges without comparing event-local reference IDs', () => {
  const previous = event({
    globals: [scalar('count', '1'), scalar('removed', 'old'), container('items', 1, [scalar('[0]', '2')])],
    frames: [frame(1, '<module>', []), frame(2, 'run', [scalar('local', '3')])],
  });
  const current = event({
    globals: [scalar('count', '2'), scalar('added', 'new'), container('items', 99, [scalar('[0]', '2')])],
    frames: [frame(1, '<module>', []), frame(2, 'run', [scalar('local', '3')])],
    currentFrameId: 2,
  });
  const result = compareTraceSnapshots(previous, current);
  const byName = statuses(previous, current);

  assert.equal(byName.get('global::count'), 'changed');
  assert.equal(byName.get('global::added'), 'added');
  assert.equal(byName.get('global::removed'), 'removed');
  assert.equal(byName.get('global::items'), 'unchanged');
  assert.equal(byName.get('locals:2:local'), 'unchanged');
  assert.equal(result.truncated, false);
});

test('does not claim missing names when either adjacent range is incomplete', () => {
  const previous = event({
    globals: [scalar('gone', '1')],
    globalsTruncated: true,
    frames: [frame(1, '<module>', []), frame(2, 'run', [scalar('local', '1')])],
  });
  const current = event({
    globals: [scalar('new', '2')],
    globalsTruncated: true,
    frames: [frame(1, '<module>', []), frame(2, 'run', [], true)],
    currentFrameId: 2,
  });
  const byName = statuses(previous, current);

  assert.equal(byName.get('global::gone'), 'unknown');
  assert.equal(byName.get('global::new'), 'unknown');
  assert.equal(byName.get('locals:2:local'), 'unknown');
});

test('reports locals from a returned frame as removed with the old frame name', () => {
  const previous = event({
    globals: [],
    frames: [frame(1, '<module>', []), frame(2, 'worker', [scalar('temporary', '7')])],
    currentFrameId: 2,
  });
  const current = event({ globals: [], frames: [frame(1, '<module>', [])] });
  const result = compareTraceSnapshots(previous, current);

  assert.deepEqual(result.changes.filter((change) => change.scope === 'locals').map((change) => ({
    name: change.name,
    status: change.status,
    frameId: change.frameId,
    frameName: change.frameName,
  })), [{ name: 'temporary', status: 'removed', frameId: 2, frameName: 'worker' }]);
});

test('marks opaque or internally truncated values unknown instead of unchanged', () => {
  const opaque: SnapshotValue = { name: 'item', type: 'Thing', kind: 'object', summary: '<Thing>' };
  const partial: SnapshotValue = { ...scalar('partial', 'prefix'), truncated: true };
  const previous = event({ globals: [opaque, partial], frames: [] });
  const current = event({ globals: [{ ...opaque }, { ...partial }], frames: [] });
  const byName = statuses(previous, current);

  assert.equal(byName.get('global::item'), 'unknown');
  assert.equal(byName.get('global::partial'), 'unknown');
});

test('treats the first event as a baseline and caps reported changes', () => {
  const baseline = event({ globals: [scalar('first', '1')], frames: [] });
  assert.deepEqual(compareTraceSnapshots(null, baseline), { changes: [], truncated: false, baseline: true });

  const values = Array.from({ length: 205 }, (_, index) => scalar(`value${String(index).padStart(3, '0')}`, '1'));
  const previous = event({ globals: [], frames: [] });
  const current = event({ globals: values, frames: [] });
  const result = compareTraceSnapshots(previous, current);
  assert.equal(result.changes.length, 200);
  assert.equal(result.truncated, true);
  assert.equal(result.changes.every((change) => change.status === 'added'), true);
});

test('returns unknown for a frame hidden by the previous truncated call stack', () => {
  const previous = event({ globals: [], frames: [frame(1, '<module>', [])] }, true);
  const current = event({ globals: [], frames: [frame(1, '<module>', []), frame(3, 'nested', [scalar('value', '1')])] });
  assert.equal(statuses(previous, current).get('locals:3:value'), 'unknown');
});
