import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createMississippi11MapScene } from '../src/content/mississippi-11-scene';
import { createMississippi11SteamerUnits } from '../src/content/mississippi-11-steamer';
import map from '../src/content/mississippi-11.json';
import { createGame, type ScenarioContent } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { deriveOriginalBackgroundCodesForTest } from './helpers/terrain-render-reference';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const steamerAssets = [
  'steamboat_1', 'steamboat_2', 'steamboat_3', 'steamboat_4a', 'steamboat_4b', 'steamboat_4c',
  'player_double_cannon', 'player_double_cannon_shot',
] as const;

function pngDimensions(assetName: string): { width: number; height: number } {
  const bytes = readFileSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(assetName)));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${assetName} is a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function createSteamerScenario(openTerrain = false): ScenarioContent {
  const mapScene = createMississippi11MapScene();
  return {
    id: 'mississippi-11-steamer-check',
    contentVersion: 'gng-free-1.8.6-map14-steamer-check-v1',
    title: { en: 'Traveller’s Town Steamer check', zh: '旅行者小镇蒸汽船检查' },
    map: openTerrain ? { ...mapScene, decorations: [] } : mapScene,
    ...(openTerrain ? {} : { originalTileGrid: map.originalTileGrid }),
    units: createMississippi11SteamerUnits(),
    maxUpgrades: 3,
    recruitableUnits: [],
  };
}

function createSingleMoverScenario(
  movementSurface: 'water' | undefined,
  obstacleBackgroundCode = 96,
  includeOverlappingWaterRock = false,
): ScenarioContent {
  const steamer = createMississippi11SteamerUnits()[0]!;
  const {
    movementGroupId: _groupId,
    movementAxis: _axis,
    movementSurface: _movementSurface,
    ...singleUnit
  } = steamer;
  const cell = { x: 1, y: 1 };
  const backgroundCollisionCodes = Array.from({ length: 4 }, () => (
    Array.from({ length: 6 }, (_, x) => x === 3 ? obstacleBackgroundCode : 96)
  ));
  const originalTileGrid = Array.from({ length: 4 }, () => (
    Array.from({ length: 6 }, (_, x) => x === 3 ? 124 : 0)
  ));
  const movementUnit = {
    ...singleUnit,
    id: 'surface-check-unit',
    cell,
    movementSpeedFinePer100Ms: 7680,
    collisionBoxFine: { x: -1000, y: -1000, width: 2000, height: 2000 },
    render: { x: cell.x, y: cell.y - 0.5, width: 1, height: 1.25 },
    hitArea: { x: cell.x, y: cell.y - 0.5, width: 1, height: 1.25 },
    ...(movementSurface ? { movementSurface } : {}),
  };

  return {
    id: `mississippi-11-surface-check-${movementSurface ?? 'ground'}-${obstacleBackgroundCode}`,
    contentVersion: 'gng-free-1.8.6-map14-surface-check-v1',
    title: { en: 'Surface collision check', zh: '地表碰撞检查' },
    map: {
      width: 6,
      height: 4,
      tileSize: 32,
      background: [],
      streets: [],
      ...(includeOverlappingWaterRock ? {
        decorations: [{
          asset: 'e_1x1_rocks_water',
          cell: { x: 3, y: 1 },
          collisionBoxFine: { x: 1920, y: 2612, width: 3840, height: 2534 },
        }],
      } : {}),
      backgroundCollisionCodes,
    },
    originalTileGrid,
    units: [movementUnit],
    maxUpgrades: 0,
    recruitableUnits: [],
  };
}

async function moveSingleUnitThroughFirstCell(scenario: ScenarioContent): Promise<number> {
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  session.submitIntent({ type: 'select-at', x: 1.5, y: 1.5 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'move-unit', targetX: 4.5, targetY: 1.75 });
  session.advance({ deltaMs: 0 });
  session.advance({ deltaMs: 100 });
  session.advance({ deltaMs: 100 });
  return session.observe().units[0]!.positionFine.x;
}

