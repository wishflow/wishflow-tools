import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame } from '../src/bootstrap/browser';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type GameSession, type ScenarioContent } from '../src/game';
import {
  createPlayerMapCollisionBoxes,
  PLAYER_UNIT_COLLIDER_FINE,
} from '../src/game/player-collision-geometry';

const FINE_UNITS_PER_CELL = 7_680;
const BLOCKED_TDM_BANKS = new Set([32, 36]);
const BRIDGE_CODES = [80, 81, 88] as const;

type BridgeCode = typeof BRIDGE_CODES[number];

function boundsOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
): boolean {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

function bridgeCellsBySpan(
  grid: readonly (readonly number[])[],
  code: BridgeCode,
  renderedCells: readonly { x: number; y: number }[],
  collisionBoxes: ReturnType<typeof createPlayerMapCollisionBoxes>,
): { x: number; y: number }[] {
  const candidates = new Map<string, { x: number; y: number }>();
  for (const { x, y } of renderedCells) {
    if (grid[y]?.[x] !== code) continue;
    const banks = code !== 88
      ? [{ x, y: y - 1 }, { x, y: y + 1 }]
      : [{ x: x - 1, y }, { x: x + 1, y }];
    if (!banks.every(({ x: bankX, y: bankY }) => (
      BLOCKED_TDM_BANKS.has(grid[bankY]?.[bankX] ?? -1)
    ))) continue;

    const unitPosition = {
      x: x * FINE_UNITS_PER_CELL + FINE_UNITS_PER_CELL / 2,
      y: y * FINE_UNITS_PER_CELL + FINE_UNITS_PER_CELL * 0.75,
    };
    const collider = {
      x: unitPosition.x + PLAYER_UNIT_COLLIDER_FINE.x,
      y: unitPosition.y + PLAYER_UNIT_COLLIDER_FINE.y,
      width: PLAYER_UNIT_COLLIDER_FINE.width,
      height: PLAYER_UNIT_COLLIDER_FINE.height,
    };
    if (collisionBoxes.some((box) => boundsOverlap(collider, box))) continue;
    candidates.set(`${x},${y}`, { x, y });
  }

  const spans: { x: number; y: number }[] = [];
  const visited = new Set<string>();
  for (const [key, cell] of candidates) {
    if (visited.has(key)) continue;
    spans.push(cell);
    const pending = [cell];
    visited.add(key);
    while (pending.length > 0) {
      const current = pending.pop()!;
      for (const neighbor of [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ]) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (visited.has(neighborKey) || !candidates.has(neighborKey)) continue;
        visited.add(neighborKey);
        pending.push(neighbor);
      }
    }
  }
  return spans;
}

async function moveToBoundary(
  session: GameSession,
  targetX: number,
  targetY: number,
  steps = 60,
) {
  assert.equal(session.submitIntent({ type: 'move-unit', targetX, targetY }), true);
  let view = session.observe();
  for (let frame = 0; frame < steps; frame += 1) {
    view = session.advance({ deltaMs: 5, tileSizePixels: 32 });
  }
  const unit = view.units[0];
  assert.ok(unit);
  return unit;
}

