import { useEffect, useState } from 'react';
import type { AnalysisResult, PythonDiagnostic } from '../analysis/types';
import { AstTree } from './AstTree';
import { BytecodePanel } from './BytecodePanel';
import type { MessageKey } from '../locales';

interface ResultsPanelProps {
  result: AnalysisResult | null;
  diagnostic: PythonDiagnostic | null;
  isBusy: boolean;
  t: (key: MessageKey) => string;
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

export function ResultsPanel({ result, diagnostic, isBusy, t }: ResultsPanelProps) {
  const [selectedCodeId, setSelectedCodeId] = useState('code-0');
  useEffect(() => {
    if (result) setSelectedCodeId(result.codeObjects[0]?.id ?? 'code-0');
  }, [result]);

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
      {!result ? (
        <div className="panel empty-output"><p>{t('noAnalysis')}</p></div>
      ) : (
        <div className="output-grid">
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
              t={t}
              onSelect={setSelectedCodeId}
            />
          </section>
        </div>
      )}
    </section>
  );
}
