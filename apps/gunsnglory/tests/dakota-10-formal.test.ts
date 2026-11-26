import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { campaignCatalog, campaignLevelState } from '../src/content/campaign-catalog';
import { dakota09CampaignId } from '../src/content/dakota-09-identity';
import { dakota10CampaignCopy } from '../src/content/dakota-10-campaign-copy';
import { createDakota10CampaignContent } from '../src/content/dakota-10-campaign';
import { dakota10CampaignId } from '../src/content/dakota-10-identity';
import { dakota10LevelFortyCampaignContent, officialCampaignStages } from '../src/content/official-campaign';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

test('Sioux Falls is formal Level 40 after Snow Town and uses the registered map43 content', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === dakota10CampaignId);
  assert.equal(officialCampaignStages.length, 41);
  assert.deepEqual(stage, {
    scenarioId: dakota10CampaignId,
    contentVersion: dakota10LevelFortyCampaignContent.contentVersion,
    title: { en: 'Sioux Falls · Level 40', zh: '苏福尔斯 · 第 40 关' },
    globalLevel: 40,
    requiresCompletedScenarioIds: [dakota09CampaignId],
  });
  assert.deepEqual(dakota10LevelFortyCampaignContent.title, dakota10CampaignCopy.title);
  assert.equal(campaignCatalog.find(({ level }) => level === 40)?.mapFileNumber, 43);

  const locked = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(40, await locked.loadCampaign()), 'locked');

  const afterSnowTown = createProgress(createMemoryProfileRepository({
    completedScenarios: [dakota09CampaignId],
  }), officialCampaignStages);
  assert.equal(campaignLevelState(40, await afterSnowTown.loadCampaign()), 'available');
});

test('browser registry opens Sioux Falls for all Free Play difficulties without formal progress', async () => {
  const expected = createDakota10CampaignContent([]);
  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const contentVersion = getBrowserScenarioContentVersion(dakota10CampaignId, []);
    const session = await createBrowserGame([]).open({
      scenarioId: dakota10CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 40_000 + index,
    });

    try {
      const view = session.observe();
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, expected.contentVersion);
      assert.equal(view.scenarioId, dakota10CampaignId);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 10);
    } finally {
      session.close();
    }
  }
});

test('formal Sioux Falls victory records Level 40 while Free Play settlement leaves profile unchanged', async () => {
  const repository = createMemoryProfileRepository({
    completedScenarios: [dakota09CampaignId],
    highScores: { [dakota09CampaignId]: 1_200 },
  });
  const progress = createProgress(repository, officialCampaignStages);
  const beforeFreePlay = await progress.exportProfileData();
  await assert.rejects(progress.applySettlement({
    settlementId: `sioux-free-session:${dakota10CampaignId}:10`,
    sessionId: 'sioux-free-session',
    scenarioId: dakota10CampaignId,
    mode: 'free',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 5_000,
    displayScore: 5_000,
    highScoreCandidate: 5_000,
  }), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlay);

  const saved = await progress.applySettlement({
    settlementId: `sioux-formal-session:${dakota10CampaignId}:10`,
    sessionId: 'sioux-formal-session',
    scenarioId: dakota10CampaignId,
    mode: 'formal',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 6_000,
    displayScore: 6_000,
    highScoreCandidate: 6_000,
  });
  assert.equal(saved.status, 'saved');
  assert.ok(saved.profile.completedScenarios.includes(dakota10CampaignId));
  assert.equal(saved.profile.highScores[dakota10CampaignId], 6_000);
  assert.equal(campaignLevelState(40, await progress.loadCampaign()), 'completed');
});
