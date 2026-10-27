import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgress, type SettingsRepository } from '../src/progress';

function createMemoryRepository(initial: unknown = null) {
  let stored: unknown = initial;
  const repository: SettingsRepository = {
    async readSettings() { return stored; },
    async writeSettings(settings) { stored = { ...settings }; },
  };
  return { repository, readStored: () => stored };
}

test('loads a default speed for a new or older profile without the setting', async () => {
  for (const initial of [null, {}, { soundEnabled: true }]) {
    const progress = createProgress(createMemoryRepository(initial).repository);
    assert.deepEqual(await progress.loadSettings(), { simulationSpeed: 1 });
  }
});

test('loads and saves supported speeds through the settings repository', async () => {
  const memory = createMemoryRepository({ simulationSpeed: 1.5 });
  const progress = createProgress(memory.repository);

  assert.deepEqual(await progress.loadSettings(), { simulationSpeed: 1.5 });
  assert.deepEqual(await progress.saveSettings({ simulationSpeed: 4.25 }), { simulationSpeed: 4 });
  assert.deepEqual(memory.readStored(), { simulationSpeed: 4 });
});

test('rejects corrupt persisted settings and does not hide repository write failures', async () => {
  const corrupt = createProgress(createMemoryRepository({ simulationSpeed: 1.1 }).repository);
  await assert.rejects(corrupt.loadSettings(), /Invalid saved simulation speed/);

  const failingRepository: SettingsRepository = {
    async readSettings() { return null; },
    async writeSettings() { throw new Error('IndexedDB unavailable'); },
  };
  const progress = createProgress(failingRepository);
  await assert.rejects(progress.saveSettings({ simulationSpeed: 2 }), /IndexedDB unavailable/);
});
