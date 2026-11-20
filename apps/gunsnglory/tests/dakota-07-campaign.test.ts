import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-07.json';
import {
  createDakota07CampaignContent,
  createDakota07CampaignContentFromSnapshot,
} from '../src/content/dakota-07-campaign';
import {
  dakota07CampaignContentVersionForSnapshot,
  dakota07CampaignUnlockSnapshotFor,
  parseDakota07ReplayContentVersion,
  type Dakota07CampaignUnlockSnapshot,
} from '../src/content/dakota-07-content-version';
import { dakota07CampaignCopy } from '../src/content/dakota-07-campaign-copy';
import { dakota07CampaignId } from '../src/content/dakota-07-identity';
import { dakota07CampaignSpawnRequestCount, dakota07CampaignWaves } from '../src/content/dakota-07-campaign-waves';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import { createGame } from '../src/game';

function snapshotForMask(mask: number): Dakota07CampaignUnlockSnapshot {
  return {
    unitUnlocks: {
      grandpa: Boolean(mask & 1),
      sniper: Boolean(mask & 2),
      pyromaniac: Boolean(mask & 4),
      salesman: Boolean(mask & 8),
    },
  };
}

test('Frost Station factory composes the audited scene and all sixteen global unit unlock snapshots', () => {
  const versions = new Set<string>();

  for (let mask = 0; mask < 16; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const content = createDakota07CampaignContentFromSnapshot(snapshot);
    const expectedUnits = 59 + Number(snapshot.unitUnlocks.sniper)
      + (snapshot.unitUnlocks.grandpa ? 7 : 0)
      + Number(snapshot.unitUnlocks.pyromaniac)
      + Number(snapshot.unitUnlocks.salesman);

    assert.equal(content.id, dakota07CampaignId);
    assert.equal(content.contentVersion, dakota07CampaignContentVersionForSnapshot(snapshot));
    assert.equal(content.formalSettlementSupported, true);
    assert.deepEqual(content.title, dakota07CampaignCopy.title);
    assert.equal(content.map.width, 32);
    assert.equal(content.map.height, 24);
    assert.equal(content.originalTileGrid, map.originalTileGrid);
    assert.equal(content.units.length, expectedUnits);
    assert.equal(new Set(content.units.map(({ id }) => id)).size, content.units.length,
      'all map unit and train IDs are unique');
    assert.equal(content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
      Number(snapshot.unitUnlocks.sniper));
    assert.equal(content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
      snapshot.unitUnlocks.grandpa ? 7 : 0);
    assert.equal(content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
      Number(snapshot.unitUnlocks.pyromaniac));
    assert.equal(content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
      Number(snapshot.unitUnlocks.salesman));
    assert.equal(content.maxUpgrades, 3);
    assert.equal(content.campaignWaveCount, 8);
    assert.equal(content.campaignWaves?.length, 8);
    assert.equal(content.campaignUnitPool, undefined, 'the APK has no player-unit pool actions');
    assert.equal(content.dynamite, undefined, 'the APK has no Dynamite objects on this map');
    assert.equal(content.campaignBonusCratePool?.simultaneousLimit, 15);
    assert.equal(dakota07CampaignSpawnRequestCount, 18);
    assert.deepEqual(parseDakota07ReplayContentVersion(content.contentVersion)?.snapshot, snapshot);
    versions.add(content.contentVersion!);
  }

  assert.equal(versions.size, 16, 'each of the four global unit unlock bits affects the content version');
  assert.equal(dakota07CampaignWaves.length, 8);
});

test('Frost Station profile snapshot derives the same content as the explicit snapshot factory', () => {
  const completed = completedScenarioIdsForMississippiUnitUnlockSnapshot({
    grandpa: true,
    sniper: true,
    pyromaniac: true,
    salesman: true,
  });
  const snapshot = snapshotForMask(15);

  assert.deepEqual(dakota07CampaignUnlockSnapshotFor(completed), snapshot);
  assert.deepEqual(createDakota07CampaignContent(completed), createDakota07CampaignContentFromSnapshot(snapshot));
});

test('Frost Station content version parser rejects missing, malformed, noncanonical, and cross-level versions', () => {
  assert.equal(parseDakota07ReplayContentVersion(undefined), undefined);
  for (const version of [
    'unknown-version',
    'gng-free-1.8.6-dakota-07-formal-v1',
    'gng-free-1.8.6-dakota-07-formal-v1-grandpa2-sniper0-pyro0-salesman0',
    'gng-free-1.8.6-dakota-06-formal-v1-grandpa0-sniper0-pyro0-salesman0',
    'gng-free-1.8.6-dakota-07-formal-v1-grandpa0-sniper0-pyro0-salesman0-extra',
  ]) {
    assert.equal(parseDakota07ReplayContentVersion(version), undefined, version);
  }
});

test('Frost Station content opens a formal-capable GameSession with the selected unlock snapshot', async () => {
  const completed = ['campaign-mississippi-10', 'campaign-dakota-10'];
  const content = createDakota07CampaignContent(completed);
  const game = createGame({ scenarios: { [content.id]: content } });
  const session = await game.open({
    scenarioId: content.id,
    contentVersion: content.contentVersion,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 37_037,
  });

  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, content.contentVersion);
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.cash, 350);
    assert.equal(view.wave?.lives, 25);
    assert.equal(new Set(view.units.map(({ id }) => id)).size, view.units.length);
  } finally {
    session.close();
  }
});