test('every rendered bridge span on every official map keeps player movement inside its TDM corridor', async () => {
  const browserGame = createBrowserGame(officialCampaignStages.map(({ scenarioId }) => scenarioId));
  const testedByCode: Record<BridgeCode, number> = { 80: 0, 81: 0, 88: 0 };
  const expectedByCode: Record<BridgeCode, number> = { 80: 0, 81: 0, 88: 0 };

  for (const stage of officialCampaignStages) {
    const sourceSession = await browserGame.open({ scenarioId: stage.scenarioId, mode: 'debug', randomSeed: 1 });
    const sourceMap = sourceSession.observe().map;
    const grid = sourceMap.originalTileGrid;
    assert.ok(grid, `level ${stage.globalLevel} exposes its APK TDM grid`);
    const sourceDecorations = sourceMap.decorations ?? [];
    const mapCollisionBoxes = createPlayerMapCollisionBoxes(grid, sourceDecorations, undefined);

    for (const code of BRIDGE_CODES) {
      const asset = code === 88 ? 'tiles_bridge_verti' : 'tiles_bridge_hori';
      const renderedCells = sourceMap.streets.flatMap((tile) => {
        if (tile.asset !== asset) return [];
        const x = Math.round(code === 88 ? tile.x : tile.x + 0.25);
        const y = Math.round(code === 88 ? tile.y + 0.25 : tile.y);
        return [{ x, y }];
      });
      const hasRawCode = grid.some((row) => row.includes(code));
      if (code !== 81 && hasRawCode) {
        assert.ok(renderedCells.some(({ x, y }) => grid[y]?.[x] === code),
          `level ${stage.globalLevel} raw ${code} is drawn as the expected ${asset} bridge`);
      }
      const spans = bridgeCellsBySpan(grid, code, renderedCells, mapCollisionBoxes);
      if (spans.length === 0) continue;
      expectedByCode[code] += spans.length;

      for (const [spanIndex, cell] of spans.entries()) {
        const scenarioId = `bridge-boundary-${stage.globalLevel}-${code}-${spanIndex}`;
        const player = createActiveGunslinger(cell);
        const scenario: ScenarioContent = {
          id: scenarioId,
          title: { en: 'TDM bridge boundary check', zh: 'TDM 桥面边界检查' },
          map: {
            width: sourceMap.width,
            height: sourceMap.height,
            tileSize: sourceMap.tileSize,
            background: sourceMap.background,
            streets: sourceMap.streets,
            decorations: sourceDecorations,
            ...(sourceMap.backgroundCollisionCodes
              ? { backgroundCollisionCodes: sourceMap.backgroundCollisionCodes }
              : {}),
            originalTileGrid: grid,
          },
          originalTileGrid: grid,
          units: [player],
        };
        const game = createGame({ scenarios: { [scenarioId]: scenario } });
        const session = await game.open({ scenarioId, randomSeed: 1 });
        assert.equal(session.submitIntent({ type: 'select-at', x: cell.x + 0.5, y: cell.y + 0.5 }), true,
          `level ${stage.globalLevel} raw ${code} span ${spanIndex + 1} selects the real-map bridge probe`);
        let view = session.advance({ deltaMs: 0, tileSizePixels: 32 });
        assert.equal(view.units[0]?.selected, true);
        const initial = view.units[0]!.positionFine;

        const alongX = code !== 88;
        const alongTargetX = alongX ? initial.x / FINE_UNITS_PER_CELL + 0.4 : initial.x / FINE_UNITS_PER_CELL;
        const alongTargetY = alongX ? initial.y / FINE_UNITS_PER_CELL : initial.y / FINE_UNITS_PER_CELL + 0.4;
        assert.equal(session.submitIntent({ type: 'move-unit', targetX: alongTargetX, targetY: alongTargetY }), true);
        for (let frame = 0; frame < 10; frame += 1) view = session.advance({ deltaMs: 5, tileSizePixels: 32 });
        const along = view.units[0]!;
        const alongDelta = alongX
          ? Math.abs(along.positionFine.x - initial.x) / FINE_UNITS_PER_CELL
          : Math.abs(along.positionFine.y - initial.y) / FINE_UNITS_PER_CELL;
        assert.ok(alongDelta > 0.05 && alongDelta < 0.15,
          `level ${stage.globalLevel} raw ${code} span ${spanIndex + 1} permits travel along the bridge (${alongDelta} cells)`);

        const upperOrLeft = await moveToBoundary(
          session,
          code !== 88 ? along.positionFine.x / FINE_UNITS_PER_CELL : cell.x - 0.5,
          code !== 88 ? cell.y - 0.5 : along.positionFine.y / FINE_UNITS_PER_CELL,
        );
        const upperOrLeftPosition = code !== 88
          ? upperOrLeft.positionFine.y / FINE_UNITS_PER_CELL
          : upperOrLeft.positionFine.x / FINE_UNITS_PER_CELL;
        const minimum = code !== 88 ? cell.y + 0.7 : cell.x + PLAYER_UNIT_COLLIDER_FINE.width / (2 * FINE_UNITS_PER_CELL);
        const maximum = code !== 88 ? cell.y + 0.73 : cell.x + 0.35;
        assert.ok(upperOrLeftPosition >= minimum && upperOrLeftPosition <= maximum,
          `level ${stage.globalLevel} raw ${code} span ${spanIndex + 1} stops at the APK upper/left collider boundary (${upperOrLeftPosition})`);

        const lowerOrRight = await moveToBoundary(
          session,
          code !== 88 ? upperOrLeft.positionFine.x / FINE_UNITS_PER_CELL : cell.x + 1.5,
          code !== 88 ? cell.y + 1.5 : upperOrLeft.positionFine.y / FINE_UNITS_PER_CELL,
        );
        const lowerOrRightPosition = code !== 88
          ? lowerOrRight.positionFine.y / FINE_UNITS_PER_CELL
          : lowerOrRight.positionFine.x / FINE_UNITS_PER_CELL;
        const lowerMinimum = code !== 88 ? cell.y + 1.07 : cell.x + 0.65;
        const lowerMaximum = code !== 88 ? cell.y + 1.11 : cell.x + 0.68;
        assert.ok(lowerOrRightPosition >= lowerMinimum && lowerOrRightPosition <= lowerMaximum,
          `level ${stage.globalLevel} raw ${code} span ${spanIndex + 1} stops at the APK lower/right collider boundary (${lowerOrRightPosition})`);
        testedByCode[code] += 1;
        session.close();
      }
    }
    sourceSession.close();
  }

  assert.deepEqual(testedByCode, expectedByCode,
    'each rendered connected raw 80/81/88 bridge span gets a GameSession movement probe');
  assert.ok(testedByCode[80] > 0 && testedByCode[81] > 0 && testedByCode[88] > 0);
});
