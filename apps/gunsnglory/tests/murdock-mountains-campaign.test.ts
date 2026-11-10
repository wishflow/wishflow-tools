import assert from 'node:assert/strict';
import test from 'node:test';
import { createMurdockMountainsCampaignContent } from '../src/content/murdock-mountains-campaign';
import { murdockMountainsCampaignWaves } from '../src/content/murdock-mountains-campaign-waves';
import { murdockMountainsUnitPool } from '../src/content/murdock-mountains-unit-pool';
import { createCampaignUnitPoolRuntime, applyCampaignUnitPoolActions } from '../src/game/campaign-unit-pool';
import { createGame } from '../src/game';
import { murdockMountainsWaveIntros } from '../src/content/murdock-mountains-wave-intros';

test('Murdock Mountains wave records match the APK ten-wave requests and wave modifiers', () => {
  assert.deepEqual(murdockMountainsCampaignWaves.map(({
    number,
    dialogueResource,
    portraitAsset,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools,
  }) => ({
    number,
    dialogueResource,
    portraitAsset,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: spawnPools.map(({ spawnPointId, intervalMs, requests }) => ({ spawnPointId, intervalMs, requests })),
  })), [
    { number: 1, dialogueResource: 'T_CAMPAIGN_06_01', portraitAsset: 'portrait_pedro', delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 100,
      spawnPools: [{ spawnPointId: 0, intervalMs: 1_800, requests: [4, 4, 4, 4, 3, 1, 0, 0, 0, 0] }] },
    { number: 2, dialogueResource: 'T_CAMPAIGN_06_02', portraitAsset: 'portrait_pedro', delayMs: 5_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 100,
      spawnPools: [{ spawnPointId: 0, intervalMs: 1_500, requests: [0, 1, 2, 3, 3, 2, 0, 0, 0, 0] }] },
    { number: 3, dialogueResource: 'T_CAMPAIGN_06_03', portraitAsset: 'portrait_settlers', delayMs: 5_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 100,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 2_500, requests: [1, 0, 5, 0, 1, 3, 0, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 2_500, requests: [0, 2, 5, 0, 2, 2, 0, 0, 0, 0] },
      ] },
    { number: 4, dialogueResource: 'T_CAMPAIGN_06_04', portraitAsset: 'portrait_pedro', delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 105,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 1, 2, 1, 3, 1, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 1, 2, 3, 1, 0, 0, 0] },
      ] },
    { number: 5, dialogueResource: 'T_CAMPAIGN_06_05', portraitAsset: 'portrait_indian', delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 105,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 2, 1, 3, 1, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 2_500, requests: [2, 1, 1, 0, 2, 3, 0, 1, 0, 0] },
      ] },
    { number: 6, dialogueResource: 'T_CAMPAIGN_06_06', portraitAsset: 'portrait_deserter', delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 105,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 2, 1, 3, 1, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 2_500, requests: [2, 1, 1, 0, 2, 3, 0, 1, 0, 0] },
      ] },
    { number: 7, dialogueResource: 'T_CAMPAIGN_06_07', portraitAsset: 'portrait_settlers', delayMs: 5_000, hitPointMultiplierPercent: 275, speedMultiplierPercent: 110,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 0, 1, 3, 2, 1, 0, 0] },
        { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 0, 2, 3, 2, 1, 0, 0] },
      ] },
    { number: 8, dialogueResource: 'T_CAMPAIGN_06_08', portraitAsset: 'portrait_pedro', delayMs: 5_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 110,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 1, 0, 2, 3, 2, 2, 0, 0] },
        { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 0, 2, 3, 2, 2, 0, 0] },
      ] },
    { number: 9, dialogueResource: 'T_CAMPAIGN_01_07', portraitAsset: 'portrait_pedro', delayMs: 5_000, hitPointMultiplierPercent: 350, speedMultiplierPercent: 115,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 2, 6, 2, 2, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 3, 6, 2, 2, 0, 0, 0] },
      ] },
    { number: 10, dialogueResource: 'T_CAMPAIGN_06_09', portraitAsset: 'portrait_pedro', delayMs: 5_000, hitPointMultiplierPercent: 360, speedMultiplierPercent: 120,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 2, 3, 4, 3, 2, 2, 0, 0] },
        { spawnPointId: 1, intervalMs: 2_500, requests: [1, 1, 2, 2, 3, 2, 2, 1, 0, 0] },
      ] },
  ]);
  assert.ok(murdockMountainsCampaignWaves.every(({ spawnPools }) => (
    spawnPools.every(({ requests }) => requests.length === 10 && requests[8] === 0 && requests[9] === 0)
  )));
});

