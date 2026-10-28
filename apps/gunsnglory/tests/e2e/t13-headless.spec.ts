import { expect, test } from '@playwright/test';

test('runs a versioned single-scene experiment in the browser through public interfaces', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const contentPath: string = '/src/content/cow-gulch.ts';
    const gamePath: string = '/src/game/index.ts';
    const experimentsPath: string = '/src/experiments/index.ts';
    const [{ cowGulchContent }, gameModule, experimentsModule] = await Promise.all([
      import(/* @vite-ignore */ contentPath),
      import(/* @vite-ignore */ gamePath),
      import(/* @vite-ignore */ experimentsPath),
    ]);
    const game = gameModule.createGame({
      scenarios: { [cowGulchContent.id]: cowGulchContent },
      sessionIdSource: () => 'browser-experiment-session',
    });
    const experiments = experimentsModule.createExperiments({
      game,
      policies: [{
        id: 'start-wave',
        version: '1',
        create: () => ({
          decide: (observation: { wave?: { phase: string } }) => observation.wave?.phase === 'not-started'
            ? [{ type: 'start-wave' as const }]
            : [],
        }),
      }],
    });

    return experiments.run({
      runId: 'browser-run-1',
      scenario: {
        id: 'cow-gulch-single-wave',
        version: '1',
        gameScenarioId: cowGulchContent.id,
        contentVersion: cowGulchContent.contentVersion,
        rulesVersion: gameModule.GAME_RULES_VERSION,
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
      policy: { id: 'start-wave', version: '1' },
    });
  });

  expect(result.status).toBe('completed');
  expect(result.outcome).toBe('victory');
  expect(result.startRecord.mode).toBe('experiment');
  expect(result.startRecord.randomSeed).toBe(42);
  expect(result.metrics.finalCash).toBe(66);
});
