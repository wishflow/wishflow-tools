import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/nevada-01.json';
import { createNevada01MapScene } from '../src/content/nevada-01-scene';
import { isBonusCrateCandidateAllowed } from '../src/game/campaign-bonus-crates';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { createGame, type ScenarioContent } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { deriveOriginalBackgroundCodesForTest } from './helpers/terrain-render-reference';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_PER_CELL = 7_680;

async function movePlayer(
  id: string,
  start: { x: number; y: number },
  target: { x: number; y: number },
  frames: number,
) {
  const scene = createNevada01MapScene();
  const player = createActiveGunslinger(start, 41);
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Labyrinth Gulch collision check', zh: '迷宫峡谷碰撞检查' },
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units: [player],
  };
  const session = await createGame({ scenarios: { [id]: scenario } }).open({ scenarioId: id, randomSeed: 41 });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: start.x + 0.5, y: start.y + 0.5 }), true);
    session.advance({ deltaMs: 0, tileSizePixels: 32 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: target.x, targetY: target.y }), true);
    let view = session.observe();
    for (let frame = 0; frame < frames; frame += 1) {
      view = session.advance({ deltaMs: 10, tileSizePixels: 32 });
    }
    const unit = view.units.find(({ id: unitId }) => unitId === player.id);
    assert.ok(unit);
    return unit;
  } finally {
    session.close();
  }
}

const staticDecorationAssets: Readonly<Record<number, string>> = Object.freeze({
  68: 'e_1x1_cactus_a',
  69: 'e_1x1_rocks_a',
  70: 'e_1x1_rocks_b',
  71: 'e_1x1_tree',
  72: 'b_1x1_stake',
  73: 'e_1x1_cactus_b',
  74: 'b_1x1_windmill',
  75: 'b_1x1_watertower',
  76: 'e_1x1_bush',
  117: 'b_1x1_tipi_small',
});

const staticCollisionBounds: Readonly<Record<number, { x: number; y: number; width: number; height: number }>> = Object.freeze({
  68: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  69: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  70: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 },
  71: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  72: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  73: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  74: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  75: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  76: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  117: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
});

test('Labyrinth Gulch static scenery matches the original object markers and draw anchors', () => {
  const scene = createNevada01MapScene();
  const expected = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const asset = staticDecorationAssets[code];
    return asset ? [{ asset, cell: { x, y } }] : [];
  }));

  assert.deepEqual(scene.originalTileGrid, map.originalTileGrid);
  assert.deepEqual(scene.decorations, expected);
  assert.equal(scene.decorations.length, 42);
  assert.ok(scene.decorations.every(({ asset }) => (
    existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset)))
  )), 'every APK decoration marker resolves to a bundled sprite atlas');
  assert.equal(scene.decorations.some(({ asset }) => asset === 'e_1x2_bones'), false,
    'raw 77 is not present on this map');
  assert.equal(scene.decorations.some(({ asset }) => asset === 'b_2x1_shack'), false,
    'raw 116 is not present on this map');
  assert.equal(scene.decorations.some(({ asset }) => asset === 'e_1x1_rocks_water'), false,
    'raw 126 is not present on this map');
});

test('Labyrinth Gulch static object collision boxes follow the APK cell anchors', () => {
  const scene = createNevada01MapScene();
  const collisions = createPlayerMapCollisionBoxes(scene.originalTileGrid, scene.decorations, undefined);
  const expectedCounts: Readonly<Record<number, number>> = {
    68: 4,
    69: 6,
    70: 9,
    71: 4,
    72: 1,
    73: 7,
    74: 1,
    75: 1,
    76: 6,
    117: 3,
  };

  for (const [codeText, count] of Object.entries(expectedCounts)) {
    const code = Number(codeText);
    const obstacles = collisions.filter(({ sourceTdmCode }) => sourceTdmCode === code);
    assert.equal(obstacles.length, count, `raw ${code} should create one obstacle per APK decoration`);
    const bounds = staticCollisionBounds[code]!;
    assert.deepEqual(obstacles.map(({ x, y, width, height, sourceCell }) => ({
      x: x - (sourceCell!.x * 7_680),
      y: y - (sourceCell!.y * 7_680),
      width,
      height,
    })), Array.from({ length: count }, () => bounds), `raw ${code} uses its APK collision rectangle`);
  }
});

test('Labyrinth Gulch scene recognizes every raw map code and preserves the marker-only rules', () => {
  const codes = new Set(map.originalTileGrid.flat());
  const terrainAndRouteCodes = new Set([
    0, 16, 32, 36, 40, 41, 42, 43, 48, 52, 53, 54, 55, 57, 58, 60, 61, 65,
    80, 88,
  ]);
  const noEntityCodes = new Set([78, 118]);
  const deferredEntityCodes = new Set([
    96, 97, 98, 99, 101, 102, 108, 110, 112, 113, 114, 130, 131, 138,
  ]);
  const recognized = new Set([
    ...terrainAndRouteCodes,
    ...Object.keys(staticDecorationAssets).map(Number),
    ...noEntityCodes,
    ...deferredEntityCodes,
  ]);

  assert.deepEqual([...codes].filter((code) => !recognized.has(code)), []);
  assert.equal(map.originalTileGrid.flat().filter((code) => code === 78).length, 9);
  assert.equal(map.originalTileGrid.flat().filter((code) => code === 118).length, 1);
  assert.equal(map.originalTileGrid.flat().filter((code) => code === 77 || code === 116 || code === 126).length, 0);
  assert.equal(isBonusCrateCandidateAllowed({
    x: 1,
    y: 8,
    width: map.map.width,
    height: map.map.height,
    backgroundWalkable: true,
    hasStreet: false,
    objectCode: map.originalTileGrid[8]![1]!,
    fieldBlocked: false,
  }), false, 'raw 78 at the interior candidate cell is reserved from bonus crates');

  const scene = createNevada01MapScene();
  assert.deepEqual(scene.backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map),
    'all 768 terrain cells retain the APK background collision code after deterministic variation');
});

test('Labyrinth Gulch lets a player cross raw 88 bridge cells and stops at raw 36 canyon banks', async () => {
  assert.deepEqual([map.originalTileGrid[2]?.[22], map.originalTileGrid[3]?.[22]], [88, 88]);
  assert.deepEqual([map.originalTileGrid[2]?.[21], map.originalTileGrid[2]?.[23]], [36, 36]);

  const crossing = await movePlayer('labyrinth-gulch-bridge-crossing', { x: 22, y: 1 }, { x: 22.5, y: 4.5 }, 180);
  assert.ok(crossing.positionFine.y / FINE_PER_CELL > 4.1,
    `player crosses both raw 88 cells and reaches the south bank at y=${crossing.positionFine.y / FINE_PER_CELL}`);

  const blocked = await movePlayer('labyrinth-gulch-bridge-bank', { x: 22, y: 2 }, { x: 19, y: 2.75 }, 100);
  const blockedLeft = blocked.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x;
  const canyonEdge = 22 * FINE_PER_CELL;
  assert.ok(blockedLeft >= canyonEdge && blockedLeft <= canyonEdge + 200,
    `player collider stops at the raw 36 canyon edge: x=${blockedLeft / FINE_PER_CELL}`);
});
