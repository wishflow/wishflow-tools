import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/nevada-01.json';
import { nevada01LevelParameters, nevada01LevelParametersRaw } from '../src/content/nevada-01-campaign-rules';
import { nevada01Dynamite } from '../src/content/nevada-01-dynamite';
import { createNevada01MapUnits } from '../src/content/nevada-01-units';
import { nevada01CampaignUnitPool } from '../src/content/nevada-01-unit-pool';
import {
  advanceCampaignUnitPool,
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
  queueCampaignUnitForSpawn,
} from '../src/game/campaign-unit-pool';

test('Labyrinth Gulch preserves its raw level row and only names fields with confirmed meaning', () => {
  assert.deepEqual(nevada01LevelParametersRaw, [
    150, 25, 999, 25_000, 3, 30_000, 5, 15, 75, 100, 140, 119_000,
  ]);
  assert.deepEqual(nevada01LevelParameters, {
    initialCash: 150,
    initialLives: 25,
    maxChests: 999,
    chestIntervalMs: 25_000,
    maxUpgrades: 3,
    awesomeMessageMin: 30_000,
    awesomeMessageUnit: 5,
    maxChestsPlayfield: 15,
    enemyHitPointMultiplierPercentByDifficulty: {
      easy: 75,
      medium: 100,
      hard: 140,
    },
    gamblerCooldownMs: 119_000,
  });
});

test('fresh Labyrinth Gulch TDM objects include the level-41 Pyromaniac, not saved unit slots', () => {
  const savedUnitSlots = map.originalTileGrid.flat().filter((code) => (
    (code >= 96 && code <= 101) || code === 130 || code === 131
  ));
  assert.equal(savedUnitSlots.length, 32);

  assert.deepEqual(createNevada01MapUnits().map(({ type, activity, asset, cell }) => ({
    type,
    activity,
    asset,
    cell,
  })), [{
    type: 'pyromaniac',
    activity: 5,
    asset: 'player_pyromaniac',
    cell: { x: 27, y: 11 },
  }]);
});

test('Labyrinth Gulch pairs its actual Dynamite markers and maps its three hiring buildings', () => {
  assert.equal(nevada01Dynamite.unlocked, true);
  assert.deepEqual(nevada01Dynamite.pairs, [{
    id: 'dynamite-1',
    triggerCell: { x: 3, y: 13 },
    boxCell: { x: 2, y: 13 },
  }]);

  assert.deepEqual(nevada01CampaignUnitPool.spawnLocations.map(({ id, spawnLocationType, cell }) => ({
    id,
    spawnLocationType,
    cell,
  })), [
    { id: 'fort', spawnLocationType: 2, cell: { x: 2, y: 7 } },
    { id: 'saloon', spawnLocationType: 1, cell: { x: 2, y: 17 } },
    { id: 'tipi', spawnLocationType: 3, cell: { x: 28, y: 21 } },
  ]);
});

test('Wave 1 resets all pool slots and caps each mapped unit type at four', () => {
  const runtime = createCampaignUnitPoolRuntime(nevada01CampaignUnitPool);
  assert.ok(runtime);
  runtime.pending[9] = 8;
  runtime.maximum[30] = 2;

  applyCampaignUnitPoolActions(runtime, nevada01CampaignUnitPool, 1);

  assert.deepEqual(runtime.pending, Array<number>(37).fill(0));
  assert.deepEqual(runtime.maximum, Array.from({ length: 37 }, (_, index) => (
    index >= 1 && index <= 4 ? 4 : 0
  )));
  assert.deepEqual(nevada01CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType, template }) => ({
    poolType,
    unitType,
    spawnLocationType,
    templateType: template?.type,
  })), [
    { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1, templateType: 'gunslinger' },
    { poolType: 2, unitType: 'mexican', spawnLocationType: 1, templateType: 'mexican' },
    { poolType: 3, unitType: 'cannon', spawnLocationType: 2, templateType: 'cannon' },
    { poolType: 4, unitType: 'indian', spawnLocationType: 3, templateType: 'indian' },
  ]);
});

test('each hired player unit is dispatched from the real TDM building for its pool type', () => {
  const runtime = createCampaignUnitPoolRuntime(nevada01CampaignUnitPool);
  assert.ok(runtime);
  applyCampaignUnitPoolActions(runtime, nevada01CampaignUnitPool, 1);
  const actualDispatches = [];
  const deterministicRandom = { nextInt: () => 0 };

  for (const entry of nevada01CampaignUnitPool.units) {
    queueCampaignUnitForSpawn(runtime, nevada01CampaignUnitPool, entry.unitType);
    runtime.remainingMs = 1;
    advanceCampaignUnitPool(runtime, nevada01CampaignUnitPool, 2, deterministicRandom, () => false);
    actualDispatches.push(...advanceCampaignUnitPool(
      runtime,
      nevada01CampaignUnitPool,
      1_500,
      deterministicRandom,
      () => false,
    ));
  }

  assert.deepEqual(actualDispatches.map(({ unitType, cell }) => ({ unitType, cell })), [
    { unitType: 'gunslinger', cell: { x: 2, y: 17 } },
    { unitType: 'mexican', cell: { x: 2, y: 17 } },
    { unitType: 'cannon', cell: { x: 2, y: 7 } },
    { unitType: 'indian', cell: { x: 28, y: 21 } },
  ]);
});
