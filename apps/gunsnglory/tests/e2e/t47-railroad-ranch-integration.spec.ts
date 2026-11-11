import { expect, test } from '@playwright/test';
import { leaveBattleFromPauseBoard } from './helpers';

const completedThroughMapSeven = Array.from({ length: 7 }, (_, index) => (
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
        lastOperationId: 'seed-railroad-ranch-integration',
        lastRequestDigest: 'seed-railroad-ranch-integration',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function readProfile(page: import('@playwright/test').Page): Promise<{
  completedScenarios: string[];
  highScores: Record<string, number>;
  appliedSettlementIds: string[];
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
          reject(new Error('Expected the seeded campaign profile'));
          return;
        }
        resolve({
          completedScenarios: record.completedScenarios,
          highScores: record.highScores,
          appliedSettlementIds: record.appliedSettlementIds,
        });
      };
      read.onerror = () => reject(read.error);
    };
  }));
}

async function enterRailroadRanch(
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
  await expect(page.getByTestId('campaign-level-09')).toBeEnabled();
  await page.getByTestId('campaign-level-09').click();
  await expect(page.getByRole('heading', { name: 'Railroad Ranch' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The birthplace of the American railroad. The east and west coasts will soon be connected by busy trains.',
  );
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '铁路牧场' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    '这里是美国铁路的发源地。东西海岸很快就会被繁忙的列车连接起来。',
  );
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId(`campaign-difficulty-${difficulty}`).click();
  await expect(page.locator('#scene-title')).toHaveText('Railroad Ranch · Level 9');
  await expect(page.getByTestId('scene-context')).toHaveText(
    mode === 'formal' ? 'NEW MEXICO · 09' : 'FREE PLAY · NEW MEXICO · 09',
  );
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/7 · Lives 25');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $600');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
}

test('formal map09 unlocks only after map08 and shows the original wave-one message', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, completedThroughMapSeven);
  await page.reload();
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-09')).toBeDisabled();

  await writeProfile(page, [...completedThroughMapSeven, 'campaign-new-mexico-08']);
  await page.reload();
  const profileBefore = await readProfile(page);
  await enterRailroadRanch(page, 'formal', 'easy');
  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "There's only one thing on Railroad Ranch: trains!",
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText('铁路牧场只有一样东西：火车！');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await page.getByTestId('campaign-wave-intro').getByRole('button', { name: 'Continue' }).click();
  await leaveBattleFromPauseBoard(page);
  expect(await readProfile(page)).toEqual(profileBefore);
});

test('Free Play exposes map09 on Hard without requiring progress or writing unfinished progress', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, []);
  await page.reload();
  const profileBefore = await readProfile(page);
  await enterRailroadRanch(page, 'free-play', 'hard');
  await expect(page.getByTestId('scene-difficulty')).toContainText('HARD');
  await expect(page.getByTestId('scene-caption')).toContainText(/FREE PLAY/);
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "There's only one thing on Railroad Ranch: trains!",
  );
  await page.getByTestId('campaign-wave-intro').getByRole('button', { name: 'Continue' }).click();
  await leaveBattleFromPauseBoard(page);
  expect(await readProfile(page)).toEqual(profileBefore);
});
