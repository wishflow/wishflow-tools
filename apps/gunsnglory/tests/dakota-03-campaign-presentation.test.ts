import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { createDakota03CampaignContent, createDakota03CampaignContentFromSnapshot } from '../src/content/dakota-03-campaign';
import { dakota03CampaignCopy, dakota03CampaignCopyResources } from '../src/content/dakota-03-campaign-copy';
import {
  dakota03CampaignContentVersionFor,
  dakota03CampaignUnlockSnapshotFor,
  parseDakota03ReplayContentVersion,
} from '../src/content/dakota-03-content-version';
import { dakota03CampaignId } from '../src/content/dakota-03-identity';
import {
  dakota03AmbientMusic,
  dakota03BattleMusicForWave,
  dakota03BattleMusicLoops,
} from '../src/content/dakota-03-music';
import { collectScenarioImageAssetNames } from '../src/content/scenario-image-assets';
import { dakota03CampaignPortraitAssets, dakota03WaveIntros } from '../src/content/dakota-03-wave-intros';

const expectedWaveContent = [
  ['T_CAMPAIGN_33_01', 'Engineer', 'portrait_engineer', 'End of the line! Fort Knockout! Please exit the train and position your forces to attack innocent settlers!'],
  ['T_CAMPAIGN_33_02', 'Indian', 'portrait_indian', 'Brothers of Dakota, the exploiters are on their way! Let us burn their heads, scalps are passé anyway!'],
  ['T_CAMPAIGN_33_03', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', 'Here come some more settlers from the east! Just you wait, you\'ll never be as old as me!'],
  ['T_CAMPAIGN_33_04', 'Oregon Calamity', 'oregon_dakota_portrait_calamity', 'Leave the men to me, you old fool! I need some for my bed! As a bedside rug!'],
  ['T_CAMPAIGN_33_05', 'Mexican', 'portrait_mexican', 'I can finally test the fireworks from my brother-in-law!'],
  ['T_CAMPAIGN_33_06', 'Pedro', 'portrait_pedro', 'Watch out that you don\'t lose all eight of your fingers!'],
  ['T_CAMPAIGN_33_07', 'Indian', 'portrait_indian', 'The palefaces take the route on the east side! Dig up the hatchet, we need more men!'],
  ['T_CAMPAIGN_33_08', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', 'That\'s a two-front war! I see settlers in the south-west and I smell some in the south-east!'],
  ['T_CAMPAIGN_33_09', 'Oregon Calamity', 'oregon_dakota_portrait_calamity', 'Come here, I have some friends for you, and every one is faster than you!'],
  ['T_CAMPAIGN_33_10', 'Oregon Boss', 'oregon_dakota_portrait_boss', 'Hurry up! Distract them, you fools! If I don\'t get home on time, my wife will kill me!'],
] as const;

const allUnlockedScenarioIds = [
  'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10', 'campaign-mississippi-10',
];

test('Fort Knockout bilingual title and overview preserve APK resource identity', () => {
  assert.equal(dakota03CampaignId, 'campaign-dakota-03');
  assert.deepEqual(dakota03CampaignCopyResources, {
    title: 'T_LEVEL_NAME_36',
    overview: 'T_LEVEL_INFO_36',
  });
  assert.deepEqual(dakota03CampaignCopy.title, { en: 'Fort Knockout', zh: '堡垒决战' });
  assert.equal(dakota03CampaignCopy.overview.en,
    'Fort Knockout invites you to a relaxing comfort weekend with its talented staff.');
  assert.ok(dakota03CampaignCopy.overview.zh.length > 0);
});

test('Fort Knockout preserves all ten APK dialogue keys, exact English strings, portraits, and order', () => {
  assert.deepEqual(dakota03WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
    waveNumber,
    dialogueResource,
    speaker.en,
    portraitAsset,
    text.en,
  ]), expectedWaveContent.map(([resource, speaker, portrait, text], index) => [
    index + 1,
    resource,
    speaker,
    portrait,
    text,
  ]));
  assert.ok(dakota03WaveIntros.every(({ text, voiceSound }) => text.zh.length > 0 && voiceSound === undefined));
  assert.deepEqual(dakota03CampaignPortraitAssets, [
    'portrait_engineer',
    'portrait_indian',
    'oregon_dakota_portrait_geezer',
    'oregon_dakota_portrait_calamity',
    'portrait_mexican',
    'portrait_pedro',
    'oregon_dakota_portrait_boss',
  ]);
});

