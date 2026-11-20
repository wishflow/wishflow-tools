import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-06.json';
import {
  createDakota06CampaignContent,
  createDakota06CampaignContentFromSnapshot,
} from '../src/content/dakota-06-campaign';
import {
  dakota06CampaignContentVersionForSnapshot,
  type Dakota06CampaignUnlockSnapshot,
} from '../src/content/dakota-06-content-version';
import { dakota06CampaignCopy } from '../src/content/dakota-06-campaign-copy';
import { dakota06CampaignId } from '../src/content/dakota-06-identity';
import { dakota06CampaignSpawnRequestCount, dakota06CampaignWaves } from '../src/content/dakota-06-campaign-waves';
import { createGame } from '../src/game';

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

test('Ice Rocks content factory composes the audited map, gated units, Dynamite, waves and player pools', () => {
  const versions = new Set<string>();

  for (let mask = 0; mask < 32; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const content = createDakota06CampaignContentFromSnapshot(snapshot);
    const expectedUnits = 43 + Number(snapshot.unitUnlocks.sniper)
      + (snapshot.unitUnlocks.grandpa ? 6 : 0)
      + Number(snapshot.unitUnlocks.pyromaniac)
      + Number(snapshot.unitUnlocks.salesman);

    assert.equal(content.id, dakota06CampaignId);
    assert.equal(content.contentVersion, dakota06CampaignContentVersionForSnapshot(snapshot));
    assert.equal(content.formalSettlementSupported, true);
    assert.deepEqual(content.title, dakota06CampaignCopy.title);
    assert.equal(content.map.width, 32);
    assert.equal(content.map.height, 24);
    assert.equal(content.originalTileGrid, map.originalTileGrid);
    assert.equal(content.units.length, expectedUnits);
    assert.equal(new Set(content.units.map(({ id }) => id)).size, content.units.length,
      'all initial map unit IDs are unique');
    assert.equal(content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
      Number(snapshot.unitUnlocks.sniper));
    assert.equal(content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
      snapshot.unitUnlocks.grandpa ? 6 : 0);
    assert.equal(content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
      Number(snapshot.unitUnlocks.pyromaniac));
    assert.equal(content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
      Number(snapshot.unitUnlocks.salesman));
    assert.equal(content.units.filter(({ type, activity }) => type === 'gunslinger' && activity === 5).length, 2);
    assert.equal(content.units.filter(({ type, activity }) => type === 'mexican' && activity === 5).length, 2);
    assert.deepEqual(content.dynamite, {
      unlocked: snapshot.dynamiteUnlocked,
      pairs: [{ id: 'dynamite-1', triggerCell: { x: 7, y: 17 }, boxCell: { x: 6, y: 18 } }],
    });
    assert.equal(content.maxUpgrades, 3);
    assert.equal(content.campaignWaveCount, 9);
    assert.equal(content.campaignWaves?.length, 9);
    assert.equal(dakota06CampaignSpawnRequestCount, 16);
    assert.equal(content.campaignUnitPool?.units.length, 4);
    assert.deepEqual(content.campaignUnitPool?.spawnLocations.map(({ id }) => id), ['saloon', 'fort', 'tipi']);
    assert.equal(content.campaignBonusCratePool?.simultaneousLimit, 15);
    versions.add(content.contentVersion!);
  }

  assert.equal(versions.size, 32, 'all four unit unlock bits and the Dynamite bit affect the content version');
  assert.equal(dakota06CampaignWaves.length, 9);
});

test('Ice Rocks profile builder derives the same version and initial objects as its explicit snapshot factory', () => {
  const completed = [
    'campaign-mississippi-10',
    'campaign-oregon-10',
    'campaign-dakota-10',
    'campaign-nevada-10',
    'campaign-alaska-10',
  ];
  const snapshot = snapshotForMask(31);

  assert.deepEqual(createDakota06CampaignContent(completed), createDakota06CampaignContentFromSnapshot(snapshot));
});

test('Ice Rocks scene opens as a free campaign GameSession with nine waves and the supplied snapshot', async () => {
  const completed = ['campaign-mississippi-10', 'campaign-dakota-10'];
  const content = createDakota06CampaignContent(completed);
  const game = createGame({ scenarios: { [content.id]: content } });
  const session = await game.open({
    scenarioId: content.id,
    contentVersion: content.contentVersion,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 36_036,
  });

  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, content.contentVersion);
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 9);
    assert.equal(view.wave?.cash, 200);
    assert.equal(view.wave?.lives, 25);
    assert.deepEqual(view.dynamites?.map(({ unlocked }) => unlocked), [true]);
    assert.equal(new Set(view.units.map(({ id }) => id)).size, view.units.length);
  } finally {
    session.close();
  }
});
