import type { Direction, EnemyView, GameView, RenderTile, ShotView, UnitView } from '../game';
import { calculateMapViewport, DEFAULT_MAP_CAMERA, mapViewportWithCamera, type MapCamera, type MapViewport } from './map-viewport';

export const GAME_VIEWPORT = Object.freeze({ width: 1024, height: 576 });

const SLEEPING_EFFECT_FRAME = Object.freeze({ width: 24, height: 16, count: 3 });
const MEXICAN_DYNAMITE_FRAME = Object.freeze({ width: 16, height: 16, count: 3 });
const EXPLOSION_FRAME = Object.freeze({ width: 48, height: 52, count: 8 });

export type GameImages = Readonly<Record<string, HTMLImageElement>>;

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  displayPixelScale = Math.max(1, window.devicePixelRatio || 1),
): CanvasRenderingContext2D {
  canvas.width = Math.round(GAME_VIEWPORT.width * displayPixelScale);
  canvas.height = Math.round(GAME_VIEWPORT.height * displayPixelScale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable');
  context.setTransform(displayPixelScale, 0, 0, displayPixelScale, 0, 0);
  context.imageSmoothingEnabled = false;
  return context;
}

export function getMapViewport(
  view: GameView,
  displayPixelScale = 1,
  camera: Readonly<MapCamera> = DEFAULT_MAP_CAMERA,
): MapViewport {
  const baseViewport = calculateMapViewport(
    view.map.width,
    view.map.height,
    GAME_VIEWPORT.width,
    GAME_VIEWPORT.height,
    view.map.tileSize,
    displayPixelScale,
  );
  return mapViewportWithCamera(
    baseViewport,
    view.map.width,
    view.map.height,
    GAME_VIEWPORT.width,
    GAME_VIEWPORT.height,
    camera,
    displayPixelScale,
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
  const vehicle = enemy.type === 4 || enemy.type === 8;
  const turn = enemy.turningAnimation;
  const asset = turn?.asset ?? enemy.asset;
  const image = images[asset];
  if (!image) throw new Error('Missing game image: ' + asset);

  const sourceWidth = vehicle ? 32 : 16;
  const sourceHeight = vehicle ? 40 : 24;
  const tileScale = viewport.scaleFactor;
  const width = sourceWidth * tileScale;
  const height = sourceHeight * tileScale;
  const offset = enemy.drawingOffsetFine ?? { x: 0, y: 0 };
  const centerX = viewport.origin.x + ((enemy.positionFine.x + offset.x) / 240) * tileScale;
  const feetY = viewport.origin.y + ((enemy.positionFine.y + offset.y) / 240) * tileScale;
  const left = centerX - width / 2;
  const top = feetY - height;
  const frameCount = enemy.type === 8 ? 4 : 3;
  const sourceX = turn ? turn.frame * sourceWidth : (enemy.animationFrame % frameCount) * sourceWidth;
  const sourceY = turn ? 0 : spriteRow(enemy.direction) * sourceHeight;

  context.save();
  if (!vehicle && !enemy.alive) context.globalAlpha = Math.max(0.15, enemy.deathRemainingMs / 799);
  const mirrored = turn ? turn.mirrored : enemy.direction === 'west';
  if (mirrored) {
    context.translate((left * 2) + width, 0);
    context.scale(-1, 1);
  }
  if (!vehicle || enemy.alive || enemy.deathRemainingMs > 350) {
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, left, top, width, height);
  }
  context.restore();

  if (!enemy.alive && vehicle && enemy.deathRemainingMs > 0) {
    const smoke = images.sfx_smoke_explosion;
    if (!smoke) throw new Error('Missing game image: sfx_smoke_explosion');
    const smokeWidth = 48 * tileScale;
    const smokeHeight = 64 * tileScale;
    const smokeFrame = Math.max(0, Math.min(7, 7 - Math.floor(enemy.deathRemainingMs / 100)));
    context.drawImage(
      smoke,
      smokeFrame * 48,
      0,
      48,
      64,
      centerX - smokeWidth / 2,
      feetY - smokeHeight,
      smokeWidth,
      smokeHeight,
    );
  }

  if (enemy.hitFlashMs > 0 || !enemy.alive) {
    context.beginPath();
    context.ellipse(centerX, feetY - height * 0.45, width * 0.38, height * 0.34, 0, 0, Math.PI * 2);
    context.strokeStyle = enemy.alive ? '#ffe28a' : '#d85b42';
    context.lineWidth = Math.max(1, 1.5 * tileScale);
    context.stroke();
  }
}

function drawWagonDebris(
  context: CanvasRenderingContext2D,
  view: GameView,
  images: GameImages,
  viewport: MapViewport,
): void {
  const image = images.sfx_exploding_parts;
  for (const part of view.wagonDebris ?? []) {
    if (!image) throw new Error('Missing game image: sfx_exploding_parts');
    const tileScale = viewport.scaleFactor;
    const width = 12 * tileScale;
    const height = 12 * tileScale;
    const centerX = viewport.origin.x + (part.positionFine.x / 240) * tileScale;
    const feetY = viewport.origin.y + ((part.positionFine.y - part.heightFine) / 240) * tileScale;
    context.drawImage(image, part.frame * 12, 0, 12, 12, centerX - width / 2, feetY - height, width, height);
  }
}

function drawShot(
  context: CanvasRenderingContext2D,
  shot: ShotView,
  images: GameImages,
  viewport: MapViewport,
): void {
  const tileScale = viewport.scaleFactor;
  const x = viewport.origin.x + (shot.positionFine.x / 240) * tileScale;
  const y = viewport.origin.y + (shot.positionFine.y / 240) * tileScale;
  if (shot.imageAsset) {
    if (shot.explosionRemainingMs !== undefined) {
      const image = images.sfx_explosion;
      if (!image) throw new Error('Missing game image: sfx_explosion');
      const frame = Math.min(EXPLOSION_FRAME.count - 1, Math.max(0, shot.animationFrame));
      const width = EXPLOSION_FRAME.width * tileScale;
      const height = EXPLOSION_FRAME.height * tileScale;
      context.drawImage(
        image,
        frame * EXPLOSION_FRAME.width,
        0,
        EXPLOSION_FRAME.width,
        EXPLOSION_FRAME.height,
        x - width / 2,
        y - height,
        width,
        height,
      );
      return;
    }

    const image = images[shot.imageAsset];
    if (!image) throw new Error('Missing game image: ' + shot.imageAsset);
    const frame = Math.min(MEXICAN_DYNAMITE_FRAME.count - 1, Math.max(0, shot.animationFrame));
    const width = MEXICAN_DYNAMITE_FRAME.width * tileScale;
    const height = MEXICAN_DYNAMITE_FRAME.height * tileScale;
    context.drawImage(
      image,
      frame * MEXICAN_DYNAMITE_FRAME.width,
      0,
      MEXICAN_DYNAMITE_FRAME.width,
      MEXICAN_DYNAMITE_FRAME.height,
      x - width / 2,
      y - height / 2,
      width,
      height,
    );
    return;
  }

  context.beginPath();
  context.arc(x, y, Math.max(1.5, 2.2 * tileScale), 0, Math.PI * 2);
  context.fillStyle = '#8f2118';
  context.fill();
  context.strokeStyle = '#f5cf79';
  context.lineWidth = Math.max(1, tileScale);
  context.stroke();
}

function drawInspectionLabel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  viewport: MapViewport,
  color: string,
): void {
  const fontSize = Math.max(8, 9 * viewport.scaleFactor);
  const padding = Math.max(2, 3 * viewport.scaleFactor);
  context.font = `${fontSize}px ui-monospace, monospace`;
  const width = context.measureText(text).width + padding * 2;
  const height = fontSize + padding * 2;
  const labelX = Math.max(
    viewport.origin.x + (width / 2),
    Math.min(x, viewport.origin.x + viewport.mapWidth - (width / 2)),
  );
  const labelTop = Math.max(
    viewport.origin.y,
    Math.min(y - height, viewport.origin.y + viewport.mapHeight - height),
  );
  context.fillStyle = 'rgba(20, 15, 10, 0.92)';
  context.fillRect(labelX - width / 2, labelTop, width, height);
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, labelX, labelTop + height / 2);
}

