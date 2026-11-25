import assert from 'node:assert/strict';
import test from 'node:test';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createBrowserGame } from '../src/bootstrap/browser';
import type { GameView } from '../src/game';

interface SteamerMovementCase {
  level: number;
  scenarioId: string;
  groupId: string;
  partCount: number;
}

const untestedSteamerGroups: readonly SteamerMovementCase[] = [
  { level: 13, scenarioId: 'campaign-mississippi-13', groupId: 'mississippi-13-steamer-2-11', partCount: 6 },
  { level: 13, scenarioId: 'campaign-mississippi-13', groupId: 'mississippi-13-steamer-20-12', partCount: 6 },
  { level: 15, scenarioId: 'campaign-mississippi-15', groupId: 'mississippi-15-steamer-19-22', partCount: 6 },
  { level: 16, scenarioId: 'campaign-mississippi-16', groupId: 'mississippi-16-steamer-9-22', partCount: 7 },
  { level: 20, scenarioId: 'campaign-mississippi-20', groupId: 'mississippi-20-steamer-12-3', partCount: 6 },
  { level: 26, scenarioId: 'campaign-oregon-06', groupId: 'oregon-06-steamer-2-11', partCount: 4 },
  { level: 29, scenarioId: 'campaign-oregon-09', groupId: 'oregon-09-steamer-24-2', partCount: 4 },
  { level: 40, scenarioId: 'campaign-dakota-10', groupId: 'dakota-10-steamer-14-20', partCount: 5 },
];

const completedScenarioIds = officialCampaignStages.map(({ scenarioId }) => scenarioId);
const game = createBrowserGame(completedScenarioIds);

function groupUnits(view: GameView, groupId: string): GameView['units'] {
  return view.units.filter(({ movementGroupId }) => movementGroupId === groupId);
}

async function tryMoveSteamer(caseDefinition: SteamerMovementCase, direction: -1 | 1): Promise<boolean> {
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
    assert.ok(initialGroup.every(({ type }) => type.startsWith('steamer-')),
      `${caseDefinition.groupId} contains only steamer components`);
    assert.ok(initialGroup.every(({ movementAxis }) => movementAxis === 'horizontal'),
      `${caseDefinition.groupId} follows its horizontal TDM water lane`);
    assert.ok(initialGroup.every(({ movementSurface }) => movementSurface === 'water'),
      `${caseDefinition.groupId} requires water terrain`);

    const selectable = initialGroup.find(({ activity }) => activity === 5);
    assert.ok(selectable, `${caseDefinition.groupId} has a selectable steamer component`);
    assert.equal(session.submitIntent({
      type: 'select-at',
      x: selectable.cell.x + 0.5,
      y: selectable.cell.y + 0.5,
    }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.observe().units.find(({ id }) => id === selectable.id)?.selected, true,
      `${selectable.id} can be selected in the formal map`);

    const targetX = selectable.positionFine.x / 7_680 + direction * 3;
    assert.equal(session.submitIntent({ type: 'move-unit', targetX, targetY: selectable.cell.y + 0.5 }), true);

    let view = session.observe();
    for (let frame = 0; frame < 5; frame += 1) view = session.advance({ deltaMs: 100 });

    const movedGroup = groupUnits(view, caseDefinition.groupId);
    const movedById = new Map(movedGroup.map((unit) => [unit.id, unit]));
    const anchor = initialGroup[0]!;
    const movedAnchor = movedById.get(anchor.id)!;
    const deltaX = movedAnchor.positionFine.x - anchor.positionFine.x;
    if (deltaX === 0) return false;

    assert.equal(movedGroup.length, caseDefinition.partCount);
    assert.equal(movedAnchor.positionFine.y - anchor.positionFine.y, 0,
      `${caseDefinition.groupId} stays on its original water lane`);
    assert.ok(deltaX * direction > 0,
      `${caseDefinition.groupId} moves in the requested direction`);

    for (const before of initialGroup) {
      const after = movedById.get(before.id);
      assert.ok(after, `${before.id} remains in the steamer group`);
      assert.deepEqual({
        x: after.positionFine.x - before.positionFine.x,
        y: after.positionFine.y - before.positionFine.y,
      }, { x: deltaX, y: 0 }, `${before.id} shares the group's horizontal movement delta`);
      assert.equal(after.positionFine.x - movedAnchor.positionFine.x,
        before.positionFine.x - anchor.positionFine.x,
        `${before.id} retains its original spacing`);
    }

    for (const otherGroupId of new Set(initialView.units
      .map(({ movementGroupId, type }) => movementGroupId && type.startsWith('steamer-') ? movementGroupId : undefined)
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

for (const caseDefinition of untestedSteamerGroups) {
  test(`formal Level ${caseDefinition.level} steamer group ${caseDefinition.groupId} moves rigidly`, async () => {
    const moved = await tryMoveSteamer(caseDefinition, 1)
      || await tryMoveSteamer(caseDefinition, -1);
    assert.equal(moved, true,
      `${caseDefinition.groupId} must move from at least one unblocked end of its official water lane`);
  });
}
