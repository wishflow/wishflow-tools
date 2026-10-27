import {
  DEFAULT_SIMULATION_SPEED,
  isSimulationSpeed,
  normalizeSimulationSpeed,
} from '../game/time-scaling';

export interface GameSettings {
  simulationSpeed: number;
}

/** Internal storage seam owned by Progress. */
export interface SettingsRepository {
  readSettings(): Promise<unknown | null>;
  writeSettings(settings: GameSettings): Promise<void>;
}

export interface Progress {
  loadSettings(): Promise<GameSettings>;
  saveSettings(settings: GameSettings): Promise<GameSettings>;
}

export function createProgress(repository: SettingsRepository): Progress {
  return Object.freeze({
    async loadSettings(): Promise<GameSettings> {
      const stored = await repository.readSettings();
      if (stored === null) return { simulationSpeed: DEFAULT_SIMULATION_SPEED };
      if (typeof stored !== 'object' || stored === null) throw new Error('Invalid saved game settings');

      const simulationSpeed = (stored as { simulationSpeed?: unknown }).simulationSpeed;
      if (simulationSpeed === undefined) return { simulationSpeed: DEFAULT_SIMULATION_SPEED };
      if (!isSimulationSpeed(simulationSpeed)) throw new Error('Invalid saved simulation speed');
      return { simulationSpeed };
    },

    async saveSettings(settings: GameSettings): Promise<GameSettings> {
      const saved = { simulationSpeed: normalizeSimulationSpeed(settings.simulationSpeed) };
      await repository.writeSettings(saved);
      return saved;
    },
  });
}
