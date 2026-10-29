import { canonicalJsonValue, canonicalSha256Digest } from '../src/value-digest';
import {
  ExperimentRepositoryError,
  type ExperimentRepository,
  type NewSavedComparison,
} from '../src/experiments/experiment-repository';
import type { ExperimentComparisonReport, NumericSchemeVersion } from '../src/experiments';

const assert = {
  equal(actual: unknown, expected: unknown, message = 'Values differ'): void {
    if (!Object.is(actual, expected)) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  },
  deepEqual(actual: unknown, expected: unknown, message = 'Structures differ'): void {
    if (canonicalJsonValue(actual) !== canonicalJsonValue(expected)) {
      throw new Error(`${message}: expected ${canonicalJsonValue(expected)}, got ${canonicalJsonValue(actual)}`);
    }
  },
  async rejects(operation: Promise<unknown>, predicate?: (error: unknown) => boolean): Promise<void> {
    try {
      await operation;
    } catch (error) {
      if (!predicate || predicate(error)) return;
      throw new Error(`Rejected with an unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw new Error('Expected operation to reject');
  },
};

async function scheme(id: string, version: string, reward: number): Promise<NumericSchemeVersion> {
  const prepared = {
    scenarioId: 'cow-gulch',
    contentVersion: 'cow-gulch-v1',
    rulesVersion: 'gng-rules-3',
    parameters: [{ path: 'previewWave/enemy/cashReward', value: reward }],
  };
  return {
    id,
    version,
    scenarioId: prepared.scenarioId,
    contentVersion: prepared.contentVersion,
    rulesVersion: prepared.rulesVersion,
    preparedSetup: { ...prepared, digest: await canonicalSha256Digest(prepared) },
  };
}

async function comparison(id: string, savedAt: number, reward: number): Promise<NewSavedComparison> {
  const baseline = await scheme('cow-gulch-original', '1', 1);
  const candidate = await scheme('cow-gulch-draft', 'draft-' + reward, reward);
  const request = {
    comparisonId: id,
    scenario: {
      id: 'cow-gulch-single-wave',
      version: '1',
      gameScenarioId: 'cow-gulch',
      contentVersion: 'cow-gulch-v1',
      rulesVersion: 'gng-rules-3',
      observationLevel: 'player-visible' as const,
      decisionIntervalFrames: 1,
      deltaMs: 100,
      maxFrames: 2_000,
      maxSimulatedMs: 200_000,
      maxEntities: 100,
      maxWallClockMs: 30_000,
      yieldEveryFrames: 40,
    },
    baseline: { id: baseline.id, version: baseline.version },
    candidate: { id: candidate.id, version: candidate.version },
    samples: [{ id: 'seed-42', randomSeed: 42 }],
    policy: { id: 'start-wave', version: '1' },
  };
  const side = {
    plannedSamples: 1,
    completedSamples: 1,
    incompleteSamples: 0,
    incompleteRate: 0,
    victories: 1,
    defeats: 0,
    winRate: 1,
    averageLivesRemaining: 50,
    averageVictoryTimeMs: 10_000,
    averageFinalCash: 66,
    averageCashDelta: 1,
    averagePeakEnemies: 1,
    averageEscapedEnemies: 0,
  };
  const report = {
    comparisonId: id,
    request,
    status: 'completed' as const,
    scenarioId: request.scenario.id,
    scenarioVersion: request.scenario.version,
    gameScenarioId: request.scenario.gameScenarioId,
    contentVersion: request.scenario.contentVersion,
    rulesVersion: request.scenario.rulesVersion,
    policyId: request.policy.id,
    policyVersion: request.policy.version,
    plannedSampleCount: 1,
    plannedRunCount: 2,
    completedRunCount: 2,
    incompleteRunCount: 0,
    incompleteRate: 0,
    pairedCompletedSampleCount: 1,
    baseline: { scheme: baseline, runs: [], summary: side },
    candidate: { scheme: candidate, runs: [], summary: { ...side, averageFinalCash: 70, averageCashDelta: 5 } },
    pairs: [],
  } as unknown as ExperimentComparisonReport;
  return {
    id,
    savedAt,
    request,
    summary: {
      status: report.status,
      scenarioId: report.scenarioId,
      scenarioVersion: report.scenarioVersion,
      candidateScheme: request.candidate,
      plannedSampleCount: report.plannedSampleCount,
      completedRunCount: report.completedRunCount,
    },
    report,
  };
}

function repositoryError(code: string) {
  return (error: unknown) => error instanceof ExperimentRepositoryError && error.code === code;
}

export async function verifyExperimentRepositoryContract(
  createRepository: () => ExperimentRepository,
): Promise<void> {
  const repository = createRepository();
  assert.equal(await repository.readScheme({ id: 'missing', version: '1' }), null);
  assert.equal(await repository.openComparison('missing'), null);
  assert.deepEqual(await repository.listComparisons(), { items: [] });

  const baseline = await scheme('cow-gulch-original', '1', 1);
  const savedBaseline = await repository.saveScheme(baseline);
  assert.deepEqual(savedBaseline, baseline);
  assert.deepEqual(await repository.readScheme({ id: baseline.id, version: baseline.version }), baseline);
  assert.deepEqual(await repository.saveScheme(baseline), baseline, 'same immutable scheme is an idempotent save');

  const changedBaseline = await scheme(baseline.id, baseline.version, 9);
  await assert.rejects(repository.saveScheme(changedBaseline), repositoryError('conflict'));

  const first = await comparison('comparison-alpha', 100, 5);
  const second = await comparison('comparison-beta', 100, 9);
  for (const record of [first, second]) {
    await repository.saveScheme(record.report.baseline.scheme);
    await repository.saveScheme(record.report.candidate.scheme);
  }
  const savedFirst = await repository.saveComparison(first);
  assert.equal(savedFirst.id, first.id);
  assert.equal(savedFirst.digest.startsWith('sha256:'), true);
  assert.deepEqual(savedFirst.report, first.report);
  assert.deepEqual(await repository.openComparison(first.id), savedFirst);
  assert.deepEqual(await repository.saveComparison(first), savedFirst, 'same experiment is idempotent');

  const changedFirst = await comparison(first.id, first.savedAt, 7);
  await assert.rejects(repository.saveComparison(changedFirst), repositoryError('conflict'));

  await repository.saveComparison(second);
  const pageOne = await repository.listComparisons({ limit: 1 });
  assert.deepEqual(pageOne.items.map(({ id }) => id), ['comparison-beta']);
  assert.equal(typeof pageOne.nextCursor, 'string');
  const pageTwo = await repository.listComparisons({ limit: 1, cursor: pageOne.nextCursor });
  assert.deepEqual(pageTwo.items.map(({ id }) => id), ['comparison-alpha']);
  assert.equal(pageTwo.nextCursor, undefined);

  await assert.rejects(repository.listComparisons({ limit: 0 }), repositoryError('invalid-input'));
  await assert.rejects(repository.listComparisons({ limit: 1, cursor: 'not-a-cursor' }), repositoryError('invalid-input'));
}
