import { expect, type Page } from '@playwright/test';
import { calculateMapViewport } from '../../src/render/map-viewport';

const cowGulchViewport = calculateMapViewport(17, 17, 1024, 576, 32);

export function cowGulchMarkerPoint(cellX: number, cellY: number): { x: number; y: number } {
  return {
    x: cowGulchViewport.origin.x + (cellX + 0.5) * cowGulchViewport.tileSize,
    // Sleeping markers use a hit area shifted a quarter tile above their cell.
    y: cowGulchViewport.origin.y + (cellY + 0.25) * cowGulchViewport.tileSize,
  };
}

export async function clickCanvasPoint(page: Page, point: { x: number; y: number }): Promise<void> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  await page.mouse.click(
    bounds.x + bounds.width * point.x / 1024,
    bounds.y + bounds.height * point.y / 576,
  );
}

export async function tapCanvasPoint(page: Page, point: { x: number; y: number }): Promise<void> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  await page.touchscreen.tap(
    bounds.x + bounds.width * point.x / 1024,
    bounds.y + bounds.height * point.y / 576,
  );
}

export async function pauseFromHud(page: Page, input: 'click' | 'tap' = 'click'): Promise<void> {
  const point = { x: 314, y: 24 };
  if (input === 'tap') await tapCanvasPoint(page, point);
  else await clickCanvasPoint(page, point);
}

export async function continueFromPauseBoard(page: Page, input: 'click' | 'tap' = 'click'): Promise<void> {
  const button = page.getByTestId('pause-continue');
  if (input === 'tap') await button.tap();
  else await button.click();
}

export async function setSimulationSpeedFromLab(page: Page, value: number): Promise<void> {
  const pauseBoard = page.getByTestId('pause-board');
  if (!(await pauseBoard.isVisible())) await pauseFromHud(page);
  await expect(pauseBoard).toBeVisible();

  const speed = page.getByTestId('simulation-speed');
  await speed.scrollIntoViewIfNeeded();
  const minimum = Number(await speed.getAttribute('min'));
  const maximum = Number(await speed.getAttribute('max'));
  const step = Number(await speed.getAttribute('step'));
  if (!Number.isFinite(step) || value < minimum || value > maximum || Math.abs((value - minimum) / step - Math.round((value - minimum) / step)) > 1e-8) {
    throw new Error(`Simulation speed ${value} is outside the available steps`);
  }
  await speed.focus();
  await speed.press('Home');
  for (let index = 0; index < Math.round((value - minimum) / step); index += 1) {
    await speed.press('ArrowRight');
  }
  await expect(speed).toHaveValue(String(value));
  await expect(page.getByTestId('settings-status')).toContainText('saved');
  await expect(pauseBoard).toBeVisible();
}

export async function setPauseBoardSound(
  page: Page,
  enabled: boolean,
  options: { input?: 'click' | 'tap'; keepPaused?: boolean } = {},
): Promise<void> {
  const board = page.getByTestId('pause-board');
  if (!(await board.isVisible())) await pauseFromHud(page, options.input);
  const toggle = page.getByTestId('pause-sound-toggle');
  if (await toggle.getAttribute('aria-pressed') !== String(enabled)) {
    if (options.input === 'tap') await toggle.tap();
    else await toggle.click();
  }
  if (!options.keepPaused) await continueFromPauseBoard(page, options.input);
}

export async function leaveBattleFromPauseBoard(page: Page, input: 'click' | 'tap' = 'click'): Promise<void> {
  await pauseFromHud(page, input);
  const close = page.getByTestId('pause-close');
  if (input === 'tap') await close.tap();
  else await close.click();
  const confirm = page.getByTestId('confirm-pause-action');
  if (input === 'tap') await confirm.tap();
  else await confirm.click();
}

export async function openSingleWaveSample(page: Page, input: 'click' | 'tap' = 'click'): Promise<void> {
  const button = page.getByTestId('open-single-wave-sample');
  if (input === 'tap') await button.tap();
  else await button.click();
}

export async function expectInteractiveGameOverlay(
  page: Page,
  overlayId: string,
  panelTestId: string,
  actionSelector: string,
): Promise<void> {
  const host = page.getByTestId('overlay-host');
  const panel = page.getByTestId(panelTestId);
  const action = page.locator(actionSelector);
  const frame = page.locator('.game-frame');
  await frame.scrollIntoViewIfNeeded();
  const frameBounds = await frame.boundingBox();
  const panelBounds = await panel.boundingBox();
  expect(frameBounds).not.toBeNull();
  expect(panelBounds).not.toBeNull();
  await expect(host).toHaveAttribute('data-active-overlay', overlayId);
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-overlay-active', 'true');
  await expect(host.locator('[data-overlay-active="true"]')).toHaveCount(1);
  expect(await panel.evaluate((element) => element.closest('.game-frame') !== null)).toBe(true);
  expect(panelBounds!.x).toBeGreaterThanOrEqual(frameBounds!.x);
  expect(panelBounds!.y).toBeGreaterThanOrEqual(frameBounds!.y);
  expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(frameBounds!.x + frameBounds!.width + 1);
  expect(panelBounds!.y + panelBounds!.height).toBeLessThanOrEqual(frameBounds!.y + frameBounds!.height + 1);

  await expect(action).toBeVisible();
  const actionIsTopmost = await action.evaluate((button: HTMLButtonElement) => {
    const bounds = button.getBoundingClientRect();
    return document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
      ?.closest('button') === button;
  });
  expect(actionIsTopmost).toBe(true);

  const canvas = page.getByTestId('game-canvas');
  await canvas.evaluate((element: HTMLCanvasElement) => {
    if (element.dataset.overlayPointerProbe === 'installed') return;
    element.dataset.overlayPointerProbe = 'installed';
    element.dataset.overlayPointerCount = '0';
    element.addEventListener('pointerdown', () => {
      element.dataset.overlayPointerCount = String(Number(element.dataset.overlayPointerCount) + 1);
    });
  });
  const backdropPoint = { x: frameBounds!.x + 5, y: frameBounds!.y + 5 };
  const backdropHit = await page.evaluate(({ x, y }) => {
    const backdrop = document.querySelector('[data-testid="overlay-backdrop"]');
    const target = document.elementFromPoint(x, y);
    const frame = document.querySelector<HTMLElement>('.game-frame')?.getBoundingClientRect();
    return {
      isTopmost: target?.closest('[data-testid="overlay-backdrop"]') === backdrop,
      target: target ? `${target.tagName}.${target.className}#${target.id}` : 'none',
      frame: frame ? { x: frame.x, y: frame.y, width: frame.width, height: frame.height } : null,
      backdrop: backdrop instanceof HTMLElement ? {
        hidden: backdrop.hidden,
        bounds: (() => {
          const bounds = backdrop.getBoundingClientRect();
          return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
        })(),
      } : null,
    };
  }, backdropPoint);
  expect(backdropHit.isTopmost, JSON.stringify(backdropHit)).toBe(true);
  await page.mouse.click(backdropPoint.x, backdropPoint.y);
  await expect(canvas).toHaveAttribute('data-overlay-pointer-count', '0');
  await expect(host).toHaveAttribute('data-active-overlay', overlayId);
}
