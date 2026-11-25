export const nevada01AmbientMusic = 'music_atmo_nevada' as const;

/** Nevada.java battleLoops, selected with the APK's zero-based wave counter. */
export const nevada01BattleMusicLoops = Object.freeze([
  'music_nevada',
  'music_loop3',
  'music_loop4',
] as const);

export type Nevada01MusicTrack =
  | typeof nevada01AmbientMusic
  | typeof nevada01BattleMusicLoops[number];

export function nevada01BattleMusicForWave(waveIndex: number): Nevada01MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Labyrinth Gulch wave index must be a non-negative safe integer');
  }
  return nevada01BattleMusicLoops[waveIndex % nevada01BattleMusicLoops.length]!;
}
