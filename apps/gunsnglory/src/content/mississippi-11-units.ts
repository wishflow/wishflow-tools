import type { ScenarioUnit } from '../game';
import { createSleepingPyromaniac, createSleepingSalesman } from './new-mexico-unit-entities';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import { gunslingerWeapon, mexicanWeapon } from './player-unit-weapons';
import map from './mississippi-11.json';

const PLAYER_FRAME = Object.freeze({ x: 0, y: 0, width: 32, height: 44 });

function activePlayerUnit(
  id: string,
  type: 'gunslinger' | 'mexican',
  asset: string,
  cell: { x: number; y: number },
  weapon: ScenarioUnit['weapon'],
): ScenarioUnit {
  const render = { x: cell.x, y: cell.y - 0.375, width: 1, height: 1.375 };
  return {
    id,
    type,
    activity: 5,
    cell,
    movementSpeedFinePer100Ms: 1500,
    asset,
    frame: { ...PLAYER_FRAME },
    render,
    hitArea: { ...render },
    weapon,
  };
}

/** Creates map14's fresh-game units and only the profile-unlocked special markers. */
export function createMississippi11MapUnits(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean = () => false,
): ScenarioUnit[] {
  // map14 markers 96–101 are restored from saves only; fresh games create 104/105 and unlocked 130/131.
  const playerPlacements = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    if (code !== 104 && code !== 105) return [];
    return [{ code, cell: { x, y } }];
  }));
  const playerUnits = playerPlacements.map(({ code, cell }) => code === 104
    ? activePlayerUnit('gunslinger-1', 'gunslinger', 'player_gunslinger', cell, gunslingerWeapon)
    : activePlayerUnit('mexican-1', 'mexican', 'player_mexican', cell, mexicanWeapon));

  const specialUnits = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const cell = { x, y };
    if (code === 130 && isUnitUnlocked(35)) {
      return [createSleepingPyromaniac(cell)];
    }
    if (code === 131 && isUnitUnlocked(36)) {
      return [createSleepingSalesman(cell)];
    }
    return [];
  }));

  return [...playerUnits, ...specialUnits].sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
