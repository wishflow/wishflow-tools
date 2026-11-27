import { expect, test } from '@playwright/test';

async function keepSoundOff(page: import('@playwright/test').Page): Promise<void> {
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
}

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
        lastOperationId: 'seed-bombington-integration',
        lastRequestDigest: 'seed-bombington-integration',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function readProfile(page: import('@playwright/test').Page) {
  return page.evaluate(async () => new Promise<{
    completedScenarios: string[];
    highScores: Record<string, number>;
    settings: { difficulty: string };
  }>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction('profiles').objectStore('profiles').get('default');
      read.onsuccess = () => { database.close(); resolve(read.result); };
      read.onerror = () => reject(read.error);
    };
  }));
}

test('Free Play opens Bombington in any difficulty without changing the campaign profile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeProfile(page, []);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-nevada').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('2 implemented levels available');
  await expect(page.getByTestId('campaign-level-42')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-43')).toBeDisabled();
  await page.getByTestId('campaign-level-42').click();

  await expect(page.getByRole('heading', { name: 'Bombington' })).toBeVisible();
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_45\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-nevada-02',
  );
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'This town is a Mecca for all lovers of large and impressive explosions.',
  );

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '炸弹镇' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('这里是所有钟爱巨大而壮观爆炸的人们的圣地。');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-hard').click();

  await expect(page.locator('#scene-title')).toHaveText('Bombington · Level 42');
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · NEVADA · 42');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 10');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'Ay caramba! I like it here! Explosions and plenty horchata drinks!',
  );
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
  await expect(await readProfile(page)).toMatchObject({
    completedScenarios: [],
    highScores: {},
    settings: { difficulty: 'medium' },
  });
});

test('Formal Bombington stays locked until Labyrinth Gulch is complete', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeProfile(page, []);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-nevada').click();
  await expect(page.getByTestId('campaign-level-41')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-42')).toBeDisabled();

  await writeProfile(page, ['campaign-nevada-01']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-nevada').click();
  await expect(page.getByTestId('campaign-level-41')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-42')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-43')).toBeDisabled();
  await page.getByTestId('campaign-level-42').click();

  await expect(page.getByRole('heading', { name: 'Bombington' })).toBeVisible();
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-nevada-02',
  );
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByTestId('campaign-difficulty-medium')).toBeEnabled();
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Bombington · Level 42');
  await expect(page.getByTestId('scene-context')).toHaveText('NEVADA · 42');
  await expect(page.getByTestId('campaign-wave-intro-wave')).toHaveText('Wave 1 of 10');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
