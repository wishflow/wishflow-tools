export type AstField =
  | null
  | boolean
  | number
  | string
  | AstNode
  | AstField[]
  | { kind: 'literal'; type: string; value: string; truncated?: boolean }
  | { kind: 'code-object'; id: string }
  | { kind: 'truncated' };

export interface AstNode {
  id: string;
  type: string;
  fields: Record<string, AstField>;
  location?: Record<string, number | null>;
}

export interface InstructionPosition {
  lineno: number | null;
  end_lineno: number | null;
  col_offset: number | null;
  end_col_offset: number | null;
}

export interface BytecodeInstruction {
  offset: number;
  opcode: number;
  opname: string;
  arg: number | null;
  argrepr: string;
  startsLine: number | null;
  positions: InstructionPosition | null;
}

export interface TokenPosition {
  line: number;
  column: number;
}

export interface PythonToken {
  index: number;
  type: string;
  exactType: string;
  text: string;
  textTruncated: boolean;
  start: TokenPosition;
  end: TokenPosition;
}

export interface TokenizationError {
  type: string;
  message: string;
}

export interface CodeObject {
  id: string;
  name: string;
  qualname: string;
  firstLine: number;
  varnames: string[];
  names: string[];
  constants: Array<{ type: string; value: string; codeObjectId?: string }>;
  instructions: BytecodeInstruction[];
  instructionsTruncated: boolean;
}

export interface AnalysisResult {
  pythonVersion: string;
  ast: AstNode;
  astTruncated: boolean;
  codeObjects: CodeObject[];
  codeObjectsTruncated: boolean;
  instructionCount: number;
  instructionsTruncated: boolean;
  tokens: PythonToken[];
  tokensTruncated: boolean;
  tokenizationError: TokenizationError | null;
}

export interface PythonDiagnostic {
  stage: 'parse' | 'compile' | 'runtime';
  type: string;
  message: string;
  line: number | null;
  column: number | null;
  endLine: number | null;
  endColumn: number | null;
}

export type WorkerRequest =
  | { type: 'init'; sessionId: number }
  | { type: 'analyze'; sessionId: number; requestId: number; source: string };

export type WorkerResponse =
  | { type: 'ready'; sessionId: number; pyodideVersion: string; pythonVersion: string }
  | { type: 'analysis'; sessionId: number; requestId: number; result: AnalysisResult }
  | { type: 'error'; sessionId: number; requestId: number | null; error: PythonDiagnostic };
