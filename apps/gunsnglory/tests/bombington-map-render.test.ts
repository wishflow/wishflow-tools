import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/nevada-02.json';
import { createBombingtonMapScene } from '../src/content/bombington-scene';
import { bombingtonRouteDefinitions } from '../src/content/bombington-routes';
import { createGame, type Direction, type GameView, type PreviewWaveDefinition, type ScenarioContent } from '../src/game';
import { createDakotaBackgroundCollisionCodes } from '../src/content/dakota-background-collision';
import { drawGame, getMapViewport, type GameImages } from '../src/render/canvas-renderer';
import { gameAssetSourceScale } from '../src/render/game-asset-path';
import { deriveOriginalBackgroundCodesForTest, deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';
import routeGraphData from './fixtures/bombington-route-graph.json';

interface FixtureEdge {
  from: { tile: number; x: number; y: number };
  direction: Direction;
  to: { tile: number; x: number; y: number };
  steps: number;
}
interface RouteGraphFixture {
  summary: { intermediateVisitsByRawTile: Record<string, number> };
  spawns: readonly { cell: readonly [number, number]; direction: Direction }[];
  exits: readonly (readonly [number, number])[];
  edges: readonly FixtureEdge[];
}

const routeGraph = routeGraphData as unknown as RouteGraphFixture;
const directionVectors: Readonly<Record<Direction, readonly [number, number]>> = {
  north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0],
};

function createMapScenario(): ScenarioContent {
  const spawns = routeGraph.spawns.map(({ cell, direction }) => ({
    cell: { x: cell[0], y: cell[1] }, direction,
  }));
  const exits = routeGraph.exits.map(([x, y]) => ({ x, y }));
  const firstRoute = bombingtonRouteDefinitions[0]!;
  const previewWave: PreviewWaveDefinition = {
    number: 1,
    initialLives: 25,
    initialCash: 250,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 100, medium: 100, hard: 100 },
    spawn: spawns[0]!,
    additionalSpawns: spawns.slice(1),
    routes: bombingtonRouteDefinitions,
    enemy: { hitPoints: 1, cashReward: 0, penetration: { light: 0, fire: 0, heavy: 0, poison: 0 } },
    baseEnemySpeed: 500,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
    escapePenalty: 1,
    redirects: firstRoute.redirects,
    exit: firstRoute.exit,
    additionalExits: exits.filter(({ x, y }) => x !== firstRoute.exit.x || y !== firstRoute.exit.y),
  };
  return {
    id: 'bombington-map-render-test',
    formalSettlementSupported: true,
    title: { en: 'Bombington render test', zh: '炸弹镇渲染测试' },
    map: createBombingtonMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [],
    previewWave,
  };
}

function recordProductionFrame(view: GameView) {
  const assetByImage = new WeakMap<object, string>();
  const imageByAsset = new Map<string, HTMLImageElement>();
  const images = new Proxy({} as GameImages, {
    get(_target, key) {
      if (typeof key !== 'string') return undefined;
      let image = imageByAsset.get(key);
      if (!image) {
        image = { naturalWidth: 2_048, naturalHeight: 2_048 } as HTMLImageElement;
        imageByAsset.set(key, image);
        assetByImage.set(image, key);
      }
      return image;
    },
  });
  const drawCalls: { asset: string; args: unknown[] }[] = [];
  const clipRects: number[][] = [];
  const routePaths: number[][][] = [];
  const stored = new Map<PropertyKey, unknown>();
  let pendingRect: number[] | undefined;
  let activeRoutePath: number[][] | undefined;
  const context = new Proxy({} as CanvasRenderingContext2D, {
    get(_target, key) {
      if (key === 'canvas') return { width: 1_024, height: 576 };
      if (key === 'globalAlpha') return stored.get(key) ?? 1;
      if (key === 'drawImage') return (image: object, ...args: unknown[]) => {
        drawCalls.push({ asset: assetByImage.get(image) ?? '<unknown>', args });
      };
      if (key === 'rect') return (...rect: number[]) => { pendingRect = rect; };
      if (key === 'clip') return () => {
        if (pendingRect) clipRects.push(pendingRect);
        pendingRect = undefined;
      };
      if (key === 'moveTo') return (x: number, y: number) => { activeRoutePath = [[x, y]]; };
      if (key === 'lineTo') return (x: number, y: number) => { activeRoutePath?.push([x, y]); };
      if (key === 'stroke') return () => {
        if (activeRoutePath) routePaths.push(activeRoutePath);
        activeRoutePath = undefined;
      };
      if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
      return () => undefined;
    },
    set(_target, key, value) {
      stored.set(key, value);
      return true;
    },
  });
  drawGame(context, view, images, 1, undefined, true);
  return { drawCalls, clipRects, routePaths };
}

