import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-05.json';
import { createDakota05MapScene } from '../src/content/dakota-05-scene';
import { createDakota05MapUnits } from '../src/content/dakota-05-units';
import { createDakota05TrainUnits } from '../src/content/dakota-05-trains';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const fineUnitsPerCell = 7_680;
const expectedTrackCells = [3, 4, ...Array.from({ length: 12 }, (_, index) => index + 10)]
  .map((x) => [x, 1]);
const expectedTrain = [
  { type: 'train-10', activity: 5, cell: { x: 5, y: 1 }, asset: 'lok_hori_1of2' },
  { type: 'train-11', activity: 5, cell: { x: 6, y: 1 }, asset: 'lok_hori_2of2' },
  { type: 'train-12', activity: 4, cell: { x: 7, y: 1 }, asset: 'lok_wagon_hori' },
  { type: 'train-12', activity: 4, cell: { x: 8, y: 1 }, asset: 'lok_wagon_hori' },
  { type: 'train-12', activity: 4, cell: { x: 9, y: 1 }, asset: 'lok_wagon_hori' },
] as const;

function trainUnits<T extends { movementGroupId?: string }>(units: readonly T[]): T[] {
  return units.filter(({ movementGroupId }) => movementGroupId?.startsWith('dakota-05-train-'));
}

function createScenario(units: readonly ScenarioUnit[]): ScenarioContent {
  return {
    id: 'ghost-town-train-probe',
    title: { en: 'Ghost Town train collision probe', zh: 'Ghost Town 列车碰撞探针' },
    map: createDakota05MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [...units],
  };
}

async function moveProbe(start: { x: number; y: number }, target: { x: number; y: number }, obstacles: readonly ScenarioUnit[]) {
  const player = createActiveGunslinger(start, 906);
  const scenario = createScenario([player, ...obstacles]);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: start.x + 0.5, y: start.y + 0.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: target.x, targetY: target.y }), true);
    let view = session.observe();
    for (let frame = 0; frame < 50; frame += 1) view = session.advance({ deltaMs: 100 });
    return { player, view };
  } finally {
    session.close();
  }
}

test('Ghost Town raw 82 railway remains a background overlay and the TDM creates one five-piece train', () => {
  assert.deepEqual(map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === 82 ? [[x, y]] : [])), expectedTrackCells);
  assert.deepEqual(map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === 83 ? [[x, y]] : [])), [[5, 1], [6, 1]]);
  assert.deepEqual(map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === 84 ? [[x, y]] : [])), [[7, 1], [8, 1], [9, 1]]);

  const scene = createDakota05MapScene();
  assert.ok(scene.streets?.some(({ x, y, asset }) => x === 12 && y === 1 && asset === 'tiles_railway_hori'));
  assert.equal(scene.backgroundCollisionCodes?.[1]?.[12], 0, 'the railway is rendered above open desert and does not replace its walkable base');
  assert.equal(scene.decorations?.some(({ asset }) => asset.startsWith('lok_')), false, 'train sprites are units, not duplicate static decorations');

  const units = trainUnits(createDakota05TrainUnits());
  assert.deepEqual(units.map(({ type, activity, cell, asset }) => ({ type, activity, cell, asset })), expectedTrain);
  assert.equal(new Set(units.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.ok(units.every(({ movementAxis, movementSpeedFinePer100Ms, collisionBoxFine }) => (
    movementAxis === 'horizontal' && movementSpeedFinePer100Ms === 3_000 && collisionBoxFine !== undefined
  )));

  for (const expected of expectedTrain) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(expected.asset))), `${expected.asset} is bundled`);
  }
});

test('Ghost Town player crosses the raw 82 rail overlay and stops at the stationary train collision', async () => {
  const crossing = await moveProbe({ x: 12, y: 0 }, { x: 12, y: 2.5 }, []);
  const crossingPlayer = crossing.view.units.find(({ id }) => id === crossing.player.id);
  assert.ok(crossingPlayer && crossingPlayer.positionFine.y > 1.5 * fineUnitsPerCell,
    'a player crosses raw82 at x=12 because it is only a street overlay on open ground');

  const train = createDakota05TrainUnits();
  const blocker = await moveProbe({ x: 3, y: 1 }, { x: 10.5, y: 1.75 }, train);
  const movingPlayer = blocker.view.units.find(({ id }) => id === blocker.player.id);
  const locomotive = blocker.view.units.find(({ type, cell }) => type === 'train-10' && cell.x === 5 && cell.y === 1);
  assert.ok(movingPlayer && locomotive?.collisionBoxFine);
  const playerRight = movingPlayer.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
  const locomotiveLeft = locomotive.positionFine.x + locomotive.collisionBoxFine.x;
  assert.ok(playerRight <= locomotiveLeft, 'the active locomotive blocks the player using its APK train collider');
  assert.ok(locomotiveLeft - playerRight < 2_000, 'the player reaches the train collision edge');
});

test('Ghost Town five train units move as one group without self-collision and stop before the right buffer', async () => {
  const units = [...createDakota05MapUnits(), ...createDakota05TrainUnits()];
  const scenario = createScenario(units);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    const initial = trainUnits(session.observe().units);
    assert.equal(initial.length, 5);
    assert.equal(session.submitIntent({ type: 'select-at', x: 5.5, y: 1.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 30, targetY: 1.5 }), true);
    let view = session.observe();
    for (let frame = 0; frame < 80 && trainUnits(view.units).some(({ moving }) => moving); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const stopped = trainUnits(view.units);
    const buffer = createPlayerMapCollisionBoxes(map.originalTileGrid, scenario.map.decorations, undefined)
      .find(({ sourceTdmCode, sourceCell }) => sourceTdmCode === 87 && sourceCell?.x === 22 && sourceCell.y === 1);
    assert.ok(buffer, 'the right end buffer uses the existing static TDM collision mapping');
    assert.ok(stopped.every(({ moving }) => !moving), 'the train finishes at the map-object boundary');
    assert.deepEqual(stopped.map(({ positionFine }, index) => positionFine.x - initial[index]!.positionFine.x),
      Array.from({ length: 5 }, () => stopped[0]!.positionFine.x - initial[0]!.positionFine.x),
      'all five components move by one shared delta');
    assert.ok(stopped.slice(1).every((unit, index) => unit.positionFine.x - stopped[index]!.positionFine.x === fineUnitsPerCell),
      'the original one-cell spacing survives group movement');
    for (const unit of stopped) {
      const bounds = unit.collisionBoxFine!;
      const right = unit.positionFine.x + bounds.x + bounds.width;
      assert.ok(right <= buffer.x, `${unit.id} remains outside the right buffer collision box`);
    }
  } finally {
    session.close();
  }
});
