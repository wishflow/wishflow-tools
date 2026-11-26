import assert from 'node:assert/strict';
import test from 'node:test';
import fortMap from '../src/content/new-mexico-03.json' with { type: 'json' };
import { fortKaboomLevelThreeContent } from '../src/content/official-campaign';
import { createGame, type EnemyView, type GameSession, type GameView } from '../src/game';
import { SimulationTimeAccumulator } from '../src/game/time-scaling';

const APK_COLLISION_BOX_SIZE_FINE = 7_678;
const APK_COLLISION_START_OFFSET_FINE = 3_840;
const APK_MAX_START_DELTA_X_FINE = 23_040;
const APK_MAX_START_DELTA_Y_FINE = 15_360;
const hirePriority = ['sniper', 'mexican', 'indian', 'grandpa', 'gunslinger', 'cannon'] as const;

const hireDefinitions: Readonly<Record<number, { type: string; price: number }>> = {
  96: { type: 'gunslinger', price: 75 },
  97: { type: 'mexican', price: 100 },
  98: { type: 'cannon', price: 150 },
  99: { type: 'indian', price: 125 },
  100: { type: 'sniper', price: 90 },
  101: { type: 'grandpa', price: 130 },
};

interface HireSlot {
  id: string;
  type: string;
  price: number;
  x: number;
  y: number;
}

interface CollisionEnemy {
  type: number;
  groupId: string;
  positionFine: { x: number; y: number };
  deltaFine: { x: number; y: number };
}

function fortHireSlots(): HireSlot[] {
  const counts = new Map<number, number>();
  return fortMap.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const definition = hireDefinitions[code];
    if (!definition) return [];
    const index = (counts.get(code) ?? 0) + 1;
    counts.set(code, index);
    return [{ id: `${definition.type}-hire-${String(index).padStart(2, '0')}`, ...definition, x, y }];
  }));
}

async function hireMapUnit(session: GameSession, view: GameView, unitId: string): Promise<GameView> {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  assert.ok(unit, `Fort map hire slot ${unitId} exists`);
  const hitArea = unit.hitArea;
  assert.equal(session.submitIntent({
    type: 'select-at',
    x: hitArea.x + hitArea.width / 2,
    y: hitArea.y + hitArea.height / 2,
  }), true);
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.units.find((candidate) => candidate.id === unitId)?.selected, true);
  assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId, commandId: `fort-collision-${unitId}` }), true);
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.units.find((candidate) => candidate.id === unitId)?.activity, 5,
    `${unitId} is hired using the official campaign setup`);
  return view;
}

async function moveFirstCannon(session: GameSession, view: GameView): Promise<GameView> {
  const cannon = view.units.find(({ id }) => id === 'cannon-hire-01');
  assert.ok(cannon);
  const hitArea = cannon.hitArea;
  assert.equal(session.submitIntent({
    type: 'select-at',
    x: hitArea.x + hitArea.width / 2,
    y: hitArea.y + hitArea.height / 2,
  }), true);
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.units.find(({ id }) => id === cannon.id)?.selected, true);
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 9.5, targetY: 5.75 }), true);
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.units.find(({ id }) => id === cannon.id)?.moving, true);
  return view;
}

function apkCollisionBox(enemy: CollisionEnemy) {
  const startX = enemy.positionFine.x - APK_COLLISION_START_OFFSET_FINE;
  const startY = enemy.positionFine.y - APK_COLLISION_START_OFFSET_FINE;
  return {
    startX,
    startY,
    endX: startX + APK_COLLISION_BOX_SIZE_FINE,
    endY: startY + APK_COLLISION_BOX_SIZE_FINE,
  };
}

