import { useEffect, useState } from 'react';
import { getLanguage, subscribeLanguage, type Language } from '@wishflow/site-shell';
import { MAX_SOURCE_LENGTH, validateSource } from './analysis/source-limit';
import { usePyodideAnalysis } from './analysis/usePyodideAnalysis';
import { ResultsPanel } from './components/ResultsPanel';
import { SourcePanel } from './components/SourcePanel';
import { message, type MessageKey } from './locales';

const EXAMPLE = 'x = 1 + 2\nprint(x)\n\ndef add(a, b):\n    return a + b\n';

export default function App() {
  const [language, setLanguage] = useState<Language>(getLanguage);
  const [source, setSource] = useState(EXAMPLE);
  const analysis = usePyodideAnalysis();
  const t = (key: MessageKey) => message(key, language);
  const sourceValidation = validateSource(source);
  const sourceError = sourceValidation.ok
    ? ''
    : t('sourceTooLong')
      .replace('{actual}', sourceValidation.actualLength.toLocaleString())
      .replace('{limit}', MAX_SOURCE_LENGTH.toLocaleString());

  useEffect(() => subscribeLanguage(setLanguage), []);

  function updateSource(nextSource: string) {
    setSource(nextSource);
    analysis.clearOutput();
    if (analysis.status === 'analyzing') analysis.restart();
  }

  function startAnalysis() {
    if (!sourceValidation.ok) return;
    analysis.analyze(source);
  }

  const statusText: Record<typeof analysis.status, string> = {
    loading: t('runtimeLoading'),
    ready: t('runtimeReady'),
    analyzing: t('runtimeAnalyzing'),
    stopped: t('runtimeStopped'),
    failed: t('runtimeFailed'),
  };
  const versionText = analysis.runtime
    ? t('runtimeVersion')
      .replace('{pyodide}', analysis.runtime.pyodideVersion)
      .replace('{python}', analysis.runtime.pythonVersion)
    : null;

  return (
    <main className="lab-page">
      <header className="lab-header">
        <div className="heading-copy">
          <p className="eyebrow">WISHFLOW TOOLS / PYTHON</p>
          <h1>{t('title')}</h1>
          <p className="intro-copy">{t('description')}</p>
        </div>
        <div className="runtime-card" aria-live="polite" aria-atomic="true">
          <span className={`status-dot status-${analysis.status}`} aria-hidden="true" />
          <div>
            <strong>{statusText[analysis.status]}</strong>
            {versionText && <span>{versionText}</span>}
          </div>
        </div>
      </header>

      <div className="safety-note" role="note">
        <span className="safety-mark" aria-hidden="true">i</span>
        <p>{t('privacyNote')}</p>
      </div>

      <div className="workbench">
        <SourcePanel
          source={source}
          status={analysis.status}
          error={sourceError}
          t={t}
          onChange={updateSource}
          onAnalyze={startAnalysis}
          onCancel={analysis.cancel}
          onRetry={analysis.retry}
          onClear={() => updateSource('')}
          onRestore={() => updateSource(EXAMPLE)}
        />
        <ResultsPanel result={analysis.result} diagnostic={analysis.diagnostic} isBusy={analysis.status === 'analyzing'} t={t} />
      </div>
      <footer className="lab-footer">
        <span>{t('footerLeft')}</span>
        <span>{t('footerRight')}</span>
      </footer>
    </main>
  );
}
