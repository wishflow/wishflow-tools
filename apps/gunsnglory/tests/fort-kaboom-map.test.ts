import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import map from '../src/content/new-mexico-03.json';
import { fortKaboomContent, fortKaboomRouteDefinitions, fortKaboomSpawnPoints } from '../src/content/fort-kaboom';
import { createGame, type Direction, type ScenarioContent } from '../src/game';
import { createRoutePriorityMap } from '../src/game/route-priority';
import { gameAssetLogicalSize, gameAssetRelativePath } from '../src/render/game-asset-path';
import { mapDecorationDestination } from '../src/render/canvas-renderer';
import { calculateMapViewport } from '../src/render/map-viewport';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDirectory = resolve(appRoot, 'public/assets');
const directionVectors: Readonly<Record<Direction, { x: number; y: number }>> = {
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  north: { x: 0, y: -1 },
};
const directionsByTdmCode: Readonly<Record<number, readonly Direction[]>> = {
  52: ['north'],
  53: ['south'],
  54: ['west'],
  55: ['east'],
  56: ['north', 'west'],
  57: ['north', 'east'],
  58: ['north', 'south'],
  59: ['west', 'east'],
  60: ['west', 'south'],
  61: ['east', 'south'],
  62: ['north', 'west', 'east'],
  63: ['west', 'east', 'south'],
  64: ['east', 'south', 'north'],
  65: ['south', 'north', 'west'],
};
const spawnDirectionsByTdmCode: Readonly<Record<number, Direction>> = {
  40: 'north',
  41: 'east',
  42: 'east',
  43: 'south',
};

function readRawGrid(): { bytes: Buffer; grid: number[][] } {
  const bytes = readFileSync(resolve(appRoot, 'public/content/maps/td_map_03.tdm'));
  const width = bytes[0]!;
  const height = bytes[1]!;
  return {
    bytes,
    grid: Array.from({ length: height }, (_, y) => Array.from(bytes.subarray(2 + (y * width), 2 + ((y + 1) * width)))),
  };
}

function pointSignature(point: { x: number; y: number }, direction: string): string {
  return `${point.x},${point.y}:${direction}`;
}

function routeSignature(route: typeof fortKaboomRouteDefinitions[number]): string[] {
  return [
    pointSignature(route.spawn.cell, route.spawn.direction),
    ...route.redirects.map(({ cell, directions }) => pointSignature(cell, directions.join('/'))),
    pointSignature(route.exit, 'exit'),
  ];
}

test('stores the exact 22×17 APK TDM bytes and decoded tile coordinates', () => {
  const { bytes, grid } = readRawGrid();
  assert.equal(bytes.length, 376);
  assert.deepEqual([...bytes.subarray(0, 2)], [22, 17]);
  assert.equal(map.map.width, 22);
  assert.equal(map.map.height, 17);
  assert.equal(map.map.tileSize, 32);
  assert.deepEqual(map.originalTileGrid, grid);
  assert.equal(grid.flat().length, 22 * 17);
});

test('reconstructs every background, path, bridge and bridge pier draw command from the TDM', () => {
  const { grid } = readRawGrid();
  const expected = deriveOriginalTdmMapDrawCommands({ originalTileGrid: grid });
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.equal(map.map.background.length, 22 * 17);

  const horizontal = map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori');
  const vertical = map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti');
  const leftPiers = map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_pier_left');
  const rightPiers = map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_pier_right');
  assert.deepEqual(horizontal.map(({ x, y }) => [x, y]), [
    [2.75, 5], [3.75, 5], [17.75, 5], [18.75, 5], [3.75, 11], [16.75, 11], [17.75, 11],
  ]);
  assert.deepEqual(vertical.map(({ x, y }) => [x, y]), [[7, 1.75], [7, 2.75]]);
  assert.equal(leftPiers.length, 4);
  assert.equal(rightPiers.length, 4);
  assert.deepEqual(leftPiers.map(({ x, y }) => [x, y]), [
    [2.75, 5.75], [17.75, 5.75], [3.75, 11.75], [16.75, 11.75],
  ]);
  assert.deepEqual(rightPiers.map(({ x, y }) => [x, y]), [
    [4.5, 5.75], [19.5, 5.75], [4.5, 11.75], [18.5, 11.75],
  ]);
});

