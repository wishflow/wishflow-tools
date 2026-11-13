import type { ScenarioUnit } from '../game';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './oregon-05.json';
import { createOregon05MapScene } from './oregon-05-scene';

/** Builds Dynamite Plains fresh hires and active units from the original TDM markers. */
export function createOregon05MapContent(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): { units: ScenarioUnit[]; scene: ReturnType<typeof createOregon05MapScene> } {
  const units = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked)
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
  return { units, scene: createOregon05MapScene() };
}
