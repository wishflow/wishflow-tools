import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createMississippi18DynamiteDefinition } from '../src/content/mississippi-18-dynamite';
import { createMississippi18MapScene } from '../src/content/mississippi-18-scene';
import { createMississippi18MapUnits } from '../src/content/mississippi-18-units';
import map from '../src/content/mississippi-18.json';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function markerCells(code: number): [number, number][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((value, x) => (
    value === code ? [[x, y] as [number, number]] : []
  )));
}

function unitCells(units: ReturnType<typeof createMississippi18MapUnits>, type: string, activity: number): [number, number][] {
  return units.filter((unit) => unit.type === type && unit.activity === activity)
    .map(({ cell }) => [cell.x, cell.y] as [number, number]);
}

test('Shadow Town static buildings and decorations follow their TDM markers', () => {
  const scene = createMississippi18MapScene();
  const cellsForAsset = (asset: string) => scene.decorations
    ?.filter((item) => item.asset === asset)
    .map(({ cell }) => [cell.x, cell.y]);

  assert.deepEqual(cellsForAsset('b_3x2_saloon'), [[13, 7], [17, 13]]);
  assert.deepEqual(cellsForAsset('b_3x2_fort'), [[20, 8]]);
  assert.deepEqual(cellsForAsset('b_2x1_shack'), [[10, 9], [17, 9], [13, 12], [22, 12]]);
  assert.deepEqual(markerCells(116), [[10, 9], [17, 9], [13, 12], [22, 12]]);
  assert.equal(markerCells(116).length, 4);
  for (const [code, asset] of [
    [68, 'e_1x1_cactus_a'], [71, 'e_1x1_tree'], [73, 'e_1x1_cactus_b'],
    [74, 'b_1x1_windmill'], [75, 'b_1x1_watertower'], [76, 'e_1x1_bush'], [77, 'e_1x2_bones'],
  ] as const) {
    assert.deepEqual(cellsForAsset(asset), markerCells(code), `marker ${code} maps to ${asset}`);
  }

  const shacks = scene.decorations?.filter(({ asset }) => asset === 'b_2x1_shack') ?? [];
  assert.ok(shacks.every(({ anchorOffsetX, collisionBoxFine, fieldBlockBounds }) => (
    anchorOffsetX === -0.5
      && collisionBoxFine?.x === -3840
      && collisionBoxFine.y === -1228
      && collisionBoxFine.width === 15360
      && collisionBoxFine.height === 3840
      && fieldBlockBounds?.left === -1
      && fieldBlockBounds.right === 1
      && fieldBlockBounds.top === 0
      && fieldBlockBounds.bottom === 0
  )), 'the wide shack keeps its original anchor and occupied cells');
});

test('Shadow Town fresh-game units follow hire markers and gate global milestone units', () => {
  const fresh = createMississippi18MapUnits();
  assert.deepEqual(unitCells(fresh, 'gunslinger', 5), [[9, 10], [17, 10], [22, 13]]);
  assert.deepEqual(unitCells(fresh, 'mexican', 4), markerCells(97));
  assert.deepEqual(unitCells(fresh, 'indian', 4), markerCells(99));
  assert.deepEqual(unitCells(fresh, 'sniper', 4), []);
  assert.deepEqual(unitCells(fresh, 'grandpa', 4), []);
  assert.deepEqual(unitCells(fresh, 'pyromaniac', 4), []);
  assert.deepEqual(unitCells(fresh, 'salesman', 4), []);

  const sniperUnlocked = createMississippi18MapUnits(['campaign-dakota-10']);
  assert.deepEqual(unitCells(sniperUnlocked, 'sniper', 4), markerCells(100));
  const grandpaUnlocked = createMississippi18MapUnits(['campaign-oregon-10']);
  assert.deepEqual(unitCells(grandpaUnlocked, 'grandpa', 4), markerCells(101));

  const pyromaniacUnlocked = createMississippi18MapUnits(['campaign-nevada-10']);
  assert.deepEqual(unitCells(pyromaniacUnlocked, 'pyromaniac', 4), markerCells(130));
  assert.deepEqual(unitCells(pyromaniacUnlocked, 'salesman', 4), []);
  const salesmanUnlocked = createMississippi18MapUnits(['campaign-alaska-10']);
  assert.deepEqual(unitCells(salesmanUnlocked, 'salesman', 4), markerCells(131));
  assert.deepEqual(unitCells(salesmanUnlocked, 'pyromaniac', 4), []);

  const allUnlocked = createMississippi18MapUnits([
    'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10',
  ]);
  assert.deepEqual(unitCells(allUnlocked, 'mexican', 4), markerCells(97));
  assert.deepEqual(unitCells(allUnlocked, 'indian', 4), markerCells(99));
  assert.deepEqual(unitCells(allUnlocked, 'sniper', 4), markerCells(100));
  assert.deepEqual(unitCells(allUnlocked, 'grandpa', 4), markerCells(101));
  assert.deepEqual(unitCells(allUnlocked, 'pyromaniac', 4), [[28, 17]]);
  assert.deepEqual(unitCells(allUnlocked, 'salesman', 4), [[26, 2]]);
  assert.equal(new Set(allUnlocked.map(({ id }) => id)).size, allUnlocked.length);
  for (const asset of new Set(allUnlocked.flatMap(({ asset, awakeAsset }) => [asset, awakeAsset].filter(Boolean)))) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset!))), `${asset} is bundled`);
  }
});

test('Shadow Town dynamite pair stays locked until global level 20 or 30 is complete', () => {
  assert.deepEqual(createMississippi18DynamiteDefinition([]), {
    unlocked: false,
    pairs: [{ id: 'dynamite-1', triggerCell: { x: 21, y: 16 }, boxCell: { x: 22, y: 17 } }],
  });
  assert.equal(createMississippi18DynamiteDefinition(['campaign-mississippi-09']).unlocked, false);
  assert.equal(createMississippi18DynamiteDefinition(['campaign-mississippi-10']).unlocked, true);
  assert.equal(createMississippi18DynamiteDefinition(['campaign-oregon-10']).unlocked, true);
});
