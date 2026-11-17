import { expect, test } from '@playwright/test';

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

async function writeCompletedProfile(page: import('@playwright/test').Page, completedScenarios: string[]): Promise<void> {
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
        lastOperationId: 'seed-lumber-mill-hills-gate',
        lastRequestDigest: 'seed-lumber-mill-hills-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

const completedThroughOregonEight = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  ...Array.from({ length: 8 }, (_, index) => `campaign-oregon-${String(index + 1).padStart(2, '0')}`),
];

async function expectLumberMillOpening(page: import('@playwright/test').Page, context: string): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Lumber Mill Hills · Level 30');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Oregon Geezer');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    '"Boys, it\'s wonderful that you cut down all those trees here! Finally, I can see!"',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
}

test('Free Play opens Lumber Mill Hills from the real Oregon menu with map 33 and the APK opening', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('10 implemented levels available');
  await expect(page.getByTestId('campaign-level-30')).toBeEnabled();
  await page.getByTestId('campaign-level-30').click();

  await expect(page.getByRole('heading', { name: 'Lumber Mill Hills' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The sawmills of Lumber Mill Hills destroy nature and forests in a beautiful manner.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_33\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const minimap = page.getByTestId('campaign-overview-minimap');
  await expect(minimap).toHaveAttribute('data-scenario-id', 'campaign-oregon-10');
  await expect(minimap).toHaveJSProperty('naturalWidth', 192);
  await expect(minimap).toHaveJSProperty('naturalHeight', 144);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '木材厂山岭' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('木材厂山岭的锯木厂以“美妙”的方式摧毁自然与森林。');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByTestId('campaign-difficulty-medium')).toBeEnabled();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectLumberMillOpening(page, 'FREE PLAY · OREGON · 30');
});

test('formal Lumber Mill Hills remains locked until Snake River is complete, then opens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, completedThroughOregonEight);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-29')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-30')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughOregonEight, 'campaign-oregon-09']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-oregon').click();
  await expect(page.getByTestId('campaign-level-30')).toBeEnabled();
  await page.getByTestId('campaign-level-30').click();
  await expect(page.getByRole('heading', { name: 'Lumber Mill Hills' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectLumberMillOpening(page, 'OREGON · 30');
});
