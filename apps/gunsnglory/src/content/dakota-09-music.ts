import { dakota02AmbientMusic, dakota02BattleMusicLoops, type Dakota02MusicTrack } from './dakota-02-music';

/** Snow Town uses the ambient and battle loops of the Dakota LevelPack. */
export const dakota09AmbientMusic = dakota02AmbientMusic;
export const dakota09BattleMusicLoops = dakota02BattleMusicLoops;
export type Dakota09MusicTrack = Dakota02MusicTrack;

/** Dakota advances its three battle tracks from the APK's zero-based wave counter. */
export function dakota09BattleMusicForWave(waveIndex: number): Dakota09MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Snow Town wave index must be a non-negative safe integer');
  }
  return dakota09BattleMusicLoops[waveIndex % dakota09BattleMusicLoops.length]!;
}
