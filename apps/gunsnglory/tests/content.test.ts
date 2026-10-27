import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const appRoot = path.resolve(import.meta.dirname, '..');
const content = JSON.parse(readFileSync(path.join(appRoot, 'src/content/cow-gulch.json'), 'utf8'));

test('contains the researched Cow Gulch scenario and exactly its first-map unit', () => {
  assert.equal(content.id, 'cow-gulch');
  assert.equal(content.source.resource, 'res/raw/td_map_01.tdm');
  assert.equal(content.map.width, 17);
  assert.equal(content.map.height, 17);
  assert.equal(content.originalTileGrid[8][8], 104);
  assert.equal(content.units.length, 1);
  assert.equal(content.units[0].type, 'gunslinger');
  assert.deepEqual(content.units[0].cell, { x: 8, y: 8 });
  assert.equal(content.map.background.length, 289);
  assert.ok(content.map.streets.length > 30);
  assert.match(content.source.variationPolicy, /first candidate/i);
});

test('every map draw command resolves to a bundled APK atlas', () => {
  const assets = new Set([
    ...content.map.background.map((tile: { asset: string }) => tile.asset),
    ...content.map.streets.map((tile: { asset: string }) => tile.asset),
    ...content.units.map((unit: { asset: string }) => unit.asset),
  ]);
  for (const asset of assets) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', asset + '.png')), asset + '.png must be bundled');
  }
});
