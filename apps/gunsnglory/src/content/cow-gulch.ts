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

const firstMapGunslingerMovementSpeedFinePer100Ms = 1500;

export const cowGulchContent: ScenarioContent = {
  ...cowGulchMap,
  formalSettlementSupported: true,
  recruitableUnits: [{
    id: 'gunslinger',
    name: { en: 'Gunslinger', zh: '枪手' },
    price: 75,
    spawnLocationType: 1,
  }],
  units: cowGulchMap.units.map((unit) => ({
    ...unit,
    movementSpeedFinePer100Ms: firstMapGunslingerMovementSpeedFinePer100Ms,
    ...(unit.id === 'gunslinger-1' ? { weapon: firstMapGunslingerWeapon } : {}),
  })),
  previewWave: cowGulchPreviewWave,
};
