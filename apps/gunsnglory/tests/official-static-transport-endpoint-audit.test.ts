import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame } from '../src/bootstrap/browser';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createPlayerMapCollisionBoxes, PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE } from '../src/game/player-collision-geometry';
import type { GameView, UnitView } from '../src/game';

type EndpointStop = 'rail-buffer-86' | 'rail-buffer-87' | 'vertical-buffer-94' | 'vertical-buffer-95'
  | 'water-bank-107' | 'water-bank-109' | 'water-bank-110' | 'water-bank-119' | 'water-bank-127'
  | 'map-edge' | 'ground-terrain' | 'ground-object';

const STREET_LAYER_TILES = new Set([16, 80, 81, 82, 83, 84, 85, 88, 89, 90, 91, 92, 93, 112, 113, 114, 150]);
const BACKGROUND_BLOCKING_TILES = new Set([
  32, 36, 40, 41, 42, 43, 44, 45, 46, 48,
  52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,
  80, 81, 110,
]);

// Keep this source-data audit aligned with GameSession's backgroundCollisionCode()
// and movement collision-code ranges. It classifies endpoint candidates; direct
// movement and stop-position behavior is tested separately in C4-B.
function backgroundCollisionCode(rawTile: number, grid: readonly (readonly number[])[], x: number, y: number): number {
  if (rawTile >= 120 && rawTile <= 126) return 96;
  if (BACKGROUND_BLOCKING_TILES.has(rawTile)) return 48;
  if (rawTile === 88 || rawTile === 89) {
    const above = y > 0 ? grid[y - 1]?.[x] : undefined;
    return above === 88 || above === 89 ? 48 : 0;
  }
  return rawTile === 160 ? 160 : 0;
}

function isGroundBlocked(code: number): boolean {
  return (code >= 12 && code <= 14)
    || (code >= 20 && code <= 23)
    || (code >= 48 && code <= 75)
    || code === 96;
}

function isWaterBlocked(code: number): boolean {
  return (code >= 12 && code <= 14)
    || (code >= 16 && code <= 23)
    || (code >= 48 && code <= 75)
    || (code >= 97 && code < 128)
    || (code >= 160 && code < 164);
}

function classifyEndpoint(
  view: GameView,
  group: readonly UnitView[],
  side: 'low' | 'high',
): { stop: EndpointStop; cell: { x: number; y: number }; raw?: number; background?: number } {
  const first = group[0]!;
  const horizontal = first.movementAxis === 'horizontal';
  assert.ok(horizontal || first.movementAxis === 'vertical', `${first.movementGroupId} has a movement axis`);
  assert.ok(group.every(({ movementAxis, movementSurface }) => (
    movementAxis === first.movementAxis && movementSurface === first.movementSurface
  )), `${first.movementGroupId} has one axis and movement surface`);

  const grid = view.map.originalTileGrid;
  assert.ok(grid, `${view.scenarioId} exposes original TDM for endpoint audit`);
  const positions = group.map(({ cell }) => horizontal ? cell.x : cell.y).sort((left, right) => left - right);
  const lane = horizontal ? first.cell.y : first.cell.x;
  let position = side === 'low' ? positions[0]! - 1 : positions.at(-1)! + 1;
  const step = side === 'low' ? -1 : 1;
  const extent = horizontal ? view.map.width : view.map.height;
  const collisionBoxes = createPlayerMapCollisionBoxes(grid, view.map.decorations, undefined);

  while (position >= 0 && position < extent) {
    const x = horizontal ? position : lane;
    const y = horizontal ? lane : position;
    const raw = grid[y]?.[x];
    assert.notEqual(raw, undefined, `${view.scenarioId} TDM lane is rectangular at (${x},${y})`);

    if (raw === 86 || raw === 87 || raw === 94 || raw === 95) {
      const stop = raw === 86 ? 'rail-buffer-86'
        : raw === 87 ? 'rail-buffer-87'
          : raw === 94 ? 'vertical-buffer-94' : 'vertical-buffer-95';
      assert.ok(PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE[raw], `TDM ${raw} has an APK-derived static collision box`);
      assert.ok(collisionBoxes.some((box) => (
        box.sourceTdmCode === raw && box.sourceCell?.x === x && box.sourceCell.y === y
      )), `${view.scenarioId} TDM ${raw} at (${x},${y}) is included in the runtime collision source`);
      return { stop, cell: { x, y }, raw };
    }

    if (first.movementSurface === 'water') {
      const background = view.map.backgroundCollisionCodes?.[y]?.[x];
      assert.notEqual(background, undefined, `${view.scenarioId} water lane has derived background collision codes`);
      if (isWaterBlocked(background!)) {
        assert.ok(background! >= 97 && background! < 128,
          `${view.scenarioId} water stop ${background} is a bank/surface blocker, not an unrelated terrain code`);
        return { stop: `water-bank-${background}` as EndpointStop, cell: { x, y }, raw, background };
      }
    } else {
      const code = backgroundCollisionCode(raw!, grid, x, y);
      if (isGroundBlocked(code) && !STREET_LAYER_TILES.has(raw!)) {
        return { stop: 'ground-terrain', cell: { x, y }, raw, background: code };
      }
      if (PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE[raw!]) {
        assert.ok(collisionBoxes.some((box) => (
          box.sourceTdmCode === raw && box.sourceCell?.x === x && box.sourceCell.y === y
        )), `${view.scenarioId} TDM object ${raw} is included in the runtime collision source`);
        return { stop: 'ground-object', cell: { x, y }, raw };
      }
    }

    position += step;
  }

  return {
    stop: 'map-edge',
    cell: horizontal
      ? { x: side === 'low' ? -1 : view.map.width, y: lane }
      : { x: lane, y: side === 'low' ? -1 : view.map.height },
  };
}

