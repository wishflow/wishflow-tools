import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignCatalog } from '../src/content/campaign-catalog';
import map from '../src/content/dakota-08.json';
import { createDakota08DynamiteDefinition, createDakota08DynamiteDefinitionFromSnapshot } from '../src/content/dakota-08-dynamite';
import { createDakota08MapScene } from '../src/content/dakota-08-scene';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';

const FINE_PER_CELL = 7_680;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

function campaignScenarioIdForLevel(globalLevel: number): string {
  const entry = campaignCatalog.find(({ level }) => level === globalLevel);
  assert.ok(entry, `campaign level ${globalLevel} is registered`);
  const levelWithinRegion = ((globalLevel - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(levelWithinRegion).padStart(2, '0')}`;
}

function emptyGrid(): number[][] {
  return Array.from({ length: map.map.height }, () => Array<number>(map.map.width).fill(0));
}

async function moveAcrossDynamite(unlocked: boolean) {
  const id = `wayne-waters-dynamite-${unlocked ? 'unlocked' : 'locked'}`;
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Wayne Waters Dynamite probe', zh: 'Wayne Waters 炸药探针' },
    map: {
      width: map.map.width,
      height: map.map.height,
      tileSize: 32,
      background: [],
      streets: [],
      backgroundCollisionCodes: Array.from({ length: map.map.height }, () => Array<number>(map.map.width).fill(0)),
    },
    originalTileGrid: emptyGrid(),
    units: [createActiveGunslinger({ x: 8, y: 5 }, unlocked ? 808 : 809)],
    dynamite: createDakota08DynamiteDefinitionFromSnapshot(unlocked),
  };
  const session = await createGame({ scenarios: { [id]: scenario } }).open({ scenarioId: id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: 8.5, y: 5.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 17, targetY: 5.75 }), true);
    let view = session.observe();
    for (let frame = 0; frame < 60; frame += 1) view = session.advance({ deltaMs: 100 });
    const unit = view.units.find(({ id: unitId }) => unitId.includes(String(unlocked ? 808 : 809)));
    assert.ok(unit);
    return unit.positionFine;
  } finally {
    session.close();
  }
}

test('Wayne Waters Dynamite markers pair to the nearest box and use the global 20/30 unlock', () => {
  assert.deepEqual(markerCells(102), [[13, 6], [17, 7], [11, 15], [22, 15]]);
  assert.deepEqual(markerCells(110), [[12, 5], [18, 6], [11, 17], [22, 17]]);

  const locked = createDakota08DynamiteDefinition([]);
  assert.deepEqual(locked, {
    unlocked: false,
    pairs: [
      { id: 'dynamite-1', triggerCell: { x: 13, y: 6 }, boxCell: { x: 12, y: 5 } },
      { id: 'dynamite-2', triggerCell: { x: 17, y: 7 }, boxCell: { x: 18, y: 6 } },
      { id: 'dynamite-3', triggerCell: { x: 11, y: 15 }, boxCell: { x: 11, y: 17 } },
      { id: 'dynamite-4', triggerCell: { x: 22, y: 15 }, boxCell: { x: 22, y: 17 } },
    ],
  });

  const unlockedBy20 = createDakota08DynamiteDefinition([campaignScenarioIdForLevel(20)]);
  const unlockedBy30 = createDakota08DynamiteDefinition([campaignScenarioIdForLevel(30)]);
  assert.equal(unlockedBy20.unlocked, true);
  assert.equal(unlockedBy30.unlocked, true);
  assert.deepEqual(unlockedBy20.pairs, locked.pairs);
  assert.deepEqual(createDakota08DynamiteDefinitionFromSnapshot(true), unlockedBy20);
  assert.deepEqual(createDakota08DynamiteDefinitionFromSnapshot(false), locked);

  const scene = createDakota08MapScene();
  const lockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, locked);
  const unlockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, unlockedBy20);
  assert.equal(lockedBoxes.some(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110), false);
  assert.equal(unlockedBoxes.filter(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110).length, 8);
  for (const { triggerCell, boxCell } of unlockedBy20.pairs) {
    for (const [cell, code] of [[triggerCell, 102], [boxCell, 110]] as const) {
      const collision = unlockedBoxes.find(({ sourceTdmCode, sourceCell }) => (
        sourceTdmCode === code && sourceCell?.x === cell.x && sourceCell.y === cell.y
      ));
      assert.deepEqual(collision, {
        x: (cell.x * FINE_PER_CELL) + (FINE_PER_CELL / 2) + PLAYER_UNIT_COLLIDER_FINE.x,
        y: (cell.y * FINE_PER_CELL) + (FINE_PER_CELL / 2) + 1_920 + PLAYER_UNIT_COLLIDER_FINE.y,
        width: PLAYER_UNIT_COLLIDER_FINE.width,
        height: PLAYER_UNIT_COLLIDER_FINE.height,
        sourceCell: cell,
        sourceTdmCode: code,
      });
    }
  }
});

test('Wayne Waters locked Dynamite cells do not block; unlocked boxes block GameSession movement', async () => {
  const locked = await moveAcrossDynamite(false);
  const unlocked = await moveAcrossDynamite(true);
  const boxLeft = (12 * FINE_PER_CELL) + (FINE_PER_CELL / 2) + PLAYER_UNIT_COLLIDER_FINE.x;

  assert.ok(locked.x + PLAYER_UNIT_COLLIDER_FINE.x > boxLeft + PLAYER_UNIT_COLLIDER_FINE.width,
    'locked TDM Dynamite cells do not create collision boxes');
  assert.ok(unlocked.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width <= boxLeft,
    'an unlocked box stops the unit at the APK collision edge');
});
