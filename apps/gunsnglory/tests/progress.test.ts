import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgress, ProgressError } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';
import { verifyProfileRepositoryContract } from './profile-repository-contract';
import type { GameSettlementRecord } from '../src/game';
import type { CampaignStageDefinition } from '../src/progress';
import { cowGulchLevelOneContent, officialCampaignStages } from '../src/content/official-campaign';

test('loads Easy and a default speed for a new or older profile without the setting', async () => {
  for (const settings of [undefined, {}, { soundEnabled: true }]) {
    const repository = createMemoryProfileRepository(settings === undefined ? undefined : {
      settings,
    });
    const progress = createProgress(repository);
    assert.deepEqual(await progress.loadSettings(), { simulationSpeed: 1, difficulty: 'easy' });
  }
});

test('loads and saves supported speeds through the shared profile repository', async () => {
  const progress = createProgress(createMemoryProfileRepository({
    settings: { simulationSpeed: 1.5, soundEnabled: false },
  }));

  assert.deepEqual(await progress.loadSettings(), { simulationSpeed: 1.5, difficulty: 'easy' });
  assert.deepEqual(await progress.saveSettings({ simulationSpeed: 4.25, difficulty: 'medium' }), {
    simulationSpeed: 4,
    difficulty: 'medium',
  });
  assert.deepEqual((await progress.loadProfile()).settings, { simulationSpeed: 4, difficulty: 'medium' });
});

test('reports a stale settings write instead of silently replacing another profile update', async () => {
  const repository = createMemoryProfileRepository();
  const first = createProgress(repository);
  const second = createProgress(repository);
  await Promise.all([first.loadProfile(), second.loadProfile()]);

  await first.saveSettings({ simulationSpeed: 2, difficulty: 'easy' });
  await assert.rejects(second.saveSettings({ simulationSpeed: 3, difficulty: 'medium' }), (error: unknown) =>
    (error as { code?: string }).code === 'conflict');
  const persistedSpeed = (await first.loadProfile()).settings.simulationSpeed;
  assert.equal(persistedSpeed, 2);
  await second.loadProfile();
  await second.saveSettings({ simulationSpeed: persistedSpeed === 2 ? 3 : 2, difficulty: 'easy' });
  assert.notEqual((await second.loadProfile()).settings.simulationSpeed, persistedSpeed);
});

