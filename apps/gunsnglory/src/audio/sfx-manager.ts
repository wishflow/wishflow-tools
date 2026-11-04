export interface FinePoint {
  x: number;
  y: number;
}

export interface SoundEffectViewport {
  origin: { x: number; y: number };
  tileSize: number;
  width: number;
  height: number;
}

export interface SoundEffectRequest {
  id: number;
  positionFine: FinePoint;
  assets: readonly string[];
}

const FINE_UNITS_PER_TILE = 7680;
const VARIATION_COOLDOWN_MS = 200;
const FIXED_COOLDOWN_MS = 300;

function isOnScreen(positionFine: FinePoint, viewport: SoundEffectViewport): boolean {
  const x = viewport.origin.x + (positionFine.x / FINE_UNITS_PER_TILE) * viewport.tileSize;
  const y = viewport.origin.y + (positionFine.y / FINE_UNITS_PER_TILE) * viewport.tileSize;
  return x + viewport.tileSize > 0
    && x < viewport.width
    && y + viewport.tileSize > 0
    && y < viewport.height;
}

/** Mirrors the APK SfxManager's visibility and paired cooldown checks before audio playback. */
export class SoundEffectsManager {
  private readonly cooldowns = Array.from({ length: 20 }, () => 0);

  constructor(private readonly random: () => number = Math.random) {}

  advance(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError('Sound cooldown delta must be finite and non-negative');
    }
    for (let index = 0; index < this.cooldowns.length; index += 1) {
      this.cooldowns[index] = Math.trunc(this.cooldowns[index]! - deltaMs);
    }
  }

  request(request: SoundEffectRequest, viewport: SoundEffectViewport): string | undefined {
    if (!Number.isInteger(request.id) || request.id < 0 || request.id >= this.cooldowns.length
      || request.assets.length === 0 || !isOnScreen(request.positionFine, viewport)) return undefined;

    if (request.id < 10) {
      if (request.assets.length < 2) return undefined;
      const pairStart = Math.trunc(request.id / 2) * 2;
      if (this.cooldowns[pairStart]! > 0 || this.cooldowns[pairStart + 1]! > 0) return undefined;
      const variation = Math.max(0, Math.min(request.assets.length - 1, Math.trunc(this.random() * request.assets.length)));
      this.cooldowns[request.id] = VARIATION_COOLDOWN_MS;
      return request.assets[variation];
    }

    if (this.cooldowns[request.id]! > 0) return undefined;
    this.cooldowns[request.id] = FIXED_COOLDOWN_MS;
    return request.assets[0];
  }
}
