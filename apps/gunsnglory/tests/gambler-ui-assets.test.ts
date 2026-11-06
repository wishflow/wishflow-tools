import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { gamblerDialogAssets } from '../src/content/gambler-dialog-assets';
import { gamblerUiLowCashSampleContent, gamblerUiSampleContent } from '../src/content/gambler-ui-sample';
import { officialCampaignStages } from '../src/content/official-campaign';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function dimensions(assetName: string): { width: number; height: number } {
  const png = readFileSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(assetName)));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('Gambler dialog uses the original hdpi card sprites and playable APK sound files', () => {
  assert.deepEqual(gamblerDialogAssets, ['card_back', 'card_front', 'card_symbols', 'card_numbers']);
  assert.deepEqual(dimensions('card_back'), { width: 132, height: 192 });
  assert.deepEqual(dimensions('card_front'), { width: 132, height: 192 });
  assert.deepEqual(dimensions('card_symbols'), { width: 96, height: 24 });
  assert.deepEqual(dimensions('card_numbers'), { width: 312, height: 24 });
  for (const name of ['sound_cards_collect', 'sound_cards_deal']) {
    const sound = readFileSync(path.join(appRoot, 'public/assets/sounds', `${name}.ogg`));
    assert.equal(sound.toString('ascii', 0, 4), 'OggS', name);
    assert.ok(sound.byteLength > 1_000, `${name} should contain the extracted audio, not an empty placeholder`);
  }
  for (const asset of gamblerDialogAssets) {
    assert.equal(gameAssetRelativePath(asset), `hdpi/${asset}.png`);
  }
});

test('Gambler UI fixtures remain Cow Gulch debug samples outside the official campaign', () => {
  assert.equal(gamblerUiSampleContent.id, 'gambler-ui-sample');
  assert.equal(gamblerUiLowCashSampleContent.id, 'gambler-ui-low-cash-sample');
  assert.equal(gamblerUiSampleContent.map.width, 17);
  assert.equal(gamblerUiSampleContent.map.height, 17);
  assert.equal(gamblerUiSampleContent.previewWave?.initialCash, 50);
  assert.equal(gamblerUiLowCashSampleContent.previewWave?.initialCash, 49);
  for (const sample of [gamblerUiSampleContent, gamblerUiLowCashSampleContent]) {
    assert.equal(sample.units.filter(({ type }) => type === 'gambler').length, 1);
    assert.equal(sample.map.decorations?.filter(({ asset }) => asset === 'b_3x2_casino').length, 1);
    assert.equal(officialCampaignStages.some(({ scenarioId }) => scenarioId === sample.id), false);
  }
});
