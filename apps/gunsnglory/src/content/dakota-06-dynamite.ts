import { pairDynamiteObjects } from '../game/dynamite';
import { createDynamiteScenarioDefinition } from './dynamite';
import map from './dakota-06.json';

/** Builds Ice Rocks' TDM trigger/box pair under the shared global unlock gate. */
export function createDakota06DynamiteDefinition(completedScenarioIds: readonly string[]) {
  return createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds);
}

/** Rebuilds the recorded unlock state without consulting the importing profile. */
export function createDakota06DynamiteDefinitionFromSnapshot(unlocked: boolean) {
  return pairDynamiteObjects(map.originalTileGrid, unlocked);
}
