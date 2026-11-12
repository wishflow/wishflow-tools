export const mississippiAmbientMusic = 'music_atmo_forest' as const;

export const mississippiBattleMusicLoops = Object.freeze([
  'music_loop2_mississippi',
  'music_loop2',
  'music_loop3',
] as const);

export type MississippiMusicTrack =
  | typeof mississippiAmbientMusic
  | typeof mississippiBattleMusicLoops[number];

/** The APK selects battleLoops[wave % battleLoops.length] using a zero-based wave counter. */
export function mississippiBattleMusicForWave(waveIndex: number): MississippiMusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Mississippi campaign wave index must be a non-negative safe integer');
  }
  return mississippiBattleMusicLoops[waveIndex % mississippiBattleMusicLoops.length]!;
}
