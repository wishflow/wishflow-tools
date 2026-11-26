import assert from 'node:assert/strict';
import test from 'node:test';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createBrowserGame } from '../src/bootstrap/browser';
import type { GameView } from '../src/game';

interface TrainMovementCase {
  level: number;
  scenarioId: string;
  groupId: string;
  partCount: number;
  axis: 'horizontal' | 'vertical';
}

const untestedTrainGroups: readonly TrainMovementCase[] = [
  { level: 8, scenarioId: 'campaign-new-mexico-08', groupId: 'cactusville-train', partCount: 5, axis: 'vertical' },
  { level: 9, scenarioId: 'campaign-new-mexico-09', groupId: 'railroad-ranch-horizontal-train-1', partCount: 4, axis: 'horizontal' },
  { level: 9, scenarioId: 'campaign-new-mexico-09', groupId: 'railroad-ranch-horizontal-train-2', partCount: 5, axis: 'horizontal' },
  { level: 9, scenarioId: 'campaign-new-mexico-09', groupId: 'railroad-ranch-horizontal-train-3', partCount: 4, axis: 'horizontal' },
  { level: 9, scenarioId: 'campaign-new-mexico-09', groupId: 'railroad-ranch-vertical-train-1', partCount: 4, axis: 'vertical' },
  { level: 9, scenarioId: 'campaign-new-mexico-09', groupId: 'railroad-ranch-vertical-train-2', partCount: 4, axis: 'vertical' },
  { level: 9, scenarioId: 'campaign-new-mexico-09', groupId: 'railroad-ranch-vertical-train-3', partCount: 4, axis: 'vertical' },
  { level: 10, scenarioId: 'campaign-new-mexico-10', groupId: 'lost-city-horizontal-train-1', partCount: 5, axis: 'horizontal' },
  { level: 10, scenarioId: 'campaign-new-mexico-10', groupId: 'lost-city-horizontal-train-2', partCount: 5, axis: 'horizontal' },
  { level: 15, scenarioId: 'campaign-mississippi-15', groupId: 'mississippi-15-horizontal-train-1', partCount: 3, axis: 'horizontal' },
  { level: 15, scenarioId: 'campaign-mississippi-15', groupId: 'mississippi-15-horizontal-train-2', partCount: 6, axis: 'horizontal' },
  { level: 15, scenarioId: 'campaign-mississippi-15', groupId: 'mississippi-15-vertical-train-1', partCount: 6, axis: 'vertical' },
  { level: 22, scenarioId: 'campaign-oregon-02', groupId: 'oregon-02-train', partCount: 3, axis: 'vertical' },
  { level: 23, scenarioId: 'campaign-oregon-03', groupId: 'oregon-03-train', partCount: 5, axis: 'vertical' },
  { level: 27, scenarioId: 'campaign-oregon-07', groupId: 'oregon-07-train-2', partCount: 5, axis: 'horizontal' },
  { level: 28, scenarioId: 'campaign-oregon-08', groupId: 'oregon-08-train-1', partCount: 4, axis: 'horizontal' },
  { level: 30, scenarioId: 'campaign-oregon-10', groupId: 'oregon-10-train-1', partCount: 5, axis: 'horizontal' },
  { level: 32, scenarioId: 'campaign-dakota-02', groupId: 'dakota-02-train-1', partCount: 6, axis: 'horizontal' },
  { level: 34, scenarioId: 'campaign-dakota-04', groupId: 'dakota-04-train-1', partCount: 4, axis: 'vertical' },
  { level: 37, scenarioId: 'campaign-dakota-07', groupId: 'dakota-07-train-2', partCount: 5, axis: 'horizontal' },
  { level: 37, scenarioId: 'campaign-dakota-07', groupId: 'dakota-07-train-3', partCount: 5, axis: 'horizontal' },
  { level: 37, scenarioId: 'campaign-dakota-07', groupId: 'dakota-07-train-4', partCount: 5, axis: 'horizontal' },
];

const completedScenarioIds = officialCampaignStages.map(({ scenarioId }) => scenarioId);
const game = createBrowserGame(completedScenarioIds);

function groupUnits(view: GameView, groupId: string): GameView['units'] {
  return view.units.filter(({ movementGroupId }) => movementGroupId === groupId);
}

