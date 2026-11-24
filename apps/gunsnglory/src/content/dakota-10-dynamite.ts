import { pairDynamiteObjects } from '../game/dynamite';
import { isDynamiteUnlocked } from './dynamite';
import map from './dakota-10.json';

/** Builds Sioux Falls' single APK marker pair under the shared global unlock rule. */
export function createDakota10DynamiteDefinition(completedScenarioIds: readonly string[]) {
  return pairDynamiteObjects(map.originalTileGrid, isDynamiteUnlocked(completedScenarioIds));
}

/** Rebuilds a recorded unlock state without consulting the importing profile. */
export function createDakota10DynamiteDefinitionFromSnapshot(unlocked: boolean) {
  return pairDynamiteObjects(map.originalTileGrid, unlocked);
}
