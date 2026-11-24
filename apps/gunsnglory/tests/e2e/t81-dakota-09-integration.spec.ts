import { expect, test } from '@playwright/test';

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

async function writeProfile(page: import('@playwright/test').Page, completedScenarios: string[]): Promise<void> {
  await page.evaluate(async (completed) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default', schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'medium', soundEnabled: false },
        completedScenarios: completed, highScores: {}, appliedSettlementIds: [],
        revision: 1, lastOperationId: 'seed-snow-town-gate', lastRequestDigest: 'seed-snow-town-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

const completedThroughLevelThirtySix = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  ...Array.from({ length: 11 }, (_, index) => `campaign-oregon-${String(index + 1).padStart(2, '0')}`),
  'campaign-dakota-02', 'campaign-dakota-03', 'campaign-dakota-04', 'campaign-dakota-05', 'campaign-dakota-06',
];

test('Free Play opens Snow Town with the real Level 39 content without changing campaign progress', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeProfile(page, []);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('10 implemented levels available');
  await expect(page.getByTestId('campaign-level-39')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-40')).toBeEnabled();
  await page.getByTestId('campaign-level-39').click();

  await expect(page.getByRole('heading', { name: 'Snow Town' })).toBeVisible();
  await expect(page.locator('.campaign-overview-level-art')).toHaveAttribute('src', /gng_levelmap_42\.png/);
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute('data-scenario-id', 'campaign-dakota-09');
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The snowbound streets of Snow Town can be admired on many postcards.',
  );

  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-hard').click();
  await expect(page.locator('#scene-title')).toHaveText('Snow Town · Level 39');
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · DAKOTA · 39');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 8');
  await expect(page.getByTestId('campaign-wave-intro-text')).toContainText('Christmas day');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');

  const progress = await page.evaluate(async () => new Promise<{ completedScenarios: string[]; highScores: Record<string, number> }>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction('profiles').objectStore('profiles').get('default');
      read.onsuccess = () => { database.close(); resolve(read.result); };
      read.onerror = () => reject(read.error);
    };
  }));
  expect(progress.completedScenarios).toEqual([]);
  expect(progress.highScores).toEqual({});
});

test('Formal Snow Town unlocks only after Wayne Waters is complete', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeProfile(page, completedThroughLevelThirtySix);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-38')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-39')).toBeDisabled();

  await writeProfile(page, [...completedThroughLevelThirtySix, 'campaign-dakota-07']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-38')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-39')).toBeDisabled();

  await writeProfile(page, [...completedThroughLevelThirtySix, 'campaign-dakota-07', 'campaign-dakota-08']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-39')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-40')).toBeDisabled();
  await page.getByTestId('campaign-level-39').click();
  await expect(page.getByRole('heading', { name: 'Snow Town' })).toBeVisible();
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute('data-scenario-id', 'campaign-dakota-09');
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-hard').click();
  await expect(page.locator('#scene-title')).toHaveText('Snow Town · Level 39');
  await expect(page.getByTestId('scene-context')).toHaveText('DAKOTA · 39');
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 8');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
