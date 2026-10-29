import { useEffect, useState } from 'react';
import { sliceByCodePointOffset } from '../analysis/execution-trace';
import { sourceLineRange, type SourceLink, type SourcePositionIndex } from '../analysis/source-position';
import { compareTraceSnapshots, type SnapshotChangeStatus } from '../analysis/snapshot-diff';
import type { ExecutionResult, SnapshotValue, TraceEvent, TraceEventType } from '../analysis/types';
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

const changeMessages: Record<SnapshotChangeStatus, MessageKey> = {
  added: 'snapshotChangeAdded',
  changed: 'snapshotChangeChanged',
  removed: 'snapshotChangeRemoved',
  unknown: 'snapshotChangeUnknown',
  unchanged: 'snapshotChangeUnchanged',
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

function SnapshotValueEntry({ value, t }: { value: SnapshotValue; t: (key: MessageKey) => string }) {
  return (
    <div data-variable-name={value.name} data-snapshot-kind={value.kind}>
      <dt>{value.name}</dt>
      <dd>
        <span>{value.type}</span>
        <code>{value.summary}</code>
        {value.kind === 'container' && (
          <details className="snapshot-container">
            <summary>{t('expandContainer').replace('{count}', String(value.itemCount ?? 0))}</summary>
            {value.children?.length ? (
              <dl className="trace-values snapshot-children">
                {value.children.map((child, index) => <SnapshotValueEntry key={`${index}-${child.name}`} value={child} t={t} />)}
              </dl>
            ) : <p className="empty-state">{t('emptyContainer')}</p>}
          </details>
        )}
        {value.kind === 'reference' && (
          <span className="snapshot-reference">{t('snapshotReference').replace('{id}', String(value.referenceId ?? ''))}</span>
        )}
        {value.truncated && <span className="snapshot-truncated-label">{t('valueTruncated')}</span>}
      </dd>
    </div>
  );
}

function SnapshotDiffView({
  previous,
  current,
  t,
}: {
  previous: TraceEvent | null;
  current: TraceEvent;
  t: (key: MessageKey) => string;
}) {
  const diff = compareTraceSnapshots(previous, current);
  const visibleChanges = diff.changes.filter((change) => change.status !== 'unchanged');
  return (
    <div className="snapshot-diff-view" data-testid="snapshot-diff">
      <p className="small-meta" id="snapshot-diff-context">
        {previous
          ? t('snapshotDiffContext')
            .replace('{previous}', String(previous.index + 1))
            .replace('{current}', String(current.index + 1))
          : t('snapshotBaseline')}
      </p>
      <p className="snapshot-diff-hint">{t('snapshotChangesIncludeAllFrames')}</p>
      {visibleChanges.length ? (
        <ol className="snapshot-diff-list">
          {visibleChanges.map((change, index) => (
            <li key={`${change.scope}-${change.frameId ?? 'global'}-${change.name}-${index}`} data-change-status={change.status}>
              <div className="snapshot-diff-title">
                <strong>{t(changeMessages[change.status])}</strong>
                {change.frameId !== null && change.frameName !== null && (
                  <span>{t('snapshotFrameLabel')
                    .replace('{name}', moduleLabel(change.frameName, t))
                    .replace('{id}', String(change.frameId))}</span>
                )}
                <code>{change.name}</code>
              </div>
              {(change.before || change.after) && (
                <div className="snapshot-diff-values">
                  {change.before && <p><span>{t('snapshotBeforeValue')}</span><code>{change.before.summary}</code></p>}
                  {change.after && <p><span>{t('snapshotAfterValue')}</span><code>{change.after.summary}</code></p>}
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : diff.baseline ? null : <p className="empty-state">{t('noSnapshotChanges')}</p>}
      {diff.truncated && <p className="limit-notice" role="status">{t('snapshotDiffTruncated')}</p>}
    </div>
  );
}

function SnapshotValueList({
  values,
  scope,
  t,
}: {
  values: SnapshotValue[];
  scope: 'globals' | 'locals';
  t: (key: MessageKey) => string;
}) {
  return (
    <dl className="trace-values" data-snapshot-scope={scope}>
      {values.map((value, index) => <SnapshotValueEntry key={`${index}-${value.name}`} value={value} t={t} />)}
    </dl>
  );
}

export function ExecutionPanel({ execution, sourcePositionIndex, t, onLink }: ExecutionPanelProps) {
  const [cursor, setCursor] = useState(0);
  const [followLatest, setFollowLatest] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const [snapshotView, setSnapshotView] = useState<'all' | 'changes'>('all');
  const events = execution?.events ?? [];
  const lastIndex = Math.max(0, events.length - 1);
  const current = events[Math.min(cursor, lastIndex)] ?? null;

  useEffect(() => {
    setCursor(0);
    setFollowLatest(true);
    setPlaying(false);
    setSnapshotView('all');
  }, [execution?.requestId]);

  useEffect(() => {
    if (followLatest && events.length > 0) setCursor(events.length - 1);
  }, [events.length, followLatest]);

  useEffect(() => {
    setSelectedFrameId(current?.snapshot.currentFrameId ?? null);
  }, [current?.index, current?.snapshot.currentFrameId, execution?.requestId]);

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
  const snapshot = current?.snapshot;
  const selectedFrame = snapshot?.frames.find((frame) => frame.frameId === selectedFrameId)
    ?? snapshot?.frames.find((frame) => frame.frameId === snapshot.currentFrameId)
    ?? null;
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
      {snapshot?.truncated && <p className="limit-notice" role="status">{t('snapshotTruncated')}</p>}
      {snapshot?.budgetExhausted && <p className="limit-notice" role="status">{t('snapshotBudgetExhausted')}</p>}
      {snapshot?.globalsTruncated && <p className="limit-notice" role="status">{t('globalsTruncated')}</p>}
      {selectedFrame?.localsTruncated && <p className="limit-notice" role="status">{t('localsTruncated')}</p>}

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
          <section className="snapshot-view" aria-labelledby="variable-snapshots-heading">
            <h4 id="variable-snapshots-heading">{t('variableSnapshots')}</h4>
            <div className="snapshot-view-toggle" role="group" aria-label={t('snapshotView')}>
              <button type="button" className="button button-secondary" aria-pressed={snapshotView === 'all'} onClick={() => setSnapshotView('all')}>
                {t('snapshotAllValues')}
              </button>
              <button type="button" className="button button-secondary" aria-pressed={snapshotView === 'changes'} onClick={() => setSnapshotView('changes')}>
                {t('snapshotAdjacentChanges')}
              </button>
            </div>
            {snapshotView === 'changes' && current ? (
              <SnapshotDiffView previous={cursor > 0 ? events[cursor - 1] ?? null : null} current={current} t={t} />
            ) : (
              <div className="snapshot-grid">
                <section aria-labelledby="global-values-heading">
                  <h5 id="global-values-heading">{t('globalValues')}</h5>
                  {snapshot?.globals.length ? (
                    <SnapshotValueList values={snapshot.globals} scope="globals" t={t} />
                  ) : <p className="empty-state">{t('noSnapshotValues')}</p>}
                </section>
                <section aria-labelledby="frame-values-heading">
                  <h5 id="frame-values-heading">{t('currentLocals')}</h5>
                  {snapshot?.frames.length ? (
                    <>
                      <label className="snapshot-frame-label">
                        <span>{t('frameSelector')}</span>
                        <select
                          aria-label={t('frameSelector')}
                          value={String(selectedFrame?.frameId ?? '')}
                          onChange={(event) => setSelectedFrameId(Number(event.currentTarget.value))}
                        >
                          {snapshot.frames.map((frame) => (
                            <option key={frame.frameId} value={frame.frameId}>
                              {t('frameOption')
                                .replace('{name}', moduleLabel(frame.functionName, t))
                                .replace('{id}', String(frame.frameId))
                                .replace('{line}', String(frame.line))}
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedFrame?.locals.length ? (
                        <SnapshotValueList values={selectedFrame.locals} scope="locals" t={t} />
                      ) : <p className="empty-state">{t('noSnapshotValues')}</p>}
                    </>
                  ) : <p className="empty-state">{t('noSnapshotValues')}</p>}
                </section>
              </div>
            )}
          </section>
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
