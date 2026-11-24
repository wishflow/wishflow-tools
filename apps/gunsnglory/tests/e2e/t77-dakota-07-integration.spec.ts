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
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'medium', soundEnabled: false },
        completedScenarios: completed,
        highScores: {},
        appliedSettlementIds: [],
        revision: 1,
        lastOperationId: 'seed-frost-station-gate',
        lastRequestDigest: 'seed-frost-station-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

const completedThroughLevelThirtyFive = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  ...Array.from({ length: 11 }, (_, index) => `campaign-oregon-${String(index + 1).padStart(2, '0')}`),
  'campaign-dakota-02',
  'campaign-dakota-03',
  'campaign-dakota-04',
  'campaign-dakota-05',
];

test('Free Play opens Frost Station from the real Dakota menu with all difficulties', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('10 implemented levels available');
  await page.getByTestId('campaign-level-37').click();

  await expect(page.getByRole('heading', { name: 'Frost Station' })).toBeVisible();
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_40\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-dakota-07',
  );
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'Frost Station is a famous gathering point for travelers and connects all the railroads in the area.',
  );

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '霜冻车站' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('霜冻车站是旅人们熟知的集散地，连接着这一带的所有铁路。');

  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.locator('#scene-title')).toHaveText('霜冻车站 · 第 37 关');
  await expect(page.getByTestId('scene-context')).toHaveText('自由游玩 · 达科他 · 37');
  await expect(page.getByTestId('scene-caption')).toContainText('自由游玩不会更改战役进度');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('第 1 波 · 共 8 波');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText('“抱歉让大家久等了，铁轨都冻住了！”');
  const introPortrait = page.getByTestId('campaign-wave-intro-portrait');
  await expect(introPortrait).toHaveAttribute('src', /portrait_engineer\.png/);
  await expect.poll(() => introPortrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-action="continue-wave-intro"]').click();
  await expect(page.getByTestId('wave-status')).toContainText('第 1/8 波');
});

test('formal Frost Station stays locked until Ice Rocks is complete', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, completedThroughLevelThirtyFive);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-36')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-37')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughLevelThirtyFive, 'campaign-dakota-06']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-37')).toBeEnabled();
  await page.getByTestId('campaign-level-37').click();

  await expect(page.getByRole('heading', { name: 'Frost Station' })).toBeVisible();
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-dakota-07',
  );
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.locator('#scene-title')).toHaveText('Frost Station · Level 37');
  await expect(page.getByTestId('scene-context')).toHaveText('DAKOTA · 37');
  await expect(page.getByTestId('scene-caption')).toHaveText(
    'Official Frost Station level 37: eight original waves across four entrances. Victory records campaign completion and best score.',
  );
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 8');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    '“I\'m sorry for the delay, but the tracks are frozen!”',
  );
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
