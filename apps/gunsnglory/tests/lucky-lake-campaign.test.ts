import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createLuckyLakeCampaignContent } from '../src/content/lucky-lake-campaign';
import { luckyLakeCampaignWaves } from '../src/content/lucky-lake-campaign-waves';
import { luckyLakeUnitPool } from '../src/content/lucky-lake-unit-pool';
import { luckyLakeWaveIntros } from '../src/content/lucky-lake-wave-intros';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';
import { createGame } from '../src/game';

const appRoot = path.resolve(import.meta.dirname, '..');

const expectedWaves = [
  { number: 1, delayMs: 15_000, hp: 100, speed: 100, pools: [[0, 1_800, [5, 2, 5, 5, 4, 1, 0, 0, 0, 0]]] },
  { number: 2, delayMs: 5_000, hp: 125, speed: 100, pools: [[0, 2_000, [2, 3, 2, 5, 4, 1, 0, 0, 0, 0]], [1, 2_500, [2, 1, 2, 2, 2, 1, 0, 0, 0, 0]]] },
  { number: 3, delayMs: 5_000, hp: 150, speed: 105, pools: [[0, 2_000, [5, 2, 3, 5, 3, 1, 0, 0, 0, 0]], [1, 3_000, [1, 4, 5, 2, 2, 4, 1, 0, 0, 0]]] },
  { number: 4, delayMs: 10_000, hp: 200, speed: 105, pools: [[0, 2_000, [2, 2, 3, 1, 4, 3, 0, 0, 0, 0]], [1, 3_000, [3, 2, 1, 2, 2, 4, 1, 0, 0, 0]]] },
  { number: 5, delayMs: 5_000, hp: 200, speed: 105, pools: [[2, 2_500, [1, 2, 3, 4, 4, 3, 3, 0, 0, 0]]] },
  { number: 6, delayMs: 5_000, hp: 215, speed: 105, pools: [[0, 3_500, [1, 2, 0, 1, 4, 3, 2, 1, 0, 0]], [1, 3_000, [1, 0, 1, 2, 2, 4, 1, 0, 0, 0]], [2, 2_500, [1, 2, 0, 2, 4, 3, 2, 0, 0, 0]]] },
  { number: 7, delayMs: 5_000, hp: 225, speed: 110, pools: [[0, 3_500, [0, 2, 2, 1, 4, 3, 2, 0, 0, 0]], [1, 3_000, [1, 2, 1, 0, 2, 4, 2, 1, 0, 0]], [2, 2_500, [1, 2, 0, 1, 4, 3, 3, 0, 0, 0]]] },
  { number: 8, delayMs: 5_000, hp: 250, speed: 110, pools: [[0, 5_500, [0, 0, 0, 0, 0, 0, 0, 2, 0, 0]], [1, 5_000, [0, 0, 0, 0, 0, 0, 0, 2, 0, 0]], [2, 5_500, [0, 0, 0, 0, 0, 0, 0, 2, 0, 0]]] },
  { number: 9, delayMs: 5_000, hp: 260, speed: 115, pools: [[0, 3_500, [0, 1, 0, 0, 4, 3, 3, 1, 0, 0]], [1, 3_000, [1, 0, 1, 0, 3, 4, 2, 1, 0, 0]], [2, 2_500, [1, 1, 0, 1, 4, 3, 2, 2, 0, 0]]] },
  { number: 10, delayMs: 5_000, hp: 280, speed: 120, pools: [[0, 3_500, [0, 0, 1, 0, 2, 3, 3, 2, 0, 0]], [1, 3_000, [0, 0, 1, 0, 2, 4, 2, 1, 0, 0]], [2, 2_500, [0, 0, 0, 1, 2, 3, 2, 2, 0, 0]]] },
] as const;

