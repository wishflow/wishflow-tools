import type { RenderTile } from '../../src/game';

interface CowGulchSource {
  originalTileGrid: number[][];
  map: {
    width: number;
    height: number;
    tileSize: number;
    background: RenderTile[];
    streets: RenderTile[];
  };
}

const CANYON_IMAGE_REMAP = [-1, 9, 6, 0, 8, 3, -1, 10, 7, -1, 1, 5, 2, 11, 4, -1];
const WATER_IMAGE_REMAP = [...CANYON_IMAGE_REMAP];
const STREET_IMAGE_REMAP = [7, 10, 8, 4, 9, 2, 1, 15, 11, 3, 0, 13, 5, 12, 14, 6];
// Android Util.random delegates to java.util.Random.nextInt; this fixed seed stabilizes the web fixture.
const VARIATION_SEED = 0x47524e31;
const JAVA_RANDOM_MULTIPLIER = 0x5deece66n;
const JAVA_RANDOM_ADDEND = 0xbn;
const JAVA_RANDOM_MASK = (1n << 48n) - 1n;

class SeededJavaRandom {
  private seed: bigint;

  constructor(seed: number) {
    this.seed = (BigInt(seed) ^ JAVA_RANDOM_MULTIPLIER) & JAVA_RANDOM_MASK;
  }

  private next(bits: number): number {
    this.seed = (this.seed * JAVA_RANDOM_MULTIPLIER + JAVA_RANDOM_ADDEND) & JAVA_RANDOM_MASK;
    return Number(this.seed >> BigInt(48 - bits));
  }

  nextInt(bound: number): number {
    if (!Number.isInteger(bound) || bound <= 0) throw new RangeError('Random bound must be a positive integer');
    if ((bound & -bound) === bound) return Math.floor((bound * this.next(31)) / 0x80000000);
    while (true) {
      const bits = this.next(31);
      const value = bits % bound;
      if (bits - value + (bound - 1) < 0x80000000) return value;
    }
  }
}

function overlayValue(
  grid: number[][],
  x: number,
  y: number,
  currentRange: readonly [number, number],
  neighborRange: readonly [number, number],
): number {
  const [currentMin, currentMax] = currentRange;
  const [neighborMin, neighborMax] = neighborRange;
  const current = grid[y]?.[x];
  if (current === undefined || current < currentMin || current > currentMax) return 0;

  let mask = 0;
  const neighbors = [
    [x, y - 1, 1], [x, y + 1, 2], [x - 1, y, 4], [x + 1, y, 8],
    [x + 1, y - 1, 16], [x + 1, y + 1, 32], [x - 1, y + 1, 64], [x - 1, y - 1, 128],
  ] as const;

  for (const [neighborX, neighborY, bit] of neighbors) {
    const neighbor = grid[neighborY]?.[neighborX];
    if (neighbor !== undefined && neighbor >= neighborMin && neighbor <= neighborMax) mask |= bit;
  }

  return mask;
}

function shapeIndex(mask: number): number {
  const west = (mask & 4) === 4 || (mask & 128) === 128 || (mask & 1) === 1;
  const northEast = (mask & 1) === 1 || (mask & 16) === 16 || (mask & 8) === 8;
  const southEast = (mask & 8) === 8 || (mask & 32) === 32 || (mask & 2) === 2;
  const southWest = (mask & 2) === 2 || (mask & 64) === 64 || (mask & 4) === 4;

  return Number(west) + (Number(northEast) * 2) + (Number(southWest) * 4) + (Number(southEast) * 8);
}

function applyBackgroundVariations(grid: number[][], random: SeededJavaRandom): void {
  const variationStart = new Map([
    [0, 16], [48, 64], [12, 20], [5, 24], [3, 28], [10, 32],
    [56, 68], [57, 72], [108, 112], [101, 116], [99, 120], [106, 124],
  ]);

  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
      const tile = grid[y]![x]!;
      if (tile === 160) {
        grid[y]![x] = 160 + random.nextInt(3);
        continue;
      }

      const variationBase = variationStart.get(tile);
      if (variationBase === undefined) continue;
      const choice = random.nextInt(4);
      grid[y]![x] = choice === 0 ? tile : variationBase + choice;
    }
  }
}

function deriveOriginalBackgroundCodes(content: CowGulchSource, random: SeededJavaRandom): number[][] {
  const raw = content.originalTileGrid;
  const height = raw.length;
  const width = raw[0]?.length ?? 0;
  const background: number[][] = raw.map((row, y) => row.map((tile, x) => {
    if ([32, 48, 80, 81, 110].includes(tile) || (tile >= 40 && tile <= 46) || (tile >= 52 && tile <= 66)) return 48;
    if (tile === 160) return 160;
    if (tile === 88 || tile === 89) return y > 0 && [88, 89].includes(raw[y - 1]?.[x] ?? -1) ? 48 : 0;
    if (tile >= 120 && tile <= 126) return 96;
    return 0;
  }));

  // These passes preserve Android's in-place scan order from BackgroundMap.shapenBackgroundMap.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = shapeIndex(overlayValue(background, x, y, [0, 15], [48, 91]));
      if (CANYON_IMAGE_REMAP[index]! >= 0) background[y]![x] = index;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const mask = overlayValue(background, x, y, [48, 95], [0, 15]);
      const maskedNorthWest = mask & 0x91;
      let index = [0x81, 0x11, 0x91].includes(maskedNorthWest) ? 0 : -1;
      if ([0x28, 0x18, 0x38].includes(mask & 0x38)) index = 1;
      const shape = mask & 0x19;
      if (shape === 0x10 && x > 0) index = 5;
      if (shape === 0x01 && x < width - 1) index = 6;
      if ((mask & 0x95) === 0x95) index = 2;
      if (shape === 0x19) index = 3;
      if ((mask & 0x18) === 0x08 && y > 0) index = 4;
      if (index >= 0) background[y]![x] = index + 56;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = shapeIndex(overlayValue(background, x, y, [0, 15], [96, 96]));
      if (WATER_IMAGE_REMAP[index]! >= 0) background[y]![x] = index + 96;
    }
  }

  applyBackgroundVariations(background, random);
  return background;
}

