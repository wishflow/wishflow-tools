import type { AnalysisStatus } from '../analysis/usePyodideAnalysis';
import { MAX_SOURCE_LENGTH } from '../analysis/source-limit';
import type { MessageKey } from '../locales';

interface SourcePanelProps {
  source: string;
  status: AnalysisStatus;
  error: string;
  t: (key: MessageKey) => string;
  onChange(source: string): void;
  onAnalyze(): void;
  onCancel(): void;
  onRetry(): void;
  onClear(): void;
  onRestore(): void;
}

export function SourcePanel({ source, status, error, t, onChange, onAnalyze, onCancel, onRetry, onClear, onRestore }: SourcePanelProps) {
  const busy = status === 'loading' || status === 'analyzing';
  return (
    <section className="panel source-panel" aria-labelledby="source-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">01 / SOURCE</p>
          <h2 id="source-heading">{t('source')}</h2>
        </div>
        <span className="source-count">{source.length.toLocaleString()} / {MAX_SOURCE_LENGTH.toLocaleString()}</span>
      </div>
      <p className="panel-hint">{t('sourceHint')}</p>
      <label className="visually-hidden" htmlFor="python-source">{t('source')}</label>
      <textarea
        id="python-source"
        className="source-editor"
        aria-label={t('source')}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={source}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <p className="input-error" role="alert">{error}</p>}
      <div className="source-toolbar">
        <div className="quiet-actions">
          <button type="button" className="text-button" onClick={onRestore}>{t('restoreExample')}</button>
          <button type="button" className="text-button" onClick={onClear}>{t('clearSource')}</button>
        </div>
        <div className="primary-actions">
          {busy ? (
            <button type="button" className="button button-secondary" onClick={onCancel}>{t('cancel')}</button>
          ) : status === 'stopped' || status === 'failed' ? (
            <button type="button" className="button button-primary" onClick={onRetry}>{t('retry')}</button>
          ) : (
            <button type="button" className="button button-primary" disabled={status !== 'ready' || Boolean(error)} onClick={onAnalyze}>{t('analyze')}</button>
          )}
        </div>
      </div>
    </section>
  );
}
