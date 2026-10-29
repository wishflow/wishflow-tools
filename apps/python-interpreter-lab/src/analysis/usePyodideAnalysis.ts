import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisResult, ExecutionResult, PythonDiagnostic, WorkerResponse } from './types';

export const EXECUTION_TIMEOUT_MS = 5_000;

export type AnalysisStatus = 'loading' | 'ready' | 'analyzing' | 'running' | 'stopped' | 'failed';

export interface RuntimeInfo {
  pyodideVersion: string;
  pythonVersion: string;
}

type ActiveRequest = { type: 'analyze' | 'execute'; requestId: number } | null;

export function usePyodideAnalysis() {
  const workerRef = useRef<Worker | null>(null);
  const sessionIdRef = useRef(0);
  const requestIdRef = useRef(0);
  const activeRequestRef = useRef<ActiveRequest>(null);
  const executionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executionStartedAtRef = useRef<number | null>(null);
  const executionRef = useRef<ExecutionResult | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('loading');
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const [diagnostic, setDiagnostic] = useState<PythonDiagnostic | null>(null);

  const clearExecutionTimer = useCallback(() => {
    if (executionTimerRef.current !== null) {
      clearTimeout(executionTimerRef.current);
      executionTimerRef.current = null;
    }
  }, []);

  const updateExecution = useCallback((next: ExecutionResult | null) => {
    executionRef.current = next;
    setExecution(next);
  }, []);

  const startWorker = useCallback((preserveOutput = false) => {
    clearExecutionTimer();
    workerRef.current?.terminate();
    activeRequestRef.current = null;
    executionStartedAtRef.current = null;
    setStatus('loading');
    setRuntime(null);
    if (!preserveOutput) {
      setResult(null);
      setDiagnostic(null);
      updateExecution(null);
    }

    const sessionId = ++sessionIdRef.current;
    const worker = new Worker(new URL('../worker/pyodide.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      if (workerRef.current !== worker || event.data.sessionId !== sessionId) return;
      const message = event.data;
      if (message.type === 'ready') {
        setRuntime({ pyodideVersion: message.pyodideVersion, pythonVersion: message.pythonVersion });
        setStatus('ready');
        return;
      }
      if (message.type === 'analysis') {
        const active = activeRequestRef.current;
        if (active?.type !== 'analyze' || message.requestId !== active.requestId) return;
        activeRequestRef.current = null;
        setResult(message.result);
        setDiagnostic(null);
        setStatus('ready');
        return;
      }
      if (message.type === 'execution-batch') {
        const active = activeRequestRef.current;
        const current = executionRef.current;
        if (active?.type !== 'execute' || message.requestId !== active.requestId || current?.requestId !== active.requestId) return;
        updateExecution({
          ...current,
          events: [...current.events, ...message.events],
          stdout: current.stdout + message.stdout,
          stderr: current.stderr + message.stderr,
        });
        return;
      }
      if (message.type === 'execution-complete') {
        const active = activeRequestRef.current;
        const current = executionRef.current;
        if (active?.type !== 'execute' || message.requestId !== active.requestId || current?.requestId !== active.requestId) return;
        clearExecutionTimer();
        activeRequestRef.current = null;
        executionStartedAtRef.current = null;
        updateExecution({
          ...current,
          ...message.result,
          requestId: message.requestId,
          events: current.events,
        });
        setDiagnostic(null);
        setStatus('ready');
        return;
      }

      const active = activeRequestRef.current;
      if (message.requestId !== null && message.requestId !== active?.requestId) return;
      if (active?.type === 'execute' && executionRef.current?.requestId === active.requestId) {
        clearExecutionTimer();
        activeRequestRef.current = null;
        executionStartedAtRef.current = null;
        updateExecution({
          ...executionRef.current,
          outcome: 'worker-error',
          durationMs: null,
        });
      } else {
        activeRequestRef.current = null;
        setResult(null);
      }
      setDiagnostic(message.error);
      setStatus(message.error.stage === 'runtime' ? 'failed' : 'ready');
    });

    worker.addEventListener('error', (event: ErrorEvent) => {
      if (workerRef.current !== worker || sessionIdRef.current !== sessionId) return;
      clearExecutionTimer();
      const active = activeRequestRef.current;
      activeRequestRef.current = null;
      if (active?.type === 'execute' && executionRef.current?.requestId === active.requestId) {
        updateExecution({ ...executionRef.current, outcome: 'worker-error', durationMs: null });
      }
      setDiagnostic({
        stage: 'runtime',
        type: 'WorkerError',
        message: event.message || 'The Python worker stopped unexpectedly.',
        line: null,
        column: null,
        endLine: null,
        endColumn: null,
      });
      setStatus('failed');
      worker.terminate();
      workerRef.current = null;
    });

    worker.postMessage({ type: 'init', sessionId });
  }, [clearExecutionTimer, updateExecution]);

  useEffect(() => {
    startWorker();
    return () => {
      clearExecutionTimer();
      workerRef.current?.terminate();
      workerRef.current = null;
      activeRequestRef.current = null;
    };
  }, [clearExecutionTimer, startWorker]);

  const analyze = useCallback((source: string) => {
    const worker = workerRef.current;
    if (!worker || status !== 'ready') return;
    const requestId = ++requestIdRef.current;
    activeRequestRef.current = { type: 'analyze', requestId };
    setResult(null);
    setDiagnostic(null);
    setStatus('analyzing');
    worker.postMessage({ type: 'analyze', sessionId: sessionIdRef.current, requestId, source });
  }, [status]);

  const run = useCallback((source: string) => {
    const worker = workerRef.current;
    if (!worker || status !== 'ready') return;
    const requestId = ++requestIdRef.current;
    const startedAt = performance.now();
    activeRequestRef.current = { type: 'execute', requestId };
    executionStartedAtRef.current = startedAt;
    updateExecution({
      requestId,
      outcome: 'running',
      events: [],
      traceTruncated: false,
      stdout: '',
      stderr: '',
      outputTruncated: false,
      durationMs: null,
      exception: null,
    });
    setDiagnostic(null);
    setStatus('running');
    executionTimerRef.current = setTimeout(() => {
      const active = activeRequestRef.current;
      if (active?.type !== 'execute' || active.requestId !== requestId) return;
      workerRef.current?.terminate();
      workerRef.current = null;
      activeRequestRef.current = null;
      executionTimerRef.current = null;
      executionStartedAtRef.current = null;
      setRuntime(null);
      setStatus('stopped');
      updateExecution({
        ...(executionRef.current as ExecutionResult),
        outcome: 'timed-out',
        durationMs: Math.round(performance.now() - startedAt),
      });
    }, EXECUTION_TIMEOUT_MS);
    worker.postMessage({ type: 'execute', sessionId: sessionIdRef.current, requestId, source });
  }, [status, updateExecution]);

  const stopExecution = useCallback(() => {
    const active = activeRequestRef.current;
    if (active?.type !== 'execute') return;
    clearExecutionTimer();
    workerRef.current?.terminate();
    workerRef.current = null;
    activeRequestRef.current = null;
    setRuntime(null);
    setStatus('stopped');
    updateExecution({
      ...(executionRef.current as ExecutionResult),
      outcome: 'stopped',
      durationMs: executionStartedAtRef.current === null
        ? null
        : Math.round(performance.now() - executionStartedAtRef.current),
    });
    executionStartedAtRef.current = null;
  }, [clearExecutionTimer, updateExecution]);

  const cancel = useCallback(() => {
    clearExecutionTimer();
    workerRef.current?.terminate();
    workerRef.current = null;
    sessionIdRef.current += 1;
    activeRequestRef.current = null;
    setRuntime(null);
    setResult(null);
    setDiagnostic(null);
    setStatus('stopped');
  }, [clearExecutionTimer]);

  const clearOutput = useCallback(() => {
    setResult(null);
    setDiagnostic(null);
  }, []);

  const clearExecution = useCallback(() => updateExecution(null), [updateExecution]);
  const retry = useCallback(() => {
    setDiagnostic(null);
    startWorker(true);
  }, [startWorker]);
  const restart = useCallback(() => startWorker(), [startWorker]);

  return {
    status,
    runtime,
    result,
    execution,
    diagnostic,
    analyze,
    run,
    stopExecution,
    cancel,
    retry,
    restart,
    clearOutput,
    clearExecution,
  };
}
