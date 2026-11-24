import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import map from '../src/content/dakota-10.json';
import {
  dakota10BaseEnemy,
  dakota10BonusCratePool,
  dakota10CampaignAwesomeEnemyTypeThreshold,
  dakota10EnemyByType,
  dakota10LevelParameters,
  dakota10MaxUpgrades,
  dakota10PreviewWave,
  dakota10RawLevelParameters,
} from '../src/content/dakota-10-campaign-rules';
import { dakota10CampaignSpawnRequestCount, dakota10CampaignWaves } from '../src/content/dakota-10-campaign-waves';
import { createDakota10CampaignContentFromSnapshot } from '../src/content/dakota-10-campaign';
import { dakota10CampaignCopy, dakota10CampaignCopyResources } from '../src/content/dakota-10-campaign-copy';
import {
  dakota10CampaignContentVersionForSnapshot,
  dakota10CampaignUnlockSnapshotFor,
  parseDakota10ReplayContentVersion,
} from '../src/content/dakota-10-content-version';
import { dakota10CampaignUnitPool } from '../src/content/dakota-10-unit-pool';
import { dakota10SpawnPointIdByActionId, dakota10RouteDefinitions } from '../src/content/dakota-10-routes';
import { dakota10WaveIntros, dakota10CampaignPortraitAssets } from '../src/content/dakota-10-wave-intros';
import { dakota10AmbientMusic, dakota10BattleMusicForWave, dakota10BattleMusicLoops } from '../src/content/dakota-10-music';
import {
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
} from '../src/game/campaign-unit-pool';
import { createGame, type CampaignWaveDefinition } from '../src/game';

interface ExpectedPool {
  actionId: number;
  intervalMs: number;
  counts: readonly number[];
  bossCount?: number;
  docCount?: number;
}

interface ExpectedWave {
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  pools: readonly ExpectedPool[];
}

