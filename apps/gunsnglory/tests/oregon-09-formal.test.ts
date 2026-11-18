import assert from 'node:assert/strict';
import test from 'node:test';
import { createOregon09CampaignContent } from '../src/content/oregon-09-campaign';
import { oregon09CampaignContentVersionFor } from '../src/content/oregon-09-content-version';
import { oregon09CampaignId } from '../src/content/oregon-09-identity';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';
import { createGame, type ScenarioContent } from '../src/game';

function emptyRequestContent(content: ScenarioContent): ScenarioContent {
  return {
    ...content,
    campaignWaves: content.campaignWaves?.map((wave) => ({
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

test('Snake River is the gated 29th official stage after Colt City', async () => {
  const expectedVersion = oregon09CampaignContentVersionFor([]);
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === oregon09CampaignId);

  assert.equal(officialCampaignStages.length, 31);
  assert.deepEqual(stage, {
    scenarioId: oregon09CampaignId,
    contentVersion: expectedVersion,
    title: { en: 'Snake River · Level 29', zh: '蛇河 · 第 29 关' },
    globalLevel: 29,
    requiresCompletedScenarioIds: ['campaign-oregon-08'],
  });

  const beforeColtCity = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-07'] }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(28, await beforeColtCity.loadCampaign()), 'available');
  assert.equal(campaignLevelState(29, await beforeColtCity.loadCampaign()), 'locked');

  const afterColtCity = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-08'] }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(29, await afterColtCity.loadCampaign()), 'available');
});

test('Snake River Free Play accepts all difficulties and cannot write campaign progress', async () => {
  const progress = createProgress(createMemoryProfileRepository({ completedScenarios: [] }), officialCampaignStages);
  const profileBefore = await progress.exportProfileData();
  const scenario = emptyRequestContent(createOregon09CampaignContent());
  const game = createGame({ scenarios: { [oregon09CampaignId]: scenario } });

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const session = await game.open({
      scenarioId: oregon09CampaignId,
      contentVersion: scenario.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 29_000 + index,
    });
    try {
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
    } finally {
      session.close();
    }
  }

  const freeSession = await game.open({
    scenarioId: oregon09CampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 29_099,
  });
  try {
    const settlement = await settleWithoutBattle(freeSession);
    assert.equal(settlement.mode, 'free');
    await assert.rejects(progress.applySettlement(settlement), /Progress only accepts formal game settlements/);
    assert.deepEqual(await progress.exportProfileData(), profileBefore);
  } finally {
    freeSession.close();
  }
});
