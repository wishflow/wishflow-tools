import cowGulchMap from './cow-gulch.json';
import { cowGulchPreviewWave } from './cow-gulch-preview-wave';
import type { ScenarioContent, ScenarioUnit } from '../game';

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

const sleepingUnitMarkers = {
  96: { prefix: 'gunslinger-hire', type: 'gunslinger', asset: 'player_gunslinger_sleep', speed: 1500 },
  97: { prefix: 'mexican-hire', type: 'mexican', asset: 'player_mexican_sleep', speed: 1750 },
} as const;

function createSleepingMapUnits(): ScenarioUnit[] {
  const counters = new Map<number, number>();
  const units: ScenarioUnit[] = [];
  for (const [y, row] of (cowGulchMap.originalTileGrid ?? []).entries()) {
    for (const [x, tile] of row.entries()) {
      if (tile !== 96 && tile !== 97) continue;
      const marker = sleepingUnitMarkers[tile];
      const index = (counters.get(tile) ?? 0) + 1;
      counters.set(tile, index);
      const render = { x, y: y - 0.25, width: 1, height: 1 };
      units.push({
        id: `${marker.prefix}-${String(index).padStart(2, '0')}`,
        type: marker.type,
        activity: 4,
        cell: { x, y },
        movementSpeedFinePer100Ms: marker.speed,
        asset: marker.asset,
        frame: { x: 0, y: 0, width: 32, height: 32 },
        render,
        hitArea: { ...render },
      });
    }
  }
  return units;
}
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
  contentVersion: 'gng-free-1.8.6-map1-objects-v2',
  formalSettlementSupported: true,
  maxUpgrades: 0,
  recruitableUnits: [{
    id: 'gunslinger',
    name: { en: 'Gunslinger', zh: '枪手' },
    price: 75,
    spawnLocationType: 1,
  }],
  units: [
    ...cowGulchMap.units.map((unit) => ({
      ...unit,
      movementSpeedFinePer100Ms: firstMapGunslingerMovementSpeedFinePer100Ms,
      ...(unit.id === 'gunslinger-1' ? {
        weapon: firstMapGunslingerWeapon,
        upgradeLevels: [firstMapGunslingerUpgradeLevelOne],
      } : {}),
    })),
    ...createSleepingMapUnits(),
  ],
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
