export const oregon01AmbientMusic = 'music_atmo_forest' as const;

export const oregon01BattleMusicLoops = Object.freeze([
  'music_oregon',
  'music_loop2',
  'music_loop3',
] as const);

export type Oregon01MusicTrack = typeof oregon01AmbientMusic | typeof oregon01BattleMusicLoops[number];

/** The APK selects battleLoops[wave % battleLoops.length] using a zero-based wave counter. */
export function oregon01BattleMusicForWave(waveIndex: number): Oregon01MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Eastwood Forest wave index must be a non-negative safe integer');
  }
  return oregon01BattleMusicLoops[waveIndex % oregon01BattleMusicLoops.length]!;
}
