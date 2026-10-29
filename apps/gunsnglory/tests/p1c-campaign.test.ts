import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchContent, cowGulchP1cCampaignContent } from '../src/content/cow-gulch';
import { createGame, type CampaignWaveDefinition, type GameSession, type ScenarioContent } from '../src/game';

const emptyRequests = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

async function advanceToWave(session: GameSession, number: number) {
  let view = session.observe();
  for (let step = 0; step < 20 && view.wave?.number !== number; step += 1) {
    view = session.advance({ deltaMs: 0 });
  }
  assert.equal(view.wave?.number, number, `campaign should automatically reach wave ${number}`);
  return view;
}

function makeTransportFixture(requestCount = 1): ScenarioContent {
  const waves = cowGulchP1cCampaignContent.campaignWaves!;
  const fixtureWaves: CampaignWaveDefinition[] = [
    { ...waves[0]!, spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: emptyRequests }] },
    { ...waves[1]!, spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: emptyRequests }] },
    { ...waves[2]!, spawnPools: [{ spawnPointId: 0, intervalMs: 3000, intervalMultiplier: 2, requests: [0, 0, 0, 0, 0, requestCount, 0, 0, 0, 0] }] },
  ];
  return {
    ...cowGulchP1cCampaignContent,
    id: 'p1c-transport-fixture',
    campaignWaveCount: 3,
    campaignWaves: fixtureWaves,
    units: [],
  };
}

test('Cow Gulch P1-C declares the third wave as pool type 7, not enemy type 7', () => {
  const wave = cowGulchP1cCampaignContent.campaignWaves?.[2];
  assert.deepEqual(wave, {
    number: 3,
    hitPointMultiplierPercent: 60,
    speedMultiplierPercent: 100,
    spawnPools: [{
      spawnPointId: 0,
      intervalMs: 3000,
      intervalMultiplier: 2,
      requests: [0, 0, 0, 0, 0, 3, 0, 0, 0, 0],
    }],
  });
});

test('Wave03 creates one type-8/type-4 group with fixed wave speed', async () => {
  const scenario = makeTransportFixture();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 1,
  });
  await advanceToWave(session, 3);
  const view = session.advance({ deltaMs: 0 });
  const spawn = view.events.find((event) => event.type === 'enemy-group-spawned');
  assert.equal(spawn?.type, 'enemy-group-spawned');
  if (spawn?.type !== 'enemy-group-spawned') return;
  assert.equal(spawn.requestType, 4);
  assert.equal(spawn.groupSize, 2);

  const members = view.enemies;
  assert.deepEqual(members.map(({ type }) => type), [8, 4]);
  assert.equal(members[0]?.groupId, members[1]?.groupId);
  assert.deepEqual(members.map(({ speed }) => speed), [
    scenario.previewWave!.baseEnemySpeed,
    scenario.previewWave!.baseEnemySpeed,
  ]);
  assert.ok(members[0]?.asset.startsWith('horse_wagon'));
  assert.equal(members[1]?.asset, 'wagon');
});

