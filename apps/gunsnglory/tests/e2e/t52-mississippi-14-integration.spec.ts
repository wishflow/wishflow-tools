import { expect, test } from '@playwright/test';

const completedThroughLevelTwelve = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  'campaign-mississippi-11',
  'campaign-mississippi-12',
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
        lastOperationId: 'seed-riverside-mountains-campaign',
        lastRequestDigest: 'seed-riverside-mountains-campaign',
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

test('Free Play opens Riverside Mountains at all difficulties with its original intro and first wave', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('6 implemented levels available in this region');
  await expect(page.getByTestId('campaign-level-14')).toBeEnabled();
  await page.getByTestId('campaign-level-14').click();

  await expect(page.getByRole('heading', { name: 'Riverside Mountains' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Riverside Mountains · Level 14');
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · MISSISSIPPI · 14');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/7');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Settlers');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText("I can't help feeling we forgot something...");
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});

test('formal Riverside Mountains unlocks after Golden River and opens as level 14', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, [...completedThroughLevelTwelve, 'campaign-mississippi-13']);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-level-14')).toBeEnabled();
  await page.getByTestId('campaign-level-14').click();
  await expect(page.getByRole('heading', { name: 'Riverside Mountains' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Riverside Mountains · Level 14');
  await expect(page.getByTestId('scene-context')).toHaveText('MISSISSIPPI · 14');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/7');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
