import assert from 'node:assert/strict';
import test from 'node:test';
import { gameAssetLogicalSize, gameAssetRelativePath } from '../src/render/game-asset-path';

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
  assert.equal(gameAssetRelativePath('tiles_desert'), 'tiles_desert.png');
});

test('maps the hdpi Cow Gulch cart back to its 64×48 logical footprint', () => {
  assert.deepEqual(gameAssetLogicalSize('b_2x1_shack', { width: 96, height: 72 }), { width: 64, height: 48 });
  assert.deepEqual(gameAssetLogicalSize('wagon', { width: 48, height: 60 }), { width: 48, height: 60 });
});
