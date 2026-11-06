import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameView } from '../src/game';
import { drawGame, getMapViewport } from '../src/render/canvas-renderer';

test('draws the steam atlas frame after the locomotive at its fine-coordinate center', () => {
  const ground = { naturalWidth: 32, naturalHeight: 32 } as HTMLImageElement;
  const locomotive = { naturalWidth: 48, naturalHeight: 72 } as HTMLImageElement;
  const steam = { naturalWidth: 120, naturalHeight: 24 } as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  const context = new Proxy({
    drawImage(...args: unknown[]) { drawCalls.push(args); },
  }, {
    get(target, property) {
      if (property in target) return target[property as keyof typeof target];
      return () => undefined;
    },
  }) as unknown as CanvasRenderingContext2D;
  const view: GameView = {
    frame: 4,
    elapsedMs: 400,
    paused: false,
    scenarioId: 'tech-town-train-sample',
    map: {
      width: 17,
      height: 17,
      tileSize: 32,
      background: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 0, y: 0, width: 1, height: 1 }],
      streets: [],
    },
    units: [{
      id: 'tech-town-train-10-4',
      type: 'train-10',
      activity: 5,
      movementGroupId: 'tech-town-train',
      movementAxis: 'horizontal',
      steamEmitter: true,
      selectionSound: 'sound_train',
      cell: { x: 8, y: 8 },
      movementSpeedFinePer100Ms: 3000,
      asset: 'lok_hori_1of2',
      frame: { x: 0, y: 0, width: 48, height: 72 },
      render: { x: 8, y: 7.5, width: 1, height: 1.5 },
      hitArea: { x: 8, y: 7.5, width: 1, height: 1.5 },
      selected: false,
      moving: false,
      positionFine: { x: 8 * 7680 + 3840, y: 8 * 7680 + 5760 },
      upgradeLevel: 0,
      steamClouds: [{
        id: 'tech-town-train-10-4-steam-1',
        positionFine: { x: 8 * 7680 + 3840 + 103, y: 8 * 7680 + 5760 - 7584 },
        remainingMs: 899,
        animationFrame: 2,
      }],
    }],
    enemies: [],
    shots: [],
    drawOrder: ['unit:tech-town-train-10-4'],
    recruitPool: [],
    events: [],
  };
  const viewport = getMapViewport(view);

  drawGame(context, view, { ground, lok_hori_1of2: locomotive, sfx_lok_steam: steam });

  assert.deepEqual(drawCalls.map(([image]) => image), [ground, locomotive, steam]);
  assert.deepEqual(drawCalls[2]!.slice(1, 5), [48, 0, 24, 24]);
  const cloudCenterX = viewport.origin.x + (view.units[0]!.steamClouds![0]!.positionFine.x / 7680) * viewport.tileSize;
  const cloudCenterY = viewport.origin.y + (view.units[0]!.steamClouds![0]!.positionFine.y / 7680) * viewport.tileSize;
  assert.deepEqual(drawCalls[2]!.slice(5), [
    Math.trunc(cloudCenterX - 12 * viewport.scaleFactor),
    Math.trunc(cloudCenterY - 12 * viewport.scaleFactor),
    Math.trunc(24 * viewport.scaleFactor),
    Math.trunc(24 * viewport.scaleFactor),
  ]);
});
