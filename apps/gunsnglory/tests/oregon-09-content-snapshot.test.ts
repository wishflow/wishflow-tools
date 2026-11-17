import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOregon09CampaignContent,
  createOregon09CampaignContentFromSnapshot,
} from '../src/content/oregon-09-campaign';
import {
  oregon09CampaignContentVersionForSnapshot,
  oregon09CampaignUnlockSnapshotFor,
  parseOregon09ReplayContentVersion,
  type Oregon09CampaignUnlockSnapshot,
} from '../src/content/oregon-09-content-version';
import { oregon09CampaignId } from '../src/content/oregon-09-identity';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import map from '../src/content/oregon-09.json';

function snapshotForMask(mask: number): Oregon09CampaignUnlockSnapshot {
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

function expectedHireCount(snapshot: Oregon09CampaignUnlockSnapshot): number {
  return 4
    + (snapshot.unitUnlocks.grandpa ? 19 : 0)
    + Number(snapshot.unitUnlocks.sniper)
    + Number(snapshot.unitUnlocks.pyromaniac)
    + Number(snapshot.unitUnlocks.salesman);
}

function expectedHires(snapshot: Oregon09CampaignUnlockSnapshot) {
  return {
    grandpa: snapshot.unitUnlocks.grandpa ? 19 : 0,
    sniper: Number(snapshot.unitUnlocks.sniper),
    pyromaniac: Number(snapshot.unitUnlocks.pyromaniac),
    salesman: Number(snapshot.unitUnlocks.salesman),
  };
}

test('Snake River builder reconstructs every unit and Dynamite unlock combination canonically', () => {
  const versions = new Set<string>();

  for (let mask = 0; mask < 32; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const content = createOregon09CampaignContentFromSnapshot(snapshot);
    const version = oregon09CampaignContentVersionForSnapshot(snapshot);

    assert.equal(content.id, oregon09CampaignId);
    assert.equal(content.contentVersion, version);
    assert.deepEqual(parseOregon09ReplayContentVersion(version)?.snapshot, snapshot);
    assert.equal(content.formalSettlementSupported, true);
    assert.deepEqual(content.title, { en: 'Snake River', zh: '蛇河' });
    assert.equal(content.units.length, expectedHireCount(snapshot));
    assert.deepEqual({
      grandpa: content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
      sniper: content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
      pyromaniac: content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
      salesman: content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
    }, expectedHires(snapshot));
    assert.equal(content.maxUpgrades, 3);
    assert.equal(content.campaignWaveCount, 6);
    assert.equal(content.campaignWaves?.length, 6);
    assert.equal(content.dynamite?.pairs.length, 11);
    assert.equal(content.dynamite?.unlocked, snapshot.dynamiteUnlocked);
    assert.equal(content.units.filter(({ movementGroupId }) => movementGroupId?.startsWith('oregon-09-steamer-')).length, 4);
    assert.equal(content.campaignUnitPool, undefined, 'Snake River has no player-unit spawn pool');
    assert.equal(content.gambler, undefined, 'a Gambler cooldown field does not create a map Gambler');
    assert.deepEqual(content.originalTileGrid, map.originalTileGrid);
    versions.add(version);
  }

  assert.equal(versions.size, 32, 'each content-changing unlock snapshot has its own canonical version');
});

test('Snake River profile builder and replay parser use complete canonical unlock snapshots', () => {
  const snapshot = snapshotForMask(0b1_1011);
  const completedScenarioIds = [
    ...completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot.unitUnlocks),
    ...(snapshot.dynamiteUnlocked ? ['campaign-mississippi-10'] : []),
  ];
  const unlocks = oregon09CampaignUnlockSnapshotFor(completedScenarioIds);
  assert.deepEqual(unlocks, snapshot);

  const content = createOregon09CampaignContent(completedScenarioIds);
  assert.equal(content.contentVersion, oregon09CampaignContentVersionForSnapshot(snapshot));
  assert.deepEqual(parseOregon09ReplayContentVersion(content.contentVersion)?.snapshot, snapshot);

  assert.equal(parseOregon09ReplayContentVersion(undefined), undefined);
  assert.equal(parseOregon09ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseOregon09ReplayContentVersion(
    'gng-free-1.8.6-oregon-08-formal-v1-grandpa0-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseOregon09ReplayContentVersion(
    'gng-free-1.8.6-oregon-09-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite2',
  ), undefined);
  assert.equal(parseOregon09ReplayContentVersion(`${content.contentVersion}-extra`), undefined);
});
