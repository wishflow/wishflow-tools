import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createOregon11CampaignContent } from '../src/content/oregon-11-campaign';
import { oregon11CampaignContentVersionFor } from '../src/content/oregon-11-content-version';
import { oregon11CampaignId } from '../src/content/oregon-11-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

function noEnemyContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createOregon11CampaignContent(completedScenarioIds);
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

test('Loot Lakes is the gated 31st official stage after Lumber Mill Hills', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === oregon11CampaignId);
  assert.equal(officialCampaignStages.length, 42);
  assert.deepEqual(stage, {
    scenarioId: oregon11CampaignId,
    contentVersion: oregon11CampaignContentVersionFor([]),
    title: { en: 'Loot Lakes · Level 31', zh: '湖泊金矿 · 第 31 关' },
    globalLevel: 31,
    requiresCompletedScenarioIds: ['campaign-oregon-10'],
  });

  const beforeLumberMill = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-09'] }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(30, await beforeLumberMill.loadCampaign()), 'available');
  assert.equal(campaignLevelState(31, await beforeLumberMill.loadCampaign()), 'locked');

  const afterLumberMill = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-09', 'campaign-oregon-10'] }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(31, await afterLumberMill.loadCampaign()), 'available');
});

test('Loot Lakes Free Play accepts every difficulty and cannot write campaign progress', async () => {
  const progress = createProgress(createMemoryProfileRepository({ completedScenarios: [] }), officialCampaignStages);
  const profileBefore = await progress.exportProfileData();
  const scenario = noEnemyContent([]);
  const game = createGame({ scenarios: { [oregon11CampaignId]: scenario } });

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const session = await game.open({
      scenarioId: oregon11CampaignId,
      contentVersion: scenario.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 31_000 + index,
    });
    try {
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
    } finally {
      session.close();
    }
  }

  const session = await game.open({
    scenarioId: oregon11CampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 31_099,
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
