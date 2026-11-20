import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-05.json';
import {
  dakota05BaseEnemy,
  dakota05BonusCratePool,
  dakota05CampaignAwesomeEnemyTypeThreshold,
  dakota05EnemyByType,
  dakota05LevelParameters,
  dakota05MaxUpgrades,
  dakota05PreviewWave,
} from '../src/content/dakota-05-campaign-rules';
import { createDakota05MapScene } from '../src/content/dakota-05-scene';
import { createDakota05MapUnits } from '../src/content/dakota-05-units';
import { createDakota05SteamerUnits } from '../src/content/dakota-05-steamer';
import { createDakota05TrainUnits } from '../src/content/dakota-05-trains';
import { dakota05SpawnPointIdByActionId } from '../src/content/dakota-05-routes';
import { createGame, type ScenarioContent } from '../src/game';

function createRulesScenario(): ScenarioContent {
  return {
    id: 'ghost-town-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Ghost Town', zh: '幽灵镇' },
    map: createDakota05MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [...createDakota05MapUnits(), ...createDakota05TrainUnits(), ...createDakota05SteamerUnits()],
    maxUpgrades: dakota05MaxUpgrades,
    previewWave: dakota05PreviewWave,
    campaignBonusCratePool: dakota05BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota05CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota05BaseEnemy,
    campaignEnemyByType: dakota05EnemyByType,
  };
}

test('Ghost Town preserves all twelve GameDesignData parameters without inventing Gambler content', () => {
  assert.deepEqual(dakota05LevelParameters, {
    initialCash: 300,
    initialLives: 25,
    maxChests: 999,
    chestTimeMs: 25_000,
    maxUpgrades: 3,
    awesomeMessageMinMs: 30_000,
    awesomeMessageUnit: 5,
    maxChestsPlayfield: 15,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 56, medium: 75, hard: 95 },
    gamblerTimeMs: 118_000,
  });
  assert.equal(dakota05MaxUpgrades, 3);
  assert.deepEqual(dakota05PreviewWave.enemyHitPointMultiplierPercentByDifficulty, { easy: 56, medium: 75, hard: 95 });
  assert.deepEqual(dakota05BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(dakota05CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(dakota05SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3 });
  assert.equal(dakota05PreviewWave.routes?.length, 5);
  assert.equal((dakota05PreviewWave.additionalSpawns?.length ?? 0) + 1, 4);
  assert.equal(dakota05PreviewWave.enemy, dakota05BaseEnemy);

  const scenario = createRulesScenario();
  assert.equal(scenario.gambler, undefined, 'a nonzero Gambler timer does not create a Gambler without TDM markers');
  assert.ok(!scenario.units.some(({ type }) => type === 'gambler'));
  assert.ok(!(scenario.map.decorations ?? []).some(({ asset }) => asset === 'b_3x2_casino'));
});

test('Ghost Town GameSession opens with the APK starting economy, difficulty profile and chest schedule', async () => {
  const scenario = createRulesScenario();
  const game = createGame({ scenarios: { [scenario.id]: scenario } });

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await game.open({ scenarioId: scenario.id, mode: 'free', difficulty, randomSeed: 3_514 });
    try {
      const view = session.observe();
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.cash, 300);
      assert.equal(view.wave?.lives, 25);
      assert.equal(view.wave?.maxLives, 25);
      assert.deepEqual(scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
        easy: 56, medium: 75, hard: 95,
      });
      assert.equal(view.bonusCratePool?.remainingCount, 999);
      assert.equal(view.bonusCratePool?.remainingMs, 25_000);
    } finally {
      session.close();
    }
  }
});
