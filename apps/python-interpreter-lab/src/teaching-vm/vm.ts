import {
  MAX_HISTORY_SNAPSHOTS,
  MAX_DYNAMIC_INSTRUCTION_COUNT,
  MAX_INTEGER_BITS,
  MAX_NAME_COUNT,
  MAX_OUTPUT_CODE_POINTS,
  MAX_STRING_CODE_POINTS,
} from './resource-limits';
import {
  TeachingDiagnostic,
  type SourceSpan,
  type TeachingCompileResult,
  type TeachingConstant,
  type TeachingDiagnosticSnapshot,
  type TeachingInstruction,
  type TeachingValueSnapshot,
  type TeachingVmHistory,
  type TeachingVmSnapshot,
  type TeachingVmStatus,
  type TeachingVariableSnapshot,
} from './types';

type RuntimeValue =
  | { type: 'int'; value: bigint }
  | { type: 'bool'; value: boolean }
  | { type: 'str'; value: string }
  | RangeRuntimeValue
  | IteratorRuntimeValue;

interface RangeRuntimeValue {
  type: 'range';
  start: bigint;
  stop: bigint;
  step: bigint;
  argumentCount: number;
}

interface IteratorRuntimeValue {
  type: 'iterator';
  range: RangeRuntimeValue;
  current: bigint;
  exhausted: boolean;
}

type NonTerminalStatus = 'running' | 'paused';

export class TeachingMachine {
  #pc = 0;
  #stepIndex = 0;
  #executedInstructionCount = 0;
  #status: TeachingVmStatus = 'ready';
  #stack: RuntimeValue[] = [];
  #variables = new Map<string, RuntimeValue>();
  #output: string[] = [];
  #lastExecutedInstructionIndex: number | null = null;
  #faultInstructionIndex: number | null = null;
  #controlFlow: TeachingVmSnapshot['controlFlow'] = null;
  #diagnostic: TeachingDiagnosticSnapshot | null = null;
  #history: TeachingVmSnapshot[] = [];
  #historyTruncated = false;
  #current: TeachingVmSnapshot;

  constructor(readonly program: TeachingCompileResult) {
    this.#current = this.createSnapshot();
    this.#history.push(this.#current);
  }

  get current(): TeachingVmSnapshot {
    return this.#current;
  }

