import type {
  SourceSpan,
  TeachingCompileResult,
  TeachingDiagnosticSnapshot,
  TeachingHeapObjectSnapshot,
  TeachingInstruction,
  TeachingValueSnapshot,
  TeachingVmSnapshot,
} from './types';
import { MAX_DYNAMIC_INSTRUCTION_COUNT } from './resource-limits';
import { sameSnapshotValue } from './observation';

export const MAX_TEACHING_ANIMATION_TRANSITIONS = 12;

const EXPLAINABLE_RUNTIME_ERROR_CODES = new Set([
  'name-error',
  'unbound-local-error',
  'function-value-unsupported',
  'type-error',
  'index-out-of-range',
  'key-not-found',
  'zero-range-step',
  'integer-too-large',
  'string-too-long',
  'container-size-limit-exceeded',
  'heap-entry-limit-exceeded',
  'heap-object-limit-exceeded',
  'output-too-long',
  'too-many-names',
]);

export type TeachingAnimationKind =
  | 'push'
  | 'operate'
  | 'bind-name'
  | 'object-created'
  | 'mutate-object'
  | 'branch'
  | 'jump'
  | 'short-circuit'
  | 'iteration'
  | 'runtime-error'
  | 'budget-exhausted'
  | 'call-enter'
  | 'call-return'
  | 'call-rejected';

export type TeachingAnimationControlFlowOutcome =
  | 'branch-skipped'
  | 'branch-taken'
  | 'jumped'
  | 'short-circuited'
  | 'evaluated-right'
  | 'loop-finished'
  | 'next-value';

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
  controlFlowOutcome: TeachingAnimationControlFlowOutcome | null;
  nextInstructionIndex: number | null;
  nextInstructionSpan: SourceSpan | null;
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
    if (executedDelta === 0 && after.status === 'error' && after.diagnostic?.code === 'instruction-budget-exceeded') {
      const instruction = after.faultInstructionIndex === null ? undefined : program.instructions[after.faultInstructionIndex];
      if (!instruction) {
        return Object.freeze({ baselineAvailable: false, transitions: Object.freeze([]), omittedCount: 0 });
      }
      const transition = deriveBudgetExhaustion(program, instruction, previous, after);
      if (transition === undefined) {
        return Object.freeze({ baselineAvailable: false, transitions: Object.freeze([]), omittedCount: 0 });
      }
      if (transition) transitions.push(transition);
      previous = after;
      break;
    }
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

  const boundaryTransitions = transitions.filter(({ kind }) => kind.startsWith('call-')
    || kind === 'branch' || kind === 'jump' || kind === 'short-circuit' || kind === 'iteration'
    || kind === 'runtime-error' || kind === 'budget-exhausted');
  const selectedBoundaries = boundaryTransitions.length <= MAX_TEACHING_ANIMATION_TRANSITIONS
    ? boundaryTransitions
    : [
      ...boundaryTransitions.slice(0, Math.ceil(MAX_TEACHING_ANIMATION_TRANSITIONS / 2)),
      ...boundaryTransitions.slice(-Math.floor(MAX_TEACHING_ANIMATION_TRANSITIONS / 2)),
    ];
  const selected = new Set(selectedBoundaries);
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

  if (instruction.opcode === 'POP_JUMP_IF_FALSE') return deriveBranch(program, instruction, before, after);
  if (instruction.opcode === 'JUMP') return deriveJump(program, instruction, before, after);
  if (instruction.opcode === 'JUMP_IF_FALSE_OR_POP' || instruction.opcode === 'JUMP_IF_TRUE_OR_POP') {
    return deriveShortCircuit(program, instruction, before, after);
  }
  if (instruction.opcode === 'FOR_ITER') return deriveIteration(program, instruction, before, after);
  if (after.status === 'error') return deriveRuntimeFailure(instruction, before, after);

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
    controlFlowOutcome: null,
    nextInstructionIndex: null,
    nextInstructionSpan: null,
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

function deriveBranch(
  program: TeachingCompileResult,
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
): TeachingAnimationTransition | undefined | null {
  if (after.status === 'error') return null;
  const beforeFrame = before.frames.at(-1);
  const condition = beforeFrame?.stack.at(-1);
  const outcome = after.controlFlow?.kind === 'branch' ? after.controlFlow.outcome : null;
  if (!beforeFrame || !condition || (outcome !== 'branch-skipped' && outcome !== 'branch-taken')) return undefined;

  const target = outcome === 'branch-skipped'
    ? getInstructionTarget(program, instruction.argument)
    : instruction.index + 1;
  const next = getControlFlowNextIndex(program, instruction, before, after, 'branch', target);
  if (next === undefined || !sameSnapshotValues(
    beforeFrame.stack.slice(0, -1),
    after.frames.at(-1)?.stack ?? [],
  ) || !hasStableControlFlowState(before, after)) return undefined;

  return createControlFlowTransition(instruction, before, after, beforeFrame.id, {
    kind: 'branch',
    outcome,
    nextInstructionIndex: next,
    operands: [condition],
    value: condition,
  }, program);
}

