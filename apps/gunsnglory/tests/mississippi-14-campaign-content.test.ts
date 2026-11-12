import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createGame, type CampaignWaveDefinition } from '../src/game';
import { mississippiBaseEnemy, mississippiCampaignAwesomeEnemyTypeThreshold, mississippiEnemyByType } from '../src/content/mississippi-enemy-designs';
import {
  mississippi14BonusCratePool,
  mississippi14CampaignAwesomeEnemyTypeThreshold,
  mississippi14EnemyByType,
  mississippi14MaxUpgrades,
  mississippi14PreviewWave,
} from '../src/content/mississippi-14-campaign-rules';
import { mississippi14CampaignWaves } from '../src/content/mississippi-14-campaign-waves';
import { mississippi14CampaignCopy } from '../src/content/mississippi-14-campaign-copy';
import { mississippi14CampaignId } from '../src/content/mississippi-14-identity';
import { mississippi14CampaignContentVersionFor, mississippi14CompletedScenarioIdsForContentVersion } from '../src/content/mississippi-14-content-version';
import { createMississippi14CampaignContent } from '../src/content/mississippi-14-campaign';
import { mississippi14CampaignUnitPool } from '../src/content/mississippi-14-unit-pool';
import { mississippi14WaveIntros } from '../src/content/mississippi-14-wave-intros';
import { collectScenarioImageAssetNames } from '../src/content/scenario-image-assets';
import { mississippiBattleMusicLoops, mississippiAmbientMusic } from '../src/content/mississippi-music';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedWaves: readonly ExpectedWave[] = [
  { number: 1, delayMs: 15_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 100, spawnPools: [[0, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 2, delayMs: 5_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 110, spawnPools: [[0, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]]] },
  { number: 3, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 110, spawnPools: [[0, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [1, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]]] },
  { number: 4, delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 115, spawnPools: [[2, 3_000, [1, 0, 2, 2, 3, 4, 1, 0, 0, 0]], [3, 3_000, [1, 2, 2, 2, 3, 3, 2, 1, 0, 0]]] },
  { number: 5, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 115, spawnPools: [[2, 3_500, [0, 0, 1, 2, 2, 3, 1, 1, 0, 0]], [3, 3_500, [0, 0, 1, 2, 2, 2, 1, 0, 0, 0]]] },
  { number: 6, delayMs: 5_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 150, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [3, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]]] },
  { number: 7, delayMs: 5_000, hitPointMultiplierPercent: 275, speedMultiplierPercent: 110, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [3, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [4, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [5, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]]] },
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

test('Riverside Mountains campaign rules retain APK start values and shared enemy data', async () => {
  const scenario = createMississippi14CampaignContent();
  assert.equal(scenario.id, mississippi14CampaignId);
  assert.equal(scenario.contentVersion, 'gng-free-1.8.6-mississippi-14-formal-v2-grandpa0-sniper0-pyro0-salesman0');
  assert.equal(scenario.formalSettlementSupported, true);
  assert.deepEqual(scenario.title, mississippi14CampaignCopy.title);
  assert.equal(scenario.maxUpgrades, 3);
  assert.equal(mississippi14MaxUpgrades, 3);
  assert.equal(scenario.previewWave, mississippi14PreviewWave);
  assert.equal(scenario.previewWave?.initialCash, 365);
  assert.equal(scenario.previewWave?.initialLives, 25);
  assert.deepEqual(scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty, { easy: 75, medium: 100, hard: 115 });
  assert.deepEqual(scenario.campaignBonusCratePool, { totalCount: 999, intervalMs: 25_000, simultaneousLimit: 10, rewardTypeCount: 4 });
  assert.equal(scenario.campaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(scenario.campaignEnemy, mississippiBaseEnemy);
  assert.deepEqual(scenario.campaignEnemyByType, mississippiEnemyByType);
  assert.deepEqual(mississippi14EnemyByType, mississippiEnemyByType);
  assert.equal(mississippi14CampaignAwesomeEnemyTypeThreshold, mississippiCampaignAwesomeEnemyTypeThreshold);
  assert.deepEqual(mississippi14BonusCratePool, scenario.campaignBonusCratePool);

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 1410,
  });
  try {
    const view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 7);
    assert.equal(view.wave?.pendingSpawnRequests, 10);
    assert.equal(view.wave?.cash, 365);
    assert.equal(view.wave?.lives, 25);
  } finally {
    session.close();
  }
});

