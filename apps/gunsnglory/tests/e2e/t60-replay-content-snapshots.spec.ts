import { expect, test } from './auto-continue-fixtures';

interface ReplayProbeRequest {
  scenarioId: string;
  contentVersion: string;
  sourceCompletedScenarioIds: string[];
  importCompletedScenarioIds: string[];
  importContentVersion?: string;
  expectedImportErrorCode?: 'result-mismatch' | 'content-unavailable';
  seed: number;
}

const milestoneScenarioIds = [
  'campaign-oregon-10',
  'campaign-dakota-10',
  'campaign-nevada-10',
  'campaign-alaska-10',
];

async function createReplayCases(page: import('@playwright/test').Page): Promise<ReplayProbeRequest[]> {
  return page.evaluate(async () => {
    const loadModule = (specifier: string) => import(specifier);
    const [techTown, billyHills, murdockMountains, luckyLake, newMexicoVersion, oregonVersion, oregonIdentity, oregon02Version, oregon02Identity, oregon03Version, oregon03Identity] = await Promise.all([
      loadModule('/src/content/tech-town-campaign.ts') as Promise<typeof import('../../src/content/tech-town-campaign')>,
      loadModule('/src/content/billy-hills-campaign.ts') as Promise<typeof import('../../src/content/billy-hills-campaign')>,
      loadModule('/src/content/murdock-mountains-campaign.ts') as Promise<typeof import('../../src/content/murdock-mountains-campaign')>,
      loadModule('/src/content/lucky-lake-campaign.ts') as Promise<typeof import('../../src/content/lucky-lake-campaign')>,
      loadModule('/src/content/new-mexico-replay-content-version.ts') as Promise<typeof import('../../src/content/new-mexico-replay-content-version')>,
      loadModule('/src/content/oregon-01-content-version.ts') as Promise<typeof import('../../src/content/oregon-01-content-version')>,
      loadModule('/src/content/oregon-01-identity.ts') as Promise<typeof import('../../src/content/oregon-01-identity')>,
      loadModule('/src/content/oregon-02-content-version.ts') as Promise<typeof import('../../src/content/oregon-02-content-version')>,
      loadModule('/src/content/oregon-02-identity.ts') as Promise<typeof import('../../src/content/oregon-02-identity')>,
      loadModule('/src/content/oregon-03-content-version.ts') as Promise<typeof import('../../src/content/oregon-03-content-version')>,
      loadModule('/src/content/oregon-03-identity.ts') as Promise<typeof import('../../src/content/oregon-03-identity')>,
    ]);
    const milestones = [
      'campaign-oregon-10',
      'campaign-dakota-10',
      'campaign-nevada-10',
      'campaign-alaska-10',
    ];
    const techTownWithMapAccess = ['campaign-new-mexico-03'];
    const importingProfile = [...milestones, 'campaign-new-mexico-03'];
    const fixedVersions = [
      [techTown.techTownCampaignId, techTown.techTownCampaignContentVersion],
      [billyHills.billyHillsCampaignId, billyHills.billyHillsCampaignContentVersion],
      [murdockMountains.murdockMountainsCampaignId, murdockMountains.murdockMountainsCampaignContentVersion],
      [luckyLake.luckyLakeCampaignId, luckyLake.luckyLakeCampaignContentVersion],
    ] as const;
    const cases: ReplayProbeRequest[] = [];

    for (const [index, [scenarioId, contentVersion]] of fixedVersions.entries()) {
      cases.push({
        scenarioId,
        contentVersion,
        sourceCompletedScenarioIds: importingProfile,
        importCompletedScenarioIds: importingProfile,
        seed: 60_400 + index * 100 + 1,
      });
      const recordedSnapshot = scenarioId === techTown.techTownCampaignId
        ? techTownWithMapAccess
        : [];
      cases.push({
        scenarioId,
        contentVersion: newMexicoVersion.newMexicoCampaignContentVersionFor(scenarioId, recordedSnapshot),
        sourceCompletedScenarioIds: recordedSnapshot,
        importCompletedScenarioIds: importingProfile,
        seed: 60_400 + index * 100 + 2,
      });
    }

    cases.push({
      scenarioId: oregonIdentity.oregon01CampaignId,
      contentVersion: oregonVersion.oregon01LegacyCampaignContentVersionFor([]),
      sourceCompletedScenarioIds: [],
      importCompletedScenarioIds: importingProfile,
      seed: 61_001,
    });
    cases.push({
      scenarioId: oregonIdentity.oregon01CampaignId,
      contentVersion: oregonVersion.oregon01CampaignContentVersionFor([]),
      sourceCompletedScenarioIds: [],
      importCompletedScenarioIds: importingProfile,
      seed: 61_002,
    });
    for (let mask = 0; mask < 4; mask += 1) {
      const cashcowSnapshot = [
        ...(mask & 1 ? ['campaign-nevada-10'] : []),
        ...(mask & 2 ? ['campaign-alaska-10'] : []),
      ];
      cases.push({
        scenarioId: oregon02Identity.oregon02CampaignId,
        contentVersion: oregon02Version.oregon02CampaignContentVersionFor(cashcowSnapshot),
        sourceCompletedScenarioIds: cashcowSnapshot,
        importCompletedScenarioIds: importingProfile,
        seed: 62_001 + mask,
      });
    }
    for (let mask = 0; mask < 16; mask += 1) {
      const chinookSnapshot = [
        ...(mask & 1 ? ['campaign-oregon-10'] : []),
        ...(mask & 2 ? ['campaign-dakota-10'] : []),
        ...(mask & 4 ? ['campaign-nevada-10'] : []),
        ...(mask & 8 ? ['campaign-alaska-10'] : []),
      ];
      cases.push({
        scenarioId: oregon03Identity.oregon03CampaignId,
        contentVersion: oregon03Version.oregon03CampaignContentVersionFor(chinookSnapshot),
        sourceCompletedScenarioIds: chinookSnapshot,
        importCompletedScenarioIds: importingProfile,
        seed: 63_001 + mask,
      });
    }
    return cases;
  });
}

