import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/nevada-02.json';
import { createBombingtonMapScene } from '../src/content/bombington-scene';
import { createBombingtonMapUnits } from '../src/content/bombington-units';
import {
  bombingtonBaseEnemy,
  bombingtonBonusCratePool,
  bombingtonCampaignAwesomeEnemyTypeThreshold,
  bombingtonEnemyByType,
  bombingtonLevelParameters,
  bombingtonMaxUpgrades,
  bombingtonPreviewWave,
  bombingtonRawLevelParameters,
} from '../src/content/bombington-campaign-rules';
import { bombingtonRouteDefinitions } from '../src/content/bombington-routes';
import { createGame, type ScenarioContent } from '../src/game';

const expectedBaseEnemy = {
  hitPoints: 18,
  cashReward: 1,
  penetration: { light: 100, fire: 50, heavy: 25, poison: 75 },
};

const expectedEnemyByType = {
  3: { hitPoints: 60, cashReward: 2, penetration: { light: 100, fire: 50, heavy: 25, poison: 75 }, turningDurationMs: 100 },
  4: { hitPoints: 200, cashReward: 10, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 200 },
  5: { hitPoints: 300, cashReward: 15, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 100 },
  6: { hitPoints: 500, cashReward: 25, penetration: { light: 33, fire: 25, heavy: 100, poison: 100 }, turningDurationMs: 200 },
  7: { hitPoints: 2_500, cashReward: 50, penetration: { light: 100, fire: 50, heavy: 25, poison: 75 }, turningDurationMs: 100 },
  8: { hitPoints: 200, cashReward: 0, penetration: { light: 100, fire: 100, heavy: 100, poison: 100 }, turningDurationMs: 100 },
};

function createRulesScenario(): ScenarioContent {
  return {
    id: 'bombington-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Bombington', zh: '炸弹镇' },
    map: createBombingtonMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createBombingtonMapUnits(),
    maxUpgrades: bombingtonMaxUpgrades,
    previewWave: bombingtonPreviewWave,
    campaignBonusCratePool: bombingtonBonusCratePool,
    campaignAwesomeEnemyTypeThreshold: bombingtonCampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: bombingtonBaseEnemy,
    campaignEnemyByType: bombingtonEnemyByType,
  };
}

test('Bombington preserves GameDesignData row 41 and the shared enemy rows', () => {
  assert.deepEqual(bombingtonRawLevelParameters,
    [300, 25, 999, 25_000, 3, 30_000, 5, 15, 75, 110, 155, 119_000]);
  assert.deepEqual(bombingtonLevelParameters, {
    initialCash: 300,
    initialLives: 25,
    maxChests: 999,
    chestIntervalMs: 25_000,
    maxUpgrades: 3,
    awesomeMessageMinMs: 30_000,
    awesomeMessageUnit: 5,
    maxChestsPlayfield: 15,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 75, medium: 110, hard: 155 },
    gamblerCooldownMs: 119_000,
  });
  assert.equal(bombingtonMaxUpgrades, 3);
  assert.equal(bombingtonCampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(bombingtonBonusCratePool, {
    totalCount: 999,
    intervalMs: 25_000,
    simultaneousLimit: 15,
    rewardTypeCount: 7,
  });
  assert.deepEqual(bombingtonBaseEnemy, expectedBaseEnemy);
  assert.deepEqual(bombingtonEnemyByType, expectedEnemyByType);
  assert.deepEqual(bombingtonPreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75, medium: 110, hard: 155,
  });
  assert.equal(bombingtonPreviewWave.enemy, bombingtonBaseEnemy);
  assert.deepEqual(bombingtonPreviewWave.routes, bombingtonRouteDefinitions);
  assert.equal(bombingtonPreviewWave.routes?.length, 624);
  assert.equal(bombingtonPreviewWave.additionalSpawns?.length, 4);
  assert.equal(createRulesScenario().gambler, undefined, 'a Gambler timer does not create a missing map object');
});

test('Bombington opens with its APK economy and applies the selected difficulty HP multiplier', async () => {
  const scenario = createRulesScenario();
  const game = createGame({ scenarios: { [scenario.id]: scenario } });
  const expectedHitPoints = { easy: 18, medium: 26, hard: 37 } as const;

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await game.open({
      scenarioId: scenario.id,
      mode: 'free',
      difficulty,
      randomSeed: 4_201,
    });
    try {
      const initialView = session.observe();
      assert.equal(initialView.wave?.number, 1);
      assert.equal(initialView.wave?.cash, 300);
      assert.equal(initialView.wave?.lives, 25);
      assert.equal(initialView.wave?.maxLives, 25);
      assert.equal(initialView.bonusCratePool?.remainingCount, 999);
      assert.equal(initialView.bonusCratePool?.remainingMs, 25_000);

      assert.equal(session.submitIntent({ type: 'start-wave' }), true);
      const startedView = session.advance({ deltaMs: 0 });
      assert.equal(startedView.enemies.length, 5, 'the preview starts one representative enemy at each physical spawn');
      assert.ok(startedView.enemies.every(({ maxHitPoints }) => maxHitPoints === expectedHitPoints[difficulty]));
    } finally {
      session.close();
    }
  }
});
