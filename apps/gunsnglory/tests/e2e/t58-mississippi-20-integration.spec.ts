import { expect, test } from '@playwright/test';

const completedThroughLevelEighteen = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 8 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
];

async function writeProfile(page: import('@playwright/test').Page, completedScenarios: string[]): Promise<void> {
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
        lastOperationId: 'seed-horse-hills-campaign',
        lastRequestDigest: 'seed-horse-hills-campaign',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const soundToggle = page.getByTestId('menu-sound');
  if (await soundToggle.getAttribute('aria-pressed') !== 'false') await soundToggle.click();
}

async function expectHorseHillsOverview(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Horse Hills' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'Every year, thrilling horse races take place in Horse Hills; the winner is awarded a golden horseshoe!',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_23\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
}

async function expectHorseHillsOpening(page: import('@playwright/test').Page, context: string): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Horse Hills · Level 20');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Mexican');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText("I love horses! They're delicious!");
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
}

test('Free Play opens Horse Hills from map23 overview into the first wave', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('10 implemented levels available in this region');
  await expect(page.getByTestId('campaign-level-20')).toBeEnabled();
  await page.getByTestId('campaign-level-20').click();
  await expectHorseHillsOverview(page);

  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectHorseHillsOpening(page, 'FREE PLAY · MISSISSIPPI · 20');
});

test('formal Horse Hills stays locked until Dust Falls is recorded, then opens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, completedThroughLevelEighteen);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-level-19')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-20')).toBeDisabled();

  await writeProfile(page, [...completedThroughLevelEighteen, 'campaign-mississippi-19']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-level-20')).toBeEnabled();
  await page.getByTestId('campaign-level-20').click();
  await expectHorseHillsOverview(page);

  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectHorseHillsOpening(page, 'MISSISSIPPI · 20');
});
