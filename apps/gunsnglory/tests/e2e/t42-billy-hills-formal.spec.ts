import { expect, test } from '@playwright/test';
import { leaveBattleFromPauseBoard } from './helpers';

const map04Completion = [
  'campaign-new-mexico-01',
  'campaign-new-mexico-02',
  'campaign-new-mexico-03',
  'campaign-new-mexico-04',
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
        settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: true },
        completedScenarios: completed,
        highScores: {},
        appliedSettlementIds: [],
        revision: 1,
        lastOperationId: 'seed-billy-hills-formal',
        lastRequestDigest: 'seed-billy-hills-formal',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function readCampaignRecord(page: import('@playwright/test').Page): Promise<{
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

test('opens Billy Hills as New Mexico level five and leaves an unfinished run unrecorded', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { __audioSources: [] as string[] });
    HTMLMediaElement.prototype.play = function () {
      const sources = (window as unknown as Window & { __audioSources: string[] }).__audioSources;
      sources.push(new URL(this.src).pathname);
      return Promise.resolve();
    };
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, map04Completion);
  await page.reload();

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-05')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-06')).toBeDisabled();
  await page.getByTestId('campaign-level-05').click();
  await expect(page.getByRole('heading', { name: 'Billy Hills' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '比利山丘' })).toBeVisible();
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByTestId('campaign-difficulty-easy')).toBeEnabled();
  await page.getByTestId('campaign-difficulty-easy').click();

  await expect(page.locator('#scene-title')).toHaveText('Billy Hills · Level 5');
  await expect(page.getByTestId('scene-context')).toHaveText('NEW MEXICO · 05');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $250');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'Now we can also promote our men. They will then inflict more damage and will be faster. To do this, select a unit and touch the icon on the bottom left!',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect.poll(async () => page.evaluate(() =>
    (window as unknown as Window & { __audioSources: string[] }).__audioSources
      .some((source) => source.includes('/assets/music/music_loop1.ogg')))).toBe(true);
  await page.getByTestId('campaign-wave-intro').getByRole('button', { name: 'Continue' }).click();
  await leaveBattleFromPauseBoard(page);

  expect(await readCampaignRecord(page)).toEqual({
    completedScenarios: map04Completion,
    highScores: {},
    appliedSettlementIds: [],
  });
});
