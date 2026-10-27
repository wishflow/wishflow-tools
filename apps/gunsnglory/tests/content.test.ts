import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { cowGulchContent, cowGulchUpgradeSampleContent } from '../src/content/cow-gulch';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';

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
  assert.deepEqual(cowGulchContent.units[0]?.weapon, {
    damage: 140,
    damageType: 'light',
    rangeFine: 38400,
    reloadTimeMs: 500,
    projectileSpeed: 600,
    damageStyle: 0,
    specialReloadTimeMs: 1500,
    specialReloadFrequency: 6,
  });
  assert.equal(cowGulchContent.maxUpgrades, 0, 'the original first level does not allow upgrades');
  assert.deepEqual(cowGulchContent.units[0]?.upgradeLevels?.[0], {
    price: 25,
    movementSpeedFinePer100Ms: 1750,
    weapon: {
      damage: 140,
      damageType: 'light',
      rangeFine: 38400,
      reloadTimeMs: 400,
      projectileSpeed: 600,
      damageStyle: 0,
      specialReloadTimeMs: 1250,
      specialReloadFrequency: 6,
    },
  });
  assert.equal(cowGulchUpgradeSampleContent.id, 'cow-gulch-upgrade-sample');
  assert.equal(cowGulchUpgradeSampleContent.formalSettlementSupported, false);
  assert.equal(cowGulchUpgradeSampleContent.maxUpgrades, 1);
  assert.equal(cowGulchUpgradeSampleContent.previewWave?.initialCash, 25);
  assert.equal(cowGulchContent.previewWave?.initialCash, 65);
  assert.equal(cowGulchContent.previewWave?.enemy?.hitPoints, 126);
  assert.equal(cowGulchContent.previewWave?.enemy?.cashReward, 1);
  assert.equal(content.map.background.length, 289);
  assert.ok(content.map.streets.length > 30);
  assert.match(content.source.variationPolicy, /first candidate/i);
});

test('keeps the converted Cow Gulch grid and route controls aligned with the raw TDM bytes', () => {
  const tdm = readFileSync(path.join(appRoot, 'public/content/maps/td_map_01.tdm'));
  const { width, height } = content.map;

  assert.deepEqual([...tdm.subarray(0, 2)], [width, height], 'TDM starts with its width and height bytes');
  assert.equal(tdm.length, 2 + (width * height), 'TDM has exactly one byte for every map cell');
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      assert.equal(tdm[2 + (y * width) + x], content.originalTileGrid[y][x], `TDM cell (${x}, ${y})`);
    }
  }

  assert.equal(tdm[2 + (cowGulchPreviewWave.spawn.cell.y * width) + cowGulchPreviewWave.spawn.cell.x], 40,
    'the preview begins at the raw action-1 spawn field 0');
  const directionsByFieldId = [
    ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'], ['north', 'south'],
    ['west', 'east'], ['west', 'south'], ['east', 'south'], ['north', 'west', 'east'],
    ['west', 'east', 'south'], ['east', 'south', 'north'], ['south', 'north', 'west'],
  ];
  for (const redirect of cowGulchPreviewWave.redirects) {
    const rawTile = tdm[2 + (redirect.cell.y * width) + redirect.cell.x];
    const fieldId = rawTile! - 52;
    assert.ok(fieldId >= 0 && fieldId < directionsByFieldId.length,
      `redirect (${redirect.cell.x}, ${redirect.cell.y}) must use an action-2 field`);
    assert.deepEqual(
      redirect.directions,
      directionsByFieldId[fieldId],
      `redirect (${redirect.cell.x}, ${redirect.cell.y}) must use its raw TDM direction choices`,
    );
  }
  assert.equal(tdm[2 + (cowGulchPreviewWave.exit.y * width) + cowGulchPreviewWave.exit.x], 48,
    'the preview exits at the raw action-3 field');
});

test('follows the original shadow route beneath both bridge overlays', () => {
  const backgroundByCell = new Map(content.map.background.map((tile: {
    asset: string;
    x: number;
    y: number;
  }) => [`${tile.x},${tile.y}`, tile.asset]));
  const waypoints = [
    cowGulchPreviewWave.spawn.cell,
    ...cowGulchPreviewWave.redirects.map(({ cell }) => cell),
    cowGulchPreviewWave.exit,
  ];
  const traversedCells = new Set<string>();

  for (let index = 1; index < waypoints.length; index += 1) {
    const from = waypoints[index - 1]!;
    const to = waypoints[index]!;
    assert.ok(from.x === to.x || from.y === to.y, 'route segments must be axis-aligned');
    const stepX = Math.sign(to.x - from.x);
    const stepY = Math.sign(to.y - from.y);
    let x = from.x;
    let y = from.y;
    while (true) {
      traversedCells.add(`${x},${y}`);
      if (x === to.x && y === to.y) break;
      x += stepX;
      y += stepY;
    }
  }

  for (const cell of traversedCells) {
    assert.equal(backgroundByCell.get(cell), 'tiles_shadow', `${cell} must be an original shadow-route cell`);
  }
  assert.ok(
    content.map.streets.some((tile: { asset: string; x: number; y: number; width: number; height: number }) =>
      tile.asset === 'tiles_bridge_hori'
      && tile.x <= 12.5 && tile.x + tile.width >= 12.5
      && tile.y <= 9.5 && tile.y + tile.height >= 9.5),
    'the original TDM route passes beneath the horizontal bridge at (12.5, 9.5)',
  );
  assert.ok(
    content.map.streets.some((tile: { asset: string; x: number; y: number; width: number; height: number }) =>
      tile.asset === 'tiles_bridge_verti'
      && tile.x <= 2.5 && tile.x + tile.width >= 2.5
      && tile.y <= 10.5 && tile.y + tile.height >= 10.5),
    'the original TDM route passes beneath the vertical bridge at (2.5, 10.5)',
  );
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
