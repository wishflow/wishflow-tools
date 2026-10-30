import type { Direction, EnemyView, GameView, MapDecoration, RenderTile, ShotView, UnitView, WagonDebrisView } from '../game';
import { GAME_DRAW_ORDER_ROAD_CUTOFF } from '../game/draw-order';
import { calculateMapViewport, DEFAULT_MAP_CAMERA, mapViewportWithCamera, type MapCamera, type MapViewport } from './map-viewport';

export const GAME_VIEWPORT = Object.freeze({ width: 1024, height: 576 });

const FINE_UNITS_PER_CELL = 7680;
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

export interface MapDecorationDestination {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function mapDecorationDestination(
  decoration: MapDecoration,
  imageSize: { width: number; height: number },
  viewport: MapViewport,
): MapDecorationDestination {
  const width = imageSize.width * viewport.scaleFactor;
  const height = imageSize.height * viewport.scaleFactor;
  const centerX = viewport.origin.x + (decoration.cell.x + 0.5 + (decoration.anchorOffsetX ?? 0)) * viewport.tileSize;
  const feetY = viewport.origin.y + (decoration.cell.y + 1) * viewport.tileSize;
  const x = Math.trunc(centerX - width / 2);
  const y = Math.trunc(feetY - height);
  return {
    x,
    y,
    width: Math.trunc(x + width) - x,
    height: Math.trunc(y + height) - y,
  };
}

function drawMapDecoration(
  context: CanvasRenderingContext2D,
  decoration: MapDecoration,
  images: GameImages,
  viewport: MapViewport,
): void {
  const image = images[decoration.asset];
  if (!image) throw new Error('Missing game image: ' + decoration.asset);
  const destination = mapDecorationDestination(
    decoration,
    { width: image.naturalWidth, height: image.naturalHeight },
    viewport,
  );
  context.drawImage(image, destination.x, destination.y, destination.width, destination.height);
}

function drawUnit(
  context: CanvasRenderingContext2D,
  unit: UnitView,
  images: GameImages,
  viewport: MapViewport,
): void {
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

type DrawObjectKind = 'decoration' | 'unit' | 'enemy' | 'shot' | 'wagon-debris';

interface DrawObject {
  id: string;
  kind: DrawObjectKind;
  depth: number;
  cell?: { x: number; y: number };
  draw: () => void;
}

function createDrawObjects(
  context: CanvasRenderingContext2D,
  view: GameView,
  images: GameImages,
  viewport: MapViewport,
): DrawObject[] {
  const decorations = (view.map.decorations ?? []).map((decoration, index): DrawObject => ({
    id: `decoration:${index}`,
    kind: 'decoration',
    cell: decoration.cell,
    depth: ((decoration.cell.y + 1) * FINE_UNITS_PER_CELL) + GAME_DRAW_ORDER_ROAD_CUTOFF,
    draw: () => drawMapDecoration(context, decoration, images, viewport),
  }));
  const units = view.units.map((unit): DrawObject => ({
    id: `unit:${unit.id}`,
    kind: 'unit',
    cell: unit.cell,
    depth: unit.positionFine.y + GAME_DRAW_ORDER_ROAD_CUTOFF,
    draw: () => drawUnit(context, unit, images, viewport),
  }));
  const enemies = view.enemies.map((enemy): DrawObject => ({
    id: `enemy:${enemy.id}`,
    kind: 'enemy',
    depth: enemy.positionFine.y + (enemy.drawingOffsetFine?.y ?? 0),
    draw: () => drawEnemy(context, enemy, images, viewport),
  }));
  const shots = view.shots.map((shot): DrawObject => ({
    id: `shot:${shot.id}`,
    kind: 'shot',
    depth: shot.positionFine.y + (shot.fineZ * 100),
    draw: () => drawShot(context, shot, images, viewport),
  }));
  const wagonDebris = (view.wagonDebris ?? []).map((part): DrawObject => ({
    id: `wagon-debris:${part.id}`,
    kind: 'wagon-debris',
    depth: part.depthFineY + GAME_DRAW_ORDER_ROAD_CUTOFF,
    draw: () => drawWagonDebrisPart(context, part, images, viewport),
  }));

  const mapObjects = [...decorations, ...units].sort((left, right) => (
    left.cell!.y - right.cell!.y || left.cell!.x - right.cell!.x
  ));
  return [...mapObjects, ...enemies, ...shots, ...wagonDebris];
}

function drawWorldObjects(
  orderedIds: readonly string[],
  objects: readonly DrawObject[],
  belowRoad: boolean,
): void {
  const objectsById = new Map(objects.map((object) => [object.id, object] as const));
  for (const id of orderedIds) {
    const object = objectsById.get(id);
    if (!object || (object.depth < GAME_DRAW_ORDER_ROAD_CUTOFF) !== belowRoad) continue;
    object.draw();
  }
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

function drawEnemyHealthBar(
  context: CanvasRenderingContext2D,
  enemy: EnemyView,
  centerX: number,
  feetY: number,
  viewport: MapViewport,
): void {
  if (enemy.type <= 2 || !enemy.alive || enemy.hitPoints <= 0
    || enemy.maxHitPoints <= 0 || enemy.hitPoints >= Math.trunc((enemy.maxHitPoints * 95) / 100)) return;

  // The APK uses scale=6 and 48 native pixels per tile; game assets here use 32.
  const nativeScale = viewport.tileSize / 48;
  const barWidth = 36 * nativeScale;
  const barHeight = (12 * nativeScale) - (nativeScale < 1 ? 1 : 0);
  const nativeTileHalf = Math.trunc(viewport.tileSize / 2) * 3;
  const barTop = feetY - (6 * nativeScale) - nativeTileHalf;

  context.fillStyle = '#3f0000';
  context.fillRect(centerX - (barWidth / 2), barTop, barWidth, barHeight);

  const sourceWidth = Math.trunc(
    Math.trunc(Math.fround((enemy.hitPoints * 10 * 6) * nativeScale)) / (enemy.maxHitPoints * 2),
  );
  const fillTop = feetY - (3 * nativeScale) - nativeTileHalf;
  const fillHeight = 6 * nativeScale;
  const red = Math.trunc(Math.fround(
    Math.fround((enemy.maxHitPoints - enemy.hitPoints) * 255) / enemy.maxHitPoints,
  ));
  const green = Math.trunc(Math.fround(Math.fround(enemy.hitPoints * 255) / enemy.maxHitPoints));
  context.fillStyle = `rgb(${red}, ${green}, 0)`;
  context.fillRect(centerX - (15 * nativeScale), fillTop, sourceWidth, fillHeight);
}

function drawEnemy(
  context: CanvasRenderingContext2D,
  enemy: EnemyView,
  images: GameImages,
  viewport: MapViewport,
): void {
  const vehicle = enemy.type === 4 || enemy.type === 8;
  const turn = enemy.turningAnimation;
  const deathFrame = !enemy.alive && (enemy.type === 1 || enemy.type === 2)
    ? Math.max(0, Math.min(5, 5 - Math.floor(enemy.deathRemainingMs / 100)))
    : undefined;
  const asset = deathFrame === undefined ? turn?.asset ?? enemy.asset : 'sfx_death_pioneers';
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
  const sourceX = deathFrame !== undefined
    ? deathFrame * sourceWidth
    : turn ? turn.frame * sourceWidth : (enemy.animationFrame % frameCount) * sourceWidth;
  const sourceY = deathFrame !== undefined || turn ? 0 : spriteRow(enemy.direction) * sourceHeight;

  context.save();
  if (!vehicle && !enemy.alive && deathFrame === undefined) {
    context.globalAlpha = Math.max(0.15, enemy.deathRemainingMs / 799);
  }
  const mirrored = turn && deathFrame === undefined ? turn.mirrored : enemy.direction === 'west';
  if (mirrored) {
    context.translate((left * 2) + width, 0);
    context.scale(-1, 1);
  }
  if (!vehicle || enemy.alive || enemy.deathRemainingMs > 350) {
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, left, top, width, height);
  }
  context.restore();

  drawEnemyHealthBar(context, enemy, centerX, feetY, viewport);

  if (!enemy.alive && vehicle && enemy.deathRemainingMs >= 0) {
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
}

function drawWagonDebrisPart(
  context: CanvasRenderingContext2D,
  part: WagonDebrisView,
  images: GameImages,
  viewport: MapViewport,
): void {
  const image = images.sfx_exploding_parts;
  if (!image) throw new Error('Missing game image: sfx_exploding_parts');
  const tileScale = viewport.scaleFactor;
  const width = 12 * tileScale;
  const height = 12 * tileScale;
  const centerX = viewport.origin.x + (part.positionFine.x / 240) * tileScale;
  const feetY = viewport.origin.y + ((part.positionFine.y - part.heightFine) / 240) * tileScale;
  context.drawImage(image, part.frame * 12, 0, 12, 12, centerX - width / 2, feetY - height, width, height);
}

function drawShot(
  context: CanvasRenderingContext2D,
  shot: ShotView,
  images: GameImages,
  viewport: MapViewport,
): void {
  const tileScale = viewport.scaleFactor;
  const x = viewport.origin.x + (shot.positionFine.x / 240) * tileScale;
  const y = viewport.origin.y + ((shot.positionFine.y - shot.heightFine) / 240) * tileScale;
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
      y - height,
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
    const logical = { x: enemy.positionFine.x / FINE_UNITS_PER_CELL, y: enemy.positionFine.y / FINE_UNITS_PER_CELL };
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

const HUD_TOP = { width: 480, height: 67 } as const;
const HUD_TOP_END = { width: 30, height: 67 } as const;
const HUD_PAUSE = { x: 5, y: 0, width: 74, height: 49 } as const;
const HUD_MINIMAP = { x: 174, y: 2, width: 66, height: 50 } as const;
const HUD_MINIMAP_REFERENCE_COLUMNS = 32;
const HUD_MINIMAP_REFERENCE_ROWS = 24;

function requiredImage(images: GameImages, asset: string): HTMLImageElement {
  const image = images[asset];
  if (!image) throw new Error('Missing game image: ' + asset);
  return image;
}

function hudNumber(value: number, padded: boolean): string {
  const number = String(Math.max(0, Math.trunc(value)));
  return padded ? number.padStart(2, '0') : number;
}

function drawHudNumber(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  value: string,
  bounds: { x: number; y: number; width: number; height: number },
  align: 'center' | 'right',
): void {
  const glyphWidth = image.width / 10;
  const glyphHeight = image.height;
  const textWidth = glyphWidth * value.length;
  const startX = align === 'right'
    ? bounds.x + bounds.width - textWidth
    : bounds.x + (bounds.width - textWidth) / 2;
  const y = bounds.y + (bounds.height - glyphHeight) / 2;

  for (const [index, character] of [...value].entries()) {
    const digit = Number(character);
    context.drawImage(
      image,
      digit * glyphWidth,
      0,
      glyphWidth,
      glyphHeight,
      startX + index * glyphWidth,
      y,
      glyphWidth,
      glyphHeight,
    );
  }
}

function minimapTerrainColor(tile: number, tileAbove?: number): string {
  if (tile >= 120 && tile <= 126) return '#609db3';
  if (tile >= 160 && tile < 164) return '#8bcfe5';
  if (tile === 32 || tile === 48 || tile === 80 || tile === 81 || tile === 110
    || (tile >= 40 && tile <= 46) || (tile >= 52 && tile <= 66)
    || ((tile === 88 || tile === 89) && (tileAbove === 88 || tileAbove === 89))) {
    return '#bc8156';
  }
  if (tile === 0 || tile === 36 || (tile >= 16 && tile <= 35)) return '#fbd19f';
  // BackgroundMap maps unrecognized BasicMap values to desert before it applies terrain variations.
  return '#fbd19f';
}

function drawHudOutline(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.lineWidth = 1;
  context.strokeStyle = '#fff';
  context.strokeRect(x + 0.5, y + 0.5, width, height);
  context.strokeStyle = '#000';
  context.strokeRect(x + 1.5, y + 1.5, Math.max(0, width - 2), Math.max(0, height - 2));
}

function drawHudMinimap(
  context: CanvasRenderingContext2D,
  view: GameView,
  viewport: MapViewport,
): void {
  const { width: panelWidth, height: panelHeight } = HUD_MINIMAP;
  const pixelSize = Math.min(
    Math.floor(panelWidth / HUD_MINIMAP_REFERENCE_COLUMNS),
    Math.max(Math.floor(panelHeight / HUD_MINIMAP_REFERENCE_ROWS), 1),
  );
  const mapWidth = view.map.width * pixelSize;
  const mapHeight = view.map.height * pixelSize;
  const panelX = GAME_VIEWPORT.width / 2 + HUD_MINIMAP.x;
  const panelY = HUD_MINIMAP.y;
  const mapX = panelX + Math.floor((panelWidth - mapWidth) / 2);
  const mapY = panelY + Math.floor((panelHeight - mapHeight) / 2);
  const terrain = view.map.originalTileGrid;

  if (terrain) {
    for (let y = 0; y < Math.min(view.map.height, terrain.length); y += 1) {
      const row = terrain[y];
      if (!row) continue;
      for (let x = 0; x < Math.min(view.map.width, row.length); x += 1) {
        context.fillStyle = minimapTerrainColor(row[x] ?? 0, y > 0 ? terrain[y - 1]?.[x] : undefined);
        context.fillRect(mapX + x * pixelSize, mapY + y * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  context.fillStyle = '#f2b780';
  for (const street of view.map.streets) {
    const startX = Math.max(0, Math.floor(street.x));
    const startY = Math.max(0, Math.floor(street.y));
    const endX = Math.min(view.map.width, Math.ceil(street.x + street.width));
    const endY = Math.min(view.map.height, Math.ceil(street.y + street.height));
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        context.fillRect(mapX + x * pixelSize, mapY + y * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  for (const enemy of view.enemies) {
    const x = enemy.positionFine.x / FINE_UNITS_PER_CELL;
    const y = enemy.positionFine.y / FINE_UNITS_PER_CELL;
    if (x < 0 || y < 0 || x >= view.map.width || y >= view.map.height) continue;
    context.fillStyle = '#fff';
    context.fillRect(mapX + Math.floor(x) * pixelSize, mapY + Math.floor(y) * pixelSize, pixelSize, pixelSize);
  }

  for (const unit of view.units) {
    const x = unit.positionFine.x / FINE_UNITS_PER_CELL;
    const y = unit.positionFine.y / FINE_UNITS_PER_CELL;
    if (x < 0 || y < 0 || x >= view.map.width || y >= view.map.height) continue;
    context.fillStyle = unit.activity === 5 ? '#f00' : '#000';
    context.fillRect(mapX + Math.floor(x) * pixelSize, mapY + Math.floor(y) * pixelSize, pixelSize, pixelSize);
  }

  const left = mapX + (Math.max(0, Math.min(viewport.mapWidth, -viewport.origin.x)) / viewport.mapWidth) * mapWidth;
  const top = mapY + (Math.max(0, Math.min(viewport.mapHeight, -viewport.origin.y)) / viewport.mapHeight) * mapHeight;
  const right = mapX + (Math.max(0, Math.min(viewport.mapWidth, GAME_VIEWPORT.width - viewport.origin.x)) / viewport.mapWidth) * mapWidth;
  const bottom = mapY + (Math.max(0, Math.min(viewport.mapHeight, GAME_VIEWPORT.height - viewport.origin.y)) / viewport.mapHeight) * mapHeight;
  drawHudOutline(context, left, top, Math.max(2, right - left), Math.max(2, bottom - top));
}

function drawGameHud(
  context: CanvasRenderingContext2D,
  view: GameView,
  images: GameImages,
  viewport: MapViewport,
): void {
  const wave = view.wave;
  if (!wave) return;

  context.save();
  context.beginPath();
  context.rect(0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
  context.clip();

  const left = (GAME_VIEWPORT.width - HUD_TOP.width) / 2;
  context.drawImage(requiredImage(images, 'gng_hud_0_top_left'), left - HUD_TOP_END.width, 0, HUD_TOP_END.width, HUD_TOP_END.height);
  context.drawImage(requiredImage(images, 'gng_hud_0_top'), left, 0, HUD_TOP.width, HUD_TOP.height);
  context.drawImage(requiredImage(images, 'gng_hud_0_top_right'), left + HUD_TOP.width, 0, HUD_TOP_END.width, HUD_TOP_END.height);
  context.drawImage(
    requiredImage(images, view.paused ? 'gng_hud_1_top_pause_pressed' : 'gng_hud_1_top_pause'),
    left + HUD_PAUSE.x,
    HUD_PAUSE.y,
    HUD_PAUSE.width,
    HUD_PAUSE.height,
  );

  const numberFont = requiredImage(images, 'hud_font_numbers_scaled');
  const starBackground = requiredImage(images, 'gng_hud_1_top_star_0');
  const starFill = requiredImage(images, 'gng_hud_1_top_star');
  const starArea = { x: GAME_VIEWPORT.width / 2 - 39, y: 0, width: 78, height: 74 };
  const starX = starArea.x + (starArea.width - starBackground.width) / 2;
  const starY = starArea.y + (starArea.height - starBackground.height) / 2;
  context.drawImage(starBackground, starX, starY, starBackground.width, starBackground.height);
  const maxLives = Math.max(1, wave.maxLives ?? 50);
  const livesRemaining = Math.max(0, Math.min(maxLives, wave.lives));
  const starSourceY = Math.floor(starFill.height * livesRemaining / maxLives);
  if (starSourceY < starFill.height) {
    context.drawImage(
      starFill,
      0,
      starSourceY,
      starFill.width,
      starFill.height - starSourceY,
      starX,
      starY + starSourceY,
      starFill.width,
      starFill.height - starSourceY,
    );
  }

  drawHudNumber(context, numberFont, hudNumber(wave.cash, false), { x: left + 136, y: 6, width: 48, height: 24 }, 'right');
  drawHudNumber(context, numberFont, hudNumber(wave.number, true), { x: left + 292, y: 6, width: 24, height: 24 }, 'center');
  drawHudNumber(context, numberFont, hudNumber(wave.totalWaves ?? 1, true), { x: left + 326, y: 6, width: 24, height: 24 }, 'center');
  drawHudNumber(context, numberFont, hudNumber(wave.lives, true), starArea, 'center');
  drawHudMinimap(context, view, viewport);
  context.restore();
}

export type GameHudPointerAction = 'pause' | 'covered';

export function gameHudPointerActionAt(x: number, y: number): GameHudPointerAction | undefined {
  const left = (GAME_VIEWPORT.width - HUD_TOP.width) / 2;
  const hudLeft = left - HUD_TOP_END.width;
  const hudRight = left + HUD_TOP.width + HUD_TOP_END.width;
  if (x < hudLeft || x >= hudRight || y < 0 || y >= HUD_TOP.height) return undefined;
  if (x >= left + HUD_PAUSE.x && x < left + HUD_PAUSE.x + HUD_PAUSE.width
    && y < HUD_PAUSE.y + HUD_PAUSE.height) return 'pause';
  return 'covered';
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
  const drawObjects = createDrawObjects(context, view, images, viewport);
  const orderedDrawObjects = view.drawOrder;
  context.beginPath();
  context.rect(0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
  context.clip();
  context.save();
  context.beginPath();
  context.rect(viewport.origin.x, viewport.origin.y, viewport.mapWidth, viewport.mapHeight);
  context.clip();
  drawTiles(context, view.map.background, images, viewport);
  drawWorldObjects(orderedDrawObjects, drawObjects, true);
  drawTiles(context, view.map.streets, images, viewport);
  context.restore();
  drawWorldObjects(orderedDrawObjects, drawObjects, false);

  if (showInspectionOverlay) drawInspectionOverlay(context, view, viewport, language);

  context.restore();
  drawGameHud(context, view, images, viewport);
}