test('covered wagon death rewards once, waits until 499 ms, and emits visual-only debris and routed passengers', async () => {
  const fixture = makeTransportFixture();
  const baseGun = cowGulchContent.units.find((unit) => unit.id === 'gunslinger-1')!;
  const scenario: ScenarioContent = {
    ...fixture,
    id: 'p1c-wagon-death-fixture',
    previewWave: { ...fixture.previewWave!, baseEnemySpeed: 500 },
    units: [{
      ...baseGun,
      activity: 5,
      cell: { x: 4, y: 10 },
      weapon: {
        damage: 5000,
        damageType: 'light',
        rangeFine: 153600,
        reloadTimeMs: 100,
        projectileSpeed: 600,
        damageStyle: 0,
      },
    }],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 2,
  });
  await advanceToWave(session, 3);
  let view = session.advance({ deltaMs: 0 });
  const wagon = view.enemies.find(({ type }) => type === 4)!;
  const tow = view.enemies.find(({ type }) => type === 8)!;
  assert.equal(wagon.damageable, true);
  assert.equal(tow.damageable, false);
  assert.equal(wagon.groupId, tow.groupId);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    view = session.advance({ deltaMs: 100 });
    if (view.events.some((event) => event.type === 'enemy-defeated' && event.enemyId === wagon.id)) break;
  }
  assert.ok(view.events.some((event) => event.type === 'enemy-defeated'
    && event.enemyId === wagon.id && event.cashReward === 10), JSON.stringify({ events: view.events, enemies: view.enemies.map(({id,type,alive,hitPoints,positionFine})=>({id,type,alive,hitPoints,positionFine})), wave: view.wave }));
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_wagon_explode'));
  assert.equal(view.wave?.cash, 75);
  assert.equal(view.enemies.find(({ id }) => id === tow.id)?.alive, false);

  view = session.advance({ deltaMs: 100 });
  view = session.advance({ deltaMs: 100 });
  view = session.advance({ deltaMs: 99 });
  assert.equal(view.enemies.find(({ id }) => id === wagon.id)?.deathRemainingMs, 500);
  assert.equal(view.wagonDebris?.length, 0);
  assert.equal(view.enemies.filter(({ id }) => id.startsWith('wagon-passenger-')).length, 0);

  view = session.advance({ deltaMs: 1 });
  const wreck = view.enemies.find(({ id }) => id === wagon.id)!;
  assert.equal(wreck.deathRemainingMs, 499);
  assert.equal(view.wagonDebris?.length, 20);
  const debrisDepthY = wreck.positionFine.y;
  assert.ok(view.wagonDebris?.every((part) => part.depthFineY === debrisDepthY),
    'all parts keep the parent GameObjectWagonParts depth anchor');
  const passengers = view.enemies.filter(({ id }) => id.startsWith('wagon-passenger-'));
  assert.ok(passengers.length > 0 && passengers.length <= 4, 'seed 2 should exercise at least one source passenger');
  assert.ok(passengers.every((passenger) => passenger.type === 1 || passenger.type === 2));
  assert.ok(passengers.every((passenger) => passenger.positionFine.x === wreck.positionFine.x
    && passenger.positionFine.y === wreck.positionFine.y));
  assert.equal(new Set(passengers.map(({ groupId }) => groupId)).size, passengers.length);
  assert.ok(passengers.every((passenger) => passenger.drawingOffsetFine?.x !== 0
    || passenger.drawingOffsetFine?.y !== 0));
  view = session.advance({ deltaMs: 100 });
  assert.ok(view.wagonDebris?.every((part) => part.depthFineY === debrisDepthY),
    'the parent depth anchor stays fixed while parts move');
  assert.ok(view.wagonDebris?.some((part) => part.positionFine.y !== part.depthFineY),
    'at least one airborne part moves away from its parent draw depth');
});


test('original Wave03 emits all three covered-wagon pairs at the six-second interval', async () => {
  const scenario = makeTransportFixture(3);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 7,
  });
  await advanceToWave(session, 3);
  let view = session.advance({ deltaMs: 0 });
  const spawnedGroups = () => view.events.filter((event) => event.type === 'enemy-group-spawned').length;
  const advanceFor = (durationMs: number) => {
    let remaining = durationMs;
    while (remaining > 0) {
      const step = Math.min(100, remaining);
      view = session.advance({ deltaMs: step });
      remaining -= step;
    }
  };
  assert.equal(spawnedGroups(), 1);
  assert.equal(view.wave?.pendingSpawnRequests, 2);
  assert.equal(view.wave?.phase, 'active');

  for (let expectedGroups = 2; expectedGroups <= 3; expectedGroups += 1) {
    advanceFor(5999);
    assert.equal(spawnedGroups(), 0, 'the next pair cannot spawn before the six-second interval');
    assert.equal(view.wave?.pendingSpawnRequests, 3 - (expectedGroups - 1));
    view = session.advance({ deltaMs: 1 });
    assert.equal(spawnedGroups(), 0, 'the countdown reaching zero is observed on the following update');
    view = session.advance({ deltaMs: 0 });
    assert.equal(spawnedGroups(), 1);
    assert.equal(view.wave?.pendingSpawnRequests, 3 - expectedGroups);
  }

  assert.equal(view.wave?.phase, 'active', 'a cleared request pool does not settle while transport units remain alive');
  assert.equal(view.wave?.pendingSpawnRequests, 0);
  assert.equal(view.enemies.filter(({ alive }) => alive).length, 6);
  assert.deepEqual(view.enemies.map(({ type }) => type), [8, 4, 8, 4, 8, 4]);
});

