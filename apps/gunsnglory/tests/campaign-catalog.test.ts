import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignCatalog, campaignLevelState, campaignRegions } from '../src/content/campaign-catalog';
import {
  apacheValleyLevelTwoContent,
  cowGulchLevelOneContent,
  fortKaboomLevelThreeContent,
  officialCampaignStages,
} from '../src/content/official-campaign';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

test('lists the 60 original levels in six regions without treating map files 11–13 as campaign stages', () => {
  assert.deepEqual(campaignRegions.map(({ id }) => id), [
    'new-mexico', 'mississippi', 'oregon', 'dakota', 'nevada', 'alaska',
  ]);
  assert.equal(campaignCatalog.length, 60);
  for (const region of campaignRegions) {
    assert.equal(campaignCatalog.filter((level) => level.regionId === region.id).length, 10);
  }
  assert.equal(campaignCatalog[0]?.title, 'Cow Gulch');
  assert.equal(campaignCatalog[1]?.title, 'Death Valley');
  assert.equal(campaignCatalog[59]?.title, 'Glacier Bay');
  assert.deepEqual(campaignCatalog.map(({ mapFileNumber }) => mapFileNumber), [
    ...Array.from({ length: 10 }, (_, index) => index + 1),
    ...Array.from({ length: 50 }, (_, index) => index + 14),
  ]);
  assert.deepEqual(campaignCatalog.map(({ titleResourceNumber }) => titleResourceNumber),
    campaignCatalog.map(({ mapFileNumber }) => mapFileNumber));
  assert.ok(campaignCatalog.every(({ mapFileNumber }) => mapFileNumber < 11 || mapFileNumber > 13));
});

test('maps available, locked, completed, and not-yet-implemented levels from Progress', async () => {
  const progress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  const initial = await progress.loadCampaign();

  assert.equal(campaignLevelState(1, initial), 'available');
  assert.equal(campaignLevelState(2, initial), 'locked');
  assert.equal(campaignLevelState(3, initial), 'locked');
  assert.equal(campaignLevelState(4, initial), 'unimplemented');

  await progress.applySettlement({
    settlementId: `catalog-test:${cowGulchLevelOneContent.id}:1`,
    sessionId: 'catalog-test',
    scenarioId: cowGulchLevelOneContent.id,
    mode: 'formal',
    waveNumber: 1,
    outcome: 'victory',
    scoreBase: 100,
    displayScore: 100,
    highScoreCandidate: 100,
  });
  const afterCowGulch = await progress.loadCampaign();

  assert.equal(campaignLevelState(1, afterCowGulch), 'completed');
  assert.equal(campaignLevelState(2, afterCowGulch), 'available');
  assert.equal(campaignLevelState(3, afterCowGulch), 'locked');

  await progress.applySettlement({
    settlementId: `catalog-test:${apacheValleyLevelTwoContent.id}:6`,
    sessionId: 'catalog-test',
    scenarioId: apacheValleyLevelTwoContent.id,
    mode: 'formal',
    waveNumber: 6,
    outcome: 'victory',
    scoreBase: 200,
    displayScore: 200,
    highScoreCandidate: 200,
  });
  const afterApacheValley = await progress.loadCampaign();
  assert.equal(campaignLevelState(2, afterApacheValley), 'completed');
  assert.equal(campaignLevelState(3, afterApacheValley), 'available');
  assert.equal(campaignLevelState(4, afterApacheValley), 'unimplemented');
  assert.equal(campaignLevelState(2, undefined), 'unimplemented');
  assert.equal(campaignLevelState(2, {
    ...afterCowGulch,
    stages: afterCowGulch.stages.filter(({ scenarioId }) => scenarioId !== apacheValleyLevelTwoContent.id),
  }), 'unimplemented');
  assert.equal(fortKaboomLevelThreeContent.id, 'campaign-new-mexico-03');
});
