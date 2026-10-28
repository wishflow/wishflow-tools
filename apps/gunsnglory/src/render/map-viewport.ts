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
export const MIN_MAP_ZOOM = 1;
export const MAX_MAP_ZOOM = 4;

export interface MapCamera {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_MAP_CAMERA: Readonly<MapCamera> = Object.freeze({ zoom: 1, offsetX: 0, offsetY: 0 });

export function createMapCamera(): MapCamera {
  return { ...DEFAULT_MAP_CAMERA };
}

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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampOrigin(origin: number, mapSize: number, viewportSize: number): number {
  if (mapSize >= viewportSize) return clamp(origin, viewportSize - mapSize, 0);
  return clamp(origin, 0, viewportSize - mapSize);
}

function snapToDisplayPixel(value: number, displayPixelScale: number): number {
  return Math.round(value * displayPixelScale) / displayPixelScale;
}

function boundedZoom(zoom: number): number {
  assertPositiveFinite('Map zoom', zoom);
  return clamp(zoom, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
}

/** Applies camera zoom and pan without changing the fitted base map or its logical coordinates. */
export function mapViewportWithCamera(
  baseViewport: MapViewport,
  mapWidthTiles: number,
  mapHeightTiles: number,
  viewportWidth: number,
  viewportHeight: number,
  camera: Readonly<MapCamera>,
  displayPixelScale = 1,
): MapViewport {
  assertPositiveFinite('Map width', mapWidthTiles);
  assertPositiveFinite('Map height', mapHeightTiles);
  assertPositiveFinite('Viewport width', viewportWidth);
  assertPositiveFinite('Viewport height', viewportHeight);
  assertPositiveFinite('Display pixel scale', displayPixelScale);
  const zoom = boundedZoom(camera.zoom);
  if (!Number.isFinite(camera.offsetX) || !Number.isFinite(camera.offsetY)) {
    throw new RangeError('Map camera offsets must be finite');
  }

  const tileSize = snapToDisplayPixel(baseViewport.tileSize * zoom, displayPixelScale);
  const zoomRatio = tileSize / baseViewport.tileSize;
  const mapWidth = mapWidthTiles * tileSize;
  const mapHeight = mapHeightTiles * tileSize;
  const centeredOriginX = (viewportWidth - mapWidth) / 2;
  const centeredOriginY = (viewportHeight - mapHeight) / 2;
  const requestedOriginX = zoom === MIN_MAP_ZOOM ? centeredOriginX : centeredOriginX + camera.offsetX;
  const requestedOriginY = zoom === MIN_MAP_ZOOM ? centeredOriginY : centeredOriginY + camera.offsetY;
  const originX = clampOrigin(snapToDisplayPixel(requestedOriginX, displayPixelScale), mapWidth, viewportWidth);
  const originY = clampOrigin(snapToDisplayPixel(requestedOriginY, displayPixelScale), mapHeight, viewportHeight);

  return {
    scale: baseViewport.scale * zoomRatio,
    scaleFactor: baseViewport.scaleFactor * zoomRatio,
    tileSize,
    mapWidth,
    mapHeight,
    origin: { x: originX, y: originY },
  };
}

/** Keeps a map-space point under a screen-space focal point while changing zoom or panning. */
export function cameraForAnchor(
  baseViewport: MapViewport,
  mapWidthTiles: number,
  mapHeightTiles: number,
  viewportWidth: number,
  viewportHeight: number,
  requestedZoom: number,
  mapAnchor: { x: number; y: number },
  screenAnchor: { x: number; y: number },
  displayPixelScale = 1,
): MapCamera {
  const zoom = boundedZoom(requestedZoom);
  if (![mapAnchor.x, mapAnchor.y, screenAnchor.x, screenAnchor.y].every(Number.isFinite)) {
    throw new RangeError('Map camera anchor coordinates must be finite');
  }
  if (zoom === MIN_MAP_ZOOM) return createMapCamera();

  const tileSize = snapToDisplayPixel(baseViewport.tileSize * zoom, displayPixelScale);
  const mapWidth = mapWidthTiles * tileSize;
  const mapHeight = mapHeightTiles * tileSize;
  const originX = clampOrigin(screenAnchor.x - mapAnchor.x * tileSize, mapWidth, viewportWidth);
  const originY = clampOrigin(screenAnchor.y - mapAnchor.y * tileSize, mapHeight, viewportHeight);
  return {
    zoom,
    offsetX: originX - (viewportWidth - mapWidth) / 2,
    offsetY: originY - (viewportHeight - mapHeight) / 2,
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
