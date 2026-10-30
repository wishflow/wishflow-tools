import assert from 'node:assert/strict';
import test from 'node:test';
import { CampaignWaveIntroCursor, cowGulchWaveIntros } from '../src/content/cow-gulch-wave-intros';

test('maps all eight Cow Gulch wave messages to their original wave order', () => {
  assert.deepEqual(cowGulchWaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(cowGulchWaveIntros[0]?.text.en.startsWith("Hey, Boss! I'm Pedro"), true);
  assert.match(cowGulchWaveIntros[0]!.text.en, /move him to the canyon/i);
  assert.match(cowGulchWaveIntros[1]!.text.en, /sleeping Desperados/i);
  assert.match(cowGulchWaveIntros[2]!.text.en, /covered wagons/i);
  assert.match(cowGulchWaveIntros[7]!.text.en, /last group has set off/i);
  assert.ok(cowGulchWaveIntros.every(({ speaker, portraitAsset, voiceSound, text }) =>
    speaker.en === 'Pedro' && speaker.zh === '佩德罗'
    && portraitAsset === 'portrait_pedro' && voiceSound === 'sound_pedro'
    && text.en.length > 0 && text.zh.length > 0));
});

test('claims each available wave introduction once and ignores invalid or repeated wave numbers', () => {
  const cursor = new CampaignWaveIntroCursor();

  assert.equal(cursor.next(0), undefined);
  assert.equal(cursor.next(1)?.waveNumber, 1);
  assert.equal(cursor.next(1), undefined);
  assert.equal(cursor.next(2)?.waveNumber, 2);
  assert.equal(cursor.next(1), undefined);
  assert.equal(cursor.next(8)?.waveNumber, 8);
  assert.equal(cursor.next(9), undefined);
  assert.equal(cursor.next(Number.NaN), undefined);
});
