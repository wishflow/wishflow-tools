import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchP1cCampaignContent } from '../src/content/cow-gulch';
import { createGame, type CampaignWaveDefinition, type GameSession, type ScenarioContent } from '../src/game';

const transportRequests = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0];
const settlerRequests = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const goldTransportRequests = [0, 0, 0, 0, 0, 0, 0, 1, 0, 0];
const horsemanRequests = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
const bossRequests = [0, 0, 0, 0, 0, 0, 0, 0, 1, 0];
const emptyRequests = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

async function advanceToWave(session: GameSession, number: number) {
  let view = session.observe();
  for (let step = 0; step < 20 && view.wave?.number !== number; step += 1) {
    view = session.advance({ deltaMs: 0 });
  }
  assert.equal(view.wave?.number, number);
  return view;
}

function makeOpposingEnemyFixture(requests: readonly number[], id: string): ScenarioContent {
  const sourceWaves = cowGulchP1cCampaignContent.campaignWaves!;
  const campaignWaves: CampaignWaveDefinition[] = [
    { ...sourceWaves[0]!, spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: emptyRequests }] },
    { ...sourceWaves[1]!, spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: emptyRequests }] },
    {
      ...sourceWaves[2]!,
      spawnPools: [0, 1].map((spawnPointId) => ({
        spawnPointId,
        intervalMs: 0,
        requests,
      })),
    },
  ];
  return {
    ...cowGulchP1cCampaignContent,
    id,
    campaignWaveCount: 3,
    campaignWaves,
    previewWave: {
      ...cowGulchP1cCampaignContent.previewWave!,
      spawn: { cell: { x: 2, y: 8 }, direction: 'east' },
      additionalSpawns: [{ cell: { x: 6, y: 8 }, direction: 'west' }],
      baseEnemySpeed: 1000,
      redirects: [],
      exit: { x: 16, y: 16 },
    },
    units: [],
  };
}

function makeSharedRedirectFixture(requests: readonly number[], id: string): ScenarioContent {
  const scenario = makeOpposingEnemyFixture(requests, id);
  return {
    ...scenario,
    previewWave: {
      ...scenario.previewWave!,
      spawn: { cell: { x: 8, y: 8 }, direction: 'east' },
      additionalSpawns: [{ cell: { x: 7, y: 7 }, direction: 'north' }],
      redirects: [{ cell: { x: 7, y: 8 }, directions: ['east'] }],
    },
  };
}

function spawnGroup(view: ReturnType<GameSession['observe']>, spawnPointId: number): string {
  const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned'
    && candidate.spawnPointId === spawnPointId);
  assert.ok(event && event.type === 'enemy-group-spawned');
  const enemy = view.enemies.find(({ id }) => event.enemyIds.includes(id));
  assert.ok(enemy?.groupId);
  return enemy.groupId;
}

test('transport collision filters same-group objects and blocks opposing enemy groups', async () => {
  const scenario = makeOpposingEnemyFixture(transportRequests, 'p1f-opposing-transport-collision-fixture');
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 7,
  });
  await advanceToWave(session, 3);
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.events.filter((event) => event.type === 'enemy-group-spawned').length, 2);
  assert.equal(view.enemies.length, 4);

  const startingGroups = [...new Set(view.enemies.map(({ groupId }) => groupId))];
  assert.equal(startingGroups.length, 2);
  const initialPairGaps = new Map(startingGroups.map((groupId) => {
    const group = view.enemies.filter((enemy) => enemy.groupId === groupId);
    return [groupId, Math.abs(group[0]!.positionFine.x - group[1]!.positionFine.x)];
  }));
  assert.ok([...initialPairGaps.values()].every((gap) => gap === 7680));

  for (let frame = 0; frame < 50; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    const activeEnemies = view.enemies.filter(({ alive, type }) => alive && (type === 4 || type === 8));
    const firstGroup = activeEnemies.filter(({ groupId }) => groupId === startingGroups[0]);
    const secondGroup = activeEnemies.filter(({ groupId }) => groupId === startingGroups[1]);
    assert.equal(firstGroup.length, 2);
    assert.equal(secondGroup.length, 2);

    for (const left of firstGroup) {
      for (const right of secondGroup) {
        const xDistance = Math.abs(left.positionFine.x - right.positionFine.x);
        const yDistance = Math.abs(left.positionFine.y - right.positionFine.y);
        assert.ok(
          xDistance > 7678 || yDistance > 7678,
          `${left.id} and ${right.id} overlap at frame ${frame + 1}: ${xDistance}, ${yDistance}`,
        );
      }
    }

    for (const group of [firstGroup, secondGroup]) {
      const tow = group.find(({ type }) => type === 8)!;
      const wagon = group.find(({ type }) => type === 4)!;
      assert.equal(tow.positionFine.y, wagon.positionFine.y);
      assert.equal(Math.abs(tow.positionFine.x - wagon.positionFine.x), initialPairGaps.get(tow.groupId),
        'ignoreSameUnitGroup=false excludes the same-group wagon from collision candidates');
    }
  }

  const stopped = view.enemies.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]);
  for (let frame = 0; frame < 5; frame += 1) view = session.advance({ deltaMs: 100 });
  assert.deepEqual(
    view.enemies.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]),
    stopped,
    'both groups stay stopped at the collision and their same-group members keep following behind',
  );
});

