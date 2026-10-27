import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameView } from '../src/game';
import { drawGame, GAME_VIEWPORT, getMapViewport } from '../src/render/canvas-renderer';
import { mapCellToScreen } from '../src/render/map-viewport';

test('clips the map and keeps the enemy atlas frame and feet aligned with its route cell', () => {
  const mapImage = {} as HTMLImageElement;
  const bridgeImage = {} as HTMLImageElement;
  const enemyImage = {} as HTMLImageElement;
  const unitImage = {} as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  const clipRects: number[][] = [];
  let pendingRect: number[] | undefined;
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    rect(...args: number[]) { pendingRect = args; },
    clip() { if (pendingRect) clipRects.push(pendingRect); },
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
      streets: [{
        asset: 'bridge', source: { x: 0, y: 0, width: 48, height: 32 },
        x: 11.75, y: 9, width: 1.5, height: 1,
      }],
    },
    units: [{
      id: 'gunslinger-1', type: 'gunslinger', asset: 'unit',
      cell: { x: 8, y: 8 },
      selected: false,
      frame: { x: 0, y: 0, width: 32, height: 44 },
      render: { x: 8, y: 7.625, width: 1, height: 1.375 },
      hitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
    }],
    enemies: [{
      id: 'pioneer-1',
      type: 1,
      asset: 'pioneer_male',
      speed: 5,
      direction: 'south',
      positionFine: { x: (4 * 7680) + 3840, y: (6 * 7680) + 3840 },
      hitPoints: 18,
      maxHitPoints: 18,
      alive: true,
      deathRemainingMs: 0,
      hitFlashMs: 0,
      animationFrame: 2,
    }],
    shots: [],
    events: [],
  };

  drawGame(context, view, {
    ground: mapImage,
    bridge: bridgeImage,
    pioneer_male: enemyImage,
    unit: unitImage,
  });

  const viewport = getMapViewport(view);
  assert.deepEqual(clipRects, [
    [0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height],
    [viewport.origin.x, viewport.origin.y, viewport.mapWidth, viewport.mapHeight],
  ], 'all map objects are clipped to the fully visible map bounds');
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
  assert.deepEqual(
    drawCalls.map((args) => args[0]),
    [mapImage, enemyImage, bridgeImage, unitImage],
    'enemies render below bridge/road overlays, while player objects render above them',
  );

  const topRouteView = {
    ...view,
    enemies: [{
      ...view.enemies[0]!,
      positionFine: { x: (12 * 7680) + 3840, y: (2 * 7680) + 3840 },
    }],
  };
  const topRouteViewport = getMapViewport(topRouteView);
  assert.equal(topRouteViewport.origin.y, viewport.origin.y);
  assert.equal(
    topRouteViewport.origin.y + (topRouteView.enemies[0]!.positionFine.y / 240) * topRouteViewport.scaleFactor,
    viewport.origin.y + (2.5 * viewport.tileSize),
    'the camera stays fixed so the complete map remains visible',
  );

  const bottomRouteView = {
    ...view,
    enemies: [{
      ...view.enemies[0]!,
      positionFine: { x: (12 * 7680) + 3840, y: (13 * 7680) + 3840 },
    }],
  };
  const bottomRouteViewport = getMapViewport(bottomRouteView);
  assert.equal(bottomRouteViewport.origin.y, viewport.origin.y);
  const bottomEnemyFeet = bottomRouteViewport.origin.y
    + (bottomRouteView.enemies[0]!.positionFine.y / 240) * bottomRouteViewport.scaleFactor;
  assert.ok(bottomEnemyFeet < viewport.origin.y + viewport.mapHeight);
  assert.ok(bottomEnemyFeet - 24 * bottomRouteViewport.scaleFactor > viewport.origin.y);

  const fractionalEnemyView = {
    ...view,
    enemies: [{
      ...view.enemies[0]!,
      positionFine: {
        ...view.enemies[0]!.positionFine,
        y: view.enemies[0]!.positionFine.y + 123,
      },
    }],
  };
  for (const displayPixelScale of [0.668, 1, 1.3, 1.5, 2]) {
    const snappedViewport = getMapViewport(fractionalEnemyView, displayPixelScale);
    assert.ok(
      Math.abs(snappedViewport.origin.x * displayPixelScale - Math.round(snappedViewport.origin.x * displayPixelScale)) < 1e-9,
      `map x origin aligns to display pixels at scale ${displayPixelScale}`,
    );
    assert.ok(
      Math.abs(snappedViewport.origin.y * displayPixelScale - Math.round(snappedViewport.origin.y * displayPixelScale)) < 1e-9,
      `map y origin aligns to display pixels at scale ${displayPixelScale}`,
    );
  }
  const bottomAtFractionalScale = getMapViewport(bottomRouteView, 1.3);
  assert.ok(bottomAtFractionalScale.origin.x >= 0);
  assert.ok(bottomAtFractionalScale.origin.y >= 0);
  assert.ok(bottomAtFractionalScale.origin.x + bottomAtFractionalScale.mapWidth <= GAME_VIEWPORT.width);
  assert.ok(bottomAtFractionalScale.origin.y + bottomAtFractionalScale.mapHeight <= GAME_VIEWPORT.height);
  assert.ok(
    Math.abs(bottomAtFractionalScale.origin.y * 1.3 - Math.round(bottomAtFractionalScale.origin.y * 1.3)) < 1e-9,
    'the centered map stays aligned to the display-pixel grid',
  );

});