test('creates the four Steamer parts from the map14 marker scan', () => {
  const units = createMississippi11SteamerUnits();
  assert.deepEqual(units.map(({ id, type, activity, cell, asset, movementGroupId }) => ({
    id, type, activity, cell, asset, movementGroupId,
  })), [
    { id: 'mississippi-11-steamer-30', type: 'steamer-30', activity: 5, cell: { x: 7, y: 22 }, asset: 'steamboat_1', movementGroupId: 'mississippi-11-steamer' },
    { id: 'mississippi-11-steamer-31', type: 'steamer-31', activity: 5, cell: { x: 8, y: 22 }, asset: 'steamboat_2', movementGroupId: 'mississippi-11-steamer' },
    { id: 'mississippi-11-steamer-32', type: 'steamer-32', activity: 4, cell: { x: 9, y: 22 }, asset: 'steamboat_3', movementGroupId: 'mississippi-11-steamer' },
    { id: 'mississippi-11-steamer-33', type: 'steamer-33', activity: 5, cell: { x: 10, y: 22 }, asset: 'steamboat_4a', movementGroupId: 'mississippi-11-steamer' },
  ]);

  assert.ok(units.every(({ movementAxis, movementSpeedFinePer100Ms, collisionBoxFine }) => (
    movementAxis === 'horizontal'
    && movementSpeedFinePer100Ms === 1000
    && JSON.stringify(collisionBoxFine) === JSON.stringify({ x: -3840, y: -4608, width: 7680, height: 4608 })
  )));
  assert.deepEqual(units.map(({ frame, render, hitArea }) => ({ frame, render, hitArea })), units.map(({ cell }) => {
    const render = { x: cell.x, y: cell.y - 0.5, width: 1, height: 1.25 };
    return {
      frame: { x: 0, y: 0, width: 48, height: 60 },
      render,
      hitArea: render,
    };
  }));
  assert.equal(units[1]?.steamEmitter, true);
  assert.deepEqual(units[1]?.steamEmitterOffsetFine, { x: 823, y: -10_752 });
  assert.deepEqual(units[3]?.positionAssetSequence, {
    xStepFine: 1000,
    assets: ['steamboat_4a', 'steamboat_4b', 'steamboat_4c'],
  });
});

test('bundles the APK hdpi body, tail, and cannon frames at their original pixel dimensions', () => {
  const expectedDimensions = {
    steamboat_1: { width: 48, height: 96 },
    steamboat_2: { width: 48, height: 96 },
    steamboat_3: { width: 48, height: 64 },
    steamboat_4a: { width: 48, height: 64 },
    steamboat_4b: { width: 48, height: 64 },
    steamboat_4c: { width: 48, height: 64 },
    player_double_cannon: { width: 48, height: 240 },
    player_double_cannon_shot: { width: 48, height: 240 },
  } as const;

  for (const asset of steamerAssets) {
    const resolved = gameAssetRelativePath(asset);
    assert.equal(resolved, `hdpi/${asset}.png`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', resolved)), `${asset} is bundled`);
    assert.deepEqual(pngDimensions(asset), expectedDimensions[asset]);
  }
});

test('projects the tail drawable from fineX and keeps the four parts in original draw order', async () => {
  const scenario = createSteamerScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } })
    .open({ scenarioId: scenario.id });
  const view = session.observe();
  const tail = view.units.find(({ id }) => id === 'mississippi-11-steamer-33');

  assert.equal(tail?.positionFine.x, (10 * 7680) + 3840);
  assert.equal(tail?.asset, 'steamboat_4c', 'floor(fineX / 1000) % 3 selects the original third tail image');
  assert.deepEqual(view.drawOrder.filter((id) => id.includes('mississippi-11-steamer-')), [
    'unit:mississippi-11-steamer-33',
    'unit:mississippi-11-steamer-32',
    'unit:mississippi-11-steamer-31',
    'unit:mississippi-11-steamer-30',
  ]);

  const emitter = view.units.find(({ id }) => id === 'mississippi-11-steamer-31')!;
  const afterEmission = session.advance({ deltaMs: 100 });
  const cloud = afterEmission.units.find(({ id }) => id === emitter.id)?.steamClouds?.[0];
  assert.ok(cloud);
  assert.equal(cloud.positionFine.x, emitter.positionFine.x + 823);
  assert.equal(cloud.positionFine.y, emitter.positionFine.y - 10_752 - 600);
});

test('changes the tail drawable when the grouped Steamer crosses the APK fineX frame boundary', async () => {
  const scenario = createSteamerScenario(true);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } })
    .open({ scenarioId: scenario.id });
  const initialTail = session.observe().units.find(({ id }) => id === 'mississippi-11-steamer-33')!;

  session.submitIntent({ type: 'select-at', x: 7.5, y: 22.5 });
  const selectedView = session.advance({ deltaMs: 0 });
  assert.ok(selectedView.units.some(({ id, selected }) => id === 'mississippi-11-steamer-30' && selected));
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 12, targetY: 22.75 }), true);
  const movingView = session.advance({ deltaMs: 0 });
  assert.ok(movingView.units.some(({ id, moving }) => id === 'mississippi-11-steamer-30' && moving));
  const movedTail = session.advance({ deltaMs: 100 }).units
    .find(({ id }) => id === 'mississippi-11-steamer-33')!;

  assert.equal(movedTail.positionFine.x, initialTail.positionFine.x + 1000);
  assert.equal(movedTail.asset, 'steamboat_4a');
});

