import type { GameView } from '../game';
import { getMapCameraOriginBounds, type MapViewport } from './map-viewport';

export interface LogicalViewportSize {
  width: number;
  height: number;
}

function drawMapFrameTile(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  viewport: MapViewport,
  viewportSize: LogicalViewportSize,
  cellX: number,
  cellY: number,
  sourceColumn: number,
  sourceRow: number,
): void {
  const sourceWidth = image.naturalWidth / 4;
  const sourceHeight = image.naturalHeight / 4;
  const destinationX = viewport.origin.x + (cellX * viewport.tileSize);
  const destinationY = viewport.origin.y + (cellY * viewport.tileSize);
  if (destinationX + viewport.tileSize <= 0 || destinationX >= viewportSize.width
    || destinationY + viewport.tileSize <= 0 || destinationY >= viewportSize.height) return;
  context.drawImage(
    image,
    sourceColumn * sourceWidth,
    sourceRow * sourceHeight,
    sourceWidth,
    sourceHeight,
    destinationX,
    destinationY,
    viewport.tileSize,
    viewport.tileSize,
  );
}

/** Draws the APK's two-tile edge frame when the camera exposes the map boundary. */
export function drawMapFrame(
  context: CanvasRenderingContext2D,
  view: GameView,
  image: HTMLImageElement | undefined,
  viewport: MapViewport,
  viewportSize: LogicalViewportSize,
  displayPixelScale: number,
): void {
  if (!image) return;
  const width = view.map.width;
  const height = view.map.height;
  const tileSize = viewport.tileSize;
  const horizontal = getMapCameraOriginBounds(viewport.mapWidth, viewportSize.width, tileSize, displayPixelScale);
  const vertical = getMapCameraOriginBounds(viewport.mapHeight, viewportSize.height, tileSize, displayPixelScale);
  const drawTile = (cellX: number, cellY: number, column: number, row: number) => {
    drawMapFrameTile(context, image, viewport, viewportSize, cellX, cellY, column, row);
  };

  if (viewport.origin.y > vertical.maximum - tileSize) {
    drawTile(-2, -2, 0, 2);
    for (let x = -1; x < width + 1; x += 1) drawTile(x, -2, 1, 2);
    drawTile(width + 1, -2, 2, 2);
  }
  if (viewport.origin.y < vertical.minimum + tileSize) {
    drawTile(-2, height + 1, 2, 3);
    for (let x = -1; x < width + 1; x += 1) drawTile(x, height + 1, 1, 3);
    drawTile(width + 1, height + 1, 0, 3);
  }
  if (viewport.origin.x > horizontal.maximum - tileSize) {
    for (let y = -1; y < height + 1; y += 1) drawTile(-2, y, 3, 3);
  }
  if (viewport.origin.x < horizontal.minimum + tileSize) {
    for (let y = -1; y < height + 1; y += 1) drawTile(width + 1, y, 3, 2);
  }

  if (viewport.origin.y > vertical.maximum - (tileSize * 2)) {
    drawTile(-1, -1, 0, 0);
    for (let x = 0; x < width; x += 1) drawTile(x, -1, 1, 0);
    drawTile(width, -1, 2, 0);
  }
  if (viewport.origin.y < vertical.minimum + (tileSize * 2)) {
    drawTile(-1, height, 2, 1);
    for (let x = 0; x < width; x += 1) drawTile(x, height, 1, 1);
    drawTile(width, height, 0, 1);
  }
  if (viewport.origin.x > horizontal.maximum - (tileSize * 2)) {
    for (let y = 0; y < height; y += 1) drawTile(-1, y, 3, 1);
  }
  if (viewport.origin.x < horizontal.minimum + (tileSize * 2)) {
    for (let y = 0; y < height; y += 1) drawTile(width, y, 3, 0);
  }
}

export function drawRouteInspectionOverlay(
  context: CanvasRenderingContext2D,
  route: GameView['route'],
  viewport: MapViewport,
): void {
  if (!route || route.length < 2) return;
  const toScreen = (x: number, y: number) => ({
    x: viewport.origin.x + x * viewport.tileSize,
    y: viewport.origin.y + y * viewport.tileSize,
  });
  context.beginPath();
  route.forEach((point, index) => {
    const screen = toScreen(point.x, point.y);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  });
  context.strokeStyle = '#45e0d2';
  context.lineWidth = Math.max(1.5, 2 * viewport.scaleFactor);
  context.lineCap = 'round';
  context.setLineDash([5 * viewport.scaleFactor, 3 * viewport.scaleFactor]);
  context.stroke();
  context.setLineDash([]);
  for (const [index, point] of route.entries()) {
    const screen = toScreen(point.x, point.y);
    context.beginPath();
    context.arc(screen.x, screen.y, Math.max(2, 2.5 * viewport.scaleFactor), 0, Math.PI * 2);
    context.fillStyle = index === route.length - 1 ? '#f17b56' : '#45e0d2';
    context.fill();
  }
}
