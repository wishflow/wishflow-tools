import { expect, test } from '@playwright/test';

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

async function writeEmptyProfile(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default', schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'medium', soundEnabled: false },
        completedScenarios: [], highScores: {}, appliedSettlementIds: [], revision: 1,
        lastOperationId: 'seed-snow-town-replay-importer', lastRequestDigest: 'seed-snow-town-replay-importer',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }));
}

test('Snow Town replay import uses its recorded unlock snapshot and rejects unsupported versions', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeEmptyProfile(page);
  await page.reload();
  await keepSoundOff(page);

  const replays = await page.evaluate(async () => {
    const loadModule = (specifier: string) => import(specifier);
    const [bootstrap, replay, identity, contentVersion] = await Promise.all([
      loadModule('/src/bootstrap/browser.ts') as Promise<typeof import('../../src/bootstrap/browser')>,
      loadModule('/src/game/replay.ts') as Promise<typeof import('../../src/game/replay')>,
      loadModule('/src/content/dakota-09-identity.ts') as Promise<typeof import('../../src/content/dakota-09-identity')>,
      loadModule('/src/content/dakota-09-content-version.ts') as Promise<typeof import('../../src/content/dakota-09-content-version')>,
    ]);
    const scenarioId = identity.dakota09CampaignId;
    const version = contentVersion.dakota09CampaignContentVersionForSnapshot({
      unitUnlocks: { grandpa: true, sniper: false, pyromaniac: true, salesman: false },
    });
    const session = await bootstrap.createBrowserGameForDakota09Replay(version).open({
      scenarioId, contentVersion: version, mode: 'free', difficulty: 'medium', randomSeed: 39_082,
    });
    try {
      const initialDigest = await replay.replayStateDigest(replay.captureReplayState(session.observe()));
      const mismatch = `sha256:${'0'.repeat(64)}`;
      const payload = {
        formatVersion: replay.GAME_REPLAY_FORMAT_VERSION,
        rulesVersion: replay.GAME_RULES_VERSION,
        startRecord: session.startRecord,
        frames: [{ frame: 1, deltaMs: 0, tileSizePixels: 32, intents: [] }],
        checkpoints: [
          { frame: 0, stateDigest: initialDigest },
          { frame: 1, stateDigest: mismatch },
        ],
        terminal: {
          frame: 1,
          settlement: { outcome: 'victory' as const, scoreBase: 0, displayScore: 0, highScoreCandidate: 0 },
          stateDigest: mismatch,
        },
      };
      return {
        recorded: await replay.serializeReplay(payload),
        unsupported: await replay.serializeReplay({
          ...payload,
          startRecord: { ...session.startRecord, contentVersion: `${version}-extra` },
        }),
      };
    } finally {
      session.close();
    }
  });

  await page.getByTestId('import-replay').setInputFiles({
    name: 'snow-town-recorded-snapshot.replay.json', mimeType: 'application/json',
    buffer: Buffer.from(replays.recorded),
  });
  await expect(page.getByTestId('replay-status')).toHaveText(
    'Replay verification failed: a checkpoint or result differs.',
  );

  await page.getByTestId('import-replay').setInputFiles({
    name: 'snow-town-unsupported-snapshot.replay.json', mimeType: 'application/json',
    buffer: Buffer.from(replays.unsupported),
  });
  await expect(page.getByTestId('replay-status')).toHaveText(
    'Replay content version is unavailable in this build.',
  );
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
});
