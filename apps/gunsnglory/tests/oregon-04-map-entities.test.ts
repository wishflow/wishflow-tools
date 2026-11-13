import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-04.json';
import { createOregon04MapContent } from '../src/content/oregon-04-map-entities';
import { oregon04CampaignUnitPool } from '../src/content/oregon-04-unit-pool';

function cellsForMarker(marker: number): { x: number; y: number }[] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === marker ? [{ x, y }] : []
  )));
}

test('Fort Echo decorations and real Fort spawn point match every TDM marker', () => {
  const scene = createOregon04MapContent(() => true).scene;
  const expectations = [
    [72, 'b_1x1_stake'],
    [79, 'e_1x1_tree_green_a'],
    [113, 'b_3x2_fort'],
    [115, 'e_1x1_tree_green_b'],
    [117, 'b_1x1_tipi_small'],
    [118, 'e_1x1_tree_stump'],
    [119, 'e_1x1_tree_green_c'],
  ] as const;

  for (const [marker, asset] of expectations) {
    const decorations = scene.decorations?.filter(({ asset: actualAsset }) => actualAsset === asset) ?? [];
    assert.deepEqual(decorations.map(({ cell }) => cell), cellsForMarker(marker), `TDM marker ${marker} maps to ${asset}`);
  }
  assert.equal(scene.decorations?.length, 29);
  assert.deepEqual(scene.decorations?.find(({ asset }) => asset === 'b_1x1_stake'), {
    asset: 'b_1x1_stake',
    cell: { x: 17, y: 3 },
    collisionBoxFine: { x: 1920, y: 2612, width: 3840, height: 2534 },
  });
  assert.equal(scene.decorations?.filter(({ asset }) => asset === 'b_3x2_fort').length, 1);
});

test('Fort Echo new hires, active units, and four unlock gates match TDM markers', () => {
  const markerGroups = [
    [96, 'gunslinger', 4],
    [98, 'cannon', 4],
    [99, 'indian', 4],
    [100, 'sniper', 4],
    [101, 'grandpa', 4],
    [104, 'gunslinger', 5],
    [107, 'indian', 5],
    [130, 'pyromaniac', 4],
    [131, 'salesman', 4],
  ] as const;
  const allUnlocked = createOregon04MapContent(() => true);
  assert.equal(allUnlocked.units.length, 38);
  assert.equal(new Set(allUnlocked.units.map(({ id }) => id)).size, allUnlocked.units.length);
  for (const [marker, type, activity] of markerGroups) {
    const actual = allUnlocked.units.filter((unit) => unit.type === type && unit.activity === activity);
    assert.deepEqual(actual.map(({ cell }) => cell), cellsForMarker(marker), `TDM marker ${marker} creates ${type}`);
  }
  assert.equal(allUnlocked.units.filter(({ type, activity }) => type === 'cannon' && activity === 4).length, 3);
  assert.equal(allUnlocked.units.some(({ id }) => id === oregon04CampaignUnitPool.units[0]?.template?.id), false, 'pool-only Cannon template is not a map entity');

  const gatedMarkers = [
    [100, 'sniper', 5],
    [101, 'grandpa', 6],
    [130, 'pyromaniac', 35],
    [131, 'salesman', 36],
  ] as const;
  const gatedCounts = [1, 8, 1, 1];
  for (let mask = 0; mask < 16; mask += 1) {
    const current = createOregon04MapContent((unitTypeId) => {
      const gateIndex = gatedMarkers.findIndex(([, , gatedTypeId]) => gatedTypeId === unitTypeId);
      return gateIndex < 0 || (mask & (1 << gateIndex)) !== 0;
    });
    let expectedCount = 27;
    for (const [index, [marker, type, unitTypeId]] of gatedMarkers.entries()) {
      const unlocked = (mask & (1 << index)) !== 0;
      if (unlocked) expectedCount += gatedCounts[index]!;
      assert.deepEqual(
        current.units.filter((unit) => unit.type === type && unit.activity === 4).map(({ cell }) => cell),
        unlocked ? cellsForMarker(marker) : [],
        `mask ${mask} applies unlock state to type ${unitTypeId}`,
      );
    }
    assert.equal(current.units.length, expectedCount, `mask ${mask} produces only the units backed by its unlocked TDM markers`);
  }
});

test('Fort Echo Cannon pool template is attached to the sole real Fort marker', () => {
  assert.deepEqual(cellsForMarker(113), [{ x: 10, y: 12 }]);
  assert.deepEqual(oregon04CampaignUnitPool.spawnLocations, [
    { id: 'fort-10-12', spawnLocationType: 2, cell: { x: 10, y: 12 } },
  ]);
  assert.equal(oregon04CampaignUnitPool.intervalMs, 15_000, 'uses the existing web pool cadence, not an APK-verified per-level timer');
  assert.equal(oregon04CampaignUnitPool.units.length, 1);
  assert.equal(oregon04CampaignUnitPool.units[0]?.poolType, 3);
  assert.equal(oregon04CampaignUnitPool.units[0]?.unitType, 'cannon');
  assert.equal(oregon04CampaignUnitPool.units[0]?.spawnLocationType, 2);
  assert.equal(oregon04CampaignUnitPool.units[0]?.template?.type, 'cannon');
  assert.equal(oregon04CampaignUnitPool.units[0]?.template?.activity, 5);
  assert.deepEqual(oregon04CampaignUnitPool.units[0]?.template?.cell, { x: 10, y: 12 });
  assert.deepEqual(oregon04CampaignUnitPool.actions, [
    { waveNumber: 1, action: 'set', values: [
      { poolType: 3, count: 0 },
    ] },
    { waveNumber: 1, action: 'set-max', values: [
      { poolType: 3, count: 4 },
    ] },
  ]);
});
