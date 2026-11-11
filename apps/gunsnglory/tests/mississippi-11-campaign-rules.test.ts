import assert from 'node:assert/strict';
import test from 'node:test';
import { createMississippi11MapScene } from '../src/content/mississippi-11-scene';
import { createMississippi11SteamerUnits } from '../src/content/mississippi-11-steamer';
import { createMississippi11TrainUnits } from '../src/content/mississippi-11-trains';
import { createMississippi11MapUnits } from '../src/content/mississippi-11-units';
import map from '../src/content/mississippi-11.json';
import {
  mississippi11BaseEnemy,
  mississippi11BonusCratePool,
  mississippi11CampaignAwesomeEnemyTypeThreshold,
  mississippi11EnemyByType,
  mississippi11MaxUpgrades,
  mississippi11PreviewWave,
} from '../src/content/mississippi-11-campaign-rules';
import { mississippi11RouteDefinitions } from '../src/content/mississippi-11-routes';
import { createGame, type GameDifficulty, type ScenarioContent } from '../src/game';

function createRulesScenario(): ScenarioContent {
  return {
    id: 'mississippi-11-rules-test',
    contentVersion: 'mississippi-11-rules-test-v1',
    formalSettlementSupported: false,
    title: { en: "Traveller's Town", zh: '旅行者小镇' },
    map: createMississippi11MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createMississippi11MapUnits(),
      ...createMississippi11TrainUnits(),
      ...createMississippi11SteamerUnits(),
    ],
    maxUpgrades: mississippi11MaxUpgrades,
    previewWave: mississippi11PreviewWave,
    campaignBonusCratePool: mississippi11BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi11CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi11BaseEnemy,
    campaignEnemyByType: mississippi11EnemyByType,
  };
}

test('Traveller’s Town level rules preserve APK economy, global enemy designs, and no player spawn pool', () => {
  const scenario = createRulesScenario();

  assert.equal(scenario.maxUpgrades, 3);
  assert.equal(scenario.previewWave?.initialCash, 365);
  assert.equal(scenario.previewWave?.initialLives, 25);
  assert.deepEqual(scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75, medium: 100, hard: 120,
  });
  assert.equal(scenario.campaignBonusCratePool?.totalCount, 999);
  assert.equal(scenario.campaignBonusCratePool?.intervalMs, 25_000);
  assert.equal(scenario.campaignBonusCratePool?.simultaneousLimit, 12);
  assert.equal(scenario.campaignBonusCratePool?.rewardTypeCount, 4);
  assert.equal(scenario.campaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(scenario.campaignEnemy, {
    hitPoints: 18,
    cashReward: 1,
    penetration: { light: 100, fire: 50, heavy: 25, poison: 75 },
  });
  assert.deepEqual(scenario.campaignEnemyByType, {
    3: { hitPoints: 60, cashReward: 2, penetration: { light: 100, fire: 50, heavy: 25, poison: 75 }, turningDurationMs: 100 },
    4: { hitPoints: 200, cashReward: 10, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 200 },
    5: { hitPoints: 300, cashReward: 15, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 100 },
    6: { hitPoints: 500, cashReward: 25, penetration: { light: 33, fire: 25, heavy: 100, poison: 100 }, turningDurationMs: 200 },
    8: { hitPoints: 200, cashReward: 0, penetration: { light: 100, fire: 100, heavy: 100, poison: 100 }, turningDurationMs: 100 },
  });
  assert.equal(scenario.campaignUnitPool, undefined, 'map14 has no player spawn-pool actions');
  assert.equal(scenario.gambler, undefined, 'map14 has no gambler marker 132');
  assert.equal(mississippi11RouteDefinitions.length, 13);
  assert.deepEqual(scenario.previewWave?.routes, mississippi11RouteDefinitions);
  assert.deepEqual([scenario.previewWave?.spawn, ...(scenario.previewWave?.additionalSpawns ?? [])].map(({ cell }) => [cell.x, cell.y]), [
    [0, 15], [0, 16], [31, 15], [31, 16],
  ]);
});

test('Traveller’s Town applies its three enemy HP difficulty multipliers in a real map14 session', async () => {
  const scenario = createRulesScenario();
  const expectedHp: Readonly<Record<GameDifficulty, number>> = { easy: 18, medium: 24, hard: 28 };

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
      scenarioId: scenario.id,
      mode: 'debug',
      difficulty,
      randomSeed: 711,
    });
    try {
      const initial = session.observe();
      assert.equal(initial.wave?.cash, 365);
      assert.equal(initial.wave?.lives, 25);
      assert.equal(initial.recruitPool.length, 0);

      assert.equal(session.submitIntent({ type: 'start-wave' }), true);
      const started = session.advance({ deltaMs: 100 });
      assert.equal(started.enemies.length, 4, 'preview starts once from each physical TDM spawn marker');
      assert.ok(started.enemies.every(({ hitPoints }) => hitPoints === expectedHp[difficulty]));
    } finally {
      session.close();
    }
  }
});

test('Traveller’s Town spawns a real-map bonus crate after the 25-second timer', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'debug',
    difficulty: 'medium',
    randomSeed: 711,
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
