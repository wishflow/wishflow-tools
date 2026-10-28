import { Worker } from 'node:worker_threads';
import type { RunRequest, RunResult } from './index';

export interface NodeBatchExecutor {
  run(request: RunRequest, options?: { signal?: AbortSignal }): Promise<RunResult>;
}

interface WorkerMessage {
  type: 'result' | 'error';
  result?: RunResult;
  error?: { name: string; message: string };
}

function isWorkerMessage(value: unknown): value is WorkerMessage {
  return typeof value === 'object' && value !== null && 'type' in value
    && ((value as { type: unknown }).type === 'result' || (value as { type: unknown }).type === 'error');
}

export function createNodeBatchExecutor(): NodeBatchExecutor {
  return {
    run(request, options = {}) {
      return new Promise<RunResult>((resolve, reject) => {
        const worker = new Worker(new URL('./node-batch-worker.ts', import.meta.url), {
          execArgv: ['--import', 'tsx'],
          workerData: request,
        });
        let settled = false;
        const onAbort = () => {
          try {
            worker.postMessage({ type: 'abort' });
          } catch {
            // The worker can exit between the signal and its message delivery.
          }
        };
        const cleanup = () => options.signal?.removeEventListener('abort', onAbort);
        const finish = (complete: () => void) => {
          if (settled) return;
          settled = true;
          cleanup();
          void worker.terminate().then(complete, complete);
        };

        worker.once('message', (message: unknown) => {
          if (!isWorkerMessage(message)) {
            finish(() => reject(new Error('Batch worker returned an invalid message')));
            return;
          }
          if (message.type === 'result' && message.result) {
            finish(() => resolve(message.result!));
            return;
          }
          const workerError = message.error;
          finish(() => reject(new Error(workerError ? `${workerError.name}: ${workerError.message}` : 'Batch worker failed')));
        });
        worker.once('error', (error) => finish(() => reject(error)));
        worker.once('exit', (code) => {
          if (!settled) finish(() => reject(new Error(`Batch worker exited before returning a result (code ${code})`)));
        });

        if (options.signal?.aborted) onAbort();
        else options.signal?.addEventListener('abort', onAbort, { once: true });
      });
    },
  };
}
