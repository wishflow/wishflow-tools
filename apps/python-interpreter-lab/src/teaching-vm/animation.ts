import type {
  SourceSpan,
  TeachingCompileResult,
  TeachingDiagnosticSnapshot,
  TeachingHeapObjectSnapshot,
  TeachingInstruction,
  TeachingValueSnapshot,
  TeachingVmSnapshot,
} from './types';
import { sameSnapshotValue } from './observation';

export const MAX_TEACHING_ANIMATION_TRANSITIONS = 12;

export type TeachingAnimationKind =
  | 'push'
  | 'operate'
  | 'bind-name'
  | 'object-created'
  | 'mutate-object'
  | 'call-enter'
  | 'call-return'
  | 'call-rejected';

export interface TeachingAnimationCallBinding {
  name: string;
  argumentIndex: number;
  stackIndex: number;
  value: TeachingValueSnapshot;
}

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
  sourceName: string | null;
  bindingName: string | null;
  objectId: number | null;
  objectType: 'list' | 'dict' | null;
  itemIndex: number | null;
  itemKey: TeachingValueSnapshot | null;
  callerFrameId: number | null;
  calleeFrameId: number | null;
  functionName: string | null;
  callSite: SourceSpan | null;
  returnPc: number | null;
  callBindings: readonly TeachingAnimationCallBinding[];
  returnValue: TeachingValueSnapshot | null;
  diagnostic: TeachingDiagnosticSnapshot | null;
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
    if (after.stepIndex !== previous.stepIndex + 1) {
      return Object.freeze({ baselineAvailable: false, transitions: Object.freeze([]), omittedCount: 0 });
    }

    const executedDelta = after.executedInstructionCount - previous.executedInstructionCount;
    if (executedDelta === 0 && (after.status === 'error' || after.pauseReason === 'breakpoint')) {
      previous = after;
      break;
    }
    if (executedDelta !== 1) {
      return Object.freeze({ baselineAvailable: false, transitions: Object.freeze([]), omittedCount: 0 });
    }

    const instructionIndex = after.status === 'error'
      ? after.faultInstructionIndex
      : after.lastExecutedInstructionIndex;
    const instruction = instructionIndex === null ? null : program.instructions[instructionIndex];
    if (!instruction) {
      return Object.freeze({ baselineAvailable: false, transitions: Object.freeze([]), omittedCount: 0 });
    }

    const transition = deriveTransition(program, instruction, previous, after);
    if (transition === undefined) {
      return Object.freeze({ baselineAvailable: false, transitions: Object.freeze([]), omittedCount: 0 });
    }
    if (transition) transitions.push(transition);
    previous = after;
    if (after.status === 'error') break;
  }

  const boundedTransitions = limitTeachingAnimationTransitions(transitions);
  const omittedCount = transitions.length - boundedTransitions.length;
  return Object.freeze({
    baselineAvailable: true,
    transitions: Object.freeze(boundedTransitions),
    omittedCount,
  });
}

function limitTeachingAnimationTransitions(
  transitions: readonly TeachingAnimationTransition[],
): TeachingAnimationTransition[] {
  if (transitions.length <= MAX_TEACHING_ANIMATION_TRANSITIONS) return [...transitions];

  const frameTransitions = transitions.filter(({ kind }) => kind.startsWith('call-'));
  const selectedFrameTransitions = frameTransitions.length <= MAX_TEACHING_ANIMATION_TRANSITIONS
    ? frameTransitions
    : [
      ...frameTransitions.slice(0, Math.ceil(MAX_TEACHING_ANIMATION_TRANSITIONS / 2)),
      ...frameTransitions.slice(-Math.floor(MAX_TEACHING_ANIMATION_TRANSITIONS / 2)),
    ];
  const selected = new Set(selectedFrameTransitions);
  for (const transition of transitions) {
    if (selected.size >= MAX_TEACHING_ANIMATION_TRANSITIONS) break;
    selected.add(transition);
  }
  return transitions.filter((transition) => selected.has(transition));
}

