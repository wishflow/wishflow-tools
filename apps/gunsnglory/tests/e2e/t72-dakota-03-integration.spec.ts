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
        lastOperationId: 'seed-fort-knockout-gate',
        lastRequestDigest: 'seed-fort-knockout-gate',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

const completedThroughLevelThirtyOne = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
  ...Array.from({ length: 11 }, (_, index) => `campaign-oregon-${String(index + 1).padStart(2, '0')}`),
];

async function expectFortKnockoutOpening(
  page: import('@playwright/test').Page,
  context: string,
): Promise<void> {
  await expect(page.locator('#scene-title')).toHaveText('Fort Knockout · Level 33');
  await expect(page.getByTestId('scene-context')).toHaveText(context);
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/10');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText('Engineer');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    'End of the line! Fort Knockout! Please exit the train and position your forces to attack innocent settlers!',
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
}

test('Free Play opens Fort Knockout from Dakota with map 36, bilingual copy, and APK opening', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('3 implemented levels available');
  await expect(page.getByTestId('campaign-level-33')).toBeEnabled();
  await page.getByTestId('campaign-level-33').click();

  await expect(page.getByRole('heading', { name: 'Fort Knockout' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    'Fort Knockout invites you to a relaxing comfort weekend with its talented staff.',
  );
  const mapArt = page.locator('.campaign-overview-level-art');
  await expect(mapArt).toHaveAttribute('src', /gng_levelmap_36\.png/);
  await expect.poll(() => mapArt.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute(
    'data-scenario-id', 'campaign-dakota-03',
  );

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '堡垒决战' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('堡垒决战邀请你与才华横溢的员工共度一个轻松惬意的周末。');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByTestId('campaign-difficulty-easy')).toBeEnabled();
  await expect(page.getByTestId('campaign-difficulty-medium')).toBeEnabled();
  await expect(page.getByTestId('campaign-difficulty-hard')).toBeEnabled();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectFortKnockoutOpening(page, 'FREE PLAY · DAKOTA · 33');
});

test('formal Fort Knockout stays locked until Six Grandfathers is complete', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await keepSoundOff(page);
  await writeCompletedProfile(page, completedThroughLevelThirtyOne);
  await page.reload();
  await keepSoundOff(page);

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-32')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-33')).toBeDisabled();

  await writeCompletedProfile(page, [...completedThroughLevelThirtyOne, 'campaign-dakota-02']);
  await page.reload();
  await keepSoundOff(page);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-dakota').click();
  await expect(page.getByTestId('campaign-level-33')).toBeEnabled();
  await page.getByTestId('campaign-level-33').click();
  await expect(page.getByRole('heading', { name: 'Fort Knockout' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expectFortKnockoutOpening(page, 'DAKOTA · 33');
});
