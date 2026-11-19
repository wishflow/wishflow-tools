import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import map from '../src/content/dakota-05.json';
import {
  createDakota05CampaignContent,
  createDakota05CampaignContentFromSnapshot,
} from '../src/content/dakota-05-campaign';
import {
  dakota05CampaignContentVersionForSnapshot,
  dakota05CampaignUnlockSnapshotFor,
  parseDakota05ReplayContentVersion,
  type Dakota05CampaignUnlockSnapshot,
} from '../src/content/dakota-05-content-version';
import { dakota05CampaignCopy } from '../src/content/dakota-05-campaign-copy';
import { dakota05CampaignId } from '../src/content/dakota-05-identity';
import { dakota05CampaignPortraitAssets } from '../src/content/dakota-05-wave-intros';
import { collectScenarioImageAssetNames } from '../src/content/scenario-image-assets';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { createGame } from '../src/game';

const unlockScenarioIds = [
  'campaign-oregon-10',
  'campaign-dakota-10',
  'campaign-nevada-10',
  'campaign-alaska-10',
] as const;

function snapshotForMask(mask: number): Dakota05CampaignUnlockSnapshot {
  return {
    unitUnlocks: {
      grandpa: Boolean(mask & 1),
      sniper: Boolean(mask & 2),
      pyromaniac: Boolean(mask & 4),
      salesman: Boolean(mask & 8),
    },
  };
}

function completedForMask(mask: number): string[] {
  return unlockScenarioIds.flatMap((scenarioId, bit) => (mask & (1 << bit) ? [scenarioId] : []));
}

function expectedVersion(snapshot: Dakota05CampaignUnlockSnapshot): string {
  const { unitUnlocks } = snapshot;
  return `gng-free-1.8.6-dakota-05-formal-v1-grandpa${Number(unitUnlocks.grandpa)}`
    + `-sniper${Number(unitUnlocks.sniper)}-pyro${Number(unitUnlocks.pyromaniac)}`
    + `-salesman${Number(unitUnlocks.salesman)}`;
}

test('Ghost Town factory combines map, route rules, units, transport, pool, rewards and waves for all unlock snapshots', () => {
  const versions = new Set<string>();

  for (let mask = 0; mask < 16; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const content = createDakota05CampaignContentFromSnapshot(snapshot);
    const version = dakota05CampaignContentVersionForSnapshot(snapshot);
    const parsed = parseDakota05ReplayContentVersion(version);
    const expectedMapUnits = 18 + Number(snapshot.unitUnlocks.sniper)
      + (snapshot.unitUnlocks.grandpa ? 3 : 0) + Number(snapshot.unitUnlocks.pyromaniac);

    assert.equal(content.id, dakota05CampaignId);
    assert.equal(content.contentVersion, expectedVersion(snapshot));
    assert.deepEqual(parsed?.snapshot, snapshot);
    assert.equal(content.formalSettlementSupported, true);
    assert.deepEqual(content.title, dakota05CampaignCopy.title);
    assert.equal(content.map.width, 32);
    assert.equal(content.map.height, 24);
    assert.equal(content.originalTileGrid, map.originalTileGrid);
    assert.equal(content.units.length, expectedMapUnits + 10, 'five train and five Steamer pieces join map hires');
    assert.equal(new Set(content.units.map(({ id }) => id)).size, content.units.length, 'all scene unit IDs are unique');
    assert.equal(content.units.filter(({ id }) => id.startsWith('dakota-05-train-')).length, 5);
    assert.equal(content.units.filter(({ id }) => id.startsWith('dakota-05-steamer-')).length, 5);
    assert.equal(content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
      Number(snapshot.unitUnlocks.sniper));
    assert.equal(content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
      snapshot.unitUnlocks.grandpa ? 3 : 0);
    assert.equal(content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
      Number(snapshot.unitUnlocks.pyromaniac));
    assert.equal(content.units.filter(({ type }) => type === 'salesman').length, 0,
      'the global Salesman unlock does not invent a missing TDM marker');
    assert.equal(content.maxUpgrades, 3);
    assert.equal(content.campaignWaveCount, 9);
    assert.equal(content.campaignWaves?.length, 9);
    assert.equal(content.campaignUnitPool?.units.length, 4);
    assert.equal(content.campaignBonusCratePool?.simultaneousLimit, 15);
    assert.ok(content.previewWave?.routes?.length === 5);
    versions.add(version);
  }

  assert.equal(versions.size, 16, 'each of the four unlock bits changes the canonical replay version');
});

