import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-08.json';
import { createCampaignMapUnitPlacements } from '../src/content/campaign-map-unit-placements';
import { createOregon08MapContent } from '../src/content/oregon-08-map-entities';
import { createOregon08MapScene } from '../src/content/oregon-08-scene';
import { oregon08CampaignUnitPool } from '../src/content/oregon-08-unit-pool';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const decorationAssetByCode: Readonly<Record<number, string>> = Object.freeze({
  70: 'e_1x1_rocks_b',
  72: 'b_1x1_stake',
  79: 'e_1x1_tree_green_a',
  86: 'tiles_railway_buffers_hori_left',
  87: 'tiles_railway_buffers_hori_right',
  112: 'b_3x2_saloon',
  113: 'b_3x2_fort',
  114: 'b_2x1_tipi',
  115: 'e_1x1_tree_green_b',
  116: 'b_2x1_shack',
  117: 'b_1x1_tipi_small',
  118: 'e_1x1_tree_stump',
  119: 'e_1x1_tree_green_c',
  126: 'e_1x1_rocks_water',
});

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function unitsUnlocked(ids: readonly number[]) {
  const unlocks = new Set(ids);
  return (unitTypeId: number) => unlocks.has(unitTypeId);
}

test('Colt City map scenery matches every static object marker and preserves collision anchors', () => {
  const lockedScene = createOregon08MapScene();
  const unlockedScene = createOregon08MapScene(true);
  const markerDecorations = Object.entries(decorationAssetByCode).flatMap(([rawCode, asset]) => {
    const code = Number(rawCode);
    return map.originalTileGrid.flatMap((row, y) => row.flatMap((value, x) => (
      value === code ? [`${cellKey({ x, y })}:${asset}`] : []
    )));
  }).sort();
  const actualMarkerDecorations = (lockedScene.decorations ?? []).filter(({ asset }) => asset !== 'b_3x2_casino')
    .map(({ cell, asset }) => `${cellKey(cell)}:${asset}`).sort();
  assert.deepEqual(actualMarkerDecorations, markerDecorations);

  const stake = lockedScene.decorations?.find(({ cell, asset }) => cell.x === 27 && cell.y === 15 && asset === 'b_1x1_stake');
  assert.ok(stake);
  assert.deepEqual(stake.collisionBoxFine, { x: 1920, y: 2612, width: 3840, height: 2534 });
  assert.equal(lockedScene.decorations?.filter(({ asset }) => asset === 'b_3x2_casino').length, 0);
  assert.equal(unlockedScene.decorations?.filter(({ asset }) => asset === 'b_3x2_casino').length, 1);

  for (const { asset } of [...(lockedScene.decorations ?? []), ...(unlockedScene.decorations ?? [])]) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
});

