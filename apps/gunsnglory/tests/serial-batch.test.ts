import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchContent } from '../src/content/cow-gulch';
import { createExperiments, type ExperimentBatchRequest, type Experiments, type RunRequest, type RunResult } from '../src/experiments';
import { createGame, GAME_RULES_VERSION, type Game, type GameSession } from '../src/game';

interface TestBatchExecutor {
  run(request: RunRequest, options?: { signal?: AbortSignal }): Promise<RunResult>;
}

const scenario: ExperimentBatchRequest['scenario'] = {
  id: 'cow-gulch-single-wave',
  version: '1',
  gameScenarioId: cowGulchContent.id,
  contentVersion: cowGulchContent.contentVersion!,
  rulesVersion: GAME_RULES_VERSION,
  observationLevel: 'player-visible',
  decisionIntervalFrames: 1,
  deltaMs: 100,
  maxFrames: 2_000,
  maxSimulatedMs: 200_000,
  maxEntities: 100,
  maxWallClockMs: 30_000,
  yieldEveryFrames: 40,
};

function request(samples: ExperimentBatchRequest['samples'], scenarioOverride = {}): ExperimentBatchRequest {
  return {
    batchId: 'serial-batch',
    scenario: { ...scenario, ...scenarioOverride },
    samples,
    policy: { id: 'start-wave', version: '1' },
  };
}

function createBatchFixture(options: {
  onOpen?: () => void;
  onClose?: () => void;
  now?: () => number;
  yieldToHost?: () => Promise<void>;
  batchExecutor?: TestBatchExecutor;
} = {}) {
  const source = createGame({
    scenarios: { [cowGulchContent.id]: cowGulchContent },
    sessionIdSource: (() => {
      let nextId = 0;
      return () => `serial-batch-session-${++nextId}`;
    })(),
  });
  const game: Game = {
    prepare: (input) => source.prepare(input),
    replay: (input) => source.replay(input),
    open: async (input) => {
      const session = await source.open(input);
      options.onOpen?.();
      let closed = false;
      const close = session.close.bind(session);
      const wrapped: GameSession = {
        ...session,
        close() {
          if (closed) return;
          closed = true;
          close();
          options.onClose?.();
        },
      };
      return wrapped;
    },
  };
  const runtime = {
    ...(options.now ? { now: options.now } : {}),
    ...(options.yieldToHost ? { yieldToHost: options.yieldToHost } : {}),
  };
  return createExperiments({
    game,
    runtime,
    ...(options.batchExecutor ? { batchExecutor: options.batchExecutor } : {}),
    policies: [{
      id: 'start-wave',
      version: '1',
      create: () => ({
        decide: (observation) => observation.wave?.phase === 'not-started' ? [{ type: 'start-wave' }] : [],
      }),
    }],
  });
}

test('runs a batch serially in input order and preserves duplicate seeds as separate runs', async () => {
  let activeSessions = 0;
  let maximumActiveSessions = 0;
  const experiments = createBatchFixture({
    onOpen: () => {
      activeSessions += 1;
      maximumActiveSessions = Math.max(maximumActiveSessions, activeSessions);
    },
    onClose: () => { activeSessions -= 1; },
  });

  const report = await experiments.runBatch(request([
    { id: 'seed-42-first', randomSeed: 42 },
    { id: 'seed-42-repeat', randomSeed: 42 },
    { id: 'seed-43', randomSeed: 43 },
  ]));

  assert.equal(report.status, 'completed');
  assert.equal(report.plannedRunCount, 3);
  assert.equal(report.startedRunCount, 3);
  assert.equal(maximumActiveSessions, 1);
  assert.deepEqual(report.results.map(({ input }) => input.runId), [
    'serial-batch:seed-42-first',
    'serial-batch:seed-42-repeat',
    'serial-batch:seed-43',
  ]);
  assert.deepEqual(report.statusCounts, {
    completed: 3,
    cancelled: 0,
    'budget-exceeded': 0,
    failed: 0,
    'invalid-input': 0,
  });
  assert.deepEqual(report.results.map(({ result }) => result.outcome), ['victory', 'victory', 'victory']);
  assert.equal(report.results[0]?.result.metrics?.finalCash, report.results[1]?.result.metrics?.finalCash);
  assert.equal(report.failureInputs.length, 0);
  assert.equal(report.notStarted.length, 0);
});

