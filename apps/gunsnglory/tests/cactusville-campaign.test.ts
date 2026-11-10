import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  cactusvilleCampaignContentVersionFor,
  cactusvilleCompletedScenarioIdsForContentVersion,
  createCactusvilleCampaignContent,
} from '../src/content/cactusville-campaign';
import { cactusvilleCampaignWaves } from '../src/content/cactusville-campaign-waves';
import { cactusvilleUnitPool } from '../src/content/cactusville-unit-pool';
import { cactusvilleWaveIntros } from '../src/content/cactusville-wave-intros';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';
import { createGame } from '../src/game';

const appRoot = path.resolve(import.meta.dirname, '..');

const expectedWaves = [
  { delay: 15_000, hp: 125, speed: 100, pools: [[0, 1_800, [2, 3, 4, 3, 4, 2, 1, 0, 0, 0]]] },
  { delay: 5_000, hp: 150, speed: 100, pools: [[0, 1_800, [1, 1, 2, 3, 4, 2, 1, 1, 0, 0]]] },
  { delay: 10_000, hp: 125, speed: 90, pools: [[0, 2_500, [1, 3, 2, 4, 3, 3, 1, 0, 0, 0]], [1, 2_500, [2, 3, 2, 3, 3, 3, 1, 1, 0, 0]]] },
  { delay: 5_000, hp: 200, speed: 105, pools: [[0, 3_000, [3, 3, 2, 2, 2, 4, 2, 0, 0, 0]], [1, 3_000, [3, 3, 2, 2, 2, 3, 1, 1, 0, 0]]] },
  { delay: 5_000, hp: 400, speed: 110, pools: [[0, 2_000, [3, 3, 3, 4, 0, 0, 0, 0, 0, 0]], [1, 2_000, [3, 3, 3, 4, 0, 0, 0, 0, 0, 0]]] },
  { delay: 5_000, hp: 450, speed: 120, pools: [[0, 2_000, [0, 0, 0, 0, 8, 0, 0, 0, 0, 0]], [1, 2_000, [0, 0, 0, 0, 8, 0, 0, 0, 0, 0]]] },
  { delay: 5_000, hp: 300, speed: 110, pools: [[0, 2_500, [2, 0, 1, 0, 3, 4, 2, 1, 0, 0]], [1, 2_500, [0, 2, 0, 0, 3, 4, 2, 0, 0, 0]]] },
  { delay: 5_000, hp: 300, speed: 110, pools: [[0, 2_500, [0, 0, 1, 0, 3, 3, 2, 0, 0, 0]], [1, 2_500, [1, 0, 0, 1, 3, 3, 3, 1, 0, 0]]] },
  { delay: 5_000, hp: 450, speed: 115, pools: [[0, 4_500, [0, 0, 0, 0, 0, 0, 0, 2, 0, 0]], [1, 6_500, [0, 0, 0, 0, 0, 0, 0, 2, 0, 0]]] },
  { delay: 5_000, hp: 450, speed: 120, pools: [[0, 2_500, [2, 2, 0, 2, 3, 4, 3, 2, 0, 0]], [1, 2_500, [0, 2, 3, 0, 3, 4, 2, 2, 0, 0]]] },
] as const;

const expectedDialogue = [
  ['Sheriff', 'portrait_sheriff', 'sound_sheriff', "Gentlemen, I'm Sheriff Jimmy Starforce. If I see or hear that any of you is stirring up the tiniest bit of trouble, I'll take you apart like you won't believe!"],
  ['Pedro', 'portrait_pedro', 'sound_pedro', "He'll have to get down off his high horse. He won't hear anything bad about us, so we have to attack with everything we've got to make sure!"],
  ['Settlers', 'portrait_settlers', 'sound_siedler', "Do you see the narrow pass up ahead? Maybe it's a shortcut..."],
  ['Pedro', 'portrait_pedro', 'sound_pedro', "How annoying that we can't barricade this shortcut."],
  ['Pedro', 'portrait_pedro', 'sound_pedro', 'There are hardly any wagons coming. Only the weary ranks on foot!'],
  ['Engineer', 'portrait_engineer', undefined, 'Riders ahead! More fodder for my Gatling.'],
  ['Pedro', 'portrait_pedro', 'sound_pedro', 'Those settlers are really talented... at being living targets!'],
  ['Pedro', 'portrait_pedro', 'sound_pedro', "Watch out! We can't let anyone get away. Sheriff Starforce is really tough!"],
  ['Settlers', 'portrait_settlers', 'sound_siedler', "Let's send the precious gold wagon on ahead."],
  ['Pedro', 'portrait_pedro', 'sound_pedro', "There's still a wagon train in sight, and then we'd better vamoose before the Sheriff shows up."],
] as const;

