export interface PlayerCollisionRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerCollisionMapObject extends PlayerCollisionRectangle {
  sourceCell?: PlayerCollisionCell;
  sourceTdmCode?: number;
}

export interface PlayerCollisionCell {
  x: number;
  y: number;
}

export interface PlayerCollisionDecoration {
  asset: string;
  cell: PlayerCollisionCell;
  collisionBoxFine?: PlayerCollisionRectangle;
}

export interface PlayerCollisionDynamitePair {
  triggerCell: PlayerCollisionCell;
  boxCell: PlayerCollisionCell;
}

export interface PlayerCollisionDynamite {
  unlocked: boolean;
  pairs: readonly PlayerCollisionDynamitePair[];
}

export const PLAYER_UNIT_COLLIDER_FINE: Readonly<PlayerCollisionRectangle> = Object.freeze({
  x: -2_534,
  y: -5_376,
  width: 5_068,
  height: 4_608,
});

const FINE_UNITS_PER_CELL = 7_680;
const CELL_CENTER_FINE = FINE_UNITS_PER_CELL / 2;
const UNIT_PLACEMENT_OFFSET_Y_FINE = 1_920;

const defaultDecorationBounds: Readonly<PlayerCollisionRectangle> = Object.freeze({
  x: 1_920,
  y: 2_612,
  width: 3_840,
  height: 2_534,
});

export const PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE: Readonly<Record<number, Readonly<PlayerCollisionRectangle>>> = Object.freeze({
  68: defaultDecorationBounds,
  69: defaultDecorationBounds,
  70: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 },
  71: defaultDecorationBounds,
  72: defaultDecorationBounds,
  73: defaultDecorationBounds,
  74: defaultDecorationBounds,
  75: defaultDecorationBounds,
  76: defaultDecorationBounds,
  77: { x: 0, y: -5_760, width: 7_680, height: 11_520 },
  79: defaultDecorationBounds,
  86: { x: 0, y: 0, width: 7_680, height: 7_680 },
  87: { x: 0, y: 0, width: 7_680, height: 7_680 },
  94: { x: 0, y: 0, width: 7_680, height: 7_680 },
  95: { x: 0, y: 0, width: 7_680, height: 7_680 },
  112: { x: -2_496, y: -4_224, width: 14_592, height: 6_144 },
  113: { x: -5_568, y: -5_760, width: 18_048, height: 7_680 },
  114: { x: -5_184, y: -2_304, width: 10_368, height: 4_224 },
  116: { x: -7_680, y: 2_612, width: 15_360, height: 3_840 },
  117: defaultDecorationBounds,
  126: defaultDecorationBounds,
});

const nonStaticObjectMarkerCodes = new Set([
  78,
  80, 81, 82, 83, 84, 85, 88, 89, 90, 91, 92, 93,
  96, 97, 98, 99, 100, 101, 102, 104, 105, 106, 107, 108, 109, 110,
  115, 118, 119, 120, 121, 122, 123,
  130, 131, 132, 138, 139, 150,
]);

function translateCellBounds(
  cell: PlayerCollisionCell,
  bounds: Readonly<PlayerCollisionRectangle>,
): PlayerCollisionRectangle {
  return {
    ...bounds,
    x: (cell.x * FINE_UNITS_PER_CELL) + bounds.x,
    y: (cell.y * FINE_UNITS_PER_CELL) + bounds.y,
  };
}

function collisionBoundsAtCell(
  cell: PlayerCollisionCell,
  bounds: Readonly<PlayerCollisionRectangle>,
): PlayerCollisionMapObject {
  return {
    ...translateCellBounds(cell, bounds),
    sourceCell: { ...cell },
  };
}

function unitCollisionBoxAtCell(cell: PlayerCollisionCell): PlayerCollisionMapObject {
  const anchor = {
    x: (cell.x * FINE_UNITS_PER_CELL) + CELL_CENTER_FINE,
    y: (cell.y * FINE_UNITS_PER_CELL) + CELL_CENTER_FINE + UNIT_PLACEMENT_OFFSET_Y_FINE,
  };
  return {
    x: anchor.x + PLAYER_UNIT_COLLIDER_FINE.x,
    y: anchor.y + PLAYER_UNIT_COLLIDER_FINE.y,
    width: PLAYER_UNIT_COLLIDER_FINE.width,
    height: PLAYER_UNIT_COLLIDER_FINE.height,
    sourceCell: { ...cell },
  };
}

function hasCasinoAtCell(
  decorations: readonly PlayerCollisionDecoration[],
  cell: PlayerCollisionCell,
): boolean {
  return decorations.some(({ asset, cell: decorationCell }) => (
    asset === 'b_3x2_casino'
    && decorationCell.x === cell.x
    && decorationCell.y === cell.y
  ));
}

