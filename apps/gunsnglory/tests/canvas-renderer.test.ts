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
  const overlayText: string[] = [];
  const routeCommands: string[] = [];
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
    moveTo() { routeCommands.push('moveTo'); },
    lineTo() { routeCommands.push('lineTo'); },
    arc() {},
    stroke() {},
    fill() {},
    setLineDash() {},
    measureText(text: string) { return { width: text.length * 6 } as TextMetrics; },
    fillText(text: string) { overlayText.push(text); },
  } as unknown as CanvasRenderingContext2D;
  const view: GameView = {
    frame: 0,
    elapsedMs: 0,
    paused: false,
    scenarioId: 'cow-gulch',
    route: [{ x: -1.5, y: 10.5 }, { x: 4.5, y: 10.5 }, { x: 16.5, y: 3.5 }],
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
      movementSpeedFinePer100Ms: 1500,
      selected: false,
      moving: false,
      upgradeLevel: 0,
      positionFine: { x: (8 * 7680) + 3840, y: (8 * 7680) + 5760 },
      attackRange: {
        centerTenthTiles: { x: 85, y: 82 },
        maximumTenthTiles: 50,
        boundary: 'exclusive',
      },
      frame: { x: 0, y: 0, width: 32, height: 44 },
      render: { x: 8, y: 7.625, width: 1, height: 1.375 },
      hitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
      weapon: {
        damage: 10,
        damageType: 'light',
        rangeFine: 38400,
        reloadTimeMs: 500,
        projectileSpeed: 100,
        damageStyle: 0,
      },
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
    recruitPool: [],
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

  drawGame(context, view, {
    ground: mapImage,
    bridge: bridgeImage,
    pioneer_male: enemyImage,
    unit: unitImage,
  }, 1, undefined, true);
  assert.equal(routeCommands.filter((command) => command === 'lineTo').length, view.route!.length - 1);
  assert.ok(overlayText.includes('Unit gunslinger · R < 5.0'));
  assert.ok(overlayText.includes('Pioneer HP 18/18'));

});

test('draws the sleeping unit and its elapsed-time Zzz atlas frame above the unit', () => {
  const mapImage = {} as HTMLImageElement;
  const sleepingImage = {} as HTMLImageElement;
  const effectImage = {} as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    drawImage(...args: unknown[]) { drawCalls.push(args); },
  } as unknown as CanvasRenderingContext2D;
  const view: GameView = {
    frame: 4,
    elapsedMs: 400,
    paused: false,
    scenarioId: 'cow-gulch',
    map: {
      width: 1,
      height: 1,
      tileSize: 32,
      background: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 0, y: 0, width: 1, height: 1 }],
      streets: [],
    },
    units: [{
      id: 'gunslinger-hire-01',
      type: 'gunslinger',
      activity: 4,
      cell: { x: 0, y: 0 },
      movementSpeedFinePer100Ms: 1500,
      asset: 'player_gunslinger_sleep',
      frame: { x: 0, y: 0, width: 32, height: 32 },
      render: { x: 0, y: -0.25, width: 1, height: 1 },
      hitArea: { x: 0, y: -0.25, width: 1, height: 1 },
      selected: false,
      moving: false,
      positionFine: { x: 3840, y: 5760 },
      sleepingAnimationFrame: 2,
      upgradeLevel: 0,
    }],
    enemies: [],
    shots: [],
    recruitPool: [],
    events: [],
  };

  drawGame(context, view, {
    ground: mapImage,
    player_gunslinger_sleep: sleepingImage,
    sfx_sleeping: effectImage,
  });

  assert.deepEqual(drawCalls.map(([image]) => image), [mapImage, sleepingImage, effectImage]);
  assert.deepEqual(drawCalls[1]?.slice(1, 5), [0, 0, 32, 32]);
  const viewport = getMapViewport(view);
  const effectCall = drawCalls[2]!;
  assert.deepEqual(effectCall.slice(1, 5), [48, 0, 24, 16], 'uses the third 24×16 sleeping animation frame');
  const [, , , , , effectX, effectY, effectWidth, effectHeight] = effectCall;
  const feetX = viewport.origin.x + (view.units[0]!.positionFine.x / 240) * viewport.scaleFactor;
  const feetY = viewport.origin.y + (view.units[0]!.positionFine.y / 240) * viewport.scaleFactor;
  assert.equal((effectX as number) + (effectWidth as number) / 2, feetX);
  assert.equal((effectY as number) + (effectHeight as number), feetY - 32 * viewport.scaleFactor);
});

