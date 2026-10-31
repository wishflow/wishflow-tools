import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { cowGulchMarkerPoint, tapCanvasPoint } from './helpers';

async function screenPointForCanvasPoint(
  page: import('@playwright/test').Page,
  point: { x: number; y: number },
): Promise<{ x: number; y: number }> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  return {
    x: bounds.x + (point.x / 1024) * bounds.width,
    y: bounds.y + (point.y / 576) * bounds.height,
  };
}

function readCash(text: string): number {
  const cash = Number(text.match(/Cash \$(\d+)/)?.[1]);
  if (!Number.isSafeInteger(cash)) throw new Error(`Cash is not visible in wave status: ${text}`);
  return cash;
}

test('touch can move an active unit and inspect a sleeping Gunslinger before earning its hire price', async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
  await page.addInitScript(() => {
    const originalGetRandomValues = crypto.getRandomValues.bind(crypto);
    let provideCampaignSeed = true;
    crypto.getRandomValues = ((array: Uint32Array<ArrayBuffer>) => {
      if (provideCampaignSeed && array instanceof Uint32Array && array.length === 1) {
        array[0] = 42;
        provideCampaignSeed = false;
        return array;
      }
      return originalGetRandomValues(array) as typeof array;
    }) as typeof crypto.getRandomValues;
  });
  await installAutoContinueCampaignWaveIntro(page);

  try {
    await page.goto('/');
    await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
    const speed = page.getByRole('slider', { name: 'Simulation speed' });
    await speed.focus();
    await speed.press('End');
    await expect(speed).toHaveValue('4');

    await page.evaluate(() => {
      let timestamp = 0;
      window.requestAnimationFrame = (callback) => window.setTimeout(() => {
        timestamp += 100;
        callback(timestamp);
      }, 100);
      window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
    });
    const waveStatus = page.getByTestId('wave-status');
    await expect(waveStatus).toContainText('Wave 1/8');
    await expect(waveStatus).toContainText('Cash $65');

    const cdp = await context.newCDPSession(page);
    const start = await screenPointForCanvasPoint(page, cowGulchMarkerPoint(8, 8));
    const target = await screenPointForCanvasPoint(page, cowGulchMarkerPoint(8, 10));
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: start.x, y: start.y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: target.x, y: target.y, id: 1 }],
    });
    // Keep the finger down while the selected unit walks to its commanded cell.
    await page.clock.runFor(2_000);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected · Cell (9, 10)');

    expect(readCash(await waveStatus.innerText())).toBeLessThan(75);
    await tapCanvasPoint(page, cowGulchMarkerPoint(3, 6));
    const hire = page.getByTestId('hire-map-unit');
    await expect(hire).toHaveText('Hire map Gunslinger · $75');
    await expect(hire).toBeDisabled();
    await expect(page.getByTestId('selection-status')).toContainText('Gunslinger is waiting to be hired · Cell (4, 7)');
    await cdp.detach();
  } finally {
    await context.close();
  }
});
