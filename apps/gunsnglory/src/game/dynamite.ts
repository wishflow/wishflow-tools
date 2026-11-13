export interface DynamiteCell {
  x: number;
  y: number;
}

export interface DynamitePairDefinition {
  id: string;
  triggerCell: DynamiteCell;
  boxCell: DynamiteCell;
}

export interface DynamiteScenarioDefinition {
  unlocked: boolean;
  pairs: readonly DynamitePairDefinition[];
}

export type DynamiteBoxPhase = 'present' | 'absent' | 'respawning';

export interface DynamiteObjectView extends DynamitePairDefinition {
  unlocked: boolean;
  cooldownRemainingMs: number;
  triggerPressed: boolean;
  boxPhase: DynamiteBoxPhase;
  boxAnimationFrame: number;
}

export interface DynamiteExplosionView {
  id: string;
  positionFine: { x: number; y: number };
  remainingMs: number;
  animationFrame: number;
}

export const DYNAMITE_COOLDOWN_MS = 59_000;
export const DYNAMITE_BOX_RESPAWN_WINDOW_MS = 500;
export const DYNAMITE_BASE_DAMAGE = 5_000;
export const DYNAMITE_RADIUS_FINE = 23_040;
export const DYNAMITE_TRIGGER_PRESSED_MS = 100;
export const DYNAMITE_EXPLOSION_DURATION_MS = 799;

/** Pairs TDM trigger code 102 with the nearest still-unused box code 110. */
export function pairDynamiteObjects(
  grid: readonly (readonly number[])[],
  unlocked: boolean,
): DynamiteScenarioDefinition {
  const triggers: DynamiteCell[] = [];
  const boxes: DynamiteCell[] = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
      const code = grid[y]?.[x];
      if (code === 102) triggers.push({ x, y });
      else if (code === 110) boxes.push({ x, y });
    }
  }
  if (triggers.length !== boxes.length) {
    throw new Error(`Dynamite TDM trigger/box count mismatch: ${triggers.length}/${boxes.length}`);
  }

  const unusedBoxes = [...boxes];
  const pairs = triggers.map((triggerCell, index): DynamitePairDefinition => {
    const nearestIndex = unusedBoxes.reduce((bestIndex, candidate, candidateIndex) => {
      const best = unusedBoxes[bestIndex]!;
      const candidateDistance = squaredCellDistance(triggerCell, candidate);
      const bestDistance = squaredCellDistance(triggerCell, best);
      return candidateDistance < bestDistance
        || (candidateDistance === bestDistance && (candidate.y < best.y || (candidate.y === best.y && candidate.x < best.x)))
        ? candidateIndex
        : bestIndex;
    }, 0);
    const [boxCell] = unusedBoxes.splice(nearestIndex, 1);
    if (!boxCell) throw new Error('Dynamite box pairing failed');
    return { id: `dynamite-${index + 1}`, triggerCell, boxCell };
  });

  return { unlocked, pairs };
}

export function dynamiteDamageForEnemy(enemyType: number, heavyPenetrationPercent: number): number {
  if (enemyType === 8) return 0;
  return Math.trunc((DYNAMITE_BASE_DAMAGE * heavyPenetrationPercent) / 100);
}

export function isInsideDynamiteRadius(
  centerFine: { x: number; y: number },
  targetFine: { x: number; y: number },
): boolean {
  const dx = centerFine.x - targetFine.x;
  const dy = centerFine.y - targetFine.y;
  return (dx * dx) + (dy * dy) <= (DYNAMITE_RADIUS_FINE * DYNAMITE_RADIUS_FINE);
}

function squaredCellDistance(left: DynamiteCell, right: DynamiteCell): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return (dx * dx) + (dy * dy);
}
