import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createDakota05CampaignContent } from '../src/content/dakota-05-campaign';
import { dakota05CampaignId } from '../src/content/dakota-05-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { createGame, type GameSession, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

function noEnemyContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createDakota05CampaignContent(completedScenarioIds);
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

const completedThroughLevelThirtyFour = officialCampaignStages.slice(0, 34).map(({ scenarioId }) => scenarioId);

test('Ghost Town is Dakota level 35 and stays locked until Badlands is complete', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === dakota05CampaignId);
  assert.equal(officialCampaignStages.length, 38);
  assert.deepEqual(stage, {
    scenarioId: dakota05CampaignId,
    contentVersion: createDakota05CampaignContent().contentVersion,
    title: { en: 'Ghost Town · Level 35', zh: '幽灵镇 · 第 35 关' },
    globalLevel: 35,
    requiresCompletedScenarioIds: ['campaign-dakota-04'],
  });

  const locked = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(35, await locked.loadCampaign()), 'locked');

  const unlocked = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedThroughLevelThirtyFour }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(34, await unlocked.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(35, await unlocked.loadCampaign()), 'available');
});

test('browser registry opens profile-specific Ghost Town content in the formal campaign', async () => {
  const contentVersion = getBrowserScenarioContentVersion(dakota05CampaignId, completedThroughLevelThirtyFour);
  const expected = createDakota05CampaignContent(completedThroughLevelThirtyFour);
  assert.equal(contentVersion, expected.contentVersion);

  const session = await createBrowserGame(completedThroughLevelThirtyFour).open({
    scenarioId: dakota05CampaignId,
    contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 35_020,
  });
  try {
    assert.equal(session.startRecord.contentVersion, expected.contentVersion);
    assert.equal(session.observe().map.width, 32);
    assert.equal(session.observe().map.height, 24);
    assert.equal(session.observe().wave?.number, 1);
    assert.equal(session.observe().wave?.totalWaves, 9);
  } finally {
    session.close();
  }
});

test('Ghost Town Free Play accepts every difficulty and cannot write formal progress', async () => {
  const progress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  const profileBefore = await progress.exportProfileData();
  const scenario = noEnemyContent([]);
  const game = createGame({ scenarios: { [dakota05CampaignId]: scenario } });

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const session = await game.open({
      scenarioId: dakota05CampaignId,
      contentVersion: scenario.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 35_000 + index,
    });
    try {
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
    } finally {
      session.close();
    }
  }

  const session = await game.open({
    scenarioId: dakota05CampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 35_099,
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