function deriveJump(
  program: TeachingCompileResult,
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
): TeachingAnimationTransition | undefined | null {
  if (after.status === 'error') return null;
  const beforeFrame = before.frames.at(-1);
  const target = getInstructionTarget(program, instruction.argument);
  const next = getControlFlowNextIndex(program, instruction, before, after, null, target);
  if (!beforeFrame || next === undefined
    || !sameSnapshotValues(beforeFrame.stack, after.frames.at(-1)?.stack ?? [])
    || !hasStableControlFlowState(before, after)) return undefined;

  return createControlFlowTransition(instruction, before, after, beforeFrame.id, {
    kind: 'jump',
    outcome: 'jumped',
    nextInstructionIndex: next,
    operands: [],
    value: null,
  }, program);
}

function deriveShortCircuit(
  program: TeachingCompileResult,
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
): TeachingAnimationTransition | undefined | null {
  if (after.status === 'error') return null;
  const beforeFrame = before.frames.at(-1);
  const beforeStack = beforeFrame?.stack;
  const left = beforeStack?.at(-1);
  const outcome = after.controlFlow?.kind === 'shortCircuit' ? after.controlFlow.outcome : null;
  if (!beforeFrame || !beforeStack || !left || (outcome !== 'short-circuited' && outcome !== 'evaluated-right')) return undefined;

  const target = outcome === 'short-circuited'
    ? getInstructionTarget(program, instruction.argument)
    : instruction.index + 1;
  const next = getControlFlowNextIndex(program, instruction, before, after, 'shortCircuit', target);
  const expectedStack = outcome === 'short-circuited' ? beforeStack : beforeStack.slice(0, -1);
  if (next === undefined || !sameSnapshotValues(expectedStack, after.frames.at(-1)?.stack ?? [])
    || !hasStableControlFlowState(before, after)) return undefined;

  return createControlFlowTransition(instruction, before, after, beforeFrame.id, {
    kind: 'short-circuit',
    outcome,
    nextInstructionIndex: next,
    operands: [left],
    value: outcome === 'short-circuited' ? left : null,
  }, program);
}

function deriveIteration(
  program: TeachingCompileResult,
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
): TeachingAnimationTransition | undefined | null {
  if (after.status === 'error') return null;
  const beforeFrame = before.frames.at(-1);
  const beforeStack = beforeFrame?.stack;
  const iterator = beforeStack?.at(-1);
  const outcome = after.controlFlow?.kind === 'iteration' ? after.controlFlow.outcome : null;
  if (!beforeFrame || !beforeStack || iterator?.type !== 'iterator'
    || (outcome !== 'loop-finished' && outcome !== 'next-value')) return undefined;

  const target = outcome === 'loop-finished'
    ? getInstructionTarget(program, instruction.argument)
    : instruction.index + 1;
  const next = getControlFlowNextIndex(program, instruction, before, after, 'iteration', target);
  const afterStack = after.frames.at(-1)?.stack ?? [];
  const iterationValue = outcome === 'next-value' ? afterStack.at(-1) : undefined;
  const iteratorState = parseIteratorSnapshot(iterator);
  const stackMatches = outcome === 'loop-finished'
    ? sameSnapshotValues(beforeStack.slice(0, -1), afterStack)
      && iteratorState !== null
      && (iteratorState.exhausted || !rangeContains(iteratorState.range, iteratorState.current))
    : afterStack.length === beforeStack.length + 1
      && sameSnapshotValues(beforeStack.slice(0, -1), afterStack.slice(0, -2))
      && iteratorState !== null
      && !iteratorState.exhausted
      && rangeContains(iteratorState.range, iteratorState.current)
      && isExpectedIterationValue(iterationValue, iteratorState.current)
      && hasExpectedNextIterator(iteratorState, afterStack.at(-2));
  if (next === undefined || !stackMatches || !hasStableControlFlowState(before, after)) return undefined;

  return createControlFlowTransition(instruction, before, after, beforeFrame.id, {
    kind: 'iteration',
    outcome,
    nextInstructionIndex: next,
    operands: [iterator],
    value: iterationValue ?? null,
  }, program);
}

