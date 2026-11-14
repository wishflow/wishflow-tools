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
        lastOperationId: 'seed-columbia-river-campaign-gate',
        lastRequestDigest: 'seed-columbia-river-campaign-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function expectColumbiaOverview(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Columbia River' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The salmon swarms in the Columbia River are world-renowned and easy to bait with dynamite.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_29\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const minimap = page.getByTestId('campaign-overview-minimap');
  await expect(minimap).toHaveAttribute('data-scenario-id', 'campaign-oregon-06');
  await expect(minimap).toHaveJSProperty('naturalWidth', 192);
  await expect(minimap).toHaveJSProperty('naturalHeight', 144);
}

async function expectColumbiaOpening(page: import('@playwright/test').Page, context: string): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Columbia River · Level 26');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Captain');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "God bless ya, sailors! It's been quite a while! Let's see if the waters of the Columbia River are as wet as the Mississippi!",
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
}

test('Free Play opens Columbia River on desktop and narrow mobile with the original map, copy, and first intro', async ({ page }) => {
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
    await page.getByTestId('campaign-level-26').click();
    await expectColumbiaOverview(page);

    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    await expect(page.getByRole('heading', { name: '哥伦比亚河' })).toBeVisible();
    await expect(page.locator('.campaign-level-description')).toHaveText(
      '哥伦比亚河的鲑鱼群闻名于世，用炸药很容易就能把它们引出来。',
    );
    await page.getByRole('button', { name: '切换界面语言为英文' }).click();

    await page.getByTestId('campaign-stage-play').click();
    for (const difficulty of ['easy', 'medium', 'hard']) {
      await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
    }
    await page.getByTestId('campaign-difficulty-medium').click();
    await expectColumbiaOpening(page, 'FREE PLAY · OREGON · 26');
  }
});

test('formal Columbia River unlocks after Dynamite Plains while Mount Hood waits for Columbia River completion', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, completedThroughLevelTwentyFour);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-25')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-26')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-27')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-28')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughLevelTwentyFour, 'campaign-oregon-05']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-26')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-27')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-28')).toBeDisabled();
  await page.getByTestId('campaign-level-26').click();
  await expectColumbiaOverview(page);
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectColumbiaOpening(page, 'OREGON · 26');
});

test('replay import dispatches Columbia River through its recorded content snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  const serialized = await page.evaluate(async () => {
    const loadModule = (specifier: string) => import(specifier);
    const [bootstrap, replay, identity] = await Promise.all([
      loadModule('/src/bootstrap/browser.ts') as Promise<typeof import('../../src/bootstrap/browser')>,
      loadModule('/src/game/replay.ts') as Promise<typeof import('../../src/game/replay')>,
      loadModule('/src/content/oregon-06-identity.ts') as Promise<typeof import('../../src/content/oregon-06-identity')>,
    ]);
    const completedScenarioIds = [
      'campaign-oregon-10',
      'campaign-nevada-10',
      'campaign-mississippi-10',
    ];
    const scenarioId = identity.oregon06CampaignId;
    const contentVersion = bootstrap.getBrowserScenarioContentVersion(scenarioId, completedScenarioIds);
    if (!contentVersion) throw new Error('Columbia River replay content version is unavailable');
    const session = await bootstrap.createBrowserGame(completedScenarioIds).open({
      scenarioId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 26_200,
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
    name: 'columbia-river-snapshot-routing.replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(serialized),
  });
  await expect(page.getByTestId('replay-status')).toHaveText(
    'Replay verification failed: a checkpoint or result differs.',
  );
});
