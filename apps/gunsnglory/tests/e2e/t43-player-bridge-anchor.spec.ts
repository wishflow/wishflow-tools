import { expect, test } from './auto-continue-fixtures';
import {
  continueFromPauseBoard,
  leaveBattleFromPauseBoard,
  pauseFromHud,
  setSimulationSpeedFromLab,
} from './helpers';
import { calculateMapViewport } from '../../src/render/map-viewport';
import { fitAspectViewport } from '../../src/render/viewport';

function mapPoint(
  mapWidth: number,
  mapHeight: number,
  bounds: { x: number; y: number; width: number; height: number },
  devicePixelRatio: number,
  cellX: number,
  cellY: number,
) {
  const displayPixelScale = (bounds.width / 1024) * Math.max(1, devicePixelRatio);
  const viewport = calculateMapViewport(mapWidth, mapHeight, 1024, 576, 32, displayPixelScale);
  const logicalViewport = fitAspectViewport(bounds.width, bounds.height, 1024, 576);
  return {
    x: bounds.x + logicalViewport.x + (viewport.origin.x + cellX * viewport.tileSize) * logicalViewport.scale,
    y: bounds.y + logicalViewport.y + (viewport.origin.y + cellY * viewport.tileSize) * logicalViewport.scale,
  };
}

test('moves the Cow Gulch gunslinger onto its raw80 bridge through canvas input', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1');
  await pauseFromHud(page);
  await setSimulationSpeedFromLab(page, 1);
  await page.getByTestId('inspection-panel').locator('summary').click();
  await page.getByTestId('inspection-overlay').check();

  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  const devicePixelRatio = await page.evaluate(() => window.devicePixelRatio);
  const start = mapPoint(17, 17, bounds, devicePixelRatio, 8.5, 8.25);
  await continueFromPauseBoard(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected');

  const targets = [
    { x: 9.5, y: 8.75 },
    { x: 9.5, y: 9.75 },
    { x: 12.5, y: 9.75 },
  ];
  const units = page.getByTestId('inspection-units');
  const readPosition = async () => {
    const text = await units.textContent();
    const match = text?.match(/gunslinger-1 at \((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
    return match ? { x: Number(match[1]), y: Number(match[2]) } : undefined;
  };

  for (const target of targets) {
    const point = mapPoint(17, 17, bounds, devicePixelRatio, target.x, target.y);
    await page.mouse.move(point.x, point.y, { steps: 4 });
    await expect.poll(async () => {
      const position = await readPosition();
      return position && Math.hypot(position.x - target.x, position.y - target.y) <= 0.35;
    }, { timeout: 3_000 }).toBeTruthy();
  }

  await page.mouse.up();
  const position = await readPosition();
  await pauseFromHud(page);
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
  expect(position).toBeDefined();
  expect(position!.x).toBeGreaterThanOrEqual(12);
  expect(position!.x).toBeLessThan(13);
  expect(position!.y).toBeGreaterThanOrEqual(9);
  expect(position!.y).toBeLessThan(10);
  await expect(page.getByTestId('profile-status')).toContainText('no official Cow Gulch level 1 result yet');
});

test('stops the Cow Gulch gunslinger at the raw36 cliff from the raw16 corridor', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1');
  await pauseFromHud(page);
  await setSimulationSpeedFromLab(page, 1);
  await page.getByTestId('inspection-panel').locator('summary').click();
  await page.getByTestId('inspection-overlay').check();

  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  const devicePixelRatio = await page.evaluate(() => window.devicePixelRatio);
  const start = mapPoint(17, 17, bounds, devicePixelRatio, 8.5, 8.25);
  const target = mapPoint(17, 17, bounds, devicePixelRatio, 8.5, 12.5);
  await continueFromPauseBoard(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected');
  await page.mouse.move(target.x, target.y, { steps: 12 });

  const units = page.getByTestId('inspection-units');
  const readPosition = async () => {
    const text = await units.textContent();
    const match = text?.match(/gunslinger-1 at \((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
    return match ? { x: Number(match[1]), y: Number(match[2]) } : undefined;
  };
  await expect.poll(async () => {
    const position = await readPosition();
    return position && position.y >= 12 && position.y <= 12.15;
  }, { timeout: 3_000 }).toBeTruthy();

  await page.mouse.up();
  const position = await readPosition();
  await canvas.screenshot({ path: '/tmp/gng-m2-d2-cow-gulch-wall.png' });
  await pauseFromHud(page);
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
  expect(position).toBeDefined();
  expect(position!.x).toBeGreaterThanOrEqual(8.4);
  expect(position!.x).toBeLessThanOrEqual(8.6);
  const collisionBottom = position!.y - 0.1;
  expect(collisionBottom).toBeLessThanOrEqual(12,
    'the APK player collision box must remain on the raw16 side of raw36 wall (8,12)');
  expect(collisionBottom).toBeGreaterThan(11.8,
    'the player approaches the wall boundary instead of stopping at an unrelated obstruction');
  await expect(page.getByTestId('profile-status')).toContainText('no official Cow Gulch level 1 result yet');
});

test('moves the Steam Valley gunslinger onto the raw88 vertical bridge through canvas input', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1');
  await leaveBattleFromPauseBoard(page);
  await expect(page.getByTestId('menu-free-play')).toBeVisible();
  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await page.getByTestId('campaign-level-12').click();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-easy').click();
  await expect(page.locator('#scene-title')).toHaveText('Steam Valley · Level 12');
  await expect(page.getByTestId('campaign-wave-intro')).toBeHidden();

  await pauseFromHud(page);
  await setSimulationSpeedFromLab(page, 1);
  await page.getByTestId('inspection-panel').locator('summary').click();
  await page.getByTestId('inspection-overlay').check();

  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  const devicePixelRatio = await page.evaluate(() => window.devicePixelRatio);
  const start = mapPoint(32, 24, bounds, devicePixelRatio, 11.5, 11.25);
  // Aim at the upper bridge row's interior; arrival tolerance makes edge targets ambiguous.
  const target = mapPoint(32, 24, bounds, devicePixelRatio, 11.5, 8.5);
  await continueFromPauseBoard(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected');
  await page.mouse.move(target.x, target.y, { steps: 10 });

  const units = page.getByTestId('inspection-units');
  const readPosition = async () => {
    const text = await units.textContent();
    const match = text?.match(/gunslinger-1 at \((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
    return match ? { x: Number(match[1]), y: Number(match[2]) } : undefined;
  };
  await expect.poll(async () => {
    const position = await readPosition();
    return position && Math.floor(position.x) === 11 && Math.floor(position.y) === 8;
  }, { timeout: 3_000 }).toBeTruthy();

  await page.mouse.up();
  const position = await readPosition();
  await canvas.screenshot({ path: '/tmp/gng-m2-d2-steam-valley-raw88.png' });
  await pauseFromHud(page);
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
  expect(position).toBeDefined();
  expect(position!.x).toBeGreaterThanOrEqual(11);
  expect(position!.x).toBeLessThan(12);
  expect(position!.y).toBeGreaterThanOrEqual(8);
  expect(position!.y).toBeLessThan(9);
  await expect(page.getByTestId('profile-status')).toContainText('no official Cow Gulch level 1 result yet');
});
