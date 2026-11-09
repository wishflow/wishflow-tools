import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { continueFromPauseBoard, openSingleWaveSample, pauseFromHud, tapCanvasPoint } from './helpers';

async function setFourTimesSpeed(page: import('@playwright/test').Page): Promise<void> {
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
}

async function startLongWave(page: import('@playwright/test').Page, input: 'click' | 'tap' = 'click'): Promise<void> {
  await page.goto('/?testBattle=1');
  await setFourTimesSpeed(page);
  await openSingleWaveSample(page, input);
  const upgradeSample = page.getByRole('button', { name: 'Open upgrade rules sample' });
  if (input === 'tap') await upgradeSample.tap();
  else await upgradeSample.click();
  const startWave = page.getByRole('button', { name: 'Start one pioneer sample' });
  if (input === 'tap') await startWave.tap();
  else await startWave.click();
  await expect(page.getByTestId('wave-status')).toContainText('Enemies 1');
}

async function readCanvasHash(page: import('@playwright/test').Page): Promise<number> {
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

test('HUD pause opens the APK pause board; only Continue resumes the battle', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startLongWave(page);

  await pauseFromHud(page);
  const board = page.getByTestId('pause-board');
  await expect(board).toBeVisible();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
  await expect(page.locator('.game-frame')).toHaveAttribute('data-active-overlay', 'pause-board');
  await expect(board.getByTestId('pause-continue')).toBeVisible();
  await expect(board.getByTestId('pause-restart')).toBeVisible();
  await expect(board.getByTestId('pause-options')).toBeVisible();
  await expect(board.getByTestId('pause-close')).toBeVisible();
  await expect(page.getByTestId('pause-toggle')).toHaveCount(0);
  await expect(page.getByTestId('campaign-menu-toggle')).toHaveCount(0);

  const frozenCanvas = await readCanvasHash(page);
  await page.waitForTimeout(250);
  expect(await readCanvasHash(page)).toBe(frozenCanvas);
  await continueFromPauseBoard(page);
  await expect(board).toBeHidden();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'running');
  await expect.poll(() => readCanvasHash(page)).not.toBe(frozenCanvas);
});

test('a manual pause board remains paused across a background round trip', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startLongWave(page);
  await pauseFromHud(page);
  const frozenCanvas = await readCanvasHash(page);

  await setDocumentHidden(page, true);
  await setDocumentHidden(page, false);
  await expect(page.getByTestId('pause-board')).toBeVisible();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
  await page.waitForTimeout(250);
  expect(await readCanvasHash(page)).toBe(frozenCanvas);
});

test('restart and close confirmations return to the pause board when cancelled', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startLongWave(page);
  await pauseFromHud(page);
  const board = page.getByTestId('pause-board');
  const confirmation = page.getByTestId('pause-confirmation');

  await page.getByTestId('pause-restart').click();
  await expect(confirmation).toBeVisible();
  await expect(board).toBeVisible();
  await expect(board).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.game-frame')).toHaveAttribute('data-active-overlay', 'pause-confirmation');
  await expect(page.locator('[data-overlay-active="true"]')).toHaveCount(1);
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
  await page.getByTestId('cancel-pause-action').click();
  await expect(board).toBeVisible();
  await expect(confirmation).toBeHidden();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-active-overlay', 'pause-board');
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');

  await page.getByTestId('pause-close').click();
  await expect(confirmation).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(board).toBeVisible();
  await expect(confirmation).toBeHidden();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
});

test('confirming restart reopens the same scenario and resets its wave', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startLongWave(page);
  const scenarioTitle = await page.locator('#scene-title').textContent();
  const difficulty = await page.getByTestId('scene-difficulty').textContent();
  await pauseFromHud(page);
  await page.getByTestId('pause-restart').click();
  await page.getByTestId('confirm-pause-action').click();

  await expect(page.getByTestId('pause-board')).toBeHidden();
  await expect(page.locator('#scene-title')).toHaveText(scenarioTitle ?? '');
  await expect(page.getByTestId('scene-difficulty')).toHaveText(difficulty ?? '');
  await expect(page.getByTestId('wave-status')).toContainText('ready');
  await expect(page.getByTestId('settlement')).toBeHidden();
});

