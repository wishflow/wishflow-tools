export const dakota05AmbientMusic = 'music_atmo_snow' as const;

export const dakota05BattleMusicLoops = Object.freeze([
  'music_dakota',
  'music_loop2',
  'music_loop3',
] as const);

export type Dakota05MusicTrack = typeof dakota05AmbientMusic | typeof dakota05BattleMusicLoops[number];

/** The APK cycles Dakota battle tracks by zero-based wave index. */
export function dakota05BattleMusicForWave(waveIndex: number): Dakota05MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Ghost Town wave index must be a non-negative safe integer');
  }
  return dakota05BattleMusicLoops[waveIndex % dakota05BattleMusicLoops.length]!;
}
