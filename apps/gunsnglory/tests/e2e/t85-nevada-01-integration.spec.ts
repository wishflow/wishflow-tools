import { expect, test } from '@playwright/test';
import { pauseFromHud } from './helpers';

const nevada01ScenarioId = 'campaign-nevada-01';
const dakota10ScenarioId = 'campaign-dakota-10';
const viewports = [
  { name: 'desktop', viewport: { width: 1280, height: 720 }, hasTouch: false },
  { name: 'phone portrait', viewport: { width: 390, height: 844 }, hasTouch: true },
  { name: 'phone landscape', viewport: { width: 844, height: 390 }, hasTouch: true },
] as const;

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

async function writeCompletedProfile(
  page: import('@playwright/test').Page,
  completedScenarios: string[],
): Promise<void> {
  await page.evaluate(async (completed) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default', schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'medium', soundEnabled: false },
        completedScenarios: completed, highScores: {}, appliedSettlementIds: [], revision: 1,
        lastOperationId: 'seed-labyrinth-gulch-formal-gate',
        lastRequestDigest: 'seed-labyrinth-gulch-formal-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function expectLevel41Overview(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Labyrinth Gulch' })).toBeVisible();
  await expect(page.locator('.campaign-overview-level-art')).toHaveAttribute('src', /gng_levelmap_44\.png/);
  await expect.poll(() => page.locator('.campaign-overview-level-art').evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute('data-scenario-id', nevada01ScenarioId);
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'Many settlers have problems to find their way through beautiful Labyrinth Gulch, but the friendly soldiers are happy to help those who got lost.',
  );
}

async function expectFrameAndPanelInsideViewport(
  page: import('@playwright/test').Page,
  panel: import('@playwright/test').Locator,
): Promise<void> {
  const geometry = await panel.evaluate((activePanel) => {
    const frame = document.querySelector<HTMLElement>('.game-frame');
    if (!frame) throw new Error('Level 41 frame is missing');
    const bounds = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    return { frame: bounds(frame), panel: bounds(activePanel), viewport: { width: innerWidth, height: innerHeight } };
  });
  expect(panel).toBeVisible();
  expect(geometry.frame.width / geometry.frame.height).toBeCloseTo(16 / 9, 2);
  expect(geometry.frame.left).toBeGreaterThanOrEqual(0);
  expect(geometry.frame.right).toBeLessThanOrEqual(geometry.viewport.width);
  expect(geometry.panel.left).toBeGreaterThanOrEqual(geometry.frame.left);
  expect(geometry.panel.top).toBeGreaterThanOrEqual(geometry.frame.top);
  expect(geometry.panel.right).toBeLessThanOrEqual(geometry.frame.right);
  expect(geometry.panel.bottom).toBeLessThanOrEqual(geometry.frame.bottom);
}

test('formal Labyrinth Gulch stays locked until Level 40 is complete, then opens as Level 41', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, []);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-nevada').click();
  await expect(page.getByTestId('campaign-level-41')).toBeDisabled();

  await writeCompletedProfile(page, [dakota10ScenarioId]);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-nevada').click();
  await expect(page.getByTestId('campaign-level-41')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-42')).toBeDisabled();
  await page.getByTestId('campaign-level-41').click();
  await expectLevel41Overview(page);
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByTestId('campaign-difficulty-easy')).toBeEnabled();
  await expect(page.getByTestId('campaign-difficulty-medium')).toBeEnabled();
  await expect(page.getByTestId('campaign-difficulty-hard')).toBeEnabled();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.locator('#scene-title')).toHaveText('Labyrinth Gulch · Level 41');
  await expect(page.getByTestId('scene-context')).toHaveText('NEVADA · 41');
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 11');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText('This place reminds me of home.');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});

test('Free Play opens the Level 41 scene and pause board on desktop and phone viewports', async ({ browser }) => {
  for (const profile of viewports) {
    const context = await browser.newContext({
      viewport: profile.viewport,
      ...(profile.hasTouch ? { hasTouch: true, isMobile: true } : {}),
    });
    const page = await context.newPage();
    try {
      await page.goto('/');
      await keepSoundOff(page);
      await page.getByTestId('menu-free-play').click();
      await page.getByTestId('campaign-region-nevada').click();
      await expect(page.getByTestId('campaign-level-41')).toBeEnabled();
      await page.getByTestId('campaign-level-41').click();
      await expectLevel41Overview(page);
      await page.getByTestId('campaign-stage-play').click();
      for (const difficulty of ['easy', 'medium', 'hard']) {
        await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
      }
      await page.getByTestId('campaign-difficulty-easy').click();
      await expect(page.locator('#scene-title')).toHaveText('Labyrinth Gulch · Level 41');
      await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · NEVADA · 41');
      await expect(page.getByTestId('wave-status')).toContainText('Wave 1/11');

      const intro = page.getByTestId('campaign-wave-intro');
      await expect(intro).toBeVisible();
      await expect(intro).toHaveAttribute('data-wave-number', '1');
      await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveAttribute('src', /portrait_pedro\.png/);
      await expectFrameAndPanelInsideViewport(page, intro);

      const continueIntro = page.locator('[data-action="continue-wave-intro"]');
      if (profile.hasTouch) await continueIntro.tap();
      else await continueIntro.click();
      await expect(intro).toBeHidden();
      await expect(page.getByTestId('game-canvas')).toBeVisible();
      await expect(page.getByTestId('asset-load-error')).toBeHidden();

      await pauseFromHud(page, profile.hasTouch ? 'tap' : 'click');
      const pauseBoard = page.getByTestId('pause-board');
      await expect(pauseBoard).toBeVisible();
      await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
      await expectFrameAndPanelInsideViewport(page, pauseBoard);
      await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
    } finally {
      await context.close();
    }
  }
});

test('Nevada replay importer resolves Level 41 and rejects an unknown content version', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  const replays = await page.evaluate(async () => {
    const loadModule = (specifier: string) => import(specifier);
    const [bootstrap, replay, identity] = await Promise.all([
      loadModule('/src/bootstrap/browser.ts') as Promise<typeof import('../../src/bootstrap/browser')>,
      loadModule('/src/game/replay.ts') as Promise<typeof import('../../src/game/replay')>,
      loadModule('/src/content/nevada-01-identity.ts') as Promise<typeof import('../../src/content/nevada-01-identity')>,
    ]);
    const scenarioId = identity.nevada01CampaignId;
    const version = identity.nevada01CampaignContentVersion;
    const session = await bootstrap.createBrowserGameForNevada01Replay(version).open({
      scenarioId, contentVersion: version, mode: 'free', difficulty: 'medium', randomSeed: 41_085,
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
          startRecord: { ...session.startRecord, contentVersion: `${version}-unknown` },
        }),
      };
    } finally {
      session.close();
    }
  });

  await page.getByTestId('import-replay').setInputFiles({
    name: 'labyrinth-gulch-level-41.replay.json', mimeType: 'application/json',
    buffer: Buffer.from(replays.recorded),
  });
  await expect(page.getByTestId('replay-status')).toHaveText(
    'Replay verification failed: a checkpoint or result differs.',
  );

  await page.getByTestId('import-replay').setInputFiles({
    name: 'labyrinth-gulch-unknown-version.replay.json', mimeType: 'application/json',
    buffer: Buffer.from(replays.unsupported),
  });
  await expect(page.getByTestId('replay-status')).toHaveText(
    'Replay content version is unavailable in this build.',
  );
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
});
