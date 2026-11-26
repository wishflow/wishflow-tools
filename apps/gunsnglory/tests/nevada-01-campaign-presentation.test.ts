import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { nevada01AmbientMusic, nevada01BattleMusicForWave, nevada01BattleMusicLoops } from '../src/content/nevada-01-music';
import { nevada01CampaignPortraitAssets, nevada01WaveIntros } from '../src/content/nevada-01-wave-intros';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

const expectedDialogue = [
  ['T_CAMPAIGN_41_1', 'Pedro', 'portrait_pedro', 'This place reminds me of home.'],
  ['T_CAMPAIGN_41_2', 'Gunslinger', 'portrait_gunslinger', 'Did you get lost down there in the canyons, boss?'],
  ['T_CAMPAIGN_41_3', 'Pedro', 'portrait_pedro', 'No, and now focus on the settlers in the north.'],
  ['T_CAMPAIGN_41_4', 'Pyromaniac', 'portrait_pyromaniac', "Don't worry, I'll make them see more stars than they care for."],
  ['T_CAMPAIGN_41_5', 'Pyromaniac', 'portrait_pyromaniac', 'More firework and more settlers coming from all directions. Great!'],
  ['T_CAMPAIGN_41_6', 'Pedro', 'portrait_pedro', 'Nice shots! You got some real talent for robbery. Wanna join us?'],
  ['T_CAMPAIGN_41_7', 'Pyromaniac', 'portrait_pyromaniac', 'More money for fireworks and blowing up stuff? What more could I wish for.'],
  ['T_CAMPAIGN_41_8', 'Mexican', 'portrait_mexican', "Just don't touch my dynamite, I wanna use it to blow up those gold wagons."],
  ['T_CAMPAIGN_41_9', 'Pyromaniac', 'portrait_pyromaniac', "Don't worry, I have my own rockets. They just arrived from China."],
  ['T_CAMPAIGN_41_10', 'Pedro', 'portrait_pedro', "One more group and we're finished here. Prepare the fireworks!"],
  ['T_CAMPAIGN_41_11', 'Boss', 'oregon_dakota_portrait_boss', 'Let them enjoy their fireworks. Quickly, move through the canyon before they notice us.'],
] as const;

test('Labyrinth Gulch preserves all 11 APK dialogue resources, exact English copy, and portrait order', () => {
  assert.deepEqual(nevada01WaveIntros.map(({ dialogueResource, speaker, portraitAsset, text }) => [
    dialogueResource, speaker.en, portraitAsset, text.en,
  ]), expectedDialogue);
  assert.deepEqual(nevada01WaveIntros.map(({ waveNumber }) => waveNumber), Array.from({ length: 11 }, (_, index) => index + 1));
  assert.ok(nevada01WaveIntros.every(({ text, voiceSound }) => text.zh.trim().length > 0 && voiceSound === undefined),
    'Chinese text is supplied and no unsupported voice assignment is inferred');
  assert.deepEqual(nevada01CampaignPortraitAssets, [
    'portrait_pedro', 'portrait_gunslinger', 'portrait_pyromaniac', 'portrait_mexican', 'oregon_dakota_portrait_boss',
  ]);
});

test('Labyrinth Gulch dialogue portraits and Nevada music are bundled for offline play', () => {
  for (const portrait of nevada01CampaignPortraitAssets) {
    const imagePath = path.join(appRoot, 'public/assets', gameAssetRelativePath(portrait));
    assert.equal(existsSync(imagePath), true, `${portrait} is bundled`);
    assert.equal(readFileSync(imagePath).toString('ascii', 1, 4), 'PNG');
  }

  assert.equal(nevada01AmbientMusic, 'music_atmo_nevada');
  assert.deepEqual(nevada01BattleMusicLoops, ['music_nevada', 'music_loop3', 'music_loop4']);
  assert.deepEqual(Array.from({ length: 6 }, (_, index) => nevada01BattleMusicForWave(index)), [
    'music_nevada', 'music_loop3', 'music_loop4', 'music_nevada', 'music_loop3', 'music_loop4',
  ]);
  assert.throws(() => nevada01BattleMusicForWave(-1), RangeError);
  for (const track of [nevada01AmbientMusic, ...nevada01BattleMusicLoops]) {
    const bytes = readFileSync(path.join(appRoot, 'public/assets/music', `${track}.ogg`));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${track} is bundled as Ogg audio`);
  }

  const mainSource = readFileSync(path.join(appRoot, 'src/main.ts'), 'utf8');
  assert.match(mainSource, /\.\.\.nevada01CampaignPortraitAssets,/);
  assert.match(mainSource, /if \(scenarioId === nevada01CampaignId\) return nevada01WaveIntros;/);
  assert.match(mainSource, /nevada01BattleMusicForWave\(eventWaveNumber - 1\)/);
  assert.match(mainSource, /setCampaignBackgroundMusic\(nevada01AmbientMusic\)/);
});
