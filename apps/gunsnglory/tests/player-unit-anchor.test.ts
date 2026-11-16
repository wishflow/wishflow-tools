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
