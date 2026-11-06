import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { CampaignWaveIntroCursor } from '../src/content/cow-gulch-wave-intros';
import { fortKaboomCampaignWaves } from '../src/content/fort-kaboom-waves';
import { fortKaboomWaveIntros } from '../src/content/fort-kaboom-wave-intros';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Fort Kaboom has one bilingual offline introduction matching each APK wave portrait', () => {
  assert.deepEqual(fortKaboomWaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(fortKaboomWaveIntros.map(({ portraitAsset }) => portraitAsset), fortKaboomCampaignWaves.map(({ portraitAsset }) => portraitAsset));
  assert.deepEqual(fortKaboomWaveIntros.map(({ speaker }) => speaker.en), [
    'Pedro', 'Pedro', 'Settlers', 'Pedro', 'Settlers', 'Deserter', 'Pedro', 'Pedro', 'Deserter', 'Pedro',
  ]);
  assert.ok(fortKaboomWaveIntros.every(({ speaker, text }) =>
    speaker.en.length > 0 && speaker.zh.length > 0 && text.en.length > 0 && text.zh.length > 0));
  assert.ok(fortKaboomWaveIntros.every(({ text }) => !/real money|invest/i.test(text.en)));
  assert.deepEqual(fortKaboomWaveIntros.map(({ voiceSound }) => voiceSound), [
    'sound_pedro', 'sound_pedro', 'sound_siedler', 'sound_pedro', 'sound_siedler',
    'sound_deserter_yes_sir', 'sound_pedro', 'sound_pedro', 'sound_deserter_yes_sir', 'sound_pedro',
  ]);
  assert.deepEqual(fortKaboomWaveIntros.map(({ text }) => text.en), [
    'The army has hidden supply crates here. Collect them with a unit to earn lots of rewards!',
    "The soldiers of Fort Kaboom love money more than anything. They're bound to desert and join us for a fistful of dollars.",
    "I always feel claustrophobic in these narrow canyons. Let's take the more open western approach!",
    'More and more soldiers are deserting. Watch where the cannons go; if they leave the fort, you can then hire them later!',
    'We actually want to go west, so why are we always traveling east? Aww, what the heck!',
    'Sir, our spies report that hundreds of settlers are approaching from all directions.',
    'Loot! Lots of lovely loot!',
    'Hee hee hee! Come here!',
    'Sir, a large group of riders is approaching!',
    "Looks like that's all. No, wait... more are arriving!",
  ]);
});

test('Fort Kaboom introduction cursor presents available waves once in order', () => {
  const cursor = new CampaignWaveIntroCursor(fortKaboomWaveIntros);
  assert.equal(cursor.next(1)?.text.en, fortKaboomWaveIntros[0]?.text.en);
  assert.equal(cursor.next(1), undefined);
  assert.equal(cursor.next(2)?.text.en, fortKaboomWaveIntros[1]?.text.en);
  assert.equal(cursor.next(9)?.text.en, fortKaboomWaveIntros[8]?.text.en);
  assert.equal(cursor.next(10)?.text.en, fortKaboomWaveIntros[9]?.text.en);
  assert.equal(cursor.next(10), undefined);
});

test('all Fort Kaboom introduction portraits exist as original-sized bundled PNGs', () => {
  const dimensions = new Map([
    ['portrait_pedro', [96, 110]],
    ['portrait_settlers', [96, 110]],
    ['portrait_deserter', [96, 96]],
  ]);
  for (const asset of new Set(fortKaboomWaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const file = path.join(appRoot, 'public/assets', `${asset}.png`);
    assert.ok(existsSync(file), `${asset} is bundled`);
    const png = readFileSync(file);
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${asset} is PNG`);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], dimensions.get(asset), `${asset} keeps APK dimensions`);
  }
});

test('all Fort Kaboom dialogue character sounds are bundled', () => {
  for (const sound of new Set(fortKaboomWaveIntros.flatMap(({ voiceSound }) => voiceSound ? [voiceSound] : []))) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets/sounds', `${sound}.ogg`)), `${sound} is bundled`);
  }
});
