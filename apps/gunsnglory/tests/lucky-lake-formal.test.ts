import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { createLuckyLakeCampaignContent, luckyLakeCampaignContentVersion, luckyLakeCampaignId } from '../src/content/lucky-lake-campaign';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';
import { murdockMountainsCampaignId } from '../src/content/murdock-mountains-campaign';
import { luckyLakeLevelSevenCampaignContent, officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

const completedThroughMapFive = [
  'campaign-new-mexico-01',
  'campaign-new-mexico-02',
  'campaign-new-mexico-03',
  'campaign-new-mexico-04',
  'campaign-new-mexico-05',
];

test('Lucky Lake is registered as level seven and unlocks only after Murdock Mountains', async () => {
  const stage = officialCampaignStages.find(({ globalLevel }) => globalLevel === 7);
  assert.deepEqual(stage, {
    scenarioId: luckyLakeCampaignId,
    contentVersion: luckyLakeCampaignContentVersion,
    title: { en: 'Lucky Lake · Level 7', zh: '幸运湖 · 第 7 关' },
    globalLevel: 7,
    requiresCompletedScenarioIds: [murdockMountainsCampaignId],
  });
  assert.equal(officialCampaignStages.length, 17);
  assert.equal(luckyLakeLevelSevenCampaignContent.formalSettlementSupported, true);
  assert.equal(getBrowserScenarioContentVersion(luckyLakeCampaignId), luckyLakeCampaignContentVersion);

  const noProgress = await createProgress(createMemoryProfileRepository(), officialCampaignStages).loadCampaign();
  assert.equal(campaignLevelState(7, noProgress), 'locked');

  const afterMapFive = await createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughMapFive,
  }), officialCampaignStages).loadCampaign();
  assert.equal(campaignLevelState(6, afterMapFive), 'available');
  assert.equal(campaignLevelState(7, afterMapFive), 'locked');

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughMapFive,
  }), officialCampaignStages);
  await progress.applySettlement({
    settlementId: `map07-unlock:${murdockMountainsCampaignId}:10`,
    sessionId: 'map07-unlock',
    scenarioId: murdockMountainsCampaignId,
    mode: 'formal',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 700,
    displayScore: 700,
    highScoreCandidate: 700,
  });
  assert.equal(campaignLevelState(7, await progress.loadCampaign()), 'available');
});

test('registered Lucky Lake opens through the browser game in formal and all Free Play difficulties', async () => {
  const completedThroughMapSix = [...completedThroughMapFive, murdockMountainsCampaignId];
  for (const { mode, difficulty } of [
    { mode: 'formal', difficulty: 'easy' },
    { mode: 'free', difficulty: 'easy' },
    { mode: 'free', difficulty: 'medium' },
    { mode: 'free', difficulty: 'hard' },
  ] as const) {
    const session = await createBrowserGame(mode === 'formal' ? completedThroughMapSix : []).open({
      scenarioId: luckyLakeCampaignId,
      mode,
      difficulty,
      randomSeed: 107,
    });

    try {
      const view = session.observe();
      assert.equal(session.startRecord.scenarioId, luckyLakeCampaignId);
      assert.equal(session.startRecord.mode, mode);
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 10);
      assert.equal(view.wave?.lives, 50);
      assert.equal(view.wave?.cash, 400);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
    } finally {
      session.close();
    }
  }

  assert.deepEqual(createLuckyLakeCampaignContent([]).title, luckyLakeLevelSevenCampaignContent.title);
});

test('Lucky Lake formal defeat can improve its score without completing the level; victory is idempotent', async () => {
  const completedBefore = [...completedThroughMapFive, murdockMountainsCampaignId];
  const defeatProgress = createProgress(createMemoryProfileRepository({ completedScenarios: completedBefore }), officialCampaignStages);
  const defeat = {
    settlementId: `map07-defeat:${luckyLakeCampaignId}:10`,
    sessionId: 'map07-defeat',
    scenarioId: luckyLakeCampaignId,
    mode: 'formal' as const,
    waveNumber: 10,
    outcome: 'defeat' as const,
    scoreBase: 840,
    displayScore: 850,
    highScoreCandidate: 840,
  };

  const defeated = await defeatProgress.applySettlement(defeat);
  assert.equal(defeated.status, 'saved');
  assert.deepEqual(defeated.profile.completedScenarios, completedBefore);
  assert.equal(defeated.profile.highScores[luckyLakeCampaignId], 840);
  const duplicateDefeat = await defeatProgress.applySettlement(defeat);
  assert.deepEqual(duplicateDefeat.profile, defeated.profile);

  const victoryProgress = createProgress(createMemoryProfileRepository({ completedScenarios: completedBefore }), officialCampaignStages);
  const victory = {
    ...defeat,
    settlementId: `map07-victory:${luckyLakeCampaignId}:10`,
    sessionId: 'map07-victory',
    outcome: 'victory' as const,
    scoreBase: 1_200,
    displayScore: 1_200,
    highScoreCandidate: 1_200,
  };
  const completed = await victoryProgress.applySettlement(victory);
  assert.equal(completed.status, 'saved');
  assert.deepEqual(completed.profile.completedScenarios, [...completedBefore, luckyLakeCampaignId]);
  assert.equal(completed.profile.highScores[luckyLakeCampaignId], 1_200);
  assert.deepEqual((await victoryProgress.applySettlement(victory)).profile, completed.profile);
});

test('Lucky Lake replay preserves its registered content version through export and replay', async () => {
  assert.equal(getBrowserScenarioContentVersion(luckyLakeCampaignId), luckyLakeCampaignContentVersion);

  // Keep the real map and campaign identity, but clear requests so this only exercises replay
  // version routing and deterministic serialization; it is not a gameplay or balance test.
  const fixtureVersion = `${luckyLakeCampaignContentVersion}-replay-fixture`;
  const fixtureContent: ScenarioContent = {
    ...luckyLakeLevelSevenCampaignContent,
    contentVersion: fixtureVersion,
    campaignWaves: luckyLakeLevelSevenCampaignContent.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: Array.from({ length: 10 }, () => 0) })),
    })),
  };
  const game = createGame({
    scenarios: { [luckyLakeCampaignId]: fixtureContent },
    sessionIdSource: () => 'map07-replay-fixture',
  });
  const session = await game.open({ scenarioId: luckyLakeCampaignId, mode: 'formal', randomSeed: 107 });

  let view = session.observe();
  for (let index = 0; index < 10; index += 1) view = session.advance({ deltaMs: 0 });
  assert.equal(view.wave?.settlement?.outcome, 'victory');

  const serialized = await session.exportReplay();
  const source = JSON.parse(serialized) as { startRecord: { scenarioId: string; contentVersion: string } };
  assert.equal(source.startRecord.scenarioId, luckyLakeCampaignId);
  assert.equal(source.startRecord.contentVersion, fixtureVersion);
  const replay = await game.replay(serialized);
  assert.equal(replay.sourceStartRecord.contentVersion, fixtureVersion);
  assert.deepEqual(replay.session.observe().wave?.settlement, view.wave?.settlement);
});
