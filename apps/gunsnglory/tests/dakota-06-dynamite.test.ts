import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import { campaignCatalog } from '../src/content/campaign-catalog';
import { createDakota06DynamiteDefinition, createDakota06DynamiteDefinitionFromSnapshot } from '../src/content/dakota-06-dynamite';
import map from '../src/content/dakota-06.json';
import { createDakota06MapScene } from '../src/content/dakota-06-scene';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent } from '../src/game';
import { PLAYER_UNIT_COLLIDER_FINE, createPlayerMapCollisionBoxes } from '../src/game/player-collision-geometry';

const FINE_UNITS_PER_CELL = 7_680;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

function campaignScenarioIdForLevel(globalLevel: number): string {
  const entry = campaignCatalog.find(({ level }) => level === globalLevel);
  assert.ok(entry, `campaign level ${globalLevel} is registered`);
  const levelWithinRegion = ((globalLevel - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(levelWithinRegion).padStart(2, '0')}`;
}

function emptyMovementGrid(): number[][] {
  return Array.from({ length: map.map.height }, () => Array<number>(map.map.width).fill(0));
}

async function moveAcrossDynamite(unlocked: boolean) {
  const grid = emptyMovementGrid();
  const id = `ice-rocks-dynamite-collision-${unlocked ? 'unlocked' : 'locked'}`;
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Ice Rocks dynamite collision', zh: 'Ice Rocks 炸药碰撞' },
    map: {
      width: map.map.width,
      height: map.map.height,
      tileSize: 32,
      background: [],
      streets: [],
      backgroundCollisionCodes: Array.from({ length: map.map.height }, () => Array<number>(map.map.width).fill(0)),
    },
    originalTileGrid: grid,
    units: [createActiveGunslinger({ x: 3, y: 18 }, unlocked ? 602 : 601)],
    dynamite: createDakota06DynamiteDefinitionFromSnapshot(unlocked),
  };
  const session = await createGame({ scenarios: { [id]: scenario } }).open({ scenarioId: id, randomSeed: 11 });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: 3.5, y: 18.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 8.5, targetY: 18.75 }), true);

    let view = session.observe();
    for (let frame = 0; frame < 40; frame += 1) view = session.advance({ deltaMs: 100 });
    const unit = view.units[0];
    assert.ok(unit);
    return unit.positionFine;
  } finally {
    session.close();
  }
}

test('Ice Rocks Dynamite markers pair at their APK cells and use the global level 20/30 unlock', () => {
  assert.deepEqual(markerCells(102), [[7, 17]]);
  assert.deepEqual(markerCells(110), [[6, 18]]);

  const locked = createDakota06DynamiteDefinition([]);
  assert.deepEqual(locked, {
    unlocked: false,
    pairs: [{ id: 'dynamite-1', triggerCell: { x: 7, y: 17 }, boxCell: { x: 6, y: 18 } }],
  });

  const unlockedBy20 = createDakota06DynamiteDefinition([campaignScenarioIdForLevel(20)]);
  const unlockedBy30 = createDakota06DynamiteDefinition([campaignScenarioIdForLevel(30)]);
  assert.equal(unlockedBy20.unlocked, true);
  assert.equal(unlockedBy30.unlocked, true);
  assert.deepEqual(unlockedBy20.pairs, locked.pairs);
  assert.deepEqual(createDakota06DynamiteDefinitionFromSnapshot(true), unlockedBy20);
  assert.deepEqual(createDakota06DynamiteDefinitionFromSnapshot(false), locked);

  const lockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, createDakota06MapScene().decorations, locked);
  assert.deepEqual(lockedBoxes.filter(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110), []);
  const unlockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, createDakota06MapScene().decorations, unlockedBy20);
  assert.deepEqual(unlockedBoxes.filter(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110), [
    {
      x: 55_066,
      y: 130_944,
      width: PLAYER_UNIT_COLLIDER_FINE.width,
      height: PLAYER_UNIT_COLLIDER_FINE.height,
      sourceCell: { x: 7, y: 17 },
      sourceTdmCode: 102,
    },
    {
      x: 47_386,
      y: 138_624,
      width: PLAYER_UNIT_COLLIDER_FINE.width,
      height: PLAYER_UNIT_COLLIDER_FINE.height,
      sourceCell: { x: 6, y: 18 },
      sourceTdmCode: 110,
    },
  ]);
});

test('Ice Rocks dynamite collision blocks the unlocked box but lets a locked-state unit pass', async () => {
  const lockedPosition = await moveAcrossDynamite(false);
  const unlockedPosition = await moveAcrossDynamite(true);
  const boxLeft = (6 * FINE_UNITS_PER_CELL) + (FINE_UNITS_PER_CELL / 2) + PLAYER_UNIT_COLLIDER_FINE.x;

  assert.ok(lockedPosition.x + PLAYER_UNIT_COLLIDER_FINE.x > boxLeft + PLAYER_UNIT_COLLIDER_FINE.width,
    JSON.stringify({ lockedPosition, unlockedPosition, boxLeft }));
  assert.ok(unlockedPosition.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width <= boxLeft,
    'after the global unlock, the unit stops before overlapping the box collider');
});

test('Ice Rocks trigger damages an enemy at the exact APK three-cell blast boundary', async () => {
  const id = 'ice-rocks-dynamite-blast-boundary';
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Ice Rocks dynamite boundary', zh: 'Ice Rocks 炸药边界' },
    map: createDakota06MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [],
    dynamite: createDakota06DynamiteDefinition([campaignScenarioIdForLevel(20)]),
    previewWave: {
      ...cowGulchPreviewWave,
      initialLives: 1,
      initialCash: 0,
      spawn: { cell: { x: 7, y: 18 }, direction: 'west' },
      additionalSpawns: [],
      baseEnemySpeed: 0,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      redirects: [],
      exit: { x: 31, y: 18 },
      enemy: {
        hitPoints: 5_000,
        cashReward: 0,
        penetration: { light: 100, fire: 100, heavy: 25, poison: 100 },
      },
    },
  };
  const session = await createGame({ scenarios: { [id]: scenario } }).open({ scenarioId: id, randomSeed: 11 });
  try {
    session.submitIntent({ type: 'start-wave' });
    let view = session.advance({ deltaMs: 0 });
    const enemy = view.enemies[0];
    assert.ok(enemy);
    assert.deepEqual(enemy.positionFine, { x: 9.5 * FINE_UNITS_PER_CELL, y: 18.5 * FINE_UNITS_PER_CELL });
    assert.equal(enemy.hitPoints, 5_000);

    assert.equal(session.submitIntent({ type: 'select-at', x: 7.5, y: 17.5 }), true);
    view = session.advance({ deltaMs: 0 });
    assert.equal(view.enemies[0]?.hitPoints, 3_750);
    assert.deepEqual(view.events.find((event) => event.type === 'dynamite-exploded'), {
      type: 'dynamite-exploded',
      dynamiteId: 'dynamite-1',
      affectedEnemyIds: [enemy.id],
    });
  } finally {
    session.close();
  }

  const lockedScenario: ScenarioContent = {
    ...scenario,
    id: 'ice-rocks-locked-dynamite-boundary',
    dynamite: createDakota06DynamiteDefinition([]),
  };
  const lockedSession = await createGame({ scenarios: { [lockedScenario.id]: lockedScenario } })
    .open({ scenarioId: lockedScenario.id, randomSeed: 11 });
  try {
    lockedSession.submitIntent({ type: 'start-wave' });
    let lockedView = lockedSession.advance({ deltaMs: 0 });
    const lockedEnemy = lockedView.enemies[0];
    assert.ok(lockedEnemy);
    assert.equal(lockedSession.submitIntent({ type: 'select-at', x: 7.5, y: 17.5 }), true);
    lockedView = lockedSession.advance({ deltaMs: 0 });
    assert.equal(lockedView.enemies[0]?.hitPoints, 5_000);
    assert.equal(lockedView.events.some((event) => event.type.startsWith('dynamite-')), false);
  } finally {
    lockedSession.close();
  }
});