test('retains a failed settings write for an idempotent retry', async () => {
  const memory = createMemoryProfileRepository();
  let failNextWrite = true;
  const repository = {
    readProfile: () => memory.readProfile(),
    async writeProfile(request: Parameters<typeof memory.writeProfile>[0]) {
      if (failNextWrite) {
        failNextWrite = false;
        throw new Error('IndexedDB unavailable');
      }
      return memory.writeProfile(request);
    },
    exportRawProfileRecord: () => memory.exportRawProfileRecord(),
    resetCorruptProfile: (snapshot: string) => memory.resetCorruptProfile(snapshot),
  };
  const progress = createProgress(repository);
  await progress.loadProfile();
  await assert.rejects(progress.saveSettings({ simulationSpeed: 2, difficulty: 'easy' }), /IndexedDB unavailable/);
  assert.deepEqual(await progress.retrySettings(), { simulationSpeed: 2, difficulty: 'easy' });
  assert.deepEqual(await progress.loadSettings(), { simulationSpeed: 2, difficulty: 'easy' });
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

test('projects only campaign-specific completions into available and locked stages', async () => {
  const stages: readonly CampaignStageDefinition[] = [
    {
      scenarioId: 'campaign-cow-gulch-1',
      contentVersion: 'campaign-sample-1',
      title: { en: 'Cow Gulch sample 1', zh: '牛溪谷样本 1' },
      globalLevel: 1,
      requiresCompletedScenarioIds: [],
    },
    {
      scenarioId: 'campaign-cow-gulch-2',
      contentVersion: 'campaign-sample-2',
      title: { en: 'Cow Gulch sample 2', zh: '牛溪谷样本 2' },
      globalLevel: 2,
      requiresCompletedScenarioIds: ['campaign-cow-gulch-1'],
    },
  ];
  const repository = createMemoryProfileRepository({ completedScenarios: ['cow-gulch'] });
  const progress = createProgress(repository, stages);

  const initial = await progress.loadCampaign();
  assert.deepEqual(initial.stages.map(({ status }) => status), ['available', 'locked']);
  assert.equal(initial.completedCount, 0);
  assert.equal(initial.hardModeUnlocked, false);
  assert.equal(initial.profile.completedScenarios.includes('cow-gulch'), true);
  assert.equal(Object.isFrozen(initial.stages), true);

  await progress.applySettlement(settlement({
    settlementId: 'campaign-session:campaign-cow-gulch-1:1',
    sessionId: 'campaign-session',
    scenarioId: 'campaign-cow-gulch-1',
  }));
  const advanced = await progress.loadCampaign();
  assert.deepEqual(advanced.stages.map(({ status }) => status), ['completed', 'available']);
  assert.equal(advanced.completedCount, 1);
  assert.equal(advanced.hardModeUnlocked, false);
  assert.equal(advanced.stages[0]?.highScore, 50);
  assert.equal(advanced.stages[1]?.contentVersion, 'campaign-sample-2');
});

test('keeps legacy samples isolated while official Cow Gulch progress preserves the existing profile', async () => {
  const legacyCompleted = [
    'cow-gulch',
    'campaign-cow-gulch-sample-1',
    'campaign-cow-gulch-sample-2',
    'cow-gulch-original-waves-1-8',
  ];
  const legacyScores = {
    'cow-gulch': 50,
    'campaign-cow-gulch-sample-1': 50,
    'campaign-cow-gulch-sample-2': 61,
    'cow-gulch-original-waves-1-8': 80,
  };
  const repository = createMemoryProfileRepository({
    settings: { simulationSpeed: 1.5, difficulty: 'medium' },
    completedScenarios: legacyCompleted,
    highScores: legacyScores,
    appliedSettlementIds: ['legacy-session:cow-gulch:1'],
  });
  const progress = createProgress(repository, officialCampaignStages);

  const before = await progress.loadCampaign();
  assert.deepEqual(before.stages.map(({ scenarioId, status, highScore }) => ({ scenarioId, status, highScore })), [{
    scenarioId: cowGulchLevelOneContent.id,
    status: 'available',
    highScore: undefined,
  }]);
  assert.equal(before.completedCount, 0);
  assert.deepEqual(before.profile.settings, { simulationSpeed: 1.5, difficulty: 'medium' });

  const officialSettlement = settlement({
    settlementId: `official-session:${cowGulchLevelOneContent.id}:8`,
    sessionId: 'official-session',
    scenarioId: cowGulchLevelOneContent.id,
    waveNumber: 8,
    scoreBase: 120,
    displayScore: 90,
    highScoreCandidate: 90,
  });
  const saved = await progress.applySettlement(officialSettlement);
  assert.equal(saved.status, 'saved');
  assert.deepEqual(saved.profile.completedScenarios, [...legacyCompleted, cowGulchLevelOneContent.id]);
  assert.deepEqual(saved.profile.highScores, { ...legacyScores, [cowGulchLevelOneContent.id]: 90 });
  assert.deepEqual((await repository.readProfile())?.data.appliedSettlementIds, [
    'legacy-session:cow-gulch:1', officialSettlement.settlementId,
  ]);

  const reloaded = await createProgress(repository, officialCampaignStages).loadCampaign();
  assert.deepEqual(reloaded.stages.map(({ status }) => status), ['completed']);
  assert.equal(reloaded.completedCount, 1);
  assert.deepEqual(reloaded.profile.settings, { simulationSpeed: 1.5, difficulty: 'medium' });
});

test('refreshing campaign progress preserves a pending settings retry', async () => {
  const memory = createMemoryProfileRepository();
  let failNextWrite = true;
  const repository = {
    readProfile: () => memory.readProfile(),
    async writeProfile(request: Parameters<typeof memory.writeProfile>[0]) {
      if (failNextWrite) {
        failNextWrite = false;
        throw new Error('IndexedDB unavailable');
      }
      return memory.writeProfile(request);
    },
    exportRawProfileRecord: () => memory.exportRawProfileRecord(),
    resetCorruptProfile: (snapshot: string) => memory.resetCorruptProfile(snapshot),
  };
  const progress = createProgress(repository);
  await progress.loadProfile();
  await assert.rejects(progress.saveSettings({ simulationSpeed: 2, difficulty: 'easy' }), /IndexedDB unavailable/);

  await progress.loadCampaign();
  assert.deepEqual(await progress.retrySettings(), { simulationSpeed: 2, difficulty: 'easy' });
});

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
    settings: { simulationSpeed: 1, difficulty: 'easy' },
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
    exportRawProfileRecord: () => memory.exportRawProfileRecord(),
    resetCorruptProfile: (snapshot: string) => memory.resetCorruptProfile(snapshot),
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
    exportRawProfileRecord: memory.exportRawProfileRecord,
    resetCorruptProfile: memory.resetCorruptProfile,
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
  await assert.rejects(corrupt.loadSettings(), (error: unknown) =>
    error instanceof ProgressError && error.code === 'corrupt-data' && /Invalid saved simulation speed/.test(error.message));

  const memory = createMemoryProfileRepository();
  const failingRepository = {
    async readProfile() { return memory.readProfile(); },
    async writeProfile() { throw new Error('IndexedDB unavailable'); },
    exportRawProfileRecord: () => memory.exportRawProfileRecord(),
    resetCorruptProfile: (snapshot: string) => memory.resetCorruptProfile(snapshot),
  };
  const progress = createProgress(failingRepository);
  await assert.rejects(progress.saveSettings({ simulationSpeed: 2, difficulty: 'easy' }), /IndexedDB unavailable/);
});

