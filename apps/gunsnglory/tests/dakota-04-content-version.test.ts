import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  createBrowserGame,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import {
  createDakota04CampaignContent,
  createDakota04CampaignContentFromSnapshot,
} from '../src/content/dakota-04-campaign';
import {
  dakota04CampaignContentVersionForSnapshot,
  dakota04CampaignUnlockSnapshotFor,
  parseDakota04ReplayContentVersion,
  type Dakota04CampaignUnlockSnapshot,
} from '../src/content/dakota-04-content-version';
import { dakota04CampaignCopy } from '../src/content/dakota-04-campaign-copy';
import { dakota04CampaignId } from '../src/content/dakota-04-identity';
import { dakota04CampaignPortraitAssets } from '../src/content/dakota-04-wave-intros';
import { collectScenarioImageAssetNames } from '../src/content/scenario-image-assets';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const unlockScenarioIds = [
  'campaign-oregon-10',
  'campaign-dakota-10',
  'campaign-nevada-10',
  'campaign-alaska-10',
] as const;

function snapshotForMask(mask: number): Dakota04CampaignUnlockSnapshot {
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

function completedForMask(mask: number): string[] {
  return unlockScenarioIds.flatMap((scenarioId, bit) => (mask & (1 << bit)) ? [scenarioId] : []);
}

function expectedVersion(snapshot: Dakota04CampaignUnlockSnapshot): string {
  const { unitUnlocks } = snapshot;
  return `gng-free-1.8.6-dakota-04-formal-v1-grandpa${Number(unitUnlocks.grandpa)}`
    + `-sniper${Number(unitUnlocks.sniper)}-pyro${Number(unitUnlocks.pyromaniac)}`
    + `-salesman${Number(unitUnlocks.salesman)}-dynamite${Number(snapshot.dynamiteUnlocked)}`;
}

function hireCounts(content: { units: readonly { type: string; activity?: number }[] }) {
  return {
    gunslinger: content.units.filter(({ type, activity }) => type === 'gunslinger' && activity === 4).length,
    mexican: content.units.filter(({ type, activity }) => type === 'mexican' && activity === 4).length,
    cannon: content.units.filter(({ type, activity }) => type === 'cannon' && activity === 4).length,
    indian: content.units.filter(({ type, activity }) => type === 'indian' && activity === 4).length,
    sniper: content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
    grandpa: content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
    pyromaniac: content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
    salesman: content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
  };
}

function expectedHireCounts(snapshot: Dakota04CampaignUnlockSnapshot) {
  return {
    gunslinger: 13,
    mexican: 21,
    cannon: 15,
    indian: 5,
    sniper: Number(snapshot.unitUnlocks.sniper),
    grandpa: snapshot.unitUnlocks.grandpa ? 5 : 0,
    pyromaniac: Number(snapshot.unitUnlocks.pyromaniac),
    salesman: Number(snapshot.unitUnlocks.salesman),
  };
}

test('Badlands builder restores all 32 canonical unit and Dynamite snapshots', () => {
  const versions = new Set<string>();

  for (let mask = 0; mask < 32; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const content = createDakota04CampaignContentFromSnapshot(snapshot);
    const version = dakota04CampaignContentVersionForSnapshot(snapshot);
    const parsed = parseDakota04ReplayContentVersion(version);

    assert.equal(content.id, dakota04CampaignId);
    assert.equal(content.contentVersion, expectedVersion(snapshot));
    assert.deepEqual(parsed?.snapshot, snapshot);
    assert.equal(content.formalSettlementSupported, true);
    assert.deepEqual(content.title, dakota04CampaignCopy.title);
    assert.equal(content.map.width, 32);
    assert.equal(content.map.height, 24);
    assert.deepEqual(hireCounts(content), expectedHireCounts(snapshot));
    assert.equal(content.units.filter(({ movementGroupId }) => movementGroupId?.startsWith('dakota-04-train-')).length, 4);
    assert.equal(content.dynamite?.unlocked, snapshot.dynamiteUnlocked);
    assert.equal(content.dynamite?.pairs.length, 1);
    assert.equal(content.maxUpgrades, 3);
    assert.equal(content.campaignWaveCount, 9);
    assert.equal(content.campaignWaves?.length, 9);
    assert.equal(content.campaignUnitPool, undefined);
    versions.add(version);
  }

  assert.equal(versions.size, 32, 'the independent unit and Dynamite flags each affect the version');
});

test('Badlands profile builder derives unit and Dynamite unlocks from their own campaign milestones', () => {
  const cases = [
    { completed: [], expected: snapshotForMask(0) },
    { completed: ['campaign-mississippi-10'], expected: snapshotForMask(16) },
    { completed: ['campaign-oregon-10'], expected: snapshotForMask(17) },
    {
      completed: [...unlockScenarioIds, 'campaign-mississippi-10'],
      expected: snapshotForMask(31),
    },
  ] as const;

  for (const { completed, expected } of cases) {
    assert.deepEqual(dakota04CampaignUnlockSnapshotFor(completed), expected);
    assert.equal(createDakota04CampaignContent(completed).contentVersion,
      dakota04CampaignContentVersionForSnapshot(expected));
  }
});

test('Badlands browser registry opens the profile-specific scene and content version', async () => {
  const completedScenarioIds = ['campaign-mississippi-10', 'campaign-nevada-10'];
  const content = createDakota04CampaignContent(completedScenarioIds);
  const version = getBrowserScenarioContentVersion(dakota04CampaignId, completedScenarioIds);

  assert.equal(version, content.contentVersion);
  const session = await createBrowserGame(completedScenarioIds).open({
    scenarioId: dakota04CampaignId,
    contentVersion: version,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 34_040,
  });
  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, content.contentVersion);
    assert.equal(view.wave?.totalWaves, 9);
    assert.ok(view.dynamites?.length === 1 && view.dynamites[0]?.unlocked);
    assert.deepEqual(hireCounts(view), expectedHireCounts(dakota04CampaignUnlockSnapshotFor(completedScenarioIds)));
  } finally {
    session.close();
  }
});

