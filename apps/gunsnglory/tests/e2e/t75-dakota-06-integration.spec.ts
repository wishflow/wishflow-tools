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
        lastOperationId: 'seed-ice-rocks-gate',
        lastRequestDigest: 'seed-ice-rocks-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

const completedThroughLevelThirtyFour = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  ...Array.from({ length: 11 }, (_, index) => `campaign-oregon-${String(index + 1).padStart(2, '0')}`),
  'campaign-dakota-02',
  'campaign-dakota-03',
  'campaign-dakota-04',
];

test('Free Play opens Ice Rocks with map39, bilingual copy, and all difficulties', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('10 implemented levels available');
  await page.getByTestId('campaign-level-36').click();

  await expect(page.getByRole('heading', { name: 'Ice Rocks' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'Many mountain climbers try again and again to climb the summits of the wonderful Ice Rocks.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_39\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-dakota-06',
  );

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '冰岩' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('许多登山者一次又一次地尝试攀登壮丽冰岩的顶峰。');

  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.locator('#scene-title')).toHaveText('冰岩 · 第 36 关');
  await expect(page.getByTestId('scene-context')).toHaveText('自由游玩 · 达科他 · 36');
  await expect(page.getByTestId('scene-caption')).toContainText('自由游玩不会更改战役进度');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('第 1 波 · 共 9 波');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText('“老板，这里冷死了。就没有冬装升级吗？”');
  const introPortrait = page.getByTestId('campaign-wave-intro-portrait');
  await expect(introPortrait).toHaveAttribute('src', /portrait_mexican\.png/);
  await expect.poll(() => introPortrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-action="continue-wave-intro"]').click();
  await expect(page.getByTestId('wave-status')).toContainText('第 1/9 波');
});

test('formal Ice Rocks stays locked until Ghost Town is complete', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, completedThroughLevelThirtyFour);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-35')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-36')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughLevelThirtyFour, 'campaign-dakota-05']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-36')).toBeEnabled();
  await page.getByTestId('campaign-level-36').click();

  await expect(page.getByRole('heading', { name: 'Ice Rocks' })).toBeVisible();
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-dakota-06',
  );
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.locator('#scene-title')).toHaveText('Ice Rocks · Level 36');
  await expect(page.getByTestId('scene-context')).toHaveText('DAKOTA · 36');
  await expect(page.getByTestId('scene-caption')).toHaveText(
    'Official Ice Rocks level 36: nine original waves across three entrances. Victory records campaign completion and best score.',
  );
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 9');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    '“Brrrr, it\'s very cold here, Boss. Isn\'t there a winter coat upgrade?”',
  );
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
