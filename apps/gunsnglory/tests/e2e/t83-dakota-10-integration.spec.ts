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
        revision: 1, lastOperationId: 'seed-sioux-falls-profile', lastRequestDigest: 'seed-sioux-falls-profile',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

const completedThroughLevelThirtyEight = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  ...Array.from({ length: 11 }, (_, index) => `campaign-oregon-${String(index + 1).padStart(2, '0')}`),
  'campaign-dakota-02', 'campaign-dakota-03', 'campaign-dakota-04', 'campaign-dakota-05',
  'campaign-dakota-06', 'campaign-dakota-07', 'campaign-dakota-08',
];

test('Free Play opens Sioux Falls at all difficulties without writing campaign progress', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeProfile(page, []);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('10 implemented levels available');
  await expect(page.getByTestId('campaign-level-40')).toBeEnabled();
  await page.getByTestId('campaign-level-40').click();

  await expect(page.getByRole('heading', { name: 'Sioux Falls' })).toBeVisible();
  await expect(page.locator('.campaign-overview-level-art')).toHaveAttribute('src', /gng_levelmap_43\.png/);
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute('data-scenario-id', 'campaign-dakota-10');
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'In Sioux Falls, you can watch the local Dakota natives at their daily morning washing rituals.',
  );

  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-hard').click();
  await expect(page.locator('#scene-title')).toHaveText('Sioux Falls · Level 40');
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · DAKOTA · 40');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 10');
  await expect(page.getByTestId('campaign-wave-intro-text')).toContainText('very wet here');
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

test('Formal Sioux Falls is locked until Snow Town is completed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeProfile(page, []);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-40')).toBeDisabled();

  await writeProfile(page, completedThroughLevelThirtyEight);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-39')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-40')).toBeDisabled();

  await writeProfile(page, [...completedThroughLevelThirtyEight, 'campaign-dakota-09']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-40')).toBeEnabled();
  await page.getByTestId('campaign-level-40').click();
  await expect(page.getByRole('heading', { name: 'Sioux Falls' })).toBeVisible();
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute('data-scenario-id', 'campaign-dakota-10');
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByTestId('campaign-difficulty-easy')).toBeEnabled();
  await expect(page.getByTestId('campaign-difficulty-medium')).toBeEnabled();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.locator('#scene-title')).toHaveText('Sioux Falls · Level 40');
  await expect(page.getByTestId('scene-context')).toHaveText('DAKOTA · 40');
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 10');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
});
