import { expect, test } from '@playwright/test';
import { calculateMapViewport } from '../../src/render/map-viewport';

const techTownMapViewport = calculateMapViewport(32, 24, 1024, 576);

async function writeProfile(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: false },
        completedScenarios: [
          'campaign-new-mexico-01',
          'campaign-new-mexico-02',
          'campaign-new-mexico-03',
        ],
        highScores: {},
        appliedSettlementIds: [],
        revision: 1,
        lastOperationId: 'seed-tech-town-formal',
        lastRequestDigest: 'seed-tech-town-formal',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }));
}

async function clickMapCell(
  page: import('@playwright/test').Page,
  cell: { x: number; y: number },
): Promise<void> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Tech Town canvas has no layout box');
  const logicalX = techTownMapViewport.origin.x + ((cell.x + 0.5) * techTownMapViewport.tileSize);
  const logicalY = techTownMapViewport.origin.y + ((cell.y + 0.25) * techTownMapViewport.tileSize);
  await page.mouse.click(
    bounds.x + ((logicalX / 1024) * bounds.width),
    bounds.y + ((logicalY / 576) * bounds.height),
  );
}

test('opens formal Tech Town from the campaign and hires a real map unit in a muted session', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    const mediaWindow = window as Window & { __audioAttempts?: string[] };
    mediaWindow.__audioAttempts = [];
    HTMLMediaElement.prototype.play = function () {
      mediaWindow.__audioAttempts?.push(this.currentSrc || this.src);
      return Promise.resolve();
    };
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeProfile(page);
  await page.reload();

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-04')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-05')).toBeDisabled();
  await page.getByTestId('campaign-level-04').click();
  await expect(page.getByRole('heading', { name: 'Tech Town' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-easy').click();

  await expect(page.locator('#scene-title')).toHaveText('Tech Town · Level 4');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('scene-context')).toHaveText('NEW MEXICO · 04');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $300');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "The railroad could be our most powerful weapon, if we mount deadly Gatling guns on empty cars! Unfortunately that isn't free.",
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  await page.getByTestId('campaign-wave-intro').getByRole('button', { name: 'Continue' }).click();
  await clickMapCell(page, { x: 15, y: 5 });
  await expect(page.getByTestId('selection-status')).toHaveText('Gunslinger is waiting to be hired · Cell (16, 6)');
  await expect(page.getByTestId('map-hire-confirmation')).toBeVisible();
  await page.getByTestId('confirm-map-hire').click();
  await expect(page.getByTestId('map-hire-status')).toHaveText('Gunslinger hired from the map for $75.');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $225');
  const attemptedAudioSources = await page.evaluate(() =>
    (window as Window & { __audioAttempts?: string[] }).__audioAttempts ?? []);
  expect(attemptedAudioSources).toEqual([]);
  expect(pageErrors).toEqual([]);

  await page.getByTestId('campaign-menu-toggle').click();
  await page.getByTestId('campaign-exit-confirmation').getByRole('button', { name: 'Leave battle' }).click();
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-05')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-05')).toHaveAttribute('aria-label', /locked/i);
});