const expectedIntros = [
  ['Pedro', 'portrait_pedro', 'sound_pedro', 'We are at Lucky Lake. The settlers often stop off here to replenish their water supplies.'],
  ['Pedro', 'portrait_pedro', 'sound_pedro', "We have to keep a sharp lookout. They're trying to find their own routes through the valleys!"],
  ['Pedro', 'portrait_pedro', 'sound_pedro', 'We have now unlocked level 3. For a few dollars more, our men will now be real crack shots!'],
  ['Settlers', 'portrait_settlers', 'sound_siedler', 'Oh, I am so looking forward to our new home in the West!'],
  ['Pedro', 'portrait_pedro', 'sound_pedro', 'Hey, Boss! Some settlers are trying to go through the northern pass!'],
  ['Settlers', 'portrait_settlers', 'sound_siedler', "I'm thirsty. Where is this lake exactly? I hope it hasn't dried up..."],
  ['Pedro', 'portrait_pedro', 'sound_pedro', 'We should drown them in this lake!'],
  ['Settlers', 'portrait_settlers', 'sound_siedler', "Gold! Soon, we can use this to build a pretty house. Let's bring these new riches to safety quickly."],
  ['Settlers', 'portrait_settlers', 'sound_siedler', 'I am so happy that we sent the gold ahead of us. We have something to look forward to at the end of our journey.'],
  ['Deserter', 'portrait_deserter', 'sound_deserter_yes_sir', 'Sir! As far as I can see, these are the last settlers in this area!'],
] as const;

test('Lucky Lake campaign waves match all APK delays, modifiers, spawn pools, and request vectors', () => {
  assert.deepEqual(luckyLakeCampaignWaves.map(({ number, dialogueResource, portraitAsset, delayMs,
    hitPointMultiplierPercent, speedMultiplierPercent, spawnPools }) => ({
    number,
    dialogueResource,
    portraitAsset,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: spawnPools.map(({ spawnPointId, intervalMs, requests }) => [spawnPointId, intervalMs, requests]),
  })), expectedWaves.map((wave) => ({
    number: wave.number,
    dialogueResource: `T_CAMPAIGN_07_${String(wave.number).padStart(2, '0')}`,
    portraitAsset: expectedIntros[wave.number - 1]![1],
    delayMs: wave.delayMs,
    hitPointMultiplierPercent: wave.hp,
    speedMultiplierPercent: wave.speed,
    spawnPools: wave.pools,
  })));
  assert.equal(luckyLakeCampaignWaves.length, 10);
  assert.equal(luckyLakeCampaignWaves.reduce((count, wave) => count + wave.spawnPools.length, 0), 23);
  assert.ok(luckyLakeCampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
  assert.equal(luckyLakeCampaignWaves[7]?.delayMs, 5_000, '250 is the wave-eight HP multiplier, not a 250 ms delay');
});

test('Lucky Lake recruit pools use its Saloon, Fort and Tipi, with wave-one SET and SET_MAX', () => {
  assert.deepEqual(luckyLakeUnitPool, {
    intervalMs: 15_000,
    units: [
      { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 },
      { poolType: 2, unitType: 'mexican', spawnLocationType: 1 },
      { poolType: 3, unitType: 'cannon', spawnLocationType: 2 },
      { poolType: 4, unitType: 'indian', spawnLocationType: 3 },
    ],
    spawnLocations: [
      { id: 'tipi', spawnLocationType: 3, cell: { x: 3, y: 1 } },
      { id: 'saloon', spawnLocationType: 1, cell: { x: 30, y: 6 } },
      { id: 'fort', spawnLocationType: 2, cell: { x: 19, y: 15 } },
    ],
    actions: [
      { waveNumber: 1, action: 'set', values: [1, 2, 3, 4].map((poolType) => ({ poolType, count: 0 })) },
      { waveNumber: 1, action: 'set-max', values: [3, 3, 4, 5].map((count, index) => ({ poolType: index + 1, count })) },
    ],
  });

  const runtime = createCampaignUnitPoolRuntime(luckyLakeUnitPool)!;
  runtime.pending.fill(8);
  runtime.maximum.fill(9);
  applyCampaignUnitPoolActions(runtime, luckyLakeUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [3, 3, 4, 5]);
});

test('Lucky Lake dialogue retains APK English, resource keys, portraits, voice routes, and Chinese copy', () => {
  assert.deepEqual(luckyLakeWaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, voiceSound, text }) => ({
    waveNumber,
    dialogueResource,
    speaker: speaker.en,
    portraitAsset,
    voiceSound,
    en: text.en,
  })), expectedIntros.map(([speaker, portraitAsset, voiceSound, en], index) => ({
    waveNumber: index + 1,
    dialogueResource: `T_CAMPAIGN_07_${String(index + 1).padStart(2, '0')}`,
    speaker,
    portraitAsset,
    voiceSound,
    en,
  })));
  assert.ok(luckyLakeWaveIntros.every(({ text }) => text.zh.trim().length > 0));
  for (const asset of ['portrait_pedro.png', 'portrait_settlers.png', 'portrait_deserter.png']) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', asset)), true, `${asset} exists`);
  }
  for (const sound of ['sound_pedro', 'sound_siedler', 'sound_deserter_yes_sir']) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets/sounds', `${sound}.ogg`)), true, `${sound} exists`);
  }
});

