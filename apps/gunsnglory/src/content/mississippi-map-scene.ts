import type { MapDecoration, RenderTile } from '../game';

interface MississippiMapSource {
  originalTileGrid: readonly (readonly number[])[];
  map: {
    width: number;
    height: number;
    tileSize: number;
    background: readonly RenderTile[];
    streets: readonly RenderTile[];
  };
}

const railBufferCollision = Object.freeze({ x: 0, y: -3840, width: 7680, height: 7680 });
const commonCactusCollision = Object.freeze({ x: 1920, y: -1228, width: 3840, height: 2534 });
const fortCollision = Object.freeze({ x: -9408, y: -9600, width: 18048, height: 7680 });
const shackCollision = Object.freeze({ x: -3840, y: -1228, width: 15360, height: 3840 });
const canyonImageRemap = [-1, 9, 6, 0, 8, 3, -1, 10, 7, -1, 1, 5, 2, 11, 4, -1] as const;
const waterImageRemap = canyonImageRemap;

const decorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  68: { asset: 'e_1x1_cactus_a', collisionBoxFine: commonCactusCollision },
  69: { asset: 'e_1x1_rocks_a' },
  70: { asset: 'e_1x1_rocks_b' },
  71: { asset: 'e_1x1_tree' },
  73: { asset: 'e_1x1_cactus_b', collisionBoxFine: commonCactusCollision },
  76: { asset: 'e_1x1_bush' },
  74: { asset: 'b_1x1_windmill' },
  75: { asset: 'b_1x1_watertower' },
  86: { asset: 'tiles_railway_buffers_hori_left', collisionBoxFine: railBufferCollision },
  87: { asset: 'tiles_railway_buffers_hori_right', collisionBoxFine: railBufferCollision },
  94: { asset: 'tiles_railway_buffers_verti_up' },
  95: { asset: 'tiles_railway_buffers_verti_down' },
  77: {
    asset: 'e_1x2_bones',
    collisionBoxFine: { x: 0, y: -9600, width: 7680, height: 11520 },
    fieldBlockBounds: { left: 0, right: 0, top: -1, bottom: 0 },
  },
  113: { asset: 'b_3x2_fort', anchorOffsetY: -0.3, collisionBoxFine: fortCollision },
  112: { asset: 'b_3x2_saloon', anchorOffsetY: -0.3 },
  116: {
    asset: 'b_2x1_shack',
    anchorOffsetX: -0.5,
    collisionBoxFine: shackCollision,
    fieldBlockBounds: { left: -1, right: 1, top: 0, bottom: 0 },
  },
  126: {
    asset: 'e_1x1_rocks_water',
    collisionBoxFine: { x: 1920, y: 2612, width: 3840, height: 2534 },
  },
});

function backgroundCodeForTile(tile: RenderTile): number {
  const column = tile.source.x / 32;
  const row = tile.source.y / 32;
  const atlasIndex = (row * 4) + column;

  if (tile.asset === 'tiles_water') return 96;
  if (tile.asset === 'miss_tiles_desert') return 0;
  if (tile.asset === 'miss_tiles_desert_var') return 17 + column;
  if (tile.asset === 'miss_tiles_canyon') {
    const code = canyonImageRemap.indexOf(atlasIndex as typeof canyonImageRemap[number]);
    if (code >= 0) return code;
  }
  if (tile.asset === 'miss_tiles_canyon_wall_var') {
    if (row === 0 && column >= 0 && column <= 2) return 21 + column;
    if (row === 0 && column >= 3 && column <= 5) return 25 + column - 3;
    if (row === 1 && column >= 0 && column <= 2) return 29 + column;
    if (row === 1 && column >= 3 && column <= 5) return 33 + column - 3;
  }
  if (tile.asset === 'tiles_canyon_floor') return 48;
  if (tile.asset === 'tiles_shadow') return 56 + column;
  if (tile.asset === 'tiles_canyon_floor_var' && row === 0 && column >= 0 && column <= 2) {
    return 65 + column;
  }
  if (tile.asset === 'tiles_shadow_var' && row === 0) {
    if (column >= 0 && column <= 2) return 69 + column;
    if (column >= 3 && column <= 5) return 73 + column - 3;
  }
  if (tile.asset === 'miss_tiles_waterside') {
    const variation = waterImageRemap.indexOf(atlasIndex as typeof waterImageRemap[number]);
    if (variation > 0) return 96 + variation;
  }
  if (tile.asset === 'miss_tiles_waterside_var') {
    if (row === 0 && column >= 0 && column <= 2) return 113 + column;
    if (row === 0 && column >= 3 && column <= 5) return 117 + column - 3;
    if (row === 1 && column >= 0 && column <= 2) return 121 + column;
    if (row === 1 && column >= 3 && column <= 5) return 125 + column - 3;
  }
  throw new Error(`Mississippi background tile has no APK collision-code mapping: ${tile.asset} (${tile.source.x},${tile.source.y})`);
}

function createBackgroundCollisionCodes(map: MississippiMapSource['map']): number[][] {
  const codes = Array.from({ length: map.height }, () => Array.from({ length: map.width }, () => -1));
  for (const tile of map.background) {
    const row = codes[tile.y];
    if (!row || tile.x < 0 || tile.x >= map.width || row[tile.x] !== -1) {
      throw new Error(`Mississippi background collision tile is outside or duplicated: (${tile.x},${tile.y})`);
    }
    row[tile.x] = backgroundCodeForTile(tile);
  }
  if (codes.some((row) => row.some((code) => code < 0))) {
    throw new Error('Mississippi background collision grid is incomplete');
  }
  return codes;
}

/** Adds shared Mississippi TDM scenery and APK-derived background collision codes. */
export function createMississippiMapScene(source: MississippiMapSource) {
  const decorations = source.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const decoration = decorationByCode[code];
    return decoration ? [{ ...decoration, cell: { x, y } }] : [];
  }));

  return {
    ...source.map,
    decorations,
    backgroundCollisionCodes: createBackgroundCollisionCodes(source.map),
  };
}
