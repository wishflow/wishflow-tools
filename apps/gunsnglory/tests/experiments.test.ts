import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchContent } from '../src/content/cow-gulch';
import { cowGulchDefeatContent } from '../src/content/cow-gulch-defeat';
import { createGame, GAME_RULES_VERSION, type Game } from '../src/game';
import { createExperiments, type ControlPolicy, type RunRequest, type StrategyObservation } from '../src/experiments';

const policy: ControlPolicy = {
  id: 'start-wave',
  version: '1',
  create() {
    return {
      decide(observation) {
        return observation.wave?.phase === 'not-started' ? [{ type: 'start-wave' }] : [];
      },
    };
  },
};

function request(overrides: Partial<RunRequest> = {}): RunRequest {
  return {
    runId: 'run-cow-gulch-1',
    scenario: {
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
    },
    sample: { id: 'seed-42', randomSeed: 42 },
    policy: { id: policy.id, version: policy.version },
    ...overrides,
  };
}

function createTestGame(): Game {
  return createGame({
    scenarios: { [cowGulchContent.id]: cowGulchContent },
    sessionIdSource: (() => {
      let sequence = 0;
      return () => `experiment-session-${++sequence}`;
    })(),
  });
}

test('runs Cow Gulch through the Experiments interface and returns a versioned victory', async () => {
  const seen: StrategyObservation[] = [];
  const startPolicy: ControlPolicy = {
    ...policy,
    create() {
      return {
        decide(observation) {
          seen.push(observation);
          return observation.wave?.phase === 'not-started' ? [{ type: 'start-wave' }] : [];
        },
      };
    },
  };
  const experiments = createExperiments({ game: createTestGame(), policies: [startPolicy] });

  const result = await experiments.run(request());

  assert.equal(result.status, 'completed');
  assert.equal(result.outcome, 'victory');
  assert.equal(result.stopReason, 'victory');
  assert.equal(result.startRecord?.mode, 'experiment');
  assert.equal(result.startRecord?.randomSeed, 42);
  assert.equal(result.startRecord?.contentVersion, cowGulchContent.contentVersion);
  assert.equal(result.startRecord?.rulesVersion, GAME_RULES_VERSION);
  assert.equal(result.settlement?.mode, 'experiment');
  assert.ok((result.metrics?.frameCount ?? 0) > 0);
  assert.equal(result.metrics?.finalCash, 66);
  assert.equal(result.actions.length, 1);
  assert.deepEqual(result.actions[0], {
    observationFrame: 0,
    executionFrame: 1,
    accepted: true,
    intent: { type: 'start-wave' },
  });
  assert.equal(seen[0]?.frame, 0);
  assert.ok(Object.isFrozen(seen[0]));
  assert.ok(Object.isFrozen(seen[0]?.wave));
  assert.equal('map' in (seen[0] ?? {}), false);
  assert.equal('events' in (seen[0] ?? {}), false);
  assert.equal('shots' in (seen[0] ?? {}), false);
  assert.equal('hitPoints' in (seen[0]?.enemies[0] ?? {}), false);
});

test('rejects content-version drift before advancing the opened session', async () => {
  const baseGame = createTestGame();
  let advances = 0;
  let closed = false;
  const instrumentedGame: Game = {
    replay: (serialized) => baseGame.replay(serialized),
    async open(options) {
      const session = await baseGame.open(options);
      return {
        ...session,
        advance(input) {
          advances += 1;
          return session.advance(input);
        },
        close() {
          closed = true;
          session.close();
        },
      };
    },
  };
  const experiments = createExperiments({ game: instrumentedGame, policies: [policy] });
  const runRequest = request({
    scenario: { ...request().scenario, contentVersion: 'wrong-content-version' },
  });

  const result = await experiments.run(runRequest);

  assert.equal(result.status, 'invalid-input');
  assert.equal(result.stopReason, 'content-version-mismatch');
  assert.equal(result.startRecord?.contentVersion, cowGulchContent.contentVersion);
  assert.equal(result.metrics?.frameCount, 0);
  assert.equal(advances, 0);
  assert.equal(closed, true);
});

test('rejects rules-version drift before advancing the opened session', async () => {
  const experiments = createExperiments({ game: createTestGame(), policies: [policy] });
  const result = await experiments.run(request({
    scenario: { ...request().scenario, rulesVersion: 'future-rules' },
  }));

  assert.equal(result.status, 'invalid-input');
  assert.equal(result.stopReason, 'rules-version-mismatch');
  assert.equal(result.metrics?.frameCount, 0);
});

test('rejects a policy version that is not registered', async () => {
  const experiments = createExperiments({ game: createTestGame(), policies: [policy] });
  const result = await experiments.run(request({ policy: { id: policy.id, version: '2' } }));

  assert.equal(result.status, 'invalid-input');
  assert.equal(result.stopReason, 'policy-version-mismatch');
  assert.equal(result.startRecord, undefined);
});