// Independently transcribed from GameDesignWaves.setWaves(i == 40).
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 115, speedMultiplierPercent: 120,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [2, 3, 4, 5, 3, 2, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 125,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [1, 2, 3, 4, 5, 2, 2, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 130,
    pools: [
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 3, 4, 3, 4, 2, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 2, 3, 4, 3, 4, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 155, speedMultiplierPercent: 135,
    pools: [
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 3, 4, 3, 4, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 2, 3, 4, 3, 4, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 140,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 2, 3, 4, 3, 4, 3, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 2, 3, 4, 3, 5, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 2, 3, 4, 3, 4, 3, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 2, 3, 2, 2, 3, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 1, 2, 3, 1, 3, 3, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 1, 2, 3, 2, 4, 3, 1] },
      { actionId: 3, intervalMs: 3_000, counts: [0, 1, 2, 3, 1, 4, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 2, 3, 2, 2, 3, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 1, 2, 3, 1, 3, 3, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 1, 2, 3, 2, 4, 3, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 1, 2, 3, 1, 4, 3, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 0, 1, 3, 2, 2, 3, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 1, 3, 1, 3, 3, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 0, 1, 3, 2, 4, 3, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 0, 2, 3, 1, 3, 2, 1] },
      { actionId: 4, intervalMs: 3_000, counts: [0, 1, 2, 3, 3, 3, 1, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 210, speedMultiplierPercent: 160,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 0, 1, 3, 1, 2, 3, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 1, 3, 1, 4, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 0, 1, 3, 1, 2, 3, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 0, 2, 3, 1, 2, 2, 1] },
      { actionId: 4, intervalMs: 2_500, counts: [0, 1, 2, 3, 1, 2, 1, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 240, speedMultiplierPercent: 165,
    pools: [{ actionId: 1, intervalMs: 500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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

function expectedWaves() {
  return expectedWaveRows.map(({ delayMs, hitPointMultiplierPercent, speedMultiplierPercent, pools }, index) => ({
    number: index + 1,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: pools.map(({ actionId, intervalMs, counts, bossCount = 0, docCount = 0 }) => (
      [dakota10SpawnPointIdByActionId[actionId], intervalMs, [...counts, bossCount, docCount]] as const
    )),
  }));
}

const fullyUnlockedSnapshot = {
  unitUnlocks: { grandpa: true, sniper: true, pyromaniac: true, salesman: true },
  dynamiteUnlocked: true,
} as const;

test('Sioux Falls preserves level row 39 and applies only confirmed parameters', () => {
  assert.deepEqual(dakota10RawLevelParameters,
    [250, 25, 999, 25_000, 3, 30_000, 5, 15, 56, 75, 110, 119_000]);
  assert.deepEqual(dakota10LevelParameters, {
    initialCash: 250,
    initialLives: 25,
    maxChests: 999,
    chestTimeMs: 25_000,
    maxUpgrades: 3,
    reservedParameter5: 30_000,
    awesomeMessageUnit: 5,
    maxChestsPlayfield: 15,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 56, medium: 75, hard: 110 },
    gamblerTimeMs: 119_000,
  });
  assert.equal(dakota10MaxUpgrades, 3);
  assert.equal(dakota10CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(dakota10BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(dakota10PreviewWave.initialCash, 250);
  assert.equal(dakota10PreviewWave.initialLives, 25);
  assert.deepEqual(dakota10PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 56, medium: 75, hard: 110,
  });
  assert.equal(dakota10PreviewWave.enemy, dakota10BaseEnemy);
  assert.ok(dakota10EnemyByType);
  assert.equal(dakota10RouteDefinitions.length, 9);
  assert.deepEqual(dakota10SpawnPointIdByActionId, { 0: 1, 1: 0, 2: 3, 3: 4, 4: 2 });
});

test('Sioux Falls preserves all 10 APK wave headers and 28 source-ordered request pools', () => {
  assert.deepEqual(dakota10CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(dakota10CampaignWaves.length, 10);
  assert.equal(dakota10CampaignSpawnRequestCount, 28);
  assert.ok(dakota10CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(dakota10CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)),
    'the APK addToWave overload fills the final Doc slot with zero');
  assert.deepEqual(dakota10CampaignWaves[9]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'Wave 10 requests one Boss in slot 9');
});

test('Sioux Falls pool actions and hiring locations follow the APK map and Wave 1 actions', () => {
  assert.deepEqual(dakota10CampaignUnitPool.spawnLocations.map(({ id, spawnLocationType, cell }) => ({
    id, spawnLocationType, x: cell.x, y: cell.y,
  })), [
    { id: 'fort-30-1', spawnLocationType: 2, x: 30, y: 1 },
    { id: 'saloon-23-10', spawnLocationType: 1, x: 23, y: 10 },
    { id: 'tipi-1-19', spawnLocationType: 3, x: 1, y: 19 },
  ]);
  assert.deepEqual(dakota10CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType }) => ({
    poolType, unitType, spawnLocationType,
  })), [
    { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 },
    { poolType: 2, unitType: 'mexican', spawnLocationType: 1 },
    { poolType: 3, unitType: 'cannon', spawnLocationType: 2 },
    { poolType: 4, unitType: 'indian', spawnLocationType: 3 },
  ]);

  const runtime = createCampaignUnitPoolRuntime(dakota10CampaignUnitPool)!;
  applyCampaignUnitPoolActions(runtime, dakota10CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [4, 4, 4, 4]);

  assert.equal(dakota10CampaignUnitPool.intervalMs, 15_000);
});

test('Sioux Falls initializes exact TDM units, unlock gates, Dynamite, and the combined Steamer', () => {
  const locked = createDakota10CampaignContentFromSnapshot({
    unitUnlocks: { grandpa: false, sniper: false, pyromaniac: false, salesman: false },
    dynamiteUnlocked: false,
  });
  const unlocked = createDakota10CampaignContentFromSnapshot(fullyUnlockedSnapshot);

  assert.equal(locked.units.filter(({ type, activity }) => activity === 4 && type !== 'steamer-32').length, 34);
  assert.equal(locked.units.filter(({ type }) => type === 'sniper').length, 1, 'raw marker 108 creates an active Sniper');
  assert.equal(locked.units.filter(({ type }) => type === 'grandpa').length, 0, 'raw marker 101 stays locked without the level-30 gate');
  assert.equal(locked.units.some(({ type }) => type === 'pyromaniac' || type === 'salesman'), false);
  assert.deepEqual(locked.dynamite, {
    unlocked: false,
    pairs: [{ id: 'dynamite-1', triggerCell: { x: 24, y: 4 }, boxCell: { x: 25, y: 5 } }],
  });

  assert.equal(unlocked.units.filter(({ type }) => type === 'gunslinger').length, 11);
  assert.equal(unlocked.units.filter(({ type }) => type === 'mexican').length, 9);
  assert.equal(unlocked.units.filter(({ type }) => type === 'cannon').length, 6);
  assert.equal(unlocked.units.filter(({ type }) => type === 'indian').length, 8);
  assert.equal(unlocked.units.filter(({ type }) => type === 'grandpa').length, 5);
  assert.equal(unlocked.units.filter(({ type }) => type === 'sniper').length, 1);
  assert.equal(unlocked.units.filter(({ type }) => type === 'pyromaniac').length, 1);
  assert.equal(unlocked.units.filter(({ type }) => type === 'salesman').length, 1);
  assert.equal(unlocked.dynamite?.unlocked, true);
  assert.deepEqual(unlocked.dynamite?.pairs, [
    { id: 'dynamite-1', triggerCell: { x: 24, y: 4 }, boxCell: { x: 25, y: 5 } },
  ]);

  const steamer = unlocked.units.filter(({ movementGroupId }) => movementGroupId?.startsWith('dakota-10-steamer-'));
  assert.equal(steamer.length, 5);
  assert.deepEqual(steamer.map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]), [
    ['steamer-30', 5, 14, 20],
    ['steamer-31', 5, 15, 20],
    ['steamer-32', 4, 16, 20],
    ['steamer-32', 4, 17, 20],
    ['steamer-33', 5, 18, 20],
  ]);
  assert.ok(steamer.every(({ movementSurface, movementAxis }) => movementSurface === 'water' && movementAxis === 'horizontal'));
  assert.ok(map.originalTileGrid.flat().includes(108));
});

test('Sioux Falls content snapshots preserve unit and Dynamite gates canonically', () => {
  assert.deepEqual(dakota10CampaignUnlockSnapshotFor([]), {
    unitUnlocks: { grandpa: false, sniper: false, pyromaniac: false, salesman: false },
    dynamiteUnlocked: false,
  });
  assert.deepEqual(dakota10CampaignUnlockSnapshotFor(['campaign-oregon-10']), {
    unitUnlocks: { grandpa: true, sniper: false, pyromaniac: false, salesman: false },
    dynamiteUnlocked: true,
  });
  const version = dakota10CampaignContentVersionForSnapshot(fullyUnlockedSnapshot);
  assert.deepEqual(parseDakota10ReplayContentVersion(version), { snapshot: fullyUnlockedSnapshot });
  assert.equal(parseDakota10ReplayContentVersion(`${version}-extra`), undefined);
  assert.equal(parseDakota10ReplayContentVersion('gng-free-1.8.6-dakota-09-formal-v1'), undefined);
});

test('Sioux Falls campaign copy, ten APK dialogue strings, portraits, and Dakota music are complete', () => {
  assert.deepEqual(dakota10CampaignCopyResources, {
    title: 'T_LEVEL_NAME_43', overview: 'T_LEVEL_INFO_43',
  });
  assert.deepEqual(dakota10CampaignCopy.title, { en: 'Sioux Falls', zh: '苏福尔斯' });
  assert.deepEqual(dakota10WaveIntros.map(({ dialogueResource, waveNumber }) => [dialogueResource, waveNumber]),
    Array.from({ length: 10 }, (_, index) => [`T_CAMPAIGN_40_${String(index + 1).padStart(2, '0')}`, index + 1]));
  assert.deepEqual(dakota10WaveIntros.map(({ text }) => text.en), [
    '"It\'s very wet here, Boss! Can we do some cliff diving later?"',
    '"You want to jump off the cliff? Go ahead! I won\'t stop you!"',
    'Sweetheart, I bet you just want to admire our muscular torsos when we jump off the cliffs!',
    'Sure… Especially when your torsos hit the rocks down there!',
    'Rocks? What rocks? I thought we were looking for gold!',
    'Settlers ahead in the south-west! Load the cannons!',
    '"It\'s full of settlers here! Maybe I should go straight and get paid for driving passengers with my train!"',
    '"You want to go straight? Go ahead! Then I can rob you after the end of every working day, and we\'re all happy!"',
    'Dakota, gather for the final battle!',
    '"Bunch of scoundrels, you\'ll never get me! Dakota will never be yours! This is all nationalized!"',
  ]);
  assert.deepEqual(dakota10WaveIntros.map(({ portraitAsset }) => portraitAsset), [
    'portrait_pedro',
    'oregon_dakota_portrait_calamity',
    'portrait_gunslinger',
    'oregon_dakota_portrait_calamity',
    'oregon_dakota_portrait_geezer',
    'portrait_captain',
    'portrait_engineer',
    'oregon_dakota_portrait_calamity',
    'portrait_indian',
    'oregon_dakota_portrait_boss',
  ]);
  assert.deepEqual(dakota10CampaignPortraitAssets, [
    'portrait_pedro',
    'oregon_dakota_portrait_calamity',
    'portrait_gunslinger',
    'oregon_dakota_portrait_geezer',
    'portrait_captain',
    'portrait_engineer',
    'portrait_indian',
    'oregon_dakota_portrait_boss',
  ]);
  assert.ok(dakota10CampaignPortraitAssets.every((asset) => existsSync(new URL(`../public/assets/${asset}.png`, import.meta.url))));

  assert.equal(dakota10AmbientMusic, 'music_atmo_snow');
  assert.deepEqual(dakota10BattleMusicLoops, ['music_dakota', 'music_loop2', 'music_loop3']);
  assert.deepEqual([0, 1, 2, 3].map(dakota10BattleMusicForWave), [
    'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota',
  ]);
  assert.throws(() => dakota10BattleMusicForWave(-1), RangeError);
});

test('Sioux Falls Wave 1 spawns through APK action 1 without completing the level', async () => {
  const content = createDakota10CampaignContentFromSnapshot(fullyUnlockedSnapshot);
  const session = await createGame({ scenarios: { [content.id]: content } }).open({
    scenarioId: content.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 4_043,
  });

  try {
    assert.equal(session.observe().wave?.number, 1);
    assert.equal(session.observe().wave?.totalWaves, 10);
    assert.equal(session.observe().wave?.cash, 250);
    assert.equal(session.observe().wave?.lives, 25);

    let firstSpawn: { spawnPointId: number; requestType: number; waveNumber: number } | undefined;
    for (let frame = 0; frame < 220 && firstSpawn === undefined; frame += 1) {
      const view = session.advance({ deltaMs: 100 });
      const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned');
      if (event?.type === 'enemy-group-spawned' && event.waveNumber === 1) firstSpawn = event;
    }
    assert.ok(firstSpawn);
    assert.equal(firstSpawn.waveNumber, 1);
    assert.equal(firstSpawn.spawnPointId, dakota10SpawnPointIdByActionId[1]);
    assert.equal(firstSpawn.spawnPointId, 0, 'APK action 1 maps to Sioux Falls row-major spawn point 0');
    assert.ok([1, 2, 3, 4, 5, 6].includes(firstSpawn.requestType),
      'the non-zero Wave 1 request slots are selected by the game session');
  } finally {
    session.close();
  }
});
