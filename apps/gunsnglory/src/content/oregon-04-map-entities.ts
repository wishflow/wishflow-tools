import type { ScenarioUnit } from '../game';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './oregon-04.json';
import { createOregon04MapScene } from './oregon-04-scene';

/** Builds Fort Echo's fresh hires and active units from the TDM using the shared unlock gate. */
export function createOregon04MapContent(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): { units: ScenarioUnit[]; scene: ReturnType<typeof createOregon04MapScene> } {
  const units = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked)
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
  return { units, scene: createOregon04MapScene() };
}