interface IteratorRangeSnapshot {
  start: bigint;
  stop: bigint;
  step: bigint;
  argumentCount: number;
}

interface IteratorSnapshot {
  range: IteratorRangeSnapshot;
  current: bigint;
  exhausted: false;
}

interface ExhaustedIteratorSnapshot {
  range: IteratorRangeSnapshot;
  current: null;
  exhausted: true;
}

function parseIteratorSnapshot(value: TeachingValueSnapshot): IteratorSnapshot | ExhaustedIteratorSnapshot | null {
  if (value.type !== 'iterator' || value.value !== value.display) return null;
  const match = /^iterator\(range\((-?\d+(?:, -?\d+){0,2})\), (?:next=(-?\d+)|(exhausted))\)$/.exec(value.value);
  const rangeText = match?.[1];
  if (!match || !rangeText) return null;
  const argumentsText = rangeText.split(', ');
  const numbers = argumentsText.map(BigInt);
  if (argumentsText.length < 1 || argumentsText.length > 3
    || numbers.some((number, index) => number.toString() !== argumentsText[index])) return null;
  const [start, stop, step] = argumentsText.length === 1
    ? [0n, numbers[0]!, 1n]
    : argumentsText.length === 2
      ? [numbers[0]!, numbers[1]!, 1n]
      : [numbers[0]!, numbers[1]!, numbers[2]!];
  if (step === 0n) return null;

  const range = Object.freeze({ start, stop, step, argumentCount: argumentsText.length });
  if (match[2] !== undefined) {
    const current = BigInt(match[2]);
    if (current.toString() !== match[2]) return null;
    return Object.freeze({ range, current, exhausted: false });
  }
  return match[3] === 'exhausted' ? Object.freeze({ range, current: null, exhausted: true }) : null;
}

function rangeContains(range: IteratorRangeSnapshot, value: bigint): boolean {
  return range.step > 0n ? value < range.stop : value > range.stop;
}

function isExpectedIterationValue(value: TeachingValueSnapshot | undefined, expected: bigint): boolean {
  if (value?.type !== 'int' || value.value !== value.display) return false;
  try {
    return BigInt(value.value).toString() === value.value && BigInt(value.value) === expected;
  } catch {
    return false;
  }
}

function hasExpectedNextIterator(
  before: IteratorSnapshot,
  afterValue: TeachingValueSnapshot | undefined,
): boolean {
  const after = afterValue ? parseIteratorSnapshot(afterValue) : null;
  if (!after || after.range.start !== before.range.start || after.range.stop !== before.range.stop
    || after.range.step !== before.range.step || after.range.argumentCount !== before.range.argumentCount) return false;

  const next = before.current + before.range.step;
  const expectedExhausted = !rangeContains(before.range, next);
  return after.exhausted === expectedExhausted
    && (expectedExhausted || after.current === next);
}

function createControlFlowTransition(
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
  frameId: number,
  fields: {
    kind: 'branch' | 'jump' | 'short-circuit' | 'iteration';
    outcome: TeachingAnimationControlFlowOutcome;
    nextInstructionIndex: number;
    operands: readonly TeachingValueSnapshot[];
    value: TeachingValueSnapshot | null;
  },
  program: TeachingCompileResult,
): TeachingAnimationTransition {
  return Object.freeze({
    ...animationTransitionBase(instruction, before, after, frameId),
    kind: fields.kind,
    operands: Object.freeze([...fields.operands]),
    value: fields.value,
    sourceName: null,
    bindingName: null,
    objectId: null,
    objectType: null,
    itemIndex: null,
    itemKey: null,
    controlFlowOutcome: fields.outcome,
    nextInstructionIndex: fields.nextInstructionIndex,
    nextInstructionSpan: instructionSpanAt(program, fields.nextInstructionIndex),
    callerFrameId: null,
    calleeFrameId: null,
    functionName: null,
    callSite: null,
    returnPc: null,
    callBindings: Object.freeze([]),
    returnValue: null,
    diagnostic: null,
  });
}