test('settler units are not registered with the APK enemy collision manager', async () => {
  const scenario = makeOpposingEnemyFixture(settlerRequests, 'p1f-opposing-settler-collision-fixture');
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 7,
  });
  await advanceToWave(session, 3);
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.enemies.length, 2);
  assert.ok(view.enemies.every(({ type }) => type === 1 || type === 2));

  const groups = [...new Set(view.enemies.map(({ groupId }) => groupId))];
  let overlapped = false;
  for (let frame = 0; frame < 50; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    const first = view.enemies.find(({ groupId }) => groupId === groups[0]);
    const second = view.enemies.find(({ groupId }) => groupId === groups[1]);
    if (first && second && Math.abs(first.positionFine.x - second.positionFine.x) <= 7678) overlapped = true;
  }

  const first = view.enemies.find(({ groupId }) => groupId === groups[0]);
  const second = view.enemies.find(({ groupId }) => groupId === groups[1]);
  assert.equal(overlapped, true);
  assert.ok(first && second && first.positionFine.x > second.positionFine.x, 'settlers continue past each other');
});

test('opposing Gold Transports collide using their physical vehicle boxes', async () => {
  const scenario = makeOpposingEnemyFixture(goldTransportRequests, 'p1f-opposing-gold-transport-collision-fixture');
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 7,
  });
  await advanceToWave(session, 3);
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.enemies.length, 2);
  assert.ok(view.enemies.every(({ type, asset }) => type === 6 && asset === 'goldtransport'));
  const startingPositions = view.enemies.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]);

  let previousPositions = startingPositions;
  let stableFrames = 0;
  let moved = false;
  for (let frame = 0; frame < 100 && stableFrames < 5; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    const [left, right] = view.enemies;
    assert.ok(left && right);
    assert.ok(Math.abs(left.positionFine.x - right.positionFine.x) > 7678
      || Math.abs(left.positionFine.y - right.positionFine.y) > 7678,
    `the opposing Gold Transports do not overlap at frame ${frame + 1}`);
    const positions = view.enemies.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]);
    moved ||= JSON.stringify(positions) !== JSON.stringify(startingPositions);
    stableFrames = JSON.stringify(positions) === JSON.stringify(previousPositions) ? stableFrames + 1 : 0;
    previousPositions = positions;
  }
  assert.equal(stableFrames >= 5, true, 'both Gold Transports settle at the head-on collision');
  assert.equal(moved, true);
  const stopped = previousPositions;
  assert.deepEqual(
    view.enemies.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]),
    stopped,
    'both vehicles remain stopped at the head-on collision',
  );
  assert.notDeepEqual(stopped, startingPositions);
  session.close();
});

for (const collisionCase of [
  { name: 'horsemen', requests: horsemanRequests, type: 3 },
  { name: 'bosses', requests: bossRequests, type: 7 },
]) {
  test(`opposing ${collisionCase.name} collide using APK enemy boxes`, async () => {
    const scenario = makeOpposingEnemyFixture(
      collisionCase.requests,
      `p1f-opposing-${collisionCase.name}-collision-fixture`,
    );
    const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
      scenarioId: scenario.id,
      mode: 'formal',
      difficulty: 'easy',
      randomSeed: 7,
    });

    try {
      await advanceToWave(session, 3);
      let view = session.advance({ deltaMs: 0 });
      assert.equal(view.enemies.length, 2);
      assert.ok(view.enemies.every(({ type }) => type === collisionCase.type));

      let previousPositions = view.enemies.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]);
      let stableFrames = 0;
      let moved = false;
      for (let frame = 0; frame < 100 && stableFrames < 5; frame += 1) {
        view = session.advance({ deltaMs: 100 });
        const [left, right] = view.enemies;
        assert.ok(left && right);
        const xDistance = Math.abs(left.positionFine.x - right.positionFine.x);
        const yDistance = Math.abs(left.positionFine.y - right.positionFine.y);
        assert.ok(xDistance > 7_678 || yDistance > 7_678,
          `${collisionCase.name} collision boxes overlap at frame ${frame + 1}`);
        const positions = view.enemies.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]);
        moved ||= JSON.stringify(positions) !== JSON.stringify(previousPositions);
        stableFrames = JSON.stringify(positions) === JSON.stringify(previousPositions) ? stableFrames + 1 : 0;
        previousPositions = positions;
      }
      assert.equal(moved, true);
      assert.equal(stableFrames >= 5, true, `${collisionCase.name} remain stopped while the opposing boxes overlap`);
    } finally {
      session.close();
    }
  });
}

