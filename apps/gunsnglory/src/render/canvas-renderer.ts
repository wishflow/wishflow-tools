import type { Direction, EnemyView, GameView, RenderTile } from '../game';
import { calculateMapViewport, type MapViewport } from './map-viewport';

export const GAME_VIEWPORT = Object.freeze({ width: 1024, height: 576 });

export type GameImages = Readonly<Record<string, HTMLImageElement>>;

export function resizeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(GAME_VIEWPORT.width * pixelRatio);
  canvas.height = Math.round(GAME_VIEWPORT.height * pixelRatio);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable');
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.imageSmoothingEnabled = false;
  return context;
}

export function getMapViewport(view: GameView): MapViewport {
  return calculateMapViewport(
    view.map.width,
    view.map.height,
    GAME_VIEWPORT.width,
    GAME_VIEWPORT.height,
    view.map.tileSize,
  );
}

function drawTiles(
  context: CanvasRenderingContext2D,
  tiles: readonly RenderTile[],
  images: GameImages,
  viewport: MapViewport,
): void {
  for (const tile of tiles) {
    const image = images[tile.asset];
    if (!image) throw new Error('Missing game image: ' + tile.asset);
    context.drawImage(
      image,
      tile.source.x,
      tile.source.y,
      tile.source.width,
      tile.source.height,
      viewport.origin.x + tile.x * viewport.tileSize,
      viewport.origin.y + tile.y * viewport.tileSize,
      tile.width * viewport.tileSize,
      tile.height * viewport.tileSize,
    );
  }
}

function spriteRow(direction: Direction): number {
  if (direction === 'south') return 1;
  if (direction === 'north') return 2;
  return 0;
}

function drawEnemy(
  context: CanvasRenderingContext2D,
  enemy: EnemyView,
  images: GameImages,
  viewport: MapViewport,
): void {
  const image = images[enemy.asset];
  if (!image) throw new Error('Missing game image: ' + enemy.asset);

  const sourceWidth = 16;
  const sourceHeight = 24;
  const tileScale = viewport.scaleFactor;
  const width = sourceWidth * tileScale;
  const height = sourceHeight * tileScale;
  const centerX = viewport.origin.x + (enemy.positionFine.x / 240 + 16) * tileScale;
  const feetY = viewport.origin.y + (enemy.positionFine.y / 240 + 16) * tileScale;
  const left = centerX - width / 2;
  const top = feetY - height;
  const sourceX = (enemy.animationFrame % 3) * sourceWidth;
  const sourceY = spriteRow(enemy.direction) * sourceHeight;

  context.save();
  if (enemy.direction === 'west') {
    context.translate((left * 2) + width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, left, top, width, height);
  context.restore();
}

export function drawGame(
  context: CanvasRenderingContext2D,
  view: GameView,
  images: GameImages,
): void {
  context.save();
  context.clearRect(0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
  context.fillStyle = '#1a1712';
  context.fillRect(0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height);

  const viewport = getMapViewport(view);
  context.beginPath();
  context.rect(0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
  context.clip();
  drawTiles(context, view.map.background, images, viewport);
  drawTiles(context, view.map.streets, images, viewport);

  for (const unit of view.units) {
    const left = viewport.origin.x + unit.render.x * viewport.tileSize;
    const top = viewport.origin.y + unit.render.y * viewport.tileSize;
    const width = unit.render.width * viewport.tileSize;
    const height = unit.render.height * viewport.tileSize;

    if (unit.selected) {
      context.beginPath();
      context.ellipse(left + width / 2, top + height - 1, width * 0.6, viewport.tileSize * 0.2, 0, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 196, 70, 0.8)';
      context.fill();
    }

    const image = images[unit.asset];
    if (!image) throw new Error('Missing game image: ' + unit.asset);
    context.drawImage(
      image,
      unit.frame.x,
      unit.frame.y,
      unit.frame.width,
      unit.frame.height,
      left,
      top,
      width,
      height,
    );

    if (unit.selected) {
      context.strokeStyle = '#ffe28a';
      context.lineWidth = 2;
      context.setLineDash([5, 3]);
      context.strokeRect(
        viewport.origin.x + unit.hitArea.x * viewport.tileSize,
        viewport.origin.y + unit.hitArea.y * viewport.tileSize,
        unit.hitArea.width * viewport.tileSize,
        unit.hitArea.height * viewport.tileSize,
      );
      context.setLineDash([]);
    }
  }

  for (const enemy of view.enemies) drawEnemy(context, enemy, images, viewport);
  context.restore();
}
