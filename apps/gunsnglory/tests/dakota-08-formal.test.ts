import assert from 'node:assert/strict';
import test from 'node:test';
import { createDakota08CampaignContent } from '../src/content/dakota-08-campaign';
import { dakota08CampaignId } from '../src/content/dakota-08-identity';
import { campaignCatalog, campaignLevelState } from '../src/content/campaign-catalog';
import { dakota07CampaignId } from '../src/content/dakota-07-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

test('Wayne Waters is a formal Level 38 gated by Frost Station and keeps Level 39 locked', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === dakota08CampaignId);
  assert.deepEqual(stage && {
    globalLevel: stage.globalLevel,
    requiresCompletedScenarioIds: stage.requiresCompletedScenarioIds,
  }, { globalLevel: 38, requiresCompletedScenarioIds: [dakota07CampaignId] });
  assert.equal(campaignCatalog.find(({ level }) => level === 38)?.mapFileNumber, 41);
  assert.equal(campaignCatalog.find(({ level }) => level === 39)?.mapFileNumber, 42);

  const locked = await createProgress(createMemoryProfileRepository(), officialCampaignStages).loadCampaign();
  assert.equal(locked.stages.find(({ scenarioId }) => scenarioId === dakota08CampaignId)?.status, 'locked');
  assert.equal(campaignLevelState(39, locked), 'locked');
  const unlocked = await createProgress(createMemoryProfileRepository({
    completedScenarios: [dakota07CampaignId],
  }), officialCampaignStages).loadCampaign();
  assert.equal(unlocked.stages.find(({ scenarioId }) => scenarioId === dakota08CampaignId)?.status, 'available');

  const completedScenarioIds = [dakota07CampaignId];
  const content = createDakota08CampaignContent(completedScenarioIds);
  assert.equal(content.id, dakota08CampaignId);
  assert.equal(content.formalSettlementSupported, true);
  assert.equal(content.map.width, 32);
  assert.equal(content.map.height, 24);
  assert.equal(content.campaignWaveCount, 8);
  assert.equal(getBrowserScenarioContentVersion(dakota08CampaignId, completedScenarioIds), content.contentVersion);

  const session = await createBrowserGame(completedScenarioIds).open({
    scenarioId: dakota08CampaignId,
    contentVersion: content.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 38_000,
  });
  try {
    assert.equal(session.observe().scenarioId, dakota08CampaignId);
    assert.equal(session.startRecord.mode, 'free');
    assert.equal(session.startRecord.difficulty, 'hard');
  } finally {
    session.close();
  }
});
