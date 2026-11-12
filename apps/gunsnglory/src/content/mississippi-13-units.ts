import type { ScenarioUnit } from '../game';
import { createCampaignMapUnitPlacements } from './campaign-map-unit-placements';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './mississippi-13.json';
import { mississippi13UnlockSnapshotFor } from './mississippi-13-content-version';
import { createSleepingPyromaniac, createSleepingSalesman } from './new-mexico-unit-entities';

/** Creates only new-game marker 107 and the two unlocked M13 special units. */
export function createMississippi13MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  const unlocks = mississippi13UnlockSnapshotFor(completedScenarioIds);
  const placements = createCampaignMapUnitPlacements(map.originalTileGrid)
    .filter(({ sourceCode }) => sourceCode === 107 || sourceCode === 130 || sourceCode === 131);
  const units = placements.flatMap(({ sourceCode, cell }) => {
    if (sourceCode === 107) return [createActiveFortKaboomUnit('indian', cell, 1)];
    if (sourceCode === 130 && unlocks.pyromaniac) return [createSleepingPyromaniac(cell)];
    if (sourceCode === 131 && unlocks.salesman) return [createSleepingSalesman(cell)];
    return [];
  });
  return units.sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
