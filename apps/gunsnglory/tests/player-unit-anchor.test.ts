import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame } from '../src/bootstrap/browser';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import {
  cowGulchLevelOneContent,
  officialCampaignStages,
} from '../src/content/official-campaign';
import { createGame, type ScenarioContent } from '../src/game';

const FINE_UNITS_PER_CELL = 7_680;
const UNIT_COLLIDER_START_Y = -5_376;
const UNIT_COLLIDER_HEIGHT = 4_608;

test('anchors every official campaign unit and awake sprite at its fineY foot position', async () => {
  const completedScenarioIds = officialCampaignStages.map(({ scenarioId }) => scenarioId);
  const game = createBrowserGame(completedScenarioIds);
  let checkedActive = 0;
  let checkedAwake = 0;

  for (const stage of officialCampaignStages) {
    const session = await game.open({ scenarioId: stage.scenarioId, mode: 'free', randomSeed: 1 });
    for (const unit of session.observe().units) {
      if (unit.movementSpeedFinePer100Ms > 0 && !unit.movementAxis) {
        checkedActive += 1;
        assert.equal(
          unit.render.y + unit.render.height,
          unit.positionFine.y / FINE_UNITS_PER_CELL,
          `level ${stage.globalLevel} ${unit.type} ${unit.id} active foot aligns with fineY`,
        );
      }
      if (unit.awakeRender && unit.awakeFrame) {
        checkedAwake += 1;
        assert.equal(
          unit.awakeRender.y + unit.awakeRender.height,
          unit.cell.y + 0.75,
          `level ${stage.globalLevel} ${unit.type} ${unit.id} awake foot aligns with its initial fineY`,
        );
        if (unit.awakeHitArea) {
          assert.equal(
            unit.awakeHitArea.y + unit.awakeHitArea.height,
            unit.cell.y + 0.75,
            `level ${stage.globalLevel} ${unit.type} ${unit.id} awake hit area aligns with its initial fineY`,
          );
        }
      }
    }
    session.close();
  }

  assert.ok(checkedActive > 0, 'the audit covers active movable units across the official campaign');
  assert.ok(checkedAwake > 0, 'the audit covers recruitable units after they wake');
});

test('keeps a movable unit on the original Cow Gulch TDM bridge row', async () => {
  const bridgeCell = { x: 12, y: 9 };
  const bridgeTile = cowGulchLevelOneContent.originalTileGrid?.[bridgeCell.y]?.[bridgeCell.x];
  assert.equal(bridgeTile, 80, 'the test uses the original TDM bridge overlay tile');
  assert.equal(cowGulchLevelOneContent.originalTileGrid?.[8]?.[bridgeCell.x], 32);
  assert.equal(cowGulchLevelOneContent.originalTileGrid?.[10]?.[bridgeCell.x], 32);

  const scenario: ScenarioContent = {
    ...cowGulchLevelOneContent,
    id: 'cow-gulch-player-bridge-fixture',
    previewWave: undefined,
    campaignWaves: undefined,
    campaignWaveCount: undefined,
    campaignUnitPool: undefined,
    units: [createActiveGunslinger(bridgeCell)],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } })
    .open({ scenarioId: scenario.id, randomSeed: 7 });
  assert.equal(session.submitIntent({ type: 'select-at', x: 12.5, y: 9.5 }), true);
  session.advance({ deltaMs: 0, tileSizePixels: 32 });
  assert.equal(session.observe().units[0]?.selected, true);

  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 12.5, targetY: 8 }), true);
  let view = session.advance({ deltaMs: 10, tileSizePixels: 32 });
  for (let frame = 0; frame < 20; frame += 1) view = session.advance({ deltaMs: 10, tileSizePixels: 32 });
  const upperBoundPosition = view.units[0]!.positionFine.y;
  assert.ok(upperBoundPosition + UNIT_COLLIDER_START_Y >= 9 * FINE_UNITS_PER_CELL);
  assert.ok(upperBoundPosition / FINE_UNITS_PER_CELL < 9.73);

  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 12.5, targetY: 11 }), true);
  for (let frame = 0; frame < 30; frame += 1) view = session.advance({ deltaMs: 10, tileSizePixels: 32 });
  const unit = view.units[0]!;
  const lowerBoundPosition = unit.positionFine.y;
  const colliderBottom = lowerBoundPosition + UNIT_COLLIDER_START_Y + UNIT_COLLIDER_HEIGHT;
  assert.ok(colliderBottom < 10 * FINE_UNITS_PER_CELL, 'the collider stays before the blocked TDM row below the bridge');
  assert.ok(lowerBoundPosition / FINE_UNITS_PER_CELL > 10.05, 'the unit can move through the bridge rather than stopping at its starting point');
  assert.equal(unit.render.y + unit.render.height, lowerBoundPosition / FINE_UNITS_PER_CELL);
  session.close();
});