test('runs a parallel batch through its executor within the requested bound and preserves serial results and order', async () => {
  const samples = [
    { id: 'seed-42', randomSeed: 42 },
    { id: 'seed-43', randomSeed: 43 },
    { id: 'seed-44', randomSeed: 44 },
    { id: 'seed-45', randomSeed: 45 },
  ];
  const serial = createBatchFixture();
  const expected = await serial.runBatch(request(samples));
  let activeRuns = 0;
  let maximumActiveRuns = 0;
  const parallel = createBatchFixture({
    batchExecutor: {
      run: async (runRequest, options) => {
        activeRuns += 1;
        maximumActiveRuns = Math.max(maximumActiveRuns, activeRuns);
        try {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return await serial.run(runRequest, options);
        } finally {
          activeRuns -= 1;
        }
      },
    },
  });

  const actual = await parallel.runBatch(request(samples), { maxConcurrency: 2 });

  assert.equal(actual.maxConcurrency, 2);
  assert.equal(maximumActiveRuns, 2);
  assert.deepEqual(actual.results.map(({ input }) => input.sample.id), samples.map(({ id }) => id));
  assert.deepEqual(actual.results.map(({ result }) => ({
    status: result.status,
    stopReason: result.stopReason,
    outcome: result.outcome,
    actions: result.actions,
    metrics: result.metrics && { ...result.metrics, wallClockMs: undefined },
  })), expected.results.map(({ result }) => ({
    status: result.status,
    stopReason: result.stopReason,
    outcome: result.outcome,
    actions: result.actions,
    metrics: result.metrics && { ...result.metrics, wallClockMs: undefined },
  })));
});

test('locates a thrown batch executor error to its original input and continues the queue', async () => {
  const samples = [
    { id: 'seed-42', randomSeed: 42 },
    { id: 'seed-43', randomSeed: 43 },
    { id: 'seed-44', randomSeed: 44 },
  ];
  const serial = createBatchFixture();
  const parallel = createBatchFixture({
    batchExecutor: {
      run: async (runRequest, options) => {
        if (runRequest.sample.id === 'seed-43') throw new Error('worker exited unexpectedly');
        return serial.run(runRequest, options);
      },
    },
  });

  const report = await parallel.runBatch(request(samples), { maxConcurrency: 2 });

  assert.equal(report.status, 'completed');
  assert.deepEqual(report.results.map(({ result }) => result.status), ['completed', 'failed', 'completed']);
  assert.equal(report.failureInputs.length, 1);
  assert.equal(report.failureInputs[0]?.input.runId, 'serial-batch:seed-43');
  assert.equal(report.failureInputs[0]?.stopReason, 'execution-error');
  assert.equal(report.results[1]?.result.error?.message, 'worker exited unexpectedly');
  assert.equal(report.notStarted.length, 0);
});

test('parallel cancellation drains active workers and reports queued inputs without starting them', async () => {
  const controller = new AbortController();
  const samples = [
    { id: 'seed-42', randomSeed: 42 },
    { id: 'seed-43', randomSeed: 43 },
    { id: 'seed-44', randomSeed: 44 },
    { id: 'seed-45', randomSeed: 45 },
  ];
  const serial = createBatchFixture();
  const started: string[] = [];
  const parallel = createBatchFixture({
    batchExecutor: {
      run: async (runRequest, options) => {
        started.push(runRequest.sample.id);
        if (started.length === 2) controller.abort('parallel-cancel');
        return serial.run(runRequest, options);
      },
    },
  });

  const report = await parallel.runBatch(request(samples), {
    signal: controller.signal,
    maxConcurrency: 2,
  });

  assert.equal(report.status, 'cancelled');
  assert.deepEqual(started, ['seed-42', 'seed-43']);
  assert.deepEqual(report.results.map(({ result }) => result.status), ['cancelled', 'cancelled']);
  assert.equal(report.statusCounts.cancelled, 2);
  assert.deepEqual(report.notStarted.map(({ input }) => input.sample.id), ['seed-44', 'seed-45']);
});

