export type CampaignBonusRewardType = 1 | 2 | 3 | 4;
export type CampaignBonusCratePhase = 'spawning' | 'active' | 'despawning';

export interface CampaignBonusCrateDefinition {
  totalCount: number;
  intervalMs: number;
  simultaneousLimit: number;
  rewardTypeCount: number;
}

export interface CampaignBonusCrate {
  id: string;
  cell: { x: number; y: number };
  positionFine: { x: number; y: number };
  rewardType: CampaignBonusRewardType;
  phase: CampaignBonusCratePhase;
  animationRemainingMs: number;
}

export interface CampaignBonusCratePool {
  remainingMs: number;
  remainingCount: number;
  nextNumber: number;
  crates: CampaignBonusCrate[];
}

export interface CampaignBonusCrateRandom {
  nextInt(bound: number): number;
}

export interface BonusCrateCandidateFacts {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundWalkable: boolean;
  hasStreet: boolean;
  objectCode: number;
  fieldBlocked: boolean;
}

export interface CollisionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BonusCrateFieldBlockers {
  decorations?: readonly {
    cell: { x: number; y: number };
    fieldBlockBounds?: { left: number; right: number; top: number; bottom: number };
  }[];
  spawnLocations?: readonly { cell: { x: number; y: number }; spawnLocationType: number }[];
  units?: readonly { x: number; y: number }[];
  crates?: readonly { cell: { x: number; y: number } }[];
}

const FINE_UNITS_PER_CELL = 7_680;
const CRATE_ANIMATION_MS = 500;
const CRATE_ANIMATION_INITIAL_TIMER_MS = 499;
const BONUS_DURATION_MS = 60_000;

export function createCampaignBonusCratePool(
  definition: CampaignBonusCrateDefinition | undefined,
): CampaignBonusCratePool | undefined {
  if (!definition) return undefined;
  return {
    remainingMs: definition.intervalMs,
    remainingCount: definition.totalCount,
    nextNumber: 1,
    crates: [],
  };
}

export function isBonusCrateCandidateAllowed(facts: BonusCrateCandidateFacts): boolean {
  return facts.x >= 1
    && facts.x < facts.width - 1
    && facts.y >= 2
    && facts.y < facts.height - 1
    && facts.backgroundWalkable
    && !facts.hasStreet
    && facts.objectCode !== 78
    && !facts.fieldBlocked;
}

export function isCampaignBonusCrateFieldBlocked(
  cell: { x: number; y: number },
  blockers: BonusCrateFieldBlockers,
): boolean {
  if (blockers.decorations?.some(({ cell: decorationCell, fieldBlockBounds }) => {
    const bounds = fieldBlockBounds ?? { left: 0, right: 0, top: 0, bottom: 0 };
    return cell.x >= decorationCell.x + bounds.left
      && cell.x <= decorationCell.x + bounds.right
      && cell.y >= decorationCell.y + bounds.top
      && cell.y <= decorationCell.y + bounds.bottom;
  })) return true;

  if (blockers.spawnLocations?.some(({ cell: spawnCell, spawnLocationType }) => {
    const bounds = spawnLocationType === 3
      ? { left: -1, right: 0, top: -1, bottom: 0 }
      : spawnLocationType === 1 || spawnLocationType === 2 || spawnLocationType === 4
        ? { left: -1, right: 1, top: -1, bottom: 0 }
        : { left: 0, right: 0, top: 0, bottom: 0 };
    return cell.x >= spawnCell.x + bounds.left
      && cell.x <= spawnCell.x + bounds.right
      && cell.y >= spawnCell.y + bounds.top
      && cell.y <= spawnCell.y + bounds.bottom;
  })) return true;

  if (blockers.units?.some((unitCell) => unitCell.x === cell.x && unitCell.y === cell.y)) return true;
  return Boolean(blockers.crates?.some((crate) => crate.cell.x === cell.x && crate.cell.y === cell.y));
}

export function findBonusCrateCell(
  width: number,
  height: number,
  random: CampaignBonusCrateRandom,
  isAllowed: (cell: { x: number; y: number }) => boolean,
): { x: number; y: number } {
  if (width < 3 || height < 4) throw new RangeError('Map is too small for the original bonus-crate spawn range');
  for (;;) {
    const cell = {
      x: random.nextInt(width - 2) + 1,
      y: random.nextInt(height - 3) + 2,
    };
    if (isAllowed(cell)) return cell;
  }
}

