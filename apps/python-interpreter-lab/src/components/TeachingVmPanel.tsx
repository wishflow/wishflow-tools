import { memo, type ReactNode } from 'react';
import { rangesOverlap, type SourceLink } from '../analysis/source-position';
import type {
  SourceSpan,
  TeachingCompileResult,
  TeachingDiagnosticSnapshot,
  TeachingExpression,
  TeachingStatement,
  TeachingVmHistory,
  TeachingVmSnapshot,
} from '../teaching-vm/types';
import type { TeachingStatus } from '../teaching-vm/useTeachingVm';
import type { MessageKey } from '../locales';

interface TeachingVmPanelProps {
  program: TeachingCompileResult | null;
  history: TeachingVmHistory;
  snapshot: TeachingVmSnapshot | null;
  headSnapshot: TeachingVmSnapshot | null;
  atHead: boolean;
  diagnostic: TeachingDiagnosticSnapshot | null;
  status: TeachingStatus;
  sourceLink: SourceLink | null;
  isBusy: boolean;
  t: (key: MessageKey) => string;
  onSelectHistory(stepIndex: number): void;
  onGoToHead(): void;
  onLink(link: SourceLink): void;
}

function sourceRange(span: SourceSpan) {
  return span.end > span.start ? { start: span.start, end: span.end } : null;
}

function positionLabel(span: SourceSpan, t: (key: MessageKey) => string): string {
  return t('teachingSourcePosition')
    .replace('{line}', String(span.line))
    .replace('{column}', String(span.column));
}

function isSourceMatch(span: SourceSpan, sourceLink: SourceLink | null): boolean {
  const range = sourceRange(span);
  return Boolean(range && sourceLink?.range && rangesOverlap(range, sourceLink.range));
}

function DiagnosticPanel({ diagnostic, t }: { diagnostic: TeachingDiagnosticSnapshot; t: (key: MessageKey) => string }) {
  const titleKey: MessageKey = diagnostic.stage === 'lex'
    ? 'teachingLexError'
    : diagnostic.stage === 'parse'
      ? 'teachingParseError'
      : diagnostic.stage === 'compile'
        ? 'teachingCompileError'
        : 'teachingRuntimeError';
  const codeKey: MessageKey = diagnostic.code === 'name-error'
    ? 'teachingCodeNameError'
    : diagnostic.code === 'type-error'
      ? 'teachingCodeTypeError'
      : diagnostic.code === 'zero-range-step'
        ? 'teachingCodeZeroRangeStep'
      : diagnostic.code === 'instruction-budget-exceeded'
        ? 'teachingCodeInstructionBudget'
      : ['too-many-names', 'string-too-long', 'output-too-long', 'integer-too-large'].includes(diagnostic.code)
        ? 'teachingCodeResourceLimit'
        : diagnostic.stage === 'lex'
          ? 'teachingCodeLexError'
          : diagnostic.stage === 'parse'
          ? 'teachingCodeSyntaxError'
          : diagnostic.stage === 'compile'
            ? 'teachingCodeCompilerError'
            : 'teachingCodeExecutionError';
  const location = t('teachingErrorLocation')
    .replace('{code}', t(codeKey))
    .replace('{line}', String(diagnostic.span.line))
    .replace('{column}', String(diagnostic.span.column));

  return (
    <div className="diagnostic" role="alert">
      <strong>{t(titleKey)}</strong>
      <p>{location}</p>
    </div>
  );
}

