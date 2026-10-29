import { MAX_SOURCE_LENGTH } from '../analysis/source-limit';
import { MAX_STRING_CODE_POINTS, MAX_TOKEN_COUNT } from './resource-limits';
import { TeachingDiagnostic, type SourceSpan, type TeachingToken, type TokenType } from './types';

const unsupportedKeywords = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import',
  'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while',
  'with', 'yield',
]);

interface Cursor {
  offset: number;
  line: number;
  column: number;
}

class Tokenizer {
  private offset = 0;
  private line = 1;
  private column = 1;
  private readonly tokens: TeachingToken[] = [];

  constructor(private readonly source: string) {}

  scan(): TeachingToken[] {
    if (this.source.length > MAX_SOURCE_LENGTH) {
      throw this.error('source-too-long', 'Source exceeds the supported length.', this.startSpan(0, this.source.length));
    }

    while (!this.isAtEnd()) {
      const character = this.peek();
      if (character === ' ' || character === '\t') {
        this.advance();
      } else if (character === '\r' || character === '\n') {
        this.scanNewline();
      } else if (character === '#') {
        this.skipComment();
      } else if (isAsciiDigit(character)) {
        this.scanInteger();
      } else if (isAsciiIdentifierStart(character)) {
        this.scanIdentifier();
      } else if (character === '"' || character === "'") {
        this.scanString(character);
      } else {
        this.scanPunctuation(character);
      }
    }

    const cursor = this.cursor();
    this.tokens.push({ type: 'EOF', lexeme: '', literal: null, span: spanFrom(cursor, cursor) });
    return this.tokens;
  }

  private scanNewline(): void {
    const start = this.cursor();
    if (this.peek() === '\r' && this.source[this.offset + 1] === '\n') {
      this.offset += 2;
    } else {
      this.offset += 1;
    }
    this.line += 1;
    this.column = 1;
    this.addToken('NEWLINE', start, null);
  }

  private skipComment(): void {
    while (!this.isAtEnd() && this.peek() !== '\r' && this.peek() !== '\n') this.advance();
  }

  private scanInteger(): void {
    const start = this.cursor();
    while (isAsciiDigit(this.peek())) this.advance();
    const lexeme = this.source.slice(start.offset, this.offset);
    if (lexeme.length > 1 && lexeme.startsWith('0')) {
      throw this.error('leading-zero-integer', 'Decimal integers cannot start with zero unless the value is zero.', spanFrom(start, this.cursor()));
    }
    this.addToken('INTEGER', start, lexeme);
  }

  private scanIdentifier(): void {
    const start = this.cursor();
    this.advance();
    while (isAsciiIdentifierPart(this.peek())) this.advance();
    const lexeme = this.source.slice(start.offset, this.offset);
    const type: TokenType = lexeme === 'print'
      ? 'PRINT'
      : unsupportedKeywords.has(lexeme)
        ? 'UNSUPPORTED_KEYWORD'
        : 'NAME';
    this.addToken(type, start, null);
  }

  private scanString(quote: string): void {
    const start = this.cursor();
    this.advance();
    let value = '';
    let codePointCount = 0;

    while (!this.isAtEnd()) {
      const character = this.peek();
      if (character === quote) {
        this.advance();
        const lexeme = this.source.slice(start.offset, this.offset);
        this.addToken('STRING', start, value, lexeme);
        return;
      }
      if (character === '\r' || character === '\n') {
        throw this.error('unterminated-string', 'String literal must end on the same line.', this.spanFrom(start));
      }

      if (character === '\\') {
        const escapeStart = this.cursor();
        this.advance();
        if (this.isAtEnd() || this.peek() === '\r' || this.peek() === '\n') {
          throw this.error('invalid-escape', 'String escape is incomplete.', this.spanFrom(escapeStart));
        }
        const escaped = this.advance();
        const decoded = decodeEscape(escaped);
        if (decoded === null) {
          throw this.error('invalid-escape', `Unsupported string escape \\${escaped}.`, this.spanFrom(escapeStart));
        }
        value += decoded;
        codePointCount += [...decoded].length;
      } else {
        value += this.advance();
        codePointCount += 1;
      }

      if (codePointCount > MAX_STRING_CODE_POINTS) {
        throw this.error('string-too-long', 'String literal exceeds the supported length.', this.spanFrom(start));
      }
    }

    throw this.error('unterminated-string', 'String literal is not closed.', this.spanFrom(start));
  }

