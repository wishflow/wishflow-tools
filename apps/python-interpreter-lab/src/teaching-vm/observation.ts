import type {
  TeachingDictHeapSnapshot,
  TeachingFrameSnapshot,
  TeachingHeapObjectSnapshot,
  TeachingCompileResult,
  TeachingValueSnapshot,
  TeachingVmHistory,
  TeachingVmSnapshot,
} from './types';
import { createTeachingSourceStepGoal, type TeachingSourceStepGoal } from './source-step';

export const MAX_TEACHING_OBSERVATION_CHANGES = 6;

export type TeachingObservationStatus =
  | 'initial'
  | 'complete'
  | 'partial'
  | 'breakpoint'
  | 'failed'
  | 'finished'
  | 'unavailable';

export type TeachingObservationCoverage = 'complete' | 'prefix-truncated' | 'discontinuous';
export type TeachingObservationPointKind = 'initial' | 'instruction' | 'breakpoint' | 'unavailable';

export interface TeachingObservationPoint {
  stepIndex: number;
  instructionIndex: number | null;
  kind: TeachingObservationPointKind;
  snapshot: TeachingVmSnapshot;
}

export interface TeachingObservationGroup {
  id: string;
  sourceLine: number | null;
  frameId: number | null;
  startStepIndex: number;
  endStepIndex: number;
  before: TeachingVmSnapshot | null;
  after: TeachingVmSnapshot;
  points: readonly TeachingObservationPoint[];
  status: TeachingObservationStatus;
  coverage: TeachingObservationCoverage;
}

export type TeachingObservationChange =
  | { kind: 'frame-entered' | 'frame-returned'; frameId: number; frameName: string }
  | {
    kind: 'binding-added';
    frameId: number;
    frameName: string;
    name: string;
    beforeValue: null;
    afterValue: string;
    objectId: number | null;
    isAlias: boolean;
    createsObject: boolean;
  }
  | {
    kind: 'binding-updated';
    frameId: number;
    frameName: string;
    name: string;
    beforeValue: string;
    afterValue: string;
    objectId: number | null;
  }
  | {
    kind: 'binding-removed';
    frameId: number;
    frameName: string;
    name: string;
    beforeValue: string;
    afterValue: null;
    objectId: number | null;
  }
  | { kind: 'object-created' | 'object-removed'; objectId: number; objectType: 'list' | 'dict' }
  | {
    kind: 'list-item-added' | 'list-item-updated' | 'list-item-removed';
    objectId: number;
    index: number;
    beforeValue: string | null;
    afterValue: string | null;
  }
  | {
    kind: 'dict-entry-added' | 'dict-entry-updated' | 'dict-entry-removed';
    objectId: number;
    key: string;
    beforeValue: string | null;
    afterValue: string | null;
  }
  | { kind: 'output-added'; outputLines: readonly string[] };

export interface TeachingObservationDiff {
  baseline: boolean;
  hasChanges: boolean;
  changes: readonly TeachingObservationChange[];
  omittedCount: number;
}

interface ObservationDraft {
  sourceLine: number | null;
  frameId: number | null;
  before: TeachingVmSnapshot | null;
  goal: TeachingSourceStepGoal | null;
  points: TeachingObservationPoint[];
  coverage: TeachingObservationCoverage;
}

