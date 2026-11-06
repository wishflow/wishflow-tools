import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveSessionRandomSeed, JavaUtilRandom } from '../src/game/java-random';
import {
  createGame,
  type CampaignSpawnPoolDefinition,
  type CampaignWaveDefinition,
  type GameSession,
  type GameView,
  type ScenarioContent,
} from '../src/game';
import { cowGulchP1cCampaignContent } from '../src/content/cow-gulch';

const EMPTY_REQUESTS = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const POST_COACH_REQUESTS = Object.freeze([0, 0, 0, 0, 0, 0, 1, 0, 0, 0]);
const SOURCE_WAVES = cowGulchP1cCampaignContent.campaignWaves!;

function emptyPool(spawnPointId = 0): CampaignSpawnPoolDefinition {
  return { spawnPointId, intervalMs: 1000, requests: EMPTY_REQUESTS };
}

function wave(number: number, spawnPools: readonly CampaignSpawnPoolDefinition[]): CampaignWaveDefinition {
  return {
    ...SOURCE_WAVES[0]!,
    number,
    delayMs: 0,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    spawnPools,
  };
}

function postCoachScenario(
  units: ScenarioContent['units'] = [],
  waveThreePools: readonly CampaignSpawnPoolDefinition[] = [{
    spawnPointId: 0,
    intervalMs: 1000,
    requests: POST_COACH_REQUESTS,
  }],
  routeOverrides: Partial<ScenarioContent['previewWave']> = {},
): ScenarioContent {
  const previewWave = cowGulchP1cCampaignContent.previewWave!;
  return {
    ...cowGulchP1cCampaignContent,
    id: 'post-coach-rules-fixture',
    units,
    previewWave: {
      ...previewWave,
      baseEnemySpeed: 500,
      spawn: { cell: { x: 6, y: 8 }, direction: 'east' },
      additionalSpawns: [],
      routes: undefined,
      redirects: [],
      exit: { x: 8, y: 8 },
      ...routeOverrides,
    },
    campaignWaveCount: 4,
    campaignWaves: [
      wave(1, [emptyPool()]),
      wave(2, [emptyPool()]),
      wave(3, waveThreePools),
      wave(4, [emptyPool()]),
    ],
  };
}

async function startPostCoachWave(
  scenario = postCoachScenario(),
  randomSeed = 17,
): Promise<{ session: GameSession; scenario: ScenarioContent; view: GameView }> {
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed,
  });
  let view = session.observe();
  for (let step = 0; step < 20 && view.wave?.number !== 3; step += 1) {
    view = session.advance({ deltaMs: 0 });
  }
  assert.equal(view.wave?.number, 3);
  view = session.advance({ deltaMs: 0 });
  return { session, scenario, view };
}

function postCoachEnemies(view: GameView) {
  const horse = view.enemies.find(({ type }) => type === 8);
  const coach = view.enemies.find(({ type }) => type === 5);
  assert.ok(horse, 'pool type 8 creates the neutral lead horse');
  assert.ok(coach, 'pool type 8 creates a Post Coach');
  return { horse, coach };
}

