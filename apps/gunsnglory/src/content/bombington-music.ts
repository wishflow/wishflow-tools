import {
  nevada01AmbientMusic,
  nevada01BattleMusicForWave,
  nevada01BattleMusicLoops,
} from './nevada-01-music';

/** Bombington uses Nevada's shared environment track and three-track battle cycle. */
export const bombingtonAmbientMusic = nevada01AmbientMusic;
export const bombingtonBattleMusicLoops = nevada01BattleMusicLoops;
export type BombingtonMusicTrack = typeof bombingtonAmbientMusic | typeof bombingtonBattleMusicLoops[number];

export function bombingtonBattleMusicForWave(waveIndex: number): BombingtonMusicTrack {
  return nevada01BattleMusicForWave(waveIndex);
}
