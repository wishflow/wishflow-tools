import { expect, test } from '@playwright/test';

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

  const clickWorld = async (worldX: number, worldY: number) => {
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Game canvas has no layout box');
    await page.mouse.click(
      bounds.x + bounds.width * worldX / 1024,
      bounds.y + bounds.height * worldY / 576,
    );
  };

  await clickWorld(512, 288);
  await expect(status).toContainText('Gunslinger selected');

  await clickWorld(272, 48);
  await expect(status).toContainText('No unit selected');

  await page.setViewportSize({ width: 390, height: 844 });
  const ratio = await canvas.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.width / bounds.height;
  });
  expect(Math.abs(ratio - 16 / 9)).toBeLessThan(0.02);
  const startButtonBox = await page.getByRole('button', { name: 'Start one pioneer sample' }).boundingBox();
  expect(startButtonBox?.width).toBeGreaterThan(170);

  await clickWorld(512, 288);
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
  await page.goto('/');
  const canvas = page.getByTestId('game-canvas');
  const status = page.getByTestId('selection-status');
  await expect(status).toContainText('No unit selected');

  const tapWorld = async (worldX: number, worldY: number) => {
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Game canvas has no layout box');
    await page.touchscreen.tap(
      bounds.x + bounds.width * worldX / 1024,
      bounds.y + bounds.height * worldY / 576,
    );
  };

  await tapWorld(512, 288);
  await expect(status).toContainText('Gunslinger selected');
  await tapWorld(272, 48);
  await expect(status).toContainText('No unit selected');
  await context.close();
});
