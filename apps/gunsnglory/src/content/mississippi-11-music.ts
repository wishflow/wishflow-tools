export const mississippi11AmbientMusic = 'music_atmo_forest' as const;

export const mississippi11BattleMusicLoops = Object.freeze([
  'music_loop2_mississippi',
  'music_loop2',
  'music_loop3',
] as const);

export type Mississippi11MusicTrack =
  | typeof mississippi11AmbientMusic
  | typeof mississippi11BattleMusicLoops[number];

/** The APK selects battleLoops[wave % battleLoops.length] using a zero-based wave counter. */
export function mississippi11BattleMusicForWave(waveIndex: number): Mississippi11MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Mississippi level 11 wave index must be a non-negative safe integer');
  }
  return mississippi11BattleMusicLoops[waveIndex % mississippi11BattleMusicLoops.length]!;
}