test('derives map14 collision codes from the final Mississippi background tiles', () => {
  const scene = createMississippi11MapScene();
  const expected = deriveOriginalBackgroundCodesForTest({
    originalTileGrid: map.originalTileGrid,
    map: map.map,
  });

  assert.deepEqual(scene.backgroundCollisionCodes, expected);
  assert.ok(scene.backgroundCollisionCodes[22]?.every((code) => code === 96), 'the full steamer lane is APK water code 96');
  assert.ok(createMississippi11SteamerUnits().every(({ movementSurface }) => movementSurface === 'water'));

  const waterRocks = scene.decorations?.filter(({ asset }) => asset === 'e_1x1_rocks_water') ?? [];
  assert.equal(waterRocks.length, 9);
  assert.ok(waterRocks.every(({ collisionBoxFine }) => JSON.stringify(collisionBoxFine) === JSON.stringify({
    x: 1920, y: 2612, width: 3840, height: 2534,
  })));

  const boatCollisionTop = (22 * 7680) + 3840 + 1920 - 4608;
  const rockCollisionBottom = (21 * 7680) + 2612 + 2534;
  assert.ok(rockCollisionBottom < boatCollisionTop, 'map14 water rocks do not intersect the steamer body in the authored lane');
});

test('moves the rigid Steamer across map14 water without false rock collisions and keeps it inside the map', async () => {
  const scenario = createSteamerScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  const initial = session.observe().units.filter(({ id }) => id.includes('mississippi-11-steamer-'))
    .sort((left, right) => left.positionFine.x - right.positionFine.x);

  session.submitIntent({ type: 'select-at', x: 7.5, y: 22.5 });
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 12, targetY: 22.75 }), true);
  session.advance({ deltaMs: 0 });
  for (let step = 0; step < 40; step += 1) session.advance({ deltaMs: 100 });

  const moved = session.observe().units.filter(({ id }) => id.includes('mississippi-11-steamer-'))
    .sort((left, right) => left.positionFine.x - right.positionFine.x);
  assert.ok(Math.abs(moved[0]!.positionFine.x - (12 * 7680)) < 1600,
    'the lead reaches its requested river position within the APK stop tolerance');
  assert.deepEqual(moved.map(({ positionFine }) => positionFine.y), initial.map(({ positionFine }) => positionFine.y));
  assert.deepEqual(
    moved.map(({ positionFine }) => positionFine.x - moved[0]!.positionFine.x),
    initial.map(({ positionFine }) => positionFine.x - initial[0]!.positionFine.x),
  );

  session.submitIntent({ type: 'move-unit', targetX: 40, targetY: 22.75 });
  session.advance({ deltaMs: 0 });
  let stoppedAtBoundary = false;
  for (let step = 0; step < 300; step += 1) {
    const before = session.observe().units.filter(({ id }) => id.includes('mississippi-11-steamer-'))
      .map(({ positionFine }) => positionFine.x);
    const afterView = session.advance({ deltaMs: 100 });
    const after = afterView.units.filter(({ id }) => id.includes('mississippi-11-steamer-'))
      .map(({ positionFine }) => positionFine.x);
    assert.ok(after.every((x) => x >= 0 && x <= 32 * 7680), 'all Steamer anchors remain within map bounds');
    if (after.every((x, index) => x === before[index])) {
      stoppedAtBoundary = true;
      break;
    }
  }
  assert.equal(stoppedAtBoundary, true, 'the group stops when its next move crosses the authored map boundary');
});

test('applies APK water collision ranges only to water units and keeps ordinary units blocked by water', async () => {
  const blockedCodes = [12, 14, 16, 19, 20, 23, 48, 75, 97, 127, 160, 163];
  const allowedCodes = [11, 15, 24, 47, 76, 96, 128, 159, 164];

  for (const code of blockedCodes) {
    const scenario = createSingleMoverScenario('water', code);
    assert.equal(await moveSingleUnitThroughFirstCell(scenario), 2.5 * 7680, `water background ${code} blocks movement`);
  }
  for (const code of allowedCodes) {
    const scenario = createSingleMoverScenario('water', code);
    assert.equal(await moveSingleUnitThroughFirstCell(scenario), 3.5 * 7680, `water background ${code} allows movement`);
  }

  const groundScenario = createSingleMoverScenario(undefined, 96);
  assert.equal(await moveSingleUnitThroughFirstCell(groundScenario), 2.5 * 7680,
    'ordinary ground movement remains blocked by raw TDM water 124 / background code 96');

  const rockScenario = createSingleMoverScenario('water', 96, true);
  assert.equal(await moveSingleUnitThroughFirstCell(rockScenario), 2.5 * 7680,
    'the original water-rock collision box blocks a water unit when the two bounds overlap');
});
