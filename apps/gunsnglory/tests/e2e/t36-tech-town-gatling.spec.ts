import { expect, test, type Page } from '@playwright/test';
import { calculateMapViewport } from '../../src/render/map-viewport';

const mapViewport = calculateMapViewport(32, 24, 1024, 576);

async function clickMapPoint(page: Page, mapX: number, mapY: number): Promise<void> {
  const canvas = page.getByTestId('game-canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  await page.mouse.click(
    bounds.x + ((mapViewport.origin.x + mapX * mapViewport.tileSize) / 1024) * bounds.width,
    bounds.y + ((mapViewport.origin.y + mapY * mapViewport.tileSize) / 576) * bounds.height,
  );
}

test('map click confirms or cancels Gatling hire, upgrades it, and fires on the third route', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1');
  await page.getByTestId('open-tech-town-train-sample').click();
  await expect(page.locator('#scene-title')).toHaveText('Tech Town · Train and Gatling test');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $350');

  await page.getByTestId('start-wave').click();
  await clickMapPoint(page, 8.5, 12.5);
  const dialog = page.getByTestId('map-hire-confirmation');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText('Hire Gatling wagon for $125?');
  await page.getByTestId('cancel-map-hire').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('Cash $350');

  await clickMapPoint(page, 8.5, 12.5);
  await expect(dialog).toBeVisible();
  await page.getByTestId('confirm-map-hire').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('map-hire-status')).toHaveText('Gatling wagon hired from the map for $125.');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $225');

  await expect(page.locator('[data-action="upgrade-unit"]')).toHaveText('Upgrade Gatling wagon · $75');
  await page.locator('[data-action="upgrade-unit"]').click();
  await expect(page.getByTestId('upgrade-confirmation')).toBeVisible();
  await expect(page.locator('#upgrade-confirmation-title')).toHaveText('Upgrade Gatling wagon for $75?');
  await expect(page.getByTestId('upgrade-confirmation-details')).toContainText(
    'HP loss = trunc(base × target-type modifier / 100)',
  );
  await page.locator('[data-action="confirm-upgrade"]').click();
  await expect(page.getByTestId('upgrade-status')).toContainText('Gatling wagon upgraded to level 1 for $75.');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $150');

  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
  const gatlingShotRequest = page.waitForRequest(
    (request) => request.url().includes('/assets/sounds/sound_gattling_gun'),
    { timeout: 45_000 },
  );
  await gatlingShotRequest;
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
