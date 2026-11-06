import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, type CampaignSpawnPoolDefinition, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { deriveSessionRandomSeed, JavaUtilRandom } from '../src/game/java-random';
import { createRoutePriorityMap, normalizedRoutePriority } from '../src/game/route-priority';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { cowGulchP1cCampaignContent } from '../src/content/cow-gulch';

const EMPTY_REQUESTS = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const GOLD_TRANSPORT_REQUESTS = Object.freeze([0, 0, 0, 0, 0, 0, 0, 1, 0, 0]);
const SOURCE_WAVE = cowGulchP1cCampaignContent.campaignWaves![0]!;

function wave(number: number, spawnPools: readonly CampaignSpawnPoolDefinition[]): CampaignWaveDefinition {
  return {
    ...SOURCE_WAVE,
    number,
    delayMs: 0,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    spawnPools,
  };
}

function goldTransportScenario(): ScenarioContent {
  const previewWave = cowGulchP1cCampaignContent.previewWave!;
  return {
    ...cowGulchP1cCampaignContent,
    id: 'gold-transport-rules-fixture',
    units: [],
    previewWave: {
      ...previewWave,
      baseEnemySpeed: 500,
      spawn: { cell: { x: 6, y: 8 }, direction: 'east' },
      additionalSpawns: [],
      routes: undefined,
      redirects: [],
      exit: { x: 8, y: 8 },
    },
    campaignWaveCount: 2,
    campaignWaves: [
      wave(1, [{ spawnPointId: 0, intervalMs: 1000, requests: EMPTY_REQUESTS }]),
      wave(2, [{ spawnPointId: 0, intervalMs: 1000, requests: GOLD_TRANSPORT_REQUESTS }]),
    ],
    campaignEnemyByType: {
      ...cowGulchP1cCampaignContent.campaignEnemyByType,
      6: {
        hitPoints: 500,
        cashReward: 25,
        penetration: { light: 33, fire: 25, heavy: 100, poison: 100 },
        turningDurationMs: 200,
      },
    },
  };
}

async function startGoldTransportWave(scenario = goldTransportScenario(), randomSeed = 17) {
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed,
  });
  let view = session.observe();
  for (let step = 0; step < 20 && view.wave?.number !== 2; step += 1) {
    view = session.advance({ deltaMs: 0 });
  }
  assert.equal(view.wave?.number, 2);
  return { session, view: session.advance({ deltaMs: 0 }) };
}

test('enemy pool type 9 consumes one request by spawning one Gold Transport', async () => {
  const { session, view } = await startGoldTransportWave();
  assert.equal(view.wave?.pendingSpawnRequests, 0);
  assert.deepEqual(view.enemies.map(({ type, asset, speed, maxHitPoints }) => ({
    type, asset, speed, maxHitPoints,
  })), [{ type: 6, asset: 'goldtransport', speed: 500, maxHitPoints: 5000 }]);
  session.close();
});

test('Gold Transport images resolve to the original high-density atlases', () => {
  assert.equal(gameAssetRelativePath('goldtransport'), 'hdpi/goldtransport.png');
  assert.equal(gameAssetRelativePath('goldtransport_turn'), 'hdpi/goldtransport_turn.png');
});

test('Gold Transport applies the wave speed multiplier and original turn atlas', async () => {
  const scenario = goldTransportScenario();
  scenario.campaignWaves = scenario.campaignWaves!.map((current) => current.number === 2
    ? { ...current, speedMultiplierPercent: 105 }
    : current);
  scenario.previewWave = {
    ...scenario.previewWave!,
    redirects: [{ cell: { x: 6, y: 8 }, directions: ['south'] }],
    exit: { x: 6, y: 12 },
  };
  const { session, view: initial } = await startGoldTransportWave(scenario);
  const gold = initial.enemies[0]!;
  assert.equal(gold.speed, 525);

  let turnSeen = false;
  let view = initial;
  for (let frame = 0; frame < 100 && !turnSeen; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    const turningGold = view.enemies.find(({ type }) => type === 6);
    if (turningGold?.turningAnimation) {
      turnSeen = true;
      assert.equal(turningGold.direction, 'south');
      assert.equal(turningGold.turningAnimation.asset, 'goldtransport_turn');
      assert.equal(turningGold.turningAnimation.frame, 0);
    }
  }
  assert.equal(turnSeen, true);
  session.close();
});

