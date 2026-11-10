import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import {
  fortKaboomCampaignEnemy,
  fortKaboomCampaignEnemyByType,
  fortKaboomContent,
  fortKaboomPreviewRedirects,
  fortKaboomPreviewWave,
  fortKaboomRouteDefinitions,
  fortKaboomSpawnPoints,
} from '../src/content/fort-kaboom';
import {
  fortKaboomLevelThreeContent,
  officialCampaignStages,
} from '../src/content/official-campaign';
import { fortKaboomCampaignWaves } from '../src/content/fort-kaboom-waves';

test('formal Fort Kaboom uses the researched level setup and every active enemy design', () => {
  assert.equal(fortKaboomLevelThreeContent.id, 'campaign-new-mexico-03');
  assert.equal(fortKaboomLevelThreeContent.contentVersion, 'gng-free-1.8.6-new-mexico-03-formal-v1');
  assert.equal(fortKaboomLevelThreeContent.formalSettlementSupported, true);
  assert.equal(fortKaboomLevelThreeContent.maxUpgrades, 0);
  assert.equal(fortKaboomLevelThreeContent.campaignWaveCount, 10);
  assert.deepEqual(fortKaboomLevelThreeContent.campaignWaves, fortKaboomCampaignWaves);
  assert.deepEqual(fortKaboomLevelThreeContent.previewWave, fortKaboomPreviewWave);
  assert.equal(fortKaboomLevelThreeContent.campaignUnitPool, fortKaboomContent.campaignUnitPool);
  assert.equal(fortKaboomLevelThreeContent.campaignBonusCratePool, fortKaboomContent.campaignBonusCratePool);

  assert.equal(fortKaboomPreviewWave.initialCash, 300);
  assert.equal(fortKaboomPreviewWave.initialLives, 50);
  assert.deepEqual(fortKaboomPreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75,
    medium: 150,
    hard: 188,
  });
  assert.deepEqual(fortKaboomCampaignEnemy, {
    hitPoints: 18,
    cashReward: 1,
    penetration: { light: 100, fire: 50, heavy: 25, poison: 75 },
  });
  assert.deepEqual(fortKaboomCampaignEnemyByType, {
    3: { hitPoints: 60, cashReward: 2, penetration: { light: 100, fire: 50, heavy: 25, poison: 75 }, turningDurationMs: 100 },
    4: { hitPoints: 200, cashReward: 10, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 200 },
    5: { hitPoints: 300, cashReward: 15, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 100 },
    8: { hitPoints: 200, cashReward: 0, penetration: { light: 100, fire: 100, heavy: 100, poison: 100 }, turningDurationMs: 100 },
  });
});

test('formal Fort Kaboom route redirects retain all seven TDM branches', () => {
  assert.equal(fortKaboomPreviewWave.spawn.cell.x, fortKaboomSpawnPoints[0]!.cell.x);
  assert.equal(fortKaboomPreviewWave.spawn.cell.y, fortKaboomSpawnPoints[0]!.cell.y);
  assert.deepEqual(fortKaboomPreviewWave.additionalSpawns, fortKaboomSpawnPoints.slice(1));
  assert.deepEqual(fortKaboomPreviewWave.routes, fortKaboomRouteDefinitions);

  const redirectByCell = new Map(fortKaboomPreviewRedirects.map(({ cell, directions }) => [
    `${cell.x},${cell.y}`,
    directions,
  ]));
  assert.equal(redirectByCell.size, fortKaboomPreviewRedirects.length, 'merged redirects contain one entry per TDM cell');
  for (const route of fortKaboomRouteDefinitions) {
    for (const redirect of route.redirects) {
      const directions = redirectByCell.get(`${redirect.cell.x},${redirect.cell.y}`);
      assert.ok(directions, `redirect at ${redirect.cell.x},${redirect.cell.y} is present`);
      for (const direction of redirect.directions) assert.ok(directions.includes(direction));
    }
  }
  assert.deepEqual(redirectByCell.get('9,3'), ['north', 'east']);
  assert.deepEqual(fortKaboomPreviewWave.additionalExits, [{ x: 21, y: 15 }]);
});

test('browser registry starts the official ten-wave Fort Kaboom with original setup', async () => {
  assert.equal(getBrowserScenarioContentVersion(fortKaboomLevelThreeContent.id), fortKaboomLevelThreeContent.contentVersion);
  const session = await createBrowserGame().open({
    scenarioId: fortKaboomLevelThreeContent.id,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 42,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 10);
    assert.equal(view.wave?.lives, 50);
    assert.equal(view.wave?.cash, 300);
    assert.equal(view.units.length, 31);
    assert.ok(view.units.every(({ activity }) => activity === 4));
    assert.equal(view.routes?.length, 7);

    for (let frame = 0; frame < 151; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.equal(view.elapsedMs, 15_100);
    assert.ok(view.enemies.length > 0, 'wave one begins spawning after its original delay');
  } finally {
    session.close();
  }
});

test('Fort Kaboom is New Mexico stage three and stays locked until Apache Valley is complete', () => {
  assert.deepEqual(officialCampaignStages.map(({ scenarioId, globalLevel, requiresCompletedScenarioIds }) => ({
    scenarioId,
    globalLevel,
    requiresCompletedScenarioIds,
  })), [
    { scenarioId: 'campaign-new-mexico-01', globalLevel: 1, requiresCompletedScenarioIds: [] },
    { scenarioId: 'campaign-new-mexico-02', globalLevel: 2, requiresCompletedScenarioIds: ['campaign-new-mexico-01'] },
    { scenarioId: 'campaign-new-mexico-03', globalLevel: 3, requiresCompletedScenarioIds: ['campaign-new-mexico-02'] },
    { scenarioId: 'campaign-new-mexico-04', globalLevel: 4, requiresCompletedScenarioIds: ['campaign-new-mexico-03'] },
    { scenarioId: 'campaign-new-mexico-05', globalLevel: 5, requiresCompletedScenarioIds: ['campaign-new-mexico-04'] },
    { scenarioId: 'campaign-new-mexico-06', globalLevel: 6, requiresCompletedScenarioIds: ['campaign-new-mexico-05'] },
    { scenarioId: 'campaign-new-mexico-07', globalLevel: 7, requiresCompletedScenarioIds: ['campaign-new-mexico-06'] },
  ]);
});