test('pool type 8 spawns a same-group lead horse and Post Coach with the original spacing and stats', async () => {
  const { session, scenario, view } = await startPostCoachWave();
  const { horse, coach } = postCoachEnemies(view);

  assert.deepEqual(view.enemies.map(({ type }) => type), [8, 5]);
  assert.equal(horse.groupId, coach.groupId);
  assert.equal(horse.speed, 500);
  assert.equal(coach.speed, 500);
  assert.equal(coach.positionFine.x, horse.positionFine.x - 7680);
  assert.equal(coach.positionFine.y, horse.positionFine.y);
  assert.deepEqual(horse.drawingOffsetFine, { x: 0, y: 2880 });
  assert.deepEqual(coach.drawingOffsetFine, { x: 0, y: 2880 });
  assert.equal(horse.damageable, false);
  assert.equal(coach.damageable, true);
  assert.equal(coach.asset, 'stagecoach');
  assert.equal(view.wave?.dynamicDifficulty, 1000);

  const levelMultiplier = scenario.previewWave!.enemyHitPointMultiplierPercentByDifficulty?.easy ?? 100;
  const hpDifficulty = Math.max(500, Math.min(1250, view.wave!.dynamicDifficulty!));
  const hpFactor = Math.trunc((hpDifficulty * levelMultiplier * 2) / 10);
  assert.equal(coach.maxHitPoints, Math.max(1, Math.trunc((300 * hpFactor) / 2000)),
    'type 5 starts from the APK 300-HP design row before difficulty scaling');

  const moved = session.advance({ deltaMs: 100 });
  const movedHorse = moved.enemies.find(({ type }) => type === 8)!;
  const movedCoach = moved.enemies.find(({ type }) => type === 5)!;
  assert.equal(movedHorse.positionFine.x - horse.positionFine.x, 500);
  assert.equal(movedCoach.positionFine.x - coach.positionFine.x, 500);
  assert.equal(movedCoach.animationFrame, 0, 'Post Coach uses the wagon walk-frame thresholds');
  session.close();
});

test('Post Coach follows the APK turn atlas as part of its lead horse group', async () => {
  const { session } = await startPostCoachWave(postCoachScenario([], undefined, {
    redirects: [{ cell: { x: 6, y: 8 }, directions: ['south'] }],
    exit: { x: 6, y: 12 },
  }));

  let turnSeen = false;
  for (let step = 0; step < 100 && !turnSeen; step += 1) {
    const view = session.advance({ deltaMs: 100 });
    const { horse, coach } = postCoachEnemies(view);
    assert.equal(horse.groupId, coach.groupId);
    if (coach.turningAnimation) {
      turnSeen = true;
      assert.equal(coach.direction, 'south');
      assert.equal(coach.turningAnimation.asset, 'stagecoach_turn');
      assert.equal(coach.turningAnimation.frame, 0);
      assert.equal(coach.turningAnimation.mirrored, true);
    }
  }
  assert.equal(turnSeen, true, 'type 5 uses its stagecoach turn sheet at the route redirect');
  session.close();
});