test('Cactusville campaign waves match all APK delays, modifiers, request slots, and pool ordering', () => {
  assert.deepEqual(cactusvilleCampaignWaves.map(({ number, dialogueResource, portraitAsset, delayMs,
    hitPointMultiplierPercent, speedMultiplierPercent, spawnPools }) => ({
    number,
    dialogueResource,
    portraitAsset,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: spawnPools.map(({ spawnPointId, intervalMs, requests }) => [spawnPointId, intervalMs, requests]),
  })), expectedWaves.map((wave, index) => ({
    number: index + 1,
    dialogueResource: `T_CAMPAIGN_08_${String(index + 1).padStart(2, '0')}`,
    portraitAsset: expectedDialogue[index]![1],
    delayMs: wave.delay,
    hitPointMultiplierPercent: wave.hp,
    speedMultiplierPercent: wave.speed,
    spawnPools: wave.pools,
  })));
  assert.equal(cactusvilleCampaignWaves.length, 10);
  assert.equal(cactusvilleCampaignWaves.reduce((count, wave) => count + wave.spawnPools.length, 0), 18);
  assert.ok(cactusvilleCampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
});

test('Cactusville player pools use the APK buildings and apply wave-one SET and SET_MAX values', () => {
  assert.deepEqual(cactusvilleUnitPool, {
    intervalMs: 15_000,
    units: [
      { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 },
      { poolType: 2, unitType: 'mexican', spawnLocationType: 1 },
      { poolType: 3, unitType: 'cannon', spawnLocationType: 2 },
      { poolType: 4, unitType: 'indian', spawnLocationType: 3 },
    ],
    spawnLocations: [
      { id: 'tipi', spawnLocationType: 3, cell: { x: 1, y: 4 } },
      { id: 'fort', spawnLocationType: 2, cell: { x: 9, y: 7 } },
      { id: 'saloon', spawnLocationType: 1, cell: { x: 12, y: 21 } },
    ],
    actions: [
      { waveNumber: 1, action: 'set', values: [1, 2, 3, 4].map((poolType) => ({ poolType, count: 0 })) },
      { waveNumber: 1, action: 'set-max', values: [7, 6, 4, 5].map((count, index) => ({ poolType: index + 1, count })) },
    ],
  });

  const runtime = createCampaignUnitPoolRuntime(cactusvilleUnitPool)!;
  runtime.pending.fill(12);
  runtime.maximum.fill(12);
  applyCampaignUnitPoolActions(runtime, cactusvilleUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [7, 6, 4, 5]);
});

test('Cactusville dialogue keeps APK English/resource keys, voice routes, portraits, and translated Chinese copy', () => {
  assert.deepEqual(cactusvilleWaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, voiceSound, text }) => ({
    waveNumber,
    dialogueResource,
    speaker: speaker.en,
    portraitAsset,
    voiceSound,
    en: text.en,
  })), expectedDialogue.map(([speaker, portraitAsset, voiceSound, en], index) => ({
    waveNumber: index + 1,
    dialogueResource: `T_CAMPAIGN_08_${String(index + 1).padStart(2, '0')}`,
    speaker,
    portraitAsset,
    voiceSound,
    en,
  })));
  assert.ok(cactusvilleWaveIntros.every(({ text }) => text.zh.trim().length > 0));
  assert.equal(cactusvilleWaveIntros[5]?.voiceSound, undefined, 'Engineer has no APK voice branch in this dialog');

  const portraitPath = path.join(appRoot, 'public/assets/portrait_sheriff.png');
  const portrait = readFileSync(portraitPath);
  assert.equal(existsSync(portraitPath), true);
  assert.equal(portrait.readUInt32BE(16), 96);
  assert.equal(portrait.readUInt32BE(20), 96);
  const voicePath = path.join(appRoot, 'public/assets/sounds/sound_sheriff.ogg');
  assert.equal(existsSync(voicePath), true);
  assert.equal(readFileSync(voicePath).subarray(0, 4).toString('ascii'), 'OggS');
});

