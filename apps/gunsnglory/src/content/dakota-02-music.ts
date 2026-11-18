export const dakota02AmbientMusic = 'music_atmo_snow' as const;

export const dakota02BattleMusicLoops = Object.freeze([
  'music_dakota',
  'music_loop2',
  'music_loop3',
] as const);

export type Dakota02MusicTrack = typeof dakota02AmbientMusic | typeof dakota02BattleMusicLoops[number];

/** Dakota cycles battleLoops[wave % battleLoops.length] using a zero-based wave counter. */
export function dakota02BattleMusicForWave(waveIndex: number): Dakota02MusicTrack {
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError('Six Grandfathers wave index must be a non-negative safe integer');
  }
  return dakota02BattleMusicLoops[waveIndex % dakota02BattleMusicLoops.length]!;
}