function deriveRuntimeFailure(
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
): TeachingAnimationTransition | null {
  const diagnostic = after.diagnostic;
  const beforeFrame = before.frames.at(-1);
  const afterFrame = after.frames.at(-1);
  if (after.status !== 'error' || !diagnostic || diagnostic.stage !== 'runtime'
    || !EXPLAINABLE_RUNTIME_ERROR_CODES.has(diagnostic.code)
    || !beforeFrame || !afterFrame
    || after.faultInstructionIndex !== instruction.index
    || after.executedInstructionCount !== before.executedInstructionCount + 1
    || before.pc !== instruction.index || before.nextInstructionIndex !== instruction.index
    || beforeFrame.pc !== instruction.index
    || after.pc !== instruction.index || after.nextInstructionIndex !== instruction.index
    || afterFrame.pc !== instruction.index
    || !sameSourceSpan(diagnostic.span, instruction.span)
    || !sameFrameIds(before.frames, after.frames)
    || !sameSnapshotValues(beforeFrame.stack, afterFrame.stack)
    || !hasStableControlFlowState(before, after)) return null;

  const operandCount = getFailureOperandCount(instruction);
  if (operandCount === null || operandCount > beforeFrame.stack.length) return null;
  return createFailureTransition(instruction, before, after, beforeFrame.id, 'runtime-error',
    beforeFrame.stack.slice(beforeFrame.stack.length - operandCount));
}

function deriveBudgetExhaustion(
  program: TeachingCompileResult,
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
): TeachingAnimationTransition | undefined | null {
  const diagnostic = after.diagnostic;
  const beforeFrame = before.frames.at(-1);
  const afterFrame = after.frames.at(-1);
  if (after.status !== 'error' || !diagnostic || diagnostic.stage !== 'runtime'
    || diagnostic.code !== 'instruction-budget-exceeded'
    || after.faultInstructionIndex !== instruction.index
    || before.executedInstructionCount !== MAX_DYNAMIC_INSTRUCTION_COUNT
    || after.executedInstructionCount !== before.executedInstructionCount
    || before.nextInstructionIndex !== instruction.index
    || before.pc !== instruction.index
    || !beforeFrame || !afterFrame || beforeFrame.pc !== instruction.index
    || afterFrame.pc !== instruction.index || after.pc !== instruction.index
    || after.nextInstructionIndex !== instruction.index
    || !sameSourceSpan(diagnostic.span, instruction.span)
    || !sameFrameIds(before.frames, after.frames)
    || !sameSnapshotValues(beforeFrame.stack, afterFrame.stack)
    || !hasStableControlFlowState(before, after)) return undefined;

  return createFailureTransition(instruction, before, after, beforeFrame.id, 'budget-exhausted', [], instruction.index,
    instructionSpanAt(program, instruction.index));
}

function getFailureOperandCount(instruction: TeachingInstruction): number | null {
  if (instruction.opcode === 'LOAD_NAME') return 0;
  if (instruction.opcode === 'STORE_NAME' || instruction.opcode === 'UNARY_NEGATIVE' || instruction.opcode === 'UNARY_NOT'
    || instruction.opcode === 'GET_ITER') return 1;
  if (instruction.opcode === 'BINARY_ADD' || instruction.opcode === 'BINARY_SUBTRACT'
    || instruction.opcode === 'BINARY_MULTIPLY' || instruction.opcode === 'COMPARE_OP'
    || instruction.opcode === 'BINARY_SUBSCR') return 2;
  if (instruction.opcode === 'STORE_SUBSCR') return 3;
  if (instruction.opcode === 'BUILD_LIST' || instruction.opcode === 'BUILD_MAP'
    || instruction.opcode === 'BUILD_RANGE' || instruction.opcode === 'PRINT') {
    if (typeof instruction.argument !== 'number' || !Number.isInteger(instruction.argument) || instruction.argument < 0) return null;
    return instruction.opcode === 'BUILD_MAP' ? instruction.argument * 2 : instruction.argument;
  }
  return null;
}

function createFailureTransition(
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
  frameId: number,
  kind: 'runtime-error' | 'budget-exhausted',
  operands: readonly TeachingValueSnapshot[],
  nextInstructionIndex: number | null = null,
  nextInstructionSpan: SourceSpan | null = null,
): TeachingAnimationTransition {
  return Object.freeze({
    ...animationTransitionBase(instruction, before, after, frameId),
    kind,
    operands: Object.freeze([...operands]),
    value: null,
    sourceName: null,
    bindingName: null,
    objectId: null,
    objectType: null,
    itemIndex: null,
    itemKey: null,
    controlFlowOutcome: null,
    nextInstructionIndex,
    nextInstructionSpan,
    callerFrameId: null,
    calleeFrameId: null,
    functionName: null,
    callSite: null,
    returnPc: null,
    callBindings: Object.freeze([]),
    returnValue: null,
    diagnostic: after.diagnostic,
  });
}

