import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-07.json';
import {
  dakota07BaseEnemy,
  dakota07BonusCratePool,
  dakota07CampaignAwesomeEnemyTypeThreshold,
  dakota07EnemyByType,
  dakota07LevelParameters,
  dakota07MaxUpgrades,
  dakota07PreviewWave,
} from '../src/content/dakota-07-campaign-rules';
import { dakota07CampaignWaves } from '../src/content/dakota-07-campaign-waves';
import { createDakota07MapScene } from '../src/content/dakota-07-scene';
import { createDakota07MapUnits } from '../src/content/dakota-07-units';
import { createGame, type ScenarioContent } from '../src/game';

function createRulesScenario(): ScenarioContent {
  return {
    id: 'frost-station-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Frost Station', zh: '霜冻车站' },
    map: createDakota07MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota07MapUnits(),
    maxUpgrades: dakota07MaxUpgrades,
    previewWave: dakota07PreviewWave,
    campaignWaveCount: dakota07CampaignWaves.length,
    campaignWaves: dakota07CampaignWaves,
    campaignBonusCratePool: dakota07BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota07CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota07BaseEnemy,
    campaignEnemyByType: dakota07EnemyByType,
  };
}

test('Frost Station preserves all twelve APK parameters without inventing a Gambler or unknown effects', () => {
  assert.deepEqual(dakota07LevelParameters, {
    initialCash: 350,
    initialLives: 25,
    maxChests: 999,
    chestTimeMs: 25_000,
    maxUpgrades: 3,
    awesomeMessageMinMs: 30_000,
    awesomeMessageUnit: 5,
    maxChestsPlayfield: 15,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 56, medium: 75, hard: 110 },
    gamblerTimeMs: 118_000,
  });
  assert.deepEqual(dakota07BonusCratePool, {
    totalCount: 999,
    intervalMs: 25_000,
    simultaneousLimit: 15,
    rewardTypeCount: 4,
  });
  assert.equal(dakota07MaxUpgrades, 3);
  assert.equal(dakota07CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(dakota07PreviewWave.enemyHitPointMultiplierPercentByDifficulty, { easy: 56, medium: 75, hard: 110 });
  assert.equal(dakota07PreviewWave.routes?.length, 7);
  assert.equal((dakota07PreviewWave.additionalSpawns?.length ?? 0) + 1, 4);
  assert.equal((dakota07PreviewWave.additionalExits?.length ?? 0) + 1, 2);

  const scenario = createRulesScenario();
  assert.equal(scenario.campaignUnitPool, undefined, 'the APK wave branch has no player-pool actions');
  assert.equal(scenario.gambler, undefined, 'the timer does not synthesize an absent map entity');
  assert.ok(!scenario.units.some(({ type }) => type === 'gambler'));
  assert.ok(!(scenario.map.decorations ?? []).some(({ asset }) => asset === 'b_3x2_casino'));
});

test('Frost Station GameSession opens with APK cash, lives, eight waves and difficulty HP profiles', async () => {
  const scenario = createRulesScenario();
  const game = createGame({ scenarios: { [scenario.id]: scenario } });

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await game.open({ scenarioId: scenario.id, mode: 'free', difficulty, randomSeed: 3_737 });
    try {
      const view = session.observe();
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 8);
      assert.equal(view.wave?.cash, 350);
      assert.equal(view.wave?.lives, 25);
      assert.equal(view.wave?.maxLives, 25);
      assert.deepEqual(scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
        easy: 56, medium: 75, hard: 110,
      });
      assert.equal(view.bonusCratePool?.remainingCount, 999);
      assert.equal(view.bonusCratePool?.remainingMs, 25_000);
    } finally {
      session.close();
    }
  }
});
