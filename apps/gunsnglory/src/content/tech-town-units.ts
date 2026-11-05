import map from './new-mexico-04.json';
import { createSleepingMapUnitsFromGrid } from './cow-gulch';
import { createSleepingFortKaboomUnit, type FortKaboomUnitType } from './fort-kaboom-unit-designs';
import { createTechTownFreshGameUnitPlacements, type TechTownUnitTypeId } from './tech-town-map-units';
import { mexicanWeapon } from './player-unit-weapons';
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

function isFortKaboomUnitTypeId(unitTypeId: TechTownUnitTypeId): unitTypeId is 3 | 4 | 5 | 6 {
  return unitTypeId >= 3 && unitTypeId <= 6;
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

/** Builds map04's ordinary fresh-game units using the original unlock decision. */
export function createTechTownBaseUnits(isUnitUnlocked: (unitTypeId: TechTownUnitTypeId) => boolean): ScenarioUnit[] {
  const placements = createTechTownFreshGameUnitPlacements()
    .filter(({ unitTypeId }) => unitTypeId <= 6 && isUnitUnlocked(unitTypeId));
  const units: ScenarioUnit[] = createSleepingMapUnitsFromGrid(map.originalTileGrid)
    .filter(({ type }) => {
      const unitTypeId = standardTypeIdForUnit(type);
      return unitTypeId !== undefined && isUnitUnlocked(unitTypeId);
    });

  const counters = new Map<FortKaboomUnitType, number>();
  for (const placement of placements) {
    if (placement.activity === 5 && placement.unitTypeId === 2) {
      units.push(createActiveMexican(placement.cell));
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
