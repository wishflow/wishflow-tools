import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import { createGame, type GameSession, type ScenarioContent } from '../src/game';

const rocketScenario: ScenarioContent = {
  id: 'style6-rocket',
  title: { en: 'Rocket test', zh: '火箭测试' },
  map: { width: 17, height: 17, tileSize: 32, background: [], streets: [] },
  originalTileGrid: Array.from({ length: 17 }, (_, y) => Array.from({ length: 17 }, (_, x) => (
    y === 8 && x >= 4 && x <= 13 ? 52 : 0
  ))),
  units: [{
    id: 'grandpa-1',
    type: 'grandpa',
    activity: 5,
    shotSound: 'sound_rocket_launch',
    cell: { x: 5, y: 8 },
    movementSpeedFinePer100Ms: 2_000,
    asset: 'player_geezer',
    frame: { x: 0, y: 0, width: 32, height: 44 },
    render: { x: 5, y: 7.625, width: 1, height: 1.375 },
    hitArea: { x: 5, y: 7.625, width: 1, height: 1.375 },
    weapon: {
      damage: 300,
      damageType: 'heavy',
      postDamage: 12,
      postDamageDurationMs: 500,
      rangeFine: 46_080,
      reloadTimeMs: 2_000,
      projectileSpeed: 1_000,
      damageStyle: 6,
      areaDamageFine: 7_680,
    },
  }],
  previewWave: {
    ...cowGulchPreviewWave,
    initialCash: 0,
    spawn: { cell: { x: 12, y: 8 }, direction: 'east' },
    additionalSpawns: [],
    redirects: [],
    baseEnemySpeed: 0,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
    enemy: {
      hitPoints: 10_000,
      cashReward: 1,
      penetration: { light: 100, fire: 100, heavy: 50, poison: 100 },
    },
  },
};

async function openScenario(scenario: ScenarioContent = rocketScenario, randomSeed = 73): Promise<GameSession> {
  return createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed,
  });
}

function launchWave(session: GameSession) {
  session.submitIntent({ type: 'start-wave' });
  session.advance({ deltaMs: 0 });
  return session.advance({ deltaMs: 0 });
}

