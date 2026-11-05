export type GamblerUnitType = 1 | 2 | 3 | 4 | 5 | 6 | 35 | 36;

export type GamblerHand =
  | 'one-pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'full-house'
  | 'four-of-a-kind'
  | 'flush'
  | 'royal-flush'
  | 'straight'
  | 'high-card'
  | 'lost';

export type GamblerOutcome =
  | { type: 'unit'; hand: GamblerHand; unitType: GamblerUnitType }
  | { type: 'cash'; hand: 'high-card'; payout: number }
  | { type: 'loss'; hand: 'lost' };

export interface GamblerRandomSource {
  nextInt(bound: number): number;
}

export type GamblerRoundResult =
  | { status: 'insufficient-funds'; stake: number; availableCash: number }
  | {
    status: 'played';
    stake: number;
    cashAfterStake: number;
    cashAfterRound: number;
    completedGamesAfter: number;
    outcome: GamblerOutcome;
  };

export interface GamblerRoundInput {
  cash: number;
  completedGames: number;
  unlockedUnitTypes: ReadonlySet<GamblerUnitType>;
  isFirstRandom: boolean;
  random: GamblerRandomSource;
}

interface GamblerCard {
  weight: number;
  outcome: GamblerOutcome;
}

const INITIAL_STAKE = 50;
const STAKE_INCREMENT = 5;
const MAX_STAKE_INCREMENTS = 5;

// Order, weights, and result labels follow Gambler.CARD_UNITS and CARD_CHANCES.
const GAMBLER_CARDS: readonly GamblerCard[] = Object.freeze([
  { weight: 20, outcome: { type: 'unit', hand: 'one-pair', unitType: 1 } },
  { weight: 15, outcome: { type: 'unit', hand: 'two-pair', unitType: 2 } },
  { weight: 13, outcome: { type: 'unit', hand: 'three-of-a-kind', unitType: 3 } },
  { weight: 11, outcome: { type: 'unit', hand: 'full-house', unitType: 4 } },
  { weight: 4, outcome: { type: 'unit', hand: 'four-of-a-kind', unitType: 5 } },
  { weight: 9, outcome: { type: 'unit', hand: 'flush', unitType: 6 } },
  { weight: 5, outcome: { type: 'unit', hand: 'royal-flush', unitType: 35 } },
  { weight: 4, outcome: { type: 'unit', hand: 'straight', unitType: 36 } },
  { weight: 11, outcome: { type: 'cash', hand: 'high-card', payout: 0 } },
  { weight: 8, outcome: { type: 'loss', hand: 'lost' } },
]);

export function getGamblerStake(completedGames: number): number {
  if (!Number.isSafeInteger(completedGames) || completedGames < 0) {
    throw new RangeError('Completed Gambler games must be a non-negative safe integer');
  }
  return INITIAL_STAKE + (Math.min(completedGames, MAX_STAKE_INCREMENTS) * STAKE_INCREMENT);
}

export function resolveGamblerRound(input: GamblerRoundInput): GamblerRoundResult {
  const { cash, completedGames, unlockedUnitTypes, isFirstRandom, random } = input;
  if (!Number.isSafeInteger(cash) || cash < 0) {
    throw new RangeError('Gambler cash must be a non-negative safe integer');
  }
  const stake = getGamblerStake(completedGames);
  if (cash < stake) return { status: 'insufficient-funds', stake, availableCash: cash };

  const eligibleCards = GAMBLER_CARDS.filter(({ outcome }) => {
    if (outcome.type === 'unit') return unlockedUnitTypes.has(outcome.unitType);
    if (outcome.type === 'loss') return !isFirstRandom;
    return true;
  });
  const totalWeight = eligibleCards.reduce((total, card) => total + card.weight, 0);
  if (totalWeight <= 0) throw new Error('Gambler card pool must contain at least one result');

  const roll = random.nextInt(totalWeight);
  if (!Number.isSafeInteger(roll) || roll < 0 || roll >= totalWeight) {
    throw new RangeError(`Random result must be an integer in [0, ${totalWeight})`);
  }

  let cumulativeWeight = 0;
  let selectedCard: GamblerCard | undefined;
  for (const card of eligibleCards) {
    cumulativeWeight += card.weight;
    if (roll < cumulativeWeight) {
      selectedCard = card;
      break;
    }
  }
  if (!selectedCard) throw new Error('Gambler roll did not resolve to a card');

  const cashAfterStake = cash - stake;
  const outcome = selectedCard.outcome.type === 'cash'
    ? { ...selectedCard.outcome, payout: stake * 2 }
    : selectedCard.outcome;
  const cashAfterRound = cashAfterStake + (outcome.type === 'cash' ? outcome.payout : 0);

  return {
    status: 'played',
    stake,
    cashAfterStake,
    cashAfterRound,
    completedGamesAfter: completedGames + 1,
    outcome,
  };
}
