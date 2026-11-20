import { dakota02AmbientMusic, dakota02BattleMusicLoops, type Dakota02MusicTrack } from './dakota-02-music';

/** Ice Rocks uses the same Dakota ambient track and three-track battle rotation as the region. */
export const dakota06AmbientMusic = dakota02AmbientMusic;
export const dakota06BattleMusicLoops = dakota02BattleMusicLoops;
export type Dakota06MusicTrack = Dakota02MusicTrack;

/** The APK cycles Dakota battle tracks by its zero-based wave index. */
export function dakota06BattleMusicForWave(waveIndex: number): Dakota06MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Ice Rocks wave index must be a non-negative safe integer');
  }
  return dakota06BattleMusicLoops[waveIndex % dakota06BattleMusicLoops.length]!;
}
