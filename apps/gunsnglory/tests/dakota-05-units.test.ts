import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-05.json';
import { createDakota05MapScene } from '../src/content/dakota-05-scene';
import { createDakota05MapUnits, createDakota05MapUnitsFromSnapshot } from '../src/content/dakota-05-units';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot, type MississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import { PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const fineUnitsPerCell = 7_680;

const hireMarkers = [
  { marker: 96, type: 'gunslinger', cells: [[6, 4], [17, 4], [0, 6], [24, 6], [27, 8], [31, 9]], asset: 'player_gunslinger_sleep', awakeAsset: 'player_gunslinger' },
  { marker: 97, type: 'mexican', cells: [[24, 1], [29, 1], [5, 8], [23, 9], [17, 10]], asset: 'player_mexican_sleep', awakeAsset: 'player_mexican' },
  { marker: 98, type: 'cannon', cells: [[31, 4], [2, 6], [11, 6]], asset: 'player_cannon_sleep', awakeAsset: 'player_cannon' },
  { marker: 99, type: 'indian', cells: [[8, 3], [27, 3], [1, 8], [13, 10]], asset: 'player_indian_sleep', awakeAsset: 'player_indian' },
  { marker: 100, type: 'sniper', cells: [[9, 8]], asset: 'player_scout_sleep', awakeAsset: 'player_scout', unlock: 'sniper' },
  { marker: 101, type: 'grandpa', cells: [[19, 3], [14, 5], [28, 5]], asset: 'player_geezer_sleep', awakeAsset: 'player_geezer', unlock: 'grandpa' },
  { marker: 130, type: 'pyromaniac', cells: [[15, 2]], asset: 'player_pyromaniac_sleep', awakeAsset: 'player_pyromaniac', unlock: 'pyromaniac' },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

async function moveProbe(
  start: { x: number; y: number },
  target: { x: number; y: number },
  obstacles: readonly ScenarioUnit[],
) {
  const player = createActiveGunslinger(start, 905);
  const id = `ghost-town-unit-collision-${start.x}-${start.y}-${target.x}-${target.y}-${obstacles.length}`;
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Ghost Town unit collision probe', zh: 'Ghost Town 单位碰撞探针' },
    map: createDakota05MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [player, ...obstacles],
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

function unitBoxAtCell(cell: { x: number; y: number }) {
  return {
    x: (cell.x * fineUnitsPerCell) + 3_840 + PLAYER_UNIT_COLLIDER_FINE.x,
    y: (cell.y * fineUnitsPerCell) + 5_760 + PLAYER_UNIT_COLLIDER_FINE.y,
    width: PLAYER_UNIT_COLLIDER_FINE.width,
    height: PLAYER_UNIT_COLLIDER_FINE.height,
  };
}


test('Ghost Town hire markers preserve all APK positions, activity-4 state, assets and unlock gates', () => {
  const scenarios: MississippiUnitUnlockSnapshot[] = Array.from({ length: 16 }, (_, mask) => ({
    grandpa: (mask & 1) !== 0,
    sniper: (mask & 2) !== 0,
    pyromaniac: (mask & 4) !== 0,
    salesman: (mask & 8) !== 0,
  }));

  for (const unlocks of scenarios) {
    const units = createDakota05MapUnitsFromSnapshot(unlocks);
    const expectedCount = 18 + Number(unlocks.sniper) + (unlocks.grandpa ? 3 : 0) + Number(unlocks.pyromaniac);
    assert.equal(units.length, expectedCount, `unit count for unlocks ${JSON.stringify(unlocks)}`);
    assert.equal(new Set(units.map(({ id }) => id)).size, units.length, 'all map hire IDs are unique');
    assert.ok(units.every(({ activity }) => activity === 4), 'these TDM markers create sleeping hires only');
    assert.equal(units.some(({ type }) => type === 'salesman'), false, 'Ghost Town has no raw131 Salesman marker');

    for (const expected of hireMarkers) {
      assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} source coordinates`);
      const available = !('unlock' in expected) || unlocks[expected.unlock];
      const actual = units.filter(({ type }) => type === expected.type);
      assert.deepEqual(actual.map(({ cell }) => [cell.x, cell.y]), available ? expected.cells : [],
        `raw ${expected.marker} creates ${expected.type} only under the APK unlock rule`);
      for (const unit of actual) {
        assert.equal(unit.activity, 4);
        assert.equal(unit.asset, expected.asset);
        assert.equal(unit.awakeAsset, expected.awakeAsset);
        assert.ok(unit.render.y + unit.render.height === unit.cell.y + 0.75,
          `${unit.id} sleep frame foot matches its cell position`);
        assert.ok(unit.awakeRender && unit.awakeRender.y + unit.awakeRender.height === unit.cell.y + 0.75,
          `${unit.id} awake frame foot matches its cell position`);
        assert.deepEqual(unit.awakeHitArea, unit.awakeRender);
        assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(unit.asset))), `${unit.asset} is bundled`);
        assert.ok(unit.awakeAsset && existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(unit.awakeAsset))), `${unit.awakeAsset} is bundled`);
      }
    }
  }

  assert.deepEqual(map.originalTileGrid.flat().filter((code) => code >= 104 && code <= 109), [], 'there are no activity-5 hire markers');
  assert.equal(map.originalTileGrid.flat().filter((code) => code === 131).length, 0, 'there is no Salesman marker');
  const wrapperSnapshot = { grandpa: true, sniper: true, pyromaniac: false, salesman: true };
  assert.deepEqual(
    createDakota05MapUnits(completedScenarioIdsForMississippiUnitUnlockSnapshot(wrapperSnapshot)),
    createDakota05MapUnitsFromSnapshot(wrapperSnapshot),
    'the completion-based builder resolves the same global unit gates as its snapshot entry point',
  );
});

test('Ghost Town sleeping hire and unlocked Pyromaniac keep their original blocking behavior', async () => {
  const locked = createDakota05MapUnitsFromSnapshot({ grandpa: false, sniper: false, pyromaniac: false, salesman: false });
  const sleepingGunslinger = locked.find(({ type, cell }) => type === 'gunslinger' && cell.x === 27 && cell.y === 8);
  assert.ok(sleepingGunslinger && sleepingGunslinger.activity === 4);
  const movedAtGunslinger = await moveProbe({ x: 25, y: 8 }, { x: 30, y: 8.75 }, [sleepingGunslinger]);
  const gunslingerFootprint = {
    x: movedAtGunslinger.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x,
    y: movedAtGunslinger.positionFine.y + PLAYER_UNIT_COLLIDER_FINE.y,
    width: PLAYER_UNIT_COLLIDER_FINE.width,
    height: PLAYER_UNIT_COLLIDER_FINE.height,
  };
  const sleeperFootprint = unitBoxAtCell(sleepingGunslinger.cell);
  assert.ok(gunslingerFootprint.x + gunslingerFootprint.width <= sleeperFootprint.x,
    'an activity-4 standard Gunslinger blocks the real GameSession movement');

  const pyromaniacUnlocked = createDakota05MapUnitsFromSnapshot({ grandpa: false, sniper: false, pyromaniac: true, salesman: false });
  const pyromaniac = pyromaniacUnlocked.find(({ type }) => type === 'pyromaniac');
  assert.ok(pyromaniac && pyromaniac.activity === 4);
  const movedAtUnlockedPyromaniac = await moveProbe({ x: 12, y: 2 }, { x: 18, y: 2.75 }, [pyromaniac]);
  const pyroFootprint = unitBoxAtCell(pyromaniac.cell);
  const playerFootprint = {
    x: movedAtUnlockedPyromaniac.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x,
    y: movedAtUnlockedPyromaniac.positionFine.y + PLAYER_UNIT_COLLIDER_FINE.y,
    width: PLAYER_UNIT_COLLIDER_FINE.width,
    height: PLAYER_UNIT_COLLIDER_FINE.height,
  };
  assert.ok(playerFootprint.x + playerFootprint.width <= pyroFootprint.x,
    'an unlocked special activity-4 Pyromaniac also blocks movement');

  const lockedPyromaniac = locked.find(({ type }) => type === 'pyromaniac');
  assert.equal(lockedPyromaniac, undefined, 'a locked Pyromaniac TDM marker is not instantiated');
});
