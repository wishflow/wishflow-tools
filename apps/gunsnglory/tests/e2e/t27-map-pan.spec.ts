import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';

async function canvasPoint(
  page: import('@playwright/test').Page,
  x: number,
  y: number,
): Promise<{ x: number; y: number }> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  return { x: bounds.x + bounds.width * x / 1024, y: bounds.y + bounds.height * y / 576 };
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

async function openPausedOfficialBattle(page: import('@playwright/test').Page): Promise<void> {
  await installAutoContinueCampaignWaveIntro(page);
  await page.goto('/');
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  const pause = page.getByTestId('pause-toggle');
  await expect(pause).toBeEnabled();
  await pause.click();
  await expect(pause).toHaveText('Resume battle');
}

test('desktop mouse pans the map and moves the minimap viewport frame with it', async ({ page }) => {
  await openPausedOfficialBattle(page);
  const beforeWorldDrag = await canvasHash(page);
  const worldStart = await canvasPoint(page, 350, 300);
  const worldEnd = await canvasPoint(page, 350, 350);
  await page.mouse.move(worldStart.x, worldStart.y);
  await page.mouse.down();
  await page.mouse.move(worldEnd.x, worldEnd.y, { steps: 5 });
  await page.mouse.up();
  const afterWorldDrag = await canvasHash(page);
  expect(afterWorldDrag, 'an empty playfield drag scrolls the map').not.toBe(beforeWorldDrag);

  const beforeMinimapDrag = afterWorldDrag;
  const minimapStart = await canvasPoint(page, 719, 15);
  const minimapEnd = await canvasPoint(page, 719, 23);
  await page.mouse.move(minimapStart.x, minimapStart.y);
  await page.mouse.down();
  await page.mouse.move(minimapEnd.x, minimapEnd.y, { steps: 5 });
  await page.mouse.up();
  expect(await canvasHash(page), 'dragging the minimap moves the main view and its outline').not.toBe(beforeMinimapDrag);
});

test('mobile touch drags the minimap viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  try {
    await openPausedOfficialBattle(page);
    const beforeWorldDrag = await canvasHash(page);
    const worldStart = await canvasPoint(page, 350, 300);
    const worldEnd = await canvasPoint(page, 350, 350);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...worldStart, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...worldEnd, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(await canvasHash(page), 'touching and dragging empty playfield pans the map').not.toBe(beforeWorldDrag);

    const beforeMinimapDrag = await canvasHash(page);
    const start = await canvasPoint(page, 719, 15);
    const end = await canvasPoint(page, 719, 23);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...start, id: 2 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...end, id: 2 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(await canvasHash(page), 'touching and dragging the minimap updates the main view').not.toBe(beforeMinimapDrag);
  } finally {
    await cdp.detach();
    await context.close();
  }
});
