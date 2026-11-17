import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  type MississippiUnitUnlockSnapshot,
} from '../src/content/mississippi-unit-unlocks';
import {
  createOregon08CampaignContent,
  createOregon08CampaignContentFromSnapshot,
} from '../src/content/oregon-08-campaign';
import {
  oregon08CampaignContentVersionFor,
  oregon08CampaignContentVersionForSnapshot,
  parseOregon08ReplayContentVersion,
} from '../src/content/oregon-08-content-version';
import { oregon08CampaignId } from '../src/content/oregon-08-identity';
import { gameValueDigest } from '../src/game/replay';
import { createBrowserGameForOregon08Replay, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';

function snapshotForMask(mask: number): MississippiUnitUnlockSnapshot {
  return {
    grandpa: Boolean(mask & 1),
    sniper: Boolean(mask & 2),
    pyromaniac: Boolean(mask & 4),
    salesman: Boolean(mask & 8),
  };
}

function hireCounts(content: { units: readonly { type: string; activity?: number }[] }) {
  return {
    sniper: content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
    grandpa: content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
    pyromaniac: content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
    salesman: content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
    gambler: content.units.filter(({ type }) => type === 'gambler').length,
  };
}

test('Colt City snapshot builder reconstructs all 16 global unlock combinations', () => {
  const versions = new Set<string>();
  for (let mask = 0; mask < 16; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const completed = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
    const fromSnapshot = createOregon08CampaignContentFromSnapshot(snapshot);
    const fromProfile = createOregon08CampaignContent(completed);
    const version = oregon08CampaignContentVersionForSnapshot(snapshot);
    const parsed = parseOregon08ReplayContentVersion(version);

    assert.equal(fromSnapshot.id, oregon08CampaignId);
    assert.equal(fromSnapshot.contentVersion, version);
    assert.deepEqual(parsed?.snapshot, snapshot);
    assert.deepEqual(fromProfile, fromSnapshot, 'profile and recorded-snapshot builders share one content shape');
    assert.deepEqual(hireCounts(fromSnapshot), {
      sniper: snapshot.sniper ? 1 : 0,
      grandpa: snapshot.grandpa ? 2 : 0,
      pyromaniac: snapshot.pyromaniac ? 1 : 0,
      salesman: snapshot.salesman ? 1 : 0,
      gambler: snapshot.pyromaniac ? 1 : 0,
    });
    assert.equal(fromSnapshot.map.decorations?.filter(({ asset }) => asset === 'b_3x2_casino').length,
      snapshot.pyromaniac ? 1 : 0);
    assert.deepEqual(fromSnapshot.gambler?.unlockedPrizeUnitTypes, snapshot.pyromaniac
      ? [1, 2, 3, 4, ...(snapshot.sniper ? [5] : []), ...(snapshot.grandpa ? [6] : []), 35,
        ...(snapshot.salesman ? [36] : [])]
      : undefined);
    assert.equal(fromSnapshot.campaignUnitPool?.units.find(({ poolType }) => poolType === 2)?.template?.type, 'mexican');
    assert.equal(fromSnapshot.campaignUnitPool?.units.find(({ poolType }) => poolType === 3)?.template?.type, 'cannon');
    versions.add(version);
  }
  assert.equal(versions.size, 16, 'every content-changing unlock snapshot has a distinct canonical version');
});

test('Colt City replay reconstruction uses its recorded snapshot instead of the importing profile', async () => {
  const recordedSnapshot: MississippiUnitUnlockSnapshot = {
    grandpa: true,
    sniper: false,
    pyromaniac: true,
    salesman: false,
  };
  const recordedCompleted = completedScenarioIdsForMississippiUnitUnlockSnapshot(recordedSnapshot);
  const importerCompleted: string[] = [];
  const recordedContent = createOregon08CampaignContentFromSnapshot(recordedSnapshot);
  const recordedVersion = oregon08CampaignContentVersionFor(recordedCompleted);
  const parsed = parseOregon08ReplayContentVersion(recordedVersion);
  assert.deepEqual(parsed?.snapshot, recordedSnapshot);

  const replayContent = createOregon08CampaignContentFromSnapshot(parsed!.snapshot);
  const importerContent = createOregon08CampaignContent(importerCompleted);
  assert.notEqual(importerContent.contentVersion, recordedVersion);
  assert.deepEqual(hireCounts(replayContent), hireCounts(recordedContent));
  assert.equal(replayContent.gambler?.unlockedPrizeUnitTypes.includes(35), true);
  assert.equal(importerContent.gambler, undefined);
  assert.equal(await gameValueDigest(replayContent), await gameValueDigest(recordedContent),
    'the canonical scenario digest is stable when rebuilt from the recorded content version');
});

test('Colt City browser replay factory uses the recorded snapshot and exports its canonical version', async () => {
  const recordedSnapshot: MississippiUnitUnlockSnapshot = {
    grandpa: true,
    sniper: false,
    pyromaniac: true,
    salesman: false,
  };
  const recordedCompleted = completedScenarioIdsForMississippiUnitUnlockSnapshot(recordedSnapshot);
  const version = oregon08CampaignContentVersionFor(recordedCompleted);
  assert.equal(getBrowserScenarioContentVersion(oregon08CampaignId, []), oregon08CampaignContentVersionFor([]));
  assert.notEqual(getBrowserScenarioContentVersion(oregon08CampaignId, []), version);

  const session = await createBrowserGameForOregon08Replay(version).open({
    scenarioId: oregon08CampaignId,
    contentVersion: version,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 28_081,
  });
  try {
    assert.equal(session.startRecord.contentVersion, version);
    assert.deepEqual(hireCounts(session.observe()), {
      sniper: 0,
      grandpa: 2,
      pyromaniac: 1,
      salesman: 0,
      gambler: 1,
    }, 'replay units come from the recorded snapshot instead of the importing profile');
  } finally {
    session.close();
  }
});

test('Colt City replay content versions reject missing, malformed, cross-level, and noncanonical snapshots', () => {
  assert.equal(parseOregon08ReplayContentVersion(undefined), undefined);
  assert.equal(parseOregon08ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseOregon08ReplayContentVersion('gng-free-1.8.6-oregon-08-formal-v1'), undefined);
  assert.equal(parseOregon08ReplayContentVersion(
    'gng-free-1.8.6-oregon-08-formal-v1-grandpa2-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseOregon08ReplayContentVersion(
    'gng-free-1.8.6-oregon-07-formal-v1-grandpa0-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseOregon08ReplayContentVersion(
    'gng-free-1.8.6-oregon-08-formal-v1-grandpa0-sniper0-pyro0-salesman0-extra',
  ), undefined);
});