test('Bombington scene preserves the APK-derived Nevada background, street overlays, and final terrain grid', () => {
  const scene = createBombingtonMapScene();
  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(scene.background, expected.background);
  assert.deepEqual(scene.streets, expected.streets);
  assert.deepEqual(scene.backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map));
  assert.deepEqual(scene.backgroundCollisionCodes, createDakotaBackgroundCollisionCodes(map.map));
  assert.deepEqual(scene.originalTileGrid, map.originalTileGrid);

  const routeCellVisits = new Map<string, number>();
  const routeCellCodes = new Map<string, number>();
  for (const edge of routeGraph.edges) {
    const [dx, dy] = directionVectors[edge.direction];
    assert.equal(Math.abs(edge.to.x - edge.from.x) + Math.abs(edge.to.y - edge.from.y), edge.steps);
    for (let step = 1; step < edge.steps; step += 1) {
      const x = edge.from.x + dx * step;
      const y = edge.from.y + dy * step;
      const key = `${x},${y}`;
      routeCellVisits.set(key, (routeCellVisits.get(key) ?? 0) + 1);
      routeCellCodes.set(key, map.originalTileGrid[y]![x]!);
    }
  }
  const visitsByRawTile: Record<string, number> = {};
  for (const [key, visits] of routeCellVisits) {
    const code = String(routeCellCodes.get(key));
    visitsByRawTile[code] = (visitsByRawTile[code] ?? 0) + visits;
    const [x, y] = key.split(',').map(Number);
    assert.ok(scene.background.some((tile) => tile.x === x && tile.y === y), `route cell ${key} has a background tile`);
  }
  assert.deepEqual(visitsByRawTile, routeGraph.summary.intermediateVisitsByRawTile);

  const coversCell = (asset: string, x: number, y: number) => scene.streets.some((tile) => (
    tile.asset === asset && tile.x < x + 1 && tile.x + tile.width > x
      && tile.y < y + 1 && tile.y + tile.height > y
  ));
  for (const [key, code] of routeCellCodes) {
    const [x, y] = key.split(',').map(Number);
    if (code === 80) assert.ok(coversCell('tiles_bridge_hori', x, y), `raw 80 route bridge covers ${key}`);
    if (code === 81) assert.ok(coversCell('tiles_railway_hori', x, y), `raw 81 railway covers ${key}`);
    if (code === 88) assert.ok(coversCell('tiles_bridge_verti', x, y), `raw 88 route bridge covers ${key}`);
  }
});

test('production Renderer draws Bombington terrain and route lines in one clipped map coordinate system', async () => {
  const scenario = createMapScenario();
  const game = createGame({ scenarios: { [scenario.id]: scenario } });
  const session = await game.open({ scenarioId: scenario.id, mode: 'free', difficulty: 'medium', randomSeed: 42 });
  try {
    const view = session.observe();
    const viewport = getMapViewport(view);
    const { drawCalls, clipRects, routePaths } = recordProductionFrame(view);
    const expectedTerrain = [...scenario.map.background, ...scenario.map.streets];
    const terrainAssets = new Set(expectedTerrain.map(({ asset }) => asset));
    const terrainDraws = drawCalls.filter(({ asset }) => terrainAssets.has(asset));
    const expectedDraws = expectedTerrain.map((tile) => ({
      asset: tile.asset,
      args: [
        tile.source.x * gameAssetSourceScale(tile.asset),
        tile.source.y * gameAssetSourceScale(tile.asset),
        tile.source.width * gameAssetSourceScale(tile.asset),
        tile.source.height * gameAssetSourceScale(tile.asset),
        viewport.origin.x + tile.x * viewport.tileSize,
        viewport.origin.y + tile.y * viewport.tileSize,
        tile.width * viewport.tileSize,
        tile.height * viewport.tileSize,
      ],
    }));
    assert.deepEqual(terrainDraws, expectedDraws);

    assert.deepEqual(clipRects.slice(0, 2), [
      [0, 0, 1_024, 576],
      [viewport.origin.x, viewport.origin.y, viewport.mapWidth, viewport.mapHeight],
    ]);
    assert.equal(viewport.mapWidth, 1_024);
    assert.equal(viewport.mapHeight, 768);
    assert.equal(viewport.origin.y, -96);
    assert.ok(viewport.origin.y < 0 && viewport.origin.y + viewport.mapHeight > 576,
      'the camera centers the 32×24 map vertically and the renderer clips both exposed edges to 16:9');

    assert.equal(view.routes?.length, bombingtonRouteDefinitions.length);
    assert.equal(routePaths.length, view.routes?.length);
    for (const [routeIndex, route] of view.routes!.entries()) {
      const expectedPoints = route.map(({ x, y }) => [
        viewport.origin.x + x * viewport.tileSize,
        viewport.origin.y + y * viewport.tileSize,
      ]);
      assert.deepEqual(routePaths[routeIndex], expectedPoints, `route ${routeIndex} uses the same map transform as terrain`);
    }
  } finally {
    session.close();
  }
});
