import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dakota09CampaignContentVersionForSnapshot,
  dakota09CampaignUnlockSnapshotFor,
  parseDakota09ReplayContentVersion,
} from '../src/content/dakota-09-content-version';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot, type MississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';

function snapshotForMask(mask: number): MississippiUnitUnlockSnapshot {
  return {
    grandpa: Boolean(mask & 1),
    sniper: Boolean(mask & 2),
    pyromaniac: Boolean(mask & 4),
    salesman: Boolean(mask & 8),
  };
}

test('Snow Town content versions canonically record every global hire-unlock snapshot', () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const snapshot = { unitUnlocks: snapshotForMask(mask) };
    const version = dakota09CampaignContentVersionForSnapshot(snapshot);
    assert.deepEqual(parseDakota09ReplayContentVersion(version)?.snapshot, snapshot);
    assert.deepEqual(
      dakota09CampaignUnlockSnapshotFor(completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot.unitUnlocks)),
      snapshot,
    );
  }

  assert.equal(parseDakota09ReplayContentVersion(undefined), undefined);
  assert.equal(parseDakota09ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseDakota09ReplayContentVersion(
    'gng-free-1.8.6-dakota-09-formal-v1-grandpa2-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseDakota09ReplayContentVersion(
    'gng-free-1.8.6-dakota-08-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
});
