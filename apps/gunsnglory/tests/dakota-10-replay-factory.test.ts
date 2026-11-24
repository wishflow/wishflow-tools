import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGameForDakota10Replay } from '../src/bootstrap/browser';
import { dakota10CampaignId } from '../src/content/dakota-10-identity';
import {
  dakota10CampaignContentVersionForSnapshot,
  type Dakota10CampaignUnlockSnapshot,
} from '../src/content/dakota-10-content-version';

test('Sioux Falls replay factory rebuilds the recorded unit and Dynamite unlock snapshot', async () => {
  const snapshot: Dakota10CampaignUnlockSnapshot = {
    unitUnlocks: { grandpa: true, sniper: false, pyromaniac: true, salesman: false },
    dynamiteUnlocked: true,
  };
  const contentVersion = dakota10CampaignContentVersionForSnapshot(snapshot);
  const session = await createBrowserGameForDakota10Replay(contentVersion).open({
    scenarioId: dakota10CampaignId,
    contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 40_001,
  });

  try {
    assert.equal(session.startRecord.scenarioId, dakota10CampaignId);
    assert.equal(session.startRecord.contentVersion, contentVersion);
    assert.ok(session.observe().units.some(({ type, activity }) => type === 'grandpa' && activity === 4));
    assert.ok(session.observe().units.some(({ type, activity }) => type === 'pyromaniac' && activity === 4));
    assert.ok(!session.observe().units.some(({ type, activity }) => type === 'sniper' && activity === 4));
    assert.ok(!session.observe().units.some(({ type, activity }) => type === 'salesman' && activity === 4));
  } finally {
    session.close();
  }
});

test('Sioux Falls replay factory rejects missing and noncanonical content versions', async () => {
  for (const contentVersion of [undefined, 'gng-free-1.8.6-dakota-10-formal-v1-invalid']) {
    await assert.rejects(
      createBrowserGameForDakota10Replay(contentVersion).open({
        scenarioId: dakota10CampaignId,
        contentVersion,
        mode: 'free',
        difficulty: 'medium',
        randomSeed: 40_002,
      }),
      (error: unknown) => error instanceof Error && error.message.includes('Unknown scenario'),
    );
  }
});
