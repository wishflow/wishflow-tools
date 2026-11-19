import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-06.json';
import {
  dakota06BaseEnemy,
  dakota06BonusCratePool,
  dakota06CampaignAwesomeEnemyTypeThreshold,
  dakota06EnemyByType,
  dakota06LevelParameters,
  dakota06MaxUpgrades,
  dakota06PreviewWave,
} from '../src/content/dakota-06-campaign-rules';
import { dakota06CampaignWaves } from '../src/content/dakota-06-campaign-waves';
import { createDakota06DynamiteDefinition } from '../src/content/dakota-06-dynamite';
import { createDakota06MapScene } from '../src/content/dakota-06-scene';
import { createDakota06MapUnits } from '../src/content/dakota-06-units';
import { dakota06CampaignUnitPool } from '../src/content/dakota-06-unit-pool';
import { createGame, type ScenarioContent } from '../src/game';

function createRulesScenario(): ScenarioContent {
  return {
    id: 'ice-rocks-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Ice Rocks', zh: '冰岩' },
    map: createDakota06MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota06MapUnits(),
    dynamite: createDakota06DynamiteDefinition([]),
    maxUpgrades: dakota06MaxUpgrades,
    previewWave: dakota06PreviewWave,
    campaignWaveCount: dakota06CampaignWaves.length,
    campaignWaves: dakota06CampaignWaves,
    campaignUnitPool: dakota06CampaignUnitPool,
    campaignBonusCratePool: dakota06BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota06CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota06BaseEnemy,
    campaignEnemyByType: dakota06EnemyByType,
  };
}

test('Ice Rocks preserves all twelve APK parameters and uses only confirmed consumers', () => {
  assert.deepEqual(dakota06LevelParameters, {
    initialCash: 200,
    initialLives: 25,
    maxChests: 999,
    chestTimeMs: 25_000,
    maxUpgrades: 3,
    awesomeMessageMinMs: 30_000,
    awesomeMessageUnit: 5,
    maxChestsPlayfield: 15,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 56, medium: 75, hard: 125 },
    gamblerTimeMs: 118_000,
  });
  assert.equal(dakota06MaxUpgrades, 3);
  assert.deepEqual(dakota06PreviewWave.enemyHitPointMultiplierPercentByDifficulty, { easy: 56, medium: 75, hard: 125 });
  assert.deepEqual(dakota06BonusCratePool, {
    totalCount: 999,
    intervalMs: 25_000,
    simultaneousLimit: 15,
    rewardTypeCount: 4,
  });
  assert.equal(dakota06CampaignAwesomeEnemyTypeThreshold, 5);
  assert.equal(dakota06PreviewWave.routes?.length, 8);
  assert.equal((dakota06PreviewWave.additionalSpawns?.length ?? 0) + 1, 3);

  const scenario = createRulesScenario();
  assert.equal(scenario.gambler, undefined,
    'the nonzero Gambler timer does not create a Gambler without an APK map marker');
  assert.ok(!scenario.units.some(({ type }) => type === 'gambler'));
  assert.ok(!(scenario.map.decorations ?? []).some(({ asset }) => asset === 'b_3x2_casino'));
});

test('Ice Rocks GameSession opens with the source starting economy and difficulty profile', async () => {
  const scenario = createRulesScenario();
  const game = createGame({ scenarios: { [scenario.id]: scenario } });

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await game.open({ scenarioId: scenario.id, mode: 'free', difficulty, randomSeed: 3_636 });
    try {
      const view = session.observe();
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 9);
      assert.equal(view.wave?.cash, 200);
      assert.equal(view.wave?.lives, 25);
      assert.equal(view.wave?.maxLives, 25);
      assert.deepEqual(scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
        easy: 56, medium: 75, hard: 125,
      });
      assert.equal(view.bonusCratePool?.remainingCount, 999);
      assert.equal(view.bonusCratePool?.remainingMs, 25_000);
    } finally {
      session.close();
    }
  }
});
