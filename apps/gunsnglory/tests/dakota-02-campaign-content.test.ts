import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { createDakota02CampaignContent, createDakota02CampaignContentFromSnapshot } from '../src/content/dakota-02-campaign';
import { dakota02CampaignCopy, dakota02CampaignCopyResources } from '../src/content/dakota-02-campaign-copy';
import {
  dakota02CampaignContentVersionForSnapshot,
  dakota02CampaignUnlockSnapshotFor,
  parseDakota02ReplayContentVersion,
  type Dakota02CampaignUnlockSnapshot,
} from '../src/content/dakota-02-content-version';
import { dakota02CampaignId } from '../src/content/dakota-02-identity';
import {
  dakota02AmbientMusic,
  dakota02BattleMusicForWave,
  dakota02BattleMusicLoops,
} from '../src/content/dakota-02-music';
import { dakota02CampaignPortraitAssets, dakota02WaveIntros } from '../src/content/dakota-02-wave-intros';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import map from '../src/content/dakota-02.json';

function snapshotForMask(mask: number): Dakota02CampaignUnlockSnapshot {
  return {
    unitUnlocks: {
      grandpa: Boolean(mask & 1),
      sniper: Boolean(mask & 2),
      pyromaniac: Boolean(mask & 4),
      salesman: Boolean(mask & 8),
    },
  };
}

function expectedHires(snapshot: Dakota02CampaignUnlockSnapshot) {
  return {
    gunslinger: 14,
    mexican: 11,
    cannon: 8,
    indian: 6,
    sniper: Number(snapshot.unitUnlocks.sniper),
    grandpa: snapshot.unitUnlocks.grandpa ? 6 : 0,
    pyromaniac: Number(snapshot.unitUnlocks.pyromaniac),
    salesman: Number(snapshot.unitUnlocks.salesman),
  };
}

test('Six Grandfathers builder and replay parser preserve all four global hire unlocks', () => {
  const versions = new Set<string>();

  for (let mask = 0; mask < 16; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const content = createDakota02CampaignContentFromSnapshot(snapshot);
    const version = dakota02CampaignContentVersionForSnapshot(snapshot);
    const hires = expectedHires(snapshot);

    assert.equal(content.id, dakota02CampaignId);
    assert.equal(content.contentVersion, version);
    assert.deepEqual(parseDakota02ReplayContentVersion(version)?.snapshot, snapshot);
    assert.equal(content.formalSettlementSupported, true);
    assert.deepEqual(content.title, dakota02CampaignCopy.title);
    assert.deepEqual(Object.fromEntries(Object.keys(hires).map((type) => [
      type,
      content.units.filter(({ activity, type: actualType }) => activity === 4 && actualType === type).length,
    ])), hires);
    assert.equal(content.campaignWaveCount, 8);
    assert.equal(content.campaignWaves?.length, 8);
    assert.equal(content.campaignUnitPool?.units.length, 3);
    assert.equal(content.campaignUnitPool?.spawnLocations.length, 2);
    assert.equal(content.dynamite, undefined, 'the TDM has no Dynamite trigger or box markers');
    assert.equal(content.gambler, undefined, 'the TDM has no Gambler/Casino markers');
    assert.deepEqual(content.originalTileGrid, map.originalTileGrid);
    versions.add(version);
  }

  assert.equal(versions.size, 16);
});

test('Six Grandfathers profile snapshot uses the shared unlock source and rejects malformed versions', () => {
  const expected = snapshotForMask(0b1_1010);
  const completed = completedScenarioIdsForMississippiUnitUnlockSnapshot(expected.unitUnlocks);
  assert.deepEqual(dakota02CampaignUnlockSnapshotFor(completed), expected);
  assert.equal(createDakota02CampaignContent(completed).contentVersion,
    dakota02CampaignContentVersionForSnapshot(expected));
  assert.equal(parseDakota02ReplayContentVersion(undefined), undefined);
  assert.equal(parseDakota02ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseDakota02ReplayContentVersion(
    'gng-free-1.8.6-dakota-01-formal-v1-grandpa0-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseDakota02ReplayContentVersion(
    `${dakota02CampaignContentVersionForSnapshot(expected)}-extra`,
  ), undefined);
});

test('Six Grandfathers title, English dialogue, portrait resources, and music match APK resources', async () => {
  assert.deepEqual(dakota02CampaignCopyResources, { title: 'T_LEVEL_NAME_35', overview: 'T_LEVEL_INFO_35' });
  assert.equal(dakota02CampaignCopy.title.en, 'Six Grandfathers');
  assert.equal(dakota02CampaignCopy.overview.en,
    'The famous rock formations of the Six Grandfathers attract many travelers every year.');
  assert.deepEqual(dakota02WaveIntros.map(({ waveNumber, dialogueResource }) => [waveNumber, dialogueResource]),
    Array.from({ length: 8 }, (_, index) => [index + 1, `T_CAMPAIGN_32_${String(index + 1).padStart(2, '0')}`]));
  assert.deepEqual(dakota02WaveIntros.map(({ text }) => text.en), [
    'Our ancestors called this mountain Six Grandfathers. From a distance, its shape looks like a collection of giant heads!',
    "You're right, the mountain is staring at me!",
    'With enough dynamite, I could sculpt this rock so that it shows our own faces!',
    'Nobody wants to see your face!',
    'Men and their vanity! You better save up your dynamite for those settlers!',
    'I see dark shadows in the north! Gotta be a cloudburst!',
    "Pa, I told you thousand times: take your glasses along when you're hunting settlers!",
    "Hahaha! Seedy bunch of bandits! You can't harm me when I have this bullet- and dynamite-proof vest!",
  ]);
  assert.deepEqual(dakota02CampaignPortraitAssets, [
    'portrait_indian', 'portrait_gunslinger', 'portrait_mexican', 'portrait_pedro',
    'oregon_dakota_portrait_calamity', 'oregon_dakota_portrait_geezer', 'oregon_dakota_portrait_boss',
  ]);
  for (const asset of dakota02CampaignPortraitAssets) {
    await access(join(import.meta.dirname, '../public/assets', `${asset}.png`));
  }

  assert.equal(dakota02AmbientMusic, 'music_atmo_snow');
  assert.deepEqual(dakota02BattleMusicLoops, ['music_dakota', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 8 }, (_, wave) => dakota02BattleMusicForWave(wave)), [
    'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota',
    'music_loop2', 'music_loop3', 'music_dakota', 'music_loop2',
  ]);
  for (const asset of [dakota02AmbientMusic, ...dakota02BattleMusicLoops]) {
    await access(join(import.meta.dirname, '../public/assets/music', `${asset}.ogg`));
  }
  assert.throws(() => dakota02BattleMusicForWave(-1), RangeError);
  assert.throws(() => dakota02BattleMusicForWave(1.5), RangeError);
});
