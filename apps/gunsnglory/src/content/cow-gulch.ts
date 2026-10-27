import cowGulchMap from './cow-gulch.json';
import { cowGulchPreviewWave } from './cow-gulch-preview-wave';
import type { ScenarioContent } from '../game';

const firstMapGunslingerWeapon = Object.freeze({
  damage: 140,
  damageType: 'light',
  rangeFine: 38400,
  reloadTimeMs: 500,
  projectileSpeed: 600,
  damageStyle: 0,
} as const);

export const cowGulchContent: ScenarioContent = {
  ...cowGulchMap,
  units: cowGulchMap.units.map((unit) => unit.id === 'gunslinger-1'
    ? { ...unit, weapon: firstMapGunslingerWeapon }
    : unit),
  previewWave: cowGulchPreviewWave,
};
