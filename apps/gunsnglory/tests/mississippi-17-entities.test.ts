import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createMississippi17MapUnits } from '../src/content/mississippi-17-units';
import map from '../src/content/mississippi-17.json';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function markerCells(code: number): [number, number][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((value, x) => value === code ? [[x, y] as [number, number]] : []));
}

function unitCells(units: ReturnType<typeof createMississippi17MapUnits>, type: string, activity: number): [number, number][] {
  return units.filter((unit) => unit.type === type && unit.activity === activity)
    .map(({ cell }) => [cell.x, cell.y] as [number, number]);
}

test('Dead Rocks new-game units match active and sleeping TDM unit markers', () => {
  const units = createMississippi17MapUnits();

  assert.deepEqual(units.filter(({ activity }) => activity === 5).map(({ type, cell }) => [type, cell.x, cell.y]), [
    ['gunslinger', 4, 9], ['indian', 13, 9], ['mexican', 4, 12],
  ]);
  for (const [marker, type] of [[96, 'gunslinger'], [97, 'mexican'], [99, 'indian']] as const) {
    assert.deepEqual(unitCells(units, type, 4), markerCells(marker), `sleeping ${type} units follow marker ${marker}`);
  }
  assert.deepEqual(unitCells(units, 'sniper', 4), []);
  assert.deepEqual(unitCells(units, 'grandpa', 4), []);
  assert.deepEqual(unitCells(units, 'pyromaniac', 4), []);
  assert.deepEqual(unitCells(units, 'salesman', 4), []);
  assert.ok(!units.some(({ type }) => type === 'cannon'), 'Dead Rocks has no Cannon marker');
  assert.ok(!units.some(({ type }) => type === 'gambler'), 'Dead Rocks has no Gambler marker');
  for (const marker of [98, 112, 113, 132, 150]) {
    assert.deepEqual(markerCells(marker), [], `Dead Rocks has no marker ${marker}`);
  }
  assert.equal(new Set(units.map(({ id }) => id)).size, units.length);
});

test('Dead Rocks global unlock snapshots gate only their corresponding recruit markers', () => {
  const unlocks = [
    [101, 'campaign-oregon-10', 'grandpa'],
    [100, 'campaign-dakota-10', 'sniper'],
    [130, 'campaign-nevada-10', 'pyromaniac'],
    [131, 'campaign-alaska-10', 'salesman'],
  ] as const;

  for (const [marker, unlockScenario, unitType] of unlocks) {
    const units = createMississippi17MapUnits([unlockScenario]);
    assert.deepEqual(unitCells(units, unitType, 4), markerCells(marker), `${unitType} uses its APK marker after unlock`);
    for (const [, , otherType] of unlocks.filter(([, , candidate]) => candidate !== unitType)) {
      assert.deepEqual(unitCells(units, otherType, 4), [], `${otherType} remains locked`);
    }
  }

  const allUnlocked = createMississippi17MapUnits(unlocks.map(([, unlockScenario]) => unlockScenario));
  assert.equal(new Set(allUnlocked.map(({ id }) => id)).size, allUnlocked.length, 'all same-type hires have unique IDs');
  for (const [marker, , unitType] of unlocks) {
    assert.deepEqual(unitCells(allUnlocked, unitType, 4), markerCells(marker));
  }
  const referencedAssets = new Set(allUnlocked.flatMap(({ asset, awakeAsset }) => [asset, awakeAsset].filter(Boolean)));
  for (const asset of referencedAssets) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset!))), `${asset} is bundled`);
  }
});
