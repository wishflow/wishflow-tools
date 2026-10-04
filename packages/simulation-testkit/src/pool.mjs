import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const workerUrl = new URL('./worker.mjs', import.meta.url);

function scenarioWorkerArgs() {
  const forwarded = [];
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (['--import', '--require', '--loader', '--conditions'].includes(argument)) {
      forwarded.push(argument, process.execArgv[index + 1]);
      index += 1;
    } else if (/^--(?:import|require|loader|conditions)=/.test(argument)) {
      forwarded.push(argument);
    }
  }
  return forwarded;
}

function stableId(index, task) {
  return task.id ?? `scenario-${String(index + 1).padStart(6, '0')}-${encodeURIComponent(task.seed).slice(0, 32)}`;
}

function asErrorRecord(error) {
  return {
    name: error?.name ?? 'Error',
    message: error?.message ?? String(error),
    ...(error?.stack ? { stack: error.stack } : {}),
  };
}

export class SimulationScenario {
  constructor(pool) {
    this.pool = pool;
  }

  run(config, seed, sampleOptions = {}, id) {
    return this.pool.runBatch([{ config, seed, sampleOptions, ...(id ? { id } : {}) }]).then(([outcome]) => outcome);
  }

  runBatch(tasks) {
    return this.pool.runBatch(tasks);
  }
}

export class SimulationWorkerPool {
  constructor({ size, scenario, workerExecArgv = scenarioWorkerArgs() }) {
    if (!Number.isInteger(size) || size < 1) throw new RangeError('Worker pool size must be a positive integer.');
    if (!scenario?.moduleUrl) throw new TypeError('A scenario adapter moduleUrl is required.');
    this.size = size;
    this.scenario = { moduleUrl: scenario.moduleUrl, exportName: scenario.exportName ?? 'runScenario' };
    this.workerExecArgv = workerExecArgv;
    this.workers = [];
    this.queue = [];
    this.nextSequence = 0;
    this.closing = false;
    this.closed = false;
    this.closeWaiters = [];
    for (let index = 0; index < size; index += 1) this.spawnWorker(index);
  }

  createScenario() {
    return new SimulationScenario(this);
  }

  runBatch(tasks) {
    if (this.closing || this.closed) return Promise.reject(new Error('Simulation worker pool is closing.'));
    if (!Array.isArray(tasks)) return Promise.reject(new TypeError('tasks must be an array.'));
    const jobs = tasks.map((task, index) => {
      const id = stableId(this.nextSequence + index, task);
      return new Promise((resolve) => {
        this.queue.push({ id, sequence: this.nextSequence + index, task, resolve });
      });
    });
    this.nextSequence += tasks.length;
    this.dispatch();
    return Promise.all(jobs);
  }

  async close() {
    if (this.closed) return;
    this.closing = true;
    if (this.queue.length === 0 && this.workers.every((slot) => !slot.job)) {
      await this.terminateWorkers();
      return;
    }
    await new Promise((resolve) => this.closeWaiters.push(resolve));
  }

  spawnWorker(index) {
    if (this.closing || this.closed) return;
    const worker = new Worker(fileURLToPath(workerUrl), {
      execArgv: this.workerExecArgv,
    });
    const slot = { index, worker, job: null, stopping: false };
    this.workers[index] = slot;
    worker.on('message', (message) => {
      if (!slot.job || message.id !== slot.job.id) return;
      const job = slot.job;
      slot.job = null;
      if (message.status === 'succeeded') {
        job.resolve({ id: job.id, status: 'succeeded', config: job.task.config, seed: job.task.seed, result: message.result });
      } else {
        job.resolve({ id: job.id, status: 'failed', config: job.task.config, seed: job.task.seed, error: message.error });
      }
      this.dispatch();
      this.finishCloseIfDrained();
    });
    worker.on('error', (error) => {
      if (!slot.job) return;
      const job = slot.job;
      slot.job = null;
      job.resolve({ id: job.id, status: 'failed', config: job.task.config, seed: job.task.seed, error: asErrorRecord(error) });
    });
    worker.on('exit', (code) => {
      if (slot.job) {
        const job = slot.job;
        slot.job = null;
        job.resolve({
          id: job.id,
          status: 'failed',
          config: job.task.config,
          seed: job.task.seed,
          error: { name: 'WorkerExitError', message: `Scenario worker exited with code ${code}; job was not retried.` },
        });
      }
      if (this.workers[index] === slot && !slot.stopping && !this.closing) this.spawnWorker(index);
      this.dispatch();
      this.finishCloseIfDrained();
    });
  }

  dispatch() {
    if (this.closing && this.queue.length === 0) return this.finishCloseIfDrained();
    for (const slot of this.workers) {
      if (!slot || slot.job || slot.stopping || !this.queue.length) continue;
      const job = this.queue.shift();
      slot.job = job;
      try {
        slot.worker.postMessage({
          id: job.id,
          scenario: this.scenario,
          config: job.task.config,
          seed: job.task.seed,
          sampleOptions: job.task.sampleOptions ?? {},
        });
      } catch (error) {
        slot.job = null;
        job.resolve({ id: job.id, status: 'failed', config: job.task.config, seed: job.task.seed, error: asErrorRecord(error) });
        queueMicrotask(() => this.dispatch());
      }
    }
  }

  finishCloseIfDrained() {
    if (!this.closing || this.queue.length || this.workers.some((slot) => slot?.job)) return;
    void this.terminateWorkers();
  }

  async terminateWorkers() {
    if (this.closed) return;
    this.closed = true;
    await Promise.all(this.workers.filter(Boolean).map(async (slot) => {
      slot.stopping = true;
      await slot.worker.terminate();
    }));
    for (const resolve of this.closeWaiters.splice(0)) resolve();
  }
}
