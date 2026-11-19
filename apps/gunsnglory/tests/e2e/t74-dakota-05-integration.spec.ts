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
        lastOperationId: 'seed-ghost-town-gate',
        lastRequestDigest: 'seed-ghost-town-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

const completedThroughLevelThirtyThree = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  ...Array.from({ length: 11 }, (_, index) => `campaign-oregon-${String(index + 1).padStart(2, '0')}`),
  'campaign-dakota-02',
  'campaign-dakota-03',
];

test('Free Play opens Ghost Town with map38 and all three difficulties', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('5 implemented levels available');
  await page.getByTestId('campaign-level-35').click();

  await expect(page.getByRole('heading', { name: 'Ghost Town' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'In Ghost Town, settlers can get away from the noise of the bustling big city.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_38\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-dakota-05',
  );

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '幽灵镇' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('在幽灵镇，拓荒者可以远离大城市的喧嚣。');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByTestId('campaign-difficulty-easy')).toBeEnabled();
  await expect(page.getByTestId('campaign-difficulty-medium')).toBeEnabled();
  await expect(page.getByTestId('campaign-difficulty-hard')).toBeEnabled();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
});

test('formal Ghost Town stays locked until Badlands is complete', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, completedThroughLevelThirtyThree);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-34')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-35')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughLevelThirtyThree, 'campaign-dakota-04']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-35')).toBeEnabled();
  await page.getByTestId('campaign-level-35').click();
  await expect(page.getByRole('heading', { name: 'Ghost Town' })).toBeVisible();
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-dakota-05',
  );
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
