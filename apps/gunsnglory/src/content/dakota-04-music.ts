export const dakota04AmbientMusic = 'music_atmo_snow' as const;

export const dakota04BattleMusicLoops = Object.freeze([
  'music_dakota',
  'music_loop2',
  'music_loop3',
] as const);

export type Dakota04MusicTrack = typeof dakota04AmbientMusic | typeof dakota04BattleMusicLoops[number];

/** The APK cycles the Dakota battle tracks by the zero-based wave index. */
export function dakota04BattleMusicForWave(waveIndex: number): Dakota04MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Badlands wave index must be a non-negative safe integer');
  }
  return dakota04BattleMusicLoops[waveIndex % dakota04BattleMusicLoops.length]!;
}
