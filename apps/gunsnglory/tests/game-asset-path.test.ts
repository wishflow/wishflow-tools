import assert from 'node:assert/strict';
import test from 'node:test';
import { gameAssetLogicalSize, gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';

test('uses the APK high-density atlases for wagon, cart, and Post Coach assets', () => {
  for (const asset of [
    'b_2x1_shack',
    'lok_hori_1of2',
    'lok_hori_2of2',
    'lok_wagon_hori',
    'lok_verti_1of2',
    'lok_verti_2of2',
    'lok_wagon_verti',
    'wagon',
    'wagon_turn',
    'stagecoach',
    'stagecoach_turn',
    'goldtransport',
    'goldtransport_turn',
    'horse_wagon',
    'horse_wagon_white',
    'horse_wagon_turn',
    'horse_wagon_turn_white',
  ]) {
    assert.equal(gameAssetRelativePath(asset), `hdpi/${asset}.png`);
  }
  assert.equal(gameAssetRelativePath('gng_frame'), 'hdpi/gng_frame.png');
});

test('keeps unrelated resources on their existing asset paths', () => {
  assert.equal(gameAssetRelativePath('pioneer_male'), 'pioneer_male.png');
  assert.equal(gameAssetRelativePath('hud_crosshair'), 'hud_crosshair.png');
  for (const asset of ['gng_wave_arrow_a', 'gng_wave_arrow_b', 'gng_wave_arrow_c', 'gng_wave_arrow_d', 'boss_hat']) {
    assert.equal(gameAssetRelativePath(asset), `${asset}.png`);
  }
  assert.equal(gameAssetRelativePath('sfx_lok_steam'), 'sfx_lok_steam.png');
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

test('maps APK horizontal train hdpi sprites to their mdpi logical dimensions', () => {
  assert.deepEqual(gameAssetLogicalSize('lok_hori_1of2', { width: 48, height: 72 }), { width: 32, height: 48 });
  assert.deepEqual(gameAssetLogicalSize('lok_hori_2of2', { width: 48, height: 72 }), { width: 32, height: 48 });
  assert.deepEqual(gameAssetLogicalSize('lok_wagon_hori', { width: 48, height: 48 }), { width: 32, height: 32 });
});

test('maps APK vertical train hdpi sprites to their mdpi logical dimensions', () => {
  assert.equal(gameAssetRelativePath('lok_verti_1of2'), 'hdpi/lok_verti_1of2.png');
  assert.equal(gameAssetRelativePath('lok_verti_2of2'), 'hdpi/lok_verti_2of2.png');
  assert.equal(gameAssetRelativePath('lok_wagon_verti'), 'hdpi/lok_wagon_verti.png');
  assert.deepEqual(gameAssetLogicalSize('lok_verti_1of2', { width: 48, height: 48 }), { width: 32, height: 32 });
  assert.deepEqual(gameAssetLogicalSize('lok_verti_2of2', { width: 48, height: 60 }), { width: 32, height: 40 });
  assert.deepEqual(gameAssetLogicalSize('lok_wagon_verti', { width: 48, height: 60 }), { width: 32, height: 40 });
});

test('maps APK dynamite objects and respawn frames to mdpi logical sizes', () => {
  assert.equal(gameAssetRelativePath('dynamite_detonator'), 'hdpi/dynamite_detonator.png');
  assert.equal(gameAssetRelativePath('dynamite_detonator_pressed'), 'hdpi/dynamite_detonator_pressed.png');
  assert.equal(gameAssetRelativePath('dynamite_box'), 'hdpi/dynamite_box.png');
  assert.equal(gameAssetRelativePath('sfx_dynamite_box'), 'hdpi/sfx_dynamite_box.png');
  assert.deepEqual(gameAssetLogicalSize('dynamite_detonator', { width: 48, height: 60 }), { width: 32, height: 40 });
  assert.deepEqual(gameAssetLogicalSize('dynamite_box', { width: 48, height: 48 }), { width: 32, height: 32 });
  assert.deepEqual(gameAssetLogicalSize('sfx_dynamite_box', { width: 240, height: 66 }), { width: 160, height: 44 });
});
