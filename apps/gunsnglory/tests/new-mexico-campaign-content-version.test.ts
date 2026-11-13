import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { createTechTownCampaignContent } from '../src/content/tech-town-campaign';
import { createBillyHillsCampaignContent } from '../src/content/billy-hills-campaign';
import { createMurdockMountainsCampaignContent } from '../src/content/murdock-mountains-campaign';
import { createLuckyLakeCampaignContent } from '../src/content/lucky-lake-campaign';
import { newMexicoCampaignContentVersionFor } from '../src/content/new-mexico-replay-content-version';

const scenarios = [
  { id: 'campaign-new-mexico-04', build: createTechTownCampaignContent, hasMapAccessBit: true },
  { id: 'campaign-new-mexico-05', build: createBillyHillsCampaignContent, hasMapAccessBit: false },
  { id: 'campaign-new-mexico-06', build: createMurdockMountainsCampaignContent, hasMapAccessBit: false },
  { id: 'campaign-new-mexico-07', build: createLuckyLakeCampaignContent, hasMapAccessBit: false },
] as const;
const milestoneScenarioIds = [
  'campaign-oregon-10',
  'campaign-dakota-10',
  'campaign-nevada-10',
  'campaign-alaska-10',
] as const;

function completedForMask(mask: number, map04Accessible = false): string[] {
  return [
    ...milestoneScenarioIds.filter((_, bit) => (mask & (1 << bit)) !== 0),
    ...(map04Accessible ? ['campaign-new-mexico-03'] : []),
  ];
}

test('M4-M7 content builders and browser-open requests use the same recorded snapshot version', async () => {
  let seed = 0;
  for (const { id: scenarioId, build, hasMapAccessBit } of scenarios) {
    const accessStates = hasMapAccessBit ? [false, true] : [false];
    for (let mask = 0; mask < 16; mask += 1) {
      for (const map04Accessible of accessStates) {
        const completedScenarioIds = completedForMask(mask, map04Accessible);
        const expectedVersion = newMexicoCampaignContentVersionFor(scenarioId, completedScenarioIds);
        assert.equal(build(completedScenarioIds).contentVersion, expectedVersion);
        assert.equal(getBrowserScenarioContentVersion(scenarioId, completedScenarioIds), expectedVersion);

        if (hasMapAccessBit && !map04Accessible) continue;
        const session = await createBrowserGame(completedScenarioIds).open({
          scenarioId,
          contentVersion: expectedVersion,
          mode: 'free',
          difficulty: 'easy',
          randomSeed: ++seed,
        });
        try {
          assert.equal(session.startRecord.scenarioId, scenarioId);
          assert.equal(session.startRecord.contentVersion, expectedVersion);
        } finally {
          session.close();
        }
      }
    }
  }
});
