import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameView } from '../src/game';
import { drawGame, getMapViewport, GAME_VIEWPORT } from '../src/render/canvas-renderer';
import type { GameImages } from '../src/render/canvas-renderer';

test('draws the APK directional spawn arrows at one tile per active entrance', () => {
  const arrowAssets = {
    east: {} as HTMLImageElement,
    west: {} as HTMLImageElement,
    south: {} as HTMLImageElement,
    north: {} as HTMLImageElement,
  };
  const assetNames = new Map([
    [arrowAssets.east, 'gng_wave_arrow_d'],
    [arrowAssets.west, 'gng_wave_arrow_b'],
    [arrowAssets.south, 'gng_wave_arrow_a'],
    [arrowAssets.north, 'gng_wave_arrow_c'],
  ]);
  const bossHat = {} as HTMLImageElement;
  const defaultImage = { width: 128, height: 128, naturalWidth: 128, naturalHeight: 128 } as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  let clipCalls = 0;
  const context = new Proxy({}, {
    get(_target, property) {
      if (property === 'drawImage') return (...args: unknown[]) => drawCalls.push(args);
      if (property === 'measureText') return (text: string) => ({ width: text.length * 8 });
      if (property === 'globalAlpha') return 1;
      if (property === 'clip') return () => { clipCalls += 1; };
      return () => undefined;
    },
    set() { return true; },
  }) as CanvasRenderingContext2D;
  const images = new Proxy({
    gng_wave_arrow_a: arrowAssets.south,
    gng_wave_arrow_b: arrowAssets.west,
    gng_wave_arrow_c: arrowAssets.north,
    gng_wave_arrow_d: arrowAssets.east,
    boss_hat: bossHat,
  }, {
    get(target, property: string) { return target[property as keyof typeof target] ?? defaultImage; },
  }) as GameImages;
  const view: GameView = {
    frame: 0,
    elapsedMs: 0,
    paused: false,
    scenarioId: 'spawn-indicator-render-fixture',
    map: { width: 32, height: 17, tileSize: 32, background: [], streets: [] },
    units: [],
    enemies: [],
    shots: [],
    drawOrder: [],
    recruitPool: [],
    events: [],
    wave: {
      number: 1,
      phase: 'active',
      lives: 50,
      maxLives: 50,
      escapedEnemies: 0,
      defeatedEnemies: 0,
      cash: 65,
      activeEnemies: 0,
      spawnIndicators: [
        { spawnPointId: 0, cell: { x: 0, y: 10 }, direction: 'east', boss: false },
        { spawnPointId: 1, cell: { x: 31, y: 5 }, direction: 'west', boss: false },
        { spawnPointId: 2, cell: { x: 7, y: 0 }, direction: 'south', boss: true },
        { spawnPointId: 3, cell: { x: 7, y: 16 }, direction: 'north', boss: false },
      ],
    },
  };

  drawGame(context, view, images);

  const arrowCalls = drawCalls.filter(([image]) => assetNames.has(image as HTMLImageElement));
  assert.equal(arrowCalls.length, 4);
  assert.deepEqual(arrowCalls.map(([image]) => assetNames.get(image as HTMLImageElement)), [
    'gng_wave_arrow_d', 'gng_wave_arrow_b', 'gng_wave_arrow_a', 'gng_wave_arrow_c',
  ]);
  const viewport = getMapViewport(view);
  for (const [image, x, y, width, height] of arrowCalls) {
    assert.ok(assetNames.has(image as HTMLImageElement));
    assert.equal(width, viewport.tileSize);
    assert.equal(height, viewport.tileSize);
    assert.ok((x as number) < GAME_VIEWPORT.width && (x as number) + (width as number) > 0);
    assert.ok((y as number) < GAME_VIEWPORT.height && (y as number) + (height as number) > 0);
  }
  assert.ok(clipCalls > 0, 'the outer game viewport clips arrows that straddle the canvas edge');
  const bossHatCalls = drawCalls.filter(([image]) => image === bossHat);
  assert.equal(bossHatCalls.length, 1, 'only the boss entrance gets a hat overlay');
  assert.deepEqual(bossHatCalls[0]?.slice(1), [arrowCalls[2]?.[1], (arrowCalls[2]?.[2] as number) + viewport.tileSize,
    viewport.tileSize, viewport.tileSize]);
});