test('Badlands scenario and dialogue images resolve to bundled files and are included in startup preload', () => {
  const allUnlocks = [...unlockScenarioIds, 'campaign-mississippi-10'];
  const content = createDakota04CampaignContent(allUnlocks);
  const imageAssets = collectScenarioImageAssetNames([content]);
  const hasPublicAsset = (assetName: string) => existsSync(`${appRoot}/public/assets/${gameAssetRelativePath(assetName)}`);

  assert.ok(imageAssets.includes('lok_verti_1of2'), 'train images are collected from scenario units');
  assert.ok(imageAssets.includes('b_1x1_watertower'), 'static map decorations are collected');
  assert.deepEqual(imageAssets, [...new Set(imageAssets)], 'startup scenario image names are unique');
  for (const asset of [...imageAssets, ...dakota04CampaignPortraitAssets]) {
    assert.ok(hasPublicAsset(asset), `${asset} resolves through the game's asset mapping`);
  }

  const mainSource = readFileSync(`${appRoot}/src/main.ts`, 'utf8');
  assert.ok(mainSource.includes('...dakota04CampaignPortraitAssets'), 'all wave portraits are preloaded');
  assert.ok(mainSource.includes("createDakota04CampaignContent([...allMississippiUnitUnlocks, 'campaign-mississippi-10'])"),
    'map, train, and unlock-dependent unit images are included in startup preload');
});

test('Badlands content parser rejects missing, unknown, malformed, and noncanonical versions', () => {
  assert.equal(parseDakota04ReplayContentVersion(undefined), undefined);
  assert.equal(parseDakota04ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseDakota04ReplayContentVersion('gng-free-1.8.6-dakota-04-formal-v1'), undefined);
  assert.equal(parseDakota04ReplayContentVersion(
    'gng-free-1.8.6-dakota-04-formal-v1-grandpa2-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseDakota04ReplayContentVersion(
    'gng-free-1.8.6-dakota-03-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseDakota04ReplayContentVersion(
    'gng-free-1.8.6-dakota-04-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite2',
  ), undefined);
  assert.equal(parseDakota04ReplayContentVersion(
    'gng-free-1.8.6-dakota-04-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0-extra',
  ), undefined);
});