test('enemy route fields reserve the next redirect cell and release it after passage', async () => {
  const scenario = makeSharedRedirectFixture(transportRequests, 'p1f-redirect-field-wait-fixture');
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 7,
  });

  try {
    await advanceToWave(session, 3);
    let view = session.advance({ deltaMs: 0 });
    const firstGroupId = spawnGroup(view, 0);
    const secondGroupId = spawnGroup(view, 1);
    const findTow = (groupId: string) => view.enemies.find(({ groupId: id, type }) => id === groupId && type === 8);
    const firstStart = findTow(firstGroupId);
    const secondStart = findTow(secondGroupId);
    assert.ok(firstStart && secondStart);
    const secondStartX = secondStart.positionFine.x;

    view = session.advance({ deltaMs: 100 });
    let firstTow = findTow(firstGroupId);
    let secondTow = findTow(secondGroupId);
    assert.ok(firstTow && secondTow);
    assert.ok(firstTow.positionFine.x > firstStart.positionFine.x,
      'the first covered-wagon group enters the redirect approach');
    assert.equal(secondTow.positionFine.x, secondStartX,
      'the opposing group waits before its collision box overlaps the first group');
    assert.ok(Math.abs(firstTow.positionFine.x - secondTow.positionFine.x) > 7_678
      || Math.abs(firstTow.positionFine.y - secondTow.positionFine.y) > 7_678,
    `route-field reservation blocks before a physical collision: ${JSON.stringify([firstTow.positionFine, secondTow.positionFine])}`);

    let ownerPassed = false;
    let waitingGroupResumed = false;
    for (let frame = 0; frame < 120; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      firstTow = findTow(firstGroupId);
      secondTow = findTow(secondGroupId);
      assert.ok(firstTow && secondTow);
      ownerPassed ||= firstTow.positionFine.x > (7.5 * 7_680);
      if (ownerPassed && secondTow.positionFine.y < (9.5 * 7_680)) {
        waitingGroupResumed = true;
        break;
      }
    }
    assert.equal(ownerPassed, true, 'the first group passes the shared redirect field');
    assert.equal(waitingGroupResumed, true, 'the waiting group resumes after the occupied field clears');
  } finally {
    session.close();
  }
});

test('a defeated route-field owner no longer blocks another group', async () => {
  const scenario = makeSharedRedirectFixture(horsemanRequests, 'p1f-dead-redirect-field-owner-fixture');
  scenario.campaignEnemyByType = {
    ...scenario.campaignEnemyByType,
    3: {
      hitPoints: 1,
      cashReward: 2,
      penetration: { light: 100, fire: 100, heavy: 100, poison: 100 },
    },
  };
  const shooterTemplate = structuredClone(cowGulchP1cCampaignContent.units.find(({ id }) => id === 'gunslinger-1')!);
  const moveRect = (rect: typeof shooterTemplate.render, dx: number, dy: number) => ({
    ...rect,
    x: rect.x + dx,
    y: rect.y + dy,
  });
  const offsetX = 6 - shooterTemplate.cell.x;
  const offsetY = 10 - shooterTemplate.cell.y;
  shooterTemplate.id = 'p1f-route-field-test-shooter';
  shooterTemplate.activity = 5;
  shooterTemplate.cell = { x: 6, y: 10 };
  shooterTemplate.render = moveRect(shooterTemplate.render, offsetX, offsetY);
  shooterTemplate.hitArea = moveRect(shooterTemplate.hitArea, offsetX, offsetY);
  shooterTemplate.weapon = {
    ...shooterTemplate.weapon!,
    damage: 5_000,
    rangeFine: 100_000,
    projectileSpeed: 600,
    reloadTimeMs: 100,
    specialReloadTimeMs: 100_000,
    specialReloadFrequency: 1,
  };
  scenario.units = [shooterTemplate];

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 7,
  });

  try {
    await advanceToWave(session, 3);
    let view = session.advance({ deltaMs: 0 });
    const firstGroupId = spawnGroup(view, 0);
    const secondGroupId = spawnGroup(view, 1);
    const firstEnemy = view.enemies.find(({ groupId }) => groupId === firstGroupId);
    const secondEnemy = view.enemies.find(({ groupId }) => groupId === secondGroupId);
    assert.ok(firstEnemy && secondEnemy);
    const secondStartY = secondEnemy.positionFine.y;

    let defeatedOwner = false;
    for (let frame = 0; frame < 40 && !defeatedOwner; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      defeatedOwner = view.events.some((event) => event.type === 'enemy-defeated'
        && event.enemyId === firstEnemy.id);
    }
    assert.equal(defeatedOwner, true, 'the first group member is defeated while it owns the route field');

    let resumed = false;
    for (let frame = 0; frame < 8 && !resumed; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      const waiter: ReturnType<GameSession['observe']>['enemies'][number] | undefined = view.enemies.find(({ id }) => id === secondEnemy.id);
      assert.ok(waiter);
      resumed = waiter.positionFine.y < secondStartY;
    }
    assert.equal(resumed, true, 'a dead reservation owner cannot leave a permanent route block');
  } finally {
    session.close();
  }
});
