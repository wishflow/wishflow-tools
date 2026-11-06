import { expect, test, type Page } from '@playwright/test';
import { calculateMapViewport } from '../../src/render/map-viewport';

const mapViewport = calculateMapViewport(32, 24, 1024, 576);

async function canvasPoint(page: Page, mapX: number, mapY: number): Promise<{ x: number; y: number }> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  const logicalX = mapViewport.origin.x + mapX * mapViewport.tileSize;
  const logicalY = mapViewport.origin.y + mapY * mapViewport.tileSize;
  return { x: bounds.x + logicalX / 1024 * bounds.width, y: bounds.y + logicalY / 576 * bounds.height };
}

async function trainPositions(page: Page): Promise<Array<{ x: number; y: number }>> {
  const text = await page.getByTestId('inspection-units').innerText();
  return [...text.matchAll(/tech-town-train-\d+-\d+ at \((-?\d+\.\d+), (-?\d+\.\d+)\)/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
}

test('Tech Town train test sample renders on its track, moves as a row, and stops on release', async ({ page }) => {
  await page.goto('/?testBattle=1');
  await expect(page.getByTestId('open-tech-town-train-sample')).toBeVisible();
  await page.getByTestId('open-tech-town-train-sample').click();
  await expect(page.getByTestId('scene-open-error')).toBeHidden();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(page.getByTestId('wave-status')).toHaveText('');
  await expect(page.getByTestId('start-wave')).toBeHidden();
  await expect(page.getByTestId('game-canvas')).toHaveAttribute('aria-label', 'Tech Town train test map');
  await page.getByTestId('inspection-panel').locator('summary').click();

  const initial = await trainPositions(page);
  expect(initial).toHaveLength(5);
  for (let index = 1; index < initial.length; index += 1) {
    expect(initial[index]!.x - initial[index - 1]!.x).toBeCloseTo(1, 2);
    expect(initial[index]!.y).toBeCloseTo(initial[0]!.y, 2);
  }

  const start = await canvasPoint(page, 4.5, 12.5);
  const target = await canvasPoint(page, 7.5, 12.5);
  const greetingRequest = page.waitForRequest((request) => request.url().endsWith('/assets/sounds/sound_train.ogg'));
  await page.mouse.click(start.x, start.y);
  await greetingRequest;
  await expect(page.getByTestId('selection-status')).toContainText('Train locomotive');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 5 });
  await page.waitForTimeout(700);

  const moving = await trainPositions(page);
  expect(moving).toHaveLength(5);
  expect(moving[0]!.x).toBeGreaterThan(initial[0]!.x + 0.5);
  for (let index = 1; index < moving.length; index += 1) {
    expect(moving[index]!.x - moving[index - 1]!.x).toBeCloseTo(1, 2);
    expect(moving[index]!.y).toBeCloseTo(moving[0]!.y, 2);
  }

  await page.mouse.up();
  await page.waitForTimeout(250);
  const stopped = await trainPositions(page);
  expect(stopped.map(({ x }) => x)).toEqual(moving.map(({ x }) => x));
});
