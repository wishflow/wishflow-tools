import { expect, test } from './auto-continue-fixtures';
import { leaveBattleFromPauseBoard } from './helpers';

async function readSavedProfile(page: import('@playwright/test').Page): Promise<{
  settings: unknown;
  completedScenarios: unknown;
  highScores: unknown;
  appliedSettlementIds: unknown;
  revision: unknown;
}> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readonly');
      const read = transaction.objectStore('profiles').get('default');
      read.onsuccess = () => {
        const record = read.result;
        database.close();
        if (!record) {
          reject(new Error('Expected the settings change to create a saved profile'));
          return;
        }
        resolve({
          settings: record.settings,
          completedScenarios: record.completedScenarios,
          highScores: record.highScores,
          appliedSettlementIds: record.appliedSettlementIds,
          revision: record.revision,
        });
      };
      read.onerror = () => reject(read.error);
    };
  }));
}

test('free play bypasses campaign and Hard locks while keeping the campaign profile unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await page.getByTestId('menu-options').click();
  await expect(page.getByTestId('game-options')).toBeVisible();
  await page.getByTestId('game-options').getByTestId('campaign-menu-back').click();
  await page.getByTestId('menu-sound').click();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('menu-options').click();
  await expect(page.getByTestId('options-sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('settings-status')).toHaveText('Settings saved.');
  await expect(page.getByTestId('game-options').getByTestId('options-help')).toBeVisible();
  await expect(page.getByTestId('game-options').getByTestId('options-sound-toggle')).toBeVisible();
  await page.getByTestId('game-options').getByTestId('campaign-menu-back').click();
  const profileBefore = await readSavedProfile(page);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('menu-free-play')).toHaveText('自由游玩');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  for (const level of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    await expect(page.getByTestId(`campaign-level-${String(level).padStart(2, '0')}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-menu-view').getByTestId('campaign-menu-back').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('2 implemented levels available in this region');
  await expect(page.getByTestId('campaign-level-11')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-12')).toBeEnabled();
  for (const level of [13, 14, 15, 16, 17, 18, 19, 20]) {
    await expect(page.getByTestId(`campaign-level-${String(level).padStart(2, '0')}`)).toBeDisabled();
  }
  await page.getByTestId('campaign-menu-view').getByTestId('campaign-menu-back').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await page.getByTestId('campaign-level-02').click();
  await expect(page.getByRole('heading', { name: 'Death Valley' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByRole('dialog')).toContainText('Choose difficulty:');
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await expect(page.getByTestId('campaign-menu-notice')).toContainText('Free play results');
  await page.getByTestId('campaign-difficulty-hard').click();

  await expect(page.locator('#scene-title')).toHaveText('Apache Valley · Level 2');
  await expect(page.getByTestId('scene-difficulty')).toContainText('HARD');
  await expect(page.getByTestId('scene-caption')).toContainText(/FREE PLAY/);
  expect(await readSavedProfile(page)).toEqual(profileBefore);

  await leaveBattleFromPauseBoard(page);
  await expect(page.getByTestId('menu-free-play')).toBeVisible();
  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await page.getByTestId('campaign-level-04').click();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Tech Town · Level 4');
  await expect(page.getByTestId('scene-difficulty')).toContainText('MEDIUM');
  await expect(page.getByTestId('wave-status')).toContainText('1/8');
  expect(await readSavedProfile(page)).toEqual(profileBefore);

  await leaveBattleFromPauseBoard(page);
  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await page.getByTestId('campaign-level-05').click();
  await expect(page.getByRole('heading', { name: 'Billy Hills' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-hard').click();
  await expect(page.locator('#scene-title')).toHaveText('Billy Hills · Level 5');
  await expect(page.getByTestId('scene-difficulty')).toContainText('HARD');
  await expect(page.getByTestId('wave-status')).toContainText('1/8');
  expect(await readSavedProfile(page)).toEqual(profileBefore);
});

test('Free Play opens Steam Valley from its localized overview without changing campaign data', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const soundToggle = page.getByTestId('menu-sound');
  if (await soundToggle.getAttribute('aria-pressed') !== 'false') await soundToggle.click();
  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('2 implemented levels available in this region');
  await expect(page.getByTestId('campaign-level-12')).toBeEnabled();
  await page.getByTestId('campaign-level-12').click();

  await expect(page.getByRole('heading', { name: 'Steam Valley' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'In Steam Valley, the beautiful sounds of the steamboats ring out at daybreak!',
  );
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '蒸汽谷' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('在蒸汽谷，汽船悦耳的声音每天清晨都会响起！');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  const profileBefore = await readSavedProfile(page);

  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.locator('#scene-title')).toHaveText('Steam Valley · Level 12');
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · MISSISSIPPI · 12');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/7');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  expect(await readSavedProfile(page)).toEqual(profileBefore);
});
