import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { mississippiBaseEnemy, mississippiCampaignAwesomeEnemyTypeThreshold, mississippiEnemyByType } from '../src/content/mississippi-enemy-designs';
import { mississippi12BonusCratePool, mississippi12CampaignAwesomeEnemyTypeThreshold, mississippi12EnemyByType, mississippi12MaxUpgrades, mississippi12PreviewWave } from '../src/content/mississippi-12-campaign-rules';
import { mississippi12CampaignWaves } from '../src/content/mississippi-12-campaign-waves';
import { mississippi12CampaignId } from '../src/content/mississippi-12-identity';
import { createMississippi12MapScene } from '../src/content/mississippi-12-scene';
import { mississippi12RouteDefinitions } from '../src/content/mississippi-12-routes';
import { createMississippi12SteamerUnits } from '../src/content/mississippi-12-steamer';
import { createMississippi12MapUnits } from '../src/content/mississippi-12-units';
import { mississippi12WaveIntros } from '../src/content/mississippi-12-wave-intros';
import { mississippi11BaseEnemy, mississippi11CampaignAwesomeEnemyTypeThreshold, mississippi11EnemyByType } from '../src/content/mississippi-11-campaign-rules';
import map from '../src/content/mississippi-12.json';
import type { CampaignWaveDefinition, ScenarioContent } from '../src/game';
import { createGame } from '../src/game';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedWaves: readonly ExpectedWave[] = [
  { number: 1, delayMs: 15_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 110, spawnPools: [[1, 2_000, [1, 1, 1, 2, 0, 2, 0, 0, 0, 0]]] },
  { number: 2, delayMs: 5_000, hitPointMultiplierPercent: 325, speedMultiplierPercent: 110, spawnPools: [[1, 2_000, [1, 1, 2, 2, 0, 3, 1, 0, 0, 0]]] },
  { number: 3, delayMs: 5_000, hitPointMultiplierPercent: 275, speedMultiplierPercent: 110, spawnPools: [[0, 2_500, [0, 1, 1, 1, 1, 3, 1, 0, 0, 0]], [1, 2_500, [1, 2, 1, 2, 1, 3, 1, 0, 0, 0]]] },
  { number: 4, delayMs: 5_000, hitPointMultiplierPercent: 275, speedMultiplierPercent: 110, spawnPools: [[0, 3_000, [1, 0, 2, 2, 3, 4, 1, 0, 0, 0]], [1, 3_000, [1, 2, 2, 2, 3, 3, 2, 0, 0, 0]]] },
  { number: 5, delayMs: 5_000, hitPointMultiplierPercent: 275, speedMultiplierPercent: 120, spawnPools: [[0, 3_500, [0, 0, 1, 2, 2, 3, 1, 0, 0, 0]], [1, 3_500, [0, 0, 1, 2, 2, 2, 1, 0, 0, 0]]] },
  { number: 6, delayMs: 5_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 150, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 0, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 0, 0, 0]]] },
  { number: 7, delayMs: 5_000, hitPointMultiplierPercent: 325, speedMultiplierPercent: 125, spawnPools: [[0, 4_000, [1, 1, 0, 0, 3, 3, 3, 0, 0, 0]], [1, 3_500, [1, 1, 0, 0, 3, 3, 3, 0, 0, 0]]] },
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

function createSteamValleyScenario(): ScenarioContent {
  return {
    id: mississippi12CampaignId,
    contentVersion: 'steam-valley-campaign-content-test-v1',
    formalSettlementSupported: true,
    title: { en: 'Steam Valley', zh: '蒸汽谷' },
    map: createMississippi12MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [...createMississippi12SteamerUnits(), ...createMississippi12MapUnits()],
    maxUpgrades: mississippi12MaxUpgrades,
    previewWave: mississippi12PreviewWave,
    campaignWaveCount: mississippi12CampaignWaves.length,
    campaignWaves: mississippi12CampaignWaves,
    campaignBonusCratePool: mississippi12BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi12CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippiBaseEnemy,
    campaignEnemyByType: mississippiEnemyByType,
  };
}

