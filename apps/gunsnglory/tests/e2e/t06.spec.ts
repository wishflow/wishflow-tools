import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { openSingleWaveSample } from './helpers';

async function mapPoint(
  page: import('@playwright/test').Page,
  cellX: number,
  cellY: number,
): Promise<{ x: number; y: number }> {
  const canvasLocator = page.getByTestId('game-canvas');
  await canvasLocator.scrollIntoViewIfNeeded();
  return canvasLocator.evaluate((element, cell) => {
    const canvas = element as HTMLCanvasElement;
    const bounds = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const tileSize = Math.floor(Math.min((1024 * dpr) / 17, 64 * dpr)) / dpr;
    const originX = (1024 - 17 * tileSize) / 2;
    const originY = (576 - 17 * tileSize) / 2;
    return {
      x: bounds.left + ((originX + cell.x * tileSize) / 1024) * bounds.width,
      y: bounds.top + ((originY + cell.y * tileSize) / 576) * bounds.height,
    };
  }, { x: cellX, y: cellY });
}

async function canvasPixels(page: import('@playwright/test').Page): Promise<string> {
  return page.getByTestId('game-canvas').evaluate((element) => (element as HTMLCanvasElement).toDataURL());
}

test('blocks a drag at original map scenery, then stops when the pointer is released', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await openSingleWaveSample(page);
  const status = page.getByTestId('selection-status');
  const start = await mapPoint(page, 8.5, 8.25);
  const beyondScenery = await mapPoint(page, 15, 8.75);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(status).toContainText('Gunslinger selected');
  await page.mouse.move(beyondScenery.x, beyondScenery.y, { steps: 8 });
  await expect(status).toContainText('(10, 9)', { timeout: 5000 });
  await page.mouse.up();

  const stoppedPixels = await canvasPixels(page);
  await page.waitForTimeout(250);
  expect(await canvasPixels(page)).toBe(stoppedPixels);
  await expect(status).toContainText('(10, 9)');
});

test('stops a drag on pointer cancellation or lost capture', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });

  for (const eventType of ['pointercancel', 'lostpointercapture']) {
    await page.goto('/');
    await openSingleWaveSample(page);
    await page.evaluate(() => {
      const state = window as Window & { __gngPointerId?: number };
      document.querySelector('[data-testid="game-canvas"]')?.addEventListener('pointerdown', (event) => {
        state.__gngPointerId = (event as PointerEvent).pointerId;
      }, { once: true });
    });
    const start = await mapPoint(page, 8.5, 8.25);
    const target = await mapPoint(page, 14, 8.75);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.waitForTimeout(300);

    await page.evaluate((type) => {
      const state = window as Window & { __gngPointerId?: number };
      const canvas = document.querySelector('[data-testid="game-canvas"]');
      if (!canvas || state.__gngPointerId === undefined) throw new Error('Pointer was not observed');
      canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        pointerId: state.__gngPointerId,
        pointerType: 'mouse',
        isPrimary: true,
      }));
    }, eventType);

    const stoppedPixels = await canvasPixels(page);
    await page.waitForTimeout(250);
    expect(await canvasPixels(page), eventType).toBe(stoppedPixels);
    await page.mouse.up();
  }
});

test('moves and releases a unit through a real mobile touch drag', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  try {
    await page.goto('/');
    await openSingleWaveSample(page, 'tap');
    const status = page.getByTestId('selection-status');
    const start = await mapPoint(page, 8.5, 8.25);
    const target = await mapPoint(page, 11.5, 8.75);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: start.x, y: start.y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: target.x, y: target.y, id: 1 }],
    });
    await expect(status).toContainText('Gunslinger selected');
    await expect(status).toContainText('(10, 9)', { timeout: 5000 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    const stoppedPixels = await canvasPixels(page);
    await page.waitForTimeout(250);
    expect(await canvasPixels(page)).toBe(stoppedPixels);
    await cdp.detach();
  } finally {
    await context.close();
  }
});
