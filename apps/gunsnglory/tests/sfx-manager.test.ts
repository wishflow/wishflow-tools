import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseSoundVariation, SoundEffectsManager, type SoundEffectRequest, type SoundEffectViewport } from '../src/audio/sfx-manager';

const viewport: SoundEffectViewport = {
  origin: { x: 0, y: 0 },
  tileSize: 32,
  width: 1024,
  height: 576,
};
const point = { x: 10 * 7680, y: 8 * 7680 };
const revolver = (id: 0 | 1): SoundEffectRequest => ({
  id,
  positionFine: point,
  assets: ['sound_revolver', 'sound_revolver2'],
});

test('chooses one independent sound variation without consuming randomness for fixed or empty assets', () => {
  let randomCalls = 0;
  const random = () => {
    randomCalls += 1;
    return randomCalls === 1 ? 0 : 0.999;
  };

  assert.equal(chooseSoundVariation(['sound_pyromaniac_1', 'sound_pyromaniac_2'], random), 'sound_pyromaniac_1');
  assert.equal(chooseSoundVariation(['sound_pyromaniac_1', 'sound_pyromaniac_2'], random), 'sound_pyromaniac_2');
  assert.equal(chooseSoundVariation(['sound_fixed'], random), 'sound_fixed');
  assert.equal(chooseSoundVariation([], random), undefined);
  assert.equal(randomCalls, 2);
});

test('filters off-screen requests before consuming a variation or starting cooldown', () => {
  let randomCalls = 0;
  const manager = new SoundEffectsManager(() => {
    randomCalls += 1;
    return 0.75;
  });

  assert.equal(manager.request({ ...revolver(0), positionFine: { x: -2 * 7680, y: 8 * 7680 } }, viewport), undefined);
  assert.equal(randomCalls, 0);
  assert.equal(manager.request(revolver(0), viewport), 'sound_revolver2');
  assert.equal(randomCalls, 1);
});

test('shares each 200 ms cooldown across a variation pair and releases at the boundary', () => {
  let randomCalls = 0;
  const manager = new SoundEffectsManager(() => {
    randomCalls += 1;
    return randomCalls % 2 === 0 ? 0 : 0.75;
  });

  assert.equal(manager.request(revolver(0), viewport), 'sound_revolver2');
  assert.equal(manager.request(revolver(1), viewport), undefined);
  assert.equal(randomCalls, 1, 'a paired request blocked by cooldown does not consume a variant');
  manager.advance(199);
  assert.equal(manager.request(revolver(1), viewport), undefined);
  manager.advance(1);
  assert.equal(manager.request(revolver(1), viewport), 'sound_revolver');
  assert.equal(randomCalls, 2);
});

test('fixed effects use a 300 ms cooldown and do not consume variation randomness', () => {
  let randomCalls = 0;
  const manager = new SoundEffectsManager(() => {
    randomCalls += 1;
    return 0;
  });
  const dynamite: SoundEffectRequest = { id: 10, positionFine: point, assets: ['sound_dynamite'] };

  assert.equal(manager.request(dynamite, viewport), 'sound_dynamite');
  manager.advance(299);
  assert.equal(manager.request(dynamite, viewport), undefined);
  manager.advance(1);
  assert.equal(manager.request(dynamite, viewport), 'sound_dynamite');
  assert.equal(randomCalls, 0);
});

test('muting playback does not change accepted variants, cooldowns, or variation consumption', () => {
  const simulate = (soundEnabled: boolean) => {
    let randomCalls = 0;
    const played: string[] = [];
    const manager = new SoundEffectsManager(() => {
      randomCalls += 1;
      return randomCalls % 2 === 1 ? 0.75 : 0;
    });
    const selected: string[] = [];
    const request = (effect: SoundEffectRequest) => {
      const asset = manager.request(effect, viewport);
      if (!asset) return;
      selected.push(asset);
      if (soundEnabled) played.push(asset);
    };

    request(revolver(0));
    manager.advance(200);
    request(revolver(1));
    return { selected, played, randomCalls };
  };

  const withSound = simulate(true);
  const muted = simulate(false);
  assert.deepEqual(muted.selected, withSound.selected);
  assert.deepEqual(muted.played, []);
  assert.equal(muted.randomCalls, withSound.randomCalls);
  assert.deepEqual(withSound.played, withSound.selected);
});

test('screen filtering follows map camera origin and clips at the 16:9 viewport edges', () => {
  const manager = new SoundEffectsManager(() => 0);
  const pannedViewport = { ...viewport, origin: { x: -512, y: -288 } };

  assert.equal(manager.request({ ...revolver(0), positionFine: { x: -1 * 7680, y: 8 * 7680 } }, pannedViewport), undefined);
  assert.equal(manager.request({ ...revolver(0), positionFine: { x: 16 * 7680, y: 10 * 7680 } }, pannedViewport), 'sound_revolver');
});
