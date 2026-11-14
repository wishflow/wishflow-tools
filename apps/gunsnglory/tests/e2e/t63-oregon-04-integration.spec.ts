import { expect, test } from '@playwright/test';

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

test('Free Play opens Fort Echo with map 27, bilingual copy, and its first wave', async ({ page }) => {
  await page.addInitScript(() => {
    const audioSources: string[] = [];
    (window as Window & { __loadedMediaSources?: string[] }).__loadedMediaSources = audioSources;
    HTMLMediaElement.prototype.load = function load() {
      audioSources.push(this.src);
    };
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('7 implemented levels available');
  await expect(page.getByTestId('campaign-level-24')).toBeEnabled();
  await page.getByTestId('campaign-level-24').click();

  await expect(page.getByRole('heading', { name: 'Fort Echo' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The surround sound around the high placed Fort Echo is fabulous for every traveler.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_27\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const minimap = page.getByTestId('campaign-overview-minimap');
  await expect(minimap).toHaveAttribute('data-scenario-id', 'campaign-oregon-04');
  await expect(minimap).toHaveJSProperty('naturalWidth', 192);
  await expect(minimap).toHaveJSProperty('naturalHeight', 144);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '回声堡' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    '高高耸立的回声堡四周环绕着美妙回声，令每位旅人心旷神怡。',
  );
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByTestId('campaign-difficulty-easy')).toBeEnabled();
  await expect(page.getByTestId('campaign-difficulty-medium')).toBeEnabled();
  await expect(page.getByTestId('campaign-difficulty-hard')).toBeEnabled();
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Fort Echo · Level 24');
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · OREGON · 24');
  await expect(page.getByTestId('scene-difficulty')).toContainText('MEDIUM');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Deserter');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "Sir, the cannons of Fort Echo are ready to fire! We're waiting for your orders… orders… orders…",
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __loadedMediaSources?: string[] }).__loadedMediaSources?.some((source) =>
      new URL(source).pathname.endsWith('/assets/music/music_atmo_forest.ogg'),
    ),
  )).toBe(true);
});

const completedThroughLevelTwentyThree = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  'campaign-oregon-01',
  'campaign-oregon-02',
  'campaign-oregon-03',
];

async function writeCompletedProfile(page: import('@playwright/test').Page): Promise<void> {
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
        lastOperationId: 'seed-fort-echo-formal-gate',
        lastRequestDigest: 'seed-fort-echo-formal-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedThroughLevelTwentyThree);
}

test('formal Fort Echo stays locked until Chinook Woods is complete, then opens as Level 24', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-24')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-25')).toBeDisabled();

  await writeCompletedProfile(page);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-24')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-25')).toBeDisabled();
  await page.getByTestId('campaign-level-24').click();
  await expect(page.getByRole('heading', { name: 'Fort Echo' })).toBeVisible();
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-oregon-04',
  );
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.locator('#scene-title')).toHaveText('Fort Echo · Level 24');
  await expect(page.getByTestId('scene-context')).toHaveText('OREGON · 24');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10');
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Deserter');
});

test('Free Play starts Fort Echo with Easy and Hard difficulty without campaign unlocks', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  for (const difficulty of ['easy', 'hard'] as const) {
    if (difficulty === 'hard') await page.reload();
    await keepSoundOff(page);
    await page.getByTestId('menu-free-play').click();
    await page.getByTestId('campaign-region-oregon').click();
    await page.getByTestId('campaign-level-24').click();
    await page.getByTestId('campaign-stage-play').click();
    await page.getByTestId(`campaign-difficulty-${difficulty}`).click();
    await expect(page.locator('#scene-title')).toHaveText('Fort Echo · Level 24');
    await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · OREGON · 24');
    await expect(page.getByTestId('scene-difficulty')).toContainText(difficulty.toUpperCase());
    await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10');
    await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Deserter');
  }
});