function pngDimensions(name: string): { width: number; height: number } {
  const file = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets', `${name}.png`);
  assert.ok(existsSync(file), `${name} asset was copied from the APK`);
  const data = readFileSync(file);
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function advanceFor(session: GameSession, durationMs: number) {
  let view = session.observe();
  let remainingMs = durationMs;
  while (remainingMs > 0) {
    const deltaMs = Math.min(100, remainingMs);
    view = session.advance({ deltaMs });
    remainingMs -= deltaMs;
  }
  return view;
}

test('Damage Style 6 uses the APK first-leg timing, traverses the rocket jump, and resolves its own sprite and sounds', async () => {
  const session = await openScenario();
  launchWave(session);

  let fired = session.observe();
  for (let elapsedMs = 0; elapsedMs < 1_100 && !fired.events.some((event) => event.type === 'unit-fired'); elapsedMs += 100) {
    fired = session.advance({ deltaMs: 100 });
  }

  const firstFlight = fired.shots.find((shot) => shot.shooterId === 'grandpa-1');
  assert.ok(firstFlight, 'Grandpa fires a rocket at the preview enemy');
  assert.equal(firstFlight.remainingMs, 730,
    'the 830ms APK first leg has already advanced by this 100ms firing frame');
  assert.equal(firstFlight.imageAsset, 'sfx_pyromaniac_rocket');
  assert.equal(firstFlight.animationFrame, 8, 'a target to the east uses the west-facing source frame');
  assert.ok(fired.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_rocket_launch'));
  assert.equal(fired.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_rocket_explosion'), false);

  let view = fired;
  let elapsedMs = 0;
  let sawRocketSparkle = false;
  let sawRocketSparkleInDrawOrder = false;
  let sawPathDamage = false;
  while (elapsedMs < 1_500 && !view.shots.some((shot) => shot.imageAsset === 'sfx_rocket_explosion')) {
    view = session.advance({ deltaMs: 100 });
    elapsedMs += 100;
    sawRocketSparkle ||= (view.rocketSparkles?.length ?? 0) > 0;
    sawRocketSparkleInDrawOrder ||= (view.rocketSparkles ?? []).some(({ id }) => view.drawOrder.includes(`rocket-sparkle:${id}`));
    sawPathDamage ||= view.events.some((event) => event.type === 'enemy-hit');
  }

  assert.ok(elapsedMs < 1_500, 'the rocket completes both legs and enters its impact animation');
  assert.equal(sawRocketSparkle, true, 'the APK emits a 3-frame sparkle at an interval burst');
  assert.equal(sawRocketSparkleInDrawOrder, true, 'the shared draw-order queue includes rocket sparkles');
  assert.equal(sawPathDamage, true, 'the rocket damages the enemy while crossing its path');
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_rocket_explosion'));
  const impact = view.shots.find((shot) => shot.imageAsset === 'sfx_rocket_explosion');
  assert.ok(impact);
  assert.equal(impact.animationFrame, 0);
  assert.equal(impact.explosionRemainingMs, 799);
  const enemyAtImpact = view.enemies.find(({ id }) => id === impact.targetId);
  assert.ok(enemyAtImpact);
  assert.equal(view.events.filter((event) => event.type === 'shot-exploded' && event.shotId === impact.id).length, 1,
    'one rocket endpoint is resolved only once');

  const nextImpactFrame = session.advance({ deltaMs: 100 });
  const impactAfter100Ms = nextImpactFrame.shots.find((shot) => shot.id === impact.id);
  assert.equal(impactAfter100Ms?.animationFrame, 1);
  assert.ok(nextImpactFrame.enemies.find(({ id }) => id === impact.targetId)!.hitPoints < enemyAtImpact.hitPoints,
    'the applied post-damage burn continues after the rocket impact');
  session.close();
});

test('Damage Style 6 uses the original direction-dependent launch point for the rocket and launch sound', async () => {
  const session = await openScenario();
  launchWave(session);
  let fired = session.observe();
  for (let elapsedMs = 0; elapsedMs < 1_100 && !fired.events.some((event) => (
    event.type === 'sound-requested' && event.sound === 'sound_rocket_launch'
  )); elapsedMs += 100) {
    fired = session.advance({ deltaMs: 100 });
  }
  const shot = fired.shots.find(({ shooterId }) => shooterId === 'grandpa-1');
  assert.ok(shot, 'Grandpa fires during the preview battle');
  assert.equal(shot.remainingMs, 730);
  const launchSound = fired.events.find((event) => event.type === 'sound-requested' && event.sound === 'sound_rocket_launch');
  assert.ok(launchSound && 'positionFine' in launchSound);
  assert.deepEqual(launchSound.positionFine, { x: 46_540, y: 63_360 });
  session.close();
});

test('Damage Style 6 does not apply the APK quarter-cell offset to Grandpa when firing south', async () => {
  const southboundScenario: ScenarioContent = {
    ...rocketScenario,
    id: 'style6-grandpa-southbound',
    previewWave: {
      ...rocketScenario.previewWave!,
      spawn: { cell: { x: 5, y: 12 }, direction: 'north' },
      baseEnemySpeed: 0,
    },
  };
  const session = await openScenario(southboundScenario);
  launchWave(session);
  let view = session.observe();
  for (let elapsedMs = 0; elapsedMs < 1_100 && !view.events.some((event) => (
    event.type === 'sound-requested' && event.sound === 'sound_rocket_launch'
  )); elapsedMs += 100) {
    view = session.advance({ deltaMs: 100 });
  }
  const launchSound = view.events.find((event) => event.type === 'sound-requested' && event.sound === 'sound_rocket_launch');
  assert.ok(launchSound && 'positionFine' in launchSound);
  assert.deepEqual(launchSound.positionFine, { x: 42_240, y: 67_660 });
  session.close();
});

test('Damage Style 6 stops its second leg when it leaves APK canyon background codes', async () => {
  const narrowCanyonGrid = rocketScenario.originalTileGrid!.map((row, y) => row.map((code, x) => (
    y === 8 && x >= 4 && x <= 10 ? 52 : code === 52 ? 0 : code
  )));
  const session = await openScenario({ ...rocketScenario, id: 'style6-narrow-canyon', originalTileGrid: narrowCanyonGrid });
  launchWave(session);
  let view = session.observe();
  for (let elapsedMs = 0; elapsedMs < 2_600 && !view.shots.some(({ imageAsset }) => imageAsset === 'sfx_rocket_explosion'); elapsedMs += 100) {
    view = session.advance({ deltaMs: 100 });
  }
  const impact = view.shots.find(({ imageAsset }) => imageAsset === 'sfx_rocket_explosion');
  assert.ok(impact, 'the rocket resolves at the first non-canyon cell');
  assert.equal(Math.trunc(impact.positionFine.x / 7_680), 11);
  session.close();
});

test('Damage Style 6 uses strict tenth-tile AOE boundaries at rocket path and endpoint bursts', async () => {
  const boundaryWeapon = { ...rocketScenario.units[0]!.weapon!, areaDamageFine: 3_840 };
  const scenario: ScenarioContent = {
    ...rocketScenario,
    id: 'style6-strict-aoe-boundary',
    units: [{ ...rocketScenario.units[0]!, weapon: boundaryWeapon }],
    previewWave: {
      ...rocketScenario.previewWave!,
      additionalSpawns: [{ cell: { x: 14, y: 8 }, direction: 'west' }],
    },
  };
  const session = await openScenario(scenario);
  launchWave(session);
  let view = session.observe();
  for (let elapsedMs = 0; elapsedMs < 1_600 && !view.shots.some(({ imageAsset }) => imageAsset === 'sfx_rocket_explosion'); elapsedMs += 100) {
    view = session.advance({ deltaMs: 100 });
  }
  const boundaryEnemy = view.enemies.find(({ id }) => id === 'preview-pioneer-2');
  assert.ok(boundaryEnemy);
  assert.equal(boundaryEnemy.hitPoints, boundaryEnemy.maxHitPoints,
    'the rocket does not damage an enemy exactly five tenth-tiles from its terminal burst');
  session.close();
});

test('Damage Style 6 zero-distance jump direction is deterministic from the Game seed', async () => {
  const zeroDistanceScenario: ScenarioContent = {
    ...rocketScenario,
    id: 'style6-zero-distance',
    previewWave: {
      ...rocketScenario.previewWave!,
      spawn: { cell: { x: 7.56, y: 7.75 }, direction: 'east' },
      baseEnemySpeed: 0,
    },
  };
  const first = await openScenario(zeroDistanceScenario, 73);
  const second = await openScenario(zeroDistanceScenario, 73);
  launchWave(first);
  launchWave(second);
  let firstView = first.observe();
  let secondView = second.observe();
  for (let elapsedMs = 0; elapsedMs < 500; elapsedMs += 100) {
    firstView = first.advance({ deltaMs: 100 });
    secondView = second.advance({ deltaMs: 100 });
  }
  assert.deepEqual(firstView.shots[0]?.positionFine, secondView.shots[0]?.positionFine,
    'the near-zero-distance random heading is repeatable for the same Game seed');
  first.close();
  second.close();
});

test('Damage Style 6 follows a moving target during its first leg', async () => {
  const stationary = await openScenario(rocketScenario, 73);
  const movingScenario: ScenarioContent = {
    ...rocketScenario,
    id: 'style6-moving-target',
    previewWave: { ...rocketScenario.previewWave!, baseEnemySpeed: 10 },
  };
  const moving = await openScenario(movingScenario, 73);
  launchWave(stationary);
  launchWave(moving);

  const firstShot = async (session: GameSession) => {
    let view = session.observe();
    for (let elapsedMs = 0; elapsedMs < 1_100; elapsedMs += 100) {
      view = session.advance({ deltaMs: 100 });
      if (view.events.some((event) => event.type === 'unit-fired' && event.unitId === 'grandpa-1')) return view;
    }
    assert.fail('Grandpa should fire within the preview setup window');
  };
  firstShot(stationary);
  firstShot(moving);
  let stationaryView = stationary.observe();
  let movingView = moving.observe();
  for (let elapsedMs = 0; elapsedMs < 300; elapsedMs += 100) {
    stationaryView = stationary.advance({ deltaMs: 100 });
    movingView = moving.advance({ deltaMs: 100 });
  }
  assert.notDeepEqual(movingView.enemies[0]?.positionFine, stationaryView.enemies[0]?.positionFine,
    'the target moves during the first flight leg');
  assert.notDeepEqual(movingView.shots[0]?.positionFine, stationaryView.shots[0]?.positionFine,
    'the rocket endpoint and interpolated position follow that target');
  stationary.close();
  moving.close();
});

test('Damage Style 6 atlas assets retain the APK frame dimensions', () => {
  assert.deepEqual(pngDimensions('sfx_pyromaniac_rocket'), { width: 256, height: 16 });
  assert.deepEqual(pngDimensions('sfx_rocket_explosion'), { width: 448, height: 52 });
  assert.deepEqual(pngDimensions('sfx_rocket_sparkles'), { width: 84, height: 28 });
});