test('rejects a moving latest scenario version instead of resolving current content', async () => {
  const experiments = createExperiments({ game: createTestGame(), policies: [policy] });
  const result = await experiments.run(request({
    scenario: { ...request().scenario, version: 'latest' },
  }));

  assert.equal(result.status, 'invalid-input');
  assert.equal(result.stopReason, 'invalid-request');
  assert.equal(result.startRecord, undefined);
});

test('returns a Game defeat as an experiment outcome', async () => {
  const game = createGame({
    scenarios: { [cowGulchDefeatContent.id]: cowGulchDefeatContent },
    sessionIdSource: () => 'experiment-defeat-session',
  });
  const experiments = createExperiments({ game, policies: [policy] });
  const result = await experiments.run(request({
    scenario: { ...request().scenario, gameScenarioId: cowGulchDefeatContent.id },
  }));

  assert.equal(result.status, 'completed');
  assert.equal(result.outcome, 'defeat');
  assert.equal(result.stopReason, 'defeat');
  assert.equal(result.settlement?.mode, 'experiment');
  assert.equal(result.metrics?.livesRemaining, 0);
});

test('classifies an unknown Game scenario as invalid input', async () => {
  const experiments = createExperiments({ game: createTestGame(), policies: [policy] });
  const result = await experiments.run(request({
    scenario: { ...request().scenario, gameScenarioId: 'missing-map' },
  }));

  assert.equal(result.status, 'invalid-input');
  assert.equal(result.stopReason, 'scenario-unavailable');
  assert.equal(result.startRecord, undefined);
});

test('returns a deterministic frame-budget result without claiming a game outcome', async () => {
  const experiments = createExperiments({ game: createTestGame(), policies: [policy] });
  const result = await experiments.run(request({
    scenario: { ...request().scenario, maxFrames: 2 },
  }));

  assert.equal(result.status, 'budget-exceeded');
  assert.equal(result.stopReason, 'max-frames');
  assert.equal(result.outcome, undefined);
  assert.equal(result.metrics?.frameCount, 2);
  assert.equal(result.metrics?.simulatedMs, 200);
  assert.equal(result.actions.length, 1);
});

test('stops at the simulated-time budget without claiming a game outcome', async () => {
  const experiments = createExperiments({ game: createTestGame(), policies: [policy] });
  const result = await experiments.run(request({
    scenario: { ...request().scenario, maxSimulatedMs: 100 },
  }));

  assert.equal(result.status, 'budget-exceeded');
  assert.equal(result.stopReason, 'max-simulated-time');
  assert.equal(result.outcome, undefined);
  assert.equal(result.metrics?.frameCount, 1);
  assert.equal(result.metrics?.simulatedMs, 100);
});

test('stops when the scene exceeds its entity budget', async () => {
  const experiments = createExperiments({ game: createTestGame(), policies: [policy] });
  const result = await experiments.run(request({
    scenario: { ...request().scenario, maxEntities: 1 },
  }));

  assert.equal(result.status, 'budget-exceeded');
  assert.equal(result.stopReason, 'max-entities');
  assert.equal(result.outcome, undefined);
  assert.equal(result.metrics?.peakEntities, 2);
});

test('observes AbortSignal cancellation between bounded frame batches and closes the session', async () => {
  const controller = new AbortController();
  let yields = 0;
  let closed = false;
  const baseGame = createTestGame();
  const game: Game = {
    replay: (serialized) => baseGame.replay(serialized),
    async open(options) {
      const session = await baseGame.open(options);
      return {
        ...session,
        close() {
          closed = true;
          session.close();
        },
      };
    },
  };
  const experiments = createExperiments({
    game,
    policies: [policy],
    runtime: {
      now: () => 0,
      yieldToHost: async () => {
        yields += 1;
        controller.abort();
      },
    },
  });

  const result = await experiments.run(request({
    scenario: { ...request().scenario, yieldEveryFrames: 1 },
  }), { signal: controller.signal });

  assert.equal(result.status, 'cancelled');
  assert.equal(result.stopReason, 'cancelled');
  assert.equal(result.outcome, undefined);
  assert.equal(result.metrics?.frameCount, 1);
  assert.equal(yields, 1);
  assert.equal(closed, true);
});

test('classifies wall-clock budget exhaustion separately from a game defeat', async () => {
  let now = 0;
  const experiments = createExperiments({
    game: createTestGame(),
    policies: [policy],
    runtime: {
      now: () => now,
      yieldToHost: async () => { now += 6; },
    },
  });
  const result = await experiments.run(request({
    scenario: { ...request().scenario, maxWallClockMs: 5, yieldEveryFrames: 1 },
  }));

  assert.equal(result.status, 'budget-exceeded');
  assert.equal(result.stopReason, 'max-wall-clock-time');
  assert.equal(result.outcome, undefined);
});