test('Steam Valley seven waves match APK delays, modifiers, both spawn pools, intervals, and all ten request slots', () => {
  assert.deepEqual(mississippi12CampaignWaves.map(waveShape), expectedWaves);
  assert.equal(mississippi12CampaignWaves.length, 7);
  assert.equal(mississippi12CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 12);
  assert.ok(mississippi12CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
  assert.equal(mississippi12CampaignWaves[0]?.spawnPools[0]?.spawnPointId, 1,
    'wave one uses the lower TDM spawn, not pool index zero');
  assert.equal(mississippi12CampaignWaves[3]?.spawnPools[0]?.intervalMs, 3_000,
    'MAX_NUM_POINTS resolves to 3 seconds in wave 4');
  assert.equal(mississippi12CampaignWaves[0]?.delayMs, 15_000);
  assert.ok(mississippi12CampaignWaves.every(({ spawnPools }) => spawnPools.length > 0));
  assert.deepEqual(mississippi12CampaignWaves[6]?.spawnPools[0]?.requests,
    mississippi12CampaignWaves[6]?.spawnPools[1]?.requests);
});

test('Steam Valley real map content keeps APK start resources, difficulty, crate pool, and global enemies', async () => {
  const scenario = createSteamValleyScenario();
  assert.equal(scenario.maxUpgrades, 3);
  assert.equal(scenario.previewWave?.initialCash, 365);
  assert.equal(scenario.previewWave?.initialLives, 25);
  assert.deepEqual(scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75, medium: 100, hard: 130,
  });
  assert.equal(scenario.campaignBonusCratePool?.totalCount, 999);
  assert.equal(scenario.campaignBonusCratePool?.intervalMs, 25_000);
  assert.equal(scenario.campaignBonusCratePool?.simultaneousLimit, 10);
  assert.equal(scenario.campaignBonusCratePool?.rewardTypeCount, 4);
  assert.equal(scenario.campaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(scenario.campaignEnemy, mississippiBaseEnemy);
  assert.deepEqual(scenario.campaignEnemyByType, mississippiEnemyByType);
  assert.equal(mississippi12CampaignAwesomeEnemyTypeThreshold, mississippi11CampaignAwesomeEnemyTypeThreshold);
  assert.deepEqual(mississippi12EnemyByType, mississippi11EnemyByType);
  assert.equal(scenario.campaignUnitPool, undefined, 'Steam Valley has no player spawn-pool actions');
  assert.equal(scenario.gambler, undefined, 'map15 has no Gambler marker 132');
  assert.equal(mississippi12RouteDefinitions.length, 36);
  assert.deepEqual([scenario.previewWave?.spawn, ...(scenario.previewWave?.additionalSpawns ?? [])].map(({ cell }) => [cell.x, cell.y]), [
    [0, 9], [0, 15],
  ]);

  const game = createGame({ scenarios: { [scenario.id]: scenario } });
  const session = await game.open({ scenarioId: scenario.id, mode: 'free', difficulty: 'medium', randomSeed: 712 });
  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 7);
    assert.equal(view.wave?.pendingSpawnRequests, 7);
    assert.equal(view.wave?.cash, 365);
    assert.equal(view.wave?.lives, 25);

    for (let frame = 0; frame < 150; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.equal(view.elapsedMs, 15_000);
    assert.equal(view.enemies.length, 0, 'wave one observes the full 15-second delay');

    view = session.advance({ deltaMs: 100 });
    assert.ok(view.enemies.length > 0);
    assert.ok(view.events.some((event) => event.type === 'enemy-group-spawned'
      && event.waveNumber === 1 && event.spawnPointId === 1));
  } finally {
    session.close();
  }
});

