import type { GameView, RenderTile } from '../game';

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

export function getMapOrigin(view: GameView): { x: number; y: number } {
  const worldWidth = view.map.width * view.map.tileSize;
  const worldHeight = view.map.height * view.map.tileSize;
  return {
    x: (GAME_VIEWPORT.width - worldWidth) / 2,
    y: (GAME_VIEWPORT.height - worldHeight) / 2,
  };
}

function drawTiles(
  context: CanvasRenderingContext2D,
  tiles: readonly RenderTile[],
  images: GameImages,
  tileSize: number,
  origin: { x: number; y: number },
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
      origin.x + tile.x * tileSize,
      origin.y + tile.y * tileSize,
      tile.width * tileSize,
      tile.height * tileSize,
    );
  }
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

  const origin = getMapOrigin(view);
  const tileSize = view.map.tileSize;
  drawTiles(context, view.map.background, images, tileSize, origin);
  drawTiles(context, view.map.streets, images, tileSize, origin);

  for (const unit of view.units) {
    const left = origin.x + unit.render.x * tileSize;
    const top = origin.y + unit.render.y * tileSize;
    const width = unit.render.width * tileSize;
    const height = unit.render.height * tileSize;

    if (unit.selected) {
      context.beginPath();
      context.ellipse(left + width / 2, top + height - 1, width * 0.6, tileSize * 0.2, 0, 0, Math.PI * 2);
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
        origin.x + unit.hitArea.x * tileSize,
        origin.y + unit.hitArea.y * tileSize,
        unit.hitArea.width * tileSize,
        unit.hitArea.height * tileSize,
      );
      context.setLineDash([]);
    }
  }
  context.restore();
}
