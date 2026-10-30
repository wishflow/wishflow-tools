import type { EventSnapshot, FrameSnapshot, SnapshotValue, TraceEvent } from './types';

export type SnapshotChangeStatus = 'added' | 'changed' | 'removed' | 'unknown' | 'unchanged';

export interface SnapshotChange {
  scope: 'globals' | 'locals';
  frameId: number | null;
  frameName: string | null;
  name: string;
  variableId?: number;
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

type ReferenceTargets = Map<number, SnapshotValue>;

function referenceTargets(snapshot: TraceEvent['snapshot']): ReferenceTargets {
  const targets: ReferenceTargets = new Map();
  const visit = (value: SnapshotValue) => {
    if (value.kind === 'container' && value.referenceId !== undefined) {
      targets.set(value.referenceId, value);
    }
    value.children?.forEach(visit);
  };
  snapshot.globals.forEach(visit);
  snapshot.frames.forEach((frame) => frame.locals.forEach(visit));
  return targets;
}

function resolveReference(value: SnapshotValue, targets: ReferenceTargets): SnapshotValue | null {
  if (value.kind !== 'reference') return value;
  return value.referenceId === undefined ? null : targets.get(value.referenceId) ?? null;
}

function visibleValueEqual(
  left: SnapshotValue,
  right: SnapshotValue,
  leftTargets: ReferenceTargets,
  rightTargets: ReferenceTargets,
  seenPairs = new Set<string>(),
): boolean {
  if (left.name !== right.name) return false;
  const resolvedLeft = resolveReference(left, leftTargets);
  const resolvedRight = resolveReference(right, rightTargets);
  if (!resolvedLeft || !resolvedRight) return false;

  const leftId = resolvedLeft.kind === 'container' ? resolvedLeft.referenceId : undefined;
  const rightId = resolvedRight.kind === 'container' ? resolvedRight.referenceId : undefined;
  if (leftId !== undefined && rightId !== undefined) {
    const pair = `${leftId}:${rightId}`;
    if (seenPairs.has(pair)) return true;
    seenPairs.add(pair);
  }

  if (
    resolvedLeft.type !== resolvedRight.type
    || resolvedLeft.kind !== resolvedRight.kind
    || resolvedLeft.summary !== resolvedRight.summary
    || resolvedLeft.valueText !== resolvedRight.valueText
    || resolvedLeft.itemCount !== resolvedRight.itemCount
    || resolvedLeft.truncated !== resolvedRight.truncated
  ) return false;

  const leftChildren = resolvedLeft.children ?? [];
  const rightChildren = resolvedRight.children ?? [];
  return leftChildren.length === rightChildren.length
    && leftChildren.every((child, index) => {
      const rightChild = rightChildren[index];
      return rightChild !== undefined
        && visibleValueEqual(child, rightChild, leftTargets, rightTargets, seenPairs);
    });
}

function hasUnknownDetails(value: SnapshotValue, targets: ReferenceTargets, seenIds = new Set<number>()): boolean {
  const resolved = resolveReference(value, targets);
  if (!resolved) return true;
  if (resolved.kind === 'object' || resolved.truncated === true) return true;
  if (resolved.kind === 'container' && resolved.referenceId !== undefined) {
    if (seenIds.has(resolved.referenceId)) return false;
    seenIds.add(resolved.referenceId);
  }
  return resolved.children?.some((child) => hasUnknownDetails(child, targets, seenIds)) ?? false;
}

function comparePresentValues(
  before: SnapshotValue,
  after: SnapshotValue,
  beforeTargets: ReferenceTargets,
  afterTargets: ReferenceTargets,
): SnapshotChangeStatus {
  if (!visibleValueEqual(before, after, beforeTargets, afterTargets)) return 'changed';
  return hasUnknownDetails(before, beforeTargets) || hasUnknownDetails(after, afterTargets) ? 'unknown' : 'unchanged';
}

function valueIdentity(value: SnapshotValue): string {
  return value.variableId === undefined ? `name:${value.name}` : `variable:${value.variableId}`;
}

function valuesByIdentity(values: SnapshotValue[]): Map<string, SnapshotValue> {
  return new Map(values.map((value) => [valueIdentity(value), value]));
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
  beforeTargets: ReferenceTargets,
  afterTargets: ReferenceTargets,
): void {
  const before = valuesByIdentity(beforeValues);
  const after = valuesByIdentity(afterValues);
  const identities = [...new Set([...before.keys(), ...after.keys()])]
    .sort((left, right) => {
      const leftName = after.get(left)?.name ?? before.get(left)?.name ?? '';
      const rightName = after.get(right)?.name ?? before.get(right)?.name ?? '';
      return leftName.localeCompare(rightName) || left.localeCompare(right);
    });

  for (const identity of identities) {
    const previous = before.get(identity) ?? null;
    const current = after.get(identity) ?? null;
    let status: SnapshotChangeStatus;
    if (previous && current) status = comparePresentValues(previous, current, beforeTargets, afterTargets);
    else if (previous) status = afterComplete ? 'removed' : 'unknown';
    else status = beforeComplete ? 'added' : 'unknown';
    const value = current ?? previous;
    if (!value) continue;
    changes.push({
      scope,
      frameId,
      frameName,
      name: value.name,
      ...(value.variableId === undefined ? {} : { variableId: value.variableId }),
      status,
      before: previous,
      after: current,
    });
  }
}

function frameMap(snapshot: EventSnapshot): Map<number, FrameSnapshot> {
  return new Map(snapshot.frames.map((frame) => [frame.frameId, frame]));
}

export function compareTraceSnapshots(previous: TraceEvent | null, current: TraceEvent, limit = MAX_DIFF_ITEMS): SnapshotDiff {
  if (!previous) return { changes: [], truncated: false, baseline: true };

  const changes: SnapshotChange[] = [];
  const previousTargets = referenceTargets(previous.snapshot);
  const currentTargets = referenceTargets(current.snapshot);
  appendRangeChanges(
    changes,
    'globals',
    null,
    null,
    previous.snapshot.globals,
    current.snapshot.globals,
    !previous.snapshot.globalsTruncated,
    !current.snapshot.globalsTruncated,
    previousTargets,
    currentTargets,
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
      previousTargets,
      currentTargets,
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
