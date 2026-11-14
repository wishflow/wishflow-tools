import assert from 'node:assert/strict';
import test from 'node:test';
import { createOregon07CampaignContent } from '../src/content/oregon-07-campaign';
import { oregon07CampaignContentVersionFor } from '../src/content/oregon-07-content-version';
import { oregon07CampaignId } from '../src/content/oregon-07-identity';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';
import { createGame, type ScenarioContent } from '../src/game';

const completedBeforeMountHood = ['campaign-oregon-05', 'campaign-oregon-06'];

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createOregon07CampaignContent(completedScenarioIds);
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
): Promise<NonNullable<ReturnType<typeof session.terminalRecord>>> {
  for (let frame = 0; frame < 500 && !session.terminalRecord(); frame += 1) session.advance({ deltaMs: 0 });
  const settlement = session.terminalRecord();
  assert.equal(settlement?.outcome, 'victory');
  return settlement!;
}

test('Mount Hood unlocks only after Columbia River, Free Play does not save, and formal victory records Level 27', async () => {
  assert.equal(officialCampaignStages.length, 27);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 27), {
    scenarioId: oregon07CampaignId,
    contentVersion: oregon07CampaignContentVersionFor(completedBeforeMountHood),
    title: { en: 'Mount Hood · Level 27', zh: '胡德山 · 第 27 关' },
    globalLevel: 27,
    requiresCompletedScenarioIds: ['campaign-oregon-06'],
  });

  const lockedProgress = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-05'] }),
    officialCampaignStages,
  );
  const locked = await lockedProgress.loadCampaign();
  assert.equal(campaignLevelState(26, locked), 'available');
  assert.equal(campaignLevelState(27, locked), 'locked');

  const progress = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedBeforeMountHood }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(27, await progress.loadCampaign()), 'available');
  const profileBeforeFreePlay = await progress.exportProfileData();
  const freeContent = emptyRequestContent(completedBeforeMountHood);
  const free = await createGame({ scenarios: { [oregon07CampaignId]: freeContent } }).open({
    scenarioId: oregon07CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 27_700,
  });
  try {
    const settlement = await settleWithoutBattle(free);
    assert.equal(settlement.mode, 'free');
    await assert.rejects(progress.applySettlement(settlement), /Progress only accepts formal game settlements/);
    assert.deepEqual(await progress.exportProfileData(), profileBeforeFreePlay);
  } finally {
    free.close();
  }

  const formalContent = emptyRequestContent(completedBeforeMountHood);
  const formal = await createGame({ scenarios: { [oregon07CampaignId]: formalContent } }).open({
    scenarioId: oregon07CampaignId,
    contentVersion: formalContent.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 27_701,
  });
  try {
    const settlement = await settleWithoutBattle(formal);
    assert.equal(settlement.mode, 'formal');
    await progress.applySettlement(settlement);
    const saved = await progress.exportProfileData();
    assert.ok(saved.completedScenarios.includes(oregon07CampaignId));
    assert.equal(saved.highScores[oregon07CampaignId], settlement.highScoreCandidate);
    assert.ok(saved.appliedSettlementIds.includes(settlement.settlementId));
    assert.equal(campaignLevelState(27, await progress.loadCampaign()), 'completed');
    assert.equal(campaignLevelState(28, await progress.loadCampaign()), 'unimplemented');
  } finally {
    formal.close();
  }
});
