import { expect, test } from '@playwright/test';
import { leaveBattleFromPauseBoard } from './helpers';

const completedThroughMapNine = Array.from({ length: 9 }, (_, index) => (
  `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`
));

async function writeProfile(page: import('@playwright/test').Page, completedScenarios: string[]): Promise<void> {
  await page.evaluate(async (completed) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: false },
        completedScenarios: completed,
        highScores: {},
        appliedSettlementIds: [],
        revision: 1,
        lastOperationId: 'seed-lost-city-integration',
        lastRequestDigest: 'seed-lost-city-integration',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function enterLostCity(
  page: import('@playwright/test').Page,
  mode: 'formal' | 'free-play',
  difficulty: 'easy' | 'hard',
): Promise<void> {
  await page.getByTestId(mode === 'formal' ? 'menu-start' : 'menu-free-play').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  if (mode === 'free-play') {
    await expect(page.getByTestId('campaign-menu-progress')).toContainText(
      '10/10 implemented levels available in Free Play',
    );
  }
  await expect(page.getByTestId('campaign-level-10')).toBeEnabled();
  await page.getByTestId('campaign-level-10').click();
  await expect(page.getByRole('heading', { name: 'Lost City' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'Winding valleys lead to a forgotten city, steeped in legend.',
  );
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '失落之城' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    '蜿蜒的山谷通向一座被遗忘的古城，那里流传着不朽的传说。',
  );
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId(`campaign-difficulty-${difficulty}`).click();
  await expect(page.locator('#scene-title')).toHaveText('Lost City · Level 10');
  await expect(page.getByTestId('scene-context')).toHaveText(
    mode === 'formal' ? 'NEW MEXICO · 10' : 'FREE PLAY · NEW MEXICO · 10',
  );
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10 · Lives 25');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $350');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
}

test('formal Lost City remains locked until Railroad Ranch is complete and opens its original dialogue', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, completedThroughMapNine.slice(0, 8));
  await page.reload();
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-10')).toBeDisabled();

  await writeProfile(page, completedThroughMapNine);
  await page.reload();
  await enterLostCity(page, 'formal', 'easy');
  const intro = page.getByTestId('campaign-wave-intro');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "The gulch to the lost city branches out in all directions. We can't lose the settlers there!",
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveAttribute('src', /portrait_pedro\.png/);
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    '通往失落之城的峡谷向四面八方分岔。我们不能让拓荒者在那里走散！',
  );
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await intro.getByRole('button', { name: 'Continue' }).click();
  await leaveBattleFromPauseBoard(page);
});

test('Free Play opens Lost City on Hard without a profile prerequisite', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, []);
  await page.reload();
  await enterLostCity(page, 'free-play', 'hard');
  await expect(page.getByTestId('scene-difficulty')).toContainText('HARD');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "The gulch to the lost city branches out in all directions. We can't lose the settlers there!",
  );
  await page.getByTestId('campaign-wave-intro').getByRole('button', { name: 'Continue' }).click();
  await leaveBattleFromPauseBoard(page);
});
