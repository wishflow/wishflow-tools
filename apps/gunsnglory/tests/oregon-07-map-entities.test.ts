import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-07.json';
import { createOregon07Dynamite } from '../src/content/oregon-07-dynamite';
import { createOregon07MapContent } from '../src/content/oregon-07-map-entities';
import { createOregon07MapScene } from '../src/content/oregon-07-scene';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
} from '../src/content/mississippi-unit-unlocks';
import { createGame, type ScenarioContent } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const trainGroupIds = ['oregon-07-train-1', 'oregon-07-train-2'] as const;

function cellsForMarker(marker: number): { x: number; y: number }[] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === marker ? [{ x, y }] : []
  )));
}

function expectedHireCounts(mask: number) {
  return {
    sniper: mask & 2 ? 1 : 0,
    grandpa: mask & 1 ? 5 : 0,
    pyromaniac: mask & 4 ? 1 : 0,
    salesman: mask & 8 ? 1 : 0,
  };
}

function createTrainScenario(): ScenarioContent {
  const mapContent = createOregon07MapContent(() => true);
  return {
    id: 'mount-hood-train-test',
    title: { en: 'Mount Hood train check', zh: '胡德山列车检查' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
  };
}

test('Mount Hood decorations match all supported TDM markers and leave unknown tile 78 untouched', () => {
  const scene = createOregon07MapScene();
  const expectations = [
    [74, 'b_1x1_windmill'],
    [75, 'b_1x1_watertower'],
    [77, 'e_1x2_bones'],
    [79, 'e_1x1_tree_green_a'],
    [86, 'tiles_railway_buffers_hori_left'],
    [87, 'tiles_railway_buffers_hori_right'],
    [115, 'e_1x1_tree_green_b'],
    [118, 'e_1x1_tree_stump'],
    [119, 'e_1x1_tree_green_c'],
    [126, 'e_1x1_rocks_water'],
  ] as const;

  for (const [marker, asset] of expectations) {
    const decorations = scene.decorations?.filter(({ asset: actualAsset }) => actualAsset === asset) ?? [];
    assert.deepEqual(decorations.map(({ cell }) => cell), cellsForMarker(marker), `TDM marker ${marker} maps to ${asset}`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
  assert.equal(scene.decorations?.length, 46);
  assert.equal(scene.decorations?.some(({ cell }) => map.originalTileGrid[cell.y]?.[cell.x] === 78), false);
  assert.deepEqual(scene.decorations?.find(({ asset }) => asset === 'e_1x2_bones'), {
    asset: 'e_1x2_bones',
    cell: { x: 1, y: 2 },
    collisionBoxFine: { x: 0, y: -9600, width: 7680, height: 11520 },
    fieldBlockBounds: { left: 0, right: 0, top: -1, bottom: 0 },
  });
});

test('Mount Hood units preserve APK marker IDs, names, cells, and all 16 unlock snapshots', () => {
  const markerGroups = [
    [96, 'gunslinger', 4],
    [97, 'mexican', 4],
    [98, 'cannon', 4],
    [99, 'indian', 4],
    [100, 'sniper', 4],
    [101, 'grandpa', 4],
    [130, 'pyromaniac', 4],
    [131, 'salesman', 4],
  ] as const;

  for (let mask = 0; mask < 16; mask += 1) {
    const snapshot = {
      grandpa: (mask & 1) !== 0,
      sniper: (mask & 2) !== 0,
      pyromaniac: (mask & 4) !== 0,
      salesman: (mask & 8) !== 0,
    };
    const completed = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
    const restored = mississippiUnitUnlockSnapshotFor(completed);
    const units = createOregon07MapContent((unitTypeId) => mississippiUnitUnlocked(unitTypeId, restored)).units;
    const hires = expectedHireCounts(mask);
    assert.equal(units.length, 49 + Object.values(hires).reduce((sum, count) => sum + count, 0));
    assert.equal(new Set(units.map(({ id }) => id)).size, units.length);

    for (const [marker, type, activity] of markerGroups) {
      const actual = units.filter((unit) => unit.type === type && unit.activity === activity);
      const unlocked = type === 'sniper' ? snapshot.sniper
        : type === 'grandpa' ? snapshot.grandpa
          : type === 'pyromaniac' ? snapshot.pyromaniac
            : type === 'salesman' ? snapshot.salesman : true;
      assert.deepEqual(actual.map(({ cell }) => cell), unlocked ? cellsForMarker(marker) : [], `mask ${mask}, tile ${marker}`);
    }
    assert.equal(units.filter(({ activity, movementGroupId }) => activity === 5 && !movementGroupId).length, 0);
  }
});

test('Mount Hood creates two independent five-piece horizontal train groups from the TDM', () => {
  const units = createOregon07MapContent(() => true).units;
  const trains = units.filter(({ movementGroupId }) => movementGroupId !== undefined);
  assert.deepEqual(trains.map(({ movementGroupId, type, activity, cell, asset }) => ({
    movementGroupId, type, activity, cell, asset,
  })), [
    { movementGroupId: trainGroupIds[0], type: 'train-10', activity: 5, cell: { x: 15, y: 7 }, asset: 'lok_hori_1of2' },
    { movementGroupId: trainGroupIds[0], type: 'train-11', activity: 5, cell: { x: 16, y: 7 }, asset: 'lok_hori_2of2' },
    ...[17, 18, 19].map((x) => ({
      movementGroupId: trainGroupIds[0], type: 'train-12', activity: 4, cell: { x, y: 7 }, asset: 'lok_wagon_hori',
    })),
    { movementGroupId: trainGroupIds[1], type: 'train-10', activity: 5, cell: { x: 6, y: 18 }, asset: 'lok_hori_1of2' },
    { movementGroupId: trainGroupIds[1], type: 'train-11', activity: 5, cell: { x: 7, y: 18 }, asset: 'lok_hori_2of2' },
    ...[8, 9, 10].map((x) => ({
      movementGroupId: trainGroupIds[1], type: 'train-12', activity: 4, cell: { x, y: 18 }, asset: 'lok_wagon_hori',
    })),
  ]);
  assert.deepEqual([...new Set(trains.map(({ movementGroupId }) => movementGroupId))], [...trainGroupIds]);
  assert.ok(trains.every(({ movementAxis, movementSpeedFinePer100Ms, collisionBoxFine }) => (
    movementAxis === 'horizontal'
    && movementSpeedFinePer100Ms === 3000
    && JSON.stringify(collisionBoxFine) === JSON.stringify({ x: -3840, y: -4608, width: 7680, height: 4608 })
  )));
  assert.ok(trains.filter(({ type }) => type === 'train-12').every(({ hirePrice, weapon }) => (
    hirePrice === 125 && weapon?.damage === 125
  )));
  assert.ok(trains.filter(({ type }) => type !== 'train-12').every(({ hirePrice, weapon }) => (
    hirePrice === undefined && weapon === undefined
  )));
});

test('each Mount Hood train group moves independently and keeps rigid wagon spacing', async () => {
  const scenario = createTrainScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    const initial = session.observe().units;
    const firstGroup = initial.filter(({ movementGroupId }) => movementGroupId === trainGroupIds[0]);
    const secondGroup = initial.filter(({ movementGroupId }) => movementGroupId === trainGroupIds[1]);
    const locomotive = firstGroup[0]!;
    session.submitIntent({ type: 'select-at', x: locomotive.cell.x + 0.5, y: locomotive.cell.y + 0.5 });
    session.advance({ deltaMs: 0 });
    session.submitIntent({ type: 'move-unit', targetX: locomotive.cell.x + 3.5, targetY: locomotive.cell.y - 10 });

    const moved = session.advance({ deltaMs: 100 }).units;
    const movedFirst = moved.filter(({ movementGroupId }) => movementGroupId === trainGroupIds[0]);
    const unchangedSecond = moved.filter(({ movementGroupId }) => movementGroupId === trainGroupIds[1]);
    assert.deepEqual(movedFirst.map(({ positionFine }, index) => ({
      x: positionFine.x - firstGroup[index]!.positionFine.x,
      y: positionFine.y - firstGroup[index]!.positionFine.y,
    })), movedFirst.map(() => ({ x: 3000, y: 0 })));
    assert.deepEqual(unchangedSecond.map(({ positionFine }) => positionFine), secondGroup.map(({ positionFine }) => positionFine));
    assert.deepEqual(movedFirst.slice(1).map(({ positionFine }, index) => (
      positionFine.x - movedFirst[index]!.positionFine.x
    )), movedFirst.slice(1).map(() => 7680));
  } finally {
    session.close();
  }
});

test('Mount Hood Dynamite pairs each TDM trigger to its nearest box and follows the shared unlock gate', () => {
  const locked = createOregon07Dynamite([]);
  assert.equal(locked.unlocked, false);
  assert.deepEqual(locked.pairs, [
    { id: 'dynamite-1', triggerCell: { x: 11, y: 12 }, boxCell: { x: 10, y: 13 } },
    { id: 'dynamite-2', triggerCell: { x: 26, y: 12 }, boxCell: { x: 25, y: 13 } },
  ]);
  assert.equal(createOregon07Dynamite(['campaign-mississippi-10']).unlocked, true);
  assert.equal(createOregon07Dynamite(['campaign-oregon-10']).unlocked, true);
});
