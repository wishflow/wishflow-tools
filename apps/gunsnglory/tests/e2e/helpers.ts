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
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  await page.touchscreen.tap(
    bounds.x + bounds.width * point.x / 1024,
    bounds.y + bounds.height * point.y / 576,
  );
}

export async function openSingleWaveSample(page: Page, input: 'click' | 'tap' = 'click'): Promise<void> {
  const button = page.getByTestId('open-single-wave-sample');
  if (input === 'tap') await button.tap();
  else await button.click();
}