function getControlFlowNextIndex(
  program: TeachingCompileResult,
  instruction: TeachingInstruction,
  before: TeachingVmSnapshot,
  after: TeachingVmSnapshot,
  expectedKind: 'branch' | 'shortCircuit' | 'iteration' | null,
  expectedTarget: number | undefined,
): number | undefined {
  const beforeFrame = before.frames.at(-1);
  const afterFrame = after.frames.at(-1);
  if (!beforeFrame || !afterFrame || expectedTarget === undefined
    || expectedTarget < 0 || expectedTarget >= program.instructions.length
    || before.pc !== instruction.index
    || before.nextInstructionIndex !== instruction.index
    || beforeFrame.pc !== instruction.index
    || !sameFrameIds(before.frames, after.frames)
    || afterFrame.id !== beforeFrame.id
    || !sameSnapshotValues(before.stack, beforeFrame.stack)
    || !sameSnapshotVariables(before.variables, beforeFrame.variables)
    || !sameSnapshotValues(after.stack, afterFrame.stack)
    || !sameSnapshotVariables(after.variables, afterFrame.variables)
    || afterFrame.pc !== expectedTarget
    || after.pc !== expectedTarget
    || after.nextInstructionIndex !== expectedTarget
    || (expectedKind !== null && after.controlFlow?.kind !== expectedKind)
    || (expectedKind !== null && after.controlFlow?.nextInstructionIndex !== expectedTarget)) return undefined;
  return expectedTarget;
}

function getInstructionTarget(program: TeachingCompileResult, argument: number | string | null): number | undefined {
  return typeof argument === 'number' && Number.isInteger(argument)
    && argument >= 0 && argument < program.instructions.length
    ? argument
    : undefined;
}

function instructionSpanAt(program: TeachingCompileResult, index: number): SourceSpan | null {
  const instruction = program.instructions[index];
  return !instruction || instruction.opcode === 'HALT' ? null : Object.freeze({ ...instruction.span });
}

function hasStableControlFlowState(before: TeachingVmSnapshot, after: TeachingVmSnapshot): boolean {
  const beforeActive = before.frames.at(-1);
  const afterActive = after.frames.at(-1);
  if (!beforeActive || !afterActive || !sameSnapshotVariables(before.variables, after.variables)
    || !sameSnapshotVariables(beforeActive.variables, afterActive.variables)
    || !sameSnapshotNames(beforeActive.unboundLocalNames, afterActive.unboundLocalNames)
    || !sameFrameMetadata(beforeActive, afterActive)
    || !sameHeap(before.heap, after.heap)
    || !sameSnapshotNames(before.output, after.output)) return false;

  return before.frames.slice(0, -1).every((frame, index) => {
    const afterFrame = after.frames[index];
    return afterFrame !== undefined
      && sameFrameMetadata(frame, afterFrame)
      && afterFrame.pc === frame.pc
      && sameSnapshotValues(afterFrame.stack, frame.stack)
      && sameSnapshotVariables(afterFrame.variables, frame.variables)
      && sameSnapshotNames(afterFrame.unboundLocalNames, frame.unboundLocalNames);
  });
}

function sameFrameMetadata(left: TeachingVmSnapshot['frames'][number], right: TeachingVmSnapshot['frames'][number]): boolean {
  return left.id === right.id
    && left.kind === right.kind
    && left.functionName === right.functionName
    && left.returnPc === right.returnPc
    && ((left.callSite === null && right.callSite === null)
      || (left.callSite !== null && right.callSite !== null && sameSourceSpan(left.callSite, right.callSite)));
}

function sameSnapshotVariables(
  left: TeachingVmSnapshot['variables'],
  right: TeachingVmSnapshot['variables'],
): boolean {
  return left.length === right.length && left.every((variable, index) => {
    const other = right[index];
    return other !== undefined && variable.name === other.name && sameSnapshotValue(variable.value, other.value);
  });
}

function sameSnapshotNames(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function sameHeap(
  left: readonly TeachingHeapObjectSnapshot[],
  right: readonly TeachingHeapObjectSnapshot[],
): boolean {
  return left.length === right.length && left.every((object, index) => {
    const other = right[index];
    if (!other || object.id !== other.id || object.type !== other.type) return false;
    if (object.type === 'list' && other.type === 'list') return sameSnapshotValues(object.items, other.items);
    return object.type === 'dict' && other.type === 'dict'
      && object.entries.length === other.entries.length
      && object.entries.every((entry, entryIndex) => {
        const otherEntry = other.entries[entryIndex];
        return otherEntry !== undefined
          && sameSnapshotValue(entry.key, otherEntry.key)
          && sameSnapshotValue(entry.value, otherEntry.value);
      });
  });
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
    controlFlowOutcome: null,
    nextInstructionIndex: null,
    nextInstructionSpan: null,
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
