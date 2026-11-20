import { dakota02AmbientMusic, dakota02BattleMusicLoops, type Dakota02MusicTrack } from './dakota-02-music';

/** Frost Station uses the Dakota ambient track and regional battle rotation. */
export const dakota07AmbientMusic = dakota02AmbientMusic;
export const dakota07BattleMusicLoops = dakota02BattleMusicLoops;
export type Dakota07MusicTrack = Dakota02MusicTrack;

/** The APK cycles Dakota battle tracks by its zero-based wave index. */
export function dakota07BattleMusicForWave(waveIndex: number): Dakota07MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Frost Station wave index must be a non-negative safe integer');
  }
  return dakota07BattleMusicLoops[waveIndex % dakota07BattleMusicLoops.length]!;
}
