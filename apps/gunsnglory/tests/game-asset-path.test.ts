import assert from 'node:assert/strict';
import test from 'node:test';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

test('uses the APK high-density atlas for every horse-drawn wagon frame set', () => {
  for (const asset of [
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
