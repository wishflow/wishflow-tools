import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createGame } from '../src/game';
import {
  billyHillsCampaignId,
  billyHillsCampaignContentVersion,
  billyHillsPreviewWave,
  createBillyHillsCampaignContent,
} from '../src/content/billy-hills-campaign';
import { billyHillsCampaignWaves } from '../src/content/billy-hills-campaign-waves';
import { billyHillsUnitPool } from '../src/content/billy-hills-unit-pool';
import { billyHillsWaveIntros } from '../src/content/billy-hills-wave-intros';
import { newMexicoCampaignContentVersionFor } from '../src/content/new-mexico-replay-content-version';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Billy Hills campaign waves match the APK eight-wave records', () => {
  assert.deepEqual(billyHillsCampaignWaves.map(({ number, delayMs, hitPointMultiplierPercent, speedMultiplierPercent, spawnPools }) => ({
    number,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: spawnPools.map(({ spawnPointId, intervalMs, requests }) => ({ spawnPointId, intervalMs, requests })),
  })), [
    { number: 1, delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 100, spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [3, 4, 5, 5, 4, 2, 2, 1, 0, 0] },
    ] },
    { number: 2, delayMs: 5_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 100, spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [2, 2, 3, 4, 3, 2, 3, 1, 0, 0] },
    ] },
    { number: 3, delayMs: 5_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 105, spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [1, 2, 3, 4, 5, 3, 4, 2, 0, 0] },
    ] },
    { number: 4, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 95, spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [1, 2, 3, 2, 3, 2, 2, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [1, 2, 3, 2, 3, 1, 1, 1, 0, 0] },
    ] },
    { number: 5, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 110, spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 2, 1, 3, 1, 2, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 2, 3, 1, 1, 1, 0, 0] },
    ] },
    { number: 6, delayMs: 5_000, hitPointMultiplierPercent: 600, speedMultiplierPercent: 110, spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [0, 0, 0, 0, 10, 0, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [0, 0, 0, 0, 8, 0, 0, 0, 0, 0] },
    ] },
    { number: 7, delayMs: 5_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 115, spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [2, 2, 1, 1, 0, 4, 4, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [3, 1, 2, 1, 0, 4, 3, 1, 0, 0] },
    ] },
    { number: 8, delayMs: 5_000, hitPointMultiplierPercent: 350, speedMultiplierPercent: 120, spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [1, 2, 0, 1, 2, 4, 5, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [1, 1, 0, 0, 1, 4, 5, 2, 0, 0] },
    ] },
  ]);
  assert.ok(billyHillsCampaignWaves.every(({ spawnPools }) =>
    spawnPools.every(({ requests }) => requests.length === 10 && requests[8] === 0 && requests[9] === 0)));
});

test('Billy Hills player pool, buildings and wave-two inventory actions match the TDM', () => {
  assert.deepEqual(billyHillsUnitPool, {
    intervalMs: 15_000,
    units: [
      { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 },
      { poolType: 2, unitType: 'mexican', spawnLocationType: 1 },
      { poolType: 3, unitType: 'cannon', spawnLocationType: 2 },
      { poolType: 4, unitType: 'indian', spawnLocationType: 3 },
    ],
    spawnLocations: [
      { id: 'fort', spawnLocationType: 2, cell: { x: 22, y: 3 } },
      { id: 'saloon', spawnLocationType: 1, cell: { x: 8, y: 9 } },
      { id: 'tipi', spawnLocationType: 3, cell: { x: 2, y: 18 } },
    ],
    actions: [
      { waveNumber: 2, action: 'set', values: [1, 2, 3, 4].map((poolType) => ({ poolType, count: 0 })) },
      { waveNumber: 2, action: 'set-max', values: [1, 2, 3, 4].map((poolType) => ({ poolType, count: 5 })) },
    ],
  });
  const runtime = createCampaignUnitPoolRuntime(billyHillsUnitPool)!;
  runtime.pending.fill(9);
  runtime.maximum.fill(7);
  applyCampaignUnitPoolActions(runtime, billyHillsUnitPool, 2);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [5, 5, 5, 5]);
  assert.equal(runtime.pending.filter((count) => count !== 0).length, 0);
  assert.equal(runtime.maximum.filter((count) => count !== 0).length, 4);
});