test('Steam Valley bonus crate timer uses the 25-second schedule and four original rewards', async () => {
  const scenario = createSteamValleyScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'debug',
    difficulty: 'medium',
    randomSeed: 712,
  });
  try {
    let view = session.observe();
    assert.equal(view.bonusCratePool?.remainingCount, 999);
    assert.equal(view.bonusCratePool?.remainingMs, 25_000);

    for (let frame = 0; frame < 250; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.equal(view.bonusCratePool?.remainingCount, 999, 'timer exactly at zero does not spawn');
    view = session.advance({ deltaMs: 100 });

    assert.equal(view.bonusCratePool?.remainingCount, 998);
    assert.equal(view.bonusCrates?.length, 1);
    assert.ok([1, 2, 3, 4].includes(view.bonusCrates?.[0]?.rewardType ?? 0));
  } finally {
    session.close();
  }
});

test('Steam Valley dialogue preserves APK English, wave order, speaker, portrait, and voice mapping', () => {
  assert.deepEqual(mississippi12WaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(mississippi12WaveIntros.map(({ dialogueResource }) => dialogueResource), [
    'T_CAMPAIGN_12_01', 'T_CAMPAIGN_12_02', 'T_CAMPAIGN_12_03', 'T_CAMPAIGN_12_04',
    'T_CAMPAIGN_12_05', 'T_CAMPAIGN_12_06', 'T_CAMPAIGN_12_07',
  ]);
  assert.deepEqual(mississippi12WaveIntros.map(({ text }) => text.en), [
    "The ship is ready to cast off! You'll soon get wet, you landlubbers!",
    'We need more steamers with more cannons and firepower!',
    "I love this beautiful calliope music. It reminds me of that film, what's it called again...",
    'I have no idea what the film is called, honey. Something like ONCE UPON A TIME...',
    'That echoing sound coming from both sides... we should patent it and find a name for it!',
    "Boss! Boss! They're scared and are starting to run! What should we do?",
    'What should we do? Well... what we do best! Scare them out of their wits!',
  ]);
  assert.deepEqual(mississippi12WaveIntros.map(({ speaker }) => speaker.en), [
    'Captain', 'Mexican', 'Settlers', 'Settlers', 'Gunslinger', 'Mexican', 'Gunslinger',
  ]);
  assert.deepEqual(mississippi12WaveIntros.map(({ portraitAsset }) => portraitAsset), [
    'portrait_captain', 'portrait_mexican', 'portrait_settlers', 'portrait_settlers',
    'portrait_gunslinger', 'portrait_mexican', 'portrait_gunslinger',
  ]);
  assert.deepEqual(mississippi12WaveIntros.map(({ voiceSound }) => voiceSound), [
    undefined, 'sound_mexican_arriba', 'sound_siedler', 'sound_siedler',
    'sound_desperado_yihaa', 'sound_mexican_arriba', 'sound_desperado_yihaa',
  ], 'the APK does not assign a generic voice to Captain');
  assert.ok(mississippi12WaveIntros.every(({ speaker, text }) => speaker.zh.length > 0 && text.zh.length > 0));
});

test('Steam Valley intro portrait and voice files are available offline', () => {
  const appRoot = path.resolve(import.meta.dirname, '..');
  for (const asset of new Set(mississippi12WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const bytes = readFileSync(path.join(appRoot, 'public/assets', `${asset}.png`));
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', `${asset} is PNG`);
    assert.ok(bytes.length > 4_000, `${asset} is not an empty placeholder`);
  }
  assert.ok(existsSync(path.join(appRoot, 'public/assets/sounds/sound_mexican_arriba.ogg')));
  assert.ok(existsSync(path.join(appRoot, 'public/assets/sounds/sound_siedler.ogg')));
  assert.ok(existsSync(path.join(appRoot, 'public/assets/sounds/sound_desperado_yihaa.ogg')));
});
