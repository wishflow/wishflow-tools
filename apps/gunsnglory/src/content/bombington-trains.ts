import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import { createHorizontalTrainPlacementGroups } from './campaign-map-unit-placements';
import map from './nevada-02.json';

/** Builds Bombington's APK-derived horizontal locomotive and wagon group. */
export function createBombingtonTrainUnits(): ScenarioUnit[] {
  const groups = createHorizontalTrainPlacementGroups(map.originalTileGrid);
  if (groups.length !== 1) {
    throw new Error(`Bombington TDM must contain one horizontal train; found ${groups.length}`);
  }
  return createCampaignTrainUnits(groups[0]!, 'bombington-horizontal-train-1');
}
