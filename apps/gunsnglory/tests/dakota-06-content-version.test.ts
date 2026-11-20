import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dakota06CampaignContentVersionFor,
  dakota06CampaignContentVersionForSnapshot,
  dakota06CampaignUnlockSnapshotFor,
  parseDakota06ReplayContentVersion,
  type Dakota06CampaignUnlockSnapshot,
} from '../src/content/dakota-06-content-version';

function snapshotForMask(mask: number): Dakota06CampaignUnlockSnapshot {
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

test('Ice Rocks content versions round-trip every unit and Dynamite snapshot bit', () => {
  const versions = new Set<string>();

  for (let mask = 0; mask < 32; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const version = dakota06CampaignContentVersionForSnapshot(snapshot);
    assert.equal(
      version,
      `gng-free-1.8.6-dakota-06-formal-v1-grandpa${Number(snapshot.unitUnlocks.grandpa)}`
        + `-sniper${Number(snapshot.unitUnlocks.sniper)}-pyro${Number(snapshot.unitUnlocks.pyromaniac)}`
        + `-salesman${Number(snapshot.unitUnlocks.salesman)}-dynamite${Number(snapshot.dynamiteUnlocked)}`,
    );
    assert.deepEqual(parseDakota06ReplayContentVersion(version)?.snapshot, snapshot);
    versions.add(version);
  }

  assert.equal(versions.size, 32);
});

test('Ice Rocks profile snapshot derives shared unit and Dynamite gates from campaign milestones', () => {
  const cases = [
    { completed: [], expected: snapshotForMask(0) },
    { completed: ['campaign-mississippi-10'], expected: snapshotForMask(16) },
    { completed: ['campaign-oregon-10'], expected: snapshotForMask(17) },
    { completed: ['campaign-dakota-10'], expected: snapshotForMask(2) },
    { completed: ['campaign-nevada-10'], expected: snapshotForMask(4) },
    { completed: ['campaign-alaska-10'], expected: snapshotForMask(8) },
    {
      completed: ['campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10'],
      expected: snapshotForMask(31),
    },
  ] as const;

  for (const { completed, expected } of cases) {
    assert.deepEqual(dakota06CampaignUnlockSnapshotFor(completed), expected);
    assert.equal(dakota06CampaignContentVersionFor(completed), dakota06CampaignContentVersionForSnapshot(expected));
  }
});

test('Ice Rocks parser rejects missing, malformed, noncanonical, and cross-level versions', () => {
  assert.equal(parseDakota06ReplayContentVersion(undefined), undefined);
  for (const version of [
    'unknown-version',
    'gng-free-1.8.6-dakota-06-formal-v1',
    'gng-free-1.8.6-dakota-06-formal-v1-grandpa2-sniper0-pyro0-salesman0-dynamite0',
    'gng-free-1.8.6-dakota-06-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite2',
    'gng-free-1.8.6-dakota-05-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
    'gng-free-1.8.6-dakota-06-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0-extra',
  ]) {
    assert.equal(parseDakota06ReplayContentVersion(version), undefined, version);
  }
});
