import { expect, test } from '@playwright/test';

const completedThroughLevelTwelve = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  'campaign-mississippi-11',
  'campaign-mississippi-12',
];

async function seedCompletedCampaign(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async (completedScenarios) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'medium', soundEnabled: false },
        completedScenarios,
        highScores: {},
        appliedSettlementIds: [],
        revision: 1,
        lastOperationId: 'seed-golden-river-campaign',
        lastRequestDigest: 'seed-golden-river-campaign',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedThroughLevelTwelve);
}

test('Free Play opens Golden River directly with its researched intro and first wave', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const soundToggle = page.getByTestId('menu-sound');
  if (await soundToggle.getAttribute('aria-pressed') !== 'false') await soundToggle.click();

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('5 implemented levels available in this region');
  await expect(page.getByTestId('campaign-level-13')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-14')).toBeEnabled();
  await page.getByTestId('campaign-level-13').click();

  await expect(page.getByRole('heading', { name: 'Golden River' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'Many cowboys have already become rich men at Golden River.',
  );
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Golden River · Level 13');
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · MISSISSIPPI · 13');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Settlers');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "Hurry, honey! I want to go off and prospect for a little more gold while we're here.",
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('campaign-wave-intro')).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});

test('formal Golden River unlocks in the campaign menu after level 12 is complete', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await seedCompletedCampaign(page);
  await page.reload();
  const soundToggle = page.getByTestId('menu-sound');
  if (await soundToggle.getAttribute('aria-pressed') !== 'false') await soundToggle.click();

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-level-13')).toBeEnabled();
  await page.getByTestId('campaign-level-13').click();
  await expect(page.getByRole('heading', { name: 'Golden River' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Golden River · Level 13');
  await expect(page.getByTestId('scene-context')).toHaveText('MISSISSIPPI · 13');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
