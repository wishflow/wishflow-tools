import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForOregon07Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { createOregon07CampaignContent, createOregon07CampaignContentFromSnapshot } from '../src/content/oregon-07-campaign';
import {
  oregon07CampaignContentVersionFor,
  oregon07CampaignContentVersionForSnapshot,
  parseOregon07ReplayContentVersion,
  type Oregon07CampaignUnlockSnapshot,
} from '../src/content/oregon-07-content-version';
import { oregon07CampaignId } from '../src/content/oregon-07-identity';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';

function snapshotForMask(mask: number): Oregon07CampaignUnlockSnapshot {
  return {
    unitUnlocks: {
      grandpa: Boolean(mask & 1),
      sniper: Boolean(mask & 2),
      pyromaniac: Boolean(mask & 4),
      salesman: Boolean(mask & 8),
    },
    dynamiteUnlocked: Boolean(mask & 16),
  };
}

function expectedHireCounts(mask: number) {
  return {
    sniper: mask & 2 ? 1 : 0,
    grandpa: mask & 1 ? 5 : 0,
    pyromaniac: mask & 4 ? 1 : 0,
    salesman: mask & 8 ? 1 : 0,
  };
}

function hireCounts(content: { units: readonly { type: string; activity?: number }[] }) {
  return {
    sniper: content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
    grandpa: content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
    pyromaniac: content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
    salesman: content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
  };
}

test('Mount Hood canonical content snapshots reconstruct all 32 unlock combinations in replay', async () => {
  for (let mask = 0; mask < 32; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const content = createOregon07CampaignContentFromSnapshot(snapshot);
    const version = oregon07CampaignContentVersionForSnapshot(snapshot);
    const parsed = parseOregon07ReplayContentVersion(version);

    assert.equal(content.id, oregon07CampaignId);
    assert.equal(content.contentVersion, version);
    assert.deepEqual(parsed?.snapshot, snapshot);
    assert.deepEqual(hireCounts(content), expectedHireCounts(mask));
    assert.equal(content.dynamite?.unlocked, snapshot.dynamiteUnlocked);
    assert.equal(content.dynamite?.pairs.length, 2);
    assert.equal(content.campaignUnitPool, undefined, 'Mount Hood has no APK player pool action');
    assert.equal(content.units.filter(({ movementGroupId }) => movementGroupId?.startsWith('oregon-07-train-')).length, 10);

    const importerProfile = mask === 0 ? ['campaign-mississippi-10'] : [];
    assert.notEqual(getBrowserScenarioContentVersion(oregon07CampaignId, importerProfile), version,
      'importing profile differs from the recorded content snapshot');

    const session = await createBrowserGameForOregon07Replay(version).open({
      scenarioId: oregon07CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 27_100 + mask,
    });
    try {
      const view = session.observe();
      assert.deepEqual(hireCounts(view), expectedHireCounts(mask));
      assert.equal(view.dynamites?.length, 2);
      assert.ok(view.dynamites?.every(({ unlocked }) => unlocked === snapshot.dynamiteUnlocked));
      assert.equal(view.units.filter(({ movementGroupId }) => movementGroupId?.startsWith('oregon-07-train-')).length, 10);
    } finally {
      session.close();
    }
  }
});

test('Mount Hood profile builder derives snapshots from current completion state', () => {
  const completed = completedScenarioIdsForMississippiUnitUnlockSnapshot({
    grandpa: true,
    sniper: true,
    pyromaniac: false,
    salesman: false,
  });
  const content = createOregon07CampaignContent(completed);
  assert.equal(content.contentVersion, oregon07CampaignContentVersionFor(completed));
  assert.equal(content.dynamite?.unlocked, true);
  assert.equal(content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length, 5);
  assert.equal(content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length, 1);
});

test('Mount Hood replay parser rejects missing, malformed, cross-level, and noncanonical versions', async () => {
  assert.equal(parseOregon07ReplayContentVersion(undefined), undefined);
  assert.equal(parseOregon07ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseOregon07ReplayContentVersion('gng-free-1.8.6-oregon-07-formal-v1'), undefined);
  assert.equal(parseOregon07ReplayContentVersion(
    'gng-free-1.8.6-oregon-07-formal-v1-grandpa2-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseOregon07ReplayContentVersion(
    'gng-free-1.8.6-oregon-06-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseOregon07ReplayContentVersion(
    'gng-free-1.8.6-oregon-07-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite2',
  ), undefined);
  assert.equal(parseOregon07ReplayContentVersion(
    'gng-free-1.8.6-oregon-07-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0-extra',
  ), undefined);

  assert.equal(
    getBrowserScenarioContentVersion(oregon07CampaignId, []),
    oregon07CampaignContentVersionFor([]),
    'browser bootstrap recognizes Mount Hood content for versioned replay exports',
  );
  await assert.rejects(
    createBrowserGameForOregon07Replay(undefined).open({
      scenarioId: oregon07CampaignId,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 27_132,
    }),
    (error: unknown) => error instanceof Error && error.message.includes('Unknown scenario'),
    'unsupported replay versions remain unavailable instead of using current profile state',
  );
});
