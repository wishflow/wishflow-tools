import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOregon10CampaignContent,
  createOregon10CampaignContentFromSnapshot,
} from '../src/content/oregon-10-campaign';
import {
  oregon10CampaignContentVersionForSnapshot,
  oregon10CampaignUnlockSnapshotFor,
  parseOregon10ReplayContentVersion,
  type Oregon10CampaignUnlockSnapshot,
} from '../src/content/oregon-10-content-version';
import { oregon10CampaignId } from '../src/content/oregon-10-identity';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import map from '../src/content/oregon-10.json';

function snapshotForMask(mask: number): Oregon10CampaignUnlockSnapshot {
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

function expectedHires(snapshot: Oregon10CampaignUnlockSnapshot) {
  return {
    gunslinger: 1,
    mexican: 1,
    cannon: 1,
    indian: 1,
    grandpa: snapshot.unitUnlocks.grandpa ? 2 : 0,
    sniper: Number(snapshot.unitUnlocks.sniper),
    pyromaniac: Number(snapshot.unitUnlocks.pyromaniac),
    salesman: Number(snapshot.unitUnlocks.salesman),
  };
}

test('Lumber Mill Hills builder reconstructs all 32 canonical unlock snapshots', () => {
  const versions = new Set<string>();

  for (let mask = 0; mask < 32; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const content = createOregon10CampaignContentFromSnapshot(snapshot);
    const version = oregon10CampaignContentVersionForSnapshot(snapshot);

    assert.equal(content.id, oregon10CampaignId);
    assert.equal(content.contentVersion, version);
    assert.deepEqual(parseOregon10ReplayContentVersion(version)?.snapshot, snapshot);
    assert.equal(content.formalSettlementSupported, true);
    assert.deepEqual(content.title, { en: 'Lumber Mill Hills', zh: '木材厂山岭' });
    assert.equal(content.units.length, 9 + Number(snapshot.unitUnlocks.grandpa) * 2 + Number(snapshot.unitUnlocks.sniper)
      + Number(snapshot.unitUnlocks.pyromaniac) + Number(snapshot.unitUnlocks.salesman),
    'four fixed hire markers, five train units, and snapshot-gated hires');
    assert.deepEqual(Object.fromEntries(Object.keys(expectedHires(snapshot)).map((type) => [
      type,
      content.units.filter(({ activity, type: actualType }) => activity === 4 && actualType === type).length,
    ])), expectedHires(snapshot));
    assert.equal(content.maxUpgrades, 3);
    assert.equal(content.campaignWaveCount, 10);
    assert.equal(content.campaignWaves?.length, 10);
    assert.equal(content.campaignUnitPool?.units.length, 4);
    assert.equal(content.campaignUnitPool?.spawnLocations.length, 3);
    assert.equal(content.campaignUnitPool?.actions.length, 2);
    assert.equal(content.dynamite?.pairs.length, 2);
    assert.equal(content.dynamite?.unlocked, snapshot.dynamiteUnlocked);
    assert.deepEqual(content.originalTileGrid, map.originalTileGrid);
    versions.add(version);
  }

  assert.equal(versions.size, 32, 'every unit and Dynamite combination has its own content version');
});

test('Lumber Mill Hills profile builder and parser preserve canonical unlock semantics', () => {
  const snapshot = snapshotForMask(0b1_1010);
  const completedScenarioIds = [
    ...completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot.unitUnlocks),
    ...(snapshot.dynamiteUnlocked ? ['campaign-mississippi-10'] : []),
  ];
  assert.deepEqual(oregon10CampaignUnlockSnapshotFor(completedScenarioIds), snapshot);
  const content = createOregon10CampaignContent(completedScenarioIds);
  assert.equal(content.contentVersion, oregon10CampaignContentVersionForSnapshot(snapshot));
  assert.deepEqual(parseOregon10ReplayContentVersion(content.contentVersion)?.snapshot, snapshot);

  assert.equal(parseOregon10ReplayContentVersion(undefined), undefined);
  assert.equal(parseOregon10ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseOregon10ReplayContentVersion(
    'gng-free-1.8.6-oregon-09-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseOregon10ReplayContentVersion(
    'gng-free-1.8.6-oregon-10-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite2',
  ), undefined);
  assert.equal(parseOregon10ReplayContentVersion(`${content.contentVersion}-extra`), undefined);
});
