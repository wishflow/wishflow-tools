import { expect, test } from './auto-continue-fixtures';

async function expectCampaignMenuImagesLoaded(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>(
    '[data-testid="campaign-menu-screen"] img',
  )].every((image) => image.complete && image.naturalWidth > 0));
}

async function readSavedProfileCount(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('profiles')) {
        database.close();
        resolve(0);
        return;
      }
      const countRequest = database.transaction('profiles', 'readonly').objectStore('profiles').count();
      countRequest.onsuccess = () => {
        database.close();
        resolve(countRequest.result);
      };
      countRequest.onerror = () => reject(countRequest.error);
    };
  }));
}

async function writeSavedProfile(page: import('@playwright/test').Page, record: Record<string, unknown>): Promise<void> {
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

test('starts in the in-game menu and opens an implemented campaign level through the original navigation flow', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  await expect(page.locator('.scene-heading')).toBeHidden();
  await expect(page.getByTestId('game-toolbar')).toBeHidden();
  await expect(page.locator('.campaign-panel')).toBeHidden();
  await expect(page.getByTestId('archive-panel')).toBeHidden();
  await expectCampaignMenuImagesLoaded(page);
  expect(await readSavedProfileCount(page)).toBe(0);

  const start = page.getByTestId('menu-start');
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('campaign-menu-screen')).toContainText('Choose a region');
  await expect(page.locator('[data-testid^="campaign-region-"]')).toHaveCount(6);
  await expect(page.locator('[data-testid="campaign-region-new-mexico"] .campaign-region-number')).toHaveText('1');
  await expect(page.locator('[data-testid="campaign-region-mississippi"] .campaign-region-number')).toHaveText('2');
  await expectCampaignMenuImagesLoaded(page);
  await page.getByTestId('campaign-menu-back').click();
  await expect(page.getByTestId('menu-start')).toBeVisible();
  await page.getByTestId('menu-start').click();

  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.locator('[data-testid^="campaign-level-"]')).toHaveCount(10);
  await expect(page.getByTestId('campaign-level-01')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-02')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-03')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-03')).toHaveAttribute('aria-label', /locked/i);
  const campaignProgress = page.getByTestId('campaign-menu-progress');
  await expect(campaignProgress).toContainText('0/10 levels complete');
  await expect(campaignProgress).toContainText('Unimplemented levels are shown with a lock.');
  await expect(campaignProgress).not.toContainText('Levels 3–10 are not implemented yet.');
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(campaignProgress).toContainText('已完成 0/10 关');
  await expect(campaignProgress).toContainText('尚未实现的关卡会显示锁定标记。');
  await expect(campaignProgress).not.toContainText('第 3–10 关尚未实现。');
  await expect(page.getByTestId('campaign-level-03')).toHaveAttribute('aria-label', /未解锁/);
  await expect(page.getByTestId('campaign-level-04')).toHaveAttribute('aria-label', /尚未实现/);
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await expectCampaignMenuImagesLoaded(page);
  await page.getByTestId('campaign-menu-back').click();
  await expect(page.getByTestId('campaign-region-new-mexico')).toBeVisible();
  await page.getByTestId('campaign-region-new-mexico').click();

  await page.getByTestId('campaign-level-01').click();
  await expect(page.getByRole('heading', { name: 'Cow Gulch' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toBeVisible();
  await expect(page.locator('.campaign-overview-wanted')).toHaveCount(0);
  await expect(page.locator('.campaign-overview-no-score')).toHaveText(
    'Your highscore for this level will be shown here as soon as you have played it for the first time.',
  );
  await expectCampaignMenuImagesLoaded(page);
  const play = page.getByTestId('campaign-stage-play');
  await expect(play).toBeEnabled();
  await page.getByTestId('campaign-menu-back').first().click();
  await expect(page.getByTestId('campaign-level-01')).toBeVisible();
  await page.getByTestId('campaign-level-01').click();
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByRole('dialog')).toContainText('Choose difficulty:');
  await page.getByTestId('campaign-menu-back').click();
  await expect(page.getByRole('heading', { name: 'Cow Gulch' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByRole('dialog')).toContainText('Choose difficulty:');
  await expect(page.getByTestId('campaign-difficulty-hard')).toBeDisabled();
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('scene-difficulty')).toContainText('MEDIUM');
  await expect(page.getByTestId('campaign-menu-screen')).toBeHidden();
  await expect(page.locator('.scene-heading')).toBeVisible();
  await expect(page.getByTestId('game-toolbar')).toBeVisible();
  await expect(page.getByTestId('archive-panel')).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test('shows the original wanted poster and saved score when a level has a high score', async ({ page }) => {
  await page.goto('/');
  await writeSavedProfile(page, {
    id: 'default',
    schemaVersion: 2,
    settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: true },
    completedScenarios: [],
    highScores: { 'campaign-new-mexico-01': 453 },
    appliedSettlementIds: [],
    revision: 1,
    lastOperationId: 'menu-highscore-fixture',
    lastRequestDigest: 'menu-highscore-fixture',
  });
  await page.reload();
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await page.getByTestId('campaign-level-01').click();

  await expect(page.locator('.campaign-overview-wanted')).toBeVisible();
  await expect(page.locator('.campaign-overview-score-label')).toHaveText('Best score');
  await expect(page.locator('.campaign-overview-score')).toHaveText('$ 453');
  await expect(page.locator('.campaign-overview-no-score')).toHaveCount(0);
});

test('keeps menu options usable at narrow phone width and persists sound and speed with the site language', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  const frame = page.locator('.game-frame');
  const bounds = await frame.boundingBox();
  if (!bounds) throw new Error('Game frame has no layout box');
  expect(Math.abs(bounds.width / bounds.height - 16 / 9)).toBeLessThan(0.02);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.getByTestId('menu-options').click();
  const speed = page.getByTestId('menu-simulation-speed');
  await speed.evaluate((element) => {
    const slider = element as HTMLInputElement;
    slider.value = '2.5';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('menu-simulation-speed-value')).toHaveText('2.5×');
  await page.getByTestId('menu-sound').click();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('menu-settings-status')).toHaveText('Settings saved.');

  await page.reload();
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('menu-start')).toHaveText('开始');
  await page.getByTestId('menu-options').click();
  await expect(page.getByTestId('menu-simulation-speed')).toHaveValue('2.5');
  await expect(page.getByTestId('menu-simulation-speed-value')).toHaveText('2.5×');
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('campaign-menu-back')).toHaveAttribute('aria-label', '返回');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
