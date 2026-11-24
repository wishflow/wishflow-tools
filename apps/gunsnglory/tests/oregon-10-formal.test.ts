import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createOregon10CampaignContent } from '../src/content/oregon-10-campaign';
import { oregon10CampaignContentVersionFor } from '../src/content/oregon-10-content-version';
import { oregon10CampaignId } from '../src/content/oregon-10-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createOregon10CampaignContent(completedScenarioIds);
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

test('Lumber Mill Hills is the gated 30th official stage after Snake River', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === oregon10CampaignId);
  assert.equal(officialCampaignStages.length, 40);
  assert.deepEqual(stage, {
    scenarioId: oregon10CampaignId,
    contentVersion: oregon10CampaignContentVersionFor([]),
    title: { en: 'Lumber Mill Hills · Level 30', zh: '木材厂山岭 · 第 30 关' },
    globalLevel: 30,
    requiresCompletedScenarioIds: ['campaign-oregon-09'],
  });

  const beforeSnakeRiver = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-08'] }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(29, await beforeSnakeRiver.loadCampaign()), 'available');
  assert.equal(campaignLevelState(30, await beforeSnakeRiver.loadCampaign()), 'locked');

  const afterSnakeRiver = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-08', oregon09Id] }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(30, await afterSnakeRiver.loadCampaign()), 'available');
});

const oregon09Id = 'campaign-oregon-09';

test('Lumber Mill Hills Free Play accepts every difficulty and cannot write campaign progress', async () => {
  const progress = createProgress(createMemoryProfileRepository({ completedScenarios: [] }), officialCampaignStages);
  const profileBefore = await progress.exportProfileData();
  const scenario = emptyRequestContent([]);
  const game = createGame({ scenarios: { [oregon10CampaignId]: scenario } });

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const session = await game.open({
      scenarioId: oregon10CampaignId,
      contentVersion: scenario.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 30_000 + index,
    });
    try {
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
    } finally {
      session.close();
    }
  }

  const freeSession = await game.open({
    scenarioId: oregon10CampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 30_099,
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
