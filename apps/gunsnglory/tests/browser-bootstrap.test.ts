import assert from 'node:assert/strict';
import test from 'node:test';
import { getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { cowGulchContent, cowGulchUpgradeSampleContent } from '../src/content/cow-gulch';
import { cowGulchDefeatContent } from '../src/content/cow-gulch-defeat';

test('browser scene requests resolve the exact registered content version', () => {
  assert.equal(getBrowserScenarioContentVersion(cowGulchContent.id), cowGulchContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchUpgradeSampleContent.id), cowGulchUpgradeSampleContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion(cowGulchDefeatContent.id), cowGulchDefeatContent.contentVersion);
  assert.equal(getBrowserScenarioContentVersion('missing-scene'), undefined);
});
