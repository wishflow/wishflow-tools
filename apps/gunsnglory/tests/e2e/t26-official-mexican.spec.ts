import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';

function readCash(text: string): number {
  const cash = Number(text.match(/Cash \$(\d+)/)?.[1]);
  if (!Number.isSafeInteger(cash)) throw new Error(`Cash is not visible in wave status: ${text}`);
  return cash;
}

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

test('touch players can pan to the original Mexican slot and see its unaffordable state in official Cow Gulch', async ({ browser }) => {
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
    const deterministicGetRandomValues = (array: Uint32Array<ArrayBuffer>): Uint32Array<ArrayBuffer> => {
      if (provideCampaignSeed && array instanceof Uint32Array && array.length === 1) {
        array[0] = 42;
        provideCampaignSeed = false;
        return array;
      }
      return originalGetRandomValues(array) as Uint32Array<ArrayBuffer>;
    };
    crypto.getRandomValues = deterministicGetRandomValues as typeof crypto.getRandomValues;
  });
  await installAutoContinueCampaignWaveIntro(page);

  try {
    await page.goto('/');
    await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
    const speed = page.getByRole('slider', { name: 'Simulation speed' });
    await speed.focus();
    await speed.press('End');
    await expect(speed).toHaveValue('4');

    const waveStatus = page.getByTestId('wave-status');
    await expect(waveStatus).toContainText('Cash $65');
    expect(readCash(await waveStatus.innerText())).toBe(65);

    const cdp = await context.newCDPSession(page);
    const start = await Promise.all([
      screenPointForCanvasPoint(page, { x: 512, y: 450 }),
      screenPointForCanvasPoint(page, { x: 512, y: 550 }),
    ]);
    const end = await Promise.all([
      screenPointForCanvasPoint(page, { x: 512, y: 45 }),
      screenPointForCanvasPoint(page, { x: 512, y: 155 }),
    ]);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: start.map((point, id) => ({ ...point, id })),
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: end.map((point, id) => ({ ...point, id })),
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    // At 1.1×, moving the pinch center upward exposes the original bottom-row map object.
    const mexicanMarker = {
      x: -49 + (4.5 * 66),
      y: -546 + (15.25 * 66),
    };
    const mexicanPoint = await screenPointForCanvasPoint(page, mexicanMarker);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...mexicanPoint, id: 3 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByTestId('selection-status')).toContainText('Mexican is waiting to be hired · Cell (5, 16)');

    const hire = page.getByTestId('hire-map-unit');
    await expect(hire).toHaveText('Hire map Mexican · $100');
    await expect(hire).toBeDisabled();
    await expect(waveStatus).toContainText('Cash $65');
    await expect(page.getByTestId('settlement')).toBeHidden();
    await cdp.detach();
  } finally {
    await context.close();
  }
});
