import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map02 from '../src/content/dakota-02.json';
import { createDakota02MapScene } from '../src/content/dakota-02-scene';
import map03 from '../src/content/dakota-03.json';
import { createDakota03MapScene } from '../src/content/dakota-03-scene';
import map04 from '../src/content/dakota-04.json';
import { createDakota04MapScene } from '../src/content/dakota-04-scene';
import map05 from '../src/content/dakota-05.json';
import { createDakota05MapScene } from '../src/content/dakota-05-scene';
import map06 from '../src/content/dakota-06.json';
import { createDakota06MapScene } from '../src/content/dakota-06-scene';
import map07 from '../src/content/dakota-07.json';
import { createDakota07MapScene } from '../src/content/dakota-07-scene';
import map08 from '../src/content/dakota-08.json';
import { createDakota08MapScene } from '../src/content/dakota-08-scene';
import map09 from '../src/content/dakota-09.json';
import { createDakota09MapScene } from '../src/content/dakota-09-scene';
import lootLakes from '../src/content/oregon-11.json';
import { createOregon11MapScene } from '../src/content/oregon-11-scene';
import { cowGulchContent } from '../src/content/cow-gulch';
import { gameAssetLogicalSize, gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const snowyAssetByMarker = new Map([
  [69, 'e_1x1_rocks_snow_a'],
  [70, 'e_1x1_rocks_snow_b'],
  [71, 'e_1x1_tree_snow'],
]);

const dakotaMaps = [
  { level: 1, data: lootLakes, scene: createOregon11MapScene() },
  { level: 2, data: map02, scene: createDakota02MapScene() },
  { level: 3, data: map03, scene: createDakota03MapScene() },
  { level: 4, data: map04, scene: createDakota04MapScene() },
  { level: 5, data: map05, scene: createDakota05MapScene() },
  { level: 6, data: map06, scene: createDakota06MapScene() },
  { level: 7, data: map07, scene: createDakota07MapScene() },
  { level: 8, data: map08, scene: createDakota08MapScene() },
  { level: 9, data: map09, scene: createDakota09MapScene() },
];

function pngSize(bytes: Buffer): { width: number; height: number } {
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test('all Dakota TDM trees and rocks use the LevelPack snowy bitmap substitutions', () => {
  for (const { level, data, scene } of dakotaMaps) {
    for (const [marker, asset] of snowyAssetByMarker) {
      const cells = data.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
        code === marker ? [{ x, y }] : []
      )));
      for (const cell of cells) {
        assert.ok(scene.decorations?.some(({ cell: actual, asset: actualAsset }) => (
          actual.x === cell.x && actual.y === cell.y && actualAsset === asset
        )), `Dakota level ${level} raw ${marker} at ${cell.x},${cell.y} uses ${asset}`);
      }
      assert.equal(scene.decorations?.some(({ asset: actualAsset }) => (
        actualAsset === ({
          69: 'e_1x1_rocks_a',
          70: 'e_1x1_rocks_b',
          71: 'e_1x1_tree',
        } as Record<number, string>)[marker]
      )), false, `Dakota level ${level} does not retain the generic asset for raw ${marker}`);
    }
  }
});

test('snowy bitmap densities preserve APK pixel sizes and the shared decoration scale', () => {
  const expectedSizes = {
    e_1x1_rocks_snow_a: { width: 32, height: 40 },
    e_1x1_rocks_snow_b: { width: 32, height: 32 },
    e_1x1_tree_snow: { width: 32, height: 48 },
  } as const;

  for (const [asset, mdpiSize] of Object.entries(expectedSizes)) {
    const mdpiPath = path.join(appRoot, 'public/assets', `${asset}.png`);
    const hdpiPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(asset));
    assert.ok(existsSync(mdpiPath), `${asset} mdpi source is bundled`);
    assert.ok(existsSync(hdpiPath), `${asset} hdpi source is bundled`);
    assert.deepEqual(pngSize(readFileSync(mdpiPath)), mdpiSize, `${asset} preserves APK mdpi dimensions`);
    const hdpiSize = pngSize(readFileSync(hdpiPath));
    assert.deepEqual(hdpiSize, { width: mdpiSize.width * 1.5, height: mdpiSize.height * 1.5 },
      `${asset} preserves APK hdpi dimensions`);
    assert.deepEqual(gameAssetLogicalSize(asset, hdpiSize), mdpiSize,
      `${asset} draws at the same logical size as the base Dakota decoration`);
  }
});

test('the snowy sprite override stays scoped to Dakota maps', () => {
  const decorations = cowGulchContent.map.decorations ?? [];
  assert.ok(decorations.some(({ asset }) => asset === 'e_1x1_rocks_a'));
  assert.ok(decorations.some(({ asset }) => asset === 'e_1x1_tree'));
  assert.equal(decorations.some(({ asset }) => asset.includes('_snow')), false);
});