  get history(): TeachingVmHistory {
    return Object.freeze({
      items: Object.freeze([...this.#history]),
      truncated: this.#historyTruncated,
    });
  }

  step(statusAfter: NonTerminalStatus = 'paused'): TeachingVmSnapshot {
    if (this.#status === 'finished' || this.#status === 'error') return this.#current;
    const instruction = this.program.instructions[this.#pc];
    if (!instruction) {
      this.failInstruction(
        { index: this.#pc, opcode: 'HALT', argument: null, span: this.program.ast.span },
        'invalid-program-counter',
        'Instruction pointer is outside the teaching program.',
      );
      return this.recordStep();
    }

    if (this.#executedInstructionCount >= MAX_DYNAMIC_INSTRUCTION_COUNT) {
      this.failInstruction(
        instruction,
        'instruction-budget-exceeded',
        `Teaching VM reached its ${MAX_DYNAMIC_INSTRUCTION_COUNT}-instruction execution limit.`,
      );
      return this.recordStep();
    }

    this.#faultInstructionIndex = null;
    this.#diagnostic = null;
    this.#executedInstructionCount += 1;
    try {
      const nextPc = this.execute(instruction);
      this.#lastExecutedInstructionIndex = instruction.index;
      this.#pc = nextPc ?? this.#pc + 1;
      this.#status = instruction.opcode === 'HALT' ? 'finished' : statusAfter;
    } catch (error) {
      const diagnostic = error instanceof TeachingDiagnostic
        ? error
        : new TeachingDiagnostic('runtime', 'runtime-error', 'Teaching VM encountered an unexpected runtime error.', instruction.span);
      this.#status = 'error';
      this.#faultInstructionIndex = instruction.index;
      this.#diagnostic = snapshotDiagnostic(diagnostic);
    }

    return this.recordStep();
  }

  setStatus(status: NonTerminalStatus): TeachingVmSnapshot {
    if (this.#status === 'finished' || this.#status === 'error') return this.#current;
    this.#status = status;
    this.#current = this.createSnapshot();
    if (this.#history.length > 0) this.#history[this.#history.length - 1] = this.#current;
    return this.#current;
  }

  private execute(instruction: TeachingInstruction): number | null {
    switch (instruction.opcode) {
      case 'LOAD_CONST': {
        const index = requireNumberArgument(instruction);
        const constant = this.program.constants[index];
        if (!constant) this.runtimeError('invalid-constant-index', `Constant ${index} does not exist.`, instruction.span);
        this.#stack.push(runtimeValueFromConstant(constant));
        return null;
      }
      case 'LOAD_NAME': {
        const name = requireStringArgument(instruction);
        const value = this.#variables.get(name);
        if (!value) this.runtimeError('name-error', `Name '${name}' is not defined.`, instruction.span);
        this.#stack.push(value);
        return null;
      }
      case 'STORE_NAME': {
        const name = requireStringArgument(instruction);
        const value = this.peek(instruction);
        if (!this.#variables.has(name) && this.#variables.size >= MAX_NAME_COUNT) {
          this.runtimeError('too-many-names', `Program exceeds ${MAX_NAME_COUNT} variable names.`, instruction.span);
        }
        this.#stack.pop();
        this.#variables.set(name, value);
        return null;
      }
      case 'UNARY_NEGATIVE': {
        const value = this.peek(instruction);
        if (!isNumeric(value)) this.typeError('unary -', [value], instruction.span);
        const result: RuntimeValue = { type: 'int', value: -numericValue(value) };
        assertIntegerWithinLimit(result.value, instruction.span);
        this.#stack[this.#stack.length - 1] = result;
        return null;
      }
      case 'UNARY_NOT': {
        const value = this.peek(instruction);
        this.#stack[this.#stack.length - 1] = { type: 'bool', value: !isTruthy(value) };
        return null;
      }
      case 'BINARY_ADD':
        this.executeAdd(instruction);
        return null;
      case 'BINARY_SUBTRACT':
        this.executeIntegerOperation(instruction, (left, right) => left - right);
        return null;
      case 'BINARY_MULTIPLY':
        this.executeIntegerOperation(instruction, (left, right) => left * right);
        return null;
      case 'COMPARE_OP':
        this.executeComparison(instruction);
        return null;
      case 'JUMP_IF_FALSE_OR_POP':
      case 'JUMP_IF_TRUE_OR_POP':
        return this.executeShortCircuit(instruction);
      case 'JUMP':
        return this.validateJumpTarget(instruction);
      case 'POP_JUMP_IF_FALSE':
        return this.executeConditionalJump(instruction);
      case 'BUILD_RANGE':
        this.executeBuildRange(instruction);
        return null;
      case 'GET_ITER':
        this.executeGetIterator(instruction);
        return null;
      case 'FOR_ITER':
        return this.executeForIteration(instruction);
      case 'PRINT':
        this.executePrint(instruction);
        return null;
      case 'HALT':
        return null;
    }
  }

  private executeAdd(instruction: TeachingInstruction): void {
    const [left, right] = this.peekPair(instruction);
    if (isNumeric(left) && isNumeric(right)) {
      const result = numericValue(left) + numericValue(right);
      assertIntegerWithinLimit(result, instruction.span);
      this.replacePair({ type: 'int', value: result });
      return;
    }
    if (left.type === 'str' && right.type === 'str') {
      const result = left.value + right.value;
      if (codePointLength(result) > MAX_STRING_CODE_POINTS) {
        this.runtimeError('string-too-long', `String result exceeds ${MAX_STRING_CODE_POINTS} code points.`, instruction.span);
      }
      this.replacePair({ type: 'str', value: result });
      return;
    }
    this.typeError('+', [left, right], instruction.span);
  }

  private executeIntegerOperation(
    instruction: TeachingInstruction,
    operation: (left: bigint, right: bigint) => bigint,
  ): void {
    const [left, right] = this.peekPair(instruction);
    if (!isNumeric(left) || !isNumeric(right)) this.typeError(instruction.opcode, [left, right], instruction.span);
    const result = operation(numericValue(left), numericValue(right));
    assertIntegerWithinLimit(result, instruction.span);
    this.replacePair({ type: 'int', value: result });
  }

  private executePrint(instruction: TeachingInstruction): void {
    const count = requireNumberArgument(instruction);
    if (count < 0 || count > this.#stack.length) {
      this.runtimeError('vm-stack-underflow', 'PRINT does not have enough values on the stack.', instruction.span);
    }
    const values = this.#stack.slice(this.#stack.length - count);
    const line = values.map(formatPrintValue).join(' ');
    const addedCodePoints = codePointLength(line) + 1;
    const currentCodePoints = this.#output.reduce((total, item) => total + codePointLength(item) + 1, 0);
    if (currentCodePoints + addedCodePoints > MAX_OUTPUT_CODE_POINTS) {
      this.runtimeError('output-too-long', `Standard output exceeds ${MAX_OUTPUT_CODE_POINTS} code points.`, instruction.span);
    }
    this.#output.push(line);
    if (count > 0) this.#stack.splice(this.#stack.length - count, count);
  }

  private executeComparison(instruction: TeachingInstruction): void {
    const operator = requireStringArgument(instruction);
    if (!['==', '!=', '<', '<=', '>', '>='].includes(operator)) {
      this.runtimeError('invalid-instruction-argument', 'COMPARE_OP received an unknown operator.', instruction.span);
    }
    const [left, right] = this.peekPair(instruction);
    let result: boolean;
    if (isNumeric(left) && isNumeric(right)) {
      const leftValue = numericValue(left);
      const rightValue = numericValue(right);
      result = comparePrimitive(leftValue, rightValue, operator);
    } else if (left.type === 'str' && right.type === 'str') {
      result = comparePrimitive(compareCodePoints(left.value, right.value), 0, operator);
    } else if (operator === '==' || operator === '!=') {
      result = operator === '!=';
    } else {
      this.typeError(operator, [left, right], instruction.span);
    }
    this.replacePair({ type: 'bool', value: result });
  }

  private executeShortCircuit(instruction: TeachingInstruction): number | null {
    const target = this.validateJumpTarget(instruction);
    const value = this.peek(instruction);
    const truth = isTruthy(value);
    const shouldJump = instruction.opcode === 'JUMP_IF_FALSE_OR_POP' ? !truth : truth;
    if (!shouldJump) this.#stack.pop();
    this.#controlFlow = Object.freeze({
      kind: 'shortCircuit',
      outcome: shouldJump ? 'short-circuited' : 'evaluated-right',
      nextInstructionIndex: shouldJump ? target : this.#pc + 1,
    });
    return shouldJump ? target : null;
  }

  private executeConditionalJump(instruction: TeachingInstruction): number | null {
    const target = this.validateJumpTarget(instruction);
    const condition = this.peek(instruction);
    const shouldJump = !isTruthy(condition);
    this.#stack.pop();
    this.#controlFlow = Object.freeze({
      kind: 'branch',
      outcome: shouldJump ? 'branch-skipped' : 'branch-taken',
      nextInstructionIndex: shouldJump ? target : this.#pc + 1,
    });
    return shouldJump ? target : null;
  }

  private validateJumpTarget(instruction: TeachingInstruction): number {
    const target = requireNumberArgument(instruction);
    if (target < 0 || target >= this.program.instructions.length) {
      this.runtimeError('invalid-jump-target', 'Jump target is outside the teaching program.', instruction.span);
    }
    return target;
  }

  private executeBuildRange(instruction: TeachingInstruction): void {
    const count = requireNumberArgument(instruction);
    if (count < 1 || count > 3 || count > this.#stack.length) {
      this.runtimeError('invalid-range-arity', 'BUILD_RANGE requires one to three stack arguments.', instruction.span);
    }
    const arguments_ = this.#stack.slice(this.#stack.length - count);
    if (!arguments_.every(isNumeric)) this.typeError('range', arguments_, instruction.span);
    const values = arguments_.map((value) => numericValue(value as Extract<RuntimeValue, { type: 'int' | 'bool' }>));
    const start = count === 1 ? 0n : values[0] ?? 0n;
    const stop = count === 1 ? values[0] ?? 0n : values[1] ?? 0n;
    const step = count === 3 ? values[2] ?? 0n : 1n;
    if (step === 0n) this.runtimeError('zero-range-step', 'range() arg 3 must not be zero.', instruction.span);
    this.#stack.splice(this.#stack.length - count, count, {
      type: 'range',
      start,
      stop,
      step,
      argumentCount: count,
    });
  }

  private executeGetIterator(instruction: TeachingInstruction): void {
    const value = this.peek(instruction);
    if (value.type !== 'range') this.typeError('iter', [value], instruction.span);
    this.#stack[this.#stack.length - 1] = {
      type: 'iterator',
      range: value,
      current: value.start,
      exhausted: false,
    };
  }