test('all seven Riverside Mountains waves match APK order, modifiers, intervals, and request slots', () => {
  assert.deepEqual(mississippi14CampaignWaves.map(waveShape), expectedWaves);
  assert.equal(mississippi14CampaignWaves.length, 7);
  assert.equal(mississippi14CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 18);
  assert.ok(mississippi14CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
});

test('Riverside Mountains creates the wave-two Fort Cannon from a separate pool template', async () => {
  const source = createMississippi14CampaignContent();
  assert.deepEqual(mississippi14CampaignUnitPool.spawnLocations, [
    { id: 'fort', spawnLocationType: 2, cell: { x: 14, y: 4 } },
  ]);
  assert.deepEqual(mississippi14CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType, template }) => [
    poolType, unitType, spawnLocationType, template?.type, template?.cell,
  ]), [[3, 'cannon', 2, 'cannon', { x: 14, y: 4 }]]);
  assert.equal(source.campaignUnitPool?.intervalMs, 15_000);
  assert.deepEqual(source.campaignUnitPool?.actions, [
    { waveNumber: 2, action: 'set', values: [{ poolType: 3, count: 2 }] },
    { waveNumber: 2, action: 'set-max', values: [{ poolType: 3, count: 4 }] },
  ]);
  assert.ok(source.units.every(({ type }) => type !== 'cannon'), 'the Fort template is not inserted as a placed map unit');

  const zeroRequests = () => Array.from({ length: 10 }, () => 0);
  const scenario = {
    ...source,
    units: [],
    campaignWaveCount: 2,
    campaignWaves: [
      {
        number: 1,
        delayMs: 0,
        hitPointMultiplierPercent: 100,
        speedMultiplierPercent: 100,
        spawnPools: [{ spawnPointId: 0, intervalMs: 100, requests: zeroRequests() }],
      },
      {
        number: 2,
        delayMs: 0,
        hitPointMultiplierPercent: 100,
        speedMultiplierPercent: 100,
        spawnPools: [{ spawnPointId: 0, intervalMs: 100, requests: [1, ...zeroRequests().slice(1)] }],
      },
    ],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 1414,
  });
  try {
    let view = session.observe();
    for (let frame = 0; frame < 10 && view.wave?.number === 1; frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    assert.equal(view.wave?.number, 2, 'the zero-request first wave reaches the Cannon action wave');

    for (let frame = 0; frame < 250 && !view.units.some(({ id }) => id === 'cannon-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const cannon = view.units.find(({ id }) => id === 'cannon-spawn-01');
    assert.ok(cannon, 'the Fort pool spawns its first Cannon after the global timer');
    assert.equal(cannon.activity, 2);
    assert.equal(cannon.type, 'cannon');
    assert.deepEqual(cannon.cell, { x: 14, y: 4 });
    assert.equal(cannon.asset, 'player_cannon');
    assert.equal(view.units.filter(({ type }) => type === 'cannon').length, 1);
  } finally {
    session.close();
  }
});

test('Riverside Mountains copy and seven dialogue records match APK English resources', () => {
  assert.deepEqual(mississippi14CampaignCopy, {
    title: { en: 'Riverside Mountains', zh: '河畔群山' },
    overview: {
      en: 'The Riverside Mountains invite you to explore the vast number of valleys, and provide ideal routes for anyone with wanderlust.',
      zh: '河畔群山中有无数山谷等待探索，也为渴望远行的人们提供了理想路线。',
    },
    victoryTitle: { en: 'The Sinister Echo of the Riverside Mountains', zh: '河畔群山的诡异回响' },
  });
  assert.deepEqual(mississippi14WaveIntros.map(({ dialogueResource, text }) => [dialogueResource, text.en]), [
    ['T_CAMPAIGN_14_01', "I can't help feeling we forgot something..."],
    ['T_CAMPAIGN_14_02', 'Of course, you forgot something... to take out a life insurance policy!'],
    ['T_CAMPAIGN_14_03', 'What a lovely view from up here, Boss! It must be all those pretty lady settlers!'],
    ['T_CAMPAIGN_14_04', 'The deeper the valley, the higher the quota of settlers!'],
    ['T_CAMPAIGN_14_05', 'Señor, I need more settlers... fast! I already lit my dynamite!'],
    ['T_CAMPAIGN_14_06', "There isn't enough dynamite for what we need here!"],
    ['T_CAMPAIGN_14_07', 'White man and white woman everywhere. Hear war cry of my tribe!'],
  ]);
  assert.deepEqual(mississippi14WaveIntros.map(({ speaker, portraitAsset, voiceSound }) => [speaker.en, portraitAsset, voiceSound]), [
    ['Settlers', 'portrait_settlers', 'sound_siedler'],
    ['Gunslinger', 'portrait_gunslinger', 'sound_desperado_yihaa'],
    ['Mexican', 'portrait_mexican', 'sound_mexican_arriba'],
    ['Pedro', 'portrait_pedro', 'sound_pedro'],
    ['Mexican', 'portrait_mexican', 'sound_mexican_arriba'],
    ['Mexican', 'portrait_mexican', 'sound_mexican_arriba'],
    ['Indian', 'portrait_indian', 'sound_indian_hugh'],
  ]);
  assert.ok(mississippi14WaveIntros.every(({ speaker, text }) => speaker.zh.length > 0 && text.zh.length > 0));
  assert.deepEqual(mississippi14CampaignContentVersionFor(['campaign-nevada-10', 'campaign-alaska-10']),
    'gng-free-1.8.6-mississippi-14-formal-v2-grandpa0-sniper0-pyro1-salesman1');
  assert.deepEqual(mississippi14CompletedScenarioIdsForContentVersion(
    'gng-free-1.8.6-mississippi-14-formal-v1-pyro1-salesman0',
  ), ['campaign-nevada-10']);
  assert.deepEqual(mississippi14CompletedScenarioIdsForContentVersion(
    'gng-free-1.8.6-mississippi-14-formal-v2-grandpa1-sniper1-pyro1-salesman0',
  ), ['campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10']);
  assert.equal(mississippi14CompletedScenarioIdsForContentVersion('not-an-m14-replay-version'), undefined);
});

test('Riverside Mountains assets needed by the level and dialogue are available offline', () => {
  const appRoot = path.resolve(import.meta.dirname, '..');
  const scenario = createMississippi14CampaignContent(['campaign-nevada-10', 'campaign-alaska-10']);
  const assets = collectScenarioImageAssetNames([scenario]);
  for (const asset of ['b_3x2_fort', 'e_1x1_cactus_a', 'e_1x1_cactus_b', 'e_1x2_bones', 'player_cannon', 'player_indian', 'player_pyromaniac_sleep', 'player_salesman_sleep']) {
    assert.ok(assets.includes(asset), asset + ' is collected for startup preload');
  }
  for (const asset of assets) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `${asset} is present`);
  }
  for (const asset of new Set(mississippi14WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const portrait = readFileSync(path.join(appRoot, 'public/assets', `${asset}.png`));
    assert.equal(portrait.toString('hex', 0, 8), '89504e470d0a1a0a', `${asset} is PNG`);
    assert.ok(portrait.length > 4_000, `${asset} is not an empty placeholder`);
  }
  for (const voice of new Set(mississippi14WaveIntros.flatMap(({ voiceSound }) => voiceSound ? [voiceSound] : []))) {
    const bytes = readFileSync(path.join(appRoot, 'public/assets/sounds', `${voice}.ogg`));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${voice} is bundled`);
  }
  for (const music of [mississippiAmbientMusic, ...mississippiBattleMusicLoops]) {
    const bytes = readFileSync(path.join(appRoot, 'public/assets/music', `${music}.ogg`));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${music} is bundled`);
  }
});
