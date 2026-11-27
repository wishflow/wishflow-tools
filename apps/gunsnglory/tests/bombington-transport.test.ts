import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { campaignCatalog } from '../src/content/campaign-catalog';
import { createBombingtonDynamiteDefinition, createBombingtonDynamiteDefinitionFromSnapshot } from '../src/content/bombington-dynamite';
import { createBombingtonMapScene } from '../src/content/bombington-scene';
import { createBombingtonTrainUnits } from '../src/content/bombington-trains';
import map from '../src/content/nevada-02.json';
import { createGame, type GameView, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { getMapViewport } from '../src/render/canvas-renderer';
import { recordProductionDrawCalls } from './helpers/record-production-draws';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_PER_CELL = 7_680;
const EXPECTED_TRAIN = [
  { type: 'train-10', activity: 5, cell: { x: 12, y: 7 }, asset: 'lok_hori_1of2' },
  { type: 'train-11', activity: 5, cell: { x: 13, y: 7 }, asset: 'lok_hori_2of2' },
  { type: 'train-12', activity: 4, cell: { x: 14, y: 7 }, asset: 'lok_wagon_hori' },
  { type: 'train-12', activity: 4, cell: { x: 15, y: 7 }, asset: 'lok_wagon_hori' },
] as const;

const EXPECTED_DYNAMITE_PAIRS = [
  [[2, 1], [4, 3]],
  [[18, 4], [16, 3]],
  [[27, 6], [27, 4]],
  [[12, 12], [10, 12]],
  [[17, 13], [16, 11]],
  [[27, 13], [27, 16]],
  [[21, 15], [21, 18]],
  [[6, 20], [5, 20]],
  [[15, 20], [13, 18]],
] as const;

const expectedTrackCells = [
  ...[17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30].map((x) => [x, 7]),
];

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

function trainUnits<T extends { movementGroupId?: string }>(units: readonly T[]): T[] {
  return units.filter(({ movementGroupId }) => movementGroupId === 'bombington-horizontal-train-1');
}

function createScenario(units: readonly ScenarioUnit[], dynamite?: ScenarioContent['dynamite']): ScenarioContent {
  return {
    id: 'bombington-transport-probe',
    title: { en: 'Bombington transport probe', zh: 'Bombington 运输探针' },
    map: createBombingtonMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [...units],
    ...(dynamite ? { dynamite } : {}),
  };
}

function campaignScenarioIdForLevel(level: number): string {
  const entry = campaignCatalog.find((candidate) => candidate.level === level);
  assert.ok(entry, `campaign level ${level} is registered`);
  const levelWithinRegion = ((level - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(levelWithinRegion).padStart(2, '0')}`;
}

function assertTrainDrawn(view: GameView): void {
  const viewport = getMapViewport(view);
  const calls = recordProductionDrawCalls(view);
  for (const unit of view.units.filter(({ movementGroupId }) => movementGroupId === 'bombington-horizontal-train-1')) {
    const expectedRect = [
      Math.trunc(viewport.origin.x + unit.render.x * viewport.tileSize),
      Math.trunc(viewport.origin.y + unit.render.y * viewport.tileSize),
      Math.trunc(unit.render.width * viewport.tileSize),
      Math.trunc(unit.render.height * viewport.tileSize),
    ];
    const matching = calls.filter(({ asset, args }) => asset === unit.asset
      && JSON.stringify(args.slice(4, 8)) === JSON.stringify(expectedRect));
    assert.equal(matching.length, 1, `${unit.id} is drawn once at its production render rectangle`);
  }
}

test('Bombington railway TDM creates one exact horizontal train group and production sprites', async () => {
  assert.deepEqual(markerCells(83), [[12, 7], [13, 7]]);
  assert.deepEqual(markerCells(84), [[14, 7], [15, 7]]);
  assert.deepEqual(markerCells(82), expectedTrackCells);
  assert.deepEqual(markerCells(86), [[11, 7]]);
  assert.deepEqual(markerCells(87), [[31, 7]]);

  const units = trainUnits(createBombingtonTrainUnits());
  assert.deepEqual(units.map(({ type, activity, cell, asset, movementAxis }) => ({
    type, activity, cell, asset, movementAxis,
  })), EXPECTED_TRAIN.map((unit) => ({ ...unit, movementAxis: 'horizontal' })));
  assert.equal(new Set(units.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.ok(units.every(({ movementSpeedFinePer100Ms, collisionBoxFine }) => (
    movementSpeedFinePer100Ms === 3_000 && collisionBoxFine !== undefined
  )));
  for (const unit of EXPECTED_TRAIN) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(unit.asset))), `${unit.asset} is bundled`);
  }

  const scenario = createScenario(units);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    const view = session.observe();
    assertTrainDrawn(view);
  } finally {
    session.close();
  }
});

test('Bombington horizontal train keeps spacing and stops at the APK right buffer', async () => {
  const units = createBombingtonTrainUnits();
  const scenario = createScenario(units);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    const initial = trainUnits(session.observe().units).sort((left, right) => left.cell.x - right.cell.x);
    assert.equal(initial.length, 4);
    assert.equal(session.submitIntent({ type: 'select-at', x: 12.5, y: 7.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(trainUnits(session.observe().units).find(({ type }) => type === 'train-10')?.selected, true,
      'the first locomotive is selected from its original TDM cell');
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 32.5, targetY: 7.75 }), true);

    let view = session.advance({ deltaMs: 100 });
    assert.ok(trainUnits(view.units).some(({ moving }) => moving),
      `the selected horizontal train begins moving: ${JSON.stringify(trainUnits(view.units).map(({ type, selected, moving, positionFine }) => ({ type, selected, moving, positionFine })))}`);
    for (let frame = 0; frame < 120 && trainUnits(view.units).some(({ moving }) => moving); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }

    const stopped = trainUnits(view.units).sort((left, right) => left.cell.x - right.cell.x);
    const buffer = createPlayerMapCollisionBoxes(map.originalTileGrid, scenario.map.decorations, undefined)
      .find(({ sourceTdmCode, sourceCell }) => sourceTdmCode === 87 && sourceCell?.x === 31 && sourceCell.y === 7);
    assert.ok(buffer, 'raw87 maps to the right-end APK buffer collider');
    assert.ok(stopped.every(({ moving }) => !moving), 'the group stops when a component reaches the buffer');
    const deltas = stopped.map((unit, index) => unit.positionFine.x - initial[index]!.positionFine.x);
    assert.ok(deltas.every((delta) => delta === deltas[0]), 'all train parts move by one shared delta');
    assert.ok(deltas[0]! > 0, 'the horizontal group moves east along the rail');
    assert.ok(stopped.slice(1).every((unit, index) => (
      unit.positionFine.x - stopped[index]!.positionFine.x === FINE_PER_CELL
    )), 'the one-cell APK spacing remains stable');
    for (const unit of stopped) {
      const bounds = unit.collisionBoxFine!;
      assert.ok(unit.positionFine.x + bounds.x + bounds.width <= buffer.x,
        `${unit.id} remains west of the right buffer`);
    }
  } finally {
    session.close();
  }
});

test('Bombington dynamite pairs all nine triggers to nearest unused boxes and honors unlock snapshots', () => {
  assert.deepEqual(markerCells(102), EXPECTED_DYNAMITE_PAIRS.map(([[x, y]]) => [x, y]));
  assert.deepEqual(markerCells(110), [
    [4, 3], [16, 3], [27, 4], [16, 11], [10, 12], [27, 16], [13, 18], [21, 18], [5, 20],
  ]);

  const locked = createBombingtonDynamiteDefinitionFromSnapshot(false);
  const unlocked = createBombingtonDynamiteDefinitionFromSnapshot(true);
  assert.deepEqual(locked, {
    unlocked: false,
    pairs: EXPECTED_DYNAMITE_PAIRS.map(([trigger, box], index) => ({
      id: `dynamite-${index + 1}`,
      triggerCell: { x: trigger[0], y: trigger[1] },
      boxCell: { x: box[0], y: box[1] },
    })),
  });
  assert.equal(unlocked.unlocked, true);
  assert.deepEqual(unlocked.pairs, locked.pairs);
  assert.equal(createBombingtonDynamiteDefinition([]).unlocked, false);
  assert.equal(createBombingtonDynamiteDefinition([campaignScenarioIdForLevel(20)]).unlocked, true);
  assert.equal(createBombingtonDynamiteDefinition([campaignScenarioIdForLevel(30)]).unlocked, true);
  assert.deepEqual(createBombingtonDynamiteDefinitionFromSnapshot(true),
    createBombingtonDynamiteDefinition([campaignScenarioIdForLevel(20)]));

  const scene = createBombingtonMapScene();
  const lockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, locked);
  const unlockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, unlocked);
  assert.equal(lockedBoxes.some(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110), false);
  assert.equal(unlockedBoxes.filter(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110).length, 18);
  for (const pair of unlocked.pairs) {
    for (const [cell, code] of [[pair.triggerCell, 102], [pair.boxCell, 110]] as const) {
      const box = unlockedBoxes.find(({ sourceTdmCode, sourceCell }) => sourceTdmCode === code
        && sourceCell?.x === cell.x && sourceCell.y === cell.y);
      assert.ok(box, `raw${code} at (${cell.x},${cell.y}) has one unlocked APK collider`);
      assert.deepEqual({
        x: box.x - (cell.x * FINE_PER_CELL),
        y: box.y - (cell.y * FINE_PER_CELL),
        width: box.width,
        height: box.height,
      }, {
        x: PLAYER_UNIT_COLLIDER_FINE.x + FINE_PER_CELL / 2,
        y: PLAYER_UNIT_COLLIDER_FINE.y + FINE_PER_CELL / 2 + 1_920,
        width: PLAYER_UNIT_COLLIDER_FINE.width,
        height: PLAYER_UNIT_COLLIDER_FINE.height,
      });
    }
  }
});