test('Lucky Lake content applies the level-seven economy, difficulty, crates, and map unlock snapshot', () => {
  const content = createLuckyLakeCampaignContent([]);
  assert.equal(content.id, 'campaign-new-mexico-07');
  assert.equal(content.map.width, 32);
  assert.equal(content.map.height, 24);
  assert.equal(content.maxUpgrades, 3);
  assert.equal(content.previewWave?.initialCash, 400);
  assert.equal(content.previewWave?.initialLives, 50);
  assert.deepEqual(content.previewWave?.enemyHitPointMultiplierPercentByDifficulty, { easy: 75, medium: 150, hard: 188 });
  assert.equal(content.campaignWaveCount, 10);
  assert.equal(content.campaignWaves, luckyLakeCampaignWaves);
  assert.equal(content.campaignUnitPool, luckyLakeUnitPool);
  assert.deepEqual(content.campaignBonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 32, rewardTypeCount: 4,
  });
  assert.equal(content.gambler, undefined);
  assert.ok(content.units.some(({ type }) => type === 'gunslinger'));
  for (const type of ['sniper', 'grandpa', 'pyromaniac', 'salesman']) {
    assert.equal(content.units.some((unit) => unit.type === type), false);
  }
  const allUnits = createLuckyLakeCampaignContent([
    'campaign-new-mexico-04', 'campaign-new-mexico-05', 'campaign-new-mexico-06',
    'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10',
  ]).units;
  for (const type of ['sniper', 'grandpa', 'pyromaniac', 'salesman']) {
    assert.ok(allUnits.some((unit) => unit.type === type), `${type} follows its original global completion milestone`);
  }
});

test('a short Lucky Lake GameSession waits 15 seconds, then spawns wave-one pool zero at the right entrance', async () => {
  const content = createLuckyLakeCampaignContent([]);
  const session = await createGame({ scenarios: { [content.id]: content } }).open({
    scenarioId: content.id,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 7,
  });
  try {
    const initial = session.observe();
    assert.equal(initial.wave?.number, 1);
    assert.equal(initial.wave?.totalWaves, 10);
    assert.equal(initial.wave?.lives, 50);
    assert.equal(initial.wave?.cash, 400);
    assert.equal(initial.enemies.length, 0);
    let view = initial;
    for (let frame = 0; frame < 149; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.equal(view.enemies.length, 0, 'the initial delay is not shortened');
    for (let frame = 0; frame < 5; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.ok(view.enemies.length > 0, 'the first request appears after the 15-second wave delay');
    assert.ok(view.enemies.every(({ positionFine }) => positionFine.x > 30 * 7_680),
      'pool zero maps to the first y-major entrance at cell (31,4)');
  } finally {
    session.close();
  }
});
