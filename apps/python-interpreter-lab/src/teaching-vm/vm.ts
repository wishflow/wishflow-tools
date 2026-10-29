import {
  MAX_HISTORY_SNAPSHOTS,
  MAX_ACTIVE_FRAME_COUNT,
  MAX_CONTAINER_ENTRIES,
  MAX_DYNAMIC_INSTRUCTION_COUNT,
  MAX_HEAP_ENTRIES,
  MAX_HEAP_OBJECTS,
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
  type TeachingFrameSnapshot,
  type TeachingFunction,
  type TeachingHeapObjectSnapshot,
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
  | { type: 'none' }
  | { type: 'function'; function: TeachingFunction }
  | ListRuntimeValue
  | DictRuntimeValue
  | RangeRuntimeValue
  | IteratorRuntimeValue;

interface ListRuntimeValue {
  type: 'list';
  objectId: number;
}

interface ListHeapObject {
  id: number;
  type: 'list';
  items: RuntimeValue[];
}

interface DictRuntimeValue {
  type: 'dict';
  objectId: number;
}

interface DictHeapEntry {
  key: RuntimeValue;
  value: RuntimeValue;
}

interface DictHeapObject {
  id: number;
  type: 'dict';
  entries: DictHeapEntry[];
}

type HeapObject = ListHeapObject | DictHeapObject;

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

interface RuntimeFrame {
  id: number;
  function: TeachingFunction | null;
  pc: number;
  returnPc: number | null;
  callSite: SourceSpan | null;
  stack: RuntimeValue[];
  locals: Map<string, RuntimeValue>;
  lastExecutedInstructionIndex: number | null;
}

export class TeachingMachine {
  #stepIndex = 0;
  #executedInstructionCount = 0;
  #status: TeachingVmStatus = 'ready';
  #frames: RuntimeFrame[];
  #nextFrameId = 1;
  #variables = new Map<string, RuntimeValue>();
  #heap = new Map<number, HeapObject>();
  #nextHeapObjectId = 1;
  #allocatedHeapEntryCount = 0;
  #output: string[] = [];
  #lastExecutedInstructionIndex: number | null = null;
  #faultInstructionIndex: number | null = null;
  #controlFlow: TeachingVmSnapshot['controlFlow'] = null;
  #diagnostic: TeachingDiagnosticSnapshot | null = null;
  #history: TeachingVmSnapshot[] = [];
  #historyTruncated = false;
  #current: TeachingVmSnapshot;

  constructor(readonly program: TeachingCompileResult) {
    this.#frames = [{
      id: 0,
      function: null,
      pc: 0,
      returnPc: null,
      callSite: null,
      stack: [],
      locals: new Map(),
      lastExecutedInstructionIndex: null,
    }];
    this.#current = this.createSnapshot();
    this.#history.push(this.#current);
  }

  get #frame(): RuntimeFrame {
    const frame = this.#frames.at(-1);
    if (!frame) throw new Error('Teaching VM frame stack cannot be empty.');
    return frame;
  }

  get #pc(): number {
    return this.#frame.pc;
  }

  set #pc(value: number) {
    this.#frame.pc = value;
  }

  get #stack(): RuntimeValue[] {
    return this.#frame.stack;
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
    const executingFrame = this.#frame;
    const instruction = this.program.instructions[executingFrame.pc];
    if (!instruction) {
      this.failInstruction(
        { index: executingFrame.pc, opcode: 'HALT', argument: null, span: this.program.ast.span },
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
      const nextPc = this.execute(instruction, executingFrame);
      this.#lastExecutedInstructionIndex = instruction.index;
      executingFrame.lastExecutedInstructionIndex = instruction.index;
      if (instruction.opcode !== 'CALL_FUNCTION'
        && instruction.opcode !== 'RETURN_VALUE'
        && instruction.opcode !== 'RETURN_NONE') {
        executingFrame.pc = nextPc ?? executingFrame.pc + 1;
      }
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

  private execute(instruction: TeachingInstruction, frame: RuntimeFrame): number | null {
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
        const value = this.resolveName(name, frame, instruction);
        if (value.type === 'function') {
          this.runtimeError('function-value-unsupported', 'Functions can only be used as direct call targets.', instruction.span);
        }
        this.#stack.push(value);
        return null;
      }
      case 'STORE_NAME': {
        const name = requireStringArgument(instruction);
        const value = this.peek(instruction);
        this.storeName(name, value, frame, instruction);
        this.#stack.pop();
        return null;
      }
      case 'DEFINE_FUNCTION': {
        const functionId = requireNumberArgument(instruction);
        const functionInfo = this.program.functions[functionId];
        if (!functionInfo) this.runtimeError('invalid-function-index', `Function ${functionId} does not exist.`, instruction.span);
        if (!this.#variables.has(functionInfo.name) && this.#variables.size >= MAX_NAME_COUNT) {
          this.runtimeError('too-many-names', `Program exceeds ${MAX_NAME_COUNT} variable names.`, instruction.span);
        }
        this.#variables.set(functionInfo.name, { type: 'function', function: functionInfo });
        return null;
      }
      case 'CALL_FUNCTION':
        this.executeCall(instruction, frame);
        return null;
      case 'RETURN_VALUE': {
        const value = this.peek(instruction);
        this.returnFromFunction(value, frame, instruction);
        return null;
      }
      case 'RETURN_NONE':
        this.returnFromFunction({ type: 'none' }, frame, instruction);
        return null;
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
        this.#stack[this.#stack.length - 1] = { type: 'bool', value: !this.isTruthy(value) };
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
      case 'BUILD_LIST':
        this.executeBuildList(instruction);
        return null;
      case 'BUILD_MAP':
        this.executeBuildMap(instruction);
        return null;
      case 'BINARY_SUBSCR':
        this.executeSubscript(instruction);
        return null;
      case 'STORE_SUBSCR':
        this.executeStoreSubscript(instruction);
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
        if (frame.function) this.runtimeError('invalid-function-halt', 'A function cannot execute the module HALT instruction.', instruction.span);
        return null;
    }
  }

  private resolveName(name: string, frame: RuntimeFrame, instruction: TeachingInstruction): RuntimeValue {
    if (frame.function?.localNames.includes(name)) {
      const local = frame.locals.get(name);
      if (!local) {
        this.runtimeError('unbound-local-error', `Local name '${name}' is not bound yet.`, instruction.span);
      }
      return local;
    }
    const global = this.#variables.get(name);
    if (!global) this.runtimeError('name-error', `Name '${name}' is not defined.`, instruction.span);
    return global;
  }

  private storeName(name: string, value: RuntimeValue, frame: RuntimeFrame, instruction: TeachingInstruction): void {
    if (frame.function) {
      if (!frame.function.localNames.includes(name)) {
        this.runtimeError('invalid-local-store', `Name '${name}' was not declared local by the compiler.`, instruction.span);
      }
      frame.locals.set(name, value);
      return;
    }
    if (!this.#variables.has(name) && this.#variables.size >= MAX_NAME_COUNT) {
      this.runtimeError('too-many-names', `Program exceeds ${MAX_NAME_COUNT} variable names.`, instruction.span);
    }
    this.#variables.set(name, value);
  }

  private executeCall(instruction: TeachingInstruction, caller: RuntimeFrame): void {
    const name = requireStringArgument(instruction);
    const value = this.resolveName(name, caller, instruction);
    if (value.type !== 'function') this.runtimeError('not-callable', `Name '${name}' is not a function.`, instruction.span);
    const argumentCount = instruction.argumentCount;
    if (argumentCount === undefined || !Number.isInteger(argumentCount) || argumentCount < 0) {
      this.runtimeError('invalid-instruction-argument', 'CALL_FUNCTION requires a non-negative argument count.', instruction.span);
    }
    if (argumentCount !== value.function.parameters.length) {
      this.runtimeError(
        'argument-count-mismatch',
        `Function '${name}' expects ${value.function.parameters.length} arguments but received ${argumentCount}.`,
        instruction.span,
      );
    }
    if (argumentCount > caller.stack.length) {
      this.runtimeError('vm-stack-underflow', 'CALL_FUNCTION does not have enough argument values on the stack.', instruction.span);
    }
    if (this.#frames.length >= MAX_ACTIVE_FRAME_COUNT) {
      this.runtimeError('frame-limit-exceeded', `Teaching VM reached its ${MAX_ACTIVE_FRAME_COUNT}-frame limit.`, instruction.span);
    }
    const activeLocalCount = this.#frames.reduce((count, frame) => count + (frame.function?.localNames.length ?? 0), 0);
    if (this.#variables.size + activeLocalCount + value.function.localNames.length > MAX_NAME_COUNT) {
      this.runtimeError('too-many-names', `Active frames exceed the ${MAX_NAME_COUNT}-name limit.`, instruction.span);
    }

    const arguments_ = caller.stack.splice(caller.stack.length - argumentCount, argumentCount);
    const locals = new Map<string, RuntimeValue>();
    value.function.parameters.forEach((parameter, index) => {
      const argument = arguments_[index];
      if (argument) locals.set(parameter, argument);
    });
    const returnPc = caller.pc + 1;
    caller.pc = returnPc;
    this.#frames.push({
      id: this.#nextFrameId,
      function: value.function,
      pc: value.function.entryIndex,
      returnPc,
      callSite: instruction.span,
      stack: [],
      locals,
      lastExecutedInstructionIndex: null,
    });
    this.#nextFrameId += 1;
  }

  private returnFromFunction(value: RuntimeValue, frame: RuntimeFrame, instruction: TeachingInstruction): void {
    if (!frame.function || this.#frames.length <= 1) {
      this.runtimeError('return-outside-function', 'RETURN cannot exit the module frame.', instruction.span);
    }
    if (instruction.opcode === 'RETURN_VALUE') frame.stack.pop();
    this.#frames.pop();
    const caller = this.#frame;
    caller.stack.push(value);
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
    const line = values.map((value) => formatPrintValue(value, this.#heap)).join(' ');
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
    } else if (left.type === 'none' && right.type === 'none') {
      if (operator === '==' || operator === '!=') result = operator === '==';
      else this.typeError(operator, [left, right], instruction.span);
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
    const truth = this.isTruthy(value);
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
    const shouldJump = !this.isTruthy(condition);
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

  private executeBuildList(instruction: TeachingInstruction): void {
    const count = requireNumberArgument(instruction);
    if (count < 0 || count > this.#stack.length) {
      this.runtimeError('vm-stack-underflow', 'BUILD_LIST does not have enough values on the stack.', instruction.span);
    }
    if (count > MAX_CONTAINER_ENTRIES) {
      this.runtimeError('container-size-limit-exceeded', `A list cannot contain more than ${MAX_CONTAINER_ENTRIES} items.`, instruction.span);
    }
    if (this.#heap.size >= MAX_HEAP_OBJECTS) {
      this.runtimeError('heap-object-limit-exceeded', `Teaching VM reached its ${MAX_HEAP_OBJECTS}-object allocation limit.`, instruction.span);
    }
    if (this.#allocatedHeapEntryCount + count > MAX_HEAP_ENTRIES) {
      this.runtimeError('heap-entry-limit-exceeded', `Teaching VM reached its ${MAX_HEAP_ENTRIES}-entry allocation limit.`, instruction.span);
    }

    const items = this.#stack.slice(this.#stack.length - count);
    const objectId = this.#nextHeapObjectId;
    this.#nextHeapObjectId += 1;
    this.#allocatedHeapEntryCount += count;
    this.#heap.set(objectId, { id: objectId, type: 'list', items });
    this.#stack.splice(this.#stack.length - count, count, { type: 'list', objectId });
  }

  private executeBuildMap(instruction: TeachingInstruction): void {
    const count = requireNumberArgument(instruction);
    if (count < 0 || count * 2 > this.#stack.length) {
      this.runtimeError('vm-stack-underflow', 'BUILD_MAP does not have enough key and value pairs on the stack.', instruction.span);
    }
    const entries: DictHeapEntry[] = [];
    const values = this.#stack.slice(this.#stack.length - count * 2);
    for (let index = 0; index < values.length; index += 2) {
      const key = values[index];
      const value = values[index + 1];
      if (!key || !value) this.runtimeError('vm-stack-underflow', 'BUILD_MAP received an incomplete key and value pair.', instruction.span);
      if (!isDictionaryKey(key)) this.typeError('dictionary key', [key], instruction.span);
      const existing = entries.find((entry) => dictionaryKeysEqual(entry.key, key));
      if (existing) existing.value = value;
      else entries.push({ key, value });
      if (entries.length > MAX_CONTAINER_ENTRIES) {
        this.runtimeError('container-size-limit-exceeded', `A dictionary cannot contain more than ${MAX_CONTAINER_ENTRIES} entries.`, instruction.span);
      }
    }
    if (this.#heap.size >= MAX_HEAP_OBJECTS) {
      this.runtimeError('heap-object-limit-exceeded', `Teaching VM reached its ${MAX_HEAP_OBJECTS}-object allocation limit.`, instruction.span);
    }
    if (this.#allocatedHeapEntryCount + entries.length > MAX_HEAP_ENTRIES) {
      this.runtimeError('heap-entry-limit-exceeded', `Teaching VM reached its ${MAX_HEAP_ENTRIES}-entry allocation limit.`, instruction.span);
    }

    const objectId = this.#nextHeapObjectId;
    this.#nextHeapObjectId += 1;
    this.#allocatedHeapEntryCount += entries.length;
    this.#heap.set(objectId, { id: objectId, type: 'dict', entries });
    this.#stack.splice(this.#stack.length - count * 2, count * 2, { type: 'dict', objectId });
  }

  private isTruthy(value: RuntimeValue): boolean {
    switch (value.type) {
      case 'none': return false;
      case 'function': return true;
      case 'bool': return value.value;
      case 'int': return value.value !== 0n;
      case 'str': return value.value.length > 0;
      case 'range': return rangeContains(value, value.start);
      case 'iterator': return true;
      case 'list': {
        const object = this.#heap.get(value.objectId);
        return object?.type === 'list' && object.items.length > 0;
      }
      case 'dict': {
        const object = this.#heap.get(value.objectId);
        return object?.type === 'dict' && object.entries.length > 0;
      }
    }
  }

  private executeSubscript(instruction: TeachingInstruction): void {
    const [container, index] = this.peekPair(instruction);
    if (container.type === 'list') {
      if (!isNumeric(index)) this.typeError('list index', [index], instruction.span);
      const object = this.#heap.get(container.objectId);
      if (!object || object.type !== 'list') this.runtimeError('invalid-object-reference', `List object #${container.objectId} does not exist.`, instruction.span);
      const normalizedIndex = normalizeListIndex(index, object.items.length, instruction.span);
      const value = object.items[normalizedIndex];
      if (!value) this.runtimeError('index-out-of-range', 'List index is out of range.', instruction.span);
      this.replacePair(value);
      return;
    }
    if (container.type === 'dict') {
      if (!isDictionaryKey(index)) this.typeError('dictionary key', [index], instruction.span);
      const object = this.#heap.get(container.objectId);
      if (!object || object.type !== 'dict') this.runtimeError('invalid-object-reference', `Dictionary object #${container.objectId} does not exist.`, instruction.span);
      const entry = object.entries.find(({ key }) => dictionaryKeysEqual(key, index));
      if (!entry) this.runtimeError('key-not-found', `Dictionary key ${snapshotValue(index).display} was not found.`, instruction.span);
      this.replacePair(entry.value);
      return;
    }
    this.typeError('subscript', [container], instruction.span);
  }

  private executeStoreSubscript(instruction: TeachingInstruction): void {
    if (this.#stack.length < 3) {
      this.runtimeError('vm-stack-underflow', 'STORE_SUBSCR requires a value, container, and index.', instruction.span);
    }
    const value = this.#stack[this.#stack.length - 3];
    const container = this.#stack[this.#stack.length - 2];
    const index = this.#stack[this.#stack.length - 1];
    if (!value || !container || !index) {
      this.runtimeError('vm-stack-underflow', 'STORE_SUBSCR requires a value, container, and index.', instruction.span);
    }
    if (container.type === 'list') {
      if (!isNumeric(index)) this.typeError('list index', [index], instruction.span);
      const object = this.#heap.get(container.objectId);
      if (!object || object.type !== 'list') this.runtimeError('invalid-object-reference', `List object #${container.objectId} does not exist.`, instruction.span);
      const normalizedIndex = normalizeListIndex(index, object.items.length, instruction.span);
      object.items[normalizedIndex] = value;
      this.#stack.splice(this.#stack.length - 3, 3);
      return;
    }
    if (container.type === 'dict') {
      if (!isDictionaryKey(index)) this.typeError('dictionary key', [index], instruction.span);
      const object = this.#heap.get(container.objectId);
      if (!object || object.type !== 'dict') this.runtimeError('invalid-object-reference', `Dictionary object #${container.objectId} does not exist.`, instruction.span);
      const entry = object.entries.find(({ key }) => dictionaryKeysEqual(key, index));
      if (entry) {
        entry.value = value;
      } else {
        if (object.entries.length >= MAX_CONTAINER_ENTRIES) {
          this.runtimeError('container-size-limit-exceeded', `A dictionary cannot contain more than ${MAX_CONTAINER_ENTRIES} entries.`, instruction.span);
        }
        if (this.#allocatedHeapEntryCount + 1 > MAX_HEAP_ENTRIES) {
          this.runtimeError('heap-entry-limit-exceeded', `Teaching VM reached its ${MAX_HEAP_ENTRIES}-entry allocation limit.`, instruction.span);
        }
        object.entries.push({ key: index, value });
        this.#allocatedHeapEntryCount += 1;
      }
      this.#stack.splice(this.#stack.length - 3, 3);
      return;
    }
    this.typeError('subscript assignment', [container], instruction.span);
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
    const frames = Object.freeze(this.#frames.map((frame) => this.createFrameSnapshot(frame)));
    const activeFrame = frames.at(-1);
    if (!activeFrame) throw new Error('Teaching VM snapshot requires an active frame.');
    return Object.freeze({
      stepIndex: this.#stepIndex,
      executedInstructionCount: this.#executedInstructionCount,
      pc: activeFrame.pc,
      status: this.#status,
      lastExecutedInstructionIndex: this.#lastExecutedInstructionIndex,
      nextInstructionIndex: this.#status === 'finished' ? null : activeFrame.pc,
      faultInstructionIndex: this.#faultInstructionIndex,
      controlFlow: this.#controlFlow,
      frames,
      stack: activeFrame.stack,
      variables: activeFrame.variables,
      heap: this.createHeapSnapshot(),
      output: Object.freeze([...this.#output]),
      diagnostic: this.#diagnostic,
    });
  }

  private createHeapSnapshot(): readonly TeachingHeapObjectSnapshot[] {
    const roots: RuntimeValue[] = [
      ...this.#variables.values(),
      ...this.#frames.flatMap((frame) => [...frame.locals.values(), ...frame.stack]),
    ];
    const reachableIds = new Set<number>();
    const pending = [...roots];
    for (let index = 0; index < pending.length; index += 1) {
      const value = pending[index];
      if ((value?.type !== 'list' && value?.type !== 'dict') || reachableIds.has(value.objectId)) continue;
      reachableIds.add(value.objectId);
      const object = this.#heap.get(value.objectId);
      if (object?.type === 'list') pending.push(...object.items);
      if (object?.type === 'dict') {
        for (const entry of object.entries) pending.push(entry.key, entry.value);
      }
    }

    return Object.freeze([...this.#heap.values()]
      .filter(({ id }) => reachableIds.has(id))
      .map((object) => object.type === 'list'
        ? Object.freeze({
          id: object.id,
          type: object.type,
          items: Object.freeze(object.items.map(snapshotValue)),
        })
        : Object.freeze({
          id: object.id,
          type: object.type,
          entries: Object.freeze(object.entries.map(({ key, value }) => Object.freeze({
            key: snapshotValue(key),
            value: snapshotValue(value),
          }))),
        })));
  }

  private createFrameSnapshot(frame: RuntimeFrame): TeachingFrameSnapshot {
    const variables = frame.function ? frame.locals : this.#variables;
    return Object.freeze({
      id: frame.id,
      functionName: frame.function?.name ?? '<module>',
      kind: frame.function ? 'function' : 'module',
      pc: frame.pc,
      lastExecutedInstructionIndex: frame.lastExecutedInstructionIndex,
      returnPc: frame.returnPc,
      callSite: frame.callSite ? Object.freeze({ ...frame.callSite }) : null,
      stack: Object.freeze(frame.stack.map(snapshotValue)),
      variables: Object.freeze([...variables].map(([name, value]) => Object.freeze({
        name,
        value: snapshotValue(value),
      }))),
      unboundLocalNames: Object.freeze(frame.function
        ? frame.function.localNames.filter((name) => !frame.locals.has(name))
        : []),
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
  if (constant.type === 'none') return { type: 'none' };
  return { type: 'str', value: constant.value };
}

function snapshotValue(value: RuntimeValue): TeachingValueSnapshot {
  if (value.type === 'list' || value.type === 'dict') {
    const text = `${value.type} #${value.objectId}`;
    return Object.freeze({ type: value.type, value: text, display: text, objectId: value.objectId });
  }
  const text = (() => {
    switch (value.type) {
      case 'none': return 'None';
      case 'int': return value.value.toString(10);
      case 'bool': return value.value ? 'True' : 'False';
      case 'str': return value.value;
      case 'range': return formatRange(value);
      case 'iterator': return formatIterator(value);
      case 'function': return `<function ${value.function.name}(${value.function.parameters.join(', ')})>`;
    }
  })();
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

function formatPrintValue(value: RuntimeValue, heap: Map<number, HeapObject>): string {
  if (value.type === 'function') return `<function ${value.function.name}>`;
  if (value.type === 'none') return 'None';
  if (value.type === 'bool') return value.value ? 'True' : 'False';
  if (value.type === 'range') return formatRange(value);
  if (value.type === 'iterator') return formatIterator(value);
  if (value.type === 'list') return heap.has(value.objectId) ? `list #${value.objectId}` : '<missing list>';
  if (value.type === 'dict') return heap.has(value.objectId) ? `dict #${value.objectId}` : '<missing dict>';
  return value.value.toString();
}

function isDictionaryKey(value: RuntimeValue): value is Extract<RuntimeValue, { type: 'int' | 'bool' | 'str' | 'none' }> {
  return value.type === 'int' || value.type === 'bool' || value.type === 'str' || value.type === 'none';
}

function dictionaryKeysEqual(left: RuntimeValue, right: RuntimeValue): boolean {
  if (isNumeric(left) && isNumeric(right)) return numericValue(left) === numericValue(right);
  if (left.type !== right.type) return false;
  if (left.type === 'none' && right.type === 'none') return true;
  if (left.type === 'str' && right.type === 'str') return left.value === right.value;
  return false;
}

function isNumeric(value: RuntimeValue): value is Extract<RuntimeValue, { type: 'int' | 'bool' }> {
  return value.type === 'int' || value.type === 'bool';
}

function numericValue(value: Extract<RuntimeValue, { type: 'int' | 'bool' }>): bigint {
  return value.type === 'int' ? value.value : value.value ? 1n : 0n;
}

function normalizeListIndex(
  value: Extract<RuntimeValue, { type: 'int' | 'bool' }>,
  length: number,
  span: SourceSpan,
): number {
  const size = BigInt(length);
  const index = numericValue(value);
  const normalized = index < 0n ? index + size : index;
  if (normalized < 0n || normalized >= size) {
    throw new TeachingDiagnostic('runtime', 'index-out-of-range', 'List index is out of range.', span);
  }
  return Number(normalized);
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
