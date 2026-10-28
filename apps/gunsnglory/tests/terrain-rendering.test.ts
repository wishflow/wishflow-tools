import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { deriveOriginalMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const content = JSON.parse(readFileSync(path.join(appRoot, 'src/content/cow-gulch.json'), 'utf8'));
const expected = deriveOriginalMapDrawCommands(content);

test('Cow Gulch terrain crops and variation choices match Android New Mexico rendering', () => {
  assert.equal(content.map.background.length, 17 * 17);
  assert.deepEqual(content.map.background, expected.background);
  assert.deepEqual(content.map.streets, expected.streets);
  assert.equal(content.map.streets.filter((tile: { asset: string }) => tile.asset === 'tiles_path' || tile.asset === 'tiles_path_var').length, 31);
  assert.equal(content.map.streets.filter((tile: { asset: string }) => tile.asset === 'tiles_bridge_verti').length, 2);
  assert.equal(content.map.streets.filter((tile: { asset: string }) => tile.asset === 'tiles_bridge_hori').length, 1);
  assert.equal(content.map.streets.filter((tile: { asset: string }) => tile.asset.startsWith('tiles_bridge_pier_')).length, 2);
  assert.ok(expected.background.some((tile: { asset: string }) => tile.asset.endsWith('_var')),
    'the fixed Android variation seed must draw terrain variant atlases');
  assert.ok(expected.streets.some((tile) => tile.asset === 'tiles_path_var'),
    'the fixed Android variation seed must draw path variants');
});

test('every map draw command resolves to a bundled original atlas', () => {
  const assets = new Set([
    ...content.map.background.map((tile: { asset: string }) => tile.asset),
    ...content.map.streets.map((tile: { asset: string }) => tile.asset),
  ]);
  for (const asset of assets) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', asset + '.png')), asset + '.png must be bundled');
  }
});
