import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createMississippi15CampaignContent } from '../src/content/mississippi-15-campaign';
import { mississippi15CampaignCopy } from '../src/content/mississippi-15-campaign-copy';
import {
  mississippi15CampaignContentVersionFor,
  mississippi15CompletedScenarioIdsForContentVersion,
} from '../src/content/mississippi-15-content-version';
import { mississippi15CampaignId } from '../src/content/mississippi-15-identity';
import map from '../src/content/mississippi-15.json';
import { mississippi15WaveIntros } from '../src/content/mississippi-15-wave-intros';
import { collectScenarioImageAssetNames } from '../src/content/scenario-image-assets';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Railroad Canyon copy preserves APK English and supplies complete Chinese text', () => {
  assert.deepEqual(mississippi15CampaignCopy, {
    title: { en: 'Railroad Canyon', zh: '铁路峡谷' },
    overview: {
      en: 'The huge railroad station in Railroad Canyon is almost complete, and very soon trains will be able to travel from there to the whole of the West!',
      zh: '铁路峡谷里宏大的火车站即将完工，很快列车就能从这里驶向整个西部！',
    },
    victoryTitle: { en: 'The Terror of Railroad Canyon', zh: '铁路峡谷的噩梦' },
  });

  assert.deepEqual(mississippi15WaveIntros.map(({ dialogueResource }) => dialogueResource), [
    'T_CAMPAIGN_15_01', 'T_CAMPAIGN_15_02', 'T_CAMPAIGN_15_03', 'T_CAMPAIGN_15_04',
    'T_CAMPAIGN_15_05', 'T_CAMPAIGN_15_06', 'T_CAMPAIGN_15_07', 'T_CAMPAIGN_15_08', 'T_CAMPAIGN_15_09',
  ]);
  assert.deepEqual(mississippi15WaveIntros.map(({ text }) => text.en), [
    "Didn't you say that we could take the train from here?",
    "Take the train? Sure, we could, but it's been delayed... they're still building the track!",
    'All aboard! The train has just arrived in the happy hunting grounds!',
    "Boss, I don't think even they know where to go!",
    'I smell new victims!',
    "I don't think it's the victims you can smell...",
    "I'll use your gold to extend the railroad track! Home to me!",
    "What the... now they're coming from the north, too! We have to hurry!",
    "Dammit! We're in a tight spot!",
  ]);
  assert.deepEqual(mississippi15WaveIntros.map(({ speaker }) => speaker.en), [
    'Settlers', 'Settlers', 'Engineer', 'Mexican', 'Pedro', 'Gunslinger', 'Engineer', 'Gunslinger', 'Pedro',
  ]);
  assert.ok(mississippi15WaveIntros.every(({ speaker, text }) => speaker.zh.length > 0 && text.zh.length > 0));
});

test('Railroad Canyon creates all fresh map hires plus the global unlock snapshot', () => {
  const locked = createMississippi15CampaignContent([]);
  assert.equal(locked.id, mississippi15CampaignId);
  assert.equal(locked.formalSettlementSupported, true);
  assert.equal(locked.contentVersion, mississippi15CampaignContentVersionFor([]));
  assert.equal(locked.map.width, 32);
  assert.equal(locked.map.height, 24);
  assert.ok(!locked.units.some(({ type }) => type === 'pyromaniac' || type === 'salesman'));
  assert.equal(locked.units.filter(({ type, activity }) => type === 'gunslinger' && activity === 5).length, 1);
  assert.equal(locked.units.filter(({ type, activity }) => type === 'mexican' && activity === 5).length, 1);
  assert.equal(locked.units.filter(({ activity, type }) => activity === 4
    && ['gunslinger', 'mexican', 'cannon', 'indian'].includes(type)).length,
  map.originalTileGrid.flat().filter((code) => code >= 96 && code <= 99).length);
  assert.ok(!locked.units.some(({ type }) => type === 'cannon'), 'spawn-pool inventory is not a placed map Cannon');

  const unlocked = createMississippi15CampaignContent(['campaign-nevada-10', 'campaign-alaska-10']);
  assert.deepEqual(unlocked.units.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
    .map(({ type }) => type), ['salesman', 'pyromaniac']);
  assert.equal(unlocked.contentVersion, 'gng-free-1.8.6-mississippi-15-formal-v2-grandpa0-sniper0-pyro1-salesman1');
  assert.deepEqual(mississippi15CompletedScenarioIdsForContentVersion(unlocked.contentVersion!), [
    'campaign-nevada-10', 'campaign-alaska-10',
  ]);
  assert.equal(mississippi15CompletedScenarioIdsForContentVersion('unrecognized'), undefined);
});

test('Railroad Canyon scene and dialogue image/voice resources are available offline', () => {
  const content = createMississippi15CampaignContent(['campaign-nevada-10', 'campaign-alaska-10']);
  const imageAssets = collectScenarioImageAssetNames([content]);
  for (const asset of imageAssets) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `${asset} exists`);
  }
  for (const portrait of new Set(mississippi15WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const png = readFileSync(path.join(appRoot, 'public/assets', `${portrait}.png`));
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
  }
  for (const voice of new Set(mississippi15WaveIntros.flatMap(({ voiceSound }) => voiceSound ? [voiceSound] : []))) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets/sounds', `${voice}.ogg`)), true, `${voice} exists`);
  }
});
