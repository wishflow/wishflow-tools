import { dakota02AmbientMusic, dakota02BattleMusicLoops, type Dakota02MusicTrack } from './dakota-02-music';

/** Wayne Waters uses the Dakota ambient resource and regional battle rotation. */
export const dakota08AmbientMusic = dakota02AmbientMusic;
export const dakota08BattleMusicLoops = dakota02BattleMusicLoops;
export type Dakota08MusicTrack = Dakota02MusicTrack;

/** The APK cycles Dakota battle tracks by its zero-based wave index. */
export function dakota08BattleMusicForWave(waveIndex: number): Dakota08MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Wayne Waters wave index must be a non-negative safe integer');
  }
  return dakota08BattleMusicLoops[waveIndex % dakota08BattleMusicLoops.length]!;
}
