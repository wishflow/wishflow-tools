import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { techTownLevelFourContent, createTechTownCampaignContent, techTownPreviewWave } from '../src/content/tech-town-campaign';
import { techTownCampaignWaves } from '../src/content/tech-town-campaign-waves';
import { techTownRouteDefinitions } from '../src/content/tech-town-routes';
import { techTownUnitPool } from '../src/content/tech-town-unit-pool';
import { officialCampaignStages, techTownLevelFourCampaignContent } from '../src/content/official-campaign';

test('formal Tech Town content connects the researched map, routes and all level parameters', () => {
  const content = techTownLevelFourCampaignContent;
  assert.equal(content.id, 'campaign-new-mexico-04');
  assert.equal(content.contentVersion, 'gng-free-1.8.6-new-mexico-04-formal-v1');
  assert.equal(content.formalSettlementSupported, true);
  assert.equal(content.title.en, 'Tech Town · Level 4');
  assert.equal(content.title.zh, '科技镇 · 第 4 关');
  assert.equal(content.map.width, 32);
  assert.equal(content.map.height, 24);
  assert.equal(content.originalTileGrid?.length, 24);
  assert.deepEqual(content.previewWave, techTownPreviewWave);
  assert.equal(content.previewWave?.initialLives, 50);
  assert.equal(content.previewWave?.initialCash, 300);
  assert.deepEqual(content.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75,
    medium: 150,
    hard: 188,
  });
  assert.deepEqual(content.previewWave?.routes, techTownRouteDefinitions);
  assert.equal(content.previewWave?.routes?.length, 4);
  assert.equal(content.previewWave?.additionalSpawns?.length, 3);
  assert.deepEqual(content.previewWave?.additionalExits, [{ x: 31, y: 18 }]);
  assert.equal(content.maxUpgrades, 0);
  assert.equal(content.campaignWaveCount, 8);
  assert.deepEqual(content.campaignWaves, techTownCampaignWaves);
  assert.deepEqual(content.campaignEnemy, {
    hitPoints: 18,
    cashReward: 1,
    penetration: { light: 100, fire: 50, heavy: 25, poison: 75 },
  });
  assert.deepEqual(content.campaignEnemyByType, {
    3: { hitPoints: 60, cashReward: 2, penetration: { light: 100, fire: 50, heavy: 25, poison: 75 }, turningDurationMs: 100 },
    4: { hitPoints: 200, cashReward: 10, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 200 },
    5: { hitPoints: 300, cashReward: 15, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 100 },
    6: { hitPoints: 500, cashReward: 25, penetration: { light: 33, fire: 25, heavy: 100, poison: 100 }, turningDurationMs: 200 },
    8: { hitPoints: 200, cashReward: 0, penetration: { light: 100, fire: 100, heavy: 100, poison: 100 }, turningDurationMs: 100 },
  });
  assert.deepEqual(content.campaignBonusCratePool, {
    totalCount: 999,
    intervalMs: 25_000,
    simultaneousLimit: 32,
    rewardTypeCount: 4,
  });
});

test('Tech Town player pool is placed at the original buildings and configured for wave two', () => {
  assert.deepEqual(techTownUnitPool, {
    intervalMs: 15_000,
    units: [
      { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 },
      { poolType: 2, unitType: 'mexican', spawnLocationType: 1 },
      { poolType: 3, unitType: 'cannon', spawnLocationType: 2 },
      { poolType: 4, unitType: 'indian', spawnLocationType: 3 },
    ],
    spawnLocations: [
      { id: 'saloon', spawnLocationType: 1, cell: { x: 13, y: 3 } },
      { id: 'tipi', spawnLocationType: 3, cell: { x: 5, y: 17 } },
      { id: 'fort', spawnLocationType: 2, cell: { x: 22, y: 20 } },
    ],
    actions: [
      { waveNumber: 2, action: 'set', values: [1, 2, 3, 4].map((poolType) => ({ poolType, count: 0 })) },
      { waveNumber: 2, action: 'set-max', values: [1, 2, 3, 4].map((poolType) => ({ poolType, count: 5 })) },
    ],
  });
});

