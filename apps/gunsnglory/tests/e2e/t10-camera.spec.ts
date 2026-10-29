import { expect, test } from '@playwright/test';
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

test('two-finger map zoom follows its focal point and preserves touch hit testing', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  try {
    await page.goto('/');
    await openSingleWaveSample(page, 'tap');
    const canvas = page.getByTestId('game-canvas');
    const selection = page.getByTestId('selection-status');
    await expect(selection).toHaveText('No unit selected');
    const unitPoint = await mapPoint(page, 8.5, 8.25);
    const centered = { x: unitPoint.x, y: unitPoint.y };
    const shifted = { x: centered.x - 8, y: centered.y + 5 };
    const beforeZoom = await canvasHash(page);

    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: centered.x - 18, y: centered.y, id: 1 },
        { x: centered.x + 18, y: centered.y, id: 2 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: shifted.x - 42, y: shifted.y, id: 1 },
        { x: shifted.x + 42, y: shifted.y, id: 2 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect(selection).toHaveText('No unit selected');
    expect(await canvasHash(page)).not.toBe(beforeZoom);
    await page.touchscreen.tap(shifted.x, shifted.y);
    await expect(selection).toContainText('Gunslinger selected');
    await expect(canvas).toBeVisible();
    await cdp.detach();
  } finally {
    await context.close();
  }
});


test('converting a one-finger drag to a pinch stops movement and locks the remaining finger', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  try {
    await page.goto('/');
    await openSingleWaveSample(page, 'tap');
    const selection = page.getByTestId('selection-status');
    const start = await mapPoint(page, 8.5, 8.25);
    const target = await mapPoint(page, 11.5, 8.75);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: start.x, y: start.y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: target.x, y: target.y, id: 1 }],
    });
    await expect(selection).toContainText('(10, 9)');

    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: target.x, y: target.y, id: 1 },
        { x: target.x + 30, y: target.y, id: 2 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: target.x - 8, y: target.y + 4, id: 1 },
        { x: target.x + 48, y: target.y + 4, id: 2 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [{ x: target.x + 48, y: target.y + 4, id: 2 }],
    });
    const stableStatus = await selection.textContent();
    const stableCanvas = await canvasHash(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: start.x, y: start.y, id: 2 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(250);
    expect(await selection.textContent()).toBe(stableStatus);
    expect(await canvasHash(page)).toBe(stableCanvas);
    await cdp.detach();
  } finally {
    await context.close();
  }
});
