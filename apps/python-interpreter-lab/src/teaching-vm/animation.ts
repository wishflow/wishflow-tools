import type {
  TeachingCompileResult,
  TeachingHeapObjectSnapshot,
  TeachingInstruction,
  TeachingValueSnapshot,
  TeachingVmSnapshot,
} from './types';

export const MAX_TEACHING_ANIMATION_TRANSITIONS = 12;

export type TeachingAnimationKind = 'push' | 'operate' | 'bind-name' | 'object-created' | 'mutate-object';

export interface TeachingAnimationTransition {
  kind: TeachingAnimationKind;
  stepIndex: number;
  instructionIndex: number;
  opcode: TeachingInstruction['opcode'];
  frameId: number;
  before: TeachingVmSnapshot;
  after: TeachingVmSnapshot;
  operands: readonly TeachingValueSnapshot[];
  value: TeachingValueSnapshot | null;
  bindingName: string | null;
  objectId: number | null;
  objectType: 'list' | 'dict' | null;
  itemIndex: number | null;
  itemKey: TeachingValueSnapshot | null;
}

export interface TeachingAnimationDerivation {
  baselineAvailable: boolean;
  transitions: readonly TeachingAnimationTransition[];
  omittedCount: number;
}

/** Derives bounded, presentation-only actions from adjacent recorded VM snapshots. */
export function deriveTeachingAnimationTransitions(
  program: TeachingCompileResult,
  before: TeachingVmSnapshot,
  afterSnapshots: readonly TeachingVmSnapshot[],
): TeachingAnimationDerivation {
  const transitions: TeachingAnimationTransition[] = [];
  let previous = before;

  for (const after of afterSnapshots) {
    if (after.stepIndex !== previous.stepIndex + 1
      || after.executedInstructionCount !== previous.executedInstructionCount + 1
      || after.status === 'error') {
      return Object.freeze({ baselineAvailable: false, transitions: Object.freeze([]), omittedCount: 0 });
    }

    const previousFrame = previous.frames.at(-1);
    const currentFrame = after.frames.at(-1);
    if (!previousFrame || !currentFrame || previousFrame.id !== currentFrame.id) {
      return Object.freeze({ baselineAvailable: false, transitions: Object.freeze([]), omittedCount: 0 });
    }

    const instructionIndex = after.lastExecutedInstructionIndex;
    const instruction = instructionIndex === null ? null : program.instructions[instructionIndex];
    if (!instruction) {
      return Object.freeze({ baselineAvailable: false, transitions: Object.freeze([]), omittedCount: 0 });
    }

    const transition = deriveTransition(instruction, previous, after, previousFrame.id);
    if (transition) transitions.push(transition);
    previous = after;
  }

  const omittedCount = Math.max(0, transitions.length - MAX_TEACHING_ANIMATION_TRANSITIONS);
  return Object.freeze({
    baselineAvailable: true,
    transitions: Object.freeze(transitions.slice(0, MAX_TEACHING_ANIMATION_TRANSITIONS)),
    omittedCount,
  });
}