test('player pool locations, pool types and first-wave inventory actions match map06', () => {
  assert.deepEqual(murdockMountainsUnitPool, {
    intervalMs: 15_000,
    units: [
      { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 },
      { poolType: 2, unitType: 'mexican', spawnLocationType: 1 },
      { poolType: 3, unitType: 'cannon', spawnLocationType: 2 },
      { poolType: 4, unitType: 'indian', spawnLocationType: 3 },
    ],
    spawnLocations: [
      { id: 'tipi', spawnLocationType: 3, cell: { x: 8, y: 2 } },
      { id: 'fort', spawnLocationType: 2, cell: { x: 1, y: 12 } },
      { id: 'saloon', spawnLocationType: 1, cell: { x: 3, y: 17 } },
    ],
    actions: [
      { waveNumber: 1, action: 'set', values: [1, 2, 3, 4].map((poolType) => ({ poolType, count: 0 })) },
      { waveNumber: 1, action: 'set-max', values: [7, 6, 4, 5].map((count, index) => ({ poolType: index + 1, count })) },
    ],
  });

  const runtime = createCampaignUnitPoolRuntime(murdockMountainsUnitPool)!;
  runtime.pending.fill(9);
  runtime.maximum.fill(8);
  applyCampaignUnitPoolActions(runtime, murdockMountainsUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [7, 6, 4, 5]);
});

test('Murdock Mountains content carries the map06 economy, difficulty, routes, crates and unlock snapshot', () => {
  const content = createMurdockMountainsCampaignContent([]);
  assert.equal(content.id, 'campaign-new-mexico-06');
  assert.equal(content.map.width, 17);
  assert.equal(content.map.height, 24);
  assert.equal(content.maxUpgrades, 2);
  assert.equal(content.formalSettlementSupported, true);
  assert.equal(content.previewWave?.initialCash, 250);
  assert.equal(content.previewWave?.initialLives, 50);
  assert.deepEqual(content.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75,
    medium: 100,
    hard: 125,
  });
  assert.equal(content.previewWave?.routes?.length, 2);
  assert.deepEqual(content.previewWave?.spawn, { cell: { x: 16, y: 4 }, direction: 'west' });
  assert.deepEqual(content.previewWave?.additionalSpawns, [{ cell: { x: 0, y: 5 }, direction: 'east' }]);
  assert.deepEqual(content.previewWave?.exit, { x: 9, y: 23 });
  assert.deepEqual(content.previewWave?.additionalExits, [{ x: 8, y: 23 }]);
  assert.equal(content.campaignWaveCount, 10);
  assert.equal(content.campaignWaves, murdockMountainsCampaignWaves);
  assert.equal(content.campaignUnitPool, murdockMountainsUnitPool);
  assert.deepEqual(content.campaignBonusCratePool, {
    totalCount: 999,
    intervalMs: 25_000,
    simultaneousLimit: 17,
    rewardTypeCount: 4,
  });

  const noProgressTypes = new Set(content.units.map(({ type }) => type));
  assert.deepEqual({
    gunslinger: content.units.filter(({ type }) => type === 'gunslinger').length,
    mexican: content.units.filter(({ type }) => type === 'mexican').length,
    cannon: content.units.filter(({ type }) => type === 'cannon').length,
    indian: content.units.filter(({ type }) => type === 'indian').length,
  }, { gunslinger: 3, mexican: 4, cannon: 2, indian: 5 });
  assert.equal(noProgressTypes.has('grandpa'), false);
  assert.equal(noProgressTypes.has('sniper'), false);
  assert.equal(noProgressTypes.has('pyromaniac'), false);
  assert.equal(noProgressTypes.has('salesman'), false);

  const progress = ['campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10'];
  const allUnits = createMurdockMountainsCampaignContent(progress).units;
  assert.equal(allUnits.length, 19);
  for (const type of ['grandpa', 'sniper', 'pyromaniac', 'salesman']) {
    assert.ok(allUnits.some((unit) => unit.type === type), `${type} appears at its completed-level milestone`);
  }
});

