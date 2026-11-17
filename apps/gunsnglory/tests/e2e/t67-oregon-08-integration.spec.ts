import { expect, test } from '@playwright/test';

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

async function writeCompletedProfile(page: import('@playwright/test').Page, completedScenarios: string[]): Promise<void> {
  await page.evaluate(async (completed) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'medium', soundEnabled: false },
        completedScenarios: completed,
        highScores: {},
        appliedSettlementIds: [],
        revision: 1,
        lastOperationId: 'seed-colt-city-campaign-gate',
        lastRequestDigest: 'seed-colt-city-campaign-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

const completedThroughLevelTwentySix = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  ...Array.from({ length: 6 }, (_, index) => `campaign-oregon-${String(index + 1).padStart(2, '0')}`),
];

async function expectColtCityOverview(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Colt City' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'Gambling and Colt gunplay are at the top of the agenda in Colt City.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_31\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const minimap = page.getByTestId('campaign-overview-minimap');
  await expect(minimap).toHaveAttribute('data-scenario-id', 'campaign-oregon-08');
  await expect(minimap).toHaveJSProperty('naturalWidth', 192);
  await expect(minimap).toHaveJSProperty('naturalHeight', 144);
}

async function expectColtCityOpening(page: import('@playwright/test').Page, context: string): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Colt City · Level 28');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Gunslinger');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'Hopefully, enough settlers will come today! I have some gambling debts and I really need their gold!',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
}

test('Free Play opens Colt City on desktop and narrow mobile with map 31 and the original opening', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await keepSoundOff(page);

    await page.getByTestId('menu-free-play').click();
    await page.getByTestId('campaign-region-oregon').click();
    await expect(page.getByTestId('campaign-menu-progress')).toContainText('10 implemented levels available');
    for (const level of [21, 22, 23, 24, 25, 26, 27, 28, 29]) {
      await expect(page.getByTestId(`campaign-level-${level}`)).toBeEnabled();
    }
    await expect(page.getByTestId('campaign-level-29')).toBeEnabled();
    await page.getByTestId('campaign-level-28').click();
    await expectColtCityOverview(page);

    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    await expect(page.getByRole('heading', { name: '柯尔特城' })).toBeVisible();
    await expect(page.locator('.campaign-level-description')).toHaveText('赌博和柯尔特式枪战，是柯尔特城最热门的话题。');
    await page.getByRole('button', { name: '切换界面语言为英文' }).click();

    await page.getByTestId('campaign-stage-play').click();
    for (const difficulty of ['easy', 'medium', 'hard']) {
      await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
    }
    await page.getByTestId('campaign-difficulty-medium').click();
    await expectColtCityOpening(page, 'FREE PLAY · OREGON · 28');
  }
});

test('formal Colt City unlocks only after Mount Hood while level 29 remains unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, completedThroughLevelTwentySix);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-27')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-28')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-29')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughLevelTwentySix, 'campaign-oregon-07']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-28')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-29')).toBeDisabled();
  await page.getByTestId('campaign-level-28').click();
  await expectColtCityOverview(page);
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectColtCityOpening(page, 'OREGON · 28');
});

test('replay import dispatches Colt City through its recorded unlock snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, []);
  await page.reload();
  await keepSoundOff(page);

  const serialized = await page.evaluate(async () => {
    const loadModule = (specifier: string) => import(specifier);
    const [bootstrap, replay, identity, unlocks] = await Promise.all([
      loadModule('/src/bootstrap/browser.ts') as Promise<typeof import('../../src/bootstrap/browser')>,
      loadModule('/src/game/replay.ts') as Promise<typeof import('../../src/game/replay')>,
      loadModule('/src/content/oregon-08-identity.ts') as Promise<typeof import('../../src/content/oregon-08-identity')>,
      loadModule('/src/content/mississippi-unit-unlocks.ts') as Promise<typeof import('../../src/content/mississippi-unit-unlocks')>,
    ]);
    const completedScenarioIds = unlocks.completedScenarioIdsForMississippiUnitUnlockSnapshot({
      grandpa: true,
      sniper: false,
      pyromaniac: true,
      salesman: false,
    });
    const scenarioId = identity.oregon08CampaignId;
    const contentVersion = bootstrap.getBrowserScenarioContentVersion(scenarioId, completedScenarioIds);
    if (!contentVersion) throw new Error('Colt City replay content version is unavailable');
    const session = await bootstrap.createBrowserGameForOregon08Replay(contentVersion).open({
      scenarioId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 28_800,
    });
    try {
      const initialDigest = await replay.replayStateDigest(replay.captureReplayState(session.observe()));
      const mismatchedDigest = `sha256:${'0'.repeat(64)}`;
      return replay.serializeReplay({
        formatVersion: replay.GAME_REPLAY_FORMAT_VERSION,
        rulesVersion: replay.GAME_RULES_VERSION,
        startRecord: session.startRecord,
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
    } finally {
      session.close();
    }
  });

  await page.getByTestId('import-replay').setInputFiles({
    name: 'colt-city-snapshot-routing.replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(serialized),
  });
  await expect(page.getByTestId('replay-status')).toHaveText(
    'Replay verification failed: a checkpoint or result differs.',
  );
});
