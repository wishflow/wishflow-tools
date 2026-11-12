import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createGame, type ScenarioContent } from '../src/game';
import map from '../src/content/mississippi-14.json';
import { createMississippi14MapScene } from '../src/content/mississippi-14-scene';
import { createMississippi14SteamerUnits } from '../src/content/mississippi-14-steamer';
import { createMississippi14MapUnits } from '../src/content/mississippi-14-units';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function markerCells(code: number): [number, number][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((value, x) => (
    value === code ? [[x, y] as [number, number]] : []
  )));
}

test('Riverside Mountains decorations retain APK cells, pictures, and bone blocking bounds', () => {
  assert.deepEqual(markerCells(68), [[7, 0], [22, 1], [30, 3], [4, 11], [30, 12]]);
  assert.deepEqual(markerCells(69).length, 9);
  assert.deepEqual(markerCells(73), [[0, 21], [28, 23]]);
  assert.deepEqual(markerCells(77), [[1, 2], [24, 23]]);

  const decorations = createMississippi14MapScene().decorations ?? [];
  const matching = (asset: string) => decorations
    .filter(({ asset: actual }) => actual === asset)
    .map(({ cell }) => [cell.x, cell.y]);

  assert.deepEqual(matching('e_1x1_cactus_a'), markerCells(68));
  assert.deepEqual(matching('e_1x1_rocks_a'), markerCells(69));
  assert.deepEqual(matching('e_1x1_cactus_b'), markerCells(73));
  assert.deepEqual(matching('e_1x2_bones'), markerCells(77));

  const expectedCactusCollision = { x: 1920, y: -1228, width: 3840, height: 2534 };
  assert.ok(decorations.filter(({ asset }) => asset === 'e_1x1_cactus_a' || asset === 'e_1x1_cactus_b')
    .every(({ collisionBoxFine }) => JSON.stringify(collisionBoxFine) === JSON.stringify(expectedCactusCollision)));
  const bones = decorations.filter(({ asset }) => asset === 'e_1x2_bones');
  assert.ok(bones.every(({ collisionBoxFine, fieldBlockBounds }) => (
    JSON.stringify(collisionBoxFine) === JSON.stringify({ x: 0, y: -9600, width: 7680, height: 11520 })
    && JSON.stringify(fieldBlockBounds) === JSON.stringify({ left: 0, right: 0, top: -1, bottom: 0 })
  )));

  const fort = decorations.find(({ asset }) => asset === 'b_3x2_fort');
  assert.deepEqual(fort, {
    asset: 'b_3x2_fort',
    anchorOffsetY: -0.3,
    collisionBoxFine: { x: -9408, y: -9600, width: 18048, height: 7680 },
    cell: { x: 14, y: 4 },
  });

  for (const asset of ['e_1x1_cactus_a', 'e_1x1_cactus_b', 'e_1x2_bones', 'b_3x2_fort']) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), asset + ' is bundled');
  }
});

test('Riverside Mountains creates the two exact five-part Steamer groups', () => {
  const units = createMississippi14SteamerUnits();
  const mapScene = createMississippi14MapScene();
  assert.ok(units.every(({ cell }) => mapScene.backgroundCollisionCodes?.[cell.y]?.[cell.x] === 96),
    'each original boat component is on APK water background code 96');
  assert.equal(units.length, 10);
  assert.equal(new Set(units.map(({ id }) => id)).size, 10);

  const groups = new Map<string, typeof units>();
  for (const unit of units) {
    assert.ok(unit.movementGroupId);
    groups.set(unit.movementGroupId, [...(groups.get(unit.movementGroupId) ?? []), unit]);
  }
  assert.deepEqual([...groups.keys()], [
    'mississippi-14-steamer-2-13',
    'mississippi-14-steamer-22-14',
  ]);
  assert.deepEqual([...groups.values()].map((group) => group.map(({ type, activity, cell }) => (
    [type, activity, cell.x, cell.y]
  ))), [
    [
      ['steamer-30', 5, 2, 13], ['steamer-31', 5, 3, 13],
      ['steamer-32', 4, 4, 13], ['steamer-32', 4, 5, 13], ['steamer-33', 5, 6, 13],
    ],
    [
      ['steamer-30', 5, 22, 14], ['steamer-31', 5, 23, 14],
      ['steamer-32', 4, 24, 14], ['steamer-32', 4, 25, 14], ['steamer-33', 5, 26, 14],
    ],
  ]);
  assert.ok(units.every(({ movementAxis, movementSurface, movementSpeedFinePer100Ms }) => (
    movementAxis === 'horizontal' && movementSurface === 'water' && movementSpeedFinePer100Ms === 1000
  )));
  assert.ok(units.filter(({ type }) => type === 'steamer-32').every(({ activity, hirePrice, weapon }) => (
    activity === 4 && hirePrice === 150 && weapon?.damage === 650
  )));
});