test('a lethal hit rewards the Post Coach once and leaves its non-damageable lead horse alive', async () => {
  const shooter = {
    id: 'post-coach-test-shooter',
    activity: 5 as const,
    type: 'gunslinger',
    cell: { x: 8, y: 8 },
    movementSpeedFinePer100Ms: 0,
    asset: 'player_gunslinger',
    frame: { x: 0, y: 0, width: 32, height: 44 },
    render: { x: 8, y: 7.625, width: 1, height: 1.375 },
    hitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
    weapon: {
      damage: 100_000,
      damageType: 'light' as const,
      rangeFine: 17 * 7680,
      reloadTimeMs: 100,
      projectileSpeed: 100,
      damageStyle: 0 as const,
    },
  };
  const { session, view: initial } = await startPostCoachWave(postCoachScenario([shooter]));
  const { horse, coach } = postCoachEnemies(initial);
  const initialCash = initial.wave!.cash;

  let view = session.advance({ deltaMs: 100 });
  assert.ok(view.events.some((event) => event.type === 'unit-fired' && event.targetId === coach.id),
    'automatic attack targets the damageable vehicle, not its non-damageable horse');
  assert.equal(view.events.some((event) => event.type === 'unit-fired' && event.targetId === horse.id), false);
  for (let step = 0; step < 10 && !view.events.some((event) =>
    event.type === 'enemy-defeated' && event.enemyId === coach.id); step += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  const defeat = view.events.find((event) => event.type === 'enemy-defeated' && event.enemyId === coach.id);
  assert.deepEqual(defeat, { type: 'enemy-defeated', enemyId: coach.id, enemyType: 5, cashReward: 15 });
  assert.equal(view.wave?.cash, initialCash + 15);
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_wagon_explode'));
  assert.equal(view.enemies.find(({ id }) => id === coach.id)?.alive, false);
  assert.equal(view.enemies.find(({ id }) => id === horse.id)?.alive, true,
    'destroying the Post Coach does not destroy its lead horse');
  session.close();
});

test('a destroyed Post Coach uses its four-passenger APK wreck average and shared debris random stream', async () => {
  const sourceGunslinger = cowGulchP1cCampaignContent.units.find(({ type }) => type === 'gunslinger')!;
  const shooter = {
    ...sourceGunslinger,
    id: 'post-coach-wreck-gunslinger',
    cell: { x: 8, y: 8 },
    weapon: {
      ...sourceGunslinger.weapon!,
      damage: 100_000,
      rangeFine: 153_600,
      reloadTimeMs: 1,
      projectileSpeed: 1000,
    },
  };
  const seed = 17;
  const { session, view: initial } = await startPostCoachWave(postCoachScenario([shooter]), seed);
  let view = initial;
  for (let frame = 0; frame < 20 && !view.events.some((event) =>
    event.type === 'enemy-defeated' && event.enemyType === 5); frame += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.ok(view.events.some((event) => event.type === 'enemy-defeated' && event.enemyType === 5));
  for (let frame = 0; frame < 5 && (view.wagonDebris?.length ?? 0) === 0; frame += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  assert.equal(view.wagonDebris?.length, 20);
  const passengers = view.enemies.filter(({ id }) => id.startsWith('wagon-passenger-'));
  const expectedRandom = new JavaUtilRandom(deriveSessionRandomSeed(seed, 'game-util'));
  expectedRandom.nextInt(1);
  expectedRandom.nextInt(1);
  expectedRandom.nextInt(2);
  expectedRandom.nextInt(2);
  for (let index = 0; index < 20; index += 1) {
    expectedRandom.nextInt(2000);
    expectedRandom.nextInt(200);
    expectedRandom.nextInt(4000);
    expectedRandom.nextInt(6);
  }
  const passengerCount = Math.min(4, Math.trunc(expectedRandom.nextInt(60) / 10));
  const passengerSpeed = 90 + expectedRandom.nextInt(20);
  assert.equal(passengers.length, passengerCount,
    'Post Coach uses the APK average passenger count 4 in addition to dynamic difficulty');
  assert.ok(passengers.every(({ speed }) => speed === Math.trunc((500 * passengerSpeed) / 100)));
  session.close();
});

test('the coach pays three lives when it escapes while the lead horse pays none', async () => {
  const { session } = await startPostCoachWave();
  let view = session.observe();
  for (let step = 0; step < 120 && view.wave?.number === 3; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  assert.equal(view.wave?.number, 4);
  assert.equal(view.wave?.lives, 47);
  assert.equal(view.wave?.escapedEnemies, 2,
    'both sprites leave the route, but only type 5 applies its three-life penalty');
  session.close();
});

test('Post Coach generation retries when a vehicle already occupies its entrance', async () => {
  const requests = [...EMPTY_REQUESTS];
  requests[5] = 1;
  const blockedScenario = postCoachScenario([], [
    { spawnPointId: 1, intervalMs: 100, requests },
    { spawnPointId: 0, intervalMs: 100, requests: POST_COACH_REQUESTS },
  ], {
    additionalSpawns: [{ cell: { x: 7, y: 8 }, direction: 'east' }],
  });
  const { session, view } = await startPostCoachWave(blockedScenario);

  assert.deepEqual(view.enemies.map(({ type }) => type), [8, 4],
    'the first vehicle pair occupies the adjacent entrance before the Post Coach pool is processed');
  assert.equal(view.wave?.pendingSpawnRequests, 1,
    'the blocked Post Coach request remains pending for its half-interval retry');
  session.close();
});
