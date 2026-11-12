import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createGame } from '../src/game';
import { mississippiBaseEnemy, mississippiEnemyByType } from '../src/content/mississippi-enemy-designs';
import { mississippi13BonusCratePool, mississippi13CampaignAwesomeEnemyTypeThreshold, mississippi13EnemyByType, mississippi13MaxUpgrades, mississippi13PreviewWave } from '../src/content/mississippi-13-campaign-rules';
import { createMississippi13CampaignContent } from '../src/content/mississippi-13-campaign';
import { mississippi13CampaignWaves } from '../src/content/mississippi-13-campaign-waves';
import { mississippi13CampaignCopy } from '../src/content/mississippi-13-campaign-copy';
import { mississippi13CampaignId } from '../src/content/mississippi-13-identity';
import { mississippi13WaveIntros } from '../src/content/mississippi-13-wave-intros';
import { collectScenarioImageAssetNames } from '../src/content/scenario-image-assets';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { mississippiAmbientMusic, mississippiBattleMusicLoops } from '../src/content/mississippi-music';
import type { CampaignWaveDefinition } from '../src/game';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedWaves: readonly ExpectedWave[] = [
  { number: 1, delayMs: 15_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 105, spawnPools: [[0, 2_000, [1, 1, 1, 2, 0, 0, 0, 2, 0, 0]]] },
  { number: 2, delayMs: 5_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 105, spawnPools: [[0, 2_000, [1, 1, 2, 2, 1, 0, 0, 3, 0, 0]]] },
  { number: 3, delayMs: 5_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 110, spawnPools: [[0, 2_500, [0, 1, 1, 1, 1, 0, 0, 2, 0, 0]], [1, 2_500, [1, 2, 1, 2, 1, 0, 0, 2, 0, 0]]] },
  { number: 4, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 115, spawnPools: [[0, 3_000, [1, 0, 2, 2, 1, 0, 0, 2, 0, 0]], [1, 3_000, [1, 2, 2, 2, 2, 0, 0, 2, 0, 0]]] },
  { number: 5, delayMs: 10_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 100, spawnPools: [[2, 3_500, [0, 0, 1, 2, 2, 0, 0, 1, 0, 0]], [3, 3_500, [0, 0, 1, 2, 2, 0, 0, 2, 0, 0]]] },
  { number: 6, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 150, spawnPools: [[2, 3_500, [0, 0, 1, 1, 2, 0, 0, 3, 0, 0]], [3, 3_500, [1, 0, 1, 0, 2, 0, 0, 3, 0, 0]]] },
  { number: 7, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 115, spawnPools: [[2, 4_000, [1, 1, 0, 0, 3, 0, 0, 3, 0, 0]], [3, 3_500, [1, 1, 0, 0, 3, 0, 0, 3, 0, 0]]] },
  { number: 8, delayMs: 8_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 115, spawnPools: [[0, 4_000, [1, 1, 0, 0, 3, 0, 0, 2, 0, 0]], [1, 3_500, [1, 1, 0, 0, 3, 0, 0, 1, 0, 0]], [2, 4_000, [1, 1, 0, 0, 3, 0, 0, 2, 0, 0]], [3, 3_500, [1, 1, 0, 0, 3, 0, 0, 1, 0, 0]]] },
  { number: 9, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 115, spawnPools: [[0, 4_000, [1, 1, 0, 2, 3, 0, 0, 4, 0, 0]], [1, 3_500, [1, 1, 0, 2, 3, 0, 0, 3, 0, 0]], [2, 4_000, [1, 1, 0, 2, 3, 0, 0, 4, 0, 0]], [3, 3_500, [1, 1, 0, 2, 3, 0, 0, 3, 0, 0]]] },
];

function waveShape(wave: CampaignWaveDefinition) {
  return {
    number: wave.number,
    delayMs: wave.delayMs,
    hitPointMultiplierPercent: wave.hitPointMultiplierPercent,
    speedMultiplierPercent: wave.speedMultiplierPercent,
    spawnPools: wave.spawnPools.map(({ spawnPointId, intervalMs, requests }) => [spawnPointId, intervalMs, requests] as const),
  };
}

test('Golden River exposes the APK start state, global enemy design, and no absent map systems', () => {
  const scenario = createMississippi13CampaignContent();
  assert.equal(scenario.id, mississippi13CampaignId);
  assert.equal(scenario.contentVersion, 'gng-free-1.8.6-mississippi-13-formal-v2-grandpa0-sniper0-pyro0-salesman0');
  assert.equal(scenario.formalSettlementSupported, true);
  assert.deepEqual(scenario.title, mississippi13CampaignCopy.title);
  assert.equal(scenario.map.width, 32);
  assert.equal(scenario.map.height, 24);
  assert.equal(scenario.maxUpgrades, 3);
  assert.equal(scenario.previewWave, mississippi13PreviewWave);
  assert.equal(scenario.previewWave?.initialCash, 365);
  assert.equal(scenario.previewWave?.initialLives, 25);
  assert.deepEqual(scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty, { easy: 75, medium: 100, hard: 130 });
  assert.deepEqual(scenario.campaignBonusCratePool, { totalCount: 999, intervalMs: 25_000, simultaneousLimit: 10, rewardTypeCount: 4 });
  assert.equal(scenario.campaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(scenario.campaignEnemy, mississippiBaseEnemy);
  assert.deepEqual(scenario.campaignEnemyByType, mississippiEnemyByType);
  assert.deepEqual(mississippi13EnemyByType, mississippiEnemyByType);
  assert.equal(mississippi13CampaignAwesomeEnemyTypeThreshold, 5);
  assert.equal(scenario.campaignUnitPool, undefined, 'map16 has no player spawn-pool actions');
  assert.equal(scenario.gambler, undefined, 'map16 has no Gambler/Casino marker');
  assert.equal(mississippi13BonusCratePool.totalCount, 999);
  assert.equal(mississippi13MaxUpgrades, 3);
});

test('all nine Golden River waves match the static APK audit including every request slot', async () => {
  assert.deepEqual(mississippi13CampaignWaves.map(waveShape), expectedWaves);
  assert.equal(mississippi13CampaignWaves.length, 9);
  assert.equal(mississippi13CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 20);
  assert.ok(mississippi13CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));

  const scenario = createMississippi13CampaignContent();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 1301,
  });
  try {
    const view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 9);
    assert.equal(view.wave?.pendingSpawnRequests, 7);
    assert.equal(view.wave?.cash, 365);
    assert.equal(view.wave?.lives, 25);
  } finally {
    session.close();
  }
});

