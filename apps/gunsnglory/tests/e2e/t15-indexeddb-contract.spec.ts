import { expect, test } from '@playwright/test';

test('IndexedDB experiment records use stable pagination and reject a missing result artifact', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const contentPath: string = '/src/content/cow-gulch.ts';
    const gamePath: string = '/src/game/index.ts';
    const experimentsPath: string = '/src/experiments/index.ts';
    const repositoryPath: string = '/src/experiments/indexeddb-experiment-repository.ts';
    const [{ cowGulchContent }, gameModule, experimentsModule, repositoryModule] = await Promise.all([
      import(/* @vite-ignore */ contentPath),
      import(/* @vite-ignore */ gamePath),
      import(/* @vite-ignore */ experimentsPath),
      import(/* @vite-ignore */ repositoryPath),
    ]);
    const game = gameModule.createGame({
      scenarios: { [cowGulchContent.id]: cowGulchContent },
      sessionIdSource: () => 't15-indexeddb-session',
    });
    const repository = repositoryModule.createIndexedDbExperimentRepository();
    const experiments = experimentsModule.createExperiments({
      game,
      repository,
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
    const baseline = await experiments.saveScheme({
      id: 't15-original', version: '1', scenarioId: 'cow-gulch',
    });
    const candidate = await experiments.saveScheme({
      id: 't15-draft', version: '1', scenarioId: 'cow-gulch',
      overrides: [{ path: 'previewWave/enemy/cashReward', value: 2 }],
    });
    const shared = {
      scenario: {
        id: 'cow-gulch-single-wave', version: '1', gameScenarioId: 'cow-gulch',
        contentVersion: baseline.contentVersion, rulesVersion: baseline.rulesVersion,
        observationLevel: 'player-visible' as const, decisionIntervalFrames: 1, deltaMs: 100,
        maxFrames: 2_000, maxSimulatedMs: 200_000, maxEntities: 100,
        maxWallClockMs: 30_000, yieldEveryFrames: 40,
      },
      baseline: { id: baseline.id, version: baseline.version },
      candidate: { id: candidate.id, version: candidate.version },
      samples: [{ id: 'seed-42', randomSeed: 42 }],
      policy: { id: 'start-wave', version: '1' },
    };
    for (const id of ['page-a', 'page-b', 'page-c']) {
      const report = await experiments.compare({ comparisonId: id, ...shared });
      await repository.saveComparison({
        id,
        savedAt: 500,
        request: report.request,
        summary: {
          status: report.status,
          scenarioId: report.scenarioId,
          scenarioVersion: report.scenarioVersion,
          candidateScheme: shared.candidate,
          plannedSampleCount: report.plannedSampleCount,
          completedRunCount: report.completedRunCount,
        },
        report,
      });
    }
    const firstPage = await repository.listComparisons({ limit: 2 });
    const secondPage = firstPage.nextCursor
      ? await repository.listComparisons({ limit: 2, cursor: firstPage.nextCursor })
      : { items: [] };

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(repositoryModule.EXPERIMENTS_DATABASE_NAME, repositoryModule.EXPERIMENTS_DATABASE_VERSION);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('artifacts', 'readwrite');
    transaction.objectStore('artifacts').delete('page-b');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
    let missingArtifactCode = '';
    try {
      await repository.openComparison('page-b');
    } catch (error) {
      missingArtifactCode = (error as { code?: string }).code ?? '';
    }
    return {
      firstIds: firstPage.items.map((item: { id: string }) => item.id),
      secondIds: secondPage.items.map((item: { id: string }) => item.id),
      hasNext: firstPage.nextCursor !== undefined,
      missingArtifactCode,
    };
  });

  expect(result.firstIds).toEqual(['page-c', 'page-b']);
  expect(result.secondIds).toEqual(['page-a']);
  expect(result.hasNext).toBe(true);
  expect(result.missingArtifactCode).toBe('corrupt-data');
});

test('IndexedDB adapter passes the same repository contract as the memory adapter', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const repositoryPath: string = '/src/experiments/indexeddb-experiment-repository.ts';
    const contractPath: string = '/tests/experiment-repository-contract.ts';
    const [repositoryModule, contractModule] = await Promise.all([
      import(/* @vite-ignore */ repositoryPath),
      import(/* @vite-ignore */ contractPath),
    ]);
    await contractModule.verifyExperimentRepositoryContract(
      () => repositoryModule.createIndexedDbExperimentRepository(),
    );
    return 'shared contract passed';
  });
  expect(result).toBe('shared contract passed');
});
