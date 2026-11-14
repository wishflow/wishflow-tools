import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import {
  createHorizontalTrainPlacementGroups,
  type CampaignMapUnitTypeId,
} from './campaign-map-unit-placements';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './oregon-07.json';
import { createOregon07MapScene } from './oregon-07-scene';

/** Builds Mount Hood hires, active map units, and both original trains from TDM markers. */
export function createOregon07MapContent(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): { units: ScenarioUnit[]; scene: ReturnType<typeof createOregon07MapScene> } {
  const mapUnits = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
  const trainUnits = createHorizontalTrainPlacementGroups(map.originalTileGrid).flatMap((placements, index) => (
    createCampaignTrainUnits(placements, `oregon-07-train-${index + 1}`)
  ));

  return {
    units: [...mapUnits, ...trainUnits]
      .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x),
    scene: createOregon07MapScene(),
  };
}
