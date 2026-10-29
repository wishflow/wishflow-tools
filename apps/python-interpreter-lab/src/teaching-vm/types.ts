export type DiagnosticStage = 'lex' | 'parse' | 'compile' | 'runtime';

export interface SourceSpan {
  /** Half-open UTF-16 code-unit offsets into the source text. */
  start: number;
  end: number;
  /** One-based line and UTF-16 column. */
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export class TeachingDiagnostic extends Error {
  readonly name = 'TeachingDiagnostic';

  constructor(
    readonly stage: DiagnosticStage,
    readonly code: string,
    message: string,
    readonly span: SourceSpan,
  ) {
    super(message);
  }
}

export type TokenType =
  | 'NAME'
  | 'INTEGER'
  | 'STRING'
  | 'PRINT'
  | 'UNSUPPORTED_KEYWORD'
  | 'EQUAL'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'LEFT_PAREN'
  | 'RIGHT_PAREN'
  | 'COMMA'
  | 'NEWLINE'
  | 'EOF';

export interface TeachingToken {
  type: TokenType;
  lexeme: string;
  /** Decoded string or decimal integer text; structural tokens use null. */
  literal: string | null;
  span: SourceSpan;
}

export interface TeachingProgram {
  type: 'Program';
  statements: TeachingStatement[];
  span: SourceSpan;
}

export type TeachingStatement = AssignmentStatement | PrintStatement;

export interface AssignmentStatement {
  type: 'Assign';
  name: string;
  value: TeachingExpression;
  span: SourceSpan;
}

export interface PrintStatement {
  type: 'Print';
  arguments: TeachingExpression[];
  span: SourceSpan;
}

export type TeachingExpression =
  | IntegerLiteralExpression
  | StringLiteralExpression
  | NameExpression
  | UnaryExpression
  | BinaryExpression;

export interface IntegerLiteralExpression {
  type: 'IntegerLiteral';
  /** Decimal digits are retained as text until compilation. */
  value: string;
  span: SourceSpan;
}

export interface StringLiteralExpression {
  type: 'StringLiteral';
  value: string;
  span: SourceSpan;
}

export interface NameExpression {
  type: 'Name';
  name: string;
  span: SourceSpan;
}

export interface UnaryExpression {
  type: 'Unary';
  operator: '-';
  operand: TeachingExpression;
  span: SourceSpan;
}

export interface BinaryExpression {
  type: 'Binary';
  operator: '+' | '-' | '*';
  left: TeachingExpression;
  right: TeachingExpression;
  span: SourceSpan;
}

export interface TeachingConstant {
  type: 'int' | 'str';
  value: string;
}

export type TeachingOpcode =
  | 'LOAD_CONST'
  | 'LOAD_NAME'
  | 'STORE_NAME'
  | 'UNARY_NEGATIVE'
  | 'BINARY_ADD'
  | 'BINARY_SUBTRACT'
  | 'BINARY_MULTIPLY'
  | 'PRINT'
  | 'HALT';

export interface TeachingInstruction {
  index: number;
  opcode: TeachingOpcode;
  argument: number | string | null;
  span: SourceSpan;
}

export interface TeachingCompileResult {
  version: 'mini-vm-v1';
  ast: TeachingProgram;
  constants: TeachingConstant[];
  instructions: TeachingInstruction[];
}

export type TeachingVmStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';

export interface TeachingValueSnapshot {
  type: 'int' | 'str';
  value: string;
  display: string;
}

export interface TeachingVariableSnapshot {
  name: string;
  value: TeachingValueSnapshot;
}

export interface TeachingDiagnosticSnapshot {
  stage: DiagnosticStage;
  code: string;
  message: string;
  span: SourceSpan;
}

export interface TeachingVmSnapshot {
  stepIndex: number;
  pc: number;
  status: TeachingVmStatus;
  lastExecutedInstructionIndex: number | null;
  nextInstructionIndex: number | null;
  faultInstructionIndex: number | null;
  stack: readonly TeachingValueSnapshot[];
  variables: readonly TeachingVariableSnapshot[];
  output: readonly string[];
  diagnostic: TeachingDiagnosticSnapshot | null;
}

export interface TeachingVmHistory {
  items: readonly TeachingVmSnapshot[];
  truncated: boolean;
}
