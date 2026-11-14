import { expect, test } from '@playwright/test';

const completedThroughLevelTwenty = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
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
        lastOperationId: 'seed-cashcow-canyon-formal-gate',
        lastRequestDigest: 'seed-cashcow-canyon-formal-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

async function expectCashcowOverview(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Cashcow Canyon' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The sun reaches its highest spot above this beautiful valley at noon.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_25\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
}

async function expectCashcowOpening(
  page: import('@playwright/test').Page,
  context: string,
  difficulty: string,
): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Cashcow Canyon · Level 22');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('scene-difficulty')).toContainText(difficulty);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Gunslinger');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'The greener the grass, the more golden the gold! And I love gold! Yeehaaaah!',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
}

test('Free Play opens Cashcow Canyon on desktop and narrow mobile viewports', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await keepSoundOff(page);

    await page.getByTestId('menu-free-play').click();
    await page.getByTestId('campaign-region-oregon').click();
    await expect(page.getByTestId('campaign-menu-progress')).toContainText('6 implemented levels available');
    await expect(page.getByTestId('campaign-level-22')).toBeEnabled();
    await page.getByTestId('campaign-level-22').click();
    await expectCashcowOverview(page);

    await page.getByTestId('campaign-stage-play').click();
    for (const difficulty of ['easy', 'medium', 'hard']) {
      await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
    }
    await page.getByTestId('campaign-difficulty-hard').click();
    await expectCashcowOpening(page, 'FREE PLAY · OREGON · 22', 'HARD');
  }
});

test('formal Cashcow Canyon stays locked until Eastwood Forest is completed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, completedThroughLevelTwenty);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-21')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-22')).toBeDisabled();

  await writeProfile(page, [
    ...completedThroughLevelTwenty,
    'campaign-oregon-01',
    'campaign-oregon-10',
    'campaign-dakota-10',
    'campaign-nevada-10',
    'campaign-alaska-10',
  ]);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-22')).toBeEnabled();
  await page.getByTestId('campaign-level-22').click();
  await expectCashcowOverview(page);
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectCashcowOpening(page, 'OREGON · 22', 'MEDIUM');
});
