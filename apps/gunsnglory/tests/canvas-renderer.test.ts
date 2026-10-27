import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameView } from '../src/game';
import { drawGame, getMapViewport } from '../src/render/canvas-renderer';
import { mapCellToScreen } from '../src/render/map-viewport';

test('clips the map and keeps the enemy atlas frame and feet aligned with its route cell', () => {
  const mapImage = {} as HTMLImageElement;
  const enemyImage = {} as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  let clipCount = 0;
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() { clipCount += 1; },
    drawImage(...args: unknown[]) { drawCalls.push(args); },
  } as unknown as CanvasRenderingContext2D;
  const view: GameView = {
    frame: 0,
    elapsedMs: 0,
    scenarioId: 'cow-gulch',
    map: {
      width: 17,
      height: 17,
      tileSize: 32,
      background: [{
        asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 },
        x: 0, y: 0, width: 1, height: 1,
      }],
      streets: [],
    },
    units: [],
    enemies: [{
      id: 'pioneer-1',
      type: 1,
      asset: 'pioneer_male',
      speed: 5,
      direction: 'south',
      positionFine: { x: 4 * 7680, y: 6 * 7680 },
      animationFrame: 2,
    }],
  };

  drawGame(context, view, { ground: mapImage, pioneer_male: enemyImage });

  const viewport = getMapViewport(view);
  const mapDraw = drawCalls.find((args) => args[0] === mapImage);
  assert.ok(mapDraw);
  assert.deepEqual(mapDraw.slice(5), [viewport.origin.x, viewport.origin.y, viewport.tileSize, viewport.tileSize]);
  const enemyDraw = drawCalls.find((args) => args[0] === enemyImage);
  assert.ok(enemyDraw);
  assert.deepEqual(enemyDraw.slice(1, 5), [32, 24, 16, 24]);

  const routeCellCenter = mapCellToScreen(viewport, 4.5, 6.5);
  const [, , , , , enemyLeft, enemyTop, enemyWidth, enemyHeight] = enemyDraw;
  assert.equal((enemyLeft as number) + (enemyWidth as number) / 2, routeCellCenter.x);
  assert.equal((enemyTop as number) + (enemyHeight as number), routeCellCenter.y);
  assert.equal(clipCount, 1);
});
