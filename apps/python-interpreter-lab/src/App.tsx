import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLanguage, subscribeLanguage, type Language } from '@wishflow/site-shell';
import { createSourcePositionIndex, type SourceLink } from './analysis/source-position';
import { MAX_SOURCE_LENGTH, validateSource } from './analysis/source-limit';
import { usePyodideAnalysis } from './analysis/usePyodideAnalysis';
import { ResultsPanel } from './components/ResultsPanel';
import { SourcePanel } from './components/SourcePanel';
import { TeachingVmPanel } from './components/TeachingVmPanel';
import { useTeachingVm } from './teaching-vm/useTeachingVm';
import { message, type MessageKey } from './locales';

const EXAMPLE = 'x = 1 + 2\nprint(x)\n\ndef add(a, b):\n    return a + b\n';

type EngineMode = 'cpython' | 'teaching';

export default function App() {
  const [language, setLanguage] = useState<Language>(getLanguage);
  const [source, setSource] = useState(EXAMPLE);
  const [mode, setMode] = useState<EngineMode>('cpython');
  const [sourceLink, setSourceLink] = useState<SourceLink | null>(null);
  const analysis = usePyodideAnalysis();
  const teaching = useTeachingVm();
  const positionIndex = useMemo(() => createSourcePositionIndex(source), [source]);
  const t = useCallback((key: MessageKey) => message(key, language), [language]);
  const sourceValidation = validateSource(source);
  const sourceError = sourceValidation.ok
    ? ''
    : t('sourceTooLong')
      .replace('{actual}', sourceValidation.actualLength.toLocaleString())
      .replace('{limit}', MAX_SOURCE_LENGTH.toLocaleString());

  useEffect(() => subscribeLanguage(setLanguage), []);

  function updateSource(nextSource: string) {
    const shouldRestart = analysis.status === 'analyzing' || analysis.status === 'running';
    setSource(nextSource);
    setSourceLink(null);
    analysis.clearOutput();
    analysis.clearExecution();
    teaching.invalidate();
    if (shouldRestart) analysis.restart();
  }

  function updateMode(nextMode: EngineMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setSourceLink(null);
    analysis.clearOutput();
    analysis.clearExecution();
    teaching.invalidate();
    if (nextMode === 'teaching' && (analysis.status === 'analyzing' || analysis.status === 'running')) {
      analysis.cancel();
    }
  }

  function startAnalysis() {
    if (!sourceValidation.ok) return;
    setSourceLink(null);
    analysis.analyze(source);
  }

  function startExecution() {
    if (!sourceValidation.ok) return;
    setSourceLink(null);
    analysis.run(source);
  }

  function compileTeaching() {
    if (!sourceValidation.ok) return;
    setSourceLink(null);
    teaching.compile(source);
  }

  const cpythonStatusText: Record<typeof analysis.status, string> = {
    loading: t('runtimeLoading'),
    ready: t('runtimeReady'),
    analyzing: t('runtimeAnalyzing'),
    running: t('runtimeRunning'),
    stopped: t('runtimeStopped'),
    failed: t('runtimeFailed'),
  };
  const teachingStatusText = {
    loading: t('teachingLoading'),
    ready: t('teachingReady'),
    compiling: t('teachingCompiling'),
    running: t('teachingRunning'),
    paused: t('teachingPaused'),
    finished: t('teachingFinished'),
    error: t('teachingFailed'),
  }[teaching.status];
  const statusText = mode === 'cpython' ? cpythonStatusText[analysis.status] : teachingStatusText;
  const statusClass = mode === 'cpython' ? analysis.status : teaching.status;
  const versionText = mode === 'teaching'
    ? t('teachingVersion')
    : analysis.runtime
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
          <p className="intro-copy">{t(mode === 'cpython' ? 'description' : 'teachingDescription')}</p>
        </div>
        <div className="header-controls">
          <label className="mode-picker">
            <span>{t('engineMode')}</span>
            <select value={mode} onChange={(event) => updateMode(event.target.value as EngineMode)}>
              <option value="cpython">{t('engineCpython')}</option>
              <option value="teaching">{t('engineTeaching')}</option>
            </select>
          </label>
          <div className="runtime-card" aria-live="polite" aria-atomic="true">
            <span className={`status-dot status-${statusClass}`} aria-hidden="true" />
            <div>
              <strong>{statusText}</strong>
              {versionText && <span>{versionText}</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="safety-note" role="note">
        <span className="safety-mark" aria-hidden="true">i</span>
        <p>{t(mode === 'cpython' ? 'privacyNote' : 'teachingPrivacyNote')}</p>
      </div>

      <div className="workbench">
        <SourcePanel
          mode={mode}
          source={source}
          status={analysis.status}
          teachingStatus={teaching.status}
          teachingHasProgram={Boolean(teaching.program)}
          teachingAtHead={teaching.atHead}
          error={sourceError}
          tokens={analysis.result?.tokens ?? []}
          positionIndex={positionIndex}
          sourceLink={sourceLink}
          t={t}
          onLink={setSourceLink}
          onChange={updateSource}
          onAnalyze={startAnalysis}
          onRun={startExecution}
          onStopExecution={analysis.stopExecution}
          onCancel={analysis.cancel}
          onRetry={analysis.retry}
          onCompileTeaching={compileTeaching}
          onStepTeaching={teaching.step}
          onRunTeaching={teaching.run}
          onPauseTeaching={teaching.pause}
          onResetTeaching={teaching.reset}
          onClear={() => updateSource('')}
          onRestore={() => updateSource(EXAMPLE)}
        />
        {mode === 'cpython' ? (
          <ResultsPanel
            result={analysis.result}
            execution={analysis.execution}
            diagnostic={analysis.diagnostic}
            isBusy={analysis.status === 'analyzing' || analysis.status === 'running'}
            positionIndex={positionIndex}
            sourceLink={sourceLink}
            t={t}
            onLink={setSourceLink}
          />
        ) : (
          <TeachingVmPanel
            program={teaching.program}
            history={teaching.history}
            snapshot={teaching.snapshot}
            headSnapshot={teaching.headSnapshot}
            atHead={teaching.atHead}
            diagnostic={teaching.diagnostic}
            status={teaching.status}
            sourceLink={sourceLink}
            isBusy={teaching.status === 'compiling' || teaching.status === 'running'}
            t={t}
            onSelectHistory={teaching.selectHistory}
            onGoToHead={teaching.goToHead}
            onLink={setSourceLink}
          />
        )}
      </div>
      <footer className="lab-footer">
        <span>{t(mode === 'cpython' ? 'footerLeft' : 'footerTeaching')}</span>
        <span>{t('footerRight')}</span>
      </footer>
    </main>
  );
}
