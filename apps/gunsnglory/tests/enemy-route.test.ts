import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alignFinePositionAtRedirect,
  advanceFinePosition,
  directionForMovementVector,
  sameGroupPredecessorMovementVector,
} from '../src/game/enemy-route';

const fineUnitsPerCell = 7680;

test('same-group route movement retains the raw x/y cell delta', () => {
  const enemies = [
    { groupId: 'wagon', positionFine: { x: (13 * fineUnitsPerCell) + 100, y: (4 * fineUnitsPerCell) + 200 } },
    { groupId: 'wagon', positionFine: { x: (9 * fineUnitsPerCell) + 100, y: (3 * fineUnitsPerCell) + 200 } },
  ];

  assert.deepEqual(sameGroupPredecessorMovementVector(enemies, 1, fineUnitsPerCell), { x: 4, y: 1 });
});

test('same-group route movement ignores an unrelated preceding enemy', () => {
  const enemies = [
    { groupId: 'other-group', positionFine: { x: 50_000, y: 20_000 } },
    { groupId: 'wagon', positionFine: { x: 40_000, y: 10_000 } },
  ];

  assert.equal(sameGroupPredecessorMovementVector(enemies, 1, fineUnitsPerCell), undefined);
  assert.equal(sameGroupPredecessorMovementVector(enemies, 0, fineUnitsPerCell), undefined);
});

test('movement uses both raw vector components without normalizing their magnitude', () => {
  assert.deepEqual(advanceFinePosition(
    { x: 10_000, y: 20_000 },
    { x: 4, y: 1 },
    500,
    100,
  ), { x: 12_000, y: 20_500 });
});

test('enemy sprite facing follows the APK dominant-axis animation rule', () => {
  assert.equal(directionForMovementVector({ x: 4, y: 1 }, 'north'), 'east');
  assert.equal(directionForMovementVector({ x: -1, y: 4 }, 'east'), 'south');
  assert.equal(directionForMovementVector({ x: 1, y: 1 }, 'north'), 'south');
  assert.equal(directionForMovementVector({ x: 0, y: 0 }, 'west'), 'west');
});

test('route alignment applies APK x then y component alignment in order', () => {
  const positionFine = { x: (9 * fineUnitsPerCell) + 100, y: (3 * fineUnitsPerCell) + 200 };
  const centerX = (9 * fineUnitsPerCell) + (fineUnitsPerCell / 2);
  const centerY = (3 * fineUnitsPerCell) + (fineUnitsPerCell / 2);

  assert.deepEqual(alignFinePositionAtRedirect(positionFine, { x: 4, y: 1 }, fineUnitsPerCell), {
    x: centerX,
    y: centerY + 2,
  });
  assert.deepEqual(alignFinePositionAtRedirect(positionFine, { x: 1, y: 0 }, fineUnitsPerCell), {
    x: centerX + 2,
    y: centerY,
  });
  assert.deepEqual(alignFinePositionAtRedirect(positionFine, { x: 1, y: 1 }, fineUnitsPerCell), {
    x: centerX,
    y: centerY + 2,
  });
  assert.deepEqual(alignFinePositionAtRedirect(positionFine, { x: 4, y: 0 }, fineUnitsPerCell), positionFine);
});