test('a blocked transport spawn keeps its request and retries after the three-second half interval', async () => {
  const fixture = makeTransportFixture();
  const scenario: ScenarioContent = {
    ...fixture,
    id: 'p1c-transport-retry-fixture',
    previewWave: {
      ...fixture.previewWave!,
      spawn: { cell: { x: 8, y: 8 }, direction: 'east' },
      baseEnemySpeed: 550,
      additionalSpawns: [{ cell: { x: 5, y: 8 }, direction: 'west' }],
    },
    campaignWaves: [
      ...fixture.campaignWaves!.slice(0, 2),
      {
        ...fixture.campaignWaves![2]!,
        spawnPools: [0, 1].map((spawnPointId) => ({
          spawnPointId,
          intervalMs: 3000,
          intervalMultiplier: 2,
          requests: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
        })),
      },
    ],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 11,
  });
  await advanceToWave(session, 3);
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.events.filter((event) => event.type === 'enemy-group-spawned').length, 1);
  assert.equal(view.wave?.pendingSpawnRequests, 1, 'the colliding spawn remains in its pool');
  assert.equal(view.enemies.length, 2);

  for (let frame = 0; frame < 29; frame += 1) view = session.advance({ deltaMs: 100 });
  assert.equal(view.events.filter((event) => event.type === 'enemy-group-spawned').length, 0);
  assert.equal(view.wave?.pendingSpawnRequests, 1);
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.events.filter((event) => event.type === 'enemy-group-spawned').length, 0, 'the failed spawn countdown expires before the next retry update');
  assert.equal(view.wave?.pendingSpawnRequests, 1);
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.events.filter((event) => event.type === 'enemy-group-spawned').length, 1);
  assert.equal(view.wave?.pendingSpawnRequests, 0);
  assert.equal(view.enemies.length, 4);
});


test('transport admission probes ahead using physical coordinates without display offsets', async () => {
  const fixture = makeTransportFixture();
  const scenario: ScenarioContent = {
    ...fixture,
    id: 'p1c-physical-spawn-collision-fixture',
    previewWave: {
      ...fixture.previewWave!,
      spawn: { cell: { x: 8, y: 8 }, direction: 'east' },
      additionalSpawns: [{ cell: { x: 6, y: 10 }, direction: 'south' }],
    },
    campaignWaves: [
      ...fixture.campaignWaves!.slice(0, 2),
      {
        ...fixture.campaignWaves![2]!,
        spawnPools: [0, 1].map((spawnPointId) => ({
          spawnPointId,
          intervalMs: 0,
          requests: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
        })),
      },
    ],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 5,
  });
  await advanceToWave(session, 3);
  const view = session.advance({ deltaMs: 0 });

  assert.equal(view.events.filter((event) => event.type === 'enemy-group-spawned').length, 2);
  assert.equal(view.wave?.pendingSpawnRequests, 0);
  assert.equal(view.enemies.length, 4);
  const firstGroup = view.enemies.filter(({ groupId }) => groupId === 'campaign-3-group-1');
  assert.equal(firstGroup.length, 2);
  const horse = firstGroup.find(({ type }) => type === 8)!;
  const secondHorse = view.enemies.find(({ groupId, type }) => groupId === 'campaign-3-group-2' && type === 8)!;
  assert.equal(secondHorse.positionFine.x, horse.positionFine.x);
  assert.equal(secondHorse.positionFine.y, horse.positionFine.y);
  const admissionProbe = { x: secondHorse.positionFine.x, y: secondHorse.positionFine.y + 7680 };
  assert.ok(Math.abs(admissionProbe.y - (horse.positionFine.y + horse.drawingOffsetFine!.y)) < 7680);
  assert.equal(Math.abs(admissionProbe.y - horse.positionFine.y), 7680);
});
