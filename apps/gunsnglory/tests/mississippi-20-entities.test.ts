import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-20.json';
import { createMississippi20MapScene } from '../src/content/mississippi-20-scene';
import { createMississippi20MapUnits } from '../src/content/mississippi-20-units';
import { mississippi20CampaignUnitPool } from '../src/content/mississippi-20-unit-pool';
import { createMississippi20SteamerUnits } from '../src/content/mississippi-20-steamer';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function markerCells(code: number): [number, number][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((value, x) => (
    value === code ? [[x, y] as [number, number]] : []
  )));
}

function unitCells(units: ReturnType<typeof createMississippi20MapUnits>, type: string, activity: number): [number, number][] {
  return units.filter((unit) => unit.type === type && unit.activity === activity)
    .map(({ cell }) => [cell.x, cell.y] as [number, number]);
}

test('Horse Hills scenery follows the original Mississippi object markers', () => {
  const scene = createMississippi20MapScene();
  const assetByMarker = new Map([
    [68, 'e_1x1_cactus_a'], [71, 'e_1x1_tree'], [73, 'e_1x1_cactus_b'],
    [76, 'e_1x1_bush'], [77, 'e_1x2_bones'], [114, 'b_2x1_tipi'], [126, 'e_1x1_rocks_water'],
  ]);
  for (const [marker, asset] of assetByMarker) {
    const decorations = scene.decorations?.filter((decoration) => decoration.asset === asset) ?? [];
    assert.deepEqual(decorations.map(({ cell }) => [cell.x, cell.y]), markerCells(marker), `marker ${marker}`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
  const tipis = scene.decorations?.filter(({ asset }) => asset === 'b_2x1_tipi') ?? [];
  assert.deepEqual(tipis.map(({ anchorOffsetX, anchorOffsetY }) => [anchorOffsetX, anchorOffsetY]), [[-0.5, -0.3]]);
});

test('Horse Hills fresh units preserve active markers and gate only locked hires', () => {
  const fresh = createMississippi20MapUnits();
  assert.deepEqual(unitCells(fresh, 'gunslinger', 4), markerCells(96));
  assert.deepEqual(unitCells(fresh, 'mexican', 4), markerCells(97));
  assert.deepEqual(unitCells(fresh, 'cannon', 4), markerCells(98));
  assert.deepEqual(unitCells(fresh, 'indian', 4), markerCells(99));
  assert.deepEqual(unitCells(fresh, 'sniper', 4), []);
  assert.deepEqual(unitCells(fresh, 'grandpa', 4), []);
  assert.deepEqual(unitCells(fresh, 'pyromaniac', 4), []);
  assert.deepEqual(unitCells(fresh, 'salesman', 4), []);
  assert.deepEqual(unitCells(fresh, 'cannon', 5), markerCells(106));
  assert.deepEqual(unitCells(fresh, 'grandpa', 5), markerCells(109));
  assert.equal(fresh.length, 26);
  assert.equal(new Set(fresh.map(({ id }) => id)).size, fresh.length);

  const allUnlocked = createMississippi20MapUnits([
    'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10',
  ]);
  assert.deepEqual(unitCells(allUnlocked, 'sniper', 4), markerCells(100));
  assert.deepEqual(unitCells(allUnlocked, 'grandpa', 4), markerCells(101));
  assert.deepEqual(unitCells(allUnlocked, 'pyromaniac', 4), markerCells(130));
  assert.deepEqual(unitCells(allUnlocked, 'salesman', 4), markerCells(131));
  assert.deepEqual(unitCells(allUnlocked, 'grandpa', 5), markerCells(109));
  assert.equal(allUnlocked.length, 32);
  assert.equal(new Set(allUnlocked.map(({ id }) => id)).size, allUnlocked.length);
  const assets = new Set(allUnlocked.flatMap(({ asset, awakeAsset }) => [asset, ...(awakeAsset ? [awakeAsset] : [])]));
  for (const asset of assets) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
});

test('Horse Hills Steamer is one six-piece movement group with three hireable Cannons', () => {
  const steamers = createMississippi20SteamerUnits();
  assert.equal(steamers.length, 6);
  assert.equal(new Set(steamers.map(({ id }) => id)).size, 6);
  assert.equal(new Set(steamers.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.deepEqual(steamers.map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]), [
    ['steamer-30', 5, 12, 3], ['steamer-31', 5, 13, 3],
    ['steamer-32', 4, 14, 3], ['steamer-32', 4, 15, 3], ['steamer-32', 4, 16, 3],
    ['steamer-33', 5, 17, 3],
  ]);
  assert.ok(steamers.every(({ movementSurface, movementAxis }) => movementSurface === 'water' && movementAxis === 'horizontal'));
  assert.equal(steamers.filter(({ type, activity }) => type === 'steamer-32' && activity === 4).length, 3);
});

test('Horse Hills Indian pool uses its only Tipi and keeps its template out of fresh units', () => {
  assert.equal(mississippi20CampaignUnitPool.intervalMs, 15_000);
  assert.deepEqual(mississippi20CampaignUnitPool.spawnLocations, [{
    id: 'tipi-28-17', spawnLocationType: 3, cell: { x: 28, y: 17 },
  }]);
  assert.deepEqual(mississippi20CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType, template }) => ({
    poolType,
    unitType,
    spawnLocationType,
    templateType: template?.type,
    templateActivity: template?.activity,
    templateCell: template?.cell,
    templateAsset: template?.asset,
  })), [{
    poolType: 4,
    unitType: 'indian',
    spawnLocationType: 3,
    templateType: 'indian',
    templateActivity: 5,
    templateCell: { x: 28, y: 17 },
    templateAsset: 'player_indian',
  }]);
  assert.deepEqual(unitCells(createMississippi20MapUnits(), 'indian', 5), []);
});
