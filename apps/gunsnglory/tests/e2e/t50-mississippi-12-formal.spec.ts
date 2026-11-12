import { expect, test } from './auto-continue-fixtures';
import { pauseFromHud } from './helpers';

const completedThroughLevelEleven = [
  'campaign-new-mexico-01',
  'campaign-new-mexico-02',
  'campaign-new-mexico-03',
  'campaign-new-mexico-04',
  'campaign-new-mexico-05',
  'campaign-new-mexico-06',
  'campaign-new-mexico-07',
  'campaign-new-mexico-08',
  'campaign-new-mexico-09',
  'campaign-new-mexico-10',
  'campaign-mississippi-11',
  'campaign-nevada-10',
];

async function writeProfile(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async (completedScenarios) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: false },
        completedScenarios,
        highScores: { 'campaign-mississippi-11': 900 },
        appliedSettlementIds: ['previous-formal-result'],
        revision: 1,
        lastOperationId: 'seed-mississippi-12-formal',
        lastRequestDigest: 'seed-mississippi-12-formal',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedThroughLevelEleven);
}

async function readProfile(page: import('@playwright/test').Page): Promise<Record<string, unknown>> {
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
          reject(new Error('Expected the seeded Steam Valley campaign profile'));
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

test('formal Steam Valley opens with the saved Pyromaniac unlock and restart does not settle the battle', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page);
  await page.reload();
  const profileBefore = await readProfile(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-level-12')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-13')).toBeDisabled();
  await page.getByTestId('campaign-level-12').click();
  await expect(page.getByRole('heading', { name: 'Steam Valley' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'In Steam Valley, the beautiful sounds of the steamboats ring out at daybreak!',
  );
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-easy').click();

  await expect(page.locator('#scene-title')).toHaveText('Steam Valley · Level 12');
  await expect(page.getByTestId('scene-context')).toHaveText('MISSISSIPPI · 12');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/7');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  expect(await readProfile(page)).toEqual(profileBefore);

  await pauseFromHud(page);
  await page.getByTestId('pause-restart').click();
  await page.getByTestId('confirm-pause-action').click();
  await expect(page.locator('#scene-title')).toHaveText('Steam Valley · Level 12');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/7');
  expect(await readProfile(page)).toEqual(profileBefore);
});