test('draws original firing, Mexican dynamite, and explosion atlas frames', () => {
  const ground = {} as HTMLImageElement;
  const gunslinger = {} as HTMLImageElement;
  const dynamite = {} as HTMLImageElement;
  const explosion = {} as HTMLImageElement;
  const gunslingerShot = {} as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  const transforms: unknown[][] = [];
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    drawImage(...args: unknown[]) { drawCalls.push(args); },
    translate(...args: number[]) { transforms.push(['translate', ...args]); },
    scale(...args: number[]) { transforms.push(['scale', ...args]); },
    arc() {},
    fill() {},
    stroke() {},
  } as unknown as CanvasRenderingContext2D;
  const view: GameView = {
    frame: 1,
    elapsedMs: 100,
    paused: false,
    scenarioId: 'cow-gulch',
    map: {
      width: 1,
      height: 1,
      tileSize: 32,
      background: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 0, y: 0, width: 1, height: 1 }],
      streets: [],
    },
    units: [{
      id: 'gunslinger-1',
      type: 'gunslinger',
      asset: 'player_gunslinger',
      cell: { x: 0, y: 0 },
      movementSpeedFinePer100Ms: 1500,
      frame: { x: 0, y: 0, width: 32, height: 44 },
      render: { x: 0, y: -0.375, width: 1, height: 1.375 },
      hitArea: { x: 0, y: -0.375, width: 1, height: 1.375 },
      selected: false,
      moving: false,
      positionFine: { x: 3840, y: 5760 },
      upgradeLevel: 0,
      shootingAnimation: { asset: 'player_gunslinger_shot', frame: 1, row: 2, mirrored: true },
    }],
    enemies: [],
    shots: [
      {
        id: 'flight', shooterId: 'mexican-1', targetId: 'enemy-1',
        positionFine: { x: 3840, y: 3840 }, remainingMs: 100,
        damageStyle: 3, imageAsset: 'sfx_mexican_dynamite', animationFrame: 2,
      },
      {
        id: 'impact', shooterId: 'mexican-1', targetId: 'enemy-2',
        positionFine: { x: 3840, y: 3840 }, remainingMs: 599,
        damageStyle: 3, imageAsset: 'sfx_mexican_dynamite', animationFrame: 1,
        explosionRemainingMs: 599,
      },
    ],
    recruitPool: [],
    events: [],
  };

  drawGame(context, view, {
    ground,
    player_gunslinger: gunslinger,
    sfx_mexican_dynamite: dynamite,
    sfx_explosion: explosion,
    player_gunslinger_shot: gunslingerShot,
  });

  const dynamiteDraw = drawCalls.find(([image]) => image === dynamite);
  assert.ok(dynamiteDraw);
  assert.deepEqual(dynamiteDraw.slice(1, 5), [32, 0, 16, 16]);
  const explosionDraw = drawCalls.find(([image]) => image === explosion);
  assert.ok(explosionDraw);
  assert.deepEqual(explosionDraw.slice(1, 5), [48, 0, 48, 52]);
  const firingDraw = drawCalls.find(([image]) => image === gunslingerShot);
  assert.ok(firingDraw);
  assert.deepEqual(firingDraw.slice(1, 5), [32, 88, 32, 44]);
  assert.deepEqual(transforms.map(([name]) => name), ['translate', 'scale']);
  assert.deepEqual(transforms[1], ['scale', -1, 1]);
});
