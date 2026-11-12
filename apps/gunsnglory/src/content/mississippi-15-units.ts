import type { ScenarioUnit } from '../game';
import { createCampaignMapUnitPlacements } from './campaign-map-unit-placements';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import { gunslingerWeapon, mexicanWeapon } from './player-unit-weapons';
import map from './mississippi-15.json';
import { mississippi13UnlockSnapshotFor } from './mississippi-13-content-version';
import { createSleepingPyromaniac, createSleepingSalesman } from './new-mexico-unit-entities';

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

function createActiveMexican(cell: { x: number; y: number }): ScenarioUnit {
  const render = { x: cell.x, y: cell.y - 0.375, width: 1, height: 1.375 };
  return {
    id: 'mexican-1',
    type: 'mexican',
    activity: 5,
    cell,
    movementSpeedFinePer100Ms: 1500,
    asset: 'player_mexican',
    frame: { ...PLAYER_FRAME },
    render,
    hitArea: { ...render },
    weapon: { ...mexicanWeapon },
  };
}

/** Creates only map18's fresh-game active player units; save markers are not new units. */
export function createMississippi15MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  const unlocks = mississippi13UnlockSnapshotFor(completedScenarioIds);
  const placements = createCampaignMapUnitPlacements(map.originalTileGrid)
    .filter(({ sourceCode }) => [104, 105, 107, 130, 131].includes(sourceCode));
  const units = placements.flatMap(({ sourceCode, cell }) => {
    if (sourceCode === 104) return [createActiveGunslinger(cell)];
    if (sourceCode === 105) return [createActiveMexican(cell)];
    if (sourceCode === 107) return [createActiveFortKaboomUnit('indian', cell, 1)];
    if (sourceCode === 130 && unlocks.pyromaniac) return [createSleepingPyromaniac(cell)];
    if (sourceCode === 131 && unlocks.salesman) return [createSleepingSalesman(cell)];
    return [];
  });
  return units.sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
