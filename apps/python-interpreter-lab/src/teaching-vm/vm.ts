import {
  MAX_HISTORY_SNAPSHOTS,
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
  | { type: 'str'; value: string };

type NonTerminalStatus = 'running' | 'paused';

export class TeachingMachine {
  #pc = 0;
  #stepIndex = 0;
  #status: TeachingVmStatus = 'ready';
  #stack: RuntimeValue[] = [];
  #variables = new Map<string, RuntimeValue>();
  #output: string[] = [];
  #lastExecutedInstructionIndex: number | null = null;
  #faultInstructionIndex: number | null = null;
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

    this.#faultInstructionIndex = null;
    this.#diagnostic = null;
    try {
      this.execute(instruction);
      this.#lastExecutedInstructionIndex = instruction.index;
      this.#pc += 1;
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

  private execute(instruction: TeachingInstruction): void {
    switch (instruction.opcode) {
      case 'LOAD_CONST': {
        const index = requireNumberArgument(instruction);
        const constant = this.program.constants[index];
        if (!constant) this.runtimeError('invalid-constant-index', `Constant ${index} does not exist.`, instruction.span);
        this.#stack.push(runtimeValueFromConstant(constant));
        return;
      }
      case 'LOAD_NAME': {
        const name = requireStringArgument(instruction);
        const value = this.#variables.get(name);
        if (!value) this.runtimeError('name-error', `Name '${name}' is not defined.`, instruction.span);
        this.#stack.push(value);
        return;
      }
      case 'STORE_NAME': {
        const name = requireStringArgument(instruction);
        const value = this.peek(instruction);
        if (!this.#variables.has(name) && this.#variables.size >= MAX_NAME_COUNT) {
          this.runtimeError('too-many-names', `Program exceeds ${MAX_NAME_COUNT} variable names.`, instruction.span);
        }
        this.#stack.pop();
        this.#variables.set(name, value);
        return;
      }
      case 'UNARY_NEGATIVE': {
        const value = this.peek(instruction);
        if (value.type !== 'int') this.typeError('unary -', [value], instruction.span);
        const result: RuntimeValue = { type: 'int', value: -value.value };
        assertIntegerWithinLimit(result.value, instruction.span);
        this.#stack[this.#stack.length - 1] = result;
        return;
      }
      case 'BINARY_ADD':
        this.executeAdd(instruction);
        return;
      case 'BINARY_SUBTRACT':
        this.executeIntegerOperation(instruction, (left, right) => left - right);
        return;
      case 'BINARY_MULTIPLY':
        this.executeIntegerOperation(instruction, (left, right) => left * right);
        return;
      case 'PRINT':
        this.executePrint(instruction);
        return;
      case 'HALT':
        return;
    }
  }

  private executeAdd(instruction: TeachingInstruction): void {
    const [left, right] = this.peekPair(instruction);
    if (left.type === 'int' && right.type === 'int') {
      const result = left.value + right.value;
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
    if (left.type !== 'int' || right.type !== 'int') this.typeError(instruction.opcode, [left, right], instruction.span);
    const result = operation(left.value, right.value);
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
      pc: this.#pc,
      status: this.#status,
      lastExecutedInstructionIndex: this.#lastExecutedInstructionIndex,
      nextInstructionIndex: this.#status === 'finished' ? null : this.#pc,
      faultInstructionIndex: this.#faultInstructionIndex,
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
  return constant.type === 'int'
    ? { type: 'int', value: BigInt(constant.value) }
    : { type: 'str', value: constant.value };
}

function snapshotValue(value: RuntimeValue): TeachingValueSnapshot {
  const text = value.type === 'int' ? value.value.toString(10) : value.value;
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
  return value.value.toString();
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
