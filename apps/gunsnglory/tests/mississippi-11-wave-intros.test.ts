import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { mississippi11WaveIntros } from '../src/content/mississippi-11-wave-intros';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Traveller’s Town dialogue preserves APK English strings, wave order, speakers, portraits, and voices', () => {
  assert.deepEqual(mississippi11WaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(mississippi11WaveIntros.map(({ dialogueResource }) => dialogueResource), [
    'T_CAMPAIGN_11_01', 'T_CAMPAIGN_11_02', 'T_CAMPAIGN_11_03', 'T_CAMPAIGN_11_04',
    'T_CAMPAIGN_11_05', 'T_CAMPAIGN_11_06', 'T_CAMPAIGN_11_07', 'T_CAMPAIGN_11_08',
  ]);
  assert.deepEqual(mississippi11WaveIntros.map(({ speaker }) => speaker.en), [
    'Settlers', 'Gunslinger', 'Mexican', 'Gunslinger', 'Mexican', 'Settlers', 'Gunslinger', 'Mexican',
  ]);
  assert.deepEqual(mississippi11WaveIntros.map(({ text }) => text.en), [
    "Oh, honey, it's so beautiful here. We should take a rest soon and have a swim in the Mississippi!",
    'A swim, huh? Ha! Who would do that? I have a much better idea...',
    "Boss, there are some more on the way! We'll have some fireworks like on... what's that day called again? ",
    "It looks like someone got tipped off... They're trying from the other side!",
    'How is our captain doing? He should let off some steam!',
    'We should be careful, honey! Follow me, I know the way...',
    "Someone scared the herd! We can't let any of them through!",
    'Hey, Boss! I think these are the last!',
  ]);
  assert.deepEqual(mississippi11WaveIntros.map(({ portraitAsset }) => portraitAsset), [
    'portrait_settlers', 'portrait_gunslinger', 'portrait_mexican', 'portrait_gunslinger',
    'portrait_mexican', 'portrait_settlers', 'portrait_gunslinger', 'portrait_mexican',
  ]);
  assert.deepEqual(mississippi11WaveIntros.map(({ voiceSound }) => voiceSound), [
    'sound_siedler', 'sound_desperado_yihaa', 'sound_mexican_arriba', 'sound_desperado_yihaa',
    'sound_mexican_arriba', 'sound_siedler', 'sound_desperado_yihaa', 'sound_mexican_arriba',
  ]);
  assert.ok(mississippi11WaveIntros.every(({ speaker, text }) =>
    speaker.zh.length > 0 && text.zh.length > 0));
});

test('all Traveller’s Town portrait and voice assets already exist in the offline bundle', () => {
  for (const asset of new Set(mississippi11WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const bytes = readFileSync(path.join(appRoot, 'public/assets', `${asset}.png`));
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', `${asset} is PNG`);
  }
  for (const sound of new Set(mississippi11WaveIntros.flatMap(({ voiceSound }) => voiceSound ? [voiceSound] : []))) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets/sounds', `${sound}.ogg`)), `${sound} is bundled`);
  }
});
