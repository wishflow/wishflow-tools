import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

interface LostCityMapData {
  originalTileGrid: number[][];
  map: {
    width: number;
    height: number;
    tileSize: number;
    background: unknown[];
    streets: unknown[];
  };
}

const mapJsonUrl = new URL('../src/content/new-mexico-10.json', import.meta.url);
const mapTdmUrl = new URL('../public/content/maps/td_map_10.tdm', import.meta.url);

test('Lost City map data matches the APK TDM and New Mexico terrain renderer', () => {
  const tdm = readFileSync(mapTdmUrl);
  const content = JSON.parse(readFileSync(mapJsonUrl, 'utf8')) as LostCityMapData;

  assert.equal(tdm.length, 770);
  assert.equal(createHash('sha256').update(tdm).digest('hex'), '6c9fb042d9d0545a84adc560ac3e68c004d58838cb10569cb809fd8ca382fc24');
  assert.deepEqual([...tdm.subarray(0, 2)], [32, 24]);
  assert.equal(content.map.width, 32);
  assert.equal(content.map.height, 24);
  assert.equal(content.map.tileSize, 32);
  assert.equal(content.originalTileGrid.length, 24);
  assert.ok(content.originalTileGrid.every((row) => row.length === 32));
  assert.deepEqual(content.originalTileGrid.flat(), [...tdm.subarray(2)]);

  const expected = deriveOriginalTdmMapDrawCommands({ originalTileGrid: content.originalTileGrid });
  assert.deepEqual(content.map.background, expected.background);
  assert.deepEqual(content.map.streets, expected.streets);
});
