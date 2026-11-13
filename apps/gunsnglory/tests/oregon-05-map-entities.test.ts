import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent } from '../src/game';
import map from '../src/content/oregon-05.json';
import { createOregon05Dynamite } from '../src/content/oregon-05-dynamite';
import { createOregon05MapContent } from '../src/content/oregon-05-map-entities';
import { createOregon05MapScene } from '../src/content/oregon-05-scene';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlocked,
} from '../src/content/mississippi-unit-unlocks';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function cellsForMarker(marker: number): { x: number; y: number }[] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === marker ? [{ x, y }] : []
  )));
}

test('Dynamite Plains Oregon and shared decorations match every TDM marker', () => {
  const scene = createOregon05MapContent(() => true).scene;
  const expectations = [
    [68, 'e_1x1_cactus_a'],
    [72, 'b_1x1_stake'],
    [74, 'b_1x1_windmill'],
    [77, 'e_1x2_bones'],
    [79, 'e_1x1_tree_green_a'],
    [112, 'b_3x2_saloon'],
    [114, 'b_2x1_tipi'],
    [115, 'e_1x1_tree_green_b'],
    [117, 'b_1x1_tipi_small'],
    [118, 'e_1x1_tree_stump'],
    [119, 'e_1x1_tree_green_c'],
  ] as const;

  for (const [marker, asset] of expectations) {
    const decorations = scene.decorations?.filter(({ asset: actualAsset }) => actualAsset === asset) ?? [];
    assert.deepEqual(decorations.map(({ cell }) => cell), cellsForMarker(marker), `TDM marker ${marker} maps to ${asset}`);
  }
  assert.equal(scene.decorations?.length, 37);
  assert.deepEqual(scene.decorations?.find(({ asset }) => asset === 'b_1x1_stake'), {
    asset: 'b_1x1_stake',
    cell: { x: 30, y: 4 },
    collisionBoxFine: { x: 1920, y: 2612, width: 3840, height: 2534 },
  });
  assert.equal(scene.decorations?.some(({ asset }) => asset === 'b_3x2_fort'), false, 'the map has no Fort marker');
  assert.equal(scene.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false, 'the map has no Casino marker');
  for (const asset of new Set(scene.decorations?.map(({ asset }) => asset) ?? [])) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
});

test('Dynamite Plains fresh hires and special-unit gates match all TDM markers', () => {
  const markerGroups = [
    [96, 'gunslinger', 4],
    [97, 'mexican', 4],
    [98, 'cannon', 4],
    [99, 'indian', 4],
    [100, 'sniper', 4],
    [101, 'grandpa', 4],
    [104, 'gunslinger', 5],
    [130, 'pyromaniac', 4],
    [131, 'salesman', 4],
  ] as const;
  const allUnlocked = createOregon05MapContent(() => true).units;
  assert.equal(allUnlocked.length, 31);
  assert.equal(new Set(allUnlocked.map(({ id }) => id)).size, allUnlocked.length);
  for (const [marker, type, activity] of markerGroups) {
    assert.deepEqual(
      allUnlocked.filter((unit) => unit.type === type && unit.activity === activity).map(({ cell }) => cell),
      cellsForMarker(marker),
      `TDM marker ${marker} creates ${type}`,
    );
  }
  assert.equal(allUnlocked.filter(({ type, activity }) => type === 'cannon' && activity === 4).length, 3);
  assert.equal(allUnlocked.some(({ type, activity }) => type === 'cannon' && activity === 5), false);
  assert.equal(allUnlocked.some(({ type }) => type === 'gambler'), false);

  const gatedMarkers = [
    [100, 'sniper', 5],
    [101, 'grandpa', 6],
    [130, 'pyromaniac', 35],
    [131, 'salesman', 36],
  ] as const;
  const addedCounts = [1, 5, 2, 1];
  for (let mask = 0; mask < 16; mask += 1) {
    const snapshot = {
      grandpa: (mask & 2) !== 0,
      sniper: (mask & 1) !== 0,
      pyromaniac: (mask & 4) !== 0,
      salesman: (mask & 8) !== 0,
    };
    const completed = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
    const restored = mississippiUnitUnlockSnapshotFor(completed);
    const units = createOregon05MapContent((unitTypeId) => mississippiUnitUnlocked(unitTypeId, restored)).units;
    let expectedCount = 22;

    for (const [index, [marker, type, unitTypeId]] of gatedMarkers.entries()) {
      const unlocked = mississippiUnitUnlocked(unitTypeId, restored);
      if (unlocked) expectedCount += addedCounts[index]!;
      assert.deepEqual(
        units.filter((unit) => unit.type === type && unit.activity === 4).map(({ cell }) => cell),
        unlocked ? cellsForMarker(marker) : [],
        `mask ${mask} applies the unlock state to ${type}`,
      );
    }
    assert.equal(units.length, expectedCount, `mask ${mask} only creates units backed by unlocked TDM markers`);
  }
});

