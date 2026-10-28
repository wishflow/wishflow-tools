import { parentPort, workerData } from 'node:worker_threads';
import { createCowGulchExperiments } from './cow-gulch-experiment';
import type { RunRequest } from './index';

const port = parentPort;
if (!port) throw new Error('Batch worker requires a parent thread');

const request = workerData as RunRequest;
const abortController = new AbortController();
port.on('message', (message: unknown) => {
  if (message && typeof message === 'object' && 'type' in message && message.type === 'abort') {
    abortController.abort();
  }
});

void createCowGulchExperiments(undefined, `batch-worker-${request.runId}`)
  .run(request, { signal: abortController.signal }).then(
  (result) => port.postMessage({ type: 'result', result }),
  (error: unknown) => port.postMessage({
    type: 'error',
    error: {
      name: error instanceof Error ? error.name : 'Error',
      message: (error instanceof Error ? error.message : String(error)).slice(0, 512),
    },
  }),
);
