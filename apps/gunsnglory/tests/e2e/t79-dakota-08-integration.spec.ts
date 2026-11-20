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
        id: 'default', schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'medium', soundEnabled: false },
        completedScenarios: completed, highScores: {}, appliedSettlementIds: [],
        revision: 1, lastOperationId: 'seed-wayne-waters-gate', lastRequestDigest: 'seed-wayne-waters-gate',
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

test('Free Play opens Wayne Waters from the real Dakota menu and does not change campaign progress', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('8 implemented levels available');
  await expect(page.getByTestId('campaign-level-39')).toBeDisabled();
  await page.getByTestId('campaign-level-38').click();

  await expect(page.getByRole('heading', { name: 'Wayne Waters' })).toBeVisible();
  await expect(page.locator('.campaign-overview-level-art')).toHaveAttribute('src', /gng_levelmap_41\.png/);
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute('data-scenario-id', 'campaign-dakota-08');
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The swimming lake of Wayne Waters is perfect for splashing and diving for gold.',
  );

  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.locator('#scene-title')).toHaveText('Wayne Waters · Level 38');
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · DAKOTA · 38');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 8');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'There\'s a beautiful view on this rough sea! Show me some settlers and I\'ll make my calliopes glow!',
  );
  const portrait = page.getByTestId('campaign-wave-intro-portrait');
  await expect(portrait).toHaveAttribute('src', /portrait_captain\.png/);
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');

  const profile = await page.evaluate(async () => new Promise<{ completedScenarios: string[]; highScores: Record<string, number> }>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction('profiles').objectStore('profiles').get('default');
      read.onsuccess = () => { database.close(); resolve(read.result); };
      read.onerror = () => reject(read.error);
    };
  }));
  expect(profile.completedScenarios).toEqual([]);
  expect(profile.highScores).toEqual({});
});

test('formal Wayne Waters stays locked until Frost Station is complete', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, completedThroughLevelThirtySix);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-37')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-38')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughLevelThirtySix, 'campaign-dakota-07']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-38')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-39')).toBeDisabled();
  await page.getByTestId('campaign-level-38').click();

  await expect(page.getByRole('heading', { name: 'Wayne Waters' })).toBeVisible();
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute('data-scenario-id', 'campaign-dakota-08');
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-hard').click();
  await expect(page.locator('#scene-title')).toHaveText('Wayne Waters · Level 38');
  await expect(page.getByTestId('scene-context')).toHaveText('DAKOTA · 38');
  await expect(page.getByTestId('scene-caption')).toHaveText(
    'Official Wayne Waters level 38: eight original waves across four entrances. Victory records campaign completion and best score.',
  );
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 8');
  await expect(page.getByTestId('campaign-wave-intro-text')).toContainText('beautiful view on this rough sea');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
