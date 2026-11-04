import type { Direction, GameView } from '../game';
import { calculateMapViewport, type MapViewport } from './map-viewport';

export interface WaveSpawnIndicatorDraw {
  assetName: string;
  x: number;
  y: number;
  size: number;
  boss: boolean;
  bossHatOffsetX: number;
  bossHatOffsetY: number;
}

// APK GunsAndGloryThread.run(): positive X/Y selects d/a; negative X/Y selects b/c.
const waveSpawnArrowAsset: Readonly<Record<Direction, string>> = Object.freeze({
  east: 'gng_wave_arrow_d',
  south: 'gng_wave_arrow_a',
  west: 'gng_wave_arrow_b',
  north: 'gng_wave_arrow_c',
});

function waveSpawnArrowAnimator(elapsedMs: number): number {
  const phase = ((elapsedMs % 800) + 800) % 800;
  return phase < 400 ? 9 - (phase / 50) : 1 + ((phase - 400) / 50);
}

export function getWaveSpawnIndicatorDraws(
  view: GameView,
  viewport: MapViewport,
  displayPixelScale: number,
  viewportSize: { width: number; height: number },
): WaveSpawnIndicatorDraw[] {
  const indicators = view.wave?.spawnIndicators;
  if (!indicators?.length) return [];

  const baseViewport = calculateMapViewport(
    view.map.width,
    view.map.height,
    viewportSize.width,
    viewportSize.height,
    view.map.tileSize,
    displayPixelScale,
  );
  const size = 32 * viewport.scaleFactor;
  const inset = ((size * waveSpawnArrowAnimator(view.elapsedMs)) / 15) - (size / 2);
  const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

  return indicators.map((indicator) => {
    const screenX = viewport.origin.x + (indicator.cell.x + 0.5) * viewport.tileSize;
    const screenY = viewport.origin.y + (indicator.cell.y + 0.5) * viewport.tileSize;
    const baseX = baseViewport.origin.x + (indicator.cell.x + 0.5) * baseViewport.tileSize;
    const baseY = baseViewport.origin.y + (indicator.cell.y + 0.5) * baseViewport.tileSize;
    let x: number;
    let y: number;
    let bossHatOffsetX = 0;
    let bossHatOffsetY = 0;

    switch (indicator.direction) {
      case 'east':
        x = Math.max(screenX, baseX) + inset;
        y = clamp(screenY - size / 2, 0, viewportSize.height - size);
        bossHatOffsetX = size;
        break;
      case 'west':
        x = Math.min(screenX, viewportSize.width - size / 2) + inset - (size / 2);
        y = clamp(screenY - size / 2, 0, viewportSize.height - size);
        bossHatOffsetX = -size;
        break;
      case 'south':
        x = clamp(screenX - size / 2, 0, viewportSize.width - size);
        y = Math.max(screenY, baseY) + inset;
        bossHatOffsetY = size;
        break;
      case 'north':
        x = clamp(screenX - size / 2, 0, viewportSize.width - size);
        y = Math.min(screenY, viewportSize.height - size / 2) + inset - (size / 2);
        bossHatOffsetY = -size;
        break;
    }

    return {
      assetName: waveSpawnArrowAsset[indicator.direction],
      x,
      y,
      size,
      boss: indicator.boss,
      bossHatOffsetX,
      bossHatOffsetY,
    };
  });
}
