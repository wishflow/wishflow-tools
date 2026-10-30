import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';

const officialLevelId = 'campaign-new-mexico-01';

async function writeProfile(page: import('@playwright/test').Page, record: Record<string, unknown>): Promise<void> {
  await page.evaluate(async (savedRecord) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put(savedRecord);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), record);
}

async function readProfile(page: import('@playwright/test').Page): Promise<Record<string, unknown>> {
  return page.evaluate(async () => new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readonly');
      const read = transaction.objectStore('profiles').get('default');
      read.onsuccess = () => resolve(read.result as Record<string, unknown>);
      read.onerror = () => reject(read.error);
      transaction.oncomplete = () => database.close();
    };
  }));
}

test('defaults to the real Cow Gulch level and keeps historical sample records isolated', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('0/1 stages complete');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');

  const legacyProfile = {
    id: 'default',
    schemaVersion: 2,
    settings: { simulationSpeed: 1.5, difficulty: 'medium', soundEnabled: false },
    completedScenarios: [
      'cow-gulch',
      'campaign-cow-gulch-sample-1',
      'campaign-cow-gulch-sample-2',
      'cow-gulch-original-waves-1-8',
    ],
    highScores: {
      'cow-gulch': 50,
      'campaign-cow-gulch-sample-1': 50,
      'campaign-cow-gulch-sample-2': 61,
      'cow-gulch-original-waves-1-8': 80,
    },
    appliedSettlementIds: ['legacy-session:cow-gulch:1'],
    revision: 1,
    lastOperationId: 'legacy-import',
    lastRequestDigest: 'legacy-import',
  };
  await writeProfile(page, legacyProfile);
  await page.reload();

  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('0/1 stages complete');
  await expect(page.getByTestId('campaign-stage-button-1')).toBeEnabled();
  await expect(page.getByTestId('campaign-stage-list')).toContainText('Cow Gulch · Level 1');
  await expect(page.getByTestId('campaign-stage-list')).not.toContainText('Progress sample');
  await expect(page.getByTestId('campaign-stage-button-2')).toBeDisabled();
  await expect(page.getByTestId('campaign-next-level-status')).toContainText('not implemented');
  await expect(page.getByRole('slider', { name: 'Simulation speed' })).toHaveValue('1.5');
  expect(await readProfile(page)).toEqual(legacyProfile);

  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await page.reload();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await expect(page.getByTestId('wave-status')).not.toContainText('ready');
  await expect(page.getByTestId('settlement')).toBeHidden();
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('0/1 stages complete');
  expect(await readProfile(page)).toEqual(legacyProfile);
  expect(legacyProfile.completedScenarios).not.toContain(officialLevelId);
});

test('opens the official first level by touch and localizes the unavailable next level', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  await page.goto('/');
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).tap();
  await expect(page.locator('#campaign-title')).toHaveText('战役进度');
  await expect(page.getByTestId('campaign-stage-button-2')).toBeDisabled();
  await expect(page.getByTestId('campaign-next-level-status')).toContainText('尚未实现');
  await page.getByTestId('campaign-stage-button-1').tap();
  await expect(page.locator('#scene-title')).toHaveText('牛溪谷 · 第 1 关');
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('已完成 0/1 个关卡');
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(horizontalOverflow).toBe(false);
  await context.close();
});

test('keeps a playable recovery scene and retries missing game assets before opening the campaign', async ({ page }) => {
  let blockAsset = true;
  await page.route('**/assets/pioneer_male.png', (route) =>
    blockAsset ? route.abort() : route.continue());
  await page.goto('/');

  await expect(page.getByTestId('asset-load-error')).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch');
  await expect(page.getByTestId('campaign-stage-button-1')).toBeDisabled();
  await expect(page.getByTestId('start-wave')).toBeDisabled();
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Recovery canvas has no layout box');
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected');
  await expect(page.getByTestId('retry-assets')).toBeEnabled();

  blockAsset = false;
  await page.getByTestId('retry-assets').click();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
});
