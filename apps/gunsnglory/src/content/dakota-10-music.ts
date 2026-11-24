export const dakota10AmbientMusic = 'music_atmo_snow' as const;

export const dakota10BattleMusicLoops = Object.freeze([
  'music_dakota',
  'music_loop2',
  'music_loop3',
] as const);

export type Dakota10MusicTrack = typeof dakota10AmbientMusic | typeof dakota10BattleMusicLoops[number];

/** Dakota selects its battle loop using the APK's zero-based wave counter. */
export function dakota10BattleMusicForWave(waveIndex: number): Dakota10MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Sioux Falls wave index must be a non-negative safe integer');
  }
  return dakota10BattleMusicLoops[waveIndex % dakota10BattleMusicLoops.length]!;
}
