import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-06.json';
import { createOregon06Dynamite } from '../src/content/oregon-06-dynamite';
import { createOregon06MapContent } from '../src/content/oregon-06-map-entities';
import { createOregon06MapScene } from '../src/content/oregon-06-scene';
import { createOregon06SteamerUnits } from '../src/content/oregon-06-steamer';
import { oregon06CampaignUnitPool } from '../src/content/oregon-06-unit-pool';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
} from '../src/content/mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from '../src/content/campaign-map-unit-placements';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function cellsForMarker(marker: number): { x: number; y: number }[] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === marker ? [{ x, y }] : []
  )));
}

test('Columbia River shared and Oregon-specific decorations match every TDM marker', () => {
  const scene = createOregon06MapScene();
  const expectations = [
    [70, 'e_1x1_rocks_b'],
    [74, 'b_1x1_windmill'],
    [77, 'e_1x2_bones'],
    [79, 'e_1x1_tree_green_a'],
    [112, 'b_3x2_saloon'],
    [113, 'b_3x2_fort'],
    [114, 'b_2x1_tipi'],
    [115, 'e_1x1_tree_green_b'],
    [117, 'b_1x1_tipi_small'],
    [118, 'e_1x1_tree_stump'],
    [119, 'e_1x1_tree_green_c'],
    [126, 'e_1x1_rocks_water'],
  ] as const;

  for (const [marker, asset] of expectations) {
    const decorations = scene.decorations?.filter(({ asset: actualAsset }) => actualAsset === asset) ?? [];
    assert.deepEqual(decorations.map(({ cell }) => cell), cellsForMarker(marker), `TDM marker ${marker} maps to ${asset}`);
  }
  assert.equal(scene.decorations?.length, 41);
  assert.deepEqual(scene.decorations?.find(({ asset }) => asset === 'b_3x2_fort'), {
    asset: 'b_3x2_fort',
    anchorOffsetY: -0.3,
    cell: { x: 21, y: 21 },
    collisionBoxFine: { x: -9408, y: -9600, width: 18048, height: 7680 },
  });
  assert.deepEqual(scene.decorations?.find(({ asset }) => asset === 'e_1x2_bones'), {
    asset: 'e_1x2_bones',
    cell: { x: 9, y: 1 },
    collisionBoxFine: { x: 0, y: -9600, width: 7680, height: 11520 },
    fieldBlockBounds: { left: 0, right: 0, top: -1, bottom: 0 },
  });
  for (const asset of new Set(scene.decorations?.map(({ asset }) => asset) ?? [])) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
});

