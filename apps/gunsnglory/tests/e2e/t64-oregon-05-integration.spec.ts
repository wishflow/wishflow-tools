import { expect, test } from '@playwright/test';

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

const completedThroughLevelTwentyThree = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  'campaign-oregon-01',
  'campaign-oregon-02',
  'campaign-oregon-03',
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
        lastOperationId: 'seed-dynamite-plains-campaign-gate',
        lastRequestDigest: 'seed-dynamite-plains-campaign-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function expectDynamiteOverview(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Dynamite Plains' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The Dynamite Plains are a welcome destination for diggers and prospective demolition experts.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_28\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const minimap = page.getByTestId('campaign-overview-minimap');
  await expect(minimap).toHaveAttribute('data-scenario-id', 'campaign-oregon-05');
  await expect(minimap).toHaveJSProperty('naturalWidth', 192);
  await expect(minimap).toHaveJSProperty('naturalHeight', 144);
}

async function expectDynamiteOpening(page: import('@playwright/test').Page, context: string): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Dynamite Plains · Level 25');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Dynamite');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'Good morning, Boss! While you had a siesta, we prepared this valley with some mines! You just have to tap the trigger at the right moment and KABOOM!',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
}

test('Free Play opens Dynamite Plains on desktop and narrow mobile, with map 28 and the original opening', async ({ page }) => {
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
    await page.getByTestId('campaign-level-25').click();
    await expectDynamiteOverview(page);

    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    await expect(page.getByRole('heading', { name: '炸药平原' })).toBeVisible();
    await expect(page.locator('.campaign-level-description')).toHaveText(
      '炸药平原是矿工和未来爆破专家们向往的好去处。',
    );
    await page.getByRole('button', { name: '切换界面语言为英文' }).click();

    await page.getByTestId('campaign-stage-play').click();
    for (const difficulty of ['easy', 'medium', 'hard']) {
      await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
    }
    await page.getByTestId('campaign-difficulty-medium').click();
    await expectDynamiteOpening(page, 'FREE PLAY · OREGON · 25');
  }
});

test('formal Dynamite Plains unlocks after Fort Echo and opens as Level 25', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, completedThroughLevelTwentyThree);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-24')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-25')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-26')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughLevelTwentyThree, 'campaign-oregon-04']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-25')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-26')).toBeDisabled();
  await page.getByTestId('campaign-level-25').click();
  await expectDynamiteOverview(page);
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectDynamiteOpening(page, 'OREGON · 25');
});

test('browser builder exposes and triggers the recorded Dynamite snapshot without playing audio', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const loadModule = (specifier: string) => import(specifier);
    const [bootstrap, identity] = await Promise.all([
      loadModule('/src/bootstrap/browser.ts') as Promise<typeof import('../../src/bootstrap/browser')>,
      loadModule('/src/content/oregon-05-identity.ts') as Promise<typeof import('../../src/content/oregon-05-identity')>,
    ]);
    const completedScenarioIds = ['campaign-mississippi-10'];
    const scenarioId = identity.oregon05CampaignId;
    const contentVersion = bootstrap.getBrowserScenarioContentVersion(scenarioId, completedScenarioIds);
    if (!contentVersion) throw new Error('Dynamite Plains browser content version is unavailable');
    const session = await bootstrap.createBrowserGame(completedScenarioIds).open({
      scenarioId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 65_025,
    });
    try {
      const initial = session.observe();
      const dynamite = initial.dynamites?.find(({ id }) => id === 'dynamite-1');
      if (!dynamite?.unlocked) throw new Error('recorded Dynamite unlock was not restored');
      const accepted = session.submitIntent({
        type: 'select-at',
        x: dynamite.triggerCell.x + 0.5,
        y: dynamite.triggerCell.y + 0.5,
      });
      const after = session.advance({ deltaMs: 0 });
      return {
        accepted,
        event: after.events.find((event) => event.type === 'dynamite-exploded')?.type,
        cooldown: after.dynamites?.find(({ id }) => id === dynamite.id)?.cooldownRemainingMs,
      };
    } finally {
      session.close();
    }
  });
  expect(result).toEqual({ accepted: true, event: 'dynamite-exploded', cooldown: 59_000 });
});

test('replay import routes Dynamite Plains through its recorded unlock snapshot builder', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const serialized = await page.evaluate(async () => {
    const loadModule = (specifier: string) => import(specifier);
    const [bootstrap, replay, identity] = await Promise.all([
      loadModule('/src/bootstrap/browser.ts') as Promise<typeof import('../../src/bootstrap/browser')>,
      loadModule('/src/game/replay.ts') as Promise<typeof import('../../src/game/replay')>,
      loadModule('/src/content/oregon-05-identity.ts') as Promise<typeof import('../../src/content/oregon-05-identity')>,
    ]);
    const completedScenarioIds = ['campaign-mississippi-10', 'campaign-oregon-10'];
    const scenarioId = identity.oregon05CampaignId;
    const contentVersion = bootstrap.getBrowserScenarioContentVersion(scenarioId, completedScenarioIds);
    if (!contentVersion) throw new Error('Dynamite Plains replay content version is unavailable');
    const session = await bootstrap.createBrowserGame(completedScenarioIds).open({
      scenarioId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 65_026,
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
    name: 'dynamite-plains-snapshot-routing.replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(serialized),
  });
  await expect(page.getByTestId('replay-status')).toHaveText(
    'Replay verification failed: a checkpoint or result differs.',
  );
});