test('requires an executor only when multiple samples can actually run concurrently', async () => {
  const experiments = createBatchFixture();
  const oneSample = request([{ id: 'seed-42', randomSeed: 42 }]);
  const oneReport = await experiments.runBatch(oneSample, { maxConcurrency: 4 });
  assert.equal(oneReport.maxConcurrency, 1);

  await assert.rejects(
    experiments.runBatch(request([
      { id: 'seed-42', randomSeed: 42 },
      { id: 'seed-43', randomSeed: 43 },
    ]), { maxConcurrency: 2 }),
    /parallel batch execution is unavailable/i,
  );
  await assert.rejects(
    experiments.runBatch(oneSample, { maxConcurrency: 0 }),
    /maxConcurrency must be an integer/i,
  );
});

test('reports simulation budget exhaustion separately and keeps each failed input', async () => {
  const experiments = createBatchFixture();
  const report = await experiments.runBatch(request([
    { id: 'seed-42', randomSeed: 42 },
    { id: 'seed-43', randomSeed: 43 },
  ], { maxFrames: 1, yieldEveryFrames: 1 }));

  assert.equal(report.status, 'completed');
  assert.deepEqual(report.results.map(({ result }) => [result.status, result.stopReason]), [
    ['budget-exceeded', 'max-frames'],
    ['budget-exceeded', 'max-frames'],
  ]);
  assert.deepEqual(report.failureInputs.map(({ input, status, stopReason }) => [input.sample.randomSeed, status, stopReason]), [
    [42, 'budget-exceeded', 'max-frames'],
    [43, 'budget-exceeded', 'max-frames'],
  ]);
  assert.equal(report.notStarted.length, 0);
});

test('cancellation stops before the next run and exports every not-started input', async () => {
  const controller = new AbortController();
  let openCount = 0;
  const experiments = createBatchFixture({
    onOpen: () => { openCount += 1; },
    yieldToHost: async () => { controller.abort('test-cancel'); },
  });
  const report = await experiments.runBatch(request([
    { id: 'seed-42', randomSeed: 42 },
    { id: 'seed-43', randomSeed: 43 },
    { id: 'seed-44', randomSeed: 44 },
  ], { yieldEveryFrames: 1 }), { signal: controller.signal });

  assert.equal(report.status, 'cancelled');
  assert.equal(openCount, 1);
  assert.equal(report.results.length, 1);
  assert.equal(report.results[0]?.result.status, 'cancelled');
  assert.deepEqual(report.notStarted.map(({ input, reason }) => [input.sample.randomSeed, reason]), [
    [43, 'cancelled-before-start'],
    [44, 'cancelled-before-start'],
  ]);
  assert.equal(report.failureInputs[0]?.input.sample.randomSeed, 42);
});

test('keeps execution errors and invalid policy inputs distinct in the batch report', async () => {
  const experiments = createBatchFixture({ now: () => { throw new Error('clock exploded'); } });
  const report = await experiments.runBatch(request([
    { id: 'seed-42', randomSeed: 42 },
    { id: 'seed-43', randomSeed: 43 },
  ]));
  assert.deepEqual(report.results.map(({ result }) => [result.status, result.stopReason]), [
    ['failed', 'execution-error'],
    ['failed', 'execution-error'],
  ]);
  assert.equal(report.failureInputs.length, 2);

  const invalidPolicy = await createBatchFixture().runBatch({
    ...request([{ id: 'seed-44', randomSeed: 44 }]),
    policy: { id: 'start-wave', version: 'missing' },
  });
  assert.deepEqual(invalidPolicy.results.map(({ result }) => [result.status, result.stopReason]), [
    ['invalid-input', 'policy-version-mismatch'],
  ]);
  assert.equal(invalidPolicy.statusCounts['invalid-input'], 1);
  assert.equal(invalidPolicy.statusCounts.failed, 0);
});

test('rejects malformed batch input before opening any Game session', async () => {
  let openCount = 0;
  const experiments = createBatchFixture({ onOpen: () => { openCount += 1; } });
  const invalid = request([
    { id: 'duplicate', randomSeed: 42 },
    { id: 'duplicate', randomSeed: 43 },
  ]);

  await assert.rejects(experiments.runBatch(invalid), /batch request is invalid/i);
  assert.equal(openCount, 0);
});
