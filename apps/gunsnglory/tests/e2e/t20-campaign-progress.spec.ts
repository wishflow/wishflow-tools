import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { leaveBattleFromPauseBoard } from './helpers';

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
  await page.goto('/?testBattle=1');
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('0/14 stages complete');
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
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('0/14 stages complete');
  await expect(page.getByTestId('campaign-stage-button-1')).toBeEnabled();
  await expect(page.getByTestId('campaign-stage-list')).toContainText('Cow Gulch · Level 1');
  await expect(page.getByTestId('campaign-stage-list')).not.toContainText('Progress sample');
  await expect(page.getByTestId('campaign-stage-button-2')).toBeDisabled();
  await expect(page.getByTestId('campaign-stage-list')).toContainText('Locked');
  await expect(page.getByRole('slider', { name: 'Simulation speed' })).toHaveValue('1.5');
  expect(await readProfile(page)).toEqual(legacyProfile);

  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await page.reload();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await expect(page.getByTestId('wave-status')).not.toContainText('ready');
  await expect(page.getByTestId('settlement')).toBeHidden();
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('0/14 stages complete');
  expect(await readProfile(page)).toEqual(legacyProfile);
  expect(legacyProfile.completedScenarios).not.toContain(officialLevelId);
});

test('unlocks Apache Valley after Cow Gulch progress and opens the second level by touch', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  await page.goto('/');
  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).tap();
  await page.getByTestId('menu-start').tap();
  await page.getByTestId('campaign-region-new-mexico').tap();
  await expect(page.getByTestId('campaign-level-02')).toBeDisabled();

  await writeProfile(page, {
    id: 'default',
    schemaVersion: 2,
    settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: false },
    completedScenarios: [officialLevelId],
    highScores: {},
    appliedSettlementIds: [],
    revision: 1,
    lastOperationId: 'seed-apache-valley-unlock',
    lastRequestDigest: 'seed-apache-valley-unlock',
  });
  await page.reload();
  await page.getByTestId('menu-start').tap();
  await page.getByTestId('campaign-region-new-mexico').tap();
  await expect(page.getByTestId('campaign-level-02')).toBeEnabled();
  await page.getByTestId('campaign-level-02').tap();
  await expect(page.getByRole('heading', { name: 'Death Valley' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').tap();
  await expect(page.getByTestId('campaign-difficulty-easy')).toBeVisible();
  await page.getByTestId('campaign-difficulty-easy').tap();
  await expect(page.locator('#scene-title')).toHaveText('阿帕奇山谷 · 第 2 关');
  await expect(page.getByTestId('scene-context')).toHaveText('NEW MEXICO · 02');
  await expect(page.getByTestId('wave-status')).toContainText('第 1/6 波');
  await expect(page.getByTestId('wave-status')).toContainText('现金 $100');
  await expect(page.getByTestId('scene-caption')).toContainText('原版 6 波');
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(horizontalOverflow).toBe(false);
  await context.close();
});

test('describes the official level, playable sample, and upgrade fixture accurately', async ({ page }) => {
  await page.goto('/?testBattle=1');
  const caption = page.getByTestId('scene-caption');
  await expect(caption).toHaveText(
    'Official Cow Gulch level 1: eight original waves. Victory records campaign completion and best score.',
  );

  await page.getByRole('button', { name: 'Return to Cow Gulch sample' }).click();
  await expect(caption).toHaveText(
    'One-wave sandbox sample: test movement, targeting, and combat. It does not complete the official campaign.',
  );
  await page.getByRole('button', { name: 'Open upgrade rules sample' }).click();
  await expect(caption).toHaveText(
    'Debug-only upgrade sample: starts with $25 and raises the upgrade limit to 1. It never writes profile progress.',
  );

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(caption).toHaveText('仅供调试的升级样本：初始现金 $25，升级上限为 1，不会写入正式进度。');
});

test('keeps a playable recovery scene and retries missing game assets before opening the campaign', async ({ page }) => {
  let blockAsset = true;
  await page.route('**/assets/pioneer_male.png', (route) =>
    blockAsset ? route.abort() : route.continue());
  await page.goto('/?testBattle=1');

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

test('keeps the page initialized when an image used by the first map draw fails', async ({ page }) => {
  let blockAsset = true;
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/assets/hdpi/tiles_water.png', (route) =>
    blockAsset ? route.abort() : route.continue());
  await page.goto('/?testBattle=1');

  await expect(page.getByTestId('asset-load-error')).toBeVisible();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch');
  await expect(page.getByTestId('campaign-stage-button-1')).toBeDisabled();
  await expect(page.getByTestId('start-wave')).toBeDisabled();
  expect(pageErrors).toEqual([]);

  blockAsset = false;
  await page.getByTestId('retry-assets').click();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  expect(pageErrors).toEqual([]);
});

test('blocks Apache Valley until its missing horseman sprite is restored', async ({ page }) => {
  let blockAsset = true;
  await page.route('**/assets/horseman.png', (route) =>
    blockAsset ? route.abort() : route.continue());
  await page.goto('/?testBattle=1');

  await expect(page.getByTestId('asset-load-error')).toBeVisible();
  await writeProfile(page, {
    id: 'default',
    schemaVersion: 2,
    settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: false },
    completedScenarios: [officialLevelId],
    highScores: {},
    appliedSettlementIds: [],
    revision: 1,
    lastOperationId: 'seed-apache-valley-resource-retry',
    lastRequestDigest: 'seed-apache-valley-resource-retry',
  });
  await page.reload();
  await expect(page.getByTestId('asset-load-error')).toBeVisible();
  await expect(page.getByTestId('campaign-stage-button-1')).toBeDisabled();
  await expect(page.getByTestId('campaign-stage-button-2')).toBeDisabled();

  blockAsset = false;
  await page.getByTestId('retry-assets').click();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await leaveBattleFromPauseBoard(page);
  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-02')).toBeEnabled();
  await page.getByTestId('campaign-level-02').click();
  await expect(page.getByRole('heading', { name: 'Death Valley' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-easy').click();
  await expect(page.locator('#scene-title')).toHaveText('Apache Valley · Level 2');
});
