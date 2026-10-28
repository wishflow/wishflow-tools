import assert from 'node:assert/strict';
import test from 'node:test';
import { getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { cowGulchContent, cowGulchUpgradeSampleContent } from '../src/content/cow-gulch';
import { cowGulchDefeatContent } from '../src/content/cow-gulch-defeat';
import { campaignProgressSampleOne, campaignProgressSampleTwo } from '../src/content/campaign-progress-samples';

test('browser scene requests resolve the exact registered content version', () => {
  assert.equal(getBrowserScenarioContentVersion(cowGulchContent.id), cowGulchContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchUpgradeSampleContent.id), cowGulchUpgradeSampleContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchDefeatContent.id), cowGulchDefeatContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(campaignProgressSampleOne.id), campaignProgressSampleOne.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(campaignProgressSampleTwo.id), campaignProgressSampleTwo.contentVersion);
  assert.equal(getBrowserScenarioContentVersion('missing-scene'), undefined);
});