function drawInspectionOverlay(
  context: CanvasRenderingContext2D,
  view: GameView,
  viewport: MapViewport,
  language: 'en' | 'zh',
): void {
  const toScreen = (x: number, y: number) => ({
    x: viewport.origin.x + x * viewport.tileSize,
    y: viewport.origin.y + y * viewport.tileSize,
  });

  if (view.route && view.route.length > 1) {
    context.beginPath();
    view.route.forEach((point, index) => {
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
    for (const [index, point] of view.route.entries()) {
      const screen = toScreen(point.x, point.y);
      context.beginPath();
      context.arc(screen.x, screen.y, Math.max(2, 2.5 * viewport.scaleFactor), 0, Math.PI * 2);
      context.fillStyle = index === view.route.length - 1 ? '#f17b56' : '#45e0d2';
      context.fill();
    }
  }

  for (const unit of view.units) drawUnitInspection(context, unit, viewport, toScreen, language);
  for (const enemy of view.enemies) {
    const logical = { x: enemy.positionFine.x / 7680, y: enemy.positionFine.y / 7680 };
    const screen = toScreen(logical.x, logical.y);
    drawInspectionLabel(
      context,
      screen.x,
      screen.y - 24 * viewport.scaleFactor,
      language === 'zh'
        ? `拓荒者生命 ${enemy.hitPoints}/${enemy.maxHitPoints}`
        : `Pioneer HP ${enemy.hitPoints}/${enemy.maxHitPoints}`,
      viewport,
      enemy.alive ? '#ffe28a' : '#ef9b84',
    );
  }
}

function drawUnitInspection(
  context: CanvasRenderingContext2D,
  unit: UnitView,
  viewport: MapViewport,
  toScreen: (x: number, y: number) => { x: number; y: number },
  language: 'en' | 'zh',
): void {
  const attackRange = unit.attackRange;
  if (attackRange && attackRange.maximumTenthTiles > 0) {
    const center = toScreen(
      attackRange.centerTenthTiles.x / 10,
      attackRange.centerTenthTiles.y / 10,
    );
    context.beginPath();
    context.arc(center.x, center.y, (attackRange.maximumTenthTiles / 10) * viewport.tileSize, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(255, 216, 91, 0.9)';
    context.lineWidth = Math.max(1, 1.5 * viewport.scaleFactor);
    context.setLineDash([4 * viewport.scaleFactor, 3 * viewport.scaleFactor]);
    context.stroke();
    context.setLineDash([]);
  }

  const spriteX = viewport.origin.x + (unit.render.x + unit.render.width / 2) * viewport.tileSize;
  const spriteY = viewport.origin.y + unit.render.y * viewport.tileSize;
  const rangeLabel = !attackRange ? '' : language === 'zh'
    ? ` · 射程 ${attackRange.boundary === 'exclusive' ? '<' : '≤'} ${(attackRange.maximumTenthTiles / 10).toFixed(1)}`
    : ` · R ${attackRange.boundary === 'exclusive' ? '<' : '≤'} ${(attackRange.maximumTenthTiles / 10).toFixed(1)}`;
  drawInspectionLabel(
    context,
    spriteX,
    spriteY,
    `${language === 'zh' ? '单位' : 'Unit'} ${unit.type}${rangeLabel}`,
    viewport,
    '#a9e8ff',
  );
}

export function drawGame(
  context: CanvasRenderingContext2D,
  view: GameView,
  images: GameImages,
  displayPixelScale = 1,
  camera: Readonly<MapCamera> = DEFAULT_MAP_CAMERA,
  showInspectionOverlay = false,
  language: 'en' | 'zh' = 'en',
): void {
  context.save();
  context.clearRect(0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
  context.fillStyle = '#1a1712';
  context.fillRect(0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height);

  const viewport = getMapViewport(view, displayPixelScale, camera);
  context.beginPath();
  context.rect(0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
  context.clip();
  context.beginPath();
  context.rect(viewport.origin.x, viewport.origin.y, viewport.mapWidth, viewport.mapHeight);
  context.clip();
  drawTiles(context, view.map.background, images, viewport);
  for (const enemy of view.enemies) drawEnemy(context, enemy, images, viewport);
  drawTiles(context, view.map.streets, images, viewport);
  for (const shot of view.shots) drawShot(context, shot, images, viewport);
  drawWagonDebris(context, view, images, viewport);

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

    const firing = unit.shootingAnimation;
    const asset = firing?.asset ?? unit.asset;
    const image = images[asset];
    if (!image) throw new Error('Missing game image: ' + asset);
    const frame = firing
      ? { x: firing.frame * unit.frame.width, y: firing.row * unit.frame.height, width: unit.frame.width, height: unit.frame.height }
      : unit.frame;
    context.save();
    if (firing?.mirrored) {
      context.translate(left * 2 + width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(image, frame.x, frame.y, frame.width, frame.height, left, top, width, height);
    context.restore();

    if (unit.activity === 4) {
      const effectImage = images.sfx_sleeping;
      if (!effectImage) throw new Error('Missing game image: sfx_sleeping');
      const animationFrame = Math.max(0, Math.trunc(unit.sleepingAnimationFrame ?? 0)) % SLEEPING_EFFECT_FRAME.count;
      const feetX = viewport.origin.x + (unit.positionFine.x / 240) * viewport.scaleFactor;
      const feetY = viewport.origin.y + (unit.positionFine.y / 240) * viewport.scaleFactor;
      const effectScale = viewport.scaleFactor;
      const effectWidth = SLEEPING_EFFECT_FRAME.width * effectScale;
      const effectHeight = SLEEPING_EFFECT_FRAME.height * effectScale;
      context.drawImage(
        effectImage,
        animationFrame * SLEEPING_EFFECT_FRAME.width,
        0,
        SLEEPING_EFFECT_FRAME.width,
        SLEEPING_EFFECT_FRAME.height,
        feetX - effectWidth / 2,
        feetY - (32 * effectScale) - effectHeight,
        effectWidth,
        effectHeight,
      );
    }

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

  if (showInspectionOverlay) drawInspectionOverlay(context, view, viewport, language);

  context.restore();
}
