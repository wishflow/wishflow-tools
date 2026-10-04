import { parentPort } from 'node:worker_threads';

const modules = new Map();

parentPort.on('message', async (job) => {
  try {
    const key = `${job.scenario.moduleUrl}#${job.scenario.exportName}`;
    let module = modules.get(key);
    if (!module) {
      module = await import(job.scenario.moduleUrl);
      modules.set(key, module);
    }
    const isolated = typeof module.createScenario === 'function'
      ? await module.createScenario(job.config, job.seed, job.sampleOptions)
      : null;
    const runner = typeof isolated === 'function'
      ? isolated
      : isolated?.runScenario ?? isolated?.run ?? isolated?.[job.scenario.exportName] ?? module[job.scenario.exportName];
    if (typeof runner !== 'function') throw new TypeError(`Scenario export ${job.scenario.exportName} is not a function.`);
    const result = await runner.call(isolated ?? module, job.config, job.seed, job.sampleOptions);
    parentPort.postMessage({ id: job.id, status: 'succeeded', result });
  } catch (error) {
    parentPort.postMessage({
      id: job.id,
      status: 'failed',
      error: {
        name: error?.name ?? 'Error',
        message: error?.message ?? String(error),
        ...(error?.stack ? { stack: error.stack } : {}),
      },
    });
  }
});
