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
    await page.goto('/?testBattle=1');
    await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
    const speed = page.getByRole('slider', { name: 'Simulation speed' });
    await speed.focus();
    await speed.press('Home');
    await expect(speed).toHaveValue('0.25');
    await page.getByTestId('game-toolbar-toggle').click();

    const waveStatus = page.getByTestId('wave-status');
    await expect.poll(async () => readCash(await waveStatus.innerText())).toBeLessThan(100);

    const cdp = await context.newCDPSession(page);
    const start = await Promise.all([
      screenPointForCanvasPoint(page, { x: 512, y: 450 }),
      screenPointForCanvasPoint(page, { x: 512, y: 550 }),
    ]);
    const end = await Promise.all([
      screenPointForCanvasPoint(page, { x: 512, y: 193.2 }),
      screenPointForCanvasPoint(page, { x: 512, y: 303.2 }),
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
    await expect(page.getByTestId('campaign-wave-intro')).toBeHidden();
    await expect(page.getByTestId('pause-status')).toBeHidden();
    await expect(page.getByTestId('pause-board')).toBeHidden();
    await expect(page.getByTestId('pause-toggle')).toHaveCount(0);
    const mexicanPoint = await screenPointForCanvasPoint(page, mexicanMarker);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...mexicanPoint, id: 3 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByTestId('selection-status')).toContainText('Mexican is waiting to be hired · Cell (5, 16)');

    const hireDialog = page.getByTestId('map-hire-confirmation');
    await expect(hireDialog).toBeVisible();
    await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText('Hire Mexican for $100?');
    await expect(page.getByTestId('map-hire-confirmation-details')).toContainText('Not enough cash');
    await expect(page.getByTestId('confirm-map-hire')).toBeHidden();
    expect(readCash(await waveStatus.innerText())).toBeLessThan(100);
    await expect(page.getByTestId('map-hire-status')).toBeEmpty();
    await expect(page.getByTestId('recruit-pool-status')).toHaveText('Recruit pool: empty');
    await expect(page.getByTestId('settlement')).toBeHidden();
    await cdp.detach();
  } finally {
    await context.close();
  }
});
