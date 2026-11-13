import { createDynamiteScenarioDefinition } from './dynamite';
import map from './oregon-05.json';

/** Builds the original three Dynamite Plains trigger/box pairs and progression gate. */
export function createOregon05Dynamite(completedScenarioIds: readonly string[]) {
  return createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds);
}