test('Fort Knockout uses the Dakota ambient and rotating battle tracks', () => {
  assert.equal(dakota03AmbientMusic, 'music_atmo_snow');
  assert.deepEqual(dakota03BattleMusicLoops, ['music_dakota', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 10 }, (_, waveIndex) => dakota03BattleMusicForWave(waveIndex)), [
    'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota', 'music_loop2',
    'music_loop3', 'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota',
  ]);
  assert.throws(() => dakota03BattleMusicForWave(-1), RangeError);
  for (const track of [dakota03AmbientMusic, ...dakota03BattleMusicLoops]) {
    const bytes = readFileSync(fileURLToPath(new URL(`../public/assets/music/${track}.ogg`, import.meta.url)));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${track} is bundled as Ogg audio`);
  }
});

test('Fort Knockout content versions round-trip the exact unit unlock snapshot', () => {
  const initial = createDakota03CampaignContent();
  const unlocked = createDakota03CampaignContent(allUnlockedScenarioIds);
  assert.notEqual(initial.contentVersion, unlocked.contentVersion);
  assert.notDeepEqual(initial.units, unlocked.units, 'unlock state changes the TDM recruit markers');

  const parsed = parseDakota03ReplayContentVersion(unlocked.contentVersion);
  assert.deepEqual(parsed?.snapshot, dakota03CampaignUnlockSnapshotFor(allUnlockedScenarioIds));
  const restored = createDakota03CampaignContentFromSnapshot(parsed!.snapshot);
  assert.equal(restored.contentVersion, unlocked.contentVersion);
  assert.deepEqual(restored.units, unlocked.units);
  assert.deepEqual(restored.map, unlocked.map);
  assert.equal(parseDakota03ReplayContentVersion(undefined), undefined);
  assert.equal(parseDakota03ReplayContentVersion('unknown-content-v1'), undefined);
  assert.equal(parseDakota03ReplayContentVersion(`${unlocked.contentVersion}-extra`), undefined);
  assert.equal(dakota03CampaignContentVersionFor(allUnlockedScenarioIds), unlocked.contentVersion);
});

test('Fort Knockout map, unit, portrait, and map-preview resources exist and are registered for startup preload', () => {
  const content = createDakota03CampaignContent(allUnlockedScenarioIds);
  const imageAssets = collectScenarioImageAssetNames([content]);
  const hasPublicAsset = (assetPath: string) => existsSync(fileURLToPath(new URL(`../public/assets/${assetPath}`, import.meta.url)));

  assert.ok(hasPublicAsset('menu/gng_levelmap_36.png'));
  assert.deepEqual(imageAssets, [...new Set(imageAssets)], 'startup image names are unique');
  for (const asset of [...imageAssets, ...dakota03CampaignPortraitAssets]) {
    assert.ok(hasPublicAsset(gameAssetRelativePath(asset)), `${asset} resolves through the game's asset mapping`);
  }

  const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.ok(mainSource.includes('...dakota03CampaignPortraitAssets'), 'wave portraits are included in startup preload');
  assert.ok(mainSource.includes('createDakota03CampaignContent([...allMississippiUnitUnlocks, \'campaign-mississippi-10\'])'),
    'map and unlock-dependent unit images are included in startup preload');
  assert.ok(mainSource.includes('if (scenarioId === dakota03CampaignId) return dakota03WaveIntros;'),
    'the shared wave-intro consumer selects this level data');
  assert.ok(mainSource.includes('|| session.startRecord.scenarioId === dakota03CampaignId'),
    'the Dakota music session recognizes Fort Knockout');
  assert.ok(mainSource.includes('dakota03BattleMusicForWave(eventWaveNumber - 1)'),
    'the battle music consumer selects the Fort Knockout Dakota rotation');
  assert.ok(mainSource.includes('dakota03AmbientMusic'),
    'the wave-intro and settlement consumers select Fort Knockout ambient music');
});
