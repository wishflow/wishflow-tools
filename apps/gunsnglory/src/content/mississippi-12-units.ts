import type { ScenarioUnit } from '../game';
import { createSleepingPyromaniac } from './new-mexico-unit-entities';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import { gunslingerWeapon } from './player-unit-weapons';
import map from './mississippi-12.json';

const PLAYER_FRAME = Object.freeze({ x: 0, y: 0, width: 32, height: 44 });

function createActiveGunslinger(cell: { x: number; y: number }): ScenarioUnit {
  const render = { x: cell.x, y: cell.y - 0.375, width: 1, height: 1.375 };
  return {
    id: 'gunslinger-1',
    type: 'gunslinger',
    activity: 5,
    cell,
    movementSpeedFinePer100Ms: 1500,
    asset: 'player_gunslinger',
    frame: { ...PLAYER_FRAME },
    render,
    hitArea: { ...render },
    weapon: { ...gunslingerWeapon },
  };
}

/** Creates map15's fresh-game Gunslinger and only its globally unlocked Pyromaniac marker. */
export function createMississippi12MapUnits(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean = () => false,
): ScenarioUnit[] {
  const playerUnits = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 104 ? [createActiveGunslinger({ x, y })] : []
  )));
  const specialUnits = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 130 && isUnitUnlocked(35) ? [createSleepingPyromaniac({ x, y })] : []
  )));
  return [...playerUnits, ...specialUnits].sort((left, right) => (
    left.cell.y - right.cell.y || left.cell.x - right.cell.x
  ));
}
