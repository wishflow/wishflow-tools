import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-09.json';
import { createDakota09MapScene } from '../src/content/dakota-09-scene';
import { createDakota09MapUnits, createDakota09MapUnitsFromSnapshot } from '../src/content/dakota-09-units';
import type { MississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import { createPlayerMapCollisionBoxes } from '../src/game/player-collision-geometry';
import { createGame, type ScenarioContent } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

const hireMarkers = [
  { marker: 96, type: 'gunslinger', cells: [[6, 1], [12, 8], [21, 8], [0, 9], [5, 12], [23, 13], [2, 18], [18, 21], [9, 22]], asset: 'player_gunslinger_sleep', awakeAsset: 'player_gunslinger' },
  { marker: 97, type: 'mexican', cells: [[16, 1], [22, 1], [1, 3], [18, 7], [28, 10], [2, 11], [7, 11], [19, 15], [11, 16], [5, 23], [13, 23]], asset: 'player_mexican_sleep', awakeAsset: 'player_mexican' },
  { marker: 98, type: 'cannon', cells: [[23, 3], [4, 5], [29, 8], [23, 10], [6, 17], [2, 22]], asset: 'player_cannon_sleep', awakeAsset: 'player_cannon' },
  { marker: 99, type: 'indian', cells: [[11, 1], [25, 2], [7, 15], [27, 18], [30, 19], [4, 20], [25, 21], [16, 22], [20, 23]], asset: 'player_indian_sleep', awakeAsset: 'player_indian' },
  { marker: 100, type: 'sniper', cells: [[17, 11]], asset: 'player_scout_sleep', awakeAsset: 'player_scout', unlock: 'sniper' },
  { marker: 101, type: 'grandpa', cells: [[14, 10], [26, 12]], asset: 'player_geezer_sleep', awakeAsset: 'player_geezer', unlock: 'grandpa' },
  { marker: 130, type: 'pyromaniac', cells: [[31, 12]], asset: 'player_pyromaniac_sleep', awakeAsset: 'player_pyromaniac', unlock: 'pyromaniac' },
  { marker: 131, type: 'salesman', cells: [[2, 1]], asset: 'player_salesman_sleep', awakeAsset: 'player_salesman', unlock: 'salesman' },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

test('Snow Town hire markers preserve all APK cells and global unlock gates', () => {
  const snapshots: MississippiUnitUnlockSnapshot[] = Array.from({ length: 16 }, (_, mask) => ({
    grandpa: (mask & 1) !== 0,
    sniper: (mask & 2) !== 0,
    pyromaniac: (mask & 4) !== 0,
    salesman: (mask & 8) !== 0,
  }));

  for (const unlocks of snapshots) {
    const units = createDakota09MapUnitsFromSnapshot(unlocks);
    const expectedCount = 35 + Number(unlocks.sniper) + (unlocks.grandpa ? 2 : 0)
      + Number(unlocks.pyromaniac) + Number(unlocks.salesman);
    assert.equal(units.filter(({ movementGroupId }) => movementGroupId === undefined).length, expectedCount,
      `map-unit count for unlocks ${JSON.stringify(unlocks)}`);
    assert.equal(new Set(units.map(({ id }) => id)).size, units.length, 'all hire and train IDs are unique');

    for (const expected of hireMarkers) {
      assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} source coordinates`);
      const available = !('unlock' in expected) || unlocks[expected.unlock];
      const actual = units.filter(({ type, movementGroupId }) => type === expected.type && movementGroupId === undefined);
      assert.deepEqual(actual.map(({ cell }) => [cell.x, cell.y]), available ? expected.cells : [],
        `raw ${expected.marker} creates ${expected.type} under its APK unlock gate`);
      for (const unit of actual) {
        assert.equal(unit.activity, 4, `${unit.id} starts asleep`);
        assert.equal(unit.asset, expected.asset);
        assert.equal(unit.awakeAsset, expected.awakeAsset);
        assert.ok(unit.render.y + unit.render.height === unit.cell.y + 0.75,
          `${unit.id} sleeping frame foot matches its TDM cell`);
        assert.ok(unit.awakeRender && unit.awakeRender.y + unit.awakeRender.height === unit.cell.y + 0.75,
          `${unit.id} awake frame foot matches its TDM cell`);
        assert.deepEqual(unit.awakeHitArea, unit.awakeRender);
        assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(unit.asset))), `${unit.asset} is bundled`);
        assert.ok(unit.awakeAsset && existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(unit.awakeAsset))), `${unit.awakeAsset} is bundled`);
      }
    }
  }

  const wrapperSnapshot = { grandpa: true, sniper: false, pyromaniac: true, salesman: false };
  assert.deepEqual(
    createDakota09MapUnits(['campaign-oregon-10', 'campaign-nevada-10']),
    createDakota09MapUnitsFromSnapshot(wrapperSnapshot),
    'completion-based entry point derives the same global unit unlock snapshot',
  );
});

test('Snow Town creates its original two-engine, three-wagon horizontal train', () => {
  const expectedTrain = [
    { type: 'train-10', activity: 5, cell: { x: 9, y: 6 }, asset: 'lok_hori_1of2' },
    { type: 'train-11', activity: 5, cell: { x: 10, y: 6 }, asset: 'lok_hori_2of2' },
    { type: 'train-12', activity: 4, cell: { x: 11, y: 6 }, asset: 'lok_wagon_hori' },
    { type: 'train-12', activity: 4, cell: { x: 12, y: 6 }, asset: 'lok_wagon_hori' },
    { type: 'train-12', activity: 4, cell: { x: 13, y: 6 }, asset: 'lok_wagon_hori' },
  ];
  const units = createDakota09MapUnits();
  const train = units.filter(({ movementGroupId }) => movementGroupId?.startsWith('dakota-09-train-'));

  assert.deepEqual(train.map(({ type, activity, cell, asset }) => ({ type, activity, cell, asset })), expectedTrain);
  assert.equal(new Set(train.map(({ movementGroupId }) => movementGroupId)).size, 1, 'the train moves as one group');
  assert.ok(train.every(({ movementAxis, movementSpeedFinePer100Ms, collisionBoxFine }) => (
    movementAxis === 'horizontal' && movementSpeedFinePer100Ms === 3_000 && collisionBoxFine !== undefined
  )));
  for (const unit of train) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(unit.asset))), `${unit.asset} is bundled`);
  }
});

test('Snow Town train moves as a group and stops at the original right buffer', async () => {
  const scene = createDakota09MapScene();
  const scenarioId = 'snow-town-train-movement-probe';
  const scenario: ScenarioContent = {
    id: scenarioId,
    title: { en: 'Snow Town train movement probe', zh: '雪镇列车移动探针' },
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units: createDakota09MapUnits(),
  };
  const session = await createGame({ scenarios: { [scenarioId]: scenario } }).open({ scenarioId });

  try {
    const initial = session.observe().units.filter(({ movementGroupId }) => movementGroupId?.startsWith('dakota-09-train-'));
    assert.equal(session.submitIntent({ type: 'select-at', x: 9.5, y: 6.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 27, targetY: 6.5 }), true);

    let view = session.observe();
    for (let frame = 0; frame < 100 && view.units.some(({ movementGroupId, moving }) => (
      movementGroupId?.startsWith('dakota-09-train-') && moving
    )); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }

    const stopped = view.units.filter(({ movementGroupId }) => movementGroupId?.startsWith('dakota-09-train-'));
    assert.equal(stopped.length, 5);
    assert.ok(stopped.every(({ moving }) => !moving), 'the whole consist stops at the track-end buffer');
    assert.deepEqual(stopped.map(({ positionFine }, index) => positionFine.x - initial[index]!.positionFine.x),
      Array.from({ length: 5 }, () => stopped[0]!.positionFine.x - initial[0]!.positionFine.x),
      'all consist parts share the same horizontal movement');
    assert.ok(stopped.slice(1).every((unit, index) => unit.positionFine.x - stopped[index]!.positionFine.x === 7_680),
      'one-cell spacing is retained');

    const buffer = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, undefined)
      .find(({ sourceTdmCode, sourceCell }) => sourceTdmCode === 87 && sourceCell?.x === 18 && sourceCell.y === 6);
    const locomotive = stopped.find(({ type }) => type === 'train-10');
    assert.ok(buffer && locomotive?.collisionBoxFine);
    assert.ok(locomotive.positionFine.x + locomotive.collisionBoxFine.x
      + locomotive.collisionBoxFine.width <= buffer.x, 'the train remains before the APK right buffer collider');
  } finally {
    session.close();
  }
});
