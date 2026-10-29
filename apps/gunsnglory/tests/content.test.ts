import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  cowGulchContent,
  cowGulchP1aSampleContent,
  cowGulchP1bCampaignContent,
  cowGulchP1cCampaignContent,
  cowGulchP1dCampaignContent,
  cowGulchUpgradeSampleContent,
} from '../src/content/cow-gulch';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import { cowGulchLevelOneContent, officialCampaignStages } from '../src/content/official-campaign';
import { calculateMapViewport } from '../src/render/map-viewport';
import { mapDecorationDestination } from '../src/render/canvas-renderer';

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
  assert.match(content.source.variationPolicy, /fixed.*seed/i);
});

test('keeps the one-wave sample and prior campaign slices separate from the full eight-wave build', () => {
  assert.equal(cowGulchP1aSampleContent.id, 'cow-gulch');
  assert.equal(cowGulchP1aSampleContent.campaignWaves, undefined);
  assert.equal(cowGulchP1bCampaignContent.id, 'cow-gulch-original-waves');
  assert.equal(cowGulchP1bCampaignContent.campaignWaveCount, 8);
  assert.deepEqual(cowGulchP1bCampaignContent.campaignWaves?.map(({ number }) => number), [1, 2]);
  assert.deepEqual(cowGulchP1cCampaignContent.campaignWaves?.map(({ number }) => number), [1, 2, 3]);
  assert.equal(cowGulchP1dCampaignContent.id, 'cow-gulch-original-waves-1-8');
  assert.equal(cowGulchP1dCampaignContent.campaignWaveCount, 8);
  assert.deepEqual(cowGulchP1dCampaignContent.campaignWaves?.map(({ number }) => number), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('binds the full Cow Gulch battle to a distinct official level-one identity', () => {
  assert.equal(cowGulchLevelOneContent.id, 'campaign-new-mexico-01');
  assert.equal(cowGulchLevelOneContent.contentVersion, 'gng-free-1.8.6-new-mexico-01-p1e-v2');
  assert.notEqual(cowGulchLevelOneContent.id, cowGulchContent.id);
  assert.notEqual(cowGulchLevelOneContent.id, cowGulchP1aSampleContent.id);
  assert.notEqual(cowGulchLevelOneContent.id, cowGulchP1bCampaignContent.id);
  assert.notEqual(cowGulchLevelOneContent.id, cowGulchP1cCampaignContent.id);
  assert.notEqual(cowGulchLevelOneContent.id, cowGulchP1dCampaignContent.id);
  assert.deepEqual(cowGulchLevelOneContent.campaignWaves, cowGulchP1dCampaignContent.campaignWaves);
  assert.deepEqual(officialCampaignStages, [{
    scenarioId: cowGulchLevelOneContent.id,
    contentVersion: cowGulchLevelOneContent.contentVersion,
    title: cowGulchLevelOneContent.title,
    globalLevel: 1,
    requiresCompletedScenarioIds: [],
  }]);
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
    const backgroundAsset = backgroundByCell.get(cell);
    assert.ok(
      backgroundAsset === 'tiles_shadow' || backgroundAsset === 'tiles_shadow_var',
      'route cell must use an original shadow tile: ' + cell,
    );
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
    ...(cowGulchContent.map.decorations ?? []).map((decoration) => decoration.asset),
    ...cowGulchContent.units.map((unit) => unit.asset),
    'sfx_sleeping',
  ]);
  for (const asset of assets) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', asset + '.png')), asset + '.png must be bundled');
  }
});

test('reconstructs the first map decorations from original TDM object codes', () => {
  const tdm = readFileSync(path.join(appRoot, 'public/content/maps/td_map_01.tdm'));
  const width = tdm[0]!;
  const height = tdm[1]!;
  const commonCollisionBox = { x: 1920, y: -1228, width: 3840, height: 2534 };
  const decorationCodes = new Map([
    [68, { asset: 'e_1x1_cactus_a', collisionBoxFine: commonCollisionBox }],
    [69, { asset: 'e_1x1_rocks_a', collisionBoxFine: commonCollisionBox }],
    [70, { asset: 'e_1x1_rocks_b', collisionBoxFine: { x: 1306, y: -1920, width: 5068, height: 3840 } }],
    [71, { asset: 'e_1x1_tree', collisionBoxFine: commonCollisionBox }],
    [73, { asset: 'e_1x1_cactus_b', collisionBoxFine: commonCollisionBox }],
    [74, { asset: 'b_1x1_windmill', collisionBoxFine: commonCollisionBox }],
    [76, { asset: 'e_1x1_bush', collisionBoxFine: commonCollisionBox }],
    [77, { asset: 'e_1x2_bones', collisionBoxFine: { x: 0, y: -9600, width: 7680, height: 11520 } }],
    [116, {
      asset: 'b_2x1_shack', anchorOffsetX: -0.5,
      collisionBoxFine: { x: -3840, y: -1228, width: 15360, height: 3840 },
    }],
    [126, { asset: 'e_1x1_rocks_water', collisionBoxFine: commonCollisionBox }],
  ]);
  const expected = [];

  for (let index = 0; index < width * height; index += 1) {
    const object = decorationCodes.get(tdm[index + 2]!);
    if (object) {
      expected.push({
        ...object,
        cell: { x: index % width, y: Math.floor(index / width) },
      });
    }
  }

  assert.equal(expected.length, 31, 'the raw Cow Gulch TDM contains 31 static scene objects');
  assert.deepEqual(cowGulchContent.map.decorations, expected);
});

