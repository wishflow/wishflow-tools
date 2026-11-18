import assert from 'node:assert/strict';
import test from 'node:test';
import { oregon08CampaignContentVersionFor } from '../src/content/oregon-08-content-version';
import { oregon08CampaignId } from '../src/content/oregon-08-identity';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';
import { createOregon08CampaignContent } from '../src/content/oregon-08-campaign';
import { createGame, type ScenarioContent } from '../src/game';

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createOregon08CampaignContent(completedScenarioIds);
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

async function settleWithoutBattle(
  session: Awaited<ReturnType<ReturnType<typeof createGame>['open']>>,
) {
  for (let frame = 0; frame < 500 && !session.terminalRecord(); frame += 1) {
    session.advance({ deltaMs: 0 });
  }
  const settlement = session.terminalRecord();
  assert.equal(settlement?.outcome, 'victory');
  return settlement!;
}

test('Colt City unlocks after Mount Hood, Free Play stays isolated, and formal victory records level 28', async () => {
  assert.equal(officialCampaignStages.length, 32);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 28), {
    scenarioId: oregon08CampaignId,
    contentVersion: oregon08CampaignContentVersionFor(['campaign-oregon-07']),
    title: { en: 'Colt City · Level 28', zh: '柯尔特城 · 第 28 关' },
    globalLevel: 28,
    requiresCompletedScenarioIds: ['campaign-oregon-07'],
  });

  const progressBeforeMountHood = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-06'] }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(27, await progressBeforeMountHood.loadCampaign()), 'available');
  assert.equal(campaignLevelState(28, await progressBeforeMountHood.loadCampaign()), 'locked');

  const progress = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-06', 'campaign-oregon-07'] }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(28, await progress.loadCampaign()), 'available');
  const profileBeforeFreePlay = await progress.exportProfileData();

  const freeContent = emptyRequestContent(['campaign-oregon-06', 'campaign-oregon-07']);
  const free = await createGame({ scenarios: { [oregon08CampaignId]: freeContent } }).open({
    scenarioId: oregon08CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 28_800,
  });
  try {
    const settlement = await settleWithoutBattle(free);
    assert.equal(settlement.mode, 'free');
    await assert.rejects(progress.applySettlement(settlement), /Progress only accepts formal game settlements/);
    assert.deepEqual(await progress.exportProfileData(), profileBeforeFreePlay);
  } finally {
    free.close();
  }

  const formalContent = emptyRequestContent(['campaign-oregon-06', 'campaign-oregon-07']);
  const formal = await createGame({ scenarios: { [oregon08CampaignId]: formalContent } }).open({
    scenarioId: oregon08CampaignId,
    contentVersion: formalContent.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 28_801,
  });
  try {
    const settlement = await settleWithoutBattle(formal);
    assert.equal(settlement.mode, 'formal');
    await progress.applySettlement(settlement);
    const saved = await progress.exportProfileData();
    assert.ok(saved.completedScenarios.includes(oregon08CampaignId));
    assert.equal(saved.highScores[oregon08CampaignId], settlement.highScoreCandidate);
    assert.ok(saved.appliedSettlementIds.includes(settlement.settlementId));
    const updated = await progress.loadCampaign();
    assert.equal(campaignLevelState(28, updated), 'completed');
    assert.equal(campaignLevelState(29, updated), 'available');
  } finally {
    formal.close();
  }
});