test('Cactusville content applies its economy, difficulty, bonus crates, and special-unit unlock snapshot', () => {
  const content = createCactusvilleCampaignContent([]);
  assert.equal(content.id, 'campaign-new-mexico-08');
  assert.equal(content.map.width, 17);
  assert.equal(content.map.height, 24);
  assert.equal(content.maxUpgrades, 3);
  assert.equal(content.previewWave?.initialCash, 350);
  assert.equal(content.previewWave?.initialLives, 10);
  assert.deepEqual(content.previewWave?.enemyHitPointMultiplierPercentByDifficulty, { easy: 75, medium: 125, hard: 150 });
  assert.equal(content.campaignWaveCount, 10);
  assert.equal(content.campaignWaves, cactusvilleCampaignWaves);
  assert.equal(content.campaignUnitPool, cactusvilleUnitPool);
  assert.equal(content.dynamite?.unlocked, false);
  assert.ok((content.dynamite?.pairs.length ?? 0) > 0);
  assert.equal(content.campaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(content.campaignBonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 17, rewardTypeCount: 4,
  });
  assert.equal(content.gambler, undefined, 'the APK has no Cactusville Gambler entrance');
  assert.ok(content.units.some(({ type }) => type === 'gunslinger'));
  assert.ok(content.units.some(({ type }) => type === 'mexican'));
  for (const type of ['sniper', 'grandpa', 'pyromaniac', 'salesman']) {
    assert.equal(content.units.some((unit) => unit.type === type), false);
  }

  const unlocked = createCactusvilleCampaignContent([
    'campaign-new-mexico-04', 'campaign-new-mexico-05', 'campaign-new-mexico-06',
    'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10',
  ]).units;
  for (const type of ['sniper', 'grandpa', 'pyromaniac', 'salesman']) {
    assert.ok(unlocked.some((unit) => unit.type === type), `${type} follows its original global completion milestone`);
  }
  assert.equal(createCactusvilleCampaignContent(['campaign-mississippi-10']).dynamite?.unlocked, true,
    'completion of global level 20 unlocks the map dynamite');
});

test('Cactusville content versions preserve visible dynamite and special-unit unlock snapshots', () => {
  const emptyVersion = cactusvilleCampaignContentVersionFor([]);
  const dynamiteVersion = cactusvilleCampaignContentVersionFor(['campaign-mississippi-10']);
  const grandpaVersion = cactusvilleCampaignContentVersionFor(['campaign-oregon-10']);
  const specialVersion = cactusvilleCampaignContentVersionFor([
    'campaign-mississippi-10', 'campaign-oregon-10', 'campaign-dakota-10',
    'campaign-nevada-10', 'campaign-alaska-10',
  ]);
  assert.notEqual(emptyVersion, dynamiteVersion);
  assert.notEqual(dynamiteVersion, grandpaVersion);
  assert.deepEqual(cactusvilleCompletedScenarioIdsForContentVersion(emptyVersion), []);
  assert.deepEqual(cactusvilleCompletedScenarioIdsForContentVersion(dynamiteVersion), ['campaign-mississippi-10']);
  assert.deepEqual(cactusvilleCompletedScenarioIdsForContentVersion(grandpaVersion), ['campaign-oregon-10']);
  assert.deepEqual(cactusvilleCompletedScenarioIdsForContentVersion(specialVersion), [
    'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10',
  ]);
  assert.equal(cactusvilleCompletedScenarioIdsForContentVersion(`${emptyVersion}-unknown`), undefined);
  assert.equal(cactusvilleCompletedScenarioIdsForContentVersion(
    'gng-free-1.8.6-new-mexico-08-formal-v1-d0-g1-s0-p0-m0',
  ), undefined, 'an impossible map-object/unit snapshot is rejected');
});

test('a short Cactusville GameSession waits 15 seconds, then spawns the first real APK wave', async () => {
  const content = createCactusvilleCampaignContent([]);
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
    assert.equal(initial.wave?.lives, 10);
    assert.equal(initial.wave?.cash, 350);
    assert.equal(initial.enemies.length, 0);
    let view = initial;
    for (let frame = 0; frame < 149; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.equal(view.enemies.length, 0, 'the APK wave delay is not shortened');
    for (let frame = 0; frame < 5; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.ok(view.enemies.length > 0, 'the first request appears after its 15-second delay');
    assert.ok(view.enemies.every(({ positionFine }) => positionFine.x >= 0 && positionFine.x <= 7_680));
    assert.ok(view.enemies.every(({ positionFine }) => positionFine.y >= 23 * 7_680));
  } finally {
    session.close();
  }
});
