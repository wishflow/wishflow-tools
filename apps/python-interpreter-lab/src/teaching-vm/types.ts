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
  | 'TRUE'
  | 'FALSE'
  | 'NONE'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'IF'
  | 'ELIF'
  | 'ELSE'
  | 'WHILE'
  | 'FOR'
  | 'IN'
  | 'PRINT'
  | 'UNSUPPORTED_KEYWORD'
  | 'EQUAL'
  | 'EQUAL_EQUAL'
  | 'BANG_EQUAL'
  | 'LESS'
  | 'LESS_EQUAL'
  | 'GREATER'
  | 'GREATER_EQUAL'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'LEFT_PAREN'
  | 'RIGHT_PAREN'
  | 'COMMA'
  | 'COLON'
  | 'INDENT'
  | 'DEDENT'
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

export type TeachingStatement = AssignmentStatement | PrintStatement | IfStatement | WhileStatement | ForStatement;

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

export interface IfBranch {
  condition: TeachingExpression;
  body: TeachingStatement[];
  span: SourceSpan;
}

export interface IfStatement {
  type: 'If';
  branches: IfBranch[];
  elseBody: TeachingStatement[] | null;
  span: SourceSpan;
}

export interface WhileStatement {
  type: 'While';
  condition: TeachingExpression;
  body: TeachingStatement[];
  span: SourceSpan;
}

export interface ForStatement {
  type: 'For';
  name: string;
  rangeArguments: TeachingExpression[];
  rangeSpan: SourceSpan;
  body: TeachingStatement[];
  span: SourceSpan;
}

export type TeachingExpression =
  | IntegerLiteralExpression
  | StringLiteralExpression
  | BooleanLiteralExpression
  | NoneLiteralExpression
  | NameExpression
  | UnaryExpression
  | BinaryExpression
  | ComparisonExpression
  | LogicalExpression;

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

export interface BooleanLiteralExpression {
  type: 'BooleanLiteral';
  value: boolean;
  span: SourceSpan;
}

export interface NoneLiteralExpression {
  type: 'NoneLiteral';
  span: SourceSpan;
}

export interface NameExpression {
  type: 'Name';
  name: string;
  span: SourceSpan;
}

export interface UnaryExpression {
  type: 'Unary';
  operator: '-' | 'not';
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

export interface ComparisonExpression {
  type: 'Compare';
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=';
  left: TeachingExpression;
  right: TeachingExpression;
  span: SourceSpan;
}

export interface LogicalExpression {
  type: 'Logical';
  operator: 'and' | 'or';
  left: TeachingExpression;
  right: TeachingExpression;
  span: SourceSpan;
}

export interface TeachingConstant {
  type: 'int' | 'str' | 'bool' | 'none';
  value: string;
}

export type TeachingOpcode =
  | 'LOAD_CONST'
  | 'LOAD_NAME'
  | 'STORE_NAME'
  | 'UNARY_NEGATIVE'
  | 'UNARY_NOT'
  | 'BINARY_ADD'
  | 'BINARY_SUBTRACT'
  | 'BINARY_MULTIPLY'
  | 'COMPARE_OP'
  | 'JUMP'
  | 'POP_JUMP_IF_FALSE'
  | 'BUILD_RANGE'
  | 'GET_ITER'
  | 'FOR_ITER'
  | 'JUMP_IF_FALSE_OR_POP'
  | 'JUMP_IF_TRUE_OR_POP'
  | 'PRINT'
  | 'HALT';

export interface TeachingInstruction {
  index: number;
  opcode: TeachingOpcode;
  argument: number | string | null;
  span: SourceSpan;
}

export interface TeachingCompileResult {
  version: 'mini-vm-v3';
  ast: TeachingProgram;
  constants: TeachingConstant[];
  instructions: TeachingInstruction[];
}

export type TeachingVmStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';

export interface TeachingValueSnapshot {
  type: 'int' | 'str' | 'bool' | 'none' | 'range' | 'iterator';
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
  executedInstructionCount: number;
  pc: number;
  status: TeachingVmStatus;
  lastExecutedInstructionIndex: number | null;
  nextInstructionIndex: number | null;
  faultInstructionIndex: number | null;
  controlFlow: TeachingControlFlowSnapshot | null;
  stack: readonly TeachingValueSnapshot[];
  variables: readonly TeachingVariableSnapshot[];
  output: readonly string[];
  diagnostic: TeachingDiagnosticSnapshot | null;
}

export interface TeachingControlFlowSnapshot {
  kind: 'shortCircuit' | 'branch' | 'iteration';
  outcome: string;
  nextInstructionIndex: number | null;
}

export interface TeachingVmHistory {
  items: readonly TeachingVmSnapshot[];
  truncated: boolean;
}
