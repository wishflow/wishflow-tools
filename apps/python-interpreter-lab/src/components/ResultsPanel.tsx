import { useEffect, useState } from 'react';
import type { AnalysisResult, AstField, AstNode, ExecutionResult, PythonDiagnostic } from '../analysis/types';
import {
  astNodeSourceRange,
  instructionSourceRange,
  rangesOverlap,
  tokenSourceRange,
  type SourceLink,
  type SourcePositionIndex,
} from '../analysis/source-position';
import { AstTree } from './AstTree';
import { BytecodePanel } from './BytecodePanel';
import { TokensPanel } from './TokensPanel';
import { ExecutionPanel } from './ExecutionPanel';
import type { MessageKey } from '../locales';

interface ResultsPanelProps {
  result: AnalysisResult | null;
  execution: ExecutionResult | null;
  diagnostic: PythonDiagnostic | null;
  isBusy: boolean;
  positionIndex: SourcePositionIndex;
  sourceLink: SourceLink | null;
  t: (key: MessageKey) => string;
  onLink(link: SourceLink): void;
}

function isAstNode(value: AstField): value is AstNode {
  return typeof value === 'object' && value !== null && 'fields' in value && 'type' in value;
}

function astHasSourceMatch(node: AstNode, positionIndex: SourcePositionIndex, range: NonNullable<SourceLink['range']>): boolean {
  const nodeRange = astNodeSourceRange(node, positionIndex);
  if (nodeRange && rangesOverlap(nodeRange, range)) return true;
  return Object.values(node.fields).some((value) => {
    if (isAstNode(value)) return astHasSourceMatch(value, positionIndex, range);
    if (Array.isArray(value)) return value.some((item) => isAstNode(item) && astHasSourceMatch(item, positionIndex, range));
    return false;
  });
}

function ErrorPanel({ diagnostic, t }: { diagnostic: PythonDiagnostic; t: (key: MessageKey) => string }) {
  const title = diagnostic.stage === 'runtime'
    ? t('runtimeError')
    : t(diagnostic.stage === 'parse' ? 'parseError' : 'compileError').replace('{type}', diagnostic.type);
  return (
    <div className="diagnostic" role="alert">
      <strong>{title}</strong>
      <p>{diagnostic.message}</p>
      {diagnostic.line !== null && <small>{t('line')} {diagnostic.line}{diagnostic.column !== null ? ` · ${t('utf8Column')} ${diagnostic.column}` : ''}</small>}
    </div>
  );
}

export function ResultsPanel({ result, execution, diagnostic, isBusy, positionIndex, sourceLink, t, onLink }: ResultsPanelProps) {
  const [selectedCodeId, setSelectedCodeId] = useState('code-0');
  useEffect(() => {
    if (result) setSelectedCodeId(result.codeObjects[0]?.id ?? 'code-0');
  }, [result]);

  const selectedCode = result?.codeObjects.find((code) => code.id === selectedCodeId) ?? result?.codeObjects[0];
  const linkedRange = sourceLink?.range ?? null;
  const hasSourceMatch = result && linkedRange
    ? result.tokens.some((token) => {
        const range = tokenSourceRange(token, positionIndex);
        return range !== null && rangesOverlap(range, linkedRange);
      })
      || astHasSourceMatch(result.ast, positionIndex, linkedRange)
      || Boolean(selectedCode?.instructions.some((instruction) => {
        const range = instructionSourceRange(instruction, positionIndex);
        return range !== null && rangesOverlap(range, linkedRange);
      }))
    : false;

  return (
    <section className="results-area" aria-labelledby="results-heading" aria-busy={isBusy}>
      <div className="results-header">
        <div>
          <p className="eyebrow">02 / INSPECT</p>
          <h2 id="results-heading">{t('output')}</h2>
        </div>
        {result && <span className="result-count">{t('codeObjectCount').replace('{count}', String(result.codeObjects.length))}</span>}
      </div>
      {diagnostic && <ErrorPanel diagnostic={diagnostic} t={t} />}
      <ExecutionPanel execution={execution} sourcePositionIndex={positionIndex} t={t} onLink={onLink} />
      {result && sourceLink && (
        <p className="link-status" role="status">
          {!sourceLink.range ? t('sourcePositionUnavailable') : hasSourceMatch ? t('sourceLinkActive') : t('sourceNoMatches')}
        </p>
      )}
      {!result ? (
        <div className="panel empty-output"><p>{t('noAnalysis')}</p></div>
      ) : (
        <div className="output-grid">
          <TokensPanel
            tokens={result.tokens}
            tokensTruncated={result.tokensTruncated}
            tokenizationError={result.tokenizationError}
            positionIndex={positionIndex}
            sourceLink={sourceLink}
            t={t}
            onLink={onLink}
          />
          <section className="panel output-panel" aria-labelledby="ast-heading">
            <div className="output-panel-heading">
              <h3 id="ast-heading">{t('ast')}</h3>
              {result.astTruncated && <span className="small-warning">{t('astTruncated')}</span>}
            </div>
            <div className="tree-scroll" role="region" aria-label={t('ast')} tabIndex={0}>
              <AstTree
                root={result.ast}
                t={t}
                lineLabel={t('line')}
                columnLabel={t('utf8Column')}
                constantLabel={t('constant')}
                positionIndex={positionIndex}
                sourceLink={sourceLink}
                onLink={onLink}
              />
            </div>
          </section>
          <section className="panel output-panel" aria-labelledby="bytecode-heading">
            <div className="output-panel-heading">
              <h3 id="bytecode-heading">{t('bytecode')}</h3>
              <span className="small-meta">{result.instructionCount} {t('instructions')}</span>
            </div>
            {result.codeObjectsTruncated && <p className="limit-notice" role="status">{t('codeObjectsTruncated')}</p>}
            <BytecodePanel
              codeObjects={result.codeObjects}
              selectedCodeId={selectedCodeId}
              instructionsTruncated={result.instructionsTruncated}
              positionIndex={positionIndex}
              sourceLink={sourceLink}
              t={t}
              onSelect={setSelectedCodeId}
              onLink={onLink}
            />
          </section>
        </div>
      )}
    </section>
  );
}
