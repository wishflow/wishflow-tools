import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import { createVerticalTrainPlacements, type CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './oregon-02.json';
import { createOregon02MapScene } from './oregon-02-scene';

/** Builds Cashcow Canyon fresh hires and its original vertical train from TDM markers. */
export function createOregon02MapContent(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): { units: ScenarioUnit[]; scene: ReturnType<typeof createOregon02MapScene> } {
  const mapUnits = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
  const trainUnits = createCampaignTrainUnits(
    createVerticalTrainPlacements(map.originalTileGrid),
    'oregon-02-train',
  );

  return {
    units: [...mapUnits, ...trainUnits]
      .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x),
    scene: createOregon02MapScene(),
  };
}