function backgroundAsset(value: number): string {
  if (value === 0) return 'tiles_desert';
  if (value > 0 && value < 16) return 'tiles_canyon';
  if (value >= 17 && value < 20) return 'tiles_desert_var';
  if ((value >= 21 && value < 24) || (value >= 25 && value < 28) || (value >= 29 && value < 32) || (value >= 33 && value < 36)) return 'tiles_canyon_wall_var';
  if (value >= 48 && value < 56) return 'tiles_canyon_floor';
  if (value >= 56 && value < 64) return 'tiles_shadow';
  if (value >= 65 && value < 68) return 'tiles_canyon_floor_var';
  if ((value >= 69 && value < 72) || (value >= 73 && value < 76)) return 'tiles_shadow_var';
  if (value === 96) return 'tiles_water';
  if (value >= 97 && value < 112) return 'tiles_waterside';
  if ((value >= 113 && value < 116) || (value >= 117 && value < 120) || (value >= 121 && value < 124) || (value >= 125 && value < 128)) return 'tiles_waterside_var';
  throw new Error('Unsupported Android background tile code ' + value);
}

function backgroundSource(value: number): { x: number; y: number } {
  if (value === 0 || value === 48 || value === 96) return { x: 0, y: 0 };
  if (value > 0 && value < 16) {
    const index = CANYON_IMAGE_REMAP[value]!;
    return { x: (index % 4) * 32, y: Math.floor(index / 4) * 32 };
  }
  if (value >= 17 && value < 20) return { x: (value - 17) * 32, y: 0 };
  if (value >= 21 && value < 24) return { x: (value - 21) * 32, y: 0 };
  if (value >= 25 && value < 28) return { x: (value - 22) * 32, y: 0 };
  if (value >= 29 && value < 32) return { x: (value - 29) * 32, y: 32 };
  if (value >= 33 && value < 36) return { x: (value - 30) * 32, y: 32 };
  if (value >= 56 && value < 64) return { x: (value - 56) * 32, y: 0 };
  if (value >= 65 && value < 68) return { x: (value - 65) * 32, y: 0 };
  if (value >= 69 && value < 72) return { x: (value - 69) * 32, y: 0 };
  if (value >= 73 && value < 76) return { x: (value - 70) * 32, y: 0 };
  if (value >= 97 && value < 112) {
    const index = WATER_IMAGE_REMAP[value - 96]!;
    return { x: (index % 4) * 32, y: Math.floor(index / 4) * 32 };
  }
  if (value >= 113 && value < 116) return { x: (value - 113) * 32, y: 0 };
  if (value >= 117 && value < 120) return { x: (value - 114) * 32, y: 0 };
  if (value >= 121 && value < 124) return { x: (value - 121) * 32, y: 32 };
  if (value >= 125 && value < 128) return { x: (value - 122) * 32, y: 32 };
  throw new Error('Unsupported Android background tile code ' + value);
}

function basePathCode(tile: RenderTile): number {
  if (tile.asset === 'tiles_path_var') return tile.source.x < 96 ? 19 : 28;
  if (tile.asset !== 'tiles_path') throw new Error('Expected a path tile');
  const atlasIndex = ((tile.source.y / 32) * 4) + (tile.source.x / 32);
  const remapIndex = STREET_IMAGE_REMAP.indexOf(atlasIndex);
  if (remapIndex < 0) throw new Error('Unknown path atlas crop ' + atlasIndex);
  return 16 + remapIndex;
}

function originalPathSource(streetCode: number): { x: number; y: number } {
  const atlasIndex = STREET_IMAGE_REMAP[streetCode - 16]!;
  return { x: (atlasIndex % 4) * 32, y: Math.floor(atlasIndex / 4) * 32 };
}

function deriveOriginalStreets(tiles: readonly RenderTile[], random: SeededJavaRandom): RenderTile[] {
  return tiles.map((tile) => {
    if (tile.asset !== 'tiles_path' && tile.asset !== 'tiles_path_var') return tile;
    const streetCode = basePathCode(tile);
    if (streetCode !== 19 && streetCode !== 28) {
      return { ...tile, asset: 'tiles_path', source: { ...originalPathSource(streetCode), width: 32, height: 32 } };
    }

    const choice = random.nextInt(4);
    if (choice === 0) {
      return { ...tile, asset: 'tiles_path', source: { ...originalPathSource(streetCode), width: 32, height: 32 } };
    }
    const variantIndex = streetCode === 28 ? choice + 2 : choice - 1;
    return {
      ...tile,
      asset: 'tiles_path_var',
      source: { x: variantIndex * 32, y: 0, width: 32, height: 32 },
    };
  });
}

export function deriveOriginalMapDrawCommands(content: CowGulchSource): {
  background: RenderTile[];
  streets: RenderTile[];
} {
  const random = new SeededJavaRandom(VARIATION_SEED);
  const codes = deriveOriginalBackgroundCodes(content, random);
  const background = codes.flatMap((row, y) => row.map((value, x) => ({
    asset: backgroundAsset(value),
    source: { ...backgroundSource(value), width: 32, height: 32 },
    x,
    y,
    width: 1,
    height: 1,
  })));

  return {
    background,
    streets: deriveOriginalStreets(content.map.streets, random),
  };
}
