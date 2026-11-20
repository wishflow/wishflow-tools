import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-08.json';
import { createDakota08MapScene } from '../src/content/dakota-08-scene';
import { createDakota08MapUnits } from '../src/content/dakota-08-units';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import {
  createPlayerMapCollisionBoxes,
  PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE,
  PLAYER_UNIT_COLLIDER_FINE,
} from '../src/game/player-collision-geometry';

const FINE_PER_CELL = 7_680;

async function moveProbe(
  suffix: string,
  start: { x: number; y: number },
  target: { x: number; y: number },
  obstacles: readonly ScenarioUnit[] = [],
) {
  const player = createActiveGunslinger(start, 800 + suffix.length);
  const scenario: ScenarioContent = {
    id: `wayne-waters-collision-${suffix}`,
    title: { en: 'Wayne Waters collision probe', zh: 'Wayne Waters 碰撞探针' },
    map: createDakota08MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [player, ...obstacles],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: start.x + 0.5, y: start.y + 0.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: target.x, targetY: target.y }), true);
    let view = session.observe();
    for (let frame = 0; frame < 80; frame += 1) view = session.advance({ deltaMs: 100 });
    return { player, view };
  } finally {
    session.close();
  }
}

test('Wayne Waters TDM decorations create the APK-sized map collision boxes', () => {
  const scene = createDakota08MapScene();
  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, undefined);
  const expectedByCode = {
    69: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    70: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 },
    71: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    74: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    76: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    112: { x: -2_496, y: -4_224, width: 14_592, height: 6_144 },
    113: { x: -5_568, y: -5_760, width: 18_048, height: 7_680 },
    126: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  } as const;

  for (const [markerText, bounds] of Object.entries(expectedByCode)) {
    const marker = Number(markerText);
    for (const [y, row] of map.originalTileGrid.entries()) {
      for (const [x, code] of row.entries()) {
        if (code !== marker) continue;
        assert.deepEqual(collisions.filter(({ sourceTdmCode, sourceCell }) => (
          sourceTdmCode === marker && sourceCell?.x === x && sourceCell.y === y
        )), [{
          x: x * FINE_PER_CELL + bounds.x,
          y: y * FINE_PER_CELL + bounds.y,
          width: bounds.width,
          height: bounds.height,
          sourceCell: { x, y },
          sourceTdmCode: marker,
        }], `raw ${marker} at (${x},${y}) has its APK collision bounds`);
      }
    }
    assert.deepEqual(PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE[marker], bounds);
  }
  assert.equal(collisions.some(({ sourceTdmCode }) => sourceTdmCode === 78), false,
    'the unexplained raw 78 marker has no APK-created static collision object');
});

test('Wayne Waters sleeping hires and Saloon/Fort map objects block real GameSession movement', async () => {
  const sleepUnit = createDakota08MapUnits().find(({ type, activity, cell }) => (
    type === 'gunslinger' && activity === 4 && cell.x === 12 && cell.y === 1
  ));
  assert.ok(sleepUnit, 'raw 96 at (12,1) becomes a sleeping Gunslinger');

  const cases = [
    {
      name: 'sleeping unit', start: { x: 8, y: 1 }, target: { x: 15.5, y: 1.75 }, obstacle: sleepUnit,
      obstacleLeft: (12 * FINE_PER_CELL) + (FINE_PER_CELL / 2) + PLAYER_UNIT_COLLIDER_FINE.x,
    },
    {
      name: 'Saloon', start: { x: 26, y: 12 }, target: { x: 31, y: 12.75 }, obstacle: undefined,
      obstacleLeft: (29 * FINE_PER_CELL) - 2_496,
    },
    {
      name: 'Fort', start: { x: 0, y: 12 }, target: { x: 5, y: 12.75 }, obstacle: undefined,
      obstacleLeft: (2 * FINE_PER_CELL) - 5_568,
    },
  ] as const;

  for (const obstacleCase of cases) {
    const { player, view } = await moveProbe(obstacleCase.name, obstacleCase.start, obstacleCase.target,
      obstacleCase.obstacle ? [obstacleCase.obstacle] : []);
    const moved = view.units.find(({ id }) => id === player.id);
    assert.ok(moved);
    const playerRight = moved.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
    assert.ok(playerRight <= obstacleCase.obstacleLeft,
      `${obstacleCase.name} stops the player at the APK collider edge: ${JSON.stringify({ playerRight, expectedLeft: obstacleCase.obstacleLeft, position: moved.positionFine })}`);
  }
});
