import type { ProfileData, ProfileRepository } from '../src/progress/profile-repository';

function same<T>(actual: T, expected: T, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function rejectionCode(action: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await action();
    return undefined;
  } catch (error) {
    return typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : undefined;
  }
}

export async function verifyProfileRepositoryContract(
  createRepository: () => ProfileRepository,
): Promise<void> {
  const repository = createRepository();
  same(await repository.readProfile(), null, 'new repository must be empty');

  const initial: ProfileData = {
    settings: { simulationSpeed: 1 },
    completedScenarios: [],
    highScores: {},
    appliedSettlementIds: [],
  };
  const created = await repository.writeProfile({
    data: initial,
    expectedRevision: null,
    operationId: 'contract:create',
  });
  const base = await repository.readProfile();
  if (!base) throw new Error('created profile must be readable');
  same(base.revision, created.revision, 'write must return the committed revision');
  same(base.data, initial, 'profile data must round-trip');

  const firstData: ProfileData = {
    ...base.data,
    completedScenarios: ['cow-gulch'],
    highScores: { 'cow-gulch': 50 },
    appliedSettlementIds: ['settlement-one'],
  };
  const secondData: ProfileData = {
    ...base.data,
    completedScenarios: ['mesa-junction'],
    highScores: { 'mesa-junction': 42 },
    appliedSettlementIds: ['settlement-two'],
  };
  const competing = await Promise.allSettled([
    repository.writeProfile({
      data: firstData,
      expectedRevision: base.revision,
      operationId: 'contract:compete:first',
    }),
    repository.writeProfile({
      data: secondData,
      expectedRevision: base.revision,
      operationId: 'contract:compete:second',
    }),
  ]);
  const winners = competing.filter((result) => result.status === 'fulfilled');
  const losers = competing.filter((result) => result.status === 'rejected');
  same(winners.length, 1, 'exactly one conditional write must commit');
  same(losers.length, 1, 'the stale conditional write must conflict');
  const loser = losers[0];
  if (loser?.status !== 'rejected' || typeof loser.reason !== 'object'
    || loser.reason === null || !('code' in loser.reason)) {
    throw new Error('stale conditional write must return a typed conflict');
  }
  same((loser.reason as { code: string }).code, 'conflict', 'stale write error code');

  const winnerIndex = competing.findIndex((result) => result.status === 'fulfilled');
  const winnerRequest = winnerIndex === 0
    ? { data: firstData, expectedRevision: base.revision, operationId: 'contract:compete:first' }
    : { data: secondData, expectedRevision: base.revision, operationId: 'contract:compete:second' };
  const winningRevision = (winners[0] as PromiseFulfilledResult<{ revision: number }>).value.revision;
  const retried = await repository.writeProfile(winnerRequest);
  same(retried.revision, winningRevision, 'identical operation retry must be idempotent');

  const changedRequest = {
    ...winnerRequest,
    data: { ...winnerRequest.data, settings: { simulationSpeed: 2 } },
  };
  same(
    await rejectionCode(() => repository.writeProfile(changedRequest)),
    'invalid-input',
    'operation ID reused with different content must be rejected',
  );

  same(
    await rejectionCode(() => repository.writeProfile({
      ...winnerRequest,
      expectedRevision: -1,
      operationId: 'contract:invalid-revision',
    })),
    'invalid-input',
    'invalid revisions must be rejected before compare-and-swap',
  );

  const final = await repository.readProfile();
  same(final?.revision, winningRevision, 'failed conflict and invalid retry must not change revision');
  same(final?.data, winnerRequest.data, 'failed conflict and invalid retry must preserve committed data');
}
