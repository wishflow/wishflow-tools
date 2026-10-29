import {
  MAX_INSTRUCTION_COUNT,
  MAX_INTEGER_BITS,
} from './resource-limits';
import { parseTeachingSource } from './parser';
import {
  TeachingDiagnostic,
  type TeachingCompileResult,
  type TeachingConstant,
  type TeachingExpression,
  type FunctionDefinitionStatement,
  type TeachingInstruction,
  type TeachingFunction,
  type TeachingProgram,
  type TeachingStatement,
  type TeachingOpcode,
  type SourceSpan,
} from './types';

class Compiler {
  private readonly constants: TeachingConstant[] = [];
  private readonly constantIndexes = new Map<string, number>();
  private readonly instructions: TeachingInstruction[] = [];

  constructor(private readonly ast: TeachingProgram) {}

  compile(): TeachingCompileResult {
    const definitions: Array<{ id: number; statement: FunctionDefinitionStatement }> = [];
    for (const statement of this.ast.statements) {
      if (statement.type === 'FunctionDef') {
        const id = definitions.length;
        definitions.push({ id, statement });
        this.emit('DEFINE_FUNCTION', id, statement.span);
      } else {
        this.compileStatement(statement);
      }
    }
    this.emit('HALT', null, this.ast.span);
    const functions: TeachingFunction[] = definitions.map(({ id, statement }) => {
      validateFunctionParameters(statement);
      const localNames = [...new Set([...statement.parameters, ...collectLocalNames(statement.body)])];
      const entryIndex = this.instructions.length;
      for (const child of statement.body) this.compileStatement(child);
      this.emit('RETURN_NONE', null, statement.span);
      return {
        id,
        name: statement.name,
        parameters: statement.parameters,
        localNames,
        entryIndex,
        endIndex: this.instructions.length,
        span: statement.span,
      };
    });
    return {
      version: 'mini-vm-v4',
      ast: this.ast,
      constants: this.constants,
      instructions: this.instructions,
      functions,
    };
  }

  private compileStatement(statement: TeachingStatement): void {
    switch (statement.type) {
      case 'Assign':
        this.compileExpression(statement.value);
        this.emit('STORE_NAME', statement.name, statement.span);
        return;
      case 'SubscriptAssign':
        this.compileExpression(statement.value);
        this.compileExpression(statement.target.value);
        this.compileExpression(statement.target.index);
        this.emit('STORE_SUBSCR', null, statement.span);
        return;
      case 'Print':
        for (const argument of statement.arguments) this.compileExpression(argument);
        this.emit('PRINT', statement.arguments.length, statement.span);
        return;
      case 'If':
        this.compileIf(statement);
        return;
      case 'While':
        this.compileWhile(statement);
        return;
      case 'For':
        this.compileFor(statement);
        return;
      case 'Return':
        if (statement.value) {
          this.compileExpression(statement.value);
          this.emit('RETURN_VALUE', null, statement.span);
        } else {
          this.emit('RETURN_NONE', null, statement.span);
        }
        return;
      case 'FunctionDef':
        throw new TeachingDiagnostic('compile', 'nested-function-definition', 'Function definitions must be at module level.', statement.span);
    }
  }

  private compileIf(statement: Extract<TeachingStatement, { type: 'If' }>): void {
    const endJumps: number[] = [];
    for (const branch of statement.branches) {
      this.compileExpression(branch.condition);
      const skipBranch = this.emit('POP_JUMP_IF_FALSE', -1, branch.condition.span);
      for (const child of branch.body) this.compileStatement(child);
      if (branch !== statement.branches.at(-1) || statement.elseBody) {
        endJumps.push(this.emit('JUMP', -1, branch.span));
      }
      this.patchArgument(skipBranch, this.instructions.length);
    }
    if (statement.elseBody) {
      for (const child of statement.elseBody) this.compileStatement(child);
    }
    for (const jump of endJumps) this.patchArgument(jump, this.instructions.length);
  }

  private compileWhile(statement: Extract<TeachingStatement, { type: 'While' }>): void {
    const conditionStart = this.instructions.length;
    this.compileExpression(statement.condition);
    const exit = this.emit('POP_JUMP_IF_FALSE', -1, statement.condition.span);
    for (const child of statement.body) this.compileStatement(child);
    this.emit('JUMP', conditionStart, statement.span);
    this.patchArgument(exit, this.instructions.length);
  }

  private compileFor(statement: Extract<TeachingStatement, { type: 'For' }>): void {
    for (const argument of statement.rangeArguments) this.compileExpression(argument);
    this.emit('BUILD_RANGE', statement.rangeArguments.length, statement.rangeSpan);
    this.emit('GET_ITER', null, statement.rangeSpan);
    const loopStart = this.instructions.length;
    const end = this.emit('FOR_ITER', -1, statement.span);
    this.emit('STORE_NAME', statement.name, statement.span);
    for (const child of statement.body) this.compileStatement(child);
    this.emit('JUMP', loopStart, statement.span);
    this.patchArgument(end, this.instructions.length);
  }