/** Derives source-step groups from the bounded, immutable instruction history. */
export function deriveTeachingObservationGroups(
  program: TeachingCompileResult,
  history: TeachingVmHistory,
): readonly TeachingObservationGroup[] {
  const snapshots = history.items;
  if (snapshots.length === 0) return Object.freeze([]);

  const groups: TeachingObservationGroup[] = [];
  const first = snapshots[0];
  if (!first) return Object.freeze(groups);

  let previous = first;
  let active: ObservationDraft | null = null;
  if (isInitialSnapshot(first)) {
    groups.push(makeGroup(
      program,
      {
        sourceLine: sourceLineAt(program, first.nextInstructionIndex),
        frameId: first.frames.at(-1)?.id ?? null,
        before: null,
        goal: null,
        points: [makePoint(first, 'initial', null)],
        coverage: 'complete',
      },
      'initial',
    ));
  } else {
    groups.push(makeUnavailablePrefix(program, first, history.truncated || first.stepIndex > 0));
  }

  for (let index = 1; index < snapshots.length; index += 1) {
    const current = snapshots[index];
    if (!current) continue;

    if (current.stepIndex !== previous.stepIndex + 1) {
      if (active) groups.push(makeGroup(program, active, 'partial', 'discontinuous'));
      active = null;
      groups.push(makeUnavailablePrefix(program, current, true, 'discontinuous'));
      previous = current;
      continue;
    }

    const executedDelta = current.executedInstructionCount - previous.executedInstructionCount;
    if (executedDelta === 0 && current.pauseReason === 'breakpoint') {
      active ??= createDraft(program, previous);
      active.points.push(makePoint(current, 'breakpoint', current.nextInstructionIndex));
      groups.push(makeGroup(program, active, 'breakpoint'));
      active = null;
      previous = current;
      continue;
    }

    if (executedDelta !== 1) {
      if (active) groups.push(makeGroup(program, active, 'partial', 'discontinuous'));
      active = null;
      groups.push(makeUnavailablePrefix(program, current, false, 'discontinuous', previous));
      previous = current;
      continue;
    }

    active ??= createDraft(program, previous);
    active.points.push(makePoint(
      current,
      'instruction',
      current.faultInstructionIndex ?? current.lastExecutedInstructionIndex,
    ));

    if (current.status === 'error') {
      groups.push(makeGroup(program, active, 'failed'));
      active = null;
    } else if (current.status === 'finished') {
      groups.push(makeGroup(program, active, 'finished'));
      active = null;
    } else if (active.goal && hasReachedSourceStepBoundary(active.goal, program, current)) {
      groups.push(makeGroup(program, active, 'complete'));
      active = null;
    } else if (current.status === 'paused' && current.pauseReason === 'user') {
      groups.push(makeGroup(program, active, 'partial'));
      active = null;
    }

    previous = current;
  }

  if (active) groups.push(makeGroup(program, active, 'partial'));
  return Object.freeze(groups);
}

/** Compares the selected state with its source-step baseline using recorded snapshots only. */
export function compareTeachingObservationChanges(
  group: TeachingObservationGroup,
  observed: TeachingVmSnapshot = group.after,
): TeachingObservationDiff {
  const before = group.before;
  if (!before) {
    return Object.freeze({
      baseline: false,
      hasChanges: false,
      changes: Object.freeze([]),
      omittedCount: 0,
    });
  }

  const changes: TeachingObservationChange[] = [];
  appendFrameLifecycleChanges(group, observed, changes);
  appendBindingChanges(before, observed, changes);
  appendHeapChanges(before, observed, changes);
  appendOutputChanges(before, observed, changes);

  return Object.freeze({
    baseline: true,
    hasChanges: changes.length > 0,
    changes: Object.freeze(changes.slice(0, MAX_TEACHING_OBSERVATION_CHANGES)),
    omittedCount: Math.max(0, changes.length - MAX_TEACHING_OBSERVATION_CHANGES),
  });
}

function isInitialSnapshot(snapshot: TeachingVmSnapshot): boolean {
  return snapshot.stepIndex === 0
    && snapshot.executedInstructionCount === 0
    && snapshot.lastExecutedInstructionIndex === null
    && snapshot.status === 'ready';
}

