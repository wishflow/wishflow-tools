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
        lastOperationId: 'seed-six-grandfathers-gate',
        lastRequestDigest: 'seed-six-grandfathers-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

const completedThroughLevelThirty = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-oregon-${String(index + 1).padStart(2, '0')}`),
];

async function expectSixGrandfathersOpening(
  page: import('@playwright/test').Page,
  context: string,
): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Six Grandfathers · Level 32');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Indian');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'Our ancestors called this mountain Six Grandfathers. From a distance, its shape looks like a collection of giant heads!',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
}

test('Free Play opens Six Grandfathers from the Dakota menu with map 35 and APK opening', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('2 implemented levels available');
  await expect(page.getByTestId('campaign-level-32')).toBeEnabled();
  await page.getByTestId('campaign-level-32').click();

  await expect(page.getByRole('heading', { name: 'Six Grandfathers' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'The famous rock formations of the Six Grandfathers attract many travelers every year.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_35\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-dakota-02',
  );

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '六祖山' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('六祖山著名的岩石群每年都会吸引许多游客。');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectSixGrandfathersOpening(page, 'FREE PLAY · DAKOTA · 32');
});

test('formal Six Grandfathers stays locked until Loot Lakes is complete, then opens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, completedThroughLevelThirty);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-31')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-32')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughLevelThirty, 'campaign-oregon-11']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-32')).toBeEnabled();
  await page.getByTestId('campaign-level-32').click();
  await expect(page.getByRole('heading', { name: 'Six Grandfathers' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectSixGrandfathersOpening(page, 'DAKOTA · 32');
});