function deriveTransition(
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
  frameId: number,
): TeachingAnimationTransition | null {
  const beforeFrame = before.frames.at(-1);
  const afterFrame = after.frames.at(-1);
  if (!beforeFrame || !afterFrame) return null;
  const beforeStack = beforeFrame.stack;
  const afterStack = afterFrame.stack;
  const base = {
    stepIndex: after.stepIndex,
    instructionIndex: instruction.index,
    opcode: instruction.opcode,
    frameId,
    before,
    after,
    bindingName: null,
    objectId: null,
    objectType: null,
    itemIndex: null,
    itemKey: null,
  } as const;

  if (instruction.opcode === 'LOAD_CONST' || instruction.opcode === 'LOAD_NAME') {
    const value = afterStack.at(-1);
    if (!value || afterStack.length !== beforeStack.length + 1) return null;
    return Object.freeze({ ...base, kind: 'push', operands: Object.freeze([]), value });
  }

  if (instruction.opcode === 'STORE_NAME') {
    const bindingName = typeof instruction.argument === 'string' ? instruction.argument : null;
    const value = beforeStack.at(-1);
    const binding = bindingName === null
      ? undefined
      : afterFrame.variables.find(({ name }) => name === bindingName)?.value;
    if (!bindingName || !value || !binding || afterStack.length !== beforeStack.length - 1 || !sameValue(value, binding)) return null;
    return Object.freeze({ ...base, kind: 'bind-name', operands: Object.freeze([value]), value: binding, bindingName });
  }

  if (instruction.opcode === 'BUILD_LIST' || instruction.opcode === 'BUILD_MAP') {
    const value = afterStack.at(-1);
    if (!value || (value.type !== 'list' && value.type !== 'dict') || typeof value.objectId !== 'number'
      || afterStack.length !== beforeStack.length - Number(instruction.argument ?? 0) * (instruction.opcode === 'BUILD_MAP' ? 2 : 1) + 1) return null;
    const previousIds = new Set(before.heap.map(({ id }) => id));
    const object = after.heap.find(({ id }) => id === value.objectId);
    if (!object || previousIds.has(value.objectId)) return null;
    return Object.freeze({
      ...base,
      kind: 'object-created',
      operands: Object.freeze([]),
      value,
      objectId: object.id,
      objectType: object.type,
    });
  }

  if (instruction.opcode === 'STORE_SUBSCR') {
    const storedValue = beforeStack.at(-3);
    const container = beforeStack.at(-2);
    const index = beforeStack.at(-1);
    if (!storedValue || !index || !container || (container.type !== 'list' && container.type !== 'dict')) return null;
    if (afterStack.length !== beforeStack.length - 3) return null;
    const object = after.heap.find(({ id }) => id === container.objectId);
    if (!object || object.type !== container.type) return null;
    const entry = findStoredEntry(object, index, container.type);
    if (!entry) return null;
    return Object.freeze({
      ...base,
      kind: 'mutate-object',
      operands: Object.freeze([storedValue, container, index]),
      value: storedValue,
      objectId: object.id,
      objectType: object.type,
      itemIndex: entry?.kind === 'list' ? entry.index : null,
      itemKey: entry?.kind === 'dict' ? entry.key : null,
    });
  }

  const operandCount = instruction.opcode.startsWith('UNARY_') ? 1
    : instruction.opcode.startsWith('BINARY_') || instruction.opcode === 'COMPARE_OP' ? 2
      : 0;
  if (operandCount > 0) {
    const operands = beforeStack.slice(-operandCount);
    const value = afterStack.at(-1);
    if (operands.length !== operandCount || !value || afterStack.length !== beforeStack.length - operandCount + 1) return null;
    return Object.freeze({ ...base, kind: 'operate', operands: Object.freeze([...operands]), value });
  }

  return null;
}

type StoredEntry =
  | { kind: 'list'; index: number }
  | { kind: 'dict'; key: TeachingValueSnapshot };

function findStoredEntry(
  object: TeachingHeapObjectSnapshot,
  index: TeachingValueSnapshot,
  containerType: 'list' | 'dict',
): StoredEntry | null {
  if (containerType === 'list' && object.type === 'list' && index.type === 'int') {
    let rawIndex: bigint;
    try {
      rawIndex = BigInt(index.value);
    } catch {
      return null;
    }
    const length = BigInt(object.items.length);
    const normalized = rawIndex < 0n ? length + rawIndex : rawIndex;
    if (normalized < 0n || normalized >= length) return null;
    const itemIndex = Number(normalized);
    return object.items[itemIndex] ? { kind: 'list', index: itemIndex } : null;
  }

  if (containerType === 'dict' && object.type === 'dict') {
    const entry = object.entries.find(({ key }) => sameValue(key, index));
    return entry ? { kind: 'dict', key: entry.key } : null;
  }
  return null;
}

function sameValue(left: TeachingValueSnapshot, right: TeachingValueSnapshot): boolean {
  if (left.type !== right.type) return false;
  if (left.type === 'list' || left.type === 'dict') return left.objectId === right.objectId;
  return left.value === right.value;
}