test('records all four spawn points and all seven legal TDM routes through the two exits', () => {
  const { grid } = readRawGrid();
  const spawns = [
    { cell: { x: 5, y: 16 }, direction: 'north' },
    { cell: { x: 0, y: 9 }, direction: 'east' },
    { cell: { x: 0, y: 8 }, direction: 'east' },
    { cell: { x: 11, y: 0 }, direction: 'south' },
  ];
  assert.deepEqual(fortKaboomSpawnPoints, spawns);
  assert.deepEqual(fortKaboomRouteDefinitions.map(routeSignature), [
    ['5,16:north', '5,14:west', '4,14:north', '4,9:north', '4,3:east', '5,3:east', '9,3:north', '9,2:east', '11,2:east', '14,2:south', '14,3:east', '19,3:south', '19,9:west', '18,9:south', '18,14:east', '21,14:exit'],
    ['5,16:north', '5,14:west', '4,14:north', '4,9:north', '4,3:east', '5,3:east', '9,3:east', '13,3:south', '13,4:east', '18,4:south', '18,8:west', '17,8:south', '17,15:east', '21,15:exit'],
    ['0,9:east', '4,9:north', '4,3:east', '5,3:east', '9,3:north', '9,2:east', '11,2:east', '14,2:south', '14,3:east', '19,3:south', '19,9:west', '18,9:south', '18,14:east', '21,14:exit'],
    ['0,9:east', '4,9:north', '4,3:east', '5,3:east', '9,3:east', '13,3:south', '13,4:east', '18,4:south', '18,8:west', '17,8:south', '17,15:east', '21,15:exit'],
    ['0,8:east', '3,8:north', '3,2:east', '5,2:south', '5,3:east', '9,3:north', '9,2:east', '11,2:east', '14,2:south', '14,3:east', '19,3:south', '19,9:west', '18,9:south', '18,14:east', '21,14:exit'],
    ['0,8:east', '3,8:north', '3,2:east', '5,2:south', '5,3:east', '9,3:east', '13,3:south', '13,4:east', '18,4:south', '18,8:west', '17,8:south', '17,15:east', '21,15:exit'],
    ['11,0:south', '11,2:east', '14,2:south', '14,3:east', '19,3:south', '19,9:west', '18,9:south', '18,14:east', '21,14:exit'],
  ]);

  const mappedSpawnCells = new Map<string, number>();
  const mappedExitCells = new Set<string>();
  grid.forEach((row, y) => row.forEach((code, x) => {
    if (code >= 40 && code <= 43) mappedSpawnCells.set(`${x},${y}`, code);
    if (code === 48) mappedExitCells.add(`${x},${y}`);
  }));
  assert.deepEqual([...mappedSpawnCells.entries()].sort((a, b) => a[1] - b[1]), [
    ['5,16', 40], ['0,9', 41], ['0,8', 42], ['11,0', 43],
  ]);
  assert.deepEqual([...mappedExitCells].sort(), ['21,14', '21,15']);

  const coveredFields = new Map<string, Set<Direction>>();
  for (const route of fortKaboomRouteDefinitions) {
    const startCode = grid[route.spawn.cell.y]?.[route.spawn.cell.x];
    assert.equal(spawnDirectionsByTdmCode[startCode!], route.spawn.direction);
    let current = route.spawn.cell;
    let direction = route.spawn.direction;
    const segments = [...route.redirects, { cell: route.exit, directions: [] as Direction[] }];
    for (const target of segments) {
      const vector = directionVectors[direction];
      assert.ok(
        (current.x === target.cell.x && vector.x === 0)
        || (current.y === target.cell.y && vector.y === 0),
        `route segment must continue ${direction} from ${current.x},${current.y}`,
      );
      let x = current.x;
      let y = current.y;
      while (x !== target.cell.x || y !== target.cell.y) {
        x += vector.x;
        y += vector.y;
        assert.ok(x >= 0 && x < 22 && y >= 0 && y < 17, `route leaves map at ${x},${y}`);
        const code = grid[y]![x]!;
        const isTarget = x === target.cell.x && y === target.cell.y;
        if (isTarget) {
          if (target === segments.at(-1)) assert.equal(code, 48, `route exit ${x},${y}`);
          else assert.ok(code >= 52 && code <= 65, `route redirect ${x},${y}`);
        } else {
          assert.notEqual(code, 48, `route passes an exit at ${x},${y}`);
          assert.ok(code < 52 || code > 65, `route skips a redirect at ${x},${y}`);
        }
      }
      if (target !== segments.at(-1)) {
        const code = grid[target.cell.y]![target.cell.x]!;
        const allowed = directionsByTdmCode[code] ?? [];
        assert.equal(target.directions.length, 1);
        const selectedDirection = target.directions[0]!;
        assert.ok(allowed.includes(selectedDirection), `TDM ${code} at ${target.cell.x},${target.cell.y} permits ${allowed}`);
        const key = `${target.cell.x},${target.cell.y}`;
        const directions = coveredFields.get(key) ?? new Set<Direction>();
        directions.add(selectedDirection);
        coveredFields.set(key, directions);
        current = target.cell;
        direction = selectedDirection;
      }
    }
  }

  const allTdmFields = new Map<string, number>();
  grid.forEach((row, y) => row.forEach((code, x) => {
    if (code >= 52 && code <= 65) allTdmFields.set(`${x},${y}`, code);
  }));
  assert.deepEqual([...coveredFields.keys()].sort(), [...allTdmFields.keys()].sort());
  for (const [key, code] of allTdmFields) {
    assert.deepEqual([...coveredFields.get(key)!].sort(), [...directionsByTdmCode[code]!].sort(), `${key} TDM choices`);
  }

  const previewWave = {
    ...cowGulchPreviewWave,
    initialCash: 300,
    spawn: fortKaboomSpawnPoints[0],
    additionalSpawns: fortKaboomSpawnPoints.slice(1),
    routes: fortKaboomRouteDefinitions,
    redirects: fortKaboomRouteDefinitions.flatMap(({ redirects }) => redirects),
    exit: { x: 21, y: 14 },
    additionalExits: [{ x: 21, y: 15 }],
  };
  const priority = createRoutePriorityMap({ ...fortKaboomContent, previewWave });
  for (const route of fortKaboomRouteDefinitions) {
    for (const point of [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit]) {
      assert.ok(priority.getTargetPriority(point.x, point.y) > 0, `route priority at ${point.x},${point.y}`);
    }
  }
});

