import { createSleepingMapUnitsFromGrid } from './cow-gulch';
import { createAnchoredMapRender, createSleepingFortKaboomUnit, type FortKaboomUnitType } from './fort-kaboom-unit-designs';
import { createCampaignMapUnitPlacements, type CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import { gunslingerWeapon, mexicanWeapon } from './player-unit-weapons';
import type { ScenarioUnit } from '../game';

const fortUnitTypeById: Readonly<Record<3 | 4 | 5 | 6, FortKaboomUnitType>> = Object.freeze({
  3: 'cannon',
  4: 'indian',
  5: 'sniper',
  6: 'grandpa',
});

function standardTypeIdForUnit(type: string): 1 | 2 | undefined {
  if (type === 'gunslinger') return 1;
  if (type === 'mexican') return 2;
  return undefined;
}

function isFortKaboomUnitTypeId(unitTypeId: CampaignMapUnitTypeId): unitTypeId is 3 | 4 | 5 | 6 {
  return unitTypeId >= 3 && unitTypeId <= 6;
}

function createActiveGunslinger(cell: { x: number; y: number }): ScenarioUnit {
  const render = { x: cell.x, y: cell.y - 0.375, width: 1, height: 1.375 };
  return {
    id: 'gunslinger-1',
    type: 'gunslinger',
    activity: 5,
    cell,
    movementSpeedFinePer100Ms: 1500,
    asset: 'player_gunslinger',
    frame: { x: 0, y: 0, width: 32, height: 44 },
    render,
    hitArea: { ...render },
    weapon: gunslingerWeapon,
  };
}

function createActiveMexican(cell: { x: number; y: number }): ScenarioUnit {
  const render = { x: cell.x, y: cell.y - 0.375, width: 1, height: 1.375 };
  return {
    id: 'mexican-1',
    type: 'mexican',
    activity: 5,
    cell,
    movementSpeedFinePer100Ms: 1500,
    asset: 'player_mexican',
    frame: { x: 0, y: 0, width: 32, height: 44 },
    render,
    hitArea: { ...render },
    weapon: mexicanWeapon,
  };
}

export function createSleepingPyromaniac(cell: { x: number; y: number }): ScenarioUnit {
  const frame = { x: 0, y: 0, width: 32, height: 44 };
  const render = createAnchoredMapRender(cell, frame);
  return {
    id: 'pyromaniac-hire-01',
    type: 'pyromaniac',
    activity: 4,
    hirePrice: 130,
    awakeAsset: 'player_pyromaniac',
    awakeFrame: frame,
    awakeRender: { ...render },
    awakeHitArea: { ...render },
    hireSound: 'sound_pyromaniac',
    shotSound: 'sound_rocket_launch',
    cell,
    movementSpeedFinePer100Ms: 2000,
    asset: 'player_pyromaniac_sleep',
    frame,
    render,
    hitArea: { ...render },
    weapon: {
      damage: 300,
      damageType: 'heavy',
      postDamage: 12,
      postDamageDurationMs: 500,
      rangeFine: 46080,
      reloadTimeMs: 4000,
      projectileSpeed: 1000,
      damageStyle: 6,
      areaDamageFine: 7680,
      specialReloadTimeMs: 0,
      specialReloadFrequency: 1,
    },
  };
}

export function createSleepingSalesman(cell: { x: number; y: number }): ScenarioUnit {
  const frame = { x: 0, y: 0, width: 32, height: 44 };
  const render = createAnchoredMapRender(cell, frame);
  return {
    id: 'salesman-hire-01',
    type: 'salesman',
    activity: 4,
    hirePrice: 110,
    awakeAsset: 'player_salesman',
    awakeFrame: frame,
    awakeRender: { ...render },
    awakeHitArea: { ...render },
    hireSound: 'sound_snakeoilsalesman',
    cell,
    movementSpeedFinePer100Ms: 1500,
    asset: 'player_salesman_sleep',
    frame,
    render,
    hitArea: { ...render },
    weapon: {
      damage: 75,
      damageType: 'poison',
      poisonDamage: 40,
      poisonDurationMs: 3000,
      rangeFine: 30720,
      reloadTimeMs: 5000,
      projectileSpeed: 1500,
      damageStyle: 5,
      areaDamageFine: 15360,
    },
  };
}

function createGambler(cell: { x: number; y: number }): ScenarioUnit {
  const frame = { x: 0, y: 0, width: 32, height: 44 };
  const render = createAnchoredMapRender(cell, frame);
  return {
    id: 'gambler-01',
    type: 'gambler',
    activity: 5,
    cell,
    movementSpeedFinePer100Ms: 0,
    asset: 'player_gambler',
    frame,
    render,
    hitArea: { ...render },
  };
}

/** Builds fresh-game units from any New Mexico TDM using the original unlock callback. */
export function createNewMexicoMapUnits(
  tileGrid: readonly (readonly number[])[],
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): ScenarioUnit[] {
  const placements = createCampaignMapUnitPlacements(tileGrid)
    .filter(({ unitTypeId }) => isUnitUnlocked(unitTypeId));
  const units = createSleepingMapUnitsFromGrid(tileGrid)
    .filter(({ type }) => {
      const unitTypeId = standardTypeIdForUnit(type);
      return unitTypeId !== undefined && isUnitUnlocked(unitTypeId);
    });

  const counters = new Map<FortKaboomUnitType, number>();
  for (const placement of placements) {
    if (placement.activity === 5 && placement.unitTypeId === 1) {
      units.push(createActiveGunslinger(placement.cell));
      continue;
    }
    if (placement.activity === 5 && placement.unitTypeId === 2) {
      units.push(createActiveMexican(placement.cell));
      continue;
    }
    if (placement.activity === 5 && placement.unitTypeId === 9) {
      units.push(createGambler(placement.cell));
      continue;
    }
    if (placement.activity === 4 && placement.unitTypeId === 35) {
      units.push(createSleepingPyromaniac(placement.cell));
      continue;
    }
    if (placement.activity === 4 && placement.unitTypeId === 36) {
      units.push(createSleepingSalesman(placement.cell));
      continue;
    }
    if (placement.activity !== 4 || !isFortKaboomUnitTypeId(placement.unitTypeId)) continue;

    const type = fortUnitTypeById[placement.unitTypeId];
    const index = (counters.get(type) ?? 0) + 1;
    counters.set(type, index);
    units.push(createSleepingFortKaboomUnit(type, placement.cell, index));
  }

  return units.sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
