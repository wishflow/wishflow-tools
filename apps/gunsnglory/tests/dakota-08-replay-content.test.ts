import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dakota08CampaignContentVersionForSnapshot,
  dakota08CampaignUnlockSnapshotFor,
  parseDakota08ReplayContentVersion,
  type Dakota08CampaignUnlockSnapshot,
} from '../src/content/dakota-08-content-version';
import {
  createDakota08DynamiteDefinition,
  createDakota08DynamiteDefinitionFromSnapshot,
} from '../src/content/dakota-08-dynamite';
import { createDakota08MapUnits, createDakota08MapUnitsFromSnapshot } from '../src/content/dakota-08-units';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';

function snapshotForMask(mask: number, dynamiteUnlocked: boolean): Dakota08CampaignUnlockSnapshot {
  return {
    unitUnlocks: {
      grandpa: Boolean(mask & 1),
      sniper: Boolean(mask & 2),
      pyromaniac: Boolean(mask & 4),
      salesman: Boolean(mask & 8),
    },
    dynamiteUnlocked,
  };
}

function completedIdsForSnapshot(snapshot: Dakota08CampaignUnlockSnapshot): string[] {
  return [
    ...completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot.unitUnlocks),
    ...(snapshot.dynamiteUnlocked ? ['campaign-mississippi-10'] : []),
  ];
}

test('Wayne Waters content version round-trips all 32 unit and Dynamite bit combinations', () => {
  const versions = new Set<string>();

  for (let mask = 0; mask < 16; mask += 1) {
    for (const dynamiteUnlocked of [false, true]) {
      const snapshot = snapshotForMask(mask, dynamiteUnlocked);
      const version = dakota08CampaignContentVersionForSnapshot(snapshot);
      assert.deepEqual(parseDakota08ReplayContentVersion(version)?.snapshot, snapshot);

      const completedIds = completedIdsForSnapshot(snapshot);
      const progressSnapshot = dakota08CampaignUnlockSnapshotFor(completedIds);
      assert.deepEqual(progressSnapshot.unitUnlocks, snapshot.unitUnlocks);
      assert.equal(progressSnapshot.dynamiteUnlocked, dynamiteUnlocked || snapshot.unitUnlocks.grandpa,
        'the Grandfather milestone at level 30 also unlocks Dynamite');

      const unitsFromSnapshot = createDakota08MapUnitsFromSnapshot(snapshot.unitUnlocks);
      const unitsFromProgress = createDakota08MapUnits(completedIds);
      assert.deepEqual(
        unitsFromSnapshot.map(({ id, type, activity }) => [id, type, activity]),
        unitsFromProgress.map(({ id, type, activity }) => [id, type, activity]),
      );
      assert.deepEqual(
        createDakota08DynamiteDefinitionFromSnapshot(progressSnapshot.dynamiteUnlocked),
        createDakota08DynamiteDefinition(completedIds),
      );
      versions.add(version);
    }
  }

  assert.equal(versions.size, 32, 'each global unit unlock bit and the Dynamite gate affect content identity');
});

test('Wayne Waters content version parser rejects missing, malformed and cross-level versions', () => {
  assert.equal(parseDakota08ReplayContentVersion(undefined), undefined);
  for (const version of [
    'unknown-version',
    'gng-free-1.8.6-dakota-08-formal-v1',
    'gng-free-1.8.6-dakota-08-formal-v1-grandpa2-sniper0-pyro0-salesman0-dynamite0',
    'gng-free-1.8.6-dakota-07-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
    'gng-free-1.8.6-dakota-08-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite1-extra',
  ]) {
    assert.equal(parseDakota08ReplayContentVersion(version), undefined, version);
  }
});
