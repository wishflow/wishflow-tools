import assert from 'node:assert/strict';
import test from 'node:test';
import { createDakota04CampaignContent } from '../src/content/dakota-04-campaign';
import { dakota04CampaignId } from '../src/content/dakota-04-identity';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { createGame, type GameSession, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

function noEnemyContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createDakota04CampaignContent(completedScenarioIds);
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

async function settleWithoutBattle(session: GameSession) {
  for (let frame = 0; frame < 500 && !session.terminalRecord(); frame += 1) {
    session.advance({ deltaMs: 0 });
  }
  const settlement = session.terminalRecord();
  assert.equal(settlement?.outcome, 'victory');
  return settlement!;
}

const completedThroughLevelThirtyThree = officialCampaignStages.slice(0, 33).map(({ scenarioId }) => scenarioId);

test('Badlands is the gated 34th official stage after Fort Knockout', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === dakota04CampaignId);
  assert.equal(officialCampaignStages.length, 39);
  assert.deepEqual(stage, {
    scenarioId: dakota04CampaignId,
    contentVersion: createDakota04CampaignContent().contentVersion,
    title: { en: 'Badlands · Level 34', zh: '荒原 · 第 34 关' },
    globalLevel: 34,
    requiresCompletedScenarioIds: ['campaign-dakota-03'],
  });

  const locked = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(34, await locked.loadCampaign()), 'locked');

  const unlocked = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedThroughLevelThirtyThree }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(33, await unlocked.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(34, await unlocked.loadCampaign()), 'available');
});

test('browser registry opens the profile-specific Badlands scene and correct nine-wave map', async () => {
  const contentVersion = getBrowserScenarioContentVersion(dakota04CampaignId, completedThroughLevelThirtyThree);
  const expected = createDakota04CampaignContent(completedThroughLevelThirtyThree);
  assert.equal(contentVersion, expected.contentVersion);

  const session = await createBrowserGame(completedThroughLevelThirtyThree).open({
    scenarioId: dakota04CampaignId,
    contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 34_020,
  });
  try {
    assert.equal(session.startRecord.contentVersion, expected.contentVersion);
    assert.equal(session.observe().map.width, 32);
    assert.equal(session.observe().map.height, 24);
    assert.equal(session.observe().wave?.number, 1);
    assert.equal(session.observe().wave?.totalWaves, 9);
    assert.equal(session.observe().wave?.cash, 300);
    assert.equal(session.observe().wave?.lives, 25);
  } finally {
    session.close();
  }
});

test('Badlands Free Play accepts every difficulty and cannot update formal progress', async () => {
  const progress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  const profileBefore = await progress.exportProfileData();
  const scenario = noEnemyContent([]);
  const game = createGame({ scenarios: { [dakota04CampaignId]: scenario } });

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const session = await game.open({
      scenarioId: dakota04CampaignId,
      contentVersion: scenario.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 34_000 + index,
    });
    try {
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
    } finally {
      session.close();
    }
  }

  const session = await game.open({
    scenarioId: dakota04CampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 34_099,
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

test('formal Badlands victory records completion and high score after Fort Knockout', async () => {
  const progress = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedThroughLevelThirtyThree }),
    officialCampaignStages,
  );
  const scenario = noEnemyContent(completedThroughLevelThirtyThree);
  const session = await createGame({ scenarios: { [dakota04CampaignId]: scenario } }).open({
    scenarioId: dakota04CampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 34_100,
  });
  try {
    const settlement = await settleWithoutBattle(session);
    assert.equal(settlement.mode, 'formal');
    await progress.applySettlement(settlement);
    const saved = await progress.loadCampaign();
    assert.deepEqual(saved.profile.completedScenarios, [...completedThroughLevelThirtyThree, dakota04CampaignId]);
    assert.equal(saved.profile.highScores[dakota04CampaignId], settlement.highScoreCandidate);
    assert.equal(campaignLevelState(34, saved), 'completed');
  } finally {
    session.close();
  }
});
