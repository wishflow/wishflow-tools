import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import {
  createHorizontalTrainPlacementGroups,
  type CampaignMapUnitTypeId,
} from './campaign-map-unit-placements';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './oregon-10.json';
import { createOregon10MapScene } from './oregon-10-scene';

/** Builds Lumber Mill Hills' unlock-gated hires and original moving train from TDM markers. */
export function createOregon10MapContent(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): { units: ScenarioUnit[]; scene: ReturnType<typeof createOregon10MapScene> } {
  const mapUnits = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
  const trainUnits = createHorizontalTrainPlacementGroups(map.originalTileGrid).flatMap((placements, index) => (
    createCampaignTrainUnits(placements, `oregon-10-train-${index + 1}`)
  ));
  return {
    units: [...mapUnits, ...trainUnits]
      .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x),
    scene: createOregon10MapScene(),
  };
}