async function tryMoveTrain(caseDefinition: TrainMovementCase, direction: -1 | 1): Promise<boolean> {
  const session = await game.open({
    scenarioId: caseDefinition.scenarioId,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: caseDefinition.level,
  });

  try {
    const initialView = session.observe();
    const initialGroup = groupUnits(initialView, caseDefinition.groupId);
    assert.equal(initialGroup.length, caseDefinition.partCount,
      `Level ${caseDefinition.level} ${caseDefinition.groupId} has the inventoried part count`);
    assert.ok(initialGroup.every(({ type }) => type.startsWith('train-')),
      `${caseDefinition.groupId} contains only train components`);
    assert.ok(initialGroup.every(({ movementAxis }) => movementAxis === caseDefinition.axis),
      `${caseDefinition.groupId} uses the TDM railway axis`);

    const selectable = initialGroup.find(({ activity }) => activity === 5) ?? initialGroup[0];
    assert.ok(selectable, `${caseDefinition.groupId} has a selectable locomotive`);
    assert.equal(session.submitIntent({
      type: 'select-at',
      x: selectable.cell.x + 0.5,
      y: selectable.cell.y + 0.5,
    }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.observe().units.find(({ id }) => id === selectable.id)?.selected, true,
      `${selectable.id} can be selected in the formal map`);

    const axis = caseDefinition.axis;
    const targetX = selectable.positionFine.x / 7_680 + (axis === 'horizontal' ? direction * 3 : 0);
    const targetY = selectable.positionFine.y / 7_680 + (axis === 'vertical' ? direction * 3 : 0);
    assert.equal(session.submitIntent({ type: 'move-unit', targetX, targetY }), true);

    let view = session.observe();
    for (let frame = 0; frame < 5; frame += 1) view = session.advance({ deltaMs: 100 });

    const movedGroup = groupUnits(view, caseDefinition.groupId);
    const initialById = new Map(initialGroup.map((unit) => [unit.id, unit]));
    const movedById = new Map(movedGroup.map((unit) => [unit.id, unit]));
    const anchor = initialGroup[0]!;
    const movedAnchor = movedById.get(anchor.id)!;
    const delta = {
      x: movedAnchor.positionFine.x - anchor.positionFine.x,
      y: movedAnchor.positionFine.y - anchor.positionFine.y,
    };
    if (delta.x === 0 && delta.y === 0) return false;

    assert.equal(movedGroup.length, caseDefinition.partCount);
    assert.equal(axis === 'horizontal' ? delta.y : delta.x, 0,
      `${caseDefinition.groupId} only moves along its source axis`);
    assert.ok((axis === 'horizontal' ? delta.x : delta.y) * direction > 0,
      `${caseDefinition.groupId} moves in the requested direction`);

    for (const before of initialGroup) {
      const after = movedById.get(before.id);
      assert.ok(after, `${before.id} remains in the train group`);
      assert.deepEqual({
        x: after.positionFine.x - before.positionFine.x,
        y: after.positionFine.y - before.positionFine.y,
      }, delta, `${before.id} shares the group's movement delta`);
      assert.deepEqual({
        x: after.positionFine.x - movedAnchor.positionFine.x,
        y: after.positionFine.y - movedAnchor.positionFine.y,
      }, {
        x: before.positionFine.x - anchor.positionFine.x,
        y: before.positionFine.y - anchor.positionFine.y,
      }, `${before.id} retains its original spacing`);
    }

    for (const otherGroupId of new Set(initialView.units
      .map(({ movementGroupId }) => movementGroupId)
      .filter((groupId): groupId is string => Boolean(groupId && groupId !== caseDefinition.groupId)))) {
      const before = groupUnits(initialView, otherGroupId);
      const after = groupUnits(view, otherGroupId);
      assert.deepEqual(after.map(({ id, positionFine }) => ({ id, positionFine })),
        before.map(({ id, positionFine }) => ({ id, positionFine })),
        `${otherGroupId} remains stationary while ${caseDefinition.groupId} moves`);
    }

    return true;
  } finally {
    session.close();
  }
}

for (const caseDefinition of untestedTrainGroups) {
  test(`formal Level ${caseDefinition.level} train group ${caseDefinition.groupId} moves rigidly`, async () => {
    const moved = await tryMoveTrain(caseDefinition, 1)
      || await tryMoveTrain(caseDefinition, -1);
    assert.equal(moved, true,
      `${caseDefinition.groupId} must move from at least one unblocked end of its official track`);
  });
}
