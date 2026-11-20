import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createDakota03CampaignContent } from '../src/content/dakota-03-campaign';
import { dakota03CampaignContentVersionFor } from '../src/content/dakota-03-content-version';
import { dakota03CampaignId } from '../src/content/dakota-03-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { createGame, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

function noEnemyContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createDakota03CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave) => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({
        ...pool,
        requests: pool.requests.map(() => 0),
      })),
    })),
  };
}

async function settleWithoutBattle(session: Awaited<ReturnType<ReturnType<typeof createGame>['open']>>) {
  for (let frame = 0; frame < 500 && !session.terminalRecord(); frame += 1) {
    session.advance({ deltaMs: 0 });
  }
  const settlement = session.terminalRecord();
  assert.equal(settlement?.outcome, 'victory');
  return settlement!;
}

test('Fort Knockout is the gated 33rd official stage after Six Grandfathers', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === dakota03CampaignId);
  assert.equal(officialCampaignStages.length, 37);
  assert.deepEqual(stage, {
    scenarioId: dakota03CampaignId,
    contentVersion: dakota03CampaignContentVersionFor([]),
    title: { en: 'Fort Knockout · Level 33', zh: '堡垒决战 · 第 33 关' },
    globalLevel: 33,
    requiresCompletedScenarioIds: ['campaign-dakota-02'],
  });

  const before = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(33, await before.loadCampaign()), 'locked');

  const completedThroughLevel32 = officialCampaignStages.slice(0, 32).map(({ scenarioId }) => scenarioId);
  const after = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedThroughLevel32 }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(32, await after.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(33, await after.loadCampaign()), 'available');
});

test('browser registry opens Fort Knockout with the profile unlock snapshot and exact content version', async () => {
  const completedScenarioIds = [
    'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10', 'campaign-mississippi-10',
  ];
  const expected = createDakota03CampaignContent(completedScenarioIds);
  const contentVersion = getBrowserScenarioContentVersion(dakota03CampaignId, completedScenarioIds);
  assert.equal(contentVersion, expected.contentVersion);

  const session = await createBrowserGame(completedScenarioIds).open({
    scenarioId: dakota03CampaignId,
    contentVersion,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 33_020,
  });
  try {
    assert.equal(session.startRecord.contentVersion, expected.contentVersion);
    const placementShape = (units: readonly { id: string; type: string; activity?: number; asset: string; cell: { x: number; y: number } }[]) => (
      units.map(({ id, type, activity, asset, cell }) => ({ id, type, activity, asset, cell }))
        .sort((left, right) => left.id.localeCompare(right.id))
    );
    assert.deepEqual(placementShape(session.observe().units), placementShape(expected.units));
    assert.equal(session.observe().wave?.totalWaves, 10);
  } finally {
    session.close();
  }
});

test('Fort Knockout Free Play accepts all difficulties and cannot update campaign progress', async () => {
  const progress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  const profileBefore = await progress.exportProfileData();
  const scenario = noEnemyContent([]);
  const game = createGame({ scenarios: { [dakota03CampaignId]: scenario } });

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const session = await game.open({
      scenarioId: dakota03CampaignId,
      contentVersion: scenario.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 33_000 + index,
    });
    try {
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
    } finally {
      session.close();
    }
  }

  const session = await game.open({
    scenarioId: dakota03CampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 33_099,
  });
  try {
    const settlement = await settleWithoutBattle(session);
    assert.equal(settlement.mode, 'free');
    await assert.rejects(progress.applySettlement(settlement), /Progress only accepts formal game settlements/);
    assert.deepEqual(await progress.exportProfileData(), profileBefore);
  } finally {
    session.close();
  }
});

test('Fort Knockout formal victory records Level 33 completion and high score after Level 32', async () => {
  const completedScenarioIds = officialCampaignStages.slice(0, 32).map(({ scenarioId }) => scenarioId);
  const progress = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedScenarioIds }),
    officialCampaignStages,
  );
  const scenario = noEnemyContent(completedScenarioIds);
  const session = await createGame({ scenarios: { [dakota03CampaignId]: scenario } }).open({
    scenarioId: dakota03CampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 33_100,
  });
  try {
    const settlement = await settleWithoutBattle(session);
    assert.equal(settlement.mode, 'formal');
    await progress.applySettlement(settlement);
    const saved = await progress.loadCampaign();
    assert.deepEqual(saved.profile.completedScenarios, [...completedScenarioIds, dakota03CampaignId]);
    assert.equal(saved.profile.highScores[dakota03CampaignId], settlement.highScoreCandidate);
  } finally {
    session.close();
  }
});