  private scanPunctuation(character: string): void {
    const start = this.cursor();
    const typeByCharacter: Record<string, TokenType> = {
      '=': 'EQUAL',
      '+': 'PLUS',
      '-': 'MINUS',
      '*': 'STAR',
      '(': 'LEFT_PAREN',
      ')': 'RIGHT_PAREN',
      ',': 'COMMA',
    };
    const type = typeByCharacter[character];
    if (!type) {
      const codePoint = this.source.codePointAt(this.offset) ?? 0;
      const width = codePoint > 0xffff ? 2 : 1;
      const span = this.startSpan(this.offset, this.offset + width);
      throw this.error('unexpected-character', `Unsupported character ${JSON.stringify(String.fromCodePoint(codePoint))}.`, span);
    }
    this.advance();
    this.addToken(type, start, null);
  }

  private addToken(type: TokenType, start: Cursor, literal: string | null, lexeme?: string): void {
    const span = spanFrom(start, this.cursor());
    if (this.tokens.length >= MAX_TOKEN_COUNT) {
      throw this.error('too-many-tokens', `Program exceeds ${MAX_TOKEN_COUNT} tokens.`, span);
    }
    this.tokens.push({
      type,
      lexeme: lexeme ?? this.source.slice(start.offset, this.offset),
      literal,
      span,
    });
  }

  private advance(): string {
    const character = this.peek();
    this.offset += character.length;
    this.column += character.length;
    return character;
  }

  private peek(): string {
    if (this.isAtEnd()) return '';
    const codePoint = this.source.codePointAt(this.offset);
    return codePoint === undefined ? '' : String.fromCodePoint(codePoint);
  }

  private cursor(): Cursor {
    return { offset: this.offset, line: this.line, column: this.column };
  }

  private spanFrom(start: Cursor): SourceSpan {
    return spanFrom(start, this.cursor());
  }

  private startSpan(start: number, end: number): SourceSpan {
    const startCursor = cursorAt(this.source, start);
    const endCursor = cursorAt(this.source, end);
    return spanFrom(startCursor, endCursor);
  }

  private error(code: string, message: string, span: SourceSpan): TeachingDiagnostic {
    return new TeachingDiagnostic('lex', code, message, span);
  }

  private isAtEnd(): boolean {
    return this.offset >= this.source.length;
  }
}

export function tokenizeTeachingSource(source: string): TeachingToken[] {
  return new Tokenizer(source).scan();
}

function isAsciiDigit(character: string): boolean {
  return character >= '0' && character <= '9';
}

function isAsciiIdentifierStart(character: string): boolean {
  return (character >= 'a' && character <= 'z')
    || (character >= 'A' && character <= 'Z')
    || character === '_';
}

function isAsciiIdentifierPart(character: string): boolean {
  return isAsciiIdentifierStart(character) || isAsciiDigit(character);
}

function decodeEscape(character: string): string | null {
  switch (character) {
    case '\\': return '\\';
    case 'n': return '\n';
    case 't': return '\t';
    case "'": return "'";
    case '"': return '"';
    default: return null;
  }
}

function spanFrom(start: Cursor, end: Cursor): SourceSpan {
  return {
    start: start.offset,
    end: end.offset,
    line: start.line,
    column: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
}

function cursorAt(source: string, offset: number): Cursor {
  let line = 1;
  let column = 1;
  for (let index = 0; index < offset;) {
    const character = source[index];
    if (character === '\r' && source[index + 1] === '\n') {
      index += 2;
      line += 1;
      column = 1;
    } else if (character === '\r' || character === '\n') {
      index += 1;
      line += 1;
      column = 1;
    } else {
      const codePoint = source.codePointAt(index) ?? 0;
      const value = String.fromCodePoint(codePoint);
      index += value.length;
      column += value.length;
    }
  }
  return { offset, line, column };
}
