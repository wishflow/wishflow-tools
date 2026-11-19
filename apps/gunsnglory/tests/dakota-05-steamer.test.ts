import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-05.json';
import { createDakota05MapScene } from '../src/content/dakota-05-scene';
import { createDakota05SteamerUnits } from '../src/content/dakota-05-steamer';
import { createGame, type ScenarioContent } from '../src/game';
import { createPlayerMapCollisionBoxes } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const fineUnitsPerCell = 7_680;
const expectedParts = [
  { marker: 120, type: 'steamer-30', activity: 5, cell: { x: 3, y: 11 }, asset: 'steamboat_1' },
  { marker: 120, type: 'steamer-31', activity: 5, cell: { x: 4, y: 11 }, asset: 'steamboat_2' },
  { marker: 121, type: 'steamer-32', activity: 4, cell: { x: 5, y: 11 }, asset: 'steamboat_3' },
  { marker: 121, type: 'steamer-32', activity: 4, cell: { x: 6, y: 11 }, asset: 'steamboat_3' },
  { marker: 123, type: 'steamer-33', activity: 5, cell: { x: 7, y: 11 }, asset: 'steamboat_4a' },
] as const;

function createScenario(): ScenarioContent {
  return {
    id: 'ghost-town-steamer-probe',
    title: { en: 'Ghost Town Steamer probe', zh: 'Ghost Town 蒸汽船探针' },
    map: createDakota05MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota05SteamerUnits(),
  };
}

test('Ghost Town Steamer projects all TDM pieces, Cannon positions and APK assets', () => {
  const units = createDakota05SteamerUnits();
  const markerCells = (marker: number) => map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === marker ? [[x, y]] : []
  )));
  assert.deepEqual(markerCells(120), [[3, 11]]);
  assert.deepEqual(markerCells(121), [[5, 11], [6, 11]]);
  assert.deepEqual(markerCells(123), [[7, 11]]);
  assert.deepEqual(units.map(({ type, activity, cell, asset }) => ({ type, activity, cell, asset })),
    expectedParts.map(({ type, activity, cell, asset }) => ({ type, activity, cell, asset })));
  assert.equal(units.length, 5, 'one TDM start expands to five contiguous hull and Cannon segments');
  assert.equal(new Set(units.map(({ id }) => id)).size, 5);
  assert.equal(new Set(units.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.ok(units.every(({ movementAxis, movementSurface, movementSpeedFinePer100Ms }) => (
    movementAxis === 'horizontal' && movementSurface === 'water' && movementSpeedFinePer100Ms === 1_000
  )));
  assert.ok(units.every(({ collisionBoxFine }) => (
    collisionBoxFine?.x === -3_840 && collisionBoxFine.y === -4_608
      && collisionBoxFine.width === 7_680 && collisionBoxFine.height === 4_608
  )), 'each hull segment uses the shared APK-derived one-cell water collider');

  const cannons = units.filter(({ type }) => type === 'steamer-32');
  assert.deepEqual(cannons.map(({ cell, activity, hirePrice, weaponDrawOffsetYFine }) => [
    cell.x, cell.y, activity, hirePrice, weaponDrawOffsetYFine,
  ]), [[5, 11, 4, 150, 7_680], [6, 11, 4, 150, 7_680]]);
  assert.ok(cannons.every(({ weapon, upgradeLevels, showSleepingEffect }) => (
    weapon?.damage === 650 && weapon.damageType === 'heavy'
      && upgradeLevels?.length === 3 && showSleepingEffect === true
  )), 'both onboard Cannons retain their original sleeping recruit and weapon behavior');

  for (const { asset } of units) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
  const secondEngine = units.find(({ type }) => type === 'steamer-31');
  const tail = units.find(({ type }) => type === 'steamer-33');
  assert.equal(secondEngine?.steamEmitter, true);
  assert.deepEqual(tail?.positionAssetSequence?.assets, ['steamboat_4a', 'steamboat_4b', 'steamboat_4c']);
});

test('Ghost Town Steamer moves as one group across water, clears the bank rock and stays within the map', async () => {
  const scenario = createScenario();
  assert.ok(scenario.map.backgroundCollisionCodes?.[11]?.slice(3, 8).every((code) => code === 96),
    'all five original boat segments sit on APK water background');
  assert.equal(scenario.map.backgroundCollisionCodes?.[11]?.[25], 96);
  assert.equal(scenario.map.backgroundCollisionCodes?.[11]?.[31], 96, 'the complete boat lane remains water to the east map edge');
  assert.equal(scenario.map.backgroundCollisionCodes?.[12]?.[26], 103, 'the bank south of the lane is a blocking waterside tile');

  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, scenario.map.decorations, undefined);
  const rock = collisions.find(({ sourceTdmCode, sourceCell }) => (
    sourceTdmCode === 126 && sourceCell?.x === 25 && sourceCell.y === 10
  ));
  assert.ok(rock, 'the water-edge rock is part of the same real scene');
  const initial = scenario.units.map(({ cell }) => cell.x);
  const initialBoatTop = (11 * fineUnitsPerCell) + 3_840 + 1_920 - 4_608;
  assert.ok(rock.y + rock.height < initialBoatTop, 'the raw126 bank rock does not overlap the APK hull collider');

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: 3.5, y: 11.5 }), true);
    const selected = session.advance({ deltaMs: 0 });
    assert.ok(selected.units.some(({ id, selected: isSelected }) => id.includes('dakota-05-steamer-') && isSelected));
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 30, targetY: 11.5 }), true);
    let view = session.advance({ deltaMs: 0 });
    assert.ok(view.units.some(({ id, moving }) => id.includes('dakota-05-steamer-') && moving), 'the selected Steamer accepts a group movement target');
    for (let frame = 0; frame < 240 && view.units.some(({ moving }) => moving); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }

    const moved = view.units.filter(({ movementGroupId }) => movementGroupId === 'dakota-05-steamer-3-11');
    assert.equal(moved.length, 5);
    assert.ok(moved.every(({ moving }) => !moving), 'all parts stop at the map edge');
    const traveledFine = moved[0]!.positionFine.x - (initial[0]! * fineUnitsPerCell + 3_840);
    assert.ok(traveledFine > 15 * fineUnitsPerCell,
      `the hull travels along the open water lane and past the bank rock (moved ${traveledFine} fine units)`);
    assert.ok(moved[4]!.positionFine.x > 30 * fineUnitsPerCell,
      'the rear hull clears the raw126 rock beside x=25 instead of being stopped by its nearby sprite');
    assert.ok(moved.slice(1).every((unit, index) => unit.positionFine.x - moved[index]!.positionFine.x === fineUnitsPerCell),
      'all five parts retain their source spacing without self-collision');
    assert.ok(moved.every(({ positionFine }) => positionFine.x <= 32 * fineUnitsPerCell),
      'no hull anchor crosses the original right map boundary');
  } finally {
    session.close();
  }
});
