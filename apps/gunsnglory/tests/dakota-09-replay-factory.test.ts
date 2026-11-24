import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGameForDakota09Replay } from '../src/bootstrap/browser';
import { dakota09CampaignId } from '../src/content/dakota-09-identity';
import {
  dakota09CampaignContentVersionForSnapshot,
  type Dakota09CampaignUnlockSnapshot,
} from '../src/content/dakota-09-content-version';

test('Snow Town replay factory rebuilds the recorded hire unlock snapshot', async () => {
  const snapshot: Dakota09CampaignUnlockSnapshot = {
    unitUnlocks: { grandpa: true, sniper: false, pyromaniac: true, salesman: false },
  };
  const contentVersion = dakota09CampaignContentVersionForSnapshot(snapshot);
  const session = await createBrowserGameForDakota09Replay(contentVersion).open({
    scenarioId: dakota09CampaignId,
    contentVersion,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 39_001,
  });

  try {
    assert.equal(session.startRecord.scenarioId, dakota09CampaignId);
    assert.equal(session.startRecord.contentVersion, contentVersion);
    assert.ok(session.observe().units.some(({ type, activity }) => type === 'grandpa' && activity === 4));
    assert.ok(session.observe().units.some(({ type, activity }) => type === 'pyromaniac' && activity === 4));
    assert.ok(!session.observe().units.some(({ type, activity }) => type === 'sniper' && activity === 4));
    assert.ok(!session.observe().units.some(({ type, activity }) => type === 'salesman' && activity === 4));
  } finally {
    session.close();
  }
});
