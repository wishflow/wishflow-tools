import type { AstNode, BytecodeInstruction, InstructionPosition } from './types';

export interface SourceRange {
  start: number;
  end: number;
}

export type SourceLinkOrigin =
  | { kind: 'editor' }
  | { kind: 'token'; id: number }
  | { kind: 'ast'; id: string }
  | { kind: 'instruction'; codeObjectId: string; offset: number }
  | { kind: 'trace'; index: number };

export interface SourceLink {
  origin: SourceLinkOrigin;
  range: SourceRange | null;
}

export interface SourcePosition {
  line: number;
  column: number;
}

export interface SourceToken {
  index: number;
  start: SourcePosition;
  end: SourcePosition;
}

type ColumnUnit = 'code-point' | 'utf8-byte';

function utf8Length(character: string): number {
  const codePoint = character.codePointAt(0) ?? 0;
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  return codePoint <= 0xffff ? 3 : 4;
}

interface SourceLine {
  start: number;
  codePointOffsets: Map<number, number>;
  utf8ByteOffsets: Map<number, number>;
}

export interface SourcePositionIndex {
  lines: SourceLine[];
}

function makeLine(text: string, start: number): SourceLine {
  const codePointOffsets = new Map<number, number>([[0, 0]]);
  const utf8ByteOffsets = new Map<number, number>([[0, 0]]);
  let codePointColumn = 0;
  let utf8ByteColumn = 0;
  let utf16Offset = 0;

  for (const character of text) {
    codePointColumn += 1;
    utf8ByteColumn += utf8Length(character);
    utf16Offset += character.length;
    codePointOffsets.set(codePointColumn, utf16Offset);
    utf8ByteOffsets.set(utf8ByteColumn, utf16Offset);
  }

  return { start, codePointOffsets, utf8ByteOffsets };
}

export function createSourcePositionIndex(source: string): SourcePositionIndex {
  const lines: SourceLine[] = [];
  let lineStart = 0;

  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) {
      lines.push(makeLine(source.slice(lineStart, i + 1), lineStart));
      lineStart = i + 1;
    }
  }
  lines.push(makeLine(source.slice(lineStart), lineStart));

  return { lines };
}

export function sourcePositionOffset(
  index: SourcePositionIndex,
  position: SourcePosition,
  unit: ColumnUnit,
): number | null {
  if (!Number.isInteger(position.line) || position.line < 1 || !Number.isInteger(position.column) || position.column < 0) {
    return null;
  }

  const line = index.lines[position.line - 1];
  if (!line) return null;
  const offsets = unit === 'code-point' ? line.codePointOffsets : line.utf8ByteOffsets;
  const localOffset = offsets.get(position.column);
  return localOffset === undefined ? null : line.start + localOffset;
}

export function sourceLineRange(index: SourcePositionIndex, lineNumber: number): SourceRange | null {
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return null;
  const line = index.lines[lineNumber - 1];
  if (!line) return null;
  const endOffset = Math.max(...line.codePointOffsets.values());
  if (endOffset === 0) return null;
  return { start: line.start, end: line.start + endOffset };
}

export function sourcePositionRange(
  index: SourcePositionIndex,
  start: SourcePosition,
  end: SourcePosition,
  unit: ColumnUnit,
): SourceRange | null {
  const startOffset = sourcePositionOffset(index, start, unit);
  const endOffset = sourcePositionOffset(index, end, unit);
  if (startOffset === null || endOffset === null || endOffset <= startOffset) return null;
  return { start: startOffset, end: endOffset };
}

export function tokenSourceRange(token: SourceToken, index: SourcePositionIndex): SourceRange | null {
  return sourcePositionRange(index, token.start, token.end, 'code-point');
}

export function astNodeSourceRange(node: AstNode, index: SourcePositionIndex): SourceRange | null {
  const location = node.location;
  if (!location) return null;
  const { lineno, col_offset: colOffset, end_lineno: endLineno, end_col_offset: endColOffset } = location;
  if (lineno == null || colOffset == null || endLineno == null || endColOffset == null) return null;
  return sourcePositionRange(
    index,
    { line: lineno, column: colOffset },
    { line: endLineno, column: endColOffset },
    'utf8-byte',
  );
}

export function instructionSourceRange(
  instruction: Pick<BytecodeInstruction, 'positions'>,
  index: SourcePositionIndex,
): SourceRange | null {
  return instructionPositionsRange(instruction.positions, index);
}

export function instructionPositionsRange(
  positions: InstructionPosition | null,
  index: SourcePositionIndex,
): SourceRange | null {
  if (!positions) return null;
  const { lineno, end_lineno: endLineno, col_offset: colOffset, end_col_offset: endColOffset } = positions;
  if (lineno == null || endLineno == null || colOffset == null || endColOffset == null) return null;
  return sourcePositionRange(
    index,
    { line: lineno, column: colOffset },
    { line: endLineno, column: endColOffset },
    'utf8-byte',
  );
}

export function rangesOverlap(left: SourceRange, right: SourceRange): boolean {
  return left.start < right.end && right.start < left.end;
}

export function rangesEqual(left: SourceRange | null, right: SourceRange | null): boolean {
  return left === right || Boolean(left && right && left.start === right.start && left.end === right.end);
}

export function findTokenAtOffset<T extends SourceToken>(
  tokens: T[],
  index: SourcePositionIndex,
  offset: number,
): T | null {
  if (!Number.isInteger(offset) || offset < 0) return null;
  return tokens.find((token) => {
    const range = tokenSourceRange(token, index);
    return range !== null && range.start <= offset && offset < range.end;
  }) ?? null;
}
