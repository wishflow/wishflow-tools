import { expect, test } from '@playwright/test';
import { openSingleWaveSample } from './helpers';

async function setFourTimesSpeed(page: import('@playwright/test').Page): Promise<void> {
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
}

async function startLongWave(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await setFourTimesSpeed(page);
  await openSingleWaveSample(page);
  await page.getByRole('button', { name: 'Open upgrade rules sample' }).click();
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Enemies 1');
}

async function canvasHash(page: import('@playwright/test').Page): Promise<number> {
  return page.getByTestId('game-canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (let index = 0; index < pixels.length; index += 4) {
      hash = Math.imul(hash ^ pixels[index]!, 16777619);
      hash = Math.imul(hash ^ pixels[index + 1]!, 16777619);
      hash = Math.imul(hash ^ pixels[index + 2]!, 16777619);
      hash = Math.imul(hash ^ pixels[index + 3]!, 16777619);
    }
    return hash >>> 0;
  });
}

async function setDocumentHidden(page: import('@playwright/test').Page, hidden: boolean): Promise<void> {
  await page.evaluate((isHidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: isHidden });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: isHidden ? 'hidden' : 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test('manual pause freezes the rendered battle and remains paused across a background round trip', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startLongWave(page);

  const pauseStatus = page.getByTestId('pause-status');
  const pauseButton = page.getByRole('button', { name: 'Pause battle' });
  await pauseButton.click();
  await expect(pauseStatus).toHaveText('Battle paused.');
  await expect(page.getByRole('button', { name: 'Resume battle' })).toBeEnabled();
  const frozenCanvas = await canvasHash(page);
  await page.waitForTimeout(250);
  expect(await canvasHash(page)).toBe(frozenCanvas);

  await setDocumentHidden(page, true);
  await setDocumentHidden(page, false);
  await expect(pauseStatus).toHaveText('Battle paused.');
  await expect(page.getByRole('button', { name: 'Resume battle' })).toBeEnabled();
  await page.waitForTimeout(250);
  expect(await canvasHash(page)).toBe(frozenCanvas);

  await page.getByRole('button', { name: 'Resume battle' }).click();
  await expect(pauseStatus).toBeHidden();
  await expect(page.getByRole('button', { name: 'Pause battle' })).toBeEnabled();
  await page.waitForTimeout(700);
  expect(await canvasHash(page)).not.toBe(frozenCanvas);
});

test('backgrounding pauses and returning resumes from a fresh time baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startLongWave(page);

  const pauseStatus = page.getByTestId('pause-status');
  await setDocumentHidden(page, true);
  await expect(pauseStatus).toHaveText('Battle paused automatically while this tab was in the background.');
  await expect(page.getByRole('button', { name: 'Resume battle' })).toBeEnabled();
  const frozenCanvas = await canvasHash(page);
  await page.waitForTimeout(300);
  expect(await canvasHash(page)).toBe(frozenCanvas);
  await expect(page.getByTestId('wave-status')).toContainText('Enemies 1');

  await setDocumentHidden(page, false);
  await expect(pauseStatus).toBeHidden();
  await expect(page.getByRole('button', { name: 'Pause battle' })).toBeEnabled();
  await page.waitForTimeout(700);
  expect(await canvasHash(page)).not.toBe(frozenCanvas);
  await expect(page.getByTestId('wave-status')).not.toContainText('ready');
});

test('pause and resume controls remain usable with touch on a phone-sized viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await setFourTimesSpeed(page);
    await openSingleWaveSample(page, 'tap');
    await page.getByRole('button', { name: 'Open upgrade rules sample' }).tap();
    await page.getByRole('button', { name: 'Start one pioneer sample' }).tap();
    await expect(page.getByTestId('wave-status')).toContainText('Enemies 1');
    await page.getByRole('button', { name: 'Pause battle' }).tap();
    await expect(page.getByTestId('pause-status')).toHaveText('Battle paused.');
    await page.getByRole('button', { name: 'Resume battle' }).tap();
    await expect(page.getByTestId('pause-status')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Pause battle' })).toBeEnabled();
  } finally {
    await context.close();
  }
});
