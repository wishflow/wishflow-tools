import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createMississippi11MapScene } from '../src/content/mississippi-11-scene';
import { createMississippi11MapUnits } from '../src/content/mississippi-11-units';
import { createMississippi11TrainUnits } from '../src/content/mississippi-11-trains';
import map from '../src/content/mississippi-11.json';
import { createGame, type ScenarioContent } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const trainAssets = new Set(['lok_hori_1of2', 'lok_hori_2of2', 'lok_wagon_hori']);
const trainGroupIds = ['mississippi-11-train-1', 'mississippi-11-train-2'] as const;

function createTrainScenario(): ScenarioContent {
  return {
    id: 'mississippi-11-train-test',
    contentVersion: 'gng-free-1.8.6-map14-train-check-v1',
    title: { en: 'Traveller’s Town train check', zh: '旅行者小镇列车检查' },
    map: createMississippi11MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [...createMississippi11MapUnits(), ...createMississippi11TrainUnits()],
    maxUpgrades: 3,
    recruitableUnits: [],
  };
}

async function openTrainScenario() {
  const scenario = createTrainScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  return { scenario, session };
}

function groupUnits(view: ReturnType<Awaited<ReturnType<typeof openTrainScenario>>['session']['observe']>, groupId: string) {
  return view.units.filter(({ movementGroupId }) => movementGroupId === groupId)
    .sort((left, right) => left.positionFine.x - right.positionFine.x);
}

test('creates the two map14 train groups from the original markers with distinct unit groups', () => {
  const scenario = createTrainScenario();
  const units = createMississippi11TrainUnits();
  assert.deepEqual(units.map(({ movementGroupId, type, activity, cell, asset }) => ({
    movementGroupId, type, activity, cell, asset,
  })), [
    { movementGroupId: trainGroupIds[0], type: 'train-10', activity: 5, cell: { x: 3, y: 18 }, asset: 'lok_hori_1of2' },
    { movementGroupId: trainGroupIds[0], type: 'train-11', activity: 5, cell: { x: 4, y: 18 }, asset: 'lok_hori_2of2' },
    { movementGroupId: trainGroupIds[0], type: 'train-12', activity: 4, cell: { x: 5, y: 18 }, asset: 'lok_wagon_hori' },
    { movementGroupId: trainGroupIds[0], type: 'train-12', activity: 4, cell: { x: 6, y: 18 }, asset: 'lok_wagon_hori' },
    { movementGroupId: trainGroupIds[1], type: 'train-10', activity: 5, cell: { x: 26, y: 18 }, asset: 'lok_hori_1of2' },
    { movementGroupId: trainGroupIds[1], type: 'train-11', activity: 5, cell: { x: 27, y: 18 }, asset: 'lok_hori_2of2' },
    { movementGroupId: trainGroupIds[1], type: 'train-12', activity: 4, cell: { x: 28, y: 18 }, asset: 'lok_wagon_hori' },
  ]);

  assert.deepEqual([...new Set(units.map(({ movementGroupId }) => movementGroupId))], [...trainGroupIds]);
  assert.ok(units.every(({ movementAxis, collisionBoxFine, movementSpeedFinePer100Ms }) => (
    movementAxis === 'horizontal'
    && JSON.stringify(collisionBoxFine) === JSON.stringify({ x: -3840, y: -4608, width: 7680, height: 4608 })
    && movementSpeedFinePer100Ms === 3000
  )));
  assert.deepEqual(units.map(({ render }) => render), [
    { x: 3, y: 17.5, width: 1, height: 1.5 },
    { x: 4, y: 17.5, width: 1, height: 1.5 },
    { x: 5, y: 18, width: 1, height: 1 },
    { x: 6, y: 18, width: 1, height: 1 },
    { x: 26, y: 17.5, width: 1, height: 1.5 },
    { x: 27, y: 17.5, width: 1, height: 1.5 },
    { x: 28, y: 18, width: 1, height: 1 },
  ]);
  assert.ok(units.filter(({ type }) => type === 'train-12').every(({ hirePrice, weapon }) => (
    hirePrice === 125 && weapon?.damage === 125
  )));
  assert.ok(units.filter(({ type }) => type !== 'train-12').every(({ hirePrice, weapon }) => (
    hirePrice === undefined && weapon === undefined
  )));
  assert.ok(units.every(({ asset }) => existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset)))));
  assert.equal(scenario.map.decorations?.some(({ asset }) => trainAssets.has(asset)), false);
});