async function inspectBrowserCannonPool(page: import('@playwright/test').Page): Promise<{
  selected: boolean;
  accepted: boolean;
  cashAfterHire: number | undefined;
  hireEvent?: { type: string; unitType?: string; price?: number };
  hiredActivity: number | undefined;
  spawned?: { id: string; type: string; activity: number; asset: string; cell: { x: number; y: number } };
}> {
  return page.evaluate(async () => {
    const loadModule = (specifier: string) => import(specifier);
    const [bootstrap, identity] = await Promise.all([
      loadModule('/src/bootstrap/browser.ts') as Promise<typeof import('../../src/bootstrap/browser')>,
      loadModule('/src/content/oregon-04-identity.ts') as Promise<typeof import('../../src/content/oregon-04-identity')>,
    ]);
    const completedScenarioIds: string[] = [];
    const scenarioId = identity.oregon04CampaignId;
    const contentVersion = bootstrap.getBrowserScenarioContentVersion(scenarioId, completedScenarioIds);
    if (!contentVersion) throw new Error('Fort Echo browser content version is unavailable');
    const session = await bootstrap.createBrowserGame(completedScenarioIds).open({
      scenarioId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 64_004,
    });
    try {
      const sleepingCannon = session.observe().units.find(({ type, activity }) => type === 'cannon' && activity === 4);
      if (!sleepingCannon) throw new Error('Fort Echo browser builder has no TDM-backed sleeping Cannon');
      const selected = session.submitIntent({
        type: 'select-at',
        x: sleepingCannon.cell.x + 0.5,
        y: sleepingCannon.cell.y + 0.5,
      });
      let view = session.advance({ deltaMs: 100 });
      if (!view.units.find(({ id }) => id === sleepingCannon.id)?.selected) {
        throw new Error('Fort Echo Cannon could not be selected through the browser GameSession');
      }
      const accepted = session.submitIntent({
        type: 'hire-map-unit',
        unitId: sleepingCannon.id,
        commandId: 'fort-echo-browser-cannon-hire',
      });
      view = session.advance({ deltaMs: 100 });
      const hireEvent = view.events.find((event) => event.type === 'map-unit-hired');
      const hiredActivity = view.units.find(({ id }) => id === sleepingCannon.id)?.activity;
      const cashAfterHire = view.wave?.cash;
      for (let frame = 0; frame < 200 && !view.units.some(({ id }) => id === 'cannon-spawn-01'); frame += 1) {
        view = session.advance({ deltaMs: 100 });
      }
      const spawned = view.units.find(({ id }) => id === 'cannon-spawn-01');
      return {
        selected,
        accepted,
        cashAfterHire,
        hireEvent: hireEvent?.type === 'map-unit-hired'
          ? { type: hireEvent.type, unitType: hireEvent.unitType, price: hireEvent.price }
          : undefined,
        hiredActivity,
        spawned: spawned ? {
          id: spawned.id,
          type: spawned.type,
          activity: spawned.activity ?? -1,
          asset: spawned.asset,
          cell: spawned.cell,
        } : undefined,
      };
    } finally {
      session.close();
    }
  });
}

test('browser Fort Echo builder hires a Cannon and dispatches it from the real Fort', async ({ page }) => {
  await page.goto('/');
  const result = await inspectBrowserCannonPool(page);
  expect(result.selected).toBe(true);
  expect(result.accepted).toBe(true);
  expect(result.cashAfterHire).toBe(100);
  expect(result.hireEvent).toEqual({ type: 'map-unit-hired', unitType: 'cannon', price: 150 });
  expect(result.hiredActivity).toBe(5);
  expect(result.spawned).toEqual({
    id: 'cannon-spawn-01',
    type: 'cannon',
    activity: 2,
    asset: 'player_cannon',
    cell: { x: 10, y: 12 },
  });
});

async function createFortEchoReplayRoutingProbe(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(async () => {
    const loadModule = (specifier: string) => import(specifier);
    const [bootstrap, replay, identity] = await Promise.all([
      loadModule('/src/bootstrap/browser.ts') as Promise<typeof import('../../src/bootstrap/browser')>,
      loadModule('/src/game/replay.ts') as Promise<typeof import('../../src/game/replay')>,
      loadModule('/src/content/oregon-04-identity.ts') as Promise<typeof import('../../src/content/oregon-04-identity')>,
    ]);
    const scenarioId = identity.oregon04CampaignId;
    const completedScenarioIds = ['campaign-nevada-10'];
    const contentVersion = bootstrap.getBrowserScenarioContentVersion(scenarioId, completedScenarioIds);
    if (!contentVersion) throw new Error('Fort Echo replay content version is unavailable');
    const session = await bootstrap.createBrowserGame(completedScenarioIds).open({
      scenarioId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 64_005,
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
}

test('Fort Echo replay import resolves its recorded content snapshot before the expected checkpoint mismatch', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const serialized = await createFortEchoReplayRoutingProbe(page);
  await page.getByTestId('import-replay').setInputFiles({
    name: 'fort-echo-snapshot-routing.replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(serialized),
  });
  await expect(page.getByTestId('replay-status')).toHaveText(
    'Replay verification failed: a checkpoint or result differs.',
  );
});
