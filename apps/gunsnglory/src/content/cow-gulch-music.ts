export const cowGulchAmbientMusic = 'music_loop1' as const;
export const cowGulchVictoryMusic = 'music_level_won' as const;

export const cowGulchBattleMusicLoops = Object.freeze([
  'music_loop2',
  'music_loop3',
  'music_loop4',
] as const);

export type CowGulchMusicTrack =
  | typeof cowGulchAmbientMusic
  | typeof cowGulchVictoryMusic
  | typeof cowGulchBattleMusicLoops[number];

/** The APK's zero-based GunsAndGloryThread.wave selects battleLoops[wave % battleLoops.length]. */
export function cowGulchBattleMusicForWave(waveIndex: number): CowGulchMusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Cow Gulch wave index must be a non-negative safe integer');
  }
  return cowGulchBattleMusicLoops[waveIndex % cowGulchBattleMusicLoops.length]!;
}
