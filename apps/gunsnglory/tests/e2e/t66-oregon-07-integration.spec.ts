import { expect, test } from '@playwright/test';

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

const completedThroughLevelTwentyFour = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  'campaign-oregon-01',
  'campaign-oregon-02',
  'campaign-oregon-03',
  'campaign-oregon-04',
];

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
        lastOperationId: 'seed-mount-hood-campaign-gate',
        lastRequestDigest: 'seed-mount-hood-campaign-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function expectMountHoodOverview(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Mount Hood' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The cold summits of Mount Hood offer perfect walking routes for mountain air enthusiasts.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_30\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const minimap = page.getByTestId('campaign-overview-minimap');
  await expect(minimap).toHaveAttribute('data-scenario-id', 'campaign-oregon-07');
  await expect(minimap).toHaveJSProperty('naturalWidth', 192);
  await expect(minimap).toHaveJSProperty('naturalHeight', 144);
}

async function expectMountHoodOpening(page: import('@playwright/test').Page, context: string): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Mount Hood · Level 27');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Dynamite');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'Hey, Boss, we buried a lot of dynamite again, at the base of Mount Hood!',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
}

test('Free Play opens Mount Hood on desktop and narrow mobile with map 30 and the original opening', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await keepSoundOff(page);

    await page.getByTestId('menu-free-play').click();
    await page.getByTestId('campaign-region-oregon').click();
    await expect(page.getByTestId('campaign-menu-progress')).toContainText('7 implemented levels available');
    for (const level of [21, 22, 23, 24, 25, 26, 27]) {
      await expect(page.getByTestId(`campaign-level-${level}`)).toBeEnabled();
    }
    await expect(page.getByTestId('campaign-level-28')).toBeDisabled();
    await page.getByTestId('campaign-level-27').click();
    await expectMountHoodOverview(page);

    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    await expect(page.getByRole('heading', { name: '胡德山' })).toBeVisible();
    await expect(page.locator('.campaign-level-description')).toHaveText(
      '胡德山寒冷的山巅，是热爱山间清新空气的人们徒步旅行的理想去处。',
    );
    await page.getByRole('button', { name: '切换界面语言为英文' }).click();

    await page.getByTestId('campaign-stage-play').click();
    for (const difficulty of ['easy', 'medium', 'hard']) {
      await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
    }
    await page.getByTestId('campaign-difficulty-medium').click();
    await expectMountHoodOpening(page, 'FREE PLAY · OREGON · 27');
  }
});

test('formal Mount Hood unlocks after Columbia River while Level 28 stays disabled', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  const completedThroughLevelTwentyFive = [...completedThroughLevelTwentyFour, 'campaign-oregon-05'];
  await writeCompletedProfile(page, completedThroughLevelTwentyFive);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-26')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-27')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-28')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughLevelTwentyFive, 'campaign-oregon-06']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-27')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-28')).toBeDisabled();
  await page.getByTestId('campaign-level-27').click();
  await expectMountHoodOverview(page);
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectMountHoodOpening(page, 'OREGON · 27');
});

test('replay import dispatches Mount Hood through its recorded unlock snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  const serialized = await page.evaluate(async () => {
    const loadModule = (specifier: string) => import(specifier);
    const [bootstrap, replay, identity, unlocks] = await Promise.all([
      loadModule('/src/bootstrap/browser.ts') as Promise<typeof import('../../src/bootstrap/browser')>,
      loadModule('/src/game/replay.ts') as Promise<typeof import('../../src/game/replay')>,
      loadModule('/src/content/oregon-07-identity.ts') as Promise<typeof import('../../src/content/oregon-07-identity')>,
      loadModule('/src/content/mississippi-unit-unlocks.ts') as Promise<typeof import('../../src/content/mississippi-unit-unlocks')>,
    ]);
    const completedScenarioIds = unlocks.completedScenarioIdsForMississippiUnitUnlockSnapshot({
      grandpa: false,
      sniper: false,
      pyromaniac: false,
      salesman: true,
    });
    const scenarioId = identity.oregon07CampaignId;
    const contentVersion = bootstrap.getBrowserScenarioContentVersion(scenarioId, completedScenarioIds);
    if (!contentVersion) throw new Error('Mount Hood replay content version is unavailable');
    const session = await bootstrap.createBrowserGame(completedScenarioIds).open({
      scenarioId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 27_200,
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
    name: 'mount-hood-snapshot-routing.replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(serialized),
  });
  await expect(page.getByTestId('replay-status')).toHaveText(
    'Replay verification failed: a checkpoint or result differs.',
  );
});
