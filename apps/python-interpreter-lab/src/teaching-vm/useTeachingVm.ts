import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  TeachingCompileResult,
  TeachingDiagnosticSnapshot,
  TeachingVmHistory,
  TeachingVmSnapshot,
} from './types';
import { DEFAULT_TEACHING_RUN_SPEED, MAX_BREAKPOINT_COUNT, MAX_HISTORY_CONTAINER_RECORDS, MAX_HISTORY_SNAPSHOTS, type TeachingRunSpeed } from './resource-limits';
import type { TeachingHistoryUpdate, TeachingWorkerIdentity, TeachingWorkerRequest, TeachingWorkerResponse } from './worker-protocol';
import type { TeachingSourceStepMode } from './source-step';

export type TeachingStatus = 'loading' | 'ready' | 'compiling' | 'running' | 'paused' | 'finished' | 'error';

const EMPTY_HISTORY: TeachingVmHistory = Object.freeze({ items: Object.freeze([]), truncated: false });
let nextSessionId = 0;

export function useTeachingVm() {
  const workerRef = useRef<Worker | null>(null);
  const sessionIdRef = useRef(0);
  const sourceRevisionRef = useRef(0);
  const workerReadyRef = useRef(false);
  const historyRef = useRef(EMPTY_HISTORY);
  const breakpointsRef = useRef({ sourceLines: [] as number[], instructionIndexes: [] as number[] });
  const [status, setStatus] = useState<TeachingStatus>('loading');
  const [runSpeed, setRunSpeedState] = useState<TeachingRunSpeed>(DEFAULT_TEACHING_RUN_SPEED);
  const [program, setProgram] = useState<TeachingCompileResult | null>(null);
  const [history, setHistory] = useState<TeachingVmHistory>(EMPTY_HISTORY);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [diagnostic, setDiagnostic] = useState<TeachingDiagnosticSnapshot | null>(null);
  const [sourceBreakpointLines, setSourceBreakpointLines] = useState<readonly number[]>([]);
  const [instructionBreakpointIndexes, setInstructionBreakpointIndexes] = useState<readonly number[]>([]);

  const replaceBreakpoints = useCallback((sourceLines: readonly number[], instructionIndexes: readonly number[]) => {
    const next = {
      sourceLines: [...sourceLines].sort((left, right) => left - right),
      instructionIndexes: [...instructionIndexes].sort((left, right) => left - right),
    };
    breakpointsRef.current = next;
    setSourceBreakpointLines(next.sourceLines);
    setInstructionBreakpointIndexes(next.instructionIndexes);
  }, []);

  const receiveHistoryUpdate = useCallback((update: TeachingHistoryUpdate) => {
    const next = applyHistoryUpdate(historyRef.current, update);
    historyRef.current = next;
    setHistory(next);
    setHistoryCursor((cursor) => cursor !== null && next.items.some(({ stepIndex }) => stepIndex === cursor)
      ? cursor
      : null);
  }, []);

  const sessionIdentity = useCallback((): TeachingWorkerIdentity => ({
    sessionId: sessionIdRef.current,
    sourceRevision: sourceRevisionRef.current,
  }), []);

  useEffect(() => {
    const sessionId = ++nextSessionId;
    sessionIdRef.current = sessionId;
    sourceRevisionRef.current = 0;
    workerReadyRef.current = false;

    const worker = new Worker(new URL('../worker/teaching-vm.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.addEventListener('message', (event: MessageEvent<TeachingWorkerResponse>) => {
      if (workerRef.current !== worker) return;
      const message = event.data;
      if (message.sessionId !== sessionIdRef.current || message.sourceRevision !== sourceRevisionRef.current) return;

      if (message.type === 'ready') {
        workerReadyRef.current = true;
        setStatus('ready');
        return;
      }
      if (message.type === 'invalidated') {
        workerReadyRef.current = true;
        setStatus('ready');
        return;
      }
      if (message.type === 'compiled') {
        setProgram(message.program);
        receiveHistoryUpdate(message.historyUpdate);
        setHistoryCursor(null);
        setDiagnostic(null);
        replaceBreakpoints([], []);
        setStatus('ready');
        return;
      }
      if (message.type === 'breakpoints-updated') {
        replaceBreakpoints(message.sourceLines, message.instructionIndexes);
        return;
      }
      if (message.type === 'run-started') {
        receiveHistoryUpdate(message.historyUpdate);
        setStatus(message.snapshot.status);
        return;
      }
      if (message.type === 'error') {
        setDiagnostic(message.diagnostic);
        setStatus('error');
        return;
      }
      if (message.type === 'worker-error') {
        setDiagnostic({
          stage: 'runtime',
          code: 'worker-error',
          message: message.message,
          span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
        });
        setStatus('error');
        return;
      }

      receiveHistoryUpdate(message.historyUpdate);
      if (message.type === 'snapshot' || message.type === 'paused' || message.type === 'run-complete' || message.type === 'run-batch') {
        setDiagnostic(message.snapshot.diagnostic);
        setStatus(message.snapshot.status);
      }
    });

    worker.addEventListener('error', (event: ErrorEvent) => {
      if (workerRef.current !== worker || sessionIdRef.current !== sessionId) return;
      setDiagnostic({
        stage: 'runtime',
        code: 'worker-error',
        message: event.message || 'Teaching VM worker stopped unexpectedly.',
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      });
      setStatus('error');
      worker.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
    });

    worker.postMessage({ type: 'init', sessionId, sourceRevision: 0 } satisfies TeachingWorkerRequest);
    return () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      workerReadyRef.current = false;
    };
  }, [receiveHistoryUpdate, replaceBreakpoints]);

  const invalidate = useCallback(() => {
    const identity = { ...sessionIdentity(), sourceRevision: sourceRevisionRef.current + 1 };
    sourceRevisionRef.current = identity.sourceRevision;
    setProgram(null);
    historyRef.current = EMPTY_HISTORY;
    setHistory(EMPTY_HISTORY);
    setHistoryCursor(null);
    setDiagnostic(null);
    replaceBreakpoints([], []);
    setStatus(workerReadyRef.current ? 'ready' : 'loading');
    workerRef.current?.postMessage({ type: 'invalidate', ...identity } satisfies TeachingWorkerRequest);
  }, [replaceBreakpoints, sessionIdentity]);

  const compile = useCallback((source: string) => {
    const worker = workerRef.current;
    if (!worker || !workerReadyRef.current) return;
    const identity = { ...sessionIdentity(), sourceRevision: sourceRevisionRef.current + 1 };
    sourceRevisionRef.current = identity.sourceRevision;
    setProgram(null);
    historyRef.current = EMPTY_HISTORY;
    setHistory(EMPTY_HISTORY);
    setHistoryCursor(null);
    setDiagnostic(null);
    replaceBreakpoints([], []);
    setStatus('compiling');
    worker.postMessage({ type: 'compile', ...identity, source } satisfies TeachingWorkerRequest);
  }, [replaceBreakpoints, sessionIdentity]);

  const updateBreakpoints = useCallback((sourceLines: readonly number[], instructionIndexes: readonly number[]) => {
    const worker = workerRef.current;
    if (!worker || !program || sourceLines.length + instructionIndexes.length > MAX_BREAKPOINT_COUNT) return;
    const nextSourceLines = [...new Set(sourceLines)].sort((left, right) => left - right);
    const nextInstructionIndexes = [...new Set(instructionIndexes)].sort((left, right) => left - right);
    if (nextSourceLines.length + nextInstructionIndexes.length > MAX_BREAKPOINT_COUNT) return;
    replaceBreakpoints(nextSourceLines, nextInstructionIndexes);
    worker.postMessage({
      type: 'set-breakpoints',
      ...sessionIdentity(),
      sourceLines: nextSourceLines,
      instructionIndexes: nextInstructionIndexes,
    } satisfies TeachingWorkerRequest);
  }, [program, replaceBreakpoints, sessionIdentity]);

  const toggleSourceBreakpoint = useCallback((line: number) => {
    const current = breakpointsRef.current;
    const sourceLines = current.sourceLines.includes(line)
      ? current.sourceLines.filter((candidate) => candidate !== line)
      : [...current.sourceLines, line];
    updateBreakpoints(sourceLines, current.instructionIndexes);
  }, [updateBreakpoints]);

  const toggleInstructionBreakpoint = useCallback((instructionIndex: number) => {
    const current = breakpointsRef.current;
    const instructionIndexes = current.instructionIndexes.includes(instructionIndex)
      ? current.instructionIndexes.filter((candidate) => candidate !== instructionIndex)
      : [...current.instructionIndexes, instructionIndex];
    updateBreakpoints(current.sourceLines, instructionIndexes);
  }, [updateBreakpoints]);

  const step = useCallback(() => {
    if (!program || !isAtHead(history, historyCursor) || (status !== 'ready' && status !== 'paused')) return;
    workerRef.current?.postMessage({ type: 'step', ...sessionIdentity() } satisfies TeachingWorkerRequest);
  }, [history, historyCursor, program, sessionIdentity, status]);

  const stepSource = useCallback((mode: TeachingSourceStepMode) => {
    const worker = workerRef.current;
    if (!worker || !program || !isAtHead(history, historyCursor) || (status !== 'ready' && status !== 'paused')) return;
    setStatus('running');
    worker.postMessage({ type: 'step-source', mode, ...sessionIdentity() } satisfies TeachingWorkerRequest);
  }, [history, historyCursor, program, sessionIdentity, status]);

  const run = useCallback(() => {
    const worker = workerRef.current;
    if (!worker || !program || (status !== 'ready' && status !== 'paused')) return;
    setHistoryCursor(null);
    setStatus('running');
    worker.postMessage({ type: 'run', speed: runSpeed, ...sessionIdentity() } satisfies TeachingWorkerRequest);
  }, [program, runSpeed, sessionIdentity, status]);

  const setRunSpeed = useCallback((speed: TeachingRunSpeed) => {
    setRunSpeedState(speed);
    workerRef.current?.postMessage({ type: 'set-run-speed', speed, ...sessionIdentity() } satisfies TeachingWorkerRequest);
  }, [sessionIdentity]);

  const pause = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;
    worker.postMessage({ type: 'pause', ...sessionIdentity() } satisfies TeachingWorkerRequest);
  }, [sessionIdentity]);

  const reset = useCallback(() => {
    if (!program) return;
    setDiagnostic(null);
    setHistoryCursor(null);
    workerRef.current?.postMessage({ type: 'reset', ...sessionIdentity() } satisfies TeachingWorkerRequest);
  }, [program, sessionIdentity]);

  const headSnapshot = history.items.at(-1) ?? null;
  const snapshot = historyCursor === null
    ? headSnapshot
    : history.items.find((item) => item.stepIndex === historyCursor) ?? headSnapshot;
  const atHead = isAtHead(history, historyCursor);

  const selectHistory = useCallback((stepIndex: number) => {
    if (history.items.some((item) => item.stepIndex === stepIndex)) setHistoryCursor(stepIndex);
  }, [history]);

  const goToHead = useCallback(() => setHistoryCursor(null), []);

  return {
    status,
    runSpeed,
    program,
    history,
    snapshot,
    headSnapshot,
    historyCursor,
    atHead,
    diagnostic,
    sourceBreakpointLines,
    instructionBreakpointIndexes,
    compile,
    step,
    stepSource,
    run,
    setRunSpeed,
    pause,
    reset,
    invalidate,
    selectHistory,
    goToHead,
    toggleSourceBreakpoint,
    toggleInstructionBreakpoint,
  };
}

