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
  specialReloadTimeMs: 1500,
  specialReloadFrequency: 6,
} as const);

const firstMapGunslingerMovementSpeedFinePer100Ms = 1500;
const firstMapGunslingerUpgradeLevelOne = Object.freeze({
  price: 25,
  movementSpeedFinePer100Ms: 1750,
  weapon: Object.freeze({
    damage: 140,
    damageType: 'light',
    rangeFine: 38400,
    reloadTimeMs: 400,
    projectileSpeed: 600,
    damageStyle: 0,
    specialReloadTimeMs: 1250,
    specialReloadFrequency: 6,
  }),
});

export const cowGulchContent: ScenarioContent = {
  ...cowGulchMap,
  formalSettlementSupported: true,
  maxUpgrades: 0,
  recruitableUnits: [{
    id: 'gunslinger',
    name: { en: 'Gunslinger', zh: '枪手' },
    price: 75,
    spawnLocationType: 1,
  }],
  units: cowGulchMap.units.map((unit) => ({
    ...unit,
    movementSpeedFinePer100Ms: firstMapGunslingerMovementSpeedFinePer100Ms,
    ...(unit.id === 'gunslinger-1' ? {
      weapon: firstMapGunslingerWeapon,
      upgradeLevels: [firstMapGunslingerUpgradeLevelOne],
    } : {}),
  })),
  previewWave: cowGulchPreviewWave,
};

/** Debug-only fixture for the otherwise locked Cow Gulch Gunslinger upgrade path. */
export const cowGulchUpgradeSampleContent: ScenarioContent = {
  ...cowGulchContent,
  id: 'cow-gulch-upgrade-sample',
  formalSettlementSupported: false,
  maxUpgrades: 1,
  previewWave: { ...cowGulchContent.previewWave!, initialCash: 25 },
};
