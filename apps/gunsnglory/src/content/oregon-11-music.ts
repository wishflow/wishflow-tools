export const oregon11AmbientMusic = 'music_atmo_snow' as const;

export const oregon11BattleMusicLoops = Object.freeze([
  'music_dakota',
  'music_loop2',
  'music_loop3',
] as const);

export type Oregon11MusicTrack = typeof oregon11AmbientMusic | typeof oregon11BattleMusicLoops[number];

/** Dakota selects battleLoops[wave % battleLoops.length] using a zero-based wave counter. */
export function oregon11BattleMusicForWave(waveIndex: number): Oregon11MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Loot Lakes wave index must be a non-negative safe integer');
  }
  return oregon11BattleMusicLoops[waveIndex % oregon11BattleMusicLoops.length]!;
}
