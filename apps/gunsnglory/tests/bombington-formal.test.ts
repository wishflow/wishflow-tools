import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { bombingtonCampaignCopy } from '../src/content/bombington-campaign-copy';
import { campaignCatalog, campaignLevelState } from '../src/content/campaign-catalog';
import { nevada02CampaignId } from '../src/content/nevada-02-identity';
import { nevada01CampaignId } from '../src/content/nevada-01-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

test('Bombington is formal Level 42 after Labyrinth Gulch and level 43 stays unimplemented', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === nevada02CampaignId);
  assert.deepEqual(stage, {
    scenarioId: nevada02CampaignId,
    contentVersion: getBrowserScenarioContentVersion(nevada02CampaignId, []),
    title: { en: 'Bombington · Level 42', zh: '炸弹镇 · 第 42 关' },
    globalLevel: 42,
    requiresCompletedScenarioIds: [nevada01CampaignId],
  });
  assert.equal(officialCampaignStages.length, 42);
  assert.deepEqual(stage?.title, {
    en: `${bombingtonCampaignCopy.title.en} · Level 42`,
    zh: `${bombingtonCampaignCopy.title.zh} · 第 42 关`,
  });
  assert.deepEqual(campaignCatalog.find(({ level }) => level === 42), {
    level: 42,
    regionId: 'nevada',
    regionTitle: 'Nevada',
    title: 'Bombington',
    mapFileNumber: 45,
    titleResourceNumber: 45,
  });
  assert.equal(campaignLevelState(42, undefined), 'unimplemented');

  const progress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(42, await progress.loadCampaign()), 'locked');
  await progress.applySettlement({
    settlementId: `finish-labyrinth-gulch:${nevada01CampaignId}:11`,
    sessionId: 'finish-labyrinth-gulch',
    scenarioId: nevada01CampaignId,
    mode: 'formal',
    waveNumber: 11,
    outcome: 'victory',
    scoreBase: 1_000,
    displayScore: 1_000,
    highScoreCandidate: 1_000,
  });
  assert.equal(campaignLevelState(42, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(43, await progress.loadCampaign()), 'locked');

  await progress.applySettlement({
    settlementId: `finish-bombington:${nevada02CampaignId}:10`,
    sessionId: 'finish-bombington',
    scenarioId: nevada02CampaignId,
    mode: 'formal',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 2_000,
    displayScore: 2_000,
    highScoreCandidate: 2_000,
  });
  assert.equal(campaignLevelState(42, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(43, await progress.loadCampaign()), 'unimplemented');
});

test('Bombington opens in Free Play at all three difficulties', async () => {
  const contentVersion = getBrowserScenarioContentVersion(nevada02CampaignId, []);
  assert.ok(contentVersion);

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const session = await createBrowserGame([]).open({
      scenarioId: nevada02CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 42_100 + index,
    });
    try {
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(session.observe().scenarioId, nevada02CampaignId);
      assert.equal(session.observe().map.width, 32);
      assert.equal(session.observe().map.height, 24);
      assert.equal(session.observe().wave?.number, 1);
      assert.equal(session.observe().wave?.totalWaves, 10);
    } finally {
      session.close();
    }
  }
});

test('Bombington Free Play never settles profile data while formal victory unlocks only level 43 as unimplemented', async () => {
  const repository = createMemoryProfileRepository({
    completedScenarios: [nevada01CampaignId],
    highScores: { [nevada01CampaignId]: 4_200 },
  });
  const progress = createProgress(repository, officialCampaignStages);
  const beforeFreePlay = await progress.exportProfileData();

  await assert.rejects(progress.applySettlement({
    settlementId: `bombington-free:${nevada02CampaignId}:10`,
    sessionId: 'bombington-free',
    scenarioId: nevada02CampaignId,
    mode: 'free',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 9_000,
    displayScore: 9_000,
    highScoreCandidate: 9_000,
  }), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlay);

  const saved = await progress.applySettlement({
    settlementId: `bombington-formal:${nevada02CampaignId}:10`,
    sessionId: 'bombington-formal',
    scenarioId: nevada02CampaignId,
    mode: 'formal',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 8_000,
    displayScore: 8_000,
    highScoreCandidate: 8_000,
  });
  assert.equal(saved.status, 'saved');
  assert.ok(saved.profile.completedScenarios.includes(nevada02CampaignId));
  assert.equal(saved.profile.highScores[nevada02CampaignId], 8_000);
  assert.equal(campaignLevelState(43, await progress.loadCampaign()), 'unimplemented');
});
