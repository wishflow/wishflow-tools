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
  type TeachingInstruction,
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
    for (const statement of this.ast.statements) this.compileStatement(statement);
    this.emit('HALT', null, this.ast.span);
    return {
      version: 'mini-vm-v1',
      ast: this.ast,
      constants: this.constants,
      instructions: this.instructions,
    };
  }

  private compileStatement(statement: TeachingStatement): void {
    if (statement.type === 'Assign') {
      this.compileExpression(statement.value);
      this.emit('STORE_NAME', statement.name, statement.span);
      return;
    }

    for (const argument of statement.arguments) this.compileExpression(argument);
    this.emit('PRINT', statement.arguments.length, statement.span);
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
      case 'Name':
        this.emit('LOAD_NAME', expression.name, expression.span);
        return;
      case 'Unary':
        this.compileExpression(expression.operand);
        this.emit('UNARY_NEGATIVE', null, expression.span);
        return;
      case 'Binary':
        this.compileExpression(expression.left);
        this.compileExpression(expression.right);
        this.emit(binaryOpcode(expression.operator), null, expression.span);
        return;
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

  private emit(opcode: TeachingOpcode, argument: number | string | null, span: SourceSpan): void {
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
      span,
    });
  }
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
