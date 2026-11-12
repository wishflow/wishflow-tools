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
        lastOperationId: 'seed-railroad-canyon-campaign',
        lastRequestDigest: 'seed-railroad-canyon-campaign',
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

test('Free Play opens Railroad Canyon with its map, first intro and nine-wave HUD', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('6 implemented levels available in this region');
  await expect(page.getByTestId('campaign-level-15')).toBeEnabled();
  await page.getByTestId('campaign-level-15').click();

  await expect(page.getByRole('heading', { name: 'Railroad Canyon' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Railroad Canyon · Level 15');
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · MISSISSIPPI · 15');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Settlers');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText("Didn't you say that we could take the train from here?");
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});

test('formal Railroad Canyon is available after Riverside Mountains and opens at level 15', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, [...completedThroughLevelTwelve, 'campaign-mississippi-13', 'campaign-mississippi-14']);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-level-15')).toBeEnabled();
  await page.getByTestId('campaign-level-15').click();
  await expect(page.getByRole('heading', { name: 'Railroad Canyon' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Railroad Canyon · Level 15');
  await expect(page.getByTestId('scene-context')).toHaveText('MISSISSIPPI · 15');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Settlers');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
