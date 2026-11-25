import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame } from '../src/bootstrap/browser';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createPlayerMapCollisionBoxes } from '../src/game/player-collision-geometry';
import type { GameView, UnitView } from '../src/game';

const FINE_PER_CELL = 7_680;

type EndpointCase = {
  level: number;
  groupId: string;
  side: 'low' | 'high';
  expected: { tdmCode: number } | { backgroundCode: number } | { mapEdge: true };
};

const cases: readonly EndpointCase[] = [
  { level: 7, groupId: 'lucky-lake-train', side: 'low', expected: { tdmCode: 94 } },
  { level: 7, groupId: 'lucky-lake-train', side: 'high', expected: { tdmCode: 95 } },
  { level: 14, groupId: 'mississippi-14-steamer-2-13', side: 'high', expected: { backgroundCode: 119 } },
  { level: 14, groupId: 'mississippi-14-steamer-22-14', side: 'low', expected: { backgroundCode: 127 } },
  { level: 16, groupId: 'mississippi-16-steamer-9-22', side: 'high', expected: { backgroundCode: 109 } },
  { level: 16, groupId: 'mississippi-16-steamer-9-22', side: 'low', expected: { backgroundCode: 110 } },
  { level: 29, groupId: 'oregon-09-steamer-24-2', side: 'low', expected: { backgroundCode: 107 } },
  { level: 35, groupId: 'dakota-05-steamer-3-11', side: 'low', expected: { mapEdge: true } },
  { level: 35, groupId: 'dakota-05-steamer-3-11', side: 'high', expected: { mapEdge: true } },
];

function getGroup(view: GameView, groupId: string): UnitView[] {
  return view.units.filter(({ movementGroupId }) => movementGroupId === groupId);
}

function findExpectedSourceCell(
  view: GameView,
  group: readonly UnitView[],
  side: 'low' | 'high',
  expected: EndpointCase['expected'],
): { x: number; y: number } {
  const first = group[0]!;
  const horizontal = first.movementAxis === 'horizontal';
  const positions = group.map(({ cell }) => horizontal ? cell.x : cell.y).sort((left, right) => left - right);
  const lane = horizontal ? first.cell.y : first.cell.x;
  const step = side === 'low' ? -1 : 1;
  const end = horizontal ? view.map.width : view.map.height;
  let position = side === 'low' ? positions[0]! - 1 : positions.at(-1)! + 1;

  while (position >= 0 && position < end) {
    const x = horizontal ? position : lane;
    const y = horizontal ? lane : position;
    const raw = view.map.originalTileGrid?.[y]?.[x];
    if ('tdmCode' in expected && raw === expected.tdmCode) return { x, y };
    if ('backgroundCode' in expected
      && view.map.backgroundCollisionCodes?.[y]?.[x] === expected.backgroundCode) return { x, y };
    position += step;
  }

  assert.ok('mapEdge' in expected, `${first.movementGroupId} finds its expected TDM/background endpoint source`);
  return horizontal
    ? { x: side === 'low' ? -1 : view.map.width, y: lane }
    : { x: lane, y: side === 'low' ? -1 : view.map.height };
}

function groupPosition(view: GameView, groupId: string): readonly { id: string; x: number; y: number }[] {
  return getGroup(view, groupId).map(({ id, positionFine }) => ({ id, x: positionFine.x, y: positionFine.y }));
}

function rectangleForUnit(unit: UnitView) {
  const box = unit.collisionBoxFine;
  assert.ok(box, `${unit.id} has the APK-derived group collision box`);
  return {
    x: unit.positionFine.x + box.x,
    y: unit.positionFine.y + box.y,
    width: box.width,
    height: box.height,
  };
}

function rectanglesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): boolean {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

function assertWaterHullOutsideBlockedCodes(view: GameView, group: readonly UnitView[]): void {
  const blocked = (code: number | undefined): boolean => code === undefined
    || (code >= 12 && code <= 14)
    || (code >= 16 && code <= 23)
    || (code >= 48 && code <= 75)
    || (code >= 97 && code < 128)
    || (code >= 160 && code < 164);
  const codes = view.map.backgroundCollisionCodes;
  assert.ok(codes, `${view.scenarioId} exposes the APK-derived water collision grid`);

  for (const unit of group) {
    const box = rectangleForUnit(unit);
    const corners = [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x, y: box.y + box.height },
      { x: box.x + box.width, y: box.y + box.height },
    ];
    for (const corner of corners) {
      const cellX = Math.floor(corner.x / FINE_PER_CELL);
      const cellY = Math.floor(corner.y / FINE_PER_CELL);
      if (cellX < 0 || cellY < 0 || cellX >= view.map.width || cellY >= view.map.height) continue;
      assert.equal(blocked(codes[cellY]?.[cellX]), false,
        `${unit.id} hull corner (${cellX},${cellY}) stays out of blocking water code`);
    }
  }
}