function createDraft(program: TeachingCompileResult, before: TeachingVmSnapshot): ObservationDraft {
  const goal = createTeachingSourceStepGoal('over', program, before);
  const instructionIndex = before.nextInstructionIndex;
  const instruction = instructionIndex === null ? undefined : program.instructions[instructionIndex];
  return {
    sourceLine: instruction?.opcode === 'HALT' ? null : goal?.sourceLine ?? instruction?.span.line ?? null,
    frameId: goal?.frameId ?? before.frames.at(-1)?.id ?? null,
    before,
    goal,
    points: [],
    coverage: 'complete',
  };
}

function makePoint(
  snapshot: TeachingVmSnapshot,
  kind: TeachingObservationPointKind,
  instructionIndex: number | null,
): TeachingObservationPoint {
  return Object.freeze({ stepIndex: snapshot.stepIndex, instructionIndex, kind, snapshot });
}

function makeGroup(
  program: TeachingCompileResult,
  draft: ObservationDraft,
  status: TeachingObservationStatus,
  coverage: TeachingObservationCoverage = draft.coverage,
): TeachingObservationGroup {
  const after = draft.points.at(-1)?.snapshot ?? draft.before;
  if (!after) throw new Error('Teaching observation group requires a recorded after snapshot.');
  const firstPoint = draft.points[0];
  const startStepIndex = firstPoint?.stepIndex ?? after.stepIndex;
  const instruction = sourceInstruction(program, draft.points[0]?.instructionIndex);
  const sourceLine = draft.sourceLine ?? (status === 'unavailable' ? instruction?.span.line ?? null : null);
  const frameId = draft.frameId ?? draft.before?.frames.at(-1)?.id ?? after.frames.at(-1)?.id ?? null;

  return Object.freeze({
    id: `${frameId ?? 'none'}:${startStepIndex}:${after.stepIndex}`,
    sourceLine,
    frameId,
    startStepIndex,
    endStepIndex: after.stepIndex,
    before: draft.before,
    after,
    points: Object.freeze([...draft.points]),
    status,
    coverage,
  });
}

function makeUnavailablePrefix(
  program: TeachingCompileResult,
  snapshot: TeachingVmSnapshot,
  isPrefixTruncated: boolean,
  coverage: TeachingObservationCoverage = isPrefixTruncated ? 'prefix-truncated' : 'discontinuous',
  before: TeachingVmSnapshot | null = null,
): TeachingObservationGroup {
  const instructionIndex = snapshot.faultInstructionIndex
    ?? snapshot.lastExecutedInstructionIndex
    ?? snapshot.nextInstructionIndex;
  const instruction = sourceInstruction(program, instructionIndex);
  const status: TeachingObservationStatus = snapshot.status === 'error'
    ? 'failed'
    : snapshot.status === 'finished'
      ? 'finished'
      : snapshot.pauseReason === 'breakpoint'
        ? 'breakpoint'
        : 'unavailable';
  return makeGroup(program, {
    sourceLine: instruction?.opcode === 'HALT' ? null : instruction?.span.line ?? null,
    frameId: snapshot.frames.at(-1)?.id ?? null,
    before,
    goal: null,
    points: [makePoint(snapshot, 'unavailable', instructionIndex)],
    coverage,
  }, status, coverage);
}

function sourceInstruction(program: TeachingCompileResult, instructionIndex: number | null | undefined) {
  return instructionIndex === null || instructionIndex === undefined
    ? undefined
    : program.instructions[instructionIndex];
}

function sourceLineAt(program: TeachingCompileResult, instructionIndex: number | null) {
  const instruction = sourceInstruction(program, instructionIndex);
  return instruction?.opcode === 'HALT' ? null : instruction?.span.line ?? null;
}

function hasReachedSourceStepBoundary(
  goal: TeachingSourceStepGoal,
  program: TeachingCompileResult,
  snapshot: TeachingVmSnapshot,
): boolean {
  if (snapshot.stepIndex <= goal.startStepIndex) return false;
  const activeFrame = snapshot.frames.at(-1);
  if (!activeFrame) return false;
  const originFrameIsActive = snapshot.frames.some((frame) => frame.id === goal.frameId);
  const nextLine = sourceLineAt(program, snapshot.nextInstructionIndex);
  return !originFrameIsActive
    || (activeFrame.id === goal.frameId && nextLine !== goal.sourceLine);
}