/** Builds static player collision boxes from original TDM objects, or explicit boxes for gridless fixtures. */
export function createPlayerMapCollisionBoxes(
  grid: readonly (readonly number[])[] | undefined,
  decorations: readonly PlayerCollisionDecoration[] = [],
  dynamite: PlayerCollisionDynamite | undefined,
): PlayerCollisionMapObject[] {
  const hasTdmGrid = Boolean(grid?.length);
  const collisionBoxes: PlayerCollisionMapObject[] = [];

  if (hasTdmGrid && grid) {
    for (let y = 0; y < grid.length; y += 1) {
      const row = grid[y] ?? [];
      for (let x = 0; x < row.length; x += 1) {
        const code = row[x];
        if (code === undefined) continue;
        const cell = { x, y };
        const bounds = PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE[code];
        if (bounds) {
          collisionBoxes.push({
            ...collisionBoundsAtCell(cell, bounds),
            sourceTdmCode: code,
          });
        }
        if (code === 150 && hasCasinoAtCell(decorations, cell)) {
          collisionBoxes.push({
            ...collisionBoundsAtCell(cell, { x: -2_496, y: -4_224, width: 14_592, height: 6_144 }),
            sourceTdmCode: code,
          });
        }
      }
    }
  }

  for (const { cell, collisionBoxFine } of decorations) {
    if (!collisionBoxFine) continue;
    const sourceCode = grid?.[cell.y]?.[cell.x];
    const hasCanonicalTdmBox = sourceCode !== undefined
      && (PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE[sourceCode] !== undefined
        || (sourceCode === 150 && hasCasinoAtCell(decorations, cell)));
    const isKnownNonStaticMarker = sourceCode !== undefined
      && nonStaticObjectMarkerCodes.has(sourceCode);
    // The TDM table is authoritative for native objects. Preserve explicit
    // geometry for special objects placed on ordinary terrain, such as water rocks.
    if (!hasTdmGrid || (!hasCanonicalTdmBox && !isKnownNonStaticMarker)) {
      collisionBoxes.push({
        ...collisionBoundsAtCell(cell, collisionBoxFine),
        ...(sourceCode === undefined ? {} : { sourceTdmCode: sourceCode }),
      });
    }
  }

  if (dynamite?.unlocked) {
    for (const { triggerCell, boxCell } of dynamite.pairs) {
      collisionBoxes.push(
        { ...unitCollisionBoxAtCell(triggerCell), sourceTdmCode: 102 },
        { ...unitCollisionBoxAtCell(boxCell), sourceTdmCode: 110 },
      );
    }
  }

  return collisionBoxes;
}

/** Mirrors the APK's standalone CollisionManager.boxCheck helper. Movement uses the axis-crossing helpers below. */
export function apkCollisionBoxesOverlap(
  moving: Readonly<PlayerCollisionRectangle>,
  obstacle: Readonly<PlayerCollisionRectangle>,
): boolean {
  const left = moving.x;
  const top = moving.y;
  const right = moving.x + moving.width;
  const bottom = moving.y + moving.height;
  const obstacleRight = obstacle.x + obstacle.width;
  const obstacleBottom = obstacle.y + obstacle.height;

  const insideX = (x: number): boolean => x >= obstacle.x && x <= obstacleRight;
  const insideY = (y: number): boolean => y >= obstacle.y && y <= obstacleBottom;
  if (insideX(left) && insideY(bottom)) return true;
  if (insideX(left) && insideY(top)) return true;
  if (right < obstacle.x || right > obstacleRight || top < obstacle.y || top > obstacleBottom) {
    return insideX(right) && insideY(bottom);
  }
  return true;
}

function orthogonalRangesOverlap(
  movingStart: number,
  movingSize: number,
  obstacleStart: number,
  obstacleSize: number,
): boolean {
  const movingEnd = movingStart + movingSize;
  const obstacleEnd = obstacleStart + obstacleSize;
  return (movingStart >= obstacleStart && movingStart <= obstacleEnd)
    || (movingEnd >= obstacleStart && movingEnd <= obstacleEnd)
    || (movingStart <= obstacleStart && movingEnd >= obstacleEnd);
}

/** Mirrors CollisionManager.boxCheckX: detect a horizontal edge crossing on this movement step. */
export function apkCollisionBlocksX(
  moving: Readonly<PlayerCollisionRectangle>,
  obstacle: Readonly<PlayerCollisionRectangle>,
  deltaX: number,
): boolean {
  const movingRight = moving.x + moving.width;
  const obstacleRight = obstacle.x + obstacle.width;
  if (moving.x + deltaX <= obstacleRight && moving.x >= obstacleRight) {
    return orthogonalRangesOverlap(moving.y, moving.height, obstacle.y, obstacle.height);
  }
  if (movingRight + deltaX < obstacle.x || movingRight > obstacle.x) return false;
  return orthogonalRangesOverlap(moving.y, moving.height, obstacle.y, obstacle.height);
}

/** Mirrors CollisionManager.boxCheckY: detect a vertical edge crossing on this movement step. */
export function apkCollisionBlocksY(
  moving: Readonly<PlayerCollisionRectangle>,
  obstacle: Readonly<PlayerCollisionRectangle>,
  deltaY: number,
): boolean {
  const movingBottom = moving.y + moving.height;
  const obstacleBottom = obstacle.y + obstacle.height;
  if (moving.y + deltaY <= obstacleBottom && moving.y >= obstacleBottom) {
    return orthogonalRangesOverlap(moving.x, moving.width, obstacle.x, obstacle.width);
  }
  if (movingBottom + deltaY < obstacle.y || movingBottom > obstacle.y) return false;
  return orthogonalRangesOverlap(moving.x, moving.width, obstacle.x, obstacle.width);
}
