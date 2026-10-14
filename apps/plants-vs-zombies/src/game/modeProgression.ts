import { I_ZOMBIE_LEVELS, MINI_GAMES, VASEBREAKER_LEVELS } from '../modes/levelCatalog';

export interface ModeProgressionState {
  adventure: {
    completedLevels: string[];
  };
  completedModes: string[];
  unlockedModes: string[];
}

export function collectUnlockedModeIds(progress: ModeProgressionState): string[] {
  const completedLevels = new Set(progress.adventure.completedLevels);
  const completedModes = new Set(progress.completedModes);
  const unlocked = new Set(progress.unlockedModes);
  const unlockFirstIncomplete = (modeIds: string[], available: boolean): void => {
    if (!available) return;
    for (const [index, modeId] of modeIds.entries()) {
      if (index === 0 || modeIds.slice(0, index).every((previousId) => completedModes.has(previousId))) unlocked.add(modeId);
      if (!completedModes.has(modeId)) break;
    }
  };

  if (completedLevels.has('3-2')) {
    for (const mode of MINI_GAMES.slice(0, 3)) unlocked.add(mode.id);
    unlockFirstIncomplete(MINI_GAMES.map((mode) => mode.id), completedLevels.has('5-10'));
  }
  if (completedLevels.has('4-6')) {
    unlockFirstIncomplete(VASEBREAKER_LEVELS.map((mode) => mode.id), true);
    unlockFirstIncomplete(I_ZOMBIE_LEVELS.map((mode) => mode.id), true);
  }
  return [...unlocked];
}
