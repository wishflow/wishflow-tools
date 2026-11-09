import type { Page } from '@playwright/test';
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