export function chooseCampaignBonusReward(
  rewardTypeCount: number,
  lives: number,
  maxLives: number,
  random: CampaignBonusCrateRandom,
): CampaignBonusRewardType {
  if (!Number.isInteger(rewardTypeCount) || rewardTypeCount < 1 || rewardTypeCount > 4) {
    throw new RangeError('Fort Kaboom reward type count must be between 1 and 4');
  }
  let rewardType = random.nextInt(rewardTypeCount) + 1;
  if (rewardType === 1 && lives > maxLives - 5) {
    rewardType = random.nextInt(rewardTypeCount - 1) + 2;
  }
  return rewardType as CampaignBonusRewardType;
}

export function campaignBonusLivesAfterPickup(lives: number, maxLives: number): number {
  return Math.min(maxLives, lives + 5);
}

export function campaignBonusRewardAsset(rewardType: CampaignBonusRewardType): string {
  switch (rewardType) {
    case 1: return 'hud_bonus_sheriff';
    case 2: return 'hud_bonus_cash';
    case 3: return 'hud_bonus_speed';
    case 4: return 'hud_bonus_damage';
  }
}

export function advanceCampaignBonusCratePool(
  pool: CampaignBonusCratePool | undefined,
  definition: CampaignBonusCrateDefinition | undefined,
  width: number,
  height: number,
  deltaMs: number,
  lives: number,
  maxLives: number,
  random: CampaignBonusCrateRandom,
  isAllowed: (cell: { x: number; y: number }) => boolean,
): CampaignBonusCrate[] {
  if (!pool || !definition) return [];
  pool.remainingMs -= deltaMs;
  let spawned: CampaignBonusCrate[] = [];
  if (pool.remainingMs < 0) {
    if (pool.remainingCount > 0 && pool.crates.length < definition.simultaneousLimit) {
      const rewardType = chooseCampaignBonusReward(definition.rewardTypeCount, lives, maxLives, random);
      const cell = findBonusCrateCell(width, height, random, isAllowed);
      const crate: CampaignBonusCrate = {
        id: `bonus-crate-${String(pool.nextNumber).padStart(2, '0')}`,
        cell,
        positionFine: {
          x: (cell.x * FINE_UNITS_PER_CELL) + 3_840,
          y: (cell.y * FINE_UNITS_PER_CELL) + 5_760,
        },
        rewardType,
        phase: 'spawning',
        animationRemainingMs: CRATE_ANIMATION_INITIAL_TIMER_MS,
      };
      pool.nextNumber += 1;
      pool.remainingCount -= 1;
      pool.crates.push(crate);
      spawned = [crate];
    }
    // The APK discards timer overshoot even when the pool is capped or exhausted.
    pool.remainingMs = definition.intervalMs;
  }

  for (const crate of [...pool.crates]) {
    if (crate.phase === 'active') continue;
    crate.animationRemainingMs -= deltaMs;
    if (crate.animationRemainingMs > 0) continue;
    if (crate.phase === 'spawning') {
      crate.phase = 'active';
      crate.animationRemainingMs = 0;
    } else {
      pool.crates = pool.crates.filter((candidate) => candidate !== crate);
    }
  }
  return spawned;
}

export function beginCampaignBonusCrateDespawn(crate: CampaignBonusCrate): boolean {
  if (crate.phase !== 'active') return false;
  crate.phase = 'despawning';
  crate.animationRemainingMs = CRATE_ANIMATION_INITIAL_TIMER_MS;
  return true;
}

export function campaignBonusCrateAnimationFrame(crate: CampaignBonusCrate): number {
  const elapsedMs = CRATE_ANIMATION_MS - crate.animationRemainingMs;
  const frame = crate.phase === 'despawning'
    ? Math.floor(crate.animationRemainingMs / 100)
    : Math.floor(elapsedMs / 100);
  return Math.max(0, Math.min(4, frame));
}

export function collisionBoundsOverlap(left: CollisionBounds, right: CollisionBounds): boolean {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

export const CAMPAIGN_BONUS_DURATION_MS = BONUS_DURATION_MS;
export const CAMPAIGN_BONUS_CRATE_ANIMATION_MS = CRATE_ANIMATION_MS;