function deriveTransition(
  program: TeachingCompileResult,
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
): TeachingAnimationTransition | null | undefined {
  if (instruction.opcode === 'CALL_FUNCTION') {
    return after.status === 'error'
      ? deriveRejectedCall(instruction, before, after)
      : deriveCallEntry(program, instruction, before, after);
  }

  if (instruction.opcode === 'CHECK_CALL_TARGET' && after.status === 'error') {
    return deriveRejectedCall(instruction, before, after);
  }

  if (instruction.opcode === 'RETURN_VALUE' || instruction.opcode === 'RETURN_NONE') {
    return after.status === 'error'
      ? null
      : deriveCallReturn(instruction, before, after);
  }

  const beforeFrame = before.frames.at(-1);
  const afterFrame = after.frames.at(-1);
  if (!beforeFrame || !afterFrame) return undefined;
  if (beforeFrame.id !== afterFrame.id) return undefined;
  const beforeStack = beforeFrame.stack;
  const afterStack = afterFrame.stack;
  const base = {
    stepIndex: after.stepIndex,
    instructionIndex: instruction.index,
    opcode: instruction.opcode,
    frameId: beforeFrame.id,
    before,
    after,
    sourceName: null,
    bindingName: null,
    objectId: null,
    objectType: null,
    itemIndex: null,
    itemKey: null,
    callerFrameId: null,
    calleeFrameId: null,
    functionName: null,
    callSite: null,
    returnPc: null,
    callBindings: Object.freeze([]),
    returnValue: null,
    diagnostic: null,
  } as const;

  if (instruction.opcode === 'LOAD_CONST' || instruction.opcode === 'LOAD_NAME') {
    const value = afterStack.at(-1);
    if (!value || afterStack.length !== beforeStack.length + 1) return null;
    return Object.freeze({
      ...base,
      kind: 'push',
      operands: Object.freeze([]),
      value,
      sourceName: instruction.opcode === 'LOAD_NAME' && typeof instruction.argument === 'string' ? instruction.argument : null,
    });
  }

  if (instruction.opcode === 'STORE_NAME') {
    const bindingName = typeof instruction.argument === 'string' ? instruction.argument : null;
    const value = beforeStack.at(-1);
    const binding = bindingName === null
      ? undefined
      : afterFrame.variables.find(({ name }) => name === bindingName)?.value;
    if (!bindingName || !value || !binding || afterStack.length !== beforeStack.length - 1 || !sameSnapshotValue(value, binding)) return null;
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
    if (!entry || !sameSnapshotValue(entry.value, storedValue)) return null;
    return Object.freeze({
      ...base,
      kind: 'mutate-object',
      operands: Object.freeze([storedValue, container, index]),
      value: storedValue,
      objectId: object.id,
      objectType: object.type,
      itemIndex: entry.kind === 'list' ? entry.index : null,
      itemKey: entry.kind === 'dict' ? entry.key : null,
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

function deriveCallEntry(
  program: TeachingCompileResult,
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
): TeachingAnimationTransition | undefined {
  const caller = before.frames.at(-1);
  const callee = after.frames.at(-1);
  const afterCaller = after.frames.at(-2);
  const functionName = typeof instruction.argument === 'string' ? instruction.argument : null;
  const functionInfo = functionName === null
    ? undefined
    : program.functions.find(({ name }) => name === functionName);
  const argumentCount = instruction.argumentCount;
  if (!caller || !callee || !afterCaller || !functionInfo
    || argumentCount === undefined || argumentCount !== functionInfo.parameters.length
    || after.status === 'error'
    || after.frames.length !== before.frames.length + 1
    || !before.frames.slice(0, -1).every((frame, index) => after.frames[index]?.id === frame.id)
    || afterCaller.id !== caller.id
    || before.frames.some(({ id }) => id === callee.id)
    || caller.pc !== instruction.index
    || afterCaller.pc !== instruction.index + 1
    || callee.returnPc !== afterCaller.pc
    || callee.pc !== functionInfo.entryIndex
    || callee.kind !== 'function'
    || callee.functionName !== functionName
    || !callee.callSite || !sameSourceSpan(callee.callSite, instruction.span)
    || callee.stack.length !== 0) {
    return undefined;
  }

  const argumentStart = caller.stack.length - argumentCount;
  if (argumentStart < 0 || afterCaller.stack.length !== argumentStart
    || !sameSnapshotValues(caller.stack.slice(0, argumentStart), afterCaller.stack)) {
    return undefined;
  }

  const arguments_ = caller.stack.slice(argumentStart);
  const callBindings = functionInfo.parameters.map((name, argumentIndex) => {
    const value = arguments_[argumentIndex];
    const local = callee.variables.find((variable) => variable.name === name)?.value;
    if (!value || !local || !sameSnapshotValue(value, local)) return null;
    return Object.freeze({ name, argumentIndex, stackIndex: argumentStart + argumentIndex, value });
  });
  if (callBindings.some((binding) => binding === null)) return undefined;
  const boundParameters = callBindings.filter((binding): binding is TeachingAnimationCallBinding => binding !== null);

  return Object.freeze({
    ...animationTransitionBase(instruction, before, after, callee.id),
    kind: 'call-enter',
    operands: Object.freeze([...arguments_]),
    value: null,
    sourceName: null,
    bindingName: null,
    objectId: null,
    objectType: null,
    itemIndex: null,
    itemKey: null,
    callerFrameId: caller.id,
    calleeFrameId: callee.id,
    functionName,
    callSite: Object.freeze({ ...callee.callSite }),
    returnPc: callee.returnPc,
    callBindings: Object.freeze(boundParameters),
    returnValue: null,
    diagnostic: null,
  });
}

function deriveCallReturn(
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
): TeachingAnimationTransition | undefined {
  const callee = before.frames.at(-1);
  const caller = before.frames.at(-2);
  const afterCaller = after.frames.at(-1);
  if (!callee || !caller || !afterCaller
    || callee.kind !== 'function'
    || callee.returnPc === null
    || callee.pc !== instruction.index
    || after.frames.length !== before.frames.length - 1
    || afterCaller.id !== caller.id
    || afterCaller.pc !== callee.returnPc
    || !before.frames.slice(0, -1).every((frame, index) => after.frames[index]?.id === frame.id)) {
    return undefined;
  }

  const returnValue = afterCaller.stack.at(-1);
  if (!returnValue || afterCaller.stack.length !== caller.stack.length + 1
    || !sameSnapshotValues(caller.stack, afterCaller.stack.slice(0, -1))) {
    return undefined;
  }

  if (instruction.opcode === 'RETURN_VALUE') {
    const stackValue = callee.stack.at(-1);
    if (!stackValue || !sameSnapshotValue(stackValue, returnValue)) return undefined;
  } else if (returnValue.type !== 'none' || returnValue.value !== 'None') {
    return undefined;
  }

  return Object.freeze({
    ...animationTransitionBase(instruction, before, after, callee.id),
    kind: 'call-return',
    operands: Object.freeze(instruction.opcode === 'RETURN_VALUE' ? [returnValue] : []),
    value: returnValue,
    sourceName: null,
    bindingName: null,
    objectId: null,
    objectType: null,
    itemIndex: null,
    itemKey: null,
    callerFrameId: caller.id,
    calleeFrameId: callee.id,
    functionName: callee.functionName,
    callSite: callee.callSite ? Object.freeze({ ...callee.callSite }) : null,
    returnPc: callee.returnPc,
    callBindings: Object.freeze([]),
    returnValue,
    diagnostic: null,
  });
}

function deriveRejectedCall(
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
): TeachingAnimationTransition | null | undefined {
  const caller = before.frames.at(-1);
  const afterCaller = after.frames.at(-1);
  const diagnostic = after.diagnostic;
  const functionName = typeof instruction.argument === 'string' ? instruction.argument : null;
  if (!caller || !diagnostic || !functionName || after.status !== 'error'
    || after.faultInstructionIndex !== instruction.index
    || after.executedInstructionCount !== before.executedInstructionCount + 1
    || caller.pc !== instruction.index
    || afterCaller?.pc !== instruction.index
    || !sameSourceSpan(diagnostic.span, instruction.span)) {
    return null;
  }

  const callTargetFailure = instruction.opcode === 'CHECK_CALL_TARGET'
    && ['name-error', 'unbound-local-error'].includes(diagnostic.code);
  const callFailure = instruction.opcode === 'CALL_FUNCTION'
    && ['argument-count-mismatch', 'not-callable', 'frame-limit-exceeded', 'too-many-names'].includes(diagnostic.code);
  if (!callTargetFailure && !callFailure) return null;
  if (!sameFrameIds(before.frames, after.frames)) return undefined;

  return Object.freeze({
    ...animationTransitionBase(instruction, before, after, caller.id),
    kind: 'call-rejected',
    operands: Object.freeze([]),
    value: null,
    sourceName: functionName,
    bindingName: null,
    objectId: null,
    objectType: null,
    itemIndex: null,
    itemKey: null,
    callerFrameId: caller.id,
    calleeFrameId: null,
    functionName,
    callSite: Object.freeze({ ...instruction.span }),
    returnPc: null,
    callBindings: Object.freeze([]),
    returnValue: null,
    diagnostic,
  });
}

function animationTransitionBase(
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
  frameId: number,
) {
  return {
    stepIndex: after.stepIndex,
    instructionIndex: instruction.index,
    opcode: instruction.opcode,
    frameId,
    before,
    after,
  } as const;
}

function sameFrameIds(
  left: TeachingVmSnapshot['frames'],
  right: TeachingVmSnapshot['frames'],
): boolean {
  return left.length === right.length && left.every((frame, index) => right[index]?.id === frame.id);
}

function sameSnapshotValues(
  left: readonly TeachingValueSnapshot[],
  right: readonly TeachingValueSnapshot[],
): boolean {
  return left.length === right.length && left.every((value, index) => {
    const other = right[index];
    return other !== undefined && sameSnapshotValue(value, other);
  });
}

function sameSourceSpan(left: SourceSpan, right: SourceSpan): boolean {
  return left.start === right.start
    && left.end === right.end
    && left.line === right.line
    && left.column === right.column
    && left.endLine === right.endLine
    && left.endColumn === right.endColumn;
}

type StoredEntry =
  | { kind: 'list'; index: number; value: TeachingValueSnapshot }
  | { kind: 'dict'; key: TeachingValueSnapshot; value: TeachingValueSnapshot };

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
    const value = object.items[itemIndex];
    return value ? { kind: 'list', index: itemIndex, value } : null;
  }

  if (containerType === 'dict' && object.type === 'dict') {
    const entry = object.entries.find(({ key }) => sameDictionaryKey(key, index));
    return entry ? { kind: 'dict', key: entry.key, value: entry.value } : null;
  }
  return null;
}

function sameDictionaryKey(left: TeachingValueSnapshot, right: TeachingValueSnapshot): boolean {
  if ((left.type === 'int' || left.type === 'bool') && (right.type === 'int' || right.type === 'bool')) {
    return numericKeyValue(left) === numericKeyValue(right);
  }
  if (left.type === 'none' && right.type === 'none') return true;
  return left.type === 'str' && right.type === 'str' && left.value === right.value;
}

function numericKeyValue(value: TeachingValueSnapshot): bigint {
  if (value.type === 'int') return BigInt(value.value);
  return value.value === 'True' ? 1n : 0n;
}