  private executeForIteration(instruction: TeachingInstruction): number | null {
    const target = this.validateJumpTarget(instruction);
    const iterator = this.peek(instruction);
    if (iterator.type !== 'iterator') this.typeError('FOR_ITER', [iterator], instruction.span);
    const hasValue = !iterator.exhausted && rangeContains(iterator.range, iterator.current);
    if (!hasValue) {
      this.#stack.pop();
      this.#controlFlow = Object.freeze({
        kind: 'iteration',
        outcome: 'loop-finished',
        nextInstructionIndex: target,
      });
      return target;
    }

    const current = iterator.current;
    const next = current + iterator.range.step;
    const exhausted = !rangeContains(iterator.range, next);
    this.#stack[this.#stack.length - 1] = { ...iterator, current: next, exhausted };
    this.#stack.push({ type: 'int', value: current });
    this.#controlFlow = Object.freeze({
      kind: 'iteration',
      outcome: 'next-value',
      nextInstructionIndex: this.#pc + 1,
    });
    return null;
  }

  private peek(instruction: TeachingInstruction): RuntimeValue {
    const value = this.#stack.at(-1);
    if (!value) this.runtimeError('vm-stack-underflow', 'Instruction expected a value on the stack.', instruction.span);
    return value;
  }

  private peekPair(instruction: TeachingInstruction): [RuntimeValue, RuntimeValue] {
    if (this.#stack.length < 2) {
      this.runtimeError('vm-stack-underflow', 'Binary instruction expected two values on the stack.', instruction.span);
    }
    return [this.#stack[this.#stack.length - 2], this.#stack[this.#stack.length - 1]];
  }

  private replacePair(value: RuntimeValue): void {
    this.#stack.splice(this.#stack.length - 2, 2, value);
  }

  private typeError(operator: string, values: RuntimeValue[], span: SourceSpan): never {
    const types = values.map(({ type }) => type).join(' and ');
    this.runtimeError('type-error', `Unsupported operand types for ${operator}: ${types}.`, span);
  }

  private runtimeError(code: string, message: string, span: SourceSpan): never {
    throw new TeachingDiagnostic('runtime', code, message, span);
  }

  private failInstruction(instruction: TeachingInstruction, code: string, message: string): void {
    this.#status = 'error';
    this.#faultInstructionIndex = instruction.index;
    this.#diagnostic = snapshotDiagnostic(new TeachingDiagnostic('runtime', code, message, instruction.span));
  }

  private recordStep(): TeachingVmSnapshot {
    this.#stepIndex += 1;
    this.#current = this.createSnapshot();
    this.#history.push(this.#current);
    if (this.#history.length > MAX_HISTORY_SNAPSHOTS) {
      this.#history.shift();
      this.#historyTruncated = true;
    }
    return this.#current;
  }

  private createSnapshot(): TeachingVmSnapshot {
    return Object.freeze({
      stepIndex: this.#stepIndex,
      executedInstructionCount: this.#executedInstructionCount,
      pc: this.#pc,
      status: this.#status,
      lastExecutedInstructionIndex: this.#lastExecutedInstructionIndex,
      nextInstructionIndex: this.#status === 'finished' ? null : this.#pc,
      faultInstructionIndex: this.#faultInstructionIndex,
      controlFlow: this.#controlFlow,
      stack: Object.freeze(this.#stack.map(snapshotValue)),
      variables: Object.freeze([...this.#variables].map(([name, value]) => Object.freeze({
        name,
        value: snapshotValue(value),
      }))),
      output: Object.freeze([...this.#output]),
      diagnostic: this.#diagnostic,
    });
  }
}

export function createTeachingMachine(program: TeachingCompileResult): TeachingMachine {
  return new TeachingMachine(program);
}

export function stepTeachingMachine(
  machine: TeachingMachine,
  statusAfter: NonTerminalStatus = 'paused',
): TeachingVmSnapshot {
  return machine.step(statusAfter);
}

export function setTeachingMachineStatus(machine: TeachingMachine, status: NonTerminalStatus): TeachingVmSnapshot {
  return machine.setStatus(status);
}

export function getTeachingHistory(machine: TeachingMachine): TeachingVmHistory {
  return machine.history;
}

function runtimeValueFromConstant(constant: TeachingConstant): RuntimeValue {
  if (constant.type === 'int') return { type: 'int', value: BigInt(constant.value) };
  if (constant.type === 'bool') return { type: 'bool', value: constant.value === 'True' };
  return { type: 'str', value: constant.value };
}

function snapshotValue(value: RuntimeValue): TeachingValueSnapshot {
  const text = value.type === 'int'
    ? value.value.toString(10)
    : value.type === 'bool'
      ? value.value ? 'True' : 'False'
      : value.type === 'str'
        ? value.value
        : value.type === 'range'
          ? formatRange(value)
          : formatIterator(value);
  return Object.freeze({
    type: value.type,
    value: text,
    display: value.type === 'str' ? JSON.stringify(value.value) : text,
  });
}

function snapshotDiagnostic(diagnostic: TeachingDiagnostic): TeachingDiagnosticSnapshot {
  return Object.freeze({
    stage: diagnostic.stage,
    code: diagnostic.code,
    message: diagnostic.message,
    span: Object.freeze({ ...diagnostic.span }),
  });
}

function formatPrintValue(value: RuntimeValue): string {
  if (value.type === 'bool') return value.value ? 'True' : 'False';
  if (value.type === 'range') return formatRange(value);
  if (value.type === 'iterator') return formatIterator(value);
  return value.value.toString();
}

function isNumeric(value: RuntimeValue): value is Extract<RuntimeValue, { type: 'int' | 'bool' }> {
  return value.type === 'int' || value.type === 'bool';
}

function numericValue(value: Extract<RuntimeValue, { type: 'int' | 'bool' }>): bigint {
  return value.type === 'int' ? value.value : value.value ? 1n : 0n;
}

function isTruthy(value: RuntimeValue): boolean {
  switch (value.type) {
    case 'bool': return value.value;
    case 'int': return value.value !== 0n;
    case 'str': return value.value.length > 0;
    case 'range': return rangeContains(value, value.start);
    case 'iterator': return true;
  }
}

function rangeContains(range: RangeRuntimeValue, value: bigint): boolean {
  return range.step > 0n ? value < range.stop : value > range.stop;
}

function formatRange(range: RangeRuntimeValue): string {
  if (range.argumentCount === 1) return `range(${range.stop})`;
  if (range.argumentCount === 2) return `range(${range.start}, ${range.stop})`;
  return `range(${range.start}, ${range.stop}, ${range.step})`;
}

function formatIterator(iterator: IteratorRuntimeValue): string {
  return iterator.exhausted
    ? `iterator(${formatRange(iterator.range)}, exhausted)`
    : `iterator(${formatRange(iterator.range)}, next=${iterator.current})`;
}

function comparePrimitive(left: bigint | number, right: bigint | number, operator: string): boolean {
  switch (operator) {
    case '==': return left === right;
    case '!=': return left !== right;
    case '<': return left < right;
    case '<=': return left <= right;
    case '>': return left > right;
    case '>=': return left >= right;
    default: return false;
  }
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (character) => character.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = leftPoints[index] - rightPoints[index];
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function assertIntegerWithinLimit(value: bigint, span: SourceSpan): void {
  const magnitude = value < 0n ? -value : value;
  const bitLength = magnitude === 0n ? 0 : magnitude.toString(2).length;
  if (bitLength > MAX_INTEGER_BITS) {
    throw new TeachingDiagnostic('runtime', 'integer-too-large', `Integer result exceeds ${MAX_INTEGER_BITS} bits.`, span);
  }
}

function requireNumberArgument(instruction: TeachingInstruction): number {
  if (typeof instruction.argument !== 'number' || !Number.isInteger(instruction.argument)) {
    throw new TeachingDiagnostic('runtime', 'invalid-instruction-argument', 'Instruction requires a numeric argument.', instruction.span);
  }
  return instruction.argument;
}

function requireStringArgument(instruction: TeachingInstruction): string {
  if (typeof instruction.argument !== 'string') {
    throw new TeachingDiagnostic('runtime', 'invalid-instruction-argument', 'Instruction requires a name argument.', instruction.span);
  }
  return instruction.argument;
}
