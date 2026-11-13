import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  oregon03CampaignCopy,
  oregon03CampaignCopyResources,
} from '../src/content/oregon-03-campaign-copy';
import { oregon03CampaignId } from '../src/content/oregon-03-identity';
import {
  oregon03CampaignPortraitAssets,
  oregon03WaveIntros,
} from '../src/content/oregon-03-wave-intros';

const expectedWaveContent = [
  ['T_CAMPAIGN_23_01', 'Settlers', 'portrait_settlers', 'Honey, I heard that some wild animals live here! Hold me tight!'],
  ['T_CAMPAIGN_23_02', 'Settlers', 'portrait_settlers', 'Don\'t be afraid, the covered wagons will protect us against their evil eyes!'],
  ['T_CAMPAIGN_23_03', 'Gunslinger', 'portrait_gunslinger', 'No respect, those settlers! The Chinook are natives, not animals! But I see some settler cows in the north!'],
  ['T_CAMPAIGN_23_04', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', 'Huh, what? North? Damn, I thought this is the west!'],
  ['T_CAMPAIGN_23_05', 'Gunslinger', 'portrait_gunslinger', 'Pa, maybe you shouldn\'t drink so much fire-water! Just deal with the settlers from the south-east!'],
  ['T_CAMPAIGN_23_06', 'Indian', 'portrait_indian', 'We heard someone wants to smoke our salmon? Let\'s dig up the hatchet!'],
  ['T_CAMPAIGN_23_07', 'Gunslinger', 'portrait_gunslinger', 'The only thing smoking will be my Colts, yeeehah!'],
  ['T_CAMPAIGN_23_08', 'Pedro', 'portrait_pedro', 'Here comes the cavalry! Set them on fire and steal their gold teeth!'],
  ['T_CAMPAIGN_23_09', 'Oregon Boss', 'oregon_dakota_portrait_boss', 'Damned bandits! I\'m not afraid of you! My golden vest will protect me!'],
] as const;

test('Chinook Woods bilingual level copy preserves the APK resource mapping', () => {
  assert.equal(oregon03CampaignId, 'campaign-oregon-03');
  assert.deepEqual(oregon03CampaignCopyResources, {
    title: 'T_LEVEL_NAME_26',
    overview: 'T_LEVEL_INFO_26',
  });
  assert.deepEqual(oregon03CampaignCopy.title, { en: 'Chinook Woods', zh: '奇努克森林' });
  assert.equal(oregon03CampaignCopy.overview.en,
    'The Chinook natives created a magnificent amusement park for salmon fishers here.');
  assert.ok(oregon03CampaignCopy.overview.zh.length > 0);
});

test('Chinook Woods wave dialogue preserves all nine APK strings, speakers, portrait resources, and order', () => {
  assert.deepEqual(oregon03WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
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
  assert.ok(oregon03WaveIntros.every(({ text, voiceSound }) => text.zh.length > 0 && voiceSound === undefined));
});

test('Chinook Woods menu and dialogue image resources resolve to existing public files', () => {
  const publicAsset = (path: string) => existsSync(fileURLToPath(new URL(`../public/assets/${path}`, import.meta.url)));
  assert.ok(publicAsset('menu/gng_levelmap_26.png'), 'map 26 overview art is available through the campaign menu path');
  assert.deepEqual(oregon03CampaignPortraitAssets, [
    'portrait_settlers',
    'portrait_gunslinger',
    'oregon_dakota_portrait_geezer',
    'portrait_indian',
    'portrait_pedro',
    'oregon_dakota_portrait_boss',
  ]);
  for (const portrait of oregon03CampaignPortraitAssets) {
    assert.ok(publicAsset(`${portrait}.png`), `${portrait} is available through the shared game-asset loader`);
  }
});