test('Ghost Town profile factory derives the four shared unlock bits from their own campaign milestones', () => {
  const cases = [
    { completed: [], expected: snapshotForMask(0) },
    { completed: ['campaign-oregon-10'], expected: snapshotForMask(1) },
    { completed: ['campaign-dakota-10'], expected: snapshotForMask(2) },
    {
      completed: [...unlockScenarioIds],
      expected: snapshotForMask(15),
    },
  ] as const;

  for (const { completed, expected } of cases) {
    assert.deepEqual(dakota05CampaignUnlockSnapshotFor(completed), expected);
    assert.equal(createDakota05CampaignContent(completed).contentVersion,
      dakota05CampaignContentVersionForSnapshot(expected));
  }
});

test('Ghost Town full content opens as a campaign GameSession with a stable version and nine-wave HUD', async () => {
  const completed = ['campaign-dakota-10', 'campaign-nevada-10'];
  const content = createDakota05CampaignContent(completed);
  const game = createGame({ scenarios: { [content.id]: content } });
  const first = await game.open({
    scenarioId: content.id,
    contentVersion: content.contentVersion,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_605,
  });
  const second = await game.open({
    scenarioId: content.id,
    contentVersion: createDakota05CampaignContent(completed).contentVersion,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_605,
  });

  try {
    assert.equal(first.startRecord.contentVersion, content.contentVersion);
    assert.equal(first.observe().wave?.totalWaves, 9);
    assert.deepEqual(first.observe().units.map(({ id, type, activity }) => [id, type, activity]),
      second.observe().units.map(({ id, type, activity }) => [id, type, activity]));
  } finally {
    first.close();
    second.close();
  }
});

test('Ghost Town full scene and pool templates reference existing offline image assets', () => {
  const content = createDakota05CampaignContent(unlockScenarioIds);
  const imageAssets = collectScenarioImageAssetNames([content]);
  const hasPublicAsset = (assetName: string) => existsSync(new URL(`../public/assets/${gameAssetRelativePath(assetName)}`, import.meta.url));

  assert.ok(imageAssets.includes('lok_hori_1of2'), 'train images are collected from scenario units');
  assert.ok(imageAssets.includes('b_1x1_watertower'), 'static map decorations are collected');
  assert.ok(imageAssets.includes('player_cannon'), 'pool-only Cannon template assets are preloaded');
  assert.deepEqual(imageAssets, [...new Set(imageAssets)], 'startup scenario image names are unique');
  for (const asset of [...imageAssets, ...dakota05CampaignPortraitAssets]) {
    assert.ok(hasPublicAsset(asset), `${asset} resolves through the game asset mapping`);
  }
});

test('Ghost Town replay parser rejects unknown and noncanonical content versions', () => {
  assert.equal(parseDakota05ReplayContentVersion(undefined), undefined);
  assert.equal(parseDakota05ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseDakota05ReplayContentVersion('gng-free-1.8.6-dakota-05-formal-v1'), undefined);
  assert.equal(parseDakota05ReplayContentVersion(
    'gng-free-1.8.6-dakota-05-formal-v1-grandpa2-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseDakota05ReplayContentVersion(
    'gng-free-1.8.6-dakota-04-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseDakota05ReplayContentVersion(
    'gng-free-1.8.6-dakota-05-formal-v1-grandpa0-sniper0-pyro0-salesman0-extra',
  ), undefined);
});
