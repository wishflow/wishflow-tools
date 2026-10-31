import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { calculateMapViewport, mapCellToScreen } from '../../src/render/map-viewport';
import { clickCanvasPoint, tapCanvasPoint } from './helpers';

const cowGulchViewport = calculateMapViewport(17, 17, 1024, 576, 32);

type TargetPoint = { x: number; y: number };

async function visibleSettlerWorldPoint(page: import('@playwright/test').Page): Promise<TargetPoint | undefined> {
  const inspection = await page.getByTestId('inspection-enemies').textContent() ?? '';
  const positions = [...inspection.matchAll(/at \((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/g)];
  const visible = positions.find((match) => {
    const x = Number(match[1]);
    const y = Number(match[2]);
    return x > 0.75 && x < 15.5 && y > 1 && y < 15.5;
  });
  return visible ? { x: Number(visible[1]), y: Number(visible[2]) - 0.25 } : undefined;
}

async function installPriorityCrosshairCounter(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const originalRandomValues = Crypto.prototype.getRandomValues;
    Crypto.prototype.getRandomValues = function <T extends ArrayBufferView | null>(
      this: Crypto,
      array: T,
    ): T {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = 42;
        return array;
      }
      return Reflect.apply(originalRandomValues, this, [array]) as T;
    } as typeof originalRandomValues;

    const targetWindow = window as Window & { __priorityCrosshairDrawCount?: number };
    targetWindow.__priorityCrosshairDrawCount = 0;
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (
      this: CanvasRenderingContext2D,
      image: CanvasImageSource,
      ...coordinates: number[]
    ) {
      if (image instanceof HTMLImageElement && image.src.includes('/assets/hud_crosshair.png')) {
        targetWindow.__priorityCrosshairDrawCount = (targetWindow.__priorityCrosshairDrawCount ?? 0) + 1;
      }
      return Reflect.apply(originalDrawImage, this, [image, ...coordinates]);
    } as typeof originalDrawImage;
  });
}

async function pointAtVisibleSettler(page: import('@playwright/test').Page): Promise<TargetPoint> {
  await page.goto('/');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  const speed = page.getByTestId('simulation-speed');
  await expect(speed).toBeEnabled();
  await speed.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '4';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('simulation-speed-value')).toHaveText('4×');

  let worldPoint: TargetPoint | undefined;
  await expect.poll(async () => {
    worldPoint = await visibleSettlerWorldPoint(page);
    return worldPoint !== undefined;
  }, { timeout: 20_000 }).toBe(true);

  await speed.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '0.25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('simulation-speed-value')).toHaveText('0.25×');
  await expect.poll(async () => {
    worldPoint = await visibleSettlerWorldPoint(page);
    return worldPoint !== undefined;
  }, { timeout: 5_000 }).toBe(true);

  const point = mapCellToScreen(cowGulchViewport, worldPoint!.x, worldPoint!.y);
  return point;
}

test('desktop mouse selects a preferred settler and renders the APK marker pair', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await installPriorityCrosshairCounter(page);
  const point = await pointAtVisibleSettler(page);
  const before = await page.evaluate(() =>
    (window as Window & { __priorityCrosshairDrawCount?: number }).__priorityCrosshairDrawCount ?? 0);
  await clickCanvasPoint(page, point);
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __priorityCrosshairDrawCount?: number }).__priorityCrosshairDrawCount ?? 0))
    .toBeGreaterThan(before);
  const drawn = await page.evaluate(() =>
    (window as Window & { __priorityCrosshairDrawCount?: number }).__priorityCrosshairDrawCount ?? 0);
  expect((drawn - before) % 2).toBe(0);
});

test('phone touch selects a preferred settler and renders the APK marker pair', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await installAutoContinueCampaignWaveIntro(page);
    await installPriorityCrosshairCounter(page);
    const point = await pointAtVisibleSettler(page);
    const before = await page.evaluate(() =>
      (window as Window & { __priorityCrosshairDrawCount?: number }).__priorityCrosshairDrawCount ?? 0);
    await page.getByTestId('game-canvas').scrollIntoViewIfNeeded();
    await tapCanvasPoint(page, point);
    await expect.poll(() => page.evaluate(() =>
      (window as Window & { __priorityCrosshairDrawCount?: number }).__priorityCrosshairDrawCount ?? 0))
      .toBeGreaterThan(before);
    const drawn = await page.evaluate(() =>
      (window as Window & { __priorityCrosshairDrawCount?: number }).__priorityCrosshairDrawCount ?? 0);
    expect((drawn - before) % 2).toBe(0);
  } finally {
    await context.close();
  }
});

test('dragging from an enemy does not move the previously selected unit', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  let cdp: Awaited<ReturnType<typeof context.newCDPSession>> | undefined;
  try {
    await installAutoContinueCampaignWaveIntro(page);
    await installPriorityCrosshairCounter(page);
    await page.goto('/');
    await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
    await page.getByTestId('inspection-panel').locator('summary').tap();

    const speed = page.getByTestId('simulation-speed');
    await speed.evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '0.25';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.getByTestId('simulation-speed-value')).toHaveText('0.25×');

    const playerStart = await page.getByTestId('inspection-units').textContent() ?? '';
    const playerMatch = playerStart.match(/gunslinger-1 (?:at|位置) \((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/);
    expect(playerMatch, 'the initial Gunslinger should be present in the inspection view').not.toBeNull();
    const initialPlayer = { x: Number(playerMatch![1]), y: Number(playerMatch![2]) };
    await page.getByTestId('game-canvas').scrollIntoViewIfNeeded();
    await tapCanvasPoint(page, mapCellToScreen(cowGulchViewport, initialPlayer.x, initialPlayer.y));
    await expect(page.getByTestId('selection-status')).toContainText('Gunslinger');

    await speed.evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '4';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.getByTestId('simulation-speed-value')).toHaveText('4×');
    let enemyPoint: TargetPoint | undefined;
    await expect.poll(async () => {
      enemyPoint = await visibleSettlerWorldPoint(page);
      return enemyPoint !== undefined;
    }, { timeout: 20_000 }).toBe(true);
    await speed.evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '0.25';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.getByTestId('simulation-speed-value')).toHaveText('0.25×');
    await expect.poll(async () => {
      enemyPoint = await visibleSettlerWorldPoint(page);
      return enemyPoint !== undefined;
    }, { timeout: 5_000 }).toBe(true);
    const start = mapCellToScreen(cowGulchViewport, enemyPoint!.x, enemyPoint!.y);
    const destination = mapCellToScreen(cowGulchViewport, initialPlayer.x, initialPlayer.y);
    const canvas = page.getByTestId('game-canvas');
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Game canvas has no layout box');
    const toCssPoint = (point: TargetPoint) => ({
      x: bounds.x + bounds.width * point.x / 1024,
      y: bounds.y + bounds.height * point.y / 576,
    });
    const startCss = toCssPoint(start);
    const destinationCss = toCssPoint(destination);
    cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ id: 1, ...startCss, radiusX: 1, radiusY: 1, force: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ id: 1, ...destinationCss, radiusX: 1, radiusY: 1, force: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    const playerAfter = await page.getByTestId('inspection-units').textContent() ?? '';
    const playerAfterMatch = playerAfter.match(/gunslinger-1 (?:at|位置) \((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/);
    expect(playerAfterMatch).not.toBeNull();
    expect({ x: Number(playerAfterMatch![1]), y: Number(playerAfterMatch![2]) }).toEqual(initialPlayer);
  } finally {
    await cdp?.detach();
    await context.close();
  }
});
