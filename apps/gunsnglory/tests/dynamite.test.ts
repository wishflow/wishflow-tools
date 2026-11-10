import assert from 'node:assert/strict';
import test from 'node:test';
import { createDynamiteScenarioDefinition, isDynamiteUnlocked } from '../src/content/dynamite';
import {
  DYNAMITE_RADIUS_FINE,
  dynamiteDamageForEnemy,
  isInsideDynamiteRadius,
  pairDynamiteObjects,
} from '../src/game/dynamite';

test('pairs the audited Cactusville trigger and box by TDM code', () => {
  const grid = Array.from({ length: 9 }, () => Array<number>(15).fill(0));
  grid[6]![14] = 102;
  grid[8]![14] = 110;

  assert.deepEqual(pairDynamiteObjects(grid, true), {
    unlocked: true,
    pairs: [{ id: 'dynamite-1', triggerCell: { x: 14, y: 6 }, boxCell: { x: 14, y: 8 } }],
  });
});

test('pairs each trigger with its nearest unused box and rejects unmatched objects', () => {
  const grid = [
    [102, 0, 110, 0, 0, 102, 0, 0, 110],
  ];
  assert.deepEqual(pairDynamiteObjects(grid, false).pairs, [
    { id: 'dynamite-1', triggerCell: { x: 0, y: 0 }, boxCell: { x: 2, y: 0 } },
    { id: 'dynamite-2', triggerCell: { x: 5, y: 0 }, boxCell: { x: 8, y: 0 } },
  ]);
  assert.throws(() => pairDynamiteObjects([[102, 0, 0]], true), /count mismatch/);
});

test('dynamite unlock follows global level 21 or completed level 30', () => {
  assert.equal(isDynamiteUnlocked([]), false);
  assert.equal(isDynamiteUnlocked(['campaign-mississippi-10']), true);
  assert.equal(isDynamiteUnlocked(['campaign-oregon-10']), true);
  assert.equal(createDynamiteScenarioDefinition([[102, 110]], []).unlocked, false);
});

test('dynamite applies heavy penetration, ignores tow type 8, and uses a strict fine-unit radius', () => {
  assert.equal(dynamiteDamageForEnemy(1, 25), 1_250);
  assert.equal(dynamiteDamageForEnemy(4, 66), 3_300);
  assert.equal(dynamiteDamageForEnemy(1, 33), 1_650);
  assert.equal(dynamiteDamageForEnemy(8, 100), 0);
  assert.equal(isInsideDynamiteRadius({ x: 0, y: 0 }, { x: DYNAMITE_RADIUS_FINE - 1, y: 0 }), true);
  assert.equal(isInsideDynamiteRadius({ x: 0, y: 0 }, { x: DYNAMITE_RADIUS_FINE, y: 0 }), false);
  assert.equal(isInsideDynamiteRadius({ x: 0, y: 0 }, { x: DYNAMITE_RADIUS_FINE + 1, y: 0 }), false);
});
