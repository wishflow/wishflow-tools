import { expect, test } from '@playwright/test';

test('starts one preview enemy after confirmation and renders its movement', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('game-canvas');
  const waveStatus = page.getByTestId('wave-status');
  await expect(canvas).toBeVisible();
  await expect(waveStatus).toContainText('Wave 1 ready · Lives 50');

  const before = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(waveStatus).toContainText('Wave 1 · Lives 50 · Enemies 1');
  await page.waitForTimeout(300);

  const after = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  expect(after).not.toBe(before);
});

test('starts the preview wave from a mobile touch control', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  const waveStatus = page.getByTestId('wave-status');
  await expect(waveStatus).toContainText('Wave 1 ready · Lives 50');
  await page.getByRole('button', { name: 'Start one pioneer sample' }).tap();
  await expect(waveStatus).toContainText('Wave 1 · Lives 50 · Enemies 1');
  await context.close();
});
