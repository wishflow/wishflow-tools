import type { ScenarioUnit } from '../game';
import { createHorizontalTrainPlacementGroups } from './campaign-map-unit-placements';
import { createCampaignTrainUnits } from './campaign-train-units';
import map from './mississippi-11.json';

/** Creates each independent horizontal train emitted by the map14 TDM markers. */
export function createMississippi11TrainUnits(): ScenarioUnit[] {
  return createHorizontalTrainPlacementGroups(map.originalTileGrid)
    .flatMap((placements, index) => createCampaignTrainUnits(
      placements,
      `mississippi-11-train-${index + 1}`,
    ))
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