test('Billy Hills dialogue preserves all APK English strings and resource references', () => {
  assert.deepEqual(billyHillsWaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, voiceSound, text }) => ({
    waveNumber,
    dialogueResource,
    speaker: speaker.en,
    portraitAsset,
    voiceSound,
    en: text.en,
    zh: text.zh,
  })), [
    { waveNumber: 1, dialogueResource: 'T_CAMPAIGN_05_01_POINTER', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: 'Now we can also promote our men. They will then inflict more damage and will be faster. To do this, select a unit and touch the icon on the bottom left!', zh: '现在我们也能给队伍成员升级了。升级后他们的伤害更高、速度更快。选中一名队员，再点左下角的图标即可！' },
    { waveNumber: 2, dialogueResource: 'T_CAMPAIGN_05_02', speaker: 'Settlers', portraitAsset: 'portrait_settlers', voiceSound: 'sound_siedler', en: 'Who knows where we should head? This is just one big maze!', zh: '谁知道我们该往哪儿走？这里简直就是一座大迷宫！' },
    { waveNumber: 3, dialogueResource: 'T_CAMPAIGN_05_03', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: 'If the settlers are full of lead, then our pockets are full of... money!', zh: '拓荒者的口袋装满了子弹，我们的口袋就装满了……钱！' },
    { waveNumber: 4, dialogueResource: 'T_CAMPAIGN_05_04', speaker: 'Settlers', portraitAsset: 'portrait_settlers', voiceSound: 'sound_siedler', en: 'I think I was holding the map the wrong way round! We have to go through the southern canyon.', zh: '我想我刚才把地图拿反了！我们得穿过南边的峡谷。' },
    { waveNumber: 5, dialogueResource: 'T_CAMPAIGN_05_05', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: "We'll show you the way to go. Just come here...", zh: '我们给你指条路。来这边吧……' },
    { waveNumber: 6, dialogueResource: 'T_CAMPAIGN_05_06', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: "Horses! Looks like there's a whole herd of them!", zh: '马！看起来那边有一整群马！' },
    { waveNumber: 7, dialogueResource: 'T_CAMPAIGN_03_07', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: 'Loot! Lots of lovely loot!', zh: '战利品！好多宝贝！' },
    { waveNumber: 8, dialogueResource: 'T_CAMPAIGN_05_07', speaker: 'Pedro', portraitAsset: 'portrait_pedro', voiceSound: 'sound_pedro', en: 'The rush of settlers seems to be dying down again. That must be the last for today.', zh: '拓荒者好像又少了起来。今天最后一批应该就是他们了。' },
  ]);

  for (const asset of ['portrait_pedro.png', 'portrait_settlers.png']) {
    const png = readFileSync(path.join(appRoot, 'public/assets', asset));
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
  }
  for (const sound of ['sound_pedro.ogg', 'sound_siedler.ogg']) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets/sounds', sound)), true);
  }
});

