import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createDakota02CampaignContent } from '../src/content/dakota-02-campaign';
import { dakota02CampaignContentVersionFor } from '../src/content/dakota-02-content-version';
import { dakota02CampaignId } from '../src/content/dakota-02-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

function noEnemyContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createDakota02CampaignContent(completedScenarioIds);
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

test('Six Grandfathers is the gated 32nd official stage after Loot Lakes', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === dakota02CampaignId);
  assert.equal(officialCampaignStages.length, 40);
  assert.deepEqual(stage, {
    scenarioId: dakota02CampaignId,
    contentVersion: dakota02CampaignContentVersionFor([]),
    title: { en: 'Six Grandfathers · Level 32', zh: '六祖山 · 第 32 关' },
    globalLevel: 32,
    requiresCompletedScenarioIds: ['campaign-oregon-11'],
  });

  const beforeLootLakes = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-10'] }),
    officialCampaignStages,
  );
  const before = await beforeLootLakes.loadCampaign();
  assert.equal(campaignLevelState(31, before), 'available');
  assert.equal(campaignLevelState(32, before), 'locked');

  const afterLootLakes = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-10', 'campaign-oregon-11'] }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(32, await afterLootLakes.loadCampaign()), 'available');
});

test('Six Grandfathers Free Play accepts every difficulty and cannot write campaign progress', async () => {
  const progress = createProgress(createMemoryProfileRepository({ completedScenarios: [] }), officialCampaignStages);
  const profileBefore = await progress.exportProfileData();
  const scenario = noEnemyContent([]);
  const game = createGame({ scenarios: { [dakota02CampaignId]: scenario } });

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const session = await game.open({
      scenarioId: dakota02CampaignId,
      contentVersion: scenario.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 32_000 + index,
    });
    try {
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
    } finally {
      session.close();
    }
  }

  const session = await game.open({
    scenarioId: dakota02CampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 32_099,
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

test('Six Grandfathers formal victory records completion after the previous official stage', async () => {
  const completedScenarioIds = ['campaign-oregon-10', 'campaign-oregon-11'];
  const progress = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedScenarioIds }),
    officialCampaignStages,
  );
  const scenario = noEnemyContent(completedScenarioIds);
  const session = await createGame({ scenarios: { [dakota02CampaignId]: scenario } }).open({
    scenarioId: dakota02CampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 32_100,
  });
  try {
    const settlement = await settleWithoutBattle(session);
    assert.equal(settlement.mode, 'formal');
    await progress.applySettlement(settlement);
    assert.deepEqual((await progress.loadCampaign()).profile.completedScenarios,
      [...completedScenarioIds, dakota02CampaignId]);
  } finally {
    session.close();
  }
});
