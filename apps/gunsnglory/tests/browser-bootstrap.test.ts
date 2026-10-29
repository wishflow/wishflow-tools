import assert from 'node:assert/strict';
import test from 'node:test';
import { getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import {
  cowGulchP1aSampleContent,
  cowGulchP1bCampaignContent,
  cowGulchP1dCampaignContent,
  cowGulchUpgradeSampleContent,
} from '../src/content/cow-gulch';
import { cowGulchDefeatContent } from '../src/content/cow-gulch-defeat';
import { campaignProgressSampleOne, campaignProgressSampleTwo } from '../src/content/campaign-progress-samples';

test('browser scene requests resolve the exact registered content version', () => {
  assert.equal(getBrowserScenarioContentVersion(cowGulchP1aSampleContent.id), cowGulchP1aSampleContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchP1bCampaignContent.id), cowGulchP1bCampaignContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchP1dCampaignContent.id), cowGulchP1dCampaignContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchUpgradeSampleContent.id), cowGulchUpgradeSampleContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchDefeatContent.id), cowGulchDefeatContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(campaignProgressSampleOne.id), campaignProgressSampleOne.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(campaignProgressSampleTwo.id), campaignProgressSampleTwo.contentVersion);
  assert.equal(getBrowserScenarioContentVersion('missing-scene'), undefined);
});