test('confirming close returns to the campaign menu without unlocking the next level', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1');
  await pauseFromHud(page);
  await page.getByTestId('pause-close').click();
  await page.getByTestId('confirm-pause-action').click();
  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  await expect(page.getByTestId('overlay-host')).toBeHidden();
  await expect(page.getByTestId('settlement')).toBeHidden();
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-02')).toBeDisabled();
});

test('pause-board Options return to the still-paused battle', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startLongWave(page);
  await pauseFromHud(page);
  await page.getByTestId('pause-options').click();
  const optionsPanel = page.getByTestId('game-options');
  await expect(optionsPanel).toBeVisible();
  await expect(page.getByTestId('pause-board')).toBeVisible();
  await expect(page.getByTestId('pause-board')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByTestId('campaign-menu-screen')).toBeHidden();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
  await optionsPanel.getByTestId('campaign-menu-back').click();
  await expect(optionsPanel).toBeHidden();
  await expect(page.getByTestId('pause-board')).toBeVisible();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
  await continueFromPauseBoard(page);
  await expect(page.getByTestId('pause-board')).toBeHidden();
});

test('pause-board Sound switches the saved setting and its original icon', async ({ page }) => {
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.resolve(); });
  await page.goto('/?testBattle=1');
  await pauseFromHud(page);
  const sound = page.getByTestId('pause-sound-toggle');
  const icon = page.getByTestId('pause-sound-icon');
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await expect(icon).toHaveAttribute('src', /gng_startmenu_2_menu_2_sound_off\.png/);
  await expect(page.getByTestId('settings-status')).toHaveText('Settings saved.');
  await continueFromPauseBoard(page);
  await expect(page.getByTestId('sound-toggle')).toHaveCount(0);
});

test('touching the original HUD pause icon opens the same pause board', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  try {
    await startLongWave(page, 'tap');
    await tapCanvasPoint(page, { x: 314, y: 24 });
    await expect(page.getByTestId('pause-board')).toBeVisible();
    await continueFromPauseBoard(page, 'tap');
    await expect(page.getByTestId('pause-board')).toBeHidden();
    await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'running');
  } finally {
    await context.close();
  }
});

test('pause board labels fit their fixed wood-button slots in both languages', async ({ page }) => {
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.resolve(); });
  await page.goto('/?testBattle=1');
  const intro = page.getByTestId('campaign-wave-intro');
  if (await intro.isVisible()) await intro.getByRole('button', { name: 'Continue' }).click();
  await pauseFromHud(page);
  const board = page.getByTestId('pause-board');
  await expect(board).toBeVisible();

  const layout = () => board.evaluate((element) => {
    const boardBounds = element.getBoundingClientRect();
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('.pause-board-actions button')];
    return buttons.map((button) => {
      const bounds = button.getBoundingClientRect();
      return {
        left: bounds.left - boardBounds.left,
        top: bounds.top - boardBounds.top,
        width: bounds.width,
        height: bounds.height,
        scrollWidth: button.scrollWidth,
        clientWidth: button.clientWidth,
      };
    });
  });
  const english = await layout();
  expect(english).toHaveLength(4);
  expect(english.every((button) => button.scrollWidth <= button.clientWidth + 1)).toBe(true);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  const chinese = await layout();
  expect(chinese).toHaveLength(4);
  expect(chinese.every((button) => button.scrollWidth <= button.clientWidth + 1)).toBe(true);
  for (const button of chinese) {
    expect(button.left).toBeGreaterThanOrEqual(0);
    expect(button.top).toBeGreaterThanOrEqual(0);
    expect(button.left + button.width).toBeLessThanOrEqual(await board.evaluate((element) => element.clientWidth + 1));
    expect(button.top + button.height).toBeLessThanOrEqual(await board.evaluate((element) => element.clientHeight + 1));
  }
});
