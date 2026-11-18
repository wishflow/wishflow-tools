import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-03.json';
import { createDakota03DynamiteDefinition } from '../src/content/dakota-03-dynamite';
import { createDakota03MapScene } from '../src/content/dakota-03-scene';
import { createDakota03TrainUnits } from '../src/content/dakota-03-trains';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { campaignCatalog } from '../src/content/campaign-catalog';
import { createGame, type ScenarioContent } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_PER_CELL = 7_680;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

function campaignScenarioIdForLevel(level: number): string {
  const entry = campaignCatalog.find((candidate) => candidate.level === level);
  assert.ok(entry, `campaign level ${level} is registered`);
  const levelWithinRegion = ((level - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(levelWithinRegion).padStart(2, '0')}`;
}

async function trainCollisionProbe() {
  const scene = createDakota03MapScene();
  const player = createActiveGunslinger({ x: 7, y: 10 }, 94);
  const train = createDakota03TrainUnits();
  const id = 'fort-knockout-train-collision-probe';
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Fort Knockout train collision probe', zh: 'Fort Knockout 列车碰撞探针' },
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units: [player, ...train],
  };
  const session = await createGame({ scenarios: { [id]: scenario } }).open({ scenarioId: id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: 7.5, y: 10.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 15, targetY: 10.75 }), true);
    let view = session.observe();
    for (let frame = 0; frame < 45; frame += 1) view = session.advance({ deltaMs: 100 });
    const movedPlayer = view.units.find(({ id: unitId }) => unitId === player.id);
    const wagon = view.units.find(({ type, cell }) => type === 'train-22' && cell.x === 11 && cell.y === 10);
    const wagonCollisionBox = wagon?.collisionBoxFine;
    assert.ok(movedPlayer && wagon && wagonCollisionBox);
    return { movedPlayer, wagon, wagonCollisionBox };
  } finally {
    session.close();
  }
}

test('Fort Knockout vertical TDM train becomes one ordered two-wagon, two-engine movement group', () => {
  assert.deepEqual(markerCells(92), [[11, 9], [11, 10]]);
  assert.deepEqual(markerCells(91), [[11, 11], [11, 12]]);

  const train = createDakota03TrainUnits();
  assert.deepEqual(train.map(({ id, type, activity, movementAxis, asset, cell, frame }) => [
    id, type, activity, movementAxis, asset, cell.x, cell.y, frame?.height,
  ]), [
    ['dakota-03-train-1-22-11-9', 'train-22', 4, 'vertical', 'lok_wagon_verti', 11, 9, 60],
    ['dakota-03-train-1-22-11-10', 'train-22', 4, 'vertical', 'lok_wagon_verti', 11, 10, 60],
    ['dakota-03-train-1-20-11-11', 'train-20', 5, 'vertical', 'lok_verti_2of2', 11, 11, 60],
    ['dakota-03-train-1-21-11-12', 'train-21', 5, 'vertical', 'lok_verti_1of2', 11, 12, 48],
  ]);
  assert.equal(new Set(train.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.ok(train.every(({ collisionBoxFine }) => collisionBoxFine !== undefined));
  assert.ok(train.every(({ collisionBoxFine }) => JSON.stringify(collisionBoxFine) === JSON.stringify({
    x: -2_534, y: -3_840, width: 4_608, height: 7_680,
  })));

  for (const asset of ['lok_wagon_verti', 'lok_verti_2of2', 'lok_verti_1of2']) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} atlas is bundled`);
  }
});

test('Fort Knockout vertical train blocks player movement through the railway in a real GameSession', async () => {
  const { movedPlayer, wagon, wagonCollisionBox } = await trainCollisionProbe();
  const playerRight = movedPlayer.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
  const wagonLeft = wagon.positionFine.x + wagonCollisionBox.x;
  assert.ok(playerRight <= wagonLeft, 'the player stops at the wagon collision edge');
  assert.ok(wagonLeft - playerRight < FINE_PER_CELL, 'the player reaches the train instead of stopping on unrelated terrain');
});

test('Fort Knockout dynamite markers pair at their APK cells and use the level 20/30 unlock', async () => {
  assert.deepEqual(markerCells(102), [[16, 5]]);
  assert.deepEqual(markerCells(110), [[15, 6]]);

  const locked = createDakota03DynamiteDefinition([]);
  assert.deepEqual(locked, {
    unlocked: false,
    pairs: [{ id: 'dynamite-1', triggerCell: { x: 16, y: 5 }, boxCell: { x: 15, y: 6 } }],
  });
  const level20Id = campaignScenarioIdForLevel(20);
  const level30Id = campaignScenarioIdForLevel(30);
  const unlockedBy20 = createDakota03DynamiteDefinition([level20Id]);
  const unlockedBy30 = createDakota03DynamiteDefinition([level30Id]);
  assert.equal(unlockedBy20.unlocked, true);
  assert.equal(unlockedBy30.unlocked, true);
  assert.deepEqual(unlockedBy20.pairs, locked.pairs);

  const scene = createDakota03MapScene();
  const lockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, locked);
  const unlockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, unlockedBy20);
  assert.equal(lockedBoxes.some(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110), false);
  assert.deepEqual(unlockedBoxes.filter(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110), [
    {
      x: (16 * FINE_PER_CELL) + 3_840 + PLAYER_UNIT_COLLIDER_FINE.x,
      y: (5 * FINE_PER_CELL) + 3_840 + 1_920 + PLAYER_UNIT_COLLIDER_FINE.y,
      width: PLAYER_UNIT_COLLIDER_FINE.width,
      height: PLAYER_UNIT_COLLIDER_FINE.height,
      sourceCell: { x: 16, y: 5 },
      sourceTdmCode: 102,
    },
    {
      x: (15 * FINE_PER_CELL) + 3_840 + PLAYER_UNIT_COLLIDER_FINE.x,
      y: (6 * FINE_PER_CELL) + 3_840 + 1_920 + PLAYER_UNIT_COLLIDER_FINE.y,
      width: PLAYER_UNIT_COLLIDER_FINE.width,
      height: PLAYER_UNIT_COLLIDER_FINE.height,
      sourceCell: { x: 15, y: 6 },
      sourceTdmCode: 110,
    },
  ]);

  for (const asset of ['dynamite_detonator', 'dynamite_detonator_pressed', 'dynamite_box', 'sfx_dynamite_box']) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} image is bundled`);
  }

  const scenario: ScenarioContent = {
    id: 'fort-knockout-dynamite-view-test',
    title: { en: 'Fort Knockout dynamite view test', zh: 'Fort Knockout 炸药显示测试' },
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units: [],
    dynamite: unlockedBy20,
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    assert.deepEqual(session.observe().dynamites?.map(({ id, triggerCell, boxCell, unlocked }) => [
      id, triggerCell.x, triggerCell.y, boxCell.x, boxCell.y, unlocked,
    ]), [['dynamite-1', 16, 5, 15, 6, true]]);
  } finally {
    session.close();
  }
});