test('the first level-four visit exposes the ordinary pool and gates later map units', () => {
  const locked = createTechTownCampaignContent([]);
  const availableTypes = new Set(techTownLevelFourContent.units.map(({ type }) => type));

  assert.equal(locked.units.some(({ type }) => ['gunslinger', 'mexican', 'cannon', 'indian'].includes(type)), false);
  for (const type of ['gunslinger', 'mexican', 'cannon', 'indian']) assert.equal(availableTypes.has(type), true);
  for (const type of ['sniper', 'grandpa', 'gambler', 'pyromaniac', 'salesman']) assert.equal(availableTypes.has(type), false);
  assert.equal(techTownLevelFourContent.map.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false);
  assert.equal(techTownLevelFourContent.gambler, undefined);
});

test('Tech Town replay unlocks placed specials from the matching completed campaign milestones', () => {
  const milestoneProfiles: readonly { completed: readonly string[]; types: readonly string[] }[] = [
    { completed: ['campaign-oregon-10'], types: ['grandpa'] },
    { completed: ['campaign-oregon-10', 'campaign-dakota-10'], types: ['grandpa', 'sniper'] },
    {
      completed: ['campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10'],
      types: ['grandpa', 'sniper', 'pyromaniac', 'gambler'],
    },
    {
      completed: ['campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10'],
      types: ['grandpa', 'sniper', 'pyromaniac', 'gambler', 'salesman'],
    },
  ];

  for (const { completed, types } of milestoneProfiles) {
    const content = createTechTownCampaignContent(['campaign-new-mexico-03', ...completed]);
    const unitTypes = new Set(content.units.map(({ type: unitType }) => unitType));
    for (const type of types) assert.equal(unitTypes.has(type), true, `${type} should unlock from profile history`);
    if (types.includes('gambler')) {
      assert.equal(content.map.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), true);
      assert.deepEqual(content.gambler?.unlockedPrizeUnitTypes, types.includes('salesman')
        ? [1, 2, 3, 4, 5, 6, 35, 36]
        : [1, 2, 3, 4, 5, 6, 35]);
    }
  }
});

test('browser registry opens the actual formal Tech Town with its original starting state', async () => {
  assert.equal(getBrowserScenarioContentVersion(techTownLevelFourContent.id), techTownLevelFourContent.contentVersion);
  assert.deepEqual(officialCampaignStages.at(-1), {
    scenarioId: techTownLevelFourContent.id,
    contentVersion: techTownLevelFourContent.contentVersion,
    title: techTownLevelFourContent.title,
    globalLevel: 4,
    requiresCompletedScenarioIds: ['campaign-new-mexico-03'],
  });

  const session = await createBrowserGame([
    'campaign-new-mexico-01',
    'campaign-new-mexico-02',
    'campaign-new-mexico-03',
  ]).open({
    scenarioId: techTownLevelFourContent.id,
    contentVersion: techTownLevelFourContent.contentVersion,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 42,
  });

  try {
    const view = session.observe();
    assert.equal(session.startRecord.mode, 'formal');
    assert.equal(session.startRecord.scenarioId, techTownLevelFourContent.id);
    assert.equal(view.map.width, 32);
    assert.equal(view.map.height, 24);
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.phase, 'active');
    assert.equal(view.wave?.lives, 50);
    assert.equal(view.wave?.cash, 300);
    assert.equal(view.routes?.length, 4);
    assert.equal(view.units.some(({ type }) => type === 'gambler'), false);
    assert.equal(view.bonusCratePool?.remainingCount, 999);

    let spawned = false;
    for (let frame = 0; frame < 151; frame += 1) {
      const advanced = session.advance({ deltaMs: 100 });
      if (advanced.enemies.length > 0) spawned = true;
    }
    assert.equal(spawned, true, 'the actual formal first wave starts after its 15-second delay');
  } finally {
    session.close();
  }
});