test('Columbia River active, hireable, and Steamer units match TDM markers and unlock flags', () => {
  const allUnlocked = createOregon06MapContent(() => true).units;
  const markerGroups = [
    [96, 'gunslinger', 4],
    [97, 'mexican', 4],
    [98, 'cannon', 4],
    [99, 'indian', 4],
    [100, 'sniper', 4],
    [101, 'grandpa', 4],
    [104, 'gunslinger', 5],
    [105, 'mexican', 5],
    [107, 'indian', 5],
    [130, 'pyromaniac', 4],
    [131, 'salesman', 4],
  ] as const;
  assert.equal(allUnlocked.length, 47);
  assert.equal(new Set(allUnlocked.map(({ id }) => id)).size, allUnlocked.length);
  for (const [marker, type, activity] of markerGroups) {
    assert.deepEqual(
      allUnlocked.filter((unit) => unit.type === type && unit.activity === activity).map(({ cell }) => cell),
      cellsForMarker(marker),
      `TDM marker ${marker} creates ${type}`,
    );
  }
  assert.equal(allUnlocked.filter(({ type, activity }) => type === 'cannon' && activity === 4).length, 4);
  assert.equal(allUnlocked.some(({ type, activity }) => type === 'cannon' && activity === 5), false);
  assert.deepEqual(allUnlocked.find(({ type, activity, cell }) => (
    type === 'gunslinger' && activity === 5 && cell.x === 16 && cell.y === 12
  ))?.render, { x: 16, y: 11.625, width: 1, height: 1.375 });
  assert.deepEqual(allUnlocked.find(({ type, activity, cell }) => (
    type === 'cannon' && activity === 4 && cell.x === 23 && cell.y === 3
  ))?.render, { x: 23, y: 2.75, width: 1, height: 1 });

  const steamer = createOregon06SteamerUnits();
  assert.deepEqual(steamer.map(({ type, cell, activity }) => ({ type, cell, activity })), [
    { type: 'steamer-30', cell: { x: 2, y: 11 }, activity: 5 },
    { type: 'steamer-31', cell: { x: 3, y: 11 }, activity: 5 },
    { type: 'steamer-32', cell: { x: 4, y: 11 }, activity: 5 },
    { type: 'steamer-33', cell: { x: 5, y: 11 }, activity: 5 },
  ]);
  assert.equal(new Set(steamer.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.ok(steamer.every(({ movementSurface, movementAxis }) => movementSurface === 'water' && movementAxis === 'horizontal'));

  const gatedMarkers = [
    [100, 'sniper', 5, 1],
    [101, 'grandpa', 6, 3],
    [130, 'pyromaniac', 35, 1],
    [131, 'salesman', 36, 1],
  ] as const;
  for (let mask = 0; mask < 16; mask += 1) {
    const snapshot = {
      grandpa: (mask & 2) !== 0,
      sniper: (mask & 1) !== 0,
      pyromaniac: (mask & 4) !== 0,
      salesman: (mask & 8) !== 0,
    };
    const completed = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
    const restored = mississippiUnitUnlockSnapshotFor(completed);
    const units = createOregon06MapContent((typeId) => mississippiUnitUnlocked(typeId, restored)).units;
    let expectedCount = 41;
    for (const [marker, type, unitTypeId, count] of gatedMarkers) {
      const unlocked = mississippiUnitUnlocked(unitTypeId as CampaignMapUnitTypeId, restored);
      if (unlocked) expectedCount += count;
      assert.deepEqual(
        units.filter((unit) => unit.type === type && unit.activity === 4).map(({ cell }) => cell),
        unlocked ? cellsForMarker(marker) : [],
        `unlock mask ${mask} applies to ${type}`,
      );
    }
    assert.equal(units.length, expectedCount, `unlock mask ${mask} only creates units backed by TDM markers`);
  }
});

test('Columbia River player pool binds four pool types to real buildings and keeps Cannon off the map', () => {
  assert.equal(oregon06CampaignUnitPool.intervalMs, 15_000);
  assert.deepEqual(oregon06CampaignUnitPool.spawnLocations, [
    { id: 'saloon-4-2', spawnLocationType: 1, cell: { x: 4, y: 2 } },
    { id: 'tipi-30-6', spawnLocationType: 3, cell: { x: 30, y: 6 } },
    { id: 'fort-21-21', spawnLocationType: 2, cell: { x: 21, y: 21 } },
  ]);
  assert.deepEqual(oregon06CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType }) => ({
    poolType, unitType, spawnLocationType,
  })), [
    { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 },
    { poolType: 2, unitType: 'mexican', spawnLocationType: 1 },
    { poolType: 3, unitType: 'cannon', spawnLocationType: 2 },
    { poolType: 4, unitType: 'indian', spawnLocationType: 3 },
  ]);
  const cannon = oregon06CampaignUnitPool.units.find(({ poolType }) => poolType === 3)?.template;
  assert.ok(cannon);
  assert.deepEqual({ id: cannon.id, type: cannon.type, activity: cannon.activity, cell: cannon.cell }, {
    id: 'cannon-map-01', type: 'cannon', activity: 5, cell: { x: 21, y: 21 },
  });
  assert.equal(createOregon06MapContent(() => true).units.some(({ id }) => id === cannon.id), false);
  assert.equal(createOregon06MapContent(() => true).units.some(({ type, activity }) => type === 'cannon' && activity === 5), false);
});

test('Columbia River Dynamite pairs map markers and follows the existing progression gate', () => {
  const locked = createOregon06Dynamite([]);
  assert.equal(locked.unlocked, false);
  assert.deepEqual(locked.pairs, [
    { id: 'dynamite-1', triggerCell: { x: 19, y: 6 }, boxCell: { x: 21, y: 7 } },
    { id: 'dynamite-2', triggerCell: { x: 15, y: 15 }, boxCell: { x: 17, y: 16 } },
  ]);
  assert.equal(createOregon06Dynamite(['campaign-mississippi-10']).unlocked, true);
  assert.equal(createOregon06Dynamite(['campaign-oregon-10']).unlocked, true);
});
