import { useEffect, useState } from 'react';
import { sliceByCodePointOffset } from '../analysis/execution-trace';
import { sourceLineRange, type SourceLink, type SourcePositionIndex } from '../analysis/source-position';
import type { ExecutionResult, TraceEventType } from '../analysis/types';
import type { MessageKey } from '../locales';

interface ExecutionPanelProps {
  execution: ExecutionResult | null;
  sourcePositionIndex: SourcePositionIndex;
  t: (key: MessageKey) => string;
  onLink(link: SourceLink): void;
}

const eventMessages: Record<TraceEventType, MessageKey> = {
  call: 'traceCall',
  line: 'traceLine',
  exception: 'traceException',
  return: 'traceReturn',
};

function moduleLabel(name: string, t: (key: MessageKey) => string): string {
  return name === '<module>' ? t('moduleName') : name;
}

function eventStatus(execution: ExecutionResult, t: (key: MessageKey) => string): string {
  switch (execution.outcome) {
    case 'running': return t('executionRunning');
    case 'completed': return t('executionCompleted');
    case 'exception': return t('executionException');
    case 'stopped': return t('executionStopped');
    case 'timed-out': return t('executionTimedOut');
    case 'worker-error': return t('executionWorkerError');
  }
}

export function ExecutionPanel({ execution, sourcePositionIndex, t, onLink }: ExecutionPanelProps) {
  const [cursor, setCursor] = useState(0);
  const [followLatest, setFollowLatest] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const events = execution?.events ?? [];
  const lastIndex = Math.max(0, events.length - 1);

  useEffect(() => {
    setCursor(0);
    setFollowLatest(true);
    setPlaying(false);
  }, [execution?.requestId]);

  useEffect(() => {
    if (followLatest && events.length > 0) setCursor(events.length - 1);
  }, [events.length, followLatest]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setCursor((current) => Math.min(current + 1, lastIndex));
    }, Math.round(500 / speed));
    return () => window.clearInterval(timer);
  }, [lastIndex, playing, speed]);

  useEffect(() => {
    if (playing && cursor >= lastIndex) setPlaying(false);
  }, [cursor, lastIndex, playing]);

  if (!execution) return null;

  const replayReady = execution.outcome !== 'running' && events.length > 0;
  const current = events[Math.min(cursor, lastIndex)] ?? null;
  const eventText = current
    ? t(eventMessages[current.event])
    : t('emptyList');
  const stdout = current ? sliceByCodePointOffset(execution.stdout, current.stdoutOffset) : execution.stdout;
  const stderr = current ? sliceByCodePointOffset(execution.stderr, current.stderrOffset) : execution.stderr;
  const summary = current
    ? t('traceEvent').replace('{current}', String(current.index + 1)).replace('{total}', events.length.toLocaleString())
    : t('noExecution');
  const currentFunction = current ? moduleLabel(current.functionName, t) : '';
  const lineRange = current ? sourceLineRange(sourcePositionIndex, current.line) : null;

  function chooseEvent(nextIndex: number) {
    setPlaying(false);
    setFollowLatest(false);
    setCursor(Math.max(0, Math.min(nextIndex, lastIndex)));
  }

  function startPlayback() {
    if (!replayReady) return;
    if (cursor >= lastIndex) setCursor(0);
    setFollowLatest(false);
    setPlaying(true);
  }

  function locateCurrentLine() {
    if (!current || !lineRange) return;
    onLink({ origin: { kind: 'trace', index: current.index }, range: lineRange });
  }

  return (
    <section className="panel execution-panel" aria-labelledby="execution-heading">
      <div className="output-panel-heading">
        <h3 id="execution-heading">{t('executionTrace')}</h3>
        <span id="execution-status" className="execution-status" role="status">{eventStatus(execution, t)}</span>
      </div>
      {execution.outcome === 'stopped' || execution.outcome === 'timed-out' || execution.outcome === 'worker-error' ? (
        <p className="limit-notice" role="note">{t('partialExecution')}</p>
      ) : null}
      <div className="trace-toolbar">
        <span id="trace-event-count" className="small-meta">{t('traceEventCount').replace('{count}', events.length.toLocaleString())}</span>
        <button type="button" className="text-button" disabled={!current || !lineRange} onClick={locateCurrentLine}>{t('locateEventLine')}</button>
      </div>
      {execution.traceTruncated && <p className="limit-notice" role="status">{t('traceTruncated')}</p>}
      {execution.outputTruncated && <p className="limit-notice" role="status">{t('outputTruncated')}</p>}
      {current?.callStackTruncated && <p className="limit-notice" role="status">{t('stackTruncated')}</p>}
      {current?.localsTruncated && <p className="limit-notice" role="status">{t('localsTruncated')}</p>}

      <div className="trace-event-card" data-event={current?.event} data-line={current?.line} data-phase={current?.phase} aria-live={execution.outcome === 'running' ? 'off' : 'polite'} aria-atomic="true">
        <p id="trace-event-summary">{summary}</p>
        {current && (
          <>
            <strong>{eventText}</strong>
            <span>{currentFunction} · {t('line')} {current.line}</span>
            {current.returnValue && <code className="trace-return-value">{current.returnValue.type} · {current.returnValue.summary}</code>}
            {current.exception && (
              <span className="trace-exception-value">{current.exception.type}{current.exception.message ? ` · ${current.exception.message}` : ''}</span>
            )}
          </>
        )}
      </div>

      <div className="trace-playback" aria-label={t('executionTrace')}>
        <div className="trace-buttons">
          <button type="button" className="button button-secondary" aria-label={t('firstEvent')} disabled={!replayReady || cursor === 0} onClick={() => chooseEvent(0)}>⇤</button>
          <button type="button" className="button button-secondary" aria-label={t('previousEvent')} disabled={!replayReady || cursor === 0} onClick={() => chooseEvent(cursor - 1)}>←</button>
          <button type="button" className="button button-primary" aria-label={t(playing ? 'pausePlayback' : 'playPlayback')} disabled={!replayReady} onClick={() => playing ? setPlaying(false) : startPlayback()}>{playing ? 'Ⅱ' : '▶'}</button>
          <button type="button" className="button button-secondary" aria-label={t('nextEvent')} disabled={!replayReady || cursor >= lastIndex} onClick={() => chooseEvent(cursor + 1)}>→</button>
          <button type="button" className="button button-secondary" aria-label={t('lastEvent')} disabled={!replayReady || cursor >= lastIndex} onClick={() => chooseEvent(lastIndex)}>⇥</button>
        </div>
        <label className="trace-slider-label" htmlFor="trace-position">{t('eventPosition')}</label>
        <input
          id="trace-position"
          type="range"
          min="0"
          max={lastIndex}
          value={Math.min(cursor, lastIndex)}
          aria-label={t('eventPosition')}
          disabled={!replayReady}
          onChange={(event) => chooseEvent(Number(event.currentTarget.value))}
        />
        <label className="speed-label" htmlFor="trace-speed">{t('playbackSpeed')}</label>
        <select id="trace-speed" aria-label={t('playbackSpeed')} value={speed} disabled={!replayReady} onChange={(event) => setSpeed(Number(event.currentTarget.value))}>
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="2">2×</option>
          <option value="4">4×</option>
        </select>
      </div>

      <div className="trace-details-grid">
        <section aria-labelledby="call-stack-heading">
          <h4 id="call-stack-heading">{t('callStack')}</h4>
          {current?.callStack.length ? (
            <ol className="call-stack-list">
              {current.callStack.map((name, index) => <li key={`${index}-${name}`}>{moduleLabel(name, t)}</li>)}
            </ol>
          ) : <p className="empty-state">{t('emptyList')}</p>}
          {current?.locals.length ? (
            <>
              <h4>{t('currentLocals')}</h4>
              <dl className="trace-values">
                {current.locals.map((value) => (
                  <div key={value.name}>
                    <dt>{value.name}</dt>
                    <dd><span>{value.type}</span><code>{value.summary}</code></dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
        </section>
        <section className="trace-output" aria-label={t('standardOutput')}>
          <h4>{t('standardOutput')}</h4>
          <pre id="execution-output">{stdout}</pre>
          {stderr && <><h4>{t('standardError')}</h4><pre id="execution-stderr">{stderr}</pre></>}
          {execution.exception && (
            <div id="execution-exception" className="diagnostic">
              <strong>{t('finalException')}: {execution.exception.type}</strong>
              {execution.exception.message && <p>{execution.exception.message}</p>}
              {execution.exception.line !== null && <small>{t('line')} {execution.exception.line}</small>}
            </div>
          )}
          {execution.durationMs !== null && <p className="small-meta">{execution.durationMs.toLocaleString()} ms</p>}
        </section>
      </div>
    </section>
  );
}
