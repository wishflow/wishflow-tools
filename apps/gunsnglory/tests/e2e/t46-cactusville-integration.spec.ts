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
        lastOperationId: 'seed-cactusville-integration',
        lastRequestDigest: 'seed-cactusville-integration',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function readCampaignProfile(page: import('@playwright/test').Page): Promise<{
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
        const profile = read.result;
        database.close();
        resolve({
          settings: profile.settings,
          completedScenarios: profile.completedScenarios,
          highScores: profile.highScores,
          appliedSettlementIds: profile.appliedSettlementIds,
        });
      };
      read.onerror = () => reject(read.error);
    };
  }));
}

async function enterCactusville(
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
  await expect(page.getByTestId('campaign-level-08')).toBeEnabled();
  if (mode === 'free-play') {
    await expect(page.getByTestId('campaign-level-09')).toBeEnabled();
  } else {
    await expect(page.getByTestId('campaign-level-09')).toBeDisabled();
  }
  await page.getByTestId('campaign-level-08').click();
  await expect(page.getByRole('heading', { name: 'Cactusville' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 102);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'Sheriff Starforce imposes law and order here. Nowhere will you find a more relaxed and carefree place to live than Cactusville!',
  );
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '仙人掌镇' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    '星力警长在这里维护法律与秩序。你再也找不到比仙人掌镇更悠闲自在的居住地了！',
  );
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId(`campaign-difficulty-${difficulty}`).click();
  await expect(page.locator('#scene-title')).toHaveText('Cactusville · Level 8');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10 · Lives 10');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
}

test('formal map08 unlocks after map07 and opens the audited first wave', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, completedThroughMapSeven.slice(0, 6));
  await page.reload();
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-08')).toBeDisabled();

  await writeProfile(page, completedThroughMapSeven);
  await page.reload();
  const profileBefore = await readCampaignProfile(page);
  await enterCactusville(page, 'formal', 'easy');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "Gentlemen, I'm Sheriff Jimmy Starforce. If I see or hear that any of you is stirring up the tiniest bit of trouble, I'll take you apart like you won't believe!",
  );
  await page.getByTestId('campaign-wave-intro').getByRole('button', { name: 'Continue' }).click();
  await leaveBattleFromPauseBoard(page);
  expect(await readCampaignProfile(page)).toEqual(profileBefore);
});

test('Free Play exposes map08 with no progress prerequisite and does not save an unfinished result', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, []);
  await page.reload();
  const profileBefore = await readCampaignProfile(page);

  await enterCactusville(page, 'free-play', 'hard');
  await expect(page.getByTestId('scene-difficulty')).toContainText('HARD');
  await expect(page.getByTestId('scene-caption')).toContainText(
    'Free play does not change campaign progress, high scores, unlocks, or saved difficulty.',
  );
  await page.getByTestId('campaign-wave-intro').getByRole('button', { name: 'Continue' }).click();
  await leaveBattleFromPauseBoard(page);
  expect(await readCampaignProfile(page)).toEqual(profileBefore);
});
