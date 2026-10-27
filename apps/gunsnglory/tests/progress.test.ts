import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';
import { verifyProfileRepositoryContract } from './profile-repository-contract';
import type { GameSettlementRecord } from '../src/game';

test('loads a default speed for a new or older profile without the setting', async () => {
  for (const settings of [undefined, {}, { soundEnabled: true }]) {
    const repository = createMemoryProfileRepository(settings === undefined ? undefined : {
      settings,
    });
    const progress = createProgress(repository);
    assert.deepEqual(await progress.loadSettings(), { simulationSpeed: 1 });
  }
});

test('loads and saves supported speeds through the shared profile repository', async () => {
  const progress = createProgress(createMemoryProfileRepository({
    settings: { simulationSpeed: 1.5, soundEnabled: false },
  }));

  assert.deepEqual(await progress.loadSettings(), { simulationSpeed: 1.5 });
  assert.deepEqual(await progress.saveSettings({ simulationSpeed: 4.25 }), { simulationSpeed: 4 });
  assert.deepEqual((await progress.loadProfile()).settings, { simulationSpeed: 4 });
});

function settlement(overrides: Partial<GameSettlementRecord> = {}): GameSettlementRecord {
  return {
    settlementId: 'session-one:cow-gulch:1',
    sessionId: 'session-one',
    scenarioId: 'cow-gulch',
    mode: 'formal',
    waveNumber: 1,
    outcome: 'victory',
    scoreBase: 67,
    displayScore: 50,
    highScoreCandidate: 50,
    ...overrides,
  };
}

test('records a formal sample settlement once and keeps the best score', async () => {
  const repository = createMemoryProfileRepository();
  const progress = createProgress(repository);
  const first = await progress.applySettlement(settlement());

  assert.equal(first.status, 'saved');
  assert.deepEqual(first.profile.completedScenarios, ['cow-gulch']);
  assert.deepEqual(first.profile.highScores, { 'cow-gulch': 50 });
  assert.deepEqual((await progress.loadProfile()).highScores, { 'cow-gulch': 50 });

  const duplicate = await createProgress(repository).applySettlement(settlement());
  assert.equal(duplicate.status, 'saved');
  assert.deepEqual(duplicate.profile, first.profile);
  assert.deepEqual((await repository.readProfile())?.data.appliedSettlementIds, ['session-one:cow-gulch:1']);

  const lower = await progress.applySettlement(settlement({
    settlementId: 'session-two:cow-gulch:1',
    sessionId: 'session-two',
    scoreBase: 20,
    displayScore: 15,
    highScoreCandidate: 15,
  }));
  assert.equal(lower.status, 'saved');
  assert.deepEqual(lower.profile.highScores, { 'cow-gulch': 50 });
});

test('does not apply debug, experiment, or replay settlements to a formal profile', async () => {
  const progress = createProgress(createMemoryProfileRepository());
  for (const mode of ['debug', 'experiment', 'replay'] as const) {
    await assert.rejects(progress.applySettlement(settlement({ mode })), /formal/i);
  }
  assert.deepEqual(await progress.loadProfile(), {
    settings: { simulationSpeed: 1 },
    completedScenarios: [],
    highScores: {},
  });
  await assert.rejects(
    progress.applySettlement(settlement({ settlementId: 'forged-settlement-id' })),
    /invalid/i,
  );
});

test('keeps an unsaved settlement pending and can retry after the repository recovers', async () => {
  const memory = createMemoryProfileRepository();
  let failNextWrite = true;
  const repository = {
    async readProfile() { return memory.readProfile(); },
    async writeProfile(request: Parameters<typeof memory.writeProfile>[0]) {
      if (failNextWrite) {
        failNextWrite = false;
        throw new Error('IndexedDB unavailable');
      }
      return memory.writeProfile(request);
    },
  };
  const progress = createProgress(repository);
  const pending = await progress.applySettlement(settlement());

  assert.equal(pending.status, 'failed');
  assert.deepEqual(pending.profile.highScores, {});
  const saved = await progress.retrySettlement(settlement().settlementId);
  assert.equal(saved.status, 'saved');
  assert.deepEqual(saved.profile.highScores, { 'cow-gulch': 50 });
});

test('returns a conflict when two Progress instances race from the same revision', async () => {
  const memory = createMemoryProfileRepository();
  let reads = 0;
  let releaseReads!: () => void;
  const bothRead = new Promise<void>((resolve) => { releaseReads = resolve; });
  const repository = {
    async readProfile() {
      const snapshot = await memory.readProfile();
      reads += 1;
      if (reads <= 2) {
        if (reads === 2) releaseReads();
        await bothRead;
      }
      return snapshot;
    },
    writeProfile: memory.writeProfile,
  };
  const firstProgress = createProgress(repository);
  const secondProgress = createProgress(repository);

  const results = await Promise.all([
    firstProgress.applySettlement(settlement()),
    secondProgress.applySettlement(settlement({
      settlementId: 'session-two:cow-gulch:1',
      sessionId: 'session-two',
      highScoreCandidate: 40,
      displayScore: 40,
      scoreBase: 40,
    })),
  ]);

  assert.deepEqual(results.map((result) => result.status).sort(), ['conflict', 'saved']);
  assert.equal((await firstProgress.loadProfile()).completedScenarios.length, 1);
});

test('runs the shared ProfileRepository contract against the in-memory adapter', async () => {
  await verifyProfileRepositoryContract(createMemoryProfileRepository);
});

test('rejects corrupt persisted settings and does not hide repository write failures', async () => {
  const corrupt = createProgress(createMemoryProfileRepository({ settings: { simulationSpeed: 1.1 } }));
  await assert.rejects(corrupt.loadSettings(), /Invalid saved simulation speed/);

  const memory = createMemoryProfileRepository();
  const failingRepository = {
    async readProfile() { return memory.readProfile(); },
    async writeProfile() { throw new Error('IndexedDB unavailable'); },
  };
  const progress = createProgress(failingRepository);
  await assert.rejects(progress.saveSettings({ simulationSpeed: 2 }), /IndexedDB unavailable/);
});
