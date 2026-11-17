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
        lastOperationId: 'seed-snake-river-unlock',
        lastRequestDigest: 'seed-snake-river-unlock',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

const completedThroughOregonSeven = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, index) => `campaign-oregon-${String(index + 1).padStart(2, '0')}`),
];

async function expectSnakeRiverOpening(page: import('@playwright/test').Page, context: string): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Snake River · Level 29');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/6');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Dynamite');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'Finally, some rest! Slow down those settlers and trigger the mines!',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
}

test('Free Play opens Snake River on desktop and narrow mobile with map 32 and the original opening', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await keepSoundOff(page);

    await page.getByTestId('menu-free-play').click();
    await page.getByTestId('campaign-region-oregon').click();
    await expect(page.getByTestId('campaign-menu-progress')).toContainText('9 implemented levels available');
    await expect(page.getByTestId('campaign-level-29')).toBeEnabled();
    await page.getByTestId('campaign-level-29').click();

    await expect(page.getByRole('heading', { name: 'Snake River' })).toBeVisible();
    await expect(page.locator('.campaign-level-description')).toHaveText(
      'The Snake River winds through Oregon and offers much fun for nature lovers.',
    );
    const mapArt = page.locator('.campaign-overview-level-art');
    await expect(mapArt).toHaveAttribute('src', /gng_levelmap_32\.png/);
    await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    const minimap = page.getByTestId('campaign-overview-minimap');
    await expect(minimap).toHaveAttribute('data-scenario-id', 'campaign-oregon-09');
    await expect(minimap).toHaveJSProperty('naturalWidth', 192);
    await expect(minimap).toHaveJSProperty('naturalHeight', 144);

    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    await expect(page.getByRole('heading', { name: '蛇河' })).toBeVisible();
    await expect(page.locator('.campaign-level-description')).toHaveText(
      '蛇河蜿蜒流经俄勒冈，是自然爱好者游玩的好去处。',
    );
    await page.getByRole('button', { name: '切换界面语言为英文' }).click();

    await page.getByTestId('campaign-stage-play').click();
    await expect(page.getByTestId('campaign-difficulty-medium')).toBeEnabled();
    await page.getByTestId('campaign-difficulty-medium').click();
    await expectSnakeRiverOpening(page, 'FREE PLAY · OREGON · 29');
  }
});

test('formal Snake River remains gated on Colt City but opens with its six-wave dialogue', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, [...completedThroughOregonSeven, 'campaign-oregon-08']);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-29')).toBeEnabled();
  await page.getByTestId('campaign-level-29').click();
  await expect(page.getByRole('heading', { name: 'Snake River' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectSnakeRiverOpening(page, 'OREGON · 29');
});