test('Colt City hire units, unlock-gated Gambler, and the two-engine train use their real markers', () => {
  const locked = createOregon08MapContent(unitsUnlocked([1, 2, 3, 4]));
  assert.equal(locked.units.length, 26);
  assert.equal(locked.units.filter(({ type }) => type === 'gunslinger').length, 13);
  assert.equal(locked.units.filter(({ type }) => type === 'cannon').length, 3);
  assert.equal(locked.units.filter(({ type }) => type === 'indian').length, 6);
  assert.equal(locked.units.filter(({ type }) => type === 'gambler').length, 0);
  assert.equal(locked.gambler, undefined);
  assert.equal(locked.scene.decorations?.filter(({ asset }) => asset === 'b_3x2_casino').length, 0);
  assert.equal(new Set(locked.units.map(({ id }) => id)).size, locked.units.length);

  const unlocked = createOregon08MapContent(unitsUnlocked([1, 2, 3, 4, 5, 6, 9, 35, 36]));
  assert.equal(unlocked.units.length, 32);
  assert.equal(unlocked.units.filter(({ type }) => type === 'sniper').length, 1);
  assert.equal(unlocked.units.filter(({ type }) => type === 'grandpa').length, 2);
  assert.equal(unlocked.units.filter(({ type }) => type === 'pyromaniac').length, 1);
  assert.equal(unlocked.units.filter(({ type }) => type === 'salesman').length, 1);
  assert.equal(unlocked.units.filter(({ type }) => type === 'gambler').length, 1);
  assert.equal(unlocked.scene.decorations?.filter(({ asset }) => asset === 'b_3x2_casino').length, 1);
  assert.deepEqual(unlocked.gambler?.unlockedPrizeUnitTypes, [1, 2, 3, 4, 5, 6, 35, 36]);
  assert.deepEqual(Object.keys(unlocked.gambler?.prizeTemplates ?? {}).map(Number).sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 35, 36]);
  assert.equal(unlocked.gambler?.cooldownMs, 299_000);
  assert.equal(new Set(unlocked.units.map(({ id }) => id)).size, unlocked.units.length);

  const trains = unlocked.units.filter(({ movementGroupId }) => movementGroupId?.startsWith('oregon-08-train-'));
  assert.equal(trains.length, 4);
  assert.deepEqual(new Set(trains.map(({ movementGroupId }) => movementGroupId)), new Set(['oregon-08-train-1']));
  assert.deepEqual(trains.map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]), [
    ['train-10', 5, 1, 18],
    ['train-11', 5, 2, 18],
    ['train-12', 4, 3, 18],
    ['train-12', 4, 4, 18],
  ]);

  const placements = createCampaignMapUnitPlacements(map.originalTileGrid);
  const placementCounts = Object.fromEntries(
    [...new Set(placements.map(({ sourceCode }) => sourceCode))]
      .sort((left, right) => left - right)
      .map((sourceCode) => [sourceCode, placements.filter((placement) => placement.sourceCode === sourceCode).length]),
  );
  assert.deepEqual(placementCounts, { 96: 13, 98: 3, 99: 6, 100: 1, 101: 2, 130: 1, 131: 1, 132: 1 });
  const expectedMarkerCells: Readonly<Record<number, readonly string[]>> = {
    96: ['0,2', '3,3', '10,4', '15,4', '23,4', '24,6', '10,7', '30,11', '2,15', '26,20', '30,21', '13,22', '20,22'],
    98: ['12,3', '18,17', '8,21'],
    99: ['20,5', '2,8', '25,12', '28,13', '27,17', '10,22'],
    100: ['0,6'],
    101: ['7,11', '15,14'],
    130: ['1,23'],
    131: ['29,23'],
    132: ['2,1'],
  };
  for (const [rawCode, expectedCells] of Object.entries(expectedMarkerCells)) {
    const code = Number(rawCode);
    const markerPlacements = placements.filter(({ sourceCode }) => sourceCode === code);
    assert.deepEqual(markerPlacements.map(({ cell }) => cellKey(cell)).sort(), [...expectedCells].sort(),
      `TDM unit marker ${code} retains its audited coordinates`);
    assert.ok(markerPlacements.every(({ activity }) => activity === (code === 132 ? 5 : 4)),
      `TDM unit marker ${code} retains its activity`);
  }
  assert.equal(map.originalTileGrid.flat().some((code) => code >= 104 && code <= 109), false,
    'Colt City does not encode fresh player units as map markers');
});

test('Colt City pool definitions bind four types to the real Saloon, Fort, and Tipi markers', () => {
  assert.deepEqual(oregon08CampaignUnitPool.spawnLocations.map(({ id, spawnLocationType, cell }) => [
    id, spawnLocationType, cell.x, cell.y,
  ]), [
    ['saloon-25-3', 1, 25, 3],
    ['saloon-9-9', 1, 9, 9],
    ['fort-16-10', 2, 16, 10],
    ['tipi-27-12', 3, 27, 12],
  ]);
  assert.deepEqual(oregon08CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType }) => [
    poolType, unitType, spawnLocationType,
  ]), [
    [1, 'gunslinger', 1],
    [2, 'mexican', 1],
    [3, 'cannon', 2],
    [4, 'indian', 3],
  ]);
  const mexican = oregon08CampaignUnitPool.units.find(({ poolType }) => poolType === 2)?.template;
  assert.equal(mexican?.type, 'mexican', 'Mexican is supplied by the pool because TDM has no Mexican map marker');
  const cannon = oregon08CampaignUnitPool.units.find(({ poolType }) => poolType === 3)?.template;
  assert.equal(cannon?.type, 'cannon');
  assert.deepEqual(cannon?.cell, { x: 16, y: 10 });
  assert.equal(oregon08CampaignUnitPool.intervalMs, 15_000);
  assert.deepEqual(oregon08CampaignUnitPool.actions.map(({ action, waveNumber }) => [action, waveNumber]), [
    ['set', 1], ['set-max', 1],
  ]);
  const locked = createOregon08MapContent(unitsUnlocked([1, 2, 3, 4]));
  assert.equal(locked.units.filter(({ type }) => type === 'cannon').length, 3,
    'the Fort pool template is not also inserted as a fourth map Cannon');
  assert.equal(locked.units.some(({ id }) => id === 'cannon-map-01'), false);
});
