import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  oregon05CampaignCopy,
  oregon05CampaignCopyResources,
} from '../src/content/oregon-05-campaign-copy';
import { oregon05CampaignId } from '../src/content/oregon-05-identity';
import {
  oregon05CampaignPortraitAssets,
  oregon05WaveIntros,
} from '../src/content/oregon-05-wave-intros';

const expectedWaveContent = [
  ['T_CAMPAIGN_25_01', 'Dynamite', 'oregon_dakota_portrait_dynamite', 'Good morning, Boss! While you had a siesta, we prepared this valley with some mines! You just have to tap the trigger at the right moment and KABOOM!'],
  ['T_CAMPAIGN_25_02', 'Dynamite', 'oregon_dakota_portrait_dynamite', 'Now that was a big bang! We even buried some more dynamite at the same spot! You just have to wait for the sun to heat up the wires!'],
  ['T_CAMPAIGN_25_03', 'Pedro', 'portrait_pedro', 'The noise seems to have woken up the settlers and the Sheriff! We should hurry up and get some help!'],
  ['T_CAMPAIGN_25_04', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', 'Noise? What noise? I didn\'t hear anything!'],
  ['T_CAMPAIGN_25_05', 'Mexican', 'portrait_mexican', 'Boss, here come the most beautiful wagons I have ever seen! Look at how they sparkle!'],
  ['T_CAMPAIGN_25_06', 'Gunslinger', 'portrait_gunslinger', 'Anybody order some gold? The Pony Express is on its way!'],
  ['T_CAMPAIGN_25_07', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', 'Wait, I hear some footsteps! This must be a lot of settlers, all on foot! Let me polish my gun!'],
  ['T_CAMPAIGN_25_08', 'Gunslinger', 'portrait_gunslinger', 'You hear footsteps but no explosions, old man? Maybe you should visit the doc and have a check-up!'],
  ['T_CAMPAIGN_25_09', 'Oregon Boss', 'oregon_dakota_portrait_boss', 'Who asked for me? Let me through, I\'m a doctor!'],
] as const;

test('Dynamite Plains stable ID and bilingual level copy preserve APK resource mapping', () => {
  assert.equal(oregon05CampaignId, 'campaign-oregon-05');
  assert.deepEqual(oregon05CampaignCopyResources, {
    title: 'T_LEVEL_NAME_28',
    overview: 'T_LEVEL_INFO_28',
  });
  assert.deepEqual(oregon05CampaignCopy.title, { en: 'Dynamite Plains', zh: '炸药平原' });
  assert.equal(oregon05CampaignCopy.overview.en,
    'The Dynamite Plains are a welcome destination for diggers and prospective demolition experts.');
  assert.ok(oregon05CampaignCopy.overview.zh.length > 0);
});

test('Dynamite Plains wave dialogue preserves all nine APK strings, speakers, portraits, and order', () => {
  assert.deepEqual(oregon05WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
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
  assert.ok(oregon05WaveIntros.every(({ text, voiceSound }) => text.zh.length > 0 && voiceSound === undefined));
});

test('Dynamite Plains portraits and map preview resolve to bundled image assets', () => {
  const publicAssetPath = (path: string) => fileURLToPath(new URL(`../public/assets/${path}`, import.meta.url));
  const portraitNames = [
    'oregon_dakota_portrait_dynamite',
    'portrait_pedro',
    'oregon_dakota_portrait_geezer',
    'portrait_mexican',
    'portrait_gunslinger',
    'oregon_dakota_portrait_boss',
  ];
  assert.deepEqual(oregon05CampaignPortraitAssets, portraitNames);
  for (const portrait of oregon05CampaignPortraitAssets) {
    assert.ok(existsSync(publicAssetPath(`${portrait}.png`)), `${portrait} resolves through the shared game-asset loader`);
  }

  const dynamitePortraitPath = publicAssetPath('oregon_dakota_portrait_dynamite.png');
  const dynamitePortrait = readFileSync(dynamitePortraitPath);
  assert.deepEqual([...dynamitePortrait.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'Dynamite portrait is a PNG');
  assert.equal(dynamitePortrait.readUInt32BE(16), 96);
  assert.equal(dynamitePortrait.readUInt32BE(20), 96);
  assert.equal(dynamitePortrait.length, 8_888);
  assert.ok(existsSync(publicAssetPath('menu/gng_levelmap_28.png')),
    'map28 overview art resolves through the existing menu asset path');
});
