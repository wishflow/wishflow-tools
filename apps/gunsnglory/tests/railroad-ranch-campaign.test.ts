import assert from 'node:assert/strict';
import test from 'node:test';
import { createRailroadRanchCampaignContent, railroadRanchPreviewWave } from '../src/content/railroad-ranch-campaign';
import { railroadRanchCampaignWaves } from '../src/content/railroad-ranch-campaign-waves';
import { createGame } from '../src/game';

const expectedWaves = [
  { delay: 15_000, hp: 150, speed: 100, pools: [[0, 2_000, [1, 1, 1, 1, 3, 2, 0, 0, 0, 0]]] },
  { delay: 5_000, hp: 275, speed: 105, pools: [[0, 2_000, [1, 1, 1, 1, 1, 3, 0, 0, 0, 0]]] },
  { delay: 10_000, hp: 300, speed: 105, pools: [[0, 2_000, [0, 0, 1, 1, 2, 3, 2, 0, 0, 0]]] },
  { delay: 5_000, hp: 200, speed: 110, pools: [[0, 2_500, [1, 0, 2, 2, 3, 3, 1, 0, 0, 0]], [1, 2_500, [1, 0, 2, 2, 3, 3, 1, 0, 0, 0]]] },
  { delay: 5_000, hp: 250, speed: 110, pools: [[0, 2_500, [0, 0, 1, 2, 2, 3, 1, 0, 0, 0]], [1, 2_500, [0, 0, 1, 2, 2, 2, 0, 0, 0, 0]]] },
  { delay: 5_000, hp: 275, speed: 115, pools: [[0, 2_500, [0, 0, 1, 2, 2, 2, 1, 1, 0, 0]], [1, 2_500, [0, 0, 1, 2, 2, 1, 0, 0, 0, 0]]] },
  { delay: 5_000, hp: 275, speed: 120, pools: [[0, 2_500, [0, 0, 1, 0, 0, 3, 1, 1, 0, 0]], [1, 2_500, [0, 0, 2, 1, 0, 3, 1, 1, 0, 0]]] },
] as const;

test('uses the original level-nine economy, lives, difficulty values, upgrades, and hireable train units', () => {
  const content = createRailroadRanchCampaignContent();

  assert.equal(content.id, 'campaign-new-mexico-09');
  assert.equal(content.map.width, 32);
  assert.equal(content.map.height, 24);
  assert.equal(content.maxUpgrades, 3);
  assert.equal(content.previewWave?.initialCash, 600);
  assert.equal(content.previewWave?.initialLives, 25);
  assert.deepEqual(content.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75,
    medium: 100,
    hard: 125,
  });
  assert.equal(content.campaignAwesomeEnemyTypeThreshold, 5);
  assert.equal(content.campaignWaveCount, 7);
  assert.equal(content.campaignWaves, railroadRanchCampaignWaves);
  assert.equal(content.campaignBonusCratePool, undefined, 'the original level has no bonus chests');
  assert.equal(content.campaignUnitPool, undefined, 'GameDesignWaves has no SpawnPoolManager actions for level nine');
  assert.equal(content.recruitableUnits, undefined, 'the original map has no recruitment-building pool');
  assert.equal(content.units.length, 25);
  assert.equal(content.units.filter(({ activity }) => activity === 4).length, 11);
  assert.ok(content.units.filter(({ activity }) => activity === 4).every(({ hirePrice }) => hirePrice === 125));
  assert.ok(content.units.every(({ type }) => type.startsWith('train-')));
});

test('matches all seven APK wave delays, multipliers, intervals, pools, and eight original request slots', () => {
  assert.deepEqual(railroadRanchCampaignWaves.map(({ number, delayMs, hitPointMultiplierPercent,
    speedMultiplierPercent, spawnPools }) => ({
    number,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: spawnPools.map(({ spawnPointId, intervalMs, requests }) => [spawnPointId, intervalMs, requests]),
  })), expectedWaves.map((wave, index) => ({
    number: index + 1,
    delayMs: wave.delay,
    hitPointMultiplierPercent: wave.hp,
    speedMultiplierPercent: wave.speed,
    spawnPools: wave.pools,
  })));
  assert.equal(railroadRanchCampaignWaves.length, 7);
  assert.equal(railroadRanchCampaignWaves.reduce((total, wave) => total + wave.spawnPools.length, 0), 11);
  assert.ok(railroadRanchCampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
});

test('opens a short isolated session for every wave and spawns at each configured right-side pool', async () => {
  const content = createRailroadRanchCampaignContent();

  for (const sourceWave of railroadRanchCampaignWaves) {
    const selectedWave = { ...sourceWave, number: 1, delayMs: 0 };
    const isolatedContent = {
      ...content,
      campaignWaves: [selectedWave],
      campaignWaveCount: 1,
    };
    const spawnCells = [
      railroadRanchPreviewWave.spawn,
      ...(railroadRanchPreviewWave.additionalSpawns ?? []),
    ];
    const expectedSpawnRows = [...new Set(sourceWave.spawnPools.map(({ spawnPointId }) => spawnCells[spawnPointId]!.cell.y))];

    const session = await createGame({ scenarios: { [content.id]: isolatedContent } }).open({
      scenarioId: content.id,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: sourceWave.number + 17,
    });
    try {
      const initial = session.observe();
      assert.equal(initial.wave?.number, 1);
      assert.equal(initial.wave?.totalWaves, 1);
      assert.equal(initial.wave?.lives, 25);
      assert.equal(initial.wave?.cash, 600);
      assert.equal(initial.enemies.length, 0);

      const firstTick = session.advance({ deltaMs: 100 });
      assert.ok(firstTick.enemies.length > 0, 'wave ' + sourceWave.number + ' spawns after its delay');
      const spawnedRows = [...new Set(firstTick.enemies.map(({ positionFine }) => Math.floor(positionFine.y / 7_680)))].sort((a, b) => a - b);
      assert.deepEqual(spawnedRows, expectedSpawnRows.sort((a, b) => a - b), 'wave ' + sourceWave.number + ' spawn pool IDs map to the original spawns');
    } finally {
      session.close();
    }
  }
});

test('keeps the original 15-second opening delay before wave one starts spawning', async () => {
  const content = createRailroadRanchCampaignContent();
  const session = await createGame({ scenarios: { [content.id]: content } }).open({
    scenarioId: content.id,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 27,
  });
  try {
    let view = session.observe();
    for (let frame = 0; frame < 150; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.equal(view.enemies.length, 0);
    view = session.advance({ deltaMs: 100 });
    assert.ok(view.enemies.length > 0);
  } finally {
    session.close();
  }
});