function ExpressionTree({
  expression,
  sourceLink,
  t,
  onLink,
}: {
  expression: TeachingExpression;
  sourceLink: SourceLink | null;
  t: (key: MessageKey) => string;
  onLink(link: SourceLink): void;
}) {
  let detail: ReactNode = null;
  let children: TeachingExpression[] = [];
  switch (expression.type) {
    case 'IntegerLiteral':
      detail = <code className="ast-literal">{expression.value}</code>;
      break;
    case 'StringLiteral':
      detail = <code className="ast-literal">{JSON.stringify(expression.value)}</code>;
      break;
    case 'BooleanLiteral':
      detail = <code className="ast-literal">{expression.value ? 'True' : 'False'}</code>;
      break;
    case 'NoneLiteral':
      detail = <code className="ast-literal">None</code>;
      break;
    case 'Name':
      detail = <code>{expression.name}</code>;
      break;
    case 'Unary':
      detail = <code>{expression.operator}</code>;
      children = [expression.operand];
      break;
    case 'Binary':
    case 'Compare':
    case 'Logical':
      detail = <code>{expression.operator}</code>;
      children = [expression.left, expression.right];
      break;
  }
  const range = sourceRange(expression.span);
  const isOrigin = sourceLink?.origin.kind === 'teaching'
    && sourceLink.origin.index === null
    && sourceLink.range?.start === range?.start
    && sourceLink.range?.end === range?.end;

  return (
    <li className={`teaching-ast-node${isSourceMatch(expression.span, sourceLink) ? ' is-source-match' : ''}${isOrigin ? ' is-source-origin' : ''}`}>
      <button
        type="button"
        className="teaching-ast-locate"
        aria-label={`${t('locate')} ${expression.type} · ${positionLabel(expression.span, t)}`}
        onClick={() => onLink({ origin: { kind: 'teaching', index: null }, range })}
      >
        <span className="ast-type">{expression.type}</span>
        {detail}
        <span className="ast-location">{positionLabel(expression.span, t)}</span>
      </button>
      {children.length > 0 && (
        <ul className="teaching-ast-list">
          {children.map((child) => (
            <ExpressionTree key={`${child.type}-${child.span.start}-${child.span.end}`} expression={child} sourceLink={sourceLink} t={t} onLink={onLink} />
          ))}
        </ul>
      )}
    </li>
  );
}

function StatementTree({
  statement,
  sourceLink,
  t,
  onLink,
}: {
  statement: TeachingStatement;
  sourceLink: SourceLink | null;
  t: (key: MessageKey) => string;
  onLink(link: SourceLink): void;
}) {
  const range = sourceRange(statement.span);
  const isOrigin = sourceLink?.origin.kind === 'teaching'
    && sourceLink.origin.index === null
    && sourceLink.range?.start === range?.start
    && sourceLink.range?.end === range?.end;
  const expressions = statement.type === 'Assign'
    ? [statement.value]
    : statement.type === 'Print'
      ? statement.arguments
      : statement.type === 'While'
        ? [statement.condition]
        : statement.type === 'For'
          ? statement.rangeArguments
          : [];
  const statementLabel = statement.type === 'Assign'
    ? statement.name
    : statement.type === 'Print'
      ? 'print(...)'
      : statement.type === 'If'
        ? 'if / elif / else'
        : statement.type === 'While'
          ? 'while'
          : `for ${statement.name} in range(...)`;

  return (
    <li className={`teaching-ast-node${isSourceMatch(statement.span, sourceLink) ? ' is-source-match' : ''}${isOrigin ? ' is-source-origin' : ''}`}>
      <button
        type="button"
        className="teaching-ast-locate"
        aria-label={`${t('locate')} ${statement.type} · ${positionLabel(statement.span, t)}`}
        onClick={() => onLink({ origin: { kind: 'teaching', index: null }, range })}
      >
        <span className="ast-type">{statement.type}</span>
        <code>{statementLabel}</code>
        <span className="ast-location">{positionLabel(statement.span, t)}</span>
      </button>
      {expressions.length > 0 && (
        <ul className="teaching-ast-list">
          {expressions.map((expression) => (
            <ExpressionTree key={`${expression.type}-${expression.span.start}-${expression.span.end}`} expression={expression} sourceLink={sourceLink} t={t} onLink={onLink} />
          ))}
        </ul>
      )}
      {statement.type === 'If' && (
        <ul className="teaching-ast-list">
          {statement.branches.map((branch, index) => (
            <li key={`branch-${branch.span.start}`} className="teaching-ast-node">
              <div className="teaching-ast-locate">
                <span className="ast-type">{index === 0 ? 'if' : 'elif'}</span>
                <ul className="teaching-ast-list">
                  <ExpressionTree expression={branch.condition} sourceLink={sourceLink} t={t} onLink={onLink} />
                </ul>
              </div>
              <ol className="teaching-ast-list">
                {branch.body.map((child, childIndex) => (
                  <StatementTree key={`${child.type}-${child.span.start}-${childIndex}`} statement={child} sourceLink={sourceLink} t={t} onLink={onLink} />
                ))}
              </ol>
            </li>
          ))}
          {statement.elseBody && (
            <li className="teaching-ast-node">
              <span className="ast-type">else</span>
              <ol className="teaching-ast-list">
                {statement.elseBody.map((child, childIndex) => (
                  <StatementTree key={`${child.type}-${child.span.start}-${childIndex}`} statement={child} sourceLink={sourceLink} t={t} onLink={onLink} />
                ))}
              </ol>
            </li>
          )}
        </ul>
      )}
      {statement.type === 'While' && (
        <ol className="teaching-ast-list">
          {statement.body.map((child, childIndex) => (
            <StatementTree key={`${child.type}-${child.span.start}-${childIndex}`} statement={child} sourceLink={sourceLink} t={t} onLink={onLink} />
          ))}
        </ol>
      )}
      {statement.type === 'For' && (
        <ol className="teaching-ast-list">
          {statement.body.map((child, childIndex) => (
            <StatementTree key={`${child.type}-${child.span.start}-${childIndex}`} statement={child} sourceLink={sourceLink} t={t} onLink={onLink} />
          ))}
        </ol>
      )}
    </li>
  );
}

