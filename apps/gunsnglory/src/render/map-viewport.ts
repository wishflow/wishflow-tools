export interface MapViewport {
  scale: number;
  scaleFactor: number;
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
  origin: { x: number; y: number };
}

export const LOGICAL_TILE_SIZE = 32;
export const BASE_VIEWPORT_WIDTH = 1024;
export const MAX_SCALE_RATIO = 2;

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and positive`);
  }
}

/** Mirrors the original screen-width target, scale bounds, rounding, and integer displayed tile size. */
export function calculateMapViewport(
  mapWidthTiles: number,
  mapHeightTiles: number,
  viewportWidth: number,
  viewportHeight: number,
  logicalTileSize = LOGICAL_TILE_SIZE,
  displayPixelScale = 1,
): MapViewport {
  assertPositiveFinite('Map width', mapWidthTiles);
  assertPositiveFinite('Map height', mapHeightTiles);
  assertPositiveFinite('Viewport width', viewportWidth);
  assertPositiveFinite('Viewport height', viewportHeight);
  assertPositiveFinite('Logical tile size', logicalTileSize);
  assertPositiveFinite('Display pixel scale', displayPixelScale);

  const splashScale = viewportWidth / BASE_VIEWPORT_WIDTH;
  const maxScale = Math.max(splashScale * MAX_SCALE_RATIO, 1);
  const tilePixels = Math.floor(Math.min(
    (viewportWidth * displayPixelScale) / mapWidthTiles,
    (viewportHeight * displayPixelScale) / mapHeightTiles,
    maxScale * logicalTileSize * displayPixelScale,
  ));
  if (tilePixels < 1) throw new RangeError('Map tiles are too small for the display pixel scale');
  const tileSize = tilePixels / displayPixelScale;
  const scale = tileSize / logicalTileSize;
  const mapWidth = mapWidthTiles * tileSize;
  const mapHeight = mapHeightTiles * tileSize;

  return {
    scale,
    scaleFactor: tileSize / logicalTileSize,
    tileSize,
    mapWidth,
    mapHeight,
    origin: {
      x: (viewportWidth - mapWidth) / 2,
      y: (viewportHeight - mapHeight) / 2,
    },
  };
}

export function mapCellToScreen(
  viewport: MapViewport,
  cellX: number,
  cellY: number,
): { x: number; y: number } {
  return {
    x: viewport.origin.x + cellX * viewport.tileSize,
    y: viewport.origin.y + cellY * viewport.tileSize,
  };
}

export function screenToMapCell(
  viewport: MapViewport,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return {
    x: (screenX - viewport.origin.x) / viewport.tileSize,
    y: (screenY - viewport.origin.y) / viewport.tileSize,
  };
}
