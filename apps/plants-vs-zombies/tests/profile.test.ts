import assert from 'node:assert/strict';
import test from 'node:test';
import { createProfileRepository, DEFAULT_PROFILE } from '../src/save/profileRepository';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test('profile repository writes versioned settings and progression', () => {
  const storage = new MemoryStorage();
  const profile = createProfileRepository(storage);
  profile.update((draft) => {
    draft.settings.music = false;
    draft.adventure.completedLevels.push('1-1');
    draft.adventure.unlockedLevels.push('1-2');
  });

  const reloaded = createProfileRepository(storage).read();
  assert.equal(reloaded.settings.music, false);
  assert.deepEqual(reloaded.adventure.completedLevels, ['1-1']);
  assert.deepEqual(reloaded.adventure.unlockedLevels, ['1-1', '1-2']);
});

test('a new profile starts with the original first Adventure plant only', () => {
  assert.deepEqual(DEFAULT_PROFILE.unlockedPlants, ['peashooter']);
});

test('corrupt profile data recovers to a safe default', () => {
  const storage = new MemoryStorage();
  storage.setItem('wishflow-plants-vs-zombies-profile', '{broken');
  assert.deepEqual(createProfileRepository(storage).read(), DEFAULT_PROFILE);
});

test('version one profiles migrate into mode progression without losing existing progress', () => {
  const storage = new MemoryStorage();
  storage.setItem('wishflow-plants-vs-zombies-profile', JSON.stringify({
    version: 1,
    settings: { music: false, sound: true, screenShake: false },
    adventure: { unlockedLevels: ['1-1', '1-2'], completedLevels: ['1-1'] },
    unlockedPlants: ['sunflower', 'peashooter'],
  }));
  const profile = createProfileRepository(storage).read();
  assert.equal(profile.version, 2);
  assert.equal(profile.settings.music, false);
  assert.deepEqual(profile.adventure.completedLevels, ['1-1']);
  assert.deepEqual(profile.unlockedModes, []);
  assert.deepEqual(profile.completedModes, []);
  assert.equal(JSON.parse(storage.getItem('wishflow-plants-vs-zombies-profile')!).version, 2);
});

test('profile data rejects unknown plant and level ids', () => {
  const storage = new MemoryStorage();
  storage.setItem('wishflow-plants-vs-zombies-profile', JSON.stringify({
    ...DEFAULT_PROFILE,
    unlockedPlants: ['sunflower', 'unlisted-plant'],
    adventure: { unlockedLevels: ['1-1', '1-99'], completedLevels: [] },
  }));
  assert.deepEqual(createProfileRepository(storage).read(), DEFAULT_PROFILE);
});

test('profile data rejects unknown mode ids', () => {
  const storage = new MemoryStorage();
  storage.setItem('wishflow-plants-vs-zombies-profile', JSON.stringify({
    ...DEFAULT_PROFILE,
    unlockedModes: ['unlisted-mode'],
  }));
  assert.deepEqual(createProfileRepository(storage).read(), DEFAULT_PROFILE);
});
