import { expect, test } from '@playwright/test';

const completedThroughLevelSixteen = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 6 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
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
        lastOperationId: 'seed-shadow-town-campaign',
        lastRequestDigest: 'seed-shadow-town-campaign',
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

async function expectShadowTownOverview(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Shadow Town' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    "There's only one town where you're faster than your shadow: Shadow Town.",
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_21\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
}

async function expectShadowTownOpening(page: import('@playwright/test').Page, context: string): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Shadow Town · Level 18');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Pedro');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText('Welcome to Shadow Town!');
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
}

test('Free Play opens Shadow Town from its map21 overview into the first wave', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('8 implemented levels available in this region');
  await expect(page.getByTestId('campaign-level-18')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-19')).toBeDisabled();
  await page.getByTestId('campaign-level-18').click();
  await expectShadowTownOverview(page);

  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectShadowTownOpening(page, 'FREE PLAY · MISSISSIPPI · 18');
});

test('formal Shadow Town is locked before Dead Rocks and opens after its completion is recorded', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, completedThroughLevelSixteen);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-level-17')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-18')).toBeDisabled();

  await writeProfile(page, [...completedThroughLevelSixteen, 'campaign-mississippi-17']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-level-18')).toBeEnabled();
  await page.getByTestId('campaign-level-18').click();
  await expectShadowTownOverview(page);

  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectShadowTownOpening(page, 'MISSISSIPPI · 18');
});