test('Riverside Mountains starts with the Mexican and Indian and gates map units by global milestones', () => {
  assert.deepEqual(markerCells(105), [[16, 13]]);
  assert.deepEqual(markerCells(107), [[24, 7]]);
  assert.deepEqual(markerCells(113), [[14, 4]]);
  assert.deepEqual(markerCells(130), [[18, 3]]);
  assert.deepEqual(markerCells(131), [[5, 20]]);

  const fresh = createMississippi14MapUnits();
  assert.deepEqual(fresh.filter(({ activity }) => activity === 5).map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]), [
    ['indian', 5, 24, 7],
    ['mexican', 5, 16, 13],
  ]);
  assert.ok(fresh.every(({ type }) => type !== 'pyromaniac' && type !== 'salesman'));
  assert.equal(fresh.filter(({ activity, type }) => activity === 4
    && ['gunslinger', 'mexican', 'cannon', 'indian'].includes(type)).length,
  map.originalTileGrid.flat().filter((code) => code >= 96 && code <= 99).length);

  const unlocked = createMississippi14MapUnits([
    'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10',
  ]);
  assert.deepEqual(unlocked.filter(({ activity }) => activity === 5).map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]), [
    ['indian', 5, 24, 7],
    ['mexican', 5, 16, 13],
  ]);
  assert.equal(unlocked.filter(({ activity }) => activity === 4).length,
    map.originalTileGrid.flat().filter((code) => code >= 96 && code <= 101 || code === 130 || code === 131).length);
  assert.deepEqual(unlocked.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
    .map(({ type }) => type).sort(), ['pyromaniac', 'salesman']);
  assert.equal(new Set(unlocked.map(({ id }) => id)).size, unlocked.length);
  assert.ok(unlocked.every(({ activity }) => activity === 4 || activity === 5));
});


function createSteamerScenario(): ScenarioContent {
  return {
    id: 'mississippi-14-steamer-check',
    contentVersion: 'gng-free-1.8.6-map17-steamer-check-v1',
    title: { en: 'Riverside Mountains Steamer check', zh: '河畔群山蒸汽船检查' },
    map: createMississippi14MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi14SteamerUnits(),
    maxUpgrades: 3,
    recruitableUnits: [],
  };
}

test('moves each Riverside Mountains Steamer group together along its APK water lane', async () => {
  const scenario = createSteamerScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  const initialUnits = session.observe().units;
  const groupIds = [...new Set(initialUnits.map(({ movementGroupId }) => movementGroupId))].sort();

  for (const groupId of groupIds) {
    const group = initialUnits.filter((unit) => unit.movementGroupId === groupId)
      .sort((left, right) => left.positionFine.x - right.positionFine.x);
    const lead = group[0]!;
    session.submitIntent({ type: 'select-at', x: lead.cell.x + 0.5, y: lead.cell.y + 0.5 });
    session.advance({ deltaMs: 0 });
    assert.ok(session.observe().units.find(({ id }) => id === lead.id)?.selected, groupId + ' lead can be selected');
    session.submitIntent({
      type: 'move-unit',
      targetX: lead.cell.x + 1,
      targetY: lead.cell.y,
    });
    session.advance({ deltaMs: 0 });
    const movedUnits = session.advance({ deltaMs: 100 }).units.filter((unit) => unit.movementGroupId === groupId)
      .sort((left, right) => left.positionFine.x - right.positionFine.x);
    assert.equal(movedUnits.length, group.length);
    assert.ok(movedUnits.every(({ positionFine }, index) => (
      positionFine.x > group[index]!.positionFine.x && positionFine.y === group[index]!.positionFine.y
    )), groupId + ' stays on its water lane and does not split');
    assert.deepEqual(
      movedUnits.map(({ positionFine }) => positionFine.x - movedUnits[0]!.positionFine.x),
      group.map(({ positionFine }) => positionFine.x - group[0]!.positionFine.x),
      groupId + ' retains its original component spacing',
    );
  }
  session.close();
});
