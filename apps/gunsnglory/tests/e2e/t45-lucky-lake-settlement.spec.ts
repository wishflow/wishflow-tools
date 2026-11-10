import { expect, test } from '@playwright/test';
import { leaveBattleFromPauseBoard } from './helpers';

const completedThroughMapSix = [
  'campaign-new-mexico-01',
  'campaign-new-mexico-02',
  'campaign-new-mexico-03',
  'campaign-new-mexico-04',
  'campaign-new-mexico-05',
  'campaign-new-mexico-06',
];

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
        highScores: { 'campaign-new-mexico-06': 640 },
        appliedSettlementIds: ['previous-formal-result'],
        revision: 1,
        lastOperationId: 'seed-lucky-lake-settlement',
        lastRequestDigest: 'seed-lucky-lake-settlement',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function readProgress(page: import('@playwright/test').Page): Promise<{
  settings: { simulationSpeed: number; difficulty: string; soundEnabled: boolean };
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
          reject(new Error('Expected the seeded Lucky Lake profile'));
          return;
        }
        resolve({
          settings: record.settings,
          completedScenarios: record.completedScenarios,
          highScores: record.highScores,
          appliedSettlementIds: record.appliedSettlementIds,
        });
      };
      read.onerror = () => reject(read.error);
    };
  }));
}

async function enterLuckyLake(
  page: import('@playwright/test').Page,
  mode: 'formal' | 'free-play',
  difficulty: 'easy' | 'hard',
): Promise<void> {
  await page.getByTestId(mode === 'formal' ? 'menu-start' : 'menu-free-play').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-07')).toBeEnabled();
  await page.getByTestId('campaign-level-07').click();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId(`campaign-difficulty-${difficulty}`).click();

  await expect(page.locator('#scene-title')).toHaveText('Lucky Lake · Level 7');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10 · Lives 50');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
}

test('formal Lucky Lake can be exited unfinished without writing completion, score, or settlement ID', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, completedThroughMapSix);
  await page.reload();
  const profileBefore = await readProgress(page);

  await enterLuckyLake(page, 'formal', 'easy');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'We are at Lucky Lake. The settlers often stop off here to replenish their water supplies.',
  );
  await page.getByTestId('campaign-wave-intro').getByRole('button', { name: 'Continue' }).click();
  await leaveBattleFromPauseBoard(page);

  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  expect(await readProgress(page)).toEqual(profileBefore);
});

test('Free Play Lucky Lake opens on Hard and remains outside the saved campaign profile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, []);
  await page.reload();
  const profileBefore = await readProgress(page);

  await enterLuckyLake(page, 'free-play', 'hard');
  await expect(page.getByTestId('scene-difficulty')).toContainText('HARD');
  await expect(page.getByTestId('scene-caption')).toContainText(
    'Free play does not change campaign progress, high scores, unlocks, or saved difficulty.',
  );
  await page.getByTestId('campaign-wave-intro').getByRole('button', { name: 'Continue' }).click();
  await leaveBattleFromPauseBoard(page);

  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  expect(await readProgress(page)).toEqual(profileBefore);
});
