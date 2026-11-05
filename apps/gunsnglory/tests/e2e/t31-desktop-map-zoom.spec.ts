import { expect, test } from './auto-continue-fixtures';
import { calculateMapViewport, mapCellToScreen } from '../../src/render/map-viewport';

async function startOfficialCowGulch(page: import('@playwright/test').Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await page.getByTestId('campaign-level-01').click();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-easy').click();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  await expect(page.getByTestId('map-zoom-controls')).toBeVisible();
}

test('formal Cow Gulch map zoom controls step, clamp, and reset the camera', async ({ page }) => {
  await startOfficialCowGulch(page);
  const zoomLevel = page.getByTestId('map-zoom-level');
  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  const reset = page.getByRole('button', { name: 'Reset zoom' });

  await expect(zoomLevel).toHaveText('1×');
  await expect(zoomOut).toBeDisabled();
  await expect(reset).toBeDisabled();
  for (let step = 0; step < 8; step += 1) await zoomIn.click();
  await expect(zoomLevel).toHaveText('3×');
  await expect(zoomIn).toBeDisabled();

  for (let step = 0; step < 8; step += 1) await zoomOut.click();
  await expect(zoomLevel).toHaveText('1×');
  await expect(zoomOut).toBeDisabled();
  await zoomIn.click();
  await expect(zoomLevel).toHaveText('1.25×');
  await reset.click();
  await expect(zoomLevel).toHaveText('1×');
  await expect(reset).toBeDisabled();

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('map-zoom-controls')).toHaveAttribute('aria-label', '地图缩放');
  await expect(page.getByTestId('map-zoom-in')).toHaveAttribute('aria-label', '放大地图');
  await expect(page.getByTestId('map-zoom-out')).toHaveAttribute('aria-label', '缩小地图');
  await expect(page.getByTestId('map-zoom-reset')).toHaveText('重置缩放');
});

test('canvas wheel zoom preserves the pointer map target and only suppresses page scrolling over the map', async ({ page }) => {
  await startOfficialCowGulch(page);
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  const devicePixelRatio = await page.evaluate(() => window.devicePixelRatio || 1);
  const displayPixelScale = (bounds.width / 1024) * devicePixelRatio;
  const baseViewport = calculateMapViewport(17, 17, 1024, 576, 32, displayPixelScale);
  const targetCell = mapCellToScreen(baseViewport, 8.5, 8.25);
  const pointer = {
    x: bounds.x + (targetCell.x / 1024) * bounds.width,
    y: bounds.y + (targetCell.y / 576) * bounds.height,
  };
  const scrollBeforeCanvasWheel = await page.evaluate(() => window.scrollY);

  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.wheel(0, -120);
  await expect(page.getByTestId('map-zoom-level')).not.toHaveText('1×');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeCanvasWheel);

  await page.mouse.click(pointer.x, pointer.y);
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected');

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(8, 350);
  await page.mouse.wheel(0, 220);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
