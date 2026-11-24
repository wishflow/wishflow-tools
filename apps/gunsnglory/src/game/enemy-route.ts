export type EnemyRouteDirection = 'east' | 'south' | 'west' | 'north';

export interface EnemyRouteVector {
  x: number;
  y: number;
}

interface GroupedEnemyPosition {
  groupId: string;
  positionFine: { x: number; y: number };
}

function fullCell(fine: number, fineUnitsPerCell: number): number {
  return Math.trunc(Math.fround(fine / fineUnitsPerCell));
}

export function sameGroupPredecessorMovementVector<T extends GroupedEnemyPosition>(
  enemies: readonly T[],
  enemyIndex: number,
  fineUnitsPerCell: number,
): EnemyRouteVector | undefined {
  if (enemyIndex <= 0 || enemyIndex >= enemies.length) return undefined;
  const enemy = enemies[enemyIndex];
  const predecessor = enemies[enemyIndex - 1];
  if (!enemy || !predecessor || predecessor.groupId !== enemy.groupId) return undefined;

  return {
    x: fullCell(predecessor.positionFine.x, fineUnitsPerCell)
      - fullCell(enemy.positionFine.x, fineUnitsPerCell),
    y: fullCell(predecessor.positionFine.y, fineUnitsPerCell)
      - fullCell(enemy.positionFine.y, fineUnitsPerCell),
  };
}

export function advanceFinePosition(
  positionFine: { x: number; y: number },
  movementVector: EnemyRouteVector,
  speed: number,
  deltaMs: number,
): { x: number; y: number } {
  const scaledDelta = (component: number): number => {
    const direction = Math.imul(component, speed);
    const delta = Math.fround(Math.fround(direction) * Math.fround(deltaMs));
    return Math.fround(delta / 100);
  };
  return {
    x: Math.trunc(Math.fround(Math.fround(positionFine.x) + scaledDelta(movementVector.x))),
    y: Math.trunc(Math.fround(Math.fround(positionFine.y) + scaledDelta(movementVector.y))),
  };
}

export function directionForMovementVector(
  movementVector: EnemyRouteVector,
  fallback: EnemyRouteDirection,
): EnemyRouteDirection {
  if (Math.abs(movementVector.x) > Math.abs(movementVector.y)) {
    if (movementVector.x > 0) return 'east';
    if (movementVector.x < 0) return 'west';
  } else {
    if (movementVector.y > 0) return 'south';
    if (movementVector.y < 0) return 'north';
  }
  return fallback;
}

export function alignFinePositionAtRedirect(
  positionFine: { x: number; y: number },
  movementVector: EnemyRouteVector,
  fineUnitsPerCell: number,
): { x: number; y: number } {
  const cellX = fullCell(positionFine.x, fineUnitsPerCell);
  const cellY = fullCell(positionFine.y, fineUnitsPerCell);
  const centerOffset = fineUnitsPerCell / 2;
  let x = positionFine.x;
  let y = positionFine.y;

  if (movementVector.x === -1 || movementVector.x === 1) {
    y = (cellY * fineUnitsPerCell) + centerOffset;
    x = (cellX * fineUnitsPerCell) + centerOffset + (movementVector.x * 2);
  }
  if (movementVector.y === -1 || movementVector.y === 1) {
    x = (cellX * fineUnitsPerCell) + centerOffset;
    y = (cellY * fineUnitsPerCell) + centerOffset + (movementVector.y * 2);
  }

  return { x, y };
}
