import { expect, test } from '@playwright/test';

const completedThroughLevelTwentyOne = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  'campaign-oregon-01',
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
        settings: { simulationSpeed: 1, difficulty: 'medium', soundEnabled: false },
        completedScenarios: completed,
        highScores: {},
        appliedSettlementIds: [],
        revision: 1,
        lastOperationId: 'seed-chinook-woods-formal-gate',
        lastRequestDigest: 'seed-chinook-woods-formal-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

async function expectChinookOverview(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Chinook Woods' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The Chinook natives created a magnificent amusement park for salmon fishers here.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_26\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalWidth', 192);
  await expect(page.locator('.campaign-overview-minimap')).toHaveJSProperty('naturalHeight', 144);
}

async function expectChinookOpening(
  page: import('@playwright/test').Page,
  context: string,
  difficulty: string,
): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Chinook Woods · Level 23');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('scene-difficulty')).toContainText(difficulty);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/9');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Settlers');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'Honey, I heard that some wild animals live here! Hold me tight!',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
}

test('Free Play opens Chinook Woods with map 26, bilingual copy, and its first quiet wave', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('5 implemented levels available');
  await expect(page.getByTestId('campaign-level-23')).toBeEnabled();
  await page.getByTestId('campaign-level-23').click();
  await expectChinookOverview(page);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '奇努克森林' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('奇努克人在这里为鲑鱼垂钓者建造了一座宏伟的游乐园。');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expectChinookOverview(page);
  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-hard').click();
  await expectChinookOpening(page, 'FREE PLAY · OREGON · 23', 'HARD');

  const frame = page.locator('.game-frame');
  const intro = page.getByTestId('campaign-wave-intro');
  const frameBounds = await frame.boundingBox();
  const introBounds = await intro.boundingBox();
  expect(frameBounds).not.toBeNull();
  expect(introBounds).not.toBeNull();
  expect(introBounds!.x).toBeGreaterThanOrEqual(frameBounds!.x);
  expect(introBounds!.y).toBeGreaterThanOrEqual(frameBounds!.y);
  expect(introBounds!.x + introBounds!.width).toBeLessThanOrEqual(frameBounds!.x + frameBounds!.width + 1);
  expect(introBounds!.y + introBounds!.height).toBeLessThanOrEqual(frameBounds!.y + frameBounds!.height + 1);
});

test('formal Chinook Woods remains locked until Cashcow Canyon is complete', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page, completedThroughLevelTwentyOne);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-22')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-23')).toBeDisabled();

  await writeProfile(page, [
    ...completedThroughLevelTwentyOne,
    'campaign-oregon-02',
    'campaign-oregon-10',
    'campaign-dakota-10',
    'campaign-nevada-10',
    'campaign-alaska-10',
  ]);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-23')).toBeEnabled();
  await page.getByTestId('campaign-level-23').click();
  await expectChinookOverview(page);
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectChinookOpening(page, 'OREGON · 23', 'MEDIUM');
});
