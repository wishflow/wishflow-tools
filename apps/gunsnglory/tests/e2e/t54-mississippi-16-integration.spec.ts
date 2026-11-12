import { expect, test } from '@playwright/test';

const completedThroughLevelFourteen = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 4 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
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
        lastOperationId: 'seed-highpoint-terrace-campaign',
        lastRequestDigest: 'seed-highpoint-terrace-campaign',
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

test('Free Play opens Highpoint Terrace with the map, first dialogue, and eight-wave HUD', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('6 implemented levels available in this region');
  await expect(page.getByTestId('campaign-level-16')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-17')).toBeDisabled();
  await page.getByTestId('campaign-level-16').click();

  await expect(page.getByRole('heading', { name: 'Highpoint Terrace' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The notorious Highpoint Terrace was once a dangerous spot, but soldiers now guard the area from their forts located up high.',
  );
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Highpoint Terrace · Level 16');
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · MISSISSIPPI · 16');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Settlers');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "We're safe here, honey! The soldiers from the forts would never get mixed up with bandits!",
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});

test('formal Highpoint Terrace stays locked until Railroad Canyon is complete, then opens as level 16', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, completedThroughLevelFourteen);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-level-15')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-16')).toBeDisabled();

  await writeProfile(page, [...completedThroughLevelFourteen, 'campaign-mississippi-15']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-level-16')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-17')).toBeDisabled();
  await page.getByTestId('campaign-level-16').click();

  await expect(page.getByRole('heading', { name: 'Highpoint Terrace' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Highpoint Terrace · Level 16');
  await expect(page.getByTestId('scene-context')).toHaveText('MISSISSIPPI · 16');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Settlers');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
