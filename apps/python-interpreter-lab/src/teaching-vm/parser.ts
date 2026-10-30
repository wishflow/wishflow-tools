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
  private expressionNestingDepth = 0;
  private blockNestingDepth = 0;
  private functionNestingDepth = 0;

  constructor(private readonly tokens: TeachingToken[], private readonly sourceLength: number) {}

  parse(): TeachingProgram {
    const statements: TeachingStatement[] = [];
    while (!this.isAtEnd()) {
      if (this.match('NEWLINE')) continue;
      const statement = this.parseStatement();
      statements.push(statement);
      if (this.match('NEWLINE')) continue;
      if (isCompoundStatement(statement)) continue;
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
    if (this.match('DEF')) return this.parseFunctionDefinition(this.previous());
    if (this.match('RETURN')) return this.parseReturnStatement(this.previous());
    if (this.match('IF')) return this.parseIfStatement(this.previous());
    if (this.match('WHILE')) {
      const start = this.previous();
      const condition = this.parseExpression();
      this.consume('COLON', 'expected-colon', "Expected ':' after the while condition.");
      this.consume('NEWLINE', 'expected-newline', 'Expected a newline after the while header.');
      const body = this.parseSuite(start);
      return {
        type: 'While',
        condition,
        body,
        span: mergeSpans(start.span, body.at(-1)?.span ?? condition.span),
      };
    }
    if (this.match('FOR')) return this.parseForStatement(this.previous());
    if (isExpressionStart(this.peek().type)) return this.parseAssignmentStatement();
    if (this.match('PRINT')) return this.parsePrintStatement(this.previous());
    this.fail('expected-statement', 'Expected a name assignment or print(...) statement.', this.peek());
  }

  private parseFunctionDefinition(start: TeachingToken): TeachingStatement {
    if (this.blockNestingDepth > 0) {
      this.fail('nested-function-definition', 'Function definitions must be at module level.', start);
    }
    const name = this.consume('NAME', 'expected-function-name', 'Expected a function name after def.');
    this.consume('LEFT_PAREN', 'expected-function-parenthesis', "Expected '(' after the function name.");
    const parameters: string[] = [];
    const parameterSpans: SourceSpan[] = [];
    if (!this.check('RIGHT_PAREN')) {
      while (true) {
        const parameter = this.consume('NAME', 'expected-parameter-name', 'Expected a parameter name.');
        parameters.push(parameter.lexeme);
        parameterSpans.push(parameter.span);
        if (!this.match('COMMA')) break;
        if (this.check('RIGHT_PAREN')) {
          this.fail('trailing-parameter-comma', 'Trailing commas are not supported in function parameters.', this.peek());
        }
      }
    }
    this.consume('RIGHT_PAREN', 'expected-function-parenthesis', "Expected ')' after function parameters.");
    this.consume('COLON', 'expected-colon', "Expected ':' after the function signature.");
    this.consume('NEWLINE', 'expected-newline', 'Expected a newline after the function header.');
    this.functionNestingDepth += 1;
    let body: TeachingStatement[];
    try {
      body = this.parseSuite(start);
    } finally {
      this.functionNestingDepth -= 1;
    }
    return {
      type: 'FunctionDef',
      name: name.lexeme,
      parameters,
      parameterSpans,
      body,
      span: mergeSpans(start.span, body.at(-1)?.span ?? name.span),
    };
  }

  private parseReturnStatement(start: TeachingToken): TeachingStatement {
    if (this.functionNestingDepth === 0) {
      this.fail('return-outside-function', "'return' is only valid inside a function.", start);
    }
    const value = this.check('NEWLINE') || this.check('DEDENT') ? null : this.parseExpression();
    return {
      type: 'Return',
      value,
      span: value ? mergeSpans(start.span, value.span) : start.span,
    };
  }

  private parseIfStatement(start: TeachingToken): TeachingStatement {
    const branches: Array<{ condition: TeachingExpression; body: TeachingStatement[]; span: SourceSpan }> = [];
    branches.push(this.parseIfBranch(start));
    while (true) {
      while (this.match('NEWLINE')) { /* blank and comment-only lines do not break an if chain */ }
      if (!this.match('ELIF')) break;
      branches.push(this.parseIfBranch(this.previous()));
    }

    let elseBody: TeachingStatement[] | null = null;
    let endSpan = branches.at(-1)?.span ?? start.span;
    while (this.match('NEWLINE')) { /* blank and comment-only lines may precede else */ }
    if (this.match('ELSE')) {
      const otherwise = this.previous();
      this.consume('COLON', 'expected-colon', "Expected ':' after else.");
      this.consume('NEWLINE', 'expected-newline', 'Expected a newline after else.');
      elseBody = this.parseSuite(otherwise);
      endSpan = elseBody.at(-1)?.span ?? otherwise.span;
    }

    return { type: 'If', branches, elseBody, span: mergeSpans(start.span, endSpan) };
  }

  private parseForStatement(start: TeachingToken): TeachingStatement {
    const name = this.consume('NAME', 'expected-loop-name', 'Expected a loop variable after for.');
    this.consume('IN', 'expected-in', "Expected 'in' after the loop variable.");
    const rangeName = this.consume('NAME', 'expected-range', "Expected range(...) after 'in'.");
    if (rangeName.lexeme !== 'range') {
      this.fail('unsupported-iterator', "Only range(...) is supported in a for loop.", rangeName);
    }
    this.consume('LEFT_PAREN', 'expected-range-parenthesis', "Expected '(' after range.");
    const rangeArguments: TeachingExpression[] = [];
    if (this.check('RIGHT_PAREN')) {
      this.fail('expected-range-argument', 'range requires one to three arguments.', this.peek());
    }
    rangeArguments.push(this.parseExpression());
    while (this.match('COMMA')) {
      if (rangeArguments.length >= 3) {
        this.fail('too-many-range-arguments', 'range accepts at most three arguments.', this.previous());
      }
      rangeArguments.push(this.parseExpression());
    }
    const endRange = this.consume('RIGHT_PAREN', 'expected-range-close', "Expected ')' after range arguments.");
    this.consume('COLON', 'expected-colon', "Expected ':' after the for header.");
    this.consume('NEWLINE', 'expected-newline', 'Expected a newline after the for header.');
    const body = this.parseSuite(start);
    return {
      type: 'For',
      name: name.lexeme,
      rangeArguments,
      rangeSpan: mergeSpans(rangeName.span, endRange.span),
      body,
      span: mergeSpans(start.span, body.at(-1)?.span ?? endRange.span),
    };
  }

  private parseIfBranch(start: TeachingToken): { condition: TeachingExpression; body: TeachingStatement[]; span: SourceSpan } {
    const condition = this.parseExpression();
    this.consume('COLON', 'expected-colon', "Expected ':' after the if condition.");
    this.consume('NEWLINE', 'expected-newline', 'Expected a newline after the if header.');
    const body = this.parseSuite(start);
    return {
      condition,
      body,
      span: mergeSpans(start.span, body.at(-1)?.span ?? condition.span),
    };
  }

  private parseSuite(start: TeachingToken): TeachingStatement[] {
    while (this.match('NEWLINE')) { /* blank and comment-only lines do not start the suite */ }
    this.consume('INDENT', 'expected-indented-block', 'Expected an indented block.');
    return this.withBlockNesting(start, () => {
      const statements: TeachingStatement[] = [];
      while (!this.check('DEDENT') && !this.isAtEnd()) {
        if (this.match('NEWLINE')) continue;
        const statement = this.parseStatement();
        statements.push(statement);
        if (this.match('NEWLINE')) continue;
        if (isCompoundStatement(statement)) continue;
        if (!this.check('DEDENT') && !this.isAtEnd()) {
          this.fail('expected-newline', 'Expected a newline between statements.', this.peek());
        }
      }
      if (statements.length === 0) {
        this.fail('empty-block', 'A control-flow block must contain at least one statement.', this.peek());
      }
      this.consume('DEDENT', 'expected-dedent', 'Expected the end of an indented block.');
      return statements;
    });
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

  private parseAssignmentStatement(): TeachingStatement {
    const start = this.peek();
    const target = this.parseExpression();
    this.consume('EQUAL', 'expected-assignment', "Expected '=' after an assignment target.");
    if (target.type !== 'Name' && target.type !== 'Subscript') {
      this.fail('invalid-assignment-target', 'Only names and subscripts can be assigned to.', start);
    }
    const value = this.parseExpression();
    return target.type === 'Name'
      ? { type: 'Assign', name: target.name, value, span: mergeSpans(target.span, value.span) }
      : { type: 'SubscriptAssign', target, value, span: mergeSpans(target.span, value.span) };
  }

  private parseExpression(): TeachingExpression {
    return this.parseOr();
  }

  private parseOr(): TeachingExpression {
    let expression = this.parseAnd();
    while (this.match('OR')) {
      const right = this.parseAnd();
      expression = {
        type: 'Logical',
        operator: 'or',
        left: expression,
        right,
        span: mergeSpans(expression.span, right.span),
      };
    }
    return expression;
  }

  private parseAnd(): TeachingExpression {
    let expression = this.parseNot();
    while (this.match('AND')) {
      const right = this.parseNot();
      expression = {
        type: 'Logical',
        operator: 'and',
        left: expression,
        right,
        span: mergeSpans(expression.span, right.span),
      };
    }
    return expression;
  }

  private parseNot(): TeachingExpression {
    if (!this.match('NOT')) return this.parseComparison();
    const operator = this.previous();
    const operand = this.withExpressionNesting(operator, () => this.parseNot());
    return {
      type: 'Unary',
      operator: 'not',
      operand,
      span: mergeSpans(operator.span, operand.span),
    };
  }

  private parseComparison(): TeachingExpression {
    const expression = this.parseAdditive();
    if (!this.match('EQUAL_EQUAL', 'BANG_EQUAL', 'LESS', 'LESS_EQUAL', 'GREATER', 'GREATER_EQUAL')) {
      return expression;
    }
    const operator = this.previous();
    const right = this.parseAdditive();
    const operatorByType = {
      EQUAL_EQUAL: '==',
      BANG_EQUAL: '!=',
      LESS: '<',
      LESS_EQUAL: '<=',
      GREATER: '>',
      GREATER_EQUAL: '>=',
    } as const;
    return {
      type: 'Compare',
      operator: operatorByType[operator.type as keyof typeof operatorByType],
      left: expression,
      right,
      span: mergeSpans(expression.span, right.span),
    };
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
    const operand = this.withExpressionNesting(operator, () => this.parseUnary());
    return {
      type: 'Unary',
      operator: '-',
      operand,
      span: mergeSpans(operator.span, operand.span),
    };
  }

  private parsePrimary(): TeachingExpression {
    return this.parseSubscripts(this.parseAtom());
  }

  private parseAtom(): TeachingExpression {
    if (this.match('LEFT_BRACE')) {
      const open = this.previous();
      return this.withExpressionNesting(open, () => {
        const entries: Array<{ key: TeachingExpression; value: TeachingExpression }> = [];
        if (!this.check('RIGHT_BRACE')) {
          while (true) {
            const key = this.parseExpression();
            this.consume('COLON', 'expected-dictionary-colon', "Expected ':' between a dictionary key and value.");
            const value = this.parseExpression();
            entries.push({ key, value });
            if (!this.match('COMMA')) break;
            if (this.check('RIGHT_BRACE')) break;
          }
        }
        const close = this.consume('RIGHT_BRACE', 'expected-dictionary-close', "Expected '}' after dictionary entries.");
        return { type: 'DictLiteral', entries, span: mergeSpans(open.span, close.span) };
      });
    }
    if (this.match('LEFT_BRACKET')) {
      const open = this.previous();
      return this.withExpressionNesting(open, () => {
        const elements: TeachingExpression[] = [];
        if (!this.check('RIGHT_BRACKET')) {
          elements.push(this.parseExpression());
          while (this.match('COMMA')) {
            if (this.check('RIGHT_BRACKET')) break;
            elements.push(this.parseExpression());
          }
        }
        const close = this.consume('RIGHT_BRACKET', 'expected-list-close', "Expected ']' after list items.");
        return { type: 'ListLiteral', elements, span: mergeSpans(open.span, close.span) };
      });
    }
    if (this.match('INTEGER')) {
      const token = this.previous();
      return { type: 'IntegerLiteral', value: token.literal ?? token.lexeme, span: token.span };
    }
    if (this.match('STRING')) {
      const token = this.previous();
      return { type: 'StringLiteral', value: token.literal ?? '', span: token.span };
    }
    if (this.match('TRUE', 'FALSE')) {
      const token = this.previous();
      return { type: 'BooleanLiteral', value: token.type === 'TRUE', span: token.span };
    }
    if (this.match('NONE')) return { type: 'NoneLiteral', span: this.previous().span };
    if (this.match('NAME')) {
      const token = this.previous();
      if (this.match('LEFT_PAREN')) {
        return this.withExpressionNesting(token, () => {
          const args: TeachingExpression[] = [];
          if (!this.check('RIGHT_PAREN')) {
            while (true) {
              args.push(this.parseExpression());
              if (!this.match('COMMA')) break;
              if (this.check('RIGHT_PAREN')) {
                this.fail('trailing-call-comma', 'Trailing commas are not supported in function calls.', this.peek());
              }
            }
          }
          const end = this.consume('RIGHT_PAREN', 'expected-closing-parenthesis', "Expected ')' after call arguments.");
          return {
            type: 'Call',
            name: token.lexeme,
            arguments: args,
            span: mergeSpans(token.span, end.span),
          };
        });
      }
      return { type: 'Name', name: token.lexeme, span: token.span };
    }
    if (this.match('UNSUPPORTED_KEYWORD')) this.unsupportedKeyword(this.previous());
    if (this.match('LEFT_PAREN')) {
      const open = this.previous();
      return this.withExpressionNesting(open, () => {
        const expression = this.parseExpression();
        this.consume('RIGHT_PAREN', 'expected-closing-parenthesis', "Expected ')' after expression.");
        return expression;
      });
    }
    this.fail('expected-expression', 'Expected a value, list, call, or parenthesized expression.', this.peek());
  }

  private parseSubscripts(value: TeachingExpression): TeachingExpression {
    let expression = value;
    while (this.match('LEFT_BRACKET')) {
      const open = this.previous();
      const index = this.withExpressionNesting(open, () => this.parseExpression());
      const close = this.consume('RIGHT_BRACKET', 'expected-subscript-close', "Expected ']' after the subscript.");
      expression = {
        type: 'Subscript',
        value: expression,
        index,
        span: mergeSpans(expression.span, close.span),
      };
    }
    return expression;
  }

  private withExpressionNesting<T>(token: TeachingToken, parseNested: () => T): T {
    this.expressionNestingDepth += 1;
    if (this.expressionNestingDepth > MAX_PARSE_NESTING_DEPTH) {
      this.expressionNestingDepth -= 1;
      this.fail(
        'expression-too-deep',
        `Expression nesting exceeds ${MAX_PARSE_NESTING_DEPTH}.`,
        token,
      );
    }
    try {
      return parseNested();
    } finally {
      this.expressionNestingDepth -= 1;
    }
  }

  private withBlockNesting<T>(token: TeachingToken, parseNested: () => T): T {
    this.blockNestingDepth += 1;
    if (this.blockNestingDepth > MAX_PARSE_NESTING_DEPTH) {
      this.blockNestingDepth -= 1;
      this.fail(
        'block-too-deep',
        `Block nesting exceeds ${MAX_PARSE_NESTING_DEPTH}.`,
        token,
      );
    }
    try {
      return parseNested();
    } finally {
      this.blockNestingDepth -= 1;
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
    this.fail('unsupported-keyword', `Keyword '${token.lexeme}' is outside mini-vm-v5.`, token);
  }

  private fail(code: string, message: string, token: TeachingToken): never {
    throw new TeachingDiagnostic('parse', code, message, token.span);
  }
}

export function parseTeachingSource(source: string): TeachingProgram {
  return new Parser(tokenizeTeachingSource(source), source.length).parse();
}

function isCompoundStatement(statement: TeachingStatement): boolean {
  return statement.type === 'If'
    || statement.type === 'While'
    || statement.type === 'For'
    || statement.type === 'FunctionDef';
}

function isExpressionStart(type: TeachingToken['type']): boolean {
  return type === 'NAME'
    || type === 'INTEGER'
    || type === 'STRING'
    || type === 'TRUE'
    || type === 'FALSE'
    || type === 'NONE'
    || type === 'LEFT_BRACKET'
    || type === 'LEFT_PAREN'
    || type === 'MINUS'
    || type === 'NOT';
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
