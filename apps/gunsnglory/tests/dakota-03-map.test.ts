import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createDakotaBackgroundCollisionCodes } from '../src/content/dakota-background-collision';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import { deriveOriginalBackgroundCodesForTest, deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const mapPath = path.join(appRoot, 'src/content/dakota-03.json');
const fixturePath = path.join(appRoot, 'tests/fixtures/td_map_36.tdm');

interface FortKnockoutMapData {
  id: string;
  source: { resource: string };
  originalTileGrid: number[][];
  map: {
    width: number;
    height: number;
    tileSize: number;
    background: Array<{
      asset: string;
      source: { x: number; y: number; width: number; height: number };
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    streets: Array<{
      asset: string;
      source: { x: number; y: number; width: number; height: number };
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  };
}

function loadMap(): FortKnockoutMapData {
  assert.ok(existsSync(mapPath), 'Fort Knockout map data is present');
  return JSON.parse(readFileSync(mapPath, 'utf8')) as FortKnockoutMapData;
}

test('Fort Knockout grid and marker frequencies match the original APK TDM', () => {
  const bytes = readFileSync(fixturePath);
  assert.equal(bytes.length, 770);
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));
  const map = loadMap();

  assert.equal(map.id, 'fort-knockout');
  assert.equal(map.source.resource, 'res/raw/td_map_36.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 410, 16: 62, 32: 80, 36: 36, 40: 1, 41: 1, 42: 1, 43: 1, 48: 4,
    52: 23, 54: 10, 55: 13, 69: 9, 70: 3, 71: 6, 76: 3, 80: 7, 90: 15,
    91: 2, 92: 2, 94: 1, 95: 1, 96: 14, 97: 15, 98: 6, 99: 12, 100: 1,
    101: 11, 102: 1, 110: 1, 113: 2, 116: 1, 117: 2, 124: 5, 125: 4,
    130: 1, 131: 1,
  });
});

test('Fort Knockout Dakota background and street commands match APK-derived references', () => {
  const map = loadMap();
  const expected = deriveOriginalTdmMapDrawCommands(map);

  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.length, 104);
  assert.deepEqual(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori')
    .map(({ x, y }) => [x, y]), [
    [7.75, 1], [26.75, 6], [1.75, 9], [21.75, 11], [6.75, 15], [4.75, 21], [25.75, 21],
  ]);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_railway_verti').length, 19);
  assert.ok([...map.map.background, ...map.map.streets].every(({ asset }) => !asset.startsWith('miss_tiles_')));
});

test('Fort Knockout collision codes match the final APK-shaped background grid', () => {
  const map = loadMap();
  const collisionCodes = createDakotaBackgroundCollisionCodes(map.map);
  assert.deepEqual(collisionCodes, deriveOriginalBackgroundCodesForTest(map));
  assert.equal(map.originalTileGrid[2]![14], 36);
  assert.equal(collisionCodes[2]![14], 14, 'the wall marker is shaped into the blocking canyon edge');
  assert.equal(map.originalTileGrid[1]![8], 80);
  assert.equal(collisionCodes[1]![8], 74, 'the bridge background is distinct from its overlay');
  assert.equal(map.originalTileGrid[22]![20], 124);
  assert.equal(collisionCodes[22]![20], 96, 'water remains a separate background surface');
  assert.equal(map.originalTileGrid[2]![11], 90);
  assert.equal(collisionCodes[2]![11], 19, 'the rail sprite is an overlay on the base ground');
});

test('Fort Knockout map uses bundled Dakota atlases with valid source rectangles', () => {
  const map = loadMap();
  const tiles = [...map.map.background, ...map.map.streets];

  for (const asset of new Set(tiles.map(({ asset }) => asset))) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(asset));
    assert.ok(existsSync(assetPath), `${asset} is bundled`);
    const png = readFileSync(assetPath);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${asset} is a PNG`);
    const width = png.readUInt32BE(16) / gameAssetSourceScale(asset);
    const height = png.readUInt32BE(20) / gameAssetSourceScale(asset);
    for (const tile of tiles.filter((item) => item.asset === asset)) {
      assert.ok(tile.source.x >= 0 && tile.source.y >= 0, `${asset} source origin is nonnegative`);
      assert.ok(tile.source.x + tile.source.width <= width, `${asset} source x-range is in its atlas`);
      assert.ok(tile.source.y + tile.source.height <= height, `${asset} source y-range is in its atlas`);
    }
  }
});