test('matches every map decoration and sleeping unit marker to its TDM code and original assets', () => {
  const { grid } = readRawGrid();
  const decorationAssets: Readonly<Record<number, string>> = {
    68: 'e_1x1_cactus_a',
    69: 'e_1x1_rocks_a',
    70: 'e_1x1_rocks_b',
    71: 'e_1x1_tree',
    72: 'b_1x1_stake',
    73: 'e_1x1_cactus_b',
    74: 'b_1x1_windmill',
    76: 'e_1x1_bush',
    77: 'e_1x2_bones',
    113: 'b_3x2_fort',
    116: 'b_2x1_shack',
    117: 'b_1x1_tipi_small',
    126: 'e_1x1_rocks_water',
  };
  const expectedDecorations = grid.flatMap((row, y) => row.flatMap((code, x) => (
    decorationAssets[code] ? [{ asset: decorationAssets[code], cell: { x, y } }] : []
  )));
  assert.deepEqual(
    fortKaboomContent.map.decorations?.map(({ asset, cell }) => ({ asset, cell })),
    expectedDecorations,
  );
  assert.equal(expectedDecorations.length, 24);
  const fort = fortKaboomContent.map.decorations?.find(({ asset }) => asset === 'b_3x2_fort');
  assert.ok(fort);
  assert.deepEqual(fort.cell, { x: 10, y: 5 });
  assert.equal(fort.anchorOffsetY, -0.3);
  assert.deepEqual(fort.collisionBoxFine, { x: -5568, y: -5760, width: 18048, height: 7680 });

  const unitTypesByTdmCode: Readonly<Record<number, string>> = {
    96: 'gunslinger',
    97: 'mexican',
    98: 'cannon',
    99: 'indian',
    100: 'sniper',
    101: 'grandpa',
  };
  const expectedUnits = grid.flatMap((row, y) => row.flatMap((code, x) => (
    unitTypesByTdmCode[code] ? [{ type: unitTypesByTdmCode[code], activity: 4, cell: { x, y } }] : []
  )));
  assert.equal(expectedUnits.length, 31);
  assert.deepEqual(
    fortKaboomContent.units.map(({ type, activity, cell }) => ({ type, activity, cell })),
    expectedUnits,
  );
  assert.deepEqual(Object.fromEntries(
    Object.entries(unitTypesByTdmCode).map(([code, type]) => [
      type,
      expectedUnits.filter((unit) => unit.type === type).length,
    ]),
  ), { gunslinger: 10, mexican: 10, cannon: 2, indian: 6, sniper: 1, grandpa: 2 });
  for (const unit of fortKaboomContent.units) {
    assert.equal(unit.activity, 4);
    assert.equal(unit.render.width, unit.frame.width / 32);
    assert.equal(unit.render.height, unit.frame.height / 32);
    assert.equal(unit.render.y + unit.render.height, unit.cell.y + 0.75);
    if (unit.awakeRender && unit.awakeFrame) {
      assert.equal(unit.awakeRender.y + unit.awakeRender.height, unit.cell.y + 0.75);
    }
  }
});

