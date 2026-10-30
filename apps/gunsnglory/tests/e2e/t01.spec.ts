import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { clickCanvasPoint, cowGulchMarkerPoint, tapCanvasPoint } from './helpers';

test('opens Cow Gulch, selects the gunslinger, clears selection, and survives resize', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const canvas = page.getByTestId('game-canvas');
  const status = page.getByTestId('selection-status');

  await expect(canvas).toBeVisible();
  await expect(status).toContainText('No unit selected');

  const colorCount = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext('2d');
    if (!context) return 0;
    const pixels = context.getImageData(0, 0, canvasElement.width, canvasElement.height).data;
    const colors = new Set<string>();
    for (let index = 0; index < pixels.length; index += 64) {
      colors.add([pixels[index], pixels[index + 1], pixels[index + 2]].join(','));
    }
    return colors.size;
  });
  expect(colorCount).toBeGreaterThan(30);

  await clickCanvasPoint(page, { x: 512, y: 288 });
  await expect(status).toContainText('Gunslinger selected');

  await clickCanvasPoint(page, cowGulchMarkerPoint(3, 6));
  await expect(status).toContainText('Gunslinger is waiting to be hired');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  await expect(page.getByTestId('recruit-pool-status')).toContainText('empty');
  await clickCanvasPoint(page, { x: 250, y: 24 });
  await expect(status).toContainText('Gunslinger is waiting to be hired');

  await clickCanvasPoint(page, cowGulchMarkerPoint(6, 5));
  await expect(status).toContainText('Mexican is waiting to be hired');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(status).toContainText('墨西哥人待招募，尚未雇用');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await expect(status).toContainText('Mexican is waiting to be hired');

  await clickCanvasPoint(page, { x: 272, y: 80 });
  await expect(status).toContainText('No unit selected');

  await page.setViewportSize({ width: 390, height: 844 });
  const ratio = await canvas.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.width / bounds.height;
  });
  expect(Math.abs(ratio - 16 / 9)).toBeLessThan(0.02);
  const startButtonBox = await page.getByTestId('open-single-wave-sample').boundingBox();
  expect(startButtonBox?.width).toBeGreaterThan(170);

  await clickCanvasPoint(page, { x: 512, y: 288 });
  await expect(status).toContainText('Gunslinger selected');

  await page.getByRole('button', { name: /clear selection/i }).click();
  await expect(status).toContainText('No unit selected');

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(status).toContainText('尚未选择单位');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await expect(status).toContainText('No unit selected');
});

test('selects and clears the unit with mobile touch input', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  await page.goto('/');
  const canvas = page.getByTestId('game-canvas');
  const status = page.getByTestId('selection-status');
  await expect(status).toContainText('No unit selected');

  await tapCanvasPoint(page, { x: 512, y: 288 });
  await expect(status).toContainText('Gunslinger selected');
  await tapCanvasPoint(page, { x: 272, y: 80 });
  await expect(status).toContainText('No unit selected');

  await tapCanvasPoint(page, cowGulchMarkerPoint(3, 6));
  await expect(status).toContainText('Gunslinger is waiting to be hired');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  await expect(page.getByTestId('recruit-pool-status')).toContainText('empty');
  await context.close();
});

test('renders the original battle HUD and routes its pause tap away from map selection', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const pauseStatus = page.getByTestId('pause-status');
  const selectionStatus = page.getByTestId('selection-status');
  const canvas = page.getByTestId('game-canvas');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  await expect(page.getByRole('button', { name: 'Pause battle' })).toBeEnabled();
  const minimapTerrain = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    const scale = canvasElement.width / 1024;
    const sampleTile = (tileX: number, tileY: number) => {
      const x = 702 + tileX * 2;
      const y = 10 + tileY * 2;
      return [...context.getImageData(Math.ceil(x * scale), Math.ceil(y * scale), 1, 1).data];
    };
    return {
      water: sampleTile(2, 1), desert: sampleTile(8, 2),
    };
  });
  expect(minimapTerrain.water).toEqual([96, 157, 179, 255]);
  expect(minimapTerrain.desert).toEqual([251, 209, 159, 255]);

  await clickCanvasPoint(page, { x: 314, y: 24 });
  await expect(pauseStatus).toHaveText('Battle paused.');
  await clickCanvasPoint(page, { x: 250, y: 24 });
  await expect(selectionStatus).toHaveText('No unit selected');

  await clickCanvasPoint(page, { x: 314, y: 24 });
  await expect(pauseStatus).toBeHidden();
  await expect(page.getByRole('button', { name: 'Pause battle' })).toBeEnabled();
});