test('classifies a Game-rejected strategy intent as invalid input, not a defeat', async () => {
  const invalidPolicy: ControlPolicy = {
    id: 'invalid-move',
    version: '1',
    create: () => ({ decide: () => [{ type: 'move-unit', targetX: 4, targetY: 4 }] }),
  };
  const experiments = createExperiments({ game: createTestGame(), policies: [invalidPolicy] });
  const result = await experiments.run(request({ policy: { id: invalidPolicy.id, version: invalidPolicy.version } }));

  assert.equal(result.status, 'invalid-input');
  assert.equal(result.stopReason, 'intent-rejected');
  assert.equal(result.outcome, undefined);
  assert.equal(result.metrics?.frameCount, 0);
});

test('classifies an unknown strategy intent as invalid policy output', async () => {
  const invalidPolicy: ControlPolicy = {
    id: 'unknown-intent',
    version: '1',
    create: () => ({ decide: () => [{ type: 'teleport' } as never] }),
  };
  const experiments = createExperiments({ game: createTestGame(), policies: [invalidPolicy] });
  const result = await experiments.run(request({ policy: { id: invalidPolicy.id, version: invalidPolicy.version } }));

  assert.equal(result.status, 'invalid-input');
  assert.equal(result.stopReason, 'invalid-policy-output');
  assert.equal(result.metrics?.frameCount, 0);
});

test('classifies policy exceptions as execution failures', async () => {
  const brokenPolicy: ControlPolicy = {
    id: 'broken',
    version: '1',
    create: () => ({ decide: () => { throw new Error('policy failed'); } }),
  };
  const experiments = createExperiments({ game: createTestGame(), policies: [brokenPolicy] });
  const result = await experiments.run(request({ policy: { id: brokenPolicy.id, version: brokenPolicy.version } }));

  assert.equal(result.status, 'failed');
  assert.equal(result.stopReason, 'execution-error');
  assert.equal(result.error?.message, 'policy failed');
  assert.equal(result.metrics?.frameCount, 0);
});

test('keeps the registered policy version stable after registration', async () => {
  const mutablePolicy = { ...policy };
  const experiments = createExperiments({ game: createTestGame(), policies: [mutablePolicy] });
  mutablePolicy.version = '2';

  const result = await experiments.run(request({ policy: { id: policy.id, version: '1' } }));

  assert.equal(result.status, 'completed');
  assert.equal(result.outcome, 'victory');
  assert.equal(result.policyVersion, '1');
});

test('returns a structured execution failure when the monotonic clock throws', async () => {
  const experiments = createExperiments({
    game: createTestGame(),
    policies: [policy],
    runtime: { now: () => { throw new Error('clock unavailable'); } },
  });

  const result = await experiments.run(request());

  assert.equal(result.status, 'failed');
  assert.equal(result.stopReason, 'execution-error');
  assert.equal(result.error?.message, 'clock unavailable');
  assert.equal(result.startRecord, undefined);
});

test('returns an execution failure when the monotonic clock becomes invalid during a run', async () => {
  let reads = 0;
  const experiments = createExperiments({
    game: createTestGame(),
    policies: [policy],
    runtime: { now: () => ++reads === 1 ? 0 : Number.NaN },
  });

  const result = await experiments.run(request());

  assert.equal(result.status, 'failed');
  assert.equal(result.stopReason, 'execution-error');
  assert.match(result.error?.message ?? '', /clock/i);
  assert.equal(result.startRecord, undefined);
});

test('returns an execution failure when the monotonic clock moves backward', async () => {
  const clockReads = [0, 20, 10];
  const experiments = createExperiments({
    game: createTestGame(),
    policies: [policy],
    runtime: { now: () => clockReads.shift() ?? 10 },
  });

  const result = await experiments.run(request());

  assert.equal(result.status, 'failed');
  assert.equal(result.stopReason, 'execution-error');
  assert.match(result.error?.message ?? '', /monotonic/i);
  assert.equal(result.startRecord?.randomSeed, 42);
  assert.equal(result.metrics?.frameCount, 0);
});

test('enforces the wall-clock budget consumed while creating a policy', async () => {
  let now = 0;
  const slowCreate: ControlPolicy = {
    ...policy,
    create() {
      now = 6;
      return policy.create();
    },
  };
  const experiments = createExperiments({
    game: createTestGame(),
    policies: [slowCreate],
    runtime: { now: () => now },
  });

  const result = await experiments.run(request({
    scenario: { ...request().scenario, maxWallClockMs: 5 },
  }));

  assert.equal(result.status, 'budget-exceeded');
  assert.equal(result.stopReason, 'max-wall-clock-time');
  assert.equal(result.startRecord, undefined);
});
