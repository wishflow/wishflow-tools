import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForDakota02Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { dakota02CampaignContentVersionForSnapshot } from '../src/content/dakota-02-content-version';
import { dakota02CampaignId } from '../src/content/dakota-02-identity';

test('Six Grandfathers replay uses its recorded unit unlocks, not the importer profile', async () => {
  const snapshot = {
    unitUnlocks: { grandpa: true, sniper: false, pyromaniac: true, salesman: false },
  };
  const version = dakota02CampaignContentVersionForSnapshot(snapshot);

  assert.notEqual(getBrowserScenarioContentVersion(dakota02CampaignId, []), version);
  const session = await createBrowserGameForDakota02Replay(version).open({
    scenarioId: dakota02CampaignId,
    contentVersion: version,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 32_000,
  });
  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, version);
    assert.equal(view.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length, 6);
    assert.equal(view.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length, 0);
    assert.equal(view.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length, 1);
    assert.equal(view.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length, 0);
  } finally {
    session.close();
  }
});

test('Six Grandfathers replay factory rejects an unknown content snapshot', async () => {
  await assert.rejects(
    createBrowserGameForDakota02Replay(undefined).open({
      scenarioId: dakota02CampaignId,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 32_001,
    }),
    (error: unknown) => error instanceof Error && error.message.includes('Unknown scenario'),
  );
});
