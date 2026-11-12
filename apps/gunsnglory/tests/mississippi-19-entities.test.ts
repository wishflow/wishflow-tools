import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-19.json';
import { createMississippi19MapScene } from '../src/content/mississippi-19-scene';
import { createMississippi19MapUnits } from '../src/content/mississippi-19-units';
import { mississippi19CampaignUnitPool } from '../src/content/mississippi-19-unit-pool';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function markerCells(code: number): [number, number][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((value, x) => (
    value === code ? [[x, y] as [number, number]] : []
  )));
}

function unitCells(units: ReturnType<typeof createMississippi19MapUnits>, type: string, activity: number): [number, number][] {
  return units.filter((unit) => unit.type === type && unit.activity === activity)
    .map(({ cell }) => [cell.x, cell.y] as [number, number]);
}

test('Dust Falls Tipi decoration follows the single original marker and anchor', () => {
  const scene = createMississippi19MapScene();
  const tipis = scene.decorations?.filter(({ asset }) => asset === 'b_2x1_tipi') ?? [];

  assert.deepEqual(tipis.map(({ cell }) => [cell.x, cell.y]), markerCells(114));
  assert.deepEqual(tipis.map(({ anchorOffsetX, anchorOffsetY }) => [anchorOffsetX, anchorOffsetY]), [[-0.5, -0.3]]);
  assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath('b_2x1_tipi'))));
});

test('Dust Falls fresh units follow new-game markers and gate milestone hires', () => {
  const fresh = createMississippi19MapUnits();
  assert.deepEqual(unitCells(fresh, 'mexican', 5), markerCells(105));
  assert.deepEqual(unitCells(fresh, 'gunslinger', 4), markerCells(96));
  assert.deepEqual(unitCells(fresh, 'mexican', 4), markerCells(97));
  assert.deepEqual(unitCells(fresh, 'indian', 4), markerCells(99));
  assert.deepEqual(unitCells(fresh, 'sniper', 4), []);
  assert.deepEqual(unitCells(fresh, 'grandpa', 4), []);
  assert.deepEqual(unitCells(fresh, 'pyromaniac', 4), []);
  assert.deepEqual(unitCells(fresh, 'salesman', 4), []);
  assert.deepEqual(unitCells(fresh, 'indian', 5), []);
  assert.equal(fresh.length, 20);

  const pyromaniacUnlocked = createMississippi19MapUnits(['campaign-nevada-10']);
  assert.deepEqual(unitCells(pyromaniacUnlocked, 'pyromaniac', 4), markerCells(130));
  assert.deepEqual(unitCells(pyromaniacUnlocked, 'salesman', 4), []);
  const salesmanUnlocked = createMississippi19MapUnits(['campaign-alaska-10']);
  assert.deepEqual(unitCells(salesmanUnlocked, 'salesman', 4), markerCells(131));
  assert.deepEqual(unitCells(salesmanUnlocked, 'pyromaniac', 4), []);
  const sniperUnlocked = createMississippi19MapUnits(['campaign-dakota-10']);
  assert.deepEqual(unitCells(sniperUnlocked, 'sniper', 4), markerCells(100));
  const grandpaUnlocked = createMississippi19MapUnits(['campaign-oregon-10']);
  assert.deepEqual(unitCells(grandpaUnlocked, 'grandpa', 4), markerCells(101));

  const allUnlocked = createMississippi19MapUnits([
    'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10',
  ]);
  assert.deepEqual(unitCells(allUnlocked, 'gunslinger', 4), markerCells(96));
  assert.deepEqual(unitCells(allUnlocked, 'mexican', 4), markerCells(97));
  assert.deepEqual(unitCells(allUnlocked, 'indian', 4), markerCells(99));
  assert.deepEqual(unitCells(allUnlocked, 'sniper', 4), markerCells(100));
  assert.deepEqual(unitCells(allUnlocked, 'grandpa', 4), markerCells(101));
  assert.deepEqual(unitCells(allUnlocked, 'pyromaniac', 4), [[21, 17]]);
  assert.deepEqual(unitCells(allUnlocked, 'salesman', 4), [[4, 9]]);
  assert.equal(allUnlocked.length, 26);
  assert.equal(new Set(allUnlocked.map(({ id }) => id)).size, allUnlocked.length);
  const assets = new Set(allUnlocked.flatMap(({ asset, awakeAsset }) => [asset, ...(awakeAsset ? [awakeAsset] : [])]));
  for (const asset of assets) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
});

test('Dust Falls has only the real Tipi location and a pool-only Indian template', () => {
  assert.equal(mississippi19CampaignUnitPool.intervalMs, 15_000);
  assert.deepEqual(mississippi19CampaignUnitPool.spawnLocations, [{
    id: 'tipi-6-6',
    spawnLocationType: 3,
    cell: { x: 6, y: 6 },
  }]);
  assert.equal(mississippi19CampaignUnitPool.units.length, 1);
  const [indianPool] = mississippi19CampaignUnitPool.units;
  assert.deepEqual({
    poolType: indianPool?.poolType,
    unitType: indianPool?.unitType,
    spawnLocationType: indianPool?.spawnLocationType,
    templateType: indianPool?.template?.type,
    templateActivity: indianPool?.template?.activity,
    templateCell: indianPool?.template?.cell,
    templateAsset: indianPool?.template?.asset,
  }, {
    poolType: 4,
    unitType: 'indian',
    spawnLocationType: 3,
    templateType: 'indian',
    templateActivity: 5,
    templateCell: { x: 6, y: 6 },
    templateAsset: 'player_indian',
  });
});
