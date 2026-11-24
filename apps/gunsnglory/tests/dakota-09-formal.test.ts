import assert from 'node:assert/strict';
import test from 'node:test';
import { createDakota09CampaignContent } from '../src/content/dakota-09-campaign';
import { dakota09CampaignId } from '../src/content/dakota-09-identity';
import { dakota08CampaignId } from '../src/content/dakota-08-identity';
import { campaignCatalog, campaignLevelState } from '../src/content/campaign-catalog';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

test('Snow Town is formal Level 39 after Wayne Waters and leaves Level 40 unimplemented', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === dakota09CampaignId);
  assert.deepEqual(stage && {
    globalLevel: stage.globalLevel,
    requiresCompletedScenarioIds: stage.requiresCompletedScenarioIds,
  }, { globalLevel: 39, requiresCompletedScenarioIds: [dakota08CampaignId] });
  assert.equal(campaignCatalog.find(({ level }) => level === 39)?.mapFileNumber, 42);
  assert.equal(campaignCatalog.find(({ level }) => level === 40)?.title, 'Sioux Falls');

  const initial = await createProgress(createMemoryProfileRepository(), officialCampaignStages).loadCampaign();
  assert.equal(campaignLevelState(39, initial), 'locked');
  assert.equal(campaignLevelState(40, initial), 'locked');

  const afterFrostStation = await createProgress(createMemoryProfileRepository({
    completedScenarios: ['campaign-dakota-07'],
  }), officialCampaignStages).loadCampaign();
  assert.equal(campaignLevelState(38, afterFrostStation), 'available');
  assert.equal(campaignLevelState(39, afterFrostStation), 'locked');

  const afterWayneWaters = await createProgress(createMemoryProfileRepository({
    completedScenarios: [dakota08CampaignId],
  }), officialCampaignStages).loadCampaign();
  assert.equal(campaignLevelState(39, afterWayneWaters), 'available');
  assert.equal(campaignLevelState(40, afterWayneWaters), 'locked');

  const content = createDakota09CampaignContent([dakota08CampaignId]);
  assert.equal(content.id, dakota09CampaignId);
  assert.equal(content.formalSettlementSupported, true);
  assert.equal(content.contentVersion, getBrowserScenarioContentVersion(dakota09CampaignId, [dakota08CampaignId]));

  const session = await createBrowserGame([dakota08CampaignId]).open({
    scenarioId: dakota09CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'hard',
    randomSeed: 39_000,
  });
  try {
    assert.equal(session.observe().scenarioId, dakota09CampaignId);
    assert.equal(session.startRecord.mode, 'formal');
    assert.equal(session.startRecord.difficulty, 'hard');
    assert.equal(session.startRecord.contentVersion, content.contentVersion);
  } finally {
    session.close();
  }
});