async function writeProfile(page: import('@playwright/test').Page, completedScenarios: readonly string[]): Promise<void> {
  await page.evaluate(async (completed) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: false },
        completedScenarios: completed,
        highScores: {},
        appliedSettlementIds: [],
        revision: 1,
        lastOperationId: 'seed-m22-replay-snapshot-profile',
        lastRequestDigest: 'seed-m22-replay-snapshot-profile',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function createReplayProbe(
  page: import('@playwright/test').Page,
  request: ReplayProbeRequest,
): Promise<string> {
  return page.evaluate(async (probe) => {
    const loadModule = (specifier: string) => import(specifier);
    const [bootstrap, replay, oregonIdentity, oregon02Identity, oregon03Identity] = await Promise.all([
      loadModule('/src/bootstrap/browser.ts') as Promise<typeof import('../../src/bootstrap/browser')>,
      loadModule('/src/game/replay.ts') as Promise<typeof import('../../src/game/replay')>,
      loadModule('/src/content/oregon-01-identity.ts') as Promise<typeof import('../../src/content/oregon-01-identity')>,
      loadModule('/src/content/oregon-02-identity.ts') as Promise<typeof import('../../src/content/oregon-02-identity')>,
      loadModule('/src/content/oregon-03-identity.ts') as Promise<typeof import('../../src/content/oregon-03-identity')>,
    ]);
    const replayFactory = (contentVersion: string, completedScenarioIds: string[]) => probe.scenarioId === oregonIdentity.oregon01CampaignId
      ? bootstrap.createBrowserGameForOregon01Replay(contentVersion)
      : probe.scenarioId === oregon02Identity.oregon02CampaignId
        ? bootstrap.createBrowserGameForOregon02Replay(contentVersion)
        : probe.scenarioId === oregon03Identity.oregon03CampaignId
          ? bootstrap.createBrowserGameForOregon03Replay(contentVersion)
          : bootstrap.createBrowserGameForNewMexicoReplay(
        probe.scenarioId,
        contentVersion,
        completedScenarioIds,
      );
    const game = replayFactory(probe.contentVersion, probe.sourceCompletedScenarioIds);
    const session = await game.open({
      scenarioId: probe.scenarioId,
      contentVersion: probe.contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: probe.seed,
    });
    try {
      const initialDigest = await replay.replayStateDigest(replay.captureReplayState(session.observe()));
      const mismatchedDigest = `sha256:${'0'.repeat(64)}`;
      const serialized = await replay.serializeReplay({
        formatVersion: replay.GAME_REPLAY_FORMAT_VERSION,
        rulesVersion: replay.GAME_RULES_VERSION,
        startRecord: {
          ...session.startRecord,
          ...(probe.importContentVersion === undefined ? {} : { contentVersion: probe.importContentVersion }),
        },
        frames: [{ frame: 1, deltaMs: 0, tileSizePixels: 32, intents: [] }],
        checkpoints: [
          { frame: 0, stateDigest: initialDigest },
          { frame: 1, stateDigest: mismatchedDigest },
        ],
        terminal: {
          frame: 1,
          settlement: { outcome: 'victory', scoreBase: 0, displayScore: 0, highScoreCandidate: 0 },
          stateDigest: mismatchedDigest,
        },
      });
      await replay.parseReplay(serialized);
      const importerGame = replayFactory(
        probe.importContentVersion ?? probe.contentVersion,
        probe.importCompletedScenarioIds,
      );
      try {
        const result = await importerGame.replay(serialized);
        result.session.close();
        throw new Error('Replay probe unexpectedly verified its deliberately mismatched checkpoint');
      } catch (error) {
        if ((error as { code?: string }).code !== (probe.expectedImportErrorCode ?? 'result-mismatch')) {
          const detail = error instanceof Error ? error.message : String(error);
          throw new Error(`Replay probe ${probe.scenarioId} ${probe.contentVersion} failed before its checkpoint: ${detail}`);
        }
      }
      return serialized;
    } finally {
      session.close();
    }
  }, request);
}

test('replay import recognizes M4–M7 and all Oregon hire snapshots', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, [...milestoneScenarioIds, 'campaign-new-mexico-03']);
  await page.reload();

  const replayCases = await createReplayCases(page);
  for (const [index, replayCase] of replayCases.entries()) {
    const serialized = await createReplayProbe(page, replayCase);
    await page.getByTestId('import-replay').setInputFiles({
      name: `recorded-content-${index + 1}.replay.json`,
      mimeType: 'application/json',
      buffer: Buffer.from(serialized),
    });
    // The deliberately invalid frame-1 digest makes this a short routing probe:
    // reaching result-mismatch proves the recorded content version was available.
    await expect(page.getByTestId('replay-status'), `Replay probe ${index + 1}: ${replayCase.scenarioId} ${replayCase.contentVersion}`).toHaveText(
      'Replay verification failed: a checkpoint or result differs.',
    );
  }

  const accessibleTechTown = replayCases.find(({ scenarioId, contentVersion }) => (
    scenarioId === 'campaign-new-mexico-04' && contentVersion.includes('-map-access-1')
  ));
  expect(accessibleTechTown).toBeDefined();
  const unknownVersionProbe = await createReplayProbe(page, {
    ...accessibleTechTown!,
    importContentVersion: 'future-unknown-content-version',
    expectedImportErrorCode: 'content-unavailable',
    importCompletedScenarioIds: [...milestoneScenarioIds, 'campaign-new-mexico-03'],
    seed: 60_499,
  });
  await page.getByTestId('import-replay').setInputFiles({
    name: 'unsupported-tech-town.replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(unknownVersionProbe),
  });
  await expect(page.getByTestId('replay-status')).toHaveText('Replay content version is unavailable in this build.');

  const cashcowCase = replayCases.find(({ scenarioId }) => scenarioId === 'campaign-oregon-02');
  expect(cashcowCase).toBeDefined();
  const unknownCashcowVersion = await createReplayProbe(page, {
    ...cashcowCase!,
    importContentVersion: 'future-unknown-cashcow-version',
    expectedImportErrorCode: 'content-unavailable',
    importCompletedScenarioIds: [...milestoneScenarioIds, 'campaign-new-mexico-03'],
    seed: 62_499,
  });
  await page.getByTestId('import-replay').setInputFiles({
    name: 'unsupported-cashcow-canyon.replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(unknownCashcowVersion),
  });
  await expect(page.getByTestId('replay-status')).toHaveText('Replay content version is unavailable in this build.');

  const chinookCase = replayCases.find(({ scenarioId }) => scenarioId === 'campaign-oregon-03');
  expect(chinookCase).toBeDefined();
  const unknownChinookVersion = await createReplayProbe(page, {
    ...chinookCase!,
    importContentVersion: 'future-unknown-chinook-version',
    expectedImportErrorCode: 'content-unavailable',
    importCompletedScenarioIds: [...milestoneScenarioIds, 'campaign-new-mexico-03'],
    seed: 63_499,
  });
  await page.getByTestId('import-replay').setInputFiles({
    name: 'unsupported-chinook-woods.replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(unknownChinookVersion),
  });
  await expect(page.getByTestId('replay-status')).toHaveText('Replay content version is unavailable in this build.');
});