  private compileExpression(expression: TeachingExpression): void {
    switch (expression.type) {
      case 'IntegerLiteral': {
        assertIntegerWithinLimit(expression.value, expression.span);
        this.emit('LOAD_CONST', this.addConstant({ type: 'int', value: expression.value }), expression.span);
        return;
      }
      case 'StringLiteral':
        this.emit('LOAD_CONST', this.addConstant({ type: 'str', value: expression.value }), expression.span);
        return;
      case 'BooleanLiteral':
        this.emit('LOAD_CONST', this.addConstant({ type: 'bool', value: expression.value ? 'True' : 'False' }), expression.span);
        return;
      case 'NoneLiteral':
        this.emit('LOAD_CONST', this.addConstant({ type: 'none', value: 'None' }), expression.span);
        return;
      case 'Name':
        this.emit('LOAD_NAME', expression.name, expression.span);
        return;
      case 'Call':
        for (const argument of expression.arguments) this.compileExpression(argument);
        this.emit('CALL_FUNCTION', expression.name, expression.span, expression.arguments.length);
        return;
      case 'ListLiteral':
        for (const element of expression.elements) this.compileExpression(element);
        this.emit('BUILD_LIST', expression.elements.length, expression.span);
        return;
      case 'Subscript':
        this.compileExpression(expression.value);
        this.compileExpression(expression.index);
        this.emit('BINARY_SUBSCR', null, expression.span);
        return;
      case 'Unary':
        this.compileExpression(expression.operand);
        this.emit(expression.operator === '-' ? 'UNARY_NEGATIVE' : 'UNARY_NOT', null, expression.span);
        return;
      case 'Binary':
        this.compileExpression(expression.left);
        this.compileExpression(expression.right);
        this.emit(binaryOpcode(expression.operator), null, expression.span);
        return;
      case 'Compare':
        this.compileExpression(expression.left);
        this.compileExpression(expression.right);
        this.emit('COMPARE_OP', expression.operator, expression.span);
        return;
      case 'Logical': {
        this.compileExpression(expression.left);
        const jump = this.emit(
          expression.operator === 'and' ? 'JUMP_IF_FALSE_OR_POP' : 'JUMP_IF_TRUE_OR_POP',
          -1,
          expression.left.span,
        );
        this.compileExpression(expression.right);
        this.patchArgument(jump, this.instructions.length);
        return;
      }
    }
  }

  private addConstant(constant: TeachingConstant): number {
    const key = `${constant.type}:${constant.value}`;
    const existingIndex = this.constantIndexes.get(key);
    if (existingIndex !== undefined) return existingIndex;

    const index = this.constants.length;
    this.constants.push(constant);
    this.constantIndexes.set(key, index);
    return index;
  }

  private emit(
    opcode: TeachingOpcode,
    argument: number | string | null,
    span: SourceSpan,
    argumentCount?: number,
  ): number {
    if (this.instructions.length >= MAX_INSTRUCTION_COUNT) {
      throw new TeachingDiagnostic(
        'compile',
        'too-many-instructions',
        `Program exceeds ${MAX_INSTRUCTION_COUNT} instructions.`,
        span,
      );
    }
    this.instructions.push({
      index: this.instructions.length,
      opcode,
      argument,
      ...(argumentCount === undefined ? {} : { argumentCount }),
      span,
    });
    return this.instructions.length - 1;
  }

  private patchArgument(instructionIndex: number, target: number): void {
    const instruction = this.instructions[instructionIndex];
    if (!instruction) throw new Error('Cannot patch a missing teaching instruction.');
    this.instructions[instructionIndex] = { ...instruction, argument: target };
  }
}

function validateFunctionParameters(statement: FunctionDefinitionStatement): void {
  const seen = new Set<string>();
  statement.parameters.forEach((name, index) => {
    if (seen.has(name)) {
      throw new TeachingDiagnostic(
        'compile',
        'duplicate-parameter',
        `Duplicate parameter name '${name}'.`,
        statement.parameterSpans[index] ?? statement.span,
      );
    }
    seen.add(name);
  });
}

function collectLocalNames(statements: TeachingStatement[]): string[] {
  const names = new Set<string>();
  const visit = (statement: TeachingStatement): void => {
    switch (statement.type) {
      case 'Assign':
        names.add(statement.name);
        return;
      case 'SubscriptAssign':
        return;
      case 'For':
        names.add(statement.name);
        statement.body.forEach(visit);
        return;
      case 'If':
        statement.branches.forEach(({ body }) => body.forEach(visit));
        statement.elseBody?.forEach(visit);
        return;
      case 'While':
        statement.body.forEach(visit);
        return;
      case 'FunctionDef':
      case 'Return':
      case 'Print':
        return;
    }
  };
  statements.forEach(visit);
  return [...names];
}

export function compileTeachingSource(source: string): TeachingCompileResult {
  return new Compiler(parseTeachingSource(source)).compile();
}

function assertIntegerWithinLimit(decimal: string, span: SourceSpan): void {
  // A 1235-digit decimal is necessarily larger than 4096 bits. Check before
  // constructing a BigInt so a long source literal cannot amplify work here.
  if (decimal.length > 1_234) throw integerTooLarge(span);

  const value = BigInt(decimal);
  const bitLength = value === 0n ? 0 : value.toString(2).length;
  if (bitLength > MAX_INTEGER_BITS) throw integerTooLarge(span);
}

function integerTooLarge(span: SourceSpan): TeachingDiagnostic {
  return new TeachingDiagnostic(
    'compile',
    'integer-too-large',
    `Integer literal exceeds ${MAX_INTEGER_BITS} bits.`,
    span,
  );
}

function binaryOpcode(operator: '+' | '-' | '*'): TeachingOpcode {
  switch (operator) {
    case '+': return 'BINARY_ADD';
    case '-': return 'BINARY_SUBTRACT';
    case '*': return 'BINARY_MULTIPLY';
  }
}
