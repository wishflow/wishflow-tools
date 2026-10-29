import { useEffect, useRef } from 'react';
import { findTokenAtOffset, rangesEqual, tokenSourceRange, type SourceLink, type SourcePositionIndex, type SourceRange } from '../analysis/source-position';
import type { PythonToken } from '../analysis/types';
import type { AnalysisStatus } from '../analysis/usePyodideAnalysis';
import { MAX_SOURCE_LENGTH } from '../analysis/source-limit';
import type { MessageKey } from '../locales';

interface SourcePanelProps {
  source: string;
  status: AnalysisStatus;
  error: string;
  tokens: PythonToken[];
  positionIndex: SourcePositionIndex;
  sourceLink: SourceLink | null;
  t: (key: MessageKey) => string;
  onLink(link: SourceLink): void;
  onChange(source: string): void;
  onAnalyze(): void;
  onRun(): void;
  onStopExecution(): void;
  onCancel(): void;
  onRetry(): void;
  onClear(): void;
  onRestore(): void;
}

export function SourcePanel({ source, status, error, tokens, positionIndex, sourceLink, t, onLink, onChange, onAnalyze, onRun, onStopExecution, onCancel, onRetry, onClear, onRestore }: SourcePanelProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!sourceLink || sourceLink.origin.kind === 'editor') return;
    const editor = editorRef.current;
    if (!editor) return;
    if (!sourceLink.range) {
      if (editor.selectionStart !== editor.selectionEnd) {
        editor.setSelectionRange(editor.selectionStart, editor.selectionStart);
      }
      return;
    }
    editor.focus();
    editor.setSelectionRange(sourceLink.range.start, sourceLink.range.end);
  }, [sourceLink]);

  function linkCurrentSelection(editor: HTMLTextAreaElement) {
    const selection = { start: editor.selectionStart, end: editor.selectionEnd };
    let range: SourceRange | null = selection;
    if (selection.start === selection.end) {
      const token = findTokenAtOffset(tokens, positionIndex, selection.start);
      range = token ? tokenSourceRange(token, positionIndex) : null;
    }
    if (rangesEqual(range, sourceLink?.range ?? null)) return;
    onLink({ origin: { kind: 'editor' }, range });
  }

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
        ref={editorRef}
        aria-label={t('source')}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={source}
        onChange={(event) => onChange(event.target.value)}
        onSelect={(event) => linkCurrentSelection(event.currentTarget)}
      />
      {error && <p className="input-error" role="alert">{error}</p>}
      <div className="source-toolbar">
        <div className="quiet-actions">
          <button type="button" className="text-button" onClick={onRestore}>{t('restoreExample')}</button>
          <button type="button" className="text-button" onClick={onClear}>{t('clearSource')}</button>
        </div>
        <div className="primary-actions">
          {status === 'loading' || status === 'analyzing' ? (
            <button type="button" className="button button-secondary" onClick={onCancel}>{t('cancel')}</button>
          ) : (
            <button type="button" className="button button-primary" disabled={status !== 'ready' || Boolean(error)} onClick={onAnalyze}>{t('analyze')}</button>
          )}
          {status === 'running' ? (
            <button type="button" className="button button-secondary" onClick={onStopExecution}>{t('stopExecution')}</button>
          ) : (
            <button type="button" className="button button-primary" disabled={status !== 'ready' || Boolean(error)} onClick={onRun}>{t('runPython')}</button>
          )}
          {(status === 'stopped' || status === 'failed') && (
            <button type="button" className="button button-primary" onClick={onRetry}>{t('retry')}</button>
          )}
        </div>
      </div>
    </section>
  );
}
