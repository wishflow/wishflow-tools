import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import {
  cowGulchP1aSampleContent,
  cowGulchP1bCampaignContent,
  cowGulchP1dCampaignContent,
  cowGulchUpgradeSampleContent,
} from '../src/content/cow-gulch';
import { cowGulchDefeatContent } from '../src/content/cow-gulch-defeat';
import { campaignProgressSampleOne, campaignProgressSampleTwo } from '../src/content/campaign-progress-samples';
import { billyHillsLevelFiveCampaignContent, cowGulchLevelOneContent } from '../src/content/official-campaign';

test('browser scene requests resolve the exact registered content version', () => {
  assert.equal(getBrowserScenarioContentVersion(cowGulchP1aSampleContent.id), cowGulchP1aSampleContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchP1bCampaignContent.id), cowGulchP1bCampaignContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchP1dCampaignContent.id), cowGulchP1dCampaignContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchUpgradeSampleContent.id), cowGulchUpgradeSampleContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchDefeatContent.id), cowGulchDefeatContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(campaignProgressSampleOne.id), campaignProgressSampleOne.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(campaignProgressSampleTwo.id), campaignProgressSampleTwo.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchLevelOneContent.id), cowGulchLevelOneContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(billyHillsLevelFiveCampaignContent.id), billyHillsLevelFiveCampaignContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion('missing-scene'), undefined);
});

test('browser registry opens Billy Hills with the unit set for the supplied campaign profile', async () => {
  const completedScenarioIds = [
    'campaign-new-mexico-01',
    'campaign-new-mexico-02',
    'campaign-new-mexico-03',
    'campaign-new-mexico-04',
    'campaign-oregon-10',
  ];
  const game = createBrowserGame(completedScenarioIds);
  const session = await game.open({
    scenarioId: billyHillsLevelFiveCampaignContent.id,
    contentVersion: getBrowserScenarioContentVersion(billyHillsLevelFiveCampaignContent.id, completedScenarioIds),
    randomSeed: 7,
    difficulty: 'easy',
    mode: 'formal',
  });

  try {
    const units = new Set(session.observe().units.map(({ type }) => type));
    assert.equal(units.has('grandpa'), true);
    assert.equal(units.has('sniper'), false);
    assert.equal(units.has('pyromaniac'), false);
    assert.equal(units.has('salesman'), false);
    assert.equal(session.observe().wave?.totalWaves, 8);
  } finally {
    session.close();
  }
});
