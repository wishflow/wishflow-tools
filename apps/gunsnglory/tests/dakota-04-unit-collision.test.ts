import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { campaignCatalog } from '../src/content/campaign-catalog';
import { createDakota04DynamiteDefinition } from '../src/content/dakota-04-dynamite';
import map from '../src/content/dakota-04.json';
import { createDakota04MapScene } from '../src/content/dakota-04-scene';
import { createDakota04TrainUnits } from '../src/content/dakota-04-trains';
import { createDakota04MapUnits } from '../src/content/dakota-04-units';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_UNITS_PER_CELL = 7_680;

const hireMarkerExpectations = [
  {
    marker: 96,
    type: 'gunslinger',
    cells: [[9, 1], [30, 4], [11, 5], [21, 5], [31, 13], [21, 14], [3, 16], [13, 17], [23, 19], [26, 19], [1, 20], [14, 23], [28, 23]],
  },
  {
    marker: 97,
    type: 'mexican',
    cells: [[25, 1], [18, 2], [28, 3], [16, 4], [6, 5], [23, 5], [13, 6], [30, 7], [14, 8], [5, 9], [29, 9], [20, 10], [8, 11], [23, 14], [5, 15], [29, 15], [7, 17], [11, 17], [28, 18], [21, 20], [17, 22]],
  },
  {
    marker: 98,
    type: 'cannon',
    cells: [[7, 1], [28, 1], [11, 2], [16, 2], [9, 4], [9, 9], [17, 9], [31, 10], [0, 15], [7, 15], [15, 16], [30, 17], [12, 19], [6, 22], [19, 22]],
  },
  { marker: 99, type: 'indian', cells: [[23, 1], [4, 2], [24, 8], [6, 11], [25, 23]] },
  { marker: 100, type: 'sniper', gate: 'sniper', cells: [[13, 12]] },
  { marker: 101, type: 'grandpa', gate: 'grandpa', cells: [[30, 2], [18, 4], [0, 6], [12, 8], [22, 22]] },
  { marker: 130, type: 'pyromaniac', gate: 'pyromaniac', cells: [[30, 23]] },
  { marker: 131, type: 'salesman', gate: 'salesman', cells: [[16, 12]] },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

function unitCells(units: readonly ScenarioUnit[], type: string): number[][] {
  return units.filter((unit) => unit.type === type && unit.activity === 4)
    .map(({ cell }) => [cell.x, cell.y]);
}

function campaignScenarioIdForLevel(level: number): string {
  const entry = campaignCatalog.find((candidate) => candidate.level === level);
  assert.ok(entry, `campaign level ${level} is registered`);
  const levelWithinRegion = ((level - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(levelWithinRegion).padStart(2, '0')}`;
}

async function moveProbe(options: {
  id: string;
  start: { x: number; y: number };
  target: { x: number; y: number };
  obstacles?: readonly ScenarioUnit[];
  completedScenarioIds?: readonly string[];
  frames?: number;
}) {
  const player = createActiveGunslinger(options.start, 94);
  const scenario: ScenarioContent = {
    id: options.id,
    title: { en: 'Badlands collision probe', zh: '荒原碰撞探针' },
    map: createDakota04MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [player, ...(options.obstacles ?? [])],
    dynamite: createDakota04DynamiteDefinition(options.completedScenarioIds ?? []),
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: options.start.x + 0.5, y: options.start.y + 0.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: options.target.x, targetY: options.target.y }), true);
    let view = session.observe();
    for (let frame = 0; frame < (options.frames ?? 40); frame += 1) view = session.advance({ deltaMs: 100 });
    return { player, view };
  } finally {
    session.close();
  }
}

test('Badlands hire markers preserve exact APK cells, activity, milestones, assets, and unique IDs', () => {
  for (const { marker, cells } of hireMarkerExpectations) {
    assert.deepEqual(markerCells(marker), cells, `raw ${marker} APK cells`);
  }

  for (let mask = 0; mask < 16; mask += 1) {
    const unlocks = {
      grandpa: (mask & 1) !== 0,
      sniper: (mask & 2) !== 0,
      pyromaniac: (mask & 4) !== 0,
      salesman: (mask & 8) !== 0,
    };
    const completedScenarioIds = completedScenarioIdsForMississippiUnitUnlockSnapshot(unlocks);
    const units = createDakota04MapUnits(completedScenarioIds);

    for (const expected of hireMarkerExpectations) {
      const unlocked = !('gate' in expected) || unlocks[expected.gate];
      assert.deepEqual(unitCells(units, expected.type), unlocked ? expected.cells : [],
        `unlock mask ${mask} raw ${expected.marker} ${expected.type}`);
    }
    assert.ok(units.every(({ activity }) => activity === 4), 'map37 creates only sleeping activity-4 hires');
    assert.ok(units.every(({ hirePrice }) => typeof hirePrice === 'number' && hirePrice > 0),
      'every instantiated TDM hire marker can be recruited');
    const ids = units.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length, `unlock mask ${mask} keeps IDs unique`);
  }

  const allUnlocked = createDakota04MapUnits(completedScenarioIdsForMississippiUnitUnlockSnapshot({
    grandpa: true, sniper: true, pyromaniac: true, salesman: true,
  }));
  assert.equal(allUnlocked.length, 62);
  assert.equal(new Set(allUnlocked.map(({ id }) => id)).size, 62);
  for (const { asset, awakeAsset } of allUnlocked) {
    for (const candidate of [asset, awakeAsset].filter((value): value is string => Boolean(value))) {
      assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(candidate))), `${candidate} is bundled`);
    }
  }
});

test('Badlands GameSession blocks against a real sleeping Gunslinger hire marker', async () => {
  const hire = createDakota04MapUnits().find(({ type, cell }) => type === 'gunslinger' && cell.x === 9 && cell.y === 1);
  assert.ok(hire && hire.activity === 4);
  const { player, view } = await moveProbe({
    id: 'badlands-sleeping-hire-blocker',
    start: { x: 6, y: 1 },
    target: { x: 12, y: 1.75 },
    obstacles: [hire],
  });
  const movedPlayer = view.units.find(({ id }) => id === player.id);
  const hireView = view.units.find(({ id }) => id === hire.id);
  assert.ok(movedPlayer && hireView);
  const playerRight = movedPlayer.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
  const hireLeft = hireView.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x;
  assert.ok(movedPlayer.positionFine.x > 8 * FINE_UNITS_PER_CELL,
    'the player crosses the preceding open ground before meeting the hire');
  assert.ok(playerRight <= hireLeft, 'the sleeping hire remains a physical blocker');
  assert.ok(hireLeft - playerRight < 2_000, 'the player stops at the hire boundary');
});

test('Badlands GameSession keeps horizontal and vertical bridge travel on their terrain corridors', async () => {
  assert.equal(map.originalTileGrid[17]![9], 80);
  const horizontal = await moveProbe({
    id: 'badlands-horizontal-bridge-traversal',
    start: { x: 7, y: 17 },
    target: { x: 12, y: 17.75 },
  });
  const horizontalPlayer = horizontal.view.units.find(({ id }) => id === horizontal.player.id);
  assert.ok(horizontalPlayer && horizontalPlayer.positionFine.x > (11.5 * FINE_UNITS_PER_CELL),
    'the player crosses the original raw80 horizontal bridge cell');

  assert.equal(map.originalTileGrid[3]![24], 88);
  assert.equal(map.originalTileGrid[4]![24], 88);
  const vertical = await moveProbe({
    id: 'badlands-vertical-bridge-traversal',
    start: { x: 24, y: 1 },
    target: { x: 24.5, y: 6 },
  });
  const verticalPlayer = vertical.view.units.find(({ id }) => id === vertical.player.id);
  assert.ok(verticalPlayer && verticalPlayer.positionFine.y > (5.5 * FINE_UNITS_PER_CELL),
    'the player crosses both original raw88 vertical bridge cells');

  const side = await moveProbe({
    id: 'badlands-vertical-bridge-cliff-edge',
    start: { x: 24, y: 3 },
    target: { x: 23.5, y: 3.75 },
    frames: 10,
  });
  const sidePlayer = side.view.units.find(({ id }) => id === side.player.id);
  assert.ok(sidePlayer);
  const colliderLeft = sidePlayer.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x;
  assert.ok(colliderLeft >= (24 * FINE_UNITS_PER_CELL), 'the player cannot leave the vertical bridge into the raw36 cliff bank');
});

test('Badlands GameSession crosses railway overlay and blocks against water tower and unlocked dynamite', async () => {
  const rail = await moveProbe({
    id: 'badlands-railway-crossing',
    start: { x: 1, y: 9 },
    target: { x: 4.5, y: 9.75 },
  });
  const railPlayer = rail.view.units.find(({ id }) => id === rail.player.id);
  assert.ok(railPlayer && railPlayer.positionFine.x > (3 * FINE_UNITS_PER_CELL),
    'raw90 rail is an overlay on the open desert crossing');

  const train = await moveProbe({
    id: 'badlands-train-blocker',
    start: { x: 0, y: 5 },
    target: { x: 4.5, y: 5.75 },
    obstacles: createDakota04TrainUnits(),
  });
  const trainPlayer = train.view.units.find(({ id }) => id === train.player.id);
  const locomotive = train.view.units.find(({ type, cell }) => type === 'train-20' && cell.x === 2 && cell.y === 5);
  assert.ok(trainPlayer && locomotive?.collisionBoxFine);
  const trainPlayerRight = trainPlayer.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
  const locomotiveLeft = locomotive.positionFine.x + locomotive.collisionBoxFine.x;
  assert.ok(trainPlayerRight <= locomotiveLeft, 'the stationary GameSession train blocks movement at its APK collider');
  assert.ok(locomotiveLeft - trainPlayerRight < 2_000, 'the player reaches the train collision edge');

  const tower = await moveProbe({
    id: 'badlands-water-tower-blocker',
    start: { x: 0, y: 10 },
    target: { x: 3.5, y: 10.75 },
  });
  const towerPlayer = tower.view.units.find(({ id }) => id === tower.player.id);
  assert.ok(towerPlayer);
  const towerLeft = (1 * FINE_UNITS_PER_CELL) + 1_920;
  const towerRight = towerPlayer.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
  assert.ok(towerRight <= towerLeft, 'the raw75 water-tower fixture blocks the real GameSession unit');
  assert.ok(towerLeft - towerRight < 2_000, 'the player approaches the audited tower collision edge');

  const shack = await moveProbe({
    id: 'badlands-shack-blocker',
    start: { x: 1, y: 0 },
    target: { x: 8, y: 0.75 },
  });
  const shackPlayer = shack.view.units.find(({ id }) => id === shack.player.id);
  assert.ok(shackPlayer);
  const shackLeft = (5 * FINE_UNITS_PER_CELL) - FINE_UNITS_PER_CELL;
  const shackPlayerRight = shackPlayer.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
  assert.ok(shackPlayerRight <= shackLeft, 'the raw116 shack blocks using its full APK footprint');
  assert.ok(shackLeft - shackPlayerRight < 2_000, 'the player reaches the shack collision edge');

  const dynamite = await moveProbe({
    id: 'badlands-unlocked-dynamite-blocker',
    start: { x: 29, y: 9 },
    target: { x: 25, y: 9.75 },
    completedScenarioIds: [campaignScenarioIdForLevel(20)],
  });
  const dynamitePlayer = dynamite.view.units.find(({ id }) => id === dynamite.player.id);
  assert.ok(dynamitePlayer);
  const triggerRight = (27 * FINE_UNITS_PER_CELL) + 3_840 + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
  const playerLeft = dynamitePlayer.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x;
  assert.ok(playerLeft >= triggerRight, 'the unlocked raw102 trigger blocks the player after raw110 pairing');
  assert.ok(playerLeft - triggerRight < 2_000, 'the player stops at the APK-sized dynamite blocker');
});
