import assert from 'node:assert/strict';
import test from 'node:test';
import { gameAssetLogicalSize, gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';

test('uses the APK high-density atlases for all wagon and cart assets', () => {
  for (const asset of [
    'b_2x1_shack',
    'wagon',
    'wagon_turn',
    'horse_wagon',
    'horse_wagon_white',
    'horse_wagon_turn',
    'horse_wagon_turn_white',
  ]) {
    assert.equal(gameAssetRelativePath(asset), `hdpi/${asset}.png`);
  }
});

test('keeps unrelated resources on their existing asset paths', () => {
  assert.equal(gameAssetRelativePath('pioneer_male'), 'pioneer_male.png');
  assert.equal(gameAssetRelativePath('hud_crosshair'), 'hud_crosshair.png');
});

test('uses APK hdpi atlases for Cow Gulch terrain, road, bridge, and scenery', () => {
  for (const asset of [
    'tiles_water', 'tiles_waterside', 'tiles_waterside_var', 'tiles_desert', 'tiles_desert_var',
    'tiles_canyon', 'tiles_canyon_wall_var', 'tiles_shadow', 'tiles_shadow_var', 'tiles_path',
    'tiles_path_var', 'tiles_bridge_verti', 'tiles_bridge_hori', 'tiles_bridge_pier_left',
    'tiles_bridge_pier_right', 'b_1x1_windmill', 'e_1x1_bush', 'e_1x1_cactus_a',
    'e_1x1_cactus_b', 'e_1x1_rocks_a', 'e_1x1_rocks_b', 'e_1x1_rocks_water',
    'e_1x1_tree', 'e_1x2_bones',
  ]) {
    assert.equal(gameAssetRelativePath(asset), `hdpi/${asset}.png`);
  }
});

test('maps the hdpi Cow Gulch cart back to its 64×48 logical footprint', () => {
  assert.deepEqual(gameAssetLogicalSize('b_2x1_shack', { width: 96, height: 72 }), { width: 64, height: 48 });
  assert.deepEqual(gameAssetLogicalSize('wagon', { width: 48, height: 60 }), { width: 48, height: 60 });
});

test('maps hdpi Cow Gulch scenery back to the APK mdpi logical dimensions', () => {
  assert.deepEqual(gameAssetLogicalSize('e_1x1_cactus_a', { width: 48, height: 66 }), { width: 32, height: 44 });
  assert.deepEqual(gameAssetLogicalSize('b_1x1_windmill', { width: 48, height: 96 }), { width: 32, height: 64 });
  assert.equal(gameAssetSourceScale('tiles_desert_var'), 1.5, 'tile source coordinates scale to hdpi atlas pixels');
  assert.equal(gameAssetSourceScale('pioneer_male'), 1, 'non-map sprite crop coordinates remain unchanged');
});
