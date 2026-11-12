import assert from 'node:assert/strict';
import test from 'node:test';
import { createMississippi12MapScene } from '../src/content/mississippi-12-scene';
import { createMississippi12SteamerUnits } from '../src/content/mississippi-12-steamer';
import map from '../src/content/mississippi-12.json';
import { createGame, type ScenarioContent } from '../src/game';

const FINE_UNITS_PER_CELL = 7680;

function createScenario(): ScenarioContent {
  const mapScene = createMississippi12MapScene();
  return {
    id: 'mississippi-12-steamer-check',
    contentVersion: 'gng-free-1.8.6-map15-steamer-check-v1',
    title: { en: 'Steam Valley Steamer check', zh: '蒸汽谷蒸汽船检查' },
    map: mapScene,
    originalTileGrid: map.originalTileGrid,
    units: createMississippi12SteamerUnits(),
    maxUpgrades: 3,
    recruitableUnits: [],
  };
}

test('creates four unique Steam Valley groups with the APK part assets and activity states', () => {
  const units = createMississippi12SteamerUnits();
  assert.equal(units.length, 22);
  assert.equal(new Set(units.map(({ id }) => id)).size, 22);

  const groups = new Map<string, typeof units>();
  for (const unit of units) {
    assert.ok(unit.movementGroupId);
    groups.set(unit.movementGroupId, [...(groups.get(unit.movementGroupId) ?? []), unit]);
  }
  assert.deepEqual([...groups.keys()].sort(), [
    'mississippi-12-steamer-15-3',
    'mississippi-12-steamer-9-4',
    'mississippi-12-steamer-2-19',
    'mississippi-12-steamer-20-20',
  ].sort());
  assert.deepEqual([...groups.values()].map((group) => group.length).sort((a, b) => a - b), [5, 5, 6, 6]);

  const placementsByGroup = Object.fromEntries([...groups.entries()].map(([groupId, group]) => [
    groupId,
    group.map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]),
  ]));
  assert.deepEqual(placementsByGroup, {
    'mississippi-12-steamer-15-3': [
      ['steamer-30', 5, 15, 3], ['steamer-31', 5, 16, 3],
      ['steamer-32', 4, 17, 3], ['steamer-32', 4, 18, 3], ['steamer-32', 4, 19, 3], ['steamer-33', 5, 20, 3],
    ],
    'mississippi-12-steamer-9-4': [
      ['steamer-30', 5, 9, 4], ['steamer-31', 5, 10, 4],
      ['steamer-32', 4, 11, 4], ['steamer-32', 4, 12, 4], ['steamer-33', 5, 13, 4],
    ],
    'mississippi-12-steamer-2-19': [
      ['steamer-30', 5, 2, 19], ['steamer-31', 5, 3, 19],
      ['steamer-32', 5, 4, 19], ['steamer-32', 4, 5, 19], ['steamer-33', 5, 6, 19],
    ],
    'mississippi-12-steamer-20-20': [
      ['steamer-30', 5, 20, 20], ['steamer-31', 5, 21, 20],
      ['steamer-32', 4, 22, 20], ['steamer-32', 4, 23, 20], ['steamer-32', 4, 24, 20], ['steamer-33', 5, 25, 20],
    ],
  });

  assert.deepEqual(
    Object.fromEntries([30, 31, 32, 33].map((typeId) => [
      typeId,
      units.filter(({ type }) => type === `steamer-${typeId}`).length,
    ])),
    { 30: 4, 31: 4, 32: 10, 33: 4 },
  );
  assert.equal(units.filter(({ type, activity }) => type === 'steamer-32' && activity === 4).length, 9);
  assert.equal(units.filter(({ type, activity }) => type === 'steamer-32' && activity === 5).length, 1);
  assert.ok(units.filter(({ type }) => type !== 'steamer-32').every(({ activity }) => activity === 5));
  assert.ok(units.every(({ movementAxis, movementSurface, movementSpeedFinePer100Ms, collisionBoxFine }) => (
    movementAxis === 'horizontal'
    && movementSurface === 'water'
    && movementSpeedFinePer100Ms === 1000
    && JSON.stringify(collisionBoxFine) === JSON.stringify({ x: -3840, y: -4608, width: 7680, height: 4608 })
  )));

  const expectedAssets: Readonly<Record<string, string>> = {
    'steamer-30': 'steamboat_1',
    'steamer-31': 'steamboat_2',
    'steamer-32': 'steamboat_3',
    'steamer-33': 'steamboat_4a',
  };
  assert.ok(units.every(({ type, asset }) => expectedAssets[type] === asset));
  assert.equal(units.filter(({ steamEmitter }) => steamEmitter).length, 4);
  assert.equal(units.filter(({ positionAssetSequence }) => positionAssetSequence).length, 4);
  assert.ok(units.filter(({ type }) => type === 'steamer-32').every(({ hirePrice, weapon, upgradeLevels }) => (
    hirePrice === 150 && weapon?.damage === 650 && upgradeLevels?.length === 3
  )));
});