test('Golden River preserves all APK dialogue text, order, portrait, voice, and bilingual labels', () => {
  assert.deepEqual(mississippi13CampaignCopy, {
    title: { en: 'Golden River', zh: '黄金河' },
    overview: { en: 'Many cowboys have already become rich men at Golden River.', zh: '许多牛仔已经在黄金河发了财。' },
    victoryTitle: { en: 'The Robber of Golden River', zh: '黄金河大盗' },
  });
  assert.deepEqual(mississippi13WaveIntros.map(({ dialogueResource }) => dialogueResource), [
    'T_CAMPAIGN_13_01', 'T_CAMPAIGN_13_02', 'T_CAMPAIGN_13_03', 'T_CAMPAIGN_13_04', 'T_CAMPAIGN_13_05',
    'T_CAMPAIGN_13_06', 'T_CAMPAIGN_13_07', 'T_CAMPAIGN_13_08', 'T_CAMPAIGN_13_09',
  ]);
  assert.deepEqual(mississippi13WaveIntros.map(({ text }) => text.en), [
    "Hurry, honey! I want to go off and prospect for a little more gold while we're here.",
    'Finders, keepers! And I found you!',
    "Boss, what's a gold rush? Is it dangerous?",
    'Is a gold rush dangerous? Only for other people!',
    "Maybe we'll have better luck on the other side!",
    'Honey, I can see something shiny! Is it gold?',
    "That's not gold! That's my gun, ma'am!",
    'We have golden times ahead! Never have the north and south together looked so promising!',
    "The gold deposits should be exhausted soon! Let's get away from these stragglers!",
  ]);
  assert.deepEqual(mississippi13WaveIntros.map(({ speaker, portraitAsset, voiceSound }) => [speaker.en, portraitAsset, voiceSound]), [
    ['Settlers', 'portrait_settlers', 'sound_siedler'],
    ['Gunslinger', 'portrait_gunslinger', 'sound_desperado_yihaa'],
    ['Mexican', 'portrait_mexican', 'sound_mexican_arriba'],
    ['Pedro', 'portrait_pedro', 'sound_pedro'],
    ['Settlers', 'portrait_settlers', 'sound_siedler'],
    ['Settlers', 'portrait_settlers', 'sound_siedler'],
    ['Gunslinger', 'portrait_gunslinger', 'sound_desperado_yihaa'],
    ['Settlers', 'portrait_settlers', 'sound_siedler'],
    ['Deserter', 'portrait_deserter', 'sound_deserter_yes_sir'],
  ]);
  assert.ok(mississippi13WaveIntros.every(({ speaker, text }) => speaker.zh.length > 0 && text.zh.length > 0));
});

test('Golden River scenario images and audio resources are present in the offline application bundle', () => {
  const appRoot = path.resolve(import.meta.dirname, '..');
  const scenario = createMississippi13CampaignContent(['campaign-nevada-10', 'campaign-alaska-10']);
  const scenarioImageAssets = collectScenarioImageAssetNames([scenario]);
  assert.ok(scenarioImageAssets.includes('e_1x1_bush'));
  assert.ok(scenarioImageAssets.includes('player_indian'));
  assert.ok(scenarioImageAssets.includes('player_pyromaniac_sleep'));
  assert.ok(scenarioImageAssets.includes('player_salesman_sleep'));
  for (const asset of scenarioImageAssets) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `${asset} is preloaded and exists`);
  }
  for (const asset of new Set(mississippi13WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const portrait = readFileSync(path.join(appRoot, 'public/assets', `${asset}.png`));
    assert.equal(portrait.toString('hex', 0, 8), '89504e470d0a1a0a', `${asset} is a PNG`);
    assert.ok(portrait.length > 4_000, `${asset} is not an empty placeholder`);
  }
  for (const voice of new Set(mississippi13WaveIntros.flatMap(({ voiceSound }) => voiceSound ? [voiceSound] : []))) {
    const voiceBytes = readFileSync(path.join(appRoot, 'public/assets/sounds', `${voice}.ogg`));
    assert.equal(voiceBytes.toString('ascii', 0, 4), 'OggS', `${voice} is an OGG file`);
  }
  for (const music of [mississippiAmbientMusic, ...mississippiBattleMusicLoops]) {
    const musicBytes = readFileSync(path.join(appRoot, 'public/assets/music', `${music}.ogg`));
    assert.equal(musicBytes.toString('ascii', 0, 4), 'OggS', `${music} is an OGG file`);
  }
});
