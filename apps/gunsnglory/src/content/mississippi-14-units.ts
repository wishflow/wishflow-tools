import type { ScenarioUnit } from '../game';
import { createCampaignMapUnitPlacements } from './campaign-map-unit-placements';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './mississippi-14.json';
import { mississippi13UnlockSnapshotFor } from './mississippi-13-content-version';
import { createSleepingPyromaniac, createSleepingSalesman } from './new-mexico-unit-entities';
import { mexicanWeapon } from './player-unit-weapons';

const MEXICAN_FRAME = Object.freeze({ x: 0, y: 0, width: 32, height: 44 });

function createActiveMexican(cell: { x: number; y: number }): ScenarioUnit {
  const render = { x: cell.x, y: cell.y - 0.375, width: 1, height: 1.375 };
  return {
    id: 'mexican-1',
    type: 'mexican',
    activity: 5,
    cell,
    movementSpeedFinePer100Ms: 1500,
    asset: 'player_mexican',
    frame: { ...MEXICAN_FRAME },
    render,
    hitArea: { ...render },
    weapon: { ...mexicanWeapon },
  };
}

/** Creates map17's fresh-game units and only the globally unlocked special markers. */
export function createMississippi14MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  const unlocks = mississippi13UnlockSnapshotFor(completedScenarioIds);
  const placements = createCampaignMapUnitPlacements(map.originalTileGrid)
    .filter(({ sourceCode }) => [105, 107, 130, 131].includes(sourceCode));
  const units = placements.flatMap(({ sourceCode, cell }) => {
    if (sourceCode === 105) return [createActiveMexican(cell)];
    if (sourceCode === 107) return [createActiveFortKaboomUnit('indian', cell, 1)];
    if (sourceCode === 130 && unlocks.pyromaniac) return [createSleepingPyromaniac(cell)];
    if (sourceCode === 131 && unlocks.salesman) return [createSleepingSalesman(cell)];
    return [];
  });
  return units.sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
