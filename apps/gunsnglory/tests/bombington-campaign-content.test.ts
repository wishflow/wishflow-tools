import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bombingtonCampaignContentVersionForCompletedScenarioIds,
  bombingtonCampaignContentVersionFromSnapshot,
  bombingtonCompletedScenarioIdsFromContentVersion,
  bombingtonUnlockSnapshotFor,
  bombingtonUnlockSnapshotFromContentVersion,
  type BombingtonUnlockSnapshot,
} from '../src/content/bombington-content-version';
import { createBombingtonCampaignContent, createBombingtonCampaignContentFromSnapshot } from '../src/content/bombington-campaign';
import { nevada02CampaignId } from '../src/content/nevada-02-identity';
import { bombingtonCampaignCopy } from '../src/content/bombington-campaign-copy';
import { campaignCatalog } from '../src/content/campaign-catalog';

function scenarioIdForLevel(level: number): string {
  const entry = campaignCatalog.find((candidate) => candidate.level === level);
  assert.ok(entry, `campaign level ${level} is in the catalog`);
  return `campaign-${entry.regionId}-${String(((level - 1) % 10) + 1).padStart(2, '0')}`;
}

function snapshot(
  grandpa: boolean,
  sniper: boolean,
  pyromaniac: boolean,
  salesman: boolean,
  dynamiteUnlocked: boolean,
): BombingtonUnlockSnapshot {
  return { grandpa, sniper, pyromaniac, salesman, dynamiteUnlocked };
}

test('Bombington scenario assembles the APK map, units, trains, rules and start resources', () => {
  const content = createBombingtonCampaignContent([]);
  assert.equal(content.id, nevada02CampaignId);
  assert.equal(content.formalSettlementSupported, true);
  assert.deepEqual(content.title, bombingtonCampaignCopy.title);
  assert.equal(content.contentVersion, bombingtonCampaignContentVersionForCompletedScenarioIds([]));
  assert.equal(content.map.width, 32);
  assert.equal(content.map.height, 24);
  assert.equal(content.originalTileGrid?.length, 24);
  assert.equal(content.units.length, 19, '15 map units and four train entities are present');
  assert.equal(content.campaignWaveCount, 10);
  assert.equal(content.campaignWaves?.length, 10);
  assert.equal(content.campaignUnitPool?.spawnLocations.length, 3);
  assert.equal(content.campaignUnitPool?.actions.length, 2);
  assert.equal(content.campaignBonusCratePool?.rewardTypeCount, 7);
  assert.equal(content.maxUpgrades, 3);
  assert.equal(content.dynamite?.pairs.length, 9);
  assert.equal(content.dynamite?.unlocked, false);
});

test('Bombington scenario derives map hires and Dynamite from the supplied campaign snapshot', () => {
  const level20 = scenarioIdForLevel(20);
  const level30 = scenarioIdForLevel(30);
  const level40 = scenarioIdForLevel(40);
  const level50 = scenarioIdForLevel(50);
  const level60 = scenarioIdForLevel(60);
  const dynamiteOnly = createBombingtonCampaignContent([level20]);
  assert.equal(dynamiteOnly.dynamite?.unlocked, true);
  assert.equal(dynamiteOnly.units.some(({ type }) => type === 'grandpa'), false);
  assert.equal(dynamiteOnly.units.some(({ type }) => type === 'sniper'), false);

  const allMilestones = createBombingtonCampaignContent([level20, level30, level40, level50, level60]);
  assert.equal(allMilestones.units.length, 28);
  assert.deepEqual(
    allMilestones.units.reduce<Record<string, number>>((counts, unit) => {
      counts[unit.type] = (counts[unit.type] ?? 0) + 1;
      return counts;
    }, {}),
    {
      pyromaniac: 5,
      grandpa: 2,
      mexican: 4,
      indian: 4,
      gunslinger: 3,
      salesman: 1,
      cannon: 4,
      sniper: 1,
      'train-10': 1,
      'train-11': 1,
      'train-12': 2,
    },
  );
  assert.equal(allMilestones.dynamite?.unlocked, true);

  const forcedSnapshot = snapshot(false, false, true, true, false);
  const forcedContent = createBombingtonCampaignContentFromSnapshot(forcedSnapshot);
  assert.equal(forcedContent.units.filter(({ type }) => type === 'pyromaniac').length, 5);
  assert.equal(forcedContent.units.filter(({ type }) => type === 'salesman').length, 1);
  assert.equal(forcedContent.dynamite?.unlocked, false);
});

test('Bombington replay identity encodes every canonical unlock snapshot and rejects impossible versions', () => {
  const versions = new Set<string>();
  for (const grandpa of [false, true]) {
    for (const sniper of [false, true]) {
      for (const pyromaniac of [false, true]) {
        for (const salesman of [false, true]) {
          for (const dynamiteUnlocked of grandpa ? [true] : [false, true]) {
            const value = snapshot(grandpa, sniper, pyromaniac, salesman, dynamiteUnlocked);
            const version = bombingtonCampaignContentVersionFromSnapshot(value);
            versions.add(version);
            assert.deepEqual(bombingtonUnlockSnapshotFromContentVersion(version), value);
            assert.deepEqual(bombingtonUnlockSnapshotFor(
              bombingtonCompletedScenarioIdsFromContentVersion(version)!,
            ), value);
          }
        }
      }
    }
  }
  assert.equal(versions.size, 24);
  assert.equal(bombingtonUnlockSnapshotFromContentVersion(
    bombingtonCampaignContentVersionFromSnapshot(snapshot(false, false, false, false, false)) + '-unknown',
  ), undefined);
  assert.equal(bombingtonUnlockSnapshotFromContentVersion(
    'gng-free-1.8.6-nevada-02-formal-v2-grandpa1-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.throws(() => bombingtonCampaignContentVersionFromSnapshot(
    snapshot(true, false, false, false, false),
  ), /dynamite/i);
  assert.equal(bombingtonCompletedScenarioIdsFromContentVersion(undefined), undefined);
  assert.equal(
    bombingtonCampaignContentVersionForCompletedScenarioIds([scenarioIdForLevel(20)]),
    bombingtonCampaignContentVersionFromSnapshot(snapshot(false, false, false, false, true)),
  );
});
