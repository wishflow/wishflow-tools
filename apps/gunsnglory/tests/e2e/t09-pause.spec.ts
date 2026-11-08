import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { openSingleWaveSample } from './helpers';

async function setFourTimesSpeed(page: import('@playwright/test').Page): Promise<void> {
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
}

async function startLongWave(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?testBattle=1');
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
  await installAutoContinueCampaignWaveIntro(page);
  try {
    await page.goto('/?testBattle=1');
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

test('keeps pause and neighboring toolbar positions stable within each language and viewport', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1');
  const sound = page.getByTestId('sound-toggle');
  if (await sound.getAttribute('aria-pressed') === 'true') await sound.click();
  await setFourTimesSpeed(page);
  await openSingleWaveSample(page);
  await page.getByRole('button', { name: 'Open upgrade rules sample' }).click();
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Enemies 1');

  const pause = page.getByTestId('pause-toggle');
  const campaign = page.getByTestId('campaign-menu-toggle');
  const readBounds = () => page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing element: ${selector}`);
      const bounds = element.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    };
    return {
      frame: rect('.game-frame'),
      pause: rect('[data-testid="pause-toggle"]'),
      campaign: rect('[data-testid="campaign-menu-toggle"]'),
    };
  });
  const expectSamePosition = (
    before: Awaited<ReturnType<typeof readBounds>>,
    after: Awaited<ReturnType<typeof readBounds>>,
  ) => {
    for (const name of ['pause', 'campaign'] as const) {
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        expect(after[name][key], `${name}.${key}: ${before[name][key]} → ${after[name][key]}`).toBeCloseTo(before[name][key], 1);
      }
    }
  };
  const expectToolbarInsideFrame = async () => {
    const bounds = await readBounds();
    for (const name of ['pause', 'campaign'] as const) {
      expect(bounds[name].x).toBeGreaterThanOrEqual(bounds.frame.x);
      expect(bounds[name].y).toBeGreaterThanOrEqual(bounds.frame.y);
      expect(bounds[name].x + bounds[name].width).toBeLessThanOrEqual(bounds.frame.x + bounds.frame.width);
      expect(bounds[name].y + bounds[name].height).toBeLessThanOrEqual(bounds.frame.y + bounds.frame.height);
    }
    const overlapX = Math.min(
      bounds.pause.x + bounds.pause.width,
      bounds.campaign.x + bounds.campaign.width,
    ) - Math.max(bounds.pause.x, bounds.campaign.x);
    const overlapY = Math.min(
      bounds.pause.y + bounds.pause.height,
      bounds.campaign.y + bounds.campaign.height,
    ) - Math.max(bounds.pause.y, bounds.campaign.y);
    expect(overlapX <= 0 || overlapY <= 0).toBe(true);
  };
  const checkLocaleStability = async (pauseText: string, resumeText: string) => {
    await pause.scrollIntoViewIfNeeded();
    await expect(pause).toHaveText(pauseText);
    const playing = await readBounds();
    await pause.click();
    await expect(pause).toHaveText(resumeText);
    const paused = await readBounds();
    expectSamePosition(playing, paused);
    await pause.click();
    await expect(pause).toHaveText(pauseText);
    const resumed = await readBounds();
    expectSamePosition(playing, resumed);
    await expectToolbarInsideFrame();
  };

  await checkLocaleStability('Pause battle', 'Resume battle');
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await checkLocaleStability('暂停战斗', '继续战斗');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('game-toolbar').evaluate((toolbar: HTMLDetailsElement) => { toolbar.open = true; });
  await checkLocaleStability('暂停战斗', '继续战斗');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await checkLocaleStability('Pause battle', 'Resume battle');
});