test('Gold Transport is the damageable vehicle, pays its reward, requests the explosion, and escapes for four lives', async () => {
  const sourceGunslinger = cowGulchP1cCampaignContent.units.find(({ type }) => type === 'gunslinger')!;
  const shooter = {
    ...sourceGunslinger,
    id: 'gold-transport-test-gunslinger',
    cell: { x: 5, y: 8 },
    weapon: {
      ...sourceGunslinger.weapon!,
      damage: 100_000,
      rangeFine: 153_600,
      reloadTimeMs: 1,
      projectileSpeed: 1000,
    },
  };
  const scenario = { ...goldTransportScenario(), units: [shooter] };
  const { session, view: initial } = await startGoldTransportWave(scenario);
  const initialCash = initial.wave!.cash;
  let view = initial;
  for (let frame = 0; frame < 20 && !view.events.some((event) =>
    event.type === 'enemy-defeated' && event.enemyType === 6); frame += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.ok(view.events.some((event) => event.type === 'enemy-defeated'
    && event.enemyType === 6 && event.cashReward === 25));
  assert.equal(view.wave?.cash, initialCash + 25);
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_wagon_explode'));
  assert.equal(view.enemies[0]?.deathRemainingMs, 799);
  session.close();

  const escape = await startGoldTransportWave();
  view = escape.view;
  for (let frame = 0; frame < 100 && view.wave?.phase === 'active'; frame += 1) {
    view = escape.session.advance({ deltaMs: 100 });
  }
  assert.equal(view.wave?.lives, 46);
  assert.equal(view.wave?.escapedEnemies, 1);
  escape.session.close();
});

test('Gold Transport entrance requests wait when another vehicle occupies the physical spawn probe', async () => {
  const scenario = goldTransportScenario();
  const stagecoachRequests = [...EMPTY_REQUESTS];
  stagecoachRequests[6] = 1;
  const goldTransportRequests = [...EMPTY_REQUESTS];
  goldTransportRequests[7] = 1;
  scenario.previewWave = {
    ...scenario.previewWave!,
    spawn: { cell: { x: 8, y: 8 }, direction: 'east' },
    additionalSpawns: [{ cell: { x: 5, y: 8 }, direction: 'west' }],
  };
  scenario.campaignWaves = scenario.campaignWaves!.map((current) => current.number === 2
    ? {
      ...current,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 100, requests: stagecoachRequests },
        { spawnPointId: 1, intervalMs: 100, requests: goldTransportRequests },
      ],
    }
    : current);
  const { session, view } = await startGoldTransportWave(scenario);

  assert.deepEqual(view.enemies.map(({ type }) => type), [8, 5]);
  assert.equal(view.wave?.pendingSpawnRequests, 1);
  session.close();
});

test('Gold Transport wreck creates original debris and uses the type-6 passenger random bound', async () => {
  const sourceGunslinger = cowGulchP1cCampaignContent.units.find(({ type }) => type === 'gunslinger')!;
  const shooter = {
    ...sourceGunslinger,
    id: 'gold-transport-wreck-gunslinger',
    cell: { x: 5, y: 8 },
    weapon: {
      ...sourceGunslinger.weapon!,
      damage: 100_000,
      rangeFine: 153_600,
      reloadTimeMs: 1,
      projectileSpeed: 1000,
    },
  };
  const scenario = { ...goldTransportScenario(), units: [shooter] };
  const seed = 4;
  const { session, view: initial } = await startGoldTransportWave(scenario, seed);
  let view = initial;
  for (let frame = 0; frame < 20 && !view.events.some((event) =>
    event.type === 'enemy-defeated' && event.enemyType === 6); frame += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.ok(view.events.some((event) => event.type === 'enemy-defeated' && event.enemyType === 6));
  for (let frame = 0; frame < 5 && (view.wagonDebris?.length ?? 0) === 0; frame += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  assert.equal(view.wagonDebris?.length, 20);
  const passengers = view.enemies.filter(({ id }) => id.startsWith('wagon-passenger-'));
  const expectedRandom = new JavaUtilRandom(deriveSessionRandomSeed(seed, 'game-util'));
  expectedRandom.nextInt(1); // Enemy request selection in the ten-slot pool.
  expectedRandom.nextInt(1); // The APK's direction-selection draw before actor creation.
  expectedRandom.nextInt(2); // Gold Transport constructor color/mirror draw.
  for (let index = 0; index < 20; index += 1) {
    expectedRandom.nextInt(2000);
    expectedRandom.nextInt(200);
    expectedRandom.nextInt(4000);
    expectedRandom.nextInt(6);
  }
  const expectedPassengerCount = Math.trunc(expectedRandom.nextInt(20) / 10);
  const expectedPassengerSpeed = 90 + expectedRandom.nextInt(20);
  assert.equal(passengers.length, expectedPassengerCount,
    'Gold Transport uses average passenger count 0 but retains the difficulty-derived random component');
  assert.ok(passengers.every(({ speed }) => speed === Math.trunc((500 * expectedPassengerSpeed) / 100)));
  session.close();
});

test('Gold Transport kill contributes the APK weight 10 to next-wave dynamic difficulty', async () => {
  const sourceGunslinger = cowGulchP1cCampaignContent.units.find(({ type }) => type === 'gunslinger')!;
  const shooter = {
    ...sourceGunslinger,
    id: 'gold-transport-difficulty-gunslinger',
    cell: { x: 5, y: 8 },
    weapon: {
      ...sourceGunslinger.weapon!,
      damage: 100_000,
      rangeFine: 153_600,
      reloadTimeMs: 1,
      projectileSpeed: 1000,
    },
  };
  const scenario = goldTransportScenario();
  scenario.units = [shooter];
  scenario.campaignWaveCount = 3;
  scenario.campaignWaves = [...scenario.campaignWaves!, wave(3, [
    { spawnPointId: 0, intervalMs: 1000, requests: EMPTY_REQUESTS },
  ])];
  const seed = 1; // The source passenger formula yields zero passengers for this stream.
  const { session, view: initial } = await startGoldTransportWave(scenario, seed);
  let view = initial;
  for (let frame = 0; frame < 20 && !view.events.some((event) =>
    event.type === 'enemy-defeated' && event.enemyType === 6); frame += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  const killed = view.enemies.find(({ type, alive }) => type === 6 && !alive);
  assert.ok(killed);
  const priorityMap = createRoutePriorityMap(scenario);
  const routeValue = normalizedRoutePriority(
    priorityMap,
    Math.trunc(killed.positionFine.x / 7680),
    Math.trunc(killed.positionFine.y / 7680),
  );
  const difficultyValue = 1000 + ((1500 - routeValue) * 10);
  const expectedNextDifficulty = Math.trunc((1000 + Math.trunc(difficultyValue / 11)) / 2);

  for (let frame = 0; frame < 20 && view.wave?.number !== 3; frame += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.equal(view.wave?.number, 3);
  assert.equal(view.wave?.dynamicDifficulty, expectedNextDifficulty);
  session.close();
});