test('each train group moves independently and preserves its rigid horizontal spacing', async () => {
  for (const [groupIndex, groupId] of trainGroupIds.entries()) {
    const { session } = await openTrainScenario();
    const otherGroupId = trainGroupIds[1 - groupIndex]!;
    const initialGroup = groupUnits(session.observe(), groupId);
    const initialOtherGroup = groupUnits(session.observe(), otherGroupId);
    const selected = initialGroup[0]!;
    const selectedCell = selected.cell;

    session.submitIntent({ type: 'select-at', x: selectedCell.x + 0.5, y: selectedCell.y + 0.5 });
    session.advance({ deltaMs: 0 });
    session.submitIntent({ type: 'move-unit', targetX: selectedCell.x + 3.5, targetY: selectedCell.y - 10 });

    const movedView = session.advance({ deltaMs: 100 });
    const movedGroup = groupUnits(movedView, groupId);
    const unchangedOtherGroup = groupUnits(movedView, otherGroupId);
    assert.deepEqual(movedGroup.map(({ positionFine }, index) => ({
      x: positionFine.x - initialGroup[index]!.positionFine.x,
      y: positionFine.y - initialGroup[index]!.positionFine.y,
    })), movedGroup.map(() => ({ x: 3000, y: 0 })));
    assert.deepEqual(
      unchangedOtherGroup.map(({ positionFine }) => positionFine),
      initialOtherGroup.map(({ positionFine }) => positionFine),
    );
    assert.deepEqual(movedGroup.slice(1).map(({ positionFine }, index) => (
      positionFine.x - movedGroup[index]!.positionFine.x
    )), movedGroup.slice(1).map(() => 7680));

    session.submitIntent({ type: 'stop-moving' });
    const stoppedView = session.advance({ deltaMs: 100 });
    assert.deepEqual(
      groupUnits(stoppedView, groupId).map(({ positionFine }) => positionFine),
      movedGroup.map(({ positionFine }) => positionFine),
    );
    assert.ok(groupUnits(stoppedView, groupId).every(({ moving }) => !moving));
  }
});

test('map14 rail buffers stop the first train before the western group reaches them', async () => {
  const { session } = await openTrainScenario();
  const movingGroupId = trainGroupIds[0];
  const staticGroupId = trainGroupIds[1];
  const initial = groupUnits(session.observe(), movingGroupId);
  const staticInitial = groupUnits(session.observe(), staticGroupId);
  const locomotive = initial[0]!;

  session.submitIntent({ type: 'select-at', x: locomotive.cell.x + 0.5, y: locomotive.cell.y + 0.5 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'move-unit', targetX: 32.5, targetY: 18.5 });

  let view = session.advance({ deltaMs: 100 });
  for (let step = 0; step < 500 && groupUnits(view, movingGroupId).some(({ moving }) => moving); step += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  const stopped = groupUnits(view, movingGroupId);
  assert.ok(stopped.every(({ moving }) => !moving), 'the group stops after reaching a rail buffer');
  assert.ok(stopped.every(({ positionFine }, index) => (
    index === 0 || positionFine.x - stopped[index - 1]!.positionFine.x === 7680
  )));
  assert.ok(stopped.at(-1)!.positionFine.x + 3840 <= 14 * 7680, 'the last wagon does not overlap the buffer at x=14');
  assert.notDeepEqual(stopped.map(({ positionFine }) => positionFine.x), initial.map(({ positionFine }) => positionFine.x));
  assert.deepEqual(
    groupUnits(view, staticGroupId).map(({ positionFine }) => positionFine),
    staticInitial.map(({ positionFine }) => positionFine),
  );
});
