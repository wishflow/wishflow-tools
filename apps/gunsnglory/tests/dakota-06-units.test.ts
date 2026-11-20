import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-06.json';
import { createDakota06MapScene } from '../src/content/dakota-06-scene';
import { createDakota06MapUnits, createDakota06MapUnitsFromSnapshot } from '../src/content/dakota-06-units';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot, type MississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const fineUnitsPerCell = 7_680;

const unitMarkers = [
  { marker: 96, type: 'gunslinger', activity: 4, cells: [[16, 1], [22, 1], [1, 5], [4, 5], [12, 5], [5, 8], [17, 9], [30, 9], [3, 12], [15, 12], [1, 13], [30, 15], [13, 16], [22, 16], [9, 18], [15, 20], [0, 22], [29, 23]], asset: 'player_gunslinger_sleep', awakeAsset: 'player_gunslinger' },
  { marker: 97, type: 'mexican', activity: 4, cells: [[7, 3], [18, 5], [26, 8], [9, 9], [20, 15], [16, 16], [11, 18], [2, 21]], asset: 'player_mexican_sleep', awakeAsset: 'player_mexican' },
  { marker: 98, type: 'cannon', activity: 4, cells: [[24, 2], [29, 12], [5, 13], [14, 14], [24, 17]], asset: 'player_cannon_sleep', awakeAsset: 'player_cannon' },
  { marker: 99, type: 'indian', activity: 4, cells: [[12, 1], [27, 1], [3, 10], [20, 12], [9, 15], [1, 19], [22, 19], [26, 21]], asset: 'player_indian_sleep', awakeAsset: 'player_indian' },
  { marker: 100, type: 'sniper', activity: 4, cells: [[3, 7]], asset: 'player_scout_sleep', awakeAsset: 'player_scout', unlock: 'sniper' },
  { marker: 101, type: 'grandpa', activity: 4, cells: [[26, 6], [15, 8], [10, 11], [4, 15], [20, 17], [8, 20]], asset: 'player_geezer_sleep', awakeAsset: 'player_geezer', unlock: 'grandpa' },
  { marker: 104, type: 'gunslinger', activity: 5, cells: [[18, 7], [12, 10]], asset: 'player_gunslinger' },
  { marker: 105, type: 'mexican', activity: 5, cells: [[21, 7], [23, 12]], asset: 'player_mexican' },
  { marker: 130, type: 'pyromaniac', activity: 4, cells: [[31, 20]], asset: 'player_pyromaniac_sleep', awakeAsset: 'player_pyromaniac', unlock: 'pyromaniac' },
  { marker: 131, type: 'salesman', activity: 4, cells: [[0, 11]], asset: 'player_salesman_sleep', awakeAsset: 'player_salesman', unlock: 'salesman' },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

function unitBoxAtCell(cell: { x: number; y: number }) {
  return {
    x: (cell.x * fineUnitsPerCell) + 3_840 + PLAYER_UNIT_COLLIDER_FINE.x,
    y: (cell.y * fineUnitsPerCell) + 5_760 + PLAYER_UNIT_COLLIDER_FINE.y,
    width: PLAYER_UNIT_COLLIDER_FINE.width,
    height: PLAYER_UNIT_COLLIDER_FINE.height,
  };
}

async function moveProbe(
  start: { x: number; y: number },
  target: { x: number; y: number },
  obstacle: ScenarioUnit,
) {
  const player = createActiveGunslinger(start, 937);
  const id = `ice-rocks-unit-collision-${start.x}-${start.y}-${target.x}-${target.y}-${obstacle.id}`;
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Ice Rocks unit collision probe', zh: 'Ice Rocks 单位碰撞探针' },
    map: createDakota06MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [player, obstacle],
  };
  const session = await createGame({ scenarios: { [id]: scenario } }).open({ scenarioId: id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: start.x + 0.5, y: start.y + 0.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: target.x, targetY: target.y }), true);
    let view = session.observe();
    for (let frame = 0; frame < 45; frame += 1) view = session.advance({ deltaMs: 100 });
    const moved = view.units.find(({ id: unitId }) => unitId === player.id);
    assert.ok(moved);
    return moved;
  } finally {
    session.close();
  }
}