async function verifyEndpoint(caseDefinition: EndpointCase): Promise<void> {
  const stage = officialCampaignStages.find(({ globalLevel }) => globalLevel === caseDefinition.level);
  assert.ok(stage, `Level ${caseDefinition.level} is registered`);
  const completedIds = officialCampaignStages.map(({ scenarioId }) => scenarioId);
  const session = await createBrowserGame(completedIds).open({
    scenarioId: stage.scenarioId,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: caseDefinition.level,
  });

  try {
    const initialView = session.observe();
    const initialGroup = getGroup(initialView, caseDefinition.groupId);
    assert.ok(initialGroup.length > 1, `${caseDefinition.groupId} is a formal multi-part group`);
    const horizontal = initialGroup[0]!.movementAxis === 'horizontal';
    assert.ok(horizontal || initialGroup[0]!.movementAxis === 'vertical');
    const sourceCell = findExpectedSourceCell(initialView, initialGroup, caseDefinition.side, caseDefinition.expected);
    const selectable = initialGroup.find(({ activity }) => activity === 5);
    assert.ok(selectable, `${caseDefinition.groupId} has a selectable original component`);

    assert.equal(session.submitIntent({
      type: 'select-at',
      x: selectable.cell.x + 0.5,
      y: selectable.cell.y + 0.5,
    }), true);
    let view = session.advance({ deltaMs: 0 });
    assert.ok(getGroup(view, caseDefinition.groupId).some(({ selected }) => selected),
      `${caseDefinition.groupId} accepts original map selection`);

    const extremeTarget = caseDefinition.side === 'low' ? -0.5 : (horizontal ? view.map.width : view.map.height) + 0.5;
    assert.equal(session.submitIntent({
      type: 'move-unit',
      targetX: horizontal ? extremeTarget : selectable.positionFine.x / FINE_PER_CELL,
      targetY: horizontal ? selectable.positionFine.y / FINE_PER_CELL : extremeTarget,
    }), true);
    view = session.advance({ deltaMs: 0 });
    for (let frame = 0; frame < 400 && getGroup(view, caseDefinition.groupId).some(({ moving }) => moving); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }

    const stoppedGroup = getGroup(view, caseDefinition.groupId);
    assert.equal(stoppedGroup.length, initialGroup.length);
    assert.ok(stoppedGroup.every(({ moving }) => !moving), `${caseDefinition.groupId} stops as a complete group`);
    const axis = horizontal ? 'x' : 'y';
    const initialById = new Map(initialGroup.map((unit) => [unit.id, unit] as const));
    const anchorBefore = initialById.get(stoppedGroup[0]!.id)!;
    const anchorAfter = stoppedGroup[0]!;
    const movementDelta = anchorAfter.positionFine[axis] - anchorBefore.positionFine[axis];
    assert.ok(movementDelta !== 0, `${caseDefinition.groupId} reaches and hits its endpoint source`);
    assert.ok(movementDelta * (caseDefinition.side === 'low' ? -1 : 1) > 0,
      `${caseDefinition.groupId} approaches the selected ${caseDefinition.side} endpoint`);
    const minimumGap = 'mapEdge' in caseDefinition.expected ? 0.5 : 2;
    assert.ok(Math.abs((horizontal ? anchorAfter.positionFine.x : anchorAfter.positionFine.y)
      - extremeTarget * FINE_PER_CELL) > minimumGap * FINE_PER_CELL,
    `${caseDefinition.groupId} stops before the out-of-map movement target`);

    for (const unit of stoppedGroup) {
      const before = initialById.get(unit.id)!;
      assert.deepEqual({
        x: unit.positionFine.x - before.positionFine.x,
        y: unit.positionFine.y - before.positionFine.y,
      }, horizontal ? { x: movementDelta, y: 0 } : { x: 0, y: movementDelta },
      `${unit.id} shares the full-group movement delta`);
      assert.equal(unit.positionFine[axis] - anchorAfter.positionFine[axis],
        before.positionFine[axis] - anchorBefore.positionFine[axis],
      `${unit.id} retains its original spacing`);
    }

    if ('tdmCode' in caseDefinition.expected) {
      const expectedTdmCode = caseDefinition.expected.tdmCode;
      const obstacle = createPlayerMapCollisionBoxes(
        view.map.originalTileGrid,
        view.map.decorations,
        undefined,
      ).find(({ sourceTdmCode, sourceCell: candidateCell }) => (
        sourceTdmCode === expectedTdmCode
          && candidateCell?.x === sourceCell.x
          && candidateCell?.y === sourceCell.y
      ));
      assert.ok(obstacle, `TDM ${expectedTdmCode} has an APK-derived collision box`);
      for (const unit of stoppedGroup) {
        assert.equal(rectanglesOverlap(rectangleForUnit(unit), obstacle), false,
          `${unit.id} remains outside the TDM ${expectedTdmCode} collision box`);
      }
    } else if ('backgroundCode' in caseDefinition.expected) {
      assertWaterHullOutsideBlockedCodes(view, stoppedGroup);
      assert.equal(view.map.backgroundCollisionCodes?.[sourceCell.y]?.[sourceCell.x], caseDefinition.expected.backgroundCode,
        `${caseDefinition.groupId} stops at the audited water-bank code`);
    } else {
      const finePerCell = FINE_PER_CELL;
      assert.ok(stoppedGroup.every(({ positionFine }) => (
        positionFine[axis] >= -finePerCell
          && positionFine[axis] <= (horizontal ? view.map.width : view.map.height) * finePerCell + finePerCell
      )), `${caseDefinition.groupId} stays within one cell of the original map edge`);
    }

    const stablePositions = groupPosition(view, caseDefinition.groupId);
    view = session.advance({ deltaMs: 100 });
    assert.deepEqual(groupPosition(view, caseDefinition.groupId), stablePositions,
      `${caseDefinition.groupId} remains stopped while its target is beyond the blocking endpoint`);

    const reverseTarget = caseDefinition.side === 'low'
      ? (horizontal ? view.map.width : view.map.height) + 0.5
      : -0.5;
    assert.equal(session.submitIntent({
      type: 'move-unit',
      targetX: horizontal ? reverseTarget : selectable.positionFine.x / FINE_PER_CELL,
      targetY: horizontal ? selectable.positionFine.y / FINE_PER_CELL : reverseTarget,
    }), true);
    const beforeReverse = groupPosition(view, caseDefinition.groupId);
    view = session.advance({ deltaMs: 0 });
    for (let frame = 0; frame < 5; frame += 1) view = session.advance({ deltaMs: 100 });
    const afterReverse = groupPosition(view, caseDefinition.groupId);
    const beforeReverseById = new Map(beforeReverse.map((unit) => [unit.id, unit] as const));
    const reverseAnchorBefore = beforeReverseById.get(afterReverse[0]!.id)!;
    const reverseDelta = afterReverse[0]![axis] - reverseAnchorBefore[axis];
    assert.ok(reverseDelta * (caseDefinition.side === 'low' ? 1 : -1) > 0,
      `${caseDefinition.groupId} can leave the endpoint after a fresh reverse command`);
    for (const unit of afterReverse) {
      const before = beforeReverseById.get(unit.id)!;
      assert.deepEqual({ x: unit.x - before.x, y: unit.y - before.y },
        horizontal ? { x: reverseDelta, y: 0 } : { x: 0, y: reverseDelta },
        `${unit.id} follows the complete-group reverse command`);
      assert.equal(unit[axis] - afterReverse[0]![axis], before[axis] - reverseAnchorBefore[axis],
        `${unit.id} preserves consist spacing while reversing`);
    }
  } finally {
    session.close();
  }
}

for (const caseDefinition of cases) {
  test(`formal Level ${caseDefinition.level} transport group ${caseDefinition.groupId} verifies ${caseDefinition.side} endpoint behavior`, async () => {
    await verifyEndpoint(caseDefinition);
  });
}