function appendFrameLifecycleChanges(
  group: TeachingObservationGroup,
  observed: TeachingVmSnapshot,
  changes: TeachingObservationChange[],
): void {
  if (!group.before) return;
  let previous = group.before;
  for (const point of group.points) {
    const current = point.snapshot;
    if (current.stepIndex > observed.stepIndex) break;
    const previousFrames = new Map(previous.frames.map((frame) => [frame.id, frame]));
    const currentFrames = new Map(current.frames.map((frame) => [frame.id, frame]));
    for (const frame of current.frames) {
      if (!previousFrames.has(frame.id)) {
        changes.push({ kind: 'frame-entered', frameId: frame.id, frameName: frame.functionName });
      }
    }
    for (const frame of previous.frames) {
      if (!currentFrames.has(frame.id)) {
        changes.push({ kind: 'frame-returned', frameId: frame.id, frameName: frame.functionName });
      }
    }
    previous = current;
  }
}

function appendBindingChanges(
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
  changes: TeachingObservationChange[],
): void {
  const beforeFrames = new Map(before.frames.map((frame) => [frame.id, frame]));
  const beforeObjectIds = new Set(before.heap.map(({ id }) => id));

  for (const frame of after.frames) {
    const previousFrame = beforeFrames.get(frame.id);
    const previousValues = valuesByName(previousFrame?.variables ?? []);
    const currentValues = valuesByName(frame.variables);
    appendFrameBindingChanges(
      frame,
      previousValues,
      currentValues,
      beforeObjectIds,
      changes,
    );
  }
}

function appendFrameBindingChanges(
  frame: TeachingFrameSnapshot,
  before: Map<string, TeachingValueSnapshot>,
  after: Map<string, TeachingValueSnapshot>,
  beforeObjectIds: Set<number>,
  changes: TeachingObservationChange[],
): void {
  const names = [...new Set([...before.keys(), ...after.keys()])].sort((left, right) => left.localeCompare(right));
  for (const name of names) {
    const previous = before.get(name);
    const current = after.get(name);
    if (!previous && current) {
      const objectId = current.objectId ?? null;
      changes.push({
        kind: 'binding-added',
        frameId: frame.id,
        frameName: frame.functionName,
        name,
        beforeValue: null,
        afterValue: current.display,
        objectId,
        isAlias: objectId !== null && beforeObjectIds.has(objectId),
        createsObject: objectId !== null && !beforeObjectIds.has(objectId),
      });
    } else if (previous && !current) {
      changes.push({
        kind: 'binding-removed',
        frameId: frame.id,
        frameName: frame.functionName,
        name,
        beforeValue: previous.display,
        afterValue: null,
        objectId: previous.objectId ?? null,
      });
    } else if (previous && current && !sameSnapshotValue(previous, current)) {
      changes.push({
        kind: 'binding-updated',
        frameId: frame.id,
        frameName: frame.functionName,
        name,
        beforeValue: previous.display,
        afterValue: current.display,
        objectId: current.objectId ?? previous.objectId ?? null,
      });
    }
  }
}

function valuesByName(values: readonly { name: string; value: TeachingValueSnapshot }[]) {
  return new Map(values.map(({ name, value }) => [name, value]));
}