test('Ice Rocks unit markers preserve positions, activity, assets, anchors, IDs, and all unlock gates', () => {
  const snapshots: MississippiUnitUnlockSnapshot[] = Array.from({ length: 16 }, (_, mask) => ({
    grandpa: (mask & 1) !== 0,
    sniper: (mask & 2) !== 0,
    pyromaniac: (mask & 4) !== 0,
    salesman: (mask & 8) !== 0,
  }));

  for (const unlocks of snapshots) {
    const units = createDakota06MapUnitsFromSnapshot(unlocks);
    const expectedCount = 39 + Number(unlocks.sniper) + (unlocks.grandpa ? 6 : 0)
      + Number(unlocks.pyromaniac) + Number(unlocks.salesman) + 4;
    assert.equal(units.length, expectedCount, `unit count for unlocks ${JSON.stringify(unlocks)}`);
    assert.equal(new Set(units.map(({ id }) => id)).size, units.length, 'all map unit IDs are unique');

    for (const expected of unitMarkers) {
      assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} source coordinates`);
      const available = !('unlock' in expected) || unlocks[expected.unlock];
      for (const [x, y] of expected.cells) {
        const unit = units.find(({ cell }) => cell.x === x && cell.y === y);
        assert.equal(Boolean(unit), available, `raw ${expected.marker} at (${x},${y}) availability`);
        if (!unit) continue;
        assert.equal(unit.type, expected.type);
        assert.equal(unit.activity, expected.activity);
        assert.equal(unit.asset, expected.asset);
        assert.equal(unit.render.y + unit.render.height, unit.cell.y + 0.75,
          `${unit.id} visible frame foot matches its cell position`);
        assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(unit.asset))), `${unit.asset} is bundled`);
        if ('awakeAsset' in expected) {
          assert.equal(unit.awakeAsset, expected.awakeAsset);
          assert.ok(unit.awakeRender && unit.awakeRender.y + unit.awakeRender.height === unit.cell.y + 0.75,
            `${unit.id} awake frame foot matches its cell position`);
          assert.deepEqual(unit.awakeHitArea, unit.awakeRender);
          assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(expected.awakeAsset))), `${expected.awakeAsset} is bundled`);
        }
      }
    }
  }

  const wrapperSnapshot = { grandpa: true, sniper: true, pyromaniac: false, salesman: true };
  assert.deepEqual(
    createDakota06MapUnits(completedScenarioIdsForMississippiUnitUnlockSnapshot(wrapperSnapshot)),
    createDakota06MapUnitsFromSnapshot(wrapperSnapshot),
    'completion-based builder resolves the same global unit gates as its snapshot entry point',
  );
});

test('Ice Rocks sleeping hire and activity-5 unit both block actual GameSession movement', async () => {
  const locked = createDakota06MapUnitsFromSnapshot({ grandpa: false, sniper: false, pyromaniac: false, salesman: false });
  const sleepingGunslinger = locked.find(({ type, cell }) => type === 'gunslinger' && cell.x === 1 && cell.y === 5);
  assert.ok(sleepingGunslinger && sleepingGunslinger.activity === 4);
  const movedAtSleepingGunslinger = await moveProbe({ x: 1, y: 2 }, { x: 1.5, y: 9 }, sleepingGunslinger);
  const playerBoxAtSleeper = {
    x: movedAtSleepingGunslinger.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x,
    y: movedAtSleepingGunslinger.positionFine.y + PLAYER_UNIT_COLLIDER_FINE.y,
    width: PLAYER_UNIT_COLLIDER_FINE.width,
    height: PLAYER_UNIT_COLLIDER_FINE.height,
  };
  const sleeperBox = unitBoxAtCell(sleepingGunslinger.cell);
  assert.ok(playerBoxAtSleeper.y + playerBoxAtSleeper.height <= sleeperBox.y,
    'activity-4 sleeping Gunslinger blocks the real GameSession movement');

  const activeGunslinger = locked.find(({ type, activity, cell }) => (
    type === 'gunslinger' && activity === 5 && cell.x === 18 && cell.y === 7
  ));
  assert.ok(activeGunslinger);
  const movedAtActiveGunslinger = await moveProbe({ x: 15, y: 7 }, { x: 24, y: 7.75 }, activeGunslinger);
  const playerBoxAtActive = {
    x: movedAtActiveGunslinger.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x,
    y: movedAtActiveGunslinger.positionFine.y + PLAYER_UNIT_COLLIDER_FINE.y,
    width: PLAYER_UNIT_COLLIDER_FINE.width,
    height: PLAYER_UNIT_COLLIDER_FINE.height,
  };
  const activeBox = unitBoxAtCell(activeGunslinger.cell);
  assert.ok(playerBoxAtActive.x + playerBoxAtActive.width <= activeBox.x,
    'activity-5 active Gunslinger blocks the real GameSession movement');
});
