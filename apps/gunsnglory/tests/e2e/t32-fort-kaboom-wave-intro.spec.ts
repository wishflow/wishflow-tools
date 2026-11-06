import { expect, test } from '@playwright/test';

const cowGulchScenarioId = 'campaign-new-mexico-01';
const apacheValleyScenarioId = 'campaign-new-mexico-02';

async function unlockFortKaboomThroughPriorCampaignProgress(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async ([cowGulchId, apacheValleyId]) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: true },
        completedScenarios: [cowGulchId, apacheValleyId],
        highScores: {},
        appliedSettlementIds: [],
        revision: 2,
        lastOperationId: 'seed-fort-kaboom-wave-intro-test',
        lastRequestDigest: 'seed-fort-kaboom-wave-intro-test',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), [cowGulchScenarioId, apacheValleyScenarioId]);
}

test('formal Fort Kaboom opens its first original dialogue and follows the site language', async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as Window & { __soundPlayAttempts?: string[] };
    testWindow.__soundPlayAttempts = [];
    HTMLMediaElement.prototype.play = function () {
      testWindow.__soundPlayAttempts?.push(this.currentSrc || this.src);
      return Promise.resolve();
    };
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await unlockFortKaboomThroughPriorCampaignProgress(page);
  await page.reload();

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-03')).toBeEnabled();
  await page.getByTestId('campaign-level-03').click();
  await expect(page.getByRole('heading', { name: 'Fort Kaboom' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-easy').click();

  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute('data-wave-number', '1');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'The army has hidden supply crates here. Collect them with a unit to earn lots of rewards!',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveAttribute('alt', 'Pedro');
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __soundPlayAttempts?: string[] }).__soundPlayAttempts
      ?.some((source) => source.includes('/assets/sounds/sound_pedro.ogg')) ?? false)).toBe(true);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    '军队把补给箱藏在了这里。让一名队员收集它们，就能获得丰厚奖励！',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveAttribute('alt', '佩德罗');
  await expect(intro.getByRole('button', { name: '继续' })).toBeVisible();
});
