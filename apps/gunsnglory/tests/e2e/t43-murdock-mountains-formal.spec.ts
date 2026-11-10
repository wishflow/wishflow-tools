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
        lastOperationId: 'seed-murdock-mountains-formal',
        lastRequestDigest: 'seed-murdock-mountains-formal',
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

test('unlocks Murdock Mountains after Billy Hills and shows its bilingual wave-one intro', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, map05Completion);
  await page.reload();
  const profileBefore = await readProfile(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-06')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-07')).toBeDisabled();
  await page.getByTestId('campaign-level-06').click();
  await expect(page.getByRole('heading', { name: 'Murdock Mountains' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 102);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '默多克山脉' })).toBeVisible();
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-easy').click();

  await expect(page.locator('#scene-title')).toHaveText('Murdock Mountains · Level 6');
  await expect(page.getByTestId('scene-context')).toHaveText('NEW MEXICO · 06');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10 · Lives 50');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $250');
  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "The rugged Murdock Mountains couldn't be better for a good ol' traditional ambush!",
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText('崎岖的默多克山脉，正适合来一场传统的伏击！');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "The rugged Murdock Mountains couldn't be better for a good ol' traditional ambush!",
  );
  expect(await readProfile(page)).toEqual(profileBefore);
});

test('Free Play opens Murdock Mountains on Hard without writing campaign progress', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, []);
  await page.reload();
  const profileBefore = await readProfile(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-06')).toBeEnabled();
  await page.getByTestId('campaign-level-06').click();
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByTestId('campaign-difficulty-hard')).toBeEnabled();
  await page.getByTestId('campaign-difficulty-hard').click();

  await expect(page.locator('#scene-title')).toHaveText('Murdock Mountains · Level 6');
  await expect(page.getByTestId('scene-difficulty')).toContainText('HARD');
  await expect(page.getByTestId('scene-caption')).toContainText(/FREE PLAY/);
  await expect(page.getByTestId('scene-caption')).toContainText('Free Play does not change campaign progress or best score.');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "The rugged Murdock Mountains couldn't be better for a good ol' traditional ambush!",
  );
  expect(await readProfile(page)).toEqual(profileBefore);
});
