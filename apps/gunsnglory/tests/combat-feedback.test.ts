import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeEnemyDefeats } from '../src/ui/combat-feedback';
import type { GameEvent } from '../src/game';

const defeat = (enemyId: string, cashReward: number): GameEvent => ({
  type: 'enemy-defeated',
  enemyId,
  cashReward,
});

test('keeps a defeated wagon identity and its single reward', () => {
  assert.deepEqual(summarizeEnemyDefeats([defeat('wagon-1', 10)], [{ id: 'wagon-1', type: 4 }]), [
    { enemyType: 4, count: 1, cashReward: 10 },
  ]);
});

test('groups same-frame defeats by enemy type without losing reward totals', () => {
  assert.deepEqual(summarizeEnemyDefeats(
    [defeat('pioneer-1', 1), defeat('pioneer-2', 1), defeat('wagon-1', 10)],
    [{ id: 'pioneer-1', type: 1 }, { id: 'pioneer-2', type: 2 }, { id: 'wagon-1', type: 4 }],
  ), [
    { enemyType: 1, count: 1, cashReward: 1 },
    { enemyType: 2, count: 1, cashReward: 1 },
    { enemyType: 4, count: 1, cashReward: 10 },
  ]);
});

test('keeps vehicle and following passenger defeat events as separate visible entries', () => {
  assert.deepEqual(summarizeEnemyDefeats(
    [defeat('transport-1', 10), defeat('passenger-1', 1), defeat('passenger-2', 1)],
    [
      { id: 'transport-1', type: 4 },
      { id: 'passenger-1', type: 1 },
      { id: 'passenger-2', type: 2 },
    ],
  ), [
    { enemyType: 4, count: 1, cashReward: 10 },
    { enemyType: 1, count: 1, cashReward: 1 },
    { enemyType: 2, count: 1, cashReward: 1 },
  ]);
});

test('does not discard a defeat reward if the enemy view has already been removed', () => {
  assert.deepEqual(summarizeEnemyDefeats([defeat('gone', 3)], []), [
    { enemyType: undefined, count: 1, cashReward: 3 },
  ]);
});

test('uses the defeat event identity after the enemy view has been removed', () => {
  assert.deepEqual(summarizeEnemyDefeats([{
    type: 'enemy-defeated',
    enemyId: 'gone-pioneer',
    enemyType: 1,
    cashReward: 3,
  }], []), [
    { enemyType: 1, count: 1, cashReward: 3 },
  ]);
});