test('keeps the real Cow Gulch player unit on the walkable side of its canyon wall', async () => {
  const browserGame = createBrowserGame(officialCampaignStages.map(({ scenarioId }) => scenarioId));
  const session = await browserGame.open({
    scenarioId: 'campaign-new-mexico-01',
    mode: 'free',
    randomSeed: 1,
  });
  const unitBefore = session.observe().units.find(({ id }) => id === 'gunslinger-1');
  assert.ok(unitBefore, 'Cow Gulch starts with the real active Gunslinger');
  assert.equal(session.submitIntent({ type: 'select-at', x: 8.5, y: 8 }), true);
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.units.find(({ id }) => id === unitBefore.id)?.selected, true);
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 8.5, targetY: 13.5 }), true);

  for (let frame = 0; frame < 30; frame += 1) view = session.advance({ deltaMs: 100 });

  const unit = view.units.find(({ id }) => id === unitBefore.id);
  assert.ok(unit, 'the real Cow Gulch Gunslinger remains in the live game session');
  const wallTop = 12 * FINE_UNITS_PER_CELL;
  const collisionBottom = unit.positionFine.y + UNIT_COLLIDER_START_Y + UNIT_COLLIDER_HEIGHT;
  assert.ok(collisionBottom <= wallTop,
    'the actual Cow Gulch collision box stops before the raw 36 south cliff wall');
  assert.ok((wallTop - collisionBottom) < 2_000,
    'the real unit approaches the wall rather than stopping on an unrelated obstacle');
  session.close();
});

test('keeps player collision outside raw 36 canyon-wall cells in every official map', async () => {
  const completedScenarioIds = officialCampaignStages.map(({ scenarioId }) => scenarioId);
  const browserGame = createBrowserGame(completedScenarioIds);
  const finePerCell = FINE_UNITS_PER_CELL;
  const collider = { x: -2_534, y: UNIT_COLLIDER_START_Y, width: 5_068, height: UNIT_COLLIDER_HEIGHT };

  for (const stage of officialCampaignStages) {
    const sourceSession = await browserGame.open({ scenarioId: stage.scenarioId, mode: 'free', randomSeed: 1 });
    const sourceMap = sourceSession.observe().map;
    const grid = sourceMap.originalTileGrid;
    assert.ok(grid, `level ${stage.globalLevel} exposes its original TDM grid`);

    let edge: { wall: { x: number; y: number }; start: { x: number; y: number }; dx: number; dy: number } | undefined;
    for (let y = 0; y < grid.length && !edge; y += 1) {
      for (let x = 0; x < (grid[y]?.length ?? 0) && !edge; x += 1) {
        if (grid[y]?.[x] !== 36) continue;
        for (const { dx, dy } of [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }]) {
          const start = { x: x - dx, y: y - dy };
          const tile = grid[start.y]?.[start.x];
          if ((tile === 0 || tile === 16) && start.x >= 0 && start.y >= 0) {
            edge = { wall: { x, y }, start, dx, dy };
            break;
          }
        }
      }
    }
    sourceSession.close();
    assert.ok(edge, `level ${stage.globalLevel} has a raw 36 wall adjacent to an open ground or road cell`);

    const scenarioId = `raw-36-wall-collision-${stage.globalLevel}`;
    const scenario: ScenarioContent = {
      id: scenarioId,
      title: { en: 'TDM wall collision check', zh: 'TDM 墙面碰撞检查' },
      map: { ...sourceMap, decorations: [] },
      originalTileGrid: grid,
      units: [createActiveGunslinger(edge.start)],
    };
    const session = await createGame({ scenarios: { [scenarioId]: scenario } })
      .open({ scenarioId, mode: 'debug', randomSeed: 1 });
    assert.equal(session.submitIntent({ type: 'select-at', x: edge.start.x + 0.5, y: edge.start.y + 0.25 }), true);
    let view = session.advance({ deltaMs: 0 });
    assert.equal(view.units[0]?.selected, true, `level ${stage.globalLevel} fixture selects the test unit`);
    const startPosition = view.units[0]!.positionFine;
    assert.equal(session.submitIntent({
      type: 'move-unit',
      targetX: edge.dx !== 0 ? edge.wall.x + 0.5 : startPosition.x / finePerCell,
      targetY: edge.dy !== 0 ? edge.wall.y + 0.5 : startPosition.y / finePerCell,
    }), true);
    for (let frame = 0; frame < 30; frame += 1) view = session.advance({ deltaMs: 100 });

    const unit = view.units[0]!;
    const collision = {
      left: unit.positionFine.x + collider.x,
      top: unit.positionFine.y + collider.y,
      right: unit.positionFine.x + collider.x + collider.width,
      bottom: unit.positionFine.y + collider.y + collider.height,
    };
    const wall = edge.wall;
    const isBeyondWall = edge.dx === 1 ? collision.right > wall.x * finePerCell
      : edge.dx === -1 ? collision.left < (wall.x + 1) * finePerCell
        : edge.dy === 1 ? collision.bottom > wall.y * finePerCell
          : collision.top < (wall.y + 1) * finePerCell;
    const gapToWall = edge.dx === 1 ? (wall.x * finePerCell) - collision.right
      : edge.dx === -1 ? collision.left - ((wall.x + 1) * finePerCell)
        : edge.dy === 1 ? (wall.y * finePerCell) - collision.bottom
          : collision.top - ((wall.y + 1) * finePerCell);
    assert.equal(isBeyondWall, false,
      `level ${stage.globalLevel} collision box stays outside wall (${wall.x},${wall.y})`);
    assert.ok(gapToWall < 2_000,
      `level ${stage.globalLevel} approaches the wall boundary instead of stopping on an unrelated tile`);
    assert.equal(unit.render.y + unit.render.height, unit.positionFine.y / finePerCell,
      `level ${stage.globalLevel} keeps the visible foot on the collision anchor`);
    session.close();
  }
});