function appendHeapChanges(
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
  changes: TeachingObservationChange[],
): void {
  const beforeHeap = new Map(before.heap.map((object) => [object.id, object]));
  const afterHeap = new Map(after.heap.map((object) => [object.id, object]));
  const objectIds = [...new Set([...beforeHeap.keys(), ...afterHeap.keys()])].sort((left, right) => left - right);

  for (const objectId of objectIds) {
    const previous = beforeHeap.get(objectId);
    const current = afterHeap.get(objectId);
    if (!previous && current) {
      changes.push({ kind: 'object-created', objectId, objectType: current.type });
    } else if (previous && !current) {
      changes.push({ kind: 'object-removed', objectId, objectType: previous.type });
    } else if (previous && current && previous.type === 'list' && current.type === 'list') {
      appendListChanges(objectId, previous, current, changes);
    } else if (previous && current && previous.type === 'dict' && current.type === 'dict') {
      appendDictChanges(objectId, previous, current, changes);
    }
  }
}

function appendListChanges(
  objectId: number,
  before: Extract<TeachingHeapObjectSnapshot, { type: 'list' }>,
  after: Extract<TeachingHeapObjectSnapshot, { type: 'list' }>,
  changes: TeachingObservationChange[],
): void {
  const itemCount = Math.max(before.items.length, after.items.length);
  for (let index = 0; index < itemCount; index += 1) {
    const previous = before.items[index];
    const current = after.items[index];
    if (!previous && current) {
      changes.push({ kind: 'list-item-added', objectId, index, beforeValue: null, afterValue: current.display });
    } else if (previous && !current) {
      changes.push({ kind: 'list-item-removed', objectId, index, beforeValue: previous.display, afterValue: null });
    } else if (previous && current && !sameSnapshotValue(previous, current)) {
      changes.push({ kind: 'list-item-updated', objectId, index, beforeValue: previous.display, afterValue: current.display });
    }
  }
}

function appendDictChanges(
  objectId: number,
  before: TeachingDictHeapSnapshot,
  after: TeachingDictHeapSnapshot,
  changes: TeachingObservationChange[],
): void {
  const previous = dictEntriesByKey(before);
  const current = dictEntriesByKey(after);
  const keys = [...new Set([...previous.keys(), ...current.keys()])];
  for (const identity of keys) {
    const previousEntry = previous.get(identity);
    const currentEntry = current.get(identity);
    if (!previousEntry && currentEntry) {
      changes.push({
        kind: 'dict-entry-added',
        objectId,
        key: currentEntry.key.display,
        beforeValue: null,
        afterValue: currentEntry.value.display,
      });
    } else if (previousEntry && !currentEntry) {
      changes.push({
        kind: 'dict-entry-removed',
        objectId,
        key: previousEntry.key.display,
        beforeValue: previousEntry.value.display,
        afterValue: null,
      });
    } else if (previousEntry && currentEntry && !sameSnapshotValue(previousEntry.value, currentEntry.value)) {
      changes.push({
        kind: 'dict-entry-updated',
        objectId,
        key: currentEntry.key.display,
        beforeValue: previousEntry.value.display,
        afterValue: currentEntry.value.display,
      });
    }
  }
}

function dictEntriesByKey(object: TeachingDictHeapSnapshot) {
  return new Map(object.entries.map((entry) => [dictKeyIdentity(entry.key), entry]));
}

function dictKeyIdentity(value: TeachingValueSnapshot): string {
  if (value.type === 'bool') return `number:${value.value === 'True' ? '1' : '0'}`;
  if (value.type === 'int') return `number:${BigInt(value.value).toString(10)}`;
  if (value.type === 'str') return `string:${value.value}`;
  return `${value.type}:${value.objectId ?? value.value}`;
}

function appendOutputChanges(
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
  changes: TeachingObservationChange[],
): void {
  const isPrefix = before.output.length <= after.output.length
    && before.output.every((line, index) => after.output[index] === line);
  if (!isPrefix || after.output.length === before.output.length) return;
  changes.push({ kind: 'output-added', outputLines: Object.freeze(after.output.slice(before.output.length)) });
}

function sameSnapshotValue(left: TeachingValueSnapshot, right: TeachingValueSnapshot): boolean {
  if (left.type !== right.type) return false;
  if (left.type === 'list' || left.type === 'dict') return left.objectId === right.objectId;
  return left.value === right.value;
}
