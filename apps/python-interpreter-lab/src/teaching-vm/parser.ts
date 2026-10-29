import { MAX_PARSE_NESTING_DEPTH } from './resource-limits';
import { tokenizeTeachingSource } from './tokenizer';
import {
  TeachingDiagnostic,
  type SourceSpan,
  type TeachingExpression,
  type TeachingProgram,
  type TeachingStatement,
  type TeachingToken,
} from './types';

class Parser {
  private current = 0;
  private nestingDepth = 0;

  constructor(private readonly tokens: TeachingToken[], private readonly sourceLength: number) {}

  parse(): TeachingProgram {
    const statements: TeachingStatement[] = [];
    while (!this.isAtEnd()) {
      if (this.match('NEWLINE')) continue;
      statements.push(this.parseStatement());
      if (this.match('NEWLINE')) continue;
      if (!this.isAtEnd()) this.fail('expected-newline', 'Expected a newline between statements.', this.peek());
    }

    const eof = this.peek();
    return {
      type: 'Program',
      statements,
      span: {
        start: 0,
        end: this.sourceLength,
        line: 1,
        column: 1,
        endLine: eof.span.line,
        endColumn: eof.span.column,
      },
    };
  }

  private parseStatement(): TeachingStatement {
    if (this.check('UNSUPPORTED_KEYWORD')) this.unsupportedKeyword(this.peek());
    if (this.match('NAME')) {
      const name = this.previous();
      this.consume('EQUAL', 'expected-assignment', "Expected '=' after a variable name.");
      const value = this.parseExpression();
      return { type: 'Assign', name: name.lexeme, value, span: mergeSpans(name.span, value.span) };
    }
    if (this.match('PRINT')) return this.parsePrintStatement(this.previous());
    this.fail('expected-statement', 'Expected a name assignment or print(...) statement.', this.peek());
  }

  private parsePrintStatement(start: TeachingToken): TeachingStatement {
    this.consume('LEFT_PAREN', 'expected-print-parenthesis', "Expected '(' after print.");
    const args: TeachingExpression[] = [];
    if (!this.check('RIGHT_PAREN')) {
      args.push(this.parseExpression());
      while (this.match('COMMA')) args.push(this.parseExpression());
    }
    const end = this.consume('RIGHT_PAREN', 'expected-closing-parenthesis', "Expected ')' after print arguments.");
    return { type: 'Print', arguments: args, span: mergeSpans(start.span, end.span) };
  }

  private parseExpression(): TeachingExpression {
    return this.parseAdditive();
  }

  private parseAdditive(): TeachingExpression {
    let expression = this.parseMultiplicative();
    while (this.match('PLUS', 'MINUS')) {
      const operator = this.previous();
      const right = this.parseMultiplicative();
      expression = {
        type: 'Binary',
        operator: operator.type === 'PLUS' ? '+' : '-',
        left: expression,
        right,
        span: mergeSpans(expression.span, right.span),
      };
    }
    return expression;
  }

  private parseMultiplicative(): TeachingExpression {
    let expression = this.parseUnary();
    while (this.match('STAR')) {
      const right = this.parseUnary();
      expression = {
        type: 'Binary',
        operator: '*',
        left: expression,
        right,
        span: mergeSpans(expression.span, right.span),
      };
    }
    return expression;
  }

  private parseUnary(): TeachingExpression {
    if (!this.match('MINUS')) return this.parsePrimary();
    const operator = this.previous();
    const operand = this.withNested(operator, () => this.parseUnary());
    return {
      type: 'Unary',
      operator: '-',
      operand,
      span: mergeSpans(operator.span, operand.span),
    };
  }

  private parsePrimary(): TeachingExpression {
    if (this.match('INTEGER')) {
      const token = this.previous();
      return { type: 'IntegerLiteral', value: token.literal ?? token.lexeme, span: token.span };
    }
    if (this.match('STRING')) {
      const token = this.previous();
      return { type: 'StringLiteral', value: token.literal ?? '', span: token.span };
    }
    if (this.match('NAME')) {
      const token = this.previous();
      return { type: 'Name', name: token.lexeme, span: token.span };
    }
    if (this.match('UNSUPPORTED_KEYWORD')) this.unsupportedKeyword(this.previous());
    if (this.match('LEFT_PAREN')) {
      const open = this.previous();
      return this.withNested(open, () => {
        const expression = this.parseExpression();
        this.consume('RIGHT_PAREN', 'expected-closing-parenthesis', "Expected ')' after expression.");
        return expression;
      });
    }
    this.fail('expected-expression', 'Expected an integer, string, name, or parenthesized expression.', this.peek());
  }

  private withNested<T>(token: TeachingToken, parseNested: () => T): T {
    this.nestingDepth += 1;
    if (this.nestingDepth > MAX_PARSE_NESTING_DEPTH) {
      this.nestingDepth -= 1;
      this.fail(
        'expression-too-deep',
        `Expression nesting exceeds ${MAX_PARSE_NESTING_DEPTH}.`,
        token,
      );
    }
    try {
      return parseNested();
    } finally {
      this.nestingDepth -= 1;
    }
  }

  private consume(type: TeachingToken['type'], code: string, message: string): TeachingToken {
    if (this.check(type)) return this.advance();
    this.fail(code, message, this.peek());
  }

  private match(...types: TeachingToken['type'][]): boolean {
    for (const type of types) {
      if (!this.check(type)) continue;
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TeachingToken['type']): boolean {
    return this.peek().type === type;
  }

  private advance(): TeachingToken {
    if (!this.isAtEnd()) this.current += 1;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): TeachingToken {
    return this.tokens[this.current] ?? this.tokens[this.tokens.length - 1];
  }

  private previous(): TeachingToken {
    return this.tokens[Math.max(0, this.current - 1)];
  }

  private unsupportedKeyword(token: TeachingToken): never {
    this.fail('unsupported-keyword', `Keyword '${token.lexeme}' is outside mini-vm-v1.`, token);
  }

  private fail(code: string, message: string, token: TeachingToken): never {
    throw new TeachingDiagnostic('parse', code, message, token.span);
  }
}

export function parseTeachingSource(source: string): TeachingProgram {
  return new Parser(tokenizeTeachingSource(source), source.length).parse();
}

function mergeSpans(start: SourceSpan, end: SourceSpan): SourceSpan {
  return {
    start: start.start,
    end: end.end,
    line: start.line,
    column: start.column,
    endLine: end.endLine,
    endColumn: end.endColumn,
  };
}
