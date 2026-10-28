import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisResult, PythonDiagnostic, WorkerResponse } from './types';

export type AnalysisStatus = 'loading' | 'ready' | 'analyzing' | 'stopped' | 'failed';

export interface RuntimeInfo {
  pyodideVersion: string;
  pythonVersion: string;
}

export function usePyodideAnalysis() {
  const workerRef = useRef<Worker | null>(null);
  const sessionIdRef = useRef(0);
  const requestIdRef = useRef(0);
  const activeRequestIdRef = useRef<number | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('loading');
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [diagnostic, setDiagnostic] = useState<PythonDiagnostic | null>(null);

  const startWorker = useCallback(() => {
    workerRef.current?.terminate();
    activeRequestIdRef.current = null;
    setStatus('loading');
    setRuntime(null);
    setResult(null);
    setDiagnostic(null);

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
        if (message.requestId !== activeRequestIdRef.current) return;
        activeRequestIdRef.current = null;
        setResult(message.result);
        setDiagnostic(null);
        setStatus('ready');
        return;
      }
      if (message.requestId !== null && message.requestId !== activeRequestIdRef.current) return;
      activeRequestIdRef.current = null;
      setResult(null);
      setDiagnostic(message.error);
      setStatus(message.error.stage === 'runtime' ? 'failed' : 'ready');
    });

    worker.addEventListener('error', (event: ErrorEvent) => {
      if (workerRef.current !== worker || sessionIdRef.current !== sessionId) return;
      activeRequestIdRef.current = null;
      setResult(null);
      setDiagnostic({
        stage: 'runtime',
        type: 'WorkerError',
        message: event.message || 'The analysis worker stopped unexpectedly.',
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
  }, []);

  useEffect(() => {
    startWorker();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      activeRequestIdRef.current = null;
    };
  }, [startWorker]);

  const analyze = useCallback((source: string) => {
    const worker = workerRef.current;
    if (!worker || status !== 'ready') return;
    const requestId = ++requestIdRef.current;
    activeRequestIdRef.current = requestId;
    setResult(null);
    setDiagnostic(null);
    setStatus('analyzing');
    worker.postMessage({ type: 'analyze', sessionId: sessionIdRef.current, requestId, source });
  }, [status]);

  const cancel = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    sessionIdRef.current += 1;
    activeRequestIdRef.current = null;
    setRuntime(null);
    setResult(null);
    setDiagnostic(null);
    setStatus('stopped');
  }, []);

  const clearOutput = useCallback(() => {
    setResult(null);
    setDiagnostic(null);
  }, []);

  return {
    status,
    runtime,
    result,
    diagnostic,
    analyze,
    cancel,
    retry: startWorker,
    restart: startWorker,
    clearOutput,
  };
}