test('resolves every spatial asset and anchors the Fort bitmap at its APK foot point', async () => {
  const assets = new Set([
    ...map.map.background.map(({ asset }) => asset),
    ...map.map.streets.map(({ asset }) => asset),
    ...(fortKaboomContent.map.decorations ?? []).map(({ asset }) => asset),
    ...fortKaboomContent.units.flatMap(({ asset, awakeAsset }) => [asset, ...(awakeAsset ? [awakeAsset] : [])]),
    'sfx_sleeping',
  ]);
  for (const asset of assets) {
    assert.ok(existsSync(resolve(assetsDirectory, gameAssetRelativePath(asset))), `missing asset ${asset}`);
  }

  const fortPath = resolve(assetsDirectory, gameAssetRelativePath('b_3x2_fort'));
  const fortBytes = readFileSync(fortPath);
  assert.equal(fortBytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.deepEqual({ width: fortBytes.readUInt32BE(16), height: fortBytes.readUInt32BE(20) }, { width: 132, height: 168 });
  assert.deepEqual(gameAssetLogicalSize('b_3x2_fort', { width: 132, height: 168 }), { width: 88, height: 112 });

  const fort = fortKaboomContent.map.decorations!.find(({ asset }) => asset === 'b_3x2_fort')!;
  const viewport = calculateMapViewport(22, 17, 1024, 576);
  const destination = mapDecorationDestination(fort, { width: 132, height: 168 }, viewport);
  const expectedFootY = viewport.origin.y + (fort.cell.y + 1 - 0.3) * viewport.tileSize;
  const expectedTop = Math.trunc(expectedFootY - (112 * viewport.scaleFactor));
  const expectedBottom = Math.trunc(expectedTop + (112 * viewport.scaleFactor));
  assert.equal(destination.y + destination.height, expectedBottom);

  const scenario: ScenarioContent = {
    id: 'fort-anchor-depth-check',
    title: { en: 'Fort anchor', zh: '堡垒锚点' },
    map: { width: 22, height: 17, tileSize: 32, background: [], streets: [], decorations: [fort] },
    units: [{
      id: 'same-cell-unit',
      type: 'gunslinger',
      cell: { ...fort.cell },
      movementSpeedFinePer100Ms: 1500,
      asset: 'player_gunslinger',
      frame: { x: 0, y: 0, width: 32, height: 44 },
      render: { x: fort.cell.x, y: fort.cell.y - 0.625, width: 1, height: 1.375 },
      hitArea: { x: fort.cell.x, y: fort.cell.y - 0.625, width: 1, height: 1.375 },
    }],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 42,
  });
  assert.deepEqual(session.observe().drawOrder, ['decoration:0', 'unit:same-cell-unit']);

  const collisionScenario: ScenarioContent = {
    ...scenario,
    id: 'fort-collision-check',
    map: { ...scenario.map, decorations: [fort] },
    units: [{
      ...scenario.units[0]!,
      id: 'approaching-unit',
      cell: { x: 10, y: 3 },
      render: { x: 10, y: 2.375, width: 1, height: 1.375 },
      hitArea: { x: 10, y: 2.375, width: 1, height: 1.375 },
    }],
  };
  const collisionSession = await createGame({ scenarios: { [collisionScenario.id]: collisionScenario } }).open({
    scenarioId: collisionScenario.id,
    randomSeed: 42,
  });
  assert.equal(collisionSession.submitIntent({ type: 'select-at', x: 10.5, y: 3.5 }), true);
  collisionSession.advance({ deltaMs: 0 });
  assert.equal(collisionSession.observe().units[0]?.selected, true);
  assert.equal(collisionSession.submitIntent({ type: 'move-unit', targetX: 10.5, targetY: 7.5 }), true);
  let collisionView = collisionSession.observe();
  for (let index = 0; index < 60; index += 1) {
    collisionView = collisionSession.advance({ deltaMs: 100, tileSizePixels: 32 });
  }
  const stoppedAtCellY = collisionView.units[0]!.positionFine.y / 7680;
  assert.ok(stoppedAtCellY > 3.75 && stoppedAtCellY < 4.35, 'Fort collision stops the unit at its original collision edge');
});
