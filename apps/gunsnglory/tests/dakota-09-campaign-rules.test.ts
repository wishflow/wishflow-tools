import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-09.json';
import { createDakota09CampaignContent } from '../src/content/dakota-09-campaign';
import {
  dakota09BaseEnemy,
  dakota09BonusCratePool,
  dakota09CampaignAwesomeEnemyTypeThreshold,
  dakota09EnemyByType,
  dakota09LevelParameters,
  dakota09MaxUpgrades,
  dakota09PreviewWave,
  dakota09RawLevelParameters,
} from '../src/content/dakota-09-campaign-rules';
import { dakota09CampaignUnitPool } from '../src/content/dakota-09-unit-pool';
import { dakota09CampaignWaves } from '../src/content/dakota-09-campaign-waves';
import { dakota09RouteDefinitions } from '../src/content/dakota-09-routes';
import {
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
} from '../src/game/campaign-unit-pool';
import { createGame } from '../src/game';

test('Snow Town preserves parameter row 38 and applies only confirmed level effects', () => {
  assert.deepEqual(dakota09RawLevelParameters,
    [250, 10, 999, 25_000, 3, 30_000, 5, 15, 56, 75, 100, 119_000]);
  assert.deepEqual(dakota09LevelParameters, {
    initialCash: 250,
    initialLives: 10,
    maxChests: 999,
    chestTimeMs: 25_000,
    maxUpgrades: 3,
    reservedParameter5: 30_000,
    awesomeMessageUnit: 5,
    maxChestsPlayfield: 15,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 56, medium: 75, hard: 100 },
    gamblerTimeMs: 119_000,
  });
  assert.equal(dakota09PreviewWave.enemy, dakota09BaseEnemy);
  assert.deepEqual(dakota09PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 56, medium: 75, hard: 100,
  });
  assert.deepEqual(dakota09BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(dakota09CampaignAwesomeEnemyTypeThreshold, 5);
  assert.equal(dakota09MaxUpgrades, 3);
  assert.deepEqual(dakota09PreviewWave.routes, dakota09RouteDefinitions);
  assert.equal(dakota09PreviewWave.routes?.length, 3);
  assert.equal(dakota09CampaignWaves.length, 8);

  const content = createDakota09CampaignContent();
  assert.deepEqual(content.originalTileGrid, map.originalTileGrid);
  assert.equal(content.maxUpgrades, 3);
  assert.equal(content.campaignWaveCount, 8);
  assert.equal(content.campaignWaves?.length, 8);
  assert.equal(content.campaignAwesomeEnemyTypeThreshold, 5);
  assert.equal(content.campaignEnemy, dakota09BaseEnemy);
  assert.equal(content.campaignEnemyByType, dakota09EnemyByType);
  assert.deepEqual(content.campaignBonusCratePool, dakota09BonusCratePool);
  assert.equal(content.dynamite, undefined, 'Snow Town TDM has no Dynamite trigger or box markers');
  assert.equal(content.gambler, undefined, 'a nonzero Gambler timer does not create a Gambler or Casino');
  assert.ok(!content.units.some(({ type }) => type === 'gambler'));
  assert.ok(!(content.map.decorations ?? []).some(({ asset }) => asset === 'b_3x2_casino'));

  const poolRuntime = createCampaignUnitPoolRuntime(dakota09CampaignUnitPool)!;
  applyCampaignUnitPoolActions(poolRuntime, dakota09CampaignUnitPool, 1);
  assert.deepEqual(poolRuntime.pending.slice(1, 5), [0, 0, 0, 0], 'Wave 1 SET clears the four raw player-pool slots');
  assert.deepEqual(poolRuntime.maximum.slice(1, 5), [4, 4, 4, 4], 'Wave 1 SET_MAX caps the four raw player-pool slots');
});

test('Snow Town starts with the APK cash, lives, crate schedule and difficulty HP', async () => {
  const scenario = createDakota09CampaignContent();
  const game = createGame({ scenarios: { [scenario.id]: scenario } });

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await game.open({ scenarioId: scenario.id, mode: 'free', difficulty, randomSeed: 3_938 });
    try {
      const view = session.observe();
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 8);
      assert.equal(view.wave?.cash, 250);
      assert.equal(view.wave?.lives, 10);
      assert.equal(view.wave?.maxLives, 10);
      assert.deepEqual(scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
        easy: 56, medium: 75, hard: 100,
      });
      assert.equal(view.bonusCratePool?.remainingCount, 999);
      assert.equal(view.bonusCratePool?.remainingMs, 25_000);
    } finally {
      session.close();
    }
  }
});