test('official static transport endpoint audit accounts for all 48 groups and 96 source directions', async () => {
  const game = createBrowserGame(officialCampaignStages.map(({ scenarioId }) => scenarioId));
  const counts = new Map<EndpointStop, number>();
  const groupsSeen = new Set<string>();
  let endpointCount = 0;

  for (const stage of officialCampaignStages) {
    const session = await game.open({
      scenarioId: stage.scenarioId,
      mode: 'formal',
      difficulty: 'easy',
      randomSeed: stage.globalLevel,
    });
    try {
      const view = session.observe();
      const groups = new Map<string, UnitView[]>();
      for (const unit of view.units) {
        if (!unit.movementGroupId || !(unit.type.startsWith('train-') || unit.type.startsWith('steamer-'))) continue;
        const group = groups.get(unit.movementGroupId) ?? [];
        group.push(unit);
        groups.set(unit.movementGroupId, group);
      }

      for (const [groupId, group] of groups) {
        const key = `${stage.globalLevel}:${groupId}`;
        assert.equal(groupsSeen.has(key), false, `${key} is inventoried once`);
        groupsSeen.add(key);
        const horizontal = group[0]!.movementAxis === 'horizontal';
        const cells = group.map(({ cell }) => horizontal ? cell.x : cell.y).sort((left, right) => left - right);
        assert.deepEqual(cells, Array.from({ length: cells.length }, (_, index) => cells[0]! + index),
          `${key} is a contiguous consist along its movement axis`);

        for (const side of ['low', 'high'] as const) {
          const { stop } = classifyEndpoint(view, group, side);
          endpointCount += 1;
          counts.set(stop, (counts.get(stop) ?? 0) + 1);
        }
      }
    } finally {
      session.close();
    }
  }

  assert.equal(groupsSeen.size, 49, 'all formal static train and steamer groups are inventoried');
  assert.equal(endpointCount, 98, 'both endpoint directions are classified for every group');
  assert.deepEqual(Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right))), {
    'map-edge': 24,
    'rail-buffer-86': 23,
    'rail-buffer-87': 23,
    'vertical-buffer-94': 9,
    'vertical-buffer-95': 9,
    'water-bank-107': 1,
    'water-bank-109': 1,
    'water-bank-110': 2,
    'water-bank-119': 3,
    'water-bank-127': 3,
  });
});
