import { pairDynamiteObjects } from '../game/dynamite';
import { createDynamiteScenarioDefinition } from './dynamite';
import map from './dakota-08.json';

/** Builds Wayne Waters' TDM trigger/box pairs under the shared global unlock gate. */
export function createDakota08DynamiteDefinition(completedScenarioIds: readonly string[]) {
  return createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds);
}

/** Rebuilds the recorded Dynamite unlock state without consulting the importing profile. */
export function createDakota08DynamiteDefinitionFromSnapshot(unlocked: boolean) {
  return pairDynamiteObjects(map.originalTileGrid, unlocked);
}
