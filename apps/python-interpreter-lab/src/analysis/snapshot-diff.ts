import type { EventSnapshot, FrameSnapshot, SnapshotValue, TraceEvent } from './types';

export type SnapshotChangeStatus = 'added' | 'changed' | 'removed' | 'unknown' | 'unchanged';

export interface SnapshotChange {
  scope: 'globals' | 'locals';
  frameId: number | null;
  frameName: string | null;
  name: string;
  status: SnapshotChangeStatus;
  before: SnapshotValue | null;
  after: SnapshotValue | null;
}

export interface SnapshotDiff {
  changes: SnapshotChange[];
  truncated: boolean;
  baseline: boolean;
}

const MAX_DIFF_ITEMS = 200;

function visibleValueEqual(left: SnapshotValue, right: SnapshotValue): boolean {
  if (
    left.name !== right.name
    || left.type !== right.type
    || left.kind !== right.kind
    || left.summary !== right.summary
    || left.valueText !== right.valueText
    || left.itemCount !== right.itemCount
  ) return false;

  const leftChildren = left.children ?? [];
  const rightChildren = right.children ?? [];
  return leftChildren.length === rightChildren.length
    && leftChildren.every((child, index) => visibleValueEqual(child, rightChildren[index]));
}

function hasUnknownDetails(value: SnapshotValue): boolean {
  return value.kind === 'object'
    || value.kind === 'reference'
    || value.truncated === true
    || (value.children?.some(hasUnknownDetails) ?? false);
}

function comparePresentValues(before: SnapshotValue, after: SnapshotValue): SnapshotChangeStatus {
  if (!visibleValueEqual(before, after)) return 'changed';
  return hasUnknownDetails(before) || hasUnknownDetails(after) ? 'unknown' : 'unchanged';
}

function valuesByName(values: SnapshotValue[]): Map<string, SnapshotValue> {
  return new Map(values.map((value) => [value.name, value]));
}

function appendRangeChanges(
  changes: SnapshotChange[],
  scope: SnapshotChange['scope'],
  frameId: number | null,
  frameName: string | null,
  beforeValues: SnapshotValue[],
  afterValues: SnapshotValue[],
  beforeComplete: boolean,
  afterComplete: boolean,
): void {
  const before = valuesByName(beforeValues);
  const after = valuesByName(afterValues);
  const names = [...new Set([...before.keys(), ...after.keys()])].sort();

  for (const name of names) {
    const previous = before.get(name) ?? null;
    const current = after.get(name) ?? null;
    let status: SnapshotChangeStatus;
    if (previous && current) status = comparePresentValues(previous, current);
    else if (previous) status = afterComplete ? 'removed' : 'unknown';
    else status = beforeComplete ? 'added' : 'unknown';
    changes.push({ scope, frameId, frameName, name, status, before: previous, after: current });
  }
}

function frameMap(snapshot: EventSnapshot): Map<number, FrameSnapshot> {
  return new Map(snapshot.frames.map((frame) => [frame.frameId, frame]));
}

export function compareTraceSnapshots(previous: TraceEvent | null, current: TraceEvent, limit = MAX_DIFF_ITEMS): SnapshotDiff {
  if (!previous) return { changes: [], truncated: false, baseline: true };

  const changes: SnapshotChange[] = [];
  appendRangeChanges(
    changes,
    'globals',
    null,
    null,
    previous.snapshot.globals,
    current.snapshot.globals,
    !previous.snapshot.globalsTruncated,
    !current.snapshot.globalsTruncated,
  );

  const previousFrames = frameMap(previous.snapshot);
  const currentFrames = frameMap(current.snapshot);
  const frameIds = [...new Set([...previousFrames.keys(), ...currentFrames.keys()])].sort((left, right) => left - right);
  for (const frameId of frameIds) {
    const previousFrame = previousFrames.get(frameId);
    const currentFrame = currentFrames.get(frameId);
    appendRangeChanges(
      changes,
      'locals',
      frameId,
      currentFrame?.functionName ?? previousFrame?.functionName ?? null,
      previousFrame?.locals ?? [],
      currentFrame?.locals ?? [],
      previousFrame ? !previousFrame.localsTruncated : !previous.callStackTruncated,
      currentFrame ? !currentFrame.localsTruncated : !current.callStackTruncated,
    );
  }

  const prioritized = [
    ...changes.filter((change) => change.status !== 'unchanged'),
    ...changes.filter((change) => change.status === 'unchanged'),
  ];
  const boundedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : MAX_DIFF_ITEMS;
  return {
    changes: prioritized.slice(0, boundedLimit),
    truncated: prioritized.length > boundedLimit,
    baseline: false,
  };
}