function formatInstructionArgument(instruction: TeachingCompileResult['instructions'][number], program: TeachingCompileResult): string {
  if (instruction.opcode === 'LOAD_CONST' && typeof instruction.argument === 'number') {
    const constant = program.constants[instruction.argument];
    if (constant) {
      const value = constant.type === 'str' ? JSON.stringify(constant.value) : constant.value;
      return `#${instruction.argument} · ${value}`;
    }
  }
  if (['JUMP', 'POP_JUMP_IF_FALSE', 'JUMP_IF_FALSE_OR_POP', 'JUMP_IF_TRUE_OR_POP', 'FOR_ITER'].includes(instruction.opcode)) {
    return `→ ${String(instruction.argument)}`;
  }
  return instruction.argument === null ? '—' : String(instruction.argument);
}

function statusLabel(status: TeachingStatus, t: (key: MessageKey) => string): string {
  const labels: Record<TeachingStatus, string> = {
    loading: t('teachingLoading'),
    ready: t('teachingReady'),
    compiling: t('teachingCompiling'),
    running: t('teachingRunning'),
    paused: t('teachingPaused'),
    finished: t('teachingFinished'),
    error: t('teachingFailed'),
  };
  return labels[status];
}

const TeachingAstPanel = memo(function TeachingAstPanel({
  program,
  sourceLink,
  t,
  onLink,
}: {
  program: TeachingCompileResult;
  sourceLink: SourceLink | null;
  t: (key: MessageKey) => string;
  onLink(link: SourceLink): void;
}) {
  return (
    <section className="panel output-panel" aria-labelledby="teaching-ast-heading">
      <div className="output-panel-heading">
        <h3 id="teaching-ast-heading">{t('teachingAst')}</h3>
        <span className="small-meta">{program.version}</span>
      </div>
      {program.ast.statements.length === 0 ? (
        <p className="empty-state">{t('teachingNoAst')}</p>
      ) : (
        <div className="tree-scroll teaching-ast-scroll" role="region" aria-label={t('teachingAst')} tabIndex={0}>
          <ol className="teaching-ast-list teaching-ast-root">
            {program.ast.statements.map((statement, index) => (
              <StatementTree key={`${statement.type}-${index}-${statement.span.start}`} statement={statement} sourceLink={sourceLink} t={t} onLink={onLink} />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
});

const TeachingInstructionRow = memo(function TeachingInstructionRow({
  instruction,
  program,
  sourceLink,
  t,
  onLink,
  isCurrent,
  isNext,
  isFault,
}: {
  instruction: TeachingCompileResult['instructions'][number];
  program: TeachingCompileResult;
  sourceLink: SourceLink | null;
  t: (key: MessageKey) => string;
  onLink(link: SourceLink): void;
  isCurrent: boolean;
  isNext: boolean;
  isFault: boolean;
}) {
  const isOrigin = sourceLink?.origin.kind === 'teaching' && sourceLink.origin.index === instruction.index;
  const classes = [
    isSourceMatch(instruction.span, sourceLink) ? 'is-source-match' : '',
    isOrigin ? 'is-source-origin' : '',
    isCurrent ? 'is-vm-current' : '',
    isNext ? 'is-vm-next' : '',
    isFault ? 'is-vm-fault' : '',
  ].filter(Boolean).join(' ');

  return (
    <tr className={classes}>
      <td className="number-cell">{instruction.index}</td>
      <td><code>{instruction.opcode}</code></td>
      <td className="argument-cell">{formatInstructionArgument(instruction, program)}</td>
      <td className="bytecode-position">
        <button
          type="button"
          className="bytecode-locator"
          aria-label={`${t('locate')} ${t('teachingInstructionIndex')} ${instruction.index} · ${positionLabel(instruction.span, t)}`}
          onClick={() => onLink({ origin: { kind: 'teaching', index: instruction.index }, range: sourceRange(instruction.span) })}
        >
          {positionLabel(instruction.span, t)}
        </button>
      </td>
    </tr>
  );
});

const TeachingInstructionPanel = memo(function TeachingInstructionPanel({
  program,
  snapshot,
  sourceLink,
  t,
  onLink,
}: {
  program: TeachingCompileResult;
  snapshot: TeachingVmSnapshot | null;
  sourceLink: SourceLink | null;
  t: (key: MessageKey) => string;
  onLink(link: SourceLink): void;
}) {
  return (
    <section className="panel output-panel" aria-labelledby="teaching-bytecode-heading">
      <div className="output-panel-heading">
        <h3 id="teaching-bytecode-heading">{t('teachingBytecode')}</h3>
        <span className="small-meta">{program.version}</span>
      </div>
      <div className="teaching-instruction-legend" aria-label={t('teachingBytecode')}>
        <span><i className="teaching-state-swatch swatch-current" aria-hidden="true" />{t('teachingCurrentInstruction')}</span>
        <span><i className="teaching-state-swatch swatch-next" aria-hidden="true" />{t('teachingNextInstruction')}</span>
        <span><i className="teaching-state-swatch swatch-fault" aria-hidden="true" />{t('teachingFaultInstruction')}</span>
      </div>
      <div className="instruction-scroll" role="region" aria-label={t('teachingBytecode')} tabIndex={0}>
        <table className="instruction-table teaching-instruction-table">
          <thead>
            <tr>
              <th scope="col">{t('teachingInstructionIndex')}</th>
              <th scope="col">{t('opcode')}</th>
              <th scope="col">{t('argument')}</th>
              <th scope="col">{t('line')}</th>
            </tr>
          </thead>
          <tbody>
            {program.instructions.map((instruction) => {
              const isFault = snapshot?.faultInstructionIndex === instruction.index;
              const isCurrent = snapshot?.lastExecutedInstructionIndex === instruction.index && !isFault;
              const isNext = snapshot?.nextInstructionIndex === instruction.index && !isFault && !isCurrent;
              return (
                <TeachingInstructionRow
                  key={instruction.index}
                  instruction={instruction}
                  program={program}
                  sourceLink={sourceLink}
                  t={t}
                  onLink={onLink}
                  isCurrent={isCurrent}
                  isNext={isNext}
                  isFault={isFault}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
});

export function TeachingVmPanel({ program, history, snapshot, headSnapshot, atHead, diagnostic, status, sourceLink, isBusy, t, onSelectHistory, onGoToHead, onLink }: TeachingVmPanelProps) {
  const shownDiagnostic = diagnostic ?? snapshot?.diagnostic ?? null;
  const historyStart = history.items[0]?.stepIndex ?? 0;
  const historyEnd = headSnapshot?.stepIndex ?? historyStart;
  const historyValue = snapshot?.stepIndex ?? historyEnd;

  return (
    <section className="results-area teaching-results" aria-labelledby="teaching-results-heading" aria-busy={isBusy}>
      <div className="results-header">
        <div>
          <p className="eyebrow">02 / TEACHING VM</p>
          <h2 id="teaching-results-heading">{t('engineTeaching')}</h2>
        </div>
        {program && <span className="result-count">{program.instructions.length} {t('instructions')}</span>}
      </div>
      {shownDiagnostic && <DiagnosticPanel diagnostic={shownDiagnostic} t={t} />}
      {!program ? (
        <div className="panel empty-output"><p>{t('teachingNoProgram')}</p></div>
      ) : (
        <div className="teaching-content">
          <div className="teaching-structure-grid">
            <TeachingAstPanel program={program} sourceLink={sourceLink} t={t} onLink={onLink} />
            <TeachingInstructionPanel program={program} snapshot={snapshot} sourceLink={sourceLink} t={t} onLink={onLink} />
          </div>

          <section className="panel teaching-runtime-panel" aria-labelledby="teaching-runtime-heading">
            <div className="output-panel-heading">
              <h3 id="teaching-runtime-heading">{t('teachingHistory')}</h3>
              <span className={`execution-status status-text-${status}`}>{statusLabel(status, t)}</span>
            </div>
            <div className="teaching-history-control">
              <label className="trace-slider-label" htmlFor="teaching-history-slider">{t('teachingHistory')}</label>
              <input
                id="teaching-history-slider"
                type="range"
                min={historyStart}
                max={historyEnd}
                step={1}
                value={historyValue}
                disabled={history.items.length < 2}
                aria-valuetext={t('teachingHistoryPosition').replace('{current}', String(historyValue)).replace('{last}', String(historyEnd))}
                onChange={(event) => onSelectHistory(Number(event.target.value))}
              />
              <span className="small-meta">{t('teachingHistoryPosition').replace('{current}', String(historyValue)).replace('{last}', String(historyEnd))}</span>
            </div>
            <p className="small-meta">
              {t('teachingInstructionCount').replace('{count}', String(snapshot?.executedInstructionCount ?? 0))}
            </p>
            <div className="teaching-history-state" role="status">
              <span>{atHead ? t('teachingHistoryAtHead') : t('teachingHistoryInPast')}</span>
              {!atHead && <button type="button" className="text-button" onClick={onGoToHead}>{t('teachingReturnToHead')}</button>}
              {history.truncated && <span className="limit-notice">{t('teachingHistoryTruncated')}</span>}
            </div>
            <div className="teaching-state-grid">
              <section aria-labelledby="teaching-stack-heading">
                <h4 id="teaching-stack-heading">{t('teachingStack')}</h4>
                {snapshot?.controlFlow && (
                  <p className="teaching-control-flow" role="status">
                    <strong>{t('teachingControlFlowDecision')}:</strong>{' '}
                    {snapshot.controlFlow.kind === 'shortCircuit'
                      ? t(snapshot.controlFlow.outcome === 'short-circuited' ? 'teachingShortCircuited' : 'teachingEvaluatedRight')
                      : snapshot.controlFlow.kind === 'branch'
                        ? t(snapshot.controlFlow.outcome === 'branch-taken' ? 'teachingBranchTaken' : 'teachingBranchSkipped')
                        : t(snapshot.controlFlow.outcome === 'loop-finished' ? 'teachingLoopFinished' : 'teachingLoopContinues')}
                  </p>
                )}
                {!snapshot || snapshot.stack.length === 0 ? <p className="empty-state">{t('teachingNoStack')}</p> : (
                  <ol className="teaching-value-list">
                    {snapshot.stack.map((value, index) => <li key={`${index}-${value.type}-${value.value}`}><span>{index}</span><code>{value.display}</code></li>)}
                  </ol>
                )}
              </section>
              <section aria-labelledby="teaching-variables-heading">
                <h4 id="teaching-variables-heading">{t('teachingVariables')}</h4>
                {!snapshot || snapshot.variables.length === 0 ? <p className="empty-state">{t('teachingNoVariables')}</p> : (
                  <dl className="trace-values teaching-variable-list">
                    {snapshot.variables.map(({ name, value }) => <div key={name}><dt>{name}</dt><dd><code>{value.display}</code></dd></div>)}
                  </dl>
                )}
              </section>
              <section aria-labelledby="teaching-output-heading">
                <h4 id="teaching-output-heading">{t('teachingOutput')}</h4>
                {!snapshot || snapshot.output.length === 0 ? <p className="empty-state">{t('teachingNoOutput')}</p> : (
                  <pre className="teaching-output">{snapshot.output.join('\n')}</pre>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