test('keeps every river obstacle collision box outside each of the four Steamer hulls', () => {
  const units = createMississippi12SteamerUnits();
  const decorations = createMississippi12MapScene().decorations ?? [];
  const waterRocks = decorations.filter(({ asset }) => asset === 'e_1x1_rocks_water');
  assert.equal(waterRocks.length, 15);

  for (const unit of units) {
    const unitBox = unit.collisionBoxFine!;
    const unitLeft = (unit.cell.x * FINE_UNITS_PER_CELL) + 3840 + unitBox.x;
    const unitTop = (unit.cell.y * FINE_UNITS_PER_CELL) + 3840 + 1920 + unitBox.y;
    const unitRight = unitLeft + unitBox.width;
    const unitBottom = unitTop + unitBox.height;
    for (const rock of waterRocks) {
      const rockBox = rock.collisionBoxFine!;
      const rockLeft = (rock.cell.x * FINE_UNITS_PER_CELL) + rockBox.x;
      const rockTop = (rock.cell.y * FINE_UNITS_PER_CELL) + rockBox.y;
      const rockRight = rockLeft + rockBox.width;
      const rockBottom = rockTop + rockBox.height;
      const intersects = unitLeft < rockRight && unitRight > rockLeft
        && unitTop < rockBottom && unitBottom > rockTop;
      assert.equal(intersects, false, `${unit.id} does not overlap water rock at ${rock.cell.x},${rock.cell.y}`);
    }
  }
});

test('moves each Steamer group as one horizontal unit in Steam Valley water', async () => {
  const scenario = createScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  const initialUnits = session.observe().units;
  const groupIds = [...new Set(initialUnits.map(({ movementGroupId }) => movementGroupId))].sort();

  for (const groupId of groupIds) {
    const group = initialUnits.filter((unit) => unit.movementGroupId === groupId)
      .sort((left, right) => left.positionFine.x - right.positionFine.x);
    const lead = group[0]!;
    session.submitIntent({ type: 'select-at', x: lead.cell.x + 0.5, y: lead.cell.y + 0.5 });
    session.advance({ deltaMs: 0 });
    assert.ok(session.observe().units.find(({ id }) => id === lead.id)?.selected, `${groupId} lead can be selected`);
    session.submitIntent({
      type: 'move-unit',
      targetX: (lead.positionFine.x / FINE_UNITS_PER_CELL) + 3,
      targetY: lead.positionFine.y / FINE_UNITS_PER_CELL,
    });
    session.advance({ deltaMs: 0 });
    const movedUnits = session.advance({ deltaMs: 100 }).units.filter((unit) => unit.movementGroupId === groupId)
      .sort((left, right) => left.positionFine.x - right.positionFine.x);
    assert.equal(movedUnits.length, group.length);
    assert.ok(movedUnits.every(({ positionFine }, index) => (
      positionFine.x > group[index]!.positionFine.x && positionFine.y === group[index]!.positionFine.y
    )), `${groupId} moves without splitting or changing river lane`);
    assert.deepEqual(
      movedUnits.map(({ positionFine }) => positionFine.x - movedUnits[0]!.positionFine.x),
      group.map(({ positionFine }) => positionFine.x - group[0]!.positionFine.x),
      `${groupId} retains the APK component spacing`,
    );
  }
  session.close();
});
