import { createDynamiteScenarioDefinition } from './dynamite';
import map from './oregon-06.json';

/** Builds Columbia River's original trigger/box pairs and existing progression gate. */
export function createOregon06Dynamite(completedScenarioIds: readonly string[]) {
  return createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds);
}