/** Independent model of APK 1.8.6's advanced enemy collision candidate check. */
function apkCollisionBlocksMove(moving: CollisionEnemy, other: CollisionEnemy): boolean {
  if (moving.type < 3 || moving.type > 8 || other.type < 3 || other.type > 8) return false;
  if (moving.groupId === other.groupId) return false;
  const movingBox = apkCollisionBox(moving);
  const otherBox = apkCollisionBox(other);
  if (Math.abs(otherBox.startX - movingBox.startX) >= APK_MAX_START_DELTA_X_FINE
    || Math.abs(otherBox.startY - movingBox.startY) >= APK_MAX_START_DELTA_Y_FINE) return false;

  const boxCheck = (
    candidate: ReturnType<typeof apkCollisionBox>,
    stationary: ReturnType<typeof apkCollisionBox>,
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

test('official Fort Kaboom seed 42 reproduces the APK Wave 3 cross-group collision stall', async () => {
  const session = await createGame({
    scenarios: { [fortKaboomLevelThreeContent.id]: fortKaboomLevelThreeContent },
  }).open({
    scenarioId: fortKaboomLevelThreeContent.id,
    mode: 'formal',
    randomSeed: 42,
    difficulty: 'easy',
  });

  try {
    let view = session.observe();
    const hired = new Set<string>();
    for (const unitId of ['cannon-hire-01', 'cannon-hire-02']) {
      view = await hireMapUnit(session, view, unitId);
      hired.add(unitId);
    }
    view = await moveFirstCannon(session, view);

    const slots = fortHireSlots();
    assert.equal(slots.length, 31);
    assert.equal(slots.filter(({ type }) => type === 'cannon').length, 2);

    const time = new SimulationTimeAccumulator();
    let callbackCount = 0;
    let stableFrames = 0;
    let previousStallPositions: readonly number[] | undefined;
    let sourcePair: readonly [EnemyView, EnemyView] | undefined;

    for (let loop = 0; loop < 120; loop += 1) {
      const realDeltaMs = callbackCount === 0 ? 0 : 10_000;
      callbackCount += 1;
      let waveChanged = false;

      for (const deltaMs of time.advanceElapsed(realDeltaMs, 4)) {
        const previousWaveNumber = view.wave?.number;
        view = session.advance({ deltaMs });

        const stagecoach = view.enemies.find(({ type, alive, positionFine }) => type === 5 && alive
          && positionFine.x === -6_200 && positionFine.y === 72_960);
        const horseman = view.enemies.find(({ type, alive, positionFine }) => type === 3 && alive
          && positionFine.x === -11_520 && positionFine.y === 72_960);
        if (stagecoach && horseman) {
          const stagecoachMove = movement(stagecoach);
          const horsemanMove = movement(horseman);
          const stagecoachBox = apkCollisionBox(stagecoachMove);
          const horsemanBox = apkCollisionBox(horsemanMove);
          const horizontalOverlap = Math.min(stagecoachBox.endX, horsemanBox.endX)
            - Math.max(stagecoachBox.startX, horsemanBox.startX);
          const verticalOverlap = Math.min(stagecoachBox.endY, horsemanBox.endY)
            - Math.max(stagecoachBox.startY, horsemanBox.startY);

          if (horizontalOverlap > 0 && verticalOverlap > 0) {
            sourcePair = [stagecoach, horseman];
            assert.notEqual(stagecoach.groupId, horseman.groupId);
            assert.equal(stagecoach.direction, 'east');
            assert.equal(horseman.direction, 'east');
            assert.equal(stagecoach.speed, 500);
            assert.equal(horseman.speed, 460);
            assert.deepEqual(stagecoach.positionFine, { x: -6_200, y: 72_960 });
            assert.deepEqual(horseman.positionFine, { x: -11_520, y: 72_960 });
            assert.equal(horizontalOverlap, 2_358);
            assert.equal(apkCollisionBlocksMove(stagecoachMove, horsemanMove), true,
              'the APK source model blocks the stagecoach candidate');
            assert.equal(apkCollisionBlocksMove(horsemanMove, stagecoachMove), true,
              'the APK source model blocks the horseman candidate');

            const currentPositions = [
              stagecoach.positionFine.x,
              stagecoach.positionFine.y,
              horseman.positionFine.x,
              horseman.positionFine.y,
            ];
            if (previousStallPositions && currentPositions.every((value, index) => (
              value === previousStallPositions![index]
            ))) {
              stableFrames = Math.min(5, stableFrames + 1);
            } else {
              stableFrames = 0;
            }
            previousStallPositions = currentPositions;
          }
        }

        if (view.wave?.number !== previousWaveNumber) {
          view = session.pause();
          view = session.resume();
          waveChanged = true;
          break;
        }
        if (view.wave?.phase !== 'active') break;
      }

      if (stableFrames >= 5
        && view.wave?.phase === 'active'
        && view.wave.activeEnemies === 2
        && view.wave.pendingSpawnRequests === 0) break;
      if (waveChanged) continue;
      const cash = view.wave?.cash ?? 0;
      const purchaseCandidate = slots
        .filter(({ id, y, price }) => !hired.has(id) && y >= 4 && y <= 10 && price <= cash)
        .sort((left, right) => hirePriority.indexOf(left.type as typeof hirePriority[number])
          - hirePriority.indexOf(right.type as typeof hirePriority[number])
          || left.y - right.y || left.x - right.x)[0];
      if (purchaseCandidate) {
        view = await hireMapUnit(session, view, purchaseCandidate.id);
        hired.add(purchaseCandidate.id);
      }
    }

    assert.ok(sourcePair, 'the official seed and UI scheduling reach the source-collision pair');
    assert.ok(stableFrames >= 5, 'the pair remains at the same coordinates for at least five 100ms steps');

    const [stagecoach, horseman] = sourcePair;
    assert.equal(view.wave?.number, 3);
    assert.equal(view.wave?.phase, 'active');
    assert.equal(view.wave?.activeEnemies, 2);
    assert.equal(view.wave?.pendingSpawnRequests, 0);
    assert.equal(view.wave?.settlement, undefined);
    assert.equal(session.terminalRecord(), undefined);
    for (let frame = 0; frame < 5; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      const currentStagecoach = view.enemies.find(({ id }) => id === stagecoach.id);
      const currentHorseman = view.enemies.find(({ id }) => id === horseman.id);
      assert.deepEqual(currentStagecoach?.positionFine, stagecoach.positionFine);
      assert.deepEqual(currentHorseman?.positionFine, horseman.positionFine);
      assert.equal(view.wave?.number, 3);
      assert.equal(view.wave?.phase, 'active');
      assert.equal(view.wave?.activeEnemies, 2,
        'only the stalled pair remains active once all Wave 3 requests are exhausted');
      assert.equal(view.wave?.pendingSpawnRequests, 0);
      assert.equal(view.wave?.settlement, undefined);
      assert.equal(session.terminalRecord(), undefined);
    }
  } finally {
    session.close();
  }
});
