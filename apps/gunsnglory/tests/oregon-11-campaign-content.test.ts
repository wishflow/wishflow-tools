import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import {
  createOregon11CampaignContent,
  createOregon11CampaignContentFromSnapshot,
} from '../src/content/oregon-11-campaign';
import {
  oregon11CampaignContentVersionForSnapshot,
  oregon11CampaignUnlockSnapshotFor,
  parseOregon11ReplayContentVersion,
  type Oregon11CampaignUnlockSnapshot,
} from '../src/content/oregon-11-content-version';
import { oregon11CampaignId } from '../src/content/oregon-11-identity';
import { oregon11CampaignCopy, oregon11CampaignCopyResources } from '../src/content/oregon-11-campaign-copy';
import { oregon11CampaignPortraitAssets, oregon11WaveIntros } from '../src/content/oregon-11-wave-intros';
import {
  oregon11AmbientMusic,
  oregon11BattleMusicForWave,
  oregon11BattleMusicLoops,
} from '../src/content/oregon-11-music';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import map from '../src/content/oregon-11.json';

function snapshotForMask(mask: number): Oregon11CampaignUnlockSnapshot {
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

function expectedHires(snapshot: Oregon11CampaignUnlockSnapshot) {
  return {
    gunslinger: 15,
    mexican: 12,
    cannon: 3,
    sniper: 1,
    grandpa: 3,
    pyromaniac: Number(snapshot.unitUnlocks.pyromaniac),
    salesman: Number(snapshot.unitUnlocks.salesman),
  };
}

test('Loot Lakes builder reproduces fixed level-31 hires and all profile-dependent content snapshots', () => {
  const versions = new Set<string>();

  for (let mask = 0; mask < 32; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const content = createOregon11CampaignContentFromSnapshot(snapshot);
    const version = oregon11CampaignContentVersionForSnapshot(snapshot);

    assert.equal(content.id, oregon11CampaignId);
    assert.equal(content.contentVersion, version);
    assert.deepEqual(parseOregon11ReplayContentVersion(version)?.snapshot, snapshot);
    assert.equal(content.formalSettlementSupported, true);
    assert.deepEqual(content.title, oregon11CampaignCopy.title);
    assert.deepEqual(Object.fromEntries(Object.keys(expectedHires(snapshot)).map((type) => [
      type,
      content.units.filter(({ activity, type: actualType }) => activity === 4 && actualType === type).length,
    ])), expectedHires(snapshot));
    assert.equal(content.units.filter(({ activity, type }) => activity === 5 && type === 'gambler').length,
      Number(snapshot.unitUnlocks.pyromaniac));
    assert.equal(content.map.decorations?.filter(({ asset }) => asset === 'b_3x2_casino').length,
      Number(snapshot.unitUnlocks.pyromaniac));
    assert.equal(content.gambler !== undefined, snapshot.unitUnlocks.pyromaniac);
    assert.equal(content.maxUpgrades, 3);
    assert.equal(content.campaignWaveCount, 9);
    assert.equal(content.campaignWaves?.length, 9);
    assert.equal(content.campaignUnitPool?.units.length, 2);
    assert.equal(content.campaignUnitPool?.spawnLocations.length, 1);
    assert.equal(content.dynamite?.pairs.length, 2);
    assert.equal(content.dynamite?.unlocked, snapshot.dynamiteUnlocked);
    assert.deepEqual(content.originalTileGrid, map.originalTileGrid);
    versions.add(version);
  }

  assert.equal(versions.size, 32);
});

test('Loot Lakes profile snapshot and parser reject non-canonical replay versions', () => {
  const expected = snapshotForMask(0b1_1010);
  const completedScenarioIds = [
    ...completedScenarioIdsForMississippiUnitUnlockSnapshot(expected.unitUnlocks),
    ...(expected.dynamiteUnlocked ? ['campaign-mississippi-10'] : []),
  ];
  assert.deepEqual(oregon11CampaignUnlockSnapshotFor(completedScenarioIds), expected);
  const content = createOregon11CampaignContent(completedScenarioIds);
  assert.equal(content.contentVersion, oregon11CampaignContentVersionForSnapshot(expected));
  assert.deepEqual(parseOregon11ReplayContentVersion(content.contentVersion)?.snapshot, expected);
  assert.equal(parseOregon11ReplayContentVersion(undefined), undefined);
  assert.equal(parseOregon11ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseOregon11ReplayContentVersion(
    'gng-free-1.8.6-oregon-10-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseOregon11ReplayContentVersion(`${content.contentVersion}-extra`), undefined);
});

test('Loot Lakes copy and all wave portraits use the APK identity and bundled images', async () => {
  assert.deepEqual(oregon11CampaignCopyResources, { title: 'T_LEVEL_NAME_34', overview: 'T_LEVEL_INFO_34' });
  assert.equal(oregon11CampaignCopy.title.en, 'Loot Lakes');
  assert.equal(oregon11CampaignCopy.overview.en,
    'Lots of gold diggers already got rich in the deep valley of Loot Lakes!');
  assert.deepEqual(oregon11WaveIntros.map(({ waveNumber, dialogueResource }) => [waveNumber, dialogueResource]),
    Array.from({ length: 9 }, (_, index) => [index + 1, `T_CAMPAIGN_31_${String(index + 1).padStart(2, '0')}`]));
  assert.deepEqual(oregon11CampaignPortraitAssets, [
    'oregon_dakota_portrait_calamity',
    'portrait_gunslinger',
    'portrait_mexican',
    'portrait_pedro',
    'oregon_dakota_portrait_geezer',
    'oregon_dakota_portrait_boss',
  ]);
  for (const asset of oregon11CampaignPortraitAssets) {
    await access(join(import.meta.dirname, '../public/assets', `${asset}.png`));
  }
});

test('Loot Lakes battle music follows the Dakota wave rotation and bundled tracks', async () => {
  assert.equal(oregon11AmbientMusic, 'music_atmo_snow');
  assert.deepEqual(oregon11BattleMusicLoops, ['music_dakota', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 9 }, (_, wave) => oregon11BattleMusicForWave(wave)), [
    'music_dakota', 'music_loop2', 'music_loop3',
    'music_dakota', 'music_loop2', 'music_loop3',
    'music_dakota', 'music_loop2', 'music_loop3',
  ]);
  for (const asset of [oregon11AmbientMusic, ...oregon11BattleMusicLoops]) {
    await access(join(import.meta.dirname, '../public/assets/music', `${asset}.ogg`));
  }
  assert.throws(() => oregon11BattleMusicForWave(-1), RangeError);
  assert.throws(() => oregon11BattleMusicForWave(1.5), RangeError);
});