test('defaults legacy settings to Easy and rejects an invalid saved difficulty', async () => {
  const legacy = createProgress(createMemoryProfileRepository({ settings: { simulationSpeed: 2 } }));
  assert.deepEqual(await legacy.loadSettings(), { simulationSpeed: 2, difficulty: 'easy' });

  const corrupt = createProgress(createMemoryProfileRepository({ settings: { simulationSpeed: 2, difficulty: 'expert' } }));
  await assert.rejects(corrupt.loadSettings(), (error: unknown) =>
    error instanceof ProgressError && error.code === 'corrupt-data' && /Invalid saved game difficulty/.test(error.message));
});

test('exports the damaged record and resets it only against the exported snapshot', async () => {
  const repository = createMemoryProfileRepository({ settings: { simulationSpeed: 1.1 } });
  const progress = createProgress(repository);
  const backup = await progress.exportSavedProfile();
  assert.ok(backup);
  assert.equal(JSON.parse(backup).settings.simulationSpeed, 1.1);
  await assert.rejects(progress.resetCorruptProfile(`${backup} `), (error: unknown) =>
    error instanceof ProgressError && error.code === 'conflict');
  assert.equal(await progress.exportSavedProfile(), backup);

  const restored = await progress.resetCorruptProfile(backup);
  assert.deepEqual(restored, {
    settings: { simulationSpeed: 1, difficulty: 'easy' },
    completedScenarios: [],
    highScores: {},
  });
});

test('does not allow the corrupt-data recovery operation to delete a valid profile', async () => {
  const repository = createMemoryProfileRepository({ settings: { simulationSpeed: 2 } });
  const progress = createProgress(repository);
  const snapshot = await progress.exportSavedProfile();
  assert.ok(snapshot);
  await assert.rejects(progress.resetCorruptProfile(snapshot), (error: unknown) =>
    error instanceof ProgressError && error.code === 'invalid-input');
  assert.deepEqual(await progress.loadSettings(), { simulationSpeed: 2, difficulty: 'easy' });
});