function isAtHead(history: TeachingVmHistory, cursor: number | null): boolean {
  const head = history.items.at(-1);
  return head === undefined || cursor === null || cursor === head.stepIndex;
}

function applyHistoryUpdate(current: TeachingVmHistory, update: TeachingHistoryUpdate): TeachingVmHistory {
  if (update.kind === 'replace') return update.history;

  const items = [...current.items];
  if (update.kind === 'append') {
    items.push(...update.items);
  } else if (items.length > 0 && items[items.length - 1]?.stepIndex === update.snapshot.stepIndex) {
    items[items.length - 1] = update.snapshot;
  } else {
    items.push(update.snapshot);
  }

  let retainedContainerRecords = items.reduce((total, snapshot) => total + countSnapshotContainerRecords(snapshot), 0);
  let exceededLimit = false;
  while (items.length > 1 && (
    items.length > MAX_HISTORY_SNAPSHOTS
    || retainedContainerRecords > MAX_HISTORY_CONTAINER_RECORDS
  )) {
    const removed = items.shift();
    if (removed) retainedContainerRecords -= countSnapshotContainerRecords(removed);
    exceededLimit = true;
  }
  return Object.freeze({
    items: Object.freeze(items),
    truncated: current.truncated || update.truncated || exceededLimit,
  });
}

function countSnapshotContainerRecords(snapshot: TeachingVmSnapshot): number {
  return snapshot.heap.reduce((total, object) => total + 1 + (
    object.type === 'list' ? object.items.length : object.entries.length
  ), 0);
}