test('anchors scenery sprites at each source cell foot and preserves wide-object alignment', () => {
  const viewport = calculateMapViewport(17, 17, 1024, 576);
  assert.deepEqual(mapDecorationDestination(
    { asset: 'e_1x1_cactus_a', cell: { x: 5, y: 6 } },
    { width: 32, height: 44 },
    viewport,
  ), { x: 302, y: 115, width: 60, height: 82 });
  assert.deepEqual(mapDecorationDestination(
    { asset: 'b_2x1_shack', cell: { x: 15, y: 7 }, anchorOffsetX: -0.5 },
    { width: 64, height: 48 },
    viewport,
  ), { x: 842, y: 168, width: 120, height: 90 });
});

test('materializes every fresh Cow Gulch unit marker with original activity and stable tile coordinates', () => {
  const tdm = readFileSync(path.join(appRoot, 'public/content/maps/td_map_01.tdm'));
  const freshObjects = cowGulchContent.units.map((unit) => ({
    id: unit.id,
    type: unit.type,
    activity: unit.activity ?? 5,
    cell: unit.cell,
    asset: unit.asset,
  }));

  assert.deepEqual(freshObjects.filter((unit) => unit.activity === 4 && unit.type === 'gunslinger'), [
    { id: 'gunslinger-hire-01', type: 'gunslinger', activity: 4, cell: { x: 6, y: 1 }, asset: 'player_gunslinger_sleep' },
    { id: 'gunslinger-hire-02', type: 'gunslinger', activity: 4, cell: { x: 5, y: 4 }, asset: 'player_gunslinger_sleep' },
    { id: 'gunslinger-hire-03', type: 'gunslinger', activity: 4, cell: { x: 3, y: 6 }, asset: 'player_gunslinger_sleep' },
    { id: 'gunslinger-hire-04', type: 'gunslinger', activity: 4, cell: { x: 15, y: 8 }, asset: 'player_gunslinger_sleep' },
    { id: 'gunslinger-hire-05', type: 'gunslinger', activity: 4, cell: { x: 16, y: 12 }, asset: 'player_gunslinger_sleep' },
    { id: 'gunslinger-hire-06', type: 'gunslinger', activity: 4, cell: { x: 2, y: 14 }, asset: 'player_gunslinger_sleep' },
    { id: 'gunslinger-hire-07', type: 'gunslinger', activity: 4, cell: { x: 14, y: 14 }, asset: 'player_gunslinger_sleep' },
    { id: 'gunslinger-hire-08', type: 'gunslinger', activity: 4, cell: { x: 6, y: 16 }, asset: 'player_gunslinger_sleep' },
  ]);
  assert.deepEqual(freshObjects.filter((unit) => unit.activity === 4 && unit.type === 'mexican'), [
    { id: 'mexican-hire-01', type: 'mexican', activity: 4, cell: { x: 3, y: 3 }, asset: 'player_mexican_sleep' },
    { id: 'mexican-hire-02', type: 'mexican', activity: 4, cell: { x: 1, y: 5 }, asset: 'player_mexican_sleep' },
    { id: 'mexican-hire-03', type: 'mexican', activity: 4, cell: { x: 6, y: 5 }, asset: 'player_mexican_sleep' },
    { id: 'mexican-hire-04', type: 'mexican', activity: 4, cell: { x: 14, y: 8 }, asset: 'player_mexican_sleep' },
    { id: 'mexican-hire-05', type: 'mexican', activity: 4, cell: { x: 2, y: 13 }, asset: 'player_mexican_sleep' },
    { id: 'mexican-hire-06', type: 'mexican', activity: 4, cell: { x: 4, y: 15 }, asset: 'player_mexican_sleep' },
    { id: 'mexican-hire-07', type: 'mexican', activity: 4, cell: { x: 13, y: 16 }, asset: 'player_mexican_sleep' },
  ]);

  const active = freshObjects.filter((unit) => unit.activity === 5);
  assert.deepEqual(active.map(({ id, type, cell }) => ({ id, type, cell })), [
    { id: 'gunslinger-1', type: 'gunslinger', cell: { x: 8, y: 8 } },
  ]);
  assert.equal(freshObjects.length, 16);
  for (const unit of freshObjects) {
    const tile = tdm[2 + (unit.cell.y * 17) + unit.cell.x];
    assert.ok(tile === 96 || tile === 97 || tile === 104, `${unit.id} must be backed by an eligible source marker`);
  }
  assert.equal(tdm.filter((tile) => tile === 101).length, 1, 'the locked Scout marker remains in the raw map');
  assert.equal(tdm.filter((tile) => tile === 130).length, 1, 'the locked Pyromaniac marker remains in the raw map');
  assert.ok(!freshObjects.some((unit) => unit.cell.x === 9 && unit.cell.y === 10));
  assert.ok(!freshObjects.some((unit) => unit.cell.x === 11 && unit.cell.y === 16));
});
