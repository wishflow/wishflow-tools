import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/new-mexico-02.json' with { type: 'json' };
import { apacheValleyLevelTwoContent } from '../src/content/official-campaign';
import { createGame, type EnemyView, type GameSession, type GameView } from '../src/game';
import { SimulationTimeAccumulator } from '../src/game/time-scaling';
import { calculateMapViewport } from '../src/render/map-viewport';

const APK_COLLISION_BOX_SIZE_FINE = 7_678;
const APK_COLLISION_START_OFFSET_FINE = 3_840;
const APK_MAX_START_DELTA_X_FINE = 23_040;
const APK_MAX_START_DELTA_Y_FINE = 15_360;
const tileSizePixels = calculateMapViewport(20, 18, 1024, 576).tileSize;

interface HireSlot {
  id: string;
  price: number;
}

interface CollisionEnemy {
  type: number;
  groupId: string;
  positionFine: { x: number; y: number };
  deltaFine: { x: number; y: number };
}

function apacheHireSlots(): HireSlot[] {
  const counts = new Map<number, number>();
  return map.originalTileGrid.flatMap((row) => row.flatMap((code) => {
    if (code !== 96 && code !== 97) return [];
    const index = (counts.get(code) ?? 0) + 1;
    counts.set(code, index);
    const type = code === 96 ? 'gunslinger' : 'mexican';
    return [{ id: `${type}-hire-${String(index).padStart(2, '0')}`, price: code === 96 ? 75 : 100 }];
  }));
}

async function hireMapUnit(session: GameSession, view: GameView, unitId: string): Promise<GameView> {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  assert.ok(unit, `Apache Valley map hire slot ${unitId} exists`);
  const hitArea = unit.hitArea;
  assert.equal(session.submitIntent({
    type: 'select-at',
    x: hitArea.x + hitArea.width / 2,
    y: hitArea.y + hitArea.height / 2,
  }), true);
  view = session.advance({ deltaMs: 0, tileSizePixels });
  assert.equal(view.units.find((candidate) => candidate.id === unitId)?.selected, true);
  assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId, commandId: `apache-collision-${unitId}` }), true);
  view = session.advance({ deltaMs: 0, tileSizePixels });
  assert.equal(view.units.find((candidate) => candidate.id === unitId)?.activity, 5);
  return view;
}

function collisionBox(enemy: CollisionEnemy) {
  const startX = enemy.positionFine.x - APK_COLLISION_START_OFFSET_FINE;
  const startY = enemy.positionFine.y - APK_COLLISION_START_OFFSET_FINE;
  return {
    startX,
    startY,
    endX: startX + APK_COLLISION_BOX_SIZE_FINE,
    endY: startY + APK_COLLISION_BOX_SIZE_FINE,
  };
}

/** Independent model of APK 1.8.6 advanced enemy collision checks. */
function apkCollisionBlocksMove(moving: CollisionEnemy, other: CollisionEnemy): boolean {
  if (moving.type < 3 || moving.type > 8 || other.type < 3 || other.type > 8) return false;
  if (moving.groupId === other.groupId) return false;
  const movingBox = collisionBox(moving);
  const otherBox = collisionBox(other);
  if (Math.abs(otherBox.startX - movingBox.startX) >= APK_MAX_START_DELTA_X_FINE
    || Math.abs(otherBox.startY - movingBox.startY) >= APK_MAX_START_DELTA_Y_FINE) return false;

  const boxCheck = (
    candidate: ReturnType<typeof collisionBox>,
    stationary: ReturnType<typeof collisionBox>,
    deltaFine: { x: number; y: number },
  ) => [
    { x: candidate.startX, y: candidate.startY },
    { x: candidate.endX, y: candidate.startY },
    { x: candidate.startX, y: candidate.endY },
    { x: candidate.endX, y: candidate.endY },
  ].some(({ x, y }) => x + deltaFine.x >= stationary.startX
    && x + deltaFine.x <= stationary.endX
    && y + deltaFine.y >= stationary.startY
    && y + deltaFine.y <= stationary.endY);

  return boxCheck(otherBox, movingBox, {
    x: -moving.deltaFine.x,
    y: -moving.deltaFine.y,
  }) || boxCheck(movingBox, otherBox, moving.deltaFine);
}