test('Dynamite Plains uses the audited trigger-to-box pairs and original unlock gate', () => {
  const locked = createOregon05Dynamite([]);
  assert.equal(locked.unlocked, false);
  assert.deepEqual(locked.pairs, [
    { id: 'dynamite-1', triggerCell: { x: 10, y: 6 }, boxCell: { x: 7, y: 6 } },
    { id: 'dynamite-2', triggerCell: { x: 20, y: 6 }, boxCell: { x: 23, y: 6 } },
    { id: 'dynamite-3', triggerCell: { x: 15, y: 11 }, boxCell: { x: 15, y: 15 } },
  ]);
  assert.equal(createOregon05Dynamite(['campaign-mississippi-10']).unlocked, true);
  assert.equal(createOregon05Dynamite(['campaign-oregon-10']).unlocked, true);
});

test('Dynamite Plains trigger damages an enemy exactly three tiles from its paired box', async () => {
  const content: ScenarioContent = {
    id: 'oregon-05-dynamite-fixture',
    contentVersion: 'oregon-05-dynamite-fixture-v1',
    title: { en: 'Dynamite Plains fixture', zh: '炸药平原样本' },
    map: createOregon05MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [],
    dynamite: createOregon05Dynamite(['campaign-mississippi-10']),
    previewWave: {
      ...cowGulchPreviewWave,
      initialLives: 1,
      initialCash: 65,
      spawn: { cell: { x: 12, y: 6 }, direction: 'west' },
      additionalSpawns: [],
      baseEnemySpeed: 0,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      redirects: [],
      exit: { x: 31, y: 6 },
      enemy: {
        hitPoints: 5_000,
        cashReward: 0,
        penetration: { light: 100, fire: 100, heavy: 25, poison: 100 },
      },
    },
  };
  const session = await createGame({ scenarios: { [content.id]: content } })
    .open({ scenarioId: content.id, randomSeed: 11 });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  assert.deepEqual(view.enemies[0]?.positionFine, { x: 80_640, y: 49_920 });
  assert.equal(view.enemies[0]?.hitPoints, 5_000);

  session.submitIntent({ type: 'select-at', x: 10.5, y: 6.5 });
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.enemies[0]?.hitPoints, 3_750);
  assert.deepEqual(view.events.find((event) => event.type === 'dynamite-exploded'), {
    type: 'dynamite-exploded',
    dynamiteId: 'dynamite-1',
    affectedEnemyIds: [view.enemies[0]?.id],
  });
});

test('Dynamite Plains stake collider blocks player movement at its audited fine-unit bounds', async () => {
  const scene = createOregon05MapScene();
  const stake = scene.decorations?.find(({ asset }) => asset === 'b_1x1_stake');
  assert.ok(stake?.collisionBoxFine);
  const collisionScene = {
    ...scene,
    decorations: [stake],
    backgroundCollisionCodes: Array.from({ length: map.map.height }, () => Array<number>(map.map.width).fill(0)),
  };
  const unit = createActiveGunslinger({ x: 29, y: 4 });
  const content: ScenarioContent = {
    id: 'oregon-05-stake-collision-fixture',
    contentVersion: 'oregon-05-stake-collision-fixture-v1',
    title: { en: 'Dynamite Plains stake fixture', zh: '炸药平原木桩样本' },
    map: collisionScene,
    originalTileGrid: map.originalTileGrid,
    units: [unit],
  };
  const session = await createGame({ scenarios: { [content.id]: content } })
    .open({ scenarioId: content.id, randomSeed: 11 });
  session.submitIntent({ type: 'select-at', x: 29.5, y: 4.5 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'move-unit', targetX: 31.5, targetY: 4.5 });

  let view = session.advance({ deltaMs: 100 });
  for (let frame = 0; frame < 19; frame += 1) view = session.advance({ deltaMs: 100 });
  const stopped = view.units[0]!;
  const stakeLeft = (stake.cell.x * 7_680) + stake.collisionBoxFine.x;
  assert.ok(stopped.positionFine.x > (29.5 * 7_680), 'the unit can approach the stake');
  assert.ok(stopped.positionFine.x + 2_534 <= stakeLeft, 'the unit collider stops before overlapping the stake');
});
