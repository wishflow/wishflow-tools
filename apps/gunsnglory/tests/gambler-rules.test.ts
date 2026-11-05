import assert from 'node:assert/strict';
import test from 'node:test';
import { getGamblerStake, resolveGamblerRound, type GamblerOutcome } from '../src/game/gambler-rules';

const allUnitCards = new Set([1, 2, 3, 4, 5, 6, 35, 36] as const);

function fixedRandom(result: number) {
  const bounds: number[] = [];
  return {
    bounds,
    nextInt(bound: number) {
      bounds.push(bound);
      assert.ok(result >= 0 && result < bound, `fixed result ${result} is within nextInt(${bound})`);
      return result;
    },
  };
}

function resolveAt(result: number, options: { isFirstRandom?: boolean; unlockedUnitTypes?: ReadonlySet<1 | 2 | 3 | 4 | 5 | 6 | 35 | 36> } = {}) {
  const random = fixedRandom(result);
  const round = resolveGamblerRound({
    cash: 500,
    completedGames: 0,
    unlockedUnitTypes: options.unlockedUnitTypes ?? allUnitCards,
    isFirstRandom: options.isFirstRandom ?? false,
    random,
  });
  assert.equal(round.status, 'played');
  if (round.status !== 'played') throw new Error('Expected an eligible wager to complete');
  return { round, random };
}

test('Gambler stake starts at 50, rises by five completed games and caps at 75', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 99].map(getGamblerStake), [50, 55, 60, 65, 70, 75, 75, 75]);
});

test('weighted card boundaries map to the original unit, cash and loss outcomes', () => {
  const cases: readonly [number, GamblerOutcome['hand'], GamblerOutcome['type'], number?][] = [
    [0, 'one-pair', 'unit', 1],
    [19, 'one-pair', 'unit', 1],
    [20, 'two-pair', 'unit', 2],
    [34, 'two-pair', 'unit', 2],
    [35, 'three-of-a-kind', 'unit', 3],
    [47, 'three-of-a-kind', 'unit', 3],
    [48, 'full-house', 'unit', 4],
    [58, 'full-house', 'unit', 4],
    [59, 'four-of-a-kind', 'unit', 5],
    [62, 'four-of-a-kind', 'unit', 5],
    [63, 'flush', 'unit', 6],
    [71, 'flush', 'unit', 6],
    [72, 'royal-flush', 'unit', 35],
    [76, 'royal-flush', 'unit', 35],
    [77, 'straight', 'unit', 36],
    [80, 'straight', 'unit', 36],
    [81, 'high-card', 'cash'],
    [91, 'high-card', 'cash'],
    [92, 'lost', 'loss'],
    [99, 'lost', 'loss'],
  ];

  for (const [roll, hand, type, unitType] of cases) {
    const { round, random } = resolveAt(roll);
    assert.equal(round.outcome.hand, hand, `roll ${roll}`);
    assert.equal(round.outcome.type, type, `roll ${roll}`);
    if (round.outcome.type === 'unit') {
      assert.equal(round.outcome.unitType, unitType, `roll ${roll}`);
    }
    assert.deepEqual(random.bounds, [100], `roll ${roll} consumes one draw from the full 100-weight pool`);
  }
});

test('all 100 full-pool random slots preserve the APK card weights', () => {
  const counts = new Map<string, number>();
  for (let roll = 0; roll < 100; roll += 1) {
    const { round } = resolveAt(roll);
    const key = round.outcome.type === 'unit' ? `unit-${round.outcome.unitType}` : round.outcome.type;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.deepEqual([...counts.entries()], [
    ['unit-1', 20], ['unit-2', 15], ['unit-3', 13], ['unit-4', 11], ['unit-5', 4],
    ['unit-6', 9], ['unit-35', 5], ['unit-36', 4], ['cash', 11], ['loss', 8],
  ]);
});

test('the first shared-random draw excludes only the loss card', () => {
  const { round, random } = resolveAt(91, { isFirstRandom: true });
  assert.deepEqual(random.bounds, [92]);
  assert.deepEqual(round.outcome, { type: 'cash', hand: 'high-card', payout: 100 });
  assert.equal(round.cashAfterRound, 550);
});

test('locked unit cards are removed from the pool without shifting later card identities', () => {
  const unlocked = new Set([1, 2, 3, 4, 5, 6, 36] as const);
  const { round, random } = resolveAt(72, { unlockedUnitTypes: unlocked });
  assert.deepEqual(random.bounds, [95]);
  assert.deepEqual(round.outcome, { type: 'unit', hand: 'straight', unitType: 36 });
});

test('a unit-card prize removes only the stake from cash and records one completed game', () => {
  const { round } = resolveAt(0);
  assert.equal(round.status, 'played');
  if (round.status !== 'played') return;
  assert.equal(round.stake, 50);
  assert.equal(round.cashAfterStake, 450);
  assert.equal(round.cashAfterRound, 450);
  assert.equal(round.completedGamesAfter, 1);
});

test('a cash-card prize returns twice the stake after first deducting the stake', () => {
  const { round } = resolveAt(81);
  assert.equal(round.status, 'played');
  if (round.status !== 'played') return;
  assert.equal(round.cashAfterStake, 450);
  assert.equal(round.outcome.type, 'cash');
  assert.equal(round.cashAfterRound, 550);
});

test('a loss keeps only the already-paid stake and increments the completed-game count', () => {
  const { round } = resolveAt(92);
  assert.equal(round.status, 'played');
  if (round.status !== 'played') return;
  assert.equal(round.cashAfterStake, 450);
  assert.equal(round.cashAfterRound, 450);
  assert.equal(round.completedGamesAfter, 1);
});

test('insufficient cash rejects before consuming shared randomness or starting a game', () => {
  const random = fixedRandom(0);
  const round = resolveGamblerRound({
    cash: 49,
    completedGames: 0,
    unlockedUnitTypes: allUnitCards,
    isFirstRandom: true,
    random,
  });
  assert.deepEqual(round, { status: 'insufficient-funds', stake: 50, availableCash: 49 });
  assert.deepEqual(random.bounds, []);
});

test('invalid counters and random values fail explicitly instead of changing the odds silently', () => {
  assert.throws(() => getGamblerStake(-1), RangeError);
  assert.throws(() => getGamblerStake(1.5), RangeError);
  assert.throws(() => resolveGamblerRound({
    cash: 50,
    completedGames: 0,
    unlockedUnitTypes: allUnitCards,
    isFirstRandom: true,
    random: { nextInt: (bound) => bound },
  }), RangeError);
});