test('Billy Hills content uses the audited map parameters and milestone-gated units', () => {
  assert.equal(billyHillsCampaignId, 'campaign-new-mexico-05');
  assert.equal(billyHillsCampaignContentVersion, 'gng-free-1.8.6-new-mexico-05-formal-v1');

  const noProgress = createBillyHillsCampaignContent([]);
  assert.equal(noProgress.contentVersion, newMexicoCampaignContentVersionFor(billyHillsCampaignId, []));
  assert.equal(noProgress.map.width, 32);
  assert.equal(noProgress.map.height, 24);
  assert.equal(noProgress.maxUpgrades, 1);
  assert.equal(noProgress.previewWave?.initialCash, 250);
  assert.equal(noProgress.previewWave?.initialLives, 50);
  assert.deepEqual(noProgress.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75,
    medium: 150,
    hard: 200,
  });
  assert.deepEqual(noProgress.previewWave?.routes?.length, 5);
  assert.deepEqual(noProgress.previewWave?.additionalSpawns, [{ cell: { x: 0, y: 13 }, direction: 'east' }]);
  assert.deepEqual(noProgress.previewWave?.additionalExits, [{ x: 31, y: 8 }]);
  assert.equal(noProgress.campaignWaveCount, 8);
  assert.deepEqual(noProgress.campaignWaves, billyHillsCampaignWaves);
  assert.deepEqual(noProgress.campaignUnitPool, billyHillsUnitPool);
  assert.deepEqual(noProgress.campaignEnemy, {
    hitPoints: 18,
    cashReward: 1,
    penetration: { light: 100, fire: 50, heavy: 25, poison: 75 },
  });
  assert.deepEqual(noProgress.campaignEnemyByType, {
    3: { hitPoints: 60, cashReward: 2, penetration: { light: 100, fire: 50, heavy: 25, poison: 75 }, turningDurationMs: 100 },
    4: { hitPoints: 200, cashReward: 10, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 200 },
    5: { hitPoints: 300, cashReward: 15, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 100 },
    6: { hitPoints: 500, cashReward: 25, penetration: { light: 33, fire: 25, heavy: 100, poison: 100 }, turningDurationMs: 200 },
    8: { hitPoints: 200, cashReward: 0, penetration: { light: 100, fire: 100, heavy: 100, poison: 100 }, turningDurationMs: 100 },
  });
  assert.deepEqual(noProgress.campaignBonusCratePool, {
    totalCount: 999,
    intervalMs: 25_000,
    simultaneousLimit: 32,
    rewardTypeCount: 4,
  });

  const baseUnitTypes = new Set(noProgress.units.map(({ type }) => type));
  for (const type of ['gunslinger', 'mexican', 'cannon', 'indian']) assert.equal(baseUnitTypes.has(type), true);
  for (const type of ['sniper', 'grandpa', 'pyromaniac', 'salesman']) assert.equal(baseUnitTypes.has(type), false);
  assert.equal(noProgress.units.filter(({ type, activity }) =>
    (type === 'gunslinger' || type === 'mexican') && activity === 5).length, 2);

  const milestones: readonly { completed: readonly string[]; unlocked: readonly string[] }[] = [
    { completed: ['campaign-oregon-10'], unlocked: ['grandpa'] },
    { completed: ['campaign-oregon-10', 'campaign-dakota-10'], unlocked: ['grandpa', 'sniper'] },
    { completed: ['campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10'], unlocked: ['grandpa', 'sniper', 'pyromaniac'] },
    { completed: ['campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10'], unlocked: ['grandpa', 'sniper', 'pyromaniac', 'salesman'] },
  ];

  for (const { completed, unlocked } of milestones) {
    const unitTypes = new Set(createBillyHillsCampaignContent(completed).units.map(({ type }) => type));
    for (const type of unlocked) assert.equal(unitTypes.has(type), true, type + ' should unlock at its completed-level milestone');
  }

  const beforeMilestones: readonly { completed: readonly string[]; locked: 'grandpa' | 'sniper' | 'pyromaniac' | 'salesman' }[] = [
    { completed: ['campaign-new-mexico-10', 'campaign-mississippi-10'], locked: 'grandpa' },
    { completed: ['campaign-new-mexico-10', 'campaign-mississippi-10', 'campaign-oregon-10'], locked: 'sniper' },
    { completed: ['campaign-new-mexico-10', 'campaign-mississippi-10', 'campaign-oregon-10', 'campaign-dakota-10'], locked: 'pyromaniac' },
    { completed: ['campaign-new-mexico-10', 'campaign-mississippi-10', 'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10'], locked: 'salesman' },
  ];
  for (const { completed, locked } of beforeMilestones) {
    const unitTypes = new Set(createBillyHillsCampaignContent(completed).units.map(({ type }) => type));
    assert.equal(unitTypes.has(locked), false, locked + ' must stay locked before its completed-level milestone');
  }
});

test('free Billy Hills session starts the first wave from its original delay and upper entrance', async () => {
  const content = createBillyHillsCampaignContent([]);
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
    assert.equal(initial.wave?.totalWaves, 8);
    assert.equal(initial.wave?.phase, 'active');
    assert.equal(initial.wave?.lives, 50);
    assert.equal(initial.wave?.cash, 250);
    assert.equal(initial.routes?.length, 5);

    let view = initial;
    for (let frame = 0; frame < 151; frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }

    assert.ok(view.enemies.length > 0, 'the original 15-second first-wave delay must produce enemies');
    const firstEnemy = view.enemies[0]!;
    assert.ok(firstEnemy.positionFine.y < 13 * 7_680, 'wave 1 uses the upper TDM entrance at y=5, not lower entrance y=13');
    const firstWaveHitPointsByType: Readonly<Record<number, number>> = {
      1: 135, 2: 135, 3: 450, 4: 1_500, 5: 2_250, 6: 3_750, 8: 1_500,
    };
    for (const enemy of view.enemies) {
      assert.equal(enemy.maxHitPoints, firstWaveHitPointsByType[enemy.type], 'easy difficulty and wave-one HP values are applied');
      assert.ok(enemy.speed >= 450 && enemy.speed <= 545, 'base speed 500 uses the original 90–109% random speed range');
    }
  } finally {
    session.close();
  }
});

test('Billy Hills exposes only the researched first-wave route and two-source spawn geometry', () => {
  assert.deepEqual(billyHillsPreviewWave.spawn, { cell: { x: 0, y: 5 }, direction: 'east' });
  assert.deepEqual(billyHillsPreviewWave.additionalSpawns, [{ cell: { x: 0, y: 13 }, direction: 'east' }]);
  assert.equal(billyHillsPreviewWave.routes?.length, 5);
  assert.deepEqual(billyHillsPreviewWave.exit, { x: 31, y: 7 });
  assert.deepEqual(billyHillsPreviewWave.additionalExits, [{ x: 31, y: 8 }]);
});
