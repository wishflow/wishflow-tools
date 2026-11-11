import { expect, test } from '@playwright/test';

const map05Completion = [
  'campaign-new-mexico-01',
  'campaign-new-mexico-02',
  'campaign-new-mexico-03',
  'campaign-new-mexico-04',
  'campaign-new-mexico-05',
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
        highScores: {},
        appliedSettlementIds: [],
        revision: 1,
        lastOperationId: 'seed-lucky-lake-access',
        lastRequestDigest: 'seed-lucky-lake-access',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

test('unlocks Lucky Lake after Murdock Mountains and renders its original map preview', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, map05Completion);
  await page.reload();

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-06')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-07')).toBeDisabled();

  await writeProfile(page, [...map05Completion, 'campaign-new-mexico-06']);
  await page.reload();
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-07')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-08')).toBeDisabled();
  await page.getByTestId('campaign-level-07').click();

  await expect(page.getByRole('heading', { name: 'Lucky Lake' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'A picture postcard lake where settlers flock in droves.',
  );
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '幸运湖' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('这片如明信片般美丽的湖泊，吸引着成群的拓荒者。');
});

test('Free Play exposes Lucky Lake with no progress prerequisite', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, []);
  await page.reload();

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-07')).toBeEnabled();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('10/10 implemented levels available in Free Play');
  await page.getByTestId('campaign-level-07').click();
  await expect(page.getByRole('heading', { name: 'Lucky Lake' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'A picture postcard lake where settlers flock in droves.',
  );
});
