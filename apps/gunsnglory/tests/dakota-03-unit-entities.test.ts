import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-03.json';
import { createDakota03MapScene } from '../src/content/dakota-03-scene';
import { createDakota03MapUnits } from '../src/content/dakota-03-units';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
} from '../src/content/mississippi-unit-unlocks';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_PER_CELL = 7_680;

const hireMarkerExpectations = [
  {
    marker: 96,
    type: 'gunslinger',
    cells: [[10, 3], [30, 4], [12, 7], [29, 9], [25, 11], [31, 12], [1, 15], [3, 17], [19, 20], [24, 20], [30, 20], [17, 22], [23, 22], [29, 22]],
  },
  {
    marker: 97,
    type: 'mexican',
    cells: [[14, 1], [29, 1], [23, 2], [10, 5], [30, 7], [4, 10], [27, 10], [20, 12], [14, 13], [23, 15], [30, 17], [23, 18], [1, 19], [8, 20], [13, 22]],
  },
  {
    marker: 98,
    type: 'cannon',
    cells: [[23, 5], [20, 8], [9, 11], [12, 14], [9, 17], [21, 18]],
  },
  {
    marker: 99,
    type: 'indian',
    cells: [[3, 1], [0, 2], [6, 2], [31, 2], [2, 3], [4, 4], [0, 5], [19, 6], [0, 8], [28, 12], [26, 17], [8, 22]],
  },
  { marker: 100, type: 'sniper', gate: 'sniper', cells: [[13, 16]] },
  {
    marker: 101,
    type: 'grandpa',
    gate: 'grandpa',
    cells: [[24, 7], [5, 8], [1, 11], [9, 13], [18, 13], [29, 15], [19, 16], [6, 19], [13, 19], [28, 20], [3, 22]],
  },
  { marker: 130, type: 'pyromaniac', gate: 'pyromaniac', cells: [[17, 3]] },
  { marker: 131, type: 'salesman', gate: 'salesman', cells: [[0, 17]] },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

function unitCells(units: readonly ScenarioUnit[], type: string): number[][] {
  return units
    .filter((unit) => unit.type === type && unit.activity === 4)
    .map(({ cell }) => [cell.x, cell.y]);
}

async function sleepingHireCollisionProbe() {
  const completedScenarioIds = completedScenarioIdsForMississippiUnitUnlockSnapshot({
    grandpa: true,
    sniper: true,
    pyromaniac: true,
    salesman: true,
  });
  const sleepingHire = createDakota03MapUnits(completedScenarioIds)
    .find(({ type, cell }) => type === 'gunslinger' && cell.x === 10 && cell.y === 3);
  assert.ok(sleepingHire && sleepingHire.activity === 4);

  const player = createActiveGunslinger({ x: 8, y: 3 }, 94);
  const id = 'fort-knockout-sleeping-hire-collision-probe';
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Fort Knockout collision probe', zh: 'Fort Knockout 碰撞探针' },
    map: createDakota03MapScene(),
    // Keep the audited unit object and map scene, but remove terrain blockers so this probe isolates unit collision.
    originalTileGrid: map.originalTileGrid.map((row) => row.map(() => 0)),
    units: [player, sleepingHire],
  };
  const session = await createGame({ scenarios: { [id]: scenario } }).open({ scenarioId: id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: 8.5, y: 3.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 12, targetY: 3.75 }), true);
    let view = session.observe();
    for (let frame = 0; frame < 40; frame += 1) view = session.advance({ deltaMs: 100 });
    const movedPlayer = view.units.find(({ id: unitId }) => unitId === player.id);
    const hireView = view.units.find(({ id: unitId }) => unitId === sleepingHire.id);
    assert.ok(movedPlayer && hireView);
    return { movedPlayer, hireView };
  } finally {
    session.close();
  }
}

test('Fort Knockout TDM hire markers map to the exact activity-4 units in all 16 unlock snapshots', () => {
  for (const { marker, cells } of hireMarkerExpectations) {
    assert.deepEqual(markerCells(marker), cells, `raw ${marker} APK cells`);
  }

  for (let mask = 0; mask < 16; mask += 1) {
    const unlocks = {
      grandpa: (mask & 1) !== 0,
      sniper: (mask & 2) !== 0,
      pyromaniac: (mask & 4) !== 0,
      salesman: (mask & 8) !== 0,
    };
    const completedScenarioIds = completedScenarioIdsForMississippiUnitUnlockSnapshot(unlocks);
    assert.deepEqual(mississippiUnitUnlockSnapshotFor(completedScenarioIds), unlocks);
    const units = createDakota03MapUnits(completedScenarioIds);

    for (const expected of hireMarkerExpectations) {
      const isUnlocked = !('gate' in expected) || unlocks[expected.gate];
      assert.deepEqual(
        unitCells(units, expected.type),
        isUnlocked ? expected.cells : [],
        `mask ${mask.toString(2).padStart(4, '0')} raw ${expected.marker} ${expected.type}`,
      );
    }

    assert.ok(units.every(({ activity }) => activity === 4), 'all TDM hire markers remain sleeping activity 4');
    assert.ok(units.every(({ hirePrice }) => typeof hirePrice === 'number'
      && Number.isSafeInteger(hirePrice) && hirePrice > 0),
      'every instantiated hire marker has a purchase price');
    const ids = units.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length, `mask ${mask} has unique hire IDs`);
  }

  const allUnlocked = createDakota03MapUnits(completedScenarioIdsForMississippiUnitUnlockSnapshot({
    grandpa: true,
    sniper: true,
    pyromaniac: true,
    salesman: true,
  }));
  assert.equal(allUnlocked.length, 61);
  for (const { asset, awakeAsset } of allUnlocked) {
    for (const candidate of [asset, awakeAsset].filter((value): value is string => Boolean(value))) {
      assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(candidate))), `${candidate} exists`);
    }
  }
});

test('Fort Knockout un-hired Gunslinger remains a real GameSession movement blocker', async () => {
  const { movedPlayer, hireView } = await sleepingHireCollisionProbe();
  const playerRight = movedPlayer.positionFine.x
    + PLAYER_UNIT_COLLIDER_FINE.x
    + PLAYER_UNIT_COLLIDER_FINE.width;
  const hireLeft = hireView.positionFine.x
    + (hireView.collisionBoxFine?.x ?? PLAYER_UNIT_COLLIDER_FINE.x);

  assert.ok(movedPlayer.positionFine.x > 9 * FINE_PER_CELL, 'the player walks across the preceding open cell');
  assert.ok(playerRight <= hireLeft, 'the player stops at the sleeping hire collision edge');
});
