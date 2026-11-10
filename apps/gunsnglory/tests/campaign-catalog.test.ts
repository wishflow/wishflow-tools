import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignCatalog, campaignLevelState, campaignRegions } from '../src/content/campaign-catalog';
import {
  apacheValleyLevelTwoContent,
  billyHillsLevelFiveCampaignContent,
  cowGulchLevelOneContent,
  fortKaboomLevelThreeContent,
  officialCampaignStages,
  murdockMountainsLevelSixCampaignContent,
  techTownLevelFourCampaignContent,
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
  assert.equal(campaignLevelState(4, initial), 'locked');
  assert.equal(campaignLevelState(5, initial), 'locked');

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
  assert.equal(campaignLevelState(4, afterApacheValley), 'locked');

  await progress.applySettlement({
    settlementId: `catalog-test:${fortKaboomLevelThreeContent.id}:10`,
    sessionId: 'catalog-test',
    scenarioId: fortKaboomLevelThreeContent.id,
    mode: 'formal',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 300,
    displayScore: 300,
    highScoreCandidate: 300,
  });
  const afterFortKaboom = await progress.loadCampaign();
  assert.equal(campaignLevelState(3, afterFortKaboom), 'completed');
  assert.equal(campaignLevelState(4, afterFortKaboom), 'available');
  assert.equal(campaignLevelState(5, afterFortKaboom), 'locked');

  await progress.applySettlement({
    settlementId: `catalog-test:${techTownLevelFourCampaignContent.id}:8`,
    sessionId: 'catalog-test',
    scenarioId: techTownLevelFourCampaignContent.id,
    mode: 'formal',
    waveNumber: 8,
    outcome: 'victory',
    scoreBase: 400,
    displayScore: 400,
    highScoreCandidate: 400,
  });
  const afterTechTown = await progress.loadCampaign();
  assert.equal(campaignLevelState(4, afterTechTown), 'completed');
  assert.equal(campaignLevelState(5, afterTechTown), 'available');
  assert.equal(campaignLevelState(6, afterTechTown), 'locked', 'map06 stays locked while map05 is playable');
  assert.deepEqual(officialCampaignStages.at(-3), {
    scenarioId: billyHillsLevelFiveCampaignContent.id,
    contentVersion: billyHillsLevelFiveCampaignContent.contentVersion,
    title: billyHillsLevelFiveCampaignContent.title,
    globalLevel: 5,
    requiresCompletedScenarioIds: [techTownLevelFourCampaignContent.id],
  });

  await progress.applySettlement({
    settlementId: `catalog-test:${billyHillsLevelFiveCampaignContent.id}:8`,
    sessionId: 'catalog-test',
    scenarioId: billyHillsLevelFiveCampaignContent.id,
    mode: 'formal',
    waveNumber: 8,
    outcome: 'victory',
    scoreBase: 500,
    displayScore: 500,
    highScoreCandidate: 500,
  });
  const afterBillyHills = await progress.loadCampaign();
  assert.equal(campaignLevelState(5, afterBillyHills), 'completed');
  assert.equal(campaignLevelState(6, afterBillyHills), 'available', 'completing map05 unlocks the registered map06');
  assert.equal(campaignLevelState(7, afterBillyHills), 'locked', 'map07 stays behind the playable map06');
  assert.equal(campaignLevelState(2, undefined), 'unimplemented');
  assert.equal(campaignLevelState(2, {
    ...afterCowGulch,
    stages: afterCowGulch.stages.filter(({ scenarioId }) => scenarioId !== apacheValleyLevelTwoContent.id),
  }), 'unimplemented');
  assert.equal(fortKaboomLevelThreeContent.id, 'campaign-new-mexico-03');
  assert.equal(murdockMountainsLevelSixCampaignContent.id, 'campaign-new-mexico-06');

  await progress.applySettlement({
    settlementId: `catalog-test:${murdockMountainsLevelSixCampaignContent.id}:10`,
    sessionId: 'catalog-test',
    scenarioId: murdockMountainsLevelSixCampaignContent.id,
    mode: 'formal',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 600,
    displayScore: 600,
    highScoreCandidate: 600,
  });
  const afterMurdockMountains = await progress.loadCampaign();
  assert.equal(campaignLevelState(6, afterMurdockMountains), 'completed');
  assert.equal(campaignLevelState(7, afterMurdockMountains), 'available');
});