test('a short GameSession consumes map06 initial cash, wave delay, difficulty and right-side pool-zero spawn', async () => {
  const content = createMurdockMountainsCampaignContent([]);
  const session = await createGame({ scenarios: { [content.id]: content } }).open({
    scenarioId: content.id,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 42,
  });

  try {
    const initial = session.observe();
    assert.equal(session.startRecord.mode, 'free');
    assert.equal(initial.wave?.number, 1);
    assert.equal(initial.wave?.totalWaves, 10);
    assert.equal(initial.wave?.lives, 50);
    assert.equal(initial.wave?.cash, 250);
    assert.equal(initial.enemies.length, 0);

    let view = initial;
    for (let frame = 0; frame < 151; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.ok(view.enemies.length > 0, 'the 15-second opening delay produces the first real enemy requests');
    const waveOneHitPointsByType: Readonly<Record<number, number>> = {
      1: 189, 2: 189, 3: 630, 4: 2_100, 5: 3_150, 6: 5_250, 8: 2_100,
    };
    assert.ok(view.enemies.every(({ type, maxHitPoints }) => maxHitPoints === waveOneHitPointsByType[type]),
      'wave-one and easy-difficulty HP modifiers apply to each original enemy design');
    const firstEnemy = view.enemies[0]!;
    assert.ok(firstEnemy.positionFine.x > 9 * 7_680, 'wave one starts at pool zero on the right side of the map');
  } finally {
    session.close();
  }
});

test('Murdock Mountains dialogue preserves APK text, portrait and voice-resource routing', () => {
  assert.deepEqual(murdockMountainsWaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, voiceSound, text }) => ({
    waveNumber,
    dialogueResource,
    speaker: speaker.en,
    portraitAsset,
    voiceSound,
    en: text.en,
  })), [
    { waveNumber: 1, dialogueResource: 'T_CAMPAIGN_06_01', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: "The rugged Murdock Mountains couldn't be better for a good ol' traditional ambush!" },
    { waveNumber: 2, dialogueResource: 'T_CAMPAIGN_06_02', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: "Now we can promote our men to level 2 and we'll be able to stop a whole convoy of settlers with the Magnificent Seven!" },
    { waveNumber: 3, dialogueResource: 'T_CAMPAIGN_06_03', speaker: 'Settlers', portraitAsset: 'portrait_settlers', voiceSound: 'sound_siedler', en: "Hey! You there! Are you heading through the Murdock Mountains, too? Let's travel together." },
    { waveNumber: 4, dialogueResource: 'T_CAMPAIGN_06_04', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: "Travel together, huh? Together, you'll run right into our arms!" },
    { waveNumber: 5, dialogueResource: 'T_CAMPAIGN_06_05', speaker: 'Indian', portraitAsset: 'portrait_indian', voiceSound: 'sound_indian_hugh', en: 'Today is a good day to go hunting.' },
    { waveNumber: 6, dialogueResource: 'T_CAMPAIGN_06_06', speaker: 'Deserter', portraitAsset: 'portrait_deserter', voiceSound: 'sound_deserter_yes_sir', en: 'Sir, those civilians are coming with a wagon full of gold. We need more cannons to stop them!' },
    { waveNumber: 7, dialogueResource: 'T_CAMPAIGN_06_07', speaker: 'Settlers', portraitAsset: 'portrait_settlers', voiceSound: 'sound_siedler', en: "Did you hear that terrible crash in the mountains, too? Do you think there's a storm brewing?" },
    { waveNumber: 8, dialogueResource: 'T_CAMPAIGN_06_08', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: "No, don't worry. There isn't a cloud in the sky. No storm in sight. Just come to our arms..." },
    { waveNumber: 9, dialogueResource: 'T_CAMPAIGN_01_07', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: 'Ha ha! Those settlers might just about be able to found a tent camp!' },
    { waveNumber: 10, dialogueResource: 'T_CAMPAIGN_06_09', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: "Victory is near. They won't be able to hold out much longer!" },
  ]);
});

test('GameSession maps spawn-pool ID 1 to the map06 left-side entrance', async () => {
  const source = createMurdockMountainsCampaignContent([]);
  const content = {
    ...source,
    formalSettlementSupported: true,
    campaignWaveCount: 1,
    campaignWaves: [{
      ...murdockMountainsCampaignWaves[0]!,
      delayMs: 0,
      spawnPools: [{ spawnPointId: 1, intervalMs: 1, requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
    }],
  };
  const session = await createGame({ scenarios: { [content.id]: content } }).open({
    scenarioId: content.id,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 42,
  });

  try {
    const view = session.advance({ deltaMs: 100 });
    assert.ok(view.enemies.length > 0);
    assert.ok(view.enemies.every(({ positionFine }) => positionFine.x < 7 * 7_680),
      'pool 1 uses the left TDM entrance at cell (0,5)');
  } finally {
    session.close();
  }
});