function movement(enemy: EnemyView): CollisionEnemy {
  const vector = {
    north: { x: 0, y: -1 },
    east: { x: 1, y: 0 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
  }[enemy.direction];
  return {
    type: enemy.type,
    groupId: enemy.groupId ?? enemy.id,
    positionFine: enemy.positionFine,
    deltaFine: { x: vector.x * enemy.speed, y: vector.y * enemy.speed },
  };
}

test('official Apache Valley seed 42 reaches the APK Wave 6 spawn collision stall', async () => {
  const session = await createGame({
    scenarios: { [apacheValleyLevelTwoContent.id]: apacheValleyLevelTwoContent },
  }).open({
    scenarioId: apacheValleyLevelTwoContent.id,
    mode: 'formal',
    randomSeed: 42,
    difficulty: 'easy',
  });

  try {
    let view = session.observe();
    const hired = new Set<string>();
    view = await hireMapUnit(session, view, 'mexican-hire-01');
    hired.add('mexican-hire-01');

    const slots = apacheHireSlots();
    const time = new SimulationTimeAccumulator();
    let callbacks = 0;
    for (let loop = 0; loop < 100; loop += 1) {
      const realDeltaMs = callbacks === 0 ? 0 : 10_000;
      callbacks += 1;
      let waveChanged = false;

      for (const deltaMs of time.advanceElapsed(realDeltaMs, 4)) {
        const previousWaveNumber = view.wave?.number;
        view = session.advance({ deltaMs, tileSizePixels });
        if (view.wave?.number !== previousWaveNumber) {
          view = session.pause();
          view = session.resume();
          waveChanged = true;
          break;
        }
        if (view.wave?.phase === 'complete') break;
      }

      if (waveChanged) continue;
      const cash = view.wave?.cash ?? 0;
      const candidate = slots.find(({ id, price }) => !hired.has(id) && price <= cash);
      if (candidate) {
        view = await hireMapUnit(session, view, candidate.id);
        hired.add(candidate.id);
      }
    }

    const active = view.enemies.filter(({ alive }) => alive);
    const wagon = active.find(({ type }) => type === 4);
    const horsemen = active.filter(({ type }) => type === 3);
    assert.equal(view.wave?.number, 6);
    assert.equal(view.wave?.phase, 'active');
    assert.equal(active.length, 3);
    assert.equal(view.wave?.pendingSpawnRequests, 4);
    assert.equal(hired.size, 18);
    assert.ok(wagon);
    assert.equal(horsemen.length, 2);
    assert.equal(wagon.direction, 'south');
    assert.equal(wagon.speed, 525);
    assert.deepEqual(wagon.positionFine, { x: 34_560, y: -6_075 });
    assert.ok(horsemen.every(({ direction, speed, positionFine }) => (
      direction === 'south' && positionFine.x === 34_560 && positionFine.y === -11_520
        && [495, 480].includes(speed)
    )));
    assert.equal(new Set([wagon.groupId, ...horsemen.map(({ groupId }) => groupId)]).size, 3,
      'the three enemies come from different groups and must collide cross-group');

    const wagonBox = collisionBox(movement(wagon));
    const firstHorse = horsemen[0]!;
    const horseBox = collisionBox(movement(firstHorse));
    const overlapFine = Math.min(wagonBox.endY, horseBox.endY) - Math.max(wagonBox.startY, horseBox.startY);
    assert.equal(overlapFine, 2_233);
    assert.equal(apkCollisionBlocksMove(movement(wagon), movement(firstHorse)), true);
    assert.equal(apkCollisionBlocksMove(movement(firstHorse), movement(wagon)), true);

    const stableEnemies = active.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]);
    for (let frame = 0; frame < 5; frame += 1) {
      view = session.advance({ deltaMs: 100, tileSizePixels });
      assert.deepEqual(
        view.enemies.filter(({ alive }) => alive).map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]),
        stableEnemies,
        `the official Apache Wave 6 spawn group stays stopped on frame ${frame + 1}`,
      );
      assert.equal(view.wave?.number, 6);
      assert.equal(view.wave?.phase, 'active');
      assert.equal(view.wave?.settlement, undefined);
      assert.equal(session.terminalRecord(), undefined);
    }
  } finally {
    session.close();
  }
});
