import assert from 'node:assert/strict';
import test from 'node:test';
import { createTechTownMapContent } from '../src/content/tech-town-map-entities';
import { createTechTownTrainTestContent } from '../src/content/tech-town-train-sample';
import { createGame } from '../src/game';

const trainAssets = new Set(['lok_hori_1of2', 'lok_hori_2of2', 'lok_wagon_hori']);

async function openTrainSample() {
  const scenario = createTechTownTrainTestContent();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  return { scenario, session };
}

function trainUnits(view: ReturnType<Awaited<ReturnType<typeof openTrainSample>>['session']['observe']>) {
  return view.units.filter(({ movementGroupId }) => movementGroupId === 'tech-town-train');
}

test('builds the five original train units on the Tech Town track without duplicate static sprites', async () => {
  const { scenario, session } = await openTrainSample();
  const expectedCells = [4, 5, 6, 7, 8].map((x) => ({ x, y: 12 }));
  const units = trainUnits(session.observe());

  assert.deepEqual(units.map(({ cell }) => cell), expectedCells);
  assert.deepEqual(units.map(({ type, activity, asset }) => ({ type, activity, asset })), [
    { type: 'train-10', activity: 5, asset: 'lok_hori_1of2' },
    { type: 'train-11', activity: 5, asset: 'lok_hori_2of2' },
    { type: 'train-12', activity: 4, asset: 'lok_wagon_hori' },
    { type: 'train-12', activity: 4, asset: 'lok_wagon_hori' },
    { type: 'train-12', activity: 4, asset: 'lok_wagon_hori' },
  ]);
  assert.ok(units.every(({ movementSpeedFinePer100Ms }) => movementSpeedFinePer100Ms === 3000));
  assert.ok(units.every(({ sleepingAnimationFrame, weapon, hirePrice }) => (
    sleepingAnimationFrame === undefined && weapon === undefined && hirePrice === undefined
  )));
  assert.equal(scenario.previewWave, undefined);
  assert.equal(scenario.formalSettlementSupported, undefined);
  assert.equal(scenario.map.decorations?.some(({ asset }) => trainAssets.has(asset)), false);
  const mapContent = createTechTownMapContent(() => true);
  assert.equal(mapContent.units.filter(({ movementGroupId }) => movementGroupId === 'tech-town-train').length, 5);
  assert.equal(mapContent.scene.decorations?.some(({ asset }) => trainAssets.has(asset)), false);
});

test('dragging either locomotive moves every train car by the same horizontal delta and release stops it', async () => {
  for (const selectedX of [4.5, 5.5]) {
    const { session } = await openTrainSample();
    const before = trainUnits(session.observe());
    session.submitIntent({ type: 'select-at', x: selectedX, y: 12.5 });
    session.advance({ deltaMs: 0 });

    assert.equal(session.observe().units.find(({ selected }) => selected)?.cell.x, Math.floor(selectedX));
    session.submitIntent({ type: 'move-unit', targetX: selectedX + 3, targetY: -10 });
    const moved = trainUnits(session.advance({ deltaMs: 100 }));
    assert.deepEqual(moved.map(({ positionFine }, index) => positionFine.x - before[index]!.positionFine.x), [3000, 3000, 3000, 3000, 3000]);
    assert.deepEqual(moved.map(({ positionFine }, index) => positionFine.y - before[index]!.positionFine.y), [0, 0, 0, 0, 0]);

    session.submitIntent({ type: 'stop-moving' });
    const stopped = trainUnits(session.advance({ deltaMs: 100 }));
    assert.deepEqual(stopped.map(({ positionFine }) => positionFine.x), moved.map(({ positionFine }) => positionFine.x));
    assert.ok(stopped.every(({ moving }) => !moving));
  }
});

test('rail buffers stop the whole train before either end of the Tech Town track', async () => {
  for (const direction of [-1, 1]) {
    const { session } = await openTrainSample();
    const initial = trainUnits(session.observe());
    const selectX = direction < 0 ? 4.5 : 5.5;
    session.submitIntent({ type: 'select-at', x: selectX, y: 12.5 });
    session.advance({ deltaMs: 0 });
    session.submitIntent({ type: 'move-unit', targetX: direction < 0 ? -0.5 : 32.5, targetY: 0 });

    let view = session.advance({ deltaMs: 100 });
    for (let step = 0; step < 100 && trainUnits(view).some(({ moving }) => moving); step += 1) {
      view = session.advance({ deltaMs: 100 });
    }

    const stopped = trainUnits(view);
    assert.ok(stopped.every(({ moving }) => !moving));
    assert.ok(stopped.every(({ positionFine }, index) => (
      index === 0 || positionFine.x - stopped[index - 1]!.positionFine.x === 7680
    )));
    if (direction < 0) assert.ok(stopped[0]!.positionFine.x >= 2.5 * 7680);
    else assert.ok(stopped[4]!.positionFine.x <= 29.5 * 7680);
    assert.notDeepEqual(stopped.map(({ positionFine }) => positionFine.x), initial.map(({ positionFine }) => positionFine.x));
  }
});
