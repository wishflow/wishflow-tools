import assert from 'node:assert/strict';
import test from 'node:test';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createOregon09MapContent } from '../src/content/oregon-09-map-entities';
import map from '../src/content/oregon-09.json';
import { createGame, type ScenarioContent } from '../src/game';

const FINE_PER_CELL = 7_680;
const PLAYER_COLLIDER_X = -2_534;

function scenarioForPlayer(
  id: string,
  start: { x: number; y: number },
  unlockedUnitTypes: readonly number[] = [],
): ScenarioContent {
  const unlocks = new Set(unlockedUnitTypes);
  const { units, scene } = createOregon09MapContent((unitTypeId) => unlocks.has(unitTypeId));
  return {
    id,
    title: { en: 'Snake River collision check', zh: 'Snake River 碰撞检查' },
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units: [createActiveGunslinger(start), ...units],
  };
}

async function openPlayerSession(
  id: string,
  start: { x: number; y: number },
  unlockedUnitTypes: readonly number[] = [],
) {
  const scenario = scenarioForPlayer(id, start, unlockedUnitTypes);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } })
    .open({ scenarioId: scenario.id, randomSeed: 29 });
  assert.equal(session.submitIntent({ type: 'select-at', x: start.x + 0.5, y: start.y + 0.5 }), true);
  session.advance({ deltaMs: 0, tileSizePixels: 32 });
  assert.equal(session.observe().units.find(({ id: unitId }) => unitId === 'gunslinger-1')?.selected, true);
  return session;
}

async function moveFor(session: Awaited<ReturnType<typeof openPlayerSession>>, targetX: number, targetY: number, frames = 80) {
  assert.equal(session.submitIntent({ type: 'move-unit', targetX, targetY }), true);
  let view = session.observe();
  for (let frame = 0; frame < frames; frame += 1) {
    view = session.advance({ deltaMs: 10, tileSizePixels: 32 });
  }
  const unit = view.units.find(({ id }) => id === 'gunslinger-1');
  assert.ok(unit);
  return { view, unit };
}

test('Snake River horizontal bridge allows travel on raw 80 and blocks both raw 32 banks', async () => {
  assert.equal(map.originalTileGrid[13]?.[4], 80);
  assert.equal(map.originalTileGrid[12]?.[4], 32);
  assert.equal(map.originalTileGrid[14]?.[4], 32);
  const session = await openPlayerSession('snake-river-horizontal-bridge', { x: 4, y: 13 });

  const { unit: upper } = await moveFor(session, 4.5, 11, 60);
  const upperY = upper.positionFine.y / FINE_PER_CELL;
  assert.ok(upperY >= 13.7 && upperY < 13.75, `upper bridge boundary is ${upperY}`);

  const { unit: lower } = await moveFor(session, 4.5, 16, 90);
  const lowerY = lower.positionFine.y / FINE_PER_CELL;
  assert.ok(lowerY > 14 && lowerY < 14.1, `lower bridge boundary is ${lowerY}`);
  session.close();
});

test('Snake River vertical bridge allows travel on raw 88 and blocks its raw 36 banks', async () => {
  assert.equal(map.originalTileGrid[10]?.[20], 88);
  assert.equal(map.originalTileGrid[10]?.[19], 36);
  assert.equal(map.originalTileGrid[10]?.[21], 36);
  const session = await openPlayerSession('snake-river-vertical-bridge', { x: 20, y: 10 });

  const { unit: left } = await moveFor(session, 18, 10.75, 60);
  const leftX = left.positionFine.x / FINE_PER_CELL;
  assert.ok(leftX > 20.3 && leftX < 20.5, `left bridge boundary is ${leftX}`);

  const { unit: right } = await moveFor(session, 23, 10.75, 80);
  const rightX = right.positionFine.x / FINE_PER_CELL;
  assert.ok(rightX > 20.5 && rightX < 20.7, `right bridge boundary is ${rightX}`);
  session.close();
});

test('Snake River raw 36 wall blocks player movement at the shaped cliff edge', async () => {
  assert.equal(map.originalTileGrid[15]?.[2], 36);
  const session = await openPlayerSession('snake-river-raw-36-wall', { x: 1, y: 15 });
  const { unit } = await moveFor(session, 5, 15.75, 100);
  const right = unit.positionFine.x - PLAYER_COLLIDER_X;
  assert.ok(right <= 2 * FINE_PER_CELL, `unit collider stops before raw 36 wall at x=${right / FINE_PER_CELL}`);
  assert.ok(unit.positionFine.x / FINE_PER_CELL > 1.5, 'the player can approach the wall from the walkable side');
  session.close();
});

test('Snake River sleeping Grandpa remains a physical obstacle in a real session', async () => {
  const session = await openPlayerSession('snake-river-sleeping-grandpa', { x: 6, y: 1 }, [6]);
  const sleeping = session.observe().units.find(({ cell, activity }) => cell.x === 9 && cell.y === 1 && activity === 4);
  assert.ok(sleeping, 'raw 101 at (9,1) creates an unlocked sleeping Grandpa');

  const { unit: mover, view } = await moveFor(session, 12, 1.75, 140);
  const currentSleeping = view.units.find(({ id }) => id === sleeping.id);
  assert.ok(currentSleeping);
  const movingRight = mover.positionFine.x - PLAYER_COLLIDER_X;
  const sleepingLeft = currentSleeping.positionFine.x + PLAYER_COLLIDER_X;
  assert.ok(movingRight <= sleepingLeft,
    `player collider at ${movingRight / FINE_PER_CELL} stops before sleeping unit at ${sleepingLeft / FINE_PER_CELL}`);
  assert.ok(mover.positionFine.x / FINE_PER_CELL > 7, 'the player traverses the open cells before the blocker');
  session.close();
});

test('Snake River shack marker blocks movement using its APK collision rectangle', async () => {
  assert.equal(map.originalTileGrid[0]?.[8], 116);
  const session = await openPlayerSession('snake-river-shack-obstacle', { x: 4, y: 0 });
  const { unit } = await moveFor(session, 12, 0.75, 120);
  const movingRight = unit.positionFine.x - PLAYER_COLLIDER_X;
  const shackLeft = 7 * FINE_PER_CELL;
  assert.ok(movingRight <= shackLeft, `player collider stops before the APK shack at x=${movingRight / FINE_PER_CELL}`);
  assert.ok(unit.positionFine.x / FINE_PER_CELL > 5.5, 'the player traverses the open cells before the shack');
  session.close();
});
