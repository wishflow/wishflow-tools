import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { dakota04CampaignCopy, dakota04CampaignCopyResources } from '../src/content/dakota-04-campaign-copy';
import { dakota04CampaignId } from '../src/content/dakota-04-identity';
import {
  dakota04AmbientMusic,
  dakota04BattleMusicForWave,
  dakota04BattleMusicLoops,
} from '../src/content/dakota-04-music';
import { dakota04CampaignPortraitAssets, dakota04WaveIntros } from '../src/content/dakota-04-wave-intros';

const expectedWaveContent = [
  ['T_CAMPAIGN_34_01', 'Pedro', 'portrait_pedro', 'I still remember when my father sent me here as a child…'],
  ['T_CAMPAIGN_34_02', 'Gunslinger', 'portrait_gunslinger', 'Probably so you would get lost and never find your way back home!'],
  ['T_CAMPAIGN_34_03', 'Pedro', 'portrait_pedro', '"Hey, that\'s not funny! I grew up here! Alone!"'],
  ['T_CAMPAIGN_34_04', 'Mexican', 'portrait_mexican', '"The settlers are coming! The settlers are coming! Get into safety or they\'ll throw their clothes or some horse apples at you!"'],
  ['T_CAMPAIGN_34_05', 'Calamity', 'oregon_dakota_portrait_calamity', '"Get out of my line of fire or I\'ll give you a third nostril, gunslinger!"'],
  ['T_CAMPAIGN_34_06', 'Gunslinger', 'portrait_gunslinger', '"Sweetheart, I\'ll forgive you, because it\'s you."'],
  ['T_CAMPAIGN_34_07', 'Calamity', 'oregon_dakota_portrait_calamity', '"You better move your butt to the south, or you\'ll have four buttocks!"'],
  ['T_CAMPAIGN_34_08', 'Gunslinger', 'portrait_gunslinger', '"Save up your ammunition for the settlers, honey! They\'re charging the Badlands now!"'],
  ['T_CAMPAIGN_34_09', 'Dakota Boss', 'oregon_dakota_portrait_boss', '"I\'m sure that I will be saved! Listen to me, bandits, you don\'t have to make an effort!"'],
] as const;

test('Badlands bilingual title and overview preserve the APK resource identity and literal values', () => {
  assert.equal(dakota04CampaignId, 'campaign-dakota-04');
  assert.deepEqual(dakota04CampaignCopyResources, {
    title: 'T_LEVEL_NAME_37',
    overview: 'T_LEVEL_INFO_37',
  });
  assert.deepEqual(dakota04CampaignCopy.title, { en: 'Badlands', zh: '荒原' });
  assert.equal(dakota04CampaignCopy.overview.en, '"The Badlands aren\'t as bad as their reputation says."');
  assert.ok(dakota04CampaignCopy.overview.zh.length > 0);
});

test('Badlands preserves all nine APK dialogue keys, exact English strings, portraits, and order', () => {
  assert.deepEqual(dakota04WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
    waveNumber,
    dialogueResource,
    speaker.en,
    portraitAsset,
    text.en,
  ]), expectedWaveContent.map(([resource, speaker, portrait, text], index) => [
    index + 1,
    resource,
    speaker,
    portrait,
    text,
  ]));
  assert.ok(dakota04WaveIntros.every(({ text, voiceSound }) => text.zh.length > 0 && voiceSound === undefined));
  assert.deepEqual(dakota04CampaignPortraitAssets, [
    'portrait_pedro',
    'portrait_gunslinger',
    'portrait_mexican',
    'oregon_dakota_portrait_calamity',
    'oregon_dakota_portrait_boss',
  ]);
});

test('Badlands uses the APK Dakota ambient track and rotates its three battle loops by wave', () => {
  assert.equal(dakota04AmbientMusic, 'music_atmo_snow');
  assert.deepEqual(dakota04BattleMusicLoops, ['music_dakota', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 10 }, (_, waveIndex) => dakota04BattleMusicForWave(waveIndex)), [
    'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota', 'music_loop2',
    'music_loop3', 'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota',
  ]);
  assert.throws(() => dakota04BattleMusicForWave(-1), RangeError);
  assert.throws(() => dakota04BattleMusicForWave(1.5), RangeError);

  for (const track of [dakota04AmbientMusic, ...dakota04BattleMusicLoops]) {
    const bytes = readFileSync(fileURLToPath(new URL(`../public/assets/music/${track}.ogg`, import.meta.url)));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${track} is bundled as Ogg audio`);
  }
});

test('Badlands preview and dialogue portraits resolve to existing offline image assets', () => {
  const hasPublicAsset = (assetPath: string) => existsSync(fileURLToPath(new URL(`../public/assets/${assetPath}`, import.meta.url)));

  assert.ok(hasPublicAsset('menu/gng_levelmap_37.png'));
  for (const portrait of dakota04CampaignPortraitAssets) {
    assert.ok(hasPublicAsset(gameAssetRelativePath(portrait)), `${portrait} resolves through the game's asset mapping`);
  }
});
